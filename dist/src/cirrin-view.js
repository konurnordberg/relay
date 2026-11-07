import {RING,RING_LETTERS,letterPoint} from './cirrin-core.js';
const TAU=Math.PI*2,STEP=TAU/26;
function paint(ctx,size,input,{mini=false,background=true}={}){
 const t=input.trace;
 if(background){ctx.fillStyle='#102923';ctx.fillRect(0,0,size,size);}
 ctx.save();ctx.scale(size,size);
 const write=(value,x,y,scale,weight=400)=>{ctx.save();ctx.scale(1/size,1/size);ctx.font=weight+' '+Math.max(mini?5:10,scale*size)+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(value,x*size,y*size);ctx.restore();};
 for(let i=0;i<26;i++){
  const a=i*STEP-Math.PI/2,b=a-STEP*.485,c=a+STEP*.485;
  ctx.beginPath();ctx.arc(.5,.5,RING.outer,b,c);ctx.arc(.5,.5,RING.inner,c,b,true);ctx.closePath();
  ctx.fillStyle=t.latched===i?'#a3ffc1':t.hits.some(h=>h.index===i)?'#315e4a':'#1c3a30';
  ctx.fill();ctx.strokeStyle='#6d9e7c45';ctx.lineWidth=.0015;ctx.stroke();
  const p=letterPoint(RING_LETTERS[i]);ctx.fillStyle=t.latched===i?'#102923':'#e0efdd';write(RING_LETTERS[i].toUpperCase(),p.x,p.y,.042,600);
 }
 ctx.setLineDash([.009,.012]);ctx.strokeStyle='#c8e5cd45';ctx.lineWidth=.002;ctx.beginPath();ctx.arc(.5,.5,RING.start,0,TAU);ctx.stroke();ctx.setLineDash([]);
 if(input.guide){
  ctx.strokeStyle='#efc78280';ctx.lineWidth=.004;ctx.setLineDash([.008,.012]);ctx.beginPath();ctx.moveTo(.5,.5);
  for(const letter of 'hello'){const p=letterPoint(letter,.375);ctx.lineTo(p.x,p.y);ctx.lineTo(.5,.5);}ctx.stroke();ctx.setLineDash([]);
  if(!mini)for(const [letter,steps] of [['h','1'],['e','2'],['l','3,4'],['o','5']]){const p=letterPoint(letter,.31);ctx.fillStyle='#f0c77b';write(steps,p.x,p.y,.024,600);}
 }
 if(t.path.length){ctx.beginPath();ctx.strokeStyle='#a3ffc1';ctx.lineWidth=.006;ctx.lineCap=ctx.lineJoin='round';
  t.path.forEach((p,i)=>ctx[i===0||p.break?'moveTo':'lineTo'](p.x,p.y));ctx.stroke();
 }
 if(!mini){
  ctx.fillStyle='#102923e8';ctx.beginPath();ctx.arc(.5,.5,.145,0,TAU);ctx.fill();
  ctx.fillStyle='#b4d2bf';write(t.phase==='tracing'?'TRACING':t.phase==='review'?'REVIEW WORD':'START HERE',.5,.46,.023,600);
  ctx.fillStyle='#e5f7e9';write(t.word.length>13?'…'+t.word.slice(-12):t.word||'Pinch',.5,.515,t.word.length>9?.026:.045,600);
  ctx.fillStyle='#b4d2bf';write(t.phase==='review'?'Thumbs-up to insert':t.phase==='tracing'?'Release to review':'then visit letters',.5,.56,.021);
 }
 if(t.cursor){
  ctx.beginPath();ctx.arc(t.cursor.x,t.cursor.y,t.phase==='tracing'?.012:.017,0,TAU);ctx.strokeStyle=t.phase==='tracing'?'#fff':'#ffc978';ctx.lineWidth=.004;ctx.stroke();
 }
 ctx.restore();
}
export function drawCirrin(canvas,input,{camera=false}={}){
 if(!canvas)return;const w=camera?640:640,h=camera?Math.round(w/input.aspect):640;
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);
 if(!camera){paint(ctx,w,input);return;}
 ctx.save();const scale=w/input.gain;ctx.translate(input.center.x*w-scale/2,input.center.y*w-scale/2);paint(ctx,scale,input,{mini:true,background:false});ctx.restore();
}
