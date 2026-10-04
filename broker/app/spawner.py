import json,os,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
ENGINE=os.environ.get('OASYS_ENGINE','docker')
MODEL=ROOT/'data/models/qwen2.5-1.5b-instruct-q4_k_m.gguf'
LABEL=['--label','app=oasys']
HARDEN=['--user','65532:65532','--read-only','--cap-drop=ALL','--security-opt','no-new-privileges:true','--pids-limit','64','--memory','3g','--cpus','3','--network','none','--tmpfs','/tmp:rw,noexec,nosuid,size=64m']

def command(args,*,input=None,timeout=30,check=True):
    p=subprocess.run([ENGINE,*args],input=input,text=True,capture_output=True,timeout=timeout)
    if check and p.returncode:raise RuntimeError((p.stderr or p.stdout)[-1800:])
    return p

def availability():
    try:
        info=json.loads(command(['info','--format','{{json .}}'],timeout=5).stdout)
        images={name:command(['image','inspect',name],timeout=5,check=False).returncode==0 for name in ['oasys-worker:local','oasys-policy:local','python:3.12-slim']}
        return {'engine':ENGINE,'running':True,'os':info.get('OperatingSystem'),'memory_gb':round(info.get('MemTotal',0)/1e9,1),'model_ready':MODEL.exists(),'images':images,'ready':MODEL.exists() and all(images.values()),'rootless':'rootless' in str(info.get('SecurityOptions',[])).lower()}
    except Exception as e:return {'engine':ENGINE,'running':False,'ready':False,'model_ready':MODEL.exists(),'error':str(e)}

def ensure_workbenches():
    for role in ('red','blue'):
        name=f'oasys-{role}'
        if command(['inspect',name],check=False).returncode==0:
            command(['start',name]);continue
        command(['run','-d','--name',name,*LABEL,*HARDEN,'--memory','128m','--cpus','0.5','python:3.12-slim','python','-c','import time; time.sleep(2147483647)'])

def apply_policy(payload,policy,run_id):
    name=f'oasys-policy-{run_id}'
    try:
        return json.loads(command(['run','--rm','-i','--name',name,*LABEL,*HARDEN,'--memory','128m','--cpus','0.5','oasys-policy:local'],input=json.dumps({'payload':payload,'policy':policy}),timeout=20).stdout)
    finally:command(['rm','-f',name],check=False)

class Worker:
    def __init__(self,run_id):self.name='oasys-worker-'+run_id;self.started=False
    def start(self):
        if not MODEL.exists():raise RuntimeError('Model file missing. Run make setup first.')
        # No published port, no network interface, no runtime socket. We use exec stdin as the broker channel.
        command(['run','-d','--name',self.name,*LABEL,*HARDEN,'--mount',f'type=bind,source={MODEL},target=/models/model.gguf,readonly','oasys-worker:local','-m','/models/model.gguf','--host','127.0.0.1','--port','8080','-c','2048','-n','128','-t','3','--parallel','1','--no-warmup'],timeout=30)
        self.started=True
        for _ in range(90):
            result=command(['exec',self.name,'python3','-c',"import urllib.request;urllib.request.urlopen('http://127.0.0.1:8080/health',timeout=1)"],check=False,timeout=5)
            if result.returncode==0:return
            state=command(['inspect','--format','{{.State.Running}}',self.name],check=False)
            if state.stdout.strip()!='true':raise RuntimeError(command(['logs','--tail','15',self.name],check=False).stderr[-1500:] or 'Worker exited during startup')
            time.sleep(.5)
        raise RuntimeError('Model startup exceeded readiness timeout')
    def infer(self,payload,system_prompt):
        body={'messages':[{'role':'system','content':system_prompt},{'role':'user','content':payload}],'temperature':0,'seed':42,'max_tokens':128,'stream':False,'cache_prompt':False}
        t=time.perf_counter();result=json.loads(command(['exec','-i',self.name,'python3','/opt/oasys/client.py'],input=json.dumps(body),timeout=160).stdout)
        return {'output':result['choices'][0]['message']['content'],'inference_ms':round((time.perf_counter()-t)*1000),'usage':result.get('usage',{})}
    def destroy(self):
        result=command(['rm','-f',self.name],check=False,timeout=15)
        if self.started and result.returncode:raise RuntimeError('Worker teardown failed')
        self.started=False
