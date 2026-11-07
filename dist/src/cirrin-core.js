export const RING_LETTERS='abcdefghijklmnopqrstuvwxyz';
export const RING={inner:.34,outer:.49,label:.415,reset:.29,start:.23};
const TAU=Math.PI*2,STEP=TAU/26;
export function letterPoint(letter,r=RING.label){const i=RING_LETTERS.indexOf(letter.toLowerCase()),a=i*STEP-Math.PI/2;return {x:.5+Math.cos(a)*r,y:.5+Math.sin(a)*r};}
export function ringHit(p){
 if(!Number.isFinite(p?.x)||!Number.isFinite(p?.y))return null;
 const x=p.x-.5,y=p.y-.5,r=Math.hypot(x,y),position=((Math.atan2(y,x)+Math.PI/2+TAU)%TAU)/STEP;
 const nearest=Math.round(position),index=nearest%26,offset=position-nearest;
 return {r,index,letter:RING_LETTERS[index],offset,inRing:r>=RING.inner&&r<=RING.outer};
}
export class RingTrace{
 constructor(){this.reset();}
 reset(){this.phase='idle';this.word='';this.hits=[];this.path=[];this.cursor=null;this.candidate=null;this.latched=null;this.releaseSince=null;this.lastAt=null;this.mustRelease=false;this.interrupted=false;this.hint='Start a pinch in the center.';}
 begin(){this.word='';this.hits=[];this.path=[];this.candidate=null;this.latched=null;this.releaseSince=null;this.interrupted=false;this.phase='tracing';this.hint='Visit letters; travel through the center.';}
 sample(p,down,at,{pointer=false}={}){
  const hit=ringHit(p);if(!hit||!Number.isFinite(at))return;
  if(this.lastAt!==null&&at<=this.lastAt)return;
  if(this.lastAt!==null&&at-this.lastAt>220&&this.phase==='tracing')this.interrupt();
  this.lastAt=at;this.cursor=p;
  if(this.mustRelease){if(!down)this.mustRelease=false;return;}
  if(this.phase!=='tracing'){
   if(!down)return;
   if(hit.r>RING.start){this.hint='Move into the center while pinching to start a new word.';return;}
   this.begin();
  }
  if(!down){
   this.candidate=null;this.releaseSince??=at;
   if(pointer||at-this.releaseSince>=160)this.finish();
   return;
  }
  this.releaseSince=null;
  if(this.path.length>=2400||this.word.length>=32){this.finish();this.mustRelease=true;this.hint='Word limit reached. Review this word.';return;}
  const previous=this.path.at(-1);
  if(!previous||Math.hypot(previous.x-p.x,previous.y-p.y)>.002)this.path.push({...p,break:previous&&Math.hypot(previous.x-p.x,previous.y-p.y)>.4});
  if(hit.r<RING.reset){this.latched=null;this.candidate=null;return;}
  if(!hit.inRing||Math.abs(hit.offset)>.4){this.candidate=null;return;}
  if(hit.index===this.latched){this.candidate=null;return;}
  if(this.candidate?.index!==hit.index)this.candidate={index:hit.index,since:at,samples:0};
  this.candidate.samples++;
  if(pointer||this.candidate.samples>=2&&at-this.candidate.since>=45){
   this.word+=hit.letter;this.hits.push({letter:hit.letter,index:hit.index,pathIndex:this.path.length-1});
   this.latched=hit.index;this.candidate=null;this.hint='Captured '+hit.letter.toUpperCase()+'. Release when the word is complete.';
  }
 }
 finish(){this.phase=this.word?'review':'idle';this.releaseSince=null;this.candidate=null;this.latched=null;this.hint=this.word?'Review your word. Thumbs-up inserts the exact trace.':'No letters captured. Start in the center.';}
 interrupt(){if(this.phase==='tracing'){this.finish();this.interrupted=true;this.mustRelease=true;this.hint='Tracking interrupted. Review the captured letters or redraw.';}this.cursor=null;this.candidate=null;}
 removeLast(){if(!this.word)return;const h=this.hits.pop();this.word=this.word.slice(0,-1);if(h)this.path.length=Math.max(0,h.pathIndex);this.finish();}
 append(letter){if(!/^[a-z]$/i.test(letter)||this.word.length>=32)return;this.word+=letter.toLowerCase();this.hits.push({letter:letter.toLowerCase(),index:RING_LETTERS.indexOf(letter.toLowerCase()),pathIndex:this.path.length});this.finish();}
}
function substitution(a,b){if(a===b)return 0;const d=Math.abs(RING_LETTERS.indexOf(a)-RING_LETTERS.indexOf(b));return Math.min(d,26-d)===1 ? .5 : 1.25;}
function distance(a,b){
 const d=Array.from({length:a.length+1},(_,i)=>Array.from({length:b.length+1},(_,j)=>i===0?j*.9:j===0?i*.9:0));
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
  d[i][j]=Math.min(d[i-1][j]+.9,d[i][j-1]+.9,d[i-1][j-1]+substitution(a[i-1],b[j-1]));
  if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+.8);
 }return d[a.length][b.length];
}
export function ringSuggestions(raw,vocabulary=[]){
 if(!raw)return [];
 const result=[{word:raw,kind:'Your trace'}];if(raw.length<2)return result;
 const words=[...new Set(vocabulary.filter(w=>typeof w==='string').map(w=>w.toLowerCase()))];
 const ranked=words.filter(w=>/^[a-z]{2,32}$/.test(w)&&w!==raw&&Math.abs(w.length-raw.length)<=1).map((word,i)=>({word,i,cost:distance(raw,word)})).filter(x=>x.cost<=Math.min(1.3,raw.length*.45)).sort((a,b)=>a.cost-b.cost||a.i-b.i);
 return [...result,...ranked.slice(0,2).map(x=>({word:x.word,kind:'Nearby word'}))];
}
export function wordInsertion(current,word,caps=false){return (current&&!/\s$/.test(current)?' ':'')+(caps?word.toUpperCase():word.toLowerCase())+' ';}
