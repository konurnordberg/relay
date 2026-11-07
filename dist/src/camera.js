export class VisionCamera{
 constructor(video,canvas,onFrame,onState){Object.assign(this,{video,canvas,onFrame,onState});this.running=false;this.session=0;}
 async start(mode='face',deviceId=''){
  this.stop();const session=++this.session;this.mode=mode;this.onState('loading','Loading local vision model…');
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera access requires localhost or HTTPS. Open this app in Chrome or Edge.');
   const [{FilesetResolver,FaceLandmarker,HandLandmarker},stream]=await Promise.all([import('../vendor/vision_bundle.mjs'),navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},...(deviceId?{deviceId:{exact:deviceId}}:{facingMode:'user'})},audio:false})]);
   if(session!==this.session){stream.getTracks().forEach(t=>t.stop());return;}
   this.stream=stream;this.video.srcObject=stream;await this.video.play();
   const vision=await FilesetResolver.forVisionTasks(new URL('../vendor/wasm',import.meta.url).href);
   const options={baseOptions:{modelAssetPath:new URL('../models/'+(mode==='face'?'face':'hand')+'_landmarker.task',import.meta.url).href,delegate:'GPU'},runningMode:'VIDEO'};
   if(mode==='face')Object.assign(options,{numFaces:1,outputFaceBlendshapes:true,outputFacialTransformationMatrixes:true,minFaceDetectionConfidence:0.6,minFacePresenceConfidence:0.6,minTrackingConfidence:0.6});
   else Object.assign(options,{numHands:1,minHandDetectionConfidence:0.6,minHandPresenceConfidence:0.6,minTrackingConfidence:0.6});
   const Factory=mode==='face'?FaceLandmarker:HandLandmarker;
   let model;
   try{model=await Factory.createFromOptions(vision,options);}catch{options.baseOptions.delegate='CPU';model=await Factory.createFromOptions(vision,options);}
   if(session!==this.session){model.close();return;}
   this.model=model;this.running=true;this.lastVideo=-1;this.lastInfer=0;this.smooth=null;this.onState('ready','Camera ready');this.loop();
  }catch(e){if(session!==this.session)return;this.stop();this.onState('error',friendlyCameraError(e));}
 }
 loop(){
  if(!this.running)return;
  const now=performance.now();
  if(this.video.readyState>=2&&this.video.currentTime!==this.lastVideo&&now-this.lastInfer>55){
   this.lastVideo=this.video.currentTime;this.lastInfer=now;
   try{
    const before=performance.now(),result=this.model.detectForVideo(this.video,now);
    const points=this.mode==='face'?result.faceLandmarks?.[0]:result.landmarks?.[0];
    const vector=points?(this.mode==='face'?faceFeatures(result):handFeatures(points)):null;
    this.smooth=vector?(this.smooth?vector.map((v,i)=>0.5*v+0.5*this.smooth[i]):vector):null;
    this.draw(points);this.onFrame({vector:this.smooth,points,now,latency:performance.now()-before});
   }catch(e){this.onFrame({vector:null,now,latency:0});this.onState('error','Vision processing stopped: '+e.message);this.stop();return;}
  }
  this.raf=requestAnimationFrame(()=>this.loop());
 }
 draw(points){
  const c=this.canvas,ctx=c.getContext('2d');c.width=this.video.videoWidth||640;c.height=this.video.videoHeight||480;ctx.clearRect(0,0,c.width,c.height);
  if(!points)return;ctx.fillStyle='#dff7a4';ctx.strokeStyle='#dff7a4aa';ctx.lineWidth=2;
  const indices=this.mode==='face'?[1,4,33,133,362,263,61,291,13,14,70,300,468,473]:points.map((_,i)=>i);
  if(this.mode==='hand')for(const chain of [[0,1,2,3,4],[0,5,6,7,8],[0,9,10,11,12],[0,13,14,15,16],[0,17,18,19,20],[5,9,13,17]]){
   ctx.beginPath();chain.forEach((i,n)=>ctx[n?'lineTo':'moveTo'](points[i].x*c.width,points[i].y*c.height));ctx.stroke();
  }
  for(const i of indices){const p=points[i];if(p){ctx.beginPath();ctx.arc(p.x*c.width,p.y*c.height,3,0,Math.PI*2);ctx.fill();}}
 }
 stop(){this.session++;this.running=false;cancelAnimationFrame(this.raf);this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.model?.close();this.model=null;if(this.video)this.video.srcObject=null;}
}
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
