import {chooseEnvironment} from './environment-picker.mjs';
import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await context.route('**/__hand_fixture.mjs',r=>r.fulfill({path:fileURLToPath(new URL('./hand-fixture.mjs',import.meta.url)),contentType:'text/javascript'}));
await context.route('**/src/camera.js',r=>r.fulfill({contentType:'text/javascript',body:`import {pairHands} from '/__hand_fixture.mjs';
export class VisionCamera{
 constructor(v,c,onFrame,onState){this.frame=onFrame;this.state=onState;this.canvas=c;}
 async start(mode,device,delegate){this.stop();this.running=true;this.mode=mode;this.handDelegate=delegate;(window.__delegates??=[]).push(delegate);(window.__cameraModes??=[]).push(mode);this.state('ready','Controlled hand geometry');
 this.timer=setInterval(()=>{const now=performance.now(),pair=window.__pair,hands=pair?pairHands(...pair):[];const v=Array(mode==='face'?60:201).fill(.03);if(mode!=='face'){v[0]=1;v[1]=v[2]=hands.length?1:0;}v[8]=window.__face||.03;
 this.frame({vector:v,hands,handFrameAt:now,handAspect:4/3,now,latency:1});const c=this.canvas;c.width=640;c.height=480;const ctx=c.getContext('2d');ctx.fillStyle='#254a38';ctx.fillRect(0,0,640,480);ctx.fillStyle='#cbefaf';ctx.font='23px sans-serif';ctx.fillText('CONTROLLED HAND FIXTURE',112,232);
 },40);}
 stop(){this.running=false;clearInterval(this.timer);}setTrails(){}
}`}));
const coord=(r,c)=>page.locator('.finger-key[data-index="'+(r*6+c)+'"]');
const hold=async(row,col)=>{await page.evaluate(pair=>window.__pair=pair,[row,col]);await page.waitForTimeout(1150);};
try{
 await page.goto('http://localhost:4173/');await page.getByRole('button',{name:'Open keyboard'}).click();
 assert.equal(await page.locator('[data-action="choose-environment"]').getAttribute('data-environment'),'classic');
 await page.getByRole('button',{name:'z',exact:true}).click();
 await chooseEnvironment(page,'finger-grid');
 assert.equal(await page.locator('.finger-key').count(),36);assert.equal(await page.locator('#message').inputValue(),'z');
 await page.getByRole('button',{name:'Grid settings',exact:true}).click();await page.getByLabel('Finger selection hold').selectOption('600');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Start finger input',exact:true}).click();
 await hold(1,1);assert.equal(await page.locator('#message').inputValue(),'zh');
 await page.waitForTimeout(1000);assert.equal(await page.locator('#message').inputValue(),'zh');
 await hold(1,2);assert.equal(await page.locator('#message').inputValue(),'zhi');
 await hold(5,5);assert.match(await page.locator('.finger-page-heading strong').innerText(),/Numbers/);
 await page.waitForTimeout(1200);assert.equal(await page.locator('.finger-page-heading strong').innerText(),'Numbers');
 await hold(0,3);assert.equal(await page.locator('#message').inputValue(),'zhi3');
 await hold(5,0);assert.equal(await page.locator('#message').inputValue(),'zhi');
 await hold(5,1);assert.equal(await page.locator('#message').inputValue(),'zhi3');
 await hold(5,3);assert.equal(await coord(0,1).innerText(),'Speak now');
 assert.equal(await page.locator('.finger-key:enabled').count(),2);await hold(0,0);
 assert.equal(await page.locator('#message').inputValue(),'zhi3');
 console.log('PASS: raw hand geometry → finger counts → hi + number, one event per hold, paging, delete/undo, speech confirmation');
 await page.evaluate(()=>window.__pair=[2,3]);await page.getByRole('button',{name:'Pause finger input',exact:true}).click();
 await page.waitForTimeout(1200);assert.equal(await page.locator('#message').inputValue(),'zhi3');
 for(const viewport of [{width:1366,height:900},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.locator('.finger-table').scrollIntoViewIfNeeded();await page.waitForTimeout(250);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.equal(await page.locator('.finger-table tbody tr').count(),6);assert.equal(await page.locator('.finger-key').count(),36);
  if(viewport.width===390){const box=await page.locator('.camera-view').boundingBox();assert.ok(box.y>=0&&box.y+box.height<844);assert.equal(await page.locator('#finger-camera-text').innerText(),'zhi3');
   assert.ok(await coord(0,0).evaluate(b=>{const r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'camera dock must not cover the first row');
  }
  await page.screenshot({path:fileURLToPath(new URL('../artifacts/finger-grid-'+viewport.width+'.png',import.meta.url)),fullPage:viewport.width>500});
 }
 await page.setViewportSize({width:1366,height:900});
 await chooseEnvironment(page,'classic');assert.equal(await page.locator('#message').inputValue(),'zhi3');
 assert.ok(await page.getByRole('button',{name:'Next',exact:true}).isVisible());
 await chooseEnvironment(page,'finger-grid');await page.reload();
 await page.getByRole('button',{name:'Write & speak',exact:true}).first().click();
 assert.equal(await page.locator('[data-action="choose-environment"]').getAttribute('data-environment'),'finger-grid');assert.equal(await page.locator('#message').inputValue(),'zhi3');
 // A calibrated Classic gesture must not execute alongside finger coordinates.
 await page.evaluate(async()=>{
  const {createProfile}=await import('/src/storage.js');const p=createProfile('Input isolation');p.settings.environment='finger-grid';
  const base=()=>{const v=Array(201).fill(.03);v[0]=1;v[1]=v[2]=0;return v;};
  const sample=v=>({vector:v,spread:v.map(()=>.002),frames:20});p.rest=Array.from({length:5},()=>sample(base()));
  p.gestures=[{id:'face-text',name:'Face text',action:'insert',value:'BAD',kind:'pose',enabled:true,samples:Array.from({length:5},()=>{const v=base();v[8]=.85;return {...sample(v),neutral:sample(base())};})}];
  localStorage.setItem('relay.profiles.v1',JSON.stringify([p]));
 });
 await page.reload();await page.getByRole('button',{name:'Write & speak',exact:true}).first().click();await page.getByRole('button',{name:'Start finger input',exact:true}).click();
 await page.waitForTimeout(700);await page.evaluate(()=>window.__face=.85);await page.waitForTimeout(1100);
 assert.ok(!(await page.locator('#message').inputValue()).includes('BAD'));
 await hold(1,1);assert.equal(await page.locator('#message').inputValue(),'h');
 console.log('PASS: learned Classic gestures cannot dispatch while Finger grid is active');
 // Legacy face profiles expand to all signals; returning to teaching retains CPU hands.
 await page.evaluate(async()=>{const {createProfile}=await import('/src/storage.js');const p=createProfile('Classic face','face');p.settings.environment='finger-grid';localStorage.setItem('relay.profiles.v1',JSON.stringify([p]));});
 await page.reload();await page.getByRole('button',{name:'Write & speak',exact:true}).first().click();await page.getByRole('button',{name:'Start finger input',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.__cameraModes.at(-1)),'combined');assert.equal(await page.evaluate(()=>window.__delegates.at(-1)),'CPU');
 await page.getByRole('button',{name:'Teach gestures',exact:true}).click();await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>window.__cameraModes.at(-1)),'combined');assert.equal(await page.evaluate(()=>window.__delegates.at(-1)),'CPU');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('relay.profiles.v1'))[0].modality),'combined');
 assert.deepEqual(errors,[]);console.log('PASS: input stop, 6×6 desktop/mobile layout, persistent preview, environment/draft persistence and classic-profile camera restoration');
}finally{await browser.close();}
