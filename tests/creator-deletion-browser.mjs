import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
const base=process.env.RELAY_PREVIEW_URL||'http://localhost:4183';
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext(),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
const library=()=>page.locator('[data-create="library"]').first().click();
const back=async()=>{await page.locator('[data-nav="landing"]').click();await page.locator('[data-space="creator"]').click();};
const drafts=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('relay.creator.v1')).drafts);
const create=async name=>{await page.locator('[data-create="new"]').first().click();if(name){await page.locator('[data-field="doc.name"]').fill(name);await page.locator('[data-field="doc.name"]').blur();}return (await drafts()).at(-1).id;};
const remove=async(id,kind='draft')=>{const button=page.locator('[data-create="remove"][data-id="'+id+'"][data-kind="'+kind+'"]');await button.locator('xpath=..').locator('summary').click();await button.click();};
try{
 await page.goto(base);await page.locator('[data-space="creator"]').click();
 // User's exact sequence, for both untouched and edited new environments.
 for(const name of ['', 'Delete this edited environment']){
  const id=await create(name);await library();await remove(id);assert.ok(!(await drafts()).some(d=>d.id===id));
  await back();assert.equal(await page.locator('.scene-editor-board').count(),0,'Deleted draft must not reopen when returning to Creator');assert.equal(await page.locator('[data-field="doc.name"]').count(),0);assert.ok(!(await drafts()).some(d=>d.id===id));
  // Signing in used to save the stale in-memory document again.
  await context.route('**/signin-with-chatgpt?*',r=>r.fulfill({status:200,contentType:'text/html',body:'<p>Sign-in test destination</p>'}));
  await page.locator('#account-controls a').click();assert.ok(!(await drafts()).some(d=>d.id===id),'Sign-in must not resurrect deleted drafts');
  await page.goto(base+'/?view=creator&draft='+id+'&publish=1');assert.equal(await page.locator('[data-field="doc.name"]').count(),0);assert.equal(await page.locator('.publish-panel').count(),0);
  await context.unroute('**/signin-with-chatgpt?*');
 }
 // Deleting a different draft must not discard the currently remembered editor.
 const keep=await create('Keep this draft');await library();const other=await create('Other draft');await library();await page.locator('[data-create="edit"][data-id="'+keep+'"]').click();await library();await remove(other);await back();assert.equal(await page.locator('[data-field="doc.name"]').inputValue(),'Keep this draft');
 // An installed copy is separate from its editable draft.
 await page.locator('[data-component="choice"]').click();await page.locator('[data-create="install"]').click();await page.locator('[data-space="creator"]').click();await library();await remove(keep,'installed');await back();assert.equal(await page.locator('[data-field="doc.name"]').inputValue(),'Keep this draft');assert.ok((await drafts()).some(d=>d.id===keep));
 // A failed storage deletion must leave both the saved draft and editor intact.
 await library();await page.evaluate(()=>{window.__originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='relay.creator.v1')throw new Error('Storage unavailable for deletion test');return window.__originalSetItem.call(this,key,value);};});await remove(keep);await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Storage unavailable'));assert.ok((await drafts()).some(d=>d.id===keep));await page.evaluate(()=>{Storage.prototype.setItem=window.__originalSetItem;});await back();assert.equal(await page.locator('[data-field="doc.name"]').inputValue(),'Keep this draft');
 await library();await remove(keep);await back();assert.equal(await page.locator('[data-field="doc.name"]').count(),0);await page.reload();await page.locator('[data-space="creator"]').click();assert.equal((await drafts()).length,0);assert.equal(await page.locator('[data-create="undo"]').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS: deleted blank/edited drafts stay deleted through Home, Creator, sign-in, stale return URLs, and reload; unrelated drafts and uninstall remain independent; failed deletion preserves the editor.');
}finally{await browser.close();}
