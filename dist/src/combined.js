import {train as trainPose,predict as predictPose,distance,REST,UNKNOWN,EventGate,mean} from './core.js';
import {CHANNELS,COMBINED_DIM,channelIndices,hasChannels} from './features.js';
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)]||0;
const project=(v,indices)=>indices.map(i=>v[i]);
const pickSample=(s,indices)=>({...s,vector:project(s.vector,indices),spread:s.spread?project(s.spread,indices):undefined});
const range=(frames,i)=>Math.max(...frames.map(v=>v[i]))-Math.min(...frames.map(v=>v[i]));
export function resample(frames,n=24){
 if(frames.length<2)throw new Error('Record a complete movement.');
 return Array.from({length:n},(_,k)=>{const t=k*(frames.length-1)/(n-1),a=Math.floor(t),b=Math.min(frames.length-1,a+1);return frames[a].map((x,i)=>x+(frames[b][i]-x)*(t-a));});
}
function neutralSamples(profile,g){return [...g.samples.flatMap(s=>s.neutral?[s.neutral]:[]),...profile.rest];}
function inferChannels(profile,g){
 const neutral=neutralSamples(profile,g),moving=g.kind==='motion';
 const scores=CHANNELS.map(c=>{
  const samples=g.samples.filter(s=>hasChannels(s.vector,[c])&&(!moving||s.sequence?.every(v=>hasChannels(v,[c]))));
  const rest=neutral.filter(s=>hasChannels(s.vector,[c]));
  if(samples.length<3||rest.length<3)return {c,score:0};
  const center=mean(rest.map(s=>s.vector));
  const values=channelIndices(c).map(i=>{
   const noise=Math.sqrt(rest.reduce((t,s)=>t+(s.vector[i]-center[i])**2+(s.spread?.[i]||0)**2,0)/rest.length);
   const delta=moving?median(samples.map(s=>range(s.sequence,i))):median(samples.map(s=>Math.abs(s.vector[i]-center[i])));
   return delta/Math.max(i>=c.start+63?.025:.07,noise*2);
  }).sort((a,b)=>b-a);
  return {c,score:values.slice(0,3).reduce((a,b)=>a+b,0)/3};
 });
 const best=Math.max(...scores.map(s=>s.score));
 const channels=scores.filter(s=>s.score>=Math.max(1.1,best*.3)).map(s=>s.c);
 if(!channels.length)throw new Error(g.name+': no distinct signal with visible resting examples. Keep the parts you use visible during rest and recording, then try again.');
 for(const c of channels){
  const missing=g.samples.findIndex(s=>!hasChannels(s.vector,[c])||(moving&&!s.sequence?.every(v=>hasChannels(v,[c]))));
  if(missing>=0)throw new Error(g.name+': '+c.name+' lost tracking in example '+(missing+1)+'. Keep it visible for the whole recording and try again.');
 }
 return channels;
}
export function trainCombined(profile){
 if(profile.rest.length<3)throw new Error('Record your resting behavior first.');
 const gestures=profile.gestures.filter(g=>g.enabled!==false);
 if(!gestures.length||gestures.some(g=>g.samples.length<3))throw new Error('Each enabled gesture needs at least 3 separate examples.');
 const definitions=gestures.map(g=>({g,channels:inferChannels(profile,g)}));
 const sameChannels=(a,b)=>a.length===b.length&&a.every(c=>b.includes(c));
 const poseModels=new Map();
 const entries=definitions.map(({g,channels})=>{
  const indices=channels.flatMap(channelIndices),neutral=neutralSamples(profile,g).filter(s=>hasChannels(s.vector,channels));
  if(neutral.length<3)throw new Error(g.name+': record rest with all contributing parts visible.');
  const entry={id:g.id,label:g.name,channels,kind:g.kind||'pose',examples:g.samples.length};
  if(entry.kind==='motion')return {...entry,...trainMotion(g,channels,neutral)};
  // Learn competing hand shapes together. Independent gesture-vs-rest models
  // can select only the shared extended fingers and confuse two with five.
  const key=channels.map(c=>c.mask).join(',');
  if(!poseModels.has(key)){
   const peers=definitions.filter(d=>d.g.kind!=='motion'&&sameChannels(d.channels,channels)).map(d=>d.g);
   const resting=peers.flatMap(p=>neutralSamples(profile,p)).filter(s=>hasChannels(s.vector,channels));
   poseModels.set(key,trainPose({rest:resting.map(s=>pickSample(s,indices)),gestures:peers.map(p=>({...p,samples:p.samples.map(s=>pickSample(s,indices))}))}));
  }
  const binary=poseModels.get(key);
  return {...entry,indices,binary};
 });
 return {combined:true,dim:COMBINED_DIM,entries,warnings:entries.filter(e=>e.kind==='motion').length?['Movement gestures are experimental. Test new attempts and everyday rest before relying on them.']:[]};
}
export function predictCombined(model,vector){
 if(!vector||vector.length!==COMBINED_DIM)return {id:UNKNOWN,reason:'No usable tracking',score:0};
 const available=model.entries.filter(e=>hasChannels(vector,e.channels));
 if(!available.length)return {id:UNKNOWN,reason:'Bring the parts used by a learned gesture into view',score:0};
 const poses=available.filter(e=>e.kind==='pose').map(e=>({e,result:predictPose(e.binary,project(vector,e.indices))}));
 const matches=poses.filter(p=>p.result.id===p.e.id);
 // A deliberately learned combination takes precedence over its matching
 // constituent pose. Unrelated simultaneous signals still abstain.
 const hits=matches.filter(p=>!matches.some(q=>q.e.channels.length>p.e.channels.length&&p.e.channels.every(c=>q.e.channels.includes(c))));
 if(hits.length>1)return {id:UNKNOWN,reason:'More than one signal matches — return to rest',score:0};
 if(hits.length)return {...hits[0].result,label:hits[0].e.label};
 const resting=poses.some(p=>p.result.id===REST)||available.some(e=>e.kind==='motion'&&motionNeutral(e,vector));
 return resting?{id:REST,label:'Rest',score:1}:{id:UNKNOWN,reason:'Outside learned examples',score:0};
}
function motionNeutral(e,v){
 if(!hasChannels(v,e.channels))return false;
 return e.neutrals.some(n=>Math.sqrt(e.indices.reduce((s,i,k)=>s+((v[i]-n[i])/e.scales[k])**2,0)/e.indices.length)<.3);
}
function trainMotion(g,channels,neutral){
 if(g.samples.some(s=>!s.sequence||s.sequence.length<8))throw new Error(g.name+': record complete movement examples.');
 const ranked=channels.flatMap(c=>channelIndices(c).map(i=>{
  const ranges=g.samples.map(s=>range(s.sequence,i)),r=median(ranges);
  const noise=median(neutral.map(s=>s.spread?.[i]||0));
  return {i,r,score:r/Math.max(i>=c.start+63?.025:.07,noise*3)};
 }).filter(d=>d.score>1.4).sort((a,b)=>b.score-a.score).slice(0,8));
 if(ranked.length<1)throw new Error(g.name+': too little visible motion. Make one clear swipe or movement during recording.');
 const indices=ranked.map(d=>d.i),scales=ranked.map(d=>Math.max(.04,d.r));
 const e={indices,scales,channels,neutrals:neutral.map(s=>s.vector),templates:[],duration:median(g.samples.map(s=>s.durationMs||2200))};
 e.templates=g.samples.map(s=>normalizeTrace(e,s.sequence));
 const own=e.templates.map((a,i)=>Math.min(...e.templates.filter((_,j)=>j!==i).map(b=>traceDistance(a,b))));
 e.limit=Math.min(.44,Math.max(.20,median(own)*2+.09));
 return e;
}
function trimTrace(values){
 const steps=values.slice(1).map((v,j)=>Math.sqrt(v.reduce((s,x,i)=>s+(x-values[j][i])**2,0)/v.length));
 const threshold=Math.max(.018,Math.max(...steps)*.15);
 const moving=steps.map((x,i)=>x>threshold?i:-1).filter(i=>i>=0);
 if(!moving.length)return values;
 return values.slice(Math.max(0,moving[0]-1),Math.min(values.length,moving.at(-1)+3));
}
function normalizeTrace(e,frames){
 const values=trimTrace(frames.map(v=>e.indices.map((i,k)=>v[i]/e.scales[k])));
 const start=values[0];return resample(values.map(v=>v.map((x,i)=>x-start[i])),20);
}
export function traceDistance(a,b){
 const n=a.length,m=b.length;let prev=Array(m+1).fill(Infinity);prev[0]=0;
 for(let i=1;i<=n;i++){
  const row=Array(m+1).fill(Infinity);
  for(let j=Math.max(1,i-4);j<=Math.min(m,i+4);j++){
   const cost=Math.sqrt(a[i-1].reduce((s,x,k)=>s+(x-b[j-1][k])**2,0)/a[i-1].length);
   row[j]=cost+Math.min(row[j-1],prev[j],prev[j-1]);
  }prev=row;
 }return prev[m]/Math.max(n,m);
}
export function matchMotion(e,frames){
 if(frames.length<6||frames.some(v=>!hasChannels(v,e.channels))||!motionNeutral(e,frames[0]))return Infinity;
 const amplitude=Math.sqrt(e.indices.reduce((s,i,k)=>s+(range(frames,i)/e.scales[k])**2,0)/e.indices.length);
 if(amplitude<.7||amplitude>2.5)return Infinity;
 const trace=normalizeTrace(e,frames);
 return Math.min(...e.templates.map(t=>traceDistance(trace,t)));
}
export class CombinedGate extends EventGate{
 constructor(model,holdMs=450,restMs=350){super(holdMs,restMs);this.model=model;}
 reset(){super.reset();this.buffer=[];this.locked=null;this.lastVector=null;this.lastFrame=null;this.readyEntries=new Set();this.entryRest=new Map();this.motionActive=false;}
 updateFrame(vector,now){
  if(!vector||vector.length!==COMBINED_DIM){this.reset();return {result:{id:UNKNOWN,reason:'No usable tracking',score:0},event:null};}
  if(this.lastFrame!==null&&now-this.lastFrame>700)this.reset();
  this.lastFrame=now;this.lastTime=now;
  let result=predictCombined(this.model,vector),event=null;
  for(const e of this.model.entries){
   if(!hasChannels(vector,e.channels)){this.readyEntries.delete(e.id);this.entryRest.delete(e.id);continue;}
   const neutral=e.kind==='motion'?motionNeutral(e,vector):predictPose(e.binary,project(vector,e.indices)).id===REST;
   if(neutral){
    if(!this.entryRest.has(e.id))this.entryRest.set(e.id,now);
    if(now-this.entryRest.get(e.id)>=this.restMs)this.readyEntries.add(e.id);
   }else this.entryRest.delete(e.id);
  }
  this.motionActive=this.model.entries.some(e=>e.kind==='motion'&&this.readyEntries.has(e.id)&&hasChannels(vector,e.channels)&&!motionNeutral(e,vector));
  if(result.id!==REST&&result.id!==UNKNOWN&&!this.readyEntries.has(result.id))result={id:UNKNOWN,reason:'Return this signal to its learned starting pose',score:0};

  if(this.locked){
   const e=this.locked;
   const neutral=hasChannels(vector,e.channels)&&(e.kind==='motion'?motionNeutral(e,vector):predictPose(e.binary,project(vector,e.indices)).id===REST);
   if(!neutral){this.restSince=null;this.buffer=[];return {result:{id:UNKNOWN,reason:'Return the last gesture to rest',score:0},event:null};}
   super.update(REST,now);
   if(this.armed)this.locked=null;
   else return {result:{id:REST,label:'Rest',score:1},event:null};
  }
  if(!this.armed){super.update(result.id,now);this.buffer=[];return {result,event:null};}
  this.buffer.push({vector,now});this.buffer=this.buffer.filter(f=>now-f.now<=3000);
  const candidates=[];
  for(const e of this.model.entries.filter(e=>e.kind==='motion')){
   if(!hasChannels(vector,e.channels)||!this.readyEntries.has(e.id))continue;
   let best=Infinity;
   for(const duration of [400,650,950,1400,2000,2800]){
    const window=this.buffer.filter(f=>now-f.now<=duration);
    if(window.length<6||window.at(-1).now-window[0].now<300)continue;
    // No completed swipe until its endpoint is briefly steady.
    const ending=window.filter(f=>now-f.now<=250),tail=ending.map(f=>f.vector);
    if(ending.length<3||now-ending[0].now<150||e.indices.some((i,k)=>range(tail,i)/e.scales[k]>.08))continue;
    best=Math.min(best,matchMotion(e,window.map(f=>f.vector)));
   }
   if(best<e.limit)candidates.push({e,best,ratio:best/e.limit});
  }
  candidates.sort((a,b)=>a.ratio-b.ratio);
  if(candidates.length&&this.armed){
   const first=candidates[0];
   if((candidates[1]&&candidates[1].ratio-first.ratio<.2)||(result.id!==REST&&result.id!==UNKNOWN)){
    result={id:UNKNOWN,reason:'Gesture choices overlap — return to rest',score:0};
   }else{
    event=first.e.id;result={id:event,label:first.e.label,reason:'Completed learned movement',score:1-first.ratio};
    this.locked=first.e;super.reset();this.buffer=[];this.readyEntries.clear();this.entryRest.clear();this.motionActive=false;return {result,event};
   }
  }
  if(this.motionActive)result={id:UNKNOWN,reason:'Movement in progress — pause at its endpoint',score:0};
  event=super.update(result.id,now);
  if(event){this.locked=this.model.entries.find(e=>e.id===event);this.buffer=[];this.readyEntries.clear();this.entryRest.clear();}
  return {result,event};
 }
}
export function combinedDiagnostics(model){
 return model.entries.map(e=>{
  if(e.kind==='motion')return {id:e.id,label:e.label,examples:e.examples,nearest:'Motion templates',ratio:0,status:'motion',channels:e.channels.map(c=>c.name),kind:e.kind};
  const a=e.binary.classes.find(c=>c.id===e.id),b=e.binary.classes.find(c=>c.id===REST);
  const gap=Math.min(...a.vectors.flatMap(x=>b.vectors.map(y=>distance(e.binary,x,y)))),ratio=gap/(a.radius+b.radius);
  return {id:e.id,label:e.label,examples:e.examples,nearest:'Rest',ratio,status:ratio<1?'overlap':ratio<1.5?'close':'separated',channels:e.channels.map(c=>c.name),kind:e.kind};
 });
}
export function combinedMatches(model,vector){
 return model.entries.filter(e=>e.kind==='pose'&&hasChannels(vector,e.channels)).map(e=>{
  const c=e.binary.classes.find(c=>c.id===e.id);return {id:e.id,label:e.label,distance:Math.min(...c.vectors.map(v=>distance(e.binary,v,project(vector,e.indices)))),limit:c.radius};
 }).sort((a,b)=>a.distance-b.distance).slice(0,5);
}

export function requiredTracking(model,vector,selectOnly=false,profile=null){
 if(!vector)return false;
 if(!model?.combined)return true;
 const ids=selectOnly?profile?.gestures.filter(g=>g.enabled!==false&&g.action==='select').map(g=>g.id):null;
 const entries=model.entries.filter(e=>!ids||ids.includes(e.id));
 return entries.length>0&&entries.every(e=>hasChannels(vector,e.channels));
}
