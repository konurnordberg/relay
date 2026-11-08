import {train} from './core.js';
import {trainCombined} from './combined.js';
// Incomplete drafts remain saved; only usable gestures enter the active model.
export function buildPersonalModel(profile){
 const excluded=[];if(!profile)return {model:null,error:'No profile selected.',excluded,readyIds:[]};
 const enabled=profile.gestures.filter(g=>g.enabled!==false),usable=[];
 if(profile.rest.length<3)return {model:null,error:'Your gestures are saved. Record at least 3 resting examples to activate them.',excluded,readyIds:[]};
 for(const g of enabled){
  if(g.samples.length<3){excluded.push({id:g.id,name:g.name,reason:`${g.samples.length} of 3 required recordings`});continue;}
  try{(profile.modality==='combined'?trainCombined:train)({...profile,gestures:[g]});usable.push(g);}catch(e){excluded.push({id:g.id,name:g.name,reason:e.message});}
 }
 if(!usable.length)return {model:null,error:excluded.length?excluded.map(g=>g.name+': '+g.reason).join(' · '):'No enabled gestures. Enable a saved gesture or teach one.',excluded,readyIds:[]};
 try{const model=(profile.modality==='combined'?trainCombined:train)({...profile,gestures:usable});return {model,error:'',excluded,readyIds:usable.map(g=>g.id)};}catch(e){return {model:null,error:e.message,excluded,readyIds:[]};}
}
export function chooseProfile(profiles,storage=globalThis.localStorage){
 let id;try{id=storage.getItem('relay.active-profile.v1');}catch{}
 return profiles.find(p=>p.id===id)||[...profiles].sort((a,b)=>score(b)-score(a))[0]||null;
}
function score(p){return p.gestures.filter(g=>g.enabled!==false&&g.samples.length>=3).length*1000+p.rest.length;}
export function rememberProfile(profile,storage=globalThis.localStorage){try{if(profile)storage.setItem('relay.active-profile.v1',profile.id);}catch{}}
