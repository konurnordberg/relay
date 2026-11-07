import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const delegate=process.argv[2]||'CPU',threshold=Number(process.argv[3]||.6);
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();
try{
 await page.route('**/__hands.jpg',r=>r.fulfill({path:fileURLToPath(new URL('../.local/two-hands.jpg',import.meta.url)),contentType:'image/jpeg'}));
 for(const name of ['fist.jpg','pointing_up.jpg','victory.jpg','thumb_up.jpg'])await page.route('**/__'+name,r=>r.fulfill({path:fileURLToPath(new URL('../.local/'+name,import.meta.url)),contentType:'image/jpeg'}));
 await page.goto('http://localhost:4173/');
 const result=await page.evaluate(async({delegate,threshold})=>{
  const {FilesetResolver,HandLandmarker}=await import('/vendor/vision_bundle.mjs'),{countFingers}=await import('/src/finger-index.js');
  const {penPose}=await import('/src/vision-pen.js');
  const files=await FilesetResolver.forVisionTasks('/vendor/wasm');
  const model=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'/models/hand_landmarker.task',delegate},runningMode:'IMAGE',numHands:2,minHandDetectionConfidence:threshold,minHandPresenceConfidence:.6});
  const results=[];for(const name of ['hands.jpg','fist.jpg','pointing_up.jpg','victory.jpg','thumb_up.jpg']){
   const image=new Image();image.src='/__'+name;await image.decode();const out=model.detect(image);
   results.push({name,pen:out.landmarks.map((p,i)=>penPose(p,out.worldLandmarks[i],image.width/image.height)),hands:out.landmarks.length,counts:out.landmarks.map((p,i)=>countFingers(p,out.worldLandmarks[i],image.width/image.height))});
  }model.close();return results;
 },{delegate,threshold});
 console.log(result.map(({pen,...r})=>({...r,pen:pen.map(p=>({down:p?.down,up:p?.up}))})));assert.deepEqual(result.map(r=>r.counts),[[5,5],[0],[1],[2],[1]]);
 assert.ok(result.find(r=>r.name==='pointing_up.jpg').pen[0].down);assert.ok(result.find(r=>r.name==='hands.jpg').pen.every(p=>p.up&&!p.down));
 console.log('PASS: real bundled MediaPipe on public fixtures produces five/open, zero/fist, one/index, two/victory and one/thumb');
}finally{await browser.close();}
