(() => {
 let last = 0;
 const send = () => {
  const height = Math.ceil(document.body.getBoundingClientRect().height);
  if (height !== last) { last = height; parent.postMessage({type:'spl-sprint-height',height},location.origin); }
 };
 new ResizeObserver(send).observe(document.body);
 addEventListener('load',send);send();
})();
