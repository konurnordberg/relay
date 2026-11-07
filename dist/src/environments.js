// Registry keeps communication layouts independent of saved gesture vocabularies.
export const ENVIRONMENTS=Object.freeze([
 {id:'classic',cameraMode:'profile',handDelegate:'GPU',name:'Classic keyboard',description:'Your learned gestures: Next, Select, and direct text.'},
 {id:'finger-grid',cameraMode:'combined',handDelegate:'CPU',name:'Finger grid',description:'Two hands, six counts each. Choose a row and a column.'},
 {id:'air-letters',cameraMode:'hand',handDelegate:'GPU',name:'Air letters',description:'Trace a letter with your fingertip. Local handwriting AI reads the strokes.'},
 {id:'cirrin',cameraMode:'hand',handDelegate:'GPU',name:'Cirrin ring',description:'One continuous stroke per word. Visit letters around the circular keyboard.'}
]);
export const environmentById=id=>ENVIRONMENTS.find(e=>e.id===id)||ENVIRONMENTS[0];
export const GRID_PAGES=['letters','numbers','symbols','phrases'];
export const PAGE_NAMES={letters:'Letters',numbers:'Numbers',symbols:'Symbols',phrases:'My phrases',tools:'Tools'};
const text=(value,label=value)=>({type:'text',value,label});
const action=(type,label)=>({type,label});
const page=(value,label=PAGE_NAMES[value])=>({type:'grid-page',value,label});
const empty=()=>({type:'noop',label:'—'});
export function gridKeys(composer,current='letters'){
 const cells=Array.from({length:36},empty);
 if(composer.paused){cells[0]=action('resume','Resume');return cells;}
 if(composer.confirm){cells[0]=action('cancel','Cancel');cells[1]=action('confirm',composer.confirm==='clear'?'Clear message':'Speak now');return cells;}
 let contents=[];
 if(current==='letters')contents=[...Array.from(composer.caps?'ABCDEFGHIJKLMNOPQRSTUVWXYZ':'abcdefghijklmnopqrstuvwxyz',c=>text(c)),text(' ','Space'),text('.'),text(','),text('?')];
 if(current==='numbers')contents=[...Array.from('0123456789+-=*/()[]{}:;!?.,',c=>text(c)),text("'"),text('"'),text(' ','Space'),text('\n','New line')];
 if(current==='symbols')contents=[...Array.from('@#$%&_\\<>~^`|…€£¥•–—',c=>text(c)),text(' ','Space'),text('\n','New line')];
 if(current==='phrases')contents=composer.phrases.map(value=>({type:'phrase',value,label:value}));
 if(current==='tools')contents=[text(' ','Space'),text('\n','New line'),action('clear','Clear message'),action('pause','Pause'),page('phrases'),page('letters'),page('numbers'),page('symbols'),action('bookmark','Save phrase'),action('focus','Focus view')];
 contents.slice(0,30).forEach((key,i)=>cells[i]=key);
 const next=GRID_PAGES[(GRID_PAGES.indexOf(current)+1)%GRID_PAGES.length];
 cells.splice(30,6,action('delete','Delete'),action('undo','Undo'),action('caps',composer.caps?'abc':'ABC'),action('speak','Speak'),page(current==='tools'?'letters':'tools'),page(next,'Page →'));
 return cells;
}
export function applyGridKey(composer,key,current){
 if(!key||key.type==='noop')return {page:current,effect:null};
 // Confirmation/pause grids never expose page or text keys.
 if(composer.confirm&&!['cancel','confirm'].includes(key.type)||composer.paused&&key.type!=='resume')return {page:current,effect:null};
 if(key.type==='grid-page')return {page:key.value,effect:null};
 return {page:current,effect:composer.apply(key)};
}
