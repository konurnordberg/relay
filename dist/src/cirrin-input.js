import {airHand} from './air-ink.js';
import {fingerEvidence} from './finger-index.js';
import {RingTrace,ringSuggestions} from './cirrin-core.js';
export class CirrinInput{
 constructor(changed,insert){this.changed=changed;this.insert=insert;this.trace=new RingTrace();this.gain=2.4;this.center={x:.5,y:.375};this.aspect=4/3;this.guide=false;this.lastRaw=null;this.reset();}
 reset(){this.trace.reset();this.lastAt=null;this.pinched=false;this.thumbSince=null;this.suggestions=[];this.suggestionStamp=null;this.lastRaw=null;this.pointerActive=false;}
 map(p){return {x:.5+(p.x-this.center.x)*this.gain,y:.5+(p.y-this.center.y)*this.gain};}
 setGain(gain){if([1.3,1.8,2.4].includes(gain))this.gain=gain;this.reset();}
 centerOnHand(now){
  if(!this.lastRaw||now-this.lastRaw.at>200)return false;
  this.center={...this.lastRaw.point};this.centered=true;this.reset();this.trace.hint='Centered. Pinch here to start your word.';return true;
 }
 update(frame,active){
  const at=frame.handFrameAt,now=frame.now;this.aspect=frame.handAspect||4/3;if(!this.centered)this.center={x:.5,y:.5/this.aspect};
  if(!Number.isFinite(at)||now-at>200){this.trace.interrupt();this.thumbSince=null;this.lastRaw=null;this.changed();return;}
  if(this.lastAt!==null&&at<=this.lastAt)return;
  if(this.lastAt!==null&&at-this.lastAt>220){this.trace.interrupt();this.thumbSince=null;}
  this.lastAt=at;
  const hand=frame.hands?.length===1?frame.hands[0]:null,p=airHand(hand,this.aspect,this.pinched);
  if(!p){this.trace.interrupt();this.pinched=false;this.thumbSince=null;this.lastRaw=null;this.changed();return;}
  this.lastRaw={point:p.point,at};
  if(!active){this.trace.interrupt();this.trace.cursor=this.map(p.point);this.pinched=false;this.thumbSince=null;this.changed();return;}
  this.pinched=p.down;
  const f=fingerEvidence(hand,frame.handWorld?.[0],this.aspect)?.fingers;
  const thumbUp=f&&f[0]>.75&&f.slice(1).every(v=>v<.25);
  if(this.trace.phase==='review'&&thumbUp){
   this.trace.cursor=this.map(p.point);this.thumbSince??=at;
   if(at-this.thumbSince>=850){this.accept(this.trace.word);return;}
  }else{this.thumbSince=null;this.trace.sample(this.map(p.point),p.down,at);}
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
