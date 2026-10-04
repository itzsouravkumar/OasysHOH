import json
from fastapi.testclient import TestClient
from broker.app.main import app,credentials
client=TestClient(app)
def auth(role):return {'Authorization':'Bearer '+credentials[role]}
def test_no_anonymous_evidence():assert client.get('/api/runs').status_code==403
def test_red_cannot_submit_blue_policy():assert client.post('/api/blue/anything/policy',headers=auth('red'),json={'system_prompt':'test'}).status_code==403
def test_blue_cannot_commit():assert client.post('/api/red/commit',headers=auth('blue'),json={'commitment':'a'*64}).status_code==403
def test_red_cannot_export_full_bundle():assert client.get('/api/runs/anything/export',headers=auth('red')).status_code==403
def test_external_host_rejected():assert client.get('/',headers={'Host':'evil.example'}).status_code==400
def test_schema_limits():assert client.post('/api/runs',headers=auth('operator'),json={'payload':'a'*6001,'policy':{'system_prompt':'test'}}).status_code==422
def test_blank_deny_rejected():assert client.post('/api/runs',headers=auth('operator'),json={'payload':'test','policy':{'system_prompt':'test','deny':['']}}).status_code==422
def test_security_headers():
 r=client.get('/');assert r.headers['x-frame-options']=='DENY';assert "frame-ancestors 'none'" in r.headers['content-security-policy']
def test_benchmark_label_cannot_be_forged():
    r=client.post('/api/runs',headers=auth('operator'),json={'payload':'not a benchmark row','benchmark_id':'jbb-benign-13','policy':{'system_prompt':'test'}})
    assert r.status_code==422

def test_import_rejects_malformed_evidence():
    r=client.post('/api/verify',headers=auth('operator'),json={'records':[],'seal':{}})
    assert r.status_code==200 and r.json()['valid'] is False

def test_console_and_documentation_routes():
    r=client.get('/console')
    assert r.status_code==200 and '/static/poppins.css' in r.text
    for path in ('/docs','/docs/logging','/docs/security','/docs/specification.md'):
        assert client.get(path).status_code==200
    assert client.get('/docs/not-a-topic').status_code==404

def test_built_landing_serves_without_operator_credentials():
    from broker.app.main import ROOT
    if not (ROOT/'landing/dist/index.html').exists():
        import pytest
        pytest.skip('Build landing before testing production assets')
    r=client.get('/')
    assert r.status_code==200 and 'id="root"' in r.text
    assert credentials['operator'] not in r.text
    for path in ('/assets/heroimage.webp','/assets/fonts.css','/static/fonts/poppins-300.ttf'):
        assert client.get(path).status_code==200

def test_live_stream_and_boundary_are_operator_only():
    for headers in ({},auth('red'),auth('blue'),auth('auditor')):
        assert client.get('/api/live',headers=headers).status_code==403
        assert client.post('/api/boundary',headers=headers).status_code==403
