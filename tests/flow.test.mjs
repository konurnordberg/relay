import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {VisionPen,penPose} from '../dist/src/vision-pen.js';
import {FlowDecoder,wordPath,resamplePath,FLOW_LAYOUT} from '../dist/src/flow-core.js';
import {hand} from './hand-fixture.mjs';
import {RingTrace,letterPoint} from '../dist/src/cirrin-core.js';
import {AirInk} from '../dist/src/air-ink.js';
import {createProfile,exportProfile,importProfile} from '../dist/src/storage.js';
const frame=(hands,t)=>({hands,handFrameAt:t,now:t,handAspect:4/3});
test('point, middle pinch and legacy pinch draw independently; peripheral clipping does not kill the pen',()=>{
 const h=hand(1);assert.equal(penPose(h).down,true);assert.equal(penPose(hand(5)).up,true);
 h[20].x=1.1;assert.ok(penPose(h),'a peripheral cropped finger may not discard the visible pointer');
 const middle=hand(1);middle[4]={...middle[12]};assert.ok(penPose(middle,null,4/3,'middle-pinch').down);
 const pinch=hand(1);pinch[4]={...pinch[8]};assert.ok(penPose(pinch,null,4/3,'pinch').down);
});
test('pen buffers stroke start, ignores duplicates, bridges brief missing frames, excludes lift motion and cancels long loss',()=>{
 const pen=new VisionPen();let out;for(let t=0;t<=90;t+=30)out=pen.update(frame([hand(1)],t));assert.equal(out.down,true);
 assert.equal(pen.update(frame([hand(1)],90)),null);
 out=pen.update(frame([],120));assert.equal(out.phase,'gap');assert.equal(out.samples.length,0);
 out=pen.update(frame([hand(1)],210));assert.equal(out.down,true);assert.equal(out.samples.length,1);
 out=pen.update(frame([hand(5)],240));assert.equal(out.samples.length,0,'opening motion must not add ink');
 for(let t=270;t<=330;t+=30)out=pen.update(frame([hand(5)],t));assert.equal(pen.down,false);
 for(let t=360;t<=450;t+=30)out=pen.update(frame([hand(1)],t));
 pen.update(frame([],480));out=pen.update(frame([],750));assert.equal(out.interrupted,true);assert.equal(pen.down,false);
 out=pen.update(frame([hand(1)],780));assert.equal(out.phase,'rearm');
 pen.update(frame([hand(5)],810));for(let t=840;t<=930;t+=30)out=pen.update(frame([hand(1)],t));assert.equal(out.down,true);
});
test('nearest tracked hand persists across detector order changes',()=>{
 const pen=new VisionPen(),a=hand(1,{x:.7,scale:.5}),b=hand(5,{x:.25,scale:.5});
 pen.update(frame([a],0));pen.update(frame([a],40));const out=pen.update(frame([b,a],80));assert.equal(out.down,true);assert.ok(out.raw.x<.5);
});
test('Air ink reconnects a short dropout without flattening stroke breaks',()=>{
 const ink=new AirInk();ink.add({x:.2,y:.2},true,0);ink.add({x:.3,y:.3},true,30);ink.add({x:.4,y:.4},true,240);assert.equal(ink.strokes.length,1);
 ink.lift(270);ink.add({x:.4,y:.2},true,300);assert.equal(ink.strokes.length,2);
});
test('fast ring excursions capture every letter without dwell, including repeated letters and moderate overshoot',()=>{
 const trace=new RingTrace();let t=0;trace.sample({x:.5,y:.5},true,t);
 for(const c of 'hello'){trace.sample(letterPoint(c,.53),true,t+=33);trace.sample({x:.5,y:.5},true,t+=33);}
 trace.sample({x:.5,y:.5},false,t+=33,{pointer:true});assert.equal(trace.word,'hello');assert.equal(trace.phase,'review');
});
const words=JSON.parse(fs.readFileSync(new URL('../dist/data/flow-words.json',import.meta.url))),decoder=new FlowDecoder(words);
test('whole-word decoding handles uneven timing, small noise, repeated letters, taps and personal vocabulary',()=>{
 for(const word of ['hello','keyboard','writing','computer','tomorrow','project','quick','brown','fox','jumps','over','lazy','dog','letter','coffee','please','changes','understand','information','beautiful']){
  const points=resamplePath(wordPath(word),43).map((p,i)=>({x:p.x+Math.sin(i*1.3)*.009,y:p.y+Math.cos(i*.7)*.012}));
  const result=decoder.decode(points);assert.ok(result.candidates.some(c=>c.word===word),word+' => '+result.candidates.map(x=>x.word));assert.equal(result.quality,'matched');
 }
 const custom='konurnordberg';assert.equal(decoder.decode(resamplePath(wordPath(custom)),[custom]).candidates[0].word,custom);
 assert.equal(decoder.decode([FLOW_LAYOUT.a]).candidates[0].word,'a');
 assert.deepEqual(decoder.decode([{x:NaN,y:0}]).candidates,[]);
});
test('pen and flow preferences survive backup while invalid imports are rejected',()=>{
 const p=createProfile('Flow');Object.assign(p.settings,{environment:'flow',penMode:'middle-pinch',flowGain:3,flowAuto:false});
 assert.deepEqual(importProfile(exportProfile(p)).settings,p.settings);p.settings.penMode='invalid';assert.throws(()=>exportProfile(p),/pen control/);
});
test('rapid queued words preserve order, and reset invalidates late decoder results',async()=>{
 const {FlowInput}=await import('../dist/src/flow-input.js');const inserted=[],input=new FlowInput(()=>{},w=>inserted.push(w),()=>{});
 input.load=async()=>{};let resolveFirst;let calls=0;
 input.request=()=>++calls===1?new Promise(r=>resolveFirst=r):Promise.resolve({quality:'matched',candidates:[{word:'world'}]});
 for(const word of ['hello','world']){for(const p of wordPath(word))input.sample(p,true,1);input.finish();}
 await new Promise(r=>setTimeout(r,0));resolveFirst({quality:'matched',candidates:[{word:'hello'}]});await input.jobs;
 assert.deepEqual(inserted,['hello','world']);
 let resolveLate;input.request=()=>new Promise(r=>resolveLate=r);for(const p of wordPath('late'))input.sample(p,true,1);input.finish();await new Promise(r=>setTimeout(r,0));input.reset();resolveLate({quality:'matched',candidates:[{word:'late'}]});await input.jobs;assert.deepEqual(inserted,['hello','world']);
});
test('Flow spelling and two symbol pages reach every printable ASCII character',async()=>{
 const {flowCharacter}=await import('../dist/src/flow-view.js');const chars=new Set([' ']);
 for(const mode of ['spell','symbols','symbols2'])for(const caps of [false,true])for(const key of Object.keys(FLOW_LAYOUT))chars.add(flowCharacter(key,mode,caps));
 for(let i=32;i<=126;i++)assert.ok(chars.has(String.fromCharCode(i)),'missing '+String.fromCharCode(i));
});