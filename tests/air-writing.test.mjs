import {AirWriter} from '../dist/src/air-writing.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {AirInk,airHand} from '../dist/src/air-ink.js';
import {letterCandidates} from '../dist/src/letter-raster.js';
import {fingerEvidence,countFingers,FingerPairTracker,FingerIndexGate} from '../dist/src/finger-index.js';
import {hand,pairHands} from './hand-fixture.mjs';
test('ink retains pen-up breaks, rejects duplicate frames and splits tracking gaps',()=>{
 const ink=new AirInk();
 for(let i=0;i<12;i++)ink.add({x:.2+i*.01,y:.3},true,i*30);
 assert.equal(ink.usable,true);assert.equal(ink.strokes.length,1);
 const points=ink.points;ink.add({x:.9,y:.3},true,330);assert.equal(ink.points,points);
 ink.add({x:.6,y:.3},true,600);assert.equal(ink.strokes.length,2);
 ink.add({x:.6,y:.3},false,630);ink.add({x:.5,y:.2},true,660);assert.equal(ink.strokes.length,3);
 ink.clear();assert.equal(ink.usable,false);assert.equal(ink.strokes.length,0);
});
test('ink bounds memory, rejects blank dots and remains responsive to fast motion',()=>{
 const ink=new AirInk();for(let i=0;i<60;i++)ink.add({x:.3,y:.3},true,i*20);assert.equal(ink.usable,false);
 ink.add({x:.4,y:.3},true,1220);assert.ok(ink.strokes[0].at(-1).x>.38);
 for(let i=0;i<5200;i++)ink.add({x:.4+(i%2)*.02,y:.3},true,1240+i*10);
 assert.equal(ink.points,5000);assert.equal(ink.limited,true);
});
test('pinch uses hand-relative hysteresis, mirrored tip and real pen-up',()=>{
 const h=hand(1);h[4]={...h[8]};const down=airHand(h);assert.equal(down.down,true);assert.equal(down.point.x,1-h[8].x);
 h[4].x+=.11;assert.equal(airHand(h).down,false);
 h[8].x=NaN;assert.equal(airHand(h),null);assert.equal(airHand([]),null);
});
test('neural class aggregation merges case but flags digit lookalikes',()=>{
 const scores=Array(47).fill(0);scores[10]=.3;scores[36]=.6;assert.equal(letterCandidates(scores).candidates[0].letter,'A');
 scores.fill(0);scores[0]=.95;const out=letterCandidates(scores);assert.equal(out.candidates[0].letter,'O');assert.equal(out.ambiguous,true);
});
test('four and five tolerate relaxed joints and noisy depth without turning fists into open palms',()=>{
 for(const n of [4,5])for(const rotation of [-30,0,30]){
  const image=hand(n,{rotation,scale:.8}),world=image.map(p=>({...p,y:p.y/(4/3)}));
  // Corrupt the depth at two distal joints: older per-joint veto rejects these.
  world[15].z+=.055;world[19].z-=.055;
  assert.equal(countFingers(image,world),n);
  assert.ok(fingerEvidence(image,world).strength>.6);
 }
 for(const n of [0,1,2,3])assert.equal(countFingers(hand(n)),n);
});
test('count stability requires fresh frames; jitter pauses rather than selects the previous cell',()=>{
 const tracker=new FingerPairTracker(),gate=new FingerIndexGate(600);let at=0,events=[];
 const send=(r,c)=>{const frame={hands:pairHands(r,c),handFrameAt:at+=50,now:at};const pair=tracker.update(frame);const out=gate.update(pair,at);if(out.index!==null)events.push(out.index);return pair;};
 assert.equal(send(4,5).settling,true);assert.equal(send(4,5).settling,false);
 for(let i=0;i<8;i++)send(4,5);
 assert.equal(send(3,5).settling,true);assert.deepEqual(events,[]);
 for(let i=0;i<10;i++)send(4,5);
 assert.deepEqual(events,[29]);
 const stale=tracker.update({hands:pairHands(5,5),handFrameAt:at,now:at+1000});assert.equal(stale.row,null);
});

test('late neural results cannot resurrect a cleared drawing',async()=>{
 const writer=new AirWriter(()=>{},()=>assert.fail('must not insert'));
 writer.ink.strokes=[[{x:.1,y:.1},{x:.2,y:.2},{x:.3,y:.3}]];writer.ink.points=6;
 let resolve;writer.model.recognize=()=>new Promise(r=>resolve=r);
 const pending=writer.recognize();writer.reset();resolve({candidates:[{letter:'A',score:.9}],ambiguous:false});
 await pending;assert.equal(writer.candidates.length,0);assert.equal(writer.state,'idle');
});
test('thumb confirmation needs continuous fresh tracking, not two isolated frames',()=>{
 const inserted=[],writer=new AirWriter(()=>{},c=>inserted.push(c));
 writer.candidates=[{letter:'H',score:.9}];writer.state='ready';
 const frame=t=>({hands:[hand(1,{thumbOnly:true})],handFrameAt:t,now:t,handAspect:4/3});
 writer.update(frame(100),true);writer.update(frame(1100),true);assert.deepEqual(inserted,[]);
 for(let t=1150;t<=2050;t+=50)writer.update(frame(t),true);
 assert.deepEqual(inserted,['H']);
});
