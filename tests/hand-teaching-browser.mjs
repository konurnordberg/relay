import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
const stub=`import {extendedHandFeatures} from './camera-real.js';
import {combineFeatures} from './features.js';
import {hand} from '/__hand-fixture.mjs';
export class VisionCamera{
 constructor(video,canvas,onFrame,onState){this.onFrame=onFrame;this.onState=onState;this.canvas=canvas;}
 async start(mode,deviceId,delegate){this.stop();this.running=true;this.mode=mode;this.handDelegate=delegate;window.__camera={mode,delegate};this.onState('ready','Controlled hand fixture');let i=0;
 this.timer=setInterval(()=>{
  const title=document.querySelector('.record-panel h3')?.textContent||'',record=title.startsWith('Now:')||title==='Hold your movement';
  const kind=record?(window.__teaching||'one'):(title?'rest':window.__signal||'rest');
  const face=Array(60).fill(.03);if(kind==='face')face[5]=.85;
  let hands=[extendedHandFeatures(hand(kind==='one'?2:kind==='both'?5:0)),extendedHandFeatures(hand(kind==='both'?2:0,{mirror:true}))];
  if(record&&++i%9===0)hands[i%2]=null;
  if(kind==='missing')hands=[null,null];
  const vector=combineFeatures(window.__noFace?null:face,hands);
  this.onFrame({vector,now:performance.now(),latency:2});
  const ctx=this.canvas.getContext('2d');this.canvas.width=640;this.canvas.height=480;ctx.fillStyle='#213d31';ctx.fillRect(0,0,640,480);ctx.fillStyle='#dbf9a8';ctx.font='22px sans-serif';ctx.fillText('CONTROLLED HAND TEACHING TEST',85,225);
 },40);}
 stop(){clearInterval(this.timer);this.running=false;}setTrails(){}
}`;
await context.route('**/src/camera.js',r=>r.fulfill({contentType:'text/javascript',body:stub}));
await context.route('**/src/camera-real.js',r=>r.fulfill({path:fileURLToPath(new URL('../dist/src/camera.js',import.meta.url)),contentType:'text/javascript'}));
await context.route('**/__hand-fixture.mjs',r=>r.fulfill({path:fileURLToPath(new URL('./hand-fixture.mjs',import.meta.url)),contentType:'text/javascript'}));
try{
 await page.goto('http://localhost:4173/');
 await page.evaluate(async()=>{
  const {createProfile}=await import('/src/storage.js');const p=createProfile('Existing face profile','face');
  const summary=v=>({vector:v,spread:v.map(()=>.002),frames:20});
  const rest=Array(60).fill(.03),face=[...rest];face[5]=.85;
  p.rest=Array.from({length:5},()=>summary(rest));p.gestures=[{id:'face',name:'Saved face gesture',action:'insert',value:'!',samples:Array.from({length:5},()=>summary(face))}];
  localStorage.setItem('relay.profiles.v1',JSON.stringify([p]));
 });
 await page.reload();await page.getByRole('button',{name:'Teach gestures',exact:true}).click();
 assert.match(await page.locator('#main').innerText(),/Your saved face gestures are preserved/);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('relay.profiles.before-all-signals.v1'))[0].modality),'face');
 await page.getByRole('button',{name:'Enable camera'}).click();
 await page.waitForFunction(()=>document.querySelector('#tracking-parts').textContent.includes('Left hand ✓'));
 assert.deepEqual(await page.evaluate(()=>window.__camera),{mode:'combined',delegate:'CPU'});
 console.log('PASS: legacy face profile automatically keeps examples and enables CPU face + both-hands teaching');
 for(const [kind,name,value] of [['one','Peace sign','hi'],['both','Two-hand signal',' there']]){
  await page.evaluate(kind=>{window.__teaching=kind;window.__signal='rest';window.__noFace=kind==='both';},kind);
  await page.getByRole('button',{name:'Add a gesture'}).click();
  await page.getByLabel('Gesture name').fill(name);await page.getByLabel('What should it do?').selectOption('insert');
  await page.locator('input[name="value"]').fill(value);await page.getByRole('button',{name:'Add & record'}).click();
  await page.waitForFunction(name=>JSON.parse(localStorage.getItem('relay.profiles.v1'))[0].gestures.find(g=>g.name===name)?.samples.length===5,name,{timeout:42000});
  await page.getByRole('button',{name:'Check my gestures'}).waitFor();
  const learned=await page.evaluate(name=>JSON.parse(localStorage.getItem('relay.profiles.v1'))[0].gestures.find(g=>g.name===name).trainedChannels,name);
  assert.deepEqual(learned,kind==='one'?['Left hand']:['Left hand','Right hand']);
  console.log('PASS: full five-example '+kind+'-hand teaching, including intermittent missing frames; channels '+learned.join(', '));
 }
 await page.screenshot({path:fileURLToPath(new URL('../artifacts/hand-teaching.png',import.meta.url)),fullPage:true});
 await page.getByRole('button',{name:'Write & speak',exact:true}).click();await page.getByRole('button',{name:'Use my gestures',exact:true}).click();
 const signal=async kind=>{await page.evaluate(()=>window.__signal='rest');await page.waitForTimeout(650);await page.evaluate(kind=>window.__signal=kind,kind);await page.waitForTimeout(800);};
 await signal('one');assert.equal(await page.locator('#message').innerText(),'hi');
 await signal('both');assert.equal(await page.locator('#message').innerText(),'hi there');
 await page.waitForTimeout(750);assert.equal(await page.locator('#message').innerText(),'hi there');
 await signal('missing');assert.equal(await page.locator('#message').innerText(),'hi there');
 await page.evaluate(()=>window.__noFace=false);await signal('face');assert.equal(await page.locator('#message').innerText(),'hi there!');
 console.log('PASS: learned hand-only, two-hand, and preserved face signals compose hi there!; holds and lost hands do not type');
 await page.reload();await page.getByRole('button',{name:'Write & speak',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Use my gestures',exact:true}).isEnabled(),true);
 assert.equal(await page.locator('#message').innerText(),'hi there!');assert.deepEqual(errors,[]);
 console.log('PASS: saved gesture model and draft survive reload; no browser errors');
}finally{await browser.close();}
