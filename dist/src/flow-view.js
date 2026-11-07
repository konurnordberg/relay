import {FLOW_LAYOUT} from './flow-core.js';
export const FLOW_SYMBOLS="1234567890-=[];',./!@#$%():?";
export const FLOW_SYMBOLS_2='+_*&{}"\\|<>~^\u0060:?!\n\t';
export const flowKeyLabel=value=>value==='\n'?'↵':value==='\t'?'⇥':value||'—';
export function flowCharacter(letter,mode,caps=false){if(mode.startsWith('symbols'))return (mode==='symbols'?FLOW_SYMBOLS:FLOW_SYMBOLS_2)[Object.keys(FLOW_LAYOUT).indexOf(letter)]||'';return caps?letter.toUpperCase():letter;}
function paint(ctx,w,input,caps){
 const h=w/1.8,box=(x,y,bw,bh)=>ctx.roundRect(x*w,y*h,bw*w,bh*h,8);
 ctx.save();ctx.fillStyle='#102923';ctx.fillRect(0,0,w,h);
 ctx.textAlign='center';ctx.textBaseline='middle';
 input.candidates.forEach((c,i)=>{ctx.beginPath();box(i/3+.009,.015,1/3-.018,.14);ctx.fillStyle=input.hover==='choice-'+i?'#547d4a':'#294f3f';ctx.fill();ctx.fillStyle='#e9ffde';ctx.font='600 '+Math.max(10,w*.025)+'px system-ui';ctx.fillText(c.word,(i+.5)*w/3,h*.085,w*.30);});
 for(const [letter,p] of Object.entries(FLOW_LAYOUT)){
  ctx.beginPath();box(p.x-.043,p.y-.085,.086,.17);ctx.fillStyle='#234638';ctx.fill();ctx.strokeStyle='#4b705a';ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle='#e6f3dd';ctx.font='600 '+w*.035+'px system-ui';ctx.fillText(flowKeyLabel(flowCharacter(letter,input.mode,caps)).toUpperCase(),p.x*w,p.y*h);
 }
 ['SPACE','UNDO','DELETE','.',caps?'abc':'ABC','MODE'].forEach((label,i)=>{ctx.beginPath();box(i/6+.004,.875,1/6-.008,.11);ctx.fillStyle=input.hover==='tool-'+i?'#547d4a':'#294f3f';ctx.fill();ctx.fillStyle='#cce4bf';ctx.font='600 '+Math.max(8,w*.016)+'px system-ui';ctx.fillText(label,(i+.5)*w/6,h*.93,w*.15);});
 const path=input.tracing?input.path:input.lastPath;
 if(path.length){ctx.strokeStyle=input.tracing?'#baffac':'#83b69480';ctx.lineWidth=w*.005;ctx.lineCap=ctx.lineJoin='round';ctx.beginPath();path.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p.x*w,p.y*h));ctx.stroke();}
 if(input.cursor){ctx.beginPath();ctx.arc(input.cursor.x*w,input.cursor.y*h,w*.012,0,Math.PI*2);ctx.strokeStyle=input.pen.down?'white':'#ffd582';ctx.lineWidth=2;ctx.stroke();}
 ctx.restore();
}
export function drawFlow(canvas,input,caps=false,camera=false){
 if(!canvas)return;const w=720,h=camera?Math.round(w/input.aspect):400;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);
 if(camera){const size=w/input.gain;ctx.save();ctx.globalAlpha=.7;ctx.translate(input.center.x*w-size/2,input.center.y*w-size/1.8*.53);paint(ctx,size,input,caps);ctx.restore();}
 else paint(ctx,w,input,caps);
}