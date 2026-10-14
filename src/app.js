/* People Signals: the dashboard. Reads its data from src/data.js. No network requests. */

let Q=[],TEAMS=[],COMMENTS=[],HAS={},MODE='demo';
/* workload index, 0 to 100, higher is heavier: the average of whichever of these are available, each scaled to 0-100 and capped
   open roles (20% = 100), overtime (15 h = 100), leave not taken (40% = 100), pace (100 minus % who can sustain it).
   Exits are left out on purpose: they have their own flag and would count the same thing twice. */
function wIndex(t){
  const c=[100-last(t.pace)];
  if(t.vac!==null)c.push(Math.min(t.vac/20,1)*100);
  if(t.leave!==null)c.push(Math.min(t.leave/40,1)*100);
  if(t.ot!==null)c.push(Math.min(t.ot/15,1)*100);
  return c.reduce((a,b)=>a+b,0)/c.length;
}
const ITEMS=['Growth and career','Workload and pace','Manager support','Tools and process','Recognition','Pay fairness'];
const BUCKETS=['under 6 months','6 to 12 months','12 to 18 months','over 18 months'];
const THEMES=[
 ['Workload and pace',/weekend|pressure|load|heavy|deadline|travel/i],
 ['Manager and clarity',/manager|priorit|escalation|clear|stand|split/i],
 ['Growth and career',/path|senior|next role|move into|career|promot/i],
 ['Tools and handoffs',/tool|handoff|onboarding|slow|process|rules/i],
 ['Pay',/pay|commission|salary|recruiters/i]
];
const $=id=>document.getElementById(id);
let selected=null;
const mean=t=>t.rt?t.rt.reduce((s,v,i)=>s+v*(i+1),0)/100:NaN;
const exits=t=>t.exq.reduce((a,b)=>a+b,0);
/* regretted exits are people the team wanted to keep. They count `rw` times in the turnover and exit-cluster flags. */
const regN=t=>t.xr||0;
const bandW=(t,s)=>t.ex.map((v,i)=>t.exr?v-t.exr[i]+s.rw*t.exr[i]:v);
const lt3=v=>v>0&&v<3?'&lt;3':v;
const last=a=>a[a.length-1];
const STEADY_PULSE=3;
function state(){return{min:+$('minGroup').value,drop:+$('drop').value,skew:+$('skew').value,bench:+$('bench').value,
  delta:+$('delta').value,minResp:+$('minResp').value,mdrop:+$('mdrop').value,pay:+$('payT').value,hi:+$('payHi').value,wl:+$('wl').value,st:+$('stale').value,mm:+$('minMgr').value,eq:+$('eqpay').value,sp:+$('span').value,repl:+$('repl').value,rw:+$('rw').value}}
/* people who answered keep their score, people who did not are assumed `delta` points lower.
   the manager score is on a 5-point scale, so delta (out of 100) is scaled by 0.04 */
const adjP=(t,i,s)=>{const r=t.resp[i]/100,p=t.pulse[i];return r*p+(1-r)*(p-s.delta)};
const adjM=(t,i,s)=>{const r=t.mresp[i]/100,m=t.mgr[i];return r*m+(1-r)*(m-s.delta*0.04)};
/* eNPS runs from -100 to +100, twice the width of the favorability scale, so delta is doubled */
const adjE=(t,i,s)=>{const r=t.resp[i]/100,e=t.enps[i];return r*e+(1-r)*(e-2*s.delta)};
function pearson(x,y){const n=x.length;if(n<4)return null;const mx=x.reduce((a,b)=>a+b)/n,my=y.reduce((a,b)=>a+b)/n;
  let sxy=0,sxx=0,syy=0;for(let i=0;i<n;i++){sxy+=(x[i]-mx)*(y[i]-my);sxx+=(x[i]-mx)**2;syy+=(y[i]-my)**2}
  return sxx&&syy?sxy/Math.sqrt(sxx*syy):null}
