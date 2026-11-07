import test from 'node:test';
import assert from 'node:assert/strict';
import {VisionLane} from '../dist/src/vision-lane.js';
import {VisionCamera} from '../dist/src/camera.js';
const property=(t,key,value)=>{const old=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});t.after(()=>old?Object.defineProperty(globalThis,key,old):delete globalThis[key]);};
const flush=()=>new Promise(r=>setImmediate(r));
class FakeWorker{
 static instances=[];
 constructor(){this.messages=[];FakeWorker.instances.push(this);}
 postMessage(data){this.messages.push(data);}
 terminate(){this.terminated=true;}
 receive(data){this.onmessage({data});}
}
test('worker lanes process latest frames without queuing, duplicates or face blocking',async t=>{
 property(t,'Worker',FakeWorker);
 property(t,'createImageBitmap',async()=>({close(){}}));
 const results=[],errors=[],hand=new VisionLane('hand',x=>results.push(x),x=>errors.push(x));
 const face=new VisionLane('face',()=>{},x=>errors.push(x));
 try{
  const start=hand.start();hand.worker.receive({type:'ready',delegate:'GPU'});await start;
  const faceStart=face.start();face.worker.receive({type:'ready',delegate:'GPU'});await faceStart;
  assert.equal(face.offer({},1,1),true); // face stays busy for the entire test
  assert.equal(hand.offer({},1,1),true);
  for(let i=2;i<20;i++)assert.equal(hand.offer({},i,i*16),false);
  await flush();assert.equal(hand.worker.messages.filter(x=>x.type==='frame').length,1);
  hand.worker.receive({type:'result',id:1});
  assert.equal(hand.offer({},1,321),false,'do not reprocess an already submitted video frame');
  assert.equal(hand.offer({},20,322),true,'take newest frame, skipping the old backlog');
  await flush();assert.equal(hand.worker.messages.at(-1).capturedAt,322);
  assert.equal(face.busy,true);assert.equal(results.length,1);assert.deepEqual(errors,[]);
 }finally{hand.close();face.close();}
});
test('stopping during bitmap capture closes late images and never posts another frame',async t=>{
 property(t,'Worker',FakeWorker);let resolve,closed=false;
 property(t,'createImageBitmap',()=>new Promise(r=>resolve=r));
 const lane=new VisionLane('hand',()=>assert.fail('late result'),()=>{}),start=lane.start();
 lane.worker.receive({type:'ready'});await start;lane.offer({},1,1);lane.close();
 resolve({close(){closed=true;}});await flush();
 assert.equal(closed,true);assert.equal(lane.worker.terminated,true);
 assert.equal(lane.worker.messages.length,1);
});
test('worker failures propagate for fallback and startup failures reject',async t=>{
 property(t,'Worker',FakeWorker);
 const errors=[],lane=new VisionLane('hand',()=>{},e=>errors.push(e.message));
 const start=lane.start();lane.worker.receive({type:'error',message:'no GPU'});
 await assert.rejects(start,/no GPU/);lane.close();
 const ready=new VisionLane('hand',()=>{},e=>errors.push(e.message)),promise=ready.start();
 ready.worker.receive({type:'ready'});await promise;
 ready.worker.receive({type:'error',message:'lost context'});ready.close();
 assert.deepEqual(errors,['lost context']);
});
test('camera drops stale worker results, expires recognition and ignores stopped sessions',()=>{
 const frames=[],camera=new VisionCamera({}, {},x=>frames.push(x),()=>{});
 camera.running=true;camera.mode='combined';camera.session=4;
 const now=performance.now(),points=Array.from({length:21},(_,i)=>({x:.4+i*.005,y:.5+i*.005,z:0}));
 const result={landmarks:[points],handedness:[[{categoryName:'Left',score:.99}]]};
 camera.receive({kind:'hand',result,capturedAt:now-500,computeMs:2},4);
 assert.equal(frames.length,0);
 camera.receive({kind:'hand',result,capturedAt:now,computeMs:2},4);
 assert.ok(frames.at(-1).vector);assert.equal(frames.at(-1).tracking.hands,1);
 camera.emit(now+201);assert.equal(frames.at(-1).vector,null);
 const count=frames.length;camera.receive({kind:'hand',result,capturedAt:now,computeMs:2},3);
 assert.equal(frames.length,count);
 // Visual gap bridging never supplies reconstructed positions to recognition.
 camera.trails.setEnabled(true);camera.trails.update([points],now);camera.emit(now+300);
 assert.equal(frames.at(-1).vector,null);
});
