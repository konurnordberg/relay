import {chromium} from '../.local/node_modules/playwright-core/index.mjs';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await fs.mkdir(new URL('../artifacts/ui/',import.meta.url),{recursive:true});
try{
 await page.goto('http://localhost:4173/');
 console.log('Home',await page.locator('h1').allTextContents(),errors);
 await page.screenshot({path:fileURLToPath(new URL('../artifacts/ui/home.png',import.meta.url)),fullPage:true});
 await page.locator('[data-nav="write"]').click();
 console.log('Write controls',await page.locator('#writer-actions button').allTextContents());
 await page.screenshot({path:fileURLToPath(new URL('../artifacts/ui/write.png',import.meta.url)),fullPage:true});
 await page.locator('[data-nav="teach"]').click();await page.getByRole('button',{name:'Create a profile',exact:true}).click();
 await page.getByLabel('Profile name').fill('UI review');await page.getByRole('button',{name:'Start setup',exact:true}).click();
 await page.screenshot({path:fileURLToPath(new URL('../artifacts/ui/teach.png',import.meta.url)),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:fileURLToPath(new URL('../artifacts/ui/teach-mobile.png',import.meta.url)),fullPage:true});
 console.log('Mobile width',await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})),errors);
}finally{await browser.close();}
