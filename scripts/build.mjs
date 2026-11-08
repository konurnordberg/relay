import {build} from 'esbuild';
import {mkdir,cp,readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),dist=path.join(root,'dist');
await mkdir(path.join(dist,'server'),{recursive:true});await mkdir(path.join(dist,'client'),{recursive:true});
for(const entry of await readdir(dist)){if(['client','server','.openai'].includes(entry))continue;await cp(path.join(dist,entry),path.join(dist,'client',entry),{recursive:true});}
await build({entryPoints:['worker/index.js'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:false});
const hosting=JSON.parse(await readFile('.openai/hosting.json','utf8'));delete hosting.static;hosting.d1='DB';hosting.r2=null;
await writeFile('.openai/hosting.json',JSON.stringify(hosting,null,2)+'\n');await mkdir('dist/.openai',{recursive:true});await writeFile('dist/.openai/hosting.json',JSON.stringify(hosting,null,2)+'\n');
await writeFile('dist/server/wrangler.json',JSON.stringify({name:'relay-personal-voice',main:'index.js',compatibility_date:'2026-05-15',compatibility_flags:['nodejs_compat'],assets:{directory:'../client',binding:'ASSETS',run_worker_first:['/api/*']},d1_databases:[{binding:'DB',database_name:'site-creator-d1',database_id:'00000000-0000-4000-8000-000000000000',migrations_dir:'../../drizzle'}]},null,2)+'\n');
console.log('Built Relay client assets and private feed Worker.');
