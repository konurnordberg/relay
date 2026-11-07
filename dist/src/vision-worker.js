// Classic worker: MediaPipe's WASM loader uses importScripts in this context.
let model=null,kind='',delegate='GPU';
self.onmessage=async({data})=>{
 if(data.type==='init'){
  try{
   kind=data.kind;delegate=data.delegate==='CPU'?'CPU':'GPU';
   const vision=await import(new URL('../vendor/vision_bundle.mjs',self.location.href).href);
   const files=await vision.FilesetResolver.forVisionTasks(new URL('../vendor/wasm',self.location.href).href);
   const options={baseOptions:{modelAssetPath:new URL('../models/'+kind+'_landmarker.task',self.location.href).href,delegate},runningMode:'VIDEO',canvas:new OffscreenCanvas(1,1)};
   if(kind==='face')Object.assign(options,{numFaces:1,outputFaceBlendshapes:true,minFaceDetectionConfidence:.6,minFacePresenceConfidence:.6,minTrackingConfidence:.6});
   else Object.assign(options,{numHands:data.numHands||2,minHandDetectionConfidence:.6,minHandPresenceConfidence:.6,minTrackingConfidence:.35});
   const Factory=kind==='face'?vision.FaceLandmarker:vision.HandLandmarker;
   try{model=await Factory.createFromOptions(files,options);}catch{delegate='CPU';options.baseOptions.delegate=delegate;options.canvas=new OffscreenCanvas(1,1);model=await Factory.createFromOptions(files,options);}
   self.postMessage({type:'ready',kind,delegate});
  }catch(error){self.postMessage({type:'error',message:error.message||String(error)});}
 }else if(data.type==='frame'){
  try{
   const start=performance.now(),result=model.detectForVideo(data.bitmap,data.capturedAt);
   self.postMessage({type:'result',kind,result,capturedAt:data.capturedAt,computeMs:performance.now()-start,id:data.id});
  }catch(error){self.postMessage({type:'error',message:error.message||String(error)});}
  finally{data.bitmap?.close();}
 }else if(data.type==='stop'){model?.close();self.close();}
};
