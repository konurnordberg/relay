import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import {createProfile} from '../dist/src/storage.js';
const base=process.env.RELAY_PREVIEW_URL||'http://localhost:4184',browser=await chromium.launch({channel:'chrome',headless:true});
const sample=v=>({vector:[...v],spread:v.map(()=>.001),frames:20});
const legacy=createProfile('Saved face gestures','face');legacy.rest=Array.from({length:5},()=>sample(Array(60).fill(0)));legacy.gestures=[0,1].map(i=>({id:'face-'+i,name:i?'Eyebrow raise':'Open mouth',action:'insert',value:'x',samples:Array.from({length:5},()=>{const v=Array(60).fill(0);v[i]=.1;return sample(v);})}));
const rest=Array(201).fill(.03);rest.splice(0,3,1,1,1);rest[129]=.3;
const combined=createProfile('Face and hand gestures');combined.rest=Array.from({length:5},()=>sample(rest));combined.gestures=[['face',8,'Face gesture'],['hand',75,'Hand symbol']].map(([id,index,name])=>({id,name,action:'insert',value:'y',kind:'pose',enabled:true,samples:Array.from({length:5},()=>{const v=[...rest];v[index]=.85;return {...sample(v),neutral:sample(rest)};})}));
const faceRest=Array(201).fill(0);faceRest[0]=1;
try{
 for(const fixture of [{profile:legacy,neutral:faceRest,gestures:[{name:'Open mouth',index:3,value:.1},{name:'Eyebrow raise',index:4,value:.1}]},{profile:combined,neutral:rest,gestures:[{name:'Face gesture',index:8,value:.85},{name:'Hand symbol',index:75,value:.85}]}]){
  const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(p=>localStorage.setItem('relay.profiles.v1',JSON.stringify([p])),fixture.profile);
  await context.route('**/src/camera.js',r=>r.fulfill({contentType:'text/javascript',body:"export class VisionCamera{constructor(v,c,f,s){window.__sendFrame=f;this.state=s;}async start(mode,id,delegate){this.running=true;this.mode=mode;this.handDelegate=delegate;this.state('ready','Controlled test camera');}stop(){this.running=false;}setTrails(){}}"}));
  await page.goto(base);await page.locator('[data-nav="studio"]').click();await page.locator('#camera-button').click();
  const send=(vector,count=1)=>page.evaluate(({vector,count})=>{const samples=[];for(let i=0;i<count;i++){window.__frameTime=(window.__frameTime||1000)+150;window.__sendFrame({vector,now:window.__frameTime,latency:2,hands:[]});samples.push({camera:document.querySelector('#signal-name').textContent,heading:document.querySelector('#live-insights .decision-state strong')?.textContent,detail:document.querySelector('#live-insights .decision-state p')?.textContent,uncertain:!!document.querySelector('#live-insights .decision-state.uncertain'),pipeline:[...document.querySelectorAll('.signal-pipeline span')].map(el=>el.classList.contains('lit'))});}return samples;},{vector,count});
  for(const gesture of fixture.gestures){
   const pose=[...fixture.neutral];pose[gesture.index]=gesture.value;
   let state=(await send(pose))[0];assert.equal(state.camera,gesture.name);assert.equal(state.heading,gesture.name,'Analyzer must name the same recognized gesture before rest is armed');assert.equal(state.uncertain,false);assert.equal(state.pipeline[1],true);
   state=(await send(fixture.neutral,5)).at(-1);assert.equal(state.heading,'Rest — no selection');assert.equal(state.pipeline[2],true);
   state=(await send(pose,2)).at(-1);assert.equal(state.heading,gesture.name);assert.match(state.detail,/Hold|hold/);
   const held=await send(pose,10);assert.ok(held.every(s=>s.camera===gesture.name&&s.heading===gesture.name&&!s.uncertain),'A recognized held gesture must not turn uncertain after the gate locks');assert.match(held.at(-1).detail,/rest|starting pose/i);assert.equal(held.at(-1).pipeline[1],true);assert.equal(held.at(-1).pipeline[2],false);
  }
  const unknown=[...fixture.neutral];for(const g of fixture.gestures)unknown[g.index]=5;
  let state=(await send(unknown))[0];assert.match(state.camera,/Uncertain/);assert.match(state.heading,/Uncertain/);assert.equal(state.pipeline[1],false);
  state=(await send(null))[0];assert.equal(state.camera,'No tracking');assert.equal(state.heading,'Tracking lost');assert.ok(state.pipeline.every(lit=>!lit));
  await send(fixture.neutral,5);await page.locator('#camera-button').click();assert.match(await page.locator('#live-insights').innerText(),/Enable your camera/);assert.equal(await page.locator('#signal-name').innerText(),'Camera off');
  await page.locator('[data-nav="write"]').click();assert.equal(await page.locator('#message').inputValue(),'','Analyzer must never type commands');assert.deepEqual(errors,[]);await context.close();
  console.log('PASS:',fixture.profile.name,'analyzer and camera agree before arming, during hold and lock, for unknown input, tracking loss, and camera off; analyzer never types.');
 }
}finally{await browser.close();}
