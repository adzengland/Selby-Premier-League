/* News is requested only when its route opens. No polling or Realtime. */
(() => {
 const db=()=>window.SPL_SPRINT_CLIENT,bucket=()=>db().storage.from('spl-news');
 const cache=new Map(),urls=new Map(),loading=new Map();
 const scope=()=>state.user?.id||'anon';
 const unwrap=r=>{if(r.error)throw Error(r.error.message);return r.data;};
 async function cached(key,load){key=scope()+':'+key;const c=cache.get(key);if(c&&Date.now()<c.until)return structuredClone(c.data);if(!loading.has(key))loading.set(key,load().then(data=>{cache.set(key,{data,until:Date.now()+60000});return data;}).finally(()=>loading.delete(key)));return structuredClone(await loading.get(key));}
 window.SPL_NEWS_API={
  latest:()=>cached("latest",async()=>unwrap(await db().from("spl_news").select("id,title,excerpt,published_at,images").eq("status","published").order("published_at",{ascending:false}).order("id",{ascending:false}).range(0,0))),
  list:(page,admin)=>cached(`list:${page}:${admin}`,async()=>{
   let q=db().from('spl_news').select('id,title,excerpt,status,published_at,created_at,images,youtube_id,revision').order(admin?'created_at':'published_at',{ascending:false}).order('id',{ascending:false});
   if(!admin)q=q.eq('status','published');
   return unwrap(await q.range(page*10,page*10+9));
  }),
  get:id=>cached('post:'+id,async()=>unwrap(await db().from('spl_news').select('*').eq('id',id).maybeSingle())),
  async save(post){
   const {id,title,body,status,youtube_id,images}=post;const data={id,title,body,status,youtube_id,images};
   let q=post.revision?db().from('spl_news').update(data).eq('id',id).eq('revision',post.revision):db().from('spl_news').insert(data);
   const result=await q.select('*').maybeSingle();unwrap(result);cache.clear();
   if(!result.data)throw Error('This post changed in another window. Reopen it before saving again.');return result.data;
  },
  async remove(post){const r=await db().from('spl_news').delete().eq('id',post.id).eq('revision',post.revision).select('id');const rows=unwrap(r);cache.clear();if(!rows.length)throw Error('This post changed. Reopen it before deleting.');},
  async upload(path,blob){unwrap(await bucket().upload(path,blob,{contentType:'image/webp',cacheControl:'3600',upsert:false}));},
  async imageUrls(paths){
   paths=[...new Set(paths.filter(Boolean))];const result={},missing=[];
   for(const path of paths){const c=urls.get(scope()+path);if(c&&c.until>Date.now())result[path]=c.url;else missing.push(path);}
   if(missing.length){const data=unwrap(await bucket().createSignedUrls(missing,900));for(const row of data){if(row.signedUrl){result[row.path]=row.signedUrl;urls.set(scope()+row.path,{url:row.signedUrl,until:Date.now()+600000});}}}
   return result;
  },
  async removeImages(paths){if(paths.length)unwrap(await bucket().remove([...new Set(paths)]));},
  async cleanup(){const rows=unwrap(await db().rpc('spl_news_unused_images'));for(let i=0;i<rows.length;i+=100)await this.removeImages(rows.slice(i,i+100).map(r=>r.path));return rows.length;},
  clear(){cache.clear();urls.clear();}
 };
})();
