(()=>{
 const board=document.querySelector('.board'),finish=document.getElementById('finishOverlay');
 let celebrated=false,cleanup;
 function clearBust(){board.classList.remove('is-bust');}
 function clear180(){board.classList.remove('is-maximum');}
 function maximum(){clear180();void board.offsetWidth;board.classList.add('is-maximum');}
 function bust(){clearBust();void board.offsetWidth;board.classList.add('is-bust');}
 function confetti(){
  board.querySelector('.confetti')?.remove();clearTimeout(cleanup);
  const layer=document.createElement('div');layer.className='confetti';layer.setAttribute('aria-hidden','true');
  const width=board.clientWidth,height=board.clientHeight,colors=['#d9ff00','#ffca47','#f34b86','#6be6ff','#ffffff'];
  for(let i=0;i<56;i++){
   const bit=document.createElement('i'),side=i%2;
   bit.style.cssText=`left:${side?92:8}%;background:${colors[i%colors.length]};--dx:${(side?-1:1)*(width*(.12+Math.random()*.7))}px;--dy:${height*(.5+Math.random()*.5)}px;--rise:${-height*(.25+Math.random()*.3)}px;--spin:${Math.random()*900-450}deg;animation-delay:${Math.random()*.18}s`;
   layer.append(bit);
  }
  board.append(layer);cleanup=setTimeout(()=>layer.remove(),2300);
 }
 new MutationObserver(()=>{const visible=!finish.hidden;if(visible&&!celebrated){celebrated=true;confetti();}else if(!visible){celebrated=false;board.querySelector('.confetti')?.remove();clearTimeout(cleanup);}}).observe(finish,{attributes:true,attributeFilter:['hidden']});
 window.SPL_EFFECTS={bust,clearBust,maximum,clear180};
})();
