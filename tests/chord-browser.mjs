import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await context.route('**/__hands.mjs',r=>r.fulfill({path:fileURLToPath(new URL('./hand-fixture.mjs',import.meta.url)),contentType:'text/javascript'}));
await context.route('**/src/camera.js',r=>r.fulfill({contentType:'text/javascript',body:"export class VisionCamera { constructor(v,c,f,s){this.frame=f;this.state=s;} async start(mode,device,delegate){this.stop();this.running=true;this.mode=mode;this.handDelegate=delegate;window.__cameraMode=mode;window.__cameraDelegate=delegate;this.state('ready','Controlled hand fixtures');this.timer=setInterval(()=>{const now=performance.now();this.frame({hands:window.__hands||[],handFrameAt:now,now,vector:null,latency:1});},30);} stop(){this.running=false;clearInterval(this.timer);}setTrails(){} }"}));
async function pose(row,col,ms=330){
 await page.evaluate(async({row,col})=>{const {pairHands}=await import('/__hands.mjs');window.__hands=row===null?[]:pairHands(row,col);},{row,col});await page.waitForTimeout(ms);
}
async function chord(index){await pose(Math.floor(index/5),index%5+1,300);await pose(0,0,210);}
async function pointer(index){await page.getByRole('button',{name:'Bank '+Math.floor(index/5),exact:true}).click();await page.locator('.chord-key[data-index="'+index+'"]').click();}
try{
 await page.goto('http://localhost:4173/');await page.getByRole('button',{name:'Open keyboard'}).click();
 await page.getByRole('button',{name:'z',exact:true}).click();
 await page.getByLabel('Communication environment').selectOption('chord');
 assert.equal(await page.locator('.chord-key').count(),5);
 await page.getByRole('button',{name:'Start Chord input',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.__cameraMode),'hands');assert.equal(await page.evaluate(()=>window.__cameraDelegate),'CPU');
 await pose(0,1);assert.equal(await page.locator('#message').inputValue(),'z','initial code must not arm');
 await pose(0,0);await pose(3,0);assert.equal(await page.locator('#message').inputValue(),'z','browsing must not write');
 await pose(0,1);assert.match(await page.locator('#chord-stage').textContent(),/Armed 0·1/);
 await pose(0,0);assert.equal(await page.locator('#message').inputValue(),'z Thanks for the update. ');
 await page.waitForTimeout(500);assert.equal(await page.locator('#message').inputValue(),'z Thanks for the update. ');
 await chord(24);assert.equal(await page.locator('#message').inputValue(),'z','whole block undo through camera');
 await pose(0,1);await pose(null,null);await pose(0,0);assert.equal(await page.locator('#message').inputValue(),'z','lost tracking cancels armed text');
 // Manual preview stops input and updates its status.
 await page.getByRole('button',{name:'Bank 0',exact:true}).click();
 assert.ok(await page.getByRole('button',{name:'Start Chord input',exact:true}).isVisible());
 await pointer(2);assert.equal(await page.locator('#message').inputValue(),"z I'll take a look and get back to you. ");
 const savedDraft=await page.locator('#message').inputValue();
 // Timed keyboard and camera drafts never modify the user's shared message.
 await page.getByText('Typing speed test',{exact:true}).click();await page.getByRole('button',{name:'Start keyboard trial',exact:true}).click();
 const target=await page.locator('.chord-target').textContent(),trial=page.locator('#chord-keyboard-trial');
 assert.equal(await trial.evaluate(el=>el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true}))),false);
 await trial.pressSequentially('x');await trial.press('Backspace');
 await trial.pressSequentially(target,{delay:2});
 assert.match(await page.locator('#chord-race-status').textContent(),/Completed/);
 assert.equal(await page.locator('#message').inputValue(),savedDraft);
 await page.getByRole('button',{name:'Start camera trial',exact:true}).click();
 assert.ok(await page.locator('.chord-key').first().isDisabled());
 await pose(0,0);for(const index of [0,2,7])await chord(index);
 assert.match(await page.locator('#chord-race-status').textContent(),/Completed/);
 assert.equal((await page.locator('#chord-trial-output').textContent()).trimEnd(),target);
 assert.match(await page.locator('#chord-race-results').textContent(),/×/);
 assert.equal(await page.locator('#message').inputValue(),savedDraft);
 // A word-by-word target has no phrase shortcut in its initial palette.
 await page.locator('#chord-scenario').selectOption('words');await page.getByRole('button',{name:'Start camera trial',exact:true}).click();
 await pose(0,0);
 for(const word of 'we can meet tomorrow and talk about the project'.split(' ')){
  let index=await page.evaluate(async word=>{
   const {ChordBook}=await import('/src/chord-core.js'),{RelayComposer}=await import('/src/communication.js');const b=new ChordBook(),c=new RelayComposer();b.mode='words';c.text=document.querySelector('#chord-trial-output').textContent;
   if(c.text==='Your trial text appears here.')c.text='';return b.keys(c).findIndex(k=>k.kind==='word'&&k.value===word);
  },word);
  if(index<0){
   const groups=await page.evaluate(async word=>{const {CHORD_GROUPS}=await import('/src/chord-core.js');return Array.from(word).map(c=>CHORD_GROUPS.findIndex(g=>g.includes(c)));},word);
   for(const group of groups)await chord(15+group);
   index=await page.evaluate(word=>[...document.querySelectorAll('#chord-codebook>div')].findIndex(div=>div.querySelector('span').textContent===word),word);
  }
  assert.ok(index>=0,'word reachable '+word);await chord(index);
 }
 assert.match(await page.locator('#chord-race-status').textContent(),/Completed/);
 assert.equal(await page.locator('#message').inputValue(),savedDraft);
 // Edit a fixed shortcut with literal code, persist it, and insert without spacing changes.
 await page.locator('[data-action="chord-mode"][data-mode="shortcuts"]').click();
 await page.getByRole('button',{name:'Edit shortcut 0·1',exact:true}).click();
 await page.getByLabel('Label',{exact:true}).fill('Code block');const code='const answer = 42;\n';
 await page.getByRole('textbox',{name:'Text to insert',exact:true}).fill(code);
 await page.getByLabel('Insert exactly, preserving whitespace (useful for code)',{exact:true}).check();
 await page.getByRole('button',{name:'Save shortcut',exact:true}).click();
 await pointer(0);assert.equal(await page.locator('#message').inputValue(),savedDraft+code);
 // Spell/prefix modes and confirmation are reachable through the same codebook.
 await pointer(20);await pointer(18);assert.match(await page.locator('#chord-filter').textContent(),/P–T/);
 await pointer(22);await pointer(0);assert.equal(await page.locator('#message').inputValue(),savedDraft+code+'a');
 await pointer(27);await pointer(29);
 assert.match(await page.locator('#chord-codebook').textContent(),/Speak now/);await pointer(0);
 for(const viewport of [{width:1366,height:900},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.locator('#chord-deck').scrollIntoViewIfNeeded();await page.waitForTimeout(200);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');
  const cam=await page.locator('.camera-view').boundingBox();assert.ok(cam.y>=0&&cam.y+cam.height<viewport.height,'camera visible');
  const key=page.locator('.chord-key').first();await key.scrollIntoViewIfNeeded();
  assert.ok(await key.evaluate(b=>{const r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'key unobscured by camera');
  await page.screenshot({path:fileURLToPath(new URL('../artifacts/chord-'+viewport.width+'.png',import.meta.url)),fullPage:viewport.width>500});
 }
 await page.setViewportSize({width:1366,height:900});
 await page.getByRole('button',{name:'Start camera trial',exact:true}).click();
 await page.getByLabel('Communication environment').selectOption('classic');assert.equal(await page.locator('#message').inputValue(),savedDraft+code+'a');
 await page.getByLabel('Communication environment').selectOption('chord');assert.match(await page.locator('#chord-race-status').textContent(),/cancelled/);
 await page.reload();await page.getByRole('button',{name:'Write & speak',exact:true}).first().click();
 assert.equal(await page.getByLabel('Communication environment').inputValue(),'chord');assert.match(await page.locator('.chord-key').first().textContent(),/Code block/);
 assert.equal(await page.locator('#message').inputValue(),savedDraft+code+'a');
 assert.deepEqual(errors,[]);
 console.log('PASS: Chord camera release-to-write, cancellation, words, code snippets, persistence, benchmark isolation/exact completion/paste prevention, mobile camera dock and environment switching. Controlled fixtures, not a human speed measurement.');
}finally{await browser.close();}