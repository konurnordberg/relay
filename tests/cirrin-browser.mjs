import {chooseEnvironment} from './environment-picker.mjs';
import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await context.route('**/__hands.mjs',r=>r.fulfill({path:fileURLToPath(new URL('./hand-fixture.mjs',import.meta.url)),contentType:'text/javascript'}));
await context.route('**/src/camera.js',r=>r.fulfill({contentType:'text/javascript',body:"export class VisionCamera {\n constructor(v,c,f,s){this.canvas=c;this.frame=f;this.state=s;}\n async start(mode,device,delegate){this.stop();this.running=true;this.mode=mode;this.handDelegate=delegate;this.state('ready','Controlled fingertip fixture');\n this.timer=setInterval(()=>{const now=performance.now();this.frame({hands:window.__hand?[window.__hand]:[],handFrameAt:now,handAspect:4/3,now,vector:null,latency:1});},30);}\n stop(){this.running=false;clearInterval(this.timer);}setTrails(){}\n}"}));
async function traceCamera(word){
 await page.evaluate(async word=>{
  const {letterPoint}=await import('/src/cirrin-core.js'),{hand}=await import('/__hands.mjs');
  const pose=p=>{const h=hand(1);h[8]={x:1-(.5+(p.x-.5)/2.4),y:(.375+(p.y-.5)/2.4)*4/3,z:0};h[4]={...h[8]};return h;};
  const move=async p=>{window.__hand=pose(p);await new Promise(r=>setTimeout(r,135));};
  await move({x:.5,y:.5});
  for(const c of word){await move(letterPoint(c));await move({x:.5,y:.5});}
  window.__hand=hand(5);
 },word);
 await page.waitForFunction(word=>document.querySelector('.cirrin-choice')?.dataset.word===word,word,{timeout:8000});
}
async function tracePointer(word){
 const canvas=page.locator('#cirrin-canvas');await canvas.scrollIntoViewIfNeeded();const r=await canvas.boundingBox();
 const points=await page.evaluate(async word=>{const {letterPoint}=await import('/src/cirrin-core.js');return word.split('').map(c=>letterPoint(c));},word);
 await page.mouse.move(r.x+r.width*.5,r.y+r.height*.5);await page.mouse.down();
 for(const p of points){await page.mouse.move(r.x+p.x*r.width,r.y+p.y*r.height,{steps:10});await page.mouse.move(r.x+r.width*.5,r.y+r.height*.5,{steps:10});}
 await page.mouse.up();
 await page.waitForFunction(word=>document.querySelector('.cirrin-choice')?.dataset.word===word,word,{timeout:6000});
}
try{
 await page.goto('http://localhost:4173/');await page.getByRole('button',{name:'Open keyboard'}).click();
 await page.getByRole('button',{name:'z',exact:true}).click();
 await chooseEnvironment(page,'cirrin');await page.locator('#pen-mode').selectOption('pinch');await page.getByRole('button',{name:'Start Cirrin input',exact:true}).click();
 await traceCamera('hello');
 assert.equal(await page.locator('#message').inputValue(),'z','word preview must not insert');
 assert.equal(await page.locator('#cirrin-word').innerText(),'hello');
 await page.evaluate(async()=>{const {hand}=await import('/__hands.mjs');window.__hand=hand(1,{thumbOnly:true});});
 await page.waitForFunction(()=>document.querySelector('#message').value==='z hello ');
 await page.waitForTimeout(1200);assert.equal(await page.locator('#message').inputValue(),'z hello ');
 await page.getByRole('button',{name:'Undo',exact:true}).first().click();assert.equal(await page.locator('#message').inputValue(),'z');
 await traceCamera('relay');await page.locator('.cirrin-choice').first().click();assert.equal(await page.locator('#message').inputValue(),'z relay ');
 await page.getByRole('button',{name:'.',exact:true}).click();assert.equal(await page.locator('#message').inputValue(),'z relay. ');
 await page.getByRole('button',{name:'Speak message',exact:true}).click();assert.ok(await page.getByRole('button',{name:'Speak now',exact:true}).isVisible());
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 // Pointer tracing must remain intact with a running camera.
 await tracePointer('hello');assert.equal(await page.locator('#cirrin-word').innerText(),'hello');
 await page.getByRole('button',{name:'Show HELLO route',exact:true}).click();
 for(const viewport of [{width:1366,height:900},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.locator('#cirrin-canvas').scrollIntoViewIfNeeded();await page.waitForTimeout(200);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const cam=await page.locator('.camera-view').boundingBox();assert.ok(cam.y>=0&&cam.y+cam.height<viewport.height,'camera stays visible');
  assert.ok(await page.locator('#cirrin-canvas').evaluate(b=>{const r=b.getBoundingClientRect();return b===document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);}));
  await page.screenshot({path:fileURLToPath(new URL('../artifacts/cirrin-'+viewport.width+'.png',import.meta.url)),fullPage:viewport.width>500});
 }
 await page.setViewportSize({width:1366,height:900});
 await page.locator('.cirrin-choice').first().click();assert.equal(await page.locator('#message').inputValue(),'z relay. hello ');
 await page.getByText('Movement range & positioning',{exact:true}).click();
 await page.getByLabel('Cirrin movement range').selectOption('1.8');
 assert.ok(await page.getByRole('button',{name:'Start Cirrin input',exact:true}).isVisible());
 // Positioning in camera preview is usable even before live input starts.
 await page.getByText('Movement range & positioning',{exact:true}).click();
 await page.getByRole('button',{name:'Center on my finger',exact:true}).click();
 assert.match(await page.locator('#cirrin-status').innerText(),/Centered/);
 await chooseEnvironment(page,'air-letters');assert.ok(await page.locator('#air-canvas').isVisible());
 await chooseEnvironment(page,'finger-grid');assert.equal(await page.locator('.finger-key').count(),36);
 await chooseEnvironment(page,'classic');assert.equal(await page.locator('#message').inputValue(),'z relay. hello ');
 await chooseEnvironment(page,'cirrin');await page.reload();
 await page.getByRole('button',{name:'Write & speak',exact:true}).first().click();
 assert.equal(await page.locator('[data-action="choose-environment"]').getAttribute('data-environment'),'cirrin');assert.equal(await page.locator('#message').inputValue(),'z relay. hello ');
 assert.equal(await page.getByLabel('Cirrin movement range').inputValue(),'1.8');
 assert.deepEqual(errors,[]);console.log('PASS: camera and pointer Cirrin words, doubled L, deliberate confirmation, whole-word undo, spacing, speech, camera docking and saved environment/range');
}finally{await browser.close();}
