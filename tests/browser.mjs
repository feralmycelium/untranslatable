import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..'),tmp=await mkdtemp(tmpdir()+'/manuscript-browser-');
const server=spawn('bun',['tests/serve.js'],{cwd:root,env:{...process.env,TEST_DATABASE:tmp+'/test.sqlite'},stdio:'ignore'});
const browser=await chromium.launch({headless:true});
const errors=[],base='http://127.0.0.1:8771',shots=root+'/.evidence';
await mkdir(shots,{recursive:true});
async function visit(context){const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.waitForFunction(()=>window.manuscript?.ready);return p;}
try{
  for(let i=0;i<50;i++){try{if((await fetch(base+'/api/world')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  const a=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),b=await browser.newContext({viewport:{width:1280,height:900}});
  const p=await visit(a),other=await visit(b);
  assert.equal(await p.locator('#pause').getAttribute('aria-pressed'),'true');
  await p.screenshot({path:shots+'/desktop.png'});
  await p.click('#paper',{position:{x:1100,y:450}});const before=await p.evaluate(()=>({...manuscript.camera}));
  await p.keyboard.press('ArrowRight');await p.click('#zoom-in');
  const after=await p.evaluate(()=>({...manuscript.camera}));assert(after.x>before.x&&after.z>before.z);
  await p.click('#make');await p.click('#add-line');await p.click('[data-ink="blue"]');await p.click('#add-line');
  await p.click('#undo');assert.equal(await p.evaluate(()=>manuscript.state.draft.strokes.length),1);
  await p.route('**/api/marks',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'storage_unavailable',recoverable:true})}));
  await p.click('#leave');await p.waitForFunction(()=>!manuscript.state.saving);
  assert.match(await p.locator('#status').innerText(),/try.*again/i);
  assert.equal(await p.evaluate(()=>manuscript.state.draft.strokes.length),1);
  await p.unroute('**/api/marks');await p.reload();await p.waitForFunction(()=>manuscript.ready);
  await p.click('#make');assert.equal(await p.evaluate(()=>manuscript.state.draft.strokes.length),1);
  await p.click('#thread');await p.mouse.move(500,470);await p.mouse.down();await p.mouse.move(700,520,{steps:24});await p.mouse.up();
  assert.equal(await p.evaluate(()=>manuscript.state.draft.strokes.length),2);
  await p.click('#move-trace');const start=await p.evaluate(()=>manuscript.state.draft.x);await p.keyboard.press('ArrowRight');
  assert((await p.evaluate(()=>manuscript.state.draft.x))>start);
  await p.screenshot({path:shots+'/making.png'});
  await p.click('#leave');await p.waitForFunction(()=>manuscript.state.mode==='explore');
  await other.waitForFunction(()=>manuscript.state.items.length===1,{},{timeout:8000});
  await p.reload();await p.waitForFunction(()=>manuscript.ready);assert.equal(await p.evaluate(()=>manuscript.state.items.length),1);
  await p.click('#index-toggle');assert.equal(await p.locator('#passages button').count(),11);
  await p.locator('#passages button').nth(1).click();await p.screenshot({path:shots+'/passage.png'});
  await p.click('#about-toggle');assert.equal(await p.locator('#about').evaluate(e=>e.open),true);await p.keyboard.press('Escape');
  assert.equal(await p.locator('#about').evaluate(e=>e.open),false);assert.equal(await p.evaluate(()=>document.activeElement.id),'about-toggle');
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const phone=await visit(mobile);await phone.screenshot({path:shots+'/mobile.png'});
  await phone.click('#make');await phone.click('#add-line');await phone.screenshot({path:shots+'/mobile-making.png'});
  for(const selector of ['#making .making-tools','#making .drawing-note']){const box=await phone.locator(selector).boundingBox();assert(box.x>=0&&box.x+box.width<=391);}
  const foot=await phone.locator('.drawing-footnote').boundingBox(),tools=await phone.locator('.making-tools').boundingBox();
  assert(foot.y>=tools.y+tools.height&&foot.y+foot.height<=844,'The reuse note must sit below the tools, inside the screen.');
  assert.notEqual(await phone.locator('.drawing-footnote').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)','Paper must shield the reuse note from underlying ink.');
  await phone.click('#cancel');await phone.click('#fit');await phone.screenshot({path:shots+'/mobile-world.png'});
  assert.deepEqual(errors,[]);console.log('PASS: desktop/phone, draw, move, undo, shared sync, draft recovery, persistence, keyboard, reduced motion and dialogs.');
}finally{await browser.close();server.kill('SIGTERM');await new Promise(r=>server.once('close',r));await rm(tmp,{recursive:true,force:true});}
