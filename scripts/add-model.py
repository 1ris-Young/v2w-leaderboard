"""Add one verified, protocol-compatible model result and a reusable update page."""
import argparse, json, re, html
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--input',required=True);parser.add_argument('--site-origin',default='https://video2world-observatory.zijnzhang.chatgpt.site');parser.add_argument('--replace',action='store_true');args=parser.parse_args()
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
row['source']=receipt.get('source') or {'type':'verified_export','name':Path(args.input).name,'date':date}
board['models']=[m for m in board['models'] if m['id']!=row['id']]+[row]
best=max(board['models'],key=lambda m:m['metrics']['score'])['id']
for m in board['models']:m['featured']=m['id']==best
board['models'].sort(key=lambda m:m['metrics']['score'],reverse=True)
board['snapshot_date']=date;board['site_updated']=date
compare_ids=receipt.get('compare_ids') or [m['id'] for m in board['models'] if m['id']!=row['id']][:2]
board['updates']=[u for u in board['updates'] if u['model_id']!=row['id']]+[{'slug':row['id'],'model_id':row['id'],'title':receipt.get('title',row['name']+' joins Video2World'),'date':date,'status':'results','snapshot_id':board['snapshot_id'],'compare_ids':compare_ids}]
board['pending_models']=[m for m in board['pending_models'] if m['name'] not in [row['name'],receipt.get('pending_name')]]
render=(root/'templates/model-update.html').read_text()
for key,val in {'MODEL_NAME':row['name'],'MODEL_ID':row['id'],'SITE_ORIGIN':args.site_origin.rstrip('/')}.items():render=render.replace('{{'+key+'}}',html.escape(str(val),quote=True))
(root/'site/updates'/f"{row['id']}.html").write_text(render)
index=root/'site/index.html';index_text=index.read_text();leader=next(m for m in board['models'] if m['id']==best)
index_text=re.sub(r'(<meta property="og:title" content=")[^"]*',lambda m:m[1]+html.escape('Video2World — '+leader['name']+' leads the board',quote=True),index_text)
index_text=re.sub(r'(<meta property="og:image" content=")[^"]*',lambda m:m[1]+args.site_origin.rstrip('/')+'/assets/'+leader['id']+'-social.png',index_text)
index.write_text(index_text)
case_file=root/'site/data'/f"{row['id']}-cases.json"
if not case_file.exists():case_file.write_text(json.dumps({'model_id':row['id'],'status':'awaiting_verified_media','cases':[]},indent=2)+'\n')
temporary=p.with_suffix('.json.tmp');temporary.write_text(json.dumps(board,indent=2,ensure_ascii=False)+'\n');temporary.replace(p)
news_path=root/'site/data/news.json'
news=json.loads(news_path.read_text())
entry={'id':row['id'],'title':receipt.get('title',row['name']+' joins Video2World'),'summary':receipt.get('news_summary',f"{row['metrics']['score']:.2f} V2WScore and {row['metrics']['success']:.1f}% task success. Inspect the result and supporting evidence."),'date':date,'date_label':'Result date','status':'published','kind':'model_result','model_id':row['id'],'href':f"updates/{row['id']}.html",'image':f"assets/{row['id']}-social.png",'snapshot_id':board['snapshot_id']}
news['entries']=[n for n in news['entries'] if n['id']!=row['id']]+[entry]
news_path.write_text(json.dumps(news,indent=2,ensure_ascii=False)+'\n')
print('Added',row['name'],'and its result page. Generate its social card, inspect the claims, run checks, then publish.')
