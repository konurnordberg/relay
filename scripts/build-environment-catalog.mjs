import {writeFile} from 'node:fs/promises';
import {fromTemplate,validateEnvironment,environmentIssues,makeBlock} from '../dist/src/creator-schema.js';
import {upgradeCanvasDocument} from '../dist/src/creator-canvas-editor.js';
import {gridKeys,PAGE_NAMES} from '../dist/src/environments.js';
import {RelayComposer} from '../dist/src/communication.js';
const definitions=[
 ['classic','Classic keyboard','Write with your learned Next and Select gestures. Includes letters, numbers, punctuation, phrases and message controls.',['Default','Learned gestures']],
 ['finger-grid','Finger grid','Hold up 0–5 fingers on each hand to choose a row and column. Five pages include letters, numbers, symbols, phrases and tools.',['Two hands','Finger counts']],
 ['air-letters','Air letters','Draw printed letters with your index fingertip. The local handwriting model suggests letters for you to review and insert.',['Handwriting','Local AI']],
 ['cirrin','Cirrin ring','Trace a word through letters arranged in a circle. Return inward between letters; review your spelling before inserting. Inspired by Cirrin.',['Letter paths','Finger drawing']],
 ['flow','Flow · swipe words','Swipe through a QWERTY arrangement in one continuous stroke. The local word-path model suggests words for insertion.',['Word swiping','Local AI']],
 ['chord','Chord · shortcuts','Choose reusable phrases with two-hand finger counts. Close both fists to arm, then hold a code to select. Customize every phrase in Creator.',['Two hands','Shortcuts']],
];
const stamp=new Date().toISOString();
const docs=definitions.map(([kind,name,description,tags])=>{
 let doc=fromTemplate(kind);
 if(['classic','finger-grid'].includes(kind)){
  const names=['letters','numbers','symbols','phrases','tools'],ids=Object.fromEntries(names.map(n=>[n,crypto.randomUUID()])),composer=new RelayComposer();
  doc.pages=names.map(n=>{const b=makeBlock('grid');b.name=PAGE_NAMES[n];Object.assign(b.input,{source:kind==='classic'?'scan':'finger-pair',model:kind==='classic'?'personal':'hands',holdMs:850});
   b.items=gridKeys(composer,n).map(key=>{let action=key.type,value=key.value||'';if(action==='grid-page'){action='page';value=ids[value];}if(action==='phrase')action='text';if(['bookmark','focus'].includes(action))action='noop';return {id:crypto.randomUUID(),label:key.label,action,value,x:.5,y:.5};});return {id:ids[n],name:PAGE_NAMES[n],blocks:[b]};});
 }
 doc=upgradeCanvasDocument(doc);doc.name=name;doc.description=description;doc.author='konurnordberg';doc.tags=tags;doc.license='private';doc.createdAt=doc.updatedAt=stamp;doc.id='relay-builtin-'+kind+'-v1';
 // Stable component identifiers make reinstalling a catalog item idempotent.
 let i=0;const ids=new Map();const collect=x=>{if(!x||typeof x!=='object')return;if(x.id&&x!==doc)ids.set(x.id,kind+'-'+(++i));for(const v of Object.values(x))if(v&&typeof v==='object')Array.isArray(v)?v.forEach(collect):collect(v);};collect(doc);
 const rewrite=x=>{if(!x||typeof x!=='object')return;for(const [k,v]of Object.entries(x)){if(typeof v==='string'&&ids.has(v))x[k]=ids.get(v);else if(v&&typeof v==='object')Array.isArray(v)?v.forEach(rewrite):rewrite(v);}};rewrite(doc);
 const clean=validateEnvironment(doc),issues=environmentIssues(clean);if(issues.length)throw new Error(kind+': '+issues.join('; '));return clean;
});
await writeFile(new URL('../dist/data/environment-catalog.json',import.meta.url),JSON.stringify(docs,null,2)+'\n');
console.log(docs.map(d=>({id:d.id,name:d.name,author:d.author,pages:d.pages.length})));
