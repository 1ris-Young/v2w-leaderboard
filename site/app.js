'use strict';
(() => {
  const base = document.querySelector('meta[name="v2w-base"]')?.content || '.';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const path = (p) => /^https?:\/\//.test(p) ? p : `${base}/${p.replace(/^\//, '')}`;
  const state = { board: null, archive: null, snapshot: 'current', search: '', provider: 'All', detail: false, metricView: 'key', sort: 'score', sortDir: 'desc', chart: 'score', news: null, analysis: null, cases: [], caseId: 'tape', caseA: 'opus5', caseB: 'gpt6astra' };
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
  function setSnapshot(snapshot) {
    state.snapshot=snapshot;state.sort='score';state.sortDir='desc';
    ['current','paper'].forEach(s=>{const b=$(`#snapshot-${s}`);b.classList.toggle('active',s===snapshot);b.setAttribute('aria-pressed',String(s===snapshot));});
    $('#snapshot-date').textContent=snapshot==='current'?`Snapshot · ${state.board.snapshot_date}`:'Archive · published project page';
    if($('#snapshot-note'))$('#snapshot-note').textContent=snapshot==='current'?'Recorded results and per-metric coverage. Select a model for counts and source details.':'Published-paper values are shown separately. The newer snapshot uses different reported values and diagnostic labels.';
    renderTable();
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
  async function initHome(){
    renderProviders();renderTable();if($('#case-tabs'))renderCase();renderLatest();await initVerifiedCases();
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
    let heroPaused=false;$('#hero-play')?.addEventListener('click',()=>{heroPaused=!heroPaused;$$('.hero-video-grid video').forEach(v=>heroPaused?v.pause():v.play().catch(()=>{}));$('#hero-play').textContent=heroPaused?'▷':'Ⅱ';$('#hero-play').setAttribute('aria-label',heroPaused?'Play hero videos':'Pause hero videos');});
    if($('#hero-play')&&matchMedia('(prefers-reduced-motion: reduce)').matches){heroPaused=true;$$('.hero-video-grid video').forEach(v=>v.pause());$('#hero-play').textContent='▷';$('#hero-play').setAttribute('aria-label','Play hero videos');}
    if($('#case-tabs')&&location.hash.startsWith('#case=')){const params=new URLSearchParams(location.hash.slice(1));state.caseId=params.get('case')||state.caseId;state.caseA=params.get('a')||state.caseA;state.caseB=params.get('b')||state.caseB;renderCase();$('#cases').scrollIntoView();}
    if(location.hash.startsWith('#model='))openModel(decodeURIComponent(location.hash.slice(7)));
  }
  function renderLatest(){
    const best=[...state.board.models].sort((a,b)=>b.metrics.score-a.metrics.score)[0];
    $('#release-title').textContent=best.name;
    const highlight=$('.release-highlight');
    highlight.querySelectorAll('a').forEach(a=>a.href=path(`updates/${best.id}.html`));
    const values=highlight.querySelectorAll('.metric-value');
    values[0].textContent=format(best.metrics.score,'score');values[1].innerHTML=`${format(best.metrics.success,'success')}<span>%</span>`;
    values[2].innerHTML=`${format(best.metrics.build,'build')}<span>%</span>`;
    highlight.querySelectorAll('.metric-name')[2].textContent='Build rate';
    const count=$$('.benchmark-stats dt')[2];if(count)count.textContent=state.board.models.length;
    $('#snapshot-date').textContent=`Snapshot · ${new Date(`${state.board.snapshot_date}T00:00:00Z`).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'})}`;
    renderNews();renderCampaign();
  }
  function renderNews(){
    const published=state.news.entries.filter(n=>n.status==='published').sort((a,b)=>b.date.localeCompare(a.date));
    const grid=$('.updates-grid');
    if(grid)grid.innerHTML=published.map(n=>`<a href="${path(n.href)}" class="update-card featured-update"><div class="update-top"><span class="release-tag">${n.kind==='roundup'?'JOINT ANALYSIS':'MODEL REPORT'}</span><span>${esc(n.date_label||'Published')} · ${esc(n.date)}</span></div><h3>${esc(n.title)}</h3><p>${esc(n.summary)}</p><div class="update-bottom"><span>Read the report</span><span>↗</span></div></a>`).join('')+state.board.pending_models.map(m=>`<a href="${path(`updates/${m.id}.html`)}" class="update-card upcoming-update"><div class="update-top"><span class="testing-tag"><span class="status-dot"></span>TESTING</span><span>${esc(m.provider)}</span></div><h3>${esc(m.name)}</h3><p>Results pending. The report will examine task completion, build reliability, physical fidelity and verified case evidence.</p><div class="update-bottom"><span>View testing status</span><span>↗</span></div></a>`).join('');
    const summary=$('#nav-news-summary');if(summary&&published[0])summary.innerHTML=`<span class="news-nav-kicker">LATEST REPORT</span><a href="${path(published[0].href)}">${esc(published[0].title)} <span>↗</span></a><a class="news-nav-all" href="${path('news/index.html')}">All four model reports & testing progress →</a>`;
  }
  function renderCampaign(){
    const campaign=state.news.campaign;
    const title=$('#campaign-title');if(!title)return;
    title.textContent=campaign.title;
    const rows=campaign.model_ids.map(id=>state.board.models.find(m=>m.id===id)||state.board.pending_models.find(m=>m.id===id)).filter(Boolean);
    const complete=rows.filter(r=>r.metrics!=null).length;
    $('#campaign-status').textContent=`${complete} of ${campaign.model_ids.length} results available`;
    const roundup=state.news.entries.find(n=>n.kind==='roundup'&&n.status==='published'&&n.href===campaign.roundup_href);
    const message=$('#campaign-message');if(message)message.textContent=roundup?'The joint comparison is published. Read it alongside the individual model reports.':complete===campaign.model_ids.length?'All four result rows are available. The joint article will follow after protocol and evidence review.':'Claude, Gemini, Muse and GPT: the joint comparison and blog will follow once all four results are verified on a compatible protocol.';
    const publication=$('#campaign-publication');if(publication)publication.innerHTML=roundup?`<a class="text-link" href="${esc(path(roundup.href))}">Read the joint analysis ↗</a>`:esc(campaign.publication_note||'Joint article in preparation.');
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
    const collection=await fetchJSON('data/opus-5-5-cases.json');
    renderMetricCoverage(opus);
    renderModelAnalysis(opus.id,collection);
    if($('#model-cases-status'))$('#model-cases-status').hidden=collection.cases?.length>0;
    if(collection.cases?.length){
      $('#model-update-cases').hidden=false;
      renderCaseSwitcher($('#model-update-cases'),collection,opus.name,'VERIFIED CASE EVIDENCE');
      bindVideoFallbacks();
    }
    // Remaining failures (both models fail on the same video): shown once verified clips are supplied.
    if(collection.failure_cases?.length&&$('#failure-cases')){
      $('#failure-cases').hidden=false;
      renderCaseSwitcher($('#failure-cases'),{cases:collection.failure_cases,intro:collection.failure_intro},opus.name,'A REMAINING FAILURE');
      const h=$('#failure-cases h2');if(h)h.textContent='Where Opus 5.5 still fails.';
    }
  }
  function renderMetricCoverage(row){
    const target=$('#generic-metric-coverage');if(!target)return;
    target.innerHTML=state.board.metrics.map(m=>`<tr><td>${esc(m.label)}</td><td>${format(row.metrics[m.key],m.key,m.unit==='%')} ${!['%','0–1','0–100'].includes(m.unit)?esc(m.unit):''}</td><td>${row.coverage?.[m.key]!=null?`n=${row.coverage[m.key]} / ${state.board.instances}`:'Not supplied'}</td></tr>`).join('');
  }
  function renderModelAnalysis(id,collection={}){
    const target=$('#model-analysis'),report=state.analysis.models[id];if(!target||!report)return;
    const row=state.board.models.find(m=>m.id===id),findings=row?report.findings||[]:[];
    target.hidden=false;
    target.innerHTML=`<div class="section-heading"><div><span class="eyebrow section-index">${row?'CAPABILITIES & LIMITS':'THE UPCOMING REPORT'}</span><h2>${row?'What the evidence shows.':'What we will examine.'}</h2><p>${esc(report.intro)}</p></div></div>${findings.length?`<div class="analysis-grid">${findings.map(f=>`<article class="analysis-card"><h3>${esc(f.title)}</h3><p>${esc(f.body)}</p><div class="analysis-metrics">${(f.metric_keys||[]).map(k=>{const m=metric(k);if(!m)return '';return `<div class="analysis-metric"><span>${esc(m.label)} ${m.direction==='up'?'↑':'↓'}</span><strong>${format(row.metrics[k],k,m.unit==='%')}${!['%','0–1','0–100'].includes(m.unit)?` ${esc(m.unit)}`:''}</strong><span>${row.coverage?.[k]!=null?`n=${row.coverage[k]} / ${state.board.instances}`:'Coverage not supplied'}</span></div>`;}).join('')}</div>${(f.case_ids||[]).map(caseId=>{const i=(collection.cases||[]).findIndex(c=>c.id===caseId);return i<0?'':`<a class="analysis-case-link" href="#case-${i+1}" data-analysis-case="${i}">Inspect ${esc(collection.cases[i].title)} ↘</a>`;}).join(' ')}</article>`).join('')}</div>`:''}${report.evidence_priorities?.length?`<ul class="pending-evidence">${report.evidence_priorities.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>`:''}${report.limitations?.length?`<aside class="analysis-limits"><h3>${row?'Evidence and remaining gaps':'Results pending'}</h3><ul>${report.limitations.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></aside>`:''}`;
    $$('[data-analysis-case]').forEach(a=>a.addEventListener('click',()=>{
      const button=$$('#model-update-cases [data-case-index]')[Number(a.dataset.analysisCase)];if(button)button.click();
      $('#model-update-cases')?.scrollIntoView({behavior:'smooth',block:'start'});
    }));
  }
  async function initGenericUpdate(){
    const id=document.body.dataset.model;
    const row=state.board.models.find(m=>m.id===id),pending=state.board.pending_models.find(m=>m.id===id);
    if(!row&&!pending)throw new Error('Model update has no matching result or testing record');
    $('#generic-model-title').textContent=(row||pending).name;
    $('#generic-results').hidden=!row;
    $('#generic-pending').hidden=!!row;
    $$('[data-result-only]').forEach(el=>{el.hidden=!row;});
    document.body.dataset.modelStatus=row?'results':'testing';
    if(!row){
      $('#generic-model-intro').textContent=state.analysis.models[id]?.intro||`${pending.name} is being tested. Results and case evidence will be reported after verification.`;
      $('#generic-date').textContent='Status · Testing — results pending';
      renderModelAnalysis(id);
      return;
    }
    const update=state.board.updates.find(u=>u.model_id===id)||{};
    $('#generic-model-intro').textContent=`${row.name} records ${format(row.metrics.score,'score')} V2WScore and ${format(row.metrics.success,'success',true)} task success in this result set. Inspect the component metrics and supporting evidence below.`;
    $('#generic-score').innerHTML=`${format(row.metrics.score,'score')}<small>/ 100</small>`;
    $('#generic-success').textContent=format(row.metrics.success,'success',true);$('#generic-build').textContent=format(row.metrics.build,'build',true);
    $('#generic-date').textContent=`Result date · ${update.date||state.board.snapshot_date}`;
    const baselines=(update.compare_ids||[...state.board.models].filter(m=>m.id!==id).sort((a,b)=>b.metrics.score-a.metrics.score).slice(0,2).map(m=>m.id)).map(i=>state.board.models.find(m=>m.id===i)).filter(Boolean);
    $('#model-results-body').innerHTML=[row,...baselines].map(r=>`<tr class="${r.id===id?'featured':''}"><td>${esc(r.name)}</td><td>${format(r.metrics.score,'score')}</td><td>${format(r.metrics.success,'success',true)}</td><td>${format(r.metrics.progress,'progress')}</td></tr>`).join('');
    renderMetricCoverage(row);
    $('#share-result').addEventListener('click',()=>copy(location.href.split('#')[0],'Result link copied'));
    $('#download-result-card').addEventListener('click',()=>{const a=document.createElement('a');a.href=path(`assets/${id}-social.png`);a.download=`video2world-${id}.png`;a.click();});
    $('#download-snapshot').addEventListener('click',()=>download(JSON.stringify({snapshot_id:state.board.snapshot_id,...row},null,2),`${id}-result.json`,'application/json'));
    const collection=await fetchJSON(`data/${id}-cases.json`);
    renderModelAnalysis(id,collection);
    if(collection.cases?.length){
      $('#model-cases-status').hidden=true;$('#model-update-cases').hidden=false;
      renderCaseSwitcher($('#model-update-cases'),collection,row.name,'VERIFIED CASES');
      bindVideoFallbacks();
    }
  }
  async function main(){
    try {
      [state.board,state.archive,state.cases,state.news,state.analysis]=await Promise.all([fetchJSON('data/leaderboard.json'),fetchJSON('data/paper-results.json'),fetchJSON('data/cases.json'),fetchJSON('data/news.json'),fetchJSON('data/model-analysis.json')]);
      commonEvents();
      if(document.body.dataset.page==='home')await initHome();else if(document.body.dataset.page==='opus'){await initUpdate();renderCampaign();}else if(document.body.dataset.page==='news'){renderNews();renderCampaign();}else if(document.body.dataset.page==='model'){await initGenericUpdate();renderNews();}
      document.body.dataset.ready='true';
    } catch(error){
      console.error(error);const target=$('#table-body')||$('#model-results-body');if(target)target.innerHTML='<tr><td colspan="7" class="error-note">Results could not load. Please reload the page or download the supplied snapshot.</td></tr>';toast('Some data could not load. Please reload.');
      document.body.dataset.ready='error';
    }
  }
  main();
})();
