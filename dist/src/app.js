import {buildPersonalModel,chooseProfile,rememberProfile} from './profile-runtime.js';
import {CreatorStudio} from './creator-ui.js';
import {CreatorRuntime} from './creator-runtime.js';
import {summarizeVisible} from './teaching.js';
import {FlowInput} from './flow-input.js';
import {drawFlow,flowCharacter,flowKeyLabel} from './flow-view.js';
import {FLOW_LAYOUT} from './flow-core.js';
import {PEN_MODES} from './vision-pen.js';
import {ChordBook,ChordGate,DEFAULT_SHORTCUTS,validShortcuts,chordCode} from './chord-core.js';
import {ChordRace,RACE_SCENARIOS} from './chord-race.js';
import {CirrinInput} from './cirrin-input.js';
import {drawCirrin} from './cirrin-view.js';
import {wordInsertion} from './cirrin-core.js';
import {AirWriter} from './air-writing.js';
import {ENVIRONMENTS,environmentById,GRID_PAGES,PAGE_NAMES,gridKeys,applyGridKey} from './environments.js';
import {fingerPair,FingerPairTracker,FingerIndexGate} from './finger-index.js';
import {trainCombined,predictCombined,CombinedGate,resample,requiredTracking} from './combined.js';
import {CHANNELS} from './features.js';
import {REST,UNKNOWN,train,predict,summarize,EventGate,Composer,trialSummary} from './core.js';
import {createProfile,loadProfiles,saveProfiles,exportProfile,importProfile,upgradeFaceProfile} from './storage.js';
import {VisionCamera} from './camera.js';
import {RelayComposer,STARTER_PHRASES,writingCapabilities,COMMON} from './communication.js';
import {studioView,liveInsightHTML,vocabularyView} from './views.js';
import {signalDiagnostics,confusionRows,readiness} from './insights.js';
import {readDraft,writeDraft,removeDraft} from './drafts.js';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(label,action,cls='',extra='')=>'<button class="button '+cls+'" data-action="'+action+'" '+extra+'>'+label+'</button>';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let profiles=[],storageError='',trailsEnabled=false;
let displaySize='standard';try{if(localStorage.getItem('relay.display.v1')==='large')displaySize='large';}catch{}
document.documentElement.dataset.textSize=displaySize;
try{trailsEnabled=localStorage.getItem('relay.trails.v1')==='true';}catch{}
try{profiles=loadProfiles();const upgraded=profiles.map(upgradeFaceProfile);if(upgraded.some((p,i)=>p!==profiles[i])){localStorage.setItem('relay.profiles.before-all-signals.v1',JSON.stringify(profiles));saveProfiles(upgraded);profiles=upgraded;}}catch(e){storageError=e.message;}
let profile=chooseProfile(profiles),view='home',modelError='',model=null,gate=new EventGate(),composer=new RelayComposer(profile),live=false;
let cameraState='off',cameraMessage='Your camera stays off until you start it.',latest=null,lastUI=0,recording=null,task=0,busy=false,attempt=null,restCheck=null,lastScan=0,lastTracking=0;
let teachingPhase=null,lastGestureMessage='',modelReport={excluded:[],readyIds:[]};
let toastTimer,scanVoice='',speechStatus='',activeDialog=null;
let draftSavedText=null,draftNotice='',speakingMessage=false;
let guestEnvironment={environment:'classic',gridHoldMs:850,gridSwap:false,cirrinGain:2.4,chordHoldMs:180,penMode:'point',flowGain:2.4,flowAuto:true};
try{const saved=JSON.parse(localStorage.getItem('relay.environment.v1')||'{}');if(ENVIRONMENTS.some(e=>e.id===saved.environment))guestEnvironment.environment=saved.environment;if([600,850,1200,1600].includes(saved.gridHoldMs))guestEnvironment.gridHoldMs=saved.gridHoldMs;if([1.3,1.8,2.4].includes(saved.cirrinGain))guestEnvironment.cirrinGain=saved.cirrinGain;if([120,180,260].includes(saved.chordHoldMs))guestEnvironment.chordHoldMs=saved.chordHoldMs;if(PEN_MODES.includes(saved.penMode))guestEnvironment.penMode=saved.penMode;if([1.3,1.8,2.4,3].includes(saved.flowGain))guestEnvironment.flowGain=saved.flowGain;if(typeof saved.flowAuto==='boolean')guestEnvironment.flowAuto=saved.flowAuto;if(typeof saved.gridSwap==='boolean')guestEnvironment.gridSwap=saved.gridSwap;}catch{}
const environmentSettings=()=>profile?.settings||guestEnvironment;
let lastFingerUI=0;
let environment=environmentById(environmentSettings().environment).id,fingerPage='letters',fingerStatus=null;
const fingerTracker=new FingerPairTracker();
const air=new AirWriter(()=>{if(airWriting())updateAirDisplay();},letter=>{if(!airWriting()||composer.confirm||composer.paused)return;handleEffect(composer.apply({type:'text',value:composer.caps?letter:letter.toLowerCase()}));renderWriter();});
const cirrin=new CirrinInput(()=>{if(cirrinWriting())updateCirrinDisplay();},word=>{if(!cirrinWriting()||composer.confirm||composer.paused)return;handleEffect(composer.apply({type:'text',value:wordInsertion(composer.text,word,composer.caps)}));renderWriter();});
let guestShortcuts=DEFAULT_SHORTCUTS.map(s=>({...s}));
try{const saved=JSON.parse(localStorage.getItem('relay.chord.shortcuts.v1')||'null');if(validShortcuts(saved))guestShortcuts=saved;}catch{}
const chordBook=new ChordBook(),chordGate=new ChordGate(environmentSettings().chordHoldMs||180),chordRace=new ChordRace();
let chordStatus=null,chordBenchmarkOpen=false,chordBank=0;
const shortcuts=()=>chordRace.active&&chordRace.scenario==='reusable'?DEFAULT_SHORTCUTS:(profile?(profile.chordShortcuts||DEFAULT_SHORTCUTS):guestShortcuts);
const chordComposer=()=>chordRace.active?chordRace.composer:composer;
const FLOW_TRIALS={everyday:{name:'Everyday writing',text:'we can meet tomorrow and talk about the project'},longer:{name:'Longer message',text:'please send me the details when you are ready and we can review the changes together tomorrow'}};
const flowRace=new ChordRace(FLOW_TRIALS);
let flowLastInsertion=null,flowBenchmarkOpen=false;
const flow=new FlowInput(()=>{if(flowWriting())updateFlowDisplay();},flowCommit,kind=>flowCommand(kind,'camera'));
const flowWriting=()=>view==='write'&&environment==='flow';
const flowComposer=()=>flowRace.active?flowRace.composer:composer;
const fingerGate=new FingerIndexGate(environmentSettings().gridHoldMs||850);
const chordWriting=()=>view==='write'&&environment==='chord';
const cirrinWriting=()=>view==='write'&&environment==='cirrin';
const airWriting=()=>view==='write'&&environment==='air-letters';
const fingerWriting=()=>view==='write'&&environment==='finger-grid';
const cameraMode=()=>creatorView()||customWriting()||model?.combined?'combined':view==='write'&&environmentById(environment).cameraMode!=='profile'?environmentById(environment).cameraMode:profile?.modality||'combined';
const handDelegate=()=>view==='write'?environmentById(environment).handDelegate:'CPU';
const startCamera=()=>camera.start(cameraMode(),'',handDelegate());
function resetInput(){customRuntime?.reset();creator?.runtime?.reset();gate.reset();fingerGate.reset();fingerTracker.reset();fingerStatus=null;air.reset();cirrin.reset();chordGate.reset();chordStatus=null;flow.reset();flowLastInsertion=null;}
function syncCameraForContext(){if(camera.running&&(camera.mode!==cameraMode()||(camera.handDelegate!==undefined&&camera.handDelegate!==handDelegate())))startCamera();}

let customRuntime=null,customRuntimeKey='';
const creator=new CreatorStudio({notify:toast,onUse:env=>useEnvironmentDocument(env),startPreview:async()=>{if(cameraState!=='ready'||camera.mode!=='combined')await startCamera();if(cameraState!=='ready')throw new Error(cameraMessage||'Allow camera access, then try again.');gate.reset();}});
const creatorView=()=>view==='creator'||view==='feed';
const customDocument=()=>environment.startsWith('custom:')?creator.library.get(environment.slice(7)):null;
const customWriting=()=>view==='write'&&!!customDocument();
function useEnvironmentDocument(doc){const builtin=ENVIRONMENTS.find(e=>'relay-builtin-'+e.id+'-v1'===doc.id);setView('write');selectEnvironment(builtin?.id||'custom:'+doc.id);}
function customAction(item){
 if(!customWriting())return;
 if(composer.confirm&&!['cancel','confirm'].includes(item.action)||composer.paused&&item.action!=='resume')return;
 let type=item.action,value=item.value;
 if(type==='space'){type='text';value=' ';}if(type==='text'&&composer.caps)value=value.toUpperCase();
 handleEffect(composer.apply({type,value}));renderWriter();
}
function renderCustomWriter(){
 const doc=customDocument();if(!doc)return;
 renderMessage();$('#draft-status').textContent=draftNotice;$('#focus-label').textContent=composer.confirm?'Confirm '+composer.confirm:composer.paused?'Paused':doc.name;
 $('#writer-status').innerHTML='<div class="input-strip"><span>'+esc(inputStatus())+'</span>'+btn(live?'Stop camera input':'Start camera input',live?'stop-live':'start-live',live?'secondary small':'small',cameraState==='loading'?'disabled':'')+'</div>';
 const previousKey=customRuntimeKey;const key=doc.id+':'+doc.revision+':'+(composer.confirm||'')+':'+composer.paused;
 if(customRuntimeKey!==key||!customRuntime){customRuntime?.destroy();let document=doc;
  if(composer.confirm||composer.paused){document=structuredClone(doc);const base=customRuntime?.block||doc.pages[0].blocks[0],block=structuredClone(base);block.name=composer.paused?'Resume communication':'Confirm '+composer.confirm;block.items=(composer.paused?[{label:'Resume',action:'resume'}]:[{label:'Cancel',action:'cancel'},{label:composer.confirm==='speak'?'Speak now':'Clear message',action:'confirm'}]).map((x,i)=>({...x,id:'guard-'+i,value:'',x:.3+i*.4,y:.5}));block.rows=1;block.columns=block.items.length;block.input.behavior='select';if(block.input.source==='pen'){block.input.source='pointer-hand';block.input.model='hands';}if(base.scene&&!['trace','swipe'].includes(base.input.behavior)){block.layout='canvas';const choices=base.items.filter(i=>i.kind!=='label');block.items=block.items.map((item,i)=>({...choices[i?Math.floor(choices.length/2):0],...item,x:choices[i?Math.floor(choices.length/2):0]?.x??(.3+i*.4),y:choices[i?Math.floor(choices.length/2):0]?.y??.5,group:choices[i?Math.floor(choices.length/2):0]?.group||base.scene.groups[0].id,w:.16,h:.1}));}else{delete block.scene;if(!['ring','grid'].includes(block.layout))block.layout='grid';}document.pages=[{id:'guard-page',name:block.name,blocks:[block]}];}
  customRuntime=new CreatorRuntime(document,{onAction:customAction});customRuntimeKey=key;if(previousKey&&previousKey!==key){customRuntime.requireRelease();gate.reset();}
 }
 const keyboard=$('#keyboard');keyboard.classList.remove('finger-keyboard');keyboard.classList.add('custom-keyboard');keyboard.setAttribute('aria-label',doc.name);customRuntime.mount(keyboard);
 $('#writer-help').innerHTML='';$('#writer-actions').innerHTML=btn('Focus view','focus','secondary')+btn('Creator space','nav-creator','secondary');$('#speech-status').textContent=speechStatus;
}

const actions={select:'Select',next:'Next',delete:'Delete',undo:'Undo',speak:'Speak',pause:'Pause',insert:'Insert text'};
const navigation=[['home','Get started'],['write','Write & speak'],['teach','Teach gestures'],['check','Check accuracy'],['profiles','Settings'],['studio','Signal analyzer']];
const currentTrials=()=>profile?.trials.filter(t=>(t.revision||0)===(profile.revision||0))||[];
function persist(){try{saveProfiles(profiles);rememberProfile(profile);storageError='';return true;}catch(e){storageError=e.message;toast('Could not save: '+e.message+'. Export a backup before closing.');return false;}}
function changed(){profile.revision=(profile.revision||0)+1;persist();rebuild();}
function rebuild(){const report=buildPersonalModel(profile);modelReport=report;model=report.model;modelError=report.error;gate=model?.combined?new CombinedGate(model,profile.settings.holdMs,profile.settings.restMs):new EventGate(profile?.settings.holdMs,profile?.settings.restMs);}
function activeCapabilities(){return writingCapabilities(profile?{...profile,gestures:profile.gestures.filter(g=>modelReport.readyIds.includes(g.id))}:null);}
function inputStatus(){return cameraState==='ready'?(live?'Camera on · Gesture control active':'Camera on · Gesture control paused'):cameraState==='loading'?'Camera starting…':cameraState==='error'?'Camera needs permission':'Camera off';}
function profileNotice(){return !model?'<div class="notice warn">'+esc(modelError||'No trained gestures are available in this profile.')+' '+btn('Review gestures','nav-teach','secondary small')+'</div>':modelReport.excluded.length?'<div class="notice">'+modelReport.readyIds.length+' gestures ready. '+modelReport.excluded.length+' unfinished gestures remain saved in Teach gestures.</div>':'';}

rebuild();restoreDraft();if(model)view='write';
$('#app').innerHTML='<div class="app-shell"><aside class="sidebar"><a class="brand" href="#" data-action="nav-home" aria-label="Relay home"><img src="./favicon.svg" alt="">Relay</a><div class="space-switch" aria-label="Relay spaces"><button data-action="nav-write" data-space="user">User space</button><button data-action="nav-creator" data-space="creator">Creator space</button></div><nav class="nav creator-navigation" aria-label="Creator navigation"><button data-action="nav-creator" data-nav="creator">My environments</button><button data-action="nav-feed" data-nav="feed">Environment feed</button></nav><nav class="nav user-navigation" aria-label="Main navigation">'+navigation.filter(([id])=>['write','teach','check','studio','profiles'].includes(id)).map(([id,label])=>'<button data-action="nav-'+id+'" data-nav="'+id+'">'+label+'</button>').join('')+'</nav><p class="side-bottom local-note">Video is processed on this device.</p></aside><div class="workspace"><header class="topbar"><span id="page-label" class="sr-only">Get started</span><div class="profile-switch"><label for="profile-select">Profile</label><select id="profile-select"></select></div></header><div class="main-grid"><main id="main" class="content" tabindex="-1"></main><aside class="rail"><section class="card camera-card" aria-label="Camera and recognition"><div class="card-header"><h3 id="camera-heading">Camera</h3><span class="pill" id="camera-pill">Off</span></div><div class="camera-view"><video id="video" autoplay muted playsinline aria-label="Mirrored camera preview"></video><canvas id="overlay" aria-hidden="true"></canvas><canvas id="air-overlay" aria-hidden="true" hidden></canvas><div class="camera-placeholder" id="camera-placeholder"><p>Camera off</p></div><div class="air-camera-hud" id="air-camera-hud" hidden></div><div class="finger-camera-hud" id="finger-camera-hud" hidden><span id="camera-row-count">Row —</span><span id="camera-col-count">Column —</span></div></div><div class="camera-prompt" id="camera-prompt" hidden><h3 id="camera-prompt-title"></h3><p id="camera-prompt-detail"></p><progress id="camera-prompt-progress" max="1" value="0" aria-label="Current recording phase"></progress><button class="button secondary" data-action="cancel-task" id="camera-prompt-cancel">Cancel recording</button></div><div class="camera-controls"><div class="finger-camera-message" id="finger-camera-message" hidden><span>Message</span><p id="finger-camera-text"></p></div><p class="camera-status" id="camera-status" role="status"></p><button class="button" id="camera-button" data-action="camera">Enable camera</button></div><div id="tracking-parts" class="tracking-parts" aria-label="Visible body parts"></div><div class="recognition" aria-label="Current gesture"><div class="eyebrow">Current gesture</div><div class="signal-name"><span id="signal-name">Camera off</span><span id="signal-detail">—</span></div><div class="meter"><div id="signal-meter" style="width:0"></div></div></div><details class="camera-options"><summary>Camera options</summary><div class="trail-controls"><label class="trail-toggle"><input id="trails-toggle" type="checkbox" role="switch" aria-describedby="trails-help"><span class="trail-switch" aria-hidden="true"></span><span>Enable trails</span></label><p id="trails-help">Show a fading line behind your fingertip.</p></div><p id="camera-performance" class="camera-performance" hidden></p></details></section></aside></div><footer class="footer">Saved profiles and drafts stay in this browser.</footer></div></div><div id="phase-announcement" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>';
const camera=new VisionCamera($('#video'),$('#overlay'),onFrame,onCameraState);
function updateTeachingPreview(){
 const teaching=view==='teach'||busy;document.body.classList.toggle('air-writing',airWriting()||cirrinWriting()||flowWriting());document.body.classList.toggle('cirrin-writing',cirrinWriting());document.body.classList.toggle('chord-writing',chordWriting());$('#air-overlay').hidden=!(airWriting()||cirrinWriting()||flowWriting());$('#air-camera-hud').hidden=!(airWriting()||cirrinWriting()||flowWriting());document.body.classList.toggle('finger-writing',fingerWriting()||airWriting()||cirrinWriting()||flowWriting()||chordWriting());$('#finger-camera-hud').hidden=!(fingerWriting()||chordWriting());$('#finger-camera-message').hidden=!(fingerWriting()||airWriting()||cirrinWriting()||flowWriting()||chordWriting());
 document.body.classList.toggle('teaching-view',teaching);
 document.body.classList.toggle('teaching-active',busy);
 document.body.classList.toggle('camera-docked',(teaching||creatorView()||customWriting()||fingerWriting()||airWriting()||cirrinWriting()||flowWriting()||chordWriting())&&cameraState==='ready'&&matchMedia('(max-width:760px)').matches);
 $('#camera-heading').textContent='Camera';
 const prompt=$('#camera-prompt');prompt.hidden=!teaching;
 const phase=teachingPhase||{title:cameraState==='ready'?'Ready to record':'Enable your camera',detail:'Keep the face or hands you use visible. Instructions will appear here during recording.',fraction:0};
 for(const [id,value] of [['camera-prompt-title',phase.title],['camera-prompt-detail',phase.detail]])if($('#'+id).textContent!==value)$('#'+id).textContent=value;
 $('#camera-prompt-progress').value=phase.fraction;
 $('#camera-prompt-progress').hidden=!busy;$('#camera-prompt-cancel').hidden=!busy;
 syncCameraDock();
}
function syncCameraDock(){document.documentElement.style.setProperty('--camera-dock-height',document.body.classList.contains('camera-docked')?Math.ceil($('.camera-card').getBoundingClientRect().height+16)+'px':'0px');}
new ResizeObserver(syncCameraDock).observe($('.camera-card'));
window.addEventListener('resize',updateTeachingPreview);

