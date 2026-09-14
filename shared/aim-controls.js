/* Shared-ready aiming policy: ordinary movement, then 2.2x after a quarter-second hold. */
(function(root){
 function create(){
  const held=new Map();
  return {
   press(id,dir,now){if(held.has(id))return false;held.set(id,{dir,at:now});return true;},
   release(id){held.delete(id);},
   clear(){held.clear();},
   vector(now){
    const dirs={};for(const {dir,at} of held.values())dirs[dir]=Math.max(dirs[dir]||0,now-at>=250?2.2:1);
    const sx=Number(!!dirs.right)-Number(!!dirs.left),sy=Number(!!dirs.down)-Number(!!dirs.up);
    const norm=Math.hypot(sx,sy)||1;
    return {x:sx*(sx>0?dirs.right:dirs.left||0)/norm,y:sy*(sy>0?dirs.down:dirs.up||0)/norm};
   }
  };
 }
 root.SPL_AIM_CONTROLS={create};if(typeof module!=='undefined')module.exports={create};
})(typeof window==='undefined'?globalThis:window);
