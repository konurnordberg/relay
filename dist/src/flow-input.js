import {VisionPen} from './vision-pen.js';
import {nearestKey} from './flow-core.js';
export class FlowInput{
 constructor(changed,commit,command){
  this.changed=changed;this.commit=commit;this.command=command;this.pen=new VisionPen();this.gain=2.4;this.aspect=4/3;this.center={x:.5,y:.375};this.centered=false;this.mode='words';this.auto=true;this.personal=[];this.jobs=Promise.resolve();this.generation=0;this.reset();
 }
 reset(){this.generation++;this.pen.reset();this.path=[];this.lastPath=[];this.cursor=null;this.lastRaw=null;this.tracing=false;this.candidates=[];this.review=false;this.hover=null;this.hoverSince=0;this.hoverFired=false;this.thumbSince=null;this.pending=0;this.pointerActive=false;this.status='Point to draw. Open your hand to finish the word.';}
 setGain(value){if([1.3,1.8,2.4,3].includes(value))this.gain=value;this.reset();}
 centerOnHand(now){if(!this.lastRaw||now-this.lastRaw.at>240)return false;this.center={...this.lastRaw.point};this.centered=true;this.reset();this.status='Centered. Move to the first letter with an open hand.';return true;}
 map(point){return {x:.5+(point.x-this.center.x)*this.gain,y:.53+(point.y-this.center.y)*this.gain*1.8};}
 async load(){
  if(this.loaded)return;if(this.loading)return this.loading;
  this.loading=(async()=>{this.worker=new Worker(new URL('./flow-worker.js',import.meta.url),{type:'module'});this.requests=new Map();this.requestId=0;
   this.worker.onmessage=({data})=>{const r=this.requests.get(data.id);if(!r)return;clearTimeout(r.timer);this.requests.delete(data.id);data.error?r.reject(new Error(data.error)):r.resolve(data);};
   this.worker.onerror=e=>{for(const r of this.requests.values()){clearTimeout(r.timer);r.reject(new Error(e.message||'Word worker failed'));}this.requests.clear();this.loaded=false;};
   await this.request({type:'load'});this.loaded=true;
  })().catch(e=>{this.worker?.terminate();this.worker=null;this.error=e.message;throw e;}).finally(()=>this.loading=null);
  return this.loading;
 }
 request(data){return new Promise((resolve,reject)=>{const id=++this.requestId,timer=setTimeout(()=>{this.requests.delete(id);reject(new Error('Word decoding timed out. Restart Flow.'));},15000);this.requests.set(id,{resolve,reject,timer});this.worker.postMessage({...data,id});});}
 sample(point,down,at){
  this.cursor=point;
  if(!down){if(this.tracing)this.finish();return;}
  if(!this.tracing){this.path=[];this.tracing=true;this.status='Trace through the word. Open hand to finish.';}
  if(this.path.length>=1600){this.cancelStroke();this.status='Stroke too long. Open your hand and try a shorter word.';return;}
  if(point.x<-.15||point.x>1.15||point.y<-.2||point.y>1.2){this.cancelStroke();this.status='Outside the keyboard. Recenter or reduce the movement range.';return;}
  const previous=this.path.at(-1);if(!previous||Math.hypot(previous.x-point.x,previous.y-point.y)>.002)this.path.push({...point,at});
 }
 cancelStroke(){this.tracing=false;this.path=[];this.pen.blocked=true;this.pen.down=false;}
 finish(){
  if(!this.path.length){this.tracing=false;return;}
  const points=this.path.map(p=>({x:p.x,y:p.y})),mode=this.mode,generation=this.generation,automatic=this.auto;
  this.lastPath=this.path;this.path=[];this.tracing=false;
  if(mode!=='words'){const key=nearestKey(points.at(-1));this.commit(key,{literal:true,mode});this.status='Inserted '+key.toUpperCase()+'.';return;}
  this.status='Reading word…';this.pending++;
  this.jobs=this.jobs.catch(()=>{}).then(async()=>{
   try{
    await this.load();const out=await this.request({type:'decode',points,personal:this.personal});if(generation!==this.generation)return;
    this.candidates=out.candidates;this.review=true;this.ms=out.ms;
    if(!this.candidates.length){this.status='No match. Start close to the first letter, or use Spell.';return;}
    if(automatic&&out.quality!=='uncertain'){const word=this.candidates[0].word;this.accept(0);this.status='Wrote '+word+' · alternatives above.';}
    else this.status='Review '+this.candidates.map(c=>c.word).join(' / ')+'. Hover open-handed over a choice.';
   }catch(e){if(generation===this.generation){this.status=e.message;this.error=e.message;}}
   finally{if(generation===this.generation){this.pending=Math.max(0,this.pending-1);this.changed();}}
  });this.changed();
 }
 accept(index){
  const word=this.candidates[index]?.word;if(!word)return;
  const replace=!this.review;this.review=false;this.commit(word,{replace});this.changed();
 }
 update(frame,active){
  this.aspect=frame.handAspect||4/3;if(!this.centered)this.center={x:.5,y:.5/this.aspect};
  const p=this.pen.update(frame);if(!p)return;
  if(p.point){this.lastRaw={point:p.raw||p.point,at:p.at};this.cursor=this.map(p.point);}else this.cursor=null;
  if(!active){this.tracing=false;this.thumbSince=null;this.changed();return;}
  if(p.discontinuous)this.thumbSince=null;
  if(p.interrupted){this.cancelStroke();this.status='Tracking lost. Open hand to reset; the unfinished word was not inserted.';}
  if(!p.point){this.thumbSince=null;this.changed();return;}
  if(this.review&&p.thumbUp){this.thumbSince??=p.at;if(p.at-this.thumbSince>=400){this.accept(0);this.thumbSince=null;}}
  else{
   this.thumbSince=null;
   for(const s of p.samples)this.sample(this.map(s.point),true,s.at);
   if(p.released)this.sample(this.cursor,false,p.at);
   if(!p.down&&!p.thumbUp&&!this.tracing){
    const c=this.cursor,target=c.x>=0&&c.x<=1?(c.y>=0&&c.y<.18&&this.candidates.length?'choice-'+Math.min(2,Math.floor(c.x*3)):c.y>.85&&c.y<1.02?'tool-'+Math.min(5,Math.floor(c.x*6)):null):null;
    if(target!==this.hover){this.hover=target;this.hoverSince=p.at;this.hoverFired=false;}
    if(target&&!this.hoverFired&&p.at-this.hoverSince>=450){this.hoverFired=true;const [kind,id]=target.split('-');if(kind==='choice')this.accept(Number(id));else this.command(['space','undo','delete','period','caps','mode'][Number(id)]);this.hover=target;this.hoverFired=true;}
   }else{this.hover=null;this.hoverFired=false;}
  }
  this.changed();
 }
 close(){this.worker?.terminate();for(const r of this.requests?.values()||[]){clearTimeout(r.timer);r.reject(new Error('Closed'));}this.requests?.clear();}
}