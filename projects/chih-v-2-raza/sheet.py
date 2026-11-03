import sys
from PIL import Image
ts=sys.argv[2:]; out=sys.argv[1]
w=360;h=640
sh=Image.new('RGB',(len(ts)*(w+8),h),'white')
for i,t in enumerate(ts):
    sh.paste(Image.open(f'work/p_{t}.jpg').resize((w,h)),(i*(w+8),0))
sh.save(out)