const wavg=(rows,f)=>rows.reduce((a,r)=>a+f(r)*r.t.hc,0)/rows.reduce((a,r)=>a+r.t.hc,0);
function topTheme(team){
  const cs=COMMENTS.filter(c=>c[0]===team);if(!cs.length)return null;
  const o=THEMES.map(([n,re])=>({n,k:cs.filter(c=>re.test(c[1])).length})).sort((a,b)=>b.k-a.k);
  return o[0].k?o[0].n:null;
}
function payReading(t,s){
  if(t.compa<=s.pay) return 'At or below your pay line';
  if(t.compa>=s.hi&&t.below<=10) return 'At or above market';
  return 'Near market';
}
/* guards against small numbers */
const poisRange=n=>{if(n===0)return[0,3.69];const lo=n*Math.pow(1-1/(9*n)-1.96/(3*Math.sqrt(n)),3),m=n+1,hi=m*Math.pow(1-1/(9*m)+1.96/(3*Math.sqrt(m)),3);return[Math.max(0,lo),hi]};
const respN=(t,i)=>Math.max(1,Math.round(t.hc*t.resp[i]/100));
const respM=t=>Math.round(t.hc*last(t.mresp)/100);
/* margin of error on a favorability score, 80% confidence, with the finite-population correction since most of the team answered */
const moe=(t,i)=>{const n=respN(t,i),p=t.pulse[i]/100,fpc=t.hc>1?Math.sqrt(Math.max(0,(t.hc-n)/(t.hc-1))):0;return 1.28*Math.sqrt(p*(1-p)/n)*fpc*100};
const rCI=(r,n)=>{if(r===null||n<5)return null;const z=Math.atanh(Math.max(-.999,Math.min(.999,r))),se=1/Math.sqrt(n-3);return[Math.tanh(z-1.96*se),Math.tanh(z+1.96*se)]};
const sgn=v=>(v>0?'+':'')+v.toFixed(2);
function linkWord(r,n){
  if(r===null)return 'too few teams';
  const ci=rCI(r,n),rng=ci?` (95% range ${sgn(ci[0])} to ${sgn(ci[1])})`:'',zero=ci&&ci[0]<=0&&ci[1]>=0;
  return (zero?'cannot be told apart from no link':Math.abs(r)<0.3?'little link':Math.abs(r)<0.6?'some link':'a clear link '+(MODE==='demo'?'in this invented data':'in this data'))+rng;
}
const esc=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* What every flag means, in plain words. The legend and the pill tooltips both read from here. */
const SIGNALS=[
 ['Status',[
  ['Act','crit','Scores down together, pulse falling twice, or exits bunched. Talk now.'],
  ['Slipping','warn','One score moved, response falling, or pay or turnover flagged.'],
  ['Watch','watch','Two or more early signals, nothing else moved yet.'],
  ['Stable','ok','Nothing fired, or only one early signal.']]],
 ['Scores',[
  ['Pulse falling','crit','Pulse down two quarters in a row.'],
  ['Both down','crit','Manager score and pulse fell in the same quarter.'],
  ['Manager first','warn','Manager score fell, pulse has not yet.'],
  ['Pulse alone','warn','Pulse fell, manager score held.'],
  ['Going quiet','warn','Fewer people are answering the surveys.'],
  ['within margin','mute','Move is smaller than the margin of error.'],
  ['low response','mute','Response is below your line. Read with care.']]],
 ['Pay and ratings',[
  ['Pay and eNPS','warn','Pay at or below your line, and eNPS low or falling.'],
  ['Look beyond pay','warn','Pay is fine, yet eNPS is low or falling.'],
  ['Ratings high','warn','Average rating well above the company\'s.'],
  ['Ratings low','warn','Average rating well below the company\'s.']]],
 ['Exits',[
  ['Exit cluster','crit','Most exits at one tenure point.'],
  ['Turnover high','warn','Turnover above reference, even at the low end of the range.'],
  ['Too few exits to call','mute','Looks high, but too few exits to be sure. Not counted.']]],
 ['Early signals',[
  ['New manager','warn','Recent manager change, or manager new in role.'],
  ['Stalled promotions','warn','Top-rated people with no promotion or pay change for long.'],
  ['Heavy load','warn','High workload index: open roles, overtime, leave, pace.'],
  ['Wide span','warn','A manager has more reports than your line.']]],
 ['Other',[
  ['nothing flagged','ok','No flag fired. Not the same as nothing wrong.']]]
];
const SIG_TIP={};SIGNALS.forEach(g=>g[1].forEach(x=>SIG_TIP[x[0].toLowerCase()]=x[2]));
const TERMS=[
 ['Pulse','The share of answers that were favorable on a short survey about how the team is doing.'],
 ['Manager score','The average on a short survey about how well people feel supported by their manager, out of 5.'],
 ['eNPS','Employee net promoter score: the share who would recommend working here minus the share who would not. From -100 to 100.'],
 ['Adjusted','A score after allowing for people who did not answer, using the assumption in the settings.'],
 ['Compa-ratio','Average pay divided by the market midpoint for the role. 1.00 is at market, 0.90 is about 10% under.'],
 ['Regretted exit','Someone who left whom the team wanted to keep. It counts more than other exits.'],
 ['Plausible range','With few people, one exit moves a rate a lot. The range shows how far the true rate could be from the one shown.']
];
function buildLegend(){
  const box=$('legend');if(!box)return;
  box.innerHTML=`<p class="note">Colour: <span class="pill crit">red</span> can move a team to Act. <span class="pill warn">amber</span> is a warning. <span class="pill mute">grey</span> is information only. <span class="pill ok">green</span> means quiet. A flag is a prompt to ask a question, never a verdict.</p>`+
  `<div class="lgrid">`+SIGNALS.map(g=>`<div class="lg"><h4>${g[0]}</h4>`+g[1].map(x=>`<p><span class="pill ${x[1]}">${esc(x[0])}</span> ${esc(x[2])}</p>`).join('')+`</div>`).join('')+
  `<div class="lg"><h4>Terms</h4>`+TERMS.map(x=>`<p><strong>${esc(x[0])}.</strong> ${esc(x[1])}</p>`).join('')+`</div></div>`;
}
const RANK={stable:0,watch:1,slip:2,act:3};
const STATUS={stable:{label:'Stable',lvl:'ok',dot:'n0'},watch:{label:'Watch',lvl:'watch',dot:'n3'},slip:{label:'Slipping',lvl:'warn',dot:'n1'},act:{label:'Act',lvl:'crit',dot:'n2'}};
const stPill=r=>`<span class="pill ${STATUS[r.status].lvl}" title="${esc(SIG_TIP[STATUS[r.status].label.toLowerCase()]||'')}">${STATUS[r.status].label}</span>`;
function analyse(vis,s){
  const co=HAS.ratings?vis.reduce((a,t)=>a+mean(t)*t.hc,0)/vis.reduce((a,t)=>a+t.hc,0):NaN;
  const coE=vis.reduce((a,t)=>a+adjE(t,3,s)*t.hc,0)/vis.reduce((a,t)=>a+t.hc,0);
  return vis.map(t=>{
    const f=[],l=4;
    const A=t.pulse.map((_,i)=>adjP(t,i,s)), M=t.mgr.map((_,i)=>adjM(t,i,s)), E=t.enps.map((_,i)=>adjE(t,i,s));
    const note=s.delta>0?`, counting people who did not answer as ${s.delta} points less favorable`:'';
    if(A[l-3]>A[l-2]&&A[l-2]>A[l-1]&&A[l-3]-A[l-1]>=s.drop)
      f.push({k:'sent',tag:'Pulse falling',lvl:'crit',
        why:`Pulse favorability has fallen two quarters in a row (${A[l-3].toFixed(0)} to ${A[l-2].toFixed(0)} to ${A[l-1].toFixed(0)}${note}).`,
        ask:'Ask the manager what changed in the last two quarters, and read the comments before the next pulse.'});
    const mHide=respM(t)<s.mm;
    const dp=A[l-1]-A[l-2], dm=M[l-1]-M[l-2];
    const pDown=dp<=-STEADY_PULSE, pUp=dp>=STEADY_PULSE, mDown=!mHide&&dm<=-s.mdrop, mUp=!mHide&&dm>=s.mdrop;
    let pair={label:'Steady',lvl:'mute'};
    if(pDown&&mDown){pair={label:'Both down',lvl:'crit'};
      f.push({k:'pair',tag:'Both down',lvl:'crit',
        why:`Manager effectiveness fell from ${M[l-2].toFixed(1)} to ${M[l-1].toFixed(1)} and the pulse fell from ${A[l-2].toFixed(0)} to ${A[l-1].toFixed(0)} in the same quarter.`,
        ask:'Two scores moving together point to something in how the team is led or supported. Start with a conversation with the manager about what is changing and what support they need.'});}
    else if(mDown){pair={label:'Manager down first',lvl:'warn'};
      f.push({k:'pair',tag:'Manager first',lvl:'warn',
        why:`Manager effectiveness fell from ${M[l-2].toFixed(1)} to ${M[l-1].toFixed(1)}, while the pulse has not fallen yet (${A[l-2].toFixed(0)} to ${A[l-1].toFixed(0)}).`,
        ask:'This may be an early sign. Check in with the manager now, before the next pulse shows it.'});}
    else if(pDown){pair={label:'Pulse down alone',lvl:'warn'};
      f.push({k:'pair',tag:'Pulse alone',lvl:'warn',
        why:mHide?`The pulse fell from ${A[l-2].toFixed(0)} to ${A[l-1].toFixed(0)}. The manager score is hidden because only ${respM(t)} people answered it.`:`The pulse fell from ${A[l-2].toFixed(0)} to ${A[l-1].toFixed(0)} while the manager score held (${M[l-2].toFixed(1)} to ${M[l-1].toFixed(1)}).`,
        ask:'The cause may sit outside the manager relationship: workload, tools, strategy or pay. Read the comments for themes.'});}
    else if(pUp&&mUp) pair={label:'Both up',lvl:'ok'};
    if(mHide&&!pDown) pair={label:'Manager hidden',lvl:'mute'};
    const rr=t.resp,mr=t.mresp,lowR=Math.min(last(rr),last(mr))<s.minResp;
    const fall=Math.max(rr[l-3]-rr[l-1],mr[l-3]-mr[l-1]);
    if(fall>=15||lowR)
      f.push({k:'quiet',tag:'Going quiet',lvl:'warn',
        why:fall>=15?`Response fell by ${fall.toFixed(0)} points over three quarters, to ${last(rr)}% on the pulse and ${last(mr)}% on the manager survey.`:`Only ${Math.min(last(rr),last(mr))}% of the team answered the last surveys.`,
        ask:'Silence is information too. Ask whether people feel it is safe to answer, and check who is missing by tenure and location.'});
    const lowE=last(E)<=coE||E[1]-E[3]>=10;
    if(HAS.pay&&t.compa<=s.pay&&lowE)
      f.push({k:'pay',tag:'Pay and eNPS',lvl:'warn',
        why:`Average compa-ratio is ${t.compa.toFixed(2)} (${t.below}% of the team below 0.90) and eNPS is ${(last(E)>0?'+':'')+last(E).toFixed(0)}, against ${(coE>0?'+':'')+coE.toFixed(0)} across the company.`,
        ask:'Raise it with Total Rewards. Check the level, location and tenure mix first, since a low compa-ratio can reflect a recent promotion round or a newer market, not underpayment. Read the comments before assuming pay is the driver.'});
    const gap=mean(t)-co;
    if(HAS.ratings&&Math.abs(gap)>=s.skew){
      let hyp='It may be a strong team or a lenient (or harsh) manager. The data cannot say which.';
      if(mHide){}
      else if(gap>0&&last(M)<3.8) hyp='High ratings next to a low manager score can mean ratings are being softened to avoid hard conversations. Check the calibration notes.';
      else if(gap>0&&last(M)>=4.2) hyp='The team rates its manager well, which fits a strong team. Still check the evidence behind the ratings.';
      else if(gap<0&&last(M)>=4.0) hyp='The team rates its manager well but receives low ratings. Check whether the bar is applied evenly, or whether performance really is lower.';
      f.push({k:'skew',tag:gap>0?'Ratings high':'Ratings low',lvl:'warn',
        why:`Average rating is ${mean(t).toFixed(1)} against ${co.toFixed(1)} across the company${mHide?'.':`, and the manager score is ${last(M).toFixed(1)}.`}`,
        ask:'Bring it to calibration. '+hyp});}
    const n=exits(t),nR=regN(t),nO=n-nR,wOn=HAS.regretted&&s.rw!==1;
    const bw=bandW(t,s),sw=bw.reduce((a,b)=>a+b,0),mw=Math.max(...bw);
    if(n>=3&&sw>0&&mw/sw>=0.6){const b=bw.indexOf(mw);
      f.push({k:'cliff',tag:'Exit cluster',lvl:'crit',
        why:`${t.ex[b]} of ${n} exits happened at ${BUCKETS[b]} of tenure${t.exr&&t.exr[b]?`, ${t.exr[b]} of them regretted`:''}.${t.exr&&wOn?` Regretted exits count ${s.rw} times when finding the cluster.`:''}`,
        ask:'Look at what happens around that point: what onboarding promised, the first review, promotion expectations.'});}
    /* turnover: regretted exits count rw times. The range is an approximation, so a flag needs the whole range above the reference. */
    const wn=HAS.regretted?nO+s.rw*nR:n,raw=n/t.hc*100;
    const rate=wn/t.hc*100;
    let rlo,rhi;
    if(HAS.regretted&&wn>0){/* a scaled Poisson count with the same mean and variance as the weighted count */
      const vr=nO+s.rw*s.rw*nR,c=vr/wn,pr=poisRange(wn/c);rlo=c*pr[0]/t.hc*100;rhi=c*pr[1]/t.hc*100}
    else if(HAS.regretted){const pr=poisRange(0);rlo=pr[0]/t.hc*100;rhi=pr[1]/t.hc*100}
    else{const pr=poisRange(n);rlo=pr[0]/t.hc*100;rhi=pr[1]/t.hc*100}
    const exWhy=`${n} exits over 12 months${HAS.regretted?` (${nR} regretted)`:''} equal ${raw.toFixed(0)}% of current headcount${wOn?`. Counting each regretted exit ${s.rw} times, that is ${rate.toFixed(0)}%`:''}`;
    if(rlo>s.bench)
      f.push({k:'turn',tag:'Turnover high',lvl:'warn',
        why:`${exWhy} (a plausible range of ${rlo.toFixed(0)}% to ${rhi.toFixed(0)}%), and even the low end is above the ${s.bench}% reference.`,
        ask:'Read it together with the other signals before acting.'+(nR?' Start with the people the team wanted to keep: when they left and what they said.':'')});
    else if(rate>s.bench+5)
      f.push({k:'fewexits',tag:'Too few exits to call',lvl:'mute',
        why:`${exWhy}, but with so few exits the plausible range is ${rlo.toFixed(0)}% to ${rhi.toFixed(0)}%, which includes the ${s.bench}% reference.`,
        ask:'Not enough to call turnover high. Look at when and why these people left, and who they were.'});
    const W=wIndex(t);
    if((t.mc!==null&&t.mc>=30)||(t.mnew!==null&&t.mnew<3))
      f.push({k:'mgrchg',tag:'New manager',lvl:'warn',
        why:(t.mnew!==null&&t.mnew<3)?`The manager has been in role ${t.mnew} months${t.mc!==null?`, and ${t.mc}% of the team had a manager change in the last six months`:''}.`:`${t.mc}% of the team had a manager change in the last six months.`,
        ask:'Read this next to the manager score. A new manager is not bad in itself. Check that the handover was clear and that the team has had a first real conversation with the new manager.'});
    if(t.stale!==null&&t.stale>=s.st)
      f.push({k:'promo',tag:'Stalled promotions',lvl:'warn',
        why:`${t.stale}% of top-rated people have had no promotion or pay change in 18 months or more.`,
        ask:'Look at the promotion timing for this team against its level norms, and ask whether the strongest people know what their next step is.'});
    if(W>=s.wl)
      f.push({k:'load',tag:'Heavy load',lvl:'warn',
        why:`The workload index is ${W.toFixed(0)} of 100: ${[t.vac!==null?`${t.vac}% of roles open`:null,t.leave!==null?`${t.leave}% of expected leave not taken`:null,`${last(t.pace)}% say they can sustain their pace`].filter(Boolean).join(', ')}.`,
        ask:'Ask what is driving the load: open roles, a release or deployment crunch, or work that has not been re-planned after exits.'});
    const has=ks=>f.some(x=>ks.includes(x.k));
    const wide=t.spans&&t.spans.length?Math.max(...t.spans):0;
    if(wide>=s.sp)
      f.push({k:'span',tag:'Wide span',lvl:'warn',
        why:`One manager in this team has ${wide} direct reports, against your line of ${s.sp}.`,
        ask:'Ask whether that manager has a deputy or team lead, and how much of their time is spent managing and how much doing the work.'});
    const LEADK=['mgrchg','promo','load','span'];
    const leadN=f.filter(x=>LEADK.includes(x.k)).length;
    const leadTags=f.filter(x=>LEADK.includes(x.k)).map(x=>x.tag.toLowerCase());
    if(HAS.pay&&t.compa>=s.hi&&t.below<=10&&lowE){
      const o=[];
      if(f.some(x=>x.k==='pair')) o.push(`the manager score (${M[l-2].toFixed(1)} to ${M[l-1].toFixed(1)})`);
      if(f.some(x=>x.k==='quiet')) o.push('falling response');
      if(f.some(x=>x.k==='cliff')) o.push('the exit timing');
      if(f.some(x=>x.k==='load')) o.push('workload');
      if(f.some(x=>x.k==='promo')) o.push('stalled promotions');
      if(f.some(x=>x.k==='mgrchg')) o.push('the recent manager change');
      if(f.some(x=>x.k==='span')) o.push('a manager with a very wide span');
      const th=topTheme(t.n); if(th) o.push(`what people write about ${th.toLowerCase()}`);
      f.push({k:'beyond',tag:'Look beyond pay',lvl:'warn',
        why:`eNPS is ${fmtE(last(E))} (it was ${fmtE(E[1])} two quarters ago), while average compa-ratio is ${t.compa.toFixed(2)} and only ${t.below}% of the team is under 0.90. Pay is an unlikely main driver.`,
        ask:'Start with '+(o.length?o.join(', '):'the comments and a conversation with the manager')+'. Also consider workload, growth and how the team is being led.'});}
    /* one status per team. The early signals only decide the status when nothing else has fired. */
    let status='stable';
    if((pair.label==='Both down')||has(['sent','cliff'])) status='act';
    else if(has(['pair','quiet','pay','turn','beyond'])) status='slip';
    else if(leadN>=2) status='watch';
    const sentF=f.some(x=>x.k==='sent'),raw1=t.pulse[l-1]-t.pulse[l-2],raw2=t.pulse[l-3]-t.pulse[l-1];
    const me1=Math.sqrt(moe(t,l-1)**2+moe(t,l-2)**2),me2=Math.sqrt(moe(t,l-1)**2+moe(t,l-3)**2);
    const solid=(pDown&&-raw1>=me1)||(sentF&&raw2>=me2)||mDown||has(['cliff']);
    const noisy=(pDown||sentF)&&!solid;
    return {t,f,rate,raw,rlo,rhi,co,A,M,E,coE,pair,lowR,lowE,W,leadN,leadTags,status,mHide,noisy,me1};
  }).sort((a,b)=>RANK[b.status]-RANK[a.status]||b.leadN-a.leadN||b.f.filter(x=>x.lvl==='crit').length-a.f.filter(x=>x.lvl==='crit').length||b.f.length-a.f.length);
}
/* small charts */
function spark(v,lo,hi,cls){
  const w=76,h=24,x=i=>3+i*(w-6)/(v.length-1),y=z=>h-3-(z-lo)/(hi-lo)*(h-6);
  return `<svg class="chart" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${v.map(z=>z.toFixed(1)).join(', ')}"><polyline class="ln ${cls}" points="${v.map((z,i)=>x(i).toFixed(1)+','+y(z).toFixed(1)).join(' ')}"/><circle class="pt ${cls}" cx="${x(v.length-1).toFixed(1)}" cy="${y(last(v)).toFixed(1)}" r="2.5"/></svg>`;
}
function lineChart(raw,adj,lo,hi,cls,fmt){
  const W=300,H=96,L=8,R=44,T=10,B=18;
  const x=i=>L+i*(W-L-R)/3, y=z=>T+(1-(z-lo)/(hi-lo))*(H-T-B);
  const path=a=>a.map((z,i)=>x(i).toFixed(1)+','+y(z).toFixed(1)).join(' ');
  let g=`<line class="ax" x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}"/>`;
  Q.forEach((q,i)=>g+=`<text class="q" x="${x(i)}" y="${H-5}" text-anchor="middle">${q}</text>`);
  g+=`<polyline class="raw" points="${path(raw)}"/><polyline class="ln ${cls}" points="${path(adj)}"/>`;
  adj.forEach((z,i)=>g+=`<circle class="pt ${cls}" cx="${x(i)}" cy="${y(z)}" r="${i===3?3.4:2.2}"/>`);
  g+=`<text class="val" x="${x(3)+8}" y="${y(adj[3])+3}">${fmt(adj[3])}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Four quarters: ${adj.map(fmt).join(', ')}">${g}</svg>`;
}
const fmtE=v=>(v>0?'+':'')+v.toFixed(0);
/* filter, search and sort for the Teams table */
let FILTER='all',QUERY='',SORT={k:null,dir:1},LASTRES=null,LASTS=null;
const SORTS={team:r=>r.t.n.toLowerCase(),hc:r=>r.t.hc,exits:r=>exits(r.t),pulse:r=>last(r.A),enps:r=>last(r.E),mgr:r=>r.mHide?-1:last(r.M),compa:r=>HAS.pay?r.t.compa:-1,resp:r=>last(r.t.resp),status:r=>RANK[r.status],signals:r=>r.f.length};
const SORTOPTS=[['','Default order (status first)'],['team|1','Team, A to Z'],['pulse|1','Pulse, lowest first'],['enps|1','eNPS, lowest first'],['exits|-1','Exits, most first'],['resp|1','Response, lowest first'],['signals|-1','Most signals first']];
function viewRows(res){
  let v=res.filter(r=>(FILTER==='all'||r.status===FILTER)&&(!QUERY||r.t.n.toLowerCase().includes(QUERY)));
  if(SORT.k){const f=SORTS[SORT.k];v=v.slice().sort((a,b)=>{const x=f(a),y=f(b);return (x<y?-1:x>y?1:0)*SORT.dir})}
  return v;
}
function drawChips(res){
  const defs=[['all','All'],['act','Act'],['slip','Slipping'],['watch','Watch'],['stable','Stable']];
  $('fchips').innerHTML=defs.map(([k,l])=>{const n=k==='all'?res.length:res.filter(r=>r.status===k).length;return `<button type="button" class="fchip${FILTER===k?' on':''}" data-f="${k}" aria-pressed="${FILTER===k}">${l} <span>${n}</span></button>`}).join('');
  document.querySelectorAll('#fchips .fchip').forEach(b=>b.onclick=()=>{FILTER=b.dataset.f;render()});
}
function drawRows(res,s){
  const view=viewRows(res);
  $('rows').innerHTML=view.length?view.map(r=>rowHtml(r,s)).join(''):`<tr><td colspan="11">No teams match this filter or search.</td></tr>`;
  document.querySelectorAll('.teambtn').forEach(b=>b.onclick=()=>{selected=b.dataset.t;render()});
  document.querySelectorAll('.sortbtn').forEach(b=>{const th=b.parentNode;th.setAttribute('aria-sort',SORT.k===b.dataset.k?(SORT.dir===1?'ascending':'descending'):'none');b.onclick=()=>{
    if(SORT.k!==b.dataset.k)SORT={k:b.dataset.k,dir:b.dataset.k==='status'||b.dataset.k==='signals'||b.dataset.k==='exits'||b.dataset.k==='hc'?-1:1};
    else if(SORT.dir===1&&!(b.dataset.k==='status'||b.dataset.k==='signals'||b.dataset.k==='exits'||b.dataset.k==='hc'))SORT.dir=-1;
    else if(SORT.dir===-1&&(b.dataset.k==='status'||b.dataset.k==='signals'||b.dataset.k==='exits'||b.dataset.k==='hc'))SORT.dir=1;
    else SORT={k:null,dir:1};
    syncSortSel();render()}});
  labelTables();
}
function syncSortSel(){const v=SORT.k?SORT.k+'|'+SORT.dir:'',el=$('sortSel');if(el)el.value=SORTOPTS.some(o=>o[0]===v)?v:''}
function labelTables(){document.querySelectorAll('.tablewrap table').forEach(tb=>{
  const hs=[].map.call(tb.querySelectorAll('thead th'),x=>x.textContent.replace(/\s+/g,' ').trim());
  tb.querySelectorAll('tbody tr').forEach(tr=>{let i=0;[].forEach.call(tr.children,td=>{td.setAttribute('data-label',td.colSpan>1?'':(hs[i]||''));i+=td.colSpan||1;
    if(td.childNodes.length>1&&!(td.firstElementChild&&td.firstElementChild.className==='cv')){const w=document.createElement('span');w.className='cv';while(td.firstChild)w.appendChild(td.firstChild);td.appendChild(w)}})})})}
