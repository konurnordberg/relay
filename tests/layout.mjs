import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1366,height:900}});
 await page.goto('http://localhost:4173/');
 await page.screenshot({path:fileURLToPath(new URL('../artifacts/final-overview.png',import.meta.url)),fullPage:true});
 await page.getByRole('button',{name:'Open keyboard'}).click();
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:fileURLToPath(new URL('../artifacts/final-writing.png',import.meta.url)),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('link',{name:'Relay home',exact:true}).click();
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:fileURLToPath(new URL('../artifacts/final-mobile.png',import.meta.url)),fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 console.log('Final desktop and mobile layout captured; no mobile horizontal overflow.');
}finally{await browser.close();}
