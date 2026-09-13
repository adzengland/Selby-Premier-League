/* Around the Clock: authenticated server scoring and persisted time-only leaderboard. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const config=window.SPL_CONFIG||{};
 const sharedClient=window.parent!==window&&window.parent.SPL_SPRINT_CLIENT;
 const client=sharedClient||(window.supabase&&config.SUPABASE_URL&&config.SUPABASE_ANON_KEY
  ?window.supabase.createClient(config.SUPABASE_URL,config.SUPABASE_ANON_KEY):null);
 const canvas=$('play'),ctx=canvas.getContext('2d'),dart=$('dartAsset');
 const keys=new Set(),pointers=new Map();
 let collectTimer=null;
 let user=null,player=null,game=null,hits=[],shots=[],busy=false,pending=null,epoch=0;
 let authUserId=null,authCheck=0,chargeStart=0,charging=false,chargeSource=null,throwPointer=null;
 let aim={x:621,y:360},wobble={x:0,y:0},power=0,last=0,clockBase=0,clockStamp=0,lastShot=0;
 const time=t=>`${String(Math.floor(t/60000)).padStart(2,'0')}:${(Math.max(0,t)/1000%60).toFixed(1).padStart(4,'0')}`;
 const gaugePower=ms=>{const phase=(Math.max(0,ms)/(650/1.2))%2;return phase<=1?phase:2-phase;};
 const elapsed=()=>!game||(!game.total_darts&&pending?.kind!=='throw')?0:game.status==='completed'?game.elapsed_ms:clockBase+performance.now()-clockStamp;
 const hitLabel=h=>h?.label==='BOUNCER'?'❌':h?.label||'—';
 function notice(text){$('status').textContent=text;}
 function cancel(){charging=false;chargeSource=null;throwPointer=null;power=0;keys.clear();pointers.clear();document.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));}
 function canThrow(){return !!(player&&game&&game.status==='active'&&!game.pending_collect&&!busy&&!pending);}
 function stopAutoCollect(){clearTimeout(collectTimer);collectTimer=null;}
 function autoCollect(){
  stopAutoCollect();
  if(!game?.pending_collect||game.status!=='active')return;
  cancel();
  const version=epoch,id=game.id,visit=game.visit_no;
  collectTimer=setTimeout(()=>{
   collectTimer=null;
   if(version===epoch&&game?.id===id&&game.visit_no===visit&&game.status==='active')collect();
  },1240);
 }
 function update(){
  if(!game?.pending_collect||game.status!=='active')stopAutoCollect();
  const n=game?.remaining??22,darts=game?.total_darts??0;
  const target=game?.status==='completed'?'✓':(game?.target_index??0)<20?String((game?.target_index??0)+1):game.target_index===20?'OUTER':'INNER';
  $('score').textContent=target;
  document.querySelectorAll('[data-darts]').forEach(e=>e.textContent=darts);
  document.querySelectorAll('[data-best]').forEach(e=>e.textContent=game?.highest_visit??0);
  document.querySelectorAll('[data-average]').forEach(e=>e.textContent=darts?(100*(game?.matched_darts||0)/darts).toFixed(0)+'%':'0%');
  $('visits').replaceChildren(...[0,1,2].map(i=>{const e=document.createElement('span');e.textContent=hitLabel(hits[i]);if(hits[i]?.label==='BOUNCER'){e.setAttribute('aria-label','Bouncer: zero points');e.title='Bouncer: zero points';}if(hits[i]?.bust)e.className='bust';return e;}));
  $('visitSmall').textContent=hits.map(hitLabel).join(' ')||'—';
  $('visitTotal').textContent=hits.some(h=>h.bust)?'BUST':game?.visit_score??0;
  $('nextDart').textContent=game?.status==='completed'?'✓':game?.pending_collect?'● ● ●':[0,1,2].map(i=>i===(game?.darts_in_visit??0)?'◉':'○').join(' ');
  $('collect').hidden=collectTimer!==null||!game?.pending_collect||game.status!=='active';$('collect').disabled=busy||!!pending;
  $('throw').disabled=!canThrow();
  document.querySelectorAll('[data-dir]').forEach(e=>e.disabled=!canThrow());
  $('restart').disabled=!player||busy||!!pending;
  $('restart').textContent=game?'NEW RANKED LEG':'START RANKED LEG';
  $('retry').hidden=!pending||busy;
  $('state').textContent=!player?'SIGN IN TO PLAY':!game?'READY TO PLAY':game.status==='completed'?'RESULT SAVED':'IN PLAY';
  $('checkout').textContent=game?.status==='completed'?'CLOCK COMPLETE':target==='OUTER'?'HIT OUTER BULL · 25 ONLY':target==='INNER'?'HIT INNER BULL · 50':`HIT ${target} · DOUBLE +2 · TREBLE +3`;
  $('clockProgress').textContent=`${game?.target_index||0} / 22 targets cleared`;
  document.querySelectorAll('[data-target-index]').forEach(e=>{const i=Number(e.dataset.targetIndex),current=game?.target_index||0;e.classList.toggle('target-done',i<current);e.classList.toggle('target-current',i===current);});
  $('startOverlay').hidden=!!game||!player;
  $('finishOverlay').hidden=game?.status!=='completed'||performance.now()-lastShot<650;
  $('resetGame').hidden=game?.status!=='active';$('resetGame').disabled=busy||!!pending;
  $('playAgain').disabled=busy||!!pending;
  document.body.classList.toggle('game-locked',!player);
  if(!game||!hits.length)window.SPL_EFFECTS?.clear180();
  if(!game||!hits.some(h=>h.bust))window.SPL_EFFECTS?.clearBust();
  if(game?.status==='completed'){
   $('finishMetrics').replaceChildren(...[['TIME',time(game.elapsed_ms)],['DARTS',game.total_darts],['HIT RATE',(100*game.matched_darts/game.total_darts).toFixed(0)+'%']].map(([label,value])=>{const item=document.createElement('div'),number=document.createElement('strong'),caption=document.createElement('small');number.textContent=value;caption.textContent=label;item.append(number,caption);return item;}));
  }
  $('startRanked').hidden=!!game||!player;$('startRanked').disabled=busy||!!pending;
 }
 function identity(){
  document.querySelectorAll('[data-player-name]').forEach(e=>e.textContent=player?.name||'SPL PLAYER');
  document.querySelectorAll('.avatar').forEach(e=>{
   e.replaceChildren();e.style.backgroundImage='none';e.textContent=(player?.name||'SPL').split(/\s+/).map(s=>s[0]).join('').slice(0,2);
   if(player?.avatar_url){try{const u=new URL(player.avatar_url);if(u.protocol==='https:'){const img=new Image();img.src=u.href;img.alt='';img.referrerPolicy='no-referrer';img.onerror=()=>img.remove();e.textContent='';e.append(img);}}catch{}}
  });
 }
 async function checkAuth(){
  const check=++authCheck;
  if(!client){$('authMessage').textContent='The site connection is not configured. Please contact the league organiser.';return;}
  const {data,error}=await client.auth.getUser();
  if(check!==authCheck)return;
  const next=data?.user||null;
  if(!next){
   if(user||game){epoch++;game=null;hits=[];shots=[];pending=null;busy=false;cancel();}
   user=player=null;authUserId=null;identity();
   $('authMessage').textContent=error&&error.status!==400&&error.name!=='AuthSessionMissingError'?'Sign in to play. If you are already signed in, check your connection and reload.':'Sign in with your existing SPL player account to play.';
   $('loginLinks').hidden=false;$('authBanner').hidden=false;notice('Sign in to start a game.');update();return;
  }
  if(user?.id===next.id&&player)return;
  epoch++;game=null;player=null;hits=[];shots=[];pending=null;busy=false;cancel();user=next;authUserId=next.id;identity();update();
  const {data:profile,error:profileError}=await client.rpc('clock_player');
  if(check!==authCheck)return;
  player=profileError?null:profile;identity();
  $('authMessage').textContent=profileError?'This account cannot play yet: '+friendly(profileError):`Signed in as ${player.name}. Practice results stay in this browser only.`;
  $('loginLinks').hidden=!profileError;$('authBanner').hidden=false;
  notice(profileError?'Ask the league organiser to check the player link and Sprint migration.':'Start a game when you are ready. The clock starts on your first throw.');update();
 }
 function friendly(error){
  if(error?.code==='PGRST202'||error?.code==='42883')return 'The Sprint database update has not been installed yet.';
  return error?.message||'Connection interrupted. Retry the same action.';
 }
 function apply(g){game=g;clockBase=g.elapsed_ms||0;clockStamp=performance.now();}
 async function runPending(){
  if(!pending||busy)return;
  const op=pending,version=epoch;let succeeded=false;busy=true;update();notice(op.kind==='throw'?'Dart in flight…':'Saving…');
  try{
   const {data,error}=await client.rpc(op.name,op.args);
   if(version!==epoch)return;
   if(error)throw error;
   pending=null;apply(data);succeeded=true;
   if(op.kind==='start'){
    hits=[];shots=[];aim={x:621,y:360};power=0;notice(data.status==='active'?'Start at 1. Doubles skip one number; trebles skip two.':'This leg was replaced in another tab. Start a new game.');
   }else if(op.kind==='collect'){
    hits=[];shots=[];notice('Next visit. Three darts. Make them count.');
   }else{
    const h=data.hit;hits.push(h);lastShot=performance.now();
    shots.push({bounce:h.label==='BOUNCER',x:h.x,y:h.y,time:lastShot,angle:Math.atan2(h.x-621,-(h.y-607))+.18});
    const shot=shots[shots.length-1],shotEpoch=epoch;
    setTimeout(()=>{
     if(epoch!==shotEpoch||!shots.includes(shot)||document.hidden)return;
     window.SPL_DART_AUDIO?.play(h.label);
     
     if(h.bust){window.SPL_DART_AUDIO?.bust();window.SPL_EFFECTS?.bust();}
     if(data.status==='completed'&&data.remaining===0&&h.double&&!h.bust)window.SPL_DART_AUDIO?.complete();
    },240);
    if(data.status==='completed'){
     $('finishRank').textContent='Checking standings…';setTimeout(update,660);
     notice(`CLOCK COMPLETE · ${data.total_darts} darts · ${time(data.elapsed_ms)} · Saved to the Around the Clock board.`);loadBoard();
    }else notice(`${hitLabel(h)} · ${h.matched?(h.advanced>1?`BONUS JUMP · ${h.advanced} targets cleared`:'TARGET CLEARED'):'No advance · keep aiming at your target'}${data.pending_collect?' · Next visit in 1 second.':''}`);
   }
  }catch(error){
   if(version===epoch){
    const rejected=['P0001','22023','42501','23514','23505','PGRST202','42883'].includes(error?.code);
    if(rejected){
     pending=null;
     if(/expired|not ready|not found/i.test(error.message||'')){game=null;hits=[];shots=[];cancel();}
     notice(friendly(error)+' No dart was recorded.');
    }else notice(`${friendly(error)} Your action is kept for retry; it will not count twice.`);
   }
  }finally{if(version===epoch){busy=false;if(succeeded)autoCollect();update();}}
 }
 function start(){
  if(!player||busy||pending)return;
  window.SPL_DART_AUDIO?.stopCompletion();stopAutoCollect();cancel();pending={kind:'start',name:'clock_start',args:{p_request_id:crypto.randomUUID()}};runPending();
 }
 function collect(){
  if(!game?.pending_collect||game.status!=='active'||busy||pending)return;
  stopAutoCollect();
  pending={kind:'collect',name:'clock_collect',args:{p_game_id:game.id,p_visit_no:game.visit_no}};runPending();
 }
 function begin(source){if(!canThrow()||charging||performance.now()-lastShot<450)return;charging=true;chargeSource=source;chargeStart=performance.now();power=0;}
 function release(source){
  if(!charging||chargeSource!==source)return;
  power=gaugePower(performance.now()-chargeStart);charging=false;chargeSource=null;
  if(!canThrow())return;
  if(!game.total_darts){clockBase=0;clockStamp=performance.now();}
  pending={kind:'throw',name:'clock_throw',power,args:{p_game_id:game.id,p_request_id:crypto.randomUUID(),p_aim_x:aim.x+wobble.x,p_aim_y:aim.y+wobble.y,p_power:power}};runPending();
 }
 function drawDart(s,now){
  if(!dart.complete||!dart.naturalWidth)return;
  const age=Math.max(0,now-s.time),flight=240;
  // Project every dart from one player viewpoint, not radially around the bull.
  // The sprite tip is its lower end; keep the flights on the player's side.
  const viewX=980,viewY=1550;
  const approach=Math.atan2(viewX-s.x,s.y-viewY);
  const offAxis=Math.min(1,Math.hypot(s.x-621,s.y-607)/600);
  const bodyLength=294;
  let height=bodyLength*(.62+.22*offAxis),width=bodyLength*1024/1536*.82;
  let x=s.x,y=s.y,angle=approach;
  let embedded=age>=flight&&!s.bounce;
  if(age<flight){
   // A large near-camera dart travels tip-first toward its measured impact point.
   const t=age/flight,e=1-Math.pow(1-t,1.6);
   x=980+(s.x-980)*e;y=1550+(s.y-1550)*e-100*Math.sin(Math.PI*t);
   const scale=1+1.5*(1-e);height*=scale;width*=scale;
   // Small pitch change along a shallow arc; never rotate toward a radial angle.
   angle+=.045*Math.sin(Math.PI*t);
  }else if(s.bounce){
   const t=(age-flight)/720;
   if(t>=1)return;
   const direction=s.x<621?-1:1;
   // Recoil toward the camera, then gravity pulls the rotating dart below frame.
   x=s.x+direction*(90*Math.sin(Math.PI*t)+145*t);
   y=s.y-125*Math.sin(Math.PI*t)+(1750-s.y)*t*t;
   const recoilScale=1+.35*Math.sin(Math.PI*t);height*=recoilScale;width*=recoilScale;
   angle+=direction*(.35*Math.sin(Math.PI*t)+4.5*t*t);
  }else{
   const settle=Math.min(1,(age-flight)/160);
   angle+=Math.sin(settle*Math.PI*5)*(1-settle)*.025;
  }
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  ctx.shadowColor='#0009';ctx.shadowBlur=embedded?4:9;ctx.shadowOffsetX=embedded?4:10;ctx.shadowOffsetY=embedded?6:12;
  ctx.drawImage(dart,-width*.5,-height*.998,width,height);ctx.restore();
  if(embedded){ctx.fillStyle='#ffd77e';ctx.beginPath();ctx.arc(s.x,s.y,2.5,0,Math.PI*2);ctx.fill();}
 }
 function frame(now){
  const dt=Math.min(.04,(now-last)/1000||0);last=now;
  if(canThrow()){
   let dx=0,dy=0;const d=new Set([...keys,...pointers.values()]);
   if(d.has('left'))dx--;if(d.has('right'))dx++;if(d.has('up'))dy--;if(d.has('down'))dy++;
   const norm=Math.hypot(dx,dy)||1;
   aim.x=Math.max(621-397*1.12,Math.min(621+397*1.12,aim.x+dx/norm*dt*397*.54));
   aim.y=Math.max(607-411*1.12,Math.min(607+411*1.12,aim.y+dy/norm*dt*411*.54));
  }
  wobble.x=Math.sin(now*.0031)*11+Math.sin(now*.0093)*7;wobble.y=Math.cos(now*.0037)*12+Math.sin(now*.0107)*8;
  ctx.clearRect(0,0,1254,1254);
  if(canThrow()){
   const x=aim.x+wobble.x,y=aim.y+wobble.y;ctx.strokeStyle='#ecffd9';ctx.lineWidth=1.8;ctx.shadowColor='#000';ctx.shadowBlur=3;
   ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.moveTo(x-18,y);ctx.lineTo(x-5,y);ctx.moveTo(x+5,y);ctx.lineTo(x+18,y);ctx.moveTo(x,y-18);ctx.lineTo(x,y-5);ctx.moveTo(x,y+5);ctx.lineTo(x,y+18);ctx.stroke();ctx.shadowBlur=0;
  }
  shots=shots.filter(s=>!s.bounce||now-s.time<960);
  shots.forEach(s=>drawDart(s,now));
  if(charging)power=gaugePower(now-chargeStart);
  $('marker').style.left=`${power*100}%`;$('powerValue').textContent=Math.round(power*100)+'%';
  $('powerTrack').setAttribute('aria-valuenow',Math.round(power*100));$('throw').classList.toggle('held',charging);
  document.querySelectorAll('[data-time]').forEach(e=>e.textContent=time(elapsed()));requestAnimationFrame(frame);
 }
 let boardLoad=0;
 async function loadBoard(){
  if(!client)return;const version=++boardLoad;$('leaderboardStatus').textContent='Loading scores…';
  try{
   const {data,error}=await client.rpc('clock_leaderboard');if(version!==boardLoad)return;if(error)throw error;
   if(game?.status==='completed'){const standing=(data||[]).find(r=>r.player_name===player?.name);$('finishRank').textContent=standing?`Overall standing: #${standing.rank} · based on your fastest time`:'Standing unavailable — refresh the leaderboard to retry.';}
   const rows=(data||[]).map(r=>{
    const tr=document.createElement('tr');
    [r.rank,r.player_name,time(r.elapsed_ms),r.darts,r.three_dart_average,r.highest_visit].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td);});
    if(r.player_name===player?.name)tr.className='you';return tr;
   });$('leaderboardRows').replaceChildren(...rows);
   $('leaderboardStatus').textContent=rows.length?'Fastest completed time wins. Dart count does not affect placement.':'No completed legs yet. Set the first score.';
  }catch(error){if(version===boardLoad){$('leaderboardStatus').textContent='Unable to load scores. '+friendly(error);if(game?.status==='completed')$('finishRank').textContent='Standings unavailable — refresh the leaderboard to retry.';}}
 }
 const keyMap={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
 addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select,a'))return;
  if(keyMap[e.code]&&canThrow()){e.preventDefault();keys.add(keyMap[e.code]);}
  if(e.code==='Space'&&canThrow()){e.preventDefault();if(!e.repeat)begin('keyboard');}
  if(e.code==='Enter'&&collectTimer===null&&game?.pending_collect&&!e.repeat&&e.target===document.body){e.preventDefault();collect();}
 });
 addEventListener('keyup',e=>{if(keyMap[e.code])keys.delete(keyMap[e.code]);if(e.code==='Space'&&charging){e.preventDefault();release('keyboard');}});
 document.querySelectorAll('[data-dir]').forEach(b=>{
  b.addEventListener('pointerdown',e=>{if(!canThrow())return;e.preventDefault();b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,b.dataset.dir);b.classList.add('held');});
  const clear=e=>{pointers.delete(e.pointerId);b.classList.remove('held');};['pointerup','pointercancel','lostpointercapture'].forEach(t=>b.addEventListener(t,clear));
 });
 $('throw').addEventListener('pointerdown',e=>{if(!canThrow()||throwPointer!==null)return;e.preventDefault();throwPointer=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);begin('pointer');});
 $('throw').addEventListener('pointerup',e=>{if(e.pointerId!==throwPointer)return;throwPointer=null;release('pointer');});
 $('throw').addEventListener('pointercancel',cancel);$('throw').addEventListener('lostpointercapture',()=>{if(throwPointer!==null)cancel();});
 addEventListener('blur',cancel);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();else checkAuth();});
 $('viewOverall').onclick=e=>{e.preventDefault();$('leaderboard').focus({preventScroll:true});$('leaderboard').scrollIntoView({behavior:'instant',block:'start'});loadBoard();};$('resetGame').onclick=start;$('playAgain').onclick=start;$('restart').onclick=start;$('startRanked').onclick=start;$('collect').onclick=collect;$('retry').onclick=runPending;$('refreshScores').onclick=loadBoard;
 const authListener=client?.auth.onAuthStateChange((event,session)=>{
  // Never await Supabase calls inside its auth callback (avoids auth lock deadlock).
  if(event==='SIGNED_OUT'||(authUserId&&session?.user?.id!==authUserId)){
   epoch++;authCheck++;cancel();user=player=game=null;pending=null;busy=false;hits=[];shots=[];identity();update();
  }
  setTimeout(checkAuth,0);
 });
 addEventListener('pagehide',()=>{authListener?.data?.subscription?.unsubscribe();stopAutoCollect();cancel();});
 update();identity();checkAuth();loadBoard();requestAnimationFrame(frame);
})();

