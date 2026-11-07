import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const sdk=`export const FilesetResolver={forVisionTasks:async()=>({})};
export const FaceLandmarker={createFromOptions:async()=>({detectForVideo:()=>({faceLandmarks:[]}),close(){}})};
export const HandLandmarker={createFromOptions:async()=>({detectForVideo:()=>({landmarks:[],handedness:[]}),close(){}})};`;
try{
 for(const scenario of ['independent','startup-failure','runtime-failure','restart']){
  const context=await browser.newContext({permissions:['camera']}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/vendor/vision_bundle.mjs',r=>r.fulfill({contentType:'text/javascript',body:sdk}));
  await context.route('**/src/vision-worker.js',r=>r.fulfill({contentType:'text/javascript',body:`
   let kind='';self.onmessage=({data})=>{
    if(data.type==='init'){kind=data.kind;setTimeout(()=>postMessage(${scenario==='startup-failure'?"{type:'error',message:'deliberate unavailable worker'}":"{type:'ready',kind,delegate:'test'}"}),${scenario==='restart'?200:5});}
    if(data.type==='frame'){
     data.bitmap.close();setTimeout(()=>postMessage(${scenario==='runtime-failure'?"{type:'error',message:'deliberate lost worker'}":"{type:'result',kind,result:kind==='face'?{faceLandmarks:[]}:{landmarks:[],handedness:[]},capturedAt:data.capturedAt,computeMs:kind==='face'?90:5,id:data.id}"}),kind==='face'?90:5);
    }
   };`}));
  await page.goto('http://localhost:4173/');
  const result=await page.evaluate(async scenario=>{
   const {VisionCamera}=await import('/src/camera.js'),video=document.createElement('video'),canvas=document.createElement('canvas');
   video.muted=true;document.body.append(video,canvas);let callbacks=0;const states=[];
   const camera=new VisionCamera(video,canvas,()=>callbacks++,(...state)=>states.push(state));
   if(scenario==='restart'){
    const first=camera.start('combined');await new Promise(r=>setTimeout(r,80));
    const second=camera.start('combined');await Promise.all([first,second]);
   }else await camera.start('combined');
   await new Promise(r=>setTimeout(r,2000));
   const metrics=camera.getMetrics(),running=camera.running,track=video.srcObject?.getVideoTracks()[0];
   camera.stop();const stoppedAt=callbacks;await new Promise(r=>setTimeout(r,250));
   return {metrics,running,states,stoppedCallbacks:callbacks-stoppedAt,trackState:track?.readyState,lanes:camera.lanes.length};
  },scenario);
  assert.equal(result.running,true,JSON.stringify(result.states));
  assert.equal(result.stoppedCallbacks,0);assert.equal(result.trackState,'ended');assert.equal(result.lanes,0);
  if(scenario.includes('failure'))assert.equal(result.metrics.backend,'compatibility');
  else{
   assert.equal(result.metrics.backend,'workers');
   assert.ok(result.metrics.handFps>result.metrics.faceFps,'slow face processing must not hold up the hand lane');
  }
  assert.deepEqual(errors,[]);console.log('PASS:',scenario,JSON.stringify(result.metrics));await context.close();
 }
}finally{await browser.close();}
