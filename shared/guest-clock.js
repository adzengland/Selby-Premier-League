/* Local prototype rules. No live database calls. */
(function(root){
 const targets=[...Array.from({length:20},(_,i)=>String(i+1)),'OUTER BULL','INNER BULL'];
 function advance(index,hit){
  if(index>=22)return {index:22,advance:0,matched:false};
  let steps=0;
  if(index===20)steps=hit.label==='25'&&hit.score===25?1:0;
  else if(index===21)steps=hit.label==='BULL'&&hit.score===50?1:0;
  else{const match=/^(D|T)?(\d+)$/.exec(hit.label);if(match&&Number(match[2])===index+1)steps=match[1]==='T'?3:match[1]==='D'?2:1;}
  const next=index<20?Math.min(20,index+steps):Math.min(22,index+steps);
  return {index:next,advance:next-index,matched:steps>0};
 }
 const api={targets,advance};if(typeof module!=='undefined')module.exports=api;else root.SPL_GUEST_CLOCK=api;
})(globalThis);
