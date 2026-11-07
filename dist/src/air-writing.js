import {AirInk,paintInk} from './air-ink.js';
import {VisionPen} from './vision-pen.js';
import {LetterRecognizer} from './letter-recognizer.js';
export class AirWriter{
 constructor(changed,insert){this.changed=changed;this.insert=insert;this.ink=new AirInk();this.pen=new VisionPen();this.model=new LetterRecognizer();this.state='idle';this.candidates=[];this.generation=0;this.lastAt=null;this.thumbSince=null;this.lastRecognized=-1;this.aspect=4/3;this.error='';}
 reset(){this.pen.reset();this.generation++;this.ink.clear();this.candidates=[];this.state='idle';this.error='';this.lastAt=null;this.thumbSince=null;this.lastRecognized=-1;this.recognizeAgain=false;}
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
  const now=frame.now;if(!active){this.pen.reset();this.ink.lift(now);this.thumbSince=null;return;}
  const p=this.pen.update(frame);if(!p)return;this.aspect=frame.handAspect||4/3;
  if(p.discontinuous)this.thumbSince=null;this.ink.cursor=p.point;this.hint=p.phase==='gap'?'Brief tracking gap · holding the stroke':p.phase==='lost'||p.phase==='rearm'?'Open your hand to reset, then point to draw':p.down?'Ink on · open hand to lift':'Pen lifted · '+(this.pen.mode==='point'?'point your index finger to draw':'pinch to draw');
  if(p.interrupted||p.released)this.ink.lift(now);
  if(!p.point){this.thumbSince=null;this.changed(false);return;}
  if(this.candidates.length&&p.thumbUp){
   this.ink.lift(now);this.thumbSince??=now;this.hint='Hold thumbs-up to insert '+this.candidates[0].letter;
   if(now-this.thumbSince>=850){this.accept(this.candidates[0].letter);return;}
  }else{
   this.thumbSince=null;
   for(const sample of p.samples){if(this.candidates.length){this.candidates=[];this.state='idle';}this.ink.add(sample.point,true,sample.at);}
  }
  if(this.ink.limited)this.hint='Drawing limit reached. Recognize or clear this letter.';
  if(!this.ink.down&&this.ink.usable&&now-this.ink.upAt>=900&&this.lastRecognized!==this.ink.revision&&this.state!=='recognizing')void this.recognize();
  this.changed(false);
 }

 draw(canvas,background=false){if(!canvas)return;const w=640,h=Math.round(w/this.aspect);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}paintInk(canvas.getContext('2d'),this.ink.strokes,w,h,{cursor:this.ink.cursor,down:this.ink.down,background});}
 pointer(point,down,at){
  if(down&&this.candidates.length){this.candidates=[];this.state='idle';}
  this.ink.add(point,down,at);this.changed(false);
 }
}
