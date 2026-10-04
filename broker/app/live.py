"""Bounded operator-only semantic telemetry. Never carries prompts, policies or outputs."""
import copy,threading
from collections import deque
from datetime import datetime,timezone

class LiveEvents:
    def __init__(self):
        self.condition=threading.Condition();self.events=deque(maxlen=512);self.states={};self.sequence=0
    def publish(self,run_id,kind,phase,**safe):
        allowed={k:v for k,v in safe.items() if k in ('index','hash','timestamp','blocked','worker_id','worker_present','verified')}
        with self.condition:
            self.sequence+=1
            event={'sequence':self.sequence,'run_id':run_id,'kind':kind,'phase':phase,'timestamp':datetime.now(timezone.utc).isoformat(),**allowed}
            state=self.states.setdefault(run_id,{'run_id':run_id,'worker_present':False,'verified':False,'count':0})
            state.update(event)
            if 'index' in event:state['count']=event['index']+1
            if kind=='worker_started':state['worker_present']=True
            if kind=='worker_destroyed':state['worker_present']=False
            self.events.append(event)
            # Active runs are never evicted; retain a bounded recent completed history.
            old=[k for k,s in self.states.items() if s['phase'] in ('sealed','failed')]
            for k in old[:-32]:del self.states[k]
            self.condition.notify_all()
            return copy.deepcopy(event)
    def snapshot(self):
        with self.condition:return {'sequence':self.sequence,'runs':copy.deepcopy(list(self.states.values()))}
    def after(self,cursor,timeout=1):
        with self.condition:
            self.condition.wait_for(lambda:self.sequence>cursor,timeout)
            if self.events and cursor<self.events[0]['sequence']-1:return None
            return copy.deepcopy([e for e in self.events if e['sequence']>cursor])
