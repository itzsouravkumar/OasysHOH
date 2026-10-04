"""Bounded checks against actual containers. Never reports unmeasured timing as passed."""
import copy,json,secrets,time
from broker.app.spawner import command,ensure_workbenches,Worker,HARDEN,LABEL
from verifier.verify import verify

def result(id,name,status,detail):return {'id':id,'name':name,'status':status,'detail':detail}
def run_suite(manager):
    ensure_workbenches()
    for test,reader,owner,secret in [('T1','red','blue','blue-policy'),('T2','blue','red','red-payload')]:
        sentinel=secrets.token_hex(20);path=f'/tmp/{secret}.txt'
        command(['exec','oasys-'+owner,'python','-c',f"from pathlib import Path;Path({path!r}).write_text({sentinel!r})"])
        check=command(['exec','oasys-'+reader,'python','-c',f"from pathlib import Path; print(Path({path!r}).read_text())"],check=False)
        environ=command(['exec','oasys-'+reader,'python','-c',"from pathlib import Path;print(Path('/proc/1/environ').read_bytes());print(Path('/var/run/docker.sock').exists())"],check=False)
        ok=check.returncode!=0 and 'FileNotFoundError' in check.stderr and sentinel not in environ.stdout and environ.stdout.rstrip().endswith('False')
        yield result(test,f'{reader} cross-read','pass' if ok else 'fail',f'{owner} wrote a real private sentinel; {reader} read failed with ENOENT. No peer sentinel in /proc/1/environ; runtime socket absent.')
    cross=[]
    for role,peer in [('red','blue'),('blue','red')]:
        p=command(['exec','oasys-'+role,'python','-c',f"import socket;socket.create_connection(('oasys-{peer}',8080),timeout=2)"],check=False)
        cross.append(p.returncode!=0 and ('gaierror' in p.stderr or 'OSError' in p.stderr))
    yield result('T3','Cross-zone network','pass' if all(cross) else 'fail','Both peer connection attempts failed. Workbenches have --network=none, no published ports, and no shared namespace.')
    yield result('T4','Prefix timing','skip','Not measured. No shared-cache baseline or statistical AUC experiment has been run. Cold worker state is not proof of zero timing leakage.')
    sealed=[r for r in manager.runs.values() if r['phase']=='sealed']
    if sealed:
        bundle=manager.bundle(sealed[-1]['id']);original=verify(bundle,manager.public_key);changed=copy.deepcopy(bundle);changed['records'][0]['data']['label']+='!';bad=verify(changed,manager.public_key)
        yield result('T5','Tamper detection','pass' if original['valid'] and not bad['valid'] and bad['broken_index']==0 else 'fail',f"Changed one byte in a copy. First broken index: {bad.get('broken_index')}. Original remains valid: {original['valid']}.")
        replay=verify(bundle,manager.public_key)
        yield result('T6','Finding replay','pass' if replay['valid'] and replay['finding_id']==original.get('finding_id') else 'fail','Reconstructed finding '+str(replay.get('finding_id'))+' from recorded evidence; no new inference claimed.')
    else:
        yield result('T5','Tamper detection','skip','Run one evaluation first to produce signed evidence.')
        yield result('T6','Finding replay','skip','Run one evaluation first to produce signed evidence.')
    name='oasys-memory-proof'
    try:
        command(['rm','-f',name],check=False)
        command(['run','--name',name,*LABEL,*HARDEN,'--memory','64m','--memory-swap','64m','python:3.12-slim','python','-c','x=bytearray(160*1024*1024)'],timeout=30,check=False)
        state=json.loads(command(['inspect',name]).stdout)[0]
        oom=state['State']['OOMKilled']
        yield result('T7','Resource boundary','partial' if oom else 'fail',f"Bounded 160 MiB allocation under 64 MiB cgroup: OOMKilled={oom}. PID cap configured at 64. Concurrent model-latency impact not measured.")
    finally:command(['rm','-f',name],check=False)
    w=Worker('egress-proof')
    try:
        w.start()
        probe=command(['exec',w.name,'python3','-c',"import socket;socket.create_connection(('1.1.1.1',443),timeout=2)"],check=False)
        config=json.loads(command(['inspect',w.name]).stdout)[0]
        hard=config['HostConfig'];ok=probe.returncode!=0 and 'Network is unreachable' in probe.stderr and hard['NetworkMode']=='none' and hard['ReadonlyRootfs'] and hard['CapDrop']==['ALL']
        yield result('T8','Worker egress','pass' if ok else 'fail',f"Real model worker outbound TCP returned: {probe.stderr.strip().splitlines()[-1] if probe.stderr else 'CONNECTED'}. Read-only root and all capabilities dropped.")
    finally:w.destroy()
    public=[r for r in sealed if str(r.get('benchmark_id','')).startswith('jbb-benign-')]
    if public:
        r=public[-1];overhead=r.get('duration_ms',0)-r.get('inference_ms',0)
        yield result('T9','Public benchmark','partial',f"{r['benchmark_id']} completed with real Qwen inference. End-to-end {r['duration_ms']} ms; inference {r['inference_ms']} ms; lifecycle overhead {overhead} ms. Separate direct-call baseline not yet measured.")
    else:yield result('T9','Public benchmark','skip','Select the JailbreakBench benign scenario and complete it first.')
