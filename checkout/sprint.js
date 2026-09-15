/* Checkout Challenge: server-authoritative scoring and saved leaderboard. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const config=window.SPL_CONFIG||{};
 const sharedClient=window.parent!==window&&window.parent.SPL_SPRINT_CLIENT;
 const client=sharedClient||(window.supabase&&config.SUPABASE_URL&&config.SUPABASE_ANON_KEY
  ?window.supabase.createClient(config.SUPABASE_URL,config.SUPABASE_ANON_KEY):null);
 const canvas=$('play'),ctx=canvas.getContext('2d'),dart=$('dartAsset');
 let guest=null;
 const gameRPC=(name,args)=>guest?guest.rpc(name,args):client.rpc(name,args);
 const keys=new Set(),pointers=new Map(),aimControls=window.SPL_AIM_CONTROLS.create();
 let successFlashUntil=0;
 let collectTimer=null;
 let user=null,player=null,game=null,hits=[],shots=[],busy=false,pending=null,epoch=0;
 let authUserId=null,authCheck=0,chargeStart=0,charging=false,chargeSource=null,throwPointer=null;
 let aim={x:621,y:360},wobble={x:0,y:0},power=0,last=0,clockBase=0,clockStamp=0,lastShot=0;
 const time=t=>`${String(Math.floor(t/60000)).padStart(2,'0')}:${(Math.max(0,t)/1000%60).toFixed(1).padStart(4,'0')}`;
 const gaugePower=ms=>{const phase=(Math.max(0,ms)/(650/1.2))%2;return phase<=1?phase:2-phase;};
 const elapsed=()=>!game||game.started===null?60000:Math.max(0,game.status==='completed'?game.time_left_ms:clockBase-(performance.now()-clockStamp));
 let endedId=null,ticking=false,lastCountdownSecond=null;
 const hitLabel=h=>h?.label==='BOUNCER'?'❌':h?.label||'—';
 function notice(text){$('status').textContent=text;}
 function cancel(){charging=false;chargeSource=null;throwPointer=null;power=0;keys.clear();pointers.clear();aimControls.clear();document.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));}
 function canThrow(){return !!(player&&game&&game.status==='active'&&!game.pending_collect&&!busy&&!pending&&elapsed()>0);}
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
  const n=game?.remaining??'—',darts=game?.total_darts??0;
  const target=n;
  $('score').textContent=target;
  document.querySelectorAll('[data-checkouts]').forEach(e=>e.textContent=game?.checkouts||0);
  document.querySelectorAll('[data-darts]').forEach(e=>e.textContent=darts);
  document.querySelectorAll('[data-best]').forEach(e=>e.textContent=game?.highest_visit??0);
  document.querySelectorAll('[data-average]').forEach(e=>e.textContent=game?.attempts?(100*game.checkouts/game.attempts).toFixed(0)+'%':'0%');
  $('visits').replaceChildren(...[0,1,2].map(i=>{const e=document.createElement('span');e.textContent=hitLabel(hits[i]);if(hits[i]?.label==='BOUNCER'){e.setAttribute('aria-label','Bouncer: zero points');e.title='Bouncer: zero points';}if(hits[i]?.bust)e.className='bust';return e;}));
  $('visitSmall').textContent=hits.map(hitLabel).join(' ')||'—';
  $('visitTotal').textContent=hits.some(h=>h.bust)?'BUST':game?.visit_score??0;
  $('nextDart').textContent=game?.status==='completed'?'✓':game?.pending_collect?'● ● ●':[0,1,2].map(i=>i===(game?.darts_in_visit??0)?'◉':'○').join(' ');
  $('collect').hidden=collectTimer!==null||!game?.pending_collect||game.status!=='active';$('collect').disabled=busy||!!pending;
  $('throw').disabled=!canThrow();
  document.querySelectorAll('[data-dir]').forEach(e=>e.disabled=!canThrow());
  $('restart').disabled=!player||busy||!!pending;
  $('restart').textContent=game?'NEW CHALLENGE':'START CHALLENGE';
  $('retry').hidden=!pending||busy;
  $('state').textContent=!player?'SIGN IN TO PLAY':!game?'READY TO PLAY':game.status==='completed'?'RESULT SAVED':'IN PLAY';
  const remainingDarts=3-(game?.darts_in_visit||0);
  const suggestion=window.CHECKOUT_RULES.route(Number(target),remainingDarts);
  $('checkout').textContent=game?.status==='completed'?(game.reason==='bust'?'BUST · GAME OVER':'TIME UP'):game?.pending_collect?(game.cleared?'CHECKOUT! +'+(game.hit?.bonus_ms/1000||0)+' SECONDS':"TRY AGAIN"):suggestion?suggestion.join(' → '):"TRY AGAIN";
  $('clockProgress').textContent=`Target ${game?.target||'—'} · ${game?.checkouts||0} checkouts · ${(game?.checkouts||0)<5?'ONE-DART TARGETS':(game?.checkouts||0)<10?'TWO-DART TARGETS':'MIXED CHALLENGE'}`;
  document.body.classList.toggle('cant-finish',!!game?.no_finish&&game.status==='active');
  $('startOverlay').hidden=!!game||!player;
  $('finishOverlay').hidden=game?.status!=='completed'||performance.now()-lastShot<650;
  $('resetGame').hidden=game?.status!=='active';$('resetGame').disabled=busy||!!pending;
  $('playAgain').disabled=busy||!!pending;
  document.body.classList.toggle('game-locked',!player);
  if(!game||!hits.length)window.SPL_EFFECTS?.clear180();
  if(!game||!hits.some(h=>h.bust))window.SPL_EFFECTS?.clearBust();
  if(game?.status==='completed'){
   document.querySelector('.result-card h2').textContent=game.reason==='bust'?'BUST · GAME OVER':'TIME UP!';
   $('finishMetrics').replaceChildren(...[['CHECKOUTS',game.checkouts],['TIME PLAYED',time(game.elapsed_ms)],['DARTS',game.total_darts]].map(([label,value])=>{const item=document.createElement('div'),number=document.createElement('strong'),caption=document.createElement('small');number.textContent=value;caption.textContent=label;item.append(number,caption);return item;}));
  }
  $('startRanked').hidden=!!game||!player;$('startRanked').disabled=busy||!!pending;guestUI();
 }
 function identity(){
  document.querySelectorAll('[data-player-name]').forEach(e=>e.textContent=player?.name||'SPL PLAYER');
  document.querySelectorAll('.avatar').forEach(e=>{
   e.replaceChildren();e.style.backgroundImage='none';e.textContent=(player?.name||'SPL').split(/\s+/).map(s=>s[0]).join('').slice(0,2);
   if(player?.avatar_url){try{const u=new URL(player.avatar_url);if(u.protocol==='https:'){const img=new Image();img.src=u.href;img.alt='';img.referrerPolicy='no-referrer';img.onerror=()=>img.remove();e.textContent='';e.append(img);}}catch{}}
  });
 }
 async function checkAuth(){
  if(guest)return;
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
  const {data:profile,error:profileError}=await client.rpc('checkout_player');
  if(check!==authCheck)return;
  player=profileError?null:profile;identity();
  $('authMessage').textContent=profileError?'This account cannot play yet: '+friendly(profileError):`Signed in as ${player.name}. Results are saved to your Checkout Challenge leaderboard.`;
  $('loginLinks').hidden=!profileError;$('authBanner').hidden=false;if(player)loadBoard();
  notice(profileError?'Ask the league organiser to check the player link and Checkout Challenge setup.':'Start a game when you are ready. The clock starts on your first throw.');update();
 }
 function friendly(error){
  if(error?.code==='PGRST202'||error?.code==='42883')return 'The Checkout Challenge database update has not been installed yet.';
  return error?.message||'Connection interrupted. Retry the same action.';
 }
 function apply(g){game=g;clockBase=g.time_left_ms??60000;clockStamp=performance.now();}
 async function runPending(){
  if(!pending||busy)return;
  const op=pending,version=epoch,oldDarts=game?.total_darts||0;let succeeded=false;busy=true;update();notice(op.kind==='throw'?'Dart in flight…':'Saving…');
  try{
   const {data,error}=await gameRPC(op.name,op.args);
   if(version!==epoch)return;
   if(error)throw error;
   pending=null;apply(data);succeeded=true;
   if(op.kind==='start'){
    endedId=null;hits=[];shots=[];aim={x:621,y:360};power=0;notice('Finish '+data.target+' on a double within three darts. The timer starts on your first throw.');
   }else if(op.kind==='collect'){
    hits=[];shots=[];notice('Next visit. Three darts. Make them count.');
   }else if(data.hit&&data.total_darts>oldDarts){
    const h=data.hit;hits.push(h);lastShot=performance.now();
    shots.push({bounce:h.label==='BOUNCER',x:h.x,y:h.y,time:lastShot,angle:Math.atan2(h.x-621,-(h.y-607))+.18});
    const shot=shots[shots.length-1],shotEpoch=epoch;
    setTimeout(()=>{
     if(epoch!==shotEpoch||!shots.includes(shot)||document.hidden)return;
     window.SPL_DART_AUDIO?.play(h.label);
     if(h.checkout){successFlashUntil=performance.now()+550;window.SPL_DART_AUDIO?.ping();}
     
     if(h.bust)window.SPL_EFFECTS?.bust();
     
    },240);
    if(data.status!=='completed')notice(`${hitLabel(h)} · ${h.checkout?'CHECKOUT! +'+(h.bonus_ms/1000)+' seconds':data.pending_collect?"TRY AGAIN · resetting "+data.target:data.remaining+' remaining'}`);

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
  }finally{if(version===epoch){busy=false;if(succeeded)autoCollect();finish();update();}}
 }
 function finish(){
  if(game?.status!=='completed'||endedId===game.id)return;
  endedId=game.id;cancel();stopAutoCollect();
  if(game.reason==='bust')window.SPL_EFFECTS?.bust();
  window.SPL_DART_AUDIO?.complete();
  $('finishRank').textContent='Checking overall standings…';
  notice(`${game.reason==='bust'?'BUST · GAME OVER':'TIME UP'} · ${game.checkouts} checkouts${game.storage_error?' · Browser storage is full; result could not be saved.':' · Result saved.'}`);
  setTimeout(update,660);loadBoard();
 }
 let lastSync=0;
 async function tick(){
  if(ticking||busy||pending||!game||game.status!=='active'||game.started===null||elapsed()>0||performance.now()-lastSync<2000)return;
  lastSync=performance.now();
  ticking=true;const version=epoch,id=game.id;
  try{const {data,error}=await gameRPC('checkout_tick',{p_game_id:id});if(version===epoch&&game?.id===id){if(error)notice('Time up. Reconnecting to confirm your result…');else{apply(data);finish();update();}}}catch{if(version===epoch)notice('Time up. Reconnecting to confirm your result…');}finally{ticking=false;}
 }
 const clockTimer=setInterval(tick,100);
 function start(){
  if(!player||busy||pending)return;
  successFlashUntil=0;window.SPL_DART_AUDIO?.stopCompletion();stopAutoCollect();cancel();pending={kind:'start',name:'checkout_start',args:{p_request_id:crypto.randomUUID()}};runPending();
 }
 function collect(){
  if(!game?.pending_collect||game.status!=='active'||busy||pending)return;
  stopAutoCollect();
  pending={kind:'collect',name:'checkout_collect',args:{p_game_id:game.id,p_visit_no:game.visit_no}};runPending();
 }
 function begin(source){if(!canThrow()||charging||performance.now()-lastShot<450)return;charging=true;chargeSource=source;chargeStart=performance.now();power=0;}
 function release(source){
  if(!charging||chargeSource!==source)return;
  power=gaugePower(performance.now()-chargeStart);charging=false;chargeSource=null;
  if(!canThrow())return;
  if(!game.total_darts){clockBase=0;clockStamp=performance.now();}
  pending={kind:'throw',name:'checkout_throw',power,args:{p_game_id:game.id,p_request_id:crypto.randomUUID(),p_visit_no:game.visit_no,p_aim_x:aim.x+wobble.x,p_aim_y:aim.y+wobble.y,p_power:power,p_dart_no:game.total_darts}};runPending();
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
   const move=aimControls.vector(now);
   aim.x=Math.max(621-397*1.12,Math.min(621+397*1.12,aim.x+move.x*dt*397*.54));
   aim.y=Math.max(607-411*1.12,Math.min(607+411*1.12,aim.y+move.y*dt*411*.54));
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
  const left=elapsed(),urgent=game?.status==='active'&&game.started!==null&&left>0&&left<=20000;
  document.body.classList.toggle('clock-danger',urgent);
  document.body.classList.toggle('checkout-success',game?.status==='active'&&now<successFlashUntil);
  if(urgent&&!document.hidden){const second=Math.ceil(left/1000);if(second!==lastCountdownSecond){lastCountdownSecond=second;window.SPL_DART_AUDIO?.tick();}}else lastCountdownSecond=null;
  document.querySelectorAll('[data-time]').forEach(e=>e.textContent=time(left));requestAnimationFrame(frame);
 }

 const guestButton=document.createElement('button');guestButton.id='playPractice';guestButton.className='btn';guestButton.textContent='PRACTICE';
 const loginButton=document.createElement('a');loginButton.className='btn';loginButton.href='../#account';loginButton.target='_top';loginButton.textContent='LOGIN';$('authBanner').append(loginButton,guestButton);
 const guestCard=document.createElement('div');guestCard.id='resultShare';document.querySelector('.result-card').append(guestCard);const resultCard=window.SPL_RESULT_CARD.mount(guestCard);
 guestButton.onclick=()=>{if(user)return;authCheck++;epoch++;stopAutoCollect();cancel();pending=null;busy=false;game=null;hits=[];shots=[];guest=window.SPL_GUEST.create('checkout');player={name:'Practice',avatar_url:null};identity();update();start();};

 function guestUI(){guestButton.hidden=!!user||!!guest;loginButton.hidden=!!user;$('loginLinks').hidden=true;guestCard.hidden=game?.status!=='completed';$('viewOverall').hidden=!!guest;$('leaderboard').hidden=!user||!!guest;
 if(!user&&!guest)$('authMessage').textContent='Log in or play a practice game.';
 if(guest){$('authMessage').textContent='Practice · local play';$('restart').textContent='NEW PRACTICE GAME';$('state').textContent='PRACTICE';if(game?.status==='completed'){$('finishRank').textContent='Practice result';if('checkout'==='sprint')$('checkout').textContent='GAME SHOT';}}
 if(game?.status==='completed'){const rows=[['Checkouts',game.checkouts],['Time played',time(game.elapsed_ms)],['Darts',game.total_darts],['Ended by',game.reason==='bust'?'Bust':'Time up']];resultCard.set({id:game.id,mode:'Checkout Challenge',playerName:guest?'':player?.name,headline:game.checkouts+' checkouts',rows});}else resultCard.set(null);
 }
 let boardLoad=0;
 async function loadBoard(){
  if(guest||!user){if(guest&&game?.status==='completed'){ $('finishRank').textContent='Practice result';notice('Practice result — not submitted to a leaderboard.');}return;}
  if(!client)return;const version=++boardLoad;$('leaderboardStatus').textContent='Loading scores…';
  try{
   const {data,error}=await client.rpc('checkout_leaderboard');if(version!==boardLoad)return;if(error)throw error;
   if(game?.status==='completed'){const standing=(data||[]).find(r=>r.player_name===player?.name);$('finishRank').textContent=standing?`Overall standing: #${standing.rank} · most checkouts wins`:'Standing unavailable — refresh the leaderboard to retry.';}
   const rows=(data||[]).map(r=>{
    const tr=document.createElement('tr');
    [r.rank,r.player_name,r.checkouts,time(r.elapsed_ms),r.darts,r.reason==='bust'?'Bust':'Time up'].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td);});
    if(r.player_name===player?.name)tr.className='you';return tr;
   });$('leaderboardRows').replaceChildren(...rows);
   $('leaderboardStatus').textContent=rows.length?'Checkout Challenge personal bests. Most checkouts wins. Equal counts share a rank; darts and time do not break ties.':'No completed challenges yet. Set the first score.';
  }catch(error){if(version===boardLoad){$('leaderboardStatus').textContent='Unable to load scores. '+friendly(error);if(game?.status==='completed')$('finishRank').textContent='Standings unavailable — refresh the leaderboard to retry.';}}
 }
 function nudge(dir){
  const dx=dir==='left'?-1:dir==='right'?1:0,dy=dir==='up'?-1:dir==='down'?1:0;
  aim.x=Math.max(621-397*1.12,Math.min(621+397*1.12,aim.x+dx*2));
  aim.y=Math.max(607-411*1.12,Math.min(607+411*1.12,aim.y+dy*2));
 }
 const keyMap={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
 addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select,a'))return;
  if(keyMap[e.code]&&canThrow()){e.preventDefault();if(aimControls.press('key:'+e.code,keyMap[e.code],performance.now()))nudge(keyMap[e.code]);keys.add(keyMap[e.code]);}
  if(e.code==='Space'&&canThrow()){e.preventDefault();if(!e.repeat)begin('keyboard');}
  if(e.code==='Enter'&&collectTimer===null&&game?.pending_collect&&!e.repeat&&e.target===document.body){e.preventDefault();collect();}
 });
 addEventListener('keyup',e=>{if(keyMap[e.code]){keys.delete(keyMap[e.code]);aimControls.release('key:'+e.code);}if(e.code==='Space'&&charging){e.preventDefault();release('keyboard');}});
 document.querySelectorAll('[data-dir]').forEach(b=>{
  b.addEventListener('pointerdown',e=>{if(!canThrow())return;e.preventDefault();b.setPointerCapture(e.pointerId);if(aimControls.press('pointer:'+e.pointerId,b.dataset.dir,performance.now()))nudge(b.dataset.dir);pointers.set(e.pointerId,b.dataset.dir);b.classList.add('held');});
  const clear=e=>{pointers.delete(e.pointerId);aimControls.release('pointer:'+e.pointerId);b.classList.remove('held');};['pointerup','pointercancel','lostpointercapture'].forEach(t=>b.addEventListener(t,clear));
 });
 $('throw').addEventListener('pointerdown',e=>{if(!canThrow()||throwPointer!==null)return;e.preventDefault();throwPointer=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);begin('pointer');});
 $('throw').addEventListener('pointerup',e=>{if(e.pointerId!==throwPointer)return;throwPointer=null;release('pointer');});
 $('throw').addEventListener('pointercancel',cancel);$('throw').addEventListener('lostpointercapture',()=>{if(throwPointer!==null)cancel();});
 addEventListener('blur',cancel);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();else checkAuth();});
 $('viewOverall').onclick=e=>{e.preventDefault();$('leaderboard').focus({preventScroll:true});$('leaderboard').scrollIntoView({behavior:'instant',block:'start'});loadBoard();};$('resetGame').onclick=start;$('playAgain').onclick=start;$('restart').onclick=start;$('startRanked').onclick=start;$('collect').onclick=collect;$('retry').onclick=runPending;$('refreshScores').onclick=loadBoard;
 const authListener=client?.auth.onAuthStateChange((event,session)=>{
  if(guest){if(!session?.user)return;guest=null;epoch++;game=player=null;pending=null;busy=false;cancel();}
  // Never await Supabase calls inside its auth callback (avoids auth lock deadlock).
  if(event==='SIGNED_OUT'||(authUserId&&session?.user?.id!==authUserId)){
   epoch++;authCheck++;cancel();user=player=game=null;pending=null;busy=false;hits=[];shots=[];identity();update();
  }
  setTimeout(checkAuth,0);
 });
 addEventListener('pagehide',()=>{authListener?.data?.subscription?.unsubscribe();clearInterval(clockTimer);stopAutoCollect();cancel();});
 update();identity();checkAuth();loadBoard();requestAnimationFrame(frame);
})();

