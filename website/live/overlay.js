// Read-only local event stream. No polling, auth, or write endpoints.
let revision=-1,current=null,connected=false,metric=0,hideTimer,effectTimer,summaryTimer;const $=id=>document.getElementById(id),board=document.querySelector('.board');
function metrics(){if(!current)return;for(let i=0;i<2;i++){const m=current.stats[i],items=[['3-DART AVERAGE',current.averages[i]],['DARTS THROWN',m.darts],['BEST LEG',m.best?m.best+' DARTS':'—'],['EST. CHECKOUT %',m.attempts?(100*m.checkouts/m.attempts).toFixed(0)+'% · '+m.checkouts+'/'+m.attempts:'—']];const bar=$('stat'+i);bar.dataset.metric=metric;bar.querySelector('small').textContent=items[metric][0];bar.querySelector('strong').textContent=items[metric][1];}}
function showMetrics(){if(!current||!connected||!$('match-summary').hidden)return;metrics();board.classList.add('stats-visible');clearTimeout(hideTimer);hideTimer=setTimeout(()=>{board.classList.remove('stats-visible');metric=(metric+1)%4;},20000);}
setInterval(showMetrics,60000);
function stopCelebration(){clearTimeout(effectTimer);for(let i=0;i<2;i++){$('p'+i).classList.remove('celebrating','effect-maximum','effect-classic','effect-legwin','effect-visit','effect-bust');$('celebration'+i).className='celebration';}}
function celebrate(points,player,win=false,ordinary=false,bust=false){stopCelebration();const noScore=!win&&(bust||points===0),el=$('celebration'+player),kind=win?'legwin':noScore?'bust':ordinary?'visit':points===180?'maximum':'classic';el.querySelector('small').textContent='';el.querySelector('strong').textContent=win?(current.status==='completed'?'MATCH WON':'LEG WON'):noScore?'NO SCORE':points;void el.offsetWidth;$('p'+player).classList.add('celebrating','effect-'+kind);el.className='celebration show '+kind;effectTimer=setTimeout(stopCelebration,noScore?3400:ordinary?2600:4500);}
function status(connected){board.classList.toggle('disconnected',!connected);$('live').textContent=connected?'2026 / 27':'AWAITING UPDATE';parent.postMessage({type:'overlay-status',connected,text:connected?'Connected · saved visits only':'Feed offline · keeping last score'},location.origin);}
function draw(s){if(current?.matchId!==s.matchId){revision=-1;stopCelebration();}if(!Number.isInteger(s.revision)||s.revision<=revision)return;const liveEvent=connected&&revision>=0&&current?.matchId===s.matchId&&s.revision===revision+1;revision=s.revision;current=s;board.hidden=false;board.dataset.revision=revision;
 if(s.action!=='submit'){stopCelebration();}
 if(liveEvent&&s.action==='submit'&&s.last?.checkout)celebrate(s.last.points,s.last.player,true);
 else if(liveEvent&&s.action==='submit'&&!s.last?.bust&&[26,180].includes(s.last?.points))celebrate(s.last.points,s.last.player);
 else if(liveEvent&&s.action==='submit'&&s.last)celebrate(s.last.points,s.last.player,false,true,!!s.last.bust);
 metrics();for(let i=0;i<2;i++){$('n'+i).textContent=s.players[i];$('initials'+i).textContent=s.players[i].split(/\s+/).map(n=>n[0]).slice(0,2).join('');$('s'+i).textContent=s.remaining[i];$('l'+i).textContent=s.legs[i];$('p'+i).classList.toggle('active',s.status==='active'&&s.turn===i);}
 scheduleSummary(s);
 $('leg').textContent=s.status==='completed'?'MATCH COMPLETE':'LEG '+s.leg;
 board.classList.remove('updated');void board.offsetWidth;board.classList.add('updated');
}


for(let i=0;i<2;i++){const img=$('photo'+i);const fallback=()=>{img.hidden=true;};img.addEventListener('error',fallback);if(img.complete&&!img.naturalWidth)fallback();}



