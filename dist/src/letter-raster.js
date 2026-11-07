// A 28px EMNIST-style raster, upright white ink on black. All pen lifts survive.
export function rasterize(strokes,thickness=7,Canvas=OffscreenCanvas){
 const points=strokes.flat();if(!points.length)return new Float32Array(784);
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
 const minX=Math.min(...xs),minY=Math.min(...ys),w=Math.max(...xs)-minX,h=Math.max(...ys)-minY;
 const extent=Math.max(w,h,.03),scale=80/extent;
 const large=new Canvas(112,112),ctx=large.getContext('2d');
 ctx.fillStyle='black';ctx.fillRect(0,0,112,112);ctx.strokeStyle='white';ctx.fillStyle='white';ctx.lineWidth=thickness;ctx.lineCap=ctx.lineJoin='round';
 const xy=p=>[(p.x-minX-w/2)*scale+56,(p.y-minY-h/2)*scale+56];
 for(const s of strokes){if(s.length<2)continue;ctx.beginPath();ctx.moveTo(...xy(s[0]));for(let i=1;i<s.length;i++)ctx.lineTo(...xy(s[i]));ctx.stroke();}
 const small=new Canvas(28,28),sc=small.getContext('2d');sc.drawImage(large,0,0,28,28);
 const rgba=sc.getImageData(0,0,28,28).data,data=Float32Array.from({length:784},(_,i)=>rgba[i*4]/255);
 let sum=0,cx=0,cy=0;data.forEach((v,i)=>{sum+=v;cx+=v*(i%28);cy+=v*Math.floor(i/28);});
 const dx=sum?Math.round(13.5-cx/sum):0,dy=sum?Math.round(13.5-cy/sum):0,centered=new Float32Array(784);
 for(let y=0;y<28;y++)for(let x=0;x<28;x++){const sx=x-dx,sy=y-dy;if(sx>=0&&sx<28&&sy>=0&&sy<28)centered[y*28+x]=data[sy*28+sx];}
 return centered;
}
const labels='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabdefghnqrt';
export function letterCandidates(values){
 const scores=Array(26).fill(0);let digitMass=0;
 for(let i=0;i<47;i++){const v=Math.max(0,values[i]||0);if(i<10)digitMass+=v;else scores[labels[i].toUpperCase().charCodeAt(0)-65]+=v;}
 // Letter mode: offer familiar lookalikes, but keep the ambiguity visible.
 for(const [digit,letter] of [[0,'O'],[1,'I'],[2,'Z'],[5,'S'],[8,'B']])scores[letter.charCodeAt(0)-65]+=(values[digit]||0)*.65;
 const ranked=scores.map((score,i)=>({letter:String.fromCharCode(65+i),score})).sort((a,b)=>b.score-a.score);
 return {candidates:ranked.slice(0,3),ambiguous:digitMass>.45||ranked[0].score<.5||ranked[0].score-ranked[1].score<.15};
}
