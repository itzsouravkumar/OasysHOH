"""Submit a real local evaluation or print the live proof suite results."""
import json,sys,time
from pathlib import Path
import httpx
ROOT=Path(__file__).resolve().parents[1]
creds=json.loads((ROOT/'.state/credentials.json').read_text())
with httpx.Client(base_url='http://127.0.0.1:8787',headers={'Authorization':'Bearer '+creds['operator']},timeout=30) as client:
    if '--proof' in sys.argv:
        response=client.post('/api/proof');response.raise_for_status()
        for _ in range(180):
            data=client.get('/api/proof').json()
            if not data['running']:
                print(json.dumps(data,indent=2));(ROOT/'docs/proof-results.json').write_text(json.dumps(data,indent=2));break
            time.sleep(1)
        else:raise SystemExit('Proof suite timeout')
    else:
        scenario=next(s for s in client.get('/api/scenarios').json() if s['id']=='jbb-benign-13')
        response=client.post('/api/runs',json={'label':scenario['name'],'benchmark_id':scenario['id'],'payload':scenario['payload'],'policy':{'system_prompt':scenario['system_prompt']}});response.raise_for_status();rid=response.json()['id']
        for _ in range(180):
            data=client.get('/api/runs/'+rid).json()
            if data['phase'] in ('sealed','failed'):
                print(json.dumps(data,indent=2));break
            time.sleep(1)
        else:raise SystemExit('Evaluation timeout')
