export const FLOW_KEYS=Array.from('qwertyuiopasdfghjklzxcvbnm',c=>c);
export const FLOW_LAYOUT=Object.fromEntries(['qwertyuiop','asdfghjkl','zxcvbnm'].flatMap((row,r)=>Array.from(row,(c,i)=>[c,{x:.05+(i+[0,.5,1.5][r])*.1,y:[.32,.53,.74][r]}])));
const dist=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*.55);
const square=(a,b)=>(a.x-b.x)**2+((a.y-b.y)*.55)**2;
export function wordPath(word){return Array.from(word.toLowerCase().replace(/[^a-z]/g,'')).filter((c,i,a)=>i===0||a[i-1]!==c).map(c=>FLOW_LAYOUT[c]);}
export function nearestKey(p){return Object.entries(FLOW_LAYOUT).sort((a,b)=>square(a[1],p)-square(b[1],p))[0]?.[0];}
export function resamplePath(path,n=32){
 if(!path.length)return [];if(path.length===1)return Array.from({length:n},()=>({...path[0]}));
 const lengths=[0];for(let i=1;i<path.length;i++)lengths.push(lengths.at(-1)+dist(path[i-1],path[i]));
 const total=lengths.at(-1);if(total<.0001)return Array.from({length:n},()=>({...path[0]}));
 let j=1;return Array.from({length:n},(_,i)=>{const d=i*total/(n-1);while(j<lengths.length-1&&lengths[j]<d)j++;const t=(d-lengths[j-1])/(lengths[j]-lengths[j-1]||1);return {x:path[j-1].x+(path[j].x-path[j-1].x)*t,y:path[j-1].y+(path[j].y-path[j-1].y)*t};});
}
const pathLength=p=>p.slice(1).reduce((n,q,i)=>n+dist(q,p[i]),0);
function dtw(a,b){
 const n=a.length,m=b.length,prev=new Float64Array(m+1).fill(Infinity),row=new Float64Array(m+1);prev[0]=0;
 for(let i=1;i<=n;i++){row.fill(Infinity);for(let j=Math.max(1,i-7);j<=Math.min(m,i+7);j++)row[j]=square(a[i-1],b[j-1])+Math.min(prev[j-1],prev[j]+.0004,row[j-1]+.0004);prev.set(row);}
 return prev[m]/n;
}
export class FlowDecoder{
 constructor(entries=[]){this.setWords(entries);}
 setWords(entries){this.entries=entries.map(([word,frequency],rank)=>{const p=wordPath(word);if(!p.length)return null;return {word,frequency,rank,raw:p,path:resamplePath(p),sparse:resamplePath(resamplePath(p,12)),start:p[0],end:p.at(-1),length:pathLength(p)};}).filter(Boolean);}
 decode(points,personal=[]){
  if(!points.length||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return {candidates:[],quality:'empty'};
  const path=resamplePath(points),len=pathLength(path);
  if(len<.045){const word=nearestKey(path[0]);return {candidates:[{word,score:0}],quality:'tap',literal:true};}
  const extras=personal.filter(w=>typeof w==='string'&&/^[a-z]+(?:'[a-z]+)?$/i.test(w)).map((w,i)=>{const word=w.toLowerCase(),p=wordPath(word);return {word,rank:i+30,raw:p,path:resamplePath(p),sparse:resamplePath(resamplePath(p,12)),start:p[0],end:p.at(-1),length:pathLength(p),personal:true};});
  const candidates=[],sparse=points.length<22;
  for(const entry of [...extras,...this.entries]){
   const endpoints=square(path[0],entry.start)+square(path.at(-1),entry.end);
   if(endpoints>.13||entry.length<.03)continue;
   let error=0,low=0;for(let i=0;i<32;i++){error+=square(path[i],entry.path[i]);if(sparse)low+=square(path[i],entry.sparse[i]);}error=(sparse?Math.min(error,low):error)/32;
   const lengthPenalty=Math.abs(Math.log((len+.05)/(entry.length+.05)))*(sparse?.0015:.004);
   candidates.push({...entry,coarse:error*.75+endpoints*.25+lengthPenalty, lengthPenalty,endpoints});
  }
  candidates.sort((a,b)=>a.coarse-b.coarse);
  // Fast camera strokes cut corners between observations. Match a template
  // observed at the same sparse resolution as well as its full trajectory.
  const ranked=candidates.slice(0,sparse?144:96).map(e=>{
   let shape=dtw(path,e.path);
   if(sparse)shape=Math.min(shape,dtw(path,resamplePath(resamplePath(e.raw,Math.max(6,points.length))))+.00008);
   const geometry=shape*.7+e.endpoints*.3;
   return {word:e.word,geometry,score:geometry+e.lengthPenalty+Math.log1p(e.rank)*.00015-(e.personal?.00015:0)};
  }).sort((a,b)=>a.score-b.score);
  const seen=new Set(),top=ranked.filter(c=>{if(seen.has(c.word))return false;seen.add(c.word);return true;}).slice(0,3);
  return {candidates:top,quality:top[0]?.geometry<.023?'matched':'uncertain'};
 }
}