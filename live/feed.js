/* Read-only public feed. No admin session, writes, or scoring dependencies. */
(()=>{'use strict';
window.SPLLive={start({details=true,onData,onStatus}){
 onStatus(false);const c=window.SPL_CONFIG||{};
 if(!c.SUPABASE_URL||!c.SUPABASE_ANON_KEY||!window.supabase){onStatus(false);return ()=>{};}
 const db=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},realtime:{params:{eventsPerSecond:2}}});
 let stopped=false,busy=false,again=false,connected=false,retry=null,lastKey='',lastMatch='',generation=0;
 function connection(ok){if(connected!==ok){connected=ok;onStatus(ok);}}
 async function read(){if(stopped)return;if(busy){again=true;return;}busy=true;const request=++generation;
  try{const {data,error}=await db.rpc('spl_live_read',{p_details:details});if(error)throw error;if(stopped||request!==generation)return;
   const key=data?data.matchId+':'+data.revision+':'+JSON.stringify(data.portraits||[]):'empty';
   if(key!==lastKey){const switched=data?.matchId!==lastMatch;lastKey=key;lastMatch=data?.matchId||'';onData(data,switched);}
  }catch(e){connection(false);if(!retry)retry=setTimeout(()=>{retry=null;read();},30000);}
  finally{busy=false;if(again&&!stopped){again=false;read();}}
 }
 const channel=db.channel('spl-public-live-v1').on('postgres_changes',{event:'*',schema:'public',table:'spl_live_game',filter:'id=eq.1'},()=>read()).subscribe(status=>{
  if(status==='SUBSCRIBED'){connection(true);lastKey='';read();}else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){connection(false);read();}
 });
 read();
 // Recovery only: no two-second polling. Realtime handles normal visits.
 const recovery=setInterval(read,120000);
 const visible=()=>{if(!document.hidden)read();};window.addEventListener('online',read);document.addEventListener('visibilitychange',visible);
 return ()=>{stopped=true;generation++;clearInterval(recovery);clearTimeout(retry);db.removeChannel(channel);window.removeEventListener('online',read);document.removeEventListener('visibilitychange',visible);};
}};
})();