function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),6500);}
function setView(next){flowRace.cancel();if(chordRace.active){chordRace.cancel();live=false;}if(busy){toast('Finish or cancel the current recording first.');return;}creator.unmount();customRuntime?.destroy();customRuntime=null;customRuntimeKey='';view=next;live=false;resetInput();render();syncCameraForContext();$('#main').focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'});}
function render(){
 document.body.dataset.view=view;document.body.dataset.environment=view==='write'?environment:'';document.body.classList.toggle('creator-space',creatorView());document.querySelectorAll('[data-space]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.space===(creatorView()?'creator':'user'))));updateTeachingPreview();
 $('#profile-select').innerHTML=profiles.length?profiles.map(p=>'<option value="'+esc(p.id)+'" '+(p===profile?'selected':'')+'>'+esc(p.name)+'</option>').join(''):'<option>No profile yet</option>';
 $('#profile-select').disabled=busy||!profiles.length;
 document.querySelectorAll('[data-nav]').forEach(b=>b.disabled=busy);
 document.querySelectorAll('[data-nav]').forEach(b=>{b.classList.toggle('active',b.dataset.nav===view);if(b.dataset.nav===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 $('#page-label').textContent=navigation.find(n=>n[0]===view)?.[1]||'Get started';
 $('#main').innerHTML=(storageError?'<div class="notice error">Storage: '+esc(storageError)+'</div>':'')+({creator:()=>'<div id="creator-root"></div>',feed:()=>'<div id="creator-root"></div>',home:homeView,teach:teachView,write:writeView,check:checkView,studio:()=>studioView(profile,model,modelReport),profiles:profilesView}[view]());
 updateCamera();if(creatorView())creator.mount($('#creator-root'),view==='feed'?'feed':creator.doc?'editor':'library');if(view==='write')renderWriter();
}
const heading=title=>'<div class="page-heading"><h1>'+title+'</h1></div>';
function homeView(){
 return heading('Get started')+'<div class="start-options"><section class="card start-option"><h2>'+(profile?'Continue setup':'Set up your gestures')+'</h2><p>Record your resting state, then teach a comfortable gesture. One gesture can select letters with automatic scanning.</p>'+btn(profile?'Continue setup':'Create a profile','start')+'</section><section class="card start-option"><h2>Write & speak</h2><p>Open the keyboard or try hand input, letter tracing, and word swiping.</p>'+btn('Open keyboard','nav-write','secondary')+'</section></div><details class="help-details"><summary>How setup works</summary><ol><li>Enable your camera.</li><li>Record 12 seconds of rest.</li><li>Show a gesture five times, then check recognition.</li></ol><p>You can use facial expressions, one or both hands, or short movements. A helper can assist with setup.</p></details>';
}
function noProfile(){return heading(view==='check'?'Check accuracy':'Teach gestures')+'<section class="card"><h2>Create a profile</h2><p>A profile saves your gestures and settings in this browser.</p>'+btn('Create a profile','new-profile')+'</section>';}

function teachView(){
 if(!profile)return noProfile();const done=profile.rest.length>0;
 const step=!done?1:!model?2:3;
 return heading('Teach gestures')+'<ol class="setup-steps" aria-label="Setup progress">'+['Record rest','Teach gestures','Check accuracy'].map((label,i)=>'<li '+(step===i+1?'aria-current="step"':'')+'><span aria-hidden="true">'+(i+1)+'</span>'+label+'</li>').join('')+'</ol>'+
 (profile.modality!=='combined'?'<div class="notice">This is a legacy one-hand profile. '+btn('New profile','new-profile','secondary')+'</div>':'')+
 '<details class="card setup-rest" '+(!done?'open':'')+'><summary>1. Resting state <span class="badge">'+(done?'Recorded':'Not recorded')+'</span></summary><p>Relax for 12 seconds. Keep the face or hands you plan to use in view. This teaches Relay when to do nothing.</p>'+btn(done?'Record rest again':'Learn my resting state','record-rest',done?'secondary':'',busy?'disabled':'')+'</details>'+
 '<section class="card setup-gestures"><div class="section-label"><h2>2. Your gestures</h2></div><p>'+(done?'Add a pose or movement. We record five examples, with rest between each.':'Record rest first, then add a gesture.')+'</p><div class="gesture-list">'+profile.gestures.map(g=>'<div class="gesture-item"><div class="gesture-detail"><strong>'+esc(g.name)+'</strong><small>'+esc(actions[g.action])+(g.action==='insert'?' · '+esc(g.value):'')+' · '+(g.kind==='motion'?'Movement':'Held pose')+' · '+g.samples.length+' examples'+(g.trainedChannels?.length?' · Learned: '+esc(g.trainedChannels.join(' + ')):'')+(g.enabled===false?' · Disabled':'')+'</small></div><div class="gesture-actions">'+btn(g.samples.length?'Retrain':'Record','record-gesture','secondary','data-id="'+g.id+'" '+(busy?'disabled':''))+btn('Edit','edit-gesture','secondary','data-id="'+g.id+'" aria-label="Edit '+esc(g.name)+'" '+(busy?'disabled':''))+'</div></div>').join('')+'</div>'+btn('Add a gesture','add-gesture','',!done||busy?'disabled':'')+'<details class="help-details"><summary>Choosing a gesture</summary><p>Choose a movement you can repeat comfortably. Use Select for one-gesture scanning. Add Next to control the scan yourself. Insert text writes a letter, word, or phrase.</p><p>For hand symbols, keep your hand visible and relaxed between examples. Make the symbol only when prompted.</p></details></section><div id="record-area"></div>'+
 (model?'<section class="card setup-ready"><h2>3. Check recognition</h2><p>Try new attempts before using your gestures to write.</p><div class="button-row">'+btn('Check my gestures','nav-check')+btn('Open keyboard','nav-write','secondary')+'</div></section>'+model.warnings.map(w=>'<p class="notice warn">'+esc(w)+'</p>').join(''):'')+
 (profile.gestures.some(g=>g.samples.length>=3)&&modelError?'<p class="notice warn">'+esc(modelError)+'</p>':'');
}
function writeView(){
 return '<div class="write-header">'+heading('Write & speak')+'<div id="environment-picker"></div></div><div id="writer-status"></div><section class="card composer-card" aria-label="Message"><div class="composer-head"><span>Message <small id="draft-status"></small></span><span id="word-count">0 words</span></div><textarea id="message" class="message" maxlength="20000" aria-label="Composed message" placeholder="Type here or use your gestures." rows="3" spellcheck="true"></textarea><div class="composer-bottom"><span id="focus-label"></span><div class="button-row">'+btn('Undo','message-undo','secondary')+btn('Clear','message-clear','secondary')+btn('Copy','copy','secondary')+btn('Speak','speak','','aria-label="Speak message"')+'</div></div></section><div id="keyboard" class="keyboard" aria-label="Accessible keyboard"></div><div id="writer-help"></div><div class="button-row" id="writer-actions">'+btn('Next','manual-next','secondary')+btn('Select','manual-select','secondary')+btn('Keyboard settings','writer-settings','secondary')+btn('Focus view','focus','secondary')+'</div><div class="speech-state" id="speech-status" role="status"></div>';
}
function writingGuide(capabilities){
 const direct=capabilities.direct;
 return '<details class="writing-guide help-details"><summary>Gesture controls</summary><section aria-label="Writing with movements"><div class="writing-guide-head"><div><strong>Write with a movement or a pose</strong><p>Teach a stroke to write a letter, word, or phrase. Swipes can also control Next and Select.</p></div>'+btn('Teach a writing movement','add-writing-movement','small secondary')+'</div>'+(direct.length?'<div class="writing-mappings">'+direct.slice(0,8).map(g=>'<span><b>'+esc(g.name)+'</b> → <q>'+esc(g.value)+'</q><small>'+(g.kind==='motion'?'Movement':'Held pose')+'</small></span>').join('')+(direct.length>8?'<span>+'+(direct.length-8)+' more in Teach gestures</span>':'')+'</div><p class="writing-sequence">Movement: make your learned stroke → pause briefly at its endpoint → return to your starting pose.</p>':'<p class="writing-sequence">Choose “Make a swipe or movement” and “Insert text” to teach your own writing stroke.</p>')+(lastGestureMessage?'<p class="last-written">'+esc(lastGestureMessage)+'</p>':'')+'</section></details>';
}
function renderWriter(){
 if(view!=='write')return;
 composer.configure(profile);saveDraft();renderEnvironmentPicker();if(customWriting()){renderCustomWriter();return;}$('#keyboard').classList.remove('custom-keyboard');
 if(flowWriting()){renderFlowWriter();return;}
 if(chordWriting()){renderChordWriter();return;}
 if(cirrinWriting()){renderCirrinWriter();return;}
 if(airWriting()){renderAirWriter();return;}
 if(fingerWriting()){renderFingerWriter();return;}
 $('#keyboard').classList.remove('finger-keyboard');$('#keyboard').setAttribute('aria-label','Accessible keyboard');
 const capabilities=activeCapabilities();
 $('#writer-status').innerHTML='<div class="input-strip"><span class="status">'+esc(inputStatus())+'</span>'+btn(live?'Pause gestures':cameraState==='ready'?'Use my gestures':'Enable camera & gestures',live?'stop-live':'start-live',live?'small secondary':'small',!model||cameraState==='loading'?'disabled':'')+'</div>'+profileNotice();

 renderMessage();
 const rows=composer.rows;
 $('#keyboard').innerHTML=rows.map((row,i)=>'<div class="key-row '+(i===composer.row?'focus-row':'')+'">'+row.map((k,j)=>'<button class="key '+(k.type!=='text'||k.value.length!==1||/\s/.test(k.value)?'control':'')+' '+(i===composer.row&&j===composer.col&&composer.level==='key'?'focus-key':'')+'" data-action="key" data-kind="'+k.type+'" data-row="'+i+'" data-col="'+j+'" aria-label="'+esc(k.label)+'">'+esc(k.label)+'</button>').join('')+(i===composer.row&&composer.level==='key'?'<button class="key control '+(composer.col===row.length?'focus-key':'')+'" data-action="back-rows">↩ Rows</button>':'')+'</div>').join('');
 const focus=composer.level==='row'?'Row '+(composer.row+1)+' of '+rows.length:(rows[composer.row]?.[composer.col]?.label||'Back to rows');
 $('#focus-label').textContent=composer.confirm?'Confirm '+composer.confirm:composer.paused?'Paused':focus;
 $('#writer-help').innerHTML='<div class="keyboard-help"><span><kbd>Next</kbd> advances the highlight</span><span><kbd>Select</kbd> chooses a row, then a key</span><span>Return to rest between gestures</span></div>'+writingGuide(capabilities);
 $('#speech-status').textContent=speechStatus;
 $('#draft-status').textContent=draftNotice;
 if(live||document.body.classList.contains('focus-mode'))requestAnimationFrame(()=>document.querySelector('.focus-row')?.scrollIntoView({block:'nearest'}));
 if(live&&profile.settings.audio&&focus!==scanVoice){scanVoice=focus;say(focus,true);}
}
function renderMessage(){
 const m=$('#message');if(m.value!==composer.text){m.value=composer.text;m.scrollTop=m.scrollHeight;}m.classList.toggle('empty',!composer.text);
 $('#word-count').textContent=(composer.text.trim()?composer.text.trim().split(/\s+/).length:0)+' words · '+Array.from(composer.text).length+' characters';
}
function renderEnvironmentPicker(){
 const current=customDocument()||environmentById(environment);
 $('#environment-picker').innerHTML='<button class="environment-current" data-environment="'+esc(environment)+'" data-action="choose-environment" aria-haspopup="dialog"><span class="environment-mini" aria-hidden="true">'+(environment==='finger-grid'?'▦':environment==='classic'?'Aa':'✦')+'</span><span><small>Environment</small><strong>'+esc(current.name)+'</strong></span><span class="environment-change">Change ↗</span></button>';
}
function environmentCard(e,badge='',action='pick-environment'){
 const previews={classic:'A B C', 'finger-grid':'0 1 2 · 3 4 5','air-letters':'✎ Aa',cirrin:'◯ ABC',flow:'Q W E',chord:'✋ ✋'};
 return '<button class="environment-card" data-action="'+action+'" data-id="'+esc(e.id)+'" aria-pressed="'+(environment===e.id)+'"><span class="environment-art art-'+esc(e.id)+'" aria-hidden="true">'+esc(previews[e.id]||'✦')+'</span><span class="environment-card-copy">'+(badge?'<small>'+esc(badge)+'</small>':'')+'<strong>'+esc(e.name)+'</strong><span>'+esc(e.description||'A custom communication environment.')+'</span></span>'+(environment===e.id?'<b class="environment-selected">Selected ✓</b>':'')+'</button>';
}
async function chooseEnvironment(){
 const recommended=ENVIRONMENTS.filter(e=>['classic','finger-grid','air-letters'].includes(e.id)),others=ENVIRONMENTS.filter(e=>!recommended.includes(e));
 const d=openDialog(dialogHeader('Choose an environment')+'<h3>Start here</h3><div class="environment-gallery">'+recommended.map(e=>environmentCard(e,e.id==='classic'?'Default':e.id==='finger-grid'?'Recommended · two hands':'Try drawing')).join('')+'</div><h3>More ways to write</h3><div class="environment-gallery">'+others.map(e=>environmentCard(e)).join('')+'</div>'+(creator.library.data.installed.length?'<h3>Your environments</h3><div class="environment-gallery">'+creator.library.data.installed.map(e=>environmentCard({...e,id:'custom:'+e.id},'Installed')).join('')+'</div>':'')+'<h3>Popular in the private feed</h3><div id="popular-environments" role="status">Loading voted environments…</div>');
 d.classList.add('environment-dialog');
 try{const data=await creator.feed.list();if(activeDialog!==d)return;const rows=data.environments.filter(e=>e.score>0).sort((a,b)=>b.score-a.score).slice(0,3);creator.feedRows=data.environments;
 d.querySelector('#popular-environments').innerHTML=rows.length?'<div class="environment-gallery">'+rows.map(r=>environmentCard({...r.document,id:r.document.id},r.score+' net votes','use-popular-environment')).join('')+'</div>':'<p>No rated environments yet. Vote on your favorites in the environment feed.</p>'+btn('Explore environment feed','open-environment-feed','secondary');
 }catch{if(activeDialog===d)d.querySelector('#popular-environments').innerHTML='<p>The feed is unavailable. Built-in and installed environments are ready to use.</p>';}
}

function renderFingerWriter(){
 const settings=environmentSettings(),keys=gridKeys(composer,fingerPage);
 $('#writer-status').innerHTML='<div class="input-strip"><span class="status">'+esc(inputStatus())+'</span>'+btn(live?'Pause finger input':'Start finger input',live?'stop-live':'start-live',live?'small secondary':'small',cameraState==='loading'?'disabled':'')+'</div>';

 renderMessage();
 $('#focus-label').textContent=composer.confirm?'Confirm '+composer.confirm:composer.paused?'Paused':PAGE_NAMES[fingerPage]+' · 6 × 6';
 const keyboard=$('#keyboard');keyboard.classList.add('finger-keyboard');keyboard.setAttribute('aria-label','Finger keyboard');
 keyboard.innerHTML='<div class="finger-livebar"><div class="finger-readouts"><span>ROW <b id="finger-row">—</b></span><span>COLUMN <b id="finger-col">—</b></span><div><strong id="finger-target">Show both hands</strong><div class="finger-hold-detail"><span id="finger-countdown">Hold '+(settings.gridHoldMs||850)/1000+' s</span><span id="finger-percent">0%</span></div><div class="meter" role="progressbar" id="finger-progress" aria-label="Hold to select" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="finger-meter" style="width:0"></div></div></div></div><p id="finger-status">Show both hands</p></div><div class="finger-page-heading"><strong>'+esc(composer.paused?'Paused':composer.confirm?'Confirm your choice':PAGE_NAMES[fingerPage])+'</strong>'+btn('Grid settings','finger-settings','secondary small')+'</div><table class="finger-table" aria-label="6 by 6 finger coordinates"><thead><tr><th scope="col"><span class="sr-only">Row / Column</span>↘</th>'+Array.from({length:6},(_,c)=>'<th scope="col">'+c+'</th>').join('')+'</tr></thead><tbody>'+Array.from({length:6},(_,row)=>'<tr><th scope="row">'+row+'</th>'+keys.slice(row*6,row*6+6).map((key,col)=>'<td><button class="finger-key '+(key.type==='text'&&key.value.length===1&&!/\s/.test(key.value)?'letter':'control')+'" data-action="finger-key" data-index="'+(row*6+col)+'" aria-label="Row '+row+', column '+col+': '+esc(key.label)+'" '+(key.type==='noop'?'disabled':'')+'>'+esc(key.label)+'</button></td>').join('')+'</tr>').join('')+'</tbody></table>';
 $('#writer-help').innerHTML='<p class="finger-help">0 = fist · 5 = open palm · Bottom-right cell changes page</p>';
 $('#writer-actions').innerHTML=btn('Focus view','focus','secondary');
 $('#speech-status').textContent=speechStatus;
 updateFingerDisplay();updateTeachingPreview();
}
function useFingerKey(index){
 const key=gridKeys(composer,fingerPage)[index];if(!key||key.type==='noop')return;
 const out=applyGridKey(composer,key,fingerPage);fingerPage=out.page;handleEffect(out.effect);renderWriter();
}
function updateFingerDisplay(){
 if(!fingerWriting()||!$('#finger-row'))return;
 const pair=fingerStatus?.pair||{row:null,col:null},out=fingerStatus?.out;
 $('#finger-camera-text').textContent=composer.text.slice(-60)||'Your next thought…';
 $('#finger-row').textContent=pair.row??'—';$('#finger-col').textContent=pair.col??'—';
 const index=pair.row!==null&&pair.col!==null?pair.row*6+pair.col:null,key=index===null?null:gridKeys(composer,fingerPage)[index];
 $('#finger-target').textContent=key&&key.type!=='noop'?key.label:'Show a clear pair';
 const progress=live?(out?.locked?1:out?.progress||0):0,percent=Math.round(progress*100),remaining=Math.max(0,(1-progress)*(environmentSettings().gridHoldMs||850)/1000);
 $('#finger-meter').style.width=percent+'%';$('#finger-progress').setAttribute('aria-valuenow',percent);$('#finger-percent').textContent=percent+'%';$('#finger-countdown').textContent=out?.locked?'Selected ✓':live&&progress>0?remaining.toFixed(1)+' s remaining':'Hold '+(environmentSettings().gridHoldMs||850)/1000+' s';
 $('#finger-status').textContent=pair.reason||(live?(out?.locked?'Selected once. Change the pair, or lower a hand briefly to repeat.':key?.type==='noop'?'This cell is empty. Choose another pair.':'Hold this pair steady to select.'):'Preview only. Start finger input when your counts look right.');
 document.querySelectorAll('.finger-key').forEach(b=>{const n=Number(b.dataset.index);b.classList.toggle('finger-row-match',pair.row!==null&&Math.floor(n/6)===pair.row);b.classList.toggle('finger-col-match',pair.col!==null&&n%6===pair.col);b.classList.toggle('finger-target',n===index);});
 const swap=environmentSettings().gridSwap;
 $('#camera-row-count').textContent=(swap?'Column ':'Row ')+(swap?pair.col??'—':pair.row??'—');
 $('#camera-col-count').textContent=(swap?'Row ':'Column ')+(swap?pair.row??'—':pair.col??'—');


}
function onFingerFrame(frame){
 const pair=fingerTracker.update(frame,environmentSettings().gridSwap);
 const out=live&&!activeDialog?fingerGate.update(pair,frame.handFrameAt,frame.now):null;
 fingerStatus={pair,out};
 if(out?.index!==null&&out?.index!==undefined)useFingerKey(out.index);
 if(frame.now-lastFingerUI>80){lastFingerUI=frame.now;updateFingerDisplay();
  $('#tracking-parts').textContent=frame.hands?.length===2?'Both hands visible':'Show both hands';
  const metrics=frame.metrics;$('#camera-performance').hidden=!metrics;
  if(metrics)$('#camera-performance').textContent='Camera '+metrics.cameraFps+' fps · Hands '+metrics.handFps+' fps';
 }
}
function saveEnvironmentSetting(key,value){
 environmentSettings()[key]=value;
 if(profile)persist();else try{localStorage.setItem('relay.environment.v1',JSON.stringify(guestEnvironment));}catch{toast('Environment is available for this session; browser settings could not be saved.');}
}
function selectEnvironment(id){
 customRuntime?.destroy();customRuntime=null;customRuntimeKey='';
 if(id.startsWith('custom:')&&creator.library.get(id.slice(7))){environment=id;try{localStorage.setItem('relay.custom-environment.v1',id);}catch{}live=false;resetInput();render();syncCameraForContext();return;}
 try{localStorage.removeItem('relay.custom-environment.v1');}catch{}
 flowRace.cancel();chordRace.cancel();chordBook.reset();
 environment=environmentById(id).id;saveEnvironmentSetting('environment',environment);live=false;resetInput();fingerPage='letters';composer.resetFocus();render();syncCameraForContext();
}






function penControlsHTML(){
 const mode=environmentSettings().penMode||'point',instructions={point:'Extend your index finger and curl the other fingers to draw. Open your hand to lift. Keep the palm facing the camera.', 'middle-pinch':'Keep your index finger extended. Touch thumb to middle finger to draw; separate them to lift.',pinch:'Touch thumb to index finger to draw; separate them to lift. Point mode avoids covering the tracked fingertip.'};
 return '<div class="pen-controls"><label>Pen control<select id="pen-mode">'+PEN_MODES.map(m=>'<option value="'+m+'" '+(mode===m?'selected':'')+'>'+({point:'Point → draw · open hand → lift','middle-pinch':'Thumb + middle pinch',pinch:'Thumb + index pinch (legacy)'})[m]+'</option>').join('')+'</select></label><p>'+instructions[mode]+'</p></div>';
}
function flowCommit(word,{replace=false,literal=false,mode='words'}={}){
 if(!flowWriting())return;const c=flowComposer();if(c.confirm||c.paused)return;
 const insertWord=before=>(before&&!/\s$/.test(before)?' ':'')+(c.caps?word.toUpperCase():/^i(?:$|')/.test(word)?'I'+word.slice(1):word)+' ';
 if(literal){word=flowCharacter(word,mode,c.caps);if(!word)return;c.apply({type:'text',value:word});flowLastInsertion=null;}
 else if(replace){
  const last=flowLastInsertion;if(!last||last.target!==c||c.text!==last.after){flow.status='The message changed. Trace the word again to insert it.';return;}
  c.change(last.before+insertWord(last.before));flowLastInsertion={before:last.before,after:c.text,target:c};
 }else{const before=c.text;c.apply({type:'text',value:insertWord(before)});flowLastInsertion={before,after:c.text,target:c};}
 if(flowRace.active&&flowRace.update(c.text,performance.now(),{action:true})){live=false;resetInput();renderWriter();toast('Flow trial complete.');return;}
 if(!flowRace.active){saveDraft();renderMessage();}updateFlowDisplay();
}
function flowCommand(kind,source='pointer'){
 if(flowRace.active&&source!=='camera')return;
 if(kind==='mode'){flow.mode=({words:'spell',spell:'symbols',symbols:'symbols2',symbols2:'words'})[flow.mode];flow.reset();renderWriter();return;}
 const c=flowComposer();if(c.confirm||c.paused)return;flow.reset();
 if(kind==='space')c.apply({type:'text',value:' '});
 else if(kind==='period')c.change(c.text.replace(/ +$/,'')+'. ');
 else c.apply({type:kind});
 flowLastInsertion=null;
 if(flowRace.active&&flowRace.update(c.text,performance.now(),{action:true})){live=false;resetInput();renderWriter();return;}
 if(!flowRace.active){saveDraft();renderMessage();}if(kind==='caps'){renderWriter();return;}updateFlowDisplay();
}
function renderFlowWriter(){
 const c=flowComposer();c.configure(profile);flow.personal=c.personalWords;
 $('#writer-status').innerHTML='<div class="input-strip"><span class="status"><span class="dot"></span>'+(flowRace.active?'Timed '+flowRace.method+' trial':live?'Flow · camera input active':'Flow · camera or pointer practice')+'</span>'+btn(live?'Stop Flow input':'Start Flow input',live?'stop-live':'start-live',live?'small secondary':'small',flowRace.active||cameraState==='loading'?'disabled':'')+'</div>';
 renderMessage();$('#focus-label').textContent='Flow · swipe words';$('#draft-status').textContent=draftNotice;
 $('#keyboard').classList.remove('finger-keyboard');$('#keyboard').setAttribute('aria-label','Flow word keyboard');
 $('#keyboard').innerHTML='<section class="flow-workspace"><h3>Swipe words</h3><p class="flow-intro">Move to the first letter with an open hand. Point through the letters in one stroke, then open your hand to finish. Double letters need no extra loop. Keep moving word by word.</p>'+penControlsHTML()+'<div class="flow-modes">'+['words','spell','symbols','symbols2'].map(m=>btn(({words:'Words',spell:'Spell',symbols:'Symbols',symbols2:'More symbols'})[m],'flow-mode','small '+(flow.mode===m?'':'secondary'),'data-mode="'+m+'" '+(flowRace.active?'disabled':'')+' aria-pressed="'+(flow.mode===m)+'"')).join('')+'</div><canvas id="flow-canvas" width="720" height="400" aria-label="QWERTY swipe keyboard. Drag through a word, then release." tabindex="0"></canvas><div class="flow-feedback" role="status"><strong id="flow-status"></strong><span id="flow-detail"></span></div><div id="flow-choices" class="flow-choices"></div><div class="button-row">'+btn('Clear stroke','flow-clear','secondary small',flowRace.active?'disabled':'')+btn('Undo word','flow-command','secondary small','data-kind="undo" '+(flowRace.active?'disabled':''))+btn('Space','flow-command','secondary small','data-kind="space" '+(flowRace.active?'disabled':''))+btn('.','flow-command','secondary small','data-kind="period" '+(flowRace.active?'disabled':''))+btn('Delete','flow-command','secondary small','data-kind="delete" '+(flowRace.active?'disabled':''))+btn(c.caps?'Lowercase':'Uppercase','flow-command','secondary small','data-kind="caps" '+(flowRace.active?'disabled':''))+'</div><details class="flow-options"><summary>Positioning & writing preferences</summary><label>Movement range<select id="flow-gain" '+(flowRace.active?'disabled':'')+'>'+[[3,'Very small'],[2.4,'Small'],[1.8,'Medium'],[1.3,'Large']].map(([v,n])=>'<option value="'+v+'" '+(flow.gain===v?'selected':'')+'>'+n+'</option>').join('')+'</select></label>'+btn('Center on my finger','flow-center','secondary small',flowRace.active?'disabled':'')+'<label class="toggle"><input id="flow-auto" type="checkbox" '+(flow.auto?'checked':'')+' '+(flowRace.active?'disabled':'')+'> Insert matched words when I lift</label><p>With an open hand, hover over an alternative above the keys to correct the last word. Hover over the bottom controls for Space, Undo, punctuation or a mode change. Spell enters individual letters; symbol pages handle numbers and code punctuation.</p></details><details class="flow-manual"><summary>Click a key to spell</summary><div>'+Object.keys(FLOW_LAYOUT).map(k=>btn(esc(flowKeyLabel(flowCharacter(k,flow.mode==='words'?'spell':flow.mode,c.caps))),'flow-letter','secondary small','data-letter="'+k+'" '+(flowRace.active?'disabled':''))).join('')+'</div></details><p class="flow-note">Add names in Settings or use Spell. Copy transfers your message to another app. Use while stationary. <a href="./data/FLOW_WORDS_NOTICE.md" target="_blank" rel="noopener">Vocabulary attribution</a>.</p></section>';
 $('#writer-help').innerHTML=flowBenchmarkHTML();$('#writer-actions').innerHTML=c.confirm?btn('Cancel','flow-confirm','secondary','data-kind="cancel"')+btn(c.confirm==='speak'?'Speak now':'Clear message','flow-confirm','','data-kind="confirm"'):c.paused?btn('Resume','flow-confirm','','data-kind="resume"'):btn('Focus view','focus','secondary');$('#speech-status').textContent=speechStatus;
 $('#pen-mode').disabled=flowRace.active;$('#flow-benchmark').addEventListener('toggle',e=>flowBenchmarkOpen=e.target.open);
 const canvas=$('#flow-canvas'),point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};};
 canvas.addEventListener('pointerdown',e=>{if(flowRace.active||composer.confirm||composer.paused)return;e.preventDefault();live=false;flow.pointerActive=true;canvas.setPointerCapture(e.pointerId);flow.sample(point(e),true,performance.now());updateFlowDisplay();$('#writer-status .status').textContent='Pointer practice · camera input paused';const b=$('#writer-status button');b.textContent='Start Flow input';b.dataset.action='start-live';});
 canvas.addEventListener('pointermove',e=>{if(!flow.pointerActive)return;const samples=e.getCoalescedEvents?.()||[];for(const p of samples.length?samples:[e])flow.sample(point(p),true,p.timeStamp);updateFlowDisplay();});
 const release=e=>{if(!flow.pointerActive)return;flow.pointerActive=false;if(e.type==='pointercancel')flow.cancelStroke();else flow.sample(point(e),false,performance.now());updateFlowDisplay();};
 canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
 updateFlowDisplay();updateFlowBenchmark();updateTeachingPreview();
}
function updateFlowDisplay(){
 if(!flowWriting()||!$('#flow-canvas'))return;const c=flowComposer();
 drawFlow($('#flow-canvas'),flow,c.caps);drawFlow($('#air-overlay'),flow,c.caps,true);
 $('#flow-status').textContent=c.confirm?'Confirm or cancel '+c.confirm+' below before writing.':c.paused?'Paused · choose Resume below.':flow.status;$('#flow-detail').textContent=flow.tracing?'Drawing · open your hand to finish':flow.pending?'Word decoding on this device':flow.mode==='words'?'Swipe words; open-hand hover selects alternatives and controls.':'Point at a key, then open your hand to insert one character.';
 $('#air-camera-hud').textContent=flow.tracing?'● Word in progress':flow.review?'Review word':flow.pen.blocked?'Open hand to reset':'Point to write';
 $('#finger-camera-text').textContent=c.text.slice(-90)||'Your text appears here';

 const choices=$('#flow-choices'),stamp=JSON.stringify([flow.candidates,flow.review,flowRace.active]);
 if(choices.dataset.stamp!==stamp){choices.dataset.stamp=stamp;choices.innerHTML=flow.candidates.map((v,i)=>btn(esc(v.word)+'<small>'+(flow.review?'Insert word':'Replace last word')+'</small>','flow-accept','flow-choice '+(i?'secondary':''),'data-index="'+i+'" '+(flowRace.active?'disabled':''))).join('');}
 updateFlowBenchmark();
}
function flowBenchmarkHTML(){
 return '<details id="flow-benchmark" class="chord-benchmark" '+(flowBenchmarkOpen?'open':'')+'><summary>Compare with your keyboard</summary><p>Compose the same new text by typing and swiping. No phrase shortcuts. Corrections count toward your time.</p><label>Target<select id="flow-scenario" '+(flowRace.active?'disabled':'')+'>'+Object.entries(FLOW_TRIALS).map(([id,v])=>'<option value="'+id+'" '+(id===flowRace.scenario?'selected':'')+'>'+v.name+'</option>').join('')+'</select></label><blockquote class="chord-target">'+esc(flowRace.target)+'</blockquote><div class="button-row">'+btn('Start keyboard trial','flow-race-start','small secondary','data-method="keyboard" '+(flowRace.active?'disabled':''))+btn('Start Flow trial','flow-race-start','small','data-method="camera" '+(flowRace.active?'disabled':''))+btn('Stop trial','flow-race-stop','small secondary',flowRace.active?'':'disabled')+'</div><div class="chord-race-clock"><b id="flow-elapsed">0.0 s</b><span id="flow-race-status"></span></div><label class="field" '+(flowRace.method==='keyboard'?'':'hidden')+'>Keyboard trial<textarea id="flow-keyboard-trial" rows="4" spellcheck="false" autocomplete="off" '+(flowRace.active&&flowRace.method==='keyboard'?'':'readonly')+'>'+esc(flowRace.method==='keyboard'?flowRace.composer.text:'')+'</textarea></label><pre id="flow-trial-output" '+(flowRace.method==='camera'?'':'hidden')+'></pre><div id="flow-race-results" class="chord-race-results"></div><p class="chord-trial-note">WPM = target characters ÷ 5 ÷ elapsed minutes. The timer starts at the button and stops on an exact match, allowing trailing whitespace. Pointer text entry is disabled in Flow trials; paste and drop are blocked in keyboard trials. Results are this session’s latest trials; export to keep them. No faster-than-keyboard result is assumed.</p>'+btn('Export comparison','flow-race-export','small secondary')+'</details>';
}
function updateFlowBenchmark(){
 if(!flowWriting()||!$('#flow-race-status'))return;
 $('#flow-race-status').textContent=flowRace.status;const result=flowRace.completed[flowRace.method];
 $('#flow-elapsed').textContent=((flowRace.active?performance.now()-flowRace.started:result?.elapsedMs||0)/1000).toFixed(1)+' s';
 $('#flow-trial-output').textContent=flowRace.composer.text||'Your trial text appears here.';
 const results=flowRace.completed,stamp=JSON.stringify(results),el=$('#flow-race-results');
 if(el.dataset.stamp!==stamp){el.dataset.stamp=stamp;el.innerHTML=['keyboard','camera'].map(m=>'<div><span>'+(m==='camera'?'FLOW':'KEYBOARD')+'</span><b>'+(results[m]?results[m].wpm.toFixed(1):'—')+'</b><small>corrected WPM</small></div>').join('')+(results.camera&&results.keyboard?'<p>Flow / keyboard: <b>'+(results.camera.wpm/results.keyboard.wpm).toFixed(2)+'×</b> on this text.</p>':'');}
}
async function startFlowRace(method){
 if(!flowWriting())return;live=false;flowRace.cancel();resetInput();flowBenchmarkOpen=true;
 if(method==='camera'){await flow.load();if(cameraState!=='ready')await startCamera();if(!flowWriting()||cameraState!=='ready')return;}
 flow.mode='words';flowRace.start(method,performance.now());live=method==='camera';renderWriter();if(method==='keyboard')$('#flow-keyboard-trial').focus();
}
document.addEventListener('input',e=>{if(e.target.id==='flow-keyboard-trial'&&flowRace.active&&flowRace.method==='keyboard'){if(flowRace.update(e.target.value,performance.now(),{action:true}))renderWriter();else updateFlowBenchmark();}});
for(const event of ['paste','drop','beforeinput'])document.addEventListener(event,e=>{if(e.target.id==='flow-keyboard-trial'&&flowRace.active&&(event!=='beforeinput'||/insertFromPaste|insertFromDrop/.test(e.inputType)))e.preventDefault();});
setInterval(()=>{if(flowRace.active)updateFlowBenchmark();},100);
function renderChordWriter(){
 const target=chordComposer();target.configure(profile);
 $('#writer-status').innerHTML='<div class="input-strip"><span class="status"><span class="dot" style="background:'+(live?'#5a8b38':'#aa9164')+'"></span>'+(chordRace.active?(chordRace.method==='camera'?'Timed camera trial':'Timed keyboard trial'):live?'Chord · camera input active':'Chord · preview your shorthand')+'</span>'+btn(live?'Stop Chord input':'Start Chord input',live?'stop-live':'start-live',live?'small secondary':'small',cameraState==='loading'||chordRace.active?'disabled':'')+'</div>';
 renderMessage();$('#draft-status').textContent=draftNotice;$('#focus-label').textContent='Chord · words and phrases';
 $('#keyboard').classList.remove('finger-keyboard');$('#keyboard').setAttribute('aria-label','Chord shorthand');
 $('#keyboard').innerHTML='<section class="chord-workspace"><div class="chord-heading"><span class="badge">GESTURE SHORTHAND</span><h3>Hand shortcuts</h3><p>Close both fists to begin. Your <b>'+(environmentSettings().gridSwap?'right':'left')+' hand chooses bank 0–5</b>; the other hand chooses slot 1–5. When the text is armed, <b>close both fists to send</b>. Keep the slot hand closed while browsing.</p></div><div class="chord-live"><div><span>BANK</span><b id="chord-bank-count">—</b></div><div><span>SLOT</span><b id="chord-slot-count">—</b></div><section><strong id="chord-stage">Ready to practice</strong><p id="chord-preview">One code can write a whole phrase.</p><div class="meter"><div id="chord-meter" style="width:0"></div></div></section></div><div class="chord-mode-row">'+['shortcuts','words','spell'].map(mode=>btn(({shortcuts:'Shortcuts',words:'Word palette',spell:'Spell'})[mode],'chord-mode','small '+(chordBook.mode===mode?'':'secondary'),'data-mode="'+mode+'" '+(chordRace.active?'disabled':'')+' aria-pressed="'+(chordBook.mode===mode)+'"')).join('')+'</div><div id="chord-filter"></div><div id="chord-banks" class="chord-banks" aria-label="Chord banks"></div><div id="chord-deck" class="chord-deck"></div><details class="chord-settings"><summary>Timing & hand roles</summary><label>Time to arm<select id="chord-hold" '+(chordRace.active?'disabled':'')+'>'+[[120,'Fast · 0.12 s'],[180,'Balanced · 0.18 s'],[260,'Steady · 0.26 s']].map(([v,t])=>'<option value="'+v+'" '+((environmentSettings().chordHoldMs||180)===v?'selected':'')+'>'+t+'</option>').join('')+'</select></label><label class="toggle"><input type="checkbox" id="chord-swap" '+(environmentSettings().gridSwap?'checked':'')+' '+(chordRace.active?'disabled':'')+'> Swap bank and slot hands</label><p>If the wrong text arms, lower a hand briefly to cancel, then close both fists to restart.</p></details><details class="chord-codebook"><summary>Full codebook & shortcut editing</summary><div id="chord-codebook"></div></details></section>';
 $('#writer-help').innerHTML=chordBenchmarkHTML();
 $('#writer-actions').innerHTML=btn('Focus view','focus','secondary');$('#speech-status').textContent=speechStatus;
 const details=$('#chord-benchmark');details.addEventListener('toggle',()=>chordBenchmarkOpen=details.open);
 updateChordDisplay();updateChordBenchmark();updateTeachingPreview();
}
function updateChordDeck(){
 const target=chordComposer(),keys=chordBook.keys(target,shortcuts()),pending=chordStatus?.out?.pending;
 if(Number.isInteger(pending))chordBank=Math.floor(pending/5);
 const bank=Math.max(0,Math.min(5,chordBank)),deck=$('#chord-deck');
 const stamp=JSON.stringify([keys,bank,chordRace.active]);
 if(deck.dataset.stamp!==stamp){
  deck.dataset.stamp=stamp;
  $('#chord-banks').innerHTML=Array.from({length:6},(_,b)=>'<button class="chord-bank '+(b===bank?'selected':'')+'" data-action="chord-bank" data-bank="'+b+'" aria-label="Bank '+b+'" '+(chordRace.active?'disabled':'')+'><b>'+b+'</b><span>'+esc(keys.slice(b*5,b*5+5).filter(k=>k.kind!=='noop').slice(0,2).map(k=>k.label).join(' / ')||'Empty bank')+'</span></button>').join('');
  deck.innerHTML=keys.slice(bank*5,bank*5+5).map((k,i)=>{const index=bank*5+i;return '<div class="chord-tile"><button class="chord-key" data-action="chord-key" data-index="'+index+'" '+(k.kind==='noop'||chordRace.active?'disabled':'')+'><span class="chord-code">'+chordCode(index)+'</span><span><strong>'+esc(k.label)+'</strong><small>'+esc(k.kind==='shortcut'?k.value:k.kind==='filter'?'Narrow the next letter':k.kind==='word'?'Insert word + space':k.kind==='noop'?'Choose another bank':'Control')+'</small></span></button>'+(k.kind==='shortcut'?btn('Edit','chord-edit','chord-edit secondary small','data-slot="'+k.slot+'" aria-label="Edit shortcut '+chordCode(index)+'" '+(chordRace.active?'disabled':'')):'')+'</div>';}).join('');
  $('#chord-codebook').innerHTML=keys.map((k,i)=>'<div><b>'+chordCode(i)+'</b><span>'+esc(k.label)+'</span>'+(k.kind==='shortcut'?btn('Edit','chord-edit','small secondary','data-slot="'+k.slot+'" '+(chordRace.active?'disabled':'')):'')+'</div>').join('');
  $('#chord-filter').innerHTML=chordBook.filters.length?'<div class="chord-filter">Letter groups: '+chordBook.filters.map(g=>['A–E','F–J','K–O','P–T','U–Z'][g]).join(' → ')+' '+btn('Back one group','chord-back-filter','small secondary',chordRace.active?'disabled':'')+'</div>':chordBook.mode==='words'?'<p class="chord-word-help">Choose a word, or use bank 3 to narrow its next letter. Words are matched locally; names can be spelled.</p>':'';
 }
 document.querySelectorAll('.chord-key').forEach(b=>b.classList.toggle('armed',Number(b.dataset.index)===pending));
}
function updateChordDisplay(){
 if(!chordWriting()||!$('#chord-stage'))return;
 updateChordDeck();
 const pair=chordStatus?.pair||{},out=chordStatus?.out,pending=out?.pending,keys=chordBook.keys(chordComposer(),shortcuts()),k=Number.isInteger(pending)?keys[pending]:null;
 $('#chord-bank-count').textContent=pair.row??'—';$('#chord-slot-count').textContent=pair.col??'—';
 $('#chord-stage').textContent=chordRace.active&&chordRace.method==='keyboard'?'Keyboard trial below':!live?'Preview · start when ready':k?'Armed '+chordCode(pending)+' · close both fists':!out?.armed?'Close both fists to begin':pair.col===0?'Browse a bank, then raise 1–5 fingers':'Hold the code briefly';
 $('#chord-preview').textContent=k?(k.value&&typeof k.value==='string'&&k.kind==='shortcut'?k.value:k.label):pair.reason||'Your slot hand can stay closed while you choose a bank.';
 $('#chord-meter').style.width=(live?(out?.progress||0)*100:0)+'%';
 $('#finger-camera-text').textContent=(k?'Armed: '+(k.kind==='shortcut'?k.value:k.label):chordComposer().text.slice(-90))||'Close fists → code → close fists';
 const swap=environmentSettings().gridSwap;
 $('#camera-row-count').textContent=(swap?'Slot ':'Bank ')+(swap?pair.col??'—':pair.row??'—');
 $('#camera-col-count').textContent=(swap?'Bank ':'Slot ')+(swap?pair.row??'—':pair.col??'—');

}
function onChordFrame(frame){
 const pair=fingerPair(frame,environmentSettings().gridSwap),out=live&&!activeDialog?chordGate.update(pair,frame.handFrameAt,frame.now):null;
 chordStatus={pair,out};
 if(live&&Number.isInteger(pair.row)&&!Number.isInteger(out?.pending))chordBank=pair.row;
 if(out?.index!==null&&out?.index!==undefined)useChordKey(out.index,'camera');
 if(frame.now-lastUI>60){lastUI=frame.now;updateChordDisplay();}
}
function useChordKey(index,source){
 if(!chordWriting()||chordRace.active&&(source!=='camera'||chordRace.method!=='camera'))return;
 const target=chordComposer(),k=chordBook.keys(target,shortcuts())[index];if(!k||k.kind==='noop')return;
 if(chordRace.active&&k.kind==='action'&&['speak','clear','pause'].includes(k.value)){toast('Finish or stop the trial before using this control.');return;}
 const effect=chordBook.apply(target,k);
 if(chordRace.active){
  const complete=chordRace.update(target.text,performance.now(),{action:true});
  if(complete){live=false;resetInput();toast('Trial complete. Your comparison is below.');}
 }else handleEffect(effect);
 if(k.kind==='mode'||k.kind==='filter')chordBank=0;
 renderWriter();
}
function chordBenchmarkHTML(){
 return '<details id="chord-benchmark" class="chord-benchmark" '+(chordBenchmarkOpen?'open':'')+'><summary>Typing speed test</summary><p>Practice the codes first. Compare the same text using ordinary keyboard typing and camera chords. Each trial has a separate draft.</p><label>Scenario<select id="chord-scenario" '+(chordRace.active?'disabled':'')+'>'+Object.entries(RACE_SCENARIOS).map(([id,s])=>'<option value="'+id+'" '+(id===chordRace.scenario?'selected':'')+'>'+s.name+'</option>').join('')+'</select></label><blockquote class="chord-target">'+esc(chordRace.target)+'</blockquote><p class="chord-trial-note">'+esc(RACE_SCENARIOS[chordRace.scenario].note)+'</p><div class="button-row">'+btn('Start keyboard trial','chord-race-start','small secondary','data-method="keyboard" '+(chordRace.active?'disabled':''))+btn('Start camera trial','chord-race-start','small','data-method="camera" '+(chordRace.active?'disabled':''))+btn('Stop trial','chord-race-stop','small secondary',chordRace.active?'':'disabled')+'</div><div class="chord-race-clock"><b id="chord-elapsed">0.0 s</b><span id="chord-race-status"></span></div><label class="field" '+(chordRace.method==='keyboard'?'':'hidden')+'>Keyboard trial text<textarea id="chord-keyboard-trial" rows="4" autocomplete="off" autocapitalize="off" spellcheck="false" '+(chordRace.active&&chordRace.method==='keyboard'?'':'readonly')+'>'+esc(chordRace.method==='keyboard'?chordRace.composer.text:'')+'</textarea></label><pre id="chord-trial-output" '+(chordRace.method==='camera'?'':'hidden')+'></pre><div id="chord-race-results" class="chord-race-results"></div><p class="chord-trial-note">The timer includes selection and corrections, and stops only when the target matches. WPM = characters ÷ 5 ÷ minutes. Camera trials use camera input; keyboard trials block paste and drop. A result on reusable phrases does not establish general typing speed. Results last for this session; export to keep them.</p>'+btn('Export comparison','chord-race-export','small secondary')+'</details>';
}
function updateChordBenchmark(){
 if(!chordWriting()||!$('#chord-race-status'))return;
 $('#chord-race-status').textContent=chordRace.status;
 const result=chordRace.completed[chordRace.method],ms=chordRace.active?performance.now()-chordRace.started:result?.elapsedMs||0;
 $('#chord-elapsed').textContent=(ms/1000).toFixed(1)+' s';
 $('#chord-trial-output').textContent=chordRace.composer.text||'Your trial text appears here.';
 const results=chordRace.completed,stamp=JSON.stringify(results),el=$('#chord-race-results');
 if(el.dataset.stamp!==stamp){el.dataset.stamp=stamp;el.innerHTML=['keyboard','camera'].map(method=>'<div><span>'+method.toUpperCase()+'</span><b>'+(results[method]?results[method].wpm.toFixed(1):'—')+'</b><small>corrected WPM'+(results[method]?' · '+(results[method].elapsedMs/1000).toFixed(1)+' s':'')+'</small></div>').join('')+(results.camera&&results.keyboard?'<p>Camera: <strong>'+(results.camera.wpm/results.keyboard.wpm).toFixed(2)+'×</strong> keyboard throughput on this target. One trial per method.</p>':'');}
}
async function startChordRace(method){
 if(!chordWriting())return;live=false;chordRace.cancel();resetInput();chordBenchmarkOpen=true;
 if(method==='camera'&&cameraState!=='ready'){await startCamera();if(!chordWriting()||cameraState!=='ready')return;}
 chordBook.mode=RACE_SCENARIOS[chordRace.scenario].mode;chordBook.filters=[];chordBank=0;chordGate.holdMs=environmentSettings().chordHoldMs||180;
 chordRace.start(method,performance.now());live=method==='camera';renderWriter();
 if(method==='keyboard')$('#chord-keyboard-trial').focus();
}
document.addEventListener('input',e=>{
 if(e.target.id==='chord-keyboard-trial'&&chordRace.active&&chordRace.method==='keyboard'){
  if(chordRace.update(e.target.value,performance.now(),{action:true})){renderWriter();toast('Keyboard trial complete.');}else updateChordBenchmark();
 }
});
for(const event of ['paste','drop','beforeinput'])document.addEventListener(event,e=>{
 if(e.target.id==='chord-keyboard-trial'&&chordRace.active&&(event!=='beforeinput'||/insertFromPaste|insertFromDrop/.test(e.inputType))){e.preventDefault();chordRace.status='Paste and drop are disabled during keyboard trials.';updateChordBenchmark();}
});
setInterval(()=>{if(chordRace.active)updateChordBenchmark();},100);

function renderCirrinWriter(){
 $('#writer-status').innerHTML='<div class="input-strip"><span class="status"><span class="dot" style="background:'+(live?'#5a8b38':'#aa9164')+'"></span>'+(live?'Cirrin · camera input active':'Cirrin · drag on the ring or start your camera')+'</span>'+btn(live?'Stop Cirrin input':'Start Cirrin input',live?'stop-live':'start-live',live?'small secondary':'small',cameraState==='loading'?'disabled':'')+'</div>';
 renderMessage();$('#draft-status').textContent=draftNotice;$('#focus-label').textContent=composer.confirm?'Confirm '+composer.confirm:composer.paused?'Paused':'Cirrin · one stroke per word';
 const command=(label,type,value='')=>btn(label,'cirrin-command','secondary small','data-kind="'+type+'" data-value="'+esc(value)+'"');
 const controls=composer.confirm?command('Cancel','cancel')+command(composer.confirm==='speak'?'Speak now':'Clear message','confirm'):composer.paused?command('Resume','resume'):command('Space','text',' ')+command('.','punctuation','.')+command(',','punctuation',',')+command('?','punctuation','?')+command('Delete','delete')+command('Undo','undo')+command(composer.caps?'abc':'ABC','caps')+command('Clear message','clear');
 const keyboard=$('#keyboard');keyboard.classList.remove('finger-keyboard');keyboard.setAttribute('aria-label','Cirrin circular keyboard');
 keyboard.innerHTML='<section class="cirrin-workspace">'+penControlsHTML()+'<div class="cirrin-heading"><div><h3>Circular keyboard</h3></div><button class="button small secondary" data-action="cirrin-guide" id="cirrin-guide-button" aria-pressed="'+cirrin.guide+'">Show HELLO route</button></div><p class="cirrin-instructions" id="cirrin-instructions"><b>Start in the center with your pen down.</b> Visit a letter, then return inward before the next one. <b>Lift your pen to review</b>, then hold a thumbs-up to insert your word and a space.</p><div class="cirrin-board"><canvas id="cirrin-canvas" width="640" height="640" aria-label="Circular alphabet keyboard" aria-describedby="cirrin-instructions" tabindex="0"></canvas></div><div class="cirrin-feedback" aria-live="polite"><span class="eyebrow">CAPTURED WORD</span><strong id="cirrin-word">Your word will appear here</strong><p id="cirrin-status"></p></div><div class="cirrin-choices" id="cirrin-choices" aria-label="Word insertion choices"></div><div class="button-row cirrin-tools">'+btn('Review trace','cirrin-review','secondary small')+btn('Remove last letter','cirrin-back','secondary small')+btn('Clear trace','cirrin-clear','secondary small')+'</div><p class="cirrin-repeat">Double letter? Move inward, then back to the same tile. For <b>hello</b>: H → E → L → inward → L → O.</p><details class="cirrin-options"><summary>Movement range & positioning</summary><label>Movement needed<select id="cirrin-gain" aria-label="Cirrin movement range">'+[[2.4,'Small movements'],[1.8,'Medium movements'],[1.3,'Large movements']].map(([v,label])=>'<option value="'+v+'" '+(cirrin.gain===v?'selected':'')+'>'+label+'</option>').join('')+'</select></label><p>To reposition the dial, hold your drawing fingertip comfortably in view and use your other hand to press this button.</p>'+btn('Center on my finger','cirrin-center','small secondary')+'</details><details class="cirrin-manual"><summary>Click letters to spell or correct</summary><div>'+Array.from('abcdefghijklmnopqrstuvwxyz',c=>btn(c.toUpperCase(),'cirrin-letter','secondary small','data-letter="'+c+'" aria-label="Add '+c.toUpperCase()+' to word"')).join('')+'</div></details><p class="cirrin-credit">Inspired by <a href="https://sites.cc.gatech.edu/fce/pendragon/publications/cirrin98.pdf" target="_blank" rel="noopener noreferrer">Cirrin, Mankoff & Abowd (1998)</a>. Relay uses an alphabetical layout, webcam input, and explicit word review. Nearby words are optional local vocabulary suggestions.</p></section><div class="button-row cirrin-message-tools">'+controls+'</div>';
 $('#writer-help').innerHTML='<div class="keyboard-help"><span>Thumbs-up inserts your exact captured spelling.</span><span>Each inserted word can be undone in one step.</span></div>';
 $('#writer-actions').innerHTML=btn('Focus view','focus','secondary');$('#speech-status').textContent=speechStatus;
 const canvas=$('#cirrin-canvas'),point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};};
 canvas.addEventListener('pointerdown',e=>{if(composer.confirm||composer.paused)return;e.preventDefault();live=false;cirrin.pointerActive=true;canvas.setPointerCapture(e.pointerId);cirrin.pointer(point(e),true,performance.now());$('#writer-status .status').textContent='Ring pointer · camera input paused';const b=$('#writer-status button');b.textContent='Start Cirrin input';b.dataset.action='start-live';});
 canvas.addEventListener('pointermove',e=>{if(cirrin.pointerActive){const samples=e.getCoalescedEvents?.()||[];for(const p of samples.length?samples:[e])cirrin.pointer(point(p),true,p.timeStamp);}});
 const up=e=>{if(!cirrin.pointerActive)return;cirrin.pointerActive=false;if(e.type==='pointercancel')cirrin.trace.interrupt();else cirrin.pointer(point(e),false,performance.now());updateCirrinDisplay();};
 canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 updateCirrinDisplay();updateTeachingPreview();
}
function updateCirrinDisplay(){
 if(!cirrinWriting()||!$('#cirrin-canvas'))return;
 const trace=cirrin.trace,choices=cirrin.choices([...composer.personalWords,...COMMON]),blocked=!!composer.confirm||composer.paused;
 drawCirrin($('#cirrin-canvas'),cirrin);drawCirrin($('#air-overlay'),cirrin,{camera:true});
 $('#finger-camera-text').textContent=composer.text.slice(-60)||'Your next thought…';
 $('#air-camera-hud').textContent=trace.word?trace.word.toUpperCase()+(trace.phase==='review'?' · review':''):'Point in center';
 $('#cirrin-word').textContent=trace.word?(composer.caps?trace.word.toUpperCase():trace.word):'Your word will appear here';
 $('#cirrin-status').textContent=blocked?'Finish the message confirmation before tracing.':trace.interrupted?'Tracking interrupted. Check the captured spelling before inserting.':trace.hint;
 const el=$('#cirrin-choices'),stamp=JSON.stringify([choices,composer.caps,blocked]);
 if(el.dataset.stamp!==stamp){el.dataset.stamp=stamp;el.innerHTML=choices.map((c,i)=>btn(esc(composer.caps?c.word.toUpperCase():c.word)+'<small>'+c.kind+' · insert + space</small>','cirrin-accept','cirrin-choice '+(i===0?'primary':''),'data-word="'+esc(c.word)+'" '+(blocked?'disabled':''))).join('');}
 for(const action of ['cirrin-review','cirrin-back'])$('[data-action="'+action+'"]').disabled=!trace.word||blocked;
 const guide=$('#cirrin-guide-button');guide.textContent=cirrin.guide?'Hide HELLO route':'Show HELLO route';guide.setAttribute('aria-pressed',String(cirrin.guide));


}

function renderAirWriter(){
 $('#writer-status').innerHTML='<div class="input-strip"><span class="status"><span class="dot" style="background:'+(live?'#5a8b38':'#aa9164')+'"></span>'+(live?'Air writing · camera active':'Air writing · draw on the pad or start your camera')+'</span>'+btn(live?'Stop air writing':'Start air writing',live?'stop-live':'start-live',live?'small secondary':'small',cameraState==='loading'||air.state==='loading'?'disabled':'')+'</div>';
 renderMessage();$('#draft-status').textContent=draftNotice;
 $('#focus-label').textContent=composer.confirm?'Confirm '+composer.confirm:composer.paused?'Paused':'Air letters · '+(composer.caps?'UPPERCASE':'lowercase output');
 const keyboard=$('#keyboard');keyboard.classList.remove('finger-keyboard');keyboard.setAttribute('aria-label','Air letter writing');
 const command=(label,type,value='')=>btn(label,'air-command','secondary small','data-kind="'+type+'" data-value="'+esc(value)+'"');
 const commands=composer.confirm?command('Cancel','cancel')+command(composer.confirm==='speak'?'Speak now':'Clear message','confirm'):composer.paused?command('Resume','resume'):command('Space','text',' ')+command('.','text','.')+command(',','text',',')+command('?','text','?')+command('Delete','delete')+command('Undo','undo')+command(composer.caps?'abc':'ABC','caps')+command('Clear message','clear');
 keyboard.innerHTML='<section class="air-workspace">'+penControlsHTML()+'<div class="air-guide"><span class="badge">A–Z · ON-DEVICE AI</span><h3>Trace a letter</h3><ol><li><strong>Draw with your selected pen control.</strong> Move your index fingertip to form a printed letter.</li><li><strong>Lift to reposition.</strong> Use the lift action shown above, then start the next stroke. Pause with the pen lifted for AI suggestions.</li><li><strong>Review, then insert.</strong> Hold a thumbs-up to use the first suggestion, or click any letter choice.</li></ol></div><div class="air-pad"><canvas id="air-canvas" width="640" height="480" aria-label="Letter drawing pad. Drag to draw; use Recognize letter when finished." tabindex="0"></canvas><span class="air-pad-label">YOUR LETTER</span><span class="air-ink-badge" id="air-ink-badge">PEN LIFTED</span></div><div class="air-feedback" role="status"><strong id="air-status"></strong><span id="air-detail"></span></div><div class="air-candidates" id="air-candidates" aria-label="AI letter suggestions"></div><div class="button-row air-tools">'+btn('Recognize letter','air-recognize','secondary small')+btn('Clear drawing','air-clear','secondary small')+'</div><details class="air-correction" id="air-correction" hidden><summary>Choose a different letter</summary><div>'+Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ',c=>btn(c,'air-accept','small secondary','data-letter="'+c+'" aria-label="Insert '+c+'"')).join('')+'</div></details><p class="small-text muted air-note">One letter at a time. Draw printed letters as they appear on screen. Suggestions are estimates; no letter is inserted until you confirm. You can also draw on the pad with a mouse or touch.</p></section><div class="button-row air-message-tools">'+commands+'</div>';
 $('#writer-help').innerHTML='<div class="keyboard-help"><span>Your drawing stays on this device.</span><span>Switch environments to use the full punctuation and phrase keyboard.</span></div>';
 $('#writer-actions').innerHTML=btn('Focus view','focus','secondary');$('#speech-status').textContent=speechStatus;
 const canvas=$('#air-canvas');let drawing=false;
 const point=e=>{const r=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))/air.aspect};};
 canvas.addEventListener('pointerdown',e=>{if(composer.confirm||composer.paused)return;e.preventDefault();live=false;air.thumbSince=null;drawing=true;canvas.setPointerCapture(e.pointerId);air.pointer(point(e),true,performance.now());$('#writer-status .status').textContent='Drawing pad · camera input paused';const b=$('#writer-status button');b.textContent='Start air writing';b.dataset.action='start-live';});
 canvas.addEventListener('pointermove',e=>{if(drawing)air.pointer(point(e),true,performance.now());});
 const release=e=>{if(!drawing)return;drawing=false;air.pointer(point(e),false,performance.now());if(e.type!=='pointercancel')void air.recognize();};
 canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
 updateAirDisplay();updateTeachingPreview();
}
function updateAirDisplay(){
 if(!airWriting()||!$('#air-status'))return;
 air.draw($('#air-canvas'),true);air.draw($('#air-overlay'));
 $('#finger-camera-text').textContent=composer.text.slice(-60)||'Your next thought…';
 const status=air.state==='loading'?'Loading handwriting AI…':air.state==='recognizing'?'Reading your letter…':air.state==='error'?'Recognition needs attention':air.candidates.length?(air.ambiguous?'A few possible readings':'Choose your letter'):air.ink.down?'Drawing your letter':air.ink.usable?'Lifted · add another stroke or recognize':'Point to begin a letter';
 $('#air-status').textContent=status;
 $('#air-camera-hud').textContent=air.candidates.length?'Choose: '+air.candidates.map(c=>c.letter).join(' · '):air.ink.down?'● Ink on':air.state==='recognizing'?'Reading…':'Point to draw';
 const start=$('#writer-status [data-action="start-live"]');if(start)start.disabled=air.state==='loading'||cameraState==='loading';
 $('#air-detail').textContent=air.state==='error'?air.error:air.candidates.length?'Thumbs-up for '+air.candidates[0].letter+', or choose below. Start drawing again to add another stroke.':live?(air.hint||'Keep one hand in view.'):'Drag on the pad, or start air writing to use your camera.';
 $('#air-ink-badge').textContent=air.ink.down?'● INK ON':'○ PEN LIFTED';
 $('#air-ink-badge').classList.toggle('inking',air.ink.down);
 const el=$('#air-candidates'),stamp=air.candidates.map(c=>c.letter).join('');
 if(el.dataset.stamp!==stamp){el.dataset.stamp=stamp;el.innerHTML=air.candidates.map((c,i)=>btn((composer.caps?c.letter:c.letter.toLowerCase())+'<small>'+(i===0?'FIRST CHOICE':'ALTERNATIVE')+'</small>','air-accept','air-choice '+(i===0?'primary':''),'data-letter="'+c.letter+'" aria-label="Insert '+c.letter+'"')).join('');}
 $('#air-correction').hidden=!air.candidates.length;
 const recognize=$('[data-action="air-recognize"]');recognize.disabled=!air.ink.usable||air.state==='recognizing'||!!composer.confirm||composer.paused;


}

