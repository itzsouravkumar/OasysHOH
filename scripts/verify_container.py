"""Run a genuinely separate read-only verifier container against exported evidence."""
import json,sys,tempfile
from pathlib import Path
from broker.app.spawner import ROOT,HARDEN,LABEL,command
files=list((ROOT/'runs').glob('*.bundle.json'))
if len(sys.argv)>1:source=Path(sys.argv[1]).resolve()
elif files:source=max(files,key=lambda p:p.stat().st_mtime)
else:raise SystemExit('Run an evaluation first.')
# Copies are public evidence; the signing key and runtime credentials are never mounted.
with tempfile.TemporaryDirectory(prefix='oasys-verify-',dir=ROOT/'work') as temp:
    directory=Path(temp);directory.chmod(0o755)
    (directory/'bundle.json').write_bytes(source.read_bytes());(directory/'public-key.txt').write_bytes((ROOT/'.state/public-key.txt').read_bytes())
    result=command(['run','--rm',*LABEL,*HARDEN,'--memory','128m','--cpus','0.5','--mount',f'type=bind,source={directory},target=/evidence,readonly','oasys-verifier:local','/evidence/bundle.json','/evidence/public-key.txt'],check=False)
    print(result.stdout or result.stderr);raise SystemExit(result.returncode)
