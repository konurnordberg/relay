import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await context.route('**/__hands.mjs',r=>r.fulfill({path:fileURLToPath(new URL('./hand-fixture.mjs',import.meta.url)),contentType:'text/javascript'}));
await context.route('**/src/camera.js',r=>r.fulfill({contentType:'text/javascript',body:"export class VisionCamera {constructor(v,c,f,s){this.frame=f;this.state=s;}async start(mode,device,delegate){this.stop();this.running=true;this.mode=mode;this.handDelegate=delegate;this.state('ready','Controlled hand fixture');this.timer=setInterval(()=>{const now=performance.now();this.frame({hands:window.__hands||[],handFrameAt:now,now,handAspect:4/3,vector:null,latency:1});},25);}stop(){this.running=false;clearInterval(this.timer);}setTrails(){}}"}));
async function cameraWord(word,{gap=false,samples=32}={}){
 await page.evaluate(async({word,gap,samples})=>{
  const {wordPath,resamplePath}=await import('/src/flow-core.js'),{hand}=await import('/__hands.mjs');
  const path=resamplePath(wordPath(word),samples),pose=(p,count=1)=>{const h=hand(count,{scale:.27}),raw={x:1-(.5+(p.x-.5)/2.4),y:(.375+(p.y-.53)/2.4/1.8)*4/3},dx=raw.x-h[8].x,dy=raw.y-h[8].y;return h.map(q=>({...q,x:q.x+dx,y:q.y+dy}));};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  window.__hands=[pose(path[0],5)];await wait(130);
  window.__hands=[pose(path[0])];await wait(90);
  for(let i=0;i<path.length;i++){if(gap&&i===15){window.__hands=[];await wait(100);}window.__hands=[pose(path[i])];await wait(30);}
  window.__hands=[pose(path.at(-1),5)];await wait(190);
 },{word,gap,samples});
}
async function hover(x,y,ms=650){
 await page.evaluate(async({x,y,ms})=>{const {hand}=await import('/__hands.mjs');const h=hand(5,{scale:.27}),raw={x:1-(.5+(x-.5)/2.4),y:(.375+(y-.53)/2.4/1.8)*4/3},dx=raw.x-h[8].x,dy=raw.y-h[8].y;window.__hands=h.length?[h.map(q=>({...q,x:q.x+dx,y:q.y+dy}))]:[];await new Promise(r=>setTimeout(r,ms));},{x,y,ms});
}
async function pointerWord(word){
 const canvas=page.locator('#flow-canvas');await canvas.scrollIntoViewIfNeeded();const r=await canvas.boundingBox(),points=await page.evaluate(async w=>{const {wordPath}=await import('/src/flow-core.js');return wordPath(w);},word);
 await page.mouse.move(r.x+points[0].x*r.width,r.y+points[0].y*r.height);await page.mouse.down();
 for(const p of points)await page.mouse.move(r.x+p.x*r.width,r.y+p.y*r.height,{steps:6});
 await page.mouse.up();
}
try{
 await page.goto('http://localhost:4173/');await page.getByRole('button',{name:'Open keyboard'}).click();await page.getByLabel('Communication environment').selectOption('flow');
 await pointerWord('hello');await page.waitForFunction(()=>document.querySelector('#message').textContent==='hello ');
 await pointerWord('keyboard');await page.waitForFunction(()=>document.querySelector('#message').textContent==='hello keyboard ');
 await page.getByRole('button',{name:'Undo word',exact:true}).click();assert.equal(await page.locator('#message').textContent(),'hello ');
 await page.getByRole('button',{name:'Start Flow input',exact:true}).click();
 await cameraWord('world',{gap:true});await page.waitForFunction(()=>document.querySelector('#message').textContent==='hello world ');
 console.log('PASS: actual local decoder, mouse and realistic camera hand paths, brief dropout, whole-word undo');
 await cameraWord('keyboard',{samples:12});await page.waitForFunction(()=>document.querySelector('#message').textContent==='hello world keyboard ');
 await cameraWord('to');await page.waitForFunction(()=>document.querySelector('#message').textContent.endsWith('to '));
 const alternative=await page.locator('.flow-choice').evaluateAll(buttons=>buttons.findIndex(b=>b.textContent.startsWith('too')));assert.ok(alternative>=0);
 await hover((alternative+.5)/3,.08);assert.equal(await page.locator('#message').textContent(),'hello world keyboard too ');
 await hover(5.5/6,.93,1300);assert.equal(await page.locator('[data-action="flow-mode"][aria-pressed="true"]').getAttribute('data-mode'),'spell','holding Mode must change exactly once');
 await hover(4.5/6,.93,1300);assert.ok(await page.getByRole('button',{name:'Lowercase',exact:true}).isVisible(),'case must change once');
 await hover(.5,.53,180);await hover(4.5/6,.93);assert.ok(await page.getByRole('button',{name:'Uppercase',exact:true}).isVisible());
 await page.getByRole('button',{name:'Speak message',exact:true}).click();assert.ok(await page.getByRole('button',{name:'Speak now',exact:true}).isVisible());await page.getByRole('button',{name:'Cancel',exact:true}).click();
 console.log('PASS: camera alternative correction, held mode/case control locks and speech confirmation');
 const saved=await page.locator('#message').textContent();
 await page.getByText('Compare with your keyboard',{exact:true}).click();
 await page.getByRole('button',{name:'Start keyboard trial',exact:true}).click();const target=await page.locator('#flow-benchmark .chord-target').textContent();
 assert.equal(await page.locator('#flow-keyboard-trial').evaluate(el=>el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true}))),false);
 await page.locator('#flow-keyboard-trial').pressSequentially(target,{delay:2});assert.match(await page.locator('#flow-race-status').textContent(),/Completed/);
 await page.getByRole('button',{name:'Start Flow trial',exact:true}).click();
 for(const word of target.split(' '))await cameraWord(word);
 await page.waitForFunction(()=>document.querySelector('#flow-race-status').textContent.includes('Completed'));
 assert.equal(await page.locator('#message').textContent(),saved);assert.match(await page.locator('#flow-race-results').textContent(),/×/);
 await page.getByRole('button',{name:'Spell',exact:true}).click();
 await page.getByText('Click a key to spell',{exact:true}).click();await page.locator('[data-action="flow-letter"][data-letter="x"]').click();assert.equal(await page.locator('#message').textContent(),saved+'x');
 await page.getByRole('button',{name:'Symbols',exact:true}).click();await page.getByText('Click a key to spell',{exact:true}).click();await page.locator('[data-action="flow-letter"][data-letter="q"]').click();assert.equal(await page.locator('#message').textContent(),saved+'x1');
 for(const viewport of [{width:1366,height:900},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.locator('#flow-canvas').scrollIntoViewIfNeeded();await page.waitForTimeout(100);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const cam=await page.locator('.camera-view').boundingBox();assert.ok(cam.y>=0&&cam.y+cam.height<viewport.height);
  assert.ok(await page.locator('#flow-canvas').evaluate(b=>{const r=b.getBoundingClientRect();return b===document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);}));
  await page.screenshot({path:fileURLToPath(new URL('../artifacts/flow-'+viewport.width+'.png',import.meta.url)),fullPage:viewport.width>500});
 }
 await page.setViewportSize({width:1366,height:900});await page.getByLabel('Pen control',{exact:false}).selectOption('middle-pinch');
 await page.getByLabel('Communication environment').selectOption('classic');await page.getByLabel('Communication environment').selectOption('flow');await page.reload();await page.getByRole('button',{name:'Write & speak',exact:true}).first().click();
 assert.equal(await page.getByLabel('Communication environment').inputValue(),'flow');assert.equal(await page.locator('#pen-mode').inputValue(),'middle-pinch');assert.equal(await page.locator('#message').textContent(),saved+'x1');
 assert.deepEqual(errors,[]);console.log('PASS: novel-text keyboard/camera trials, exact completion, draft isolation, spelling/symbols, responsive camera visibility, pen/environment persistence. Controlled inputs, not live-user performance.');
}catch(e){await page.screenshot({path:fileURLToPath(new URL('../artifacts/flow-failure.png',import.meta.url)),fullPage:true});console.error('Browser errors:',errors);console.error('Status:',await page.locator('#flow-status').textContent().catch(()=>''));console.error('Message:',await page.locator('#message').textContent().catch(()=>''));throw e;}finally{await browser.close();}