function pills(r){
  if(!r.f.length) return '<span class="pill ok" title="'+esc(SIG_TIP['nothing flagged'])+'">nothing flagged</span>'+(r.lowR?'<span class="pill mute" title="'+esc(SIG_TIP['low response'])+'">low response</span>':'');
  return r.f.map(x=>`<span class="pill ${x.lvl}" title="${esc(SIG_TIP[x.tag.toLowerCase()]||'')}">${x.tag}</span>`).join('')+(r.noisy?`<span class="pill mute" title="The pulse move is smaller than the survey's margin of error">within margin</span>`:'');
}
function delta(v,unit,dec,goodUp,warnInstead){
  if(Math.abs(v)<Math.pow(10,-dec)/2) return `<span class="d flat">no change</span>`;
  const up=v>0,good=goodUp?up:!up;
  return `<span class="d ${good?'good':(warnInstead?'warnc':'bad')}">${up?'▲':'▼'} ${Math.abs(v).toFixed(dec)}${unit} vs last quarter</span>`;
}
function rowHtml(r,s){return `<tr class="${r.t.n===selected?'sel':''}">
    <td><button class="teambtn" data-t="${esc(r.t.n)}" aria-pressed="${r.t.n===selected}">${esc(r.t.n)}</button></td>
    <td class="num">${r.t.hc}</td>
    <td class="num">${exits(r.t)}${HAS.regretted?` <span class="note">(${regN(r.t)})</span>`:''}</td>
    <td>${spark(r.A,40,90,'p')}</td>
    <td class="num">${fmtE(last(r.E))} <span class="note">${r.E[3]-r.E[2]<0?'▼':r.E[3]-r.E[2]>0?'▲':'■'}</span></td>
    <td>${r.mHide?`<span class="note">hidden, ${respM(r.t)} answered</span>`:spark(r.M,3.0,4.6,'m')}</td>
    <td class="num" style="${HAS.pay&&r.t.compa<=s.pay?'color:var(--warn)':''}">${HAS.pay?r.t.compa.toFixed(2):'–'}</td>
    <td class="num">${last(r.t.resp)}% / ${last(r.t.mresp)}%</td>
    <td>${stPill(r)}</td>
    <td><span class="pill ${r.pair.lvl}">${r.pair.label}</span></td>
    <td>${pills(r)}</td></tr>`}
