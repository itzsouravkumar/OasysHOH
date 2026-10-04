from broker.app.spawner import command
ids=command(['ps','-aq','--filter','label=app=oasys']).stdout.split()
if ids:command(['rm','-f',*ids])
print('Oasys containers stopped. Existing evidence and model files retained. Stop make up with Ctrl-C.')
