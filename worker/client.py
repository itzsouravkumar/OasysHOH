import json,sys,urllib.request
body=json.load(sys.stdin)
req=urllib.request.Request('http://127.0.0.1:8080/v1/chat/completions',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'})
with urllib.request.urlopen(req,timeout=150) as response:print(response.read().decode())
