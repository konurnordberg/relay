import {chooseEnvironment} from './environment-picker.mjs';
import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
const b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://localhost:4173/');await p.getByRole('button',{name:'Open keyboard'}).click();await chooseEnvironment(p,'chord');await p.getByText('Typing speed test',{exact:true}).click();
 await p.getByRole('button',{name:'Start keyboard trial',exact:true}).click();
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
 assert.ok(await p.getByRole('button',{name:'Start keyboard trial',exact:true}).isEnabled());assert.match(await p.locator('#chord-race-status').textContent(),/cancelled/);
 await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 await p.getByRole('button',{name:'Start keyboard trial',exact:true}).click();
 await p.getByRole('button',{name:'Copy',exact:true}).click();
 assert.ok(await p.getByRole('button',{name:'Start keyboard trial',exact:true}).isEnabled());assert.match(await p.locator('#chord-race-status').textContent(),/cancelled/);
 assert.deepEqual(errors,[]);console.log('PASS: hidden-tab and other-control cancellation restore trial controls.');
}finally{await b.close();}