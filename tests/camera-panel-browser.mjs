import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createProfile} from '../dist/src/storage.js';
import {chooseEnvironment} from './environment-picker.mjs';
const browser=await chromium.launch({channel:'chrome',headless:true}),base=process.env.RELAY_PREVIEW_URL||'http://localhost:4179';
try{
 for(const savedProfile of [false,true]){
  const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  if(savedProfile)await context.addInitScript(p=>localStorage.setItem('relay.profiles.v1',JSON.stringify([p])),createProfile('Camera panel test','combined'));
  await context.route('**/src/camera.js',r=>r.fulfill({contentType:'text/javascript',body:"export class VisionCamera{constructor(v,c,f,s){window.__frame=f;this.state=s;}async start(mode,id,delegate){this.running=true;this.mode=mode;this.handDelegate=delegate;this.state('ready','Camera ready');}stop(){this.running=false;}setTrails(){}}"}));
  await page.goto(base);await page.locator('[data-nav="write"]').click();await chooseEnvironment(page,'finger-grid');await page.locator('#camera-button').click();
  // Reproduce the old 32px -> 8px -> 32px height oscillation at competing update frequencies.
  const stable=await page.evaluate(()=>{
   const root=document.querySelector('#tracking-parts'),nodes=[...root.children],samples=[];
   for(let now=100;now<2500;now+=100){window.__frame({vector:null,hands:[],now,handFrameAt:now,latency:1});samples.push({text:root.textContent,height:root.getBoundingClientRect().height,gestureTop:document.querySelector('.recognition').getBoundingClientRect().top,same:nodes.every((node,i)=>root.children[i]===node)});}
   window.__panelTime=2500;return samples;
  });
  assert.equal(new Set(stable.map(s=>s.text)).size,1);assert.ok(stable[0].text.includes('Left hand'));assert.equal(new Set(stable.map(s=>s.height)).size,1);assert.equal(new Set(stable.map(s=>s.gestureTop)).size,1);assert.ok(stable.every(s=>s.same));
  // Stable tracking should perform no DOM writes to tracking indicators, even while metrics change.
  const quiet=await page.evaluate(async()=>{
   const root=document.querySelector('#tracking-parts'),records=[],observer=new MutationObserver(r=>records.push(...r));observer.observe(root,{childList:true,subtree:true,attributes:true,characterData:true});
   for(let now=2600;now<4600;now+=100)window.__frame({vector:null,hands:[],now,handFrameAt:now,latency:1,metrics:{cameraFps:now%60,handFps:now%20,faceFps:now%30,warming:false}});
   await Promise.resolve();observer.disconnect();return records.length;
  });assert.equal(quiet,0);
  // Brief display dropouts do not remove chips; sustained loss still updates their status.
  const states=await page.evaluate(()=>{
   const vector=Array(201).fill(0);vector[0]=vector[1]=vector[2]=1;
   const send=(now,v)=>{window.__frame({vector:v,hands:[],now,handFrameAt:now,latency:1});return [...document.querySelector('#tracking-parts').children].map(e=>e.classList.contains('visible'));};
   return {visible:send(4800,vector),brief:send(5000,null),lost:send(5400,null)};
  });assert.deepEqual(states.visible,[true,true,true]);assert.deepEqual(states.brief,[true,true,true]);assert.deepEqual(states.lost,[false,false,false]);
  await page.locator('#camera-button').click();assert.equal(await page.locator('#tracking-parts>.visible').count(),0);assert.equal(await page.locator('#tracking-parts>span').count(),3);
  for(const environment of ['classic','air-letters','cirrin','flow','chord','finger-grid']){
   await chooseEnvironment(page,environment);
   // The same panel follows the actual camera mode, including hand environments with a face/combined profile.
   if(environment==='classic'&&!savedProfile)continue;
   if(await page.locator('#camera-button').textContent()==='Enable camera')await page.locator('#camera-button').click();
   const expected=['classic','finger-grid'].includes(environment)?'combined':'hands';
   await page.waitForFunction(mode=>document.querySelector('#tracking-parts').dataset.trackingMode===mode,expected);
   const values=await page.evaluate(()=>{
    const root=document.querySelector('#tracking-parts'),nodes=[...root.children],heights=[];
    const start=window.__panelTime=Math.max(6000,(window.__panelTime||0)+2500);for(let now=start;now<start+2000;now+=100){window.__frame({vector:null,hands:[],now,handFrameAt:now,latency:1});heights.push(root.getBoundingClientRect().height);}
    return {same:nodes.every((node,i)=>root.children[i]===node),heights,text:root.textContent};
   });assert.ok(values.same);assert.equal(new Set(values.heights).size,1);assert.ok(values.text.trim());
  }
  if(savedProfile)await page.locator('.camera-card').screenshot({path:fileURLToPath(new URL('../artifacts/ui/stable-camera-panel.png',import.meta.url))});
  assert.deepEqual(errors,[]);await context.close();console.log('PASS: '+(savedProfile?'saved profile':'guest')+' camera panel keeps text, node identity, height and gesture position stable; short dropout filtering; real loss and camera off; all built-in environment modes.');
 }
}finally{await browser.close();}

