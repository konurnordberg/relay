import {FlowDecoder} from './flow-core.js';
let words=null,decoder=null,layoutKey='';
self.onmessage=async({data})=>{try{
 if(!words){const r=await fetch('../data/flow-words.json');if(!r.ok)throw new Error('Word vocabulary could not load.');words=await r.json();}
 const key=JSON.stringify(data.layout);if(key!==layoutKey){decoder=new FlowDecoder(words,data.layout);layoutKey=key;}
 const result=data.type==='decode'?decoder.decode(data.points,data.personal):{ready:true};postMessage({id:data.id,...result});
}catch(e){postMessage({id:data.id,error:e.message});}};
