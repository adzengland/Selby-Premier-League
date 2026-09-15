/* Additive integration: preserve installed league and minigame routing. */
(()=>{
const oldFixtures=fixturesMarkup,oldProfile=renderPlayerProfile,oldRoute=route;let ticket=0;
fixturesMarkup=function(rounds=state.rounds){const t=document.createElement('template');t.innerHTML=oldFixtures(rounds);const fixtures=rounds.flatMap(r=>r.fixtures);t.content.querySelectorAll('.scorer-fixture-row').forEach((row,i)=>{const f=fixtures[i];if(f?.status==='completed'){const a=document.createElement('a');a.className='btn';a.href='#match/'+encodeURIComponent(f.id);a.textContent='Match summary →';row.querySelector('.fixture-action')?.prepend(a);}});return t.innerHTML;};
renderPlayerProfile=function(name){const t=document.createElement('template');t.innerHTML=oldProfile(name);const a=document.createElement('a');a.className='btn';a.href='#stats/'+encodeURIComponent(name);a.textContent='Player statistics →';t.content.querySelector('.profile-actions')?.append(a);return t.innerHTML;};
route=function(){const request=++ticket,path=location.hash.slice(1),kind=path.split('/')[0];if(!['match','stats'].includes(kind)||state.loading||state.error){oldRoute();return;}
 window.SPLFixture?.close();document.body.classList.remove('fixture-scoring','sprint-mobile-playing');updateSiteAccount();
 let id;try{id=decodeURIComponent(path.slice(kind.length+1));}catch{id='';}
 const app=document.querySelector('#app');app.innerHTML='<section class="st-page"><h1>Loading statistics…</h1></section>';
 window.SPL_STATS.load(kind,id).then(()=>{if(request!==ticket)return;app.innerHTML=kind==='match'?window.SPL_STATS.match(id):window.SPL_STATS.player(id);}).catch(e=>{if(request!==ticket)return;app.innerHTML='<section class="st-page"><h1>Statistics unavailable</h1><p class="st-error"></p><button class="btn" id="retryStats">Retry</button><a href="#fixtures">Back to fixtures</a></section>';app.querySelector('.st-error').textContent=e.message;app.querySelector('#retryStats').onclick=()=>{window.SPL_STATS.invalidate();route();};});
};
// The existing hash listener keeps its original function; run our enhancement afterwards.
window.addEventListener('hashchange',()=>route());
window.addEventListener('storage',()=>window.SPL_STATS.invalidate());
route();
})();
