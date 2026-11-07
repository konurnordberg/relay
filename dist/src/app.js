import {trainCombined,predictCombined,CombinedGate,resample,requiredTracking} from './combined.js';
import {CHANNELS,channelIndices} from './features.js';
import {REST,UNKNOWN,train,predict,summarize,EventGate,Composer,trialSummary} from './core.js';
import {createProfile,loadProfiles,saveProfiles,exportProfile,importProfile} from './storage.js';
import {VisionCamera} from './camera.js';
import {RelayComposer,STARTER_PHRASES} from './communication.js';
import {studioView,liveInsightHTML,vocabularyView} from './views.js';
import {signalDiagnostics,confusionRows,readiness} from './insights.js';
import {readDraft,writeDraft,removeDraft} from './drafts.js';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(label,action,cls='',extra='')=>'<button class="button '+cls+'" data-action="'+action+'" '+extra+'>'+label+'</button>';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let profiles=[],storageError='',trailsEnabled=false;
try{trailsEnabled=localStorage.getItem('relay.trails.v1')==='true';}catch{}
try{profiles=loadProfiles();}catch(e){storageError=e.message;}
let profile=profiles[0]||null,view='home',modelError='',model=null,gate=new EventGate(),composer=new RelayComposer(profile),live=false;
let cameraState='off',cameraMessage='Your camera stays off until you start it.',latest=null,lastUI=0,recording=null,task=0,busy=false,attempt=null,restCheck=null,lastScan=0,lastTracking=0;
let toastTimer,scanVoice='',speechStatus='',activeDialog=null;
let draftSavedText=null,draftNotice='',speakingMessage=false;
const actions={select:'Select',next:'Next',delete:'Delete',undo:'Undo',speak:'Speak',pause:'Pause',insert:'Insert text'};
const navigation=[['home','Overview','◈'],['teach','Teach gestures','⌁'],['write','Write & speak','▤'],['check','Check accuracy','◎'],['studio','Signal studio','⌘'],['profiles','My profiles','◉']];
const currentTrials=()=>profile?.trials.filter(t=>(t.revision||0)===(profile.revision||0))||[];
function persist(){try{saveProfiles(profiles);storageError='';return true;}catch(e){storageError=e.message;toast('Could not save: '+e.message+'. Export a backup before closing.');return false;}}
function changed(){profile.revision=(profile.revision||0)+1;persist();rebuild();}
function rebuild(){model=null;modelError='';gate=new EventGate(profile?.settings.holdMs,profile?.settings.restMs);if(profile){try{model=profile.modality==='combined'?trainCombined(profile):train(profile);if(model.combined)gate=new CombinedGate(model,profile.settings.holdMs,profile.settings.restMs);}catch(e){modelError=e.message;}}}
rebuild();restoreDraft();
$('#app').innerHTML='<div class="app-shell"><aside class="sidebar"><a class="brand" href="#" data-action="nav-home"><img src="./favicon.svg" alt="">relay<span class="sr-only">home</span></a><div><div class="eyebrow nav-label">YOUR WORKSPACE</div><nav class="nav" aria-label="Main navigation">'+navigation.map(([id,label,icon])=>'<button data-action="nav-'+id+'" data-nav="'+id+'"><span class="nav-icon" aria-hidden="true">'+icon+'</span><span>'+label+'</span></button>').join('')+'</nav></div><div class="side-bottom"><div class="privacy-note"><strong>◌ &nbsp; Built around you.</strong>Your camera is processed on this device. Your gesture profile stays in this browser.</div><div class="side-foot">TRIANGLE AI HACKATHON · 2026</div></div></aside><div class="workspace"><header class="topbar"><div class="breadcrumb">Your movement <span>/</span> <b id="page-label">Overview</b></div><div class="profile-switch"><span class="avatar" aria-hidden="true">↗</span><label class="sr-only" for="profile-select">Active profile</label><select id="profile-select"></select></div></header><div class="main-grid"><main id="main" class="content" tabindex="-1"></main><aside class="rail"><section class="card camera-card" aria-label="Camera and recognition"><div class="card-header"><h3>Your signal</h3><span class="pill" id="camera-pill">CAMERA OFF</span></div><div class="camera-view"><video id="video" autoplay muted playsinline aria-label="Mirrored camera preview"></video><canvas id="overlay" aria-hidden="true"></canvas><div class="camera-placeholder" id="camera-placeholder"><div class="face-outline" aria-hidden="true"></div><p>A little movement goes a long way.</p></div><div class="camera-corners"></div><span class="camera-tag">LOCAL VISION · NO VIDEO UPLOAD</span></div><div class="camera-controls"><p class="camera-status" id="camera-status"></p><button class="button" id="camera-button" data-action="camera">Enable camera ↗</button></div><div class="trail-controls"><label class="trail-toggle"><input id="trails-toggle" type="checkbox" role="switch" aria-describedby="trails-help"><span class="trail-switch" aria-hidden="true"></span><span>Enable trails</span><span class="trail-spark" aria-hidden="true">✧</span></label><p id="trails-help">Draw with your index fingers. Neon trails fade in a moment.</p></div><p id="camera-performance" class="camera-performance" hidden></p><div id="tracking-parts" class="tracking-parts" aria-label="Visible body parts"></div><div class="recognition"><div class="eyebrow">LIVE RECOGNITION</div><div class="signal-name"><span id="signal-name">Waiting for you</span><span id="signal-detail">—</span></div><div class="meter"><div id="signal-meter" style="width:0"></div></div></div></section><section class="card rail-quote"><div class="wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><h3>Your words.<br>Your way.</h3><p>One reliable movement can open an entire alphabet. You decide what to say.</p></section><p class="rail-note">Teach a face, hand, two-hand, or movement signal. Keep the parts you use visible.</p></aside></div><footer class="footer"><span>DESIGNED FOR INDIVIDUAL EXPRESSION</span><span>Research prototype · Personal calibration required</span></footer></div></div>';
const camera=new VisionCamera($('#video'),$('#overlay'),onFrame,onCameraState);
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),6500);}
function setView(next){if(busy){toast('Finish or cancel the current recording first.');return;}view=next;live=false;gate.reset();render();$('#main').focus({preventScroll:true});}
function render(){
 document.body.dataset.view=view;
 $('#profile-select').innerHTML=profiles.length?profiles.map(p=>'<option value="'+esc(p.id)+'" '+(p===profile?'selected':'')+'>'+esc(p.name)+'</option>').join(''):'<option>No profile yet</option>';
 $('#profile-select').disabled=busy;
 document.querySelectorAll('[data-nav]').forEach(b=>{b.classList.toggle('active',b.dataset.nav===view);if(b.dataset.nav===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 $('#page-label').textContent=navigation.find(n=>n[0]===view)?.[1]||'Overview';
 $('#main').innerHTML=(storageError?'<div class="notice error">Storage: '+esc(storageError)+'</div>':'')+({home:homeView,teach:teachView,write:writeView,check:checkView,studio:()=>studioView(profile,model),profiles:profilesView}[view]());
 updateCamera();if(view==='write')renderWriter();
}
const heading=(title,sub)=>'<div class="page-heading"><div class="eyebrow" style="margin-bottom:12px">YOUR MOVEMENT. YOUR WORDS.</div><h2>'+title+'</h2><p class="muted">'+sub+'</p></div>';
function homeView(){
 const trained=profile?.gestures.filter(g=>g.samples.length>=3).length||0;
 return '<section class="hero"><div class="eyebrow"><span class="dot"></span> COMMUNICATION, ON YOUR TERMS</div><h1>A small movement.<br><em>A whole conversation.</em></h1><p>Teach Relay your facial expressions, hand poses, or finger swipes. Mix them in one personal vocabulary for writing and speaking.</p><div class="button-row">'+btn(profile?'Continue your setup':'Create your voice','start')+btn('Explore the keyboard ↗','nav-write','secondary')+'</div></section><div class="section-label"><h3>A language that starts with you</h3><span>Three simple steps</span></div><div class="step-cards">'+[['01','Find your resting state','Let the camera learn your natural, everyday movements.'],['02','Mix your signals','Face, both hands, or a swipe. Teach each signal a few times.'],['03','Say something new','Use your signals to select letters and speak your own words.']].map(([n,t,p])=>'<div class="card step-card"><div class="step-number">'+n+'</div><span class="corner">↗</span><h3>'+t+'</h3><p>'+p+'</p></div>').join('')+'</div><div class="callout"><span class="circle-icon">↗</span><p><strong>You don’t need 26 gestures to say everything.</strong>One gesture can select. Two can navigate and select. The whole alphabet is yours.</p></div>'+(profile?'<div class="card"><div class="section-label" style="margin:0 0 12px"><h3>'+esc(profile.name)+'</h3><span class="badge">'+(model?'Ready to practice':'Setup in progress')+'</span></div><p class="small-text muted">'+(profile.rest.length?'Resting state recorded':'Resting state not recorded')+' · '+trained+' trained gestures · '+currentTrials().filter(t=>t.kind==='attempt').length+' checked attempts</p>'+btn(model?'Start writing':'Continue calibration',model?'nav-write':'nav-teach','small secondary')+'</div>':'');
}
function noProfile(){return heading('Start with you.','Your profile holds your personal gestures and preferences.')+'<div class="card"><h3>Create your personal profile</h3><p class="muted">Face, both hands, and finger movements work together in one profile. Teach the signals that suit you.</p>'+btn('Create a profile','new-profile')+'</div>';}
function teachView(){
 if(!profile)return noProfile();const done=profile.rest.length>0;
 return heading('Teach us your language.','A few movements. A few examples. A vocabulary that belongs to you.')+(profile.modality!=='combined'?'<div class="callout"><p><strong>Your classic profile is preserved.</strong>Create an all-signals profile to mix face, hand, and movement signals.</p>'+btn('New all-signals profile','new-profile','small secondary')+'</div>':'')+'<div class="progress-steps"><span class="'+(done?'done':'')+'">01 &nbsp; Rest</span><span class="'+(model?'done':'')+'">02 &nbsp; Your gestures</span><span class="'+(currentTrials().length?'done':'')+'">03 &nbsp; Check & communicate</span></div><div class="card"><div class="section-label" style="margin-top:0"><h3>01 &nbsp; Your resting state</h3><span class="badge">'+(done?'Recorded':'Start here')+'</span></div><p class="small-text muted">Relax naturally for 12 seconds. Blink and look around as you normally would. '+(profile.modality==='hand'?'Keep your resting hand visible.':'Keep your face visible. If you plan to use your hands, keep them comfortably in view too.')+' This teaches Relay what should <strong>not</strong> select a key.</p>'+btn(done?'Record rest again':'Learn my resting state','record-rest','secondary',busy?'disabled':'')+'</div><div class="card"><div class="section-label" style="margin-top:0"><h3>02 &nbsp; Your gestures</h3><span>'+profile.gestures.length+' personal signals</span></div><p class="small-text muted">'+(profile.modality==='combined'?'Choose a held pose or a short movement. Face and both hands can contribute together.':'Choose a comfortable held pose. Your saved input mode remains unchanged.')+' We’ll record five examples and a relaxed starting pose before each.</p><div class="gesture-list">'+profile.gestures.map((g,i)=>'<div class="gesture-item"><span class="gesture-icon">'+String(i+1).padStart(2,'0')+'</span><div class="gesture-detail"><strong>'+esc(g.name)+'</strong><small>'+esc(actions[g.action])+(g.action==='insert'?' · '+esc(g.value):'')+' · '+(g.kind==='motion'?'Movement':'Held pose')+' · '+g.samples.length+' examples'+(g.enabled===false?' · Disabled':'')+'</small></div><div class="gesture-actions">'+btn(g.samples.length?'Retrain':'Record','record-gesture','small secondary','data-id="'+g.id+'" '+(busy?'disabled':''))+'<button class="icon-button" data-action="edit-gesture" data-id="'+g.id+'" aria-label="Edit '+esc(g.name)+'">⋯</button></div></div>').join('')+'</div>'+(profile.gestures.length?'':'<div class="empty-state">Choose a movement that feels comfortable to you.</div>')+'<div style="margin-top:16px">'+btn('＋ Add a gesture','add-gesture','secondary',!done||busy?'disabled':'')+'</div></div><div id="record-area"></div>'+(model?'<div class="callout"><span class="circle-icon">✓</span><p><strong>Your recognizer is trained.</strong>Test it with new attempts before using it to write.</p></div>'+model.warnings.map(w=>'<div class="notice warn">'+esc(w)+'</div>').join('')+'<div class="button-row">'+btn('Check my gestures →','nav-check')+btn('Open keyboard','nav-write','secondary')+'</div>':'')+(profile.gestures.some(g=>g.samples.length>=3)&&modelError?'<div class="notice warn">'+esc(modelError)+'</div>':'')+'<p class="small-text muted">Input: '+(profile.modality==='combined'?'face + both hands together; held poses and recorded movements':profile.modality==='face'?'saved face & head profile':'saved one-hand profile')+'. Setup may be assisted. Recognition learns your examples; it does not recognize every possible movement.</p>';
}
function writeView(){
 return heading('Make yourself heard.','Choose letters, make corrections, and speak when you’re ready.')+'<div id="writer-status"></div><div class="card composer-card"><div class="composer-head"><span>YOUR MESSAGE <small id="draft-status"></small></span><span id="word-count">0 words</span></div><div id="message" class="message" role="log" aria-label="Composed message" aria-live="polite"></div><div class="composer-bottom"><span id="focus-label"></span><div class="button-row">'+btn('Copy','copy','small secondary')+btn('Speak ↗','speak','small')+'</div></div></div><div id="keyboard" class="keyboard" aria-label="Accessible keyboard"></div><div id="writer-help"></div><div class="button-row" style="margin-top:15px">'+btn('Next →','manual-next','secondary')+btn('Select ↵','manual-select','secondary')+btn('Keyboard settings','writer-settings','secondary')+btn('Focus view','focus','secondary')+'</div><p class="small-text muted" style="margin-top:14px">Pointer buttons are available for setup and preview. Camera input is labeled separately. Speech uses a local browser voice when one is available.</p><div class="speech-state" id="speech-status" role="status"></div>';
}
function renderWriter(){
 if(view!=='write')return;
 composer.configure(profile);saveDraft();
 $('#writer-status').innerHTML='<div class="input-strip"><span class="status"><span class="dot" style="background:'+(live?'#5a8b38':'#aa9164')+'"></span>'+(live?(composer.paused?'Paused · select Resume to continue':'Camera input · '+(profile.settings.mode==='auto'?'automatic scanning':'next / select')):'Pointer preview · no camera selections')+'</span>'+btn(live?'Stop camera input':'Use my gestures',live?'stop-live':'start-live',live?'small secondary':'small',!model?'disabled':'')+'</div>'+(!model?'<div class="demo-banner">Explore the keyboard now. Train a profile to write with your movements.</div>':'');
 const m=$('#message');m.textContent=composer.text||'Your next thought starts here…';m.classList.toggle('empty',!composer.text);if(composer.text){const c=document.createElement('span');c.className='cursor';c.setAttribute('aria-hidden','true');m.append(c);}m.scrollTop=m.scrollHeight;
 $('#word-count').textContent=(composer.text.trim()?composer.text.trim().split(/\s+/).length:0)+' words · '+Array.from(composer.text).length+' characters';
 const rows=composer.rows;
 $('#keyboard').innerHTML=rows.map((row,i)=>'<div class="key-row '+(i===composer.row?'focus-row':'')+'">'+row.map((k,j)=>'<button class="key '+(k.type!=='text'||k.value.length!==1||/\s/.test(k.value)?'control':'')+' '+(i===composer.row&&j===composer.col&&composer.level==='key'?'focus-key':'')+'" data-action="key" data-kind="'+k.type+'" data-row="'+i+'" data-col="'+j+'" aria-label="'+esc(k.label)+'">'+esc(k.label)+'</button>').join('')+(i===composer.row&&composer.level==='key'?'<button class="key control '+(composer.col===row.length?'focus-key':'')+'" data-action="back-rows">↩ Rows</button>':'')+'</div>').join('');
 const focus=composer.level==='row'?'Row '+(composer.row+1)+' of '+rows.length:(rows[composer.row]?.[composer.col]?.label||'Back to rows');
 $('#focus-label').textContent=composer.confirm?'Confirm '+composer.confirm:composer.paused?'Paused':focus;
 $('#writer-help').innerHTML='<div class="keyboard-help"><span><kbd>Next</kbd> advances the highlight</span><span><kbd>Select</kbd> chooses a row, then a key</span><span>Return to rest between gestures</span></div>';
 $('#speech-status').textContent=speechStatus;
 $('#draft-status').textContent=draftNotice;
 if(document.body.classList.contains('focus-mode'))requestAnimationFrame(()=>document.querySelector('.focus-row')?.scrollIntoView({block:'nearest'}));
 if(live&&profile.settings.audio&&focus!==scanVoice){scanVoice=focus;say(focus,true);}
}


function checkView(){
 if(!profile)return noProfile();const summary=trialSummary(currentTrials()),rests=currentTrials().filter(t=>t.kind==='rest');
 return heading('Confidence comes from practice.','Test fresh attempts. These recordings are never added to training.')+'<div class="metrics"><div class="card metric"><div class="eyebrow">CHECKED</div><b>'+summary.total+'</b><small>separate attempts</small></div><div class="card metric"><div class="eyebrow">CORRECT</div><b>'+(summary.accuracy===null?'—':Math.round(summary.accuracy*100)+'%')+'</b><small>'+summary.correct+' / '+summary.total+' attempts</small></div><div class="card metric"><div class="eyebrow">REST CHECKS</div><b>'+rests.filter(t=>t.passed).length+' / '+rests.length+'</b><small>no false selections & adequate tracking</small></div></div>'+(!model?'<div class="notice warn">Record rest and at least three examples for each enabled gesture first.</div>':'')+'<div class="card"><h3>Check a gesture</h3><p class="small-text muted">Five new attempts. Start at rest; perform your gesture when prompted, then return to rest. For a movement, pause at its endpoint before returning. A correct attempt has exactly one matching selection. Misses, extra selections, and wrong gestures count as failures.</p><div class="test-choice"><label class="field">Gesture<select id="test-gesture">'+profile.gestures.filter(g=>g.enabled!==false&&g.samples.length).map(g=>'<option value="'+g.id+'">'+esc(g.name)+'</option>').join('')+'</select></label>'+btn('Run 5 attempts','validate','',!model||busy?'disabled':'')+'</div></div><div class="card"><h3>Check everyday rest</h3><p class="small-text muted">Read the screen, blink, and rest naturally. We measure accidental selections and time with usable tracking.</p><div class="button-row">'+btn('30-second check','rest-check','secondary','data-duration="30000" '+(!model||busy?'disabled':''))+btn('5-minute demo check','rest-check','secondary','data-duration="300000" '+(!model||busy?'disabled':''))+'</div></div><div id="record-area"></div><div class="card"><div class="section-label" style="margin-top:0"><h3>Recorded results</h3>'+btn('Export report','export-report','small secondary')+'</div>'+(currentTrials().length?'<div class="table-wrap"><table><thead><tr><th>Test</th><th>Result</th><th>Details</th></tr></thead><tbody>'+currentTrials().slice(-30).reverse().map(t=>'<tr><td>'+esc(t.label||'Rest')+'</td><td class="'+(t.passed?'result-pass':'result-fail')+'">'+(t.passed?'Pass':'Needs practice')+'</td><td>'+esc(t.detail)+'</td></tr>').join('')+'</tbody></table></div>':'<p class="small-text muted">No results yet. We won’t claim accuracy before you measure it.</p>')+'</div><p class="small-text muted">Results apply to this profile version and these test conditions. Small practice sets are not clinical validation. Retraining starts a new set of results; older records remain in exports.</p>';
}
function profilesView(){
 return heading('A profile that grows with you.','Keep your vocabulary, change your gestures, and take a backup with you.')+'<div class="button-row" style="margin-bottom:22px">'+btn('＋ New profile','new-profile')+btn('Import backup','import','secondary')+'<input type="file" accept=".json,application/json" id="import-file" hidden></div>'+profiles.map(p=>'<div class="card profile-card"><div><h3>'+esc(p.name)+(p===profile?' <span class="badge">Active</span>':'')+'</h3><p>'+(p.modality==='combined'?'All signals · face + both hands':p.modality==='face'?'Face & head · classic profile':'Hand · classic profile')+' · '+p.gestures.length+' gestures · '+p.rest.length+' resting samples</p></div><div class="button-row">'+btn('Use','use-profile','small secondary','data-id="'+p.id+'"')+btn('Export','export-profile','small secondary','data-id="'+p.id+'"')+btn('Delete','delete-profile','small danger','data-id="'+p.id+'"')+'</div></div>').join('')+(profile?vocabularyView(profile)+settingsView():'')+'<div class="notice">Profiles are stored in this browser, on this origin. Clearing browser data removes them. Export a backup before switching computers or moving between the local and hosted app. No raw camera video is saved.</div>';
}
function settingsView(){return '<form id="settings-form" class="card"><h3>Settings for '+esc(profile.name)+'</h3><div class="settings-grid"><label class="field">Navigation<select name="mode"><option value="step" '+(profile.settings.mode==='step'?'selected':'')+'>Two gestures: next + select</option><option value="auto" '+(profile.settings.mode==='auto'?'selected':'')+'>One gesture: automatic scanning + select</option></select></label><label class="field">Scan interval<select name="scanMs">'+[900,1400,2000,3000,4000].map(v=>'<option value="'+v+'" '+(v===profile.settings.scanMs?'selected':'')+'>'+(v/1000)+' seconds</option>').join('')+'</select></label><label class="field">Hold a gesture for<select name="holdMs">'+[250,450,650,900,1200,1600].map(v=>'<option value="'+v+'" '+(v===profile.settings.holdMs?'selected':'')+'>'+(v/1000)+' seconds</option>').join('')+'</select><small>Longer holds may reduce accidental selections.</small></label><label class="field">Return to rest for<select name="restMs">'+[250,350,500,750,1000].map(v=>'<option value="'+v+'" '+(v===profile.settings.restMs?'selected':'')+'>'+(v/1000)+' seconds</option>').join('')+'</select></label></div><label class="toggle"><input type="checkbox" name="audio" '+(profile.settings.audio?'checked':'')+'> Read scan highlights aloud (uses available browser voice)</label><button class="button secondary" type="submit">Save settings</button></form>';}
function openDialog(html){if(activeDialog)activeDialog.remove();const d=document.createElement('dialog');d.innerHTML=html;document.body.append(d);activeDialog=d;d.addEventListener('close',()=>{d.remove();if(activeDialog===d)activeDialog=null;});d.showModal();return d;}
const dialogHeader=t=>'<div class="dialog-top"><h2>'+t+'</h2><button class="icon-button" data-action="close-dialog" aria-label="Close dialog">×</button></div>';
function newProfileDialog(){openDialog(dialogHeader('Create your voice')+'<p>One camera. All your signals.</p><div class="input-capabilities"><span>Face & expressions</span><span>Both hands</span><span>Finger swipes</span></div><p class="small-text muted">No input mode to choose. Teach a held pose or a short movement, and Relay learns which visible parts you use. Existing profiles stay saved.</p><form id="profile-form"><label class="field">Profile name<input name="name" maxlength="65" value="My voice" required></label><button class="button full" type="submit">Start my setup →</button></form>');}
function gestureDialog(id){
 const g=profile.gestures.find(g=>g.id===id),defaultAction=profile.gestures.some(g=>g.action==='select')?'next':'select';
 openDialog(dialogHeader(g?'Edit your signal':'Add a personal signal')+'<p>Name your signal, choose its action, and show it five times. Keep the parts you use visible during both the relaxed starting pose and the gesture.</p><form id="gesture-form" data-id="'+(g?.id||'')+'"><label class="field">Gesture name<input name="name" maxlength="65" placeholder="Name your movement" value="'+esc(g?.name||'')+'" required></label>'+(profile.modality==='combined'?'<label class="field">How do you perform it?<select name="kind"><option value="pose" '+(g?.kind!=='motion'?'selected':'')+'>Hold a pose</option><option value="motion" '+(g?.kind==='motion'?'selected':'')+'>Make a swipe or movement</option></select><small>Pose: hold an expression or one/two-hand shape. Movement: make one short motion, then pause at the endpoint. Repeat its direction and starting pose.</small></label>':'')+'<label class="field">What should it do?<select name="action">'+Object.entries(actions).map(([v,l])=>'<option value="'+v+'" '+((g?.action||defaultAction)===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label><label class="field" id="insert-text-field" '+((g?.action||defaultAction)==='insert'?'':'hidden')+'>Text for “Insert text”<input name="value" maxlength="300" placeholder="A letter, word, or personal phrase" value="'+esc(g?.value||'')+'"><small>Only used when the action is Insert text.</small></label>'+(g?'<label class="toggle"><input name="enabled" type="checkbox" '+(g.enabled!==false?'checked':'')+'> Enable this gesture</label>':'')+'<div class="button-row"><button class="button" type="submit">'+(g?'Save changes':'Add & record')+'</button>'+(g?btn('Delete gesture','delete-gesture','danger','data-id="'+g.id+'"'):'')+'</div></form>');
}
function selectProfile(id){if(busy)return;const p=profiles.find(p=>p.id===id);if(!p)return;camera.stop();cameraState='off';cameraMessage='Profile changed. Enable the camera when you’re ready.';profile=p;composer=new RelayComposer(profile);restoreDraft();live=false;latest=null;rebuild();render();}
function updateCamera(){
 const trailsAllowed=profile?.modality!=='face';
 $('#trails-toggle').checked=trailsEnabled;$('#trails-toggle').disabled=!trailsAllowed;
 $('#trails-help').textContent=trailsAllowed?'Trace with your index fingers. Brief tracking gaps reconnect; trails fade in 1.4 seconds.':'Use an all-signals or hand profile for fingertip trails.';
 camera.setTrails?.(trailsEnabled&&trailsAllowed);

 if(cameraState!=='ready')$('#camera-performance').hidden=true;
 if(cameraState!=='ready'){if(view==='studio'&&$('#live-insights'))$('#live-insights').innerHTML='<div class="empty-state">Enable your camera to see the recognizer work.</div>';$('#signal-name').textContent='Waiting for you';$('#signal-detail').textContent='—';$('#signal-meter').style.width='0';}
 $('#camera-status').textContent=cameraMessage;if(cameraState!=='ready'&&$('#tracking-parts'))$('#tracking-parts').textContent='';
 $('#camera-pill').textContent=cameraState==='ready'?'ON DEVICE':cameraState==='loading'?'STARTING':cameraState==='error'?'NEEDS ATTENTION':'CAMERA OFF';
 $('#camera-pill').classList.toggle('green',cameraState==='ready');
 $('#camera-placeholder').classList.toggle('hidden',cameraState==='ready');
 $('#camera-button').textContent=cameraState==='loading'?'Loading vision…':cameraState==='ready'?'Turn camera off':'Enable camera ↗';
 $('#camera-button').disabled=cameraState==='loading'||busy;
}
function onCameraState(state,message){cameraState=state;cameraMessage=message;if(state==='error'||state==='off'){live=false;gate.reset();}updateCamera();if(view==='write')renderWriter();}
function onFrame(frame){
 latest=frame;if(requiredTracking(model,frame.vector,true,profile))lastTracking=frame.now;
 if(recording){recording.total++;if(frame.vector){recording.frames.push(frame.vector);recording.tracked++;}}
 let result=frame.vector?(model?.combined?predictCombined(model,frame.vector):predict(model,frame.vector)):{id:UNKNOWN,reason:'No tracking',score:0};
 let event=null;
 if(model?.combined){const out=gate.updateFrame(frame.vector,frame.now);result=out.result;event=out.event;}
 else if(!frame.vector)gate.reset();else if(model)event=gate.update(result.id,frame.now);
 if(restCheck){restCheck.total++;if(requiredTracking(model,frame.vector))restCheck.tracked++;if(event)restCheck.events.push(event);}
 if(attempt&&event)attempt.events.push(event);
 if(event&&live&&view==='write'&&!activeDialog){const g=profile.gestures.find(g=>g.id===event);if(g){dispatchGesture(g);lastScan=frame.now;}}
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

  $('#signal-name').textContent=!frame.vector?'No tracking':!model?'Ready to learn':result.id===REST?'Resting':result.id===UNKNOWN?'Uncertain — no action':result.label;
  $('#signal-detail').textContent=!frame.vector?'Move into view':model?(gate.armed?'Ready':'Return to rest'):Math.round(frame.latency)+' ms';
  $('#signal-meter').style.width=(gate.progress*100)+'%';
  if(view==='studio'&&$('#live-insights'))$('#live-insights').innerHTML=liveInsightHTML(model,frame.vector,result,gate,frame.latency);
 }
}
function dispatchGesture(g){let effect;if(g.action==='next')composer.next();else if(g.action==='select')effect=composer.select();else effect=composer.direct(g.action,g.value);handleEffect(effect);renderWriter();}
function handleEffect(effect){if(effect==='focus')toggleFocus();if(effect==='bookmark')saveMessagePhrase();if(effect==='speak')say(composer.text);if(effect==='pause'){speakingMessage=false;window.speechSynthesis?.cancel();toast('Paused. Select Resume to continue.');}}
function say(text,cue=false){
 if(cue&&speakingMessage)return;
 if(!('speechSynthesis' in window)){speechStatus='Speech is unavailable in this browser. Your message remains visible.';toast(speechStatus);return;}
 speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text),voices=speechSynthesis.getVoices();
 u.voice=voices.find(v=>v.localService&&v.lang.startsWith('en'))||voices.find(v=>v.localService)||null;
 if(!u.voice){speechStatus='No local voice is installed. Install a system voice to use offline speech.';if(!cue){toast(speechStatus);renderWriter();}return;}
 u.rate=cue?1.1:0.95;u.onstart=()=>{if(!cue){speechStatus='Speaking…';if($('#speech-status'))$('#speech-status').textContent=speechStatus;
 $('#draft-status').textContent=draftNotice;
 if(document.body.classList.contains('focus-mode'))requestAnimationFrame(()=>document.querySelector('.focus-row')?.scrollIntoView({block:'nearest'}));}};
 u.onend=()=>{if(!cue){speakingMessage=false;speechStatus='Finished speaking.';if($('#speech-status'))$('#speech-status').textContent=speechStatus;
 $('#draft-status').textContent=draftNotice;
 if(document.body.classList.contains('focus-mode'))requestAnimationFrame(()=>document.querySelector('.focus-row')?.scrollIntoView({block:'nearest'}));}};
 u.onerror=e=>{if(['interrupted','canceled'].includes(e.error))return;speakingMessage=false;speechStatus='Speech unavailable ('+e.error+'). Your message is still visible.';if($('#speech-status'))$('#speech-status').textContent=speechStatus;
 $('#draft-status').textContent=draftNotice;
 if(document.body.classList.contains('focus-mode'))requestAnimationFrame(()=>document.querySelector('.focus-row')?.scrollIntoView({block:'nearest'}));};
 if(!cue)speakingMessage=true;
 speechSynthesis.speak(u);
}
async function enableCamera(){if(!profile){newProfileDialog();return;}if(cameraState==='ready'){camera.stop();cameraState='off';cameraMessage='Camera turned off.';live=false;gate.reset();updateCamera();renderWriter();return;}await camera.start(profile.modality);}
function requireCamera(){if(cameraState!=='ready'){toast('Enable the camera before recording.');return false;}if(!latest?.vector||performance.now()-latest.now>700){toast('Move into view so the camera can track you.');return false;}return true;}
function progress(title,detail,fraction=0){const area=$('#record-area');if(!area)return;area.innerHTML='<div class="record-panel" role="status"><div class="eyebrow">GUIDED PRACTICE</div><h3 style="margin-top:12px">'+esc(title)+'</h3><p>'+esc(detail)+'</p><progress max="1" value="'+fraction+'"></progress><div style="margin-top:16px">'+btn('Cancel','cancel-task','small secondary')+'</div></div>';}
async function waitPhase(ms,title,detail,token){const start=performance.now();while(performance.now()-start<ms){if(token!==task)throw new Error('Cancelled');progress(title,detail,Math.min(1,(performance.now()-start)/ms));await sleep(100);}}
async function capture(ms,token){recording={frames:[],total:0,tracked:0};try{await waitPhase(ms,'Hold your movement','Keep it comfortable and steady.',token);const r=recording;if(r.frames.length<6||r.tracked/Math.max(1,r.total)<0.8)throw new Error('Too little tracking. Adjust the camera and try this recording again.');return summarizeCapture(r.frames);}finally{recording=null;}}
function beginTask(){busy=true;live=false;const token=++task;render();gate.reset();setTimeout(()=>$('#record-area')?.scrollIntoView({block:'center',behavior:'smooth'}),50);return token;}
function endTask(token){if(token!==task)return;busy=false;recording=null;attempt=null;restCheck=null;gate.reset();render();}
async function recordRest(){
 if(!requireCamera())return;const token=beginTask(),samples=[];
 try{
  await waitPhase(3000,'Get comfortable','Rest naturally. Keep your '+(profile.modality==='hand'?'hand':'face')+' visible.',token);
  const start=performance.now();recording={frames:[],total:0,tracked:0};let seen=0;
  while(performance.now()-start<12000){if(token!==task)throw new Error('Cancelled');progress('Just be yourself','Blink and move naturally. '+Math.ceil((12000-performance.now()+start)/1000)+' seconds remaining.',(performance.now()-start)/12000);await sleep(400);if(recording.frames.length-seen>=4){samples.push(summarizeCapture(recording.frames.slice(seen)));seen=recording.frames.length;}}
  if(samples.length<12||recording.tracked/Math.max(1,recording.total)<0.85)throw new Error('The camera lost tracking too often. Keep yourself visible and record rest again.');
  profile.rest=samples;changed();toast('Rest learned. Now teach your first deliberate movement.');
 }catch(e){if(token===task)toast(e.message);}finally{endTask(token);}
}
function summarizeCapture(frames){
 const sample=summarize(frames);
 if(profile?.modality==='combined')for(const c of CHANNELS)if(frames.some(v=>v[c.mask]<1)){sample.vector[c.mask]=0;for(const i of channelIndices(c)){sample.vector[i]=0;sample.spread[i]=0;}}
 return sample;
}
async function recordGesture(id){
 if(!requireCamera())return;const g=profile.gestures.find(g=>g.id===id);if(!g)return;const token=beginTask(),samples=[];
 try{
  for(let i=0;i<5;i++){
   recording={frames:[],total:0,tracked:0};
   await waitPhase(2500,'Return to rest','Example '+(i+1)+' of 5 · Keep the parts you will use visible and relaxed. For swipes, use the same starting pose.',token);
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
  const previous=g.samples;g.samples=samples;
  try{if(profile.modality==='combined'&&profile.gestures.filter(x=>x.enabled!==false).every(x=>x.samples.length>=3))trainCombined(profile);}
  catch(e){g.samples=previous;throw e;}
  changed();toast('Five examples saved for '+g.name+'. Test fresh attempts next.');
 }catch(e){if(token===task)toast(e.message);}finally{endTask(token);}
}
async function validateGesture(){
 if(!requireCamera()||!model)return;const id=$('#test-gesture').value,g=profile.gestures.find(g=>g.id===id);if(!g)return;const token=beginTask();
 try{for(let i=0;i<5;i++){gate.reset();await waitPhase(3000,'Rest before attempt '+(i+1),'Let the recognizer settle into your resting state.',token);attempt={events:[]};await waitPhase(Math.max(4500,profile.settings.holdMs+2200),'Now: '+g.name,(g.kind==='motion'?'Make one movement, pause briefly at its endpoint, then return to your starting pose.':'Perform once, then return to rest.')+' Attempt '+(i+1)+' of 5.',token);const events=attempt.events;attempt=null;const passed=events.length===1&&events[0]===id;profile.trials.push({kind:'attempt',at:new Date().toISOString(),revision:profile.revision||0,label:g.name,expected:id,events,passed,detail:!events.length?'No selection':events.length>1?events.length+' selections':events[0]===id?'One correct selection':'Selected '+(profile.gestures.find(x=>x.id===events[0])?.name||'another gesture')});persist();}toast('Five independent attempts recorded. Review your results below.');}catch(e){if(token===task)toast(e.message);}finally{endTask(token);}
}
async function validateRest(duration){
 if(!requireCamera()||!model)return;const token=beginTask();
 try{await waitPhase(2500,'Get comfortable','Read, blink, and rest as you normally would.',token);restCheck={events:[],total:0,tracked:0};gate.reset();await waitPhase(duration,'Rest check in progress','Relax naturally. Any accidental selections will be counted.',token);const r=restCheck,tracking=r.tracked/Math.max(1,r.total),passed=!r.events.length&&tracking>=0.85;restCheck=null;profile.trials.push({kind:'rest',at:new Date().toISOString(),revision:profile.revision||0,label:'Rest · '+duration/1000+' sec',passed,durationMs:duration,tracking,events:r.events,detail:r.events.length+' selections · '+Math.round(tracking*100)+'% tracking'});persist();toast('Rest check recorded.');}catch(e){if(token===task)toast(e.message);}finally{endTask(token);}
}
function cancelTask(){task++;busy=false;recording=null;attempt=null;restCheck=null;gate.reset();render();toast('Cancelled. Incomplete recordings were not saved.');}
function download(name,data){const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportOne(id){const p=profiles.find(p=>p.id===id);if(p)download('relay-'+p.name.replace(/[^a-z0-9]/gi,'-')+'.json',exportProfile(p));}
function deleteProfile(id){const p=profiles.find(p=>p.id===id);if(!p)return;openDialog(dialogHeader('Delete this profile?')+'<p>'+esc(p.name)+' and its recordings will be removed from this browser. Export a backup first if you want to keep it.</p><div class="button-row">'+btn('Export backup','export-profile','secondary','data-id="'+p.id+'"')+btn('Delete profile','confirm-delete-profile','danger','data-id="'+p.id+'"')+'</div>');}
function startLive(){
 if(!model||!requireCamera())return;const enabled=profile.gestures.filter(g=>g.enabled!==false);
 if(!enabled.some(g=>g.action==='select')){toast('Assign a gesture to Select first.');return;}
 if(profile.settings.mode==='step'&&!enabled.some(g=>g.action==='next')){toast('Assign a Next gesture, or choose automatic scanning in settings.');return;}
 live=true;gate.reset();lastScan=performance.now();composer.resetFocus();renderWriter();toast('Camera input active. Return to rest, then make your gesture.');
}


document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-action]');if(!b)return;e.preventDefault();const a=b.dataset.action,id=b.dataset.id;
 try{
  if(a.startsWith('nav-'))return setView(a.slice(4));
  if(a==='close-dialog'){activeDialog?.close();return;}
  if(a==='cancel-task'){cancelTask();return;}
  if(busy){toast('Finish or cancel the current recording first.');return;}
  if(a==='start')return profile?setView('teach'):newProfileDialog();
  if(a==='new-profile')return newProfileDialog();
  if(a==='camera')return await enableCamera();
  if(a==='record-rest')return await recordRest();
  if(a==='add-gesture')return gestureDialog();
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
  if(a==='start-live')return startLive();
  if(a==='stop-live'){live=false;gate.reset();renderWriter();return;}
  if(a==='focus'){toggleFocus();return;}
  if(a==='inspect-gesture'){setView('teach');gestureDialog(id);return;}
  if(a==='writer-settings')return setView('profiles');
  if(a==='copy'){try{await navigator.clipboard.writeText(composer.text);toast('Message copied.');}catch{toast('Clipboard is unavailable in this browser.');}return;}
  if(a==='speak'){handleEffect(composer.apply({type:'speak'}));renderWriter();return;}
  if(['manual-next','manual-select','key','back-rows'].includes(a)){
   if(live){live=false;gate.reset();toast('Switched to pointer preview. Use my gestures to resume camera input.');}
   let effect;if(a==='manual-next')composer.next();if(a==='manual-select')effect=composer.select();if(a==='back-rows')composer.resetFocus();
   if(a==='key')effect=composer.apply(composer.rows[Number(b.dataset.row)][Number(b.dataset.col)]);
   handleEffect(effect);renderWriter();return;
  }
 }catch(err){toast(err.message);}
});
document.addEventListener('submit',async e=>{
 e.preventDefault();const f=e.target,data=new FormData(f);
 try{
  if(f.id==='profile-form'){profile=createProfile(String(data.get('name')),'combined');profiles.push(profile);camera.stop();cameraState='off';cameraMessage='Enable your camera to begin calibration.';live=false;composer=new RelayComposer(profile);restoreDraft();persist();rebuild();activeDialog?.close();setView('teach');return;}
  if(f.id==='gesture-form'){
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
 if(e.target.id==='trails-toggle'){
  trailsEnabled=e.target.checked;camera.setTrails?.(trailsEnabled);
  try{localStorage.setItem('relay.trails.v1',String(trailsEnabled));}catch{}
  return;
 }

 if(e.target.name==='action'&&e.target.closest('#gesture-form'))$('#insert-text-field').hidden=e.target.value!=='insert';
 if(e.target.id==='profile-select')selectProfile(e.target.value);
 if(e.target.id==='import-file'){try{const file=e.target.files[0];if(!file)return;const p=importProfile(await file.text());profiles.push(p);persist();selectProfile(p.id);toast('Profile imported. Check recognition in your current camera setup.');}catch(err){toast('Import failed: '+err.message);}}
});
document.addEventListener('keydown',e=>{
 if(view!=='write'||live||activeDialog||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
 if(e.key==='ArrowRight'){e.preventDefault();composer.next();renderWriter();}
 if(e.key==='Enter'&&e.target===document.body){e.preventDefault();handleEffect(composer.select());renderWriter();}
});
document.addEventListener('visibilitychange',()=>{gate.reset();if(document.hidden&&live){live=false;toast('Camera input stopped while the app was hidden.');renderWriter();}if(document.hidden&&busy)cancelTask();});
window.addEventListener('beforeunload',()=>camera.stop());
setInterval(()=>{
 if(live&&view==='write'&&profile.settings.mode==='auto'&&!composer.paused&&!activeDialog){
  const now=performance.now();if(now-lastTracking>700){lastScan=now;return;}
  // Stop the scanning highlight while a deliberate selection is in progress.
  if(gate.candidate||gate.progress>0||gate.motionActive){lastScan=now;return;}
  if(now-lastScan>=profile.settings.scanMs){composer.next();lastScan=now;renderWriter();}
 }
},80);
render();


function restoreDraft(){
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
