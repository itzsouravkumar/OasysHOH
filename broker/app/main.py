import asyncio,copy,json,os,secrets,threading,time
from pathlib import Path
from fastapi import Depends,FastAPI,Header,HTTPException,Request
from fastapi.responses import HTMLResponse,JSONResponse,FileResponse,StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel,Field,field_validator
from starlette.middleware.trustedhost import TrustedHostMiddleware
from .auditlog import commitment
from .runs import RunError,RunManager
from .spawner import ROOT,availability
from verifier.verify import verify

app=FastAPI(title='Oasys',docs_url=None,redoc_url=None)
app.add_middleware(TrustedHostMiddleware,allowed_hosts=['localhost','127.0.0.1','testserver'])
manager=RunManager()
credential_path=ROOT/'.state/credentials.json'
if not credential_path.exists():
    fd=os.open(credential_path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'w') as f:json.dump({r:secrets.token_urlsafe(32) for r in ('operator','red','blue','auditor')},f)
credentials=json.loads(credential_path.read_text())
app.mount('/static',StaticFiles(directory=ROOT/'dashboard/static'),name='static')
templates=Jinja2Templates(directory=ROOT/'dashboard/templates')

def require(role):
    def check(authorization:str=Header(default='')):
        if not secrets.compare_digest(authorization,'Bearer '+credentials[role]):raise HTTPException(403,'This trust zone is not authorized for this operation')
        return role
    return check
operator=require('operator');red=require('red');blue=require('blue');auditor=require('auditor')
@app.exception_handler(RunError)
async def run_error(request,exc):return JSONResponse(status_code=409,content={'detail':str(exc)})
@app.middleware('http')
async def safety_headers(request,call_next):
    response=await call_next(request)
    response.headers['X-Content-Type-Options']='nosniff';response.headers['X-Frame-Options']='DENY';response.headers['Referrer-Policy']='no-referrer';response.headers['Cache-Control']='no-store'
    response.headers['Content-Security-Policy']="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
    return response
app.mount('/assets',StaticFiles(directory=ROOT/'landing/dist/assets',check_dir=False),name='landing-assets')
@app.get('/',response_class=HTMLResponse)
def landing():
    path=ROOT/'landing/dist/index.html'
    if not path.exists():raise HTTPException(503,'Build the landing page with: make landing')
    return FileResponse(path,media_type='text/html')
@app.get('/console',response_class=HTMLResponse)
def index(request:Request):return templates.TemplateResponse(request=request,name='index.html',context={'token':credentials['operator']})

class Policy(BaseModel):
    system_prompt:str=Field(min_length=1,max_length=4000)
    deny:list[str]=Field(default_factory=list,max_length=30)
    allow:list[str]=Field(default_factory=list,max_length=30)
    strip_control_chars:bool=True
    @field_validator('deny','allow')
    @classmethod
    def patterns(cls,v):
        if any(not p.strip() or len(p)>200 for p in v):raise ValueError('Patterns must contain 1–200 characters')
        return v
class Commit(BaseModel):
    commitment:str=Field(pattern=r'^[0-9a-f]{64}$')
    label:str=Field(default='Custom evaluation',max_length=100)
class Reveal(BaseModel):
    payload:str=Field(min_length=1,max_length=6000)
    nonce:str=Field(min_length=16,max_length=128)
    quantum:int=Field(default=0,ge=0,le=30)
class Demo(BaseModel):
    label:str=Field(default='Custom evaluation',min_length=1,max_length=100)
    benchmark_id:str|None=Field(default=None,max_length=100)
    payload:str=Field(min_length=1,max_length=6000)
    policy:Policy
    quantum:int=Field(default=0,ge=0,le=30)

_status={'at':0,'value':{}}
@app.get('/api/status',dependencies=[Depends(operator)])
def status():
    if time.monotonic()-_status['at']>8:
        _status.update(at=time.monotonic(),value=availability())
    return {**_status['value'],'public_key':manager.public_key,'model':'Qwen2.5-1.5B-Instruct · Q4_K_M','mode':'Local operator console','isolation':'Networkless Linux containers · Docker Desktop VM','rootless_required_for_proposal':True}
