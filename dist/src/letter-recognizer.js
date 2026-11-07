export class LetterRecognizer{
 constructor(){this.worker=null;this.pending=new Map();this.serial=0;}
 request(type,strokes){
  if(!this.worker){
   this.worker=new Worker(new URL('./letter-worker.js',import.meta.url));
   this.worker.onmessage=({data})=>{const p=this.pending.get(data.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(data.id);if(data.type==='error'){const error=new Error(data.message);p.reject(error);this.close(error);}else p.resolve(data);};
   this.worker.onerror=()=>this.close(new Error('Could not start the local handwriting model. Reload and try again.'));
  }
  return new Promise((resolve,reject)=>{const id=++this.serial,timer=setTimeout(()=>this.close(new Error('Handwriting model timed out. Try again.')),45000);this.pending.set(id,{resolve,reject,timer});this.worker.postMessage({type,strokes,id});});
 }
 load(){return this.request('init');}
 recognize(strokes){return this.request('recognize',strokes);}
 close(error=new Error('Handwriting stopped.')){this.worker?.terminate();this.worker=null;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();}
}
