import {newScene,validateScene,resolveScene,sceneIssues} from './creator-scene.js';
// Portable, declarative environments. Packages contain data, never executable code.
export const ENVIRONMENT_FORMAT='relay-environment';
export const LIMITS={pages:12,blocks:8,items:96,bytes:900000};
export const MODELS={
 none:{name:'No model · pointer / exact trace',tasks:['pointer','pen'],detail:'Direct selection and exact letter paths.'},
 hands:{name:'MediaPipe Hands · local',tasks:['scene','finger-pair','finger-count','rotation','pointer-hand','pen'],detail:'21 landmarks per hand; no video upload.'},
 personal:{name:'Your trained gestures · local',tasks:['scan'],detail:'Uses this person’s saved face, hand, or movement calibration.'},
 letters:{name:'EMNIST handwriting · local neural model',tasks:['pen'],detail:'Recognizes printed A–Z letters. Review before insertion.'},
 sketches:{name:'Personal sketch matcher · local',tasks:['pen'],detail:'Teach your own symbols with drawn examples.'},
 words:{name:'Word-path decoder · local',tasks:['pen'],detail:'Matches swipes against a 20,000-word vocabulary and your words.'}
};
export const SOURCES={scene:'Canvas signal mappings',pointer:'Mouse / touch',scan:'Learned gestures / scanning','finger-pair':'Two-hand finger counts','finger-count':'One-hand finger count',rotation:'Hand rotation','pointer-hand':'Fingertip hover',pen:'Finger drawing'};
export const LAYOUTS={canvas:'Canvas',grid:'Character table',ring:'Character dial',sketch:'Drawing pad',keyboard:'Swipe keyboard',free:'Free layout'};
export const ACTIONS={text:'Insert text',space:'Space',delete:'Delete',undo:'Undo',speak:'Speak',clear:'Clear message',caps:'Upper / lower case',page:'Open page',focus:'Control another block',nextPage:'Next page',pause:'Pause input',noop:'No action'};
const id=()=>crypto.randomUUID();
const text=(value,label=value)=>({id:id(),label,value,action:'text',x:.5,y:.5});
export const makeItem=(value='a')=>text(value);
export function makeBlock(layout='grid'){
 return {id:id(),name:LAYOUTS[layout]||'Board',layout,width:'full',rows:6,columns:6,items:[],input:{source:layout==='sketch'||layout==='keyboard'?'pen':'pointer',model:layout==='sketch'?'letters':layout==='keyboard'?'words':'none',behavior:layout==='sketch'?'recognize':layout==='keyboard'?'swipe':'select',holdMs:900,scanMs:1400,autoScan:false,scanStyle:'rows',activation:'change',swap:false,hand:'any',rotationRange:120,reverse:false,penMode:'point',gain:2.4,appendSpace:false},sketches:[],words:[]};
}
export function makeCanvasBlock(){const b=makeBlock('canvas');b.name='Canvas';b.scene=newScene();return b;}
export function blankEnvironment(){return {format:ENVIRONMENT_FORMAT,version:1,id:id(),revision:1,name:'Untitled environment',description:'',author:'',license:'CC-BY-4.0',tags:[],pages:[{id:id(),name:'Page 1',blocks:[]}],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};}
export function fillBlock(block,kind='letters'){
 const values=kind==='letters'?Array.from('abcdefghijklmnopqrstuvwxyz'):kind==='numbers'?Array.from('0123456789+-=*/.,?!'):kind==='qwerty'?Array.from('qwertyuiopasdfghjklzxcvbnm'):kind==='phrases'?['Yes','No','Please wait','Thank you','I need help','I am comfortable','Water please','I need a break']:[];
 block.items=values.map(v=>text(v));
 if(block.layout==='keyboard')block.items.forEach((item,i)=>{const row=i<10?0:i<19?1:2,j=i-[0,10,19][row];item.x=.05+(j+[0,.5,1.5][row])*.1;item.y=[.25,.5,.75][row];});
 if(block.layout==='free')block.items.forEach((item,i)=>{item.x=.1+(i%5)*.2;item.y=.1+Math.floor(i/5)*.15;});
 return block;
}
export function addControls(block){for(const [action,label] of [['space','Space'],['delete','Delete'],['undo','Undo'],['speak','Speak'],['nextPage','Next page']])block.items.push({...text('',label),action});return block;}
export const TEMPLATE_NAMES={classic:'Select & next keyboard','finger-grid':'Finger-index table','air-letters':'Handwriting pad',cirrin:'Letter-path dial',flow:'Word-swipe keyboard',chord:'Hand shortcuts',dial:'Rotate & hold dial'};
export function fromTemplate(kind){
 const env=blankEnvironment();env.name=TEMPLATE_NAMES[kind]||'New environment';env.author='Relay';env.description='Editable example. All layouts and controls can be changed in Creator.';
 const b=makeBlock(['cirrin','dial'].includes(kind)?'ring':kind==='air-letters'?'sketch':kind==='flow'?'keyboard':'grid');
 if(kind!=='air-letters')fillBlock(b,kind==='flow'?'qwerty':kind==='chord'?'phrases':'letters');
 if(['classic','finger-grid','chord'].includes(kind))addControls(b);
 if(kind==='classic')Object.assign(b.input,{source:'scan',model:'personal'});
 if(kind==='finger-grid')Object.assign(b.input,{source:'finger-pair',model:'hands'});
 if(kind==='chord'){b.items.unshift({...text('','Close fists to arm'),action:'noop'});b.rows=5;b.columns=6;Object.assign(b.input,{source:'finger-pair',model:'hands',activation:'neutral',holdMs:260});}
 if(kind==='air-letters')Object.assign(b.input,{source:'pen',model:'letters',behavior:'recognize'});
 if(kind==='cirrin')Object.assign(b.input,{source:'pen',model:'none',behavior:'trace',appendSpace:true});
 if(kind==='flow')Object.assign(b.input,{source:'pen',model:'words',behavior:'swipe',appendSpace:true});
 if(kind==='dial')Object.assign(b.input,{source:'rotation',model:'hands',holdMs:1000});
 env.pages[0].blocks=[b];
 if(['classic','finger-grid'].includes(kind)){const n=makeBlock();fillBlock(n,'numbers');addControls(n);n.input={...b.input};env.pages.push({id:id(),name:'Numbers',blocks:[n]});}
 return env;
}
const fail=message=>{throw new Error(message);};
const str=(v,n,label)=>typeof v==='string'&&v.length<=n?v:fail('Invalid '+label+'.');
const ident=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(v)?v:fail('Invalid identifier.');
const number=(v,min,max,label)=>Number.isFinite(v)&&v>=min&&v<=max?v:fail('Invalid '+label+'.');
const choice=(v,values,label)=>values.includes(v)?v:fail('Invalid '+label+'.');
const bool=v=>typeof v==='boolean'?v:fail('Invalid toggle.');
export function validateEnvironment(input){
 if(!input||input.format!==ENVIRONMENT_FORMAT||![1,2].includes(input.version))fail('Choose a Relay environment package (version 1 or 2).');
 if(JSON.stringify(input).length>LIMITS.bytes)fail('Environment package is too large.');
 if(!Array.isArray(input.pages)||!input.pages.length||input.pages.length>LIMITS.pages)fail('Use between 1 and 12 pages.');
 const ids=new Set(),unique=v=>{ident(v);if(ids.has(v))fail('Duplicate identifier.');ids.add(v);return v;};
 const e={format:ENVIRONMENT_FORMAT,version:input.version,id:ident(input.id),revision:number(input.revision,1,100000,'revision'),name:str(input.name,80,'name'),description:str(input.description,600,'description'),author:str(input.author,80,'author'),license:choice(input.license,['CC-BY-4.0','CC0-1.0','private'],'license'),tags:(input.tags||[]).slice(0,8).map(t=>str(t,30,'tag')),createdAt:str(input.createdAt,40,'creation date'),updatedAt:str(input.updatedAt,40,'update date'),pages:[]};
 for(const p of input.pages){
  if(!Array.isArray(p.blocks)||p.blocks.length>LIMITS.blocks)fail('Use up to 8 blocks on a page.');
  const page={id:unique(p.id),name:str(p.name,60,'page name'),blocks:[]};
  for(const b of p.blocks){
   if(!Array.isArray(b.items)||b.items.length>LIMITS.items)fail('A block can contain up to 96 choices.');
   const x=b.input;if(!x)fail('Choose an input method.');
   const block={id:unique(b.id),name:str(b.name,80,'block name'),layout:choice(b.layout,Object.keys(LAYOUTS),'layout'),width:choice(b.width,['full','half'],'block width'),rows:number(b.rows,1,12,'rows'),columns:number(b.columns,1,12,'columns'),items:[],input:{source:choice(x.source,Object.keys(SOURCES),'input'),model:choice(x.model,Object.keys(MODELS),'model'),behavior:choice(x.behavior,['select','trace','recognize','swipe'],'selection behavior'),holdMs:number(x.holdMs,200,5000,'hold duration'),scanMs:number(x.scanMs,400,6000,'scan speed'),autoScan:bool(x.autoScan),scanStyle:choice(x.scanStyle,['rows','linear'],'scan style'),activation:choice(x.activation,['change','neutral'],'activation'),swap:bool(x.swap),hand:choice(x.hand,['any','left','right'],'hand'),rotationRange:number(x.rotationRange,40,360,'rotation range'),reverse:bool(x.reverse),penMode:choice(x.penMode,['point','middle-pinch','pinch'],'pen control'),gain:number(x.gain,1,4,'movement range'),appendSpace:bool(x.appendSpace)},words:(b.words||[]).slice(0,500).map(w=>str(w,60,'word')),sketches:[]};
   if(!Number.isInteger(block.rows)||!Number.isInteger(block.columns))fail('Rows and columns must be whole numbers.');
   for(const item of b.items){const clean={id:unique(item.id),label:str(item.label,80,'label'),action:choice(item.action,Object.keys(ACTIONS),'action'),value:str(item.value,500,'output'),x:number(item.x,0,1,'position'),y:number(item.y,0,1,'position')};if(b.layout==='canvas'){clean.group=str(item.group||'',80,'group');clean.kind=choice(item.kind||'choice',['choice','label'],'component kind');clean.w=number(item.w??.12,.025,.8,'choice width');clean.h=number(item.h??.1,.025,.8,'choice height');}block.items.push(clean);}if(b.layout==='canvas'){if(input.version!==2)fail('Canvas components need environment version 2.');block.scene=validateScene(b.scene,block.items,unique);}
   if(!Array.isArray(b.sketches)||b.sketches.length>48)fail('Use up to 48 custom sketches.');
   for(const sketch of b.sketches){
    if(!Array.isArray(sketch.examples)||sketch.examples.length>5)fail('Use up to five examples per sketch.');
    block.sketches.push({id:unique(sketch.id),label:str(sketch.label,80,'sketch label'),value:str(sketch.value,500,'sketch output'),examples:sketch.examples.map(strokes=>{if(!Array.isArray(strokes)||strokes.length>12)fail('Invalid sketch strokes.');return strokes.map(stroke=>{if(!Array.isArray(stroke)||stroke.length>128)fail('Invalid sketch points.');return stroke.map(p=>({x:number(p.x,-.2,1.2,'sketch x'),y:number(p.y,-.2,1.2,'sketch y')}));});})});
   }
   page.blocks.push(block);
  }e.pages.push(page);
 }
 for(const p of e.pages)for(const b of p.blocks)for(const item of b.items){if(item.action==='page'&&!e.pages.some(p=>p.id===item.value))fail('A page link points to a missing page.');if(item.action==='focus'&&!p.blocks.some(b=>b.id===item.value))fail('A block link points to a missing block on this page.');}
 return e;
}
export function environmentIssues(env){
 const issues=[];if(!env.name.trim())issues.push('Give your environment a name.');
 for(const page of env.pages){if(!page.blocks.length)issues.push(page.name+': add a layout block.');
 for(const b of page.blocks){const x=b.input,prefix=page.name+' / '+b.name+': ';if(b.layout==='canvas')issues.push(...sceneIssues(b).map(m=>prefix+m));
 if(!MODELS[x.model]?.tasks.includes(x.source))issues.push(prefix+'choose a model compatible with '+SOURCES[x.source]+'.');
 if(['letters','sketches'].includes(x.model)&&x.behavior!=='recognize')issues.push(prefix+'this model is for recognizing drawings.');
 if(x.model==='words'&&x.behavior!=='swipe')issues.push(prefix+'the word-path model needs word swiping.');
 if(x.behavior==='recognize'&&(b.layout!=='sketch'||!['letters','sketches'].includes(x.model)))issues.push(prefix+'drawing recognition needs a drawing pad and a handwriting or personal sketch model.');
 if(x.behavior==='swipe'&&(x.model!=='words'||!['keyboard','grid','free','ring','canvas'].includes(b.layout)))issues.push(prefix+'word swiping needs the word-path model and letter keys.');
 if(['trace','recognize','swipe'].includes(x.behavior)&&x.source!=='pen')issues.push(prefix+'this behavior needs Finger drawing input.');
 if(x.behavior==='trace'&&b.layout==='sketch')issues.push(prefix+'exact letter paths need letter choices, not an empty drawing pad.');
 if(b.layout==='sketch'&&x.behavior!=='recognize')issues.push(prefix+'choose Recognize a drawing.');
 if(b.layout!=='sketch'&&!b.items.length)issues.push(prefix+'add characters or actions.');
 if(b.layout==='grid'&&b.items.length>b.rows*b.columns)issues.push(prefix+'the table is too small for its choices. Increase rows or columns.');
 if(x.source==='finger-pair'&&(b.layout!=='grid'||b.rows>6||b.columns>6))issues.push(prefix+'two-hand indexing needs a table of at most 6 × 6. Add pages for more choices.');
 if(x.source==='finger-count'&&b.items.length>6)issues.push(prefix+'one hand has six counts (0–5); use six choices or add pages.');
 if(x.model==='sketches'&&(!b.sketches.length||b.sketches.some(s=>s.examples.length<2)))issues.push(prefix+'record at least two examples for each custom sketch.');
 if(x.behavior==='swipe'){const chars=b.items.filter(i=>i.action==='text'&&i.kind!=='label').map(i=>i.value.toLowerCase());if(Array.from('abcdefghijklmnopqrstuvwxyz').some(c=>!chars.includes(c)))issues.push(prefix+'word swiping needs all 26 A–Z letters.');if(new Set(chars).size!==chars.length)issues.push(prefix+'word swiping needs unique letter keys.');}
 }}return issues;
}
export function cloneEnvironment(env){const copy=structuredClone(validateEnvironment(env));copy.id=id();copy.revision=1;copy.name=copy.name.slice(0,70)+' (remix)';copy.createdAt=copy.updatedAt=new Date().toISOString();return copy;}
export function exportEnvironment(env){return JSON.stringify(validateEnvironment(env),null,2);}
export function importEnvironment(raw){if(typeof raw!=='string'||raw.length>LIMITS.bytes)fail('This package is too large.');return cloneEnvironment(JSON.parse(raw));}
export function itemPositions(block){
 if(block.layout==='canvas')return resolveScene(block).positions;const n=block.items.length;
 return block.items.map((item,i)=>{
  if(block.layout==='ring'){const a=i*Math.PI*2/Math.max(1,n)-Math.PI/2;return {item,i,x:.5+Math.cos(a)*.39,y:.5+Math.sin(a)*.39,w:Math.min(.11,2.2/Math.max(1,n)),h:Math.min(.11,2.2/Math.max(1,n))};}
  if(block.layout==='free'||block.layout==='keyboard')return {item,i,x:item.x,y:item.y,w:block.layout==='keyboard'?.085:.14,h:.18};
  return {item,i,x:(i%block.columns+.5)/block.columns,y:(Math.floor(i/block.columns)+.5)/block.rows,w:1/block.columns,h:1/block.rows};
 });
}
