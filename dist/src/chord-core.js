import {COMMON} from './communication.js';
export const CHORD_GROUPS=['abcde','fghij','klmno','pqrst','uvwxyz'];
const snippets=[
 ['Thanks for the update','Thanks for the update.'],['Works for me','That works for me.'],['I will take a look',"I'll take a look and get back to you."],['Send the details','Could you send me the details?'],
 ['Quick call',"Let's schedule a quick call."],['Sending shortly',"I'll send it over shortly."],['Ready tomorrow',"I'll have it ready by tomorrow."],['Keep me posted','Please let me know if anything changes.'],
 ['Good question',"That's a good question."],['My suggestion','Here is what I suggest:'],['Agree','I agree with that approach.'],['Need more time','I need a little more time to review this.'],
 ['Following up','Just following up on our conversation.'],['One more thing','One more thing before we wrap up:'],['Next steps','The next step is to'],['Happy to help',"I'm happy to help."],
 ['Thanks for your time','Thank you for your time.'],['Question for you','I have a question about'],['Check my understanding','To make sure I understand,'],['Could we change','Could we change'],
 ['Looks good','This looks good to me.'],['Available tomorrow',"I'm available tomorrow."],['Talk soon','Looking forward to hearing from you.'],['Short version','The short version is']
];
export const DEFAULT_SHORTCUTS=snippets.slice(0,20).map(([title,text])=>({title,text,verbatim:false}));
export function validShortcuts(value){
 return Array.isArray(value)&&value.length===20&&value.every(v=>v&&typeof v.title==='string'&&v.title.trim().length>0&&v.title.length<=50&&typeof v.text==='string'&&v.text.trim().length>0&&v.text.length<=500&&typeof v.verbatim==='boolean');
}
export const chordCode=index=>Math.floor(index/5)+'·'+(index%5+1);
const PRIORITY=('the to and i you a we it is can will that this for with of on in be have are not my your our want need would please thank thanks yes no').split(' ');
const CORPUS=('i will send the report tomorrow. i can help with the project. i would like to know more. we should review the changes together. we can talk later. '+ 
 'thank you for your time. thanks for the update. please send me the details. could you let me know when you are ready. '+ 
 'the next step is to test the idea. that works for me. let us meet at the office. i need more time to finish the work.').split(/[.!?]+/).map(s=>s.toLowerCase().match(/[a-z]+/g)||[]);
