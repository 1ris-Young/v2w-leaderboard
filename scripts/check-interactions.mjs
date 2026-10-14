import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const dist=path.resolve(import.meta.dirname,'../site');
const reviewDir=process.argv[2] ? path.resolve(process.argv[2]) : null;
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
  const localName=({'index.html':'leaderboard.html','updates/opus-5-5.html':'opus-5-5.html','news/index.html':'news.html'})[file];
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
const home=await load('index.html');
assert.equal(home.$$('#table-body tr').length,10);
assert.match(home.$('#table-body').innerHTML,/52\.41/);
assert.equal(home.$('#release-title').textContent,'Claude Opus 5.5');
if(home.$('#campaign-models')){ assert.equal(home.$$('#campaign-models .campaign-model').length,4);assert.match(home.$('#campaign-status').textContent,/1 of 4/);assert.match(home.$('#campaign-models').innerHTML,/Gemini 4 Argon/);assert.match(home.$('#campaign-models').innerHTML,/Meta Muse/);assert.match(home.$('#campaign-models').innerHTML,/GPT-6.1 Sol/);assert.equal(home.$$('.updates-grid a.update-card').length,1);assert.equal(home.$$('.updates-grid .upcoming-update').length,3); }
assert.equal(home.$$('#rank-podium .podium-card').length,3);
assert.equal(home.$$('#rank-chart .chart-row').length,10);
assert.match(home.$('#rank-podium').innerHTML,/\+8\.28 points ahead/);
await home.$('[data-chart="success"]').click();
assert.match(home.$('#rank-podium').innerHTML,/\+9\.2 pp ahead/);
assert.equal(home.$('#chart-title').textContent,'Task success');
await home.$('[data-rank-model="opus-5-5"]').click();
assert.match(home.$('#model-dialog-content').innerHTML,/n=200 \/ 222/);
await home.$('.dialog-close').click();
await home.$('[data-chart="score"]').click();
assert.match(home.$('#compare-results').innerHTML,/\+8\.28/);
await home.$('[data-provider="Anthropic"]').click();assert.equal(home.$$('#table-body tr').length,3);
home.$('#model-search').value='Opus';await home.$('#model-search').emit('input');assert.equal(home.$$('#table-body tr').length,2);
home.$('#model-search').value='no-such-model';await home.$('#model-search').emit('input');assert.match(home.$('#table-body').innerHTML,/No models match/);assert.match(home.$('#rank-chart').innerHTML,/No models match/);assert.equal(home.$$('#rank-podium .podium-card').length,0);
home.$('#model-search').value='';await home.$('#model-search').emit('input');await home.$('[data-provider="All"]').click();
await home.$('#detail-toggle').click();assert.equal(home.$$('#table-head th').length,14);assert.match(home.$('#table-head').innerHTML,/Fixed-ref/);
await home.$('[data-model="opus-5-5"]').click();assert.match(home.$('#model-dialog-content').innerHTML,/n=200 \/ 222/);assert.ok(Object.hasOwn(home.$('#model-dialog').attrs,'open'));
await home.$('.dialog-close').click();
if(home.$('#snapshot-paper')){ await home.$('#snapshot-paper').click();assert.match(home.$('#table-body').innerHTML,/Human-assisted reference/);assert.ok(!home.$('#table-body').innerHTML.includes('Claude Opus 5.5'));assert.equal(home.$$('#table-head th').length,12);assert.ok(!home.$('#rank-podium').innerHTML.includes('Human-assisted reference'));assert.ok(!home.$('#rank-podium').innerHTML.includes('Opus 5.5'));assert.equal(home.$$('#rank-chart .chart-row').length,JSON.parse(fs.readFileSync(path.join(dist,'data/paper-results.json'),'utf8')).models.length); }
if(home.$('#snapshot-current')){ await home.$('#snapshot-current').click(); }
if(home.$('#case-tabs')){ await home.$('[data-case="lift"]').click();assert.match(home.$('#case-explorer').innerHTML,/passes through solid geometry/); }
if(home.$('#case-tabs')){ await home.$('#case-play').click();assert.ok(home.$$('.case-video').every(v=>v.plays>0)); }
if(home.$('#case-tabs')){ await home.$('#case-pause').click();assert.ok(home.$$('.case-video').every(v=>v.pauses>0)); }
if(home.$('#case-tabs')){ home.$('#case-model-b').value='gemini38flash';await home.$('#case-model-b').emit('change');assert.match(home.$('#case-explorer').innerHTML,/https:\/\/aetherlabsai\.github\.io/);assert.ok(!home.$('#case-explorer').innerHTML.includes('./https://')); }
const update=await load('updates/opus-5-5.html');assert.equal(update.$$('#model-results-body tr').length,4);assert.match(update.$('#model-results-body').innerHTML,/29\.4%/);
await update.$('#share-result').click();assert.equal(update.captured[0],'https://example.test/updates/opus-5-5.html');assert.equal(home.errors.length+update.errors.length,0);
const news=await load('news/index.html');assert.equal(news.$$('.updates-grid a.update-card').length,1);assert.equal(news.$$('#campaign-models .campaign-model').length,4);assert.equal(news.errors.length,0);
console.log('PASS: application interaction checks in a Node DOM adapter — filters, empty state, sorting setup, all-metric toggle, coverage dialog, archive isolation, model comparison, case switching, playback controls, remote media URL handling, share link and model pages. Browser layout QA was not performed.');
