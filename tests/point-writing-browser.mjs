import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const [name,file] of [['hands','hand-fixture'],['letters','letter-fixture']])await context.route('**/__'+name+'.mjs',r=>r.fulfill({path:fileURLToPath(new URL('./'+file+'.mjs',import.meta.url)),contentType:'text/javascript'}));
await context.route('**/src/camera.js',r=>r.fulfill({contentType:'text/javascript',body:"export class VisionCamera {constructor(v,c,f,s){this.frame=f;this.state=s;}async start(mode,device,delegate){this.stop();this.running=true;this.mode=mode;this.handDelegate=delegate;this.state('ready','Controlled realistic hand fixture');this.timer=setInterval(()=>{const now=performance.now();this.frame({hands:window.__hands||[],handFrameAt:now,now,handAspect:4/3,vector:null,latency:1});},25);}stop(){this.running=false;clearInterval(this.timer);}setTrails(){}}"}));
try{
 await page.goto('http://localhost:4173/');await page.getByRole('button',{name:'Open keyboard'}).click();await page.getByLabel('Communication environment').selectOption('air-letters');assert.equal(await page.locator('#pen-mode').inputValue(),'point');await page.getByRole('button',{name:'Start air writing',exact:true}).click();
 await page.evaluate(async()=>{
  const {hand}=await import('/__hands.mjs'),{letterStrokes}=await import('/__letters.mjs');
  window.__pose=(p,count=1)=>{const h=hand(count,{scale:.25}),raw={x:1-p.x,y:p.y*4/3},dx=raw.x-h[8].x,dy=raw.y-h[8].y;return h.map(q=>({...q,x:q.x+dx,y:q.y+dy}));};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  for(const stroke of letterStrokes('H')){
   window.__hands=[window.__pose(stroke[0],5)];await wait(150);
   window.__hands=[window.__pose(stroke[0])];await wait(90);
   for(let i=0;i<stroke.length;i++){if(i===7){window.__hands=[];await wait(100);}window.__hands=[window.__pose(stroke[i])];await wait(32);}
   window.__hands=[window.__pose(stroke.at(-1),5)];await wait(180);
  }
 });
 await page.waitForFunction(()=>document.querySelector('.air-choice')?.dataset.letter==='H',{},{timeout:12000});
 await page.locator('.air-choice').first().click();assert.equal(await page.locator('#message').textContent(),'h');
 console.log('PASS: default point/open control → real neural H, multiple strokes, brief gaps and pen-up repositioning');
 await page.getByLabel('Communication environment').selectOption('cirrin');await page.getByRole('button',{name:'Start Cirrin input',exact:true}).click();
 await page.evaluate(async()=>{
  const {letterPoint}=await import('/src/cirrin-core.js'),wait=ms=>new Promise(r=>setTimeout(r,ms)),raw=p=>({x:.5+(p.x-.5)/2.4,y:.375+(p.y-.5)/2.4});
  window.__hands=[window.__pose(raw({x:.5,y:.5}),5)];await wait(150);window.__hands=[window.__pose(raw({x:.5,y:.5}))];await wait(90);
  for(const letter of 'hello'){
   const end=letterPoint(letter,.52);
   // A fast outward excursion and return, without a deliberate letter dwell.
   for(const t of [.5,1,.55,0]){window.__hands=[window.__pose(raw({x:.5+(end.x-.5)*t,y:.5+(end.y-.5)*t}))];await wait(40);}
  }
  window.__hands=[window.__pose(raw({x:.5,y:.5}),5)];await wait(180);
 });
 await page.waitForFunction(()=>document.querySelector('.cirrin-choice')?.dataset.word==='hello',{},{timeout:5000});
 await page.locator('.cirrin-choice').first().click();assert.equal(await page.locator('#message').textContent(),'h hello ');
 assert.deepEqual(errors,[]);console.log('PASS: default point/open Cirrin spells HELLO with fast excursions, overshoot and doubled L');
}catch(e){console.error(errors);console.error(await page.locator('#air-detail, #cirrin-status').allTextContents());await page.screenshot({path:fileURLToPath(new URL('../artifacts/point-failure.png',import.meta.url)),fullPage:true});throw e;}finally{await browser.close();}