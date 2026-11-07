import {RelayComposer} from './communication.js';
export const RACE_SCENARIOS={
 reusable:{name:'Reusable phrases',text:"Thanks for the update. I'll take a look and get back to you. Please let me know if anything changes.",mode:'shortcuts',note:'Uses the starter shortcut codebook during the trial: 0·1, 0·3, then 1·3. This result measures text expansion, not general prose speed.'},
 words:{name:'Word-by-word writing',text:'we can meet tomorrow and talk about the project',mode:'words',note:'Compose from the word palette or spelling mode. The same target is used for both methods.'}
};
export class ChordRace{
 constructor(){this.scenario='reusable';this.results={};this.active=false;this.status='Practice first, then compare the same text.';this.composer=new RelayComposer();this.method=null;this.started=0;this.corrections=0;this.actions=0;this.previous='';}
 get target(){return RACE_SCENARIOS[this.scenario].text;}
 select(id){if(this.active||!RACE_SCENARIOS[id])return false;this.scenario=id;this.status='Practice first, then compare the same text.';this.composer=new RelayComposer();return true;}
 start(method,now){
  if(!['keyboard','camera'].includes(method)||!Number.isFinite(now))return false;
  this.active=true;this.method=method;this.started=now;this.composer=new RelayComposer();this.corrections=0;this.actions=0;this.previous='';this.status='Timer running. Finish the target exactly; corrections count toward your time.';return true;
 }
 update(text,now,{action=false}={}){
  if(!this.active)return false;
  let prefix=0,suffix=0;while(prefix<Math.min(text.length,this.previous.length)&&text[prefix]===this.previous[prefix])prefix++;
  while(suffix<Math.min(text.length,this.previous.length)-prefix&&text[text.length-1-suffix]===this.previous[this.previous.length-1-suffix])suffix++;
  this.corrections+=this.previous.length-prefix-suffix;
  this.previous=text;this.composer.text=text;if(action)this.actions++;
  if(text.trimEnd()!==this.target)return false;
  const elapsedMs=now-this.started;if(!Number.isFinite(elapsedMs)||elapsedMs<=0)return false;
  const result={method:this.method,scenario:this.scenario,elapsedMs,wpm:(Array.from(this.target).length/5)/(elapsedMs/60000),characters:Array.from(this.target).length,corrections:this.corrections,actions:this.actions,at:new Date().toISOString()};
  (this.results[this.scenario]??={})[this.method]=result;this.active=false;this.status='Completed with the target matched exactly. Timing includes corrections.';return true;
 }
 cancel(reason='Trial cancelled; no result recorded.'){if(this.active){this.active=false;this.status=reason;}}
 get completed(){return this.results[this.scenario]||{};}
}
