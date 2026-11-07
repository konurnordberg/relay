import {VisionPen} from './vision-pen.js';
import {RingTrace,ringSuggestions} from './cirrin-core.js';
export class CirrinInput{
 constructor(changed,insert){this.changed=changed;this.insert=insert;this.trace=new RingTrace();this.pen=new VisionPen();this.gain=2.4;this.center={x:.5,y:.375};this.aspect=4/3;this.guide=false;this.lastRaw=null;this.reset();}
 reset(){this.pen.reset();this.trace.reset();this.lastAt=null;this.pinched=false;this.thumbSince=null;this.suggestions=[];this.suggestionStamp=null;this.lastRaw=null;this.pointerActive=false;}
 map(p){return {x:.5+(p.x-this.center.x)*this.gain,y:.5+(p.y-this.center.y)*this.gain};}
 setGain(gain){if([1.3,1.8,2.4].includes(gain))this.gain=gain;this.reset();}
 centerOnHand(now){
  if(!this.lastRaw||now-this.lastRaw.at>200)return false;
  this.center={...this.lastRaw.point};this.centered=true;this.reset();this.trace.hint='Centered. Start drawing here with your selected pen control.';return true;
 }
 update(frame,active){
  const now=frame.now;this.aspect=frame.handAspect||4/3;if(!this.centered)this.center={x:.5,y:.5/this.aspect};
  const p=this.pen.update(frame);if(!p)return;
  if(p.discontinuous)this.thumbSince=null;if(p.point)this.lastRaw={point:p.raw||p.point,at:p.at};
  if(!active){this.trace.interrupt();if(p.point)this.trace.cursor=this.map(p.point);this.thumbSince=null;this.changed();return;}
  if(p.interrupted){this.trace.interrupt();this.thumbSince=null;}
  if(!p.point){this.thumbSince=null;this.trace.cursor=null;this.changed();return;}
  this.trace.cursor=this.map(p.point);
  if(this.trace.phase==='review'&&p.thumbUp){
   this.thumbSince??=now;if(now-this.thumbSince>=850){this.accept(this.trace.word);return;}
  }else{
   this.thumbSince=null;
   for(const sample of p.samples)this.trace.sample(this.map(sample.point),true,sample.at);
   if(p.released||!p.down)this.trace.sample(this.map(p.point),false,p.at,{pointer:!!p.released});
  }
  this.changed();
 }

 pointer(point,down,at){this.thumbSince=null;this.trace.sample(point,down,at,{pointer:true});this.changed();}
 choices(vocabulary){
  const stamp=this.trace.phase+':'+this.trace.word;
  if(stamp!==this.suggestionStamp){this.suggestionStamp=stamp;this.suggestions=this.trace.phase==='review'?ringSuggestions(this.trace.word,vocabulary):[];}
  return this.suggestions;
 }
 accept(word){if(this.trace.phase!=='review'||!this.suggestions.some(x=>x.word===word))return;this.reset();this.insert(word);this.changed();}
}
