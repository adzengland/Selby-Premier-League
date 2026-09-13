/* Uses the site's existing Supabase client and logged-in league admin. */
(()=>{
const cache=new Map();let owner=null;
function user(){const id=state.user?.id;if(id!==owner){cache.clear();owner=id;}return id;}
function key(id){return 'spl-scorer-pending-v1:'+user()+':'+id;}
function pending(id){try{return JSON.parse(sessionStorage.getItem(key(id))||'null');}catch{return null;}}
function clear(id){sessionStorage.removeItem(key(id));}
function unpack(id,data,reset=false){if(!data){cache.delete(id);return null;}const old=reset?null:cache.get(id);const list=new Map((old?.visits||[]).map(v=>[v.revision,v]));for(const v of data.visits)list.set(v.revision,v);const match={...data,visits:[...list.values()].sort((a,b)=>a.revision-b.revision)};cache.set(id,match);const p=pending(id);if(p&&(data.start_request===p.request||match.visits.some(v=>v.request_id===p.request)||data.revision>p.revision))clear(id);return match;}
async function rpc(name,args){const result=await sb.rpc(name,args);if(result.error){const error=Error(result.error.message);error.code=result.error.code;throw error;}return result.data;}
async function send(id,p){try{const data=await rpc(p.kind==='start'?'fixture_score_start':'fixture_score_submit',p.kind==='start'?{p_fixture_id:id,p_first:p.first,p_request_id:p.request}:{p_fixture_id:id,p_revision:p.revision,p_request_id:p.request,p_darts:p.darts});const result=unpack(id,data,p.kind==='start');clear(id);return result;}catch(e){if(['P0001','40001','42501','22023','22P02'].includes(e.code))clear(id);throw e;}}
window.SPLFixtureAPI={pending,
 async load(id){user();return unpack(id,await rpc('fixture_score_read',{p_fixture_id:id,p_since:0}),true);},
 async start(id,first){if(pending(id))throw Error('Resolve the pending submission before starting again.');const p={kind:'start',first,revision:0,request:crypto.randomUUID()};sessionStorage.setItem(key(id),JSON.stringify(p));return send(id,p);},
 async submit(id,revision,darts){if(pending(id))throw Error('Resolve the pending submission before entering another visit.');const p={kind:'visit',revision,darts:darts.map(({n,m})=>({n,m})),request:crypto.randomUUID()};sessionStorage.setItem(key(id),JSON.stringify(p));return send(id,p);},
 async retry(id){const p=pending(id);if(!p)throw Error('No pending submission. Reload the scorecard.');return send(id,p);}
};
})();
