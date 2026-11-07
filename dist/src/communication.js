import {Composer} from './core.js';

// A small, transparent local vocabulary. Personal words take priority; suggestions
// are options, never automatic substitutions or inferred sentences.
const COMMON = ('hello help thank thanks please yes no want need would could can cannot have has had '+
'i you we they me my your our their this that these those am is are was were be been '+
'to from with without for and or but because if when where what who why how '+
'good morning afternoon evening night today tomorrow yesterday now later soon '+
'water food coffee tea breakfast lunch dinner hungry thirsty tired comfortable uncomfortable '+
'home work school hospital doctor nurse friend friends family mother father sister brother '+
'feel feeling better worse happy sad worried excited ready not stop wait again more less '+
'give take get go come stay leave sit stand move turn open close change try look see hear listen '+
'say speak talk write read think know understand remember forget like love enjoy prefer '+
'something anything everything nothing someone anyone everyone here there inside outside '+
'left right up down small big hot cold quiet loud music television book phone computer '+
'message conversation communication voice words language time minute minutes moment together '+
'question answer explain repeat slowly faster slower fine okay really very much little '+
'one two three four five first second next last start finish pause continue done '+
'important different same new old possible impossible interesting beautiful awesome '+
'meet meeting appointment visit call text email name number address birthday '+
'understood agree disagree believe choose choice decide decision thankyou welcome sorry '+
'about after before during also just only still always never sometimes often usually '+
'able access accessible personal movement gesture signal learn learning practice test '+
'world matters matters people person everyone myself yourself independence independent '+
'project idea build technology camera working dinner ready bring find use using love hope '+
'readjust position pillow blanket light lights window door bathroom glasses pain warm cool').split(/\s+/);
export const STARTER_PHRASES = ['Yes.', 'No.', 'Please give me a moment.', 'I would like to say something.', 'Thank you.'];
export function wordPrefix(text){return text.match(/[\p{L}\p{M}'’-]+$/u)?.[0]||'';}
export function wordCandidates(text,personal=[],limit=3){
 const prefix=wordPrefix(text),q=prefix.toLocaleLowerCase();
 if(!q||q.length<2)return [];
 const seen=new Set(),result=[];
 for(const word of [...personal,...COMMON]){
  if(typeof word!=='string')continue;
  const lower=word.toLocaleLowerCase();
  if(!lower.startsWith(q)||lower===q||seen.has(lower)||word.length>50)continue;
  seen.add(lower);
  let display=word;
  if(prefix===prefix.toLocaleUpperCase())display=word.toLocaleUpperCase();
  else if(prefix[0]===prefix[0].toLocaleUpperCase())display=word[0].toLocaleUpperCase()+word.slice(1);
  result.push(display);if(result.length===limit)break;
 }
 return result;
}
export class RelayComposer extends Composer{
 constructor(profile=null){super();this.phrasePage=false;this.lastCompletionSaved=0;this.configure(profile);}
 configure(profile){
  this.phrases=profile?.phrases||[...STARTER_PHRASES];
  this.personalWords=[...(profile?.words||[]),...this.phrases.flatMap(p=>p.match(/[\p{L}\p{M}'’-]+/gu)||[])];
  this.completions=profile?.settings?.completions!==false;
 }
 get rows(){
  if(this.paused||this.confirm)return super.rows;
  if(this.phrasePage){
   const rows=[];for(let i=0;i<this.phrases.length;i+=3)rows.push(this.phrases.slice(i,i+3).map(value=>({label:value,value,type:'phrase'})));
   if(!rows.length)rows.push([{label:'Add phrases in My vocabulary',type:'noop'}]);
   rows.push([{label:'Letters',type:'phrases'},{label:'Delete',type:'delete'},{label:'Undo',type:'undo'}]);
   rows.push([{label:'Speak',type:'speak'},{label:'Pause',type:'pause'},{label:'Clear',type:'clear'}]);
   return rows;
  }
  const rows=super.rows;
  rows[rows.length-2].push({label:'My phrases',type:'phrases'},{label:'Focus view',type:'focus'});
  rows[rows.length-1].push({label:'Save phrase',type:'bookmark'});
  if(this.completions&&this.page==='letters'){
   const candidates=wordCandidates(this.text,this.personalWords);
   if(candidates.length)rows.splice(rows.length-2,0,candidates.map(value=>({label:value+' ↗',value,prefix:wordPrefix(this.text),type:'complete'})));
  }
  return rows;
 }
 apply(key){
  if(!key)return null;
  this.lastCompletionSaved=0;
  if(key.type==='noop')return null;
  if(key.type==='focus')return 'focus';
  if(key.type==='bookmark')return 'bookmark';
  if(key.type==='phrases'){this.phrasePage=!this.phrasePage;this.resetFocus();return null;}
  if(key.type==='phrase'){
   const gap=this.text&&!/\s$/.test(this.text)?' ':'';
   this.change(this.text+gap+key.value);this.resetFocus();return null;
  }
  if(key.type==='complete'){
   const prefix=wordPrefix(this.text);
   if(!prefix||prefix!==key.prefix||!key.value.toLocaleLowerCase().startsWith(prefix.toLocaleLowerCase()))return null;
   this.lastCompletionSaved=Array.from(key.value).length-Array.from(prefix).length;
   this.change(this.text.slice(0,-prefix.length)+key.value+' ');this.resetFocus();return null;
  }
  return super.apply(key);
 }
}
