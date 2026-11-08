import test from 'node:test';
import assert from 'node:assert/strict';
import {REST,UNKNOWN,summarize} from '../dist/src/core.js';
import {CHANNELS,COMBINED_DIM,combineFeatures,smoothCombined} from '../dist/src/features.js';
import {trainCombined,predictCombined,CombinedGate,matchMotion,resample,requiredTracking} from '../dist/src/combined.js';
import {createProfile,validateProfile,exportProfile,importProfile} from '../dist/src/storage.js';
import {handSlots,stableHandSlots} from '../dist/src/camera.js';
const base=()=>{const v=Array(COMBINED_DIM).fill(.03);v.splice(0,3,1,1,1);v[129]=.3;return v;};
const summary=v=>({vector:[...v],spread:v.map(()=>.002),frames:20});
const pose=(id,indices)=>({id,name:id,action:id==='face'?'select':'next',value:'',kind:'pose',enabled:true,samples:Array.from({length:5},()=>{const v=base();indices.forEach(i=>v[i]=.85);return {...summary(v),neutral:summary(base())};})});
function motion(id='swipe',reverse=false){
 return {id,name:id,action:'next',value:'',kind:'motion',enabled:true,samples:Array.from({length:5},(_,j)=>{
  const sequence=Array.from({length:24},(_,k)=>{const v=base();v[129]=.3+(reverse?-1:1)*.4*Math.min(1,k/(14+j));return v;});
  return {...summarize(sequence),neutral:summary(base()),sequence,durationMs:2400};
 })};
}
function fixture(gestures){const p=createProfile('Combined test');p.rest=Array.from({length:5},()=>summary(base()));p.gestures=gestures;return p;}
test('new profiles enable all channels and preserve legacy export/import schemas',()=>{
 assert.equal(createProfile('New').modality,'combined');assert.equal(createProfile('New').featureVersion,2);
 for(const mode of ['face','hand','combined']){const p=createProfile(mode,mode);assert.equal(importProfile(exportProfile(p)).modality,mode);}
 assert.equal(validateProfile(fixture([pose('face',[8]),motion()])).featureVersion,2);
 const p=fixture([motion()]);p.gestures[0].samples[0].sequence[0][5]=NaN;assert.throws(()=>validateProfile(p),/movement/);
});
test('hand identity ignores detection result ordering; missing hands do not keep old features',()=>{
 const left=[{x:.1}],right=[{x:.9}],cat=categoryName=>[{categoryName,score:.99}];
 assert.deepEqual(handSlots({landmarks:[right,left],handedness:[cat('Right'),cat('Left')]}),[left,right]);
 const full=combineFeatures(Array(60).fill(.2),[Array(69).fill(.5),Array(69).fill(.7)]);
 const missing=combineFeatures(Array(60).fill(.3),[null,null]),smoothed=smoothCombined(missing,full);
 assert.equal(smoothed[1],0);assert.ok(smoothed.slice(63).every(x=>x===0));
});
test('one vocabulary supports face and two-hand poses; absent unrelated hands do not block face',()=>{
 const m=trainCombined(fixture([pose('face',[8]),pose('both',[75,145])]));
 assert.deepEqual(m.entries.find(e=>e.id==='both').channels.map(c=>c.mask),[1,2]);
 const f=base();f[8]=.8;f[1]=0;f[2]=0;assert.equal(predictCombined(m,f).id,'face');
 const both=base();both[75]=.8;both[145]=.8;assert.equal(predictCombined(m,both).id,'both');
 both[2]=0;assert.notEqual(predictCombined(m,both).id,'both');
 assert.equal(predictCombined(m,base()).id,REST);
});
test('showing an uncalibrated hand is not a learned command',()=>{
 const p=fixture([pose('hand',[75])]);for(const s of [...p.rest,...p.gestures[0].samples.map(s=>s.neutral)])s.vector[1]=0;
 assert.throws(()=>trainCombined(p),/visible resting/);
});
test('temporal matching preserves direction, rejects stationary traces, and tolerates speed',()=>{
 const m=trainCombined(fixture([motion()])),e=m.entries[0],sequence=motion().samples[0].sequence;
 assert.ok(matchMotion(e,resample(sequence,12))<e.limit);
 assert.ok(matchMotion(e,resample(sequence,36))<e.limit);
 assert.ok(matchMotion(e,[...sequence].reverse())>e.limit);
 assert.equal(matchMotion(e,Array.from({length:24},base)),Infinity);
 const lost=sequence.map(v=>[...v]);lost[12][1]=0;assert.equal(matchMotion(e,lost),Infinity);
});
test('a swipe fires once; its return stroke and long endpoint hold do not repeat',()=>{
 const m=trainCombined(fixture([motion()])),g=new CombinedGate(m,450,350),events=[];let t=0;
 const frame=v=>{const out=g.updateFrame(v,t+=70);if(out.event)events.push(out.event);};
 for(let i=0;i<12;i++)frame(base());
 const trace=motion().samples[0].sequence;
 trace.forEach(frame);for(let i=0;i<12;i++)frame(trace.at(-1));
 [...trace].reverse().forEach(frame);for(let i=0;i<12;i++)frame(base());
 assert.deepEqual(events,['swipe']);
 trace.forEach(frame);assert.deepEqual(events,['swipe','swipe']);
});
test('camera gaps require fresh rest and two matching movements abstain',()=>{
 const p=fixture([motion('a'),motion('b')]),g=new CombinedGate(trainCombined(p)),events=[];let t=0;
 for(let i=0;i<10;i++)g.updateFrame(base(),t+=70);
 for(const v of motion().samples[0].sequence){const out=g.updateFrame(v,t+=70);if(out.event)events.push(out.event);}
 assert.deepEqual(events,[]);g.updateFrame(null,t+=70);assert.equal(g.armed,false);
});
test('combined poses need a hold, neutral rearm, and cannot repeat while held',()=>{
 const g=new CombinedGate(trainCombined(fixture([pose('face',[8])]))),v=base();v[8]=.85;let t=0,events=[];
 const frame=v=>{const out=g.updateFrame(v,t+=70);if(out.event)events.push(out.event);};
 for(let i=0;i<10;i++)frame(base());for(let i=0;i<30;i++)frame(v);
 assert.deepEqual(events,['face']);for(let i=0;i<10;i++)frame(base());for(let i=0;i<10;i++)frame(v);
 assert.deepEqual(events,['face','face']);
});

