import {FingerTrails} from './trails.js';
import {combineFeatures} from './features.js';
import {VisionLane} from './vision-lane.js';
const FRESH_MS=200;
const blend=(v,previous)=>v?(previous?v.map((x,i)=>.5*x+.5*previous[i]):v):null;
export class VisionCamera{
 constructor(video,canvas,onFrame,onState){
  Object.assign(this,{video,canvas,onFrame,onState});this.running=false;this.session=0;this.models=[];this.lanes=[];this.trails=new FingerTrails();this.resetFrames();
 }
 resetFrames(){this.face=null;this.hand=null;this.handMemory=[null,null];this.frameId=0;this.mediaTime=-1;this.lastEmit=0;this.events={face:[],hand:[],video:[]};this.backend='';this.warmed=false;}
 async start(mode='combined',deviceId='',handDelegate='GPU'){
  this.stop();const session=++this.session;this.mode=mode;this.handDelegate=handDelegate==='CPU'?'CPU':'GPU';this.onState('loading','Starting fast camera tracking…');
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera access requires localhost or HTTPS. Open this app in Chrome or Edge.');
   // Verify bundled runtime before asking for camera access.
   this.visionSDK=await import('../vendor/vision_bundle.mjs');if(session!==this.session)return;
   const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},frameRate:{ideal:60,max:60},...(deviceId?{deviceId:{exact:deviceId}}:{facingMode:'user'})},audio:false});
   if(session!==this.session){stream.getTracks().forEach(t=>t.stop());return;}
   this.stream=stream;this.cameraSettings=stream.getVideoTracks()[0].getSettings();this.video.srcObject=stream;await this.video.play();if(session!==this.session)return;
   const kinds=mode==='combined'?['hand','face']:mode==='hands'?['hand']:[mode];
   if(typeof Worker!=='undefined'&&typeof OffscreenCanvas!=='undefined'&&typeof createImageBitmap==='function'){
    try{
     this.lanes=kinds.map(kind=>new VisionLane(kind,data=>this.receive(data,session),error=>this.recover(error,session)));
     await Promise.all(this.lanes.map(l=>l.start(['combined','hands'].includes(mode)?2:1,l.kind==='hand'?this.handDelegate:'GPU')));
     this.backend='workers';
    }catch(error){
     if(session!==this.session)return;this.lanes.forEach(l=>l.close());this.lanes=[];
     await this.loadMain(kinds,session);
    }
   }else await this.loadMain(kinds,session);
   if(session!==this.session)return;
   this.running=true;this.onState('ready','Camera ready · warming tracking…');this.scheduleVideo();this.loop();
  }catch(error){if(session!==this.session)return;this.stop();this.onState('error',friendlyCameraError(error));}
 }
 async loadMain(kinds,session){
  const {FilesetResolver,FaceLandmarker,HandLandmarker}=this.visionSDK;
  const files=await FilesetResolver.forVisionTasks(new URL('../vendor/wasm',import.meta.url).href);
  if(session!==this.session)return;
  for(const kind of kinds){
   const options={baseOptions:{modelAssetPath:new URL('../models/'+kind+'_landmarker.task',import.meta.url).href,delegate:kind==='hand'?this.handDelegate:'GPU'},runningMode:'VIDEO'};
   if(kind==='face')Object.assign(options,{numFaces:1,outputFaceBlendshapes:true,minFaceDetectionConfidence:.6,minFacePresenceConfidence:.6,minTrackingConfidence:.6});
   else Object.assign(options,{numHands:['combined','hands'].includes(this.mode)?2:1,minHandDetectionConfidence:.6,minHandPresenceConfidence:.6,minTrackingConfidence:.35});
   const Factory=kind==='face'?FaceLandmarker:HandLandmarker;let model;
   try{model=await Factory.createFromOptions(files,options);}catch{options.baseOptions.delegate='CPU';model=await Factory.createFromOptions(files,options);}
   if(session!==this.session){model.close();return;}
   this.models.push({kind,model,lastFrame:-1,lastSent:-Infinity});
  }this.backend='compatibility';
 }
 async recover(error,session){
  if(session!==this.session||this.recovering)return;
  this.recovering=true;this.running=false;cancelAnimationFrame(this.raf);this.video.cancelVideoFrameCallback?.(this.vfc);
  this.lanes.forEach(l=>l.close());this.lanes=[];this.trails.clear();this.face=this.hand=null;this.handMemory=[null,null];
  this.onFrame({vector:null,now:performance.now(),latency:0});
  this.onState('loading','Restarting camera tracking…');
  try{
   await this.loadMain(this.mode==='combined'?['hand','face']:this.mode==='hands'?['hand']:[this.mode],session);
   if(session!==this.session)return;
   this.running=true;this.onState('ready','Camera ready');this.scheduleVideo();this.loop();
  }catch(e){if(session===this.session){this.stop();this.onState('error',friendlyCameraError(e));}}
  finally{if(session===this.session)this.recovering=false;}
 }
 scheduleVideo(){
  if(!this.running||!this.video.requestVideoFrameCallback)return;
  this.vfc=this.video.requestVideoFrameCallback((now,metadata)=>{
   if(!this.running)return;
   try{this.frameId++;this.mediaTime=metadata.mediaTime;this.events.video.push(now);this.offerFrame(performance.now());this.scheduleVideo();}
   catch(e){this.stop();this.onState('error','Vision processing stopped: '+e.message);}
  });
 }
 offerFrame(now){
  if(!this.running||this.video.readyState<2||!this.frameId)return;
  if(this.backend==='workers'){
   for(const lane of this.lanes)lane.offer(this.video,this.frameId,now,lane.kind==='face'&&this.mode==='combined'?55:0);
  }else{
   for(const entry of this.models){
    if(entry.lastFrame===this.frameId||now-entry.lastSent<(entry.kind==='face'&&this.mode==='combined'?55:0))continue;
    entry.lastFrame=this.frameId;entry.lastSent=now;
    const begin=performance.now(),result=entry.model.detectForVideo(this.video,now);
    this.receive({kind:entry.kind,result,capturedAt:now,computeMs:performance.now()-begin},this.session);
   }
  }
 }
 receive(data,session){
  if(session!==this.session||!this.running)return;
  const now=performance.now(),{kind,result,capturedAt,computeMs}=data;
  if(now-capturedAt<=FRESH_MS){
   this.events[kind].push(now);
   if(kind==='face'){
    const points=result.faceLandmarks?.[0],vector=points?faceFeatures(result):null;
    this.face={result,vector:blend(vector,this.face&&capturedAt-this.face.capturedAt<=FRESH_MS?this.face.vector:null),capturedAt,computeMs};
   }else{
    const previous=this.hand&&capturedAt-this.hand.capturedAt<=FRESH_MS?this.hand:null;
    const points=result.landmarks||[],slots=stableHandSlots(handSlots(result),previous?this.handMemory:null);this.handMemory=slots;
    this.hand={result,slots,vectors:slots.map((p,i)=>blend(p?extendedHandFeatures(p):null,previous?.vectors?.[i])),
     vector:blend(points[0]?handFeatures(points[0]):null,previous?.vector),capturedAt,computeMs};
    this.trails.update(points,capturedAt,result.handedness);
   }
   if(!this.warmed){this.warmed=true;this.onState('ready',this.mode==='combined'?'Face + both hands · fast tracking':'Camera ready');}
   this.emit(now);
  }
  // One in-flight frame per model. When a model finishes, offer the newest
  // decoded frame, never a backlog of old frames.
  if(this.backend==='workers')this.offerFrame(performance.now());
 }
 emit(now){
  const face=this.face&&now-this.face.capturedAt<=FRESH_MS?this.face:null;
  const hand=this.hand&&now-this.hand.capturedAt<=FRESH_MS?this.hand:null;
  const vector=this.mode==='combined'?combineFeatures(face?.vector||null,hand?.vectors||[null,null]):this.mode==='face'?face?.vector||null:hand?.vector||null;
  this.lastEmit=now;
  this.onFrame({vector,hands:hand?.result.landmarks||[],handWorld:hand?.result.worldLandmarks||[],handFrameAt:hand?.capturedAt??null,handAspect:(this.video.videoWidth||640)/(this.video.videoHeight||480),points:face?.result.faceLandmarks?.[0]||hand?.result.landmarks?.[0],now,
   latency:Math.max(face?.computeMs||0,hand?.computeMs||0),tracking:{face:!!face?.vector,hands:hand?.result.landmarks?.length||0},metrics:this.getMetrics(now)});
 }
 getMetrics(now=performance.now()){
  for(const kind of ['face','hand','video'])this.events[kind]=this.events[kind].filter(t=>now-t<1000);
  return {cameraFps:this.events.video.length,handFps:this.events.hand.length,faceFps:this.events.face.length,
   handAgeMs:this.hand?Math.round(now-this.hand.capturedAt):null,handVisible:!!(this.hand&&now-this.hand.capturedAt<=FRESH_MS&&this.hand.result.landmarks?.length),backend:this.backend,warming:!this.warmed};
 }
 loop(){
  if(!this.running)return;const now=performance.now();
  try{
   if(!this.video.requestVideoFrameCallback&&this.video.readyState>=2){
    const time=this.video.getVideoPlaybackQuality?.().totalVideoFrames??this.video.currentTime;
    if(time!==this.mediaTime){this.mediaTime=time;this.frameId++;this.events.video.push(now);this.offerFrame(now);}
   }
   const face=this.face&&now-this.face.capturedAt<200?this.face.result.faceLandmarks?.[0]:null;
   const hands=this.hand&&now-this.hand.capturedAt<200?this.hand.result.landmarks:[];
   this.draw(face,hands||[],now);
   if(now-this.lastEmit>200)this.emit(now);
  }catch(e){this.stop();this.onState('error','Vision processing stopped: '+e.message);return;}
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
 stop(){
  this.session++;this.running=false;this.recovering=false;cancelAnimationFrame(this.raf);this.video.cancelVideoFrameCallback?.(this.vfc);
  this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;
  this.lanes.forEach(l=>l.close());this.lanes=[];for(const {model} of this.models)model.close();this.models=[];
  this.resetFrames();this.trails.clear();this.canvas.getContext('2d').clearRect(0,0,this.canvas.width,this.canvas.height);this.video.srcObject=null;
 }
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
