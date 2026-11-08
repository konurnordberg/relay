// Local D1-compatible adapter used only by tests and loopback preview.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
export function localDatabase(filename=':memory:'){
 const sqlite=new DatabaseSync(filename);sqlite.exec('PRAGMA foreign_keys=ON');
 sqlite.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
 for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort()){if(sqlite.prepare('SELECT name FROM local_migrations WHERE name=?').get(name))continue;sqlite.exec('BEGIN');try{sqlite.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));sqlite.prepare('INSERT INTO local_migrations VALUES (?)').run(name);sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error;}}
 const prepare=(sql,args=[])=>({bind:(...values)=>prepare(sql,values),first:async()=>sqlite.prepare(sql).get(...args)||null,all:async()=>({results:sqlite.prepare(sql).all(...args)}),run:async()=>{const result=sqlite.prepare(sql).run(...args);return {meta:{changes:result.changes}};}});
 return {prepare,batch:async statements=>{sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}},close:()=>sqlite.close()};
}