test('face rest cannot arm a newly visible or non-neutral hand swipe',()=>{
 const m=trainCombined(fixture([pose('face',[8]),motion()])),g=new CombinedGate(m),events=[];let t=0;
 const frame=v=>{const out=g.updateFrame(v,t+=70);if(out.event)events.push(out.event);};
 for(let i=0;i<12;i++){const v=base();v[1]=0;frame(v);}
 for(let i=0;i<12;i++){const v=base();v[129]=.55;frame(v);}
 motion().samples[0].sequence.map(v=>{const x=[...v];x[129]+=.25;return x;}).forEach(frame);
 assert.deepEqual(events,[]);
});
test('required tracking uses learned channels; ambiguous hand identity resets masks',()=>{
 const m=trainCombined(fixture([pose('both',[75,145])])),v=base();v[1]=v[2]=0;
 assert.equal(requiredTracking(m,v),false);assert.equal(requiredTracking(m,base()),true);
 const left=[{x:.1,y:.2}],right=[{x:.9,y:.2}];
 assert.deepEqual(stableHandSlots([right,left],[left,right]),[null,null]);
});
test('motion reports progress for scan freezing; a long pose lock needs sustained neutral',()=>{
 const m=trainCombined(fixture([motion(),pose('face',[8])])),g=new CombinedGate(m);let t=0;
 for(let i=0;i<12;i++)g.updateFrame(base(),t+=70);
 const moved=base();moved[129]=.5;g.updateFrame(moved,t+=70);assert.equal(g.motionActive,true);
 const faceGate=new CombinedGate(trainCombined(fixture([pose('face',[8])]))),held=base();held[8]=.85;t=0;
 for(let i=0;i<10;i++)faceGate.updateFrame(base(),t+=70);
 for(let i=0;i<30;i++)faceGate.updateFrame(held,t+=70);
 assert.equal(faceGate.locked.id,'face');faceGate.updateFrame(base(),t+=70);
 assert.equal(faceGate.locked.id,'face');assert.equal(faceGate.armed,false);
});
import {summarizeVisible} from '../dist/src/teaching.js';
import {upgradeFaceProfile} from '../dist/src/storage.js';
import {hand} from './hand-fixture.mjs';
import {extendedHandFeatures} from '../dist/src/camera.js';
import {train,predict} from '../dist/src/core.js';

test('a missed hand frame does not erase the symbol or average absent zeros into a pose',()=>{
 const v=combineFeatures(Array(60).fill(.03),[extendedHandFeatures(hand(2)),null]);
 const frames=Array.from({length:20},()=>[...v]);
 for(const i of [4,9,16]){frames[i][1]=0;frames[i].fill(0,63,132);}
 const s=summarizeVisible(frames);assert.equal(s.vector[1],1);assert.equal(s.coverage[1],.85);
 for(let i=63;i<132;i++){assert.ok(Math.abs(s.vector[i]-v[i])<1e-10);assert.ok(s.spread[i]<1e-10);}
 assert.equal(s.vector[2],0);assert.ok(s.vector.slice(132).every(x=>x===0));
 for(let i=0;i<12;i++)frames[i][1]=0;
 assert.equal(summarizeVisible(frames).vector[1],0);
});

