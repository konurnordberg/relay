import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import fs from 'node:fs/promises';
const label=process.argv[2]||'current';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const context=await browser.newContext({permissions:['camera']}),page=await context.newPage();
try{
 await page.goto('http://localhost:4173/');
 const stats=await page.evaluate(async()=>{
  const {VisionCamera}=await import('/src/camera.js');
  const video=document.createElement('video');video.muted=true;video.playsInline=true;
  const canvas=document.createElement('canvas');document.body.append(video,canvas);
  const frames=[],paint=[],states=[];let previous=performance.now(),raf;
  const tick=now=>{paint.push(now-previous);previous=now;raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);
  const camera=new VisionCamera(video,canvas,frame=>frames.push({at:performance.now(),latency:frame.latency,metrics:frame.metrics}),(...x)=>states.push(x));
  camera.setTrails(true);await camera.start('combined');
  if(!camera.running)throw new Error(JSON.stringify(states));
  const deadline=performance.now()+25000;
  while(camera.getMetrics&&(!camera.events.hand.length||!camera.events.face.length)&&performance.now()<deadline)await new Promise(r=>setTimeout(r,100));
  await new Promise(r=>setTimeout(r,1000));frames.length=0;paint.length=0;const start=performance.now();
  await new Promise(r=>setTimeout(r,6000));const elapsed=performance.now()-start;
  const reported=camera.getMetrics?.();camera.stop();cancelAnimationFrame(raf);
  const percentile=(v,p)=>[...v].sort((a,b)=>a-b)[Math.min(v.length-1,Math.floor(v.length*p))]||0;
  return {frames:frames.length,elapsedMs:Math.round(elapsed),updatesPerSecond:Math.round(frames.length/elapsed*10000)/10,
   inferenceMedianMs:Math.round(percentile(frames.map(f=>f.latency),.5)),inferenceP95Ms:Math.round(percentile(frames.map(f=>f.latency),.95)),
   uiFrameP95Ms:Math.round(percentile(paint,.95)),reported,states};
 });
 console.log(JSON.stringify({label,...stats},null,2));
 await fs.writeFile(new URL('../artifacts/performance-'+label+'.json',import.meta.url),JSON.stringify({label,...stats,scope:'Headless Chrome synthetic camera; no live laptop performance claim.'},null,2));
}finally{await browser.close();}
