import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await context.route('**/src/camera.js',r=>r.fulfill({contentType:'text/javascript',body:`export class VisionCamera{
 constructor(v,c,onFrame,onState){this.frame=onFrame;this.state=onState;this.canvas=c;}
 async start(){this.stop();this.state('ready','Controlled movement fixture');
 window.__motion=null;this.timer=setInterval(()=>{
  const v=Array(201).fill(.03);v[0]=v[1]=1;v[2]=0;v[129]=v[130]=.3;
  if(window.__motion){const {index,sign,start}=window.__motion;v[index]+=.4*sign*Math.min(1,(performance.now()-start)/800);}
  this.frame({vector:v,now:performance.now(),latency:1});
  const c=this.canvas;c.width=640;c.height=480;const ctx=c.getContext('2d');ctx.fillStyle='#274b3b';ctx.fillRect(0,0,640,480);ctx.fillStyle='#cde9ba';ctx.font='25px sans-serif';ctx.fillText('CONTROLLED CAMERA FIXTURE',95,230);
 },40);}
 stop(){clearInterval(this.timer);}setTrails(){}
}`}));
try{
 await page.goto('http://localhost:4173/');
 await page.evaluate(async()=>{
  const {createProfile}=await import('/src/storage.js'),{summarize}=await import('/src/core.js');
  const base=()=>{const v=Array(201).fill(.03);v[0]=v[1]=1;v[2]=0;v[129]=v[130]=.3;return v;};
  const summary=v=>({vector:v,spread:v.map(()=>.002),frames:20});
  const profile=createProfile('Movement writing QA');profile.settings.mode='auto';profile.rest=Array.from({length:10},()=>summary(base()));
  profile.gestures=[['right','Swipe right','h',129,1],['up','Swipe up','i',130,-1]].map(([id,name,value,index,sign])=>({id,name,value,action:'insert',kind:'motion',enabled:true,samples:Array.from({length:5},(_,j)=>{
   const sequence=Array.from({length:24},(_,k)=>{const v=base();v[index]+=.4*sign*Math.min(1,k/(14+j));return v;});
   return {...summarize(sequence),neutral:summary(base()),sequence,durationMs:2400};
  })}));
  localStorage.setItem('relay.profiles.v1',JSON.stringify([profile]));
 });
 await page.reload();await page.getByRole('button',{name:'Enable camera'}).click();
 await page.waitForFunction(()=>document.querySelector('#signal-name').textContent==='Resting');
 await page.getByRole('button',{name:'Write & speak',exact:true}).first().click();
 assert.equal(await page.locator('.writing-mappings').getByText('Movement',{exact:true}).count(),2);
 await page.getByRole('button',{name:'Use my gestures',exact:true}).click();
 await page.getByRole('button',{name:'Stop camera input',exact:true}).waitFor();
 const focus=await page.locator('#focus-label').innerText();await page.waitForTimeout(1600);
 assert.equal(await page.locator('#focus-label').innerText(),focus,'direct-only writing must not start auto scanning');
 const move=async(index,sign)=>{
  await page.evaluate(()=>window.__motion=null);await page.waitForTimeout(600);
  await page.evaluate(({index,sign})=>window.__motion={index,sign,start:performance.now()},{index,sign});
  await page.waitForTimeout(1600);
 };
 await move(129,1);assert.equal(await page.locator('#message').innerText(),'h');
 await page.waitForTimeout(900);assert.equal(await page.locator('#message').innerText(),'h','held endpoint must not repeat text');
 await move(130,-1);assert.equal(await page.locator('#message').innerText(),'hi');
 await page.evaluate(()=>window.__motion=null);await page.waitForTimeout(700);
 await page.getByRole('button',{name:'Stop camera input',exact:true}).click();
 await page.screenshot({path:fileURLToPath(new URL('../artifacts/movement-writing.png',import.meta.url)),fullPage:true});
 console.log('PASS: two learned movements write hi without Select/Next; no repeat and no idle scanning');
 await page.getByText('Gesture controls',{exact:true}).click();await page.getByRole('button',{name:'Teach a writing movement',exact:true}).click();
 assert.equal(await page.getByLabel('How do you perform it?').inputValue(),'motion');
 assert.equal(await page.getByLabel('What should it do?').inputValue(),'insert');
 assert.ok(await page.locator('#insert-text-field').isVisible());
 await page.getByRole('button',{name:'Close dialog',exact:true}).click();
 await page.getByRole('button',{name:'Retrain',exact:true}).first().click();
 await page.waitForFunction(()=>document.body.classList.contains('teaching-active'));
 const checkVisible=async label=>{
  const boxes=await page.evaluate(()=>{
   const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};};
   return {camera:rect('.camera-view'),prompt:rect('#camera-prompt'),cancel:rect('#camera-prompt-cancel'),height:innerHeight,width:innerWidth,scrollWidth:document.documentElement.scrollWidth};
  });
  for(const [name,b] of Object.entries(boxes).filter(([k])=>['camera','prompt','cancel'].includes(k))){assert.ok(b.top>=0&&b.bottom<=boxes.height,label+' '+name+' must remain in viewport '+JSON.stringify(boxes));assert.ok(b.left>=0&&b.right<=boxes.width);}
  assert.ok(boxes.scrollWidth<=boxes.width+1,label+' horizontal overflow');
 };
 for(const viewport of [{width:1366,height:768},{width:1024,height:600},{width:390,height:844},{width:390,height:640}]){
  await page.setViewportSize(viewport);await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(450);
  await checkVisible(JSON.stringify(viewport));
  const title=await page.locator('#camera-prompt-title').innerText();assert.ok(title.length>0);
  if(viewport.height===768||viewport.height===844)await page.screenshot({path:fileURLToPath(new URL('../artifacts/teaching-'+viewport.width+'.png',import.meta.url)),fullPage:false});
 }
 await page.locator('#camera-prompt-cancel').click();
 assert.equal(await page.evaluate(()=>document.body.classList.contains('teaching-active')),false);
 await page.getByRole('button',{name:'Turn camera off'}).click();
 assert.equal(await page.evaluate(()=>document.body.classList.contains('camera-docked')),false);
 await page.reload();await page.getByRole('button',{name:'Write & speak',exact:true}).first().click();
 assert.equal(await page.locator('#message').innerText(),'hi');
 assert.deepEqual(errors,[]);console.log('PASS: movement shortcut defaults, persistent camera/instructions at four viewport sizes, cancellation, dock cleanup and draft reload');
}finally{await browser.close();}
