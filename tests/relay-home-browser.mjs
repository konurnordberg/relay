import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createProfile} from '../dist/src/storage.js';
const browser=await chromium.launch({channel:'chrome',headless:true}),base=process.env.RELAY_PREVIEW_URL||'http://localhost:4180';
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 await context.route('**/src/camera.js',r=>r.fulfill({contentType:'text/javascript',body:"export class VisionCamera{constructor(v,c,f,s){this.state=s;}async start(mode,id,delegate){window.__starts=(window.__starts||0)+1;this.running=true;this.mode=mode;this.handDelegate=delegate;this.state('ready','Camera ready');}stop(){window.__stops=(window.__stops||0)+1;this.running=false;}setTrails(){}}"}));
 await page.goto(base);
 assert.equal(await page.locator('body').getAttribute('data-view'),'landing');
 assert.equal(await page.locator('[data-nav="landing"]').getAttribute('aria-current'),'page');
 assert.equal(await page.locator('.rail').isVisible(),false);
 assert.equal(await page.locator('h1').count(),1);
 assert.equal(await page.evaluate(()=>window.__starts||0),0);
 assert.match(await page.locator('.relay-home').innerText(),/User space[\s\S]*Creator space[\s\S]*Environment feed/i);
 for(const [id,kind] of [['finger-grid','index'],['air-letters','sketch'],['cirrin','trace'],['classic','classic'],['flow','swipe'],['chord','chord']]){
  const button=page.locator('[data-action="home-example"][data-id="'+id+'"]');await button.focus();await button.press('Enter');
  assert.equal(await button.getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#home-example [data-thumbnail-kind]').getAttribute('data-thumbnail-kind'),kind);
  assert.equal(await page.locator('#home-example [data-action="home-try-environment"]').getAttribute('data-id'),id);
 }
 assert.equal(await page.evaluate(()=>window.__starts||0),0);
 await page.locator('[data-action="home-example"][data-id="finger-grid"]').click();
 await page.locator('#home-example [data-action="home-try-environment"]').click();
 assert.equal(await page.locator('body').getAttribute('data-environment'),'finger-grid');
 await page.locator('#message').fill('Hello from my environment.');
 await page.locator('#camera-button').click();assert.equal(await page.evaluate(()=>window.__starts),1);
 await page.getByRole('link',{name:'Relay home',exact:true}).click();
 assert.equal(await page.locator('body').getAttribute('data-view'),'landing');
 assert.equal(await page.locator('body').getAttribute('data-camera'),'off');
 assert.ok(await page.evaluate(()=>window.__stops>0));
 await page.getByRole('button',{name:/Continue writing/}).click();
 assert.equal(await page.locator('#message').inputValue(),'Hello from my environment.');
 await page.locator('[data-nav="landing"]').click();
 await page.locator('.home-hero [data-action="nav-home"]').click();
 assert.equal(await page.locator('h1').innerText(),'Get started');
 assert.equal(await page.locator('[data-nav="home"]').getAttribute('aria-current'),'page');
 await page.locator('[data-nav="landing"]').click();
 await page.locator('.home-path-creator [data-action="nav-creator"]').click();
 assert.equal(await page.locator('body').getAttribute('data-view'),'creator');
 await page.locator('[data-nav="landing"]').click();
 await page.locator('.home-feed [data-action="nav-feed"]').click();
 await page.waitForSelector('[data-feed-card]');assert.equal(await page.locator('body').getAttribute('data-view'),'feed');
 await page.locator('[data-nav="landing"]').click();
 await page.locator('.home-questions summary').first().click();assert.equal(await page.locator('.home-questions details').first().getAttribute('open'),'');
 await page.locator('.home-questions summary').first().click();
 for(const [width,height] of [[1440,1000],[1024,768],[768,1024],[390,844],[320,740]]){
  await page.setViewportSize({width,height});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow at '+width);
  await page.evaluate(()=>scrollTo(0,0));
  if([1440,390].includes(width))await page.screenshot({path:fileURLToPath(new URL('../artifacts/ui/relay-home-'+width+'.png',import.meta.url)),fullPage:true});
 }
 await page.evaluate(()=>document.documentElement.dataset.textSize='large');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'large text at 320px');
 assert.deepEqual(errors,[]);await context.close();
 // Returning users also see the home page and keep their selected profile.
 const returning=await browser.newContext(),p=createProfile('Saved Relay profile','combined');
 await returning.addInitScript(p=>localStorage.setItem('relay.profiles.v1',JSON.stringify([p])),p);
 const again=await returning.newPage();await again.goto(base);
 assert.equal(await again.locator('body').getAttribute('data-view'),'landing');
 assert.equal(await again.locator('#profile-select').inputValue(),p.id);
 await again.getByRole('button',{name:/Continue writing/}).click();
 assert.equal(await again.locator('body').getAttribute('data-view'),'write');assert.equal(await again.locator('#profile-select').inputValue(),p.id);
 await returning.close();
 console.log('PASS: home above Get started; all six keyboard-accessible previews; working User/Creator/feed links; camera stays off on home; existing message/profile preserved; layouts at 320–1440px and large text.');
}finally{await browser.close();}

