import test from 'node:test';
import assert from 'node:assert/strict';
import {ENVIRONMENTS,environmentById,GRID_PAGES,gridKeys,applyGridKey} from '../dist/src/environments.js';
import {countFingers,fingerPair,FingerIndexGate} from '../dist/src/finger-index.js';
import {RelayComposer} from '../dist/src/communication.js';
import {createProfile,exportProfile,importProfile} from '../dist/src/storage.js';
import {hand,pairHands} from './hand-fixture.mjs';
test('classic is default; environment preferences roundtrip without retraining',()=>{
 assert.equal(environmentById(undefined).id,'classic');assert.equal(ENVIRONMENTS.length,6);
 const p=createProfile('Environment');p.settings.environment='finger-grid';p.settings.gridSwap=true;p.settings.gridHoldMs=1200;
 const imported=importProfile(exportProfile(p));assert.equal(imported.settings.environment,'finger-grid');assert.equal(imported.settings.gridSwap,true);
 assert.equal(imported.settings.gridHoldMs,1200);p.settings.environment='unrecognized';assert.throws(()=>exportProfile(p),/environment/);
});
test('every grid has 36 cells; pages reach all ASCII letters, numbers and punctuation',()=>{
 const c=new RelayComposer(),characters=new Set();
 for(const caps of [false,true]){c.caps=caps;for(const page of GRID_PAGES){const keys=gridKeys(c,page);assert.equal(keys.length,36);keys.filter(k=>k.type==='text').forEach(k=>Array.from(k.value).forEach(x=>characters.add(x)));assert.equal(keys[30].type,'delete');assert.equal(keys[31].type,'undo');assert.equal(keys[35].type,'grid-page');}}
 for(let i=32;i<=126;i++)assert.ok(characters.has(String.fromCharCode(i)),'unreachable ASCII '+String.fromCharCode(i));
 const order=[];let page='letters';for(let i=0;i<4;i++){order.push(page);page=applyGridKey(c,gridKeys(c,page)[35],page).page;}assert.deepEqual(order,GRID_PAGES);assert.equal(page,'letters');
});
test('grid actions share message, undo, phrase and speech confirmation and immediate undoable clearing',()=>{
 const c=new RelayComposer();applyGridKey(c,gridKeys(c)[0],'letters');assert.equal(c.text,'a');
 applyGridKey(c,gridKeys(c)[30],'letters');assert.equal(c.text,'');applyGridKey(c,gridKeys(c)[31],'letters');assert.equal(c.text,'a');
 applyGridKey(c,gridKeys(c)[33],'letters');assert.equal(c.confirm,'speak');
 assert.equal(gridKeys(c).filter(k=>k.type!=='noop').length,2);
 applyGridKey(c,{type:'text',value:'X'},'letters');assert.equal(c.text,'a');
 assert.equal(applyGridKey(c,gridKeys(c)[1],'letters').effect,'speak');
 applyGridKey(c,gridKeys(c,'tools')[2],'tools');assert.equal(c.confirm,null);assert.equal(c.text,'');
 applyGridKey(c,{type:'undo'},'letters');assert.equal(c.text,'a');
 applyGridKey(c,gridKeys(c,'phrases')[0],'phrases');assert.equal(c.text,'a Yes.');
 applyGridKey(c,gridKeys(c,'tools')[3],'tools');assert.equal(c.paused,true);assert.equal(gridKeys(c).filter(k=>k.type!=='noop').length,1);
 applyGridKey(c,gridKeys(c)[0],'letters');assert.equal(c.paused,false);
});
test('counts 0–5 including thumb across rotated, scaled and mirrored hands',()=>{
 for(let n=0;n<=5;n++)for(const rotation of [-35,0,35,90])for(const mirror of [false,true]){
  assert.equal(countFingers(hand(n,{rotation,mirror,scale:.7})),n,JSON.stringify({n,rotation,mirror}));
 }
 assert.equal(countFingers(hand(1,{thumbOnly:true})),1);
});
test('bad, cropped, tiny and edge-on geometry abstains; a sideways extended finger still counts',()=>{
 assert.equal(countFingers([]),null);const bad=hand(5);bad[8].x=NaN;assert.equal(countFingers(bad),null);
 const cropped=hand(5);cropped[8].x=1.1;assert.equal(countFingers(cropped),null);
 assert.equal(countFingers(hand(5,{scale:.03})),null);
 const uncertain=hand(1);uncertain[7]={x:.475,y:.36,z:0};uncertain[8]={x:.53,y:.26,z:0};assert.equal(countFingers(uncertain),1);
 const edge=hand(5).map(p=>({...p,x:.5}));assert.equal(countFingers(edge),null);
});
test('preview positions assign row/column independently of detection order; swap and crossings handled',()=>{
 const hands=pairHands(2,4);assert.deepEqual([fingerPair({hands}).row,fingerPair({hands}).col],[2,4]);
 assert.equal(fingerPair({hands:[...hands].reverse()}).row,2);assert.equal(fingerPair({hands},true).row,4);
 assert.equal(fingerPair({hands:[hand(1),hand(2)]}).row,null);assert.equal(fingerPair({hands:[]}).missing,true);
});
test('all 36 index pairs select once per hold and changed pairs can select the next cell',()=>{
 const gate=new FingerIndexGate(600),events=[];let at=0;
 for(let index=0;index<36;index++)for(let j=0;j<15;j++){
  const out=gate.update({row:Math.floor(index/6),col:index%6},at+=100);if(out.index!==null)events.push(out.index);
 }
 assert.deepEqual(events,Array.from({length:36},(_,i)=>i));
});
test('repeat requires release; brief loss, ambiguity, duplicate callbacks and stale frames never duplicate',()=>{
 const gate=new FingerIndexGate(600),events=[];let at=0;const send=p=>{const out=gate.update(p,at+=100);if(out.index!==null)events.push(out.index);};
 const pair={row:0,col:0};for(let i=0;i<10;i++)send(pair);
 for(let i=0;i<2;i++)send({row:null,col:null,missing:true});for(let i=0;i<15;i++)send(pair);
 for(let i=0;i<10;i++)send({row:null,col:null,missing:false});for(let i=0;i<10;i++)send(pair);
 assert.deepEqual(events,[0]);
 for(let i=0;i<5;i++)send({row:null,col:null,missing:true});for(let i=0;i<10;i++)send(pair);
 assert.deepEqual(events,[0,0]);
 gate.reset();const first=at;gate.update(pair,first);for(let i=0;i<50;i++)assert.equal(gate.update(pair,first,first+100).index,null);
 assert.equal(gate.update(pair,first,first+1000).index,null);
 gate.update(pair,at+=2000);assert.equal(gate.progress,0);
});
test('page changes cannot repeatedly fire while the navigation pair remains held',()=>{
 const gate=new FingerIndexGate(600),c=new RelayComposer();let page='letters',at=0;
 for(let i=0;i<40;i++){const out=gate.update({row:5,col:5},at+=100);if(out.index!==null)page=applyGridKey(c,gridKeys(c,page)[out.index],page).page;}
 assert.equal(page,'numbers');
});
