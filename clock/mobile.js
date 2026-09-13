(()=>{

 // Keep held game controls free of browser selection, callouts and dragging.
 document.querySelectorAll('.console, button').forEach(control=>{
  for(const type of ['contextmenu','selectstart','dragstart'])
   control.addEventListener(type,event=>event.preventDefault());
 });
 const $=id=>document.getElementById(id);let active=false,lastText='';
 $('hudCollect').onclick=()=>$('collect').click();$('hudRetry').onclick=()=>$('retry').click();
 addEventListener('message',e=>{if(e.source===parent&&e.origin===location.origin&&e.data?.type==='spl-play-viewport'){const h=Number(e.data.height);if(h>0&&h<5000)document.documentElement.style.setProperty('--play-height',h+'px');}});
 function sync(){
  const map={hudScore:$('score'),hudTime:document.querySelector('[data-time]'),hudDarts:document.querySelector('[data-darts]'),hudAverage:document.querySelector('[data-average]'),hudBest:document.querySelector('[data-best]'),hudVisit:$('visitSmall'),hudStatus:$('status')};
  for(const [id,source] of Object.entries(map)){const value=source?.textContent||'—';if($(id).textContent!==value)$(id).textContent=value;}
  for(const [dest,src] of [['hudCollect','collect'],['hudRetry','retry']]){$(dest).hidden=$(src).hidden;$(dest).disabled=$(src).disabled;}
  const next=['IN PLAY','RESULT SAVED'].includes($('state').textContent);
  if(next!==active){active=next;document.body.classList.toggle('mobile-playing',active);parent.postMessage({type:'spl-mobile-play',active},location.origin);}
 }
 setInterval(sync,100);sync();parent.postMessage({type:'spl-mobile-ready'},location.origin);
})();