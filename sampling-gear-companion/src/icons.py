import json, base64, io
from PIL import Image
import os
IMG=os.environ.get('TB','.build/IdleonToolbox')+'/public/'
raws={}
def add(raw, path=None):
    p = IMG + (path or ('data/'+raw+'.png'))
    im=Image.open(p).convert('RGBA'); bb=im.getbbox(); im=im.crop(bb) if bb else im
    if max(im.size)>64: im.thumbnail((64,64))
    b=io.BytesIO(); im.save(b,'PNG',optimize=True); raws[raw]='data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
for r in ['aUpgradesO2','aUpgradesP2','aUpgradesO21','aUpgradesP21','aUpgradesG21','aUpgradesO26','aUpgradesG27','aUpgradesP26']+['UISkillIcon%d'%i for i in [85,445,263,101,461,295,116,43,142,462,532,296,367,617,646,636,56]]+['StampB1','StampB10','StampB2','StampB12','StampB17','StampB19','StampB46','Mface9','Mface13','Mface21','Mface29','DivGod2','ConsoleJwl12','Arti15','GamingPal','Prayer1','PeanutG','FoodG7','UIboxUpg20','UIboxUpg4','UIboxUpg6','UIboxUpg8','UIboxUpg10','CookingMB6','CookingMB27','CookingMB41','Void','Bug5','SaharanFoal','SnowB2','GodshardBar','aVials13','StatueZ3','StatueZ7','StatueZ9','StatueZ10','StatueZ30','Silkrode','ConsoleChip15']:
    if r=='Silkrode': continue
    add(r)
add('w5b1','monsters/w5b1/static.png')
json.dump(raws,open(os.environ.get('OUT','data')+'/icons.json','w'),separators=(',',':'))
print(len(raws), sum(len(v) for v in raws.values())//1000,'KB')
