import {FlowDecoder} from './flow-core.js';
let decoder;
self.onmessage=async({data})=>{
 try{
  if(data.type==='load'){const response=await fetch('../data/flow-words.json');if(!response.ok)throw new Error('Vocabulary unavailable');decoder=new FlowDecoder(await response.json());postMessage({id:data.id,ready:true});}
  if(data.type==='decode'){if(!decoder)throw new Error('Word decoder is not ready');const start=performance.now();postMessage({id:data.id,...decoder.decode(data.points,data.personal),ms:performance.now()-start});}
 }catch(e){postMessage({id:data.id,error:e.message});}
};