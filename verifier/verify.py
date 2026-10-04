"""Independent verification: no broker imports, no private signing key."""
import hashlib,json,sys
from nacl.signing import VerifyKey

def canonical(v):return json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
def digest(v):return hashlib.sha256(canonical(v)).hexdigest()
def finding_id(payload,policy_hash,output,blocked):
    return digest({'payload':payload,'policy_hash':policy_hash,'output':output,'blocked':blocked})[:24]

def verify(bundle,trusted_public_key):
    try:
        records=bundle['records'];seal=bundle['seal'];previous='0'*64
        if not records:return {'valid':False,'error':'Empty audit log','broken_index':0}
        for i,rec in enumerate(records):
            unsigned={k:v for k,v in rec.items() if k!='hash'}
            if rec['index']!=i or rec['previous']!=previous or rec['run_id']!=seal['run_id'] or digest(unsigned)!=rec['hash']:
                return {'valid':False,'error':'Hash chain mismatch','broken_index':i}
            previous=rec['hash']
        if seal['head']!=previous or seal['count']!=len(records):return {'valid':False,'error':'Truncated or extended chain','broken_index':len(records)}
        if seal['public_key']!=trusted_public_key:return {'valid':False,'error':'Untrusted signing key','broken_index':None}
        signed={k:seal[k] for k in ('run_id','head','count','algorithm')}
        if signed['algorithm']!='Ed25519':raise ValueError('Unsupported signature algorithm')
        VerifyKey(bytes.fromhex(trusted_public_key)).verify(canonical(signed),bytes.fromhex(seal['signature']))
        by_kind={r['kind']:r['data'] for r in records}
        attack=by_kind['payload_revealed'];policy=by_kind['policy_locked'];result=by_kind['model_completed']
        if hashlib.sha256((attack['payload']+attack['nonce']).encode()).hexdigest()!=by_kind['committed']['commitment']:raise ValueError('Commitment mismatch')
        if digest(policy['policy'])!=policy['policy_hash']:raise ValueError('Policy digest mismatch')
        finding=finding_id(attack['payload'],policy['policy_hash'],result['output'],result['blocked'])
        if finding!=by_kind['finding_recorded']['finding_id']:raise ValueError('Finding mismatch')
        if 'worker_destroyed' not in by_kind or 'token_expired' not in by_kind:raise ValueError('Incomplete teardown')
        expected={'id':seal['run_id'],'label':by_kind['committed']['label'],'benchmark_id':by_kind['committed'].get('benchmark_id'),'commitment':by_kind['committed']['commitment'],'policy_hash':policy['policy_hash'],'finding_id':finding,'duration_ms':by_kind['release_ready']['duration_ms'],'inference_ms':result['inference_ms'],'blocked':result['blocked'],'phase':'sealed'}
        for key,value in expected.items():
            if bundle.get('summary',{}).get(key)!=value:raise ValueError('Unsigned summary disagrees with evidence: '+key)

        return {'valid':True,'records':len(records),'finding_id':finding,'head':previous,'signature_valid':True,'replay':'Deterministic finding reconstruction from recorded evidence; not a new model inference.'}
    except Exception as e:return {'valid':False,'error':str(e) or type(e).__name__,'broken_index':None}

if __name__=='__main__':
    if len(sys.argv)!=3:raise SystemExit('Usage: python -m verifier.verify BUNDLE.json TRUSTED_PUBLIC_KEY_FILE')
    result=verify(json.load(open(sys.argv[1])),open(sys.argv[2]).read().strip());print(json.dumps(result,indent=2));raise SystemExit(0 if result['valid'] else 1)
