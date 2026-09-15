/* TEST ONLY. Pure Checkout Challenge rules; no network or persistence. */
(function(root){
 'use strict';
 const START_MS=60000,BONUS_MS=20000;
 const finishes=Array.from({length:20},(_,i)=>({score:2*(i+1),label:'D'+(i+1)})).concat({score:50,label:'BULL'});
 const setups=[...Array.from({length:20},(_,i)=>({score:3*(20-i),label:'T'+(20-i)})),...Array.from({length:20},(_,i)=>({score:20-i,label:'S'+(20-i)})),{score:25,label:'25'},...finishes];
 function route(total,darts=3){
  if(!Number.isInteger(total)||total<2||darts<1)return null;
  const finish=finishes.find(x=>x.score===total);if(finish)return [finish.label];
  if(darts>1)for(const s of setups){const d=finishes.find(x=>x.score===total-s.score);if(d)return [s.label,d.label];}
  if(darts>2)for(const a of setups)for(const b of setups){const d=finishes.find(x=>x.score===total-a.score-b.score);if(d)return [a.label,b.label,d.label];}
  return null;
 }
 const valid=Array.from({length:169},(_,i)=>i+2).filter(n=>route(n));
 function target(count,previous,random=Math.random){
  // Difficulty advances with successful checkouts, never failed attempts.
  let required=count<5?1:count<10?2:(random()<Math.min(.85,.5+(count-10)*.025)?3:2);
  const pool=valid.filter(n=>route(n).length===required&&n!==previous);

  return pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
 }
 function create(id,random=Math.random){const n=target(0,null,random);return {id,status:'active',started:null,deadline:null,elapsed_ms:0,time_left_ms:START_MS,checkouts:0,target:n,remaining:n,visit_no:1,darts_in_visit:0,total_darts:0,visit_score:0,highest_visit:0,pending_collect:false,attempts:0,bonus_ms:0,reason:null};}
 function end(g,reason,now){g.status='completed';g.reason=reason;g.elapsed_ms=g.started===null?0:Math.max(0,now-g.started);g.time_left_ms=reason==='timeout'?0:Math.max(0,g.deadline-now);g.pending_collect=false;return g;}
 function tick(g,now){if(g.status==='active'&&g.started!==null){g.time_left_ms=Math.max(0,g.deadline-now);g.elapsed_ms=Math.max(0,now-g.started);if(now>=g.deadline)end(g,'timeout',g.deadline);}return g;}
 function hit(g,h,now){
  tick(g,now);if(g.status!=='active'||g.pending_collect)return g;
  if(g.started===null){g.started=now;g.deadline=now+START_MS;}
  const next=g.remaining-h.score;
  const bust=next<0||next===1||(next===0&&!h.double);
  g.total_darts++;g.darts_in_visit++;g.remaining=next;g.visit_score+=h.score;
  g.hit={...h,bust,checkout:false,bonus_ms:0};
  if(bust){g.attempts++;return end(g,'bust',now);}
  if(next===0){
   g.checkouts++;g.attempts++;g.highest_visit=Math.max(g.highest_visit,g.visit_score);
   const bonus=BONUS_MS;
   g.deadline+=bonus;g.bonus_ms+=bonus;g.hit.checkout=true;g.hit.bonus_ms=bonus;g.pending_collect=true;g.cleared=true;
  }else if(!route(next,3-g.darts_in_visit)){g.attempts++;g.pending_collect=true;g.cleared=false;g.no_finish=true;g.hit.no_finish=true;}
  return tick(g,now);
 }
 function collect(g,now,random=Math.random){tick(g,now);if(g.status!=='active'||!g.pending_collect)return g;
  if(g.cleared)g.target=target(g.checkouts,g.target,random);
  g.remaining=g.target;g.darts_in_visit=0;g.visit_score=0;g.visit_no++;g.pending_collect=false;g.cleared=false;g.no_finish=false;delete g.hit;return g;
 }
 function rank(results){let last=null,rank=0;return [...results].sort((a,b)=>b.checkouts-a.checkouts||a.player_name.localeCompare(b.player_name)).map((r,i)=>{if(r.checkouts!==last)rank=i+1;last=r.checkouts;return {...r,rank};});}
 const api={START_MS,BONUS_MS,valid,route,target,create,tick,hit,collect,rank};root.SPL_GUEST_CHECKOUT=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
