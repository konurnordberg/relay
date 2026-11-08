import {validateEnvironment,environmentIssues,fromTemplate,cloneEnvironment,exportEnvironment,importEnvironment} from './creator-schema.js';
const KEY='relay.creator.v1';
export class CreatorLibrary{
 constructor(storage=globalThis.localStorage){this.storage=storage;this.error='';this.data={drafts:[],installed:[],published:[]};try{const raw=storage?.getItem(KEY);if(raw){const parsed=JSON.parse(raw);for(const k of Object.keys(this.data)){if(!Array.isArray(parsed[k])||parsed[k].length>80)throw new Error('Invalid Creator library.');this.data[k]=parsed[k].map(validateEnvironment).filter(doc=>k!=='installed'||doc.id!=='relay-builtin-dial-v1');}}}catch(e){this.error='Creator storage could not be loaded: '+e.message;}}
 commit(next){if(this.error)throw new Error(this.error);this.storage?.setItem(KEY,JSON.stringify(next));this.data=next;}
 save(document){const env=validateEnvironment({...document,updatedAt:new Date().toISOString()});const drafts=this.data.drafts.filter(e=>e.id!==env.id);if(drafts.length>=80)throw new Error('This device has 80 drafts. Export and remove an unused draft.');drafts.push(env);this.commit({...this.data,drafts});return structuredClone(env);}
 install(document){const env=validateEnvironment(document),issues=environmentIssues(env);if(issues.length)throw new Error(issues[0]);const installed=this.data.installed.filter(e=>e.id!==env.id);if(installed.length>=80)throw new Error('This device has 80 installed environments.');installed.push(env);this.commit({...this.data,installed});return structuredClone(env);}
 publishLocal(document){const env=validateEnvironment(document);if(environmentIssues(env).length)throw new Error(environmentIssues(env)[0]);const published=this.data.published.filter(e=>e.id!==env.id);published.push(env);this.commit({...this.data,published});return env;}
 remove(id,kind='drafts'){if(!['drafts','installed','published'].includes(kind))return;this.commit({...this.data,[kind]:this.data[kind].filter(e=>e.id!==id)});}
 get(id,kind='installed'){return this.data[kind]?.find(e=>e.id===id)||null;}
 import(text){return this.save(importEnvironment(text));}
 export(env){return exportEnvironment(env);}
 remix(env){return this.save(cloneEnvironment(env));}
 template(kind){const env=fromTemplate(kind);env.author='';return this.save(env);}
}
