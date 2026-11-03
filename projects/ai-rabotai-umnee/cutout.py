import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
import sys
def cut(name, thr=243, minfrac=0.0015):
    im=np.asarray(Image.open(f'assets/raw/{name}.png').convert('RGB')).astype(float)
    mn=im.min(2); near=mn>=thr
    lab,n=ndimage.label(near)
    sizes=ndimage.sum(near,lab,range(1,n+1))
    border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))
    keep=np.zeros(n+1,bool)
    for i,s in enumerate(sizes,1):
        if i in border or s>minfrac*near.size: keep[i]=True
    bg=keep[lab]
    a=(~bg).astype(float)
    a=ndimage.binary_erosion(a>0.5,iterations=1).astype(float)
    a=np.asarray(Image.fromarray((a*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(float)/255
    # soften near-white fringe: decontaminate against white
    rgb=im.copy()
    m=(a>0.02)&(a<0.98)
    for c in range(3):
        rgb[...,c][m]=np.clip(255-(255-im[...,c][m])/np.maximum(a[m],0.3),0,255)
    out=np.dstack([rgb,a*255]).astype(np.uint8)
    o=Image.fromarray(out,'RGBA'); o=o.crop(o.getbbox()); o.save(f'assets/cut/{name}.png'); print(name,o.size)
cut('hourglass',minfrac=2.0); cut('bulb',minfrac=2.0)
cut('gears'); cut('brain')
# hourglass: soft colour-to-alpha against white so the glass and pillar gaps become see-through
im=np.asarray(Image.open('assets/raw/hourglass.png').convert('RGB')).astype(float)
mn=im.min(2)
a=np.clip((250-mn)/22,0,1)
a=np.asarray(Image.fromarray((a*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(float)/255
rgb=np.clip(255-(255-im)/np.maximum(a,0.05)[...,None],0,255)
o=Image.fromarray(np.dstack([rgb,a*255]).astype(np.uint8),'RGBA'); o=o.crop(o.getbbox()); o.save('assets/cut/hourglass.png'); print('hourglass soft',o.size)
