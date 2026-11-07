const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:(a.z||0)-(b.z||0)});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const length=v=>Math.hypot(v.x,v.y,v.z);
const dist=(a,b)=>length(sub(a,b));
const finite=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
const angle=(a,b,c)=>{const u=sub(a,b),v=sub(c,b);return Math.acos(Math.max(-1,Math.min(1,dot(u,v)/(length(u)*length(v)||1))))*180/Math.PI;};
const ramp=(x,a,b)=>Math.max(0,Math.min(1,(x-a)/(b-a)));
const blend=(a,b)=>a*.55+b*.45;
function shapeEvidence(p){
 const width=dist(p[5],p[17]),values=[];
 for(const [mcp,pip,dip,tip] of [[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]]){
  const reach=dist(p[tip],p[0])/(dist(p[pip],p[0])||1);
  const straight=dist(p[mcp],p[tip])/(dist(p[mcp],p[pip])+dist(p[pip],p[dip])+dist(p[dip],p[tip])||1);
  // Tip reach and whole-finger extension outweigh any single noisy joint.
  values.push(.45*ramp(reach,.98,1.18)+.30*ramp(straight,.65,.94)+.15*ramp(angle(p[mcp],p[pip],p[dip]),105,165)+.10*ramp(angle(p[pip],p[dip],p[tip]),105,165));
 }
 const lateral=dot(sub(p[4],p[5]),sub(p[5],p[17]))/(width*width||1);
 const thumb=.65*ramp(lateral,.10,.48)+.20*ramp(dist(p[4],p[5])/width,.40,.95)+.15*ramp(angle(p[2],p[3],p[4]),100,155);
 return [thumb,...values];
}
// Fuse projected and metric 3D geometry. MediaPipe depth can be noisy; neither
// representation gets a veto because a single PIP/DIP angle dipped below a cutoff.
export function fingerEvidence(image,world=null,aspect=4/3){
 if(image?.length!==21||image.some(p=>!finite(p)||p.x<-.03||p.x>1.03||p.y<-.03||p.y>1.03))return null;
 const projected=image.map(p=>({x:p.x,y:p.y/aspect,z:0}));
 const width=dist(projected[5],projected[17]),palm=dist(projected[9],projected[0]);
 const area=Math.abs((projected[5].x-projected[17].x)*(projected[9].y-projected[0].y)-(projected[5].y-projected[17].y)*(projected[9].x-projected[0].x));
 if(width<.025||palm<.025||area/(width*palm)<.18)return null;
 const flat=shapeEvidence(projected);
 const metric=shapeEvidence(world?.length===21&&world.every(finite)?world:image.map(p=>({x:p.x,y:p.y/aspect,z:p.z})));
 const fingers=metric.map((v,i)=>blend(v,flat[i]));
 let probabilities=[1];
 for(const value of fingers){
  // Evidence is a geometric score, not a calibrated neural probability.
  const p=.02+.96*ramp(value,.28,.72),next=Array(probabilities.length+1).fill(0);
  probabilities.forEach((v,i)=>{next[i]+=v*(1-p);next[i+1]+=v*p;});probabilities=next;
 }
 const ranked=probabilities.map((score,count)=>({score,count})).sort((a,b)=>b.score-a.score);
 const count=ranked[0].score>=.48&&ranked[0].score-ranked[1].score>=.16?ranked[0].count:null;
 return {count,fingers,probabilities,strength:ranked[0].score};
}
export function countFingers(image,world=null,aspect=4/3){return fingerEvidence(image,world,aspect)?.count??null;}
export function fingerPair(frame,swap=false){
 const hands=frame.hands||[];
 if(hands.length!==2)return {row:null,col:null,missing:true,reason:'Show both hands, palms toward the camera.'};
 if(hands.some(p=>!Array.isArray(p)||p.length!==21||!finite(p[0])))return {row:null,col:null,missing:false,reason:'Hand tracking is uncertain. Keep your whole hands visible.'};
 const order=hands.map((p,i)=>({p,i})).sort((a,b)=>b.p[0].x-a.p[0].x);
 if(Math.abs(order[0].p[0].x-order[1].p[0].x)<.16)return {row:null,col:null,missing:false,reason:'Separate your hands: one on each side of the preview.'};
 if(swap)order.reverse();
 const evidence=order.map(({p,i})=>fingerEvidence(p,frame.handWorld?.[i],frame.handAspect));
 const counts=evidence.map(e=>e?.count??null);
 return {row:counts[0],col:counts[1],evidence,missing:false,reason:counts.includes(null)?'Keep your palms visible. Let raised fingers extend comfortably.':''};
}
// A brief count wobble pauses selection; it cannot commit the previous cell.
// Require two fresh observations of a new count. Never reuse stale hand frames.
export class FingerPairTracker{
 constructor(){this.reset();}
 reset(){this.at=null;this.slots=[{},{}];this.last=null;}
 update(frame,swap=false){
  const at=frame.handFrameAt,now=frame.now??at;
  if(!Number.isFinite(at)||now-at>200){this.reset();return {row:null,col:null,missing:true,reason:'Waiting for fresh hand tracking.'};}
  if(at===this.at)return this.last;
  if(this.at!==null&&at-this.at>250)this.reset();
  this.at=at;const pair=fingerPair(frame,swap);
  if(pair.missing||!pair.evidence){this.slots=[{},{}];return this.last=pair;}
  let settling=false;
  for(const [i,key] of ['row','col'].entries()){
   const slot=this.slots[i],count=pair[key];
   if(count===null){settling=true;slot.pending=null;continue;}
   if(count===slot.value){slot.pending=null;continue;}
   if(count!==slot.pending){slot.pending=count;slot.since=at;slot.frames=1;}
   else slot.frames++;
   if(slot.frames>=2&&at-slot.since>=45){slot.value=count;slot.pending=null;}
   else settling=true;
  }
  return this.last={...pair,settling,reason:settling?'Checking the count…':pair.reason};
 }
}
export class FingerIndexGate{
 constructor(holdMs=850){this.holdMs=holdMs;this.reset();}
 reset(){this.lastAt=null;this.candidate=null;this.since=0;this.samples=0;this.locked=null;this.releaseSince=null;this.releaseKey=null;this.progress=0;this.uncertainSince=null;}
 update(pair,at,now=at){
  const result={index:null,progress:this.progress,locked:this.locked!==null};
  if(!Number.isFinite(at)||now-at>200){this.candidate=null;this.progress=0;this.releaseSince=null;return {...result,progress:0};}
  if(this.lastAt!==null&&at<=this.lastAt)return result;
  const delta=this.lastAt===null?0:at-this.lastAt;
  if(delta>200){this.candidate=null;this.releaseSince=null;this.progress=0;}
  this.lastAt=at;
  const valid=!pair.settling&&Number.isInteger(pair.row)&&Number.isInteger(pair.col)&&pair.row>=0&&pair.row<6&&pair.col>=0&&pair.col<6;
  const key=valid?pair.row*6+pair.col:null;
  if(this.locked!==null){
   const release=pair.missing?'missing':valid&&key!==this.locked?key:null;
   if(release!==null){
    if(this.releaseKey!==release||this.releaseSince===null){this.releaseKey=release;this.releaseSince=at;}
    if(at-this.releaseSince>=300){this.locked=null;this.candidate=null;this.releaseSince=null;}
   }else{this.releaseSince=null;this.releaseKey=null;}
   if(this.locked!==null)return {index:null,progress:0,locked:true};
  }
  if(!valid){
   this.uncertainSince??=at;this.since+=delta;
   if(pair.missing||at-this.uncertainSince>180){this.candidate=null;this.progress=0;}
   return {index:null,progress:this.progress,locked:false};
  }
  if(this.uncertainSince!==null)this.since+=delta;
  this.uncertainSince=null;
  if(this.candidate!==key){this.candidate=key;this.since=at;this.samples=0;}
  this.samples++;this.progress=Math.min(1,(at-this.since)/this.holdMs);
  if(this.progress>=1&&this.samples>=5){this.locked=key;this.candidate=null;this.progress=0;return {index:key,progress:1,locked:true};}
  return {index:null,progress:this.progress,locked:false};
 }
}
