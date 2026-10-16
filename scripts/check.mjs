import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..');
const dist=path.join(root,'site');
const read=p=>fs.readFileSync(path.join(dist,p),'utf8');
const board=JSON.parse(read('data/leaderboard.json'));
const archive=JSON.parse(read('data/paper-results.json'));
const cases=JSON.parse(read('data/cases.json'));
const opusCases=JSON.parse(read('data/opus-5-5-cases.json'));
const news=JSON.parse(read('data/news.json'));
assert.ok(board.models.length>=10);
assert.equal(board.metrics.length,12);
assert.equal(new Set(board.models.map(m=>m.id)).size,board.models.length);
const opus=board.models.find(m=>m.id==='opus-5-5');
assert.equal(opus.metrics.score,52.41);assert.equal(opus.metrics.success,29.4);assert.equal(opus.coverage.success,200);
assert.equal(opus.metrics.fixed_success,8.6);
assert.equal(board.models.find(m=>m.id==='fable-5-1').metrics.fixed_success,11.4);
assert.ok(board.pending_models.every(m=>m.metrics===null));
assert.deepEqual([...board.models].sort((a,b)=>b.metrics.score-a.metrics.score)[0],board.models.find(m=>m.featured));
for(const model of board.models){
  for(const m of board.metrics){assert.ok(Number.isFinite(model.metrics[m.key]),`${model.id}.${m.key}`);if(model.coverage[m.key]!=null)assert.ok(model.coverage[m.key]<=222);}
}
assert.equal(archive.models.filter(m=>!m.reference).length,9);
assert.equal(archive.models.find(m=>m.id==='fable-5-1').metrics.score,48.52);
assert.equal(opusCases.model_id,'opus-5-5');
assert.equal(opusCases.cases.length,5);
assert.equal(new Set(opusCases.cases.map(c=>c.id)).size,opusCases.cases.length);
assert.ok(opusCases.cases.some(c=>c.id===opusCases.featured_case));
assert.equal(opusCases.selection.selected_cases,opusCases.cases.length);
assert.ok(opusCases.selection.selected_cases<=opusCases.selection.matching_cases);
assert.ok(opusCases.selection.matching_cases<=opusCases.selection.common_cases);
new vm.Script(read('app.js'),{filename:'app.js'});
const remote=p=>/^https?:\/\//.test(p);
const checkMedia=(media,label)=>{
  assert.ok(media?.video&&media?.poster,`${label}: video and poster required`);
  for(const key of ['video','poster'])if(!remote(media[key]))assert.ok(fs.existsSync(path.join(dist,media[key].replace(/^\//,''))),`${label}.${key}: missing ${media[key]}`);
};
for(const c of cases){
  assert.ok(c.provenance.includes('predate'));
  assert.equal(c.models.length,9);
  assert.ok(!c.models.some(m=>m.name.includes('5.5')));
  for(const m of [c.source,c.reference,...c.models])checkMedia(m,`${c.id}.${m.id}`);
}
for(const c of opusCases.cases){
  assert.equal(c.model.success,true,`${c.id}: selected Opus outcome`);
  assert.equal(c.baseline.success,false,`${c.id}: selected baseline outcome`);
  assert.ok(c.provenance.run_label.includes('opus55_v2'));
  assert.ok(c.provenance.evaluator_version);
  for(const key of ['source_video_sha256','opus_rollout_sha256','baseline_rollout_sha256'])assert.match(c.provenance[key],/^[a-f0-9]{64}$/,`${c.id}.${key}: source hash`);
  for(const key of ['source','model','baseline'])checkMedia(c[key],`${c.id}.${key}`);
}
for(const htmlFile of ['index.html','news/index.html',...fs.readdirSync(path.join(dist,'updates')).filter(n=>n.endsWith('.html')).map(n=>'updates/'+n)]){
  const html=read(htmlFile);const folder=path.dirname(path.join(dist,htmlFile));
  assert.ok(!/href="[^"]*#compare"/.test(html),`${htmlFile}: obsolete Compare navigation`);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,`${htmlFile}: repeated ID`);
  for(const [all,url] of html.matchAll(/(?:src|href|poster)="([^"]+)"/g)){
    if(remote(url)||url.startsWith('#')||url.startsWith('mailto:'))continue;
    assert.ok(fs.existsSync(path.resolve(folder,url.split('#')[0])),`${htmlFile}: missing ${url}`);
  }
  for(const a of [...html.matchAll(/href="#([^"]+)"/g)])assert.ok(ids.includes(a[1]),`${htmlFile}: broken anchor ${a[1]}`);
}
assert.equal(news.campaign.model_ids.length,4);
assert.equal(new Set(news.campaign.model_ids).size,4);
assert.ok(board.pending_models.every(m=>!board.models.some(r=>r.id===m.id)));
assert.equal(new Set(news.entries.map(n=>n.id)).size,news.entries.length);
const campaignResults=news.campaign.model_ids.filter(id=>board.models.some(m=>m.id===id));
const publishedRoundups=news.entries.filter(n=>n.kind==='roundup'&&n.status==='published');
if(news.campaign.publication_status==='published'||news.campaign.roundup_href||publishedRoundups.length){
  assert.equal(campaignResults.length,news.campaign.model_ids.length,'Joint comparison requires all campaign results');
  assert.equal(news.campaign.publication_status,'published','Joint comparison needs an explicit publication status');
  assert.ok(news.campaign.roundup_href,'Published joint comparison needs its target');
  assert.ok(publishedRoundups.some(n=>n.href===news.campaign.roundup_href),'Joint comparison target needs a published News entry');
}
for(const id of news.campaign.model_ids){
  const measured=board.models.some(m=>m.id===id),pending=board.pending_models.some(m=>m.id===id);
  assert.ok(measured||pending,`${id}: missing campaign model`);
  assert.ok(fs.existsSync(path.join(dist,`updates/${id}.html`)),`${id}: model report page missing`);
  const reports=news.entries.filter(n=>n.kind==='model_result'&&n.model_id===id&&n.status==='published');
  assert.equal(reports.length,measured?1:0,`${id}: publication must match measured or Testing state`);
}
for(const entry of news.entries){
  if(!remote(entry.href))assert.ok(fs.existsSync(path.join(dist,entry.href)),`${entry.id}: missing News target`);
  if(entry.status==='published'&&entry.kind==='model_result')assert.ok(board.models.some(m=>m.id===entry.model_id),`${entry.id}: published result is unscored`);
}
const analysis=JSON.parse(read('data/model-analysis.json'));
for(const id of news.campaign.model_ids)assert.ok(analysis.models[id],`${id}: analysis or evidence priorities missing`);
console.log(`PASS: supplied results and coverage, separate paper archive, ${news.campaign.model_ids.length} model report pages (${campaignResults.length} measured), ${board.pending_models.length} unscored Testing models, joint publication gate, five verified case media sets, links and JS syntax.`);
