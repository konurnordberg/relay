import {AirInk,airHand,paintInk} from './air-ink.js';
import {fingerEvidence} from './finger-index.js';
import {LetterRecognizer} from './letter-recognizer.js';
export class AirWriter{
 constructor(changed,insert){this.changed=changed;this.insert=insert;this.ink=new AirInk();this.model=new LetterRecognizer();this.state='idle';this.candidates=[];this.generation=0;this.lastAt=null;this.thumbSince=null;this.lastRecognized=-1;this.aspect=4/3;this.error='';}
 reset(){this.generation++;this.ink.clear();this.candidates=[];this.state='idle';this.error='';this.lastAt=null;this.thumbSince=null;this.lastRecognized=-1;this.recognizeAgain=false;}
 async load(){if(this.loaded)return;this.state='loading';this.changed();try{await this.model.load();this.loaded=true;this.state='idle';}catch(e){this.state='error';this.error=e.message;throw e;}finally{this.changed();}}
 async recognize(){
  if(!this.ink.usable)return;
  if(this.state==='recognizing'){this.recognizeAgain=true;return;}
  this.ink.lift(performance.now());const generation=this.generation,revision=this.ink.revision;
  this.state='recognizing';this.lastRecognized=revision;this.candidates=[];this.changed();
  try{
   const out=await this.model.recognize(this.ink.strokes);
   if(generation!==this.generation||revision!==this.ink.revision)return;
   this.candidates=out.candidates;this.ambiguous=out.ambiguous;this.state='ready';this.thumbSince=null;this.inferenceMs=out.ms;
  }catch(e){if(generation!==this.generation)return;this.error=e.message;this.state='error';}
  finally{if(generation===this.generation){if(this.state==='recognizing')this.state='idle';this.changed();if(this.recognizeAgain&&!this.ink.down){this.recognizeAgain=false;void this.recognize();}}}
 }
 accept(letter){if(!/^[A-Z]$/.test(letter)||!this.candidates.length)return;this.reset();this.insert(letter);this.changed();}
 update(frame,active){
  const at=frame.handFrameAt,now=frame.now;if(!active||!Number.isFinite(at)||now-at>200){this.ink.lift(now);this.ink.cursor=null;this.thumbSince=null;return;}
  if(this.lastAt!==null&&at<=this.lastAt)return;
  if(this.lastAt!==null&&at-this.lastAt>200){this.thumbSince=null;this.ink.lift(at);}
  this.lastAt=at;
  this.aspect=frame.handAspect||4/3;
  const hand=frame.hands?.length===1?frame.hands[0]:null,p=airHand(hand,this.aspect,this.ink.down);
  if(!p){this.ink.lift(at);this.ink.cursor=null;this.thumbSince=null;this.hint=frame.hands?.length>1?'Use one drawing hand.':'Keep your whole drawing hand in view.';}
  else{
   const evidence=fingerEvidence(hand,frame.handWorld?.[0],this.aspect),f=evidence?.fingers;
   const thumbUp=f&&f[0]>.75&&f.slice(1).every(v=>v<.25);
   if(this.candidates.length&&thumbUp){
    this.ink.lift(at);this.thumbSince??=at;this.hint='Hold thumbs-up to insert '+this.candidates[0].letter;
    if(at-this.thumbSince>=850){this.accept(this.candidates[0].letter);return;}
   }else{
    this.thumbSince=null;
    if(p.down&&this.candidates.length){this.candidates=[];this.state='idle';}
    this.ink.add(p.point,p.down,at);
    this.hint=p.down?'Ink on · release to lift the pen':'Pen lifted · pinch to draw';
   }
  }
  if(this.ink.limited)this.hint='Drawing limit reached. Recognize or clear this letter.';
  if(!this.ink.down&&this.ink.usable&&now-this.ink.upAt>=1100&&this.lastRecognized!==this.ink.revision&&this.state!=='recognizing')void this.recognize();
  this.changed(false);
 }
 draw(canvas,background=false){if(!canvas)return;const w=640,h=Math.round(w/this.aspect);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}paintInk(canvas.getContext('2d'),this.ink.strokes,w,h,{cursor:this.ink.cursor,down:this.ink.down,background});}
 pointer(point,down,at){
  if(down&&this.candidates.length){this.candidates=[];this.state='idle';}
  this.ink.add(point,down,at);this.changed(false);
 }
}
