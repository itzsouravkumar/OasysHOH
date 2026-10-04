import concurrent.futures,copy,json,math,os,secrets,threading,time,uuid
from datetime import datetime,timezone
from pathlib import Path
from .auditlog import AuditLog,canonical,commitment,digest,load_key
from .spawner import ROOT,Worker,apply_policy,availability
from verifier.verify import finding_id,verify
from .live import LiveEvents

class RunError(Exception):pass
class RunManager:
    def __init__(self,root=ROOT,worker_factory=Worker,policy_runner=apply_policy):
        self.root=Path(root);self.store=self.root/'runs';self.state=self.root/'.state'
        self.store.mkdir(exist_ok=True,mode=0o700);self.state.mkdir(exist_ok=True,mode=0o700)
        os.chmod(self.store,0o700);os.chmod(self.state,0o700)
        self.key=load_key(self.state/'signing.key');self.public_key=self.key.verify_key.encode().hex()
        (self.state/'public-key.txt').write_text(self.public_key+'\n')
        self.live=LiveEvents()
        self.runs={};self.lock=threading.RLock();self.pool=concurrent.futures.ThreadPoolExecutor(max_workers=1)
        self.worker_factory=worker_factory;self.policy_runner=policy_runner
        for file in self.store.glob('*.bundle.json'):
            try:
                bundle=json.loads(file.read_text());result=verify(bundle,self.public_key)
                if not result['valid']:continue
                r=bundle['summary'];self.runs[r['id']]={**r,'bundle':bundle,'phase':'sealed','events':self.public_events(bundle['records'])}
            except (ValueError,KeyError):continue
        for r in sorted(self.runs.values(),key=lambda r:r["created_at"]):
            self.live.publish(r["id"],"restored","sealed",verified=True,worker_present=False,index=len(r["events"])-1)
    @staticmethod
    def public_events(records):
        return [{'index':r['index'],'kind':r['kind'],'timestamp':r['timestamp'],'hash':r['hash']} for r in records]
    def _event(self,r,kind,data):
        rec=r['audit'].append(kind,data);r['events'].append({k:rec[k] for k in ('index','kind','timestamp','hash')})
        safe={k:data[k] for k in ('blocked','worker_id') if k in data}
        self.live.publish(r['id'],kind,r['phase'],index=rec['index'],hash=rec['hash'],timestamp=rec['timestamp'],**safe)
    def create(self,commit_hash,label='Custom evaluation',benchmark_id=None):
        with self.lock:
            if sum(r['phase'] not in ('sealed','failed') for r in self.runs.values())>=12:raise RunError('Too many unfinished runs')
            rid=uuid.uuid4().hex[:12];r={'id':rid,'label':label,'benchmark_id':benchmark_id,'phase':'committed','created_at':datetime.now(timezone.utc).isoformat(),'events':[],'commitment':commit_hash,'audit':AuditLog(self.store/f'{rid}.jsonl',rid)}
            self.runs[rid]=r;self._event(r,'committed',{'commitment':commit_hash,'label':label,'benchmark_id':benchmark_id});return rid
    def get(self,rid):
        if rid not in self.runs:raise RunError('Run not found')
        return self.runs[rid]
    def set_policy(self,rid,policy):
        with self.lock:
            r=self.get(rid)
            if r['phase']!='committed':raise RunError('Policy can only be locked once, after commitment')
            r['policy']=copy.deepcopy(policy);r['policy_hash']=digest(policy);r['phase']='policy_locked';r['token']=secrets.token_hex(32);r['expires']=time.time()+300
            self._event(r,'policy_locked',{'policy':policy,'policy_hash':r['policy_hash']})
            self._event(r,'token_minted',{'token_digest':digest(r['token']),'expires_in_seconds':300})
    def reveal(self,rid,payload,nonce,quantum=0):
        with self.lock:
            r=self.get(rid)
            if r['phase']!='policy_locked':raise RunError('Run is not ready for reveal, or token already consumed')
            if time.time()>r['expires']:raise RunError('Run token expired; create another run')
            if not secrets.compare_digest(commitment(payload,nonce),r['commitment']):raise RunError('Commitment mismatch: payload or nonce changed')
            r['phase']='queued';r['payload']=payload;r['nonce']=nonce;r['token']=None;r['quantum']=quantum
            self._event(r,'payload_revealed',{'payload':payload,'nonce':nonce})
            self._event(r,'token_consumed',{})
            return self.pool.submit(self.execute,rid)
    def execute(self,rid):
        r=self.get(rid);worker=self.worker_factory(rid);started=time.perf_counter()
        try:
            r['phase']='starting';self._event(r,'worker_start_requested',{});worker.start()
            provenance_path=self.root/'data/model-manifest.json'
            provenance=json.loads(provenance_path.read_text()) if provenance_path.exists() else {'model':'test fixture'}
            self._event(r,'worker_started',{'worker_id':worker.name,'fresh_process':True,'network':'none','model_provenance':provenance})
            r['phase']='policy';self._event(r,'policy_requested',{});filtered=self.policy_runner(r['payload'],r['policy'],rid)
            self._event(r,'policy_evaluated',{'blocked':filtered['blocked'],'reason':filtered['reason']})
            r['phase']='inference'
            if not filtered['blocked']:self._event(r,'model_requested',{})
            result={'output':'Input blocked by the locked blue policy.','inference_ms':0,'usage':{}} if filtered['blocked'] else worker.infer(filtered['payload'],filtered['system_prompt'])
            result['blocked']=filtered['blocked'];self._event(r,'model_completed',result)
            r['phase']='sealing';r.update({k:result[k] for k in ('output','inference_ms','blocked')})
            r['finding_id']=finding_id(r['payload'],r['policy_hash'],r['output'],r['blocked']);self._event(r,'finding_recorded',{'finding_id':r['finding_id']})
            self._event(r,'worker_teardown_requested',{});worker.destroy();self._event(r,'worker_destroyed',{'worker_id':worker.name});self._event(r,'token_expired',{})
            # Pad elapsed duration, not wall-clock timestamp. No streaming results before seal.
            quantum=r['quantum'];elapsed=time.perf_counter()-started
            if quantum:time.sleep(max(0,math.ceil(elapsed/quantum)*quantum-elapsed))
            r['duration_ms']=round((time.perf_counter()-started)*1000);self._event(r,'release_ready',{'duration_ms':r['duration_ms'],'release_quantum_seconds':quantum})
            seal=r['audit'].seal(self.key);summary=self.summary(r);summary['phase']='sealed'
            bundle={'version':1,'summary':summary,'records':r['audit'].records,'seal':seal}
            verdict=verify(bundle,self.public_key)
            if not verdict['valid']:raise RuntimeError('Self-verification failed: '+verdict['error'])
            path=self.store/f'{rid}.bundle.json';temp=path.with_suffix('.tmp');temp.write_bytes(canonical(bundle));os.chmod(temp,0o600);temp.replace(path)
            r['bundle']=bundle;r['verification']=verdict;r['phase']='sealed'
            self.live.publish(rid,'result_sealed','sealed',verified=True,worker_present=False)
            self.live.publish(rid,'verification_passed','sealed',verified=True)
            for key in ('policy','payload','nonce','audit'):r.pop(key,None)
        except Exception as e:
            try:
                worker.destroy()
                if 'audit' in r:self._event(r,'worker_destroyed',{'worker_id':worker.name})
            except Exception as cleanup:e=RuntimeError(f'{e}; cleanup: {cleanup}')
            r['phase']='failed';r['error']=str(e)
            if 'audit' in r:self._event(r,'run_failed',{'error':str(e)})
            for key in ('policy','payload','nonce','token'):r.pop(key,None)
    def summary(self,r):
        fields=('id','label','benchmark_id','phase','created_at','commitment','policy_hash','duration_ms','inference_ms','blocked','finding_id','error')
        return {k:r[k] for k in fields if k in r}
    def view(self,rid,role='operator'):
        with self.lock:
            r=self.get(rid);out=self.summary(r);out['events']=list(r['events']) if role=='operator' else []
            if r['phase']=='sealed':
                result=next(x['data'] for x in r['bundle']['records'] if x['kind']=='model_completed');out['output']=result['output'];out['verification']=verify(r['bundle'],self.public_key)
                if role in ('blue','operator'):out['payload']=next(x['data']['payload'] for x in r['bundle']['records'] if x['kind']=='payload_revealed')
            return out
    def bundle(self,rid):
        r=self.get(rid)
        if r['phase']!='sealed':raise RunError('Evidence is unavailable before the run is sealed')
        return copy.deepcopy(r['bundle'])
