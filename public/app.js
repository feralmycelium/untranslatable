import './asemic.js';
import {RULES,SEEDS,boundsOf,placementIssue} from './rules.js';
import {drawTrace} from './ink.js';
const $=id=>document.getElementById(id),paper=$('paper'),ctx=paper.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let width=innerWidth,height=innerHeight,dpr=Math.min(devicePixelRatio||1,2);
const camera={x:0,y:0,z:Math.min(innerWidth/1180,innerHeight/1380)};
const state={mode:'explore',paused:reduced.matches,kind:'script',ink:'ink',moving:false,saving:false,items:[],cursor:0,total:0,connected:false,draft:null};
let dirty=true,elapsed=12,lastFrame=0,travel=null,noticeTimer,activeStroke=null,gesture=null,pinch=null,loaded=false;
const pointers=new Map(),seedCache=new Map(),seedWorks=new Map();
const original=new Image();original.src='/art/original.svg';original.onload=()=>dirty=true;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const screenToWorld=(x,y)=>({x:camera.x+(x-width/2)/camera.z,y:camera.y+(y-height/2)/camera.z});
function notice(text,ms=6000){clearTimeout(noticeTimer);$('status').textContent=text;if(ms)noticeTimer=setTimeout(()=>$('status').textContent='',ms);}
function persistDraft(){try{if(state.draft?.strokes.length)localStorage.setItem('untranslatable-draft-v1',JSON.stringify(state.draft));else localStorage.removeItem('untranslatable-draft-v1');}catch{notice('This browser cannot keep a draft between visits. You can still leave it here.');}}
try{const draft=JSON.parse(localStorage.getItem('untranslatable-draft-v1')||'null');if(draft?.strokes?.length&&Number.isFinite(draft.x)&&Number.isFinite(draft.y))state.draft=draft;}catch{}
function resize(){width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,2);paper.width=Math.round(width*dpr);paper.height=Math.round(height*dpr);dirty=true;}
addEventListener('resize',resize);resize();
function moveTo(x,y,z=camera.z){
  const target={x:clamp(x,-RULES.worldLimit,RULES.worldLimit),y:clamp(y,-RULES.worldLimit,RULES.worldLimit),z:clamp(z,.055,3.5)};
  if(reduced.matches){Object.assign(camera,target);travel=null;}else travel={from:{...camera},to:target,start:performance.now()};
  dirty=true;
}
function zoom(factor,x=width/2,y=height/2){travel=null;const before=screenToWorld(x,y);camera.z=clamp(camera.z*factor,.055,3.5);const after=screenToWorld(x,y);camera.x+=before.x-after.x;camera.y+=before.y-after.y;dirty=true;}
function visit(seed){closeIndex();moveTo(seed.x+seed.w/2,seed.y+seed.h/2,Math.min((width-100)/seed.w,(height-190)/seed.h));$('place-title').textContent=seed.title;$('place-kind').textContent=seed.id==='original'?'The beginning':'A passage';}
function closeIndex(){$('index').hidden=true;$('index-toggle').setAttribute('aria-expanded','false');}
for(const seed of SEEDS){const b=document.createElement('button');b.textContent=seed.title;b.onclick=()=>visit(seed);$('passages').append(b);}
$('index-toggle').onclick=()=>{const hidden=$('index').hidden;$('index').hidden=!hidden;$('index-toggle').setAttribute('aria-expanded',String(hidden));};
document.querySelector('[data-close="index"]').onclick=closeIndex;
$('home').onclick=()=>{if(state.mode==='make')keepDraft();visit(SEEDS[0]);};
$('fit').onclick=()=>{const boxes=[...SEEDS.map(s=>({x:s.x,y:s.y,right:s.x+s.w,bottom:s.y+s.h})),...state.items.map(boundsOf)];const left=Math.min(...boxes.map(b=>b.x)),right=Math.max(...boxes.map(b=>b.right)),top=Math.min(...boxes.map(b=>b.y)),bottom=Math.max(...boxes.map(b=>b.bottom));moveTo((left+right)/2,(top+bottom)/2,Math.min((width-90)/(right-left+300),(height-210)/(bottom-top+300)));};
$('zoom-in').onclick=()=>zoom(1.3);$('zoom-out').onclick=()=>zoom(1/1.3);
$('pause').onclick=()=>{state.paused=!state.paused;updateTools();dirty=true;};
reduced.addEventListener('change',()=>{if(reduced.matches){state.paused=true;travel=null;updateTools();}});
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notice('Full screen is unavailable in this browser.');}};
$('about-toggle').onclick=()=>$('about').showModal();$('about-close').onclick=()=>$('about').close();
$('latest').onclick=()=>{const item=state.items.at(-1);if(!item){notice('The shared manuscript is waiting for its first trace.');return;}closeIndex();const b=boundsOf(item);moveTo((b.x+b.right)/2,(b.y+b.bottom)/2,Math.min(1,(width-120)/(b.right-b.x+250),(height-240)/(b.bottom-b.y+250)));};
function updateTools(){
  document.body.dataset.mode=state.mode;document.body.dataset.moving=String(state.moving);
  $('making').hidden=state.mode!=='make';$('pause').textContent=state.paused?'Let ink move':'Pause ink';$('pause').setAttribute('aria-pressed',String(state.paused));
  document.querySelectorAll('#making button').forEach(b=>b.disabled=state.saving);
  $('leave').disabled=!state.draft?.strokes.length||state.saving;$('leave').textContent=state.saving?'Leaving…':'Leave here';$('undo').disabled=!state.draft?.strokes.length||state.saving;
  $('make').textContent=state.draft?.strokes.length?'Continue your trace':'Make a mark';
  $('move-trace').setAttribute('aria-pressed',String(state.moving));
  $('script').setAttribute('aria-pressed',String(state.kind==='script'));$('thread').setAttribute('aria-pressed',String(state.kind==='thread'));
  document.querySelectorAll('[data-ink]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ink===state.ink)));
}
function emptyPlace(){
  const probe=(x,y)=>({x,y,strokes:[{points:[[-260,-180,.5],[260,180,.5]]}]});
  for(let ring=0;ring<45;ring++)for(let n=0;n<Math.max(1,ring*9);n++){
    const a=n/Math.max(1,ring*9)*Math.PI*2,x=camera.x+Math.cos(a)*ring*650,y=camera.y+Math.sin(a)*ring*650;
    if(Math.abs(x)<49000&&Math.abs(y)<49000&&!placementIssue(probe(x,y),state.items))return{x,y};
  }
  return{x:4200,y:4200};
}
function make(){
  closeIndex();if(!state.draft){const at=emptyPlace();state.draft={id:crypto.randomUUID(),...at,strokes:[]};}
  state.mode='make';state.moving=false;moveTo(state.draft.x,state.draft.y,Math.min(1.55,(width-65)/650,(height-300)/520));updateTools();
  paper.focus({preventScroll:true});
}
function keepDraft(){if(state.saving)return;state.mode='explore';state.moving=false;activeStroke=null;persistDraft();updateTools();dirty=true;}
$('make').onclick=make;$('cancel').onclick=keepDraft;
$('script').onclick=()=>{state.kind='script';state.moving=false;updateTools();};$('thread').onclick=()=>{state.kind='thread';state.moving=false;updateTools();};
document.querySelectorAll('[data-ink]').forEach(b=>b.onclick=()=>{state.ink=b.dataset.ink;updateTools();});
$('undo').onclick=()=>{state.draft.strokes.pop();activeStroke=null;persistDraft();updateTools();dirty=true;};
$('move-trace').onclick=()=>{state.moving=!state.moving;updateTools();notice(state.moving?'Drag to move your whole trace.':'Move your hand to keep drawing.');};
$('add-line').onclick=()=>{
  if(state.draft.strokes.length>=RULES.maxStrokes)return notice('This trace is full. Leave it here, then begin another.');
  const y=-150+state.draft.strokes.length*28,points=Array.from({length:70},(_,i)=>[-240+i*7,y+Math.sin(i*.16)*4,.5]);
  const trace={...state.draft,strokes:[...state.draft.strokes,{kind:state.kind,ink:state.ink,seed:crypto.getRandomValues(new Uint32Array(1))[0],points}]};
  if(boundsOf(trace).bottom-boundsOf(trace).y>RULES.maxTraceSpan)return notice('This trace has enough lines. Leave it here to begin another.');
  if(trace.strokes.reduce((n,s)=>n+s.points.length,0)>RULES.maxPoints)return notice('This trace has enough ink. Leave it here to continue elsewhere.');
  state.draft=trace;persistDraft();updateTools();dirty=true;
};
$('leave').onclick=async()=>{
  if(state.saving||!state.draft?.strokes.length)return;
  const issue=placementIssue(state.draft,state.items);if(issue)return notice(issue,0);
  state.saving=true;updateTools();
  try{
    const response=await fetch('/api/marks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state.draft)});
    const result=await response.json();
    if(!response.ok){
      const messages={storage_unavailable:'The manuscript could not save just now. Your trace is safe here; try Leave here again.',id_conflict:'This trace was already left here. Keep this draft, then reload to find it.',invalid_payload:'This trace exceeds the drawing limits. Undo the last stroke and try again.'};
      throw new Error(result.message||messages[result.error]||'Your trace could not be saved. Try Leave here again.');
    }
    if(!state.items.some(i=>i.id===result.item.id))state.items.push(result.item);
    state.draft=null;persistDraft();state.mode='explore';state.moving=false;dirty=true;
    notice('Your trace is here. Someone else will find it.');await sync();
  }catch(error){notice(error instanceof TypeError?'Connection lost. Your trace is safe here; try Leave here again.':error.message,0);persistDraft();}
  finally{state.saving=false;updateTools();}
};
function pointer(e){return {x:e.clientX,y:e.clientY};}
function cancelStroke(){if(activeStroke){if(activeStroke.points.length<2)state.draft.strokes.pop();activeStroke=null;}persistDraft();updateTools();}
paper.addEventListener('pointerdown',e=>{
  if(e.button!==0||state.saving)return;paper.setPointerCapture(e.pointerId);pointers.set(e.pointerId,pointer(e));travel=null;
  if(pointers.size===2){cancelStroke();const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(b.x-a.x,b.y-a.y),mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};gesture=null;return;}
  if(pointers.size>1)return;
  const p=screenToWorld(e.clientX,e.clientY);
  if(state.mode==='make'&&!state.moving&&!e.shiftKey){
    if(state.draft.strokes.length>=RULES.maxStrokes)return notice('Leave this trace here before beginning another.');
    activeStroke={kind:state.kind,ink:state.ink,seed:crypto.getRandomValues(new Uint32Array(1))[0],points:[[p.x-state.draft.x,p.y-state.draft.y,e.pressure||.5]]};state.draft.strokes.push(activeStroke);dirty=true;
  }else gesture={...pointer(e),camera:{...camera},draft:state.draft?{x:state.draft.x,y:state.draft.y}:null};
});
paper.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,pointer(e));
  if(pointers.size===2&&pinch){
    const [a,b]=[...pointers.values()],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance=Math.hypot(b.x-a.x,b.y-a.y);
    camera.x-=(mid.x-pinch.mid.x)/camera.z;camera.y-=(mid.y-pinch.mid.y)/camera.z;zoom(distance/Math.max(pinch.distance,1),mid.x,mid.y);pinch={distance,mid};return;
  }
  if(activeStroke){
    const p=screenToWorld(e.clientX,e.clientY),point=[p.x-state.draft.x,p.y-state.draft.y,e.pressure||.5],last=activeStroke.points.at(-1);
    if(Math.hypot(point[0]-last[0],point[1]-last[1])<3)return;
    if(Math.abs(point[0])>750||Math.abs(point[1])>750||activeStroke.points.length>=RULES.maxStrokePoints||state.draft.strokes.reduce((n,s)=>n+s.points.length,0)>=RULES.maxPoints)return;
    activeStroke.points.push(point);dirty=true;
  }else if(gesture){
    const dx=(e.clientX-gesture.x)/camera.z,dy=(e.clientY-gesture.y)/camera.z;
    if(state.mode==='make'&&state.moving){state.draft.x=clamp(gesture.draft.x+dx,-49000,49000);state.draft.y=clamp(gesture.draft.y+dy,-49000,49000);}
    else{camera.x=clamp(gesture.camera.x-dx,-49000,49000);camera.y=clamp(gesture.camera.y-dy,-49000,49000);}
    dirty=true;
  }
});
function release(e){pointers.delete(e.pointerId);cancelStroke();gesture=null;pinch=null;dirty=true;}
paper.addEventListener('pointerup',release);paper.addEventListener('pointercancel',release);
paper.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(-e.deltaY*.0012),e.clientX,e.clientY);},{passive:false});
addEventListener('keydown',e=>{
  if(state.saving||$('about').open||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
  if(e.key==='Escape'){if(state.mode==='make')keepDraft();else closeIndex();return;}
  if((e.ctrlKey||e.metaKey)&&e.key==='z'&&state.mode==='make'){e.preventDefault();$('undo').click();return;}
  if(e.key.toLowerCase()==='m'&&!e.ctrlKey&&!e.metaKey){make();return;}
  if(e.key==='+'||e.key==='='){zoom(1.2);return;}if(e.key==='-'){zoom(1/1.2);return;}
  const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},d=directions[e.key];
  if(d){e.preventDefault();travel=null;const amount=(e.shiftKey?180:65)/camera.z;if(state.mode==='make'&&state.moving){state.draft.x+=d[0]*amount;state.draft.y+=d[1]*amount;persistDraft();}else{camera.x=clamp(camera.x+d[0]*amount,-49000,49000);camera.y=clamp(camera.y+d[1]*amount,-49000,49000);}dirty=true;}
});
async function sync(){
  try{
    let more=true;
    while(more){const response=await fetch('/api/world?cursor='+state.cursor+'&limit=100',{cache:'no-store'});if(!response.ok)throw new Error('unavailable');const data=await response.json();
      for(const item of data.items)if(!state.items.some(i=>i.id===item.id))state.items.push(item);
      state.items.sort((a,b)=>a.seq-b.seq);state.cursor=data.cursor;state.total=data.total;more=data.hasMore;
    }
    state.connected=true;loaded=true;dirty=true;$('connection').textContent=state.total===0?'One shared manuscript · leave its first trace':`One shared manuscript · ${state.total} ${state.total===1?'trace':'traces'} left here`;
  }catch{state.connected=false;$('connection').textContent='Connection paused · your draft stays here';}
}
setInterval(()=>{if(!document.hidden)sync();},5000);sync();
function seedImage(seed,t){
  if(seed.id==='original')return original.complete&&original.naturalWidth?original:null;
  let work=seedWorks.get(seed.id);if(!work){work=Asemic.build(seed.id);seedWorks.set(seed.id,work);}
  const desired=Math.round(clamp(seed.w*camera.z*dpr,600,2200));
  let cached=seedCache.get(seed.id);if(!cached){cached={canvas:document.createElement('canvas'),time:-1};seedCache.set(seed.id,cached);}
  const animated=work.duration&&camera.z>.28&&!state.paused,time=animated?(work.loop?t:(Math.sin(t*.035)+1)*.5*work.duration):work.duration*.6;
  if(!cached.size||Math.abs(desired-cached.size)>cached.size*.45||animated&&t-cached.time>.06){
    cached.canvas.width=desired;cached.canvas.height=Math.round(desired*seed.h/seed.w);Asemic.draw(cached.canvas,work,time);cached.size=desired;cached.time=t;
  }
  return cached.canvas;
}
function visible(b){const l=camera.x-width/2/camera.z,r=camera.x+width/2/camera.z,t=camera.y-height/2/camera.z,bt=camera.y+height/2/camera.z;return b.x<r&&b.right>l&&b.y<bt&&b.bottom>t;}
function draw(now){
  const dt=lastFrame?(now-lastFrame)/1000:0;lastFrame=now;if(!state.paused&&!document.hidden)elapsed+=Math.min(dt,.1);
  if(travel){const p=clamp((now-travel.start)/650,0,1),ease=1-(1-p)**4;for(const key of ['x','y','z'])camera[key]=travel.from[key]+(travel.to[key]-travel.from[key])*ease;if(p===1)travel=null;dirty=true;}
  if((dirty||!state.paused)&&!document.hidden){
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=RULES.paper;ctx.fillRect(0,0,width,height);ctx.translate(width/2,height/2);ctx.scale(camera.z,camera.z);ctx.translate(-camera.x,-camera.y);
    for(const seed of SEEDS){if(!visible({x:seed.x,y:seed.y,right:seed.x+seed.w,bottom:seed.y+seed.h}))continue;const image=seedImage(seed,elapsed);if(image)ctx.drawImage(image,seed.x,seed.y,seed.w,seed.h);}
    for(const item of state.items)if(visible(boundsOf(item)))drawTrace(ctx,item,{time:elapsed,motion:!state.paused});
    if(state.mode==='make'&&state.draft){
      const d=state.draft;ctx.save();
      ctx.strokeStyle='#b5aa97';ctx.lineWidth=.65/camera.z;const span=Math.min(650,(width-90)/camera.z),h=Math.min(480,(height-320)/camera.z);
      ctx.setLineDash([2/camera.z,7/camera.z]);ctx.strokeRect(d.x-span/2,d.y-h/2,span,h);ctx.restore();
      drawTrace(ctx,d,{alpha:1});
    }
    $('zoom-label').textContent=Math.round(camera.z*100)+'%';
    if(state.mode==='explore'){
      const nearest=SEEDS.map(s=>({s,d:Math.hypot(camera.x-s.x-s.w/2,camera.y-s.y-s.h/2)})).sort((a,b)=>a.d-b.d)[0];
      $('place-title').textContent=camera.z<.2?'The shared manuscript':nearest.d<850?nearest.s.title:'Between passages';
      $('place-kind').textContent=camera.z<.2?'Every trace makes it larger':nearest.d<850&&nearest.s.id==='original'?'The beginning':'There is room here';
    }
    dirty=false;
  }
  requestAnimationFrame(draw);
}
updateTools();requestAnimationFrame(draw);
setTimeout(()=>$('hint').hidden=true,16000);
window.manuscript={state,camera,moveTo,make,sync,get ready(){return loaded;}};
