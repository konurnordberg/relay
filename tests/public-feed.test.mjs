import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';
import {localDatabase} from '../scripts/local-database.mjs';
import {fromTemplate} from '../dist/src/creator-schema.js';
import {signInURL,signOutURL} from '../dist/src/account.js';
const req=(path='/api/environments',method='GET',user=null,data)=>new Request('https://relay.test'+path,{method,headers:{...(user?{'oai-authenticated-user-id':user}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});

test('anonymous visitors read shared scores but cannot publish, vote, delete, or run catalog maintenance',async()=>{
 const DB=localDatabase(),env={DB};try{
  const response=await worker.fetch(req(),env),data=await response.json();assert.equal(response.status,200);assert.equal(data.signedIn,false);assert.equal(data.environments.length,6);assert.ok(data.environments.every(r=>!r.owned&&r.myVote===0&&!('owner'in r)));
  const id=data.environments[0].document.id;
  for(const [path,method,payload] of [['/api/environments','POST',{document:fromTemplate('classic')}],['/api/environments/'+id+'/vote','PUT',{value:1}],['/api/environments/'+id,'DELETE']])assert.equal((await worker.fetch(req(path,method,null,payload),env)).status,401);
  for(const user of [null,'alice'])assert.equal((await worker.fetch(req('/api/catalog/seed','POST',user,{}),env)).status,404);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM environment_votes').first()).n,0);
 }finally{DB.close();}
});

test('account endpoint is optional, uncached, and returns no account identifiers or email',async()=>{
 for(const user of [null,'alice']){const response=await worker.fetch(req('/api/session','GET',user),{});assert.equal(response.status,200);assert.match(response.headers.get('Cache-Control'),/no-store/);assert.deepEqual(await response.json(),{signedIn:!!user});}
 assert.equal((await worker.fetch(req('/api/session','POST'),{})).status,405);
});

test('private legacy packages remain owner-only until explicitly republished with a public license',async()=>{
 const DB=localDatabase(),env={DB},doc=fromTemplate('classic');doc.license='private';try{
  assert.equal((await worker.fetch(req('/api/environments','POST','alice',{document:doc}),env)).status,400);
  await DB.prepare('INSERT INTO environments VALUES (?,?,?,?,?,?)').bind(doc.id,'alice',JSON.stringify(doc),1,doc.createdAt,doc.updatedAt).run();
  for(const user of [null,'bob']){const data=await (await worker.fetch(req('/api/environments','GET',user),env)).json();assert.ok(!data.environments.some(r=>r.document.id===doc.id));}
  const own=(await (await worker.fetch(req('/api/environments','GET','alice'),env)).json()).environments.find(r=>r.document.id===doc.id);assert.equal(own.owned,true);assert.equal(own.visibility,'private');
  assert.equal((await worker.fetch(req('/api/environments/'+doc.id+'/vote','PUT','bob',{value:1}),env)).status,404);
  doc.license='CC-BY-4.0';doc.revision++;assert.equal((await worker.fetch(req('/api/environments','POST','alice',{document:doc}),env)).status,200);
  const publicRows=(await (await worker.fetch(req(),env)).json()).environments;assert.ok(publicRows.some(r=>r.document.id===doc.id&&r.visibility==='public'));
 }finally{DB.close();}
});

test('different signed-in visitors contribute to the same public score, with one changeable vote each',async()=>{
 const DB=localDatabase(),env={DB};try{
  const id=(await (await worker.fetch(req(),env)).json()).environments[0].document.id,path='/api/environments/'+id+'/vote';
  for(let i=0;i<3;i++)assert.equal((await worker.fetch(req(path,'PUT','alice',{value:1}),env)).status,200);
  await worker.fetch(req(path,'PUT','bob',{value:1}),env);
  let row=(await (await worker.fetch(req(),env)).json()).environments.find(r=>r.document.id===id);assert.equal(row.score,2);assert.equal(row.myVote,0);assert.equal(row.owned,false);
  await worker.fetch(req(path,'PUT','alice',{value:-1}),env);row=(await (await worker.fetch(req(),env)).json()).environments.find(r=>r.document.id===id);assert.equal(row.score,0);assert.equal(row.upvotes,1);assert.equal(row.downvotes,1);
  await worker.fetch(req(path,'PUT','alice',{value:0}),env);row=(await (await worker.fetch(req(),env)).json()).environments.find(r=>r.document.id===id);assert.equal(row.score,1);
 }finally{DB.close();}
});

test('sign-in and sign-out use platform paths with safe same-origin return destinations',()=>{
 for(const destination of ['https://evil.test','//evil.test','/\\evil.test','javascript:alert(1)','/callback','/signin-with-chatgpt','/signout-with-chatgpt'])assert.equal(new URL(signInURL(destination),'https://relay.test').searchParams.get('return_to'),'/');
 assert.equal(new URL(signInURL('/?view=creator&draft=abc&publish=1'),'https://relay.test').searchParams.get('return_to'),'/?view=creator&draft=abc&publish=1');
 assert.equal(signOutURL('/'),'/signout-with-chatgpt?return_to=%2F');
});