function checkView(){
 if(!profile)return noProfile();const summary=trialSummary(currentTrials()),rests=currentTrials().filter(t=>t.kind==='rest');
 return heading('Check accuracy')+'<div class="metrics"><div class="card metric"><div class="eyebrow">CHECKED</div><b>'+summary.total+'</b><small>separate attempts</small></div><div class="card metric"><div class="eyebrow">CORRECT</div><b>'+(summary.accuracy===null?'—':Math.round(summary.accuracy*100)+'%')+'</b><small>'+summary.correct+' / '+summary.total+' attempts</small></div><div class="card metric"><div class="eyebrow">REST CHECKS</div><b>'+rests.filter(t=>t.passed).length+' / '+rests.length+'</b><small>no false selections & adequate tracking</small></div></div>'+(!model?'<div class="notice warn">Record rest and at least three examples for each enabled gesture first.</div>':'')+'<div class="card"><h3>Check a gesture</h3><p class="small-text muted">Try your gesture five times. Start at rest, follow the prompt, then return to rest. These attempts test recognition; they do not change training.</p><div class="test-choice"><label class="field">Gesture<select id="test-gesture">'+profile.gestures.filter(g=>g.enabled!==false&&g.samples.length).map(g=>'<option value="'+g.id+'">'+esc(g.name)+'</option>').join('')+'</select></label>'+btn('Run 5 attempts','validate','',!model||busy?'disabled':'')+'</div></div><div class="card"><h3>Check everyday rest</h3><p class="small-text muted">Read the screen, blink, and rest naturally. We measure accidental selections and time with usable tracking.</p><div class="button-row">'+btn('30-second check','rest-check','secondary','data-duration="30000" '+(!model||busy?'disabled':''))+btn('5-minute check','rest-check','secondary','data-duration="300000" '+(!model||busy?'disabled':''))+'</div></div><div id="record-area"></div><div class="card"><div class="section-label" style="margin-top:0"><h3>Recorded results</h3>'+btn('Export report','export-report','small secondary')+'</div>'+(currentTrials().length?'<div class="table-wrap"><table><thead><tr><th>Test</th><th>Result</th><th>Details</th></tr></thead><tbody>'+currentTrials().slice(-30).reverse().map(t=>'<tr><td>'+esc(t.label||'Rest')+'</td><td class="'+(t.passed?'result-pass':'result-fail')+'">'+(t.passed?'Pass':'Needs practice')+'</td><td>'+esc(t.detail)+'</td></tr>').join('')+'</tbody></table></div>':'<p class="small-text muted">No test results yet.</p>')+'</div><p class="small-text muted">Results apply to this profile version and these test conditions. Small practice sets are not clinical validation. Retraining starts a new set of results; older records remain in exports.</p>';
}
function profilesView(){
 return heading('Settings')+displaySettingsView()+'<div class="button-row" style="margin-bottom:22px">'+btn('＋ New profile','new-profile')+btn('Import backup','import','secondary')+'<input type="file" accept=".json,application/json" id="import-file" hidden></div>'+profiles.map(p=>'<div class="card profile-card"><div><h3>'+esc(p.name)+(p===profile?' <span class="badge">Active</span>':'')+'</h3><p>'+(p.modality==='combined'?'All signals · face + both hands':p.modality==='face'?'Face & head · classic profile':'Hand · classic profile')+' · '+p.gestures.length+' gestures · '+p.rest.length+' resting samples</p></div><div class="button-row">'+btn('Use','use-profile','small secondary','data-id="'+p.id+'"')+btn('Export','export-profile','small secondary','data-id="'+p.id+'"')+btn('Delete','delete-profile','small danger','data-id="'+p.id+'"')+'</div></div>').join('')+(profile?settingsView()+'<details class="card settings-details"><summary>Personal words & phrases</summary>'+vocabularyView(profile)+'</details>':'')+'<div class="notice">Profiles and drafts are saved in this browser. Export a profile before clearing browser data or switching devices. Camera video is not saved.</div>';
}
function settingsView(){return '<form id="settings-form" class="card"><h3>Settings for '+esc(profile.name)+'</h3><div class="settings-grid"><label class="field">Navigation<select name="mode"><option value="step" '+(profile.settings.mode==='step'?'selected':'')+'>Two gestures: next + select</option><option value="auto" '+(profile.settings.mode==='auto'?'selected':'')+'>One gesture: automatic scanning + select</option></select></label><label class="field">Scan interval<select name="scanMs">'+[900,1400,2000,3000,4000].map(v=>'<option value="'+v+'" '+(v===profile.settings.scanMs?'selected':'')+'>'+(v/1000)+' seconds</option>').join('')+'</select></label><label class="field">Hold a gesture for<select name="holdMs">'+[250,450,650,900,1200,1600].map(v=>'<option value="'+v+'" '+(v===profile.settings.holdMs?'selected':'')+'>'+(v/1000)+' seconds</option>').join('')+'</select><small>Longer holds may reduce accidental selections.</small></label><label class="field">Return to rest for<select name="restMs">'+[250,350,500,750,1000].map(v=>'<option value="'+v+'" '+(v===profile.settings.restMs?'selected':'')+'>'+(v/1000)+' seconds</option>').join('')+'</select></label></div><label class="toggle"><input type="checkbox" name="audio" '+(profile.settings.audio?'checked':'')+'> Read scan highlights aloud (uses available browser voice)</label><button class="button secondary" type="submit">Save settings</button></form>';}
function openDialog(html){const trigger=document.activeElement;if(activeDialog)activeDialog.remove();const d=document.createElement('dialog');d.innerHTML=html;d.setAttribute('aria-labelledby','dialog-title');document.body.append(d);activeDialog=d;d.addEventListener('close',()=>{d.remove();if(activeDialog===d)activeDialog=null;if(trigger?.isConnected)trigger.focus({preventScroll:true});});d.showModal();d.querySelector('input:not([type=checkbox]),select,textarea')?.focus();return d;}
const dialogHeader=t=>'<div class="dialog-top"><h2 id="dialog-title">'+t+'</h2><button class="icon-button" data-action="close-dialog" aria-label="Close dialog">×</button></div>';
function newProfileDialog(){openDialog(dialogHeader('Create a profile')+'<p>Save your gestures and settings on this device.</p><form id="profile-form"><label class="field">Profile name<input name="name" maxlength="65" value="My profile" required></label><button class="button full" type="submit">Start setup</button></form>');}
function gestureDialog(id,writing=false){
 const g=profile.gestures.find(g=>g.id===id),defaultKind=writing?'motion':'pose',defaultAction=writing?'insert':profile.gestures.some(g=>g.action==='select')?'next':'select';
 openDialog(dialogHeader(g?'Edit gesture':writing?'Teach a writing movement':'Add a gesture')+'<p>Name the gesture and choose what it does. Keep the parts you use visible during rest and recording.</p><form id="gesture-form" data-id="'+(g?.id||'')+'"><label class="field">Gesture name<input name="name" maxlength="65" placeholder="Name your movement" value="'+esc(g?.name||'')+'" required></label>'+(profile.modality==='combined'?'<label class="field">How do you perform it?<select name="kind"><option value="pose" '+((g?.kind||defaultKind)!=='motion'?'selected':'')+'>Hold a pose</option><option value="motion" '+((g?.kind||defaultKind)==='motion'?'selected':'')+'>Make a swipe or movement</option></select><small>Hold a pose: a face or hand shape. Movement: a short motion with a pause at the end.</small></label>':'')+'<label class="field">What should it do?<select name="action">'+Object.entries(actions).map(([v,l])=>'<option value="'+v+'" '+((g?.action||defaultAction)===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label><label class="field" id="insert-text-field" '+((g?.action||defaultAction)==='insert'?'':'hidden')+'>Text for “Insert text”<input name="value" maxlength="300" placeholder="A letter, word, or personal phrase" value="'+esc(g?.value||'')+'"><small>Enter the letter, word, or phrase this gesture should write.</small></label>'+(g?'<label class="toggle"><input name="enabled" type="checkbox" '+(g.enabled!==false?'checked':'')+'> Enable this gesture</label>':'')+'<div class="button-row"><button class="button" type="submit">'+(g?'Save changes':'Add & record')+'</button>'+(g?btn('Delete gesture','delete-gesture','danger','data-id="'+g.id+'"'):'')+'</div></form>');
}
function selectProfile(id){lastGestureMessage='';if(busy)return;const p=profiles.find(p=>p.id===id);if(!p)return;camera.stop();cameraState='off';cameraMessage='Profile changed. Enable the camera when you’re ready.';profile=p;rememberProfile(profile);composer=new RelayComposer(profile);restoreDraft();live=false;latest=null;rebuild();render();}
function updateCamera(){
 document.body.dataset.camera=cameraState;
 updateTeachingPreview();
 const trailsAllowed=flowWriting()||chordWriting()||cirrinWriting()||airWriting()||fingerWriting()||profile?.modality!=='face';
 $('#trails-toggle').checked=trailsEnabled;$('#trails-toggle').disabled=!trailsAllowed;
 $('#trails-help').textContent=cirrinWriting()?'Your word path stays visible until you insert or clear it.':airWriting()?'Fading trails are optional. Letter ink stays until you insert or clear it.':trailsAllowed?'Trace with your index fingers. Brief tracking gaps reconnect; trails fade in 1.4 seconds.':'Use an all-signals or hand profile for fingertip trails.';
 camera.setTrails?.(trailsEnabled&&trailsAllowed);

 if(cameraState!=='ready')$('#camera-performance').hidden=true;
 if(cameraState!=='ready'){if(view==='studio'&&$('#live-insights'))$('#live-insights').innerHTML='<div class="empty-state">Enable your camera to see the recognizer work.</div>';$('#signal-name').textContent='Camera off';$('#signal-detail').textContent='—';$('#signal-meter').style.width='0';}
 $('#camera-status').textContent=cameraMessage;if(cameraState!=='ready'&&$('#tracking-parts'))$('#tracking-parts').textContent='';
 $('#camera-pill').textContent=cameraState==='ready'?'On':cameraState==='loading'?'Starting':cameraState==='error'?'Check permission':'Off';
 $('#camera-pill').classList.toggle('green',cameraState==='ready');
 $('#camera-placeholder').classList.toggle('hidden',cameraState==='ready');
 $('#camera-button').textContent=cameraState==='loading'?'Loading vision…':cameraState==='ready'?'Turn camera off':'Enable camera';
 $('#camera-button').disabled=cameraState==='loading'||busy;
}
function onCameraState(state,message){if(state==='ready')queueMicrotask(syncCameraForContext);cameraState=state;cameraMessage=message;if(state==='error'||state==='off'){flowRace.cancel('Trial cancelled because camera tracking stopped.');chordRace.cancel('Trial cancelled because camera tracking stopped.');live=false;if(!creator.previewStarting)creator.stopPreview();resetInput();}updateCamera();if(view==='write')renderWriter();}
function onFrame(frame){
 latest=frame;
 const personalInput=creatorView()?creator.runtime?.block?.input.source==='scan':customWriting()?customRuntime?.block?.input.source==='scan':!flowWriting()&&!chordWriting()&&!cirrinWriting()&&!airWriting()&&!fingerWriting();
 if(creatorView())creator.runtime?.frame(frame,creator.previewEnabled()&&!activeDialog);
 else if(customWriting())customRuntime?.frame(frame,live&&!activeDialog);
 else if(flowWriting()){if(!flow.pointerActive)flow.update(frame,live&&!activeDialog&&!flowComposer().confirm&&!flowComposer().paused);}
 else if(chordWriting())onChordFrame(frame);
 else if(cirrinWriting()){if(!cirrin.pointerActive)cirrin.update(frame,live&&!activeDialog&&!composer.confirm&&!composer.paused);}
 else if(airWriting()){if(live)air.update(frame,!activeDialog&&!composer.confirm&&!composer.paused);}
 else if(fingerWriting())onFingerFrame(frame);
 if(requiredTracking(model,frame.vector,true,profile))lastTracking=frame.now;
 if(recording){recording.total++;if(frame.vector){recording.frames.push(frame.vector);recording.tracked++;}}
 let result=frame.vector?(model?.combined?predictCombined(model,frame.vector):predict(model,frame.vector)):{id:UNKNOWN,reason:'No tracking',score:0};
 let observed=result,event=null;
 if(model?.combined){const out=gate.updateFrame(frame.vector,frame.now);result=out.result;event=out.event;if(result.id!==REST&&result.id!==UNKNOWN)observed=result;}
 else if(!frame.vector)gate.reset();else if(model)event=gate.update(result.id,frame.now);
 if(restCheck){restCheck.total++;if(requiredTracking(model,frame.vector))restCheck.tracked++;if(event)restCheck.events.push(event);}
 if(attempt&&event)attempt.events.push(event);
 if(event&&personalInput&&creatorView()&&creator.previewEnabled()&&!activeDialog){const g=profile?.gestures.find(g=>g.id===event);if(g)creator.runtime?.gesture(g.action,g.value);}
 if(event&&personalInput&&live&&view==='write'&&!activeDialog){const g=profile.gestures.find(g=>g.id===event);if(g){dispatchGesture(g);lastScan=frame.now;}}
 if(frame.now-lastUI>120){
  lastUI=frame.now;
  const performanceLine=$('#camera-performance'),metrics=frame.metrics;
  performanceLine.hidden=!metrics||cameraState!=='ready';
  if(metrics){
   const rate=profile?.modality==='face'?'Face '+metrics.faceFps:'Hands '+metrics.handFps;
   performanceLine.textContent=metrics.warming?'Warming up tracking…':'Camera '+metrics.cameraFps+' fps · '+rate+' fps'+(trailsEnabled&&profile?.modality!=='face'&&!metrics.handVisible?' · Hand out of view':'');
   performanceLine.title='Camera frames and vision frames processed in the last second.';
  }
  const tracking=$('#tracking-parts');if(tracking)tracking.innerHTML=profile?.modality==='combined'?CHANNELS.map(c=>'<span class="'+(frame.vector?.[c.mask]>.95?'visible':'')+'">'+c.name+(frame.vector?.[c.mask]>.95?' ✓':' —')+'</span>').join(''):'';

  $('#signal-name').textContent=!frame.vector?'No tracking':!model?'Ready to learn':observed.id===REST?'Resting':observed.id===UNKNOWN?'Uncertain — no action':observed.label||profile?.gestures.find(g=>g.id===observed.id)?.name||'Uncertain';
  $('#signal-detail').textContent=!frame.vector?'Move into view':model?(gate.armed?'Ready':'Return to rest'):Math.round(frame.latency)+' ms';
  $('#signal-meter').style.width=(gate.progress*100)+'%';
  if(view==='studio'&&$('#live-insights'))$('#live-insights').innerHTML=liveInsightHTML(model,frame.vector,result,gate,frame.latency);
 }
}
function dispatchGesture(g){if(customWriting()){customRuntime?.gesture(g.action,g.value);return;}const before=composer.text;let effect;if(g.action==='next')composer.next();else if(g.action==='select')effect=composer.select();else effect=composer.direct(g.action,g.value);if(g.action==='insert'&&composer.text!==before)lastGestureMessage='Wrote “'+g.value+'” with '+g.name+'.';handleEffect(effect);renderWriter();}
function handleEffect(effect){if(effect==='focus')toggleFocus();if(effect==='bookmark')saveMessagePhrase();if(effect==='speak')say(composer.text);if(effect==='pause'){speakingMessage=false;window.speechSynthesis?.cancel();toast('Paused. Select Resume to continue.');}}
function say(text,cue=false){
 if(cue&&speakingMessage)return;
 if(!('speechSynthesis' in window)){speechStatus='Speech is unavailable in this browser. Your message remains visible.';toast(speechStatus);return;}
 speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text),voices=speechSynthesis.getVoices();
 u.voice=voices.find(v=>v.localService&&v.lang.startsWith('en'))||voices.find(v=>v.localService)||null;
 if(!u.voice){speechStatus='No local voice is installed. Install a system voice to use offline speech.';if(!cue){toast(speechStatus);renderWriter();}return;}
 u.rate=cue?1.1:0.95;u.onstart=()=>{if(!cue){speechStatus='Speaking…';if($('#speech-status'))$('#speech-status').textContent=speechStatus;
 $('#draft-status').textContent=draftNotice;
 if(live||document.body.classList.contains('focus-mode'))requestAnimationFrame(()=>document.querySelector('.focus-row')?.scrollIntoView({block:'nearest'}));}};
 u.onend=()=>{if(!cue){speakingMessage=false;speechStatus='Finished speaking.';if($('#speech-status'))$('#speech-status').textContent=speechStatus;
 $('#draft-status').textContent=draftNotice;
 if(live||document.body.classList.contains('focus-mode'))requestAnimationFrame(()=>document.querySelector('.focus-row')?.scrollIntoView({block:'nearest'}));}};
 u.onerror=e=>{if(['interrupted','canceled'].includes(e.error))return;speakingMessage=false;speechStatus='Speech unavailable ('+e.error+'). Your message is still visible.';if($('#speech-status'))$('#speech-status').textContent=speechStatus;
 $('#draft-status').textContent=draftNotice;
 if(live||document.body.classList.contains('focus-mode'))requestAnimationFrame(()=>document.querySelector('.focus-row')?.scrollIntoView({block:'nearest'}));};
 if(!cue)speakingMessage=true;
 speechSynthesis.speak(u);
}
async function enableCamera(){if(!profile&&!creatorView()&&!customWriting()&&!fingerWriting()&&!airWriting()&&!cirrinWriting()&&!chordWriting()&&!flowWriting()){newProfileDialog();return;}if(cameraState==='ready'){camera.stop();cameraState='off';cameraMessage='Camera turned off.';live=false;creator.stopPreview();resetInput();updateCamera();renderWriter();return;}await startCamera();if(cameraState==='ready'&&view==='write'&&environment==='classic'&&model&&activeCapabilities().canWrite)await startLive();}
function requireCamera(){if(cameraState!=='ready'){toast('Enable the camera before recording.');return false;}if(!latest?.vector||performance.now()-latest.now>700){toast('Move into view so the camera can track you.');return false;}return true;}
function progress(title,detail,fraction=0){
 const newPhase=teachingPhase?.title!==title;teachingPhase={title,detail,fraction};updateTeachingPreview();
 if(newPhase)$('#phase-announcement').textContent=title+'. '+detail;
 const area=$('#record-area');if(!area)return;
 if(area.dataset.phase!==title){area.dataset.phase=title;area.innerHTML='<section class="record-panel" aria-label="Recording instructions"><h2></h2><p></p><progress max="1" aria-label="Recording progress"></progress><div class="button-row">'+btn('Cancel recording','cancel-task','secondary')+'</div></section>';}
 area.querySelector('h2').textContent=title;area.querySelector('p').textContent=detail;area.querySelector('progress').value=fraction;
}
async function waitPhase(ms,title,detail,token){const start=performance.now();while(performance.now()-start<ms){if(token!==task)throw new Error('Cancelled');progress(title,detail,Math.min(1,(performance.now()-start)/ms));await sleep(100);}}
async function capture(ms,token){recording={frames:[],total:0,tracked:0};try{await waitPhase(ms,'Hold your gesture','Keep it comfortable and steady.',token);const r=recording;if(r.frames.length<6||r.tracked/Math.max(1,r.total)<0.8)throw new Error('Too little tracking. Adjust the camera and try this recording again.');return summarizeCapture(r.frames);}finally{recording=null;}}
function beginTask(){busy=true;live=false;teachingPhase=null;const token=++task;render();resetInput();requestAnimationFrame(()=>$('#camera-prompt-cancel')?.focus({preventScroll:true}));setTimeout(()=>$('#record-area')?.scrollIntoView({block:'start',behavior:'auto'}),50);return token;}
function endTask(token){if(token!==task)return;busy=false;teachingPhase=null;recording=null;attempt=null;restCheck=null;resetInput();render();$('#main').focus({preventScroll:true});}
async function recordRest(){
 if(!requireCamera())return;const token=beginTask(),samples=[];
 try{
  await waitPhase(3000,'Get ready to rest','Keep the face or hands you use visible and relaxed.',token);
  const start=performance.now();recording={frames:[],total:0,tracked:0};let seen=0;
  while(performance.now()-start<12000){if(token!==task)throw new Error('Cancelled');progress('Recording rest','Blink and move naturally. '+Math.ceil((12000-performance.now()+start)/1000)+' seconds remaining.',(performance.now()-start)/12000);await sleep(400);if(recording.frames.length-seen>=4){samples.push(summarizeCapture(recording.frames.slice(seen)));seen=recording.frames.length;}}
  if(samples.length<12||recording.tracked/Math.max(1,recording.total)<0.85)throw new Error('The camera lost tracking too often. Keep yourself visible and record rest again.');
  profile.rest=samples;changed();toast('Rest learned. Now teach your first deliberate movement.');
 }catch(e){if(token===task)toast(e.message);}finally{endTask(token);}
}
function summarizeCapture(frames){return profile?.modality==='combined'?summarizeVisible(frames):summarize(frames);}
async function recordGesture(id){
 if(!requireCamera())return;const g=profile.gestures.find(g=>g.id===id);if(!g)return;const token=beginTask(),samples=[];
 try{
  for(let i=0;i<5;i++){
   recording={frames:[],total:0,tracked:0};
   await waitPhase(2500,'Return to rest','Example '+(i+1)+' of 5 · Keep the parts you use visible and relaxed. Wait for Now before making your gesture.',token);
   const neutralFrames=recording.frames;recording=null;
   const neutral=neutralFrames.length>=6?summarizeCapture(neutralFrames.slice(-Math.max(6,Math.floor(neutralFrames.length*.6)))):null;
   await waitPhase(2000,'Get ready: '+g.name,g.kind==='motion'?'Wait for Now. Make one movement, then pause at its endpoint.':'Perform your movement when recording begins.',token);
   let sample;
   if(g.kind==='motion'){
    recording={frames:[],total:0,tracked:0};
    await waitPhase(2400,'Now: '+g.name,'Move once, then stay at the endpoint until this recording ends. Do not return yet.',token);
    const frames=recording.frames;recording=null;
    if(frames.length<10)throw new Error('Too little tracking. Keep the parts you use in view throughout the movement.');
    sample={...summarizeCapture(frames),sequence:resample(frames,24),durationMs:2400};
   }else{
    await waitPhase(700,'Now: '+g.name,'Make your movement and hold briefly.',token);
    sample=await capture(1300,token);
   }
   if(neutral)sample.neutral=neutral;samples.push(sample);
  }
  const previous=g.samples,previousChannels=g.trainedChannels;g.samples=samples;
  try{if(profile.modality==='combined'){const learned=trainCombined({...profile,gestures:[{...g,enabled:true}]});g.trainedChannels=learned.entries[0].channels.map(c=>c.name);if(profile.gestures.filter(x=>x.enabled!==false).every(x=>x.samples.length>=3))trainCombined(profile);}}
  catch(e){g.samples=previous;g.trainedChannels=previousChannels;throw e;}
  changed();toast('Five examples saved for '+g.name+(g.trainedChannels?.length?' · Learned: '+g.trainedChannels.join(' + '):'')+'. Test fresh attempts next.');
 }catch(e){if(token===task)toast(e.message);}finally{endTask(token);}
}
async function validateGesture(){
 if(!requireCamera()||!model)return;const id=$('#test-gesture').value,g=profile.gestures.find(g=>g.id===id);if(!g)return;const token=beginTask();
 try{for(let i=0;i<5;i++){resetInput();await waitPhase(3000,'Rest before attempt '+(i+1),'Let the recognizer settle into your resting state.',token);attempt={events:[]};await waitPhase(Math.max(4500,profile.settings.holdMs+2200),'Now: '+g.name,(g.kind==='motion'?'Make one movement, pause briefly at its endpoint, then return to your starting pose.':'Perform once, then return to rest.')+' Attempt '+(i+1)+' of 5.',token);const events=attempt.events;attempt=null;const passed=events.length===1&&events[0]===id;profile.trials.push({kind:'attempt',at:new Date().toISOString(),revision:profile.revision||0,label:g.name,expected:id,events,passed,detail:!events.length?'No selection':events.length>1?events.length+' selections':events[0]===id?'One correct selection':'Selected '+(profile.gestures.find(x=>x.id===events[0])?.name||'another gesture')});persist();}toast('Five independent attempts recorded. Review your results below.');}catch(e){if(token===task)toast(e.message);}finally{endTask(token);}
}
async function validateRest(duration){
 if(!requireCamera()||!model)return;const token=beginTask();
 try{await waitPhase(2500,'Get comfortable','Read, blink, and rest as you normally would.',token);restCheck={events:[],total:0,tracked:0};resetInput();await waitPhase(duration,'Rest check in progress','Relax naturally. Any accidental selections will be counted.',token);const r=restCheck,tracking=r.tracked/Math.max(1,r.total),passed=!r.events.length&&tracking>=0.85;restCheck=null;profile.trials.push({kind:'rest',at:new Date().toISOString(),revision:profile.revision||0,label:'Rest · '+duration/1000+' sec',passed,durationMs:duration,tracking,events:r.events,detail:r.events.length+' selections · '+Math.round(tracking*100)+'% tracking'});persist();toast('Rest check recorded.');}catch(e){if(token===task)toast(e.message);}finally{endTask(token);}
}
function cancelTask(){task++;busy=false;teachingPhase=null;recording=null;attempt=null;restCheck=null;resetInput();render();$('#main').focus({preventScroll:true});toast('Cancelled. Incomplete recordings were not saved.');}
function download(name,data){const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportOne(id){const p=profiles.find(p=>p.id===id);if(p)download('relay-'+p.name.replace(/[^a-z0-9]/gi,'-')+'.json',exportProfile(p));}
function deleteProfile(id){const p=profiles.find(p=>p.id===id);if(!p)return;openDialog(dialogHeader('Delete this profile?')+'<p>'+esc(p.name)+' and its recordings will be removed from this browser. Export a backup first if you want to keep it.</p><div class="button-row">'+btn('Export backup','export-profile','secondary','data-id="'+p.id+'"')+btn('Delete profile','confirm-delete-profile','danger','data-id="'+p.id+'"')+'</div>');}
async function startLive(){
 if(customWriting()){const id=environment;if(customRuntime?.block?.input.source==='scan'&&!model){toast('Teach a Select gesture first, or use the on-screen Next and Select buttons.');return;}if(cameraState!=='ready')await startCamera();if(environment!==id||!customWriting()||cameraState!=='ready')return;resetInput();live=true;renderWriter();return;}
 if(flowWriting()){
  flowRace.cancel();resetInput();await flow.load();if(!flowWriting())return;
  if(cameraState!=='ready'){await startCamera();if(!flowWriting()||cameraState!=='ready')return;}
  live=true;renderWriter();toast('Move to the first letter with an open hand. Point through the word, then open to finish.');return;
 }

 if(chordWriting()){
  chordRace.cancel();resetInput();chordGate.holdMs=environmentSettings().chordHoldMs||180;
  if(cameraState!=='ready'){await startCamera();if(!chordWriting()||cameraState!=='ready')return;}
  live=true;renderWriter();toast('Close both fists to arm. Form a code, then close both fists to send.');return;
 }
 if(cirrinWriting()){
  resetInput();if(cameraState!=='ready'){await startCamera();if(!cirrinWriting()||cameraState!=='ready')return;}
  live=true;renderWriter();toast('Point in the center, visit letters, then open your hand to review.');return;
 }
 if(airWriting()){
  resetInput();await air.load();if(!airWriting())return;
  if(cameraState!=='ready'){await startCamera();if(!airWriting()||cameraState!=='ready')return;}
  live=true;renderWriter();toast('Use the pen control above the pad. Point draws; an open hand lifts by default.');return;
 }
 if(fingerWriting()){
  if(cameraState!=='ready'){await startCamera();if(!fingerWriting()||cameraState!=='ready')return;}
  live=true;resetInput();fingerGate.holdMs=environmentSettings().gridHoldMs||850;renderWriter();return;
 }
 if(!model){toast(modelError);return;}
 if(cameraState!=='ready'){await startCamera();if(view!=='write'||environment!=='classic'||cameraState!=='ready')return;}
 if(!activeCapabilities().canWrite){toast('Assign a gesture to Insert text, or set up Select with Next / automatic scanning.');return;}
 live=true;resetInput();lastScan=performance.now();composer.resetFocus();renderWriter();toast('Camera input active. Return to rest, then make your gesture.');
}


document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-action]');if(!b)return;e.preventDefault();const a=b.dataset.action,id=b.dataset.id;
 try{
  if(flowRace.active&&!a.startsWith('flow-')){flowRace.cancel('Trial cancelled when leaving the test controls.');live=false;resetInput();renderWriter();}
  if(chordRace.active&&!a.startsWith('chord-')){chordRace.cancel('Trial cancelled when leaving the test controls.');live=false;resetInput();renderWriter();}
  if(a==='finger-settings'){const settings=environmentSettings();openDialog(dialogHeader('Finger grid settings')+'<p>Use the left side of your mirrored preview for the row, and the right side for the column. A fist is 0; an open palm is 5.</p><label class="field">Hold to select<select id="finger-hold" aria-label="Finger selection hold">'+[600,850,1200,1600].map(n=>'<option value="'+n+'" '+((settings.gridHoldMs||850)===n?'selected':'')+'>'+n/1000+' seconds</option>').join('')+'</select></label><label class="toggle"><input type="checkbox" id="finger-swap" '+(settings.gridSwap?'checked':'')+'> Swap row and column hands</label><p>Change counts to select another cell. Lower a hand briefly to repeat the same cell. Keep both palms facing the camera.</p>');return;}
  if(a==='choose-environment'){await chooseEnvironment();return;}
  if(a==='pick-environment'){activeDialog?.close();selectEnvironment(id);return;}
  if(a==='use-popular-environment'){const row=creator.feedRows.find(r=>r.document.id===id);if(row){creator.library.install(row.document);activeDialog?.close();useEnvironmentDocument(row.document);}return;}
  if(a==='open-environment-feed'){activeDialog?.close();setView('feed');return;}
  if(a.startsWith('nav-'))return setView(a.slice(4));
  if(a==='close-dialog'){activeDialog?.close();return;}
  if(a==='cancel-task'){cancelTask();return;}
  if(busy){toast('Finish or cancel the current recording first.');return;}
  if(a==='start')return profile?setView('teach'):newProfileDialog();
  if(a==='new-profile')return newProfileDialog();
  if(a==='camera')return await enableCamera();
  if(a==='record-rest')return await recordRest();
  if(a==='add-gesture')return gestureDialog();
  if(a==='add-writing-movement'){
   if(!profile)return newProfileDialog();
   if(profile.modality!=='combined'){setView('teach');toast('Create an all-signals profile to teach writing movements. Your classic profile stays saved.');return;}
   if(!profile.rest.length){setView('teach');toast('Learn your resting state first, then choose Teach a writing movement.');return;}
   setView('teach');return gestureDialog(undefined,true);
  }
  if(a==='edit-gesture')return gestureDialog(id);
  if(a==='record-gesture')return await recordGesture(id);
  if(a==='delete-gesture'){profile.gestures=profile.gestures.filter(g=>g.id!==id);activeDialog?.close();changed();render();return;}
  if(a==='validate')return await validateGesture();
  if(a==='rest-check')return await validateRest(Number(b.dataset.duration));
  if(a==='use-profile')return selectProfile(id);
  if(a==='export-profile')return exportOne(id);
  if(a==='delete-profile')return deleteProfile(id);
  if(a==='confirm-delete-profile'){const deleted=profiles.find(p=>p.id===id);if(deleted)removeDraft(deleted);profiles=profiles.filter(p=>p.id!==id);if(profile?.id===id){camera.stop();cameraState='off';cameraMessage='Camera off.';profile=profiles[0]||null;live=false;composer=new RelayComposer(profile);restoreDraft();rebuild();}persist();activeDialog?.close();render();return;}
  if(a==='import')return $('#import-file').click();
  if(a==='export-report'){download('relay-validation.json',JSON.stringify({app:'Relay',profile:profile.name,modality:profile.modality,revision:profile.revision||0,settings:profile.settings,summary:trialSummary(currentTrials()),breakdown:confusionRows(profile),trainingDiagnostics:signalDiagnostics(model),practiceMilestones:readiness(profile,model),trials:profile.trials,limitations:'User-recorded practice results, not clinical validation. Separate attempts; no frame-level train/test split.'},null,2));return;}
  if(a==='start-live')return await startLive();
  if(a==='flow-race-start'){await startFlowRace(b.dataset.method);return;}
  if(a==='flow-race-stop'){flowRace.cancel();live=false;resetInput();renderWriter();return;}
  if(a==='flow-race-export'){download('relay-flow-comparison.json',JSON.stringify({app:'Relay',environment:'Flow',protocol:'Novel text; exact completion; no phrase shortcuts. WPM = target characters / 5 / elapsed minutes. Includes correction time.',results:flowRace.results},null,2));return;}
  if(a.startsWith('flow-')&&flowRace.active)return;
  if(a==='flow-confirm'){resetInput();handleEffect(composer.apply({type:b.dataset.kind}));renderWriter();return;}
  if(a==='flow-mode'){live=false;flow.reset();flow.mode=b.dataset.mode;renderWriter();return;}
  if(a==='flow-clear'){flow.reset();flowLastInsertion=null;updateFlowDisplay();return;}
  if(a==='flow-center'){if(!flow.centerOnHand(performance.now()))toast('Enable camera and hold your fingertip in view first.');updateFlowDisplay();return;}
  if(a==='flow-accept'){flow.accept(Number(b.dataset.index));return;}
  if(a==='flow-command'){flowCommand(b.dataset.kind);return;}
  if(a==='flow-letter'){live=false;flowCommit(b.dataset.letter,{literal:true,mode:flow.mode==='words'?'spell':flow.mode});renderWriter();return;}
  if(a==='chord-bank'){if(chordRace.active)return;live=false;resetInput();chordBank=Number(b.dataset.bank);renderWriter();return;}
  if(a==='chord-key'){if(chordRace.active){toast('Use the selected input method during the timed trial.');return;}live=false;resetInput();useChordKey(Number(b.dataset.index),'pointer');return;}
  if(a==='chord-mode'){if(chordRace.active)return;chordBank=0;chordBook.mode=b.dataset.mode;chordBook.filters=[];resetInput();renderWriter();return;}
  if(a==='chord-back-filter'){if(chordRace.active)return;chordBook.filters.pop();resetInput();renderWriter();return;}
  if(a==='chord-edit'){if(chordRace.active)return;live=false;resetInput();const slot=Number(b.dataset.slot||0),entry=shortcuts()[slot];renderWriter();openDialog(dialogHeader('Shortcut '+chordCode(slot))+'<form id="chord-shortcut-form" data-slot="'+slot+'"><label class="field">Label<input name="title" maxlength="50" required value="'+esc(entry.title)+'"></label><label class="field">Text to insert<textarea name="text" maxlength="500" rows="6" required>'+esc(entry.text)+'</textarea></label><label class="toggle"><input type="checkbox" name="verbatim" '+(entry.verbatim?'checked':'')+'> Insert exactly, preserving whitespace (useful for code)</label><p class="small-text muted">Otherwise, Relay adds spaces between text blocks. This shortcut keeps its code and is saved in this browser.</p><button class="button" type="submit">Save shortcut</button></form>');return;}
  if(a==='chord-race-start'){await startChordRace(b.dataset.method);return;}
  if(a==='chord-race-stop'){chordRace.cancel();live=false;resetInput();renderWriter();return;}
  if(a==='chord-race-export'){download('relay-speed-comparison.json',JSON.stringify({app:'Relay',protocol:'Same target, explicit start, exact-text completion, timing includes corrections. WPM = target characters / 5 / elapsed minutes. Camera trial blocks pointer text entry; keyboard trial blocks paste/drop. Reusable-text results measure text expansion.',results:chordRace.results},null,2));return;}
  if(a==='cirrin-guide'){cirrin.guide=!cirrin.guide;updateCirrinDisplay();return;}
  if(a==='cirrin-center'){if(!cirrin.centerOnHand(performance.now()))toast('Enable the camera and keep your drawing hand visible, then center again.');updateCirrinDisplay();return;}
  if(a==='cirrin-clear'){cirrin.reset();updateCirrinDisplay();return;}
  if(a==='cirrin-back'){cirrin.trace.removeLast();cirrin.trace.mustRelease=true;cirrin.thumbSince=null;updateCirrinDisplay();return;}
  if(a==='cirrin-review'){cirrin.trace.finish();cirrin.trace.mustRelease=true;cirrin.thumbSince=null;updateCirrinDisplay();return;}
  if(a==='cirrin-accept'){cirrin.accept(b.dataset.word);return;}
  if(a==='cirrin-letter'){live=false;cirrin.trace.append(b.dataset.letter);cirrin.thumbSince=null;renderWriter();return;}
  if(a==='cirrin-command'){
   cirrin.reset();
   if(b.dataset.kind==='punctuation'&&!composer.confirm&&!composer.paused)composer.change(composer.text.replace(/ +$/,'')+b.dataset.value+' ');
   else handleEffect(composer.apply({type:b.dataset.kind,value:b.dataset.value}));
   renderWriter();return;
  }
  if(a==='air-recognize'){air.ink.lift(performance.now());await air.recognize();return;}
  if(a==='air-clear'){air.reset();updateAirDisplay();return;}
  if(a==='air-accept'){air.accept(b.dataset.letter);return;}
  if(a==='air-command'){air.reset();handleEffect(composer.apply({type:b.dataset.kind,value:b.dataset.value}));renderWriter();return;}
  if(a==='finger-key'){if(live){live=false;resetInput();toast('Switched to finger preview. Start finger input to resume.');}useFingerKey(Number(b.dataset.index));return;}
  if(a==='stop-live'){live=false;resetInput();renderWriter();return;}
  if(a==='focus'){toggleFocus();return;}
  if(a==='inspect-gesture'){setView('teach');gestureDialog(id);return;}
  if(a==='writer-settings')return setView('profiles');
  if(a==='copy'){try{await navigator.clipboard.writeText(composer.text);toast('Message copied.');}catch{toast('Clipboard is unavailable in this browser.');}return;}
  if(a==='message-clear'||a==='message-undo'){resetInput();handleEffect(composer.apply({type:a==='message-clear'?'clear':'undo'}));renderWriter();return;}
  if(a==='speak'){if(chordWriting())chordGate.reset();handleEffect(composer.apply({type:'speak'}));renderWriter();return;}
  if(['manual-next','manual-select','key','back-rows'].includes(a)){
   if(live){live=false;resetInput();toast('Switched to pointer preview. Use my gestures to resume camera input.');}
   let effect;if(a==='manual-next')composer.next();if(a==='manual-select')effect=composer.select();if(a==='back-rows')composer.resetFocus();
   if(a==='key')effect=composer.apply(composer.rows[Number(b.dataset.row)][Number(b.dataset.col)]);
   handleEffect(effect);renderWriter();return;
  }
 }catch(err){toast(err.message);}
});
document.addEventListener('submit',async e=>{
 e.preventDefault();const f=e.target,data=new FormData(f);
 try{
  if(f.id==='chord-shortcut-form'){
   const slot=Number(f.dataset.slot),entries=shortcuts().map(s=>({...s}));entries[slot]={title:String(data.get('title')).trim(),text:String(data.get('text')),verbatim:data.has('verbatim')};
   if(!validShortcuts(entries))throw new Error('Use a label and up to 500 characters of text for each shortcut.');
   if(profile){profile.chordShortcuts=entries;persist();}else{localStorage.setItem('relay.chord.shortcuts.v1',JSON.stringify(entries));guestShortcuts=entries;}
   activeDialog?.close();renderWriter();toast('Shortcut saved at '+chordCode(slot)+'.');return;
  }
  if(f.id==='profile-form'){profile=createProfile(String(data.get('name')),'combined');profiles.push(profile);camera.stop();cameraState='off';cameraMessage='Enable your camera to begin calibration.';live=false;composer=new RelayComposer(profile);restoreDraft();persist();rebuild();activeDialog?.close();setView('teach');return;}
  if(f.id==='gesture-form'){
   if(data.get('action')==='insert'&&!String(data.get('value')).length)throw new Error('Enter the letter, word, or phrase this gesture should write.');
   let g=profile.gestures.find(g=>g.id===f.dataset.id),fresh=!g;
   if(!g){g={id:crypto.randomUUID(),samples:[]};profile.gestures.push(g);}
   const kind=profile.modality==='combined'?String(data.get('kind')||'pose'):'pose';if(g.kind&&g.kind!==kind)g.samples=[];
   Object.assign(g,{kind,name:String(data.get('name')).trim()||'My movement',action:String(data.get('action')),value:String(data.get('value')),enabled:fresh||data.has('enabled')});
   if(fresh&&profile.gestures.length===1)profile.settings.mode='auto';
   if(fresh&&profile.gestures.some(g=>g.action==='next')&&profile.gestures.some(g=>g.action==='select'))profile.settings.mode='step';
   changed();activeDialog?.close();render();if(fresh&&cameraState==='ready')await recordGesture(g.id);return;
  }
  if(f.id==='vocabulary-form'){
   const phrases=String(data.get('phrases')).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
   const words=[...new Set(String(data.get('words')).split(',').map(s=>s.trim()).filter(Boolean))];
   if(phrases.length>24||phrases.some(p=>p.length>300))throw new Error('Use at most 24 phrases, with 300 characters each.');
   if(words.length>100||words.some(w=>w.length>50||!/^[\p{L}\p{M}'’-]+$/u.test(w)))throw new Error('Use up to 100 individual words (letters, hyphens and apostrophes), separated by commas.');
   profile.phrases=phrases;profile.words=words;profile.settings.completions=data.has('completions');composer.configure(profile);persist();toast('Your vocabulary is saved. Find My phrases on the keyboard.');render();return;
  }
  if(f.id==='settings-form'){profile.settings={...profile.settings,mode:String(data.get('mode')),holdMs:Number(data.get('holdMs')),restMs:Number(data.get('restMs')),scanMs:Number(data.get('scanMs')),audio:data.has('audio')};changed();toast('Settings saved. Run fresh checks with your new timing.');render();}
 }catch(err){toast(err.message);}
});
document.addEventListener('change',async e=>{
 if(e.target.id==='display-size'){displaySize=e.target.value==='large'?'large':'standard';document.documentElement.dataset.textSize=displaySize;try{localStorage.setItem('relay.display.v1',displaySize);}catch{toast('Display size changed for this visit. Browser storage is unavailable.');}updateTeachingPreview();return;}
 if(e.target.id==='pen-mode'){if(flowRace.active)return;saveEnvironmentSetting('penMode',e.target.value);live=false;resetInput();for(const pen of [air.pen,cirrin.pen,flow.pen])pen.setMode(e.target.value);renderWriter();return;}
 if(e.target.id==='flow-gain'){if(flowRace.active)return;saveEnvironmentSetting('flowGain',Number(e.target.value));live=false;flow.setGain(Number(e.target.value));renderWriter();return;}
 if(e.target.id==='flow-auto'){if(flowRace.active)return;saveEnvironmentSetting('flowAuto',e.target.checked);flow.auto=e.target.checked;return;}
 if(e.target.id==='flow-scenario'){if(flowRace.select(e.target.value)){live=false;resetInput();renderWriter();}return;}
 if(e.target.id==='chord-swap'){if(chordRace.active)return;saveEnvironmentSetting('gridSwap',e.target.checked);live=false;resetInput();renderWriter();return;}
 if(e.target.id==='chord-hold'){if(chordRace.active)return;saveEnvironmentSetting('chordHoldMs',Number(e.target.value));chordGate.holdMs=Number(e.target.value);live=false;resetInput();renderWriter();return;}
 if(e.target.id==='chord-scenario'){if(chordRace.select(e.target.value)){live=false;resetInput();renderWriter();}return;}
 if(e.target.id==='cirrin-gain'){saveEnvironmentSetting('cirrinGain',Number(e.target.value));cirrin.setGain(Number(e.target.value));live=false;renderWriter();return;}
 if(e.target.id==='finger-hold'||e.target.id==='finger-swap'){saveEnvironmentSetting(e.target.id==='finger-hold'?'gridHoldMs':'gridSwap',e.target.id==='finger-hold'?Number(e.target.value):e.target.checked);resetInput();fingerGate.holdMs=environmentSettings().gridHoldMs||850;renderWriter();return;}
 if(e.target.id==='trails-toggle'){
  trailsEnabled=e.target.checked;camera.setTrails?.(trailsEnabled);
  try{localStorage.setItem('relay.trails.v1',String(trailsEnabled));}catch{}
  return;
 }

 if(e.target.name==='action'&&e.target.closest('#gesture-form'))$('#insert-text-field').hidden=e.target.value!=='insert';
 if(e.target.id==='profile-select')selectProfile(e.target.value);
 if(e.target.id==='import-file'){try{const file=e.target.files[0];if(!file)return;const p=upgradeFaceProfile(importProfile(await file.text()));profiles.push(p);persist();selectProfile(p.id);toast('Profile imported. Check recognition in your current camera setup.');}catch(err){toast('Import failed: '+err.message);}}
});
let resumeAfterEditing=false;
document.addEventListener('focusin',e=>{if(e.target.id==='message'){resumeAfterEditing=live;live=false;resetInput();renderWriter();}});
document.addEventListener('focusout',e=>{if(e.target.id==='message'&&resumeAfterEditing){resumeAfterEditing=false;if(cameraState==='ready'&&view==='write'){resetInput();live=true;lastScan=performance.now();const status=$('#writer-status .input-strip>span');if(status)status.textContent=inputStatus();const control=$('#writer-status [data-action="start-live"]');if(control){control.dataset.action='stop-live';control.textContent='Pause gestures';}}}});
document.addEventListener('input',e=>{if(e.target.id==='message'&&view==='write'){if(e.target.value!==composer.text)composer.change(e.target.value);composer.confirm=null;composer.resetFocus();if(!e.isComposing)renderWriter();else{saveDraft();$('#draft-status').textContent=draftNotice;}}});
document.addEventListener('compositionend',e=>{if(e.target.id==='message')renderWriter();});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&busy&&!activeDialog){e.preventDefault();cancelTask();return;}
 if(flowWriting()||chordWriting()||cirrinWriting()||airWriting()||fingerWriting()||view!=='write'||live||activeDialog||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
 if(e.key==='ArrowRight'){e.preventDefault();if(customWriting())customRuntime?.gesture('next');else{composer.next();renderWriter();}}
 if(e.key==='Enter'&&e.target===document.body){e.preventDefault();if(customWriting())customRuntime?.gesture('select');else{handleEffect(composer.select());renderWriter();}}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)creator.stopPreview();const wasFlow=flowRace.active;if(document.hidden&&wasFlow){flowRace.cancel('Trial cancelled while the app was hidden.');live=false;if(flowWriting())renderWriter();}const wasTrial=chordRace.active;if(document.hidden)chordRace.cancel('Trial cancelled while the app was hidden.');resetInput();if(document.hidden&&wasTrial&&chordWriting())renderWriter();if(document.hidden&&live){live=false;toast('Camera input stopped while the app was hidden.');renderWriter();}if(document.hidden&&busy)cancelTask();});
