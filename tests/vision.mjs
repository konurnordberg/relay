import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();
try{
 await page.route('**/__fixture.jpg',r=>r.fulfill({path:fileURLToPath(new URL('../.local/portrait.jpg',import.meta.url)),contentType:'image/jpeg'}));
 await page.route('**/__hands.jpg',r=>r.fulfill({path:fileURLToPath(new URL('../.local/two-hands.jpg',import.meta.url)),contentType:'image/jpeg'}));
 await page.goto('http://localhost:4173/');
 const result=await page.evaluate(async()=>{
  const {FilesetResolver,FaceLandmarker,HandLandmarker}=await import('/vendor/vision_bundle.mjs');
  const {faceFeatures,extendedHandFeatures,handSlots}=await import('/src/camera.js');
  const files=await FilesetResolver.forVisionTasks('/vendor/wasm');
  const model=await FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'/models/face_landmarker.task',delegate:'CPU'},runningMode:'IMAGE',outputFaceBlendshapes:true,numFaces:1});
  const img=new Image();img.src='/__fixture.jpg';await img.decode();
  const out=model.detect(img);const vector=faceFeatures(out);model.close();
  const handModel=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'/models/hand_landmarker.task',delegate:'CPU'},runningMode:'IMAGE',numHands:2});
  const handImage=new Image();handImage.src='/__hands.jpg';await handImage.decode();
  const handOut=handModel.detect(handImage),handVectors=handOut.landmarks.map(extendedHandFeatures);handModel.close();
  const {combineFeatures}=await import('/src/features.js');
  const combined=combineFeatures(vector,handSlots(handOut).map(p=>p?extendedHandFeatures(p):null));
  return {hands:handVectors.length,handFeatureLengths:handVectors.map(v=>v.length),combinedFeatures:combined.length,combinedFinite:combined.every(Number.isFinite),faces:out.faceLandmarks.length,landmarks:out.faceLandmarks[0].length,blendshapes:out.faceBlendshapes[0].categories.length,features:vector.length,finite:vector.every(Number.isFinite)};
 });
 assert.equal(result.hands,2);assert.deepEqual(result.handFeatureLengths,[69,69]);assert.equal(result.combinedFeatures,201);assert.ok(result.combinedFinite);
 assert.equal(result.faces,1);assert.equal(result.blendshapes,52);assert.equal(result.features,60);assert.ok(result.finite);
 console.log('PASS: real face and two-hand fixtures → local MediaPipe → finite combined feature schema',result);
 await fs.writeFile(new URL('../artifacts/vision-results.json',import.meta.url),JSON.stringify({passed:true,...result,scope:'Static public MediaPipe fixture; not real-world gesture accuracy.'},null,2));
}finally{await browser.close();}
