import {environmentThumbnail} from './environment-thumbnail.js';
import {fromTemplate,makeItem} from './creator-schema.js';
import {gridKeys} from './environments.js';
import {RelayComposer} from './communication.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const examples=[
 {id:'finger-grid',name:'Finger grid',control:'Two hands → a letter',description:'Show 0–5 fingers on each hand to choose a row and column. Hold the pair to select a letter.'},
 {id:'air-letters',name:'Air letters',control:'A drawn shape → a letter',description:'Draw with your index finger. Local handwriting recognition suggests letters for you to review.'},
 {id:'cirrin',name:'Cirrin ring',control:'A path through letters → a word',description:'Trace through the letters around a ring, then review and insert your word.'},
 {id:'classic',name:'Classic keyboard',control:'Your gestures → Next and Select',description:'Use gestures you have taught Relay to move through letters, select them, and build a message.'},
 {id:'flow',name:'Flow',control:'A swipe → a word',description:'Trace a word across a QWERTY layout. Choose from the suggested words or spell a new one.'},
 {id:'chord',name:'Chord',control:'A hand code → a saved phrase',description:'Use two-hand finger counts to choose phrases you have saved. Customize the shortcuts for your conversations.'}
];
const documents=new Map(examples.map(example=>{
 const doc=fromTemplate(example.id);doc.id='relay-builtin-'+example.id+'-v1';doc.name=example.name;
 if(example.id==='finger-grid')doc.pages[0].blocks[0].items=gridKeys(new RelayComposer(),'letters').map(k=>({...makeItem(k.value||'',k.label),label:k.label}));
 return [example.id,doc];
}));
let selected='finger-grid';
function exampleHTML(){
 const item=examples.find(e=>e.id===selected);
 return '<div class="home-example-title"><h2>'+esc(item.name)+'</h2><span>Layout preview</span></div>'+environmentThumbnail(documents.get(item.id))+
 '<div class="home-example-caption"><strong>'+esc(item.control)+'</strong><p>'+esc(item.description)+'</p><button class="button secondary" data-action="home-try-environment" data-id="'+item.id+'">Try '+esc(item.name)+' <span aria-hidden="true">↗</span></button></div>';
}
export function selectHomeExample(root,id){
 if(!examples.some(e=>e.id===id))return;selected=id;
 for(const button of root.querySelectorAll('[data-action="home-example"]'))button.setAttribute('aria-pressed',String(button.dataset.id===id));
 const target=root.querySelector('#home-example');if(target)target.innerHTML=exampleHTML();
}
export function relayHomeView({returning=false}={}){
 return '<div class="relay-home">'+
 '<section class="home-hero" aria-labelledby="relay-home-title"><div class="home-hero-copy"><p class="home-kicker">Create · Share · Communicate</p>'+
 '<h1 id="relay-home-title">Create your own way to communicate.</h1>'+
 '<p class="home-lead">Relay turns gestures and movement into text and speech. Use an existing environment, or build one around the way you—or someone you care about—moves.</p>'+
 '<div class="home-actions"><button class="button" data-action="nav-home">Get started <span aria-hidden="true">→</span></button><button class="button secondary" data-action="nav-creator">Open Creator space</button></div>'+
 (returning?'<button class="home-text-link" data-action="nav-write">Continue writing <span aria-hidden="true">↗</span></button>':'')+
 '<p class="home-camera-note">Explore with a mouse or keyboard first. Your camera starts only when you choose.</p></div>'+
 '<div class="home-example-browser"><div class="home-example-options" role="group" aria-label="Preview an environment">'+examples.map(e=>'<button data-action="home-example" data-id="'+e.id+'" aria-pressed="'+(selected===e.id)+'" aria-controls="home-example">'+esc(e.name)+'</button>').join('')+
 '</div><div id="home-example" aria-live="polite">'+exampleHTML()+'</div></div></section>'+
 '<section class="home-definition" aria-labelledby="home-environment-title"><div><p class="home-kicker">The building block</p><h2 id="home-environment-title">What is an environment?</h2>'+
 '<p>An environment is a communication layout and a way to control it. The same letters can become a finger grid, a drawing surface, a circular path, or an interface you invent.</p></div>'+
 '<ol class="home-parts"><li><span>01</span><div><strong>A layout</strong><p>Place letters, phrases, and actions.</p></div></li><li><span>02</span><div><strong>An input</strong><p>Connect a gesture, movement, or drawing.</p></div></li><li><span>03</span><div><strong>A selection rule</strong><p>Choose with a hold, a trace, or a tap.</p></div></li></ol></section>'+
 '<section class="home-paths" aria-label="Two ways to use Relay"><article class="home-path"><p class="home-kicker">User space</p><h2>Find a way to write.</h2>'+
 '<p>Choose an environment, turn on your camera when you are ready, and compose your message. Edit, undo, copy, or speak it.</p><p>For personal gesture controls, teach Relay your resting state and a few comfortable poses or movements.</p>'+
 '<button class="button secondary" data-action="nav-write">Open User space <span aria-hidden="true">→</span></button></article>'+
 '<article class="home-path home-path-creator"><p class="home-kicker">Creator space</p><h2>Build around a person.</h2>'+
 '<p>Drag choices onto a canvas. Arrange and group them, connect inputs to their properties, and decide when a choice is selected.</p><p>Use dropdowns and visual controls. Test your idea, save it, and use it as your own environment.</p>'+
 '<button class="button" data-action="nav-creator">Open Creator space <span aria-hidden="true">→</span></button></article></section>'+
 '<section class="home-creator-showcase" aria-labelledby="home-creator-title"><div class="home-creator-examples" aria-label="Editable environment templates">'+
 examples.map(example=>'<figure class="home-template-preview">'+environmentThumbnail(documents.get(example.id))+'<figcaption>'+esc(example.name)+'</figcaption></figure>').join('')+'</div>'+
 '<div class="home-creator-copy"><p class="home-kicker">Made for your ideas</p><h2 id="home-creator-title">Turn your idea into an environment.</h2>'+
 '<p>Arrange letters, words, and controls any way you like. Connect gestures, hand movements, and drawing to what they do—with visual controls, without writing code.</p>'+
 '<p>All six built-in environments have editable Creator templates. Remix a familiar layout, combine the available components, or start with a blank canvas.</p>'+
 '<p>Choose how someone moves, what they can select, and how their message takes shape. Build, try it, and keep making it their own.</p>'+
 '<button class="home-text-link" data-action="nav-creator">Open Creator space <span aria-hidden="true">→</span></button></div></section>'+
 '<section class="home-feed" aria-labelledby="home-feed-title"><div><p class="home-kicker">Environment feed</p><h2 id="home-feed-title">Find an idea. Make it your own.</h2>'+
 '<p>Browse environments, try them, and remix a copy in Creator space. Publish your own layouts and vote for the ones you like using.</p>'+
 '<p class="home-feed-note">Anyone can explore. Sign in with ChatGPT to publish or vote.</p></div><button class="button" data-action="nav-feed">Browse the feed <span aria-hidden="true">↗</span></button></section>'+
 '<section class="home-questions" aria-labelledby="home-questions-title"><h2 id="home-questions-title">Before you begin</h2>'+
 '<details><summary>Do I need an account?</summary><p>No. Use Relay, teach gestures, create environments, and browse the feed without an account. Sign in with ChatGPT only to publish an environment or vote. Your local profiles and drafts stay in this browser; signing in does not upload or sync them.</p></details>'+
 '<details><summary>Do I need to teach gestures first?</summary><p>Only for personal gesture controls, such as your own Next and Select signals. Finger grid, Air letters, Cirrin, Flow, and Chord can use their existing hand tracking. You can also explore layouts with a mouse or keyboard.</p></details>'+
 '<details><summary>Can I create an environment for someone else?</summary><p>Yes. Build a layout around their comfortable movements, then try it together. Personal gestures are calibrated by the person who will use them. Export an environment package to move it to another device, or share it through the public feed.</p></details>'+
 '<details><summary>Where are my camera video and personal data processed?</summary><p>Camera video is processed on your device. Gesture profiles and message drafts stay in this browser. Publishing to the feed shares the environment layout, its output text, and any custom sketch examples publicly with anyone.</p></details></section>'+
 '<div class="home-bottom"><span>Start with what works for you.</span><button class="button" data-action="nav-home">Get started <span aria-hidden="true">→</span></button></div></div>';
}

