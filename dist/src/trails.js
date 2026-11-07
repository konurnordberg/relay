// Presentation only: fingertip paths never enter gesture training or recognition.
export class FingerTrails{
 constructor(lifetimeMs=1400){this.lifetimeMs=lifetimeMs;this.enabled=false;this.clear();}
 clear(){this.paths=[[],[]];this.previous=[null,null];}
 setEnabled(enabled){if(this.enabled!==!!enabled)this.clear();this.enabled=!!enabled;}
 prune(now){this.paths=this.paths.map(path=>path.filter(p=>now-p.at<this.lifetimeMs));}
 update(hands,now){
  if(!this.enabled)return;this.prune(now);
  hands.forEach((hand,i)=>{
   const tip=hand?.[8],previous=this.previous[i];
   if(!tip||!Number.isFinite(tip.x)||!Number.isFinite(tip.y)){this.previous[i]=null;return;}
   const join=!!previous&&now-previous.at<250&&Math.hypot(tip.x-previous.x,tip.y-previous.y)<.25;
   const point={x:tip.x,y:tip.y,at:now,join};
   this.paths[i].push(point);if(this.paths[i].length>128)this.paths[i].shift();
   this.previous[i]=point;
  });
 }
 draw(ctx,width,height,now){
  if(!this.enabled)return;this.prune(now);
  const colors=['#32f5ff','#ff55ec'];
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.globalCompositeOperation='lighter';
  this.paths.forEach((path,hand)=>{
   const color=colors[hand];ctx.shadowColor=color;
   for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i];if(!b.join)continue;
    const alpha=Math.pow(Math.max(0,1-(now-a.at)/this.lifetimeMs),1.35);
    ctx.beginPath();ctx.moveTo(a.x*width,a.y*height);ctx.lineTo(b.x*width,b.y*height);
    ctx.globalAlpha=alpha*.65;ctx.strokeStyle=color;ctx.lineWidth=9;ctx.shadowBlur=18;ctx.stroke();
    ctx.globalAlpha=alpha;ctx.strokeStyle='#eaffff';ctx.lineWidth=2.5;ctx.shadowBlur=4;ctx.stroke();
   }
   const tip=path.at(-1);
   if(tip){
    ctx.globalAlpha=Math.max(0,1-(now-tip.at)/this.lifetimeMs);
    ctx.fillStyle=color;ctx.shadowBlur=18;ctx.beginPath();ctx.arc(tip.x*width,tip.y*height,5,0,Math.PI*2);ctx.fill();
   }
  });
  ctx.restore();
 }
}
