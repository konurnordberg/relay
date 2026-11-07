import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
await context.route('**/src/camera.js',r=>r.fulfill({contentType:'text/javascript',body:
`export class VisionCamera{
 constructor(v,c,onFrame,onState){this.frame=onFrame;this.state=onState;}
 async start(){this.stop();this.state('ready','Synthetic combined fixture');let phase='',start=0;
 this.timer=setInterval(()=>{
  const now=performance.now(),title=document.querySelector('.record-panel h3')?.textContent||'';
  if(title!==phase){phase=title;start=now;}
  const v=Array(201).fill(.03);v[0]=v[1]=v[2]=1;v[129]=.3;
  if(title.startsWith('Now: Finger swipe'))v[129]=.3+.4*Math.min(1,(now-start)/850);
  if(window.__swipeStart)v[129]=.3+.4*Math.min(1,(now-window.__swipeStart)/850);
  this.frame({vector:v,now,latency:1});
 },55);}
 stop(){clearInterval(this.timer);}
}`}));
try{
 await page.goto('http://localhost:4173/');
 await page.getByRole('button',{name:'Create your voice',exact:true}).click();
 assert.equal(await page.getByLabel('Camera input').count(),0);
 await page.getByLabel('Profile name').fill('Combined motion QA');
 await page.getByRole('button',{name:'Start my setup'}).click();
 await page.getByRole('button',{name:'Enable camera'}).click();
 await page.waitForFunction(()=>document.querySelector('#signal-name').textContent==='Ready to learn');
 await page.getByRole('button',{name:'Learn my resting state'}).click();
 await page.getByRole('button',{name:'Record rest again'}).waitFor({timeout:22000});
 await page.getByRole('button',{name:'Add a gesture'}).click();
 await page.getByLabel('Gesture name').fill('Finger swipe');
 await page.getByLabel('How do you perform it?').selectOption('motion');
 assert.equal(await page.locator('#insert-text-field').isVisible(),false);
 await page.getByLabel('What should it do?').selectOption('insert');
 assert.equal(await page.locator('#insert-text-field').isVisible(),true);
 await page.getByLabel('What should it do?').selectOption('select');
 await page.getByRole('button',{name:'Add & record'}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('relay.profiles.v1'))[0].gestures[0]?.samples.length===5,null,{timeout:45000});
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('relay.profiles.v1'))[0]);
 await fs.writeFile(new URL('../artifacts/combined-fixture.json',import.meta.url),JSON.stringify(saved));
 assert.equal(saved.modality,'combined');assert.equal(saved.gestures[0].kind,'motion');
 assert.equal(saved.gestures[0].samples[0].sequence.length,24);
 assert.equal(saved.gestures[0].samples[0].neutral.vector.length,201);
 await page.getByRole('button',{name:'Signal studio',exact:true}).click();
 await page.getByText('Recorded movement',{exact:true}).waitFor();
 await page.waitForFunction(()=>document.querySelector('#live-insights .decision-state'));
 await page.screenshot({path:fileURLToPath(new URL('../artifacts/combined-studio.png',import.meta.url)),fullPage:true});
 await page.getByRole('button',{name:'Write & speak',exact:true}).first().click();
 await page.getByRole('button',{name:'Use my gestures',exact:true}).click();
 await page.waitForTimeout(700);
 await page.evaluate(()=>window.__swipeStart=performance.now());
 await page.waitForTimeout(450);
 const during=await page.locator('#focus-label').innerText();
 await page.waitForTimeout(350);
 assert.equal(await page.locator('#focus-label').innerText(),during,'scan highlight moved during swipe');
 await page.waitForTimeout(800);
 assert.match(await page.locator('#focus-label').innerText(),/^[a-z]$/,'completed swipe must choose a row');
 await page.evaluate(()=>window.__swipeStart=0);
 await page.waitForTimeout(700);
 await page.getByRole('button',{name:'Stop camera input',exact:true}).click();
 await page.reload();
 await page.getByRole('button',{name:'Write & speak',exact:true}).first().click();
 assert.equal(await page.getByRole('button',{name:'Use my gestures',exact:true}).isEnabled(),true);
 assert.deepEqual(errors,[]);
 console.log('PASS: all-signals setup, conditional text field, five movement captures with neutral, motion diagnostics, scanning freeze, swipe selection and reload');
 await fs.writeFile(new URL('../artifacts/combined-browser-results.json',import.meta.url),JSON.stringify({passed:true,input:'Synthetic combined feature stream; not human recognition accuracy',checks:8,errors},null,2));
}finally{await browser.close();}
