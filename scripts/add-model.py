"""Add one verified, protocol-compatible model result and a reusable update page."""
import argparse, json, re, html
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--input',required=True);parser.add_argument('--site-origin',default='https://aetherlabsai.github.io/Video2World/leaderboard');parser.add_argument('--replace',action='store_true');args=parser.parse_args()
root=Path(__file__).resolve().parents[1];p=root/'site/data/leaderboard.json';board=json.loads(p.read_text());receipt=json.loads(Path(args.input).read_text())
if receipt.get('compatible_protocol_confirmed') is not True:raise SystemExit('Confirm the same instance manifest, metric definitions, aggregation and evaluator version with compatible_protocol_confirmed=true.')
row=receipt['model'];required={'id','name','provider','model_id','run_label','metrics','coverage','configuration'}
if not required.issubset(row):raise SystemExit('Missing result row fields: '+str(required-set(row)))
if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',row['id']):raise SystemExit('Use a lowercase hyphenated model id.')
for m in board['metrics']:
 value=row['metrics'].get(m['key']);n=row['coverage'].get(m['key'])
 if not isinstance(value,(int,float)):raise SystemExit('Missing/non-numeric '+m['key'])
 if n is not None and (not isinstance(n,int) or not 0<=n<=board['instances']):raise SystemExit('Invalid coverage '+m['key'])
 if m['direction']=='up' and not 0<=value<=(1 if m['unit']=='0–1' else 100):raise SystemExit('Out-of-range '+m['key'])
 if m['direction']=='down' and value<0:raise SystemExit('Negative error '+m['key'])
existing=next((m for m in board['models'] if m['id']==row['id']),None)
if existing and not args.replace:raise SystemExit('This model already exists. Use --replace for a deliberate correction.')
date=receipt['date']
if not re.fullmatch(r'\d{4}-\d{2}-\d{2}',date):raise SystemExit('Date must be YYYY-MM-DD.')
# A result receipt can promote a Testing page to a measured report. Qualitative
# findings need their own explicit review; importing scores must not publish a draft.
analysis_path=root/'site/data/model-analysis.json'
analysis=json.loads(analysis_path.read_text()) if analysis_path.exists() else {'schema_version':1,'models':{}}
model_analysis=receipt.get('analysis')
if model_analysis is not None:
 if receipt.get('analysis_verified') is not True:raise SystemExit('Review model-specific findings and set analysis_verified=true before importing analysis.')
 if not isinstance(model_analysis,dict):raise SystemExit('analysis must be an object.')
 if not isinstance(model_analysis.get('intro'),str):raise SystemExit('analysis.intro must be text.')
 findings=model_analysis.get('findings',[])
 if not isinstance(findings,list):raise SystemExit('analysis.findings must be a list.')
 for finding in findings:
  if not isinstance(finding,dict) or not all(isinstance(finding.get(k),str) for k in ['title','body']):raise SystemExit('Each finding needs a title and body.')
  for key in finding.get('metric_keys',[]):
   if key not in {m['key'] for m in board['metrics']}:raise SystemExit('Unknown analysis metric: '+str(key))
  if not isinstance(finding.get('case_ids',[]),list) or not all(isinstance(case_id,str) for case_id in finding.get('case_ids',[])):raise SystemExit('finding.case_ids must be a list of case IDs.')
 for key in ['limitations','evidence_priorities']:
  if not isinstance(model_analysis.get(key,[]),list) or not all(isinstance(value,str) for value in model_analysis.get(key,[])):raise SystemExit('analysis.'+key+' must be a list of text items.')
 analysis['models'][row['id']]=model_analysis
elif not existing or row['id'] not in analysis['models']:
 analysis['models'][row['id']]={
  'intro':'The measured results are available. Model-specific findings will be added after the metric profile and case evidence have been reviewed.',
  'findings':[],
  'limitations':['Qualitative strengths and limitations have not yet been reviewed. Read each metric with its coverage and supplied evaluation configuration.'],
  'evidence_priorities':['Review verified successful and failed rollouts against the source videos.','Supply iteration logs before making claims about feedback use or recovery.']
 }
row['source']=receipt.get('source') or {'type':'verified_export','name':Path(args.input).name,'date':date}
board['models']=[m for m in board['models'] if m['id']!=row['id']]+[row]
best=max(board['models'],key=lambda m:m['metrics']['score'])['id']
for m in board['models']:m['featured']=m['id']==best
board['models'].sort(key=lambda m:m['metrics']['score'],reverse=True)
board['snapshot_date']=date;board['site_updated']=date
compare_ids=receipt.get('compare_ids') or [m['id'] for m in board['models'] if m['id']!=row['id']][:2]
board['updates']=[u for u in board['updates'] if u['model_id']!=row['id']]+[{'slug':row['id'],'model_id':row['id'],'title':receipt.get('title',row['name']+' joins Video2World'),'date':date,'status':'results','snapshot_id':board['snapshot_id'],'compare_ids':compare_ids}]
board['pending_models']=[m for m in board['pending_models'] if m['id']!=row['id'] and m['name'] not in [row['name'],receipt.get('pending_name')]]
render=(root/'templates/model-update.html').read_text()
for key,val in {'MODEL_NAME':row['name'],'MODEL_ID':row['id'],'SITE_ORIGIN':args.site_origin.rstrip('/'),'SOCIAL_IMAGE':row['id']+'-social.png'}.items():render=render.replace('{{'+key+'}}',html.escape(str(val),quote=True))
(root/'site/updates'/f"{row['id']}.html").write_text(render)
index=root/'site/index.html';index_text=index.read_text();leader=next(m for m in board['models'] if m['id']==best)
index_text=re.sub(r'(<meta property="og:title" content=")[^"]*',lambda m:m[1]+html.escape('Video2World — '+leader['name']+' leads the board',quote=True),index_text)
index_text=re.sub(r'(<meta property="og:image" content=")[^"]*',lambda m:m[1]+args.site_origin.rstrip('/')+'/assets/'+leader['id']+'-social.png',index_text)
index.write_text(index_text)
case_file=root/'site/data'/f"{row['id']}-cases.json"
if not case_file.exists():case_file.write_text(json.dumps({'model_id':row['id'],'status':'awaiting_verified_media','cases':[]},indent=2)+'\n')
analysis_path.write_text(json.dumps(analysis,indent=2,ensure_ascii=False)+'\n')
temporary=p.with_suffix('.json.tmp');temporary.write_text(json.dumps(board,indent=2,ensure_ascii=False)+'\n');temporary.replace(p)
news_path=root/'site/data/news.json'
news=json.loads(news_path.read_text())
entry={'id':row['id'],'title':receipt.get('title',row['name']+' joins Video2World'),'summary':receipt.get('news_summary',f"{row['metrics']['score']:.2f} V2WScore and {row['metrics']['success']:.1f}% task success. Inspect the result and supporting evidence."),'date':date,'date_label':'Result date','status':'published','kind':'model_result','model_id':row['id'],'href':f"updates/{row['id']}.html",'image':f"assets/{row['id']}-social.png",'snapshot_id':board['snapshot_id']}
news['entries']=[n for n in news['entries'] if n['id']!=row['id']]+[entry]
news_path.write_text(json.dumps(news,indent=2,ensure_ascii=False)+'\n')
print('Added',row['name'],'and its result page. Generate its social card, inspect the claims, run checks, then publish.')
