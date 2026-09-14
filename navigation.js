(()=>{
 const menu=document.getElementById('minigamesMenu');if(!menu)return;
 const close=()=>{menu.open=false;};
 menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
 document.addEventListener('click',e=>{if(!menu.contains(e.target))close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.open){close();menu.querySelector('summary').focus();}});
 addEventListener('hashchange',close);
})();
