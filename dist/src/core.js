// Pure recognition and communication logic. No camera, network, or DOM.
export const REST = '__rest__';
export const UNKNOWN = '__unknown__';
export const FEATURE_VERSION = 1;
export const mean = rows => rows[0]?.map((_,i)=>rows.reduce((s,r)=>s+r[i],0)/rows.length)||[];
const quantile = (a,p) => [...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))]||0;
export const finiteVector = v => Array.isArray(v)&&v.length>0&&v.every(Number.isFinite);
export function summarize(frames){
 if(!frames.length||frames.some(v=>!finiteVector(v)||v.length!==frames[0].length))throw new Error('Incomplete recording');
 const vector=mean(frames), spread=vector.map((m,i)=>Math.sqrt(frames.reduce((s,r)=>s+(r[i]-m)**2,0)/frames.length));
 return {vector,spread,frames:frames.length,recordedAt:new Date().toISOString()};
}
export function train(profile){
 const groups=[{id:REST,label:'Rest',samples:profile.rest},...profile.gestures.filter(g=>g.enabled!==false).map(g=>({id:g.id,label:g.name,samples:g.samples}))];
 if(groups[0].samples.length<3)throw new Error('Record your resting behavior first.');
 if(groups.length<2||groups.slice(1).some(g=>g.samples.length<3))throw new Error('Each enabled gesture needs at least 3 separate examples.');
 const dim=groups[0].samples[0].vector.length;
 if(groups.some(g=>g.samples.some(s=>!finiteVector(s.vector)||s.vector.length!==dim)))throw new Error('Incompatible samples. Recalibrate this profile.');
 const centers=groups.map(g=>mean(g.samples.map(s=>s.vector))), grand=mean(centers);
 const within=grand.map((_,i)=>groups.reduce((sum,g,k)=>sum+g.samples.reduce((s,x)=>s+(x.vector[i]-centers[k][i])**2+(x.spread?.[i]||0)**2,0)/g.samples.length,0)/groups.length);
 const between=grand.map((m,i)=>centers.reduce((s,c)=>s+(c[i]-m)**2,0)/centers.length);
 const ranked=between.map((b,i)=>({i,w:b/(b+within[i]+0.0036)})).sort((a,b)=>b.w-a.w);
 const selected=ranked.filter(x=>x.w>0.12).slice(0,20);
 if(!selected.length)throw new Error('These movements look too similar to rest. Try a more distinct movement or record again.');
 const weights=Array(dim).fill(0), scales=between.map((b,i)=>Math.max(0.06,Math.sqrt(b+within[i])));
 selected.forEach(x=>weights[x.i]=x.w);
 const model={version:FEATURE_VERSION,dim,weights,scales,classes:[],warnings:[]};
 const dist=(a,b)=>distance(model,a,b);
 for(let k=0;k<groups.length;k++){
  const g=groups[k], vectors=g.samples.map(s=>s.vector);
  const own=vectors.map((v,j)=>Math.min(...vectors.filter((_,n)=>n!==j).map(other=>dist(v,other))));
  const nearestOther=Math.min(...centers.filter((_,n)=>n!==k).map(c=>dist(centers[k],c)));
  const radius=Math.max(0.1,Math.min(Math.max(0.28,quantile(own,0.9)*2.5+0.12),nearestOther*0.60));
  model.classes.push({id:g.id,label:g.label,vectors,center:centers[k],radius});
  if(nearestOther<0.4)model.warnings.push(g.label+' overlaps another signal. Check it on new attempts.');
 }
 return model;
}
export function distance(model,a,b){
 let sum=0,weight=0;
 for(let i=0;i<model.dim;i++){sum+=model.weights[i]*((a[i]-b[i])/model.scales[i])**2;weight+=model.weights[i];}
 return Math.sqrt(sum/Math.max(weight,1e-9));
}
export function predict(model,vector){
 if(!model||!finiteVector(vector)||vector.length!==model.dim)return {id:UNKNOWN,reason:'No usable tracking',score:0};
 const ranked=model.classes.map(c=>({id:c.id,label:c.label,radius:c.radius,d:Math.min(...c.vectors.map(v=>distance(model,v,vector)))})).sort((a,b)=>a.d-b.d);
 const [a,b]=ranked, margin=b ? (b.d-a.d)/Math.max(b.d,0.01):1;
 const score=Math.max(0,Math.min(1,1-a.d/(a.radius*1.4)));
 if(a.d>a.radius)return {id:UNKNOWN,reason:'Outside learned examples',score,candidate:a.id,distance:a.d};
 if(margin<0.22)return {id:UNKNOWN,reason:'Signals look too similar',score,candidate:a.id,distance:a.d};
 return {id:a.id,label:a.label,score,margin,distance:a.d};
}
export class EventGate{
 constructor(holdMs=450,restMs=350){this.holdMs=holdMs;this.restMs=restMs;this.reset();}
 reset(){this.armed=false;this.candidate=null;this.since=0;this.restSince=null;this.progress=0;this.lastTime=null;}
 update(id,now){
  if(this.lastTime!==null&&now-this.lastTime>700)this.reset();
  this.lastTime=now;
  if(id===REST){this.candidate=null;this.progress=0;if(this.restSince===null)this.restSince=now;if(now-this.restSince>=this.restMs)this.armed=true;return null;}
  this.restSince=null;
  if(id===UNKNOWN||!id){this.candidate=null;this.progress=0;return null;}
  if(!this.armed){this.progress=0;return null;}
  if(this.candidate!==id){this.candidate=id;this.since=now;}
  this.progress=Math.min(1,(now-this.since)/this.holdMs);
  if(this.progress>=1){this.armed=false;this.candidate=null;this.progress=0;return id;}
  return null;
 }
}
const alphabet=['abcdef','ghijkl','mnopqr','stuvwx','yz'];
export function keyboardRows(page='letters',caps=false){
 const keys = page==='numbers' ? ['123456','7890+-','*/=()','[]{}<>','@#$%&','_:;"/\\'] : alphabet;
 const rows=keys.map(row=>Array.from(caps&&page==='letters'?row.toUpperCase():row).map(s=>({label:s,value:s,type:'text'})));
 rows.push([{label:'Space',value:' ',type:'text'},...[',','.','?','!',"'"].map(s=>({label:s,value:s,type:'text'}))]);
 rows.push([{label:'Delete',type:'delete'},{label:'Undo',type:'undo'},{label:caps?'abc':'ABC',type:'caps'},{label:page==='letters'?'123 +':'A–Z',type:'page'}]);
 rows.push([{label:'Speak',type:'speak'},{label:'Pause',type:'pause'},{label:'New line',value:'\n',type:'text'},{label:'Clear',type:'clear'}]);
 return rows;
}
export class Composer{
 constructor(){this.text='';this.history=[];this.row=0;this.col=0;this.level='row';this.page='letters';this.caps=false;this.paused=false;this.confirm=null;}
 get rows(){if(this.paused)return [[{label:'Resume',type:'resume'}]];if(this.confirm)return [[{label:'Cancel',type:'cancel'},{label:this.confirm==='clear'?'Clear message':'Speak now',type:'confirm'}]];return keyboardRows(this.page,this.caps);}
 resetFocus(){this.row=0;this.col=0;this.level='row';}
 next(){if(this.level==='row')this.row=(this.row+1)%this.rows.length;else this.col=(this.col+1)%(this.rows[this.row].length+1);}
 select(){
  if(this.level==='row'){this.level='key';this.col=0;return null;}
  const key=this.rows[this.row]?.[this.col];
  if(!key){this.resetFocus();return null;}
  return this.apply(key);
 }
 change(text){this.history.push(this.text);if(this.history.length>200)this.history.shift();this.text=text;}
 apply(key){
  let effect=null;
  if(key.type==='text')this.change(this.text+key.value);
  if(key.type==='delete')this.change(Array.from(this.text).slice(0,-1).join(''));
  if(key.type==='undo'&&this.history.length)this.text=this.history.pop();
  if(key.type==='caps')this.caps=!this.caps;
  if(key.type==='page')this.page=this.page==='letters'?'numbers':'letters';
  if(key.type==='pause'){this.paused=true;effect='pause';}
  if(key.type==='resume'){this.paused=false;effect='resume';}
  if(key.type==='speak'&&this.text.trim())this.confirm='speak';
  if(key.type==='clear'&&this.text)this.confirm='clear';
  if(key.type==='cancel')this.confirm=null;
  if(key.type==='confirm'){if(this.confirm==='clear')this.change('');if(this.confirm==='speak')effect='speak';this.confirm=null;}
  this.resetFocus();return effect;
 }
 direct(action,value){
  if(this.confirm||this.paused)return null;
  if(action==='next'){this.next();return null;}
  if(action==='select')return this.select();
  if(action==='insert')return this.apply({type:'text',value:value||''});
  return this.apply({type:action});
 }
}
export function trialSummary(trials){
 const completed=trials.filter(t=>t.kind==='attempt');
 return {total:completed.length,correct:completed.filter(t=>t.passed).length,accuracy:completed.length?completed.filter(t=>t.passed).length/completed.length:null};
}