export function chordWords(filters,context='',personal=[]){
 const words=[...new Set([...personal,...PRIORITY,...COMMON,'report','review','changes','details','schedule','available','office','send','let','us','at','an','as','email','code','function','return','const','meeting','deadline','update','looks','great','appreciate'].map(w=>String(w).toLowerCase()).filter(w=>/^[a-z]{1,40}$/.test(w)))];
 const last=context.toLowerCase().match(/[a-z]+(?=[^a-z]*$)/)?.[0],next=new Map();
 for(const sentence of CORPUS)sentence.forEach((w,i)=>{if(w===last&&sentence[i+1])next.set(sentence[i+1],(next.get(sentence[i+1])||0)+1);});
 return words.filter(w=>w.length>=filters.length&&filters.every((g,i)=>CHORD_GROUPS[g]?.includes(w[i]))).map((word,i)=>({word,score:(next.get(word)||0)*1000+(personal.some(p=>p.toLowerCase()===word)?500:0)-i})).sort((a,b)=>b.score-a.score).slice(0,15).map(x=>x.word);
}
const key=(kind,label,value)=>({kind,label,value});
export class ChordBook{
 constructor(){this.mode='shortcuts';this.filters=[];}
 reset(){this.mode='shortcuts';this.filters=[];}
 keys(composer,shortcuts=DEFAULT_SHORTCUTS){
  const keys=Array.from({length:30},()=>key('noop','—'));
  if(composer.confirm){keys[0]=key('action','Cancel','cancel');keys[1]=key('action',composer.confirm==='speak'?'Speak now':'Clear message','confirm');return keys;}
  if(composer.paused){keys[0]=key('action','Resume','resume');return keys;}
  if(this.mode==='shortcuts')shortcuts.forEach((s,i)=>keys[i]={kind:'shortcut',label:s.title,value:s.text,verbatim:s.verbatim,slot:i});
  if(this.mode==='words'){
   chordWords(this.filters,composer.text,composer.personalWords).forEach((w,i)=>keys[i]=key('word',composer.caps||w==='i'?w.toUpperCase():w,w));
   CHORD_GROUPS.forEach((g,i)=>keys[15+i]=key('filter',g.toUpperCase().split('').join(' '),i));
  }
  if(this.mode==='spell'){
   Array.from('abcdefghijklmnopqrstuvwxyz').forEach((c,i)=>keys[i]=key('letter',composer.caps?c.toUpperCase():c,c));
   keys.splice(26,4,key('mode','Symbols','symbols'),key('mode','Words','words'),key('action','Delete','delete'),key('literal','Space',' '));
  }else if(this.mode==='symbols'||this.mode==='symbols2'){
   const punctuation=Array.from({length:95},(_,i)=>String.fromCharCode(i+32)).filter(c=>!/[a-zA-Z ]/.test(c));
   (this.mode==='symbols'?punctuation.slice(0,25):punctuation.slice(25)).forEach((c,i)=>keys[i]=key('literal',c,c));
   keys.splice(25,5,key('mode','More symbols',this.mode==='symbols'?'symbols2':'symbols'),key('mode','Letters','spell'),key('mode','Words','words'),key('action','Delete','delete'),key('literal','Space',' '));
  }else{
   keys.splice(20,10,key('mode',this.filters.length?'Reset filter':'Words','words'),key('mode','Shortcuts','shortcuts'),key('mode','Spell','spell'),key('action','Delete','delete'),key('action','Undo','undo'),key('literal','Space',' '),key('punctuation','.','.'),key('action',composer.caps?'abc':'ABC','caps'),key('literal','New line','\n'),key('action','Speak','speak'));
  }return keys;
 }
 apply(composer,k){
  if(!k||k.kind==='noop'||k.kind==='release')return null;
  if(composer.confirm&&!(k.kind==='action'&&['cancel','confirm'].includes(k.value))||composer.paused&&!(k.kind==='action'&&k.value==='resume'))return null;
  if(k.kind==='mode'){this.mode=k.value;this.filters=[];return null;}
  if(k.kind==='filter'){if(this.filters.length<12)this.filters.push(k.value);return null;}
  if(k.kind==='action')return composer.apply({type:k.value});
  if(k.kind==='punctuation'){composer.change(composer.text.replace(/ +$/,'')+k.value+' ');return null;}
  if(k.kind==='letter'||k.kind==='literal')return composer.apply({type:'text',value:k.kind==='letter'&&composer.caps?k.value.toUpperCase():k.value});
  const value=k.kind==='word'?(composer.caps||k.value==='i'?k.value.toUpperCase():k.value):k.value;
  const gap=composer.text&&!/\s$/.test(composer.text)&&!/^[\s.,;:!?]/.test(value)?' ':'';
  composer.apply({type:'text',value:k.verbatim?value:gap+value+(/\s$/.test(value)?'':' ')});
  this.filters=[];return null;
 }
}
// A chord is armed from neutral, latched once stable, and emitted only on a
// fresh, sustained 0·0. Intermediate finger counts while closing are ignored.
export class ChordGate{
 constructor(holdMs=180){this.holdMs=holdMs;this.reset();}
 reset(){this.lastAt=null;this.armed=false;this.pending=null;this.candidate=null;this.since=0;this.samples=0;this.neutralSince=null;this.neutralSamples=0;this.uncertainSince=null;this.progress=0;}
 update(pair,at,now=at){
  const out={index:null,pending:this.pending,armed:this.armed,progress:this.progress};
  if(!Number.isFinite(at)||now-at>200||this.lastAt!==null&&at-this.lastAt>250){this.reset();return {...out,pending:null,armed:false,progress:0};}
  if(this.lastAt!==null&&at<=this.lastAt)return out;this.lastAt=at;
  const valid=Number.isInteger(pair.row)&&Number.isInteger(pair.col)&&pair.row>=0&&pair.row<=5&&pair.col>=0&&pair.col<=5;
  if(!valid){
   this.candidate=null;this.progress=0;this.neutralSince=null;this.neutralSamples=0;this.uncertainSince??=at;
   if(at-this.uncertainSince>180){this.pending=null;this.armed=false;}
   return {index:null,pending:this.pending,armed:this.armed,progress:0};
  }
  this.uncertainSince=null;const code=pair.col===0?(pair.row===0?'neutral':'browse'):pair.row*5+pair.col-1;
  if(code==='neutral'){
   this.candidate=null;this.neutralSince??=at;this.neutralSamples++;
   const duration=this.pending===null?120:90;this.progress=Math.min(1,(at-this.neutralSince)/duration);
   if(this.progress>=1&&this.neutralSamples>=3){
    const index=this.pending;this.pending=null;this.armed=true;this.progress=0;
    return {index,pending:null,armed:true,progress:0};
   }
   return {index:null,pending:this.pending,armed:this.armed,progress:this.progress};
  }
  this.neutralSince=null;this.neutralSamples=0;
  if(code==='browse'){this.candidate=null;this.progress=0;return {index:null,pending:this.pending,armed:this.armed,progress:0};}
  if(!this.armed)return {index:null,pending:null,armed:false,progress:0};
  if(this.pending!==null)return {index:null,pending:this.pending,armed:true,progress:1};
  if(this.candidate!==code){this.candidate=code;this.since=at;this.samples=0;}
  this.samples++;this.progress=Math.min(1,(at-this.since)/this.holdMs);
  if(this.progress>=1&&this.samples>=3){this.pending=code;this.candidate=null;}
  return {index:null,pending:this.pending,armed:true,progress:this.progress};
 }
}
