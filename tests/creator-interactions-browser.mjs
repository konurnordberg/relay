import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const base=process.env.RELAY_PREVIEW_URL||'http://localhost:4178';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
await context.route('**/src/camera.js',r=>r.fulfill({contentType:'text/javascript',body:
"export class VisionCamera{constructor(v,c,f,s){window.__frame=f;this.state=s;}async start(mode,device,delegate){window.__starts=(window.__starts||0)+1;this.state('loading','Starting controlled camera');if(window.__rejectCamera){this.state('error','Camera access was denied. Allow the camera and try again.');return;}if(window.__delayCamera)await new Promise(resolve=>window.__resolveCamera=resolve);this.running=true;this.mode=mode;this.handDelegate=delegate;this.state('ready','Controlled camera');}stop(){this.running=false;}setTrails(){}}"}));
const field=k=>page.locator('[data-field="'+k+'"]'),click=k=>page.locator('[data-create="'+k+'"]').first().click();
const change=async(k,v)=>{await field(k).fill(v);await field(k).press('Tab');};
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('relay.creator.v1')).drafts.at(-1));
const pulse=()=>page.evaluate(()=>{const palm=a=>{const p=Array.from({length:21},()=>({x:.5,y:.5,z:0})),q=(x,y)=>({x:.5+x*Math.cos(a)-y*Math.sin(a),y:.5+x*Math.sin(a)+y*Math.cos(a),z:0});p[0]=q(0,.15);p[9]=q(0,-.05);p[5]=q(-.09,-.03);p[17]=q(.09,-.03);p[8]=q(0,-.15);return p;};const start=window.__time||0;window.__frame({hands:[palm(0)],handAspect:1,handFrameAt:start,now:start});for(let t=start+50;t<start+1800;t+=50)window.__frame({hands:[palm(.4)],handAspect:1,handFrameAt:t,now:t});window.__time=start+2000;});
try{
 await page.goto(base);await page.locator('[data-space="creator"]').click();await click('new');
 assert.equal(await page.locator('[data-create="start-preview"]').isEnabled(),true);
 await click('start-preview');assert.equal(await page.locator('[data-create="stop-preview"]').count(),1);
 assert.match(await page.locator('#creator-preview-status').innerText(),/add characters or actions/);
 await click('stop-preview');
 await change('doc.name','Creator repair test');await page.locator('[data-scene="populate"]').selectOption('letters');
 const arrangement=page.locator('#scene-arrange');await arrangement.focus();await arrangement.press('End');await arrangement.press('Enter');
 assert.equal(await arrangement.inputValue(),'circle');await click('select-group');assert.equal(await arrangement.inputValue(),'circle');await click('arrange');
 let items=(await saved()).pages[0].blocks[0].items;
 assert.ok(items.every(i=>Math.abs(Math.hypot(i.x-.5,i.y-.5)-.36)<.0001));
 await page.locator('[data-create="scene-item"]').nth(1).click();assert.equal(await arrangement.inputValue(),'circle');
 await arrangement.selectOption('row');await click('arrange');assert.ok((await saved()).pages[0].blocks[0].items.every(i=>i.y===.5));await click('undo');
 await page.locator('#scene-arrange-scope').selectOption('selected');await page.locator('[data-create="scene-item"]').nth(1).click();await page.locator('[data-create="scene-item"]').nth(2).click({modifiers:['Shift']});
 const before=(await saved()).pages[0].blocks[0].items;await arrangement.selectOption('column');await click('arrange');items=(await saved()).pages[0].blocks[0].items;
 assert.equal(items[1].x,.5);assert.equal(items[2].x,.5);assert.deepEqual(items[5],before[5]);await click('undo');await page.locator('#scene-arrange-scope').selectOption('group');
 await page.locator('[data-component="target"]').click();assert.equal(await page.locator('[data-create="start-preview"]').isEnabled(),true);
 await change('rule.y','0.14');await change('rule.radius','0.08');
 assert.equal(await page.locator('.scene-selection-target').evaluate(e=>e.style.top),'14%');
 assert.equal(await page.locator('.scene-target-range').evaluate(e=>e.style.width),'16%');
 const board=page.locator('.scene-editor-board'),box=await board.boundingBox();
 await page.locator('.scene-target-grip').dragTo(board,{targetPosition:{x:box.width*.7,y:box.height*.6}});
 assert.ok(Math.abs((await saved()).pages[0].blocks[0].scene.selection.y-.6)<.01);await click('undo');
 // The visible target must not intercept clicks on the first circle letter.
 await page.locator('[data-create="scene-item"]').first().click();assert.equal(await field('editItem').inputValue(),'0');
 await change('group.x','0.05');assert.equal(await page.locator('.scene-group-handle').evaluate(e=>e.style.left),'55%');await click('undo');
 await click('add-mapping');await field('map.0.signal').selectOption('hand.angle');await field('map.0.target').selectOption('rotation');
 await change('input.holdMs','300');assert.equal(await page.locator('.creator-issues').count(),0);
 await click('start-preview');await pulse();assert.equal((await page.locator('.preview-message').innerText()).length,1);
 await click('add-canvas');await page.locator('[data-create="block"]').first().click();
 assert.equal(await page.locator('[data-create="start-preview"]').isEnabled(),true);assert.equal(await page.locator('[data-create="install"]').isDisabled(),true);
 await click('start-preview');await pulse();assert.equal((await page.locator('.preview-message').innerText()).length,2);
 assert.match(await page.locator('#creator-preview-status').innerText(),/Other unfinished surfaces/);
 await page.locator('[data-run="focus"]').last().click();
 assert.match(await page.locator('#creator-preview-status').innerText(),/add characters or actions/);
 await pulse();assert.equal((await page.locator('.preview-message').innerText()).length,2);
 await click('stop-preview');
 await page.locator('[data-create="block"]').last().click();await click('remove-block');
 await click('install');assert.equal(await page.locator('.run-cell').count(),26);
 await page.locator('[data-space="creator"]').click();
 await page.locator('#camera-button').click(); // Stop the underlying camera before exercising retry.
 await page.evaluate(()=>window.__rejectCamera=true);await click('start-preview');
 assert.equal(await page.locator('[data-create="start-preview"]').isEnabled(),true);assert.match(await page.locator('#creator-preview-status').innerText(),/denied/);
 await page.evaluate(()=>window.__rejectCamera=false);await click('start-preview');assert.equal(await page.locator('[data-create="stop-preview"]').count(),1);
 await page.locator('#camera-button').click();assert.equal(await page.locator('[data-create="start-preview"]').isEnabled(),true);
 await page.evaluate(()=>window.__delayCamera=true);await click('start-preview');assert.equal(await page.getByRole('button',{name:'Starting camera…',exact:true}).isDisabled(),true);
 await click('library');await page.evaluate(()=>window.__resolveCamera());await page.waitForTimeout(100);
 assert.equal(await page.locator('[data-create="stop-preview"]').count(),0);
 await page.locator('[data-create="edit"]').first().click();assert.equal(await page.locator('[data-create="start-preview"]').isEnabled(),true);
 await page.locator('.scene-workspace').screenshot({path:fileURLToPath(new URL('../artifacts/ui/creator-repaired-canvas.png',import.meta.url))});
 await page.locator('.creator-preview').screenshot({path:fileURLToPath(new URL('../artifacts/ui/creator-repaired-preview.png',import.meta.url))});
 for(const width of [1024,768,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'width '+width);}
 assert.deepEqual(errors,[]);
 console.log('PASS: persistent circle choice; full-group and selected-only arrangement; immediate numeric visual edits; target does not block letters; preview on unfinished drafts; valid surface beside incomplete surface; rotation/dwell; camera retry, stop and navigation; responsive editor.');
 // Actual camera implementation and bundled MediaPipe, using Chrome's synthetic camera.
 const real=await browser.newContext({viewport:{width:1280,height:900},permissions:['camera']}),realPage=await real.newPage(),realErrors=[];
 realPage.on('pageerror',e=>realErrors.push(e.message));await realPage.goto(base);await realPage.locator('[data-space="creator"]').click();await realPage.locator('[data-create="new"]').first().click();
 await realPage.locator('#camera-button').click();assert.equal(await realPage.locator('#profile-form').count(),0);
 await realPage.waitForFunction(()=>document.querySelector('#camera-button')?.textContent.includes('Turn camera off'),{},{timeout:60000});
 await realPage.locator('[data-create="start-preview"]').click();await realPage.waitForSelector('[data-create="stop-preview"]',{timeout:60000});
 assert.ok(await realPage.locator('#video').evaluate(v=>v.videoWidth>0));
 assert.deepEqual(realErrors,[]);await real.close();
 console.log('PASS: real camera startup and bundled vision models work without a gesture profile on a blank draft.');
}finally{await browser.close();}

