import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const context=await browser.newContext({permissions:['camera'],viewport:{width:1440,height:1050}}),page=await context.newPage(),errors=[];
// Controlled landmark fixture exercises the compatibility renderer. Workers have separate real-runtime tests.
await context.addInitScript(()=>{window.Worker=undefined;});
page.on('pageerror',e=>errors.push(e.message));
await context.route('**/vendor/vision_bundle.mjs',r=>r.fulfill({contentType:'text/javascript',body:
`export const FilesetResolver={forVisionTasks:async()=>({})};
export const FaceLandmarker={createFromOptions:async()=>({detectForVideo:()=>({faceLandmarks:[]}),close(){}})};
export const HandLandmarker={createFromOptions:async()=>({detectForVideo:()=>{
 const x=window.__finger||{x:.45,y:.45};
 const hand=Array.from({length:21},(_,i)=>({x:x.x+(i===8?0:(i%4-1)*.016),y:x.y+(i===8?0:.12+i*.002),z:0}));
 return {landmarks:window.__lost?[]:[hand],handedness:[[{categoryName:window.__label||'Left',score:window.__confidence??.99}]]};
},close(){}})};`}));
try{
 await page.goto('http://localhost:4173/');
 await page.getByRole('button',{name:'Create a profile',exact:true}).click();
 await page.getByLabel('Profile name').fill('Trail preview');await page.getByRole('button',{name:'Start setup'}).click();
 await page.locator('.camera-options summary').click();
 const toggle=page.getByRole('switch',{name:'Enable trails'});assert.equal(await toggle.isChecked(),false);await toggle.check();
 await page.reload();await page.getByRole('button',{name:'Teach gestures',exact:true}).click();await page.locator('.camera-options summary').click();assert.equal(await toggle.isChecked(),true);
 await page.getByRole('button',{name:'Enable camera'}).click();
 await page.waitForFunction(()=>document.querySelector('#camera-pill').textContent==='On');
 // Count camera inference requests while testing the real renderer.
 await page.evaluate(()=>{
  const ctx=document.querySelector('#overlay').getContext('2d'),curve=ctx.bezierCurveTo.bind(ctx);
  window.__curves=0;ctx.bezierCurveTo=(...args)=>{window.__curves++;return curve(...args);};
 });
 // Draw an S with brief missing detections and unstable handedness.

 for(let i=0;i<=18;i++){
  await page.evaluate(i=>{window.__finger={x:.5+Math.sin(i/18*Math.PI*2)*.18,y:.2+i/18*.55};window.__lost=i===7;window.__confidence=i>9&&i<14?.4:.99;window.__label=i>9&&i<14?'Right':'Left';},i);
  await page.waitForTimeout(65);
 }
 const trailPixels=()=>page.evaluate(()=>{
  const c=document.querySelector('#overlay'),ctx=c.getContext('2d'),data=ctx.getImageData(0,0,c.width,c.height).data;
  let count=0;for(let i=0;i<data.length;i+=4)if(data[i+3]>10&&data[i+1]>data[i]+25&&data[i+2]>data[i]+25)count++;
  return count;
 });
 assert.ok(await trailPixels()>100,'expected a visible cyan trail');
 assert.ok(await page.evaluate(()=>window.__curves>30),'expected curved strokes rather than polygonal line joins');
 await page.locator('.camera-card').screenshot({path:fileURLToPath(new URL('../artifacts/fingertip-trail.png',import.meta.url))});
 await toggle.uncheck();await page.waitForTimeout(120);
 assert.equal(await trailPixels(),0,'turning trails off must clear the path');
 await toggle.check();
 await page.evaluate(()=>{window.__label='Left';window.__confidence=.99;});
 for(let i=0;i<9;i++){await page.evaluate(i=>window.__finger={x:.3+i*.035,y:.35},i);await page.waitForTimeout(70);}
 await page.evaluate(()=>window.__lost=true);await page.waitForTimeout(350);
 assert.ok(await trailPixels()>0,'old path should fade briefly after tracking loss');
 await page.waitForTimeout(1600);
 assert.equal(await trailPixels(),0,'trail must fully expire without fresh tracking');
 await page.getByRole('button',{name:'Turn camera off'}).click();
 const remaining=await page.locator('#overlay').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v));
 assert.equal(remaining,false,'stopping camera clears overlay');
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.deepEqual(errors,[]);
 console.log('PASS: curved trails through missing detections and unstable labels, toggle persistence, immediate disable, fade, camera-stop cleanup, mobile width');
}finally{await browser.close();}
