import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:950}});
const stub=`export class VisionCamera{
 constructor(video,canvas,onFrame,onState){this.onFrame=onFrame;this.onState=onState;}
 async start(){this.stop();window.__inputClass=0;this.onState('ready','Synthetic test input — not a real camera');let last=0;
 this.timer=setInterval(()=>{const title=document.querySelector('.record-panel h2')?.textContent||'';let c=window.__inputClass;
 if(title.startsWith('Now:'))last=title.includes('Select signal')?1:2;
 if(title.startsWith('Now:')||title==='Hold your gesture')c=last;
 else if(title)c=0;
 const t=performance.now(),v=Array(201).fill(0.03).map((x,i)=>x+Math.sin(t/123+i)*.003);
 v[0]=1;v[1]=0;v[2]=0;if(c===1)v[5]=.83;if(c===2)v[6]=.83;if(c===3)v.fill(2);
 this.onFrame({vector:c===4?null:v,now:t,latency:1});},50);}
 stop(){clearInterval(this.timer);}
}`;
await context.route('**/src/camera.js',r=>r.fulfill({contentType:'text/javascript',body:stub}));
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
try{
 await page.goto('http://localhost:4173/');
 await page.getByRole('button',{name:'Create a profile',exact:true}).click();
 await page.getByLabel('Profile name').fill('Synthetic integration fixture');
 await page.getByRole('button',{name:'Start setup'}).click();
 await page.getByRole('button',{name:'Enable camera'}).click();
 await page.waitForFunction(()=>document.querySelector('#signal-name').textContent==='Ready to learn');
 await page.getByRole('button',{name:'Learn my resting state'}).click();
 await page.getByRole('button',{name:'Record rest again'}).waitFor({state:'attached',timeout:22000});
 console.log('PASS: guided resting capture saves usable feature examples');
 for(const name of ['Select signal','Next signal']){
  await page.getByRole('button',{name:'Add a gesture'}).click();
  await page.getByLabel('Gesture name').fill(name);
  await page.getByRole('button',{name:'Add & record'}).click();
  await page.waitForFunction(name=>JSON.parse(localStorage.getItem('relay.profiles.v1'))[0].gestures.find(g=>g.name===name)?.samples.length===5,name,{timeout:40000});
  await page.getByRole('button',{name:'Check my gestures'}).waitFor();
  console.log('PASS: five independent training captures for '+name);
 }
 await page.getByRole('button',{name:'Write & speak',exact:true}).click();
 await page.getByRole('button',{name:'Use my gestures',exact:true}).click();
 const gesture=async n=>{await page.evaluate(()=>window.__inputClass=0);await page.waitForTimeout(500);await page.evaluate(n=>window.__inputClass=n,n);await page.waitForTimeout(650);};
 await gesture(1);await gesture(1);
 assert.equal(await page.locator('#message').innerText(),'a');
 await gesture(1);await gesture(2);await gesture(1);
 assert.equal(await page.locator('#message').innerText(),'ab');
 await page.waitForTimeout(1000);assert.equal(await page.locator('#message').innerText(),'ab');
 await gesture(3);assert.equal(await page.locator('#message').innerText(),'ab');
 await gesture(4);await page.evaluate(()=>window.__inputClass=1);await page.waitForTimeout(800);assert.equal(await page.locator('#message').innerText(),'ab');
 console.log('PASS: trained gestures write ab; holds do not repeat; unknown and lost tracking do not type');
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export',exact:true}).click()]);
 const path=await download.path(),exported=JSON.parse(await fs.readFile(path,'utf8'));
 assert.equal(exported.gestures.length,2);assert.equal(exported.gestures[0].samples.length,5);
 await page.reload();await page.getByRole('button',{name:'Write & speak',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Use my gestures',exact:true}).isEnabled(),true);
 console.log('PASS: calibrated profile export and reload rebuild recognizer');
 assert.deepEqual(errors,[]);
 await fs.writeFile(new URL('../artifacts/integration-results.json',import.meta.url),JSON.stringify({passed:true,checks:6,input:'Synthetic 60-dimensional feature vectors; no real-world accuracy claim',errors},null,2));
}finally{await browser.close();}

