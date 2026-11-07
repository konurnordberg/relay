const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:(a.z||0)-(b.z||0)});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const length=v=>Math.hypot(v.x,v.y,v.z);
const dist=(a,b)=>length(sub(a,b));
const finite=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
const angle=(a,b,c)=>{const u=sub(a,b),v=sub(c,b);return Math.acos(Math.max(-1,Math.min(1,dot(u,v)/(length(u)*length(v)||1))))*180/Math.PI;};
// Conservative geometry on MediaPipe's 21 points. Uncertain folds abstain.
// It counts raised fingers, including the thumb, without personal gesture training.
export function countFingers(image,world=null,aspect=4/3){
 if(image?.length!==21||image.some(p=>!finite(p)||p.x<-.03||p.x>1.03||p.y<-.03||p.y>1.03))return null;
 const width2=Math.hypot(image[5].x-image[17].x,(image[5].y-image[17].y)/aspect);
 const palm2=Math.hypot(image[9].x-image[0].x,(image[9].y-image[0].y)/aspect);
 const area=Math.abs((image[5].x-image[17].x)*(image[9].y-image[0].y)-(image[5].y-image[17].y)*(image[9].x-image[0].x))/aspect;
 if(width2<.025||palm2<.025||area/(width2*palm2)<.22)return null;
 const p=world?.length===21&&world.every(finite)?world:image.map(q=>({x:q.x,y:q.y/aspect,z:q.z}));
 const width=dist(p[5],p[17]);if(width<1e-5)return null;
 let count=0;
 for(const [mcp,pip,dip,tip] of [[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]]){
  const bend=angle(p[mcp],p[pip],p[dip]),end=angle(p[pip],p[dip],p[tip]);
  const reach=dist(p[tip],p[0])/(dist(p[pip],p[0])||1);
  if(bend>150&&end>140&&reach>1.1)count++;
  else if(!(bend<135||reach<.96))return null;
 }
 const lateral=dot(sub(p[4],p[5]),sub(p[5],p[17]))/(width*width);
 const thumbBend=angle(p[2],p[3],p[4]);
 if(lateral>.28&&thumbBend>145)count++;
 else if(!(lateral<.12||thumbBend<135||dist(p[4],p[5])/width<.6))return null;
 return count;
}
export function fingerPair(frame,swap=false){
 const hands=frame.hands||[];
 if(hands.length!==2)return {row:null,col:null,missing:true,reason:'Show both hands, palms toward the camera.'};
 if(hands.some(p=>!Array.isArray(p)||p.length!==21||!finite(p[0])))return {row:null,col:null,missing:false,reason:'Hand tracking is uncertain. Keep your whole hands visible.'};
 const order=hands.map((p,i)=>({p,i})).sort((a,b)=>b.p[0].x-a.p[0].x);
 if(Math.abs(order[0].p[0].x-order[1].p[0].x)<.16)return {row:null,col:null,missing:false,reason:'Separate your hands: one on each side of the preview.'};
 if(swap)order.reverse();
 const counts=order.map(({p,i})=>countFingers(p,frame.handWorld?.[i],frame.handAspect));
 return {row:counts[0],col:counts[1],missing:false,reason:counts.includes(null)?'Straighten raised fingers and tuck the others. Keep palms facing the camera.':''};
}
export class FingerIndexGate{
 constructor(holdMs=850){this.holdMs=holdMs;this.reset();}
 reset(){this.lastAt=null;this.candidate=null;this.since=0;this.samples=0;this.locked=null;this.releaseSince=null;this.releaseKey=null;this.progress=0;}
 update(pair,at,now=at){
  const result={index:null,progress:this.progress,locked:this.locked!==null};
  if(!Number.isFinite(at)||now-at>200){this.candidate=null;this.progress=0;this.releaseSince=null;return {...result,progress:0};}
  if(this.lastAt!==null&&at<=this.lastAt)return result; // face callbacks must not count as fresh hand evidence
  if(this.lastAt!==null&&at-this.lastAt>200){this.candidate=null;this.releaseSince=null;this.progress=0;}
  this.lastAt=at;
  const valid=Number.isInteger(pair.row)&&Number.isInteger(pair.col)&&pair.row>=0&&pair.row<6&&pair.col>=0&&pair.col<6;
  const key=valid?pair.row*6+pair.col:null;
  if(this.locked!==null){
   const release=pair.missing?'missing':valid&&key!==this.locked?key:null;
   if(release!==null){
    if(this.releaseKey!==release||this.releaseSince===null){this.releaseKey=release;this.releaseSince=at;}
    if(at-this.releaseSince>=300){this.locked=null;this.candidate=null;this.releaseSince=null;}
   }else{this.releaseSince=null;this.releaseKey=null;}
   if(this.locked!==null)return {index:null,progress:0,locked:true};
  }
  if(!valid){this.candidate=null;this.progress=0;return {index:null,progress:0,locked:false};}
  if(this.candidate!==key){this.candidate=key;this.since=at;this.samples=0;}
  this.samples++;this.progress=Math.min(1,(at-this.since)/this.holdMs);
  if(this.progress>=1&&this.samples>=5){this.locked=key;this.candidate=null;this.progress=0;return {index:key,progress:1,locked:true};}
  return {index:null,progress:this.progress,locked:false};
 }
}
