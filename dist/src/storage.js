import {STARTER_PHRASES} from './communication.js';
import {FEATURE_VERSION,finiteVector} from './core.js';
const KEY='relay.profiles.v1';
const modalities=new Set(['face','hand']);
export function createProfile(name,modality='face'){
 return {version:1,featureVersion:FEATURE_VERSION,id:crypto.randomUUID(),name:name.trim()||'My voice',modality,createdAt:new Date().toISOString(),rest:[],gestures:[],trials:[],phrases:[...STARTER_PHRASES],words:[],settings:{holdMs:450,restMs:350,scanMs:1400,mode:'step',audio:false}};
}
export function validateProfile(p){
 if(!p||p.version!==1||p.featureVersion!==FEATURE_VERSION||!modalities.has(p.modality)||(typeof p.id!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(p.id))||typeof p.name!=='string'||p.name.length>80)throw new Error('This is not a compatible Relay profile.');
 if(!Array.isArray(p.rest)||!Array.isArray(p.gestures)||p.gestures.length>80)throw new Error('Invalid gesture data.');
 const dim=p.modality==='face'?60:63;
 const sampleOK=s=>s&&finiteVector(s.vector)&&s.vector.length===dim&&s.vector.every(x=>Math.abs(x)<100)&&(!s.spread||(finiteVector(s.spread)&&s.spread.length===dim));
 if(p.rest.length>100||!p.rest.every(sampleOK))throw new Error('Invalid resting samples.');
 const ids=new Set();
 for(const g of p.gestures){
  if((typeof g.id!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(g.id))||g.id.startsWith('__')||ids.has(g.id)||typeof g.name!=='string'||g.name.length>80||!Array.isArray(g.samples)||g.samples.length>40||!g.samples.every(sampleOK))throw new Error('Invalid gesture examples.');
  ids.add(g.id);
  if(!['next','select','delete','undo','speak','pause','insert'].includes(g.action)||typeof g.value!=='string'||g.value.length>300)throw new Error('Invalid gesture mapping.');
 }
 if(!p.settings||!['step','auto'].includes(p.settings.mode))throw new Error('Invalid settings.');
 for(const [k,min,max] of [['holdMs',200,2000],['restMs',200,2000],['scanMs',700,5000]])if(!Number.isFinite(p.settings[k])||p.settings[k]<min||p.settings[k]>max)throw new Error('Invalid timing settings.');
 if(!Array.isArray(p.trials)||p.trials.length>2000||p.trials.some(t=>!t||typeof t.kind!=='string'||typeof t.at!=='string'||typeof t.passed!=='boolean'))throw new Error('Invalid validation records.');
 if(p.phrases!==undefined&&(!Array.isArray(p.phrases)||p.phrases.length>24||p.phrases.some(v=>typeof v!=='string'||!v.trim()||v.length>300)))throw new Error('Invalid personal phrases.');
 if(p.words!==undefined&&(!Array.isArray(p.words)||p.words.length>100||p.words.some(v=>typeof v!=='string'||v.length>50||!/^[\p{L}\p{M}'’-]+$/u.test(v))))throw new Error('Invalid personal words.');
 if(p.settings.completions!==undefined&&typeof p.settings.completions!=='boolean')throw new Error('Invalid completion setting.');
 return p;
}
export function loadProfiles(){const raw=localStorage.getItem(KEY);if(!raw)return [];const data=JSON.parse(raw);if(!Array.isArray(data))throw new Error('Saved profile collection is damaged. Export or recover your browser data.');return data.map(validateProfile);}
export function saveProfiles(profiles){profiles.forEach(validateProfile);localStorage.setItem(KEY,JSON.stringify(profiles));}
export function exportProfile(profile){validateProfile(profile);return JSON.stringify(profile,null,2);}
export function importProfile(text){if(text.length>5_000_000)throw new Error('Profile file is too large.');const p=validateProfile(JSON.parse(text));p.id=crypto.randomUUID();p.name=p.name.slice(0,65)+' (imported)';return p;}
