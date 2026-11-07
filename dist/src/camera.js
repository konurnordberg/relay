import {FingerTrails} from './trails.js';
import {combineFeatures,smoothCombined} from './features.js';
export class VisionCamera{
 constructor(video,canvas,onFrame,onState){Object.assign(this,{video,canvas,onFrame,onState});this.running=false;this.session=0;this.models=[];this.trails=new FingerTrails();this.drawing=null;}
 async start(mode='combined',deviceId=''){
  this.stop();const session=++this.session;this.mode=mode;this.onState('loading',mode==='combined'?'Loading face and both-hand tracking…':'Loading local vision model…');
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera access requires localhost or HTTPS. Open this app in Chrome or Edge.');
   const {FilesetResolver,FaceLandmarker,HandLandmarker}=await import('../vendor/vision_bundle.mjs');
   if(session!==this.session)return;
   const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},frameRate:{ideal:30,max:60},...(deviceId?{deviceId:{exact:deviceId}}:{facingMode:'user'})},audio:false});
   if(session!==this.session){stream.getTracks().forEach(t=>t.stop());return;}
   this.stream=stream;this.video.srcObject=stream;await this.video.play();
   const vision=await FilesetResolver.forVisionTasks(new URL('../vendor/wasm',import.meta.url).href);
   for(const type of (mode==='combined'?['face','hand']:[mode])){
    if(session!==this.session)return;
    const options={baseOptions:{modelAssetPath:new URL('../models/'+type+'_landmarker.task',import.meta.url).href,delegate:'GPU'},runningMode:'VIDEO'};
    if(type==='face')Object.assign(options,{numFaces:1,outputFaceBlendshapes:true,minFaceDetectionConfidence:.6,minFacePresenceConfidence:.6,minTrackingConfidence:.6});
    else Object.assign(options,{numHands:mode==='combined'?2:1,minHandDetectionConfidence:.6,minHandPresenceConfidence:.6,minTrackingConfidence:.6});
    const Factory=type==='face'?FaceLandmarker:HandLandmarker;let model;
    try{model=await Factory.createFromOptions(vision,options);}catch{options.baseOptions.delegate='CPU';model=await Factory.createFromOptions(vision,options);}
    if(session!==this.session){model.close();return;}this.models.push({type,model});
   }
   this.running=true;this.lastVideo=-1;this.lastInfer=0;this.smooth=null;this.handMemory=[null,null];this.onState('ready',mode==='combined'?'Face + both hands · all signals available':'Camera ready');this.loop();
  }catch(e){if(session!==this.session)return;this.stop();this.onState('error',friendlyCameraError(e));}
 }
 loop(){
  if(!this.running)return;const now=performance.now();
  if(this.video.readyState>=2&&this.video.currentTime!==this.lastVideo&&now-this.lastInfer>28){
   this.lastVideo=this.video.currentTime;this.lastInfer=now;
   try{
    const before=performance.now();let face=null,hand=null;
    for(const {type,model} of this.models){const out=model.detectForVideo(this.video,now);if(type==='face')face=out;else hand=out;}
    const facePoints=face?.faceLandmarks?.[0],handPoints=hand?.landmarks||[];let vector,slots=handSlots(hand);
    if(this.mode==='combined'){
     slots=stableHandSlots(slots,this.handMemory);this.handMemory=slots;
     vector=combineFeatures(facePoints?faceFeatures(face):null,slots.map(p=>p?extendedHandFeatures(p):null));
     this.smooth=smoothCombined(vector,this.smooth);
    }else{
     vector=this.mode==='face'?(facePoints?faceFeatures(face):null):(handPoints[0]?handFeatures(handPoints[0]):null);
     this.smooth=vector?(this.smooth?vector.map((v,i)=>.5*v+.5*this.smooth[i]):vector):null;
    }
    this.trails.update(handPoints,now,hand?.handedness);this.drawing={face:facePoints,hands:handPoints,at:now};this.onFrame({vector:this.smooth,points:facePoints||handPoints[0],now,latency:performance.now()-before,tracking:{face:!!facePoints,hands:handPoints.length}});
   }catch(e){this.onFrame({vector:null,now,latency:0});this.stop();this.onState('error','Vision processing stopped: '+e.message);return;}
  }
  const frame=this.drawing&&now-this.drawing.at<300?this.drawing:null;
  this.draw(frame?.face,frame?.hands||[],now);
  this.raf=requestAnimationFrame(()=>this.loop());
 }
 setTrails(enabled){this.trails.setEnabled(enabled);if(!this.running)this.draw(null,[]);}
 draw(face,hands=[],now=performance.now()){
  const c=this.canvas,ctx=c.getContext('2d');const width=this.video.videoWidth||640,height=this.video.videoHeight||480;if(c.width!==width)c.width=width;if(c.height!==height)c.height=height;ctx.clearRect(0,0,c.width,c.height);
  const dots=(points,indices,color)=>{ctx.fillStyle=color;for(const i of indices){const p=points[i];if(p){ctx.beginPath();ctx.arc(p.x*c.width,p.y*c.height,3,0,Math.PI*2);ctx.fill();}}};
  if(face)dots(face,[1,4,33,133,362,263,61,291,13,14,70,300,468,473],'#dff7a4');
  hands.forEach((points,n)=>{
   const color=n?'#9ce3ff':'#ffd49c';ctx.strokeStyle=color;ctx.lineWidth=2;
   for(const chain of [[0,1,2,3,4],[0,5,6,7,8],[0,9,10,11,12],[0,13,14,15,16],[0,17,18,19,20],[5,9,13,17]]){ctx.beginPath();chain.forEach((i,j)=>ctx[j?'lineTo':'moveTo'](points[i].x*c.width,points[i].y*c.height));ctx.stroke();}
   dots(points,points.map((_,i)=>i),color);
  });
  this.trails.draw(ctx,c.width,c.height,now);
 }
 stop(){this.session++;this.running=false;cancelAnimationFrame(this.raf);this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;for(const {model} of this.models||[])model.close();this.models=[];this.smooth=null;this.drawing=null;this.trails.clear();this.canvas.getContext('2d').clearRect(0,0,this.canvas.width,this.canvas.height);if(this.video)this.video.srcObject=null;}
}
export function handSlots(result){
 const slots=[null,null],scores=[0,0];
 (result?.landmarks||[]).forEach((points,i)=>{
  const category=result.handedness?.[i]?.[0],label=category?.categoryName;
  if(!['Left','Right'].includes(label)||category.score<.65)return;
  const slot=label==='Left'?0:1;
  if(category.score>scores[slot]){slots[slot]=points;scores[slot]=category.score;}
 });return slots;
}
export function extendedHandFeatures(p){return [...handFeatures(p),p[0].x,p[0].y,p[0].z,p[8].x,p[8].y,p[8].z];}
const clamp=(x,min=-3,max=3)=>Math.max(min,Math.min(max,x));
export function faceFeatures(result){
 const p=result.faceLandmarks[0],cats=result.faceBlendshapes?.[0]?.categories;
 if(!cats||cats.length!==52)return null;
 // Alphabetical category order makes the feature schema independent of result order.
 const v=[...cats].sort((a,b)=>a.categoryName.localeCompare(b.categoryName)).map(x=>x.score);
 const left=p[33],right=p[263],nose=p[1],mid={x:(left.x+right.x)/2,y:(left.y+right.y)/2};
 const width=Math.hypot(right.x-left.x,right.y-left.y)||0.01;
 v.push(clamp((nose.x-mid.x)/width),clamp((nose.y-mid.y)/width),clamp((left.z-right.z)/width),Math.atan2(right.y-left.y,right.x-left.x));
 // Iris positions are coarse relative-eye features, NOT screen gaze coordinates.
 for(const [iris,a,b,top,bottom] of [[468,33,133,159,145],[473,362,263,386,374]]){
  const w=Math.hypot(p[b].x-p[a].x,p[b].y-p[a].y)||0.01;
  v.push(clamp((p[iris].x-(p[a].x+p[b].x)/2)/w),clamp((p[iris].y-(p[top].y+p[bottom].y)/2)/w));
 }
 return v;
}
export function handFeatures(p){
 const origin=p[0],scale=Math.hypot(p[9].x-origin.x,p[9].y-origin.y,p[9].z-origin.z)||0.01;
 return p.flatMap(q=>[clamp((q.x-origin.x)/scale),clamp((q.y-origin.y)/scale),clamp((q.z-origin.z)/scale)]);
}
function friendlyCameraError(e){
 if(e.name==='NotAllowedError')return 'Camera permission was blocked. Allow camera access in your browser, then try again.';
 if(e.name==='NotFoundError')return 'No camera found. Connect a webcam and try again.';
 if(e.name==='NotReadableError')return 'The camera is busy. Close other camera apps and try again.';
 return e.message||'Could not start the camera. Try Chrome or Edge on localhost.';
}

export function stableHandSlots(slots,previous){
 if(!previous)return slots;
 const d=(a,b)=>Math.hypot(a[0].x-b[0].x,a[0].y-b[0].y);
 if(slots.every(Boolean)&&previous.every(Boolean)){
  const own=d(slots[0],previous[0])+d(slots[1],previous[1]);
  const swapped=d(slots[0],previous[1])+d(slots[1],previous[0]);
  if(own>.2&&swapped+.12<own)return [null,null];
 }
 return slots;
}
