/* Display-only checkout suggestions. Scoring and random targets are calculated by Supabase. */
(function(root){
 const finishes=Array.from({length:20},(_,i)=>({score:2*(i+1),label:'D'+(i+1)})).concat({score:50,label:'BULL'});
 const setups=[...Array.from({length:20},(_,i)=>({score:3*(20-i),label:'T'+(20-i)})),...Array.from({length:20},(_,i)=>({score:20-i,label:'S'+(20-i)})),{score:25,label:'25'},...finishes];
 function route(total,darts=3){
  if(!Number.isInteger(total)||total<2||darts<1)return null;
  const finish=finishes.find(x=>x.score===total);if(finish)return [finish.label];
  if(darts>1)for(const s of setups){const d=finishes.find(x=>x.score===total-s.score);if(d)return [s.label,d.label];}
  if(darts>2)for(const a of setups)for(const b of setups){const d=finishes.find(x=>x.score===total-a.score-b.score);if(d)return [a.label,b.label,d.label];}
  return null;
 }
 root.CHECKOUT_RULES={route};
})(window);
