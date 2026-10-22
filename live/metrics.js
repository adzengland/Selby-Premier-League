/* Statistics derived only from accepted visits. No network or storage. */
(function(root){
const blank=()=>({darts:0,points:0,attempts:0,checkouts:0,first9Darts:0,first9Points:0,busts:0,visits26:0,madhouse:0,doublesHit:0,bulls:0,bands:[0,0,0,0,0],finishes:[],legs:[],doubles:Array.from({length:26},()=>({attempts:0,hits:0}))});
function measure(matches,name,leg=null){const a=blank();
for(const m of matches){if(m.state.status!=='completed')continue;const who=m.config.players.indexOf(name);if(who<0)continue;const perLeg=new Map();
for(const row of m.visits){const v=row.visit;if(v.player!==who||(leg!==null&&v.leg!==leg))continue;let l=perLeg.get(v.leg);if(!l){l={leg:v.leg,darts:0,points:0,won:false,fixture:m.fixture_id};perLeg.set(v.leg,l);}a.points+=v.points;a.darts+=v.darts.length;a.busts+=+v.bust;a.visits26+=+(v.points===26&&!v.bust);a.madhouse+=+v.darts.some(d=>d.before===2);
const band=v.points===180?4:v.points>=170?3:v.points>=140?2:v.points>=100?1:v.points>=60?0:-1;if(band>=0)a.bands[band]++;
for(const d of v.darts){if(l.darts<9){a.first9Darts++;a.first9Points+=v.bust?0:d.points;}l.darts++;if(d.m===2&&d.n>0)a.doublesHit++;if(d.n===25&&d.m===2)a.bulls++;if(d.attempt){a.attempts++;const target=d.before===50?25:d.before/2;if(a.doubles[target]){a.doubles[target].attempts++;if(v.checkout&&d===v.darts.at(-1))a.doubles[target].hits++;}}}
l.points+=v.points;if(v.checkout){a.checkouts++;l.won=true;a.finishes.push({score:v.start,route:v.darts.map(d=>d.label).join(' · '),leg:v.leg,fixture:m.fixture_id,date:row.recorded_at});}}
a.legs.push(...perLeg.values());}
a.average=a.darts?3*a.points/a.darts:null;a.first9=a.first9Darts?3*a.first9Points/a.first9Darts:null;a.checkout=a.attempts?100*a.checkouts/a.attempts:null;a.finishes.sort((a,b)=>b.score-a.score);const wins=a.legs.filter(l=>l.won);a.best=wins.length?Math.min(...wins.map(l=>l.darts)):null;a.worst=wins.length?Math.max(...wins.map(l=>l.darts)):null;return a;}
const api={measure};if(typeof module!=='undefined')module.exports=api;root.SPLMetrics=api;
})(typeof window==='undefined'?globalThis:window);
