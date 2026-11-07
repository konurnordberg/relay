import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext(),page=await context.newPage();
 await context.route('**/vendor/vision_bundle.mjs',route=>route.abort());
 await page.addInitScript(()=>{window.__cameraRequests=0;navigator.mediaDevices.getUserMedia=async()=>{window.__cameraRequests++;throw new Error('Unexpected camera acquisition');};});
 await page.goto('http://localhost:4173/');
 await page.getByRole('button',{name:'Create your voice',exact:true}).click();
 await page.getByRole('button',{name:'Start my setup'}).click();
 await page.getByRole('button',{name:'Enable camera'}).click();
 await page.getByText('NEEDS ATTENTION',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>window.__cameraRequests),0);
 console.log('PASS: failed vision-runtime load never acquires a camera stream');
}finally{await browser.close();}

