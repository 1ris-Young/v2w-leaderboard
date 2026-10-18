import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const dist=path.join(root,'site');
const read=p=>fs.readFileSync(path.join(dist,p),'utf8');
const board=JSON.parse(read('data/leaderboard.json'));
const archive=JSON.parse(read('data/paper-results.json'));
const cases=JSON.parse(read('data/cases.json'));
const opusCases=JSON.parse(read('data/opus-5-5-cases.json'));
const frontierCases=JSON.parse(read('data/frontier-cases.json'));
const news=JSON.parse(read('data/news.json'));
assert.ok(board.models.length>0);
assert.ok(Number.isInteger(board.instances)&&board.instances>0);
assert.equal(board.metrics.length,12);
assert.equal(new Set(board.metrics.map(m=>m.key)).size,board.metrics.length);
assert.equal(new Set(board.models.map(m=>m.id)).size,board.models.length);
assert.ok(board.pending_models.every(m=>m.metrics===null));
assert.equal(board.models.filter(m=>m.featured).length,1);
assert.deepEqual([...board.models].sort((a,b)=>b.metrics.score-a.metrics.score)[0],board.models.find(m=>m.featured));
for(const model of board.models){
  assert.ok(model.name&&model.provider&&model.source,`${model.id}: result identity and source`);
  for(const m of board.metrics){
    const value=model.metrics[m.key],coverage=model.coverage[m.key];
    assert.ok(Number.isFinite(value),`${model.id}.${m.key}`);
    assert.ok(value>=0,`${model.id}.${m.key}: negative metric`);
    if(m.direction==='up')assert.ok(value<=(m.unit==='0–1'?1:100),`${model.id}.${m.key}: out of range`);
    if(coverage!=null)assert.ok(Number.isInteger(coverage)&&coverage>=0&&coverage<=board.instances,`${model.id}.${m.key}: invalid coverage`);
  }
}
const receiptFile=`data/result-snapshot-${board.snapshot_date}.json`;
if(fs.existsSync(path.join(dist,receiptFile))){
  const receipt=JSON.parse(read(receiptFile));
  assert.equal(receipt.snapshot_date,board.snapshot_date,'Public receipt belongs to the current snapshot');
  assert.equal(receipt.score_source.status,'final','Current scores come from a final published table');
  assert.deepEqual(receipt.score_source.scope,{instances:board.instances,families:board.families},'Published score scope matches the leaderboard');
  assert.equal(receipt.component_aggregation.method,'family_macro','Component aggregation keeps the stated family weighting');
  for(const row of board.models.filter(m=>m.source.type==='owner_published_records'&&m.source.date===receipt.snapshot_date)){
    const supplied=receipt.models.find(m=>m.id===row.id);
    assert.ok(supplied,`${row.id}: current published source has a receipt row`);
    for(const key of ['model_id','run_label'])assert.equal(row[key],supplied[key],`${row.id}: supplied ${key}`);
    for(const key of ['metrics','coverage','coverage_families','score_components'])assert.deepEqual(row[key],supplied[key],`${row.id}: public receipt ${key}`);
    assert.equal(row.metrics.score,supplied.score,`${row.id}: formal published score`);
    assert.equal(row.coverage.score,board.instances,`${row.id}: full score instance scope`);
    assert.equal(row.coverage_families.score,board.families,`${row.id}: full score family scope`);
    assert.match(supplied.record_sha256,/^[a-f0-9]{64}$/,`${row.id}: result source checksum`);
    assert.equal(row.source.record_sha256,supplied.record_sha256,`${row.id}: source checksum matches receipt`);
    assert.equal(row.source.published_at,supplied.published_at,`${row.id}: source publication timestamp`);
  }
}
assert.notEqual(archive.snapshot_id,board.snapshot_id,'Paper archive remains a separate snapshot');
assert.ok(archive.models.some(m=>m.reference),'Paper archive retains its separate reference row');
for(const row of archive.models)for(const key of archive.fields)assert.ok(Number.isFinite(row.metrics[key]),`paper ${row.id}.${key}`);
assert.equal(opusCases.model_id,'opus-5-5');
assert.ok(opusCases.cases.length>0);
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
const homeCaseModelIds=['gpt-6-1-sol','fable-5-1','meta-muse','opus-5-5'];
assert.deepEqual(frontierCases.model_ids,homeCaseModelIds,'Homepage columns use the four selected measured models');
assert.ok(homeCaseModelIds.every(id=>board.models.some(m=>m.id===id)),'Homepage case models all have measured results');
assert.ok(Array.isArray(frontierCases.cases)&&frontierCases.cases.length>0,'Homepage has source cases');
assert.equal(new Set(frontierCases.cases.map(c=>c.id)).size,frontierCases.cases.length);
for(const c of frontierCases.cases){
  assert.ok(c.id&&c.title,`${c.id}: source case identity`);
  checkMedia(c.source,`${c.id}.source`);
  assert.deepEqual(Object.keys(c.models).sort(),[...homeCaseModelIds].sort(),`${c.id}: one output record for each selected model`);
  const suppliedBaseline=opusCases.cases.find(item=>item.id===c.id)?.baseline;
  assert.ok(suppliedBaseline,`${c.id}: Fable output has its supplied baseline source`);
  for(const key of ['video','poster','success'])assert.equal(c.models['fable-5-1'][key],suppliedBaseline[key],`${c.id}: Fable ${key} comes from the supplied baseline`);
  for(const id of homeCaseModelIds){
    const output=c.models[id],label=`${c.id}.${id}`;
    assert.ok(output&&typeof output.status==='string',`${label}: explicit evidence status`);
    const blocked=['testing','awaiting_evidence'].includes(output.status);
    assert.ok(!blocked&&output.video&&typeof output.success==='boolean',`${label}: measured homepage output has a real video and formal judgment`);
    if(blocked)assert.equal(output.success,null,`${label}: unavailable evidence has no task judgment`);
    if(board.pending_models.some(m=>m.id===id)){
      assert.equal(output.status,'testing',`${label}: pending model remains Testing`);
      assert.equal(output.success,null,`${label}: no task judgment while Testing`);
    }
    if(output.success!=null){
      assert.equal(typeof output.success,'boolean',`${label}: boolean task judgment`);
      assert.ok(!blocked&&output.video,`${label}: task judgment needs a supplied rollout`);
    }
    if(output.video&&!blocked)checkMedia(output,label);
    if(output.provenance){
      const source=board.models.find(m=>m.id===id)?.source;
      const p=output.provenance;
      for(const key of ['source_video_sha256','original_rollout_sha256','web_rollout_sha256','published_record_sha256'])assert.match(p[key],/^[a-f0-9]{64}$/,`${label}: ${key}`);
      if(source?.record_sha256)assert.equal(p.published_record_sha256,source.record_sha256,`${label}: model record attribution`);
      if(output.video&&!remote(output.video))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(dist,output.video))).digest('hex'),p.web_rollout_sha256,`${label}: actual web rollout checksum`);
    }
    for(const [key,value] of Object.entries(output.metrics||{})){
      assert.ok(board.metrics.some(m=>m.key===key),`${label}: unknown metric ${key}`);
      assert.ok(value==null||Number.isFinite(value),`${label}.${key}: finite metric or missing`);
    }
  }
  assert.equal(new Set(Object.values(c.models).map(m=>m.provenance?.source_video_sha256).filter(Boolean)).size,1,`${c.id}: every model uses the same source video`);
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
const homeHTML=read('index.html');
assert.ok(homeHTML.indexOf('id="updates"')>=0&&homeHTML.indexOf('id="updates"')<homeHTML.indexOf('id="leaderboard"'),'Homepage News appears before the leaderboard');
for(const id of ['latest-model-news','pending-model-news'])assert.ok(homeHTML.includes(`id="${id}"`),`Homepage declares ${id}`);
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
  if(measured){
    const collection=JSON.parse(read(`data/${id}-cases.json`));
    assert.equal(collection.model_id,id,`${id}: model-report case attribution`);
    assert.ok(Array.isArray(collection.cases),`${id}: measured report declares its case collection`);
    assert.equal(new Set(collection.cases.map(c=>c.id)).size,collection.cases.length,`${id}: unique report case IDs`);
    for(const c of collection.cases){
      assert.equal(typeof c.model.success,'boolean',`${id}.${c.id}: report cases have formal judgments`);
      for(const key of ['source','model',...(c.baseline?['baseline']:[])])checkMedia(c[key],`${id}.${c.id}.${key}`);
    }
  }
}
for(const entry of news.entries){
  if(!remote(entry.href))assert.ok(fs.existsSync(path.join(dist,entry.href)),`${entry.id}: missing News target`);
  for(const key of ['image','cover'])if(entry[key]&&!remote(entry[key]))assert.ok(fs.existsSync(path.join(dist,entry[key])),`${entry.id}: missing News ${key}`);
  if(entry.status==='published'&&entry.kind==='model_result')assert.ok(board.models.some(m=>m.id===entry.model_id),`${entry.id}: published result is unscored`);
}
const analysis=JSON.parse(read('data/model-analysis.json'));
for(const id of news.campaign.model_ids){
  const report=analysis.models[id];
  assert.ok(report,`${id}: analysis or evidence priorities missing`);
  const collection=board.models.some(m=>m.id===id)?JSON.parse(read(`data/${id}-cases.json`)):{cases:[]};
  for(const finding of report.findings||[]){
    const baselineId=finding.baseline_model_id??'fable-5-1';
    assert.ok(typeof baselineId==='string'&&board.models.some(m=>m.id===baselineId),`${id}: analysis baseline must be a measured model`);
    assert.notEqual(baselineId,id,`${id}: analysis baseline must be another model`);
    for(const key of finding.metric_keys||[])assert.ok(board.metrics.some(m=>m.key===key),`${id}: analysis cites known metric ${key}`);
    for(const caseId of finding.case_ids||[])assert.ok(collection.cases.some(c=>c.id===caseId),`${id}: analysis cites a supplied case ${caseId}`);
  }
}
console.log(`PASS: ${board.models.length} measured models and coverage, separate paper archive, ${campaignResults.length}/${news.campaign.model_ids.length} campaign reports, ${board.pending_models.length} unscored Testing models, ${frontierCases.cases.length} four-model source cases, joint publication gate, case media, links and JS syntax.`);
