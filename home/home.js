/* One small totals response and one published post; no timers or polling. */
(()=>{
 let totals=null,pending=null,until=0;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function loadTotals(){
  if(totals&&Date.now()<until)return totals;
  if(!pending)pending=window.SPL_SPRINT_CLIENT.rpc('league_home_totals').then(({data,error})=>{if(error)throw Error(error.message);if(!data)throw Error('No totals returned');totals=data;until=Date.now()+60000;return data;}).finally(()=>pending=null);
  return pending;
 }
 window.SPL_HOME={mount(){
  const stats=document.getElementById('homeTotals'),news=document.getElementById('homeLatestNews');
  loadTotals().then(data=>{if(!stats?.isConnected)return;for(const key of ['maximums','visits26','madhouse'])stats.querySelector('[data-total="'+key+'"]').textContent=Number(data[key]||0).toLocaleString('en-GB');}).catch(()=>{if(stats?.isConnected){stats.querySelectorAll('[data-total]').forEach(el=>el.textContent='—');stats.querySelector('.home-total-note').textContent='League totals temporarily unavailable.';stats.querySelector('.home-total-note').hidden=false;}});
  window.SPL_NEWS_API.latest().then(async posts=>{
   if(!news?.isConnected)return;const p=posts[0];
   if(!p){news.innerHTML='<span class="kicker">Latest news</span><p>No news posted yet.</p><a href="#news">All news →</a>';return;}
   const photo=p.images?.[0];let url='';if(photo?.thumb){try{url=(await window.SPL_NEWS_API.imageUrls([photo.thumb]))[photo.thumb]||'';}catch{}}
   if(!news.isConnected)return;
   news.innerHTML=`${url?`<img src="${esc(url)}" alt="${esc(photo.alt)}" loading="lazy" decoding="async">`:''}<div><span class="kicker">Latest news</span><h2>${esc(p.title)}</h2><time>${esc(new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/London'}).format(new Date(p.published_at)))} · UK time</time><p>${esc(p.excerpt)}</p><a class="btn secondary" href="#news/${encodeURIComponent(p.id)}">Read post →</a></div>`;
  }).catch(()=>{if(news?.isConnected)news.innerHTML='<span class="kicker">Latest news</span><p>News temporarily unavailable.</p><a href="#news">View news →</a>';});
 }};
})();