function render(){
  const s=state();
  [['pay','pay'],['equity','eq'],['drivers','items'],['cost','cost'],['structure','spans'],['early','lead']].forEach(([id,k])=>{$(id).style.display=HAS[k]?'':'none'});
  $('o_min').textContent=s.min;$('o_drop').textContent=s.drop+' pts';$('o_skew').textContent='±'+s.skew.toFixed(2);
  $('o_delta').textContent=s.delta+' pts';$('o_resp').textContent=s.minResp+'%';$('o_mdrop').textContent='±'+s.mdrop.toFixed(1);$('o_pay').textContent=s.pay.toFixed(2);$('o_hi').textContent=s.hi.toFixed(2);$('o_wl').textContent=s.wl;$('o_st').textContent=s.st+'%';$('o_mm').textContent=s.mm;$('o_eq').textContent=s.eq+'%';$('o_sp').textContent=s.sp;$('o_repl').textContent=s.repl+'% of a year\'s pay';$('o_rw').textContent=s.rw+'×';$('rw').disabled=!HAS.regretted;
  const vis=TEAMS.filter(t=>t.hc>=s.min), hid=TEAMS.length-vis.length;
  const res=analyse(vis,s);
  if(!selected||!res.some(r=>r.t.n===selected)) selected=res.length?res[0].t.n:null;
  stats(res,s);
  LASTRES=res;LASTS=s;drawChips(res);drawRows(res,s);
  $('hiddenNote').textContent=(hid?`${hid} ${hid>1?'teams are':'team is'} hidden because ${hid>1?'they are':'it is'} under the minimum group size of ${s.min}. They are left out of every flag, the company figures and the charts. `:'No teams are hidden at this setting. ')+'Answered shows the pulse and the manager survey. eNPS is adjusted like the pulse. Compa is the average pay of the team against the market midpoint, amber at or below your pay line. Moves smaller than 3 pulse points are treated as steady.';
  document.querySelectorAll('.teambtn').forEach(b=>b.onclick=()=>{selected=b.dataset.t;render()});
  brief(res);map(res);early(res,s);backtest(vis,s);detail(res,s);actions(res,s);equity(vis,s);drivers(res,s);cost(res,s);structure(res,s);leadlag(vis,s);payview(res,s);fromDataPanel(vis,s);markChanged();labelTables();
}
function stats(res,s){
  if(!res.length){$('stats').innerHTML='<div class="stat"><span class="l">No teams visible at this minimum group size.</span></div>';return}
  const cp=i=>wavg(res,r=>r.A[i]),cm=i=>wavg(res.filter(r=>!r.mHide),r=>r.M[i]);
  const rp=i=>wavg(res,r=>r.t.resp[i]),rm=i=>wavg(res,r=>r.t.mresp[i]);
  const cnt=k=>res.filter(r=>r.status===k).length;
  const nx=res.reduce((a,r)=>a+exits(r.t),0),rx=res.reduce((a,r)=>a+regN(r.t),0);
  $('stats').innerHTML=`
   <div class="stat"><span class="l">Act / Slipping / Watch</span><span class="v">${cnt('act')} / ${cnt('slip')} / ${cnt('watch')} <span class="note">of ${res.length}</span></span><span class="d flat">${cnt('stable')} stable</span></div>
   <div class="stat"><span class="l">Company pulse, adjusted</span><span class="v">${cp(3).toFixed(0)}%</span>${delta(cp(3)-cp(2),' pts',1,true)}</div>
   <div class="stat"><span class="l">Company manager score, adjusted</span><span class="v">${cm(3).toFixed(2)} <span class="note">of 5</span></span>${delta(cm(3)-cm(2),'',2,true)}</div>
   <div class="stat"><span class="l">Exits, last 12 months</span><span class="v">${nx}</span><span class="d flat">${HAS.regretted?`${rx} regretted (${nx?(rx/nx*100).toFixed(0):0}%), ${nx-rx} other`:'regretted exits not provided'}</span></div>
   ${HAS.pay?`<div class="stat"><span class="l">Average compa-ratio</span><span class="v">${wavg(res,r=>r.t.compa).toFixed(2)}</span><span class="d flat">${wavg(res,r=>r.t.below).toFixed(0)}% of people below 0.90</span></div>`:`<div class="stat"><span class="l">Pay data</span><span class="v">–</span><span class="d flat">not provided</span></div>`}
   <div class="stat"><span class="l">Answered, pulse / manager</span><span class="v">${rp(3).toFixed(0)}% / ${rm(3).toFixed(0)}%</span>${delta(rp(3)-rp(2),' pts',1,true,true)}</div>`;
}
function brief(res){
  const top=res.filter(r=>r.f.length).slice(0,3);
  if(!top.length) $('brief').innerHTML='<p>Nothing is flagged at these settings. That does not mean nothing is wrong. It means these signals are quiet.</p>';
  else $('brief').innerHTML=top.map(r=>{const crit=r.status==='act';
    return `<div class="bcard ${crit?'crit':'warn'}"><h3>${esc(r.t.n)}</h3>${r.status==='watch'?`<p><strong>Watch.</strong> Nothing has dropped yet, but ${r.leadN} early signals line up (${r.leadTags.join(', ')}).</p>`:r.f.length>=3?'<p><strong>Several signals point the same way.</strong> Start with the conversation, not the numbers.</p>':''}${r.f.slice(0,3).map(x=>`<p>${x.why}</p>`).join('')}${r.noisy?`<p class="note">The pulse move is smaller than the survey's margin of error (about ±${r.me1.toFixed(0)} points), so read it with the comments before acting.</p>`:''}<p class="ask">${r.f[0].ask}</p></div>`}).join('');
  $('briefNote').textContent='What this cannot tell you: why people are leaving, who stayed silent, whether the people who left are the ones you wanted to keep, or whether a low manager score is the cause or the effect. Use it to decide where to have a conversation.';
}
function map(all){
  const hiddenM=all.filter(r=>r.mHide).length,res=all.filter(r=>!r.mHide);
  if(!res.length){$('map').innerHTML='';return}
  const W=420,H=330,L=36,B=30,T=14,R=12,xl=3.0,xh=4.7,yl=40,yh=90;
  const X=v=>L+(v-xl)/(xh-xl)*(W-L-R), Y=v=>H-B-(v-yl)/(yh-yl)*(H-B-T);
  const mx=wavg(res,r=>r.M[3]),my=wavg(res,r=>r.A[3]);
  let g=`<line class="ax" x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}"/><line class="ax" x1="${L}" y1="${T}" x2="${L}" y2="${H-B}"/>`;
  [3.0,3.5,4.0,4.5].forEach(v=>g+=`<text x="${X(v)}" y="${H-B+12}" text-anchor="middle">${v.toFixed(1)}</text>`);
  [40,60,80].forEach(v=>g+=`<text x="${L-5}" y="${Y(v)+3}" text-anchor="end">${v}</text>`);
  g+=`<line class="mean" x1="${X(mx)}" y1="${T}" x2="${X(mx)}" y2="${H-B}"/><line class="mean" x1="${L}" y1="${Y(my)}" x2="${W-R}" y2="${Y(my)}"/>`;
  g+=`<text class="q" x="${W-R-3}" y="${T+9}" text-anchor="end">strong manager, engaged team</text>`;
  g+=`<text class="q" x="${L+4}" y="${T+9}">team holding up despite manager</text>`;
  g+=`<text class="q" x="${W-R-3}" y="${H-B-5}" text-anchor="end">strong manager, strained team</text>`;
  g+=`<text class="q" x="${L+4}" y="${H-B-5}">both low</text>`;
  g+=`<text x="${(L+W-R)/2}" y="${H-3}" text-anchor="middle">manager effectiveness, this quarter (of 5)</text>`;
  g+=`<text transform="translate(9 ${(T+H-B)/2}) rotate(-90)" text-anchor="middle">pulse, adjusted</text>`;
  const sel=res.find(r=>r.t.n===selected);
  if(sel) g+=`<polyline class="trail" points="${sel.M.map((m,i)=>X(m).toFixed(1)+','+Y(sel.A[i]).toFixed(1)).join(' ')}"/>`+
    sel.M.map((m,i)=>i<3?`<circle cx="${X(m)}" cy="${Y(sel.A[i])}" r="2" style="fill:var(--fg)"/><text class="pt2" x="${X(m)+4}" y="${Y(sel.A[i])-4}">${Q[i]}</text>`:'').join('');
  res.forEach(r=>{const ab=esc(r.t.n.split(' ').filter(w=>w!=='and').map(w=>w[0]).join('').slice(0,2));
    const cls=STATUS[r.status].dot,rad=3+Math.sqrt(r.t.hc)/1.6;
    g+=`<circle class="dot ${cls} ${r.t.n===selected?'sel':''}" cx="${X(r.M[3])}" cy="${Y(r.A[3])}" r="${rad}"><title>${esc(r.t.n)}</title></circle><text class="pt2" x="${X(r.M[3])+rad+2}" y="${Y(r.A[3])+3}">${ab}</text>`});
  $('map').innerHTML=`<h3>Where each team sits <span>Pair map, this quarter</span></h3><p class="help">Each dot is a team. Across is the manager score and up is the pulse, so the lower left is where both are low. Dashed lines are the company averages.</p>
   <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Manager effectiveness against pulse for each team, with dashed lines at the company averages">${g}</svg>
   <div class="legend"><span>Dot size is headcount.</span><span>Dashed lines are the company averages.</span><span>Color is the status: <b style="color:var(--accent)">Stable</b>, <b style="color:var(--c3)">Watch</b>, <b style="color:var(--warn)">Slipping</b>, <b style="color:var(--crit)">Act</b>.</span><span>The dotted trail is the selected team over four quarters.</span>${hiddenM?`<span>${hiddenM} team${hiddenM>1?'s are':' is'} left off because too few people answered the manager survey.</span>`:''}</div>`;
}
function detail(res,s){
  const r=res.find(x=>x.t.n===selected);
  if(!r){['trend','silence','facts','themes'].forEach(i=>$(i).innerHTML='');return}
  const t=r.t;
  $('detailTitle').textContent='Team detail: '+t.n;
  /* trend */
  $('trend').innerHTML=`<h3>Pulse and manager, by quarter</h3>
   <div class="eyebrow">Pulse, % favorable</div>${lineChart(t.pulse,r.A,40,90,'p',v=>v.toFixed(0))}
   <div class="eyebrow">Manager effectiveness, of 5</div>${r.mHide?`<p class="note">Hidden. Only ${respM(t)} people answered the manager survey, below your minimum of ${s.mm}.</p>`:lineChart(t.mgr,r.M,3.0,4.6,'m',v=>v.toFixed(2))}
   <div class="eyebrow">eNPS</div>${lineChart(t.enps,r.E,-30,60,'e',fmtE)}
   <div class="legend"><span><i class="p"></i>Pulse</span><span><i class="m"></i>Manager</span><span><i class="e"></i>eNPS</span><span>All adjusted. Dashed: as answered</span></div>`;
  /* silence */
  const rr=last(t.resp)/100,p=last(t.pulse),lo=p*rr,hi=p*rr+(1-rr)*100,ad=r.A[3];
  const mr=last(t.mresp)/100,m=last(t.mgr),mlo=m*mr+(1-mr)*1,mhi=m*mr+(1-mr)*5,mad=r.M[3];
  const pos=v=>Math.max(0,Math.min(100,v)),pm=v=>pos((v-1)/4*100);
  const bars=t.resp.map((v,i)=>`<div class="${Math.min(v,t.mresp[i])<s.minResp?'low':''}"><span>${v}%</span><i style="height:${v*0.4}px"></i></div>`).join('');
  const range=(a,b,c,d,labA,labB,labC,fn)=>`<div class="rangebar" aria-hidden="true"><div class="span" style="left:${fn(a)}%;width:${fn(b)-fn(a)}%"></div><div class="mk" style="left:${fn(c)}%"></div><div class="mk adj" style="left:${fn(d)}%"></div>
     <span class="lab top" style="left:${fn(c)}%">answered ${labC}</span><span class="lab" style="left:${Math.max(fn(a),8)}%">${labA}</span><span class="lab" style="left:${Math.min(fn(b),95)}%">${labB}</span></div>`;
  $('silence').innerHTML=`<h3>Who is not answering</h3>
   <div class="respbars" aria-label="Pulse response rate over four quarters">${bars}</div>
   <p class="note">Pulse response, last four quarters. Amber means either survey fell below your low-response line.</p>
   <p>Pulse: <strong>${p}% favorable</strong> among the ${Math.round(t.hc*rr)} of ${t.hc} who answered.</p>
   ${range(lo,hi,p,ad,lo.toFixed(0),hi.toFixed(0),p,pos)}
   ${r.mHide?`<p>Manager: hidden. ${respM(t)} of ${t.hc} answered, below your minimum of ${s.mm}.</p>`:`<p>Manager: <strong>${m.toFixed(1)} of 5</strong> among the ${Math.round(t.hc*mr)} of ${t.hc} who answered.</p>
   ${range(mlo,mhi,m,mad,mlo.toFixed(1),mhi.toFixed(1),m.toFixed(1),pm)}`}
   <p class="note">The shaded range runs from every silent person being at the bottom of the scale to every one at the top. The amber mark is your assumption (pulse ${ad.toFixed(0)}, manager ${mad.toFixed(2)}). The lower the response, the wider the range.</p>`;
  /* facts */
  const n=exits(t),bw=bandW(t,s),sw=bw.reduce((a,c)=>a+c,0),mw=Math.max(...bw),b=bw.indexOf(mw);
  $('facts').innerHTML=`<h3>Other facts for this team</h3><div class="facts">
   <span>People<b>${t.hc}</b></span>
   <span>Pulse margin of error<b>±${moe(t,3).toFixed(0)} points (${respN(t,3)} of ${t.hc} answered, 80% confidence)</b></span>
   <span>Average rating<b>${HAS.ratings?`${mean(t).toFixed(1)} (company ${r.co.toFixed(1)})`:'not provided'}</b></span>
   <span>eNPS, last quarter<b>${fmtE(r.E[3])} adjusted, ${fmtE(last(t.enps))} as answered (company ${fmtE(r.coE)})</b></span>
   <span>Compa-ratio<b>${HAS.pay?`${t.compa.toFixed(2)} (${t.below}% below 0.90)`:'not provided'}</b></span>
   <span>Pay reading<b>${HAS.pay?payReading(t,s):'not provided'}</b></span>
   <span>Manager change, 6 months<b>${t.mc===null?'n/a':t.mc+'% of team'}${t.mnew===null?'':', manager '+t.mnew+' months in role'}</b></span>
   <span>Stalled promotions<b>${t.stale===null?'n/a':t.stale+'% of top-rated'}</b></span>
   <span>Workload index<b>${r.W.toFixed(0)} of 100${t.ot===null?' (overtime not tracked)':''}</b></span>
   <span>Exits, last 12 months<b>${n}${HAS.regretted?`, of which ${regN(t)} regretted`:''} (${r.raw.toFixed(0)}% of headcount${HAS.regretted&&s.rw!==1?`, ${r.rate.toFixed(0)}% counting regretted exits ${s.rw} times`:''}; plausible range ${r.rlo.toFixed(0)}% to ${r.rhi.toFixed(0)}%)</b></span>
   <span>Exit timing<b>${n>=3&&sw>0&&mw/sw>=0.6?`${t.ex[b]} of ${n} at ${BUCKETS[b]}`:n?'no single cluster':'no exits'}</b></span>
   <span>Reference turnover<b>${s.bench}% a year</b></span></div>
   ${HAS.tenure?`<h3 style="margin-top:6px">Exits by tenure</h3><table class="mini"><thead><tr><th>Tenure</th><th class="num">Exits</th>${t.exr?'<th class="num">Regretted</th><th class="num">Share</th>':''}</tr></thead><tbody>${t.ex.map((v,i)=>`<tr><td>${BUCKETS[i]}</td><td class="num">${lt3(v)}</td>${t.exr?`<td class="num">${lt3(t.exr[i])}</td><td class="num">${v>=3&&(t.exr[i]===0||t.exr[i]>=3)?Math.round(t.exr[i]/v*100)+'%':'–'}</td>`:''}</tr>`).join('')}</tbody></table>`:''}
   <p class="note">Exit and rating figures sit beside the survey scores because a signal rarely means much alone. Counts under 3 in a tenure split are shown as &lt;3, so a small cell cannot point to a person.</p>`;
  themes();
}
function themes(){
  $('themeTitle').textContent=selected?`Comment themes: ${selected}`:'Comment themes';
  const cs=COMMENTS.filter(c=>c[0]===selected);
  if(!cs.length){$('themes').innerHTML='<p class="note">No comments in this sample for the selected team.</p>';return}
  const out=THEMES.map(([name,re])=>({name,hits:cs.filter(c=>re.test(c[1]))})).filter(x=>x.hits.length).sort((a,b)=>b.hits.length-a.hits.length);
  $('themes').innerHTML=out.map(x=>`<div class="theme"><div class="row"><span>${x.name}</span><span>${x.hits.length} of ${cs.length}</span></div>
    <div class="bar"><i style="width:${x.hits.length/cs.length*100}%"></i></div><q>${esc(x.hits[0][1])}</q></div>`).join('')+`<p class="note">${cs.length} sample comments.</p>`;
}
function leadlag(vis,s){
  const same=[[],[]],lead=[[],[]];
  vis.filter(t=>respM(t)>=s.mm).forEach(t=>{
    const A=t.pulse.map((_,i)=>adjP(t,i,s)),M=t.mgr.map((_,i)=>adjM(t,i,s));
    for(let q=0;q<3;q++){same[0].push(M[q+1]-M[q]);same[1].push(A[q+1]-A[q])}
    for(let q=0;q<2;q++){lead[0].push(M[q+1]-M[q]);lead[1].push(A[q+2]-A[q+1])}
  });
  const rs=pearson(same[0],same[1]),rl=pearson(lead[0],lead[1]);
  const word=(r,n)=>linkWord(r,n);
  const f=v=>v===null?'n/a':(v>0?'+':'')+v.toFixed(2);
  const meter=v=>v===null?'':`<div class="meter"><u></u><i style="left:calc(${(v+1)/2*100}% - 1px)"></i></div>`;
  $('lead').innerHTML=`<h3>Does the manager score move first? <span>All visible teams, quarter-to-quarter changes</span></h3><p class="help">Across all teams, does the manager score fall before the pulse does? If it does, a dip in the manager score is an early warning.</p>
   <div class="leadlag">
    <div class="lrow"><div class="t"><span>Manager score change, same quarter as the pulse change</span><b>r ${f(rs)}</b></div>${meter(rs)}<span class="note">${word(rs,same[0].length)}, ${same[0].length} team-quarters</span></div>
    <div class="lrow"><div class="t"><span>Manager score change, then pulse change the next quarter</span><b>r ${f(rl)}</b></div>${meter(rl)}<span class="note">${word(rl,lead[0].length)}, ${lead[0].length} team-quarters</span></div>
   </div>
   <details class="moreinfo"><summary>How to read this</summary><p class="note">A positive number means that when the manager score falls, the pulse tends to fall too, in the same quarter or the next. If the second line were clearly stronger than the first, an early manager signal would deserve real weight. With so few teams, one team can swing both, and the range is too narrow. Treat it as a question to test on real data, not a result.</p></details>`;
}
function early(res,s){
  if(!res.length){$('early').innerHTML='';return}
  const rows=res.slice().sort((a,b)=>b.leadN-a.leadN||b.W-a.W);
  const lp=r=>r.f.filter(x=>['mgrchg','promo','load','span'].includes(x.k));
  $('early').innerHTML=`<h3>Early signals <span>Four groups: people change, career, load, structure</span></h3><p class="help">Things that tend to change before the scores do. One alone is a prompt to ask a question. Two together, with nothing else moving, put a team on Watch.</p>
   <div class="tablewrap"><table style="min-width:920px"><thead><tr><th>Team</th><th>Status</th><th class="num">Manager changed</th><th class="num">Months in role</th><th class="num">Stalled promos</th><th class="num">Widest span</th><th class="num">Workload</th><th>Pace item</th><th>Early signals</th></tr></thead><tbody>`+
   rows.map(r=>{const t=r.t,wk='style="color:var(--warn)"';return `<tr class="${t.n===selected?'sel':''}">
     <td><button class="teambtn" data-t="${esc(t.n)}">${esc(t.n)}</button></td><td>${stPill(r)}</td>
     <td class="num" ${t.mc!==null&&t.mc>=30?wk:''}>${t.mc===null?'–':t.mc+'%'}</td><td class="num" ${t.mnew!==null&&t.mnew<3?wk:''}>${t.mnew===null?'–':t.mnew}</td>
     <td class="num" ${t.stale!==null&&t.stale>=s.st?wk:''}>${t.stale===null?'–':t.stale+'%'}</td><td class="num" ${t.spans&&Math.max(...t.spans)>=s.sp?wk:''}>${t.spans?Math.max(...t.spans):'–'}</td><td class="num" ${r.W>=s.wl?wk:''}>${r.W.toFixed(0)}</td>
     <td>${spark(t.pace,40,90,'e')}</td>
     <td>${lp(r).length?lp(r).map(x=>`<span class="pill ${x.lvl}">${x.tag}</span>`).join(''):'<span class="pill ok">quiet</span>'}</td></tr>`}).join('')+
   `</tbody></table></div>
   <details class="moreinfo"><summary>How signals decide the status</summary><p class="note">Signals add context to a status. They decide it only when nothing else has fired: two or more, with no pulse fall, manager fall, falling response, or pay or exit flag, put a team on Watch. Manager changed and months in role are one group, stalled promotions a second, workload a third and span a fourth. Amber is past your setting.</p></details>`;
  document.querySelectorAll('#early .teambtn').forEach(b=>b.onclick=()=>{selected=b.dataset.t;render()});
}
/* thresholds taken from the data itself. Spread is measured with the median absolute deviation, so the few teams that are already in trouble do not widen the line. */
const median=a=>{const v=a.slice().sort((x,y)=>x-y),n=v.length,m=n>>1;return n%2?v[m]:(v[m-1]+v[m])/2};
const pctile=(a,p)=>{const v=a.slice().sort((x,y)=>x-y),i=(v.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return v[lo]+(v[hi]-v[lo])*(i-lo)};
const robustSd=a=>{const m=median(a);return 1.4826*median(a.map(x=>Math.abs(x-m)))};
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
function fromData(vis,s){
  if(vis.length<6) return null;
  const dP=[],dM=[];
  vis.forEach(t=>{const A=t.pulse.map((_,i)=>adjP(t,i,s)),M=t.mgr.map((_,i)=>adjM(t,i,s));for(let q=0;q<3;q++){dP.push(A[q+1]-A[q]);dM.push(M[q+1]-M[q])}});
  const sdP=robustSd(dP),sdM=robustSd(dM);
  const Ws=vis.map(wIndex),St=vis.map(t=>t.stale).filter(v=>v!==null);
  return {sdP,sdM,
    drop:clamp(Math.round(2*sdP*Math.SQRT2),3,20),
    mdrop:clamp(Math.round(2*sdM*10)/10,0.1,0.6),
    wl:clamp(Math.round(pctile(Ws,0.75)),40,80),
    st:St.length>=3?clamp(Math.round(pctile(St,0.75)/5)*5,20,60):null};
}
function fromDataPanel(vis,s){
  const d=fromData(vis,s);
  if(!d){$('fromdata').innerHTML='<p class="note">Too few visible teams to read a normal range from the data.</p>';return}
  window._fd=d;
  $('fromdata').innerHTML=`<h3>Set from the data <span>What the visible teams say is normal</span></h3>
   <div class="tablewrap"><table><thead><tr><th>Setting</th><th class="num">Now</th><th class="num">From the data</th><th>How it is worked out</th></tr></thead><tbody>
    <tr><td>Pulse fall to flag</td><td class="num">${s.drop} pts</td><td class="num">${d.drop} pts</td><td>Twice the usual two-quarter move (a typical quarter moves about ${d.sdP.toFixed(1)} points)</td></tr>
    <tr><td>Manager score move</td><td class="num">${s.mdrop.toFixed(1)}</td><td class="num">${d.mdrop.toFixed(1)}</td><td>Twice the usual quarter move (about ${d.sdM.toFixed(2)})</td></tr>
    <tr><td>Heavy workload from</td><td class="num">${s.wl}</td><td class="num">${d.wl}</td><td>Top quarter of teams</td></tr>
    <tr><td>Stalled promotions from</td><td class="num">${s.st}%</td><td class="num">${d.st===null?'n/a':d.st+'%'}</td><td>Top quarter of teams</td></tr></tbody></table></div>
   <button class="use" id="usefd" type="button">Use the values from the data</button>
   <details class="moreinfo"><summary>Caveats</summary><p class="note">Two caveats. Moves are measured across visible teams, so the line is only as good as the history behind it (three quarters of ${MODE==='demo'?'invented':'your'} data), and a top-quarter line always flags some teams, even in a healthy company. With real data I would keep absolute floors beside it. Pay lines and the turnover reference stay outside, since they should come from market data.</p></details>`;
  $('usefd').onclick=()=>{$('drop').value=d.drop;$('mdrop').value=d.mdrop;$('wl').value=d.wl;if(d.st!==null)$('stale').value=d.st;render()};
}
/* follow-through log. Kept in this browser only. A real version needs shared storage, access rules and an audit trail. */
const ASOF=new Date(),dstr=d=>d.toISOString().slice(0,10),plus=n=>{const d=new Date(ASOF);d.setDate(d.getDate()+n);return dstr(d)};
const STATES=['Not started','In progress','Done'];
let ACTIONS=null;
function loadActions(){
  if(ACTIONS)return;
  ACTIONS=[];
  if(MODE!=='demo')return;
  let v=null;
  try{v=JSON.parse(localStorage.getItem('ps_actions_v1')||'null')}catch(e){}
  ACTIONS=Array.isArray(v)?v:[
    {id:'s1',team:'Platform Engineering',what:'Talk with the new manager and the team lead about priorities and what support they need',owner:'HR business partner',due:plus(7),state:'In progress',then:'slip'},
    {id:'s2',team:'Field Deployment',what:'Agree an escalation path for customer sites and a notice period for travel schedules',owner:'Head of operations',due:plus(-9),state:'Not started',then:'slip'},
    {id:'s3',team:'Hardware Design',what:'Review how ratings were set against the calibration notes',owner:'People partner',due:plus(-20),state:'Done',then:'slip'}];
}
/* with your own data nothing is written to browser storage. Only the demo remembers its practice entries. */
function saveActions(){if(MODE!=='demo')return;try{localStorage.setItem('ps_actions_v1',JSON.stringify(ACTIONS))}catch(e){}}
const csvCell=v=>{let s=String(v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
function download(name,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function actions(res,s){
  loadActions();
  const today=dstr(ASOF),open=x=>x.state!=='Done',over=x=>open(x)&&x.due<today;
  const rows=res.filter(r=>r.status!=='stable'||ACTIONS.some(x=>x.team===r.t.n));
  const sel=res.find(r=>r.t.n===selected);
  const mine=sel?ACTIONS.filter(x=>x.team===sel.t.n):[];
  $('actions').innerHTML=`<h3>Follow-through <span>What was done about each flag</span></h3><p class="help">A flag without an owner and a date is only a worry. Log who will do what, and by when.</p>
   <div class="tablewrap"><table style="min-width:720px"><thead><tr><th>Team</th><th>Status now</th><th class="num">Open actions</th><th class="num">Overdue</th><th>Status when last action was raised</th><th></th></tr></thead><tbody>`+
   rows.map(r=>{const xs=ACTIONS.filter(x=>x.team===r.t.n),o=xs.filter(open).length,ov=xs.filter(over).length,lastA=xs[xs.length-1];
     const gap=r.status!=='stable'&&o===0;
     return `<tr class="${r.t.n===selected?'sel':''}"><td><button class="teambtn" data-t="${esc(r.t.n)}">${esc(r.t.n)}</button></td><td>${stPill(r)}</td><td class="num">${o}</td><td class="num" ${ov?'style="color:var(--crit)"':''}>${ov}</td>
     <td>${lastA?`${STATUS[lastA.then].label} to ${STATUS[r.status].label}`:'<span class="note">none</span>'}</td><td>${gap?'<span class="pill warn">no open action</span>':ov?'<span class="pill crit">overdue</span>':''}</td></tr>`}).join('')+`</tbody></table></div>
   <div class="actions">`+(sel?`<h3 style="margin-top:16px">${esc(sel.t.n)}</h3>`+
   (mine.length?`<div class="tablewrap"><table style="min-width:640px"><thead><tr><th>Action</th><th>Owner</th><th>Due</th><th>State</th><th></th></tr></thead><tbody>`+mine.map(x=>`<tr><td>${esc(x.what)}</td><td>${esc(x.owner)}</td><td class="num" ${over(x)?'style="color:var(--crit)"':''}>${esc(x.due)}</td>
     <td><select data-id="${esc(x.id)}" aria-label="State of action">${STATES.map(z=>`<option${z===x.state?' selected':''}>${z}</option>`).join('')}</select></td><td><button class="x" type="button" data-del="${esc(x.id)}" aria-label="Remove action">Remove</button></td></tr>`).join('')+`</tbody></table></div>`:`<p class="note">No action logged for this team yet.</p>`)+
   `<div class="addrow"><label>Action<input type="text" id="a_what" maxlength="200" placeholder="What will be done"></label><label>Owner (a role)<input type="text" id="a_owner" maxlength="60" placeholder="For example, HR business partner"></label><label>Due<input type="date" id="a_due" value="${plus(14)}"></label><button class="go" type="button" id="a_add">Add action</button></div>`:'')+`</div>
   <div class="btnrow"><button class="x" type="button" id="a_dl">Download all actions as CSV</button></div>
   <details class="moreinfo"><summary>About follow-through</summary><p class="note">Each flag should have an owner, an action and a date, and the next quarter should show whether the status moved. This card does the bookkeeping. It cannot show that the action caused the change. Log a role, not an employee's name. ${MODE==='demo'?'Entries are saved in this browser only, and the first three are invented.':'Entries are kept in memory only and disappear when you reload. Download them to keep them.'}</p></details>`;
  const box=$('actions');
  box.querySelectorAll('.teambtn').forEach(b=>b.onclick=()=>{selected=b.dataset.t;render()});
  box.querySelectorAll('select[data-id]').forEach(e=>e.onchange=()=>{const x=ACTIONS.find(y=>y.id===e.dataset.id);if(x){x.state=e.value;saveActions();render()}});
  box.querySelectorAll('button[data-del]').forEach(b=>b.onclick=()=>{ACTIONS=ACTIONS.filter(y=>y.id!==b.dataset.del);saveActions();render()});
  $('a_dl').onclick=()=>download('actions.csv',['team,action,owner,due,state,status_when_raised'].concat(ACTIONS.map(x=>[x.team,x.what,x.owner,x.due,x.state,(STATUS[x.then]||{label:''}).label].map(csvCell).join(','))).join('\n'));
  const add=$('a_add');
  if(add)add.onclick=()=>{const w=$('a_what').value.trim(),o=$('a_owner').value.trim(),d=$('a_due').value;if(!w||!o||!d)return;
    ACTIONS.push({id:'u'+Date.now(),team:sel.t.n,what:w.slice(0,200),owner:o.slice(0,60),due:d,state:'Not started',then:sel.status});saveActions();render()};
}
/* ---------- equity ---------- */
function eqGroups(t){const e=t.eq,m=t.hc-e.w-e.o;return {w:e.w,m,cw:e.cw,cm:e.cm,qw:e.qw,qm:e.qm,rw:e.rw,rm:e.rm}}
function eqCalc(t,s){
  const e0=t.eq,m=t.hc-e0.w-e0.o;
  if(e0.w<s.min||m<s.min) return null;
  const e=Object.assign({},e0,{pay:(1-e0.cw/e0.cm)*100,pg:e0.qm-e0.qw,rg:e0.rm-e0.rw});
  const pwR=e.pw/e.w*100,pmR=e.pm/m*100,xwR=e.xw/e.w*100,xmR=e.xm/m*100;
  const promoRatio=pmR>0?pwR/pmR:null,exitRatio=xmR>0?xwR/xmR:(xwR>0?Infinity:null);
  const fl=[];
  if(e.pay>=s.eq) fl.push('pay');
  if(promoRatio!==null&&promoRatio<0.8&&e.pw+e.pm>=3) fl.push('promotion');
  if(exitRatio!==null&&exitRatio>=1.5&&e.xw+e.xm>=3) fl.push('exits');
  if(e.pg>=8) fl.push('pulse');
  if(Math.abs(e.rg)>=15) fl.push('response');
  return {w:e.w,m,promoRatio,exitRatio,fl,e};
}
function equity(vis,s){
  if(!vis.length||!HAS.eq){$('equity').innerHTML='';return}
  let W=0,M=0,cw=0,cm=0,qw=0,qm=0,rw=0,rm=0,pw=0,pm=0,xw=0,xm=0;
  vis.forEach(t=>{const g=eqGroups(t),e=t.eq;W+=g.w;M+=g.m;cw+=g.cw*g.w;cm+=g.cm*g.m;qw+=g.qw*g.w;qm+=g.qm*g.m;rw+=g.rw*g.w;rm+=g.rm*g.m;pw+=e.pw;pm+=e.pm;xw+=e.xw;xm+=e.xm});
  const co={pay:(1-(cw/W)/(cm/M))*100,promo:(pw/W)/(pm/M),exit:(xw/W)/(xm/M),pg:qm/M-qw/W,rg:rm/M-rw/W};
  const rows=vis.map(t=>({t,c:eqCalc(t,s)}));
  const shown=rows.filter(x=>x.c),flagged=shown.filter(x=>x.c.fl.length);
  const wk='style="color:var(--warn);font-weight:600"';
  const cell=(on,txt)=>`<td class="num" ${on?wk:''}>${txt}</td>`;
  const ratio=v=>v===null?'n/a':v===Infinity?'no men left':v.toFixed(2);
  $('equity').innerHTML=`<h3>Equity lens <span>Do outcomes differ between women and men? Illustrative, one attribute</span></h3><p class="help">Compares women and men on pay, promotion, exits, pulse and response. It is for the people who own pay and fairness. A gap is a reason to look closer, not proof.</p>
   <div class="stats" style="margin-bottom:10px">
    <div class="stat"><span class="l">Company pay gap (women under men)</span><span class="v">${co.pay.toFixed(1)}%</span><span class="d flat">compa-ratio, ${W} women and ${M} men</span></div>
    <div class="stat"><span class="l">Promotion rate, women ÷ men</span><span class="v">${co.promo.toFixed(2)}</span><span class="d flat">${pw} women and ${pm} men promoted in 12 months</span></div>
    <div class="stat"><span class="l">Exit rate, women ÷ men</span><span class="v">${co.exit.toFixed(2)}</span><span class="d flat">${xw} women and ${xm} men left in 12 months</span></div>
    <div class="stat"><span class="l">Teams with a gap to look at</span><span class="v">${flagged.length} <span class="note">of ${shown.length} shown</span></span><span class="d flat">${rows.length-shown.length} hidden: a group is under ${s.min}</span></div>
   </div>
   <div class="tablewrap"><table style="min-width:860px"><thead><tr><th>Team</th><th class="num">Women / men</th><th class="num">Pay gap</th><th class="num">Promotion, women ÷ men</th><th class="num">Exit rate, women ÷ men</th><th class="num">Pulse gap</th><th class="num">Response gap</th><th>Reads</th></tr></thead><tbody>`+
   rows.map(({t,c})=>{
     if(!c) return `<tr><td>${esc(t.n)}</td><td class="num">not shown</td><td colspan="6"><span class="note">One of the two groups is under ${s.min} people, so nothing is shown for this team.</span></td></tr>`;
     const e=c.e;return `<tr><td>${esc(t.n)}</td><td class="num">${c.w} / ${c.m}</td>${cell(c.fl.includes('pay'),e.pay.toFixed(1)+'%')}${cell(c.fl.includes('promotion'),ratio(c.promoRatio))}${cell(c.fl.includes('exits'),ratio(c.exitRatio))}${cell(c.fl.includes('pulse'),e.pg.toFixed(0)+' pts')}${cell(c.fl.includes('response'),e.rg.toFixed(0)+' pts')}<td>${c.fl.length?c.fl.map(z=>`<span class="pill warn">${z}</span>`).join(''):'<span class="pill ok">nothing flagged</span>'}</td></tr>`}).join('')+
   `</tbody></table></div>
   <details class="moreinfo"><summary>What counts as a gap</summary><p class="note">Flags: pay gap at or above your setting (${s.eq}%), promotion rate for women under four-fifths of men's (at least 3 promotions), exit rate for women at least 1.5 times men's (at least 3 exits), a pulse gap of 8 points or more, a response gap of 15 points or more. A gap is a reason for a proper analysis, not proof of unfair treatment: level, role, tenure and location can all create one.</p></details>
   <details class="moreinfo"><summary>Handle with care</summary><p class="note">Handle with care. One attribute, two groups, and people who fit neither are left out. Only the people responsible for pay and fairness should see it, not line leaders. It never changes a team's status. In the EU, treat it as a sensitive analysis with a stated purpose and a data protection assessment.</p></details>`;
}
/* ---------- driver analysis ---------- */
function drivers(res,s){
  if(res.length<6||!HAS.items){$('drivers').innerHTML='';return}
  const adjI=(t,v)=>{const r=t.resp[3]/100;return r*v+(1-r)*(v-s.delta)};
  const stay=res.map(r=>adjI(r.t,r.t.stay));
  const rows=ITEMS.map((n,i)=>{const xs=res.map(r=>adjI(r.t,r.t.drv[i])),rr=pearson(xs,stay);return {n,i,r:rr,ci:rCI(rr,xs.length),co:wavg(res,x=>adjI(x.t,x.t.drv[i]))}});
  const sorted=rows.slice().sort((a,b)=>b.r-a.r);
  const W=340,L=120,R=14,rh=26,H=sorted.length*rh+26,X=v=>L+(v+0.2)/1.2*(W-L-R);
  let g=`<line class="ax" x1="${X(0)}" y1="4" x2="${X(0)}" y2="${H-20}"/>`;
  [0,0.5,1].forEach(v=>g+=`<text x="${X(v)}" y="${H-6}" text-anchor="middle">${v.toFixed(1)}</text>`);
  sorted.forEach((d,k)=>{const y=14+k*rh;
    g+=`<text x="${L-8}" y="${y+3}" text-anchor="end">${d.n}</text>`;
    if(d.ci)g+=`<line class="ln p" x1="${X(Math.max(-0.2,d.ci[0]))}" y1="${y}" x2="${X(Math.min(1,d.ci[1]))}" y2="${y}"/>`;
    g+=`<circle class="pt p" cx="${X(d.r)}" cy="${y}" r="4"/><text x="${X(d.r)}" y="${y-7}" text-anchor="middle">${d.r.toFixed(2)}</text>`});
  const sel=res.find(r=>r.t.n===selected);
  let selHtml='';
  if(sel){const t=sel.t,list=rows.map(d=>{const v=adjI(t,t.drv[d.i]),gap=v-d.co;return {d,v,gap,score:Math.max(0,-gap)*Math.max(0,d.r)}}).sort((a,b)=>b.score-a.score);
    const top=list.filter(x=>x.score>0).slice(0,2);
    selHtml=`<h3 style="margin-top:14px">${esc(t.n)}, against the company</h3><div class="tablewrap"><table style="min-width:520px"><thead><tr><th>Item</th><th class="num">Team</th><th class="num">Company</th><th class="num">Gap</th><th class="num">Link with staying</th></tr></thead><tbody>`+
     list.map(x=>`<tr><td>${x.d.n}</td><td class="num">${x.v.toFixed(0)}%</td><td class="num">${x.d.co.toFixed(0)}%</td><td class="num" ${x.gap<=-8?'style="color:var(--warn);font-weight:600"':''}>${x.gap>0?'+':''}${x.gap.toFixed(0)}</td><td class="num">${x.d.r.toFixed(2)}</td></tr>`).join('')+
     `</tbody></table></div><p>${top.length?`Where to start in this team: <strong>${top.map(x=>x.d.n.toLowerCase()).join('</strong> and <strong>')}</strong>. These are the items furthest below the company that also move most with plans to stay across teams.`:'No item sits clearly below the company for this team.'}</p>`}
  $('drivers').innerHTML=`<h3>What goes with plans to stay <span>Six pulse items against the question "I plan to be here in a year"</span></h3><p class="help">Which pulse items go with people saying they plan to stay. It shows where a conversation could start, not what makes people stay.</p>
   <div class="payscat"><div><div class="eyebrow">Link across teams, with 95% range</div><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Correlation of each pulse item with plans to stay, one line per item">${g}</svg></div><div>${selHtml}</div></div>
   <details class="moreinfo"><summary>How to read this</summary><p class="note">This shows which items rise and fall together with plans to stay across ${res.length} teams, not what causes people to stay. Items move together, so their order is weak evidence, and the range is wide on this few teams. Treat the list as a place to start a conversation.</p></details>`;
}
/* ---------- cost of exits ---------- */
const money=v=>'€'+Math.round(v).toLocaleString('en-US');
function cost(res,s){
  if(!res.length||!HAS.cost){$('cost').innerHTML='';return}
  const rows=res.map(r=>{const t=r.t,n=exits(t),per=t.sal*s.repl/100;return {t,n,xr:t.xr,per,total:n*per,reg:t.xr*per}}).sort((a,b)=>b.total-a.total);
  const T=rows.reduce((a,x)=>({n:a.n+x.n,xr:a.xr+x.xr,total:a.total+x.total,reg:a.reg+x.reg}),{n:0,xr:0,total:0,reg:0});
  const pooled=BUCKETS.map((_,i)=>res.reduce((a,r)=>a+r.t.ex[i],0)),mx=Math.max(...pooled,1);
  const pooledR=BUCKETS.map((_,i)=>res.reduce((a,r)=>a+(r.t.exr?r.t.exr[i]:0),0));
  $('cost').innerHTML=`<h3>What exits cost <span>Last 12 months, with the people the team wanted to keep shown separately</span></h3><p class="help">A rough money figure, so the conversation is about more than a percentage. It rests on an assumption you can change in the settings.</p>
   <div class="stats" style="margin-bottom:10px">
    <div class="stat"><span class="l">Exits, last 12 months</span><span class="v">${T.n}</span><span class="d flat">${HAS.regretted?T.xr+' were people the team wanted to keep':'regretted exits not provided'}</span></div>
    <div class="stat"><span class="l">Estimated replacement cost</span><span class="v">${money(T.total)}</span><span class="d flat">at ${s.repl}% of a year's pay per person</span></div>
    <div class="stat"><span class="l">Of which people to keep</span><span class="v">${HAS.regretted?money(T.reg):'–'}</span><span class="d flat">${HAS.regretted?(T.total?(T.reg/T.total*100).toFixed(0):0)+'% of the cost':'not provided'}</span></div>
   </div>
   <div class="tablewrap"><table style="min-width:640px"><thead><tr><th>Team</th><th class="num">Exits</th><th class="num">To keep</th><th class="num">Average pay</th><th class="num">Cost per exit</th><th class="num">Estimated cost</th></tr></thead><tbody>`+
   rows.map(x=>`<tr class="${x.t.n===selected?'sel':''}"><td><button class="teambtn" data-t="${esc(x.t.n)}">${esc(x.t.n)}</button></td><td class="num">${x.n}</td><td class="num">${HAS.regretted?x.xr:'–'}</td><td class="num">${money(x.t.sal)}</td><td class="num">${money(x.per)}</td><td class="num">${money(x.total)}</td></tr>`).join('')+
   `</tbody></table></div>
   ${HAS.tenure?`<div class="eyebrow" style="margin-top:12px">When exits happen, all visible teams together${HAS.regTenure?' (dark: people the team wanted to keep)':''}</div>`:''}
   <div style="display:${HAS.tenure?'grid':'none'};gap:6px;margin-top:6px">`+pooled.map((v,i)=>`<div class="tenrow"><span>${BUCKETS[i]}</span><div class="tbar"><i style="width:${v/mx*100}%"></i>${HAS.regTenure?`<u style="width:${pooledR[i]/mx*100}%"></u>`:''}</div><span class="num">${v}${HAS.regTenure?` <span class="note">· ${pooledR[i]} regretted${v?` (${Math.round(pooledR[i]/v*100)}%)`:''}</span>`:''}</span></div>`).join('')+`</div>
   <details class="moreinfo"><summary>About this estimate</summary><p class="note">The cost is an assumption: one share of a year's pay per exit, the same for everyone. It leaves out lost knowledge and how long a role stays empty. It shows what has happened, not a forecast. The regretted-exit weight changes the flags, not this cost. "To keep" needs a definition agreed with managers, or it becomes a judgment about the person who left.</p></details>`;
  document.querySelectorAll('#cost .teambtn').forEach(b=>b.onclick=()=>{selected=b.dataset.t;render()});
}
/* ---------- structure ---------- */
function structure(res,s){
  if(!res.length||!HAS.spans){$('structure').innerHTML='';return}
  const rows=res.map(r=>{const sp=r.t.spans,mx=Math.max(...sp),avg=sp.reduce((a,b)=>a+b,0)/sp.length;return {r,n:sp.length,mx,avg}}).sort((a,b)=>b.mx-a.mx);
  const use=rows.filter(x=>!x.r.mHide);
  const rr=pearson(use.map(x=>x.mx),use.map(x=>x.r.M[3]));
  $('structure').innerHTML=`<h3>Manager spans <span>Direct reports per manager</span></h3><p class="help">How many people report to each manager. A very wide span is a different problem from a weak manager score.</p>
   <div class="tablewrap"><table style="min-width:600px"><thead><tr><th>Team</th><th class="num">Managers</th><th class="num">Widest span</th><th class="num">Average span</th><th class="num">Manager score</th><th>Reads</th></tr></thead><tbody>`+
   rows.map(x=>`<tr class="${x.r.t.n===selected?'sel':''}"><td><button class="teambtn" data-t="${esc(x.r.t.n)}">${esc(x.r.t.n)}</button></td><td class="num">${x.n}</td><td class="num" ${x.mx>=s.sp?'style="color:var(--warn);font-weight:600"':''}>${x.mx}</td><td class="num">${x.avg.toFixed(1)}</td><td class="num">${x.r.mHide?'hidden':x.r.M[3].toFixed(2)}</td><td>${x.mx>=s.sp?'<span class="pill warn">Wide span</span>':x.mx<=2?'<span class="pill mute">very narrow</span>':'<span class="pill ok">within your line</span>'}</td></tr>`).join('')+
   `</tbody></table></div>
   <p>Widest span and manager score, across ${use.length} teams: <strong>r ${rr===null?'n/a':sgn(rr)}</strong>, ${linkWord(rr,use.length)}.</p>
   <details class="moreinfo"><summary>How to read this</summary><p class="note">Only widest and average spans are shown, so one manager's team cannot be picked out. A wide span is not bad by itself, and a very narrow one often means a manager who is also doing the work. Read it with the manager score beside it.</p></details>`;
  document.querySelectorAll('#structure .teambtn').forEach(b=>b.onclick=()=>{selected=b.dataset.t;render()});
}
/* backtest: was a team flagged in a quarter, and did people leave in the next one? Only signals with a history in this data can be tested. */
function backtest(vis,s){
  if(vis.length<6){$('backtest').innerHTML='';return}
  const rows=[];
  let tot={fl:0,fp:0,fe:0,nf:0,np:0,ne:0,flHit:0,fre:0,nre:0};
  for(const q of [1,2]){
    const r={q,fl:0,fp:0,fe:0,nf:0,np:0,ne:0,flHit:0,fre:0,nre:0};
    vis.forEach(t=>{
      const A=t.pulse.map((_,i)=>adjP(t,i,s)),M=t.mgr.map((_,i)=>adjM(t,i,s));
      const flagged=(A[q]-A[q-1]<=-STEADY_PULSE)||(respM(t)>=s.mm&&M[q]-M[q-1]<=-s.mdrop)||(t.pace[q-1]-t.pace[q]>=5);
      const e=t.exq[q+1],er=t.reg?t.reg[q+1]:0;
      if(flagged){r.fl++;r.fp+=t.hc;r.fe+=e;r.fre+=er;if(e>0)r.flHit++}else{r.nf++;r.np+=t.hc;r.ne+=e;r.nre+=er}
    });
    rows.push(r);for(const k in tot)tot[k]+=r[k];
  }
  rows.push(Object.assign({q:'both'},tot));
  const rate=(e,p)=>p?(e/p*100):0;
  const line=r=>{const fr=rate(r.fe,r.fp),nr=rate(r.ne,r.np),share=(r.fe+r.ne)?r.fe/(r.fe+r.ne)*100:0;
    return `<tr><td>${r.q===1||r.q===2?Q[r.q]+' to '+Q[r.q+1]:'Both'}</td><td class="num">${r.fl} of ${r.fl+r.nf}</td><td class="num">${r.fe} <span class="note">(${fr.toFixed(1)} per 100)</span></td><td class="num">${r.ne} <span class="note">(${nr.toFixed(1)} per 100)</span></td><td class="num">${r.fl?`${r.flHit} of ${r.fl}`:'n/a'}</td><td class="num">${share.toFixed(0)}%</td></tr>`};
  const b=rows[2],fr=rate(b.fe,b.fp),nr=rate(b.ne,b.np);
  $('backtest').innerHTML=`<h3>Backtest <span>Flagged in one quarter, did people leave in the next?</span></h3><p class="help">A check on the method: when a team was flagged, did more people leave the next quarter? A first look, not proof.</p>
   <div class="tablewrap"><table style="min-width:720px"><thead><tr><th>Window</th><th class="num">Teams flagged</th><th class="num">Exits next quarter, flagged</th><th class="num">Exits next quarter, not flagged</th><th class="num">Flagged teams with an exit</th><th class="num">Share of all exits</th></tr></thead><tbody>${rows.map(line).join('')}</tbody></table></div>
   <p>${b.fl&&b.nf?`Across both windows, flagged teams lost ${fr.toFixed(1)} people per 100 in the following quarter, against ${nr.toFixed(1)} for the rest.`:'Too few flags to compare.'}${HAS.regretted&&b.fl&&b.nf?` Of those exits, the people the team wanted to keep were ${rate(b.fre,b.fp).toFixed(1)} per 100 in flagged teams, against ${rate(b.nre,b.np).toFixed(1)} for the rest.`:''}</p>
   <details class="moreinfo"><summary>How to read this</summary><p class="note">A demonstration of the method, not evidence. ${MODE==='demo'?'The exits are invented, so any gap says nothing about real teams.':'With four quarters this is a first look, not a validated result.'} Only three signals have a history here (a pulse fall, a manager score fall and a drop in the pace question). There are two test windows and ${vis.length} teams, so a single exit changes the picture. A real run needs eight or more quarters, a range on every rate, and quarters held back so thresholds are not judged on the data that set them.</p></details>`;
}
function scat(rows,yk,yl,yh,yfmt,ylab,s){
  const W=330,H=240,L=38,B=30,T=12,R=12,xl=0.85,xh=1.10;
  const X=v=>L+(v-xl)/(xh-xl)*(W-L-R), Y=v=>H-B-(v-yl)/(yh-yl)*(H-B-T);
  let g=`<line class="ax" x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}"/><line class="ax" x1="${L}" y1="${T}" x2="${L}" y2="${H-B}"/>`;
  [0.85,0.90,0.95,1.00,1.05,1.10].forEach(v=>g+=`<text x="${X(v)}" y="${H-B+12}" text-anchor="middle">${v.toFixed(2)}</text>`);
  const ticks=[yl,(yl+yh)/2,yh].map(v=>Math.round(v));
  ticks.forEach(v=>g+=`<text x="${L-5}" y="${Y(v)+3}" text-anchor="end">${yfmt(v)}</text>`);
  g+=`<line class="mean" x1="${X(s.pay)}" y1="${T}" x2="${X(s.pay)}" y2="${H-B}"/><text class="q" x="${X(s.pay)+3}" y="${T+8}">pay line</text>`;
  g+=`<line class="mean" x1="${X(s.hi)}" y1="${T}" x2="${X(s.hi)}" y2="${H-B}"/><text class="q" x="${X(s.hi)+3}" y="${T+8}">at or above market</text>`;
  g+=`<text x="${(L+W-R)/2}" y="${H-3}" text-anchor="middle">compa-ratio (pay / market midpoint)</text>`;
  g+=`<text transform="translate(9 ${(T+H-B)/2}) rotate(-90)" text-anchor="middle">${ylab}</text>`;
  const xs=rows.map(r=>r.t.compa),ys=rows.map(r=>yk(r)),n=xs.length,mx=xs.reduce((a,b)=>a+b)/n,my=ys.reduce((a,b)=>a+b)/n;
  const sxx=xs.reduce((a,x)=>a+(x-mx)**2,0),sxy=xs.reduce((a,x,i)=>a+(x-mx)*(ys[i]-my),0),b=sxx?sxy/sxx:0,a0=my-b*mx;
  const x1=Math.min(...xs),x2=Math.max(...xs);
  if(n>=4) g+=`<line class="reg" x1="${X(x1)}" y1="${Y(a0+b*x1)}" x2="${X(x2)}" y2="${Y(a0+b*x2)}"/>`;
  rows.forEach(r=>{const ab=esc(r.t.n.split(' ').filter(w=>w!=='and').map(w=>w[0]).join('').slice(0,2)),cls=STATUS[r.status].dot,rad=3+Math.sqrt(r.t.hc)/1.6;
    g+=`<circle class="dot ${cls} ${r.t.n===selected?'sel':''}" cx="${X(r.t.compa)}" cy="${Y(yk(r))}" r="${rad}"><title>${esc(r.t.n)}</title></circle><text class="pt2" x="${X(r.t.compa)+rad+2}" y="${Y(yk(r))+3}">${ab}</text>`});
  return {svg:`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${ylab} against compa-ratio, one dot per team">${g}</svg>`,b,a0,r:pearson(xs,ys),n};
}
function payview(res,s){
  if(res.length<4||!HAS.pay){$('pay').innerHTML='';return}
  const a=scat(res,r=>r.A[3],40,90,v=>v,'pulse, adjusted',s), e=scat(res,r=>r.E[3],-30,60,fmtE,'eNPS, adjusted',s);
  const f=v=>v===null?'n/a':(v>0?'+':'')+v.toFixed(2);
  const word=(r,n)=>linkWord(r,n);
  const resid=res.map(r=>({n:r.t.n,d:r.E[3]-(e.a0+e.b*r.t.compa),c:r.t.compa})).sort((x,y)=>x.d-y.d);
  const lo=resid[0],hi=resid[resid.length-1],items=[];
  if(lo.d<=-8) items.push(`<p><strong>${esc(lo.n)}</strong> (compa ${lo.c.toFixed(2)}): eNPS is ${Math.abs(lo.d).toFixed(0)} points below what its compa-ratio alone would suggest. Look beyond pay: manager, workload, growth.</p>`);
  if(hi.d>=8) items.push(`<p><strong>${esc(hi.n)}</strong> (compa ${hi.c.toFixed(2)}): eNPS is ${hi.d.toFixed(0)} points above what its compa-ratio alone would suggest. Something other than pay is helping.</p>`);
  const low=res.filter(r=>r.lowE);
  const gp=low.filter(r=>r.t.compa<=s.pay),gb=low.filter(r=>r.t.compa>=s.hi&&r.t.below<=10),gm=low.filter(r=>!gp.includes(r)&&!gb.includes(r));
  const lst=a=>a.length?a.map(r=>`${esc(r.t.n)} (${r.t.compa.toFixed(2)}, eNPS ${fmtE(r.E[3])})`).join('; '):'none';
  const route=`<div class="exc"><h3>Teams with low or falling eNPS, and what pay says</h3>
    <p><strong>Pay may be a factor</strong> (compa-ratio at or below ${s.pay.toFixed(2)}): ${lst(gp)}.</p>
    <p><strong>Look beyond pay</strong> (at or above ${s.hi.toFixed(2)} with few people under 0.90): ${lst(gb)}.</p>
    <p><strong>Unclear</strong> (near market): ${lst(gm)}.</p>
    <p class="note">Low means eNPS at or below the company level, or down 10 points or more over two quarters. A team paid at or above market may still have gaps inside it, so this routes the first question and settles nothing.</p></div>`;
  const tr=pearson(res.map(r=>r.t.compa),res.map(r=>r.rate));
  $('pay').innerHTML=`<h3>Does pay line up with engagement? <span>Total Rewards data, team level, this quarter</span></h3><p class="help">Does pay line up with how people feel? The teams far from the pattern are the interesting ones.</p>
   <div class="payscat"><div><div class="eyebrow">Compa-ratio and pulse</div>${a.svg}<p class="note"><b>r ${f(a.r)}</b>, ${word(a.r,a.n)}, ${a.n} teams</p></div>
   <div><div class="eyebrow">Compa-ratio and eNPS</div>${e.svg}<p class="note"><b>r ${f(e.r)}</b>, ${word(e.r,e.n)}, ${e.n} teams. The line is the best fit.</p></div></div>
   ${route}
   <div class="exc">${items.length?items.join(''):'<p class="note">No team sits far from the line at these settings.</p>'}<p class="note">Compa-ratio and turnover: r ${f(tr)}.</p></div>
   <details class="moreinfo"><summary>How to read this</summary><p class="note">A team well below the line is one where pay does not explain the score. A team well above it is holding people for other reasons. Both are better questions than the correlation. Level, location and tenure can move compa-ratio without any change in pay, so check with Total Rewards. Pay data stays at team level and is hidden below the minimum group size.</p></details>`;
}
['minGroup','drop','skew','bench','delta','minResp','mdrop','payT','payHi','wl','stale','minMgr','eqpay','span','repl','rw'].forEach(id=>$(id).addEventListener('input',render));
/* settings: mark what moved from the defaults, and reset them */
const SLIDERS=['minGroup','minMgr','drop','mdrop','delta','minResp','payT','payHi','wl','stale','span','eqpay','repl','rw','skew','bench'];
function markChanged(){let n=0;SLIDERS.forEach(id=>{const el=$(id),ch=el.defaultValue!==undefined&&String(el.value)!==String(el.defaultValue);const c=el.closest&&el.closest('.ctl');if(c)c.classList.toggle('changed',ch);if(ch)n++});
  $('changedNote').textContent=n?n+(n>1?' settings are':' setting is')+' changed from the defaults':'All settings are at the defaults'}
$('resetSettings').onclick=()=>{SLIDERS.forEach(id=>{$(id).value=$(id).defaultValue});render()};
/* teams table: search and sort menu */
$('teamSearch').addEventListener('input',()=>{QUERY=$('teamSearch').value.trim().toLowerCase();if(LASTRES)drawRows(LASTRES,LASTS)});
$('sortSel').innerHTML=SORTOPTS.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join('');
$('sortSel').addEventListener('change',()=>{const v=$('sortSel').value;SORT=v?{k:v.split('|')[0],dir:+v.split('|')[1]}:{k:null,dir:1};render()});
buildLegend();

/* ---------- loading data ---------- */
const FILE_LIMIT=5*1024*1024;
function applyDataset(ds,mode){
  TEAMS=ds.teams;COMMENTS=ds.comments;Q=ds.quarters;HAS=ds.has;MODE=mode;selected=null;ACTIONS=null;
  $('qtr').textContent='Quarter ending '+last(Q);
  $('upSum').textContent=mode==='demo'?'Using the demo data. Load your own data (it stays in this browser)':'Your data: '+TEAMS.length+' teams. Change files, or go back to the demo';
  $('dsnote').textContent=(mode==='demo'?'Demo data, invented. ':'')+TEAMS.length+' teams, four quarters ('+Q.join(', ')+')';
  $('modebanner').innerHTML=mode==='demo'
    ?'<strong>Demo data.</strong> Every team, number and comment here is invented. Load your own files below to look at real teams. Nothing you load leaves your browser.'
    :'<strong>Your data.</strong> It is read in this browser and not uploaded or stored anywhere. Thresholds are untested defaults: treat the page as a structured way to look at team data, not as a prediction.';
}
function showMsg(r,mode){
  const box=$('dataMsg');
  const li=a=>a.map(x=>`<li>${esc(x)}</li>`).join('');
  if(!r.ok){box.className='msg bad';box.innerHTML=`<strong>Nothing was loaded.</strong> Fix these and try again:<ul>${li(r.errors.slice(0,25))}</ul>${r.errors.length>25?`<p class="note">${r.errors.length-25} more.</p>`:''}${r.warnings.length?`<p class="note" style="margin-top:8px">Also noticed:</p><ul>${li(r.warnings.slice(0,10))}</ul>`:''}`;return}
  const h=r.dataset.has,on=[['pay','pay'],['ratings','ratings'],['lead','HRIS signals'],['spans','spans'],['cost','cost'],['items','driver items'],['eq','equity'],['tenure','exits by tenure'],['comments','comments']];
  box.className='msg okm';
  box.innerHTML=`<strong>${mode==='demo'?'Demo data loaded.':'Loaded.'}</strong> ${r.dataset.teams.length} teams, quarters ${esc(r.dataset.quarters.join(', '))}.<br>Switched on: ${on.filter(x=>h[x[0]]).map(x=>x[1]).join(', ')||'the core survey views only'}.${on.some(x=>!h[x[0]])?`<br>Not provided, so switched off: ${on.filter(x=>!h[x[0]]).map(x=>x[1]).join(', ')}.`:''}${r.warnings.length?`<p style="margin-top:8px">Check these:</p><ul>${li(r.warnings.slice(0,15))}</ul>`:''}`;
}
async function loadMine(){
  const files={};
  for(const k of Object.keys(PSData.SCHEMA)){
    const inp=$('f_'+k), pb=$('p_'+k), pasted=pb&&pb.value?pb.value.trim():'';
    const picked=inp&&inp.files&&inp.files[0];
    if(pasted&&picked){showMsg({ok:false,errors:[PSData.SCHEMA[k].file+': you chose a file and also pasted cells. Use one or the other (clear the paste box or remove the file).'],warnings:[]});return}
    if(pasted){
      if(pasted.length>FILE_LIMIT){showMsg({ok:false,errors:[PSData.SCHEMA[k].file+' is larger than 5 MB. This version is meant for team-level data, not one row per person.'],warnings:[]});return}
      files[k]=pasted;
    }else if(picked){
      if(inp.files[0].size>FILE_LIMIT){showMsg({ok:false,errors:[PSData.SCHEMA[k].file+' is larger than 5 MB. This version is meant for team-level data, not one row per person.'],warnings:[]});return}
      files[k]=await inp.files[0].text();
    }
  }
  const r=PSData.build(files);
  showMsg(r,'user');
  if(r.ok){applyDataset(r.dataset,'user');$('upBox').open=false;render();$('dash').scrollIntoView&&$('dash').scrollIntoView({behavior:'smooth'})}
}
function useDemo(){
  const r=PSData.build(window.PS_DEMO);
  applyDataset(r.dataset,'demo');showMsg(r,'demo');render();
}
/* Paste instead of a file: copy the cells from a spreadsheet (tab-separated is detected) and paste them here. Kept in memory only. */
document.querySelectorAll('.frow').forEach(row=>{
  const inp=row.querySelector('input[type=file]'),tpl=row.querySelector('button[data-tpl]');
  if(!inp||!tpl)return;
  const k=inp.id.slice(2),sc=PSData.SCHEMA[k];if(!sc)return;
  const box=document.createElement('div');box.className='fact';
  tpl.parentNode.insertBefore(box,tpl);box.appendChild(tpl);
  const b=document.createElement('button');b.type='button';b.className='tpl';b.textContent='Paste';b.setAttribute('aria-expanded','false');b.setAttribute('aria-controls','p_'+k);
  box.appendChild(b);
  const ta=document.createElement('textarea');ta.id='p_'+k;ta.className='pastebox';ta.rows=6;ta.hidden=true;
  ta.setAttribute('aria-label','Paste the contents of '+sc.file+', header row first');
  ta.placeholder='Select the cells in your spreadsheet, including the header row, copy them and paste here.';
  row.appendChild(ta);
  b.onclick=()=>{const open=ta.hidden;ta.hidden=!open;b.setAttribute('aria-expanded',open?'true':'false');b.textContent=open?'Hide paste box':'Paste';if(open)ta.focus()};
});
/* Copy a prompt to the clipboard, with a select-and-copy fallback for pages opened from disk */
document.querySelectorAll('button[data-copy]').forEach(b=>b.onclick=()=>{
  const el=$(b.dataset.copy);if(!el)return;
  const done=()=>{const t=b.textContent;b.textContent='Copied';setTimeout(()=>{b.textContent=t},1500)};
  const fallback=()=>{const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);try{document.execCommand('copy')&&done()}catch(e){}s.removeAllRanges()};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(el.textContent).then(done,fallback);else fallback();
});
document.querySelectorAll('button[data-tpl]').forEach(b=>b.onclick=()=>download(b.dataset.tpl+'.csv',(window.PS_TEMPLATES||{})[b.dataset.tpl]||''));
$('loadMine').onclick=loadMine;$('useDemo').onclick=useDemo;$('printBtn').onclick=()=>window.print();
useDemo();
