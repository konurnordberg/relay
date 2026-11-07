let session=null,ready=null;
async function initialize(){
 importScripts(new URL('../vendor/ort/ort.wasm.min.js',self.location.href).href);
 ort.env.wasm.numThreads=1;ort.env.wasm.wasmPaths=new URL('../vendor/ort/',self.location.href).href;
 session=await ort.InferenceSession.create(new URL('../models/letters.onnx',self.location.href).href,{executionProviders:['wasm']});
 const shape=session.inputMetadata[0].shape;
 if(shape.slice(1).join(',')!=='28,28,1')throw new Error('Unexpected handwriting model shape.');
}
self.onmessage=async({data})=>{
 try{
  ready??=initialize();await ready;
  if(data.type==='init'){postMessage({type:'ready',id:data.id});return;}
  const {rasterize,letterCandidates}=await import('./letter-raster.js');
  const inputs=new Float32Array(3*784);
  [6,8,10].forEach((width,i)=>inputs.set(rasterize(data.strokes,width),i*784));
  const start=performance.now(),out=await session.run({[session.inputNames[0]]:new ort.Tensor('float32',inputs,[3,28,28,1])});
  const scores=out[session.outputNames[0]].data;if(scores.length!==141)throw new Error('Unexpected handwriting output.');
  const mean=Array.from({length:47},(_,i)=>(scores[i]+scores[i+47]+scores[i+94])/3);
  postMessage({type:'result',id:data.id,...letterCandidates(mean),ms:performance.now()-start});
 }catch(e){postMessage({type:'error',id:data.id,message:e.message||String(e)});}
};
