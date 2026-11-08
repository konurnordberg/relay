import {summarize} from './core.js';
import {CHANNELS,COMBINED_DIM,channelIndices} from './features.js';

// Each detector is asynchronous. A brief missing hand must not erase an entire
// example, and absent landmarks must never be averaged in as zero-valued poses.
export function summarizeVisible(frames){
 const sample=summarize(frames);
 if(sample.vector.length!==COMBINED_DIM)return sample;
 sample.coverage=[];
 for(const c of CHANNELS){
  const visible=frames.filter(v=>v[c.mask]>.95),coverage=visible.length/frames.length;
  sample.coverage[c.mask]=coverage;
  const usable=visible.length>=3&&coverage>=.75;
  sample.vector[c.mask]=usable?1:0;sample.spread[c.mask]=0;
  const indices=channelIndices(c),part=usable?summarize(visible.map(v=>indices.map(i=>v[i]))):null;
  indices.forEach((i,k)=>{sample.vector[i]=part?.vector[k]||0;sample.spread[i]=part?.spread[k]||0;});
 }
 return sample;
}
