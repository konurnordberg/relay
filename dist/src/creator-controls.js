import {resamplePath} from './flow-core.js';
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export class HoldGate{
 constructor(ms=900){this.ms=ms;this.reset();}
 reset(){this.lastAt=null;this.key=null;this.since=0;this.frames=0;this.locked=null;this.away=null;this.progress=0;}
 update(key,at,now=at){
  if(!Number.isFinite(at)||!Number.isFinite(now)||now-at>220){this.key=null;this.progress=0;return null;}
  if(this.lastAt!==null&&at<=this.lastAt)return null;
  if(this.lastAt!==null&&at-this.lastAt>220){this.key=null;this.progress=0;}
  this.lastAt=at;
  if(key===null||key===undefined){this.key=null;this.progress=0;this.away=null;return null;}
  if(this.locked!==null){if(key===this.locked){this.away=null;return null;}this.away??=at;if(at-this.away<220)return null;this.locked=null;this.key=null;this.away=null;}
  if(key!==this.key){this.key=key;this.since=at;this.frames=0;}this.frames++;
  this.progress=Math.min(1,(at-this.since)/this.ms);
  if(this.progress>=1&&this.frames>=3){this.locked=key;this.key=null;this.progress=0;return key;}return null;
 }
}
export class HandRotation{
 constructor(){this.reset();}
 reset(){this.base=null;this.angle=null;this.raw=null;this.wrist=null;this.at=null;this.seen=null;this.moved=false;this.turn=0;}
 center(){if(this.raw===null)return false;this.base=this.raw;this.angle=this.raw;this.moved=false;this.turn=0;return true;}
 update(frame,options={}){
  const at=frame.handFrameAt,now=frame.now,aspect=frame.handAspect||4/3;
  if(!Number.isFinite(at)||now-at>200){if(this.seen!==null&&now-this.seen>500)this.reset();return null;}
  if(this.at!==null&&at<=this.at)return null;
  this.at=at;
  let hands=(frame.hands||[]).filter(p=>p?.length===21&&[0,5,9,17].every(i=>Number.isFinite(p[i].x)&&Number.isFinite(p[i].y)));
  if(options.hand==='left')hands.sort((a,b)=>b[0].x-a[0].x);else if(options.hand==='right')hands.sort((a,b)=>a[0].x-b[0].x);else if(this.wrist)hands.sort((a,b)=>Math.hypot(a[0].x-this.wrist.x,a[0].y-this.wrist.y)-Math.hypot(b[0].x-this.wrist.x,b[0].y-this.wrist.y));
  const p=hands[0];if(!p){if(this.seen!==null&&now-this.seen>500)this.reset();return null;}
  const dx=-(p[9].x-p[0].x),dy=-(p[9].y-p[0].y)/aspect,width=Math.hypot(p[5].x-p[17].x,(p[5].y-p[17].y)/aspect);
  if(Math.hypot(dx,dy)<.035||width<.025||this.wrist&&Math.hypot(p[0].x-this.wrist.x,p[0].y-this.wrist.y)>.35){this.reset();return null;}
  if(this.seen!==null&&at-this.seen>500)this.reset();this.seen=at;this.at=at;this.wrist={...p[0]};this.raw=Math.atan2(dx,dy);
  this.base??=this.raw;this.angle=this.angle===null?this.raw:this.angle+wrap(this.raw-this.angle)*.45;
  const delta=wrap(this.angle-this.base);if(Math.abs(delta)>.075)this.moved=true;
  this.turn=delta/(Math.PI*(options.rotationRange||120)/180)*(options.reverse?-1:1);
  return {turn:this.turn,ready:this.moved,at,wrist:this.wrist};
 }
}
function normalized(strokes){
 const points=strokes.flat();if(points.length<4)return null;
 const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y)),scale=Math.max(maxX-minX,maxY-minY);
 if(scale<.025)return null;
 return resamplePath(points.map(p=>({x:(p.x-(minX+maxX)/2)/scale,y:(p.y-(minY+maxY)/2)/scale})),64);
}
export function compactSketch(strokes){return strokes.slice(0,12).filter(s=>s.length>=2).map(s=>resamplePath(s,Math.min(128,s.length)).map(p=>({x:+p.x.toFixed(4),y:+p.y.toFixed(4)})));}
export function matchSketch(strokes,classes){
 const query=normalized(strokes);if(!query)return [];
 const results=classes.filter(c=>c.examples.length>=2).map(c=>{
  const score=Math.min(...c.examples.map(example=>{const candidate=normalized(example);if(!candidate)return Infinity;return Math.sqrt(query.reduce((n,p,i)=>n+(p.x-candidate[i].x)**2+(p.y-candidate[i].y)**2,0)/64)+Math.abs(example.length-strokes.length)*.035;}));
  return {id:c.id,label:c.label,value:c.value,score};
 }).sort((a,b)=>a.score-b.score).slice(0,3);
 return results.filter(r=>r.score<.55);
}
export function hitItem(block,point,positions){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return null;
 if(block.layout==='ring'){
  const dx=point.x-.5,dy=point.y-.5,r=Math.hypot(dx,dy);if(r<.29||r>.57)return null;
  const step=Math.PI*2/Math.max(1,block.items.length),a=(Math.atan2(dy,dx)+Math.PI/2+Math.PI*2)%(Math.PI*2),i=Math.round(a/step)%block.items.length;
  return i;
 }
 if(block.layout==='grid'){if(point.x<0||point.x>=1||point.y<0||point.y>=1)return null;const i=Math.floor(point.y*block.rows)*block.columns+Math.floor(point.x*block.columns);return i<block.items.length?i:null;}
 const target=positions.find(p=>Math.abs(point.x-p.x)<=p.w/2&&Math.abs(point.y-p.y)<=p.h/2);return target?.i??null;
}
