import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/__letters.mjs',r=>r.fulfill({path:fileURLToPath(new URL('./letter-fixture.mjs',import.meta.url)),contentType:'text/javascript'}));
 await page.goto('http://localhost:4173/');
 const results=await page.evaluate(async()=>{
  const {LetterRecognizer}=await import('/src/letter-recognizer.js'),{letterStrokes}=await import('/__letters.mjs');
  const r=new LetterRecognizer();await r.load();const results=[];
  for(const jitter of [0,.003])for(const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'){
   const out=await r.recognize(letterStrokes(letter,{jitter}));
   results.push({letter,jitter,top:out.candidates.map(c=>c.letter).join(''),ambiguous:out.ambiguous,ms:Math.round(out.ms)});
  }r.close();return results;
 });
 const top1=results.filter(r=>r.top[0]===r.letter).length,top3=results.filter(r=>r.top.includes(r.letter)).length;
 console.log(JSON.stringify({top1,top3,total:results.length,misses:results.filter(r=>r.top[0]!==r.letter)},null,2));
 assert.ok(top1>=42,'at least 42/52 constructed trace checks should rank the intended letter first');
 assert.ok(top3>=49,'at least 49/52 should offer the intended letter');
 assert.deepEqual(errors,[]);
 console.log('PASS real ONNX model: 26 distinct multi-stroke uppercase paths, two noise levels; this is a smoke test, not live-camera accuracy');
}finally{await browser.close();}
