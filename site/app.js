'use strict';
(() => {
  const base = document.querySelector('meta[name="v2w-base"]')?.content || '.';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const path = (p) => /^https?:\/\//.test(p) ? p : `${base}/${p.replace(/^\//, '')}`;
  const state = { board: null, archive: null, snapshot: 'current', search: '', provider: 'All', detail: false, metricView: 'key', sort: 'score', sortDir: 'desc', chart: 'score', ladder: 'score', news: null, cases: [], caseId: 'tape', caseA: 'opus5', caseB: 'gpt6astra' };
  const paperExtra = [
    {key:'t_ape',label:'Translation APE',short:'T-APE',unit:'cm',direction:'down',digits:2,group:'Dynamics',description:'Translation APE from the published-paper results.'},
    {key:'r_ape',label:'Rotation APE',short:'R-APE',unit:'deg',direction:'down',digits:2,group:'Dynamics',description:'Rotation APE from the published-paper results.'},
    {key:'t_rpe',label:'Translation RPE',short:'T-RPE',unit:'cm',direction:'down',digits:2,group:'Dynamics',description:'Translation RPE from the published-paper results.'}
  ];
  const compactKeys = ['score','success','progress','scene_cd','build'];
  const labels = {score:'Overall score',success:'Task success',build:'Build rate'};
  const getRows = () => state.snapshot === 'current' ? state.board.models : state.archive.models;
  const getMetrics = () => state.snapshot === 'current' ? state.board.metrics : state.archive.fields.map(k => state.board.metrics.find(m => m.key === k) || paperExtra.find(m => m.key === k));
  const metric = (key) => [...state.board.metrics,...paperExtra].find(m => m.key === key);
  function format(v, key, withUnit = false) {
    if (v == null || !Number.isFinite(Number(v))) return '—';
    const m = metric(key);
    const n = Number(v).toFixed(m?.digits ?? 2);
    return withUnit && m?.unit === '%' ? `${n}%` : n;
  }
  async function fetchJSON(p) {
    const embedded=$('#v2w-inline-data');
    if(embedded){const data=JSON.parse(embedded.textContent);if(Object.prototype.hasOwnProperty.call(data,p))return data[p];}
    const response = await fetch(path(p));
    if (!response.ok) throw new Error(`Could not load ${p}`);
    return response.json();
  }
  function toast(message) {
    const t = $('#toast'); if (!t) return;
    t.textContent = message; t.classList.add('visible');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('visible'), 2600);
  }
  async function copy(text, message = 'Copied to clipboard') {
    try { await navigator.clipboard.writeText(text); toast(message); }
    catch {
      const area = document.createElement('textarea'); area.value = text; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.append(area); area.select();
      const ok = document.execCommand('copy'); area.remove(); toast(ok ? message : 'Copy unavailable in this browser');
    }
  }
  function download(content, name, type = 'text/plain') {
    const url = URL.createObjectURL(new Blob([content], {type}));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function sortedRows() {
    const direction = state.sortDir === 'desc' ? -1 : 1;
    return [...getRows()].sort((a,b) => (a.reference ? -1 : b.reference ? 1 : direction * (a.metrics[state.sort] - b.metrics[state.sort])));
  }
  function filteredRows() {
    return sortedRows().filter(row => {
      const providerMatch = state.provider === 'All' || (state.provider === 'Others' ? !['Anthropic','OpenAI','Google','Meta','Reference'].includes(row.provider) : row.provider === state.provider);
      return providerMatch && `${row.name} ${row.provider} ${row.model_id || ''}`.toLowerCase().includes(state.search.toLowerCase());
    });
  }
  function renderProviders() {
    const providers = ['All','Anthropic','OpenAI','Google','Meta','Others'];
    $('#provider-filters').innerHTML = providers.map(p => `<button type="button" data-provider="${esc(p)}" class="${p === state.provider ? 'active' : ''}" aria-pressed="${p === state.provider}">${esc(p)}</button>`).join('');
    $$('#provider-filters button').forEach(b => b.addEventListener('click', () => {state.provider = b.dataset.provider; renderProviders(); renderTable();}));
  }
  function renderTable() {
    const available = getMetrics();
    // Metric views: key metrics, one evaluation dimension (V2WScore stays first as the anchor), or all.
    const view = state.metricView;
    const columns = view === 'all' ? available
      : view === 'key' ? compactKeys.map(k => available.find(m => m.key === k)).filter(Boolean)
      : available.filter(m => m.key === 'score' || m.group === view);
    $('#leaderboard-table').classList.toggle('all-metrics',view === 'all');
    $('#table-head').innerHTML = `<tr><th scope="col">#</th><th scope="col">Model / configuration</th>${columns.map(m => `<th scope="col" aria-sort="${state.sort===m.key ? (state.sortDir==='desc'?'descending':'ascending') : 'none'}"><button type="button" data-sort="${esc(m.key)}" class="${state.sort===m.key?'sorted':''}" title="${esc(m.description)}"><span>${esc(m.short)} ${m.direction==='up'?'↑':'↓'}</span><small>${esc(m.unit)}</small></button></th>`).join('')}</tr>`;
    const globalRanks = new Map(sortedRows().filter(r => !r.reference).map((r,i) => [r.id,i+1]));
    const best = Object.fromEntries(columns.map(m => [m.key,(m.direction==='up'?Math.max:Math.min)(...getRows().filter(r=>!r.reference).map(r=>r.metrics[m.key]))]));
    const rows = filteredRows();
    $('#table-body').innerHTML = rows.length ? rows.map(r => `<tr class="${r.featured?'featured ':''}${r.reference?'reference':''}"><td class="${r.reference?'ref-rank':''}"><span class="table-rank rank-${r.reference?'ref':globalRanks.get(r.id)}">${r.reference?'REF':String(globalRanks.get(r.id)).padStart(2,'0')}</span></td><td><button type="button" class="model-name" data-model="${esc(r.id)}"><span>${esc(r.name)}${r.featured?'<span class="inline-tag">NEW LEADER</span>':''}</span><small>${esc(r.provider)}${r.run_label?` · ${esc(r.run_label)}`:''}</small></button></td>${columns.map(m => {
      const value = r.metrics[m.key];
      const title = r.coverage?.[m.key] != null ? `n=${r.coverage[m.key]} / ${state.board.instances}; open model details for source information` : m.description;
      if(m.key==='score') return `<td title="${esc(title)}"><div class="score-cell"><span class="score-track" aria-hidden="true"><i style="width:${Math.max(0,Math.min(100,value))}%"></i></span><span>${format(value,m.key)}</span></div></td>`;
      return `<td title="${esc(title)}"><span class="number ${!r.reference && value===best[m.key]?'best':''}">${format(value,m.key,m.unit==='%')}</span></td>`;
    }).join('')}</tr>`).join('') : `<tr><td class="empty-table" colspan="${columns.length+2}">No models match this filter. Try another search or provider.</td></tr>`;
    $$('#table-head button[data-sort]').forEach(b=>b.addEventListener('click',()=>{
      if(state.sort===b.dataset.sort)state.sortDir=state.sortDir==='desc'?'asc':'desc';
      else{state.sort=b.dataset.sort;state.sortDir=metric(state.sort).direction==='up'?'desc':'asc';}
      renderTable();
    }));
    $$('#table-body button[data-model]').forEach(b=>b.addEventListener('click',()=>openModel(b.dataset.model)));
    $('#board-summary').textContent = `${rows.filter(r=>!r.reference).length} configurations${state.snapshot==='paper'?' + reference':''}`;
    renderChart();
  }
  // Model logos for the podium (assets/logos, from @lobehub/icons-static-svg, MIT); the letter
  // mark stays as the fallback for providers without one.
  const providerLogos = {Anthropic:'claude-color',OpenAI:'openai',Google:'gemini-color','Moonshot AI':'kimi-color',Moonshot:'kimi-color',DeepSeek:'deepseek-color',Alibaba:'qwen-color','Z.ai':'zhipu-color',Zhipu:'zhipu-color'};
  function modelLogo(row) {
    const file = providerLogos[row.provider];
    return file ? `<img src="${esc(path(`assets/logos/${file}.svg`))}" alt="" width="56" height="56" decoding="async">` : esc(modelMark(row));
  }
  function modelMark(row) {
    const marks = {Anthropic:'A',OpenAI:'O',Google:'G',Moonshot:'K',DeepSeek:'D',Alibaba:'Q',Zhipu:'Z',Reference:'R'};
    return marks[row.provider] || row.name.replace(/^(Claude |GPT-)/,'').slice(0,1);
  }
  function renderChart() {
    const rows = filteredRows().sort((a,b)=>(a.reference?-1:b.reference?1:b.metrics[state.chart]-a.metrics[state.chart]));
    const contenders = rows.filter(r=>!r.reference);
    const globalRanks = new Map([...getRows()].filter(r=>!r.reference).sort((a,b)=>b.metrics[state.chart]-a.metrics[state.chart]).map((r,i)=>[r.id,i+1]));
    const leader = contenders[0];
    const isFiltered = state.provider!=='All' || state.search!=='';
    const colors = {Anthropic:'#dfb899',OpenAI:'#8acbb3',Google:'#95b8f5',Moonshot:'#c1a7ec',DeepSeek:'#93b6ec',Alibaba:'#edb478',Zhipu:'#b5abea'};
    $('#chart-title').textContent = labels[state.chart];
    $('#ranking-context').textContent = `${isFiltered?'Filtered models':'All models'} · higher is better`;
    $('#rank-chart').setAttribute('aria-label',`${labels[state.chart]} by model on a zero to one hundred scale. ${state.snapshot==='current'?'Supplied snapshot.':'Published paper results.'}`);
    // Podium in the classic order (#2 · #1 · #3): the leader stands raised in the middle on a
    // plinth. The full ranking with score bars follows below, as before.
    const unit=state.chart==='score'?'points':'pp';
    const podiumCard=(r,i)=>{
      const gap=leader.metrics[state.chart]-r.metrics[state.chart];
      return `<button type="button" class="podium-card podium-${i+1} ${i===0?'podium-leader':''}" data-rank-model="${esc(r.id)}" aria-label="Rank ${globalRanks.get(r.id)}, ${esc(r.name)}, ${format(r.metrics[state.chart],state.chart,true)}. Open details.">
        <span class="podium-avatar"><span class="provider-mark">${modelLogo(r)}</span>${(()=>{const rank=globalRanks.get(r.id),medal={1:'🥇',2:'🥈',3:'🥉'}[rank];return medal?`<span class="podium-badge is-medal" aria-hidden="true">${medal}</span>`:`<span class="podium-badge">${rank}</span>`;})()}</span>
        <span class="podium-provider">${esc(r.provider)}</span><strong class="podium-name">${esc(r.name)}</strong>
        <span class="podium-score">${format(r.metrics[state.chart],state.chart)}<small>${state.chart==='score'?'/ 100':'%'}</small></span>
        <span class="podium-note">${i===0?(contenders[1]?`+${format(r.metrics[state.chart]-contenders[1].metrics[state.chart],state.chart)} ${unit} ahead`:'Highest in view'):`−${format(gap,state.chart)} ${unit} from lead`}</span>
      </button>`;
    };
    const top3=contenders.slice(0,3), order=[1,0,2].filter(i=>top3[i]);
    $('#rank-podium').innerHTML = order.map(i=>podiumCard(top3[i],i)).join('');
    $('#rank-chart').innerHTML = rows.length ? rows.map((r,i)=>`<button type="button" class="chart-row ${r.id===leader?.id?'ladder-leader':''} ${r.reference?'reference':''}" data-rank-model="${esc(r.id)}" style="--row-color:${colors[r.provider]||'#b9acd6'};--row-order:${i}"><span class="chart-rank">${r.reference?'REF':String(globalRanks.get(r.id)).padStart(2,'0')}</span><span class="chart-name">${esc(r.name)}${r.featured?'<span class="ladder-new">NEW</span>':''}</span><span class="chart-lane"><span class="chart-bar" style="width:${Math.max(0,Math.min(100,r.metrics[state.chart]))}%" aria-hidden="true"><i></i></span></span><span class="chart-value">${format(r.metrics[state.chart],state.chart,state.chart!=='score')}</span><span class="chart-open" aria-hidden="true">↗</span></button>`).join('') : '<p class="ranking-empty">No models match this filter. Try another search or provider.</p>';
    $$('[data-rank-model]').forEach(b=>b.addEventListener('click',()=>openModel(b.dataset.rankModel)));
  }
  function openModel(id) {
    const row=getRows().find(r=>r.id===id);if(!row)return;
    const config=row.configuration?Object.entries(row.configuration).map(([k,v])=>`${k}: ${v??'not supplied'}`).join(' · '):'Full agent settings and a complete-manifest scoring receipt were not supplied.';
    $('#model-dialog-content').innerHTML=`<div class="dialog-head"><span class="eyebrow">${esc(row.provider)} · ${state.snapshot==='current'?'RESULT SNAPSHOT':'PUBLISHED PAPER'}</span><h2>${esc(row.name)}</h2><p>${row.featured?'Leading overall score in this result set.':row.reference?'Built with source information and human assistance; a separate reference row.':'Component metrics help explain what the aggregate score captures.'}</p></div><table class="dialog-metrics"><thead><tr><th>Metric</th><th>Value</th><th>Coverage</th></tr></thead><tbody>${getMetrics().map(m=>`<tr><td>${esc(m.label)}</td><td>${format(row.metrics[m.key],m.key,m.unit==='%')} ${!['%','0–1','0–100'].includes(m.unit)?esc(m.unit):''}</td><td>${row.coverage?.[m.key]!=null?`n=${row.coverage[m.key]} / ${state.board.instances}`:'Not supplied'}</td></tr>`).join('')}</tbody></table><p class="dialog-source">${state.snapshot==='current'?`Recorded: ${esc(row.source?.date||state.board.snapshot_date)}. Source: ${esc(row.source?.name||'supplied evaluation table')}. ${row.run_label?`Run label: ${esc(row.run_label)}. `:''}${esc(config)}`:`Source: <a href="${esc(state.archive.source_url)}" target="_blank" rel="noopener">published Video2World project page</a>. This archive is separate from the newer supplied snapshot.`}</p><div class="dialog-actions">${row.featured?`<a class="button primary" href="${path(`updates/${row.id}.html`)}">Read model update ↗</a>`:''}<button class="button secondary" id="download-model-json" type="button">Download row ↓</button></div>`;
    $('#download-model-json').addEventListener('click',()=>download(JSON.stringify({snapshot:state.snapshot==='current'?state.board.snapshot_id:state.archive.snapshot_id,...row},null,2),`${row.id}-${state.snapshot}.json`,'application/json'));
    const dialog=$('#model-dialog');if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
    history.replaceState(null,'',`${location.pathname}${location.search}#model=${encodeURIComponent(id)}`);
  }
  // Dumbbell chart: one row per metric on its own absolute scale; dark dot = model A, taupe = model B.
  function renderComparison() {
    const a=getRows().find(r=>r.id===$('#compare-a').value),b=getRows().find(r=>r.id===$('#compare-b').value);if(!a||!b)return;
    const scale={score:[100,'0','100'],success:[100,'0%','100%'],progress:[1,'0','1']};
    const edge=p=>p<8?'at-start':p>92?'at-end':'';
    $('#compare-results').innerHTML=`<div class="db-legend"><span><i class="db-dot is-a"></i>${esc(a.name)}</span><span><i class="db-dot is-b"></i>${esc(b.name)}</span></div>${['score','success','progress'].map(k=>{
      const m=metric(k),[max,lo,hi]=scale[k],va=a.metrics[k],vb=b.metrics[k],pa=Math.max(0,Math.min(100,va/max*100)),pb=Math.max(0,Math.min(100,vb/max*100)),delta=va-vb;
      return `<div class="db-row"><span class="db-label">${esc(m.label)}</span><div class="db-track"><span class="db-axis"></span><span class="db-link" style="left:${Math.min(pa,pb)}%;width:${Math.abs(pa-pb)}%"></span><span class="db-point is-b" style="left:${pb}%"><b class="${edge(pb)}">${format(vb,k,k==='success')}</b></span><span class="db-point is-a" style="left:${pa}%"><b class="${edge(pa)}">${format(va,k,k==='success')}</b></span><span class="db-tick is-min">${lo}</span><span class="db-tick is-max">${hi}</span></div><span class="db-delta ${delta>=0?'is-up':'is-down'}">${delta>0?'+':''}${delta.toFixed(k==='success'?1:2)}${k==='success'?' pp':''}</span></div>`;
    }).join('')}`;
  }
  function initializeComparison() {
    const rows=getRows().filter(r=>!r.reference);
    const options=rows.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('');
    $('#compare-a').innerHTML=options;$('#compare-b').innerHTML=options;
    $('#compare-a').value=rows.find(r=>r.featured)?.id||rows[0]?.id;
    $('#compare-b').value=rows.find(r=>r.id==='fable-5-1' && r.id!==$('#compare-a').value)?.id||rows.find(r=>r.id!==$('#compare-a').value)?.id;
    renderComparison();
  }
  function setSnapshot(snapshot) {
    state.snapshot=snapshot;state.sort='score';state.sortDir='desc';
    ['current','paper'].forEach(s=>{const b=$(`#snapshot-${s}`);b.classList.toggle('active',s===snapshot);b.setAttribute('aria-pressed',String(s===snapshot));});
    $('#snapshot-date').textContent=snapshot==='current'?`Snapshot · ${state.board.snapshot_date}`:'Archive · published project page';
    if($('#snapshot-note'))$('#snapshot-note').textContent=snapshot==='current'?'Recorded results and per-metric coverage. Select a model for counts and source details.':'Published-paper values are shown separately. The newer snapshot uses different reported values and diagnostic labels.';
    renderTable();initializeComparison();
  }
  function exportCSV() {
    const columns=getMetrics(),rows=getRows();
    const quote=v=>`"${String(v??'').replace(/"/g,'""')}"`;
    const header=['snapshot_id','model','provider',...columns.flatMap(m=>[m.key,`n_${m.key}`])];
    const lines=[header,...rows.map(r=>[state.snapshot==='current'?state.board.snapshot_id:state.archive.snapshot_id,r.name,r.provider,...columns.flatMap(m=>[r.metrics[m.key],r.coverage?.[m.key]??''])])];
    download(lines.map(row=>row.map(quote).join(',')).join('\r\n')+'\r\n',`video2world-${state.snapshot}-results.csv`,'text/csv;charset=utf-8');toast('Results exported with snapshot and coverage');
  }
  function caseMedia(c,id){return id==='har'?c.reference:c.models.find(m=>m.id===id);}
  function caseOptions(c, selected) {
    return [c.reference,...c.models.filter(m=>m.video)].map(m=>`<option value="${esc(m.id)}" ${m.id===selected?'selected':''}>${esc(m.name)}</option>`).join('');
  }
  function renderCaseColumn(m, isSource=false) {
    return `<div class="case-video-column"><div class="case-col-top"><span class="col-identity">${esc(m.name)}</span><span class="outcome ${isSource?'source':m.success?'':'failure'}">${isSource?'OBSERVED':m.success?'✓ Success':m.progress!=null?`× Progress ${Number(m.progress).toFixed(2)}`:'× Failed'}</span></div><div class="case-video-frame"><video class="case-video" src="${esc(path(m.video))}" poster="${esc(path(m.poster))}" muted playsinline loop preload="metadata" controls aria-label="${esc(m.name)} case video"></video></div><div class="case-video-caption">${esc(isSource?'The original demonstration provided to the coding agent.':m.description)}${!isSource?`<span>${[m.progress!=null?`Progress ${Number(m.progress).toFixed(2)}`:'',m.final?esc(m.final):''].filter(Boolean).join(' · ')}</span>`:''}</div></div>`;
  }
  function renderCase() {
    const c=state.cases.find(c=>c.id===state.caseId)||state.cases[0];if(!c)return;
    state.caseId=c.id;
    if(!caseMedia(c,state.caseA)?.video)state.caseA='opus5';
    if(!caseMedia(c,state.caseB)?.video)state.caseB='gpt6astra';
    $('#case-tabs').innerHTML=state.cases.map(c=>`<button type="button" role="tab" id="tab-${esc(c.id)}" aria-controls="case-explorer" aria-selected="${c.id===state.caseId}" class="${c.id===state.caseId?'active':''}" data-case="${esc(c.id)}">${esc(c.title)}</button>`).join('');
    $('#case-explorer').setAttribute('role','tabpanel');$('#case-explorer').setAttribute('aria-labelledby',`tab-${c.id}`);
    $('#case-explorer').innerHTML=`<div class="case-summary"><div><h3>${esc(c.title)}</h3><p>${esc(c.description)}</p></div><div class="case-summary-controls"><label>Agent A<select id="case-model-a">${caseOptions(c,state.caseA)}</select></label><label>Agent B<select id="case-model-b">${caseOptions(c,state.caseB)}</select></label></div></div><div class="case-videos">${renderCaseColumn(c.source,true)}${renderCaseColumn(caseMedia(c,state.caseA))}${renderCaseColumn(caseMedia(c,state.caseB))}</div><div class="case-controls"><div><button type="button" id="case-play">Play together ▷</button><button type="button" id="case-pause">Pause Ⅱ</button><button type="button" id="case-reset">Restart ↺</button></div><span class="sync-note">Concurrent playback; clips are not temporally aligned.</span></div>`;
    $$('#case-tabs button').forEach(b=>b.addEventListener('click',()=>{pauseCases();state.caseId=b.dataset.case;renderCase();history.replaceState(null,'',`${location.pathname}${location.search}#case=${c.id===state.caseId?c.id:state.caseId}`);}));
    ['a','b'].forEach(which=>$(`#case-model-${which}`).addEventListener('change',e=>{pauseCases();state[which==='a'?'caseA':'caseB']=e.target.value;renderCase();}));
    $('#case-play').addEventListener('click',()=>{$$('.case-video').forEach(v=>v.play().catch(()=>{}));});
    $('#case-pause').addEventListener('click',pauseCases);
    $('#case-reset').addEventListener('click',()=>{$$('.case-video').forEach(v=>{v.pause();v.currentTime=0;});});
    bindVideoFallbacks();
  }
  function pauseCases(){$$('.case-video').forEach(v=>v.pause());}
  function bindVideoFallbacks() {
    $$('video').forEach(v=>{if(v.dataset.boundError)return;v.dataset.boundError='1';v.addEventListener('error',()=>{v.setAttribute('title','Video unavailable. The verified poster is shown.');});});
  }
  function citation(){return '@article{tang2026video2world,\n  title={Video2World: Benchmarking Coding Agents for Interactive World Modeling from Embodied Videos},\n  author={Tang, Jinzhou and Zhang, Zijun and Yang, Jing and others},\n  journal={arXiv preprint arXiv:2610.04432},\n  year={2026}\n}';}
  function commonEvents(){
    $('#cite-button')?.addEventListener('click',()=>copy(citation(),'Citation copied'));
    $('.dialog-close')?.addEventListener('click',()=>{const d=$('#model-dialog');if(d.close)d.close();else d.removeAttribute('open');});
    $('#model-dialog')?.addEventListener('close',()=>{if(location.hash.startsWith('#model='))history.replaceState(null,'',`${location.pathname}${location.search}`);});
    $('#model-dialog')?.addEventListener('click',e=>{if(e.target===$('#model-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)$$('video').forEach(v=>v.pause());});
    bindVideoFallbacks();
  }
  // Capability ladder: an isometric staircase under the hero title. Models are grouped into
  // (at most) four tiers, split at the largest gaps between neighbouring scores of the chosen
  // metric; the top step is Tier 1. No values are drawn; selecting a name opens its details.
  function tierGroups(metricKey, maxTiers = 4) {
    const rows = state.board.models.filter(r => !r.reference && Number.isFinite(r.metrics[metricKey]))
      .sort((a, b) => b.metrics[metricKey] - a.metrics[metricKey]);
    const k = Math.min(maxTiers, rows.length);
    const cuts = rows.slice(1).map((r, i) => ({ i: i + 1, gap: rows[i].metrics[metricKey] - r.metrics[metricKey] }))
      .sort((a, b) => b.gap - a.gap).slice(0, k - 1).map(c => c.i).sort((a, b) => a - b);
    return [0, ...cuts].map((start, t, all) => rows.slice(start, all[t + 1] ?? rows.length));
  }
  function renderLadder() {
    const figure = $('#tier-figure'); if (!figure) return;
    // Both rankings share one viewBox (the union of their extents), so switching metric keeps
    // the same scale and the same ground position instead of re-fitting the drawing.
    const views = ['score', 'success'].map(ladderDrawing);
    const box = views.reduce((u, v) => ({ x0: Math.min(u.x0, v.box.x0), x1: Math.max(u.x1, v.box.x1), y0: Math.min(u.y0, v.box.y0), y1: Math.max(u.y1, v.box.y1) }), { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity });
    const { svg, tiers } = views[state.ladder === 'success' ? 1 : 0];
    const m = 12, vw = box.x1 - box.x0 + 2 * m, vh = box.y1 - box.y0 + 2 * m;
    figure.innerHTML = `<svg class="tl-svg" viewBox="${(box.x0 - m).toFixed(0)} ${(box.y0 - m).toFixed(0)} ${vw.toFixed(0)} ${vh.toFixed(0)}" role="img" aria-label="Model tiers by ${esc(labels[state.ladder])}, best first: ${tiers.map((g, k) => `tier ${k + 1}, ${g.map(r => r.name).join(', ')}`).join('; ')}.">${svg}</svg>`;
    $('#tier-list').innerHTML = tiers.map((g, k) => `<li><span class="tiny-label">Tier ${k + 1}</span><span>${g.map(r => `<button type="button" data-tier-model="${esc(r.id)}">${esc(r.name)}</button>`).join('')}</span></li>`).join('');
    $$('[data-tier-model]').forEach(el => el.addEventListener('click', () => openModel(el.dataset.tierModel)));
    alignHeroToLadder();
  }
  // Line the hero's text column up with the drawing: its top with the top of the staircase (the
  // arrow tip), its bottom with the staircase's base. Measured, since the drawing scales.
  function alignHeroToLadder() {
    const copy = $('.hero-copy'), svg = $('.tl-svg');
    if (!copy || !svg || typeof svg.getScreenCTM !== 'function') return;
    copy.style.setProperty('--ladder-top', '0px'); copy.style.setProperty('--ladder-bottom', '0px');
    if (matchMedia('(max-width: 1100px)').matches) return; // stacked layout: nothing to align
    const ctm = svg.getScreenCTM(); if (!ctm) return;
    let y0 = Infinity, y1 = -Infinity;
    $$('.tl-svg .tl-step').forEach(g => { const b = g.getBBox(); y0 = Math.min(y0, b.y); y1 = Math.max(y1, b.y + b.height); });
    if (!Number.isFinite(y0)) return;
    const top = ctm.d * y0 + ctm.f, bottom = ctm.d * y1 + ctm.f, box = copy.getBoundingClientRect();
    copy.style.setProperty('--ladder-top', `${Math.max(0, top - box.top).toFixed(0)}px`);
    copy.style.setProperty('--ladder-bottom', `${Math.max(0, box.bottom - bottom).toFixed(0)}px`);
  }
  function ladderDrawing(metricKey) {
    const tiers = tierGroups(metricKey);
    const n = tiers.length;
    // Zig-zag staircase in the reference's direction: ground pad (bottom-left) → flight up-right
    // → landing (right) → flight up-left → landing (left) → flight up-right → summit (top).
    // Each tier starts on its landing (tag) and climbs one step per model, lowest score first;
    // the top tier stands on the summit. Names sit on the risers / summit floor in perspective.
    // World units are px: x, y on the ground (viewer at +x, +y), z up.
    const Wf = 230, Td = 54, Rh = 30, Ls = 150, C = Math.cos(Math.PI / 6);
    const P = (x, y, z) => [(x - y) * C, (x + y) * 0.5 - z];
    const box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    const grow = (x, y) => { box.x0 = Math.min(box.x0, x); box.x1 = Math.max(box.x1, x); box.y0 = Math.min(box.y0, y); box.y1 = Math.max(box.y1, y); };
    const pts = list => list.map(q => P(...q)).map(q => { grow(...q); return q.map(v => v.toFixed(1)).join(','); }).join(' ');
    const poly = (list, fill) => `<polygon points="${pts(list)}" style="fill:${fill};stroke:${fill}"/>`;
    // Light enough everywhere for the dark names to read without an outline; still darker going up.
    const tone = seg => `color-mix(in srgb, var(--warm-solid) ${n > 1 ? Math.round(6 + 40 * seg / (n - 1)) : 46}%, var(--warm-tint))`;
    const shade = (c, k) => `color-mix(in srgb, ${c}, var(--text) ${k}%)`;
    const WHITE = 'color-mix(in srgb, var(--surface) 55%, white)';
    const WALL = { x: 'color-mix(in srgb, var(--warm-tint) 70%, var(--surface-soft))', y: 'var(--surface-soft)' };
    const boxes = [];
    const add = b => (boxes.push(b), b);
    const nameAttrs = r => `data-tier-model="${esc(r.id)}"`;
    const fit = () => ''; // names may run past the step's edge; they stay in the riser's plane, so the perspective holds
    // Text in a vertical face: dir +1 runs along +x, −1 along −y (both read left → right on screen).
    const faceText = (x, y, dir, inner) => { const [ox, oy] = P(x, y, 0); return `<g transform="matrix(${C.toFixed(4)},${dir > 0 ? 0.5 : -0.5},0,1,${ox.toFixed(1)},${oy.toFixed(1)})">${inner}</g>`; };
    const tagSvg = (t, z) => `<rect class="tl-tag" x="0" y="${-z - 15}" width="82" height="30"/><text class="tl-tag-text" x="41" y="${-z + 5}">TIER ${t}</text>`;
    // The arrow: a ribbon centred on every flight (tail on the ground pad), turning with the
    // stairs and rising as an upright arrow on the summit. It is drawn under the names in a light
    // tone, so the names stay readable on top of it.
    const RIB = 'var(--ladder-arrow)', RIB_SIDE = shade('var(--ladder-arrow)', 12), RW = 45; // half width
    // Ribbon pieces are translucent (no stroke, so abutting pieces do not double up at the seams).
    const rib = (list, fill) => `<polygon class="tl-rib" points="${pts(list)}" style="fill:${fill}"/>`;
    const bandX = x1 => [x1 - Wf / 2 - RW, x1 - Wf / 2 + RW], bandY = y1 => [y1 - Wf / 2 - RW, y1 - Wf / 2 + RW];
    const segs = [...tiers].reverse(); // bottom tier first
    let z = 0, region = { x0: 0, x1: Wf, y0: 0, y1: 0 }, dir = 'y';
    const [pa, pb] = bandX(Wf);
    add({ x0: 0, x1: Wf, y0: 0, y1: 70, z: 0, top: tone(0), deco: () => faceText(14, 70, 1, tagSvg(n, -24)),
      trail: [[[pa, 0, 0], [pb, 0, 0], [pb, 66, 0], [(pa + pb) / 2, 36, 0], [pa, 66, 0]]] }); // notched tail
    segs.forEach((models, s) => {
      const t = n - s, last = s === n - 1, riserFill = shade(tone(s), dir === 'x' ? 16 : 9);
      const ink = s === 0 ? 'tl-ink-dark' : 'tl-ink-light'; // contrast with the steps behind
            if (last) { // summit: a block; the top tier stands on it, the arrow rises behind
        const S = dir === 'y' ? { x0: region.x0, x1: region.x0 + Wf, y0: region.y0 - Ls, y1: region.y0 } : { x0: region.x0 - Ls, x1: region.x0, y0: region.y0, y1: region.y0 + Wf };
        z += Rh;
        const sd = dir, sz = z;
        let trail, arrow;
        if (sd === 'y') {
          const [ra, rb] = bandX(S.x1), ya = S.y0 + 40, mid = (ra + rb) / 2;
          trail = [[[ra, S.y1, sz], [rb, S.y1, sz], [rb, ya, sz], [ra, ya, sz]]];
          arrow = (dy) => [[ra, 0], [rb, 0], [rb, 66], [mid + 90, 66], [mid, 150], [mid - 90, 66], [ra, 66]].map(([u, v]) => [u, ya + dy, sz + v]);
        } else {
          const [rc, rd] = bandY(S.y1), xa = S.x0 + 40, mid = (rc + rd) / 2;
          trail = [[[S.x1, rc, sz], [S.x1, rd, sz], [xa, rd, sz], [xa, rc, sz]]];
          arrow = (dx) => [[rc, 0], [rd, 0], [rd, 66], [mid + 90, 66], [mid, 150], [mid - 90, 66], [rc, 66]].map(([u, v]) => [xa + dx, u, sz + v]);
        }
        add({ ...S, z, top: tone(s), riser: dir, riserFill, trail, riserTrail: true });
        boxes.at(-1).deco = () => {
          // The arrow stands where the ribbon ends, behind the names; extruded so it reads as solid.
          const fr = arrow(8), bk = arrow(-8);
          // Opaque inside, translucent as one group, so its own back faces do not show through.
          const solid = `<g class="tl-rib-solid">${poly(bk, RIB_SIDE) + fr.map((_, k) => { const k2 = (k + 1) % fr.length; return poly([bk[k], bk[k2], fr[k2], fr[k]], RIB_SIDE); }).join('') + poly(fr, RIB)}</g>`;
          // Standing names, best at the front; later rows step back (drawn first so the front row overlaps).
          const cx = Wf / 2 - 16, base = -(sz + 3);
          const names = models.map((r, k) => faceText(S.x0 + 16, S.y1 - 60 - k * 40, 1, `<text class="tl-step-name tl-summit-name ${ink}" x="${cx}" text-anchor="middle" y="${base}" ${nameAttrs(r)}${fit(r.name, Wf - 30, 28)}>${esc(r.name)}</text>`)).reverse().join('');
          return faceText(S.x1, S.y1 - 12, -1, tagSvg(t, sz - 62)) + solid + names;
        };
        return;
      }
      // One step per model, climbing in `dir` (−y or −x); the riser of each step carries the name.
      const d = dir; // captured now: the text is drawn later, after `dir` has moved on
      models.slice().reverse().forEach((r, k) => {
        z += Rh;
        const b = d === 'y'
          ? { x0: region.x0, x1: region.x1, y0: region.y0 - Td * (k + 1), y1: region.y0 - Td * k }
          : { x0: region.x0 - Td * (k + 1), x1: region.x0 - Td * k, y0: region.y0, y1: region.y1 };
        // The name stands upright on the tread (like a podium), in a plane parallel to the riser.
        const label = `<text class="tl-step-name ${ink}" x="${Wf / 2 - 14}" text-anchor="middle" y="${-(z + 3)}" ${nameAttrs(r)}${fit(r.name, Wf - 28, 24)}>${esc(r.name)}</text>`;
        const trail = d === 'y'
          ? [[[bandX(b.x1)[0], b.y0, z], [bandX(b.x1)[1], b.y0, z], [bandX(b.x1)[1], b.y1, z], [bandX(b.x1)[0], b.y1, z]]]
          : [[[b.x0, bandY(b.y1)[0], z], [b.x1, bandY(b.y1)[0], z], [b.x1, bandY(b.y1)[1], z], [b.x0, bandY(b.y1)[1], z]]];
        add({ ...b, z, top: tone(s), riser: dir, riserFill, trail, riserTrail: true, deco: () => d === 'y' ? faceText(b.x0 + 14, (b.y0 + b.y1) / 2, 1, label) : faceText((b.x0 + b.x1) / 2, b.y1 - 14, -1, label) });
      });
      const m = models.length;
      if (s + 1 === n - 1) { // the flight of the second tier leads straight onto the summit
        region = d === 'y' ? { ...region, y0: region.y0 - m * Td } : { ...region, x0: region.x0 - m * Td };
        return;
      }
      // Landing for the next tier: a square turn; its exposed face carries the next tier's tag.
      z += Rh;
      const L = dir === 'y' ? { x0: region.x0, x1: region.x0 + Wf, y0: region.y0 - m * Td - Wf, y1: region.y0 - m * Td }
                            : { x0: region.x0 - m * Td - Wf, x1: region.x0 - m * Td, y0: region.y0, y1: region.y1 };
      const nextTone = tone(s + 1), lz = z;
      if (dir === 'y') { // landing on the right; next flight turns up-left (−x); tag on its right (+x) face
        const [la, lb] = bandX(L.x1), [lc, ld] = bandY(L.y1);
        const trail = [[[L.x0, lc, z], [lb, lc, z], [lb, L.y1, z], [la, L.y1, z], [la, ld, z], [L.x0, ld, z]]];
        add({ ...L, z, top: nextTone, riser: 'y', riserFill: shade(tone(s), 9), trail, riserTrail: true, deco: () => faceText(L.x1, L.y1 - 12, -1, tagSvg(t - 1, lz - 62)) });
        region = { x0: L.x0, x1: L.x1, y0: L.y0, y1: L.y1 }; dir = 'x';
      } else { // landing on the left; next flight turns up-right (−y); tag on its front (+y) face
        const [la, lb] = bandX(L.x1), [lc, ld] = bandY(L.y1);
        const trail = [[[la, L.y0, z], [lb, L.y0, z], [lb, lc, z], [L.x1, lc, z], [L.x1, ld, z], [la, ld, z]]];
        add({ ...L, z, top: nextTone, riser: 'x', riserFill: shade(tone(s), 16), trail, riserTrail: true, deco: () => faceText(L.x0 + 14, L.y1, 1, tagSvg(t - 1, lz - 62)) });
        region = { x0: L.x0, x1: L.x1, y0: L.y0, y1: L.y1 }; dir = 'y';
      }
    });
    // Paint back to front: a column is drawn after every column it can hide behind.
    const before = (a, b) => a.x1 <= b.x0 || a.y1 <= b.y0; // a lies behind b on one axis
    const order = [], left = boxes.slice();
    while (left.length) {
      const i = left.findIndex(a => !left.some(b => b !== a && before(b, a) && !before(a, b)));
      order.push(...left.splice(i < 0 ? 0 : i, 1));
    }
    const ground = boxes.map(b => `<polygon points="${[[b.x0 + 10, b.y0 - 4, 0], [b.x1 + 40, b.y0 - 4, 0], [b.x1 + 40, b.y1 + 30, 0], [b.x0 + 10, b.y1 + 30, 0]].map(q => P(...q).map(v => v.toFixed(1)).join(',')).join(' ')}"/>`).join('');
    let svg = `<g class="tl-shadow">${ground}</g>`;
    order.forEach((b, i) => {
      const { x0, x1, y0, y1, z: h } = b;
      let g = '';
      if (h > 0) for (const axis of ['x', 'y']) {
        const face = (a, z0, z1, fill) => a === 'x'
          ? poly([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], fill)
          : poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], fill);
        if (b.riser === axis) g += face(axis, 0, Math.max(0, h - Rh), WALL[axis]) + face(axis, Math.max(0, h - Rh), h, b.riserFill);
        else g += face(axis, 0, h, WALL[axis]);
      }
      g += poly([[x0, y0, h], [x1, y0, h], [x1, y1, h], [x0, y1, h]], b.top);
      if (b.riserTrail) { // the ribbon drops down this box's riser
        const lo = Math.max(0, h - Rh);
        g += b.riser === 'y'
          ? rib([[bandX(x1)[0], y1, lo], [bandX(x1)[1], y1, lo], [bandX(x1)[1], y1, h], [bandX(x1)[0], y1, h]], RIB_SIDE)
          : rib([[x1, bandY(y1)[0], lo], [x1, bandY(y1)[1], lo], [x1, bandY(y1)[1], h], [x1, bandY(y1)[0], h]], RIB_SIDE);
      }
      for (const piece of b.trail || []) g += rib(piece, RIB);
      if (b.deco) g += b.deco();
      // Entrance in climbing order (boxes are created bottom → top), not in paint order.
      svg += `<g class="tl-step" style="--i:${boxes.indexOf(b)}">${g}</g>`;
    });
    return { svg, box, tiers };
  }
  function initLadder() {
    if (!$('#tier-figure')) return;
    $$('[data-tier-metric]').forEach(btn => btn.addEventListener('click', () => {
      state.ladder = btn.dataset.tierMetric;
      $$('[data-tier-metric]').forEach(x => { x.classList.toggle('active', x === btn); x.setAttribute('aria-pressed', String(x === btn)); });
      renderLadder();
    }));
    matchMedia('(max-width: 760px)').addEventListener?.('change', renderLadder);
    let resizeTimer; globalThis.addEventListener?.('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(alignHeroToLadder, 120); });
    document.fonts?.ready?.then(alignHeroToLadder); // the title's size can shift once fonts settle
    renderLadder();
  }
  // Homepage case explorer: verified Opus 5.5 cases with the baseline on the same source video.
  // Homepage teaser: one featured verified case (source / Opus 5.5 / baseline); the full set and
  // the per-case reading live on the Opus 5.5 page.
  async function initVerifiedCases(){
    if(!$('#opus-case-explorer'))return;
    const collection=await fetchJSON('data/opus-5-5-cases.json');const list=collection.cases||[];
    if(!list.length){const sec=$('#cases');if(sec)sec.hidden=true;return;}
    const opus=state.board.models.find(m=>m.id==='opus-5-5');
    const c=list.find(x=>x.id===collection.featured_case)||list[0];
    if($('#opus-case-tabs'))$('#opus-case-tabs').hidden=true;
    $('#opus-case-explorer').innerHTML=`<div class="case-summary"><div><h3>${esc(c.title)}</h3><p>${esc(c.analysis||c.description)}</p></div><span class="outline-tag">${esc(c.dataset||c.family)}</span></div><div class="case-videos">${renderCaseColumn({...c.source,name:'Source video'},true)}${renderCaseColumn({...c.model,name:opus?.name||'Claude Opus 5.5'})}${c.baseline?renderCaseColumn(c.baseline):''}</div><div class="case-controls"><div><button type="button" data-opus-play>Play together ▷</button><button type="button" data-opus-reset>Restart ↺</button></div><a class="button secondary" href="${path('updates/opus-5-5.html')}#model-update-cases">See all ${list.length} cases on the Opus 5.5 page <span>→</span></a></div>`;
    $('[data-opus-play]').addEventListener('click',()=>$$('#opus-case-explorer video').forEach(v=>v.play().catch(()=>{})));
    $('[data-opus-reset]').addEventListener('click',()=>$$('#opus-case-explorer video').forEach(v=>{v.pause();v.currentTime=0;}));
    bindVideoFallbacks();
  }
  function initHome(){
    renderProviders();renderTable();initializeComparison();if($('#case-tabs'))renderCase();renderLatest();initLadder();initVerifiedCases().catch(e=>console.error(e));
    $('#model-search').addEventListener('input',e=>{state.search=e.target.value;renderTable();});
    $('#snapshot-current')?.addEventListener('click',()=>setSnapshot('current'));$('#snapshot-paper')?.addEventListener('click',()=>setSnapshot('paper'));
    const viewNotes = {key:'',Geometry:'Does the initialized scene match the observed one? Scene, object shape and size.',Dynamics:'When it runs, does the object move as in the video? Terminal translation and rotation.',Functionality:'Does the task actually get done? Task success and stage progress.',all:'Every reported metric, including fixed-reference diagnostics and build rate.'};
    $$('[data-metric-view]').forEach(b=>b.addEventListener('click',()=>{
      state.metricView=b.dataset.metricView;state.detail=state.metricView==='all';
      $$('[data-metric-view]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});
      if($('#metric-view-note'))$('#metric-view-note').textContent=viewNotes[state.metricView]||'';
      // keep the sort on a visible column; otherwise fall back to V2WScore
      const visible=state.metricView==='all'||state.metricView==='key'?null:getMetrics().filter(m=>m.key==='score'||m.group===state.metricView).map(m=>m.key);
      if(state.metricView==='key'&&!compactKeys.includes(state.sort)||visible&&!visible.includes(state.sort)){state.sort='score';state.sortDir='desc';}
      renderTable();
    }));
    $('#export-csv').addEventListener('click',exportCSV);
    $$('[data-chart]').forEach(b=>b.addEventListener('click',()=>{state.chart=b.dataset.chart;$$('[data-chart]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderChart();}));
    $('#compare-a').addEventListener('change',renderComparison);$('#compare-b').addEventListener('change',renderComparison);
    let heroPaused=false;$('#hero-play')?.addEventListener('click',()=>{heroPaused=!heroPaused;$$('.hero-video-grid video').forEach(v=>heroPaused?v.pause():v.play().catch(()=>{}));$('#hero-play').textContent=heroPaused?'▷':'Ⅱ';$('#hero-play').setAttribute('aria-label',heroPaused?'Play hero videos':'Pause hero videos');});
    if($('#hero-play')&&matchMedia('(prefers-reduced-motion: reduce)').matches){heroPaused=true;$$('.hero-video-grid video').forEach(v=>v.pause());$('#hero-play').textContent='▷';$('#hero-play').setAttribute('aria-label','Play hero videos');}
    if($('#case-tabs')&&location.hash.startsWith('#case=')){const params=new URLSearchParams(location.hash.slice(1));state.caseId=params.get('case')||state.caseId;state.caseA=params.get('a')||state.caseA;state.caseB=params.get('b')||state.caseB;renderCase();$('#cases').scrollIntoView();}
    if(location.hash.startsWith('#model='))openModel(decodeURIComponent(location.hash.slice(7)));
  }
  function renderLatest(){
    const best=[...state.board.models].sort((a,b)=>b.metrics.score-a.metrics.score)[0];
    const second=[...state.board.models].filter(m=>m.id!==best.id).sort((a,b)=>b.metrics.score-a.metrics.score)[0];
    $('#release-title').textContent=best.name;
    const highlight=$('.release-highlight');
    highlight.querySelectorAll('a').forEach(a=>a.href=path(`updates/${best.id}.html`));
    const values=highlight.querySelectorAll('.metric-value');
    values[0].textContent=format(best.metrics.score,'score');values[1].innerHTML=`${format(best.metrics.success,'success')}<span>%</span>`;
    const delta=best.metrics.success-second.metrics.success;values[2].innerHTML=`${delta>0?'+':''}${delta.toFixed(1)}<span>pp</span>`;
    highlight.querySelectorAll('.metric-name')[2].textContent=`vs. ${second.name.replace(/^Claude /,'')}`;
    const count=$$('.benchmark-stats dt')[2];if(count)count.textContent=state.board.models.length;
    $('#snapshot-date').textContent=`Snapshot · ${new Date(`${state.board.snapshot_date}T00:00:00Z`).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'})}`;
    renderNews();renderCampaign();
  }
  function renderNews(){
    const published=state.news.entries.filter(n=>n.status==='published').sort((a,b)=>b.date.localeCompare(a.date));
    const grid=$('.updates-grid');
    if(grid)grid.innerHTML=published.map(n=>`<a href="${path(n.href)}" class="update-card featured-update"><div class="update-top"><span class="release-tag">${n.kind==='roundup'?'FRONTIER COMPARISON':'MODEL RESULT'}</span><span>${esc(n.date_label||'Published')} · ${esc(n.date)}</span></div><h3>${esc(n.title)}</h3><p>${esc(n.summary)}</p><div class="update-bottom"><span>Read the news</span><span>↗</span></div></a>`).join('')+state.board.pending_models.map(m=>`<div class="update-card upcoming-update"><div class="update-top"><span class="testing-tag"><span class="status-dot"></span>TESTING</span><span>${esc(m.provider)}</span></div><h3>${esc(m.name)}</h3><p>Part of our next frontier-model comparison. Results and case evidence will appear after verification.</p><div class="update-bottom"><span>Results pending</span><span class="three-dots">···</span></div></div>`).join('');
    const summary=$('#nav-news-summary');if(summary&&published[0])summary.innerHTML=`<span class="news-nav-kicker">LATEST RESULT</span><a href="${path(published[0].href)}">${esc(published[0].title)} <span>↗</span></a><a class="news-nav-all" href="${path('news/index.html')}">All news & testing progress →</a>`;
  }
  function renderCampaign(){
    const target=$('#campaign-models');if(!target)return;
    const campaign=state.news.campaign;
    $('#campaign-title').textContent=campaign.title;
    const rows=campaign.model_ids.map(id=>state.board.models.find(m=>m.id===id)||state.board.pending_models.find(m=>m.id===id)).filter(Boolean);
    const complete=rows.filter(r=>r.metrics!=null).length;
    $('#campaign-status').textContent=`${complete} of ${campaign.model_ids.length} results available`;
    target.innerHTML=rows.map(r=>r.metrics?`<a class="campaign-model complete" href="${path(`updates/${r.id}.html`)}"><span>${esc(r.provider)}</span><strong>${esc(r.name)}</strong><small>✓ Result available · ${format(r.metrics.success,'success',true)} success</small></a>`:`<div class="campaign-model"><span>${esc(r.provider)}</span><strong>${esc(r.name)}</strong><small><i class="status-dot"></i> Testing · scores pending</small></div>`).join('');
    const message=$('#campaign-message');if(message)message.textContent=complete===campaign.model_ids.length?'All four model results are available. Explore the leaderboard and the verified case evidence.':'The joint comparison will follow after all four results are verified. Current scores remain available below.';
  }

  // Model update pages: one verified case at a time, chosen with pill buttons (the homepage shows a
  // single featured case and links here). #case-N selects a case directly.
  function renderCaseSwitcher(root,collection,modelName,kicker){
    const list=collection.cases||[];if(!root||!list.length)return;
    const sel=collection.selection;
    const intro=sel?`<p class="case-selection">${esc(`Of the ${sel.common_cases} cases evaluated for both models, ${sel.matching_cases} are completed by ${modelName} and failed by ${sel.baseline_model} on the same source video. These ${sel.selected_cases} cover different task families. Outcomes are the formal task-success judgments.`)}</p>`:'';
    root.innerHTML=`<span class="eyebrow section-index">${esc(kicker)}</span><h2>Inspect the new model's execution.</h2>${collection.intro?`<p class="case-lead">${esc(collection.intro)}</p>`:''}${intro}<div class="case-tabs" role="tablist" aria-label="Choose a case">${list.map((c,i)=>`<button type="button" role="tab" data-case-index="${i}" aria-selected="false">${esc(c.title)}</button>`).join('')}</div><div class="case-explorer" id="model-case-view" role="tabpanel"></div>`;
    const show=i=>{
      const c=list[i];
      root.querySelectorAll('[data-case-index]').forEach(b=>{const on=+b.dataset.caseIndex===i;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});
      root.querySelectorAll('video').forEach(v=>v.pause());
      $('#model-case-view').innerHTML=`<div class="case-summary"><div><span class="eyebrow section-index">${String(i+1).padStart(2,'0')} / ${String(list.length).padStart(2,'0')}</span><h3>${esc(c.title)}</h3><p>${esc(c.description)}</p></div><span class="outline-tag">${esc(c.dataset||c.family)}</span></div><div class="case-videos">${renderCaseColumn({...c.source,name:'Source video'},true)}${renderCaseColumn({...c.model,name:modelName})}${c.baseline?renderCaseColumn(c.baseline):''}</div>${c.analysis?`<p class="case-analysis">${esc(c.analysis)}</p>`:''}<div class="case-controls"><div><button type="button" data-case-play>Play together ▷</button><button type="button" data-case-reset>Restart ↺</button></div><span class="sync-note">Clips play side by side; they are not time-aligned.</span></div>`;
      $('[data-case-play]').addEventListener('click',()=>$$('#model-case-view video').forEach(v=>v.play().catch(()=>{})));
      $('[data-case-reset]').addEventListener('click',()=>$$('#model-case-view video').forEach(v=>{v.pause();v.currentTime=0;}));
      bindVideoFallbacks();
    };
    root.querySelectorAll('[data-case-index]').forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.caseIndex;show(i);history.replaceState(null,'',`${location.pathname}${location.search}#case-${i+1}`);}));
    const m=/^#case-(\d+)$/.exec(location.hash||'');const start=m?Math.min(list.length,Math.max(1,+m[1]))-1:0;
    show(start);
    if(m||location.hash==='#model-update-cases')root.scrollIntoView?.();
  }
  // Numbers inside page copy come from leaderboard.json:
  //   data-v="model:metric"            the formatted value (with % for percentage metrics)
  //   data-diff="modelA:modelB:metric" A − B, signed (pp for percentages)
  //   data-ratio="modelA:modelB:metric" A ÷ B, as "2.56×"
  //   #success-bars[data-models]       the task-success bar chart, in the listed order
  function bindNumbers(){
    const row=id=>state.board.models.find(m=>m.id===id);
    const val=(id,k)=>row(id)?.metrics?.[k];
    $$('[data-v]').forEach(el=>{const [id,k]=el.dataset.v.split(':');const v=val(id,k);if(v!=null)el.textContent=format(v,k,metric(k)?.unit==='%');});
    $$('[data-diff]').forEach(el=>{const [a,b,k]=el.dataset.diff.split(':');const d=val(a,k)-val(b,k);if(Number.isFinite(d))el.textContent=`${d>0?'+':''}${d.toFixed(metric(k)?.unit==='%'?1:2)}${metric(k)?.unit==='%'?' pp':''}`;});
    $$('[data-ratio]').forEach(el=>{const [a,b,k]=el.dataset.ratio.split(':');const r=val(a,k)/val(b,k);if(Number.isFinite(r))el.textContent=`${r.toFixed(2)}×`;});
    const bars=$('#success-bars');
    if(bars){
      const ids=bars.dataset.models.split(':'),vals=ids.map(id=>val(id,'success')),top=Math.ceil(Math.max(...vals)/5)*5+5;
      const lead=ids[vals.indexOf(Math.max(...vals))];
      bars.querySelector('.result-bars').innerHTML=ids.map((id,i)=>`<div class="result-bar-row${id===lead?' result-winner':''}"><span>${esc(row(id).name.replace(/^Claude /,''))}</span><span class="result-bar-lane"><i class="result-bar" style="width:${(vals[i]/top*100).toFixed(1)}%"></i></span><b>${format(vals[i],'success',true)}</b></div>`).join('')+`<div class="result-bar-scale"><span>0%</span><span>${top}%</span></div>`;
      bars.setAttribute('aria-label',`Task success: ${ids.map((id,i)=>`${row(id).name}, ${format(vals[i],'success',true)}`).join('; ')}.`);
    }
  }
  async function initUpdate(){
    bindNumbers();
    const opus=state.board.models.find(m=>m.id==='opus-5-5');
    $('#model-results-body').innerHTML=['opus-5-5','fable-5-1','gpt-6-astra','opus-5'].map(id=>state.board.models.find(m=>m.id===id)).map(r=>`<tr class="${r.featured?'featured':''}"><td>${esc(r.name)}</td><td>${format(r.metrics.score,'score')}</td><td>${format(r.metrics.success,'success',true)}</td><td>${format(r.metrics.progress,'progress')}</td></tr>`).join('');
    $('#share-result').addEventListener('click',()=>copy(location.href.split('#')[0],'Result link copied'));
    $('#download-result-card').addEventListener('click',()=>{const a=document.createElement('a');a.href=path('assets/opus-5-5-social.png');a.download='video2world-opus-5-5.png';a.click();});
    $('#download-snapshot').addEventListener('click',()=>download(JSON.stringify(state.board,null,2),'video2world-v2-snapshot.json','application/json'));
    const fable=state.board.models.find(m=>m.id==='fable-5-1');
    renderMatchup($('#matchup'),opus,fable);
    renderRadius(opus,fable,(await fetchJSON('data/opus-5-5-cases.json')).selection);
    renderDumbbell($('#rung-seeing'),opus,fable,['scene_cd','shape_cd','size_err','terminal_rot']);
    renderDumbbell($('#rung-doing'),opus,fable,['success','progress']);
    const collection=await fetchJSON('data/opus-5-5-cases.json');
    if($('#model-cases-status'))$('#model-cases-status').hidden=collection.cases?.length>0;
    if(collection.cases?.length){
      $('#model-update-cases').hidden=false;
      renderCaseSwitcher($('#model-update-cases'),collection,opus.name,'RUNG 2 · VERIFIED CASES');
      bindVideoFallbacks();
    }
    // Remaining failures (both models fail on the same video): shown once verified clips are supplied.
    if(collection.failure_cases?.length&&$('#failure-cases')){
      $('#failure-cases').hidden=false;
      renderCaseSwitcher($('#failure-cases'),{cases:collection.failure_cases,intro:collection.failure_intro},opus.name,'A REMAINING FAILURE');
      const h=$('#failure-cases h2');if(h)h.textContent='Where Opus 5.5 still fails.';
    }
  }
  // Hero matchup: the two models this page compares, each with logo, V2WScore and task success.
  function renderMatchup(root,a,b){
    if(!root||!a||!b)return;
    // Two overlapping circles (new model left, previous right); "vs" sits in the overlap.
    const side=(r,cls,tag='')=>`<div class="venn-text ${cls}">${tag}<span class="provider-mark">${modelLogo(r)}</span><span class="podium-provider">${esc(r.provider)}</span><strong>${esc(r.name)}</strong><span class="matchup-score">${format(r.metrics.score,'score')}<small>V2WScore</small></span><span class="matchup-sub">${format(r.metrics.success,'success',true)} task success</span></div>`;
    root.innerHTML=`<div class="venn"><span class="venn-circle is-new"></span><span class="venn-circle is-prev"></span>${side(a,'is-new','<span class="score-rank venn-rank">#1 OVERALL</span>')}${side(b,'is-prev')}<span class="venn-vs">vs</span></div>`;
  }
  // First screen: task success drawn as radius. Left half = previous model, right half = new model
  // with rings at 10 / 20 % and one dot per task that only the new model completes.
  // First screen: a split disc (left = previous model, right = new; radius = task success, soft
  // radial gradients) with an arc track around it. Each node on the arc is a core dot with an
  // outward half ring and one metric that is already on this page.
  // First screen: a split disc (left = previous model, right = new; radius = task success, soft
  // radial gradients) with a mirrored arc on each side carrying the same three metrics per model.
  function renderRadius(a,b,sel){
    const fig=$('#radius-figure');if(!fig||!a||!b)return;
    const R=210/30,cx=600,cy=330,ra=a.metrics.success*R,rb=b.metrics.success*R;
    const half=(r,side)=>`M${cx} ${cy-r} A${r} ${r} 0 0 ${side>0?1:0} ${cx} ${cy+r} Z`;
    const short=r=>esc(r.name.replace(/^Claude /,''));
    const keys=[['success','Task success',true],['score','V2WScore',false],['progress','Stage progress',false]];
    const angles=[-34,8,44],deg=Math.PI/180;
    const side=(r,radius,dir,cls)=>{ // dir +1 = right of the disc, -1 = left
      const AR=radius+78,pt=t=>{const o=(dir>0?t:180-t)*deg;return [cx+AR*Math.cos(o),cy+AR*Math.sin(o),o];};
      const [x0,y0]=pt(-74),[x1,y1]=pt(74);
      let g=`<path class="orbit-track" pathLength="1" d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${AR} ${AR} 0 0 ${dir>0?1:0} ${x1.toFixed(1)} ${y1.toFixed(1)}"/>`;
      keys.forEach(([k,label,big],i)=>{
        const [nx,ny]=pt(angles[i]);
        const tx=nx+dir*(big?40:34),anchor=dir>0?'start':'end';
        const val=k==='success'?`${format(r.metrics[k],k)}<tspan class="orbit-unit">%</tspan>`:format(r.metrics[k],k);
        g+=`<g class="orbit-node ${cls}${big?' is-big':''}" style="--i:${i}"><circle class="orbit-core" cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="${big?7:5.5}"/><text class="orbit-key" x="${tx.toFixed(1)}" y="${(ny-(big?30:22)).toFixed(1)}" text-anchor="${anchor}">${esc(label.toUpperCase())}</text><text class="orbit-val" x="${tx.toFixed(1)}" y="${(ny+(big?20:13)).toFixed(1)}" text-anchor="${anchor}">${val}</text></g>`;
      });
      return g;
    };
    fig.innerHTML=`<svg viewBox="70 20 1060 620" aria-hidden="true"><defs>
      <radialGradient id="rr-grad-prev" cx="${cx}" cy="${cy}" r="${rb}" gradientUnits="userSpaceOnUse"><stop offset="0" class="rr-prev-0"/><stop offset="0.65" class="rr-prev-1"/><stop offset="1" class="rr-prev-2"/></radialGradient>
      <radialGradient id="rr-grad-new" cx="${cx}" cy="${cy}" r="${ra}" gradientUnits="userSpaceOnUse"><stop offset="0" class="rr-new-0"/><stop offset="0.65" class="rr-new-1"/><stop offset="1" class="rr-new-2"/></radialGradient>
      <filter id="rr-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8"/></filter></defs>
      ${side(b,rb,-1,'is-prev')}${side(a,ra,1,'is-new')}
      <g filter="url(#rr-soft)"><path class="rr-half is-prev" style="transform-origin:${cx}px ${cy}px" d="${half(rb,-1)}" fill="url(#rr-grad-prev)"/><path class="rr-half is-new" style="transform-origin:${cx}px ${cy}px" d="${half(ra,1)}" fill="url(#rr-grad-new)"/></g>
      <text class="rr-name is-prev" x="${cx-rb*0.5}" y="${cy-6}"><tspan x="${cx-rb*0.5}">Claude</tspan><tspan x="${cx-rb*0.5}" dy="1.1em">${short(b)}</tspan></text>
      <text class="rr-name is-new" x="${cx+ra*0.5}" y="${cy-8}"><tspan x="${cx+ra*0.5}">Claude</tspan><tspan x="${cx+ra*0.5}" dy="1.1em">${short(a)}</tspan></text></svg>`;
    const lead=$('#radius-lead');
    if(lead&&sel?.matching_cases)lead.innerHTML=`On <b>${sel.matching_cases}</b> of the ${sel.common_cases} tasks both models attempted, ${esc(a.name)} completes the task and ${esc(b.name)} does not.`;
    // Start the entrance only now, so the figure and the headline play as one sequence.
    const hero=$('.radius-hero');if(hero)(globalThis.requestAnimationFrame||(f=>f()))(()=>hero.classList.add('is-ready'));
    const list=$('#orbit-list');
    if(list)list.innerHTML=`<li class="is-head"><span></span><span>${esc(b.name)}</span><span>${esc(a.name)}</span></li>`+keys.map(([k,label])=>`<li><span class="tiny-label">${esc(label)}</span><span>${format(b.metrics[k],k,k==='success')}</span><span>${format(a.metrics[k],k,k==='success')}</span></li>`).join('');
  }
  // Dumbbell rows for a fixed pair on chosen metrics; each metric on its own scale, arrows show
  // which direction is better and the difference is coloured by whether it favours model A.
  function renderDumbbell(root,a,b,keys){
    if(!root||!a||!b)return;
    // Each row zooms to a window around its two values (rounded to clean ticks) so the gap is
    // visible; the values are unchanged and the window's ends are labelled on every row.
    const niceStep=x=>{const p=Math.pow(10,Math.floor(Math.log10(x))),f=x/p;return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p;};
    const edge=p=>p<8?'at-start':p>92?'at-end':'';
    root.innerHTML=keys.map(k=>{
      const m=metric(k),va=a.metrics[k],vb=b.metrics[k];if(va==null||vb==null)return '';
      const cap=m.unit==='%'?100:m.unit==='0–1'?1:Infinity;
      const lo0=Math.min(va,vb),hi0=Math.max(va,vb),span=Math.max(hi0-lo0,hi0*0.12),step=niceStep(span*2.4/4);
      let lo=Math.max(0,Math.floor((lo0-span*0.7)/step)*step),hi=Math.min(cap,Math.ceil((hi0+span*0.7)/step)*step);
      if(hi<=lo)hi=lo+step;
      const pos=v=>Math.max(0,Math.min(100,(v-lo)/(hi-lo)*100)),pa=pos(va),pb=pos(vb);
      const dec=Math.max(0,-Math.floor(Math.log10(step)+1e-9));
      const unit=m.unit==='%'?'%':m.unit==='0–1'?'':` ${m.unit}`;
      const tick=v=>`${v.toFixed(dec)}${unit}`;
      const delta=va-vb,better=m.direction==='up'?delta>0:delta<0,flat=Math.abs(delta)<Math.max(hi0*0.01,1e-9);
      return `<div class="db-row"><span class="db-label">${esc(m.label)} <small>${m.direction==='up'?'↑':'↓'}</small></span><div class="db-track"><span class="db-axis"></span><span class="db-link" style="left:${Math.min(pa,pb)}%;width:${Math.abs(pa-pb)}%"></span><span class="db-point is-b" style="left:${pb}%"><b class="${edge(pb)}">${format(vb,k,m.unit==='%')}</b></span><span class="db-point is-a" style="left:${pa}%"><b class="${edge(pa)}">${format(va,k,m.unit==='%')}</b></span><span class="db-tick is-min">${tick(lo)}</span><span class="db-tick is-max">${tick(hi)}</span></div><span class="db-delta ${flat?'':better?'is-up':'is-down'}">${flat?'≈ level':`${delta>0?'+':''}${delta.toFixed(m.unit==='%'?1:2)}${m.unit==='%'?' pp':unit}`}</span></div>`;
    }).join('');
  }

  async function initGenericUpdate(){
    const id=document.body.dataset.model;
    const row=state.board.models.find(m=>m.id===id);if(!row)throw new Error('Model update has no matching result row');
    const update=state.board.updates.find(u=>u.model_id===id)||{};
    $('#generic-model-title').textContent=row.name;
    $('#generic-model-intro').textContent=`${row.name} records ${format(row.metrics.score,'score')} V2WScore and ${format(row.metrics.success,'success',true)} task success in this result set. Inspect the component metrics and supporting evidence below.`;
    $('#generic-score').innerHTML=`${format(row.metrics.score,'score')}<small>/ 100</small>`;
    $('#generic-success').textContent=format(row.metrics.success,'success',true);$('#generic-build').textContent=format(row.metrics.build,'build',true);
    $('#generic-date').textContent=`Result date · ${update.date||state.board.snapshot_date}`;
    const baselines=(update.compare_ids||[...state.board.models].filter(m=>m.id!==id).sort((a,b)=>b.metrics.score-a.metrics.score).slice(0,2).map(m=>m.id)).map(i=>state.board.models.find(m=>m.id===i)).filter(Boolean);
    $('#model-results-body').innerHTML=[row,...baselines].map(r=>`<tr class="${r.id===id?'featured':''}"><td>${esc(r.name)}</td><td>${format(r.metrics.score,'score')}</td><td>${format(r.metrics.success,'success',true)}</td><td>${format(r.metrics.progress,'progress')}</td></tr>`).join('');
    $('#generic-metric-coverage').innerHTML=state.board.metrics.map(m=>`<tr><td>${esc(m.label)}</td><td>${format(row.metrics[m.key],m.key,m.unit==='%')} ${!['%','0–1','0–100'].includes(m.unit)?esc(m.unit):''}</td><td>${row.coverage?.[m.key]!=null?`n=${row.coverage[m.key]} / ${state.board.instances}`:'Not supplied'}</td></tr>`).join('');
    $('#share-result').addEventListener('click',()=>copy(location.href.split('#')[0],'Result link copied'));
    $('#download-result-card').addEventListener('click',()=>{const a=document.createElement('a');a.href=path(`assets/${id}-social.png`);a.download=`video2world-${id}.png`;a.click();});
    $('#download-snapshot').addEventListener('click',()=>download(JSON.stringify({snapshot_id:state.board.snapshot_id,...row},null,2),`${id}-result.json`,'application/json'));
    const collection=await fetchJSON(`data/${id}-cases.json`);
    if(collection.cases?.length){
      $('#model-cases-status').hidden=true;$('#model-update-cases').hidden=false;
      renderCaseSwitcher($('#model-update-cases'),collection,row.name,'VERIFIED CASES');
      bindVideoFallbacks();
    }
  }
  async function main(){
    try {
      [state.board,state.archive,state.cases,state.news]=await Promise.all([fetchJSON('data/leaderboard.json'),fetchJSON('data/paper-results.json'),fetchJSON('data/cases.json'),fetchJSON('data/news.json')]);
      commonEvents();
      if(document.body.dataset.page==='home')initHome();else if(document.body.dataset.page==='opus'){await initUpdate();renderCampaign();}else if(document.body.dataset.page==='news'){renderNews();renderCampaign();}else if(document.body.dataset.page==='model')await initGenericUpdate();
      document.body.dataset.ready='true';
    } catch(error){
      console.error(error);const target=$('#table-body')||$('#model-results-body');if(target)target.innerHTML='<tr><td colspan="7" class="error-note">Results could not load. Please reload the page or download the supplied snapshot.</td></tr>';toast('Some data could not load. Please reload.');
      document.body.dataset.ready='error';
    }
  }
  main();
})();
