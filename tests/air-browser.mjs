import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await context.route('**/__letters.mjs',r=>r.fulfill({path:fileURLToPath(new URL('./letter-fixture.mjs',import.meta.url)),contentType:'text/javascript'}));
await context.route('**/__hands.mjs',r=>r.fulfill({path:fileURLToPath(new URL('./hand-fixture.mjs',import.meta.url)),contentType:'text/javascript'}));
await context.route('**/src/camera.js',r=>r.fulfill({contentType:'text/javascript',body:"export class VisionCamera {\n constructor(v,c,f,s){this.canvas=c;this.frame=f;this.state=s;}\n async start(mode,device,delegate){this.stop();this.running=true;this.mode=mode;this.handDelegate=delegate;this.state('ready','Controlled fingertip fixture');\n this.timer=setInterval(()=>{const now=performance.now();this.frame({hands:window.__hand?[window.__hand]:[],handFrameAt:now,handAspect:4/3,now,vector:null,latency:1});},30);}\n stop(){this.running=false;clearInterval(this.timer);}setTrails(){}\n}"}));

async function trace(letter){
 await page.evaluate(async letter=>{
  const {letterStrokes}=await import('/__letters.mjs'),{hand}=await import('/__hands.mjs');
  for(const stroke of letterStrokes(letter)){
   for(const p of stroke){
    const h=hand(1);h[8]={x:1-p.x,y:p.y*4/3,z:0};h[4]={...h[8]};window.__hand=h;await new Promise(r=>setTimeout(r,34));
   }
   window.__hand=hand(5);await new Promise(r=>setTimeout(r,150));
  }
  window.__hand=hand(5);
 },letter);
 await page.waitForFunction(()=>document.querySelectorAll('.air-choice').length===3,{},{timeout:12000});
}
try{
 await page.goto('http://localhost:4173/');await page.getByRole('button',{name:'Open keyboard'}).click();
 await page.getByRole('button',{name:'z',exact:true}).click();
 await page.getByLabel('Communication environment').selectOption('air-letters');
 await page.locator('#pen-mode').selectOption('pinch');await page.getByRole('button',{name:'Start air writing',exact:true}).click();
 await trace('H');
 assert.equal(await page.locator('.air-choice').first().getAttribute('data-letter'),'H');
 assert.equal(await page.locator('#message').innerText(),'z','recognition cannot insert without confirmation');
 await page.evaluate(async()=>{const {hand}=await import('/__hands.mjs');window.__hand=hand(1,{thumbOnly:true});});
 await page.waitForFunction(()=>document.querySelector('#message').textContent==='zh');
 await page.waitForTimeout(1100);assert.equal(await page.locator('#message').innerText(),'zh','held thumbs-up never repeats');
 await trace('I');assert.equal(await page.locator('.air-choice').first().getAttribute('data-letter'),'I');
 await page.locator('.air-choice').first().click();assert.equal(await page.locator('#message').innerText(),'zhi');
 await page.getByRole('button',{name:'Delete',exact:true}).click();assert.equal(await page.locator('#message').innerText(),'zh');
 await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await page.locator('#message').innerText(),'zhi');
 await page.getByRole('button',{name:'Speak message',exact:true}).click();assert.ok(await page.getByRole('button',{name:'Speak now',exact:true}).isVisible());
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 // The camera remains running while pointer drawing pauses camera input.
 await page.locator('#air-canvas').scrollIntoViewIfNeeded();
 const paths=await page.evaluate(async()=>{const {letterStrokes}=await import('/__letters.mjs');return letterStrokes('H');});
 const pad=await page.locator('#air-canvas').boundingBox();
 for(const stroke of paths){
  await page.mouse.move(pad.x+stroke[0].x*pad.width,pad.y+stroke[0].y*pad.width);await page.mouse.down();
  for(const p of stroke)await page.mouse.move(pad.x+p.x*pad.width,pad.y+p.y*pad.width);
  await page.mouse.up();
 }
 await page.waitForFunction(()=>document.querySelector('.air-choice')?.dataset.letter==='H',{},{timeout:12000});
 assert.equal(await page.locator('#message').innerText(),'zhi');
 console.log('PASS: mouse multi-stroke drawing remains intact while the camera is running');
 for(const viewport of [{width:1366,height:900},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.locator('#air-canvas').scrollIntoViewIfNeeded();await page.waitForTimeout(150);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const cam=await page.locator('.camera-view').boundingBox();assert.ok(cam.y>=0&&cam.y+cam.height<viewport.height,'camera remains in view');
  assert.ok(await page.locator('#air-canvas').evaluate(b=>{const r=b.getBoundingClientRect();return b===document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);}));
  await page.screenshot({path:fileURLToPath(new URL('../artifacts/air-letters-'+viewport.width+'.png',import.meta.url)),fullPage:viewport.width>500});
 }
 await page.setViewportSize({width:1366,height:900});await page.getByLabel('Communication environment').selectOption('finger-grid');
 assert.equal(await page.locator('#message').innerText(),'zhi');assert.equal(await page.locator('.finger-key').count(),36);
 await page.getByLabel('Communication environment').selectOption('classic');assert.equal(await page.locator('#message').innerText(),'zhi');
 await page.getByLabel('Communication environment').selectOption('air-letters');await page.reload();
 await page.getByRole('button',{name:'Write & speak',exact:true}).first().click();
 assert.equal(await page.getByLabel('Communication environment').inputValue(),'air-letters');assert.equal(await page.locator('#message').innerText(),'zhi');
 assert.deepEqual(errors,[]);console.log('PASS: tracked pinch strokes → actual neural H/I → deliberate thumbs-up/click insertion; undo, confirmation, environments, persistence and camera visibility');
}finally{await browser.close();}
