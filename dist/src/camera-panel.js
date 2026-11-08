import {CHANNELS} from './features.js';

// Presentation only: gesture recognition always receives the unmodified camera frame.
export class CameraTrackingPanel{
 constructor(root){this.root=root;this.mode=null;this.active=false;this.rows=[];}
 setCamera(mode,active){
  if(mode!==this.mode){
   this.mode=mode;const channels=mode==='combined'?CHANNELS:mode==='face'?[CHANNELS[0]]:[{name:'Hands',mask:null}];
   this.rows=channels.map(channel=>{const pill=this.root.ownerDocument.createElement('span'),mark=this.root.ownerDocument.createElement('b');
    mark.className='tracking-mark';mark.setAttribute('aria-hidden','true');pill.append(channel.name+' ',mark);
    return {channel,pill,mark,seen:-Infinity,visible:null};});
   this.root.replaceChildren(...this.rows.map(row=>row.pill));this.root.dataset.trackingMode=mode;
  }
  if(this.active!==active||this.rows.some(row=>row.visible===null)){
   this.active=active;for(const row of this.rows){row.seen=-Infinity;this.paint(row,false);}
  }
 }
 paint(row,visible){if(row.visible===visible)return;row.visible=visible;row.pill.classList.toggle('visible',visible);row.pill.setAttribute('aria-label',row.channel.name+(visible?' detected':' not detected'));row.mark.textContent=visible?'✓':'—';}
 update(frame){
  if(!this.active||!Number.isFinite(frame.now))return;
  for(const row of this.rows){
   const visible=this.mode==='combined'?frame.vector?.[row.channel.mask]>.95:this.mode==='face'?!!(frame.tracking?.face??frame.vector):!!(frame.tracking?.hands??frame.hands?.length);
   if(visible)row.seen=frame.now;
   this.paint(row,visible||frame.now-row.seen<400);
  }
 }
}