function scheduleSummary(s){clearTimeout(summaryTimer);if(s.status!=='completed'||!s.summary){$('match-summary').hidden=true;return;}renderSummary(s);const delay=Math.max(0,s.completedAt+10000-Date.now());const reveal=()=>{if(current?.matchId!==s.matchId||current.status!=='completed')return;stopCelebration();board.hidden=true;board.classList.remove('stats-visible');$('match-summary').hidden=false;};if(delay===0)reveal();else summaryTimer=setTimeout(reveal,delay);}
function renderSummary(s){const stats=s.summary,fmt=n=>n===null||n===undefined?'—':Number(n).toFixed(2),legs=n=>n===null?'—':n+' darts';
 for(let i=0;i<2;i++){$('final-name'+i).textContent=s.players[i];}
 $('final-score').textContent=s.legs.join(' – ');
 const rows=[
 ['3-dart average',a=>fmt(a.average)],['First 9 average',a=>fmt(a.first9)],['Darts thrown',a=>a.darts],['Best won leg',a=>legs(a.best)],['Highest checkout',a=>a.finishes[0]?.score??'—'],['100+ checkouts',a=>a.finishes.filter(f=>f.score>=100).length],['Checkout success · est.',a=>a.checkouts+'/'+a.attempts+' ('+(a.checkout===null?'—':Math.round(a.checkout)+'%')+')'],['Bullseyes',a=>a.bulls],['180s',a=>a.bands[4]],['Trebleless visits',a=>a.trebleless],['Busts',a=>a.busts],['26s · the classics',a=>a.visits26,true],['Trips to the madhouse',a=>a.madhouse,true]];
 const root=$('summary-tables');root.replaceChildren();for(const [label,get,funny] of rows){const row=document.createElement('div');row.className='summary-row'+(funny?' funny':'');const left=document.createElement('strong'),middle=document.createElement('span'),right=document.createElement('strong');middle.textContent=label;left.textContent=get(stats[0]);right.textContent=get(stats[1]);row.append(left,middle,right);root.append(row);}}

for(const img of document.querySelectorAll('.summary-portrait img')){img.addEventListener('error',()=>img.hidden=true);if(img.complete&&!img.naturalWidth)img.hidden=true;}

function profileImage(img,url){let safe='';try{const u=new URL(url);if(['https:','http:'].includes(u.protocol))safe=u.href;}catch{}if(!safe){img.hidden=true;img.removeAttribute('src');return;}if(img.getAttribute('src')!==safe){img.hidden=false;img.src=safe;}}
window.SPLLive.start({onStatus:ok=>{if(ok&&!connected)revision=-1;connected=ok;if(!ok){stopCelebration();board.classList.remove('stats-visible');}status(ok);},onData:s=>{
 if(!s){clearTimeout(summaryTimer);stopCelebration();current=null;revision=-1;board.hidden=true;$('match-summary').hidden=true;$('waiting').hidden=false;return;}
 $('waiting').hidden=true;s.averages=s.state.metrics.map(m=>m.darts?(m.points*3/m.darts).toFixed(1):'—');
 s.summary=s.status==='completed'?s.players.map((name,i)=>({...SPLMetrics.measure([{config:s.config,state:s.state,visits:s.visits}],name),visits:s.visits.filter(v=>v.visit.player===i).length,trebleless:s.visits.filter(v=>v.visit.player===i&&!v.visit.darts.some(d=>d.m===3)).length})):null;
 for(let i=0;i<2;i++){profileImage($('photo'+i),s.portraits[i]);profileImage(document.querySelectorAll('.summary-portrait img')[i],s.portraits[i]);$('summary-initials'+i).textContent=s.players[i].split(/\s+/).map(x=>x[0]).slice(0,2).join('');}
 $('round-title').textContent=(s.round?'ROUND '+s.round+' · ':'')+'FIRST TO 5 LEGS';draw(s);
}});
