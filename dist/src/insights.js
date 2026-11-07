import {combinedDiagnostics,combinedMatches} from './combined.js';
import {distance,REST} from './core.js';
export function signalDiagnostics(model){
 if(!model)return [];
 if(model.combined)return combinedDiagnostics(model);
 return model.classes.filter(c=>c.id!==REST).map(c=>{
  const others=model.classes.filter(o=>o.id!==c.id).map(o=>{
   const gap=Math.min(...c.vectors.flatMap(a=>o.vectors.map(b=>distance(model,a,b))));
   return {id:o.id,label:o.label,gap,ratio:gap/Math.max(.001,c.radius+o.radius)};
  }).sort((a,b)=>a.ratio-b.ratio);
  const nearest=others[0];
  return {id:c.id,label:c.label,examples:c.vectors.length,nearest:nearest?.label||'—',ratio:nearest?.ratio??0,status:nearest?.ratio<1?'overlap':nearest?.ratio<1.5?'close':'separated'};
 });
}
export function rankedMatches(model,vector){
 if(!model||!vector||vector.length!==model.dim||vector.some(x=>!Number.isFinite(x)))return [];
 if(model.combined)return combinedMatches(model,vector);
 return model.classes.map(c=>({id:c.id,label:c.label,distance:Math.min(...c.vectors.map(v=>distance(model,v,vector))),limit:c.radius})).sort((a,b)=>a.distance-b.distance).slice(0,5);
}
export function confusionRows(profile){
 const trials=profile.trials.filter(t=>t.kind==='attempt'&&(t.revision||0)===(profile.revision||0));
 return profile.gestures.filter(g=>g.enabled!==false).map(g=>{
  const own=trials.filter(t=>t.expected===g.id),counts={correct:0,missed:0,wrong:0,extra:0};
  for(const t of own){if(t.passed)counts.correct++;else if(!t.events?.length)counts.missed++;else if(t.events.length>1)counts.extra++;else counts.wrong++;}
  return {id:g.id,name:g.name,total:own.length,...counts};
 });
}
export function readiness(profile,model){
 const enabled=profile?.gestures.filter(g=>g.enabled!==false)||[],rows=profile?confusionRows(profile):[];
 const checked=rows.length>0&&rows.every(r=>r.total>=5&&r.correct/r.total>=.8);
 const rests=profile?.trials.filter(t=>t.kind==='rest'&&(t.revision||0)===(profile.revision||0))||[];
 return [
  {label:'Rest and personal gestures recorded',done:!!model},
  {label:'Select assigned; navigation reachable',done:enabled.some(g=>g.action==='select')&&(profile?.settings.mode==='auto'||enabled.some(g=>g.action==='next'))},
  {label:'At least 5 fresh attempts per gesture, ≥80% correct',done:checked},
  {label:'A 30-second or longer rest check passed',done:rests.some(t=>t.passed&&t.durationMs>=30000)}
 ];
}
