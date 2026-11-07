import test from 'node:test';
import assert from 'node:assert/strict';
import {ChordBook,ChordGate,chordWords,chordCode,DEFAULT_SHORTCUTS,validShortcuts,CHORD_GROUPS} from '../dist/src/chord-core.js';
import {ChordRace,RACE_SCENARIOS} from '../dist/src/chord-race.js';
import {RelayComposer} from '../dist/src/communication.js';
import {createProfile,exportProfile,importProfile} from '../dist/src/storage.js';
const driver=(gate=new ChordGate())=>{
 let at=0;const events=[];
 const send=(row,col,count=1)=>{let out;for(let i=0;i<count;i++){out=gate.update({row,col},at+=30);if(out.index!==null)events.push(out.index);}return out;};
 return {gate,send,events,get at(){return at;}};
};
test('all 30 chords require neutral, stable code and fresh release; held fists cannot repeat',()=>{
 for(let index=0;index<30;index++){
  const d=driver();const row=Math.floor(index/5),col=index%5+1;
  d.send(row,col,20);d.send(0,0,8);assert.deepEqual(d.events,[]);
  d.send(row,col,9);assert.equal(d.gate.pending,index);
  d.send((row+1)%6,(col%5)+1,4);assert.equal(d.gate.pending,index,'closing counts cannot change the latched code');
  d.send(0,0,15);assert.deepEqual(d.events,[index]);
  d.send(row,col,9);d.send(0,0,6);assert.deepEqual(d.events,[index,index]);
 }
});
test('browsing is nonwriting and fast transitions, duplicate and stale frames cannot arm or commit',()=>{
 const d=driver();d.send(0,0,8);
 for(let bank=0;bank<6;bank++)d.send(bank,0,15);
 assert.equal(d.gate.pending,null);assert.deepEqual(d.events,[]);
 d.send(1,2,3);d.send(1,3,3);assert.equal(d.gate.pending,null);
 d.send(0,1,9);assert.equal(d.gate.pending,0);
 d.send(0,0,1);for(let i=0;i<100;i++)assert.equal(d.gate.update({row:0,col:0},d.at,d.at+50).index,null);
 assert.equal(d.gate.pending,0);
 assert.equal(d.gate.update({row:0,col:0},d.at,d.at+201).index,null);assert.equal(d.gate.pending,null);assert.equal(d.gate.armed,false);
});
test('tracking loss cancels pending text; returning with a code cannot write without neutral',()=>{
 const d=driver();d.send(0,0,8);d.send(5,5,9);assert.equal(d.gate.pending,29);
 d.send(null,null,9);assert.equal(d.gate.pending,null);assert.equal(d.gate.armed,false);
 d.send(5,5,10);d.send(0,0,8);assert.deepEqual(d.events,[]);
 d.send(2,4,9);d.gate.update({row:0,col:0},d.at+400);assert.equal(d.gate.pending,null);assert.equal(d.gate.armed,false);
});
test('shortcuts preserve fixed codes, whitespace and whole-block undo',()=>{
 assert.equal(DEFAULT_SHORTCUTS.length,20);assert.equal(validShortcuts(DEFAULT_SHORTCUTS),true);
 assert.equal(chordCode(0),'0·1');assert.equal(chordCode(29),'5·5');
 const book=new ChordBook(),c=new RelayComposer();
 book.apply(c,book.keys(c)[0]);assert.equal(c.text,'Thanks for the update. ');
 book.apply(c,book.keys(c)[2]);assert.equal(c.text,"Thanks for the update. I'll take a look and get back to you. ");
 book.apply(c,book.keys(c)[24]);assert.equal(c.text,'Thanks for the update. ');
 const custom=DEFAULT_SHORTCUTS.map(s=>({...s}));custom[0]={title:'function',text:'function hello() {\n  return 42;\n}\n',verbatim:true};
 c.text='';book.apply(c,book.keys(c,custom)[0]);assert.equal(c.text,custom[0].text);
 assert.equal(validShortcuts([...custom,custom[0]]),false);custom[0].text='';assert.equal(validShortcuts(custom),false);
});
test('word palette filters ambiguously, honors local words, clears prefixes on insertion and supports all ASCII',()=>{
 const book=new ChordBook(),c=new RelayComposer();book.mode='words';
 const groups=Array.from('project').map(c=>CHORD_GROUPS.findIndex(g=>g.includes(c)));
 assert.ok(chordWords(groups,'').includes('project'));
 assert.deepEqual(chordWords(groups.slice(0,2),'',['prisma'])[0],'prisma');
 assert.ok(chordWords([4,4,4,4]).length===0);
 for(const g of groups)book.apply(c,{kind:'filter',value:g});
 const k=book.keys(c).find(k=>k.value==='project');assert.ok(k);book.apply(c,k);assert.equal(c.text,'project ');assert.equal(book.filters.length,0);
 book.apply(c,{kind:'punctuation',value:'.'});assert.equal(c.text,'project. ');
 c.text='';book.apply(c,{kind:'word',value:'i'});assert.equal(c.text,'I ');
 const characters=new Set();
 for(const caps of [false,true])for(const mode of ['spell','symbols','symbols2']){
  c.caps=caps;book.mode=mode;const keys=book.keys(c);assert.equal(keys.length,30);
  for(const k of keys.filter(k=>['letter','literal'].includes(k.kind))){c.text='';book.apply(c,k);characters.add(c.text);}
 }
 for(let i=32;i<=126;i++)assert.ok(characters.has(String.fromCharCode(i)),'missing '+String.fromCharCode(i));
});
test('speech and clear cannot be bypassed by shortcut insertion',()=>{
 const c=new RelayComposer(),book=new ChordBook();book.apply(c,book.keys(c)[0]);
 book.apply(c,book.keys(c)[29]);assert.equal(c.confirm,'speak');
 book.apply(c,{kind:'shortcut',value:'wrong'});assert.equal(c.text,'Thanks for the update. ');
 assert.equal(book.keys(c).filter(k=>k.kind!=='noop').length,2);
 assert.equal(book.apply(c,book.keys(c)[1]),'speak');
});
test('profile backup roundtrips shorthand and rejects malformed settings or snippets',()=>{
 const p=createProfile('Chord');p.settings.environment='chord';p.settings.chordHoldMs=120;p.chordShortcuts=DEFAULT_SHORTCUTS.map(s=>({...s}));
 p.chordShortcuts[2]={title:'Code',text:'const value = 1;\n',verbatim:true};
 const restored=importProfile(exportProfile(p));assert.deepEqual(restored.chordShortcuts,p.chordShortcuts);assert.equal(restored.settings.chordHoldMs,120);
 p.settings.chordHoldMs=0;assert.throws(()=>exportProfile(p),/chord timing/);p.settings.chordHoldMs=180;
 p.chordShortcuts[0].text='x'.repeat(501);assert.throws(()=>exportProfile(p),/chord shortcuts/);
});
test('speed trial measures exact text with correction time and isolates scenarios and cancelled attempts',()=>{
 const race=new ChordRace();assert.equal(race.start('pointer',0),false);assert.equal(race.start('keyboard',100),true);
 assert.equal(race.select('words'),false);assert.equal(race.update('wrong',1000),false);race.update('',2000);
 assert.equal(race.update(race.target+'x',3000),false);assert.equal(race.update(race.target,60100),true);
 assert.equal(race.completed.keyboard.elapsedMs,60000);assert.equal(race.completed.keyboard.wpm,race.target.length/5);
 assert.equal(race.completed.keyboard.corrections,6);assert.equal(race.completed.camera,undefined);
 race.start('camera',70000);race.cancel();assert.equal(race.update(race.target,71000),false);assert.equal(race.completed.camera,undefined);
 race.start('camera',80000);assert.equal(race.update(race.target+' ',81000),true);assert.ok(race.completed.camera.wpm>race.completed.keyboard.wpm);
 race.select('words');assert.deepEqual(race.completed,{});assert.equal(race.target,RACE_SCENARIOS.words.text);
 race.start('camera',0);assert.equal(race.update(race.target,0),false);
});