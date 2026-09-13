/* Original synthesised dart sounds: no downloads or external audio services. */
(()=>{
 let context=null,muted=false,completionBuffer=null,completionSource=null,completionVersion=0,bustBuffer=null;
 const completionBytes=fetch('./assets/GameDone.mp3').then(r=>{if(!r.ok)throw Error('Audio unavailable');return r.arrayBuffer();}).catch(()=>null);
 const bustBytes=fetch('./assets/WilhelmScream.mp3').then(r=>{if(!r.ok)throw Error('Audio unavailable');return r.arrayBuffer();}).catch(()=>null);
 function stopCompletion(){completionVersion++;if(completionSource){try{completionSource.stop();}catch{}completionSource=null;}}
 async function complete(kind='complete'){
  if(muted||!context||context.state!=='running'||document.hidden)return;
  stopCompletion();const version=completionVersion;
  try{
   let buffer=kind==='bust'?bustBuffer:completionBuffer;
   if(!buffer){const bytes=await (kind==='bust'?bustBytes:completionBytes);if(!bytes)return;buffer=await context.decodeAudioData(bytes.slice(0));if(kind==='bust')bustBuffer=buffer;else completionBuffer=buffer;}
   if(version!==completionVersion||muted||document.hidden||context.state!=='running')return;
   const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);
   completionSource=source;source.onended=()=>{source.disconnect();if(completionSource===source)completionSource=null;};source.start();
  }catch{/* A missing or unsupported sound must not interrupt the saved result. */}
 }
 try{muted=localStorage.getItem('spl-sprint-muted')==='true';}catch{}
 const button=document.getElementById('soundToggle');
 function render(){button.textContent=muted?'🔇':'🔊';button.setAttribute('aria-label',muted?'Turn game sound on':'Mute game sound');button.setAttribute('aria-pressed',String(!muted));}
 function unlock(){
  if(muted)return;
  try{
   const Audio=window.AudioContext||window.webkitAudioContext;
   if(!Audio)return;
   if(!context)context=new Audio();
   if(context.state==='suspended')context.resume().catch(()=>{});
  }catch{}
 }
 button.addEventListener('click',()=>{muted=!muted;if(muted)stopCompletion();try{localStorage.setItem('spl-sprint-muted',String(muted));}catch{}render();unlock();});
 // Unlock synchronously during a real gesture, before an asynchronous shot response.
 document.addEventListener('pointerdown',unlock,{capture:true,passive:true});
 document.addEventListener('keydown',unlock,{capture:true});
 function floorThud(){
  if(muted||!context||context.state!=='running'||document.hidden)return;
  try{
   const t=context.currentTime,osc=context.createOscillator(),gain=context.createGain();
   osc.frequency.setValueAtTime(110,t);osc.frequency.exponentialRampToValueAtTime(42,t+.16);
   gain.gain.setValueAtTime(.3,t);gain.gain.exponentialRampToValueAtTime(.001,t+.2);
   osc.connect(gain).connect(context.destination);osc.start(t);osc.stop(t+.22);
   osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }catch{}
 }
 function play(label){
  if(muted||!context||context.state!=='running'||document.hidden||label==='MISS')return;
  try{
   const bounce=label==='BOUNCER',t=context.currentTime;
   if(bounce){const version=completionVersion;setTimeout(()=>{if(version===completionVersion)floorThud();},720);}
   const master=context.createGain();master.gain.value=.4;master.connect(context.destination);
   const length=bounce?.085:.12,buffer=context.createBuffer(1,Math.ceil(context.sampleRate*length),context.sampleRate);
   const samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
   const noise=context.createBufferSource(),filter=context.createBiquadFilter(),envelope=context.createGain();
   noise.buffer=buffer;filter.type=bounce?'highpass':'lowpass';filter.frequency.value=bounce?2200:1800;
   envelope.gain.setValueAtTime(bounce?.5:.85,t);envelope.gain.exponentialRampToValueAtTime(.001,t+length);
   noise.connect(filter).connect(envelope).connect(master);noise.start(t);
   const frequencies=bounce?[1850,2870,4130]:[155,310];
   frequencies.forEach((frequency,i)=>{
    const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type='sine';
    oscillator.frequency.setValueAtTime(frequency,t);oscillator.frequency.exponentialRampToValueAtTime(frequency*(bounce?.8:.45),t+.12);
    gain.gain.setValueAtTime((bounce?.16:.35)/(i+1),t);gain.gain.exponentialRampToValueAtTime(.001,t+(bounce?.28:.14));
    oscillator.connect(gain).connect(master);oscillator.start(t);oscillator.stop(t+.3);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
   });
   noise.onended=()=>{noise.disconnect();filter.disconnect();envelope.disconnect();};
   setTimeout(()=>master.disconnect(),450);
  }catch{/* Sound must never interrupt scoring or retries. */}
 }
 window.SPL_DART_AUDIO={play,complete,bust:()=>complete('bust'),stopCompletion};render();
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCompletion();});
 addEventListener('pagehide',()=>{stopCompletion();if(context)context.close().catch(()=>{});});
})();
