"""Generate a data-derived, labeled 1200 by 630 sharing card."""
import argparse,json,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
parser=argparse.ArgumentParser();parser.add_argument('--model',default='opus-5-5');parser.add_argument('--baselines',nargs='*',default=None);args=parser.parse_args()
root=Path(__file__).resolve().parents[1];data=json.loads((root/'site/data/leaderboard.json').read_text());rows=data['models'];row=next(m for m in rows if m['id']==args.model)
ids=args.baselines or (['opus-5','fable-5-1'] if args.model=='opus-5-5' else [m['id'] for m in sorted(rows,key=lambda m:m['metrics']['score'],reverse=True) if m['id']!=args.model][:2])
baselines=[next(m for m in rows if m['id']==i) for i in ids][:2]
fontdir=Path('/usr/share/fonts/truetype/dejavu')
def font(n,b=False):return ImageFont.truetype(str(fontdir/('DejaVuSans-Bold.ttf' if b else 'DejaVuSans.ttf')),n)
im=Image.new('RGB',(1200,630),'#17121e');d=ImageDraw.Draw(im);ink='#eee1f7';purple='#d2acf2';muted='#bba1ca';green='#a1d8bd'
d.rounded_rectangle((55,42,113,100),radius=13,fill='#382640');d.text((65,60),'V2W',font=font(15,True),fill='white');d.text((129,46),'Video2World',font=font(25,True),fill=ink);d.text((131,79),'Coding agents, physical worlds',font=font(13),fill=muted)
leader=row['id']==max(rows,key=lambda m:m['metrics']['score'])['id'];badge='NEW BENCHMARK LEADER' if leader else 'MODEL UPDATE'
d.rounded_rectangle((937,49,1145,80),radius=5,fill=purple);d.text((955,56),badge,font=font(12,True),fill='#24132e')
size=52
while d.textbbox((0,0),row['name'],font=font(size,True))[2]>1085:size-=2
d.text((55,132),row['name'],font=font(size,True),fill=ink);d.text((58,202),'One video. An agent writes the scene, physics and robot behavior.',font=font(19),fill=muted);d.line((55,251,1145,251),fill='#493353',width=1)
ratio=row['metrics']['success']/baselines[0]['metrics']['success'] if baselines and baselines[0]['metrics']['success']>0 else None
third_value=f'{ratio:.2f}×' if ratio is not None else f"{row['metrics']['progress']:.2f}"
third_label='vs. '+baselines[0]['name'].replace('Claude ','')+' task success' if ratio is not None else 'Stage progress'
for x,val,label in [(55,f"{row['metrics']['score']:.2f}",'V2WScore / 100'),(431,f"{row['metrics']['success']:.1f}%",'Task success'),(817,third_value,third_label)]:
 d.text((x,276),val,font=font(70,True),fill=purple if x!=817 else green)
 label_size=17
 while d.textbbox((0,0),label,font=font(label_size))[2]>335:label_size-=1
 d.text((x+4,366),label,font=font(label_size),fill=muted)
shown=[*baselines,row];limit=max(5,math.ceil((max(m['metrics']['success'] for m in shown)+5)/5)*5)
d.text((227,404),f'Task success · scale 0–{limit}%',font=font(11),fill=muted)
for i,m in enumerate(shown):
 y=430+i*36;short=m['name'].replace('Claude ','');fs=14
 while d.textbbox((0,0),short,font=font(fs))[2]>157:fs-=1
 d.text((58,y),short,font=font(fs),fill=ink);d.rounded_rectangle((227,y+3,897,y+20),radius=4,fill='#35253f');v=m['metrics']['success'];d.rounded_rectangle((227,y+3,227+int(v/limit*670),y+20),radius=4,fill=purple if m['id']==row['id'] else '#80618f');d.text((930,y-1),f'{v:.1f}%',font=font(17,True),fill=purple if m['id']==row['id'] else muted)
d.line((55,561,1145,561),fill='#493353',width=1);d.text((57,579),f"Aether AI | Supplied evaluation snapshot {data['snapshot_date']} | Metric coverage varies",font=font(12),fill=muted);d.text((913,579),'arxiv.org/abs/2610.04432',font=font(12),fill=muted)
out=root/'site/assets'/f"{row['id']}-social.png";im.save(out,optimize=True);print(out)
