import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const fixture=JSON.parse(await fs.readFile(new URL('../artifacts/combined-fixture.json',import.meta.url),'utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(p=>localStorage.setItem('relay.profiles.v1',JSON.stringify([p])),fixture);
await page.route('**/src/camera.js',r=>r.fulfill({contentType:'text/javascript',body:
`export class VisionCamera{
 constructor(v,c,onFrame,onState){this.frame=onFrame;this.state=onState;}
 async start(){this.stop();this.state('ready','Synthetic motion regression');this.timer=setInterval(()=>{
 const v=Array(201).fill(.03);v[0]=v[1]=v[2]=1;v[129]=.3;
 if(window.__swipe)v[129]+=.4*Math.min(1,(performance.now()-window.__swipe)/850);
 this.frame({vector:v,now:performance.now(),latency:1});},55);}
 stop(){clearInterval(this.timer);}
}`}));
try{
 await page.goto('http://localhost:4173/');
 await page.getByRole('button',{name:'Enable camera'}).click();
 await page.locator('.nav-more').evaluate(el=>el.open=true);await page.getByRole('button',{name:'Signal details',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#live-insights .decision-state'));
 await page.getByText('Uses Left hand',{exact:false}).waitFor();
 assert.equal(await page.getByText('0.0× acceptance-radius separation',{exact:false}).count(),0);
 await page.screenshot({path:fileURLToPath(new URL('../artifacts/combined-studio.png',import.meta.url)),fullPage:true});
 await page.getByRole('button',{name:'Write & speak',exact:true}).first().click();
 await page.getByRole('button',{name:'Use my gestures',exact:true}).click();
 await page.waitForTimeout(650);
 await page.evaluate(()=>window.__swipe=performance.now());
 await page.waitForTimeout(450);const focus=await page.locator('#focus-label').innerText();
 await page.waitForTimeout(350);assert.equal(await page.locator('#focus-label').innerText(),focus);
 await page.waitForTimeout(700);assert.match(await page.locator('#focus-label').innerText(),/^[a-z]$/);
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByRole('button',{name:'New profile',exact:false}).click();
 await page.screenshot({path:fileURLToPath(new URL('../artifacts/combined-setup.png',import.meta.url)),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:fileURLToPath(new URL('../artifacts/combined-mobile.png',import.meta.url)),fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS: final motion state, endpoint-only selection, scan freeze, diagnostic copy, new profile dialog and mobile layout');
}finally{await browser.close();}
