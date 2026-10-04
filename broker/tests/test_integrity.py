import copy,secrets
import pytest
from broker.app.auditlog import commitment,digest
from broker.app.runs import RunManager,RunError
from verifier.verify import verify

class FakeWorker:
    def __init__(self,rid):self.name='test-'+rid;self.dead=False
    def start(self):pass
    def infer(self,payload,prompt):return {'output':'Test-only deterministic output','inference_ms':1,'usage':{}}
    def destroy(self):self.dead=True

def policy(payload,policy,rid):return {'payload':payload,'system_prompt':policy['system_prompt'],'blocked':False,'reason':'test'}
@pytest.fixture
def manager(tmp_path):
    m=RunManager(tmp_path,FakeWorker,policy)
    yield m
    m.pool.shutdown()

def setup(m):
    nonce=secrets.token_hex(16);payload='hello';rid=m.create(commitment(payload,nonce));m.set_policy(rid,{'system_prompt':'BLUE PRIVATE','deny':[]})
    return rid,payload,nonce

def completed(m):
    rid,payload,nonce=setup(m);m.reveal(rid,payload,nonce).result(timeout=10);assert m.runs[rid]['phase']=='sealed';return rid

def test_commitment_change_rejected(manager):
    rid,payload,nonce=setup(manager)
    with pytest.raises(RunError,match='Commitment mismatch'):manager.reveal(rid,payload+'changed',nonce)
    assert manager.runs[rid]['phase']=='policy_locked'
def test_policy_immutable(manager):
    rid,_,_=setup(manager)
    with pytest.raises(RunError):manager.set_policy(rid,{'system_prompt':'new'})
def test_no_early_reveal(manager):
    rid,_,_=setup(manager)
    assert 'output' not in manager.view(rid,'red')
    assert 'payload' not in manager.view(rid,'blue')
    with pytest.raises(RunError):manager.bundle(rid)
def test_token_once(manager):
    rid=completed(manager)
    with pytest.raises(RunError):manager.reveal(rid,'hello','x'*32)
def test_token_expiry(manager):
    rid,payload,nonce=setup(manager);manager.runs[rid]['expires']=0
    with pytest.raises(RunError,match='expired'):manager.reveal(rid,payload,nonce)
def test_chain_signature_and_replay(manager):
    rid=completed(manager);bundle=manager.bundle(rid);v=verify(bundle,manager.public_key)
    assert v['valid'] and v['finding_id']==manager.view(rid)['finding_id']
def test_tamper_first_index(manager):
    b=manager.bundle(completed(manager));b['records'][2]['data']['expires_in_seconds']=1000
    v=verify(b,manager.public_key);assert not v['valid'] and v['broken_index']==2
def test_truncation(manager):
    b=manager.bundle(completed(manager));b['records'].pop();assert not verify(b,manager.public_key)['valid']
def test_forged_key(manager):
    b=manager.bundle(completed(manager));b['seal']['public_key']='ab'*32;assert not verify(b,manager.public_key)['valid']
def test_red_never_gets_blue_policy(manager):
    rid=completed(manager);view=manager.view(rid,'red');assert 'BLUE PRIVATE' not in str(view);assert 'policy' not in view;assert 'output' in view

def test_worker_failure_no_seal(manager):
    class Broken(FakeWorker):
        def infer(self,*args):raise RuntimeError('test failure')
    manager.worker_factory=Broken;rid,payload,nonce=setup(manager);manager.reveal(rid,payload,nonce).result(timeout=10)
    assert manager.runs[rid]['phase']=='failed'
    with pytest.raises(RunError):manager.bundle(rid)
def test_restarted_manager_loads_only_verified(manager):
    rid=completed(manager);m2=RunManager(manager.root,FakeWorker,policy)
    try:assert m2.view(rid)['verification']['valid']
    finally:m2.pool.shutdown()

def test_summary_cannot_claim_different_benchmark(manager):
    b=manager.bundle(completed(manager));b['summary']['benchmark_id']='jbb-benign-99';assert not verify(b,manager.public_key)['valid']
def test_summary_cannot_change_duration(manager):
    b=manager.bundle(completed(manager));b['summary']['duration_ms']+=1;assert not verify(b,manager.public_key)['valid']

def test_live_events_follow_execution_without_private_data(manager):
    rid=completed(manager);events=manager.live.after(0,0);kinds=[e['kind'] for e in events]
    assert kinds.index('policy_evaluated')<kinds.index('model_requested')<kinds.index('model_completed')
    assert kinds.index('worker_destroyed')<kinds.index('result_sealed')<kinds.index('verification_passed')
    assert 'BLUE PRIVATE' not in str(events) and 'Test-only deterministic output' not in str(events)
    state=manager.live.snapshot()['runs'][0]
    assert state['verified'] and not state['worker_present']

def test_blocked_input_never_emits_model_request(manager):
    manager.policy_runner=lambda *args:{'blocked':True,'reason':'test rule'}
    rid=completed(manager);events=manager.live.after(0,0)
    assert not any(e['kind']=='model_requested' for e in events)
    assert next(e for e in events if e['kind']=='policy_evaluated')['blocked'] is True

def test_failed_inference_reports_cleanup_without_success(manager):
    class Broken(FakeWorker):
        def infer(self,*args):raise RuntimeError('test failure')
    manager.worker_factory=Broken;rid,payload,nonce=setup(manager);manager.reveal(rid,payload,nonce).result(timeout=10)
    state=manager.live.snapshot()['runs'][0]
    assert state['phase']=='failed' and not state['worker_present'] and not state['verified']
    assert not any(e['kind']=='verification_passed' for e in manager.live.after(0,0))

def test_snapshot_restores_without_replaying_events(manager):
    rid=completed(manager);m=RunManager(manager.root,FakeWorker,policy)
    try:
        snapshot=m.live.snapshot();assert snapshot['runs'][0]['kind']=='restored'
        assert m.live.after(snapshot['sequence'],0)==[]
    finally:m.pool.shutdown()

def test_telemetry_gap_requires_snapshot():
    from broker.app.live import LiveEvents
    bus=LiveEvents()
    for i in range(520):bus.publish('test','event','inference',payload='must never appear')
    assert bus.after(0,0) is None
    assert len(bus.events)==512 and 'must never appear' not in str(bus.snapshot())
