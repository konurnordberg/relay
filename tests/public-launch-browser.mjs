import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const guest=process.env.RELAY_GUEST_URL||'http://localhost:4181',member=process.env.RELAY_MEMBER_URL||'http://localhost:4182';
const browser=await chromium.launch({channel:'chrome',headless:true});
let draftId;
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];let signedIn=false;
 page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 // Simulate only the hosting sign-in redirect; all feed requests use the real local Worker and database.
 await context.route('**/signin-with-chatgpt?*',async route=>{signedIn=true;const next=new URL(route.request().url()).searchParams.get('return_to')||'/';await route.fulfill({status:302,headers:{Location:next}});});
 await context.route('**/signout-with-chatgpt?*',async route=>{signedIn=false;await route.fulfill({status:302,headers:{Location:'/'}});});
 await context.route('**/api/**',async route=>{
  if(!signedIn){await route.continue();return;}
  const request=route.request(),url=new URL(request.url()),headers={...request.headers(),origin:member};delete headers.host;
  const response=await context.request.fetch(member+url.pathname+url.search,{method:request.method(),headers,data:request.postDataBuffer()||undefined});
  await route.fulfill({response});
 });
 await context.route('**/src/camera.js',r=>r.fulfill({contentType:'text/javascript',body:"export class VisionCamera{constructor(v,c,f,s){this.state=s;}async start(mode,id,delegate){this.running=true;this.mode=mode;this.handDelegate=delegate;this.state('ready','Camera ready');}stop(){this.running=false;}setTrails(){}}"}));
 await page.goto(guest);await page.locator('#account-controls a').waitFor();assert.match(await page.locator('#account-controls').innerText(),/Sign in/);
 assert.equal(await page.locator('body').getAttribute('data-view'),'landing');
 await page.locator('.home-feed [data-action="nav-feed"]').click();await page.waitForSelector('[data-create="use-feed"]');
 assert.equal(await page.locator('.feed-account a').getAttribute('target'),'_top');assert.equal(await page.locator('[data-create="upvote"]').count(),0);
 assert.ok(await page.locator('.feed-votes a').count()>=12);assert.doesNotMatch(await page.locator('#main').innerText(),/private feed|private app/i);
 await page.locator('[data-create="use-feed"][data-id="relay-builtin-finger-grid-v1"]').click();assert.equal(await page.locator('body').getAttribute('data-environment'),'finger-grid');
 await page.locator('#message').fill('My guest message');await page.locator('#camera-button').click();
 await page.locator('[data-space="creator"]').click();await page.locator('[data-nav="feed"]').click();
 await page.locator('[data-create="remix-feed"][data-id="relay-builtin-classic-v1"]').click();
 await page.locator('[data-field="doc.name"]').fill('Public launch browser check');await page.locator('[data-field="doc.name"]').blur();
 draftId=await page.evaluate(()=>JSON.parse(localStorage.getItem('relay.creator.v1')).drafts.find(d=>d.name==='Public launch browser check').id);
 await page.locator('[data-create="publish"]').click();await page.locator('.publish-panel').waitFor();assert.equal(await page.locator('[data-create="confirm-publish"]').count(),0);
 const signin=page.locator('.publish-panel a[data-relay-auth]'),returnTo=new URL(await signin.getAttribute('href'),guest).searchParams.get('return_to');assert.match(returnTo,new RegExp(draftId));assert.match(await page.locator('.publish-panel').innerText(),/Anyone on the internet/);
 await signin.click();await page.waitForSelector('[data-create="confirm-publish"]');assert.equal(await page.locator('[data-field="doc.name"]').inputValue(),'Public launch browser check');assert.match(await page.locator('#account-controls').innerText(),/Signed in/);
 assert.ok(!(await (await context.request.get(guest+'/api/environments')).json()).environments.some(r=>r.document.id===draftId),'Sign-in must not automatically publish');
 await page.locator('[data-create="confirm-publish"]').click();const card=page.locator('[data-feed-card]').filter({has:page.locator('[data-create="use-feed"][data-id="'+draftId+'"]')});await card.waitFor();
 await card.locator('[data-create="upvote"]').click();await page.waitForFunction(id=>document.querySelector('[data-create="upvote"][data-id="'+id+'"]').getAttribute('aria-pressed')==='true',draftId);
 const row=(await (await context.request.get(guest+'/api/environments')).json()).environments.find(r=>r.document.id===draftId);assert.equal(row.score,1);assert.equal(row.myVote,0);assert.equal(row.owned,false);
 await card.locator('[data-create="downvote"]').click();await page.waitForFunction(id=>document.querySelector('[data-create="downvote"][data-id="'+id+'"]').getAttribute('aria-pressed')==='true',draftId);
 await card.locator('[data-create="downvote"]').click();await page.waitForFunction(id=>document.querySelector('[data-create="downvote"][data-id="'+id+'"]').getAttribute('aria-pressed')==='false',draftId);
 await page.locator('#account-controls a').click();await page.waitForSelector('.account-signin');assert.equal(await page.locator('body').getAttribute('data-view'),'landing');
 await page.getByRole('button',{name:/Continue writing/}).click();assert.equal(await page.locator('#message').inputValue(),'My guest message');
 await page.locator('[data-space="creator"]').click();await page.locator('[data-nav="feed"]').click();await page.waitForSelector('.feed-account a');assert.equal(await page.locator('[data-create="upvote"]').count(),0);
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'feed overflow '+width);if(width!==320)await page.screenshot({path:fileURLToPath(new URL('../artifacts/ui/public-feed-'+width+'.png',import.meta.url)),fullPage:true});}
 await page.locator('[data-nav="landing"]').click();await page.evaluate(()=>document.documentElement.dataset.textSize='large');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 await context.close();
 console.log('PASS: real anonymous feed/use/remix; simulated platform sign-in returns to saved draft without auto-publishing; explicit public publication; shared votes/change/remove; sign-out preserves guest message; mobile layouts.');
}finally{
 if(draftId){const context=await browser.newContext();await context.request.delete(member+'/api/environments/'+draftId);await context.close();}
 await browser.close();
}
