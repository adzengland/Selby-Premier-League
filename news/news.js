(() => {
 const api=()=>window.SPL_NEWS_API,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const time=v=>v?new Intl.DateTimeFormat('en-GB',{dateStyle:'long',timeStyle:'short',timeZone:'Europe/London'}).format(new Date(v))+' · UK time':'';
 let ticket=0,editor=null,notice='',busy=false;
 const paths=images=>(images||[]).flatMap(i=>[i.path,i.thumb]).filter(Boolean);
 function closeEditor(){if(editor)for(const image of editor.images)if(image.local)URL.revokeObjectURL(image.local);editor=null;}
 function youtube(value){
  if(!value.trim())return null;let u;try{u=new URL(value);}catch{throw Error('Paste a complete YouTube link.');}
  if(u.protocol!=='https:'||u.username||u.password)throw Error('Use an HTTPS YouTube link.');
  const host=u.hostname.toLowerCase(),parts=u.pathname.split('/').filter(Boolean);let id;
  if(host==='youtu.be')id=parts[0];
  else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(host))id=parts[0]==='watch'?u.searchParams.get('v'):['shorts','live','embed'].includes(parts[0])?parts[1]:null;
  if(!id||! /^[A-Za-z0-9_-]{11}$/.test(id))throw Error('Use a YouTube video, Shorts or live-video link.');return id;
 }
 function article(p,urls={}){
  return `<article class="news-article"><span class="kicker">SPL News</span><h1>${esc(p.title)}</h1><time class="news-date" datetime="${esc(p.published_at||'')}">${p.status==='draft'?'DRAFT · Only visible to admins':esc(time(p.published_at))}</time><div class="news-body">${esc(p.body)}</div><div class="news-gallery">${(p.images||[]).map(i=>`<figure>${urls[i.path]?`<img src="${esc(urls[i.path])}" alt="${esc(i.alt)}" loading="lazy" decoding="async">`:'<p>Image unavailable. Reopen this post to retry.</p>'}${i.alt?`<figcaption>${esc(i.alt)}</figcaption>`:''}</figure>`).join('')}</div>${p.youtube_id?`<a class="news-video" href="https://www.youtube.com/watch?v=${esc(p.youtube_id)}" target="_blank" rel="noopener noreferrer"><strong>▶ Watch on YouTube</strong><p>Opens the video on YouTube.</p></a>`:''}</article>`;
 }
 async function imageMap(images,thumbnail=false){try{return await api().imageUrls((images||[]).map(i=>thumbnail?i.thumb:i.path));}catch{return {};}}
 function message(text,error=false){const el=document.querySelector('#newsMessage');if(el){el.textContent=text;el.classList.toggle('news-error',error);}}
 function top(){return `<div class="news-head"><div><span class="kicker">From the oche</span><h1>News</h1></div>${state.isAdmin?'<div class="news-actions"><a class="btn" href="#news/new">New post</a><button class="btn secondary" id="newsCleanup">Clean unused images</button></div>':''}</div><p class="news-status" id="newsMessage" role="status">${esc(notice)}</p>`;}
 function bindCleanup(){const button=document.querySelector('#newsCleanup');if(button)button.onclick=async()=>{button.disabled=true;try{const n=await api().cleanup();message(`${n} unused image files removed. Recent uploads are kept for one hour.`);}catch(e){message(e.message,true);}finally{button.disabled=false;}};}
 async function route(){
  const key=location.hash,identity=state.user?.id||'anon',app=document.querySelector('#app'),request=++ticket;
  document.querySelector('[data-route="news"]')?.classList.add('active');
  if(state.loading){app.innerHTML='<section class="news-page"><h1>Loading news…</h1></section>';return;}
  if(editor&&editor.key===key&&editor.identity===identity&&state.isAdmin)return;
  closeEditor();
  const parts=key.slice(1).split('/'),id=parts[1],editing=id==='new'||parts[2]==='edit';
  if(editing&&!state.isAdmin){app.innerHTML='<section class="news-page"><h1>Admin access only</h1><p>Sign in with your SPL admin account to manage news.</p><a class="btn" href="#account">Sign in</a><a class="btn secondary" href="#news">Back to news</a></section>';return;}
  app.innerHTML='<section class="news-page"><h1>Loading news…</h1></section>';
  try{
   if(editing){
    const post=id==='new'?{id:crypto.randomUUID(),title:'',body:'',status:'draft',youtube_id:null,images:[],revision:0}:uuid.test(id)?await api().get(id):null;
    if(request!==ticket)return;if(!post)throw Error('Post not found.');
    editor={...post,images:post.images.map(i=>({...i})),original:post.images.map(i=>({...i})),key,identity,dirty:false};
    renderEditor(app);return;
   }
   if(id&&id!=='page'){
    const p=uuid.test(id)?await api().get(id):null;if(request!==ticket)return;if(!p)throw Error('Post not found or not published.');
    const urls=await imageMap(p.images);if(request!==ticket)return;
    app.innerHTML=`<section class="news-page"><div class="news-actions"><a class="btn secondary" href="#news">← News</a>${state.isAdmin?`<a class="btn" href="#news/${p.id}/edit">Edit post</a>`:''}<button class="btn secondary" id="newsShare">Copy post link</button></div><p class="news-status" id="newsMessage" role="status">${esc(notice)}</p>${article(p,urls)}</section>`;notice='';
    document.querySelector('#newsShare').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);message('Post link copied.');}catch{message('Copy this address: '+location.href);}};return;
   }
   const page=id==='page'?Math.min(100000,Math.max(0,Number(parts[2])||0)):0;
   const posts=await api().list(page,!!state.isAdmin);if(request!==ticket)return;
   const urls=await imageMap(posts.map(p=>p.images?.[0]).filter(Boolean),true);if(request!==ticket)return;
   app.innerHTML=`<section class="news-page">${top()}<div class="news-feed">${posts.map(p=>`<article class="news-card"><a href="#news/${p.id}">${urls[p.images?.[0]?.thumb]?`<img class="news-cover" src="${esc(urls[p.images[0].thumb])}" alt="${esc(p.images[0].alt)}" loading="lazy" decoding="async">`:''}<div class="news-card-copy">${p.status==='draft'?'<span class="news-badge">DRAFT · ADMIN ONLY</span>':''}<h2>${esc(p.title)}</h2><time class="news-date">${esc(time(p.published_at||p.created_at))}</time><p>${esc(p.excerpt)}${p.excerpt?.length===240?'…':''}</p><span class="kicker">Read post →</span></div></a></article>`).join('')}</div>${!posts.length?'<div class="news-empty">No news here yet. Check back for the latest from SPL.</div>':''}<nav class="news-pager" aria-label="News pages">${page?`<a class="btn secondary" href="#news/page/${page-1}">Newer posts</a>`:''}${posts.length===10?`<a class="btn secondary" href="#news/page/${page+1}">Older posts</a>`:''}</nav></section>`;
   notice='';bindCleanup();
  }catch(e){if(request!==ticket)return;app.innerHTML=`<section class="news-page"><h1>News unavailable</h1><p class="news-error">${esc(e.message)}</p><button class="btn" id="newsRetry">Retry</button><a class="btn secondary" href="#news">Back to news</a></section>`;document.querySelector('#newsRetry').onclick=()=>{api().clear();route();};}
 }
 async function compress(file,maxSide,maxBytes){
  const bitmap=await createImageBitmap(file);
  try{
   if(bitmap.width*bitmap.height>45000000)throw Error('Image is too large. Use a photo below 45 megapixels.');
   let scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
   for(let attempt=0;attempt<5;attempt++){
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
    for(const quality of [.82,.7,.58]){const blob=await new Promise(r=>canvas.toBlob(r,'image/webp',quality));if(!blob||blob.type!=='image/webp')throw Error('This browser cannot prepare WebP photos. Try an up-to-date Chrome, Edge or Safari.');if(blob.size<=maxBytes)return blob;}
    scale*=.8;
   }throw Error('Unable to compress this photo. Try a smaller image.');
  }finally{bitmap.close();}
 }
 function readForm(){const f=document.querySelector('#newsForm');editor.title=f.elements.title.value.trim();editor.body=f.elements.body.value;editor.youtube_id=youtube(f.elements.youtube.value);return editor;}
 function renderEditor(app){
  app.innerHTML=`<section class="news-page"><div class="news-head"><h1>${editor.revision?'Edit post':'New post'}</h1><a class="btn secondary" href="#news">Back to news</a></div><form class="news-form" id="newsForm"><fieldset><label>Title<input name="title" maxlength="120" required value="${esc(editor.title)}"></label><label>Body<textarea name="body" maxlength="12000">${esc(editor.body)}</textarea><small>Plain text with paragraphs. Up to 12,000 characters.</small></label><label>YouTube link (optional)<input name="youtube" type="url" placeholder="https://www.youtube.com/watch?v=…" value="${editor.youtube_id?'https://www.youtube.com/watch?v='+esc(editor.youtube_id):''}"></label><label>Photos (up to three)<input id="newsFiles" type="file" accept="image/jpeg,image/png,image/webp" multiple><small>JPEG, PNG or WebP. Photos are resized to at most 1600px and 256KB, with a thumbnail at most 40KB. Videos stay on YouTube.</small></label><div id="newsImages" class="news-images"></div><div class="news-actions"><button class="btn secondary" type="button" id="newsPreview">Preview</button><button class="btn secondary" type="button" id="newsDraft">Save draft</button><button class="btn" type="submit">${editor.status==='published'?'Update published post':'Publish'}</button>${editor.revision?'<button class="btn secondary" type="button" id="newsDelete">Delete post</button>':''}</div></fieldset><p id="newsMessage" class="news-status" role="status"></p></form><div id="newsPreviewArea" class="news-preview" hidden></div></section>`;
  const form=document.querySelector('#newsForm');form.oninput=()=>{editor.dirty=true;};
  form.onsubmit=e=>{e.preventDefault();save('published');};
  document.querySelector('#newsDraft').onclick=()=>{if(editor.status==='published'&&!confirm('Unpublish this post and save it as a private draft?'))return;save('draft');};
  document.querySelector('#newsPreview').onclick=async()=>{try{const p=readForm(),urls=await imageMap(p.images.filter(i=>!i.local));for(const i of p.images)if(i.local)urls[i.path]=i.local;const area=document.querySelector('#newsPreviewArea');area.hidden=false;area.innerHTML=article({...p,published_at:p.published_at||new Date().toISOString()},urls);area.scrollIntoView({behavior:'smooth',block:'start'});}catch(e){message(e.message,true);}};
  document.querySelector('#newsFiles').onchange=async e=>{
   const files=[...e.target.files];e.target.value='';if(files.length+editor.images.length>3){message('Choose up to three photos per post.',true);return;}
   const owner=editor;setBusy(true);message('Preparing photos…');
   try{for(const file of files){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)throw Error('Choose a JPEG, PNG or WebP photo smaller than 20MB.');const blob=await compress(file,1600,256*1024),thumbBlob=await compress(file,400,40*1024);if(editor!==owner)return;const path=editor.id+'/'+crypto.randomUUID();editor.images.push({path:path+'.webp',thumb:path+'-thumb.webp',alt:'',blob,thumbBlob,local:URL.createObjectURL(blob)});}editor.dirty=true;await showImages();message('Photos ready. They upload when you save.');}catch(e){message(e.message,true);await showImages();}finally{setBusy(false);}
  };
  const del=document.querySelector('#newsDelete');if(del)del.onclick=async()=>{
   if(!confirm('Permanently delete this post and its saved photos?'))return;setBusy(true);
   try{await api().remove(editor);try{await api().removeImages(paths(editor.original));notice='Post and photos deleted.';}catch{notice='Post deleted. Use Clean unused images later to remove leftover files.';}editor.dirty=false;location.hash='news';}catch(e){message(e.message,true);}finally{setBusy(false);}
  };
  showImages();
 }
 function setBusy(value){busy=value;const field=document.querySelector('#newsForm fieldset');if(field)field.disabled=value;}
 async function showImages(){
  const owner=editor;if(!owner)return;const urls=await imageMap(owner.images.filter(i=>!i.local));if(editor!==owner)return;
  const box=document.querySelector('#newsImages');if(!box)return;
  box.innerHTML=owner.images.map((i,n)=>`<div class="news-image-edit"><img src="${esc(i.local||urls[i.path]||'') }" alt="Photo ${n+1}"><div><label>Description / caption<input maxlength="180" data-alt="${n}" value="${esc(i.alt)}"></label><button type="button" class="btn secondary" data-remove="${n}">Remove photo</button></div></div>`).join('');
  box.querySelectorAll('[data-alt]').forEach(input=>input.oninput=()=>{editor.images[Number(input.dataset.alt)].alt=input.value;editor.dirty=true;});
  box.querySelectorAll('[data-remove]').forEach(button=>button.onclick=()=>{const [i]=editor.images.splice(Number(button.dataset.remove),1);if(i.local)URL.revokeObjectURL(i.local);editor.dirty=true;showImages();});
 }
 async function save(status){
  if(busy||!editor)return;const owner=editor;
  try{
   const p=readForm();if(!p.title)throw Error('Add a title.');if(status==='published'&&!p.body.trim())throw Error('Add body text before publishing.');
   setBusy(true);message('Saving…');
   for(const i of p.images){if(i.blob&&!i.uploaded){await api().upload(i.path,i.blob);i.uploaded=true;}if(i.thumbBlob&&!i.thumbUploaded){await api().upload(i.thumb,i.thumbBlob);i.thumbUploaded=true;}}
   const saved=await api().save({...p,status,images:p.images.map(({path,thumb,alt})=>({path,thumb,alt}))});
   const keep=new Set(paths(saved.images)),removed=paths(p.original).filter(path=>!keep.has(path));
   notice=status==='published'?'Post published.':'Draft saved. Only admins can see it.';
   try{await api().removeImages(removed);}catch{notice+=' Some old files could not be removed. Use Clean unused images later.';}
   owner.dirty=false;api().clear();if(editor===owner)location.hash='news/'+saved.id;
  }catch(e){message(e.message+' Your text is still in the editor. If a save response was lost, check News in another tab before retrying.',true);}finally{setBusy(false);}
 }
 addEventListener('beforeunload',e=>{if(editor?.dirty||busy){e.preventDefault();e.returnValue='';}});
 document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(editor?.dirty&&a&&a.target!=='_blank'&&a.getAttribute('href')!==location.hash){if(!confirm('Leave this editor? Unsaved changes will be lost.'))e.preventDefault();else editor.dirty=false;}});
 window.SPL_NEWS={route,leave(){ticket++;closeEditor();},youtube};
})();
