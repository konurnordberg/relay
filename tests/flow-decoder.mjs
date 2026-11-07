import fs from 'node:fs';
import {FlowDecoder,wordPath,resamplePath} from '../dist/src/flow-core.js';
const entries=JSON.parse(fs.readFileSync(new URL('../dist/data/flow-words.json',import.meta.url))),decoder=new FlowDecoder(entries);
const words=entries.filter(([w])=>w.length>=3&&w.length<=14&&!w.includes("'")).filter((_,i)=>i%53===7).slice(0,200).map(([w])=>w);
let top1=0,top3=0;const misses=[],start=performance.now();
for(const word of words){const p=resamplePath(wordPath(word),Number(process.argv[2]||51)).map((p,i)=>({x:p.x+Math.sin(i*1.1+word.length)*.015,y:p.y+Math.cos(i*.7)*.02}));const out=decoder.decode(p);if(out.candidates[0]?.word===word)top1++;if(out.candidates.some(c=>c.word===word))top3++;else misses.push([word,out.candidates.map(c=>c.word)]);}
console.log(JSON.stringify({kind:'constructed-path smoke test, not live-user accuracy',n:words.length,samplesPerWord:Number(process.argv[2]||51),top1,top3,averageMs:(performance.now()-start)/words.length,misses},null,2));