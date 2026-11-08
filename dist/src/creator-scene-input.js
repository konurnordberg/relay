import {HandRotation,HoldGate} from './creator-controls.js';
import {FingerPairTracker,countFingers} from './finger-index.js';
import {resolveScene,sceneTarget} from './creator-scene.js';
export class SceneController{
 constructor(block){this.block=block;this.reset();}
 reset(){this.rotation=new HandRotation();this.fingers=new FingerPairTracker();this.gate=new HoldGate(this.block.input.holdMs);this.lastAt=null;this.signals={};this.result=resolveScene(this.block);this.release=false;this.releaseSince=null;this.neutralArmed=false;this.neutralSince=null;this.highlight=null;this.emptySince=null;this.status='Ready';}
 center(){this.rotation.center();this.gate.reset();this.release=true;}
 requireRelease(){this.reset();this.release=true;}
 update(frame){const {block}=this,scene=block.scene,at=frame.handFrameAt,now=frame.now;const fresh=Number.isFinite(at)&&now-at<=200;if(fresh&&at===this.lastAt)return null;this.lastAt=at;const signals={},hands=frame.hands||[];let rotated=false;
 if(fresh){const rotation=this.rotation.update(frame,{rotationRange:360,hand:block.input.hand});if(rotation){signals['hand.angle']=rotation.turn*360;rotated=rotation.ready;}
 const ordered=hands.map((h,i)=>({h,i})).filter(({h})=>h?.length===21&&Number.isFinite(h[8]?.x)&&Number.isFinite(h[8]?.y)).sort((a,b)=>block.input.hand==='right'?a.h[0].x-b.h[0].x:block.input.hand==='left'?b.h[0].x-a.h[0].x:this.rotation.wrist?Math.hypot(a.h[0].x-this.rotation.wrist.x,a.h[0].y-this.rotation.wrist.y)-Math.hypot(b.h[0].x-this.rotation.wrist.x,b.h[0].y-this.rotation.wrist.y):b.h[0].x-a.h[0].x),first=ordered[0];if(first){signals['hand.x']=1-first.h[8].x;signals['hand.y']=first.h[8].y;const count=countFingers(first.h,frame.handWorld?.[first.i],frame.handAspect);if(count!==null)signals['hand.fingers']=count;}
 const pair=this.fingers.update(frame,block.input.swap);if(pair&&!pair.missing&&!pair.settling&&pair.row!==null&&pair.col!==null){signals['hands.row']=pair.row;signals['hands.column']=pair.col;signals['hands.index']=pair.row*6+pair.col;}}
 this.signals=signals;const resolved=resolveScene(block,signals);let index=sceneTarget(resolved);const angleUsed=scene.bindings.some(b=>b.signal==='hand.angle');if(angleUsed&&!rotated)index=null;if(!fresh)index=null;
 if(this.release){if(angleUsed&&rotated){this.release=false;this.gate.reset();}else if(fresh&&(!hands.length||signals['hands.index']===0)){this.releaseSince??=at;if(at-this.releaseSince>=300){this.release=false;this.gate.reset();}}else this.releaseSince=null;if(this.release)index=null;}
 const conditionReleased=scene.gate.enabled&&Number.isFinite(signals[scene.gate.signal])&&!resolved.ready;const clearTarget=fresh&&resolved.mappingReady&&(conditionReleased||resolved.ready&&index===null&&(!angleUsed||rotated));if(clearTarget){this.emptySince??=at;if(at-this.emptySince>=300)this.gate.reset();}else this.emptySince=null;if(!resolved.mappingReady&&this.result?.positions)resolved.positions=this.result.positions;
 if(block.input.activation==='neutral'){if(signals['hands.index']===0){this.neutralSince??=at;if(at-this.neutralSince>=200){this.neutralArmed=true;this.gate.reset();}index=null;}else this.neutralSince=null;if(!this.neutralArmed)index=null;}
 this.highlight=index;const fire=this.gate.update(index,at,now);if(fire!==null)this.neutralArmed=false;this.result=resolved;this.status=this.release?'Lower your hands briefly before the next choice.':!fresh||!resolved.ready?'Waiting for the inputs used by your rules.':angleUsed&&!rotated?'Move your hand slightly to begin.':index===null?'Move a choice to the selection target.':'Hold '+block.items[index].label+' to select.';return {positions:resolved.positions,cursor:resolved.cursor,highlight:index,progress:this.gate.progress,fire,status:this.status,signals};
 }
}