@app.get('/api/scenarios',dependencies=[Depends(operator)])
def scenarios():return json.loads((ROOT/'data/scenarios.json').read_text())
@app.get('/api/runs',dependencies=[Depends(operator)])
def runs():return [manager.summary(r) for r in reversed(list(manager.runs.values()))]
@app.post('/api/runs',status_code=202,dependencies=[Depends(operator)])
def demo(body:Demo):
    if proof['running']:raise HTTPException(409,'Wait for the isolation proof suite to finish')
    if body.benchmark_id:
        known=next((s for s in scenarios() if s['id']==body.benchmark_id),None)
        if not known or known['payload']!=body.payload:raise HTTPException(422,'Benchmark ID must match the original scenario payload')
    if not availability()['ready']:raise HTTPException(503,'Runtime or model is not ready. Run make setup.')
    nonce=secrets.token_hex(24);rid=manager.create(commitment(body.payload,nonce),body.label,body.benchmark_id)
    manager.set_policy(rid,body.policy.model_dump());manager.reveal(rid,body.payload,nonce,body.quantum)
    return {'id':rid}
@app.get('/api/runs/{rid}',dependencies=[Depends(operator)])
def detail(rid:str):return manager.view(rid)
@app.get('/api/runs/{rid}/export',dependencies=[Depends(operator)])
def export(rid:str):return JSONResponse(manager.bundle(rid),headers={'Content-Disposition':f'attachment; filename="oasys-{rid}.json"'})
@app.post('/api/runs/{rid}/verify',dependencies=[Depends(operator)])
def check(rid:str):
    result=verify(manager.bundle(rid),manager.public_key)
    manager.live.publish(rid,'verification_passed' if result['valid'] else 'verification_failed','sealed',verified=result['valid'])
    return result
@app.post('/api/runs/{rid}/tamper',dependencies=[Depends(operator)])
def tamper(rid:str):
    bundle=manager.bundle(rid);bundle['records'][0]['data']['label']+='!'
    return {'original':verify(manager.bundle(rid),manager.public_key),'tampered':verify(bundle,manager.public_key),'note':'A copy was modified. Original evidence is untouched.'}
@app.post('/api/red/commit',dependencies=[Depends(red)])
def commit(body:Commit):return {'id':manager.create(body.commitment,body.label)}
@app.post('/api/blue/{rid}/policy',dependencies=[Depends(blue)])
def policy(rid:str,body:Policy):manager.set_policy(rid,body.model_dump());return {'phase':'policy_locked'}
@app.post('/api/red/{rid}/reveal',status_code=202,dependencies=[Depends(red)])
def reveal(rid:str,body:Reveal):manager.reveal(rid,body.payload,body.nonce,body.quantum);return {'phase':'queued'}
@app.get('/api/red/{rid}',dependencies=[Depends(red)])
def red_view(rid:str):return manager.view(rid,'red')
@app.get('/api/blue/{rid}',dependencies=[Depends(blue)])
def blue_view(rid:str):return manager.view(rid,'blue')
@app.get('/api/auditor/{rid}',dependencies=[Depends(auditor)])
def audit_view(rid:str):return manager.bundle(rid)

proof_path=ROOT/'docs/proof-results.json'
proof={'running':False,'results':[],'completed_at':None}
if proof_path.exists():
    try:proof.update(json.loads(proof_path.read_text()),running=False)
    except ValueError:pass
proof_lock=threading.Lock()
@app.get('/api/proof',dependencies=[Depends(operator)])
def proof_status():return copy.deepcopy(proof)
@app.post('/api/proof',status_code=202,dependencies=[Depends(operator)])
def start_proof():
    with proof_lock:
        if proof['running']:raise HTTPException(409,'Proof suite is already running')
        if any(r['phase'] not in ('sealed','failed','committed','policy_locked') for r in manager.runs.values()):raise HTTPException(409,'Wait for the active run before checking isolation')
        proof.update(running=True,results=[],completed_at=None)
    def execute():
        from attacks.proof import run_suite
        try:
            for item in run_suite(manager):proof['results'].append(item)
        except Exception as e:proof['results'].append({'id':'ERROR','name':'Proof suite','status':'fail','detail':str(e)})
        finally:
            proof.update(running=False,completed_at=time.time())
            proof_path.write_text(json.dumps(proof,indent=2))
    threading.Thread(target=execute,daemon=True).start();return {'running':True}

@app.post('/api/verify',dependencies=[Depends(operator)])
def verify_import(bundle:dict):
    if len(json.dumps(bundle))>2_000_000:raise HTTPException(413,'Evidence bundle exceeds 2 MB')
    return verify(bundle,manager.public_key)


