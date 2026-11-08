import {chooseEnvironment} from './environment-picker.mjs';
import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(8000);
const camera=`export class VisionCamera{
 constructor(v,c,frame,state){this.frame=frame;this.state=state;this.canvas=c;}
 async start(mode,deviceId,delegate){this.stop();this.running=true;this.mode=mode;this.handDelegate=delegate;this.state('ready','Camera ready');this.timer=setInterval(()=>{const v=Array(201).fill(.03);v[0]=1;v[1]=v[2]=0;this.frame({vector:v,now:performance.now(),latency:1});const c=this.canvas;c.width=640;c.height=480;const ctx=c.getContext('2d');ctx.fillStyle='#294b3b';ctx.fillRect(0,0,640,480);},40);}
 stop(){clearInterval(this.timer);this.running=false;}setTrails(){}
}`;
await context.route('**/src/camera.js',r=>r.fulfill({body:camera,contentType:'text/javascript'}));
const noOverflow=async label=>{const sizes=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert.ok(sizes.scroll<=sizes.width+1,label+' '+JSON.stringify(sizes));};
const screenshot=async name=>page.screenshot({path:fileURLToPath(new URL('../artifacts/ui/'+name+'.png',import.meta.url)),fullPage:true});
try{
 await page.goto('http://localhost:4173/');assert.equal(await page.locator('h1').innerText(),'Get started');
 assert.equal(await page.getByRole('button',{name:'Signal analyzer',exact:true}).isVisible(),true);
 await page.getByRole('button',{name:'Create a profile',exact:true}).focus();await page.keyboard.press('Enter');
 assert.equal(await page.getByRole('dialog').getAttribute('aria-labelledby'),'dialog-title');
 assert.equal(await page.getByLabel('Profile name').evaluate(el=>el===document.activeElement),true);
 await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Create a profile',exact:true}).evaluate(el=>el===document.activeElement),true);
 await page.getByRole('button',{name:'Create a profile',exact:true}).click();await page.getByLabel('Profile name').fill('Accessible interface test');await page.keyboard.press('Enter');
 await page.locator('[data-nav="profiles"]').click();await page.getByLabel('Text and controls').selectOption('large');await page.reload();
 assert.equal(await page.locator('html').getAttribute('data-text-size'),'large');
 console.log('PASS: keyboard-opened dialogs are labeled, focus the form and return focus on Escape; large text persists');
 for(const size of [[1440,1000],[1024,768],[768,1024],[390,844],[320,740]]){
  await page.setViewportSize({width:size[0],height:size[1]});
  for(const view of ['teach','check','profiles','write']){
   await page.locator('[data-nav="'+view+'"]').click();await noOverflow(size.join('x')+' '+view);
   assert.equal(await page.locator('h1').count(),1);
  }
  for(const environment of ['classic','finger-grid','air-letters','cirrin','flow','chord']){
   await chooseEnvironment(page,environment);await noOverflow(size.join('x')+' '+environment);
  }
 }
 console.log('PASS: all four primary sections and six input methods fit 320–1440px with large text');
 await page.setViewportSize({width:1440,height:1000});await page.locator('[data-nav="profiles"]').click();await page.getByLabel('Text and controls').selectOption('standard');
 await page.locator('[data-nav="teach"]').click();await page.getByRole('button',{name:'Enable camera',exact:true}).click();
 await page.waitForFunction(()=>document.body.dataset.camera==='ready'&&document.querySelector('#signal-name').textContent==='Ready to learn');
 await page.getByRole('button',{name:'Learn my resting state'}).click();
 await page.waitForFunction(()=>document.querySelector('#phase-announcement').textContent.includes('Get ready to rest'));
 const announcements=await page.evaluate(()=>{window.__announceCount=0;window.__observer=new MutationObserver(()=>window.__announceCount++);window.__observer.observe(document.querySelector('#phase-announcement'),{childList:true,subtree:true});return document.querySelector('#phase-announcement').textContent;});
 await page.waitForTimeout(450);assert.equal(await page.evaluate(()=>window.__announceCount),0);
 assert.ok(announcements.includes('Get ready to rest'));
 for(const size of [[1366,768],[1024,768],[390,844],[320,740]]){
  await page.setViewportSize({width:size[0],height:size[1]});await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(100);
  const boxes=await page.evaluate(()=>{const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height};};return {video:box('.camera-view'),cancel:box('#camera-prompt-cancel'),height:innerHeight};});
  assert.ok(boxes.video.top>=0&&boxes.video.bottom<=boxes.height,'visible camera '+JSON.stringify(boxes));
  assert.ok(boxes.cancel.top>=0&&boxes.cancel.bottom<=boxes.height,'visible cancellation '+JSON.stringify(boxes));
  assert.ok(boxes.cancel.height>=44);
 }
 await screenshot('recording-mobile');await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!document.body.classList.contains('teaching-active'));
 console.log('PASS: phase announcements stay quiet between changes; recording camera and cancel remain visible at four sizes; Escape cancels');
 await page.setViewportSize({width:1440,height:1000});await page.locator('[data-nav="teach"]').click();await screenshot('teach-ready');
 await page.locator('[data-nav="write"]').click();await chooseEnvironment(page,'classic');await screenshot('write-final');
 await page.locator('[data-nav="profiles"]').click();await screenshot('settings');
 await page.locator('[data-nav="studio"]').click();await noOverflow('advanced');
 assert.equal(await page.locator('h1').innerText(),'Signal analyzer');
 const missingLabels=await page.locator('button:visible').evaluateAll(buttons=>buttons.filter(b=>!b.textContent.trim()&&!b.getAttribute('aria-label')).length);assert.equal(missingLabels,0);
 assert.deepEqual(errors,[]);console.log('PASS: visible controls have labels; advanced tools remain reachable; no browser errors');
}finally{await browser.close();}
