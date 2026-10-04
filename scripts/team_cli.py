"""Role-separated local API client. Example: python -m scripts.team_cli red commit body.json."""
import argparse,json
from pathlib import Path
import httpx
p=argparse.ArgumentParser();p.add_argument('role',choices=['red','blue','auditor']);p.add_argument('action',choices=['commit','policy','reveal','get']);p.add_argument('body',nargs='?');p.add_argument('--run');args=p.parse_args()
root=Path(__file__).resolve().parents[1];key=json.loads((root/'.state/credentials.json').read_text())[args.role]
if args.action=='commit':path='/api/red/commit'
elif not args.run:p.error('--run is required')
else:path=f'/api/{args.role}/{args.run}'+('' if args.action=='get' else '/'+args.action)
with httpx.Client(base_url='http://127.0.0.1:8787',headers={'Authorization':'Bearer '+key},timeout=30) as c:
    r=c.get(path) if args.action=='get' else c.post(path,json=json.loads(Path(args.body).read_text()))
    print(json.dumps(r.json(),indent=2));raise SystemExit(0 if r.is_success else 1)