DOC_TOPICS={
 'overview': {'title':'Getting started','subtitle':'Run a local evaluation, inspect the result, and verify its evidence.','sections':[
 ('1. Start Oasys','Run make up from the project folder, then open the console. Docker Desktop must be running. No hosted model API key is needed.'),
 ('2. Choose an evaluation','In Evaluations, select a starting scenario. Instruction override tests a synthetic secret; Password strength is a genuine JailbreakBench benign control. Review the payload and blue policy, then Run evaluation.'),
 ('3. Inspect the evidence','After the worker finishes and is destroyed, the broker releases the response and sealed evidence. Evidence vault lets you verify, export, or test a modified copy.'),
 ('4. Demonstrate the boundary','Isolation & proof runs real bounded checks. Partial and skipped checks are shown explicitly. This local operator console is trusted and must not be exposed publicly.')]},
 'logging': {'title':'Sealed evidence','subtitle':'A hash chain, a signed seal, and an independently reproducible finding.','sections':[
 ('Hash chain','Each append-mode JSONL event binds its content to the preceding record using SHA-256. Changing a byte changes the chain.'),
 ('Signed seal','Ed25519 signs the chain head and record count. Verification uses this installation’s pinned public key, not an arbitrary key from an imported file.'),
 ('Verify and replay','Replay reconstructs the finding ID from recorded evidence. It does not claim a new model inference will produce identical text. Test tamper detection changes a copy and leaves the original untouched.'),
 ('Export responsibly','A complete evidence bundle contains the attack, blue policy, and output. Export it only for an authorized auditor. The red API does not expose the blue policy.')]},
 'security': {'title':'Security boundaries','subtitle':'What the local MVP enforces, and what remains outside its guarantees.','sections':[
 ('Separate execution','Non-root Linux containers use read-only roots, no network, dropped capabilities, no-new-privileges and resource limits. The broker talks to a fresh model worker through exec stdin.'),
 ('Trusted host','The host operator and broker are trusted. Docker Desktop runs a Linux VM on this device; this is not the proposed rootless Podman deployment.'),
 ('Residual risk','Shared kernels, host administrators, signing-key compromise, behavioral leakage and residual timing channels remain. Statistical timing comparison is not claimed as complete.'),
 ('Local operation','Keep the server on 127.0.0.1. The local console is an operator interface, not production authentication or a public judge portal.')]}
}
@app.get('/docs',response_class=HTMLResponse)
def docs_home(request:Request):
    return templates.TemplateResponse(request=request,name='docs.html',context={'topic':DOC_TOPICS['overview']})
@app.get('/docs/{topic}',response_class=HTMLResponse)
def docs_topic(request:Request,topic:str):
    if topic=='specification.md':return FileResponse(ROOT/'docs/SPECIFICATION.md',media_type='text/markdown',filename='Oasys-Specification.md')
    if topic not in DOC_TOPICS:raise HTTPException(404,'Documentation page not found')
    return templates.TemplateResponse(request=request,name='docs.html',context={'topic':DOC_TOPICS[topic]})

@app.get('/api/live',dependencies=[Depends(operator)])
async def live_events(request:Request):
    async def stream():
        snapshot=manager.live.snapshot();cursor=snapshot['sequence']
        yield 'event: snapshot\ndata: '+json.dumps(snapshot)+'\n\n'
        while not await request.is_disconnected():
            events=await asyncio.to_thread(manager.live.after,cursor)
            if events is None:
                snapshot=manager.live.snapshot();cursor=snapshot['sequence']
                yield 'event: snapshot\ndata: '+json.dumps(snapshot)+'\n\n'
            elif events:
                for event in events:
                    cursor=event['sequence']
                    yield 'event: runtime\ndata: '+json.dumps(event)+'\n\n'
            else:yield ': heartbeat\n\n'
    return StreamingResponse(stream(),media_type='text/event-stream',headers={'X-Accel-Buffering':'no','Cache-Control':'no-store'})

boundary_lock=threading.Lock()
@app.post('/api/boundary',dependencies=[Depends(operator)])
def boundary_check():
    if not boundary_lock.acquire(blocking=False):raise HTTPException(409,'A boundary check is already running')
    try:
        from .spawner import command,ensure_workbenches
        ensure_workbenches()
        manager.live.publish('boundary-check','boundary_requested','checking')
        attempt=command(['exec','oasys-red','python','-c',"import socket;socket.create_connection(('oasys-blue',8080),timeout=2)"],check=False,timeout=8)
        blocked=attempt.returncode!=0 and ('gaierror' in attempt.stderr or 'Network is unreachable' in attempt.stderr)
        manager.live.publish('boundary-check','boundary_blocked' if blocked else 'boundary_unconfirmed','sealed',blocked=blocked)
        return {'blocked':blocked,'detail':'Peer connection failed from the red container.' if blocked else 'Boundary denial was not confirmed. Inspect isolation checks.'}
    except Exception:
        manager.live.publish('boundary-check','boundary_unconfirmed','failed')
        raise HTTPException(503,'Boundary check could not complete. Check the container runtime.')
    finally:boundary_lock.release()