window.addEventListener('beforeunload',()=>{customRuntime?.destroy();creator.unmount();camera.stop();flow.close();air.model.close();});
setInterval(()=>{
 const now=performance.now();if(creatorView())creator.runtime?.tick(now,creator.previewEnabled()&&!activeDialog);if(customWriting())customRuntime?.tick(now,live&&!activeDialog);
 if(!customWriting()&&!flowWriting()&&!chordWriting()&&!cirrinWriting()&&!airWriting()&&!fingerWriting()&&live&&view==='write'&&activeCapabilities().scanning&&profile.settings.mode==='auto'&&!composer.paused&&!activeDialog){
  const now=performance.now();if(now-lastTracking>700){lastScan=now;return;}
  // Stop the scanning highlight while a deliberate selection is in progress.
  if(gate.candidate||gate.progress>0||gate.motionActive){lastScan=now;return;}
  if(now-lastScan>=profile.settings.scanMs){composer.next();lastScan=now;renderWriter();}
 }
},80);
render();


function restoreDraft(){
 flowRace.cancel();flowRace.results={};flow.setGain(environmentSettings().flowGain||2.4);flow.auto=environmentSettings().flowAuto!==false;
 for(const pen of [air.pen,cirrin.pen,flow.pen])pen.setMode(environmentSettings().penMode||'point');
 chordRace.cancel();chordRace.results={};chordBook.reset();chordGate.holdMs=environmentSettings().chordHoldMs||180;
 cirrin.setGain(environmentSettings().cirrinGain||2.4);cirrin.centered=false;environment=environmentById(environmentSettings().environment).id;fingerPage='letters';fingerGate.holdMs=environmentSettings().gridHoldMs||850;resetInput();lastGestureMessage='';
 try{const custom=localStorage.getItem('relay.custom-environment.v1');if(custom&&creator.library.get(custom.slice(7)))environment=custom;}catch{}
 draftSavedText=null;draftNotice='';
 try{composer.text=readDraft(profile);draftSavedText=composer.text;if(composer.text)draftNotice='· Draft restored';}
 catch{draftNotice='· Draft recovery unavailable';}
}
function saveDraft(){
 if(composer.text===draftSavedText)return;
 try{writeDraft(profile,composer.text);draftSavedText=composer.text;draftNotice='· Saved on this device';}
 catch(e){draftNotice='· Could not save draft';toast(e.message);}
}
function toggleFocus(){
 document.body.classList.toggle('focus-mode');
 if(view==='write'){renderWriter();window.scrollTo({top:0});}
}
function saveMessagePhrase(){
 if(!profile){toast('Create a profile to save personal phrases.');return;}
 const text=composer.text.trim();if(!text){toast('Write a message first.');return;}
 if(text.length>300){toast('Keep a saved phrase to 300 characters or fewer.');return;}
 profile.phrases??=[...STARTER_PHRASES];
 if(profile.phrases.includes(text)){toast('That phrase is already in your vocabulary.');return;}
 if(profile.phrases.length>=24){toast('Your 24 phrase slots are full. Edit My vocabulary to make room.');return;}
 profile.phrases.push(text);persist();composer.configure(profile);toast('Saved to My phrases. Select it any time with your gestures.');
}

function displaySettingsView(){return '<section class="card"><h2>Display</h2><label class="field">Text and controls<select id="display-size"><option value="standard" '+(displaySize==='standard'?'selected':'')+'>Standard</option><option value="large" '+(displaySize==='large'?'selected':'')+'>Large</option></select><small>Changes apply immediately and stay on this device.</small></label></section>';}
