/* One local Canvas result-card generator for practice and competitive play. */
(()=>{
const logoURL=new URL('result-logo.png',document.currentScript.src).href;
let logoPromise;
function logo(){return logoPromise||=(new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{logoPromise=null;reject(Error('Logo unavailable'));};img.src=logoURL;}));}
logo().catch(()=>{});
async function render({mode,headline,rows,playerName}){const img=await logo(),c=document.createElement('canvas');c.width=1080;c.height=1080;const x=c.getContext('2d');x.fillStyle='#090c10';x.fillRect(0,0,1080,1080);x.fillStyle='#e5ff3f';x.fillRect(0,0,1080,14);x.strokeStyle='#273140';x.lineWidth=2;x.strokeRect(30,30,1020,1020);x.drawImage(img,420,55,240,240);
const text=(s,y,size=40,color='#f5f7fa')=>{x.fillStyle=color;let n=size;do{x.font=`bold ${n--}px system-ui`;}while(x.measureText(String(s)).width>950&&n>18);x.fillText(String(s),64,y);};
text(mode.toUpperCase(),365,54);if(playerName)text(playerName,423,32,'#9aa7b7');text(headline,550,100,'#e5ff3f');
rows.slice(0,4).forEach(([label,value],i)=>{const y=660+i*86;text(label.toUpperCase(),y,25,'#9aa7b7');x.textAlign='right';x.fillStyle='#f5f7fa';x.font='bold 34px system-ui';x.fillText(String(value),1014,y);x.textAlign='left';x.strokeStyle='#273140';x.beginPath();x.moveTo(64,y+24);x.lineTo(1014,y+24);x.stroke();});
return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('PNG generation failed')),'image/png'));}
const icon='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></svg>';
window.SPL_RESULT_CARD={render,mount(container){let id=null,url=null;const clear=()=>{if(url)URL.revokeObjectURL(url);url=null;container.replaceChildren();};return {set(next){if(!next){id=null;clear();return;}if(id===next.id)return;id=next.id;clear();let file;const button=document.createElement('button');button.className='btn secondary';button.setAttribute('aria-label','Share result card');button.title='Share result card';button.style.cssText='min-width:48px;min-height:48px;display:inline-grid;place-items:center;margin:8px';button.innerHTML=icon;container.append(button);
const prepare=async()=>{button.disabled=true;try{const blob=await render(next);if(id!==next.id)return;file=new File([blob],'SPL-'+next.mode.replace(/[^a-z0-9]+/gi,'-')+'-result.png',{type:'image/png'});url=URL.createObjectURL(blob);button.title='Share result card';}catch{button.title='Unable to create result card. Click to retry.';}finally{button.disabled=false;}};
const download=()=>{const a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();};
button.onclick=()=>{if(!file){prepare();return;}if(navigator.canShare?.({files:[file]})&&navigator.share){navigator.share({files:[file],title:'SPL · '+next.mode}).catch(e=>{if(e.name!=='AbortError')download();});}else download();};prepare();},clear};}};
})();
