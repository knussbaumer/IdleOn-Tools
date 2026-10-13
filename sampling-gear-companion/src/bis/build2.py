import os
# Builds work/bis/bis.json: one board per sampling setup, each split into its own small tables.
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'common.py')).read())
EQ=lambda wpn,pend='EquipmentPendant6',ring='EquipmentRings35':['EquipmentHats123',wpn,'EquipmentShirts41',pend,'EquipmentPants32',ring,'EquipmentShoes41',ring]
SPEC=lambda key='EquipmentKeychain19',cape='EquipmentCape20',gown='EquipmentGown4':[None,key,None,key,cape,'EquipmentRingsChat11',None,gown]
TOOLPOS={'pick':0,'axe':1,'rod':2,'net':3,'trap':4,'skull':5}
def TOOLS(kind,raw): t=[None]*8; t[TOOLPOS[kind]]=raw; t[4]='TrapBoxSet11'; t[5]='WorshipSkull12'; return t
CHIPS=['ConsoleChip21','ConsoleChip20','ConsoleChip18','ConsoleChip17','ConsoleChip16','ConsoleChip15','ConsoleChip8']
OB=lambda gold,silver:['ObolEmp',None,'ObolSlush',None,'ObolHyperB1',gold,'ObolHyper1',silver]
OB_SNAP=['ObolTroll',None,'ObolHyperB1','ObolHyper1']
TROPHY=['Trophy23','Trophy24','Trophy16','Trophy18']
PRAY=['Prayer4','Prayer1']
def C(*a): return ['2Cards'+x for x in a]
BOARDS=[
 ('Mining', dict(Equipment=EQ('EquipmentSword10'),Specials=SPEC(),Tools=TOOLS('pick','EquipmentTools16'),Food=['FoodG12','FoodG9','PeanutG','FoodMining1','FoodEvent1','Pearl2'],Chips=CHIPS,Cards=('CardSet2',C('Z2','I8','F7','Z16','I3','E1','G11','Z11')),Prayers=PRAY,Obols=OB('ObolGoldMining','ObolSilverMining'),Trophy=TROPHY)),
 ('HP Snapshot', dict(Equipment=EQ('EquipmentSword10','EquipmentPendant30','EquipmentRings36'),Specials=SPEC('EquipmentKeychain18','EquipmentCape16','EquipmentGown1'),Tools=TOOLS('pick','EquipmentTools16'),Food=['FoodG9','FoodG1','FoodPotRe4','FoodPotRe3','FoodPotRe2','FoodPotRe1'],Chips=CHIPS,Cards=('CardSet1',C('E4','A7','Y5','Z16','I3','E1','G11','Y4')),Prayers=PRAY,Obols=OB_SNAP)),
 ('Chopping', dict(Equipment=EQ('EquipmentWands14'),Specials=SPEC(),Tools=TOOLS('axe','EquipmentToolsHatchet13'),Food=['FoodG12','FoodG9','FoodChoppin1','FoodEvent2'],Chips=CHIPS,Cards=('CardSet2',C('Z2','I8','F7','Z16','I3','E6','G5','Z11')),Prayers=PRAY,Obols=OB('ObolGoldChoppin','ObolSilverChoppin'),Trophy=TROPHY)),
 ('Mana Snapshot', dict(Equipment=EQ('EquipmentWands14','EquipmentPendant30','EquipmentRings36'),Specials=SPEC('EquipmentKeychain21','EquipmentCape16','EquipmentGown1'),Tools=TOOLS('axe','EquipmentToolsHatchet13'),Food=['FoodG9'],Chips=CHIPS,Cards=('CardSet1',C('C8','A2','I3','H13','G13','G5','E6','Z16')),Prayers=PRAY,Obols=OB_SNAP)),
 ('Catching', dict(Equipment=EQ('EquipmentBows15'),Specials=SPEC(),Tools=TOOLS('net','CatchingNet13'),Food=['FoodG12','FoodG9','FoodCatch1','FoodEvent4'],Chips=CHIPS,Cards=('CardSet2',C('Z2','I8','F7','Z16','I3','E3','G9','Z11')),Prayers=PRAY,Obols=OB('ObolGoldCatching','ObolSilverCatching'),Trophy=TROPHY)),
 ('Fishing', dict(Equipment=EQ('EquipmentSword10'),Specials=SPEC(),Tools=TOOLS('rod','FishingRod13'),Food=['FoodG12','FoodG9','FoodG7','FoodFish1','FoodEvent3','Pearl1'],Chips=CHIPS,Cards=('CardSet2',C('Z2','I8','F7','Z16','I3','E1','G11','Z11')),Prayers=PRAY,Obols=OB('ObolGoldFishing','ObolSilverFishing'),Trophy=TROPHY)),
]
KEYCHAIN_OVERRIDE={'HP Snapshot':'+6% STR (keychains roll their stat; this setup uses the 6% STR roll)','Mana Snapshot':'+6% WIS (keychains roll their stat; this setup uses the 6% WIS roll)'}
def slot(cat,raw,board):
    t=tip(cat,raw)
    if cat=='Specials' and t['type']=='Keychain' and board in KEYCHAIN_OVERRIDE:
        t['lines']=[l for l in t['lines'] if not l.startswith('+')]+[KEYCHAIN_OVERRIDE[board]]
    img(raw)
    s={'raw':raw,'tip':t}
    if cat=='Cards': s['cardIndex']=raw.replace('2Cards','')
    if cat=='Card set': s['setRaw']=raw
    if cat=='Prayers': s['prayerName']=prayers.get(int(raw.replace('Prayer','')),{}).get('name')
    return s
