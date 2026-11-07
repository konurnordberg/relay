// Deliberately constructed geometry for deterministic input tests; never shipped.
export function hand(count,{x=.5,scale=1,mirror=false,rotation=0,thumbOnly=false}={}){
 const p=Array.from({length:21},()=>({x:.5,y:.5,z:0}));p[0]={x:.5,y:.85,z:0};
 for(let f=0;f<4;f++){
  const start=5+f*4,px=.42+f*.08,raised=!thumbOnly&&f<Math.min(count,4);
  p[start]={x:px,y:.62,z:0};p[start+1]={x:px,y:raised?.46:.51,z:0};
  p[start+2]={x:px+(raised?0:.025),y:raised?.34:.60,z:raised?0:-.03};
  p[start+3]={x:px+(raised?0:.015),y:raised?.24:.68,z:raised?0:-.04};
 }
 const open=count===5||thumbOnly;
 [[.38,.76],[.32,.68],open?[.25,.61]:[.41,.63],open?[.18,.54]:[.50,.61]].forEach(([x,y],i)=>p[i+1]={x,y,z:0});
 return p.map(q=>{let a=(q.x-.5)*(mirror?-1:1),b=q.y-.5;const radians=rotation*Math.PI/180;return {x:x+scale*(a*Math.cos(radians)-b*Math.sin(radians)),y:.5+scale*(a*Math.sin(radians)+b*Math.cos(radians)),z:q.z*scale};});
}
export const pairHands=(row,col)=>[hand(row,{x:.75,scale:.55}),hand(col,{x:.25,scale:.55,mirror:true})];
