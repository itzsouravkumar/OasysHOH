"""Small append-only audit writer. The host operator remains trusted."""
import hashlib,json,os
from datetime import datetime,timezone
from pathlib import Path
from nacl.signing import SigningKey

def canonical(value):
    return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()

def digest(value):
    return hashlib.sha256(canonical(value)).hexdigest()

def commitment(payload,nonce):
    return hashlib.sha256((payload+nonce).encode()).hexdigest()

def load_key(path:Path):
    if not path.exists():
        key=SigningKey.generate()
        fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        with os.fdopen(fd,'wb') as f:f.write(bytes(key))
    return SigningKey(path.read_bytes())

class AuditLog:
    def __init__(self,path,run_id):
        self.path=Path(path);self.run_id=run_id;self.records=[]
        if self.path.exists():raise ValueError('An audit log cannot be overwritten')
    def append(self,kind,data):
        record={'index':len(self.records),'run_id':self.run_id,'timestamp':datetime.now(timezone.utc).isoformat(),'kind':kind,'data':data,'previous':self.records[-1]['hash'] if self.records else '0'*64}
        record['hash']=digest(record)
        fd=os.open(self.path,os.O_WRONLY|os.O_CREAT|os.O_APPEND,0o600)
        with os.fdopen(fd,'ab') as f:f.write(canonical(record)+b'\n');f.flush();os.fsync(f.fileno())
        self.records.append(record)
        return record
    def seal(self,key):
        content={'run_id':self.run_id,'head':self.records[-1]['hash'],'count':len(self.records),'algorithm':'Ed25519'}
        return {**content,'signature':key.sign(canonical(content)).signature.hex(),'public_key':key.verify_key.encode().hex()}
