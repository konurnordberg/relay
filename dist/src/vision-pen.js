import {fingerEvidence} from './finger-index.js';
export const PEN_MODES=['point','middle-pinch','pinch'];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
export function penPose(hand,world,aspect=4/3,mode='point',wasDown=false){
 if(hand?.length!==21||![0,4,5,8,9,12,17].every(i=>finite(hand[i])))return null;
 const p=hand.map(q=>({x:q.x,y:q.y/aspect,z:Number.isFinite(q.z)?q.z:0}));
 const width=Math.max(distance(p[5],p[17]),distance(p[0],p[9])*.8);
 if(width<.022||hand[8].x<-.04||hand[8].x>1.04||hand[8].y<-.04||hand[8].y>1.04)return null;
 // Peripheral landmarks may leave the frame; the visible tip and palm still work.
 const bounded=hand.map(q=>({x:Math.max(0,Math.min(1,q.x)),y:Math.max(0,Math.min(1,q.y)),z:Number.isFinite(q.z)?q.z:0}));
 const f=fingerEvidence(bounded,world,aspect)?.fingers;
 const thumbUp=!!f&&f[0]>.75&&f.slice(1).every(v=>v<.25);
 let down=false,up=false;
 if(mode==='point'){
  if(f){down=f[1]>(wasDown?.40:.58)&&f.slice(2).filter(v=>v<.58).length>=2;up=f[1]<.25||f.slice(2).filter(v=>v>.62).length>=2||thumbUp;}
 }else{
  const tip=mode==='middle-pinch'?12:8,ratio=distance(p[4],p[tip])/width;
  down=ratio<(wasDown?.72:.45);up=ratio>.85||thumbUp;
 }
 return {point:{x:1-p[8].x,y:p[8].y},wrist:{x:1-p[0].x,y:p[0].y},down,up,thumbUp};
}
export class VisionPen{
 constructor(mode='point'){this.mode=mode;this.reset();}
 setMode(mode){if(PEN_MODES.includes(mode))this.mode=mode;this.reset();}
 reset(){this.down=false;this.lastAt=null;this.seen=null;this.wrist=null;this.filtered=null;this.start=[];this.releaseAt=null;this.blocked=false;this.gapStart=null;}
 update(frame){
  const at=frame.handFrameAt,now=frame.now,aspect=frame.handAspect||4/3;
  if(Number.isFinite(at)&&this.lastAt!==null&&at<=this.lastAt&&now-at<=200)return null;
  const poses=(frame.hands||[]).map((h,i)=>penPose(h,frame.handWorld?.[i],aspect,this.mode,this.down)).filter(Boolean);
  if(this.wrist)poses.sort((a,b)=>distance(a.wrist,this.wrist)-distance(b.wrist,this.wrist));
  const pose=poses[0],fresh=Number.isFinite(at)&&now-at<=200;
  if(!fresh||!pose||this.wrist&&this.down&&!pose.up&&distance(pose.wrist,this.wrist)>.38){
   this.start=[];this.releaseAt=null;this.gapStart??=this.seen??now;
   const interrupted=this.down&&now-this.gapStart>240;
   if(interrupted){this.down=false;this.blocked=true;this.filtered=null;this.wrist=null;}
   return {down:this.down,point:null,samples:[],phase:interrupted||!this.down?'lost':'gap',interrupted,thumbUp:false};
  }
  const gap=this.seen!==null?at-this.seen:0;this.lastAt=at;this.seen=at;this.gapStart=null;
  if(gap>260&&this.down){this.down=false;this.blocked=true;this.start=[];this.filtered=null;}
  if(this.down&&!pose.up&&this.filtered&&distance(pose.point,this.filtered)>.42){this.down=false;this.blocked=true;this.filtered=null;return {down:false,point:null,samples:[],phase:'lost',interrupted:true,thumbUp:false};}
  this.wrist=pose.wrist;
  const alpha=this.filtered?Math.min(.98,.38+distance(pose.point,this.filtered)*22):1;
  this.filtered=this.filtered?{x:this.filtered.x+alpha*(pose.point.x-this.filtered.x),y:this.filtered.y+alpha*(pose.point.y-this.filtered.y)}:{...pose.point};
  const point={...this.filtered},out={point,raw:pose.point,at,samples:[],thumbUp:pose.thumbUp,discontinuous:gap>240,down:this.down,phase:this.down?'drawing':'hover'};
  if(this.blocked){if(pose.up){this.blocked=false;this.releaseAt=null;}return {...out,down:false,phase:'rearm',interrupted:gap>260};}
  if(this.down){
   if(pose.up){
    this.releaseAt??=at;
    // Do not add opening-hand motion to the letter or word endpoint.
    if(at-this.releaseAt>=65){this.down=false;this.releaseAt=null;return {...out,down:false,phase:'hover',released:true};}
    return {...out,phase:'lifting'};
   }
   if(!pose.down){this.releaseAt??=at;if(at-this.releaseAt>150){this.down=false;this.blocked=true;return {...out,down:false,phase:'lost',interrupted:true};}return {...out,phase:'gap'};}
   this.releaseAt=null;out.samples=[{point,at}];return out;
  }
  if(pose.down){
   this.start.push({point,at});this.start=this.start.filter(p=>at-p.at<160);
   if(this.start.length>=2&&at-this.start[0].at>=35){this.down=true;out.samples=this.start;this.start=[];return {...out,down:true,phase:'drawing',started:true};}
  }else this.start=[];
  return out;
 }
}