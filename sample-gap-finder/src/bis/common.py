import json, base64, re
from PIL import Image
import io
import os
TB=os.environ.get('TB','.build/IdleonToolbox')
OUT=os.environ.get('OUT','data')
D=TB+'/data/website-data/'
IMG=TB+'/public/data/'
items=json.load(open(D+'items.json'))
cards=json.load(open(D+'cards.json'))
sd=json.load(open(D+'shared-data.json'))
chips={c['rawName']:c for c in sd['chips']}
prayers={p['prayerIndex']:p for p in sd['prayers']}
csets={v['rawName']:v for v in sd['cardSets'].values()}
cardByIdx={v['cardIndex']:v for v in cards.values()}
nice=lambda s: re.sub(r'\s+',' ',str(s).replace('_',' ')).strip()
def fill(txt,val):
    t=nice(txt)
    return t.replace('{',str(val)).replace('}',str(val)).replace('[',str(val)) if val is not None else t
STATS=[('Weapon_Power','Weapon Power'),('STR','STR'),('AGI','AGI'),('WIS','WIS'),('LUK','LUK'),('Defence','Defence'),('Speed','Speed')]
def uq(it,k):
    t=it.get(k+'txt'); v=it.get(k+'val')
    if not t or t==0 or t=='0': return None
    t=nice(t).lower()
    t=re.sub(r'(^|\s)(afk|exp|mc|str|agi|wis|luk|hp|mp)\b', lambda m: m.group(1)+m.group(2).upper(), t)
    t=re.sub(r'(^|[\s%])([a-z])', lambda m: m.group(1)+m.group(2).upper(), t)
    v=str(v).replace(',', ' / ')
    if t.startswith('%'): return f"+{v}{t}" if not v.startswith('-') else f"{v}{t}"
    return f"+{v} {t}"
def tip(cat, raw):
    if cat=='Chips':
        c=chips.get(raw); 
        if not c: return {'title':raw,'type':'Lab chip','lines':[]}
        return {'title':nice(c['name']),'type':'Lab chip','lines':[fill(c['bonus'],c['baseVal']), nice(c['description'])]}
    if cat=='Cards':
        idx=raw.replace('2Cards',''); c=cardByIdx.get(idx)
        if not c: return {'title':raw,'type':'Card','lines':[]}
        b=c['bonus']; eff=nice(c['effect'])
        return {'title':nice(c['displayName']),'type':'Card · '+nice(c['category']),'lines':[eff.replace('{',str(b))+' per card level'],'effect':eff}
    if cat=='Card set':
        s=csets.get(raw,{})
        return {'title':nice(s.get('name',raw))+' card set','type':'Card set','lines':['+'+nice(s.get('effect','')).replace('{',str(s.get('bonus','')))+' per set level'],'effect':'+'+nice(s.get('effect',''))}
    if cat=='Prayers':
        p=prayers.get(int(raw.replace('Prayer','')),{})
        return {'title':nice(p.get('name',raw)),'type':'Prayer','lines':['Bonus: '+nice(p.get('effect','')).replace('{',''),'Curse: '+nice(p.get('curse','')).replace('{','').replace('-%','−%')],'effect':nice(p.get('effect','')),'curse':nice(p.get('curse','')).replace('-{','−{')}
    it=items.get(raw)
    if not it: return {'title':raw,'type':cat,'lines':[]}
    lines=[]
    if it.get('itemType')=='Consumable':
        d=' '.join(nice(it.get(f'desc_line{i}','')) for i in range(1,9) if it.get(f'desc_line{i}') and it.get(f'desc_line{i}')!='Filler')
        d=d.replace(' ]% chance', '. A small chance').replace(']%', '').replace(']', '')
        lines.append(fill(d,it.get('Amount')))
    else:
        st=[f"{lab} {it[k]}" for k,lab in STATS if isinstance(it.get(k),(int,float)) and it.get(k)]
        if st: lines.append(' · '.join(st))
        for k in ('UQ1','UQ2'):
            u=uq(it,k)
            if u: lines.append(u)
        if it.get('lvReqToEquip') and it.get('lvReqToEquip')>1: lines.append(f"Level {it['lvReqToEquip']} to equip")
    return {'title':nice(it.get('displayName',raw)),'type':nice(it.get('Type','')).capitalize(),'lines':lines}
imgs={}
def img(raw):
    if raw in imgs: return
    im=Image.open(IMG+raw+'.png').convert('RGBA'); bb=im.getbbox(); im=im.crop(bb)
    b=io.BytesIO(); im.save(b,'PNG',optimize=True); imgs[raw]='data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
