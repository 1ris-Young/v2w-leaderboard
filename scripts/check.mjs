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
assert.ok(Array.isArray(JSON.parse(read('data/opus-5-5-cases.json')).cases));
new vm.Script(read('app.js'),{filename:'app.js'});
const remote=p=>/^https?:\/\//.test(p);
for(const c of cases){
  assert.ok(c.provenance.includes('predate'));
  assert.equal(c.models.length,9);
  assert.ok(!c.models.some(m=>m.name.includes('5.5')));
  for(const m of [c.source,c.reference,...c.models]){
    assert.ok(m.video&&m.poster,`${c.id}.${m.id} media`);
    for(const key of ['video','poster'])if(!remote(m[key]))assert.ok(fs.existsSync(path.join(dist,m[key].replace(/^\//,''))),`${c.id}.${m.id}.${key} missing`);
  }
}
for(const htmlFile of ['index.html','news/index.html',...fs.readdirSync(path.join(dist,'updates')).filter(n=>n.endsWith('.html')).map(n=>'updates/'+n)]){
  const html=read(htmlFile);const folder=path.dirname(path.join(dist,htmlFile));
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,`${htmlFile}: repeated ID`);
  for(const [all,url] of html.matchAll(/(?:src|href|poster)="([^"]+)"/g)){
    if(remote(url)||url.startsWith('#')||url.startsWith('mailto:'))continue;
    assert.ok(fs.existsSync(path.resolve(folder,url.split('#')[0])),`${htmlFile}: missing ${url}`);
  }
  for(const a of [...html.matchAll(/href="#([^"]+)"/g)])assert.ok(ids.includes(a[1]),`${htmlFile}: broken anchor ${a[1]}`);
}
const news=JSON.parse(read('data/news.json'));assert.equal(news.campaign.model_ids.length,4);assert.equal(board.pending_models.length,3);assert.ok(board.pending_models.every(m=>!board.models.some(r=>r.id===m.id)));for(const entry of news.entries.filter(n=>n.status==='published'))assert.ok(fs.existsSync(path.join(dist,entry.href)));
console.log('PASS: 10 models, 12 metrics, supplied coverage, separate paper archive, three pending frontier models and a News feed, 4 published cases, local assets, links and JS syntax.');
