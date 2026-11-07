import test from 'node:test';
import assert from 'node:assert/strict';
import {FingerTrails,curveSegments,TRAIL_GAP_MS} from '../dist/src/trails.js';
const hand=(x,y=.5,anchor={x,y:y+.13})=>Array.from({length:21},(_,i)=>i===8?{x,y,z:0}:{...anchor,z:0});
const labels=(...names)=>names.map(categoryName=>[{categoryName,score:.99}]);
const setup=()=>{const t=new FingerTrails();t.setEnabled(true);return t;};
const variance=a=>{const m=a.reduce((s,x)=>s+x,0)/a.length;return a.reduce((s,x)=>s+(x-m)**2,0)/a.length;};
test('adaptive smoothing reduces stationary jitter without excessive lag on a fast sweep',()=>{
 const t=setup(),raw=[];
 for(let i=0;i<50;i++){const x=.5+Math.sin(i*2.1)*.008;raw.push(x);t.update([hand(x)],i*33,labels('Left'));}
 const filtered=t.paths[0].slice(-30).map(p=>p.x);
 assert.ok(variance(filtered)<variance(raw.slice(-30))*.7);
 const fast=setup();
 for(let i=0;i<18;i++)fast.update([hand(.1+i*.04)],i*33,labels('Left'));
 assert.equal(fast.paths[0].length,18);assert.ok(fast.paths[0].slice(1).every(p=>p.join));
 assert.ok(Math.abs(fast.paths[0].at(-1).x-(.1+17*.04))<.025);
 const wide=setup();
 [.1,.42,.7].forEach((x,i)=>wide.update([hand(x)],i*100,labels('Left')));
 assert.equal(wide.paths[0].length,3);assert.ok(wide.paths[0].slice(1).every(p=>p.join),'plausible fast swipes must not hit the old fixed-distance break');

});
test('short dropped detections reconnect while long occlusion starts a separate stroke',()=>{
 const t=setup();t.update([hand(.3)],0,labels('Left'));t.update([hand(.32)],33,labels('Left'));
 t.update([],66);t.update([],99);t.update([hand(.38)],132,labels('Left'));
 assert.equal(t.paths[0].at(-1).join,true);
 t.update([],200);t.update([hand(.40)],132+TRAIL_GAP_MS+20,labels('Left'));
 assert.equal(t.paths[0].at(-1).join,false);
});
test('low confidence, swapped detection order and labels do not split nearby hands',()=>{
 const t=setup();
 t.update([hand(.2),hand(.8)],0,labels('Left','Right'));
 t.update([hand(.79),hand(.21)],33,labels('Left','Right'));
 assert.ok(t.paths[0].at(-1).x<.3);assert.ok(t.paths[1].at(-1).x>.7);
 t.update([hand(.22),hand(.78)],66,[[{categoryName:'Right',score:.4}],[{categoryName:'Left',score:.4}]]);
 assert.ok(t.paths.every(p=>p.length===3&&p.at(-1).join));
});
test('a single bad fingertip detection cannot draw a spike across the image',()=>{
 const t=setup(),anchor={x:.3,y:.6};
 t.update([hand(.3,.4,anchor)],0);t.update([hand(.31,.4,anchor)],33);
 t.update([hand(.95,.05,anchor)],66);t.update([hand(.32,.4,anchor)],99);
 assert.equal(t.paths[0].length,3);assert.ok(t.paths[0].every(p=>p.x<.4));
 assert.equal(t.paths[0].at(-1).join,true);
});
test('a new distant hand starts separately and never bridges the scene',()=>{
 const t=setup();t.update([hand(.1)],0,labels('Left'));t.update([hand(.9)],33,labels('Left'));
 const paths=t.paths.filter(p=>p.length);assert.equal(paths.length,2);
 assert.ok(paths.every(p=>!p[0].join));
});
test('curves interpolate observations and remain locally bounded through a reversal',()=>{
 const path=[{x:.1,y:.2,at:0,join:false},{x:.3,y:.3,at:33,join:true},{x:.5,y:.2,at:66,join:true},{x:.3,y:.3,at:99,join:true}];
 const segments=curveSegments(path);assert.equal(segments.length,3);
 assert.ok(segments.some(s=>Math.abs((s.c1.y-s.a.y)*(s.b.x-s.a.x)-(s.c1.x-s.a.x)*(s.b.y-s.a.y))>1e-5));
 for(const {a,b,c1,c2} of segments)for(const p of [c1,c2]){
  const margin=Math.hypot(a.x-b.x,a.y-b.y)*.12;
  assert.ok(p.x>=Math.min(a.x,b.x)-margin-1e-8&&p.x<=Math.max(a.x,b.x)+margin+1e-8);
  assert.ok(Number.isFinite(p.y));
 }
 path[2].join=false;assert.equal(curveSegments(path).length,2);
});
test('paths expire, memory remains bounded, disabling clears all history',()=>{
 const t=setup();for(let i=0;i<1000;i++)t.update([hand(.4+Math.sin(i/20)*.05)],i*5);
 assert.ok(t.paths[0].length<=192);t.prune(7000);assert.deepEqual(t.paths,[[],[]]);
 t.setEnabled(false);assert.equal(t.tracks[0].last,null);
 t.update([hand(.7)],7100);assert.deepEqual(t.paths,[[],[]]);
});

test('very fast coherent sweeps and immediate reversals stay on one continuous trail',()=>{
 for(const interval of [16.7,33,50]){
  const t=setup(),xs=[.12,.34,.58,.81,.55,.30,.12,.36];
  xs.forEach((x,i)=>t.update([hand(x)],i*interval,labels('Left')));
  assert.equal(t.paths[0].length,xs.length,'must not discard a valid fast hand observation');
  assert.equal(t.paths[1].length,0,'speed alone must not switch visual identity');
  assert.ok(t.paths[0].slice(1).every(p=>p.join),'fast reversals must remain connected');
 }
});
test('a brief fast-motion detection loss reconnects without inventing points while missing',()=>{
 const t=setup();t.update([hand(.15)],0,labels('Left'));t.update([hand(.30)],33,labels('Left'));
 for(const time of [66,100,150,200])t.update([],time);
 assert.equal(t.paths[0].length,2);
 t.update([hand(.72)],280,labels('Left'));
 assert.equal(t.paths[0].length,3);assert.ok(t.paths[0].at(-1).join);
});
test('rendering cost uses bounded glow batches at high sample rates',()=>{
 const t=setup();for(let i=0;i<85;i++)t.update([hand(.5+Math.sin(i*.1)*.2,.5+Math.cos(i*.1)*.2)],i*16.7);
 let strokes=0,curves=0;const ctx={save(){},restore(){},beginPath(){},moveTo(){},bezierCurveTo(){curves++;},stroke(){strokes++;},arc(){},fill(){}};
 t.draw(ctx,640,480,1403);assert.ok(curves>=80);assert.ok(strokes<=20,'glow work should not grow with every sampled segment');
});
