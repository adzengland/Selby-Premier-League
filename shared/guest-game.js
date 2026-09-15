/* Guest-only transport. No auth, fetch, storage or leaderboard writer. */
(()=>{
if(!crypto.randomUUID)crypto.randomUUID=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
window.SPL_GUEST={create(mode){let g=null,lastRequest=null,lastResult=null;const now=()=>performance.now(),copy=x=>JSON.parse(JSON.stringify(x)),C=window.SPL_GUEST_CHECKOUT;
const snapshot=()=>mode==='checkout'?copy(g):({...copy(g),remaining:mode==='clock'?22-g.target_index:g.remaining,elapsed_ms:g.status==='completed'?g.elapsed_ms:g.started===null?0:now()-g.started});
async function rpc(name,a={}){try{if(!name.startsWith(mode+'_'))throw Error('Invalid guest action');const action=name.slice(mode.length+1);if(!['start','throw','collect','tick'].includes(action))throw Error('Guest results cannot be submitted to a leaderboard');if(a.p_request_id&&a.p_request_id===lastRequest)return {data:copy(lastResult),error:null};
if(action==='start'){g=mode==='checkout'?C.create(crypto.randomUUID()):{id:crypto.randomUUID(),status:'active',started:null,remaining:501,visit_start:501,target_index:0,visit_no:1,darts_in_visit:0,total_darts:0,visit_score:0,highest_visit:0,matched_darts:0,pending_collect:false};}
else{if(!g||g.id!==a.p_game_id)throw Error('Start a guest game first');if(mode==='checkout')C.tick(g,now());
if(action==='collect'){if(g.status!=='active')return {data:snapshot(),error:null};if(a.p_visit_no===g.visit_no-1)return {data:snapshot(),error:null};if(!g.pending_collect||a.p_visit_no!==g.visit_no)throw Error('Visit not ready');if(mode==='checkout')C.collect(g,now());else{g.visit_no++;g.visit_start=g.remaining;g.visit_score=0;g.darts_in_visit=0;g.pending_collect=false;}}
else if(action==='throw'&&g.status==='active'){if(g.pending_collect||a.p_dart_no!==g.total_darts)throw Error('Dart already processed or visit not ready');if(![a.p_aim_x,a.p_aim_y,a.p_power].every(Number.isFinite)||a.p_power<0||a.p_power>1)throw Error('Invalid throw');
const power=a.p_power,spread=6.5+Math.abs(power-.5)*24+Math.max(0,Math.abs(power-.5)-.04)**2*500;
const x=a.p_aim_x+(Math.random()+Math.random()-1)*(power<.2?60:spread),y=power<.2?1125+Math.random()*40:a.p_aim_y+(.5-power)*411*.78+(Math.random()+Math.random()-1)*spread;
const h={...window.SPL_GUEST_SCORE(x,y),x,y};
if(mode==='checkout')C.hit(g,h,now());else{if(g.started===null)g.started=now();g.total_darts++;g.darts_in_visit++;
if(mode==='clock'){const p=window.SPL_GUEST_CLOCK.advance(g.target_index,h);g.target_index=p.index;g.visit_score+=p.advance;if(p.matched)g.matched_darts++;g.highest_visit=Math.max(g.highest_visit,g.visit_score);g.pending_collect=g.darts_in_visit===3;g.hit={...h,bust:false,matched:p.matched,advanced:p.advance};if(g.target_index===22){g.status='completed';g.pending_collect=false;g.elapsed_ms=Math.max(1,now()-g.started);}}
else{const next=g.remaining-h.score,bust=next<0||next===1||(next===0&&!h.double);g.remaining=bust?g.visit_start:next;g.visit_score=bust?0:g.visit_start-g.remaining;g.pending_collect=bust||next===0||g.darts_in_visit===3;if(g.pending_collect&&!bust)g.highest_visit=Math.max(g.highest_visit,g.visit_score);g.hit={...h,bust};if(next===0&&!bust){g.status='completed';g.elapsed_ms=Math.max(1,now()-g.started);g.checkout_score=g.visit_start;}}}}
else if(action!=='tick'&&action!=='throw')throw Error('Invalid guest action');}
const result=snapshot();if(a.p_request_id){lastRequest=a.p_request_id;lastResult=copy(result);}return {data:result,error:null};}catch(e){return {data:null,error:{code:'P0001',message:e.message}};}}
return {rpc};}};
})();
