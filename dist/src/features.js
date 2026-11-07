export const COMBINED_DIM=201;
export const CHANNELS=[{name:'Face',mask:0,start:3,length:60},{name:'Left hand',mask:1,start:63,length:69},{name:'Right hand',mask:2,start:132,length:69}];
export const channelIndices=c=>Array.from({length:c.length},(_,i)=>c.start+i);
export const hasChannels=(v,channels)=>!!v&&channels.every(c=>v[c.mask]>.95);
export function combineFeatures(face,hands){
 if(!face&&!hands.some(Boolean))return null;
 const v=Array(COMBINED_DIM).fill(0);
 [face,...hands].forEach((values,i)=>{if(values){v[i]=1;v.splice(CHANNELS[i].start,values.length,...values);}});
 return v;
}
export function smoothCombined(current,previous){
 if(!current)return null;const v=[...current];
 for(const c of CHANNELS)if(current[c.mask]&&previous?.[c.mask])for(const i of channelIndices(c))v[i]=.5*current[i]+.5*previous[i];
 return v;
}
