import test from 'node:test';
import assert from 'node:assert/strict';
import {RingTrace,RING_LETTERS,letterPoint,ringSuggestions,wordInsertion} from '../dist/src/cirrin-core.js';
import {CirrinInput} from '../dist/src/cirrin-input.js';
import {RelayComposer} from '../dist/src/communication.js';
import {createProfile,exportProfile,importProfile} from '../dist/src/storage.js';
import {hand} from './hand-fixture.mjs';
function driver(trace,pointer=false){let t=0;return (p,down=true,n=3)=>{for(let i=0;i<n;i++)trace.sample(p,down,t+=30,{pointer});return t;};}
const center={x:.5,y:.5};
test('all 26 sectors spell exactly, with a single continuous word stroke',()=>{
 const trace=new RingTrace(),sample=driver(trace);sample(center);
 for(const c of RING_LETTERS){sample(letterPoint(c));sample(center);}
 assert.equal(trace.word,RING_LETTERS);sample(center,false,8);assert.equal(trace.phase,'review');
});
test('held letters do not repeat; inward travel repeats letters; adjacent ring visits are allowed',()=>{
 const trace=new RingTrace(),sample=driver(trace);sample(center);sample(letterPoint('h'),true,60);assert.equal(trace.word,'h');
 sample(center);sample(letterPoint('e'));sample(center);sample(letterPoint('l'));sample(center);sample(letterPoint('l'));sample(center);sample(letterPoint('o'));
 assert.equal(trace.word,'hello');
 const next=new RingTrace(),send=driver(next);send(center);send(letterPoint('a'));send(letterPoint('b'));assert.equal(next.word,'ab');
});
test('letter boundaries, outside starts and stale frames cannot invent letters',()=>{
 const trace=new RingTrace(),sample=driver(trace);sample(letterPoint('a'));assert.equal(trace.word,'');
 sample(center);const a=Math.PI/26-Math.PI/2;
 for(let i=0;i<50;i++){const j=a+(i%2?.002:-.002);sample({x:.5+.41*Math.cos(j),y:.5+.41*Math.sin(j)},true,1);}
 assert.equal(trace.word,'');sample(letterPoint('a'));assert.equal(trace.word,'a');
 trace.sample(letterPoint('z'),true,0);assert.equal(trace.word,'a');
});
test('tracking gaps finish an interrupted draft; release is needed before a new stroke',()=>{
 const trace=new RingTrace(),sample=driver(trace);sample(center);sample(letterPoint('h'));
 trace.sample(center,true,2000);assert.equal(trace.phase,'review');assert.equal(trace.interrupted,true);
 trace.sample(letterPoint('i'),true,2030);assert.equal(trace.word,'h');
 trace.sample(center,false,2060);trace.sample(center,true,2090);trace.sample(letterPoint('i'),true,2120);trace.sample(letterPoint('i'),true,2150);trace.sample(letterPoint('i'),true,2180);
 assert.equal(trace.word,'i');
});
test('pointer releases are explicit; memory and word length are bounded',()=>{
 const trace=new RingTrace(),sample=driver(trace,true);sample(center);sample(letterPoint('a'));sample(center,false,1);assert.equal(trace.phase,'review');
 trace.reset();for(let i=0;i<40;i++)trace.append('z');assert.equal(trace.word.length,32);trace.removeLast();assert.equal(trace.word.length,31);
});
test('literal spelling remains first, including names outside the vocabulary',()=>{
 assert.equal(ringSuggestions('konur',['hello','help'])[0].word,'konur');
 const options=ringSuggestions('hellp',['hello','help','hello']);assert.equal(options[0].word,'hellp');assert.ok(options.some(x=>x.word==='hello'));
 assert.deepEqual(ringSuggestions('',[]),[]);assert.equal(ringSuggestions('a',['i']).length,1);
});
test('whole-word insertion adds spacing and undo removes the word in one action',()=>{
 const c=new RelayComposer();c.apply({type:'text',value:'hello'});
 c.apply({type:'text',value:wordInsertion(c.text,'relay')});assert.equal(c.text,'hello relay ');
 c.apply({type:'undo'});assert.equal(c.text,'hello');
 assert.equal(wordInsertion('hello ','world',true),'WORLD ');
 const p=createProfile('Cirrin');p.settings.environment='cirrin';p.settings.cirrinGain=2.4;
 const imported=importProfile(exportProfile(p));assert.equal(imported.settings.environment,'cirrin');assert.equal(imported.settings.cirrinGain,2.4);
 p.settings.cirrinGain=10;assert.throws(()=>exportProfile(p),/range/);
});
test('thumbs-up confirms only reviewed words with sustained fresh tracking',()=>{
 const inserted=[],input=new CirrinInput(()=>input.choices([]),word=>inserted.push(word));
 input.trace.append('h');input.choices([]);
 const frame=t=>({hands:[hand(1,{thumbOnly:true})],handFrameAt:t,now:t,handAspect:4/3});
 input.update(frame(100),true);input.update(frame(1200),true);assert.deepEqual(inserted,[]);
 for(let t=1230;t<=2130;t+=30)input.update(frame(t),true);
 assert.deepEqual(inserted,['h']);for(let t=2160;t<3300;t+=30)input.update(frame(t),true);assert.deepEqual(inserted,['h']);
});
