(()=>{
const numbers=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
const pt=(r,a)=>[300+r*Math.sin(a*Math.PI/180),300-r*Math.cos(a*Math.PI/180)];
const arc=(inner,outer,a,b)=>{const p=pt(outer,a),q=pt(outer,b),t=pt(inner,b),u=pt(inner,a);return `M${p} A${outer},${outer} 0 0 1 ${q} L${t} A${inner},${inner} 0 0 0 ${u} Z`;};
window.SPLInputBoard={render(disabled,draft){
 const last=draft.at(-1),attrs=(n,m)=>`data-board-hit data-n="${n}" data-m="${m}" role="button" tabindex="${disabled?-1:0}" aria-disabled="${disabled}" aria-label="${n===0?'Miss':n===25?(m===2?'Bull 50':'Outer bull 25'):['Single','Double','Treble'][m-1]+' '+n}"`,selected=(n,m)=>last?.n===n&&last?.m===m?' picked':'';
 let body='';
 numbers.forEach((n,i)=>{const a=i*18-9,b=a+18;body+=`<path ${attrs(0,1)} class="board-segment board-miss${selected(0,1)}" d="${arc(248,294,a,b)}" fill="#24282c"/>`;const col=i%2===0?'#ed3c1c':'#58b52b',single=i%2===0?'#303438':'#e5e7b0';
 for(const [inner,outer,m] of [[47,100,1],[100,143,3],[143,202,1],[202,248,2]])body+=`<path ${attrs(n,m)} class="board-segment${selected(n,m)}" d="${arc(inner,outer,a,b)}" fill="${m===1?single:col}"/>`;
 const [x,y]=pt(272,i*18);body+=`<text x="${x}" y="${y}" dy=".35em">${n}</text>`;
 });
 body+=`<circle ${attrs(25,1)} class="board-segment${selected(25,1)}" cx="300" cy="300" r="47" fill="#58b52b"/><circle ${attrs(25,2)} class="board-segment${selected(25,2)}" cx="300" cy="300" r="23" fill="#ed3c1c"/>`;
 return `<div class="sc-board-wrap"><svg class="sc-input-board${disabled?' board-disabled':''}" viewBox="0 0 600 600" aria-label="Dartboard score entry"><circle cx="300" cy="300" r="294" fill="#24282c" stroke="#e5e7b0" stroke-width="2"/>${body}</svg></div>`;
}};
})();
