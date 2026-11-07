import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();
try{
 await page.route('**/__hands.jpg',r=>r.fulfill({path:fileURLToPath(new URL('../.local/two-hands.jpg',import.meta.url)),contentType:'image/jpeg'}));
 await page.route('**/__portrait.jpg',r=>r.fulfill({path:fileURLToPath(new URL('../.local/portrait.jpg',import.meta.url)),contentType:'image/jpeg'}));
 await page.goto('http://localhost:4173/');
 for(const kind of ['hand','face']){
 const result=await page.evaluate(async kind=>{
  const worker=new Worker('/src/vision-worker.js');
  const message=()=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Worker timeout')),45000);worker.onmessage=e=>{clearTimeout(timeout);if(e.data.type==='error')reject(new Error(e.data.message));else resolve(e.data);};worker.onerror=e=>{clearTimeout(timeout);reject(new Error(e.message));};});
  const ready=message();worker.postMessage({type:'init',kind,numHands:2});const initialized=await ready;
  const img=new Image();img.src=kind==='hand'?'/__hands.jpg':'/__portrait.jpg';await img.decode();
  const bitmap=await createImageBitmap(img),wait=message();
  worker.postMessage({type:'frame',bitmap,capturedAt:performance.now(),id:1},[bitmap]);
  const out=await wait;const timings=[out.computeMs];let hands=(out.result.landmarks||out.result.faceLandmarks).length;for(let i=0;i<5;i++){const bitmap=await createImageBitmap(img),pending=message();worker.postMessage({type:'frame',bitmap,capturedAt:performance.now(),id:i+2},[bitmap]);const next=await pending;timings.push(next.computeMs);hands=(next.result.landmarks||next.result.faceLandmarks).length;}worker.terminate();return {initialized,hands,timings};
 },kind);
 assert.ok(result.hands>=1,'real vision inference in worker must produce landmarks');
 assert.equal(result.initialized.type,'ready');assert.ok(result.timings.every(Number.isFinite));
 console.log('PASS: actual bundled MediaPipe model processes transferred images in a worker',kind,result);
 }
}finally{await browser.close();}
