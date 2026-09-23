(()=>{let owned=false;
async function fullscreen(){if(!matchMedia('(max-width:900px)').matches||document.fullscreenElement)return;try{await document.documentElement.requestFullscreen?.();owned=!!document.fullscreenElement;}catch{}}
document.addEventListener('click',e=>{if(e.target.closest('[data-sc-fullscreen]')||e.target.closest('a[href^="#score/"]'))fullscreen();const button=e.target.closest('[data-sc-more]');if(button)document.querySelector('.scorer')?.classList.toggle('sc-show-more');},true);
const observer=new MutationObserver(()=>{if(!document.body.classList.contains('fixture-scoring')&&owned){owned=false;if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});}});observer.observe(document.body,{attributes:true,attributeFilter:['class']});
})();
