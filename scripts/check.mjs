import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
for(const f of ['teaching','app','core','camera','storage','communication','insights','drafts','views','features','combined','trails','vision-lane','vision-worker','environments','finger-index','air-ink','air-writing','letter-raster','letter-recognizer','letter-worker','cirrin-core','cirrin-input','cirrin-view','chord-core','chord-race','vision-pen','flow-core','flow-input','flow-worker','flow-view']){const r=spawnSync(process.execPath,['--check',path.join(root,'dist/src/'+f+'.js')],{stdio:'inherit'});if(r.status)process.exit(r.status);}
const manifest=JSON.parse(fs.readFileSync(path.join(root,'dist/assets-manifest.json'),'utf8'));
const {createHash}=await import('node:crypto');
for(const [name,info] of Object.entries(manifest)){const data=fs.readFileSync(path.join(root,'dist',name));if(createHash('sha256').update(data).digest('hex')!==info.sha256)throw new Error('Asset checksum failed: '+name);}
console.log('Syntax and all bundled vision and handwriting asset checksums passed.');