boards=[]
for name,g in BOARDS:
    groups=[]
    for cat in ['Equipment','Specials','Tools','Food','Chips','Cards','Prayers','Obols','Trophy']:
        if cat not in g: continue
        v=g[cat]
        if cat=='Cards':
            setRaw,cards=v
            cs=[slot('Cards',r,name) for r in cards]
            if 'ConsoleChip20' in g['Chips']: cs[0]['omega']='Omega Nanochip doubles the card in this top-left slot.'
            if 'ConsoleChip21' in g['Chips']: cs[7]['omega']='Omega Motherboard doubles the card in this bottom-right slot.'
            groups.append({'cat':'Cards','set':slot('Card set',setRaw,name),'cards':cs})
            continue
        cols=1 if cat in ('Prayers','Trophy') else 2
        rows=4 if cat!='Prayers' else 2
        n=cols*rows
        cells=[(slot(cat,r,name) if r else None) for r in v]+[None]*(n-len(v))
        span0 = cat=='Obols'  # first obol sits centred over both columns
        groups.append({'cat':cat,'cols':cols,'cells':cells,'span0':span0})
    boards.append({'name':name,'groups':groups})
# fishing spots
FISHN={f'Fish{i}':None for i in range(1,14)}
BAIT={'Crash Box':('FishTKweight13',{'D3':11,'Speed':12,'Pow':5}),'Wormie':('FishTKweight1',{'D1':15,'EXP':5}),'Pound of Feathers':('FishTKweight6',{'D2':35,'D3':10,'Speed':5}),'Literal Elephant':('FishTKweight8',{'D2':20,'D3':60,'Pow':6})}
LINE={'Its a Boy':('FishTKlineIcon12',{'Speed':15,'Pow':5}),'Platinum Twine':('FishTKlineIcon4',{'D2':30,'D3':30,'EXP':35,'Speed':12,'Pow':5}),'Zeus Gon Fishin':('FishTKlineIcon9',{'D3':30,'Speed':5,'Pow':20})}
STATN={'D1':'Shallow water','D2':'Medium water','D3':'Deep water','EXP':'Fishing EXP','Speed':'Fishing speed','Pow':'Fishing power'}
def kit(kind,name):
    raw,st=(BAIT if kind=='Bait' else LINE)[name]; img(raw)
    return {'raw':raw,'tip':{'title':name,'type':'Fishing '+kind.lower(),'lines':[' · '.join(f'{STATN[k]} +{v}' for k,v in st.items())]}}
def fish(raw):
    img(raw); it=items[raw]
    return {'raw':raw,'tip':{'title':nice(it['displayName']),'type':'Fish','lines':[]}}
def ring(raw): return slot('Ring',raw,'Fishing') if raw else None
BAITS=['Crash Box','Wormie','Pound of Feathers','Literal Elephant']
LINES=['Its a Boy','Its a Boy','Platinum Twine','Platinum Twine']
RINGS=[None,'EquipmentRingsFishing1','EquipmentRingsFishing2','EquipmentRingsFishing3']
pools=[('Small fish',[1,2,3,4],['Salty Shore Right','Salty Shore Left','Faraway Piers Right','Faraway Piers Left']),
       ('Medium fish',[5,6,7,8],['Deepwater Docks Middle','Deepwater Docks Middle','Deepwater Docks Right','Deepwater Docks Left']),
       ('Big fish',[9,10,11,12],None)]
spots=[]
for title,fs,locs in pools:
    rows=[]
    for i,f in enumerate(fs):
        rows.append({'fish':fish(f'Fish{f}'),'bait':kit('Bait',BAITS[i]),'line':kit('Line',LINES[i]),'ring':ring(RINGS[i]),'loc':locs[i] if locs else None})
    spots.append({'title':title,'rows':rows})
spots[0]['rows'].append({'fish':fish('Fish13'),'bait':kit('Bait','Crash Box'),'line':kit('Line','Its a Boy'),'ring':None,'loc':'Equinox Valley','note':'Sample multiple times'})
zeus=kit('Line','Zeus Gon Fishin')
json.dump({'boards':boards,'spots':spots,'zeus':zeus,'imgs':imgs},open(OUT+'/bis.json','w'),separators=(',',':'))
print(sum(len(v) for v in imgs.values())/1e3,'KB images', len(imgs))
for b in boards:
    print(b['name'], [ (g['cat'], [c and c['tip']['title'] for c in g.get('cells',[])] if 'cells' in g else [g['set']['tip']['title']]+[c['tip']['title'] for c in g['cards']]) for g in b['groups'] if g['cat'] in ('Food','Tools','Cards')])
