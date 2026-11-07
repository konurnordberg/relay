// Presentation-only tracking. Filtered/interpolated points never feed recognition.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const alpha=(dt,hz)=>1-Math.exp(-2*Math.PI*hz*dt);
const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=-.25&&p.x<=1.25&&p.y>=-.25&&p.y<=1.25;
const track=()=>({path:[],last:null,speed:0,velocity:{x:0,y:0},pending:null});
export const TRAIL_GAP_MS=200;
export class FingerTrails{
 constructor(lifetimeMs=1400){this.lifetimeMs=lifetimeMs;this.enabled=false;this.clear();}
 clear(){this.tracks=[track(),track()];this.previousTime=null;}
 get paths(){return this.tracks.map(t=>t.path);}
 setEnabled(enabled){if(this.enabled!==!!enabled)this.clear();this.enabled=!!enabled;}
 prune(now){for(const t of this.tracks)t.path=t.path.filter(p=>now-p.at<this.lifetimeMs);}
 update(hands,now,handedness=[]){
  if(!this.enabled)return;
  if(this.previousTime!==null&&now<=this.previousTime)return;
  this.previousTime=now;this.prune(now);
  // Use palm position to maintain visual identity even when handedness confidence
  // briefly drops or detection order flips. No new points are drawn while missing.
  const observations=hands.flatMap((h,index)=>{
   if(!h||!valid(h[8]))return [];
   const palm=[0,5,9,17].map(i=>h[i]).filter(valid);
   if(!palm.length)return [];
   const anchor={x:palm.reduce((s,p)=>s+p.x,0)/palm.length,y:palm.reduce((s,p)=>s+p.y,0)/palm.length};
   const label=handedness[index]?.[0]?.categoryName;
   return [{tip:h[8],anchor,label}];
  }).slice(0,2);
  if(!observations.length)return;
  const cost=(o,t,index)=>{
   if(!t.last||now-t.last.at>TRAIL_GAP_MS)return o.label?(o.label===(index?'Right':'Left')?.30:.34):.32;
   const dt=(now-t.last.at)/1000;
   const predicted={x:t.last.anchor.x+clamp(t.velocity.x*dt,-.12,.12),y:t.last.anchor.y+clamp(t.velocity.y*dt,-.12,.12)};
   return distance(o.anchor,predicted)*.8+distance(o.tip,t.last.raw)*.2;
  };
  let assignments;
  if(observations.length===2){
   const normal=cost(observations[0],this.tracks[0],0)+cost(observations[1],this.tracks[1],1);
   const swapped=cost(observations[0],this.tracks[1],1)+cost(observations[1],this.tracks[0],0);
   assignments=normal<=swapped?[[0,0],[1,1]]:[[0,1],[1,0]];
  }else assignments=[[0,cost(observations[0],this.tracks[0],0)<=cost(observations[0],this.tracks[1],1)?0:1]];
  for(const [observation,index] of assignments)this.accept(this.tracks[index],observations[observation],now);
 }
 accept(t,o,now){
  const last=t.last,dt=last?(now-last.at)/1000:0;
  const fresh=!last||now-last.at>TRAIL_GAP_MS;
  // A spatially remote reacquisition begins a separate stroke. A lone implausible
  // fingertip spike is withheld; a consistent new location is allowed as a new stroke.
  let join=!fresh&&distance(o.anchor,last.anchor)<Math.min(.38,.10+dt*2.4);
  if(join){
   const jump=distance(o.tip,last.raw),limit=Math.min(.50,.035+dt*Math.max(3.6,t.speed*2.2));
   if(jump>limit){
    if(t.pending&&now-t.pending.at<160&&distance(o.tip,t.pending.tip)<.065){join=false;}
    else{t.pending={tip:o.tip,at:now};return;}
   }
  }
  const elapsed=Math.max(1/240,dt||1/30);
  const speed=join?distance(o.tip,last.raw)/elapsed:0;
  t.speed=join?t.speed+(speed-t.speed)*alpha(elapsed,5):0;
  // Smooth small jitter strongly, follow deliberate fast motion with little lag.
  const filtered=join?mix(last.filtered,o.tip,alpha(elapsed,2.6+t.speed*5)):({x:o.tip.x,y:o.tip.y});
  if(join){
   const rawVelocity={x:(o.anchor.x-last.anchor.x)/elapsed,y:(o.anchor.y-last.anchor.y)/elapsed};
   t.velocity=mix(t.velocity,rawVelocity,alpha(elapsed,4));
  }else t.velocity={x:0,y:0};
  const point={...filtered,at:now,join};
  t.path.push(point);if(t.path.length>192)t.path.shift();
  t.last={raw:{x:o.tip.x,y:o.tip.y},filtered,anchor:o.anchor,at:now};
  t.pending=null;
 }
 draw(ctx,width,height,now){
  if(!this.enabled)return;this.prune(now);
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.globalCompositeOperation='source-over';
  this.tracks.forEach((t,hand)=>{
   const color=hand?'#ff55ec':'#32f5ff',segments=curveSegments(t.path);
   ctx.shadowColor=color;
   for(const {a,b,c1,c2} of segments){
    const opacity=Math.pow(clamp(1-(now-(a.at+b.at)/2)/this.lifetimeMs,0,1),1.2);
    ctx.beginPath();ctx.moveTo(a.x*width,a.y*height);
    ctx.bezierCurveTo(c1.x*width,c1.y*height,c2.x*width,c2.y*height,b.x*width,b.y*height);
    ctx.globalAlpha=opacity*.55;ctx.strokeStyle=color;ctx.lineWidth=8;ctx.shadowBlur=15;ctx.stroke();
    ctx.globalAlpha=opacity;ctx.strokeStyle='#eaffff';ctx.lineWidth=2.2;ctx.shadowBlur=3;ctx.stroke();
   }
   const tip=t.path.at(-1);
   if(tip){
    ctx.globalAlpha=clamp(1-(now-tip.at)/this.lifetimeMs,0,1);ctx.fillStyle=color;ctx.shadowBlur=14;
    ctx.beginPath();ctx.arc(tip.x*width,tip.y*height,4,0,Math.PI*2);ctx.fill();
   }
  });
  ctx.restore();
 }
}
// Distance-weighted Hermite tangents form a continuous curve through observations.
// Controls are locally bounded so corners/reversals cannot create oversized loops.
export function curveSegments(path){
 const result=[];
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i];if(!b.join)continue;
  const before=i>1&&a.join?path[i-2]:a,after=path[i+1]?.join?path[i+1]:b;
  const length=distance(a,b),previous=distance(before,a),next=distance(b,after);
  const tangent=(p,q,scale)=>({x:(q.x-p.x)*scale,y:(q.y-p.y)*scale});
  const m1=tangent(before,b,length/(previous+length||1)),m2=tangent(a,after,length/(length+next||1));
  const margin=length*.12;
  const bound=p=>({x:clamp(p.x,Math.min(a.x,b.x)-margin,Math.max(a.x,b.x)+margin),y:clamp(p.y,Math.min(a.y,b.y)-margin,Math.max(a.y,b.y)+margin)});
  const c1=bound({x:a.x+m1.x/3,y:a.y+m1.y/3}),c2=bound({x:b.x-m2.x/3,y:b.y-m2.y/3});
  result.push({a,b,c1,c2});
 }return result;
}
