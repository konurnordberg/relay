import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();
try{
 await page.route('**/__fixture.jpg',r=>r.fulfill({path:fileURLToPath(new URL('../.local/portrait.jpg',import.meta.url)),contentType:'image/jpeg'}));
 await page.goto('http://localhost:4173/');
 const result=await page.evaluate(async()=>{
  const {FilesetResolver,FaceLandmarker}=await import('/vendor/vision_bundle.mjs');
  const {faceFeatures}=await import('/src/camera.js');
  const files=await FilesetResolver.forVisionTasks('/vendor/wasm');
  const model=await FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'/models/face_landmarker.task',delegate:'CPU'},runningMode:'IMAGE',outputFaceBlendshapes:true,numFaces:1});
  const img=new Image();img.src='/__fixture.jpg';await img.decode();
  const out=model.detect(img);const vector=faceFeatures(out);model.close();
  return {faces:out.faceLandmarks.length,landmarks:out.faceLandmarks[0].length,blendshapes:out.faceBlendshapes[0].categories.length,features:vector.length,finite:vector.every(Number.isFinite)};
 });
 assert.equal(result.faces,1);assert.equal(result.blendshapes,52);assert.equal(result.features,60);assert.ok(result.finite);
 console.log('PASS: real portrait → MediaPipe face landmarks → 60 finite personal features',result);
 await fs.writeFile(new URL('../artifacts/vision-results.json',import.meta.url),JSON.stringify({passed:true,...result,scope:'Static public MediaPipe fixture; not real-world gesture accuracy.'},null,2));
}finally{await browser.close();}
