export class VisionLane{
 constructor(kind,onResult,onError){Object.assign(this,{kind,onResult,onError});this.closed=false;this.busy=false;this.ready=false;this.id=0;this.lastFrame=-1;this.lastSent=-Infinity;}
 start(numHands=2){
  return new Promise((resolve,reject)=>{
   this.reject=reject;this.worker=new Worker(new URL('./vision-worker.js',import.meta.url));
   this.timer=setTimeout(()=>this.fail(new Error('Vision worker startup timed out.')),45000);
   this.worker.onerror=e=>this.fail(new Error(e.message||'Vision worker failed.'));
   this.worker.onmessage=({data})=>{
    if(this.closed)return;
    if(data.type==='ready'){clearTimeout(this.timer);this.ready=true;this.delegate=data.delegate;this.reject=null;resolve(this);}
    else if(data.type==='result'){this.busy=false;clearTimeout(this.frameTimer);this.onResult(data);}
    else if(data.type==='error')this.fail(new Error(data.message));
   };
   this.worker.postMessage({type:'init',kind:this.kind,numHands});
  });
 }
 offer(video,frameId,capturedAt,minInterval=0){
  if(this.closed||!this.ready||this.busy||this.lastFrame===frameId||capturedAt-this.lastSent<minInterval)return false;
  this.busy=true;this.lastFrame=frameId;this.lastSent=capturedAt;const id=++this.id;
  createImageBitmap(video).then(bitmap=>{
   if(this.closed){bitmap.close();return;}
   this.frameTimer=setTimeout(()=>this.fail(new Error('Vision worker stopped responding.')),15000);
   this.worker.postMessage({type:'frame',bitmap,capturedAt,id},[bitmap]);
  }).catch(error=>{this.busy=false;if(!this.closed)this.fail(error);});
  return true;
 }
 fail(error){
  if(this.closed)return;clearTimeout(this.timer);clearTimeout(this.frameTimer);
  if(this.reject){const reject=this.reject;this.reject=null;reject(error);}
  else this.onError(error);
 }
 close(){
  if(this.closed)return;this.closed=true;clearTimeout(this.timer);clearTimeout(this.frameTimer);
  this.worker?.terminate();this.busy=false;this.ready=false;
  if(this.reject){const reject=this.reject;this.reject=null;reject(new Error('Camera stopped.'));}
 }
}
