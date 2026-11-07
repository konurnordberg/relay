import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
try{
 for(const scenario of ['workers','startup-failure','runtime-failure','real-model']){
  const context=await browser.newContext({permissions:['camera']}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  if(scenario!=='real-model'){
   await context.route('**/vendor/vision_bundle.mjs',r=>r.fulfill({contentType:'text/javascript',body:"export const FilesetResolver={forVisionTasks:async()=>({})};export const FaceLandmarker={createFromOptions:async()=>{throw new Error('Unexpected face model')}};export const HandLandmarker={createFromOptions:async(f,options)=>{globalThis.__handOptions=options;return {detectForVideo:()=>({landmarks:[],handedness:[]}),close(){}}}};"}));
   await context.route('**/src/vision-worker.js',r=>r.fulfill({contentType:'text/javascript',body:"self.onmessage=({data})=>{if(data.type==='init'){if(data.kind!=='hand'||data.numHands!==2||data.delegate!=='CPU')throw new Error('Wrong Chord worker setup');postMessage("+(scenario==='startup-failure'?"{type:'error',message:'fixture startup failure'}":"{type:'ready',kind:'hand',delegate:'CPU'}")+");}if(data.type==='frame'){data.bitmap.close();postMessage("+(scenario==='runtime-failure'?"{type:'error',message:'fixture runtime failure'}":"{type:'result',kind:'hand',result:{landmarks:[],handedness:[]},capturedAt:data.capturedAt,computeMs:1,id:data.id}")+");}}"}));
  }
  await page.goto('http://localhost:4173/');
  const result=await page.evaluate(async scenario=>{
   const {VisionCamera}=await import('/src/camera.js'),video=document.createElement('video'),canvas=document.createElement('canvas');video.muted=true;document.body.append(video,canvas);
   let frames=0;const states=[],cam=new VisionCamera(video,canvas,()=>frames++,(...v)=>states.push(v));
   await cam.start('hands','','CPU');await new Promise(r=>setTimeout(r,1500));
   const result={running:cam.running,metrics:cam.getMetrics(),kinds:cam.lanes.map(l=>l.kind),models:cam.models.map(l=>l.kind),options:window.__handOptions,states,frames};
   cam.stop();return result;
  },scenario);
  assert.ok(result.running,JSON.stringify(result.states));assert.ok(result.frames>0);
  assert.equal(result.metrics.faceFps,0);
  if(scenario.includes('failure')){assert.equal(result.metrics.backend,'compatibility');assert.deepEqual(result.models,['hand']);assert.equal(result.options.numHands,2);assert.equal(result.options.baseOptions.delegate,'CPU');}
  else{assert.equal(result.metrics.backend,'workers');assert.deepEqual(result.kinds,['hand']);}
  assert.deepEqual(errors,[]);console.log('PASS: Chord two-hand-only CPU pipeline',scenario);await context.close();
 }
}finally{await browser.close();}