test('existing face examples migrate losslessly, then hand symbols learn in the same profile',()=>{
 const old=createProfile('Existing face vocabulary','face');
 const rest=Array(60).fill(.03),smile=[...rest];smile[5]=.85;
 old.rest=Array.from({length:5},()=>summary(rest));
 old.gestures=[{id:'face',name:'Face signal',action:'select',value:'',samples:Array.from({length:5},()=>summary(smile))}];
 old.trials=[{kind:'attempt',at:'2026-11-07',revision:0,passed:true}];
 const before=JSON.stringify(old),upgraded=upgradeFaceProfile(old);
 assert.equal(JSON.stringify(old),before);assert.equal(upgraded.id,old.id);assert.equal(upgraded.revision,1);
 assert.deepEqual(upgraded.trials,old.trials);assert.deepEqual(upgraded.gestures[0].samples[0].vector.slice(3,63),smile);
 assert.equal(upgradeFaceProfile(upgraded),upgraded);assert.equal(predict(train(old),smile).id,'face');
 const neutral=combineFeatures(rest,[extendedHandFeatures(hand(0)),null]);
 const symbol=combineFeatures(rest,[extendedHandFeatures(hand(2)),null]);
 const samples=Array.from({length:5},()=>{
  const frames=Array.from({length:20},()=>[...symbol]);frames[9][1]=0;frames[9].fill(0,63,132);
  return {...summarizeVisible(frames),neutral:summarizeVisible(Array.from({length:20},()=>neutral))};
 });
 upgraded.gestures.push({id:'hand',name:'Peace sign',action:'insert',value:'hi',kind:'pose',samples});
 const m=trainCombined(upgraded);assert.deepEqual(m.entries[1].channels.map(c=>c.name),['Left hand']);
 assert.equal(predictCombined(m,symbol).id,'hand');assert.equal(predictCombined(m,combineFeatures(smile,[null,null])).id,'face');
 assert.equal(predictCombined(m,neutral).id,REST);
 const noFace=[...symbol];noFace[0]=0;noFace.fill(0,3,63);assert.equal(predictCombined(m,noFace).id,'hand');
 noFace[1]=0;assert.notEqual(predictCombined(m,noFace).id,'hand');
 assert.equal(importProfile(exportProfile(upgraded)).gestures.length,2);
});

test('two-hand teaching works without a face and tolerates brief independent dropouts',()=>{
 const neutral=combineFeatures(null,[extendedHandFeatures(hand(0)),extendedHandFeatures(hand(0,{mirror:true}))]);
 const symbol=combineFeatures(null,[extendedHandFeatures(hand(2)),extendedHandFeatures(hand(5,{mirror:true}))]);
 const p=createProfile('Hands only');p.rest=Array.from({length:5},()=>summary(neutral));
 const frames=Array.from({length:24},()=>[...symbol]);frames[8][1]=0;frames[15][2]=0;
 p.gestures=[{id:'both',name:'Both hands',action:'next',value:'',samples:Array.from({length:5},()=>({...summarizeVisible(frames),neutral:summary(neutral)}))}];
 const m=trainCombined(p);assert.deepEqual(m.entries[0].channels.map(c=>c.mask),[1,2]);
 assert.equal(predictCombined(m,symbol).id,'both');
 const missing=[...symbol];missing[2]=0;assert.notEqual(predictCombined(m,missing).id,'both');
});

test('one badly lost hand example produces a specific retry instead of learning incidental face motion',()=>{
 const p=fixture([pose('hand',[75])]);
 for(const s of p.gestures[0].samples)s.vector[8]=.18;
 const lost=p.gestures[0].samples[2];lost.vector[1]=0;lost.vector.fill(0,63,132);
 assert.throws(()=>trainCombined(p),/Left hand lost tracking in example 3/);
});

test('competing one-hand symbols distinguish each finger count rather than shared extended fingers',()=>{
 const vector=n=>combineFeatures(null,[extendedHandFeatures(hand(n)),null]);
 const p=createProfile('Finger shapes');p.rest=Array.from({length:5},()=>summary(vector(0)));
 p.gestures=Array.from({length:5},(_,k)=>({id:'shape'+(k+1),name:'Shape '+(k+1),action:'insert',value:String(k+1),samples:Array.from({length:5},()=>({...summary(vector(k+1)),neutral:summary(vector(0))}))}));
 const m=trainCombined(p);for(let n=1;n<=5;n++)assert.equal(predictCombined(m,vector(n)).id,'shape'+n);
 assert.equal(predictCombined(m,vector(0)).id,REST);
});

test('a learned two-hand combination wins over a constituent; unrelated simultaneous signals abstain',()=>{
 const p=fixture([pose('left',[75]),pose('both',[75,145]),pose('face',[8])]);
 const m=trainCombined(p),both=base();both[75]=both[145]=.85;
 assert.equal(predictCombined(m,both).id,'both');
 both[2]=0;assert.equal(predictCombined(m,both).id,'left');
 both[8]=.85;assert.equal(predictCombined(m,both).id,UNKNOWN);
});
