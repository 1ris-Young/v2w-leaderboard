import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const dist=path.resolve(import.meta.dirname,'../site');
const reviewDir=process.argv[2] ? path.resolve(process.argv[2]) : null;
const board=JSON.parse(fs.readFileSync(path.join(dist,'data/leaderboard.json'),'utf8'));
const newsData=JSON.parse(fs.readFileSync(path.join(dist,'data/news.json'),'utf8'));
const opusCases=JSON.parse(fs.readFileSync(path.join(dist,'data/opus-5-5-cases.json'),'utf8'));
const publishedNews=newsData.entries.filter(n=>n.status==='published');
const campaignIds=newsData.campaign.model_ids;
const campaignResults=campaignIds.filter(id=>board.models.some(m=>m.id===id));
const publishedRoundup=publishedNews.find(n=>n.kind==='roundup'&&n.href===newsData.campaign.roundup_href);
const metricText=(row,key)=>Number(row.metrics[key]).toFixed(board.metrics.find(m=>m.key===key).digits);
const decode=s=>s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const voidTags=new Set(['meta','link','input','img','br','hr','source','wbr']);
class Element {
  constructor(tag='div',attrs={}){this.tagName=tag.toUpperCase();this.attrs=attrs;this.children=[];this.listeners={};this.style={};this._text='';this._value=attrs.value||'';this.currentTime=0;this.plays=0;this.pauses=0;}
  get dataset(){return new Proxy({}, {get:(_,k)=>this.attrs['data-'+String(k).replace(/[A-Z]/g,c=>'-'+c.toLowerCase())],set:(_,k,v)=>(this.attrs['data-'+String(k).replace(/[A-Z]/g,c=>'-'+c.toLowerCase())]=String(v),true)});}
  get classList(){return {toggle:(name,on)=>{const c=new Set((this.attrs.class||'').split(/\s+/).filter(Boolean));const add=on??!c.has(name);add?c.add(name):c.delete(name);this.attrs.class=[...c].join(' ');},add:(n)=>this.classList.toggle(n,true),remove:(n)=>this.classList.toggle(n,false),contains:n=>(this.attrs.class||'').split(/\s+/).includes(n)};}
  set innerHTML(s){this._html=s;this.children=parse(s);this.children.forEach(c=>c.parent=this);if(this.tagName==='SELECT')this._value=this.querySelectorAll('option').find(o=>Object.hasOwn(o.attrs,'selected'))?.attrs.value||this.querySelectorAll('option')[0]?.attrs.value||'';}
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
  pause(){this.pauses++;}play(){this.plays++;return Promise.resolve();}
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
  return holder.children;
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
function checkNews(page,label){
  const cards=page.$$('.updates-grid .update-card');
  const target=c=>c.getAttribute('href')||c.getAttribute('data-report');
  assert.equal(cards.length,publishedNews.length+board.pending_models.length,`${label}: published News and Testing reports`);
  assert.equal(new Set(cards.map(target)).size,cards.length,`${label}: unique report links`);
  assert.equal(page.$$('.updates-grid a.featured-update').length,publishedNews.length,`${label}: published report count`);
  assert.equal(page.$$('.updates-grid .upcoming-update').length,board.pending_models.length,`${label}: Testing report count`);
  assert.equal(page.$('#campaign-models'),null,`${label}: no duplicated model tiles`);
  assert.equal(page.$('#campaign-status').textContent,`${campaignResults.length} of ${campaignIds.length} results available`);
  if(publishedRoundup){
    assert.equal(campaignResults.length,campaignIds.length,`${label}: no premature joint comparison`);
    assert.ok(page.$('#campaign-publication a').getAttribute('href').endsWith(publishedRoundup.href),`${label}: published joint analysis link`);
  }else assert.match(page.$('#campaign-publication').textContent,/preparation|preparing|pending|after|await/i);
  for(const id of campaignIds){
    const model=board.models.find(m=>m.id===id);
    const reports=cards.filter(c=>target(c).endsWith(`updates/${id}.html`));
    assert.equal(reports.length,1,`${label}: ${id} report link`);
    assert.ok(reports[0].classList.contains(model?'featured-update':'upcoming-update'),`${label}: ${id} report state`);
  }
  for(const card of page.$$('.updates-grid .upcoming-update')){
    assert.match(card.textContent,/testing/i);
    assert.match(card.textContent,/pending|verification|verified|await/i);
    assert.doesNotMatch(card.textContent,/\d+(?:\.\d+)?\s*%/);
  }
}
function checkNoRemovedSections(page,label){
  for(const id of ['tier-figure','tier-list','compare','compare-a','compare-b','compare-results'])assert.equal(page.$('#'+id),null,`${label}: obsolete ${id}`);
  assert.ok(page.$$('a').every(a=>!a.getAttribute('href')?.endsWith('#compare')),`${label}: obsolete Compare link`);
}
const home=await load('index.html');
assert.equal(home.$$('#table-body tr').length,board.models.length);
assert.match(home.$('#table-body').innerHTML,/52\.41/);
assert.equal(home.$('#release-title').textContent,[...board.models].sort((a,b)=>b.metrics.score-a.metrics.score)[0].name);
checkNews(home,'Home');
checkNoRemovedSections(home,'Home');
function checkRanking(key){
  const ranked=[...board.models].filter(m=>!m.reference).sort((a,b)=>b.metrics[key]-a.metrics[key]);
  assert.equal(home.$$('#rank-podium .podium-card').length,ranked.length,'every model is on the ranking board');
  assert.deepEqual(home.$$('#rank-podium .podium-card').map(t=>t.dataset.rankModel),ranked.map(r=>r.id),'board order follows the ranking');
  if(home.$('#rank-chart')){assert.equal(home.$$('#rank-chart .chart-row').length,board.models.length);}
  assert.equal(home.$('#rank-podium .podium-leader').dataset.rankModel,ranked[0].id);
  if(home.$('#rank-chart')){assert.deepEqual(home.$$('#rank-chart .chart-row').map(r=>r.dataset.rankModel),ranked.map(r=>r.id));}
  if(ranked[1]){
    const digits=board.metrics.find(m=>m.key===key).digits;
    const lead=(ranked[0].metrics[key]-ranked[1].metrics[key]).toFixed(digits);
    assert.ok(home.$('#rank-podium').textContent.includes(`${lead} ${key==='score'?'points':'pp'} ahead`));
  }
}
checkRanking('score');
await home.$('[data-chart="success"]').click();
checkRanking('success');
assert.equal(home.$('#chart-title').textContent,'Task success');
await home.$('[data-rank-model="opus-5-5"]').click();
assert.match(home.$('#model-dialog-content').innerHTML,/n=200 \/ 222/);
await home.$('.dialog-close').click();
await home.$('[data-chart="score"]').click();
await home.$('[data-provider="Anthropic"]').click();assert.equal(home.$$('#table-body tr').length,board.models.filter(m=>m.provider==='Anthropic').length);
home.$('#model-search').value='Opus';await home.$('#model-search').emit('input');assert.equal(home.$$('#table-body tr').length,board.models.filter(m=>m.provider==='Anthropic'&&`${m.name} ${m.provider} ${m.model_id||''}`.toLowerCase().includes('opus')).length);
home.$('#model-search').value='no-such-model';await home.$('#model-search').emit('input');assert.match(home.$('#table-body').innerHTML,/No models match/);if(home.$('#rank-chart'))assert.match(home.$('#rank-chart').innerHTML,/No models match/);assert.equal(home.$$('#rank-podium .podium-card').length,0);
home.$('#model-search').value='';await home.$('#model-search').emit('input');await home.$('[data-provider="All"]').click();
await home.$('#detail-toggle').click();assert.equal(home.$$('#table-head th').length,board.metrics.length+2);assert.match(home.$('#table-head').innerHTML,/Fixed-ref/);
await home.$('[data-model="opus-5-5"]').click();assert.match(home.$('#model-dialog-content').innerHTML,/n=200 \/ 222/);assert.ok(Object.hasOwn(home.$('#model-dialog').attrs,'open'));
await home.$('.dialog-close').click();
if(home.$('#snapshot-paper')){ await home.$('#snapshot-paper').click();assert.match(home.$('#table-body').innerHTML,/Human-assisted reference/);assert.ok(!home.$('#table-body').innerHTML.includes('Claude Opus 5.5'));assert.equal(home.$$('#table-head th').length,12);assert.ok(!home.$('#rank-podium').innerHTML.includes('Human-assisted reference'));assert.ok(!home.$('#rank-podium').innerHTML.includes('Opus 5.5'));assert.equal(home.$$('#rank-chart .chart-row').length,JSON.parse(fs.readFileSync(path.join(dist,'data/paper-results.json'),'utf8')).models.length); }
if(home.$('#snapshot-current')){ await home.$('#snapshot-current').click(); }
assert.equal(home.$$('#opus-case-explorer .cs-thumb').length,opusCases.cases.length,'Home: one library thumbnail per verified case');
let homeVideos=home.$$('#opus-case-explorer .cs-detail video');
assert.equal(homeVideos.length,2,'Home: Opus and baseline clips');
assert.match(home.$('#opus-case-explorer .cs-detail').textContent,/Case 01/);
await home.$$('#opus-case-explorer .cs-play')[0].click();assert.ok(homeVideos.every(v=>v.plays===1&&v.currentTime===0));
const lastThumb=home.$$('#opus-case-explorer .cs-thumb').at(-1);await lastThumb.click();
assert.ok(homeVideos.every(v=>v.pauses>=1),'Home: switching case pauses clips');
assert.match(home.$('#opus-case-explorer .cs-detail').textContent,new RegExp(`Case ${String(opusCases.cases.length).padStart(2,'0')}`));
assert.match(home.$('#opus-case-explorer .cs-detail').innerHTML,/Terminal error/);assert.match(home.$('#opus-case-explorer .cs-detail').innerHTML,/Task success[\s\S]*Task failed/);
const update=await load('updates/opus-5-5.html');assert.equal(update.$$('#model-results-body tr').length,4);assert.match(update.$('#model-results-body').innerHTML,/29\.4%/);
checkNoRemovedSections(update,'Opus');
assert.equal(update.$$('#generic-metric-coverage tr').length,board.metrics.length-3,'Opus breakdown: metrics not already in the comparison table');
assert.match(update.$('#generic-metric-coverage').textContent,/199 \/ 222/);
assert.ok(update.$('#model-analysis').textContent.trim(),'Opus: evidence-based analysis');
assert.equal(update.$('#model-update-cases').hidden,false);
assert.equal(update.$$('[data-case-index]').length,5);
assert.equal(update.$$('#model-case-view video').length,3);
const initialVideos=update.$$('#model-case-view video');
await update.$('[data-case-play]').click();assert.ok(initialVideos.every(v=>v.plays===1));
initialVideos.forEach(v=>v.currentTime=5);
await update.$('[data-case-reset]').click();assert.ok(initialVideos.every(v=>v.pauses>=1&&v.currentTime===0));
await update.$('[data-case-index="1"]').click();
assert.equal(update.$('[data-case-index="1"]').getAttribute('aria-selected'),'true');
assert.equal(update.$('[data-case-index="0"]').getAttribute('aria-selected'),'false');
assert.match(update.$('#model-case-view').textContent,new RegExp(opusCases.cases[1].title));
assert.ok(initialVideos.every(v=>v.pauses>=2),'Case switching pauses the previous clips');
assert.equal(update.$$('#model-case-view video').length,3);
await update.$('#share-result').click();assert.equal(update.captured[0],'https://example.test/updates/opus-5-5.html');
assert.equal(home.errors.length+update.errors.length,0);
for(const id of campaignIds.filter(id=>id!=='opus-5-5')){
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
    assert.equal(page.$$('#generic-metric-coverage tr').length,board.metrics.length,`${name}: complete metric profile`);
    assert.ok(page.$('#generic-score').innerHTML.startsWith(metricText(model,'score')+'<small>'),`${name}: measured overall score`);
    assert.equal(page.$('#generic-success').textContent,metricText(model,'success')+'%',`${name}: measured task success`);
    assert.equal(page.$('#generic-build').textContent,metricText(model,'build')+'%',`${name}: measured build rate`);
    assert.doesNotMatch(page.$('#generic-model-intro').textContent,/being tested|results pending/i,`${name}: Testing copy replaced`);
    assert.doesNotMatch(page.$('#model-analysis').textContent,/being tested|no verified result is available/i,`${name}: stale Testing analysis replaced`);
    const collection=JSON.parse(fs.readFileSync(path.join(dist,`data/${id}-cases.json`),'utf8'));
    assert.equal(collection.model_id,id,`${name}: case collection attribution`);
    const count=collection.cases?.length||0;
    assert.equal(page.$('#model-update-cases').hidden,count===0,`${name}: verified case visibility`);
    assert.equal(page.$$('[data-case-index]').length,count,`${name}: verified case choices`);
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
const news=await load('news/index.html');checkNews(news,'News');checkNoRemovedSections(news,'News');assert.equal(news.errors.length,0);
console.log('PASS: ranking, filters, empty states, metric and coverage dialogs, archive isolation, four linked model reports, pending-page visibility, Opus case switching and playback/reset, featured case and sharing. Browser layout QA was not performed.');
