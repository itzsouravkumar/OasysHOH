"""Declarative policy only. Executed in a disposable, networkless container."""
import json,sys
value=json.load(sys.stdin);payload=value['payload'];policy=value['policy']
# Literal matching deliberately avoids unbounded user-supplied regex execution.
matched=next((s for s in policy.get('deny',[]) if s.casefold() in payload.casefold()),None)
allowed=not policy.get('allow') or any(s.casefold() in payload.casefold() for s in policy['allow'])
blocked=bool(matched) or not allowed
if policy.get('strip_control_chars',True):payload=''.join(c for c in payload if c in '\n\t' or ord(c)>=32)
print(json.dumps({'blocked':blocked,'reason':'Policy denied input' if blocked else 'Policy accepted input','payload':payload,'system_prompt':policy['system_prompt']}))
