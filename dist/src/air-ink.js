const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class AirInk{
 constructor(){this.clear();}
 clear(){this.strokes=[];this.down=false;this.lastAt=null;this.upAt=0;this.revision=(this.revision||0)+1;this.points=0;this.cursor=null;this.limited=false;}
 lift(at){if(this.down){this.down=false;this.upAt=at;}}
 add(point,down,at){
  if(!Number.isFinite(at)||!Number.isFinite(point?.x)||!Number.isFinite(point?.y))return;
  this.cursor=point;
  if(this.lastAt!==null&&at<=this.lastAt)return;
  const gap=this.lastAt!==null?at-this.lastAt:0;this.lastAt=at;
  if(!down){this.lift(at);return;}
  if(this.points>=5000||this.strokes.length>=80){this.limited=true;this.lift(at);return;}
  let stroke=this.strokes.at(-1),previous=stroke?.at(-1);
  if(gap>180||previous&&distance(point,previous)>.24)this.down=false;
  if(!this.down){stroke=[];this.strokes.push(stroke);this.down=true;previous=null;}
  if(previous&&distance(point,previous)<.0013)return;
  // Responsive smoothing; never extrapolate through a tracking dropout.
  const alpha=previous?Math.min(.92,.42+distance(point,previous)*15):1;
  const p=previous?{x:previous.x+alpha*(point.x-previous.x),y:previous.y+alpha*(point.y-previous.y)}:point;
  stroke.push(p);this.points++;this.revision++;
 }
 get usable(){return this.points>=5&&this.strokes.some(s=>s.length>2&&s.some(p=>distance(p,s[0])>.025));}
}
export function airHand(hand,aspect=4/3,wasDown=false){
 if(hand?.length!==21||hand.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1))return null;
 const p=hand.map(q=>({x:q.x,y:q.y/aspect})),width=distance(p[5],p[17]);
 if(width<.025)return null;
 const pinch=distance(p[4],p[8])/width;
 return {point:{x:1-p[8].x,y:p[8].y},down:pinch<(wasDown ? .58 : .38),pinch};
}
export function paintInk(ctx,strokes,width,height,{cursor=null,down=false,background=false}={}){
 ctx.clearRect(0,0,width,height);
 if(background){ctx.fillStyle='#102923';ctx.fillRect(0,0,width,height);ctx.strokeStyle='#d1ffde13';ctx.lineWidth=1;for(let x=width/8;x<width;x+=width/8){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}for(let y=height/6;y<height;y+=height/6){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}}
 ctx.lineCap=ctx.lineJoin='round';ctx.lineWidth=Math.max(2.5,width*.008);ctx.strokeStyle='#a3ffc1';ctx.shadowColor='#66ffb3';ctx.shadowBlur=5;
 for(const s of strokes){if(!s.length)continue;ctx.beginPath();ctx.moveTo(s[0].x*width,s[0].y*width);for(let i=1;i<s.length;i++)ctx.lineTo(s[i].x*width,s[i].y*width);ctx.stroke();}
 ctx.shadowBlur=0;
 if(cursor){ctx.beginPath();ctx.arc(cursor.x*width,cursor.y*width,down?6:9,0,Math.PI*2);ctx.strokeStyle=down?'#fff':'#ffc978';ctx.lineWidth=2;ctx.stroke();}
}
