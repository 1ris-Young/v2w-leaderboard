import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const dist=path.resolve(import.meta.dirname,'../site');
const reviewDir=process.argv[2] ? path.resolve(process.argv[2]) : null;
const board=JSON.parse(fs.readFileSync(path.join(dist,'data/leaderboard.json'),'utf8'));
const newsData=JSON.parse(fs.readFileSync(path.join(dist,'data/news.json'),'utf8'));
const opusCases=JSON.parse(fs.readFileSync(path.join(dist,'data/opus-5-5-cases.json'),'utf8'));
const frontierCases=JSON.parse(fs.readFileSync(path.join(dist,'data/frontier-cases.json'),'utf8'));
const analysisData=JSON.parse(fs.readFileSync(path.join(dist,'data/model-analysis.json'),'utf8'));
const archive=JSON.parse(fs.readFileSync(path.join(dist,'data/paper-results.json'),'utf8'));
const publishedNews=newsData.entries.filter(n=>n.status==='published');
const campaignIds=newsData.campaign.model_ids;
const campaignResults=campaignIds.filter(id=>board.models.some(m=>m.id===id));
const publishedRoundup=publishedNews.find(n=>n.kind==='roundup'&&n.href===newsData.campaign.roundup_href);
const metricText=(row,key)=>Number(row.metrics[key]).toFixed(board.metrics.find(m=>m.key===key).digits);
const decode=s=>s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const voidTags=new Set(['meta','link','input','img','br','hr','source','wbr']);
class Element {
  constructor(tag='div',attrs={}){this.tagName=tag.toUpperCase();this.attrs=attrs;this.children=[];this.listeners={};this.style={};this._text='';this._value=attrs.value||'';this.currentTime=0;this.plays=0;this.pauses=0;this.paused=true;}
  get dataset(){return new Proxy({}, {get:(_,k)=>this.attrs['data-'+String(k).replace(/[A-Z]/g,c=>'-'+c.toLowerCase())],set:(_,k,v)=>(this.attrs['data-'+String(k).replace(/[A-Z]/g,c=>'-'+c.toLowerCase())]=String(v),true)});}
  get classList(){return {toggle:(name,on)=>{const c=new Set((this.attrs.class||'').split(/\s+/).filter(Boolean));const add=on??!c.has(name);add?c.add(name):c.delete(name);this.attrs.class=[...c].join(' ');},add:(n)=>this.classList.toggle(n,true),remove:(n)=>this.classList.toggle(n,false),contains:n=>(this.attrs.class||'').split(/\s+/).includes(n)};}
  set innerHTML(s){this._html=s;const parsed=parse(s);this._text=parsed._text;this.children=parsed.children;this.children.forEach(c=>c.parent=this);if(this.tagName==='SELECT')this._value=this.querySelectorAll('option').find(o=>Object.hasOwn(o.attrs,'selected'))?.attrs.value||this.querySelectorAll('option')[0]?.attrs.value||'';}
  get innerHTML(){return this._html||'';}
  set textContent(s){this._text=String(s);this.children=[];this._html=String(s);}
  get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
  get content(){return this.attrs.content;}
  get hidden(){return Object.hasOwn(this.attrs,'hidden');}set hidden(v){if(v)this.attrs.hidden='';else delete this.attrs.hidden;}
  get value(){return this._value;}set value(v){this._value=String(v);}
  setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k];}removeAttribute(k){delete this.attrs[k];}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
  click(){return this.emit('click');}
  emit(k,extra={}){return Promise.all((this.listeners[k]||[]).map(fn=>fn({target:this,...extra})));}
  append(c){this.children.push(c);c.parent=this;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
  select(){}scrollIntoView(){}showModal(){this.attrs.open='';}close(){delete this.attrs.open;}
  pause(){this.pauses++;this.paused=true;}play(){this.plays++;this.paused=false;return Promise.resolve();}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  querySelectorAll(s){let nodes=[this];for(const part of s.trim().split(/\s+/)){nodes=nodes.flatMap(n=>descendants(n).filter(c=>matches(c,part)));}return [...new Set(nodes)];}
}
function matches(n,s){
  const attr=[...s.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)];s=s.replace(/\[[^\]]+\]/g,'');
  if(attr.some(a=>!Object.hasOwn(n.attrs,a[1])||(a[2]!==undefined&&n.attrs[a[1]]!==a[2])))return false;
  const id=s.match(/#([\w-]+)/)?.[1];if(id&&n.attrs.id!==id)return false;
  for(const cl of [...s.matchAll(/\.([\w-]+)/g)].map(m=>m[1]))if(!n.classList.contains(cl))return false;
  const tag=s.match(/^[\w-]+/)?.[0];return !tag||n.tagName===tag.toUpperCase();
}
function descendants(n){return n.children.flatMap(c=>[c,...descendants(c)]);}
function parse(html){
  const holder=new Element('root'),stack=[holder];
  for(const t of html.match(/<!--[\s\S]*?-->|<![^>]*>|<[^>]+>|[^<]+/g)||[]){
    if(t.startsWith('<!'))continue;
    if(t.startsWith('</')){if(stack.length>1)stack.pop();continue;}
    if(t.startsWith('<')){
      const tag=t.match(/^<([\w-]+)/)?.[1];if(!tag)continue;
      const attrs={};for(const m of t.slice(tag.length+1).matchAll(/([\w:-]+)(?:="([^"]*)"|='([^']*)'|=([^\s>]+))?/g))attrs[m[1]]=decode(m[2]??m[3]??m[4]??'');
      const el=new Element(tag,attrs);stack.at(-1).append(el);if(!voidTags.has(tag)&&!t.endsWith('/>'))stack.push(el);
    }else stack.at(-1)._text+=decode(t);
  }
  return holder;
}
async function load(file){
  const localName=({'index.html':'leaderboard.html','updates/opus-5-5.html':'opus-5-5.html','news/index.html':'news.html'})[file]||path.basename(file);
  const source=fs.readFileSync(reviewDir?path.join(reviewDir,localName):path.join(dist,file),'utf8');
  const inlineData=source.match(/<script type="application\/json" id="v2w-inline-data">([\s\S]*?)<\/script>/)?.[1];
  const inlineScript=source.match(/<script>('use strict';[\s\S]*?)<\/script>/)?.[1];
  const doc=new Element('document');doc.innerHTML=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');doc.body=doc.querySelector('body');
  if(inlineData){const dataElement=new Element('script',{id:'v2w-inline-data'});dataElement._text=inlineData;doc.body.append(dataElement);}doc.hidden=false;doc.createElement=tag=>new Element(tag);doc.execCommand=()=>true;
  const captured=[];const errors=[];
  const location={pathname:'/'+file,search:'',hash:'',href:'https://example.test/'+file};
  const context=vm.createContext({document:doc,location,history:{replaceState:(_a,_b,url)=>{const u=new URL(url,'https://example.test');Object.assign(location,{pathname:u.pathname,search:u.search,hash:u.hash,href:u.href});}},navigator:{clipboard:{writeText:async t=>captured.push(t)}},matchMedia:()=>({matches:false}),fetch:async p=>{const normalized=p.replace(/^\.\.\//,'').replace(/^\.\//,'');return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(dist,normalized),'utf8'))};},URL,URLSearchParams,Blob,setTimeout:(fn,ms)=>0,clearTimeout:()=>{},console:{error:e=>errors.push(String(e)),log:()=>{}}});
  vm.runInContext(inlineScript||fs.readFileSync(path.join(dist,'app.js'),'utf8'),context);
  for(let i=0;i<30&&!doc.body.dataset.ready;i++)await new Promise(r=>setImmediate(r));
  assert.equal(doc.body.dataset.ready,'true',errors.join('\n'));
  return {doc,captured,errors,$:s=>doc.querySelector(s),$$:s=>doc.querySelectorAll(s)};
}
// Model news (2026-10-18): one card per published model result plus one per Testing model.
// "report" cards link to their standalone page; "brief" cards open the brief dialog.
const modelNews=publishedNews.filter(n=>n.kind==='model_result');
async function checkNewsCards(page,containerSel,label,itemSel='.news-card'){
  const cards=page.$$(`${containerSel} ${itemSel}`);
  assert.equal(cards.length,modelNews.length+board.pending_models.length,`${label}: one card per model result and per Testing model`);
  assert.equal(new Set(cards.map(c=>c.dataset.newsId||c.dataset.pending)).size,cards.length,`${label}: unique cards`);
  for(const entry of modelNews){
    const card=cards.find(c=>c.dataset.newsId===entry.id),model=board.models.find(m=>m.id===entry.model_id);
    assert.ok(card,`${label}: ${entry.id} card`);
    assert.equal(card.tagName,'A',`${label}: ${entry.id} card is clickable`);
    assert.ok(card.textContent.includes(entry.headline||entry.title),`${label}: ${entry.id} headline`);
    assert.ok(card.textContent.includes(metricText(model,'score')),`${label}: ${entry.id} V2WScore from leaderboard.json`);
    if(entry.detail==='brief'){
      assert.equal(card.getAttribute('href'),`#news=${entry.id}`,`${label}: ${entry.id} opens a brief`);
      await card.click();
      assert.ok(Object.hasOwn(page.$('#news-brief').attrs,'open'),`${label}: ${entry.id} brief opens`);
      for(let i=0;i<10;i++)await new Promise(r=>setImmediate(r));
      const brief=page.$('#news-brief-content');
      assert.ok(brief.textContent.includes(entry.headline),`${label}: ${entry.id} brief headline`);
      assert.equal(brief.querySelectorAll('.nb-point').length,(entry.points||[]).length,`${label}: ${entry.id} story points`);
      if(entry.compare)assert.equal(brief.querySelectorAll('.nb-compare tbody tr').length,entry.compare.metrics.length,`${label}: ${entry.id} comparison rows`);
      const col=JSON.parse(fs.readFileSync(path.join(dist,entry.cases),'utf8'));
      assert.equal(brief.querySelectorAll('[data-brief-case]').length,col.cases.length,`${label}: ${entry.id} case choices`);
      assert.equal(brief.querySelectorAll('#news-brief-case video').length,2,`${label}: ${entry.id} source and rollout`);
      await page.$('.news-brief-close').click();
      assert.ok(!Object.hasOwn(page.$('#news-brief').attrs,'open'),`${label}: ${entry.id} brief closes`);
    }else assert.ok(card.getAttribute('href').endsWith(entry.href),`${label}: ${entry.id} links to its report`);
  }
  for(const m of board.pending_models){
    const card=cards.find(c=>c.dataset.pending===m.id);
    assert.ok(card&&card.tagName!=='A',`${label}: ${m.id} Testing card is not a link`);
    assert.match(card.textContent,/coming soon|being verified/i);
    assert.doesNotMatch(card.textContent,/\d+(?:\.\d+)?\s*%/,`${label}: ${m.id} has no invented numbers`);
  }
}
async function checkNews(page,label){
  await checkNewsCards(page,'#news-feed',label);
  assert.equal(page.$('#campaign-status').textContent,`${campaignResults.length} of ${campaignIds.length} results available`);
  if(publishedRoundup){
    assert.equal(campaignResults.length,campaignIds.length,`${label}: no premature joint comparison`);
    assert.ok(page.$('#campaign-publication a').getAttribute('href').endsWith(publishedRoundup.href),`${label}: published joint analysis link`);
  }else assert.match(page.$('#campaign-publication').textContent,/preparation|preparing|pending|after|await/i);
}
async function checkHomeNews(page){
  assert.equal(page.$$('section')[0]?.attrs.id,'updates','Model News is the first homepage section');
  assert.ok(descendants(page.doc).indexOf(page.$('#updates'))<descendants(page.doc).indexOf(page.$('#leaderboard')),'Model News precedes the leaderboard');
  assert.ok(page.$('#updates').querySelectorAll('a').some(link=>link.getAttribute('href')?.endsWith('news/index.html')),'Homepage links to the complete News archive');
  await checkNewsCards(page,'#latest-model-news','Home','.nh-item');
  assert.equal(page.$$('#latest-model-news a.nh-item .nh-model-logo img').length,modelNews.length,'Home: one logo card per published model result');
  assert.equal(page.$$('#latest-model-news video').length,0,'Home News uses model logos without simulation videos');
  assert.equal(page.$('#progress'),null,'Home omits the generation progress section');
  assert.ok(page.$('#latest-model-news .nh-ticker').textContent.includes(modelNews[0].headline),'Home: ticker carries the headlines');
  for(const id of ['campaign-title','campaign-status','campaign-publication','release-title'])assert.equal(page.$('#'+id),null,`Homepage omits the old ${id} presentation`);
  assert.equal(page.$('.release-highlight'),null,'Homepage uses the compact introduction');
}
function checkNoRemovedSections(page,label){
  for(const id of ['tier-figure','tier-list','compare','compare-a','compare-b','compare-results'])assert.equal(page.$('#'+id),null,`${label}: obsolete ${id}`);
  assert.ok(page.$$('a').every(a=>!a.getAttribute('href')?.endsWith('#compare')),`${label}: obsolete Compare link`);
}
const home=await load('index.html');
assert.equal(home.$$('#table-body tr').length,board.models.length);
await checkHomeNews(home);
checkNoRemovedSections(home,'Home');
const metricViews=home.$$('[data-metric-view]');
assert.deepEqual(metricViews.map(b=>b.dataset.metricView),['all','Geometry','Dynamics','Functionality','key'],'metric tabs follow the requested order');
assert.deepEqual(metricViews.filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.dataset.metricView),['key'],'Key metrics remains the default');
assert.deepEqual(home.$$('#table-head [data-sort]').map(b=>b.dataset.sort),['score','success','progress','scene_cd','build'],'default compact metric columns');
for(const view of ['Geometry','Dynamics','Functionality','all','key']){
  await home.$(`[data-metric-view="${view}"]`).click();
  const keys=view==='key'?['score','success','progress','scene_cd','build']:board.metrics.filter(m=>view==='all'||m.key==='score'||m.group===view).map(m=>m.key);
  assert.deepEqual(home.$$('#table-head [data-sort]').map(b=>b.dataset.sort),keys,`${view}: correct metric columns`);
  assert.deepEqual(metricViews.filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.dataset.metricView),[view],`${view}: single selected tab`);
}
function checkRanking(key){
  const ranked=[...board.models].filter(m=>!m.reference).sort((a,b)=>b.metrics[key]-a.metrics[key]);
  assert.equal(home.$$('#rank-podium .podium-card').length,ranked.length,'every model is on the ranking board');
  assert.deepEqual(home.$$('#rank-podium .podium-card').map(t=>t.dataset.rankModel),ranked.map(r=>r.id),'board order follows the ranking');
  if(home.$('#rank-chart')){assert.equal(home.$$('#rank-chart .chart-row').length,board.models.length);}
  assert.equal(home.$('#rank-podium .podium-leader').dataset.rankModel,ranked[0].id);
  for(const tile of home.$$('#rank-podium .podium-card')){
    const row=board.models.find(m=>m.id===tile.dataset.rankModel);
    const expected=board.models.filter(m=>m.metrics[key]>row.metrics[key]).length+1;
    assert.equal(Number(tile.dataset.rank),expected,`${row.id}: tied board values share competition rank`);
    assert.equal(tile.querySelector('.tile-rank').textContent,String(expected).padStart(2,'0'),`${row.id}: displayed board rank`);
  }
  if(home.$('#rank-chart')){assert.deepEqual(home.$$('#rank-chart .chart-row').map(r=>r.dataset.rankModel),ranked.map(r=>r.id));}
  if(ranked[1]){
    const digits=board.metrics.find(m=>m.key===key).digits;
    const lead=(ranked[0].metrics[key]-ranked[1].metrics[key]).toFixed(digits);
    assert.ok(home.$('#rank-podium').textContent.includes(`${lead} ${key==='score'?'points':'pp'} ahead`));
  }
}
function checkTableRanks(key){
  for(const tr of home.$$('#table-body tr')){
    const id=tr.querySelector('[data-model]')?.dataset.model;if(!id)continue;
    const row=board.models.find(m=>m.id===id);
    const expected=board.models.filter(m=>m.metrics[key]>row.metrics[key]).length+1;
    assert.equal(tr.querySelector('.table-rank').textContent,String(expected).padStart(2,'0'),`${id}: table rank counts only strictly higher values`);
  }
}
checkRanking('score');
checkTableRanks('score');
await home.$('[data-sort="success"]').click();checkTableRanks('success');
await home.$('[data-sort="score"]').click();checkTableRanks('score');
await home.$('[data-chart="success"]').click();
checkRanking('success');
assert.equal(home.$('#chart-title').textContent,'Task success');
await home.$('[data-rank-model="opus-5-5"]').click();
assert.equal(home.$$('#model-dialog-content .dialog-metrics tbody tr').length,board.metrics.length);
for(const row of board.models){
  await home.$(`[data-rank-model="${row.id}"]`).click();
  assert.ok(home.$('#model-dialog-content').textContent.includes(row.name),`${row.id}: correct dialog model`);
  for(const metric of board.metrics){
    const content=home.$('#model-dialog-content').textContent;
    assert.ok(content.includes(metricText(row,metric.key)),`${row.id}.${metric.key}: measured dialog value`);
    if(row.coverage[metric.key]!=null)assert.ok(content.includes(`n=${row.coverage[metric.key]} / ${board.instances}`),`${row.id}.${metric.key}: measured coverage`);
  }
}
await home.$('.dialog-close').click();
await home.$('[data-chart="score"]').click();
if(board.models.some(m=>m.provider==='Meta')){
  await home.$('[data-provider="Meta"]').click();checkTableRanks('score');
  for(const tile of home.$$('#rank-podium .podium-card')){
    const row=board.models.find(m=>m.id===tile.dataset.rankModel);
    assert.equal(Number(tile.dataset.rank),board.models.filter(m=>m.metrics.score>row.metrics.score).length+1,'Filtered board retains global competition rank');
  }
  await home.$('[data-provider="All"]').click();
}
await home.$('[data-provider="Anthropic"]').click();assert.equal(home.$$('#table-body tr').length,board.models.filter(m=>m.provider==='Anthropic').length);
home.$('#model-search').value='Opus';await home.$('#model-search').emit('input');assert.equal(home.$$('#table-body tr').length,board.models.filter(m=>m.provider==='Anthropic'&&`${m.name} ${m.provider} ${m.model_id||''}`.toLowerCase().includes('opus')).length);
home.$('#model-search').value='no-such-model';await home.$('#model-search').emit('input');assert.match(home.$('#table-body').innerHTML,/No models match/);if(home.$('#rank-chart'))assert.match(home.$('#rank-chart').innerHTML,/No models match/);assert.equal(home.$$('#rank-podium .podium-card').length,board.models.length,'Ranking board ignores the table filters');
home.$('#model-search').value='';await home.$('#model-search').emit('input');await home.$('[data-provider="All"]').click();
await home.$('#detail-toggle').click();assert.equal(home.$$('#table-head th').length,board.metrics.length+2);assert.match(home.$('#table-head').innerHTML,/Fixed-ref/);
await home.$('#table-body [data-model="opus-5-5"]').click();assert.ok(Object.hasOwn(home.$('#model-dialog').attrs,'open'));
await home.$('.dialog-close').click();
if(home.$('#snapshot-paper')){
  await home.$('#snapshot-paper').click();
  assert.equal(home.$$('#table-body tr').length,archive.models.length);
  assert.equal(home.$$('#table-head th').length,archive.fields.length+2);
  for(const reference of archive.models.filter(m=>m.reference))assert.ok(!home.$('#rank-podium').textContent.includes(reference.name),'Reference stays outside model ranking');
  assert.deepEqual(home.$$('#table-body [data-model]').map(b=>b.dataset.model).sort(),archive.models.map(m=>m.id).sort(),'Paper view contains only archive rows');
}
if(home.$('#snapshot-current')){ await home.$('#snapshot-current').click(); }
const homeThumbs=home.$$('#opus-case-explorer .cs-thumb');
assert.equal(homeThumbs.length,frontierCases.cases.length,'Home: one thumbnail per source video');
let previousVideos=[];
for(const [i,c] of frontierCases.cases.entries()){
  await homeThumbs[i].click();
  assert.ok(previousVideos.every(v=>v.paused),'Switching case pauses previous clips');
  assert.equal(homeThumbs[i].getAttribute('aria-selected'),'true');
  assert.equal(homeThumbs.filter(b=>b.getAttribute('aria-selected')==='true').length,1);
  const detail=home.$('#opus-case-explorer .cs-detail');
  assert.ok(detail.textContent.includes(c.title),`${c.id}: selected case title`);
  assert.ok(detail.querySelector('.cs-source').getAttribute('href').endsWith(c.source.video),`${c.id}: same source video`);
  const columns=home.$$('#opus-case-explorer article.cs-run[data-model-case]');
  assert.deepEqual(columns.map(el=>el.dataset.modelCase),frontierCases.model_ids,`${c.id}: all four measured model columns`);
  for(const column of columns){
    const id=column.dataset.modelCase,output=c.models[id];
    const blocked=['testing','awaiting_evidence'].includes(output.status),hasMedia=!blocked&&!!output.video;
    const judged=hasMedia&&typeof output.success==='boolean';
    assert.ok(judged,`${c.id}.${id}: selected measured model has video and a real verdict`);
    const expected=judged?(output.success?'success':'failed'):output.status==='testing'?'testing':hasMedia?'unjudged':'awaiting_evidence';
    assert.equal(column.dataset.caseStatus,expected,`${c.id}.${id}: evidence-based verdict`);
    const videos=column.querySelectorAll(`video[data-case-video="${id}"]`);
    assert.equal(videos.length,hasMedia?1:0,`${c.id}.${id}: available model video`);
    if(hasMedia)assert.ok(videos[0].getAttribute('src').endsWith(output.video),`${c.id}.${id}: correct attributed rollout`);
    if(!judged){
      assert.ok(column.classList.contains('is-pending'),`${c.id}.${id}: missing judgment stays pending`);
      assert.doesNotMatch(column.querySelector('.cs-outcome').textContent,/success|failed/i,`${c.id}.${id}: no invented verdict`);
      assert.match(column.textContent,output.status==='testing'?/coming soon/i:hasMedia?/outcome pending/i:/awaiting evidence/i);
    }else assert.ok(column.classList.contains(output.success?'is-win':'is-loss'),`${c.id}.${id}: visual outcome follows supplied judgment`);
    if(!hasMedia)assert.equal(column.querySelectorAll('.cs-metric').length,0,`${c.id}.${id}: no measurements without evidence`);
  }
  const videos=detail.querySelectorAll('video');
  assert.equal(home.$('#opus-case-explorer [data-case-play]').disabled,videos.length===0);
  await home.$('#opus-case-explorer [data-case-play]').click();assert.ok(videos.every(v=>v.plays===1&&!v.paused),`${c.id}: play available clips`);
  videos.forEach(v=>v.currentTime=4);
  await home.$('#opus-case-explorer [data-case-reset]').click();assert.ok(videos.every(v=>v.paused&&v.currentTime===0),`${c.id}: reset available clips`);
  previousVideos=videos;
}
const update=await load('updates/opus-5-5.html');assert.equal(update.$$('#model-results-body tr').length,4);
checkNoRemovedSections(update,'Opus');
function checkMetricCoverage(page,row){
  const target=page.$('#generic-metric-coverage'),excluded=(target.dataset.exclude||'').split(',').filter(Boolean);
  const metrics=board.metrics.filter(m=>!excluded.includes(m.key)),breakdown=target.dataset.style==='breakdown';
  if(breakdown)metrics.sort((a,b)=>(b.key==='build')-(a.key==='build'));
  const rows=target.querySelectorAll('tr');
  assert.equal(rows.length,metrics.length,`${row.id}: metric coverage row count`);
  for(const [i,m] of metrics.entries()){
    const cells=rows[i].querySelectorAll('td');
    assert.equal(cells[0].textContent,m.label,`${row.id}.${m.key}: metric label`);
    assert.ok(cells[1].textContent.startsWith(metricText(row,m.key)),`${row.id}.${m.key}: supplied measurement`);
    const count=row.coverage[m.key];
    assert.equal(cells[2].textContent,count==null?'Not supplied':`${breakdown?'':'n='}${count} / ${board.instances}`,`${row.id}.${m.key}: supplied coverage`);
  }
}
function checkAnalysisFigures(page,row){
  const findings=analysisData.models[row.id]?.findings||[];
  const articles=page.$$('#model-analysis .fe-row');
  assert.equal(articles.length,findings.length,`${row.id}: every finding is displayed`);
  for(const finding of findings){
    const article=articles.find(a=>a.querySelector('h4')?.textContent===finding.title);
    assert.ok(article,`${row.id}: finding ${finding.title}`);
    const ref=board.models.find(m=>m.id===(finding.baseline_model_id??'fable-5-1'));
    assert.ok(ref&&ref.id!==row.id,`${row.id}: valid finding baseline`);
    const refName=ref.name.replace(/^Claude /,'');
    const keys=(finding.metric_keys||[]).filter(k=>board.metrics.some(m=>m.key===k)&&row.metrics[k]!=null);
    const items=article.querySelectorAll('.af2-item');
    assert.equal(items.length,keys.length,`${row.id}: metric figure count for ${finding.title}`);
    for(const [i,key] of keys.entries()){
      const m=board.metrics.find(m=>m.key===key);
      const unit=m.unit==='%'?'%':['0–1','0–100'].includes(m.unit)?'':` ${m.unit}`;
      assert.equal(items[i].querySelector('.af2-ref')?.textContent,`vs. ${metricText(ref,key)}${unit} · ${refName}`,`${row.id}.${key}: comparison uses this finding's actual baseline`);
      const expectedCoverage=row.coverage[key]==null?[]:[`n = ${row.coverage[key]} / ${board.instances}`,...(ref.coverage[key]==null?[]:[`${refName}: n = ${ref.coverage[key]} / ${board.instances}`])];
      assert.deepEqual(items[i].querySelectorAll('.af2-cov span').map(el=>el.textContent),expectedCoverage,`${row.id}.${key}: model and baseline coverage labels`);
    }
  }
}
const opus=board.models.find(m=>m.id==='opus-5-5');
checkMetricCoverage(update,opus);
checkAnalysisFigures(update,opus);
for(const key of ['score','success','progress'])assert.ok(update.$('#model-results-body').textContent.includes(metricText(opus,key)),`Opus headline ${key} follows source data`);
assert.ok(update.$('#model-analysis').textContent.trim(),'Opus: evidence-based analysis');
assert.equal(update.$('#model-update-cases').hidden,false);
assert.equal(update.$$('#model-update-cases [data-case-index]').length,opusCases.cases.length);
assert.equal(update.$$('#model-case-view video').length,opusCases.cases[0].baseline?3:2);
const initialVideos=update.$$('#model-case-view video');
await update.$('[data-case-play]').click();assert.ok(initialVideos.every(v=>v.plays===1));
initialVideos.forEach(v=>v.currentTime=5);
await update.$('[data-case-reset]').click();assert.ok(initialVideos.every(v=>v.pauses>=1&&v.currentTime===0));
if(opusCases.cases.length>1){
  await update.$('[data-case-index="1"]').click();
  assert.equal(update.$('[data-case-index="1"]').getAttribute('aria-selected'),'true');
  assert.equal(update.$('[data-case-index="0"]').getAttribute('aria-selected'),'false');
  assert.ok(update.$('#model-case-view').textContent.includes(opusCases.cases[1].title));
  assert.ok(initialVideos.every(v=>v.pauses>=2),'Case switching pauses the previous clips');
  assert.equal(update.$$('#model-case-view video').length,opusCases.cases[1].baseline?3:2);
}
await update.$('#share-result').click();assert.equal(update.captured[0],'https://example.test/updates/opus-5-5.html');
assert.equal(home.errors.length+update.errors.length,0);
for(const id of campaignIds.filter(id=>id!=='opus-5-5'&&fs.existsSync(path.join(dist,`updates/${id}.html`)))){
  const model=board.models.find(m=>m.id===id),pending=board.pending_models.find(m=>m.id===id);
  const page=await load(`updates/${id}.html`),name=(model||pending).name;
  checkNoRemovedSections(page,name);
  assert.equal(page.$('#generic-results').hidden,!model,`${name}: results visibility`);
  assert.equal(page.$('#generic-pending').hidden,!!model,`${name}: Testing explanation visibility`);
  assert.equal(page.doc.body.dataset.modelStatus,model?'results':'testing',`${name}: measured or Testing status`);
  assert.ok(page.$('#model-analysis').textContent.trim(),`${name}: analysis or evidence priorities`);
  assert.ok(page.$$('[data-result-only]').length>0,`${name}: result-only controls declared`);
  if(model){
    const modelUpdate=board.updates.find(u=>u.model_id===id)||{};
    const comparisons=(modelUpdate.compare_ids||[...board.models].filter(m=>m.id!==id).sort((a,b)=>b.metrics.score-a.metrics.score).slice(0,2).map(m=>m.id)).filter(id=>board.models.some(m=>m.id===id));
    assert.equal(page.$$('#model-results-body tr').length,comparisons.length+1,`${name}: measured comparison rows`);
    checkMetricCoverage(page,model);
    checkAnalysisFigures(page,model);
    assert.equal(page.$('#generic-date').textContent,`${modelUpdate.date_label||'Snapshot as of'} · ${modelUpdate.date||board.snapshot_date}`,`${name}: snapshot date label`);
    assert.ok(page.$('#generic-score').innerHTML.startsWith(metricText(model,'score')+'<small>'),`${name}: measured overall score`);
    assert.equal(page.$('#generic-success').textContent,metricText(model,'success')+'%',`${name}: measured task success`);
    assert.equal(page.$('#generic-build').textContent,metricText(model,'build')+'%',`${name}: measured build rate`);
    assert.doesNotMatch(page.$('#generic-model-intro').textContent,/being tested|results pending/i,`${name}: Testing copy replaced`);
    assert.doesNotMatch(page.$('#model-analysis').textContent,/being tested|no verified result is available/i,`${name}: stale Testing analysis replaced`);
    const collection=JSON.parse(fs.readFileSync(path.join(dist,`data/${id}-cases.json`),'utf8'));
    assert.equal(collection.model_id,id,`${name}: case collection attribution`);
    const count=collection.cases?.length||0;
    assert.equal(page.$('#model-update-cases').hidden,count===0,`${name}: verified case visibility`);
    assert.equal(page.$$('#model-update-cases [data-case-index]').length,count,`${name}: verified case choices`);
    assert.equal(page.$('#model-cases-status').hidden,count>0,`${name}: media awaiting notice`);
    assert.ok(page.$$('[data-result-only]').filter(el=>el.attrs.id!=='model-cases-status').every(el=>!el.hidden),`${name}: measured controls visible`);
    await page.$('#share-result').click();assert.equal(page.captured[0],`https://example.test/updates/${id}.html`,`${name}: result share link`);
    assert.equal(page.errors.length,0,`${name}: no application error`);
    continue;
  }
  assert.match(page.$('#generic-pending').textContent,/testing/i);
  assert.match(page.$('#generic-pending').textContent,/pending|verification|verified|await/i);
  assert.equal(page.$$('#model-results-body tr').length,0,`${pending.name}: no invented results`);
  assert.equal(page.$$('#generic-metric-coverage tr').length,0,`${pending.name}: no invented metrics`);
  for(const id of ['generic-score','generic-success','generic-build'])assert.doesNotMatch(page.$('#'+id).textContent,/\d/);
  assert.ok(page.$$('[data-result-only]').every(el=>el.hidden),`${pending.name}: score and data downloads hidden`);
  assert.equal(page.$('#model-update-cases').hidden,true,`${pending.name}: no attributed case outputs`);
  assert.equal(page.captured.length,0,`${pending.name}: no result shared while testing`);
  assert.equal(page.errors.length,0,`${pending.name}: no application error`);
}
const news=await load('news/index.html');await checkNews(news,'News');checkNoRemovedSections(news,'News');assert.equal(news.errors.length,0);
console.log(`PASS: ranking and source values, metric order and filtering, coverage dialogs, archive isolation, ${publishedNews.length} published News reports, campaign page states, ${frontierCases.cases.length} four-model source cases with truthful verdicts, playback/reset, model case switching and sharing. Browser layout QA was not performed.`);
