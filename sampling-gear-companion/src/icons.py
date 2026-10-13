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
import glob
for f in sorted(glob.glob(IMG+'data/UISkillIcon*.png')):
    raws[os.path.basename(f)[:-4]]='data:image/png;base64,'+base64.b64encode(open(f,'rb').read()).decode()
for pat in ['Trophy[0-9]*.png', 'EquipmentNametag[0-9]*.png']:
    for f in sorted(glob.glob(IMG+'data/'+pat)):
        raws[os.path.basename(f)[:-4]]='data:image/png;base64,'+base64.b64encode(open(f,'rb').read()).decode()
for r in ['aUpgradesO17','aUpgradesP17','aUpgradesG17','aSiga16','HoleUIbuildUpg49','RooA','BribeW','PachiBall1','DungeonA7','SignStar1b','TrapBoxSet1','CompassUpg9','2CardsZ11','CardSet2','GalleryPodiumA3','HatHelpA','PremiumGem','TaskAchBorder1','ConsoleChip11','ConsoleChip8','Island1','DivGod0','DivGod4','ClassIcons42','ClassIcons44','ClassIcons45','ClassIcons47','ClassIcons59','ClassIcons55','HoopShop3','ConTowerB26','Bravery_Monument_x1','Justice_Monument_x1','Wisdom_Monument_x1','VaultUpg23','Prayer4','Prayer12','FoodG12','EquipmentHats123','ObolHyper1','Copper','OakTree','Bug1','Fish1','FishTKweight13','ArcaneHelp','EquipmentNametag15','ClassIcons21','ClassIcons25','ClassIcons4','EquipmentTools16','EquipmentToolsHatchet13','CatchingNet13','FishingRod13']:
    add(r)
for r,pth in [('Tome_0','etc/Tome_0.png'),('Friends','etc/Friends.png'),('Guild','etc/Guild.png'),('VoteBallot','etc/VoteBallot.png'),('Event_Currency','etc/Event_Currency.png'),('TasksStar','etc/TasksStar.png'),('Mega_Grumblo','etc/Mega_Grumblo.png'),('PassiveCard','etc/PassiveCard.png'),('Armor_Set_Smithy','etc/Armor_Set_Smithy.png'),('beanG','monsters/beanG/static.png'),('Pet12','monsters/Pet12/static.png')]:
    add(r,pth)
add('w5b1','monsters/w5b1/static.png')
items=json.load(open(os.environ.get('TB','.build/IdleonToolbox')+'/data/website-data/items.json'))
for k in list(raws):
    if (k.startswith('Trophy') or k.startswith('EquipmentNametag')) and k in items:
        raws['n:'+k]=items[k].get('displayName',k).replace('_',' ')
json.dump(raws,open(os.environ.get('OUT','data')+'/icons.json','w'),separators=(',',':'))
print(len(raws), sum(len(v) for v in raws.values())//1000,'KB')
