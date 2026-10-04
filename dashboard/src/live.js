import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const $=id=>document.getElementById(id),host=$('live-canvas'),states=new Map(),log=[];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let selected=null,follow=true,connected=false,sceneApi=null,sequence=0,controller,snapshotMode=true;
const semantics={
 boundary_requested:['Testing the boundary','The real red container is attempting a direct connection to the blue workbench.','red','red'],
 boundary_blocked:['Direct connection blocked','The peer connection failed inside the isolated red container. The broker remains the controlled route.','red','red'],
 boundary_unconfirmed:['Boundary not confirmed','The live check did not confirm denial. Inspect the runtime and isolation checks.','red','red'],
 committed:['Payload committed','The attack is fingerprinted before the defense is revealed.','red','broker'],
 policy_locked:['Defense locked','The blue policy is fixed for this evaluation.','blue','broker'],
 token_minted:['Permission issued','A one-use execution token is ready.','broker','broker'],
 payload_revealed:['Payload validated','The broker checked that the submitted attack matches its commitment.','red','broker'],
 token_consumed:['Run queued','Execution is authorized. Runs use one worker slot on this device.','broker','broker'],
 worker_start_requested:['Creating fresh worker','The broker is starting an isolated Qwen container. Cold start may take a moment.','broker','worker'],
 worker_started:['Worker ready','A fresh process is ready, with no network or shared model session.','worker','broker'],
 policy_requested:['Checking the defense','The locked blue policy filters the input in a separate sandbox.','broker','blue'],
 policy_evaluated:['Policy evaluated','The policy decision has returned to the broker.','blue','broker'],
 model_requested:['Qwen is thinking','The allowed request was sent to this run’s fresh model worker.','broker','worker'],
 model_completed:['Result recorded','The broker has recorded the result. Output stays sealed until teardown completes.','worker','broker'],
 finding_recorded:['Finding fingerprinted','A reproducible identifier binds the attack, policy and result.','broker','seal'],
 worker_teardown_requested:['Removing worker','The broker is destroying this run’s model container.','broker','worker'],
 worker_destroyed:['Worker removed','The container is gone. The next evaluation starts with fresh model state.','worker','broker'],
 token_expired:['Permission expired','The one-use execution token cannot be reused.','broker','broker'],
 release_ready:['Ready to seal','Teardown and any requested release padding are complete.','broker','seal'],
 result_sealed:['Run sealed','The evidence has been signed and saved on this device.','broker','seal'],
 verification_passed:['Evidence verified','The hash chain, signature and recorded finding passed verification.','seal','seal'],
 verification_failed:['Verification failed','The evidence did not pass verification. Inspect the evidence vault.','seal','seal'],
 run_failed:['Execution stopped','The run failed. Check the execution details below; no success is claimed.','broker','broker']
};
function current(){return states.get(selected)}
function render(){
 const s=current(),m=semantics[s?.kind];
 $('live-connection').textContent=connected?'● Live connection':'○ Reconnecting · state may be stale';
 $('live-connection').classList.toggle('offline',!connected);
 $('live-run').textContent=s?`RUN ${s.run_id} · ${s.phase}`:'Ready for your first run';
 $('live-title').textContent=m?.[0]||(s?.phase==='sealed'?'Saved, verified run':'See what happens inside Oasys');
 $('live-explain').textContent=m?.[1]||'Choose a scenario below and run it. Watch the attack, defense, broker and fresh model worker work together.';
 if(s?.kind==='policy_evaluated')$('live-explain').textContent=s.blocked?'The defense blocked this input. No model request will be sent.':'The input passed the locked defense. It can now reach the model.';
 $('live-worker').textContent=s?.worker_present?`Worker present · ${s.worker_id||s.run_id}`:'No model worker · fresh state every run';
 $('live-seal').textContent=s?.run_id==='boundary-check'?'Live container connectivity check':s?.verified?'✓ Signature and finding verified':s?.phase==='failed'?'Run failed · inspect details':`${s?.count||0} audit records · not yet verified`;
 $('live-start').disabled=!connected||Boolean(s&&!['sealed','failed'].includes(s.phase));
 $('live-start').textContent=s&&!['sealed','failed'].includes(s.phase)?'Evaluation running…':'Run selected scenario';
 const value=follow?'live':selected; const sel=$('live-select');sel.replaceChildren(new Option('Follow live execution','live'));
 [...states.values()].reverse().forEach(r=>sel.add(new Option(`${r.run_id} · ${r.phase}`,r.run_id)));sel.value=value||'live';
 const entries=log.filter(e=>e.run_id===selected).slice(-6).reverse();$('live-events').replaceChildren();
 for(const e of entries){const li=document.createElement('li'),t=document.createElement('time'),span=document.createElement('span');t.textContent=new Date(e.timestamp).toLocaleTimeString();span.textContent=semantics[e.kind]?.[0]||e.kind;li.append(t,span);$('live-events').append(li)}
 $('live-mode').textContent=follow?(snapshotMode?'CURRENT STATE · WAITING FOR EVENTS':'LIVE OBSERVATION'):'SAVED STATE · NO PLAYBACK';
 sceneApi?.state(s);
}
function accept(type,data){
 connected=true;
 if(type==='snapshot'){snapshotMode=true;states.clear();log.length=0;sequence=data.sequence;for(const s of data.runs)states.set(s.run_id,s);selected=[...states.values()].findLast(s=>!['sealed','failed'].includes(s.phase))?.run_id||[...states.keys()].at(-1)||null;sceneApi?.clear();render();return}
 if(data.sequence<=sequence)return;snapshotMode=false;sequence=data.sequence;
 const s=states.get(data.run_id)||{run_id:data.run_id,worker_present:false,verified:false,count:0};Object.assign(s,data);
 if(data.index!==undefined)s.count=data.index+1;
 if(data.kind==='worker_started')s.worker_present=true;
 if(data.kind==='worker_destroyed')s.worker_present=false;
 states.set(data.run_id,s);log.push(data);if(log.length>200)log.shift();
 if(follow&&(['committed','worker_start_requested','boundary_requested'].includes(data.kind)||!selected))selected=data.run_id;
 render();if(follow&&selected===data.run_id&&!document.hidden)sceneApi?.event(data);
 window.dispatchEvent(new CustomEvent('oasys-runtime',{detail:data}));
}
async function connect(){
 while(true){controller=new AbortController();const watchdog=setInterval(()=>{if(Date.now()-lastByte>12000)controller.abort()},3000);let lastByte=Date.now();
 try{const response=await fetch('/api/live',{headers:{Authorization:'Bearer '+document.querySelector('meta[name="oasys-token"]').content},signal:controller.signal});if(!response.ok)throw Error('Stream unavailable');const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
 while(true){const {done,value}=await reader.read();if(done)break;lastByte=Date.now();buffer+=decoder.decode(value,{stream:true});let end;while((end=buffer.indexOf('\n\n'))>=0){const frame=buffer.slice(0,end);buffer=buffer.slice(end+2);const type=frame.split('\n').find(l=>l.startsWith('event: '))?.slice(7),payload=frame.split('\n').find(l=>l.startsWith('data: '))?.slice(6);if(type&&payload)accept(type,JSON.parse(payload));}}
 }catch(e){/* Authentication stays in headers; reconnect with a fresh snapshot. */}finally{clearInterval(watchdog);controller.abort();connected=false;sceneApi?.clear();render()}
 await new Promise(r=>setTimeout(r,2000));}
}
$('run-form').addEventListener('submit',()=>{follow=true;sceneApi?.clear()});
$('live-start').onclick=()=>{if($('run-button').disabled)return;$('live-start').disabled=true;$('run-form').requestSubmit()};
$('live-boundary').onclick=async()=>{const b=$('live-boundary');b.disabled=true;try{const r=await fetch('/api/boundary',{method:'POST',headers:{Authorization:'Bearer '+document.querySelector('meta[name="oasys-token"]').content}});if(!r.ok)throw Error((await r.json()).detail)}catch(e){$('live-explain').textContent=e.message}finally{b.disabled=false}};
$('live-select').onchange=e=>{follow=e.target.value==='live';selected=follow?[...states.keys()].at(-1):e.target.value;sceneApi?.clear();render()};
window.oasysLive={select(id){if(!states.has(id))return;selected=id;follow=!['sealed','failed'].includes(states.get(id).phase);sceneApi?.clear();render()}};
function createScene(){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0xf0f4fc);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;host.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive 3D Oasys runtime. Drag to orbit, scroll to zoom. Equivalent status appears alongside.');renderer.domElement.tabIndex=0;
 const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xf0f4fc,28,65);const camera=new THREE.PerspectiveCamera(40,1,.1,100);camera.position.set(3,13,21);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.6,0);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=12;controls.maxDistance=38;controls.maxPolarAngle=Math.PI*.47;controls.enablePan=false;controls.update();controls.saveState();$('live-reset').onclick=()=>controls.reset();
 $('live-zoom-in').onclick=()=>{camera.position.sub(controls.target).multiplyScalar(.88).clampLength(12,38).add(controls.target)};$('live-zoom-out').onclick=()=>{camera.position.sub(controls.target).multiplyScalar(1.12).clampLength(12,38).add(controls.target)};
 renderer.domElement.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const v=camera.position.clone().sub(controls.target),sp=new THREE.Spherical().setFromVector3(v);sp.theta+=(e.key==='ArrowLeft'?.12:e.key==='ArrowRight'?-.12:0);sp.phi=THREE.MathUtils.clamp(sp.phi+(e.key==='ArrowUp'?-.1:e.key==='ArrowDown'?.1:0),.1,Math.PI*.47);camera.position.copy(new THREE.Vector3().setFromSpherical(sp).add(controls.target))});
 scene.add(new THREE.HemisphereLight(0xffffff,0x7286ad,3));const sun=new THREE.DirectionalLight(0xffffff,4);sun.position.set(4,14,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13});scene.add(sun);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0xeaf0fa,roughness:.7}));floor.rotation.x=-Math.PI/2;floor.position.y=-.2;floor.receiveShadow=true;scene.add(floor);const grid=new THREE.GridHelper(42,42,0xb2c4e1,0xd2deee);grid.position.y=-.18;scene.add(grid);
 const positions={red:new THREE.Vector3(-7,1,2),blue:new THREE.Vector3(-4,1,-6),broker:new THREE.Vector3(0,1,0),worker:new THREE.Vector3(6,1,-4),seal:new THREE.Vector3(6,1,5)};
 const colors={red:0xd16b63,blue:0x20a4c5,broker:0x6178d5,worker:0x816ccc,seal:0x43a593};
 const nodes={},packets=[],rings=[];
 function mesh(geometry,material,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
 function label(text,parent,y){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#203352';ctx.font='400 38px Poppins,Arial';ctx.textAlign='center';ctx.fillText(text,256,60);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));sprite.position.set(0,y,0);sprite.scale.set(5.7,1.07,1);parent.add(sprite)}
 const names={red:'RED · ATTACK',blue:'BLUE · DEFENSE',broker:'OASYS BROKER',worker:'FRESH QWEN',seal:'SIGNED EVIDENCE'};
 for(const [key,p] of Object.entries(positions)){
 const g=new THREE.Group();g.position.copy(p);scene.add(g);const color=colors[key];const metal=new THREE.MeshStandardMaterial({color:0xced9ed,metalness:.6,roughness:.28});const glow=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.2,metalness:.4,roughness:.25});
 mesh(new THREE.CylinderGeometry(1.75,1.9,.22,6),metal,g,0,-.86);
 const core=new THREE.Group();g.add(core);if(key==='broker'){for(let i=0;i<3;i++)mesh(new THREE.CylinderGeometry(1.1,1.1,.24,48),metal,core,0,i*.6-.2);mesh(new THREE.CylinderGeometry(.76,.76,1.65,48),glow,core,0,.35);mesh(new THREE.TorusGeometry(1.32,.045,12,72),glow,core,0,.35).rotation.x=Math.PI/2}else{for(let i=0;i<3;i++){mesh(new THREE.BoxGeometry(.54,.8+i*.22,.65),metal,core,(i-1)*.66,-.2+i*.1);mesh(new THREE.BoxGeometry(.4,.055,.68),glow,core,(i-1)*.66,.08+i*.21)}}
 if(['red','blue','worker'].includes(key)){const geometry=new THREE.BoxGeometry(3,2.9,2.7);mesh(geometry,new THREE.MeshPhysicalMaterial({color,transparent:true,opacity:.065,roughness:.2,metalness:.1,depthWrite:false}),core,0,.25);const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color,transparent:true,opacity:.35}));edge.position.y=.25;core.add(edge)}
 label(names[key],g,3.05);nodes[key]={group:g,core,glow};if(key==='worker')core.visible=false;
 }
 function curve(a,b){const p=positions[a].clone(),q=positions[b].clone();const mid=p.clone().lerp(q,.5);mid.y+=1.2;return new THREE.QuadraticBezierCurve3(p,mid,q)}
 for(const key of ['red','blue','worker','seal']){const c=curve('broker',key);const line=new THREE.Mesh(new THREE.TubeGeometry(c,64,.038,8,false),new THREE.MeshStandardMaterial({color:0x7d96bd,transparent:true,opacity:.6,metalness:.5,roughness:.4}));scene.add(line)}
 // There is deliberately no red-to-blue route. Boundaries are enforced outside this renderer.
 const chain=new THREE.Group();chain.position.set(4.4,.2,6.4);scene.add(chain);for(let i=0;i<5;i++){mesh(new THREE.BoxGeometry(.36,.36,.36),new THREE.MeshStandardMaterial({color:0x6787b5,metalness:.35,roughness:.3}),chain,i*.7,0,0);if(i)mesh(new THREE.BoxGeometry(.35,.035,.035),new THREE.MeshBasicMaterial({color:0x87a3c8}),chain,i*.7-.35,0,0)}
 function clear(){for(const p of packets){scene.remove(p.group);p.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose()})}packets.length=0;for(const r of rings){scene.remove(r.mesh);r.mesh.geometry.dispose();r.mesh.material.dispose()}rings.length=0}
 function pulse(key){if(reduced.matches)return;const m=mesh(new THREE.TorusGeometry(.65,.025,8,48),new THREE.MeshBasicMaterial({color:colors[key],transparent:true,opacity:.65}),scene);m.rotation.x=Math.PI/2;m.position.copy(positions[key]);rings.push({mesh:m,start:performance.now()})}
 function electricalPacket(from,to,e){
 const path=curve(from,to),group=new THREE.Group();scene.add(group);
 const uniforms={progress:{value:0},signalColor:{value:new THREE.Color(colors[from])}};
 const fragment=`uniform float progress; uniform vec3 signalColor; varying float travel;
 void main(){
 float d=progress-travel;
 float envelope=smoothstep(-.025,.008,d)*(1.-smoothstep(.06,.38,d));
 float head=exp(-pow(d/.024,2.));
 float surge=pow(.5+.5*sin(d*115.),7.);
 float energy=envelope*(.45+.55*surge);
 if(energy+head<.015)discard;
 gl_FragColor=vec4(mix(signalColor,vec3(.86,.98,1.),head*.8),min(1.,energy+head));
 }`;
 const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,toneMapped:false,
 vertexShader:'varying float travel; void main(){travel=uv.x;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:fragment});
 // A luminous current sheath follows exactly the same spline as the physical cable.
 const sheath=new THREE.Mesh(new THREE.TubeGeometry(path,128,.075,8,false),material);group.add(sheath);
 const points=[],travel=[];
 for(let i=0;i<150;i++){
 const t=i/149,point=path.getPoint(t),edge=Math.sin(Math.PI*t);
 // Small deterministic zigzags stay within the cable sheath; these are not free-floating particles.
 point.y+=Math.sin(i*2.4)*.052*edge;point.x+=Math.cos(i*1.7)*.035*edge;
 points.push(point.x,point.y,point.z);travel.push(t);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setAttribute('aTravel',new THREE.Float32BufferAttribute(travel,1));
 group.add(new THREE.Line(geometry,new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,toneMapped:false,
 vertexShader:'attribute float aTravel; varying float travel; void main(){travel=aTravel;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:fragment})));
 const head=mesh(new THREE.SphereGeometry(.12,12,12),new THREE.MeshBasicMaterial({color:0xc9faff,toneMapped:false}),group);
 mesh(new THREE.SphereGeometry(.23,12,12),new THREE.MeshBasicMaterial({color:colors[from],transparent:true,opacity:.23,depthWrite:false,toneMapped:false}),head);
 head.position.copy(path.getPoint(0));
 packets.push({group,curve:path,start:performance.now(),duration:1600+(e.sequence%3)*160,to,electrical:true,uniforms,head});
 }
 function event(e){
 if(e.kind==='boundary_blocked'&&!reduced.matches){const group=new THREE.Group();scene.add(group);for(let i=0;i<7;i++)mesh(new THREE.SphereGeometry(i===0?.095:.055,8,8),new THREE.MeshBasicMaterial({color:colors.red,transparent:true,opacity:1-i/8}),group);const start=positions.red.clone(),end=start.clone().lerp(positions.blue,.4);packets.push({group,curve:new THREE.LineCurve3(start,end),start:performance.now(),duration:750,to:'red'});pulse('red');return}
 const sem=semantics[e.kind];if(!sem||reduced.matches)return;let [,,from,to]=sem;
 if(e.kind==='model_completed'&&e.blocked){from='broker';to='seal'}
 pulse(from);if(from!==to)electricalPacket(from,to,e);
 }
 function state(s){nodes.worker.core.visible=Boolean(s?.worker_present);chain.visible=(s?.count||0)>0;chain.children.forEach((c,i)=>c.visible=i<Math.min(9,Math.ceil((s?.count||0)/2)));nodes.seal.glow.emissiveIntensity=s?.verified?.65:.15;}
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}new ResizeObserver(resize).observe(host);resize();
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('live-fallback').hidden=false;$('live-fallback').textContent='3D graphics paused. Live status and event details remain available. Reload to restore graphics.'});
 function frame(now){requestAnimationFrame(frame);if(document.hidden||!host.offsetParent)return;controls.update();for(let i=packets.length-1;i>=0;i--){const p=packets[i],t=(now-p.start)/p.duration;if(p.electrical){p.uniforms.progress.value=t;p.head.visible=t<=1;p.head.position.copy(p.curve.getPoint(Math.min(1,t)))}else{p.group.children.forEach((m,j)=>{m.position.copy(p.curve.getPoint(Math.max(0,Math.min(1,t-j*.035))))})}if(t>=1&&!p.arrived){pulse(p.to);p.arrived=true}if(t>1.4){scene.remove(p.group);p.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});packets.splice(i,1)}}for(let i=rings.length-1;i>=0;i--){const r=rings[i],t=(now-r.start)/750;r.mesh.scale.setScalar(1+t*2);r.mesh.material.opacity=Math.max(0,(1-t)*.45);if(t>=1){scene.remove(r.mesh);r.mesh.geometry.dispose();r.mesh.material.dispose();rings.splice(i,1)}}const s=current();nodes.worker.glow.emissiveIntensity=connected&&s?.worker_present&&s?.phase==='inference'&&!reduced.matches?.35+Math.sin(now*.004)*.2:.12;renderer.render(scene,camera)}requestAnimationFrame(frame);
 return {event,state,clear};
}
try{await document.fonts.ready;sceneApi=createScene()}catch(e){$('live-fallback').hidden=false;$('live-fallback').textContent='3D graphics are unavailable in this browser. The live event stream and execution controls still work.';for(const id of ['live-reset','live-zoom-in','live-zoom-out'])$(id).disabled=true}
document.addEventListener('visibilitychange',()=>{if(document.hidden)sceneApi?.clear()});render();connect();
