# Motion Director — 10s vertical kinetic editorial collage, rendered frame by frame (PIL + numpy -> ffmpeg).
# Usage:  python render.py preview t1 t2 ...   -> work/preview_<t>.jpg
#         python render.py video               -> work/video_noaudio.mp4
import sys, math, subprocess, os, functools
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS, DUR = 1080, 1920, 30, 10.0
ROOT = os.path.dirname(os.path.abspath(__file__))
A = lambda *p: os.path.join(ROOT, *p)
os.makedirs(A('work'), exist_ok=True)

PURPLE = (88, 44, 196)
CHAR = (33, 30, 38)
WHITE = (255, 255, 255)
GUIDE = (150, 140, 130)

# ---------------------------------------------------------------- easing
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def prog(t, a, b): return clamp((t - a) / (b - a)) if b > a else float(t >= a)
def out_cubic(x): return 1 - (1 - x) ** 3
def in_cubic(x): return x ** 3
def in_out(x): return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2
def out_back(x, s=1.9):
    c3 = s + 1
    return 1 + c3 * (x - 1) ** 3 + s * (x - 1) ** 2
def lerp(a, b, x): return a + (b - a) * x

# ---------------------------------------------------------------- fonts & text
FONTS = {'bold': A('fonts', 'PF-900-italic.ttf'), 'light': A('fonts', 'PF-400-italic.ttf')}

@functools.lru_cache(None)
def font(kind, size): return ImageFont.truetype(FONTS[kind], size)

@functools.lru_cache(None)
def text_img(text, kind, size, color, alpha=255):
    f = font(kind, size)
    l, t, r, b = f.getbbox(text, anchor='ls')
    pad = int(size * 0.35)
    im = Image.new('RGBA', (r - l + 2 * pad, b - t + 2 * pad), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((pad - l, pad - t), text, font=f, fill=color + (alpha,), anchor='ls')
    return im, (pad - l, pad - t)   # image, baseline-origin inside image

def text_w(text, kind, size):
    l, t, r, b = font(kind, size).getbbox(text, anchor='ls'); return r - l

# ---------------------------------------------------------------- compositing helpers
def comp(dst, src, x, y):
    """alpha-composite src onto dst at float/neg coords (clipped)."""
    x, y = int(round(x)), int(round(y))
    sw, sh = src.size
    l, t = max(0, -x), max(0, -y)
    r, b = min(sw, W - x), min(sh, H - y)
    if r <= l or b <= t: return
    s = src if (l, t, r, b) == (0, 0, sw, sh) else src.crop((l, t, r, b))
    dst.alpha_composite(s, (x + l, y + t))

def fade(im, op):
    if op >= 0.999: return im
    im = im.copy(); a = im.getchannel('A').point(lambda v: int(v * op)); im.putalpha(a); return im

def draw_text(dst, text, kind, size, color, x, y, op=1.0, scale=1.0, blur=0.0, dy=0.0, alpha=255):
    """x,y = baseline-left. scale is applied around the text centre."""
    if op <= 0.003: return
    im, (ox, oy) = text_img(text, kind, size, color, alpha)
    cx, cy = x - ox + im.width / 2, y - oy + im.height / 2 + dy
    if abs(scale - 1) > 0.002:
        im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.BICUBIC)
    if blur > 0.3: im = im.filter(ImageFilter.GaussianBlur(blur))
    comp(dst, fade(im, op), cx - im.width / 2, cy - im.height / 2)

def blur_reveal(dst, text, kind, size, color, x, y, t, t0, dur=0.38):
    p = prog(t, t0, t0 + dur)
    if p <= 0: return
    e = out_cubic(p)
    draw_text(dst, text, kind, size, color, x, y, op=e, scale=lerp(1.12, 1, e), blur=(1 - e) * 22)

def pop_text(dst, text, kind, size, color, x, y, t, t0, dur=0.42, frm=0.4):
    p = prog(t, t0, t0 + dur)
    if p <= 0: return
    draw_text(dst, text, kind, size, color, x, y, op=clamp(p * 4), scale=lerp(frm, 1, out_back(p)))

def slam_text(dst, text, kind, size, color, x, y, t, t0, dur=0.24):
    p = prog(t, t0, t0 + dur)
    if p <= 0: return
    draw_text(dst, text, kind, size, color, x, y, op=clamp(p * 3), scale=lerp(1.45, 1, out_cubic(p)), blur=(1 - p) * 6)

# ---------------------------------------------------------------- heroes
def load_hero(name, height=None, width=None):
    im = Image.open(A('assets', 'cut', name + '.png')).convert('RGBA')
    s = (height / im.height) if height else (width / im.width)
    im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    return im

def make_shadow(im, color, op, blur):
    a = im.getchannel('A').point(lambda v: int(v * op))
    sh = Image.new('RGBA', im.size, color + (0,)); sh.putalpha(a)
    pad = int(blur * 3)
    big = Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad), color + (0,))
    big.paste(sh, (pad, pad))
    return big.filter(ImageFilter.GaussianBlur(blur))

class Hero:
    def __init__(self, name, shadow_color, shadow_op=0.38, blur=26, **size):
        self.im = load_hero(name, **size)
        self.sh = make_shadow(self.im, shadow_color, shadow_op, blur)
    @staticmethod
    def _xf(im, scale, rot):
        if abs(scale - 1) > 0.002:
            im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.BICUBIC)
        if abs(rot) > 0.05:
            im = im.rotate(rot, resample=Image.BICUBIC, expand=True)
        return im
    def draw(self, dst, cx, cy, scale=1.0, rot=0.0, op=1.0, sh_off=(38, 46)):
        if scale <= 0.01 or op <= 0.003: return
        s = self._xf(self.sh, scale, rot)
        comp(dst, fade(s, op), cx + sh_off[0] * scale - s.width / 2, cy + sh_off[1] * scale - s.height / 2)
        h = self._xf(self.im, scale, rot)
        comp(dst, fade(h, op), cx - h.width / 2, cy - h.height / 2)

# ---------------------------------------------------------------- graphic accents
def star4(dst, cx, cy, r, color=WHITE, rot=0.0):
    if r < 1: return
    pts = []
    for i in range(8):
        a = math.radians(rot + i * 45)
        rr = r if i % 2 == 0 else r * 0.2
        pts.append((cx + rr * math.sin(a), cy - rr * math.cos(a)))
    ImageDraw.Draw(dst).polygon(pts, fill=color + (255,))

def corner_spikes(dst, corner, p, seed=0):
    if p <= 0: return
    rng = np.random.default_rng(seed)
    cx, cy = corner
    # direction into the frame
    base = math.atan2(H / 2 - cy, W / 2 - cx)
    d = ImageDraw.Draw(dst)
    for i in range(7):
        a = base + (i - 3) * 0.2 + rng.uniform(-0.05, 0.05)
        L = rng.uniform(150, 360) * out_back(clamp(p * 1.3 - i * 0.04), 2.2)
        w = rng.uniform(10, 22)
        tip = (cx + L * math.cos(a), cy + L * math.sin(a))
        nx, ny = -math.sin(a) * w, math.cos(a) * w
        d.polygon([(cx + nx, cy + ny), (cx - nx, cy - ny), tip], fill=WHITE + (255,))

def marker(dst, x0, y0, x1, y1, p, width=17, color=PURPLE, seed=1):
    if p <= 0: return
    rng = np.random.default_rng(seed)
    n = 28
    pts = []
    wob = rng.uniform(0, 6.28)
    for i in range(int(n * p) + 1):
        u = i / n
        x = lerp(x0, x1, u); y = lerp(y0, y1, u) + 5 * math.sin(u * 5 + wob)
        pts.append((x, y))
    if len(pts) < 2: return
    d = ImageDraw.Draw(dst)
    d.line(pts, fill=color + (255,), width=width, joint='curve')
    for (x, y) in (pts[0], pts[-1]):
        d.ellipse((x - width / 2, y - width / 2, x + width / 2, y + width / 2), fill=color + (255,))

CURSOR = [(0, 0), (0, 36), (9, 27), (16, 42), (23, 39), (16, 24), (28, 24)]
def cursor(dst, x, y, s=2.4):
    d = ImageDraw.Draw(dst)
    pts = [(x + px * s, y + py * s) for px, py in CURSOR]
    d.polygon(pts, fill=(15, 15, 18, 255), outline=WHITE + (255,), width=4)

def ring(dst, cx, cy, r, width, color, op):
    if op <= 0: return
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(lay).ellipse((cx - r, cy - r, cx + r, cy + r), outline=color + (int(255 * op),), width=width)
    dst.alpha_composite(lay)

def starburst_mask(cx, cy, R, points=14, rot=0.0):
    m = Image.new('L', (W, H), 0)
    if R > 0:
        pts = []
        for i in range(points * 2):
            a = math.radians(rot) + i * math.pi / points
            rr = R if i % 2 == 0 else R * 0.52
            pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
        ImageDraw.Draw(m).polygon(pts, fill=255)
    return m

def circle_mask(cx, cy, R):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).ellipse((cx - R, cy - R, cx + R, cy + R), fill=255)
    return m

# ---------------------------------------------------------------- canvases
wall_src = Image.open(A('assets', 'raw', 'wall.png')).convert('RGB')
wall_src = wall_src.resize((int(W * 1.12), int(H * 1.12)), Image.LANCZOS)
wa = np.asarray(wall_src).astype(np.float32)
wa = 255 - (255 - wa) * 0.70                          # lift into bright warm off-white
wa = wa * np.array([1.0, 0.99, 0.965]) + np.array([0, 1, 3])
WALL = Image.fromarray(np.clip(wa, 0, 255).astype(np.uint8)).convert('RGBA')

def wall(t):
    # leafy shadows drift very slowly
    ox = (WALL.width - W) / 2 + 26 * math.sin(t * 0.35)
    oy = (WALL.height - H) / 2 + 14 * math.cos(t * 0.27)
    return WALL.transform((W, H), Image.AFFINE, (1, 0, ox, 0, 1, oy), resample=Image.BILINEAR)

PURPLE_BG = Image.new('RGBA', (W, H), PURPLE + (255,))
_g = ImageDraw.Draw(PURPLE_BG)
for x in range(0, W + 1, 72): _g.line([(x, 0), (x, H)], fill=(126, 92, 220, 255), width=1)
for y in range(0, H + 1, 72): _g.line([(0, y), (W, y)], fill=(126, 92, 220, 255), width=1)
# soft vignette glow in the middle of the purple
_v = np.asarray(PURPLE_BG).astype(np.float32)
yy, xx = np.mgrid[0:H, 0:W]
gl = np.exp(-(((xx - W * 0.55) / 700) ** 2 + ((yy - H * 0.45) / 900) ** 2))[..., None]
_v[..., :3] = _v[..., :3] * (0.86 + 0.22 * gl)
PURPLE_BG = Image.fromarray(np.clip(_v, 0, 255).astype(np.uint8), 'RGBA')

def guides(dst, p):
    if p <= 0: return
    d = ImageDraw.Draw(dst)
    e = out_cubic(p)
    d.line([(862, 0), (862, H * e)], fill=GUIDE + (110,), width=2)
    d.line([(0, 700), (W * e, 700)], fill=GUIDE + (110,), width=2)

# ---------------------------------------------------------------- assets
HOUR = Hero('hourglass', (120, 90, 50), 0.34, height=1080)
GEARS = Hero('gears', (40, 15, 100), 0.55, width=720)
BULB = Hero('bulb', (40, 15, 100), 0.55, height=790)
BRAIN = Hero('brain', (90, 50, 180), 0.32, width=1160)
DOF = load_hero('gears', width=430).filter(ImageFilter.GaussianBlur(13))
DOF = fade(DOF, 0.85)

GLOW = Image.new('RGBA', (900, 900), (0, 0, 0, 0))
_gy, _gx = np.mgrid[0:900, 0:900]
_ga = np.exp(-(((_gx - 450) ** 2 + (_gy - 450) ** 2) / (2 * 190 ** 2)))
GLOW = Image.fromarray(np.dstack([np.full((900, 900), 230), np.full((900, 900), 200), np.full((900, 900), 255), (_ga * 200)]).astype(np.uint8), 'RGBA')

# ---------------------------------------------------------------- timing (from voiceover analysis)
T = dict(
    v8=0.95, chasov=1.38, strike=2.22, neuro=2.45, minute=3.45, flip=3.55,
    cursor_in=3.92, click=4.27, flood0=4.32, flood1=4.60,
    dai=4.60, rutinu=4.88, sebe=5.91, idei=6.69,
    burst0=7.13, burst1=7.52,
    rabotai=7.59, umnee=8.10, a=8.84, ne=8.93, dolshe=9.02, strike2=9.22,
)

# layout
X0 = 72
BL_8, S_8 = 470, 360
S_CH = 150
X_CH = X0 + text_w('8', 'bold', S_8) + 30
BL_NEURO = 640
BL_MIN = 870
X_MIN = X0 + text_w('1', 'bold', 270) + 26
CLICK = (X_MIN + text_w('минута', 'bold', 160) * 0.55, BL_MIN - 50)

# ---------------------------------------------------------------- scenes
def scene_a(t):
    f = wall(t)
    guides(f, prog(t, 0.0, 0.4))
    # ghost word
    draw_text(f, 'ВРЕМЯ', 'bold', 420, CHAR, 40 - 45 * t, 560, op=prog(t, 0, 0.5), alpha=16)
    # headline: 8 часов
    blur_reveal(f, '8', 'bold', S_8, PURPLE, X0, BL_8, t, T['v8'])
    blur_reveal(f, 'часов', 'bold', S_CH, CHAR, X_CH, BL_8, t, T['chasov'])
    marker(f, X0 - 14, BL_8 - 70, X_CH + text_w('часов', 'bold', S_CH) + 22, BL_8 - 104, prog(t, T['strike'], T['strike'] + 0.3))
    # typed line
    word = 'нейросеть'
    n = int(len(word) * prog(t, T['neuro'], T['neuro'] + 0.6) + 0.999)
    if n > 0:
        draw_text(f, word[:n], 'light', 96, CHAR, X0 + 4, BL_NEURO)
        if n < len(word) or (t * 2.5) % 1 < 0.6:   # blinking caret
            cx = X0 + 8 + text_w(word[:n], 'light', 96)
            ImageDraw.Draw(f).rectangle((cx + 4, BL_NEURO - 72, cx + 9, BL_NEURO + 12), fill=PURPLE + (255,))
    # 1 минута
    slam_text(f, '1', 'bold', 270, PURPLE, X0, BL_MIN, t, T['minute'])
    slam_text(f, 'минута', 'bold', 160, PURPLE, X_MIN, BL_MIN, t, T['minute'] + 0.08)
    # hourglass hero
    p = prog(t, 0.45, 1.3)
    if p > 0:
        e = out_back(p, 1.5)
        cx, cy = lerp(1300, 850, e), lerp(2500, 1450, e)
        rot = lerp(14, -3, e) + 1.6 * math.sin(t * 2.1)
        cy += 10 * math.sin(t * 2.4)
        fp = in_out(prog(t, T['flip'], T['flip'] + 0.55))
        rot += 180 * fp
        HOUR.draw(f, cx, cy, 1.0, rot)
    # cursor + click
    if t >= T['cursor_in']:
        cp = out_cubic(prog(t, T['cursor_in'], T['click']))
        x, y = lerp(1150, CLICK[0], cp), lerp(1500, CLICK[1], cp)
        dip = 1 - 0.18 * math.sin(math.pi * prog(t, T['click'], T['click'] + 0.12))
        rp = prog(t, T['click'], T['click'] + 0.38)
        if rp > 0: ring(f, CLICK[0], CLICK[1], lerp(18, 170, out_cubic(rp)), 7, PURPLE, 1 - rp)
        cursor(f, x, y, 2.4 * dip)
    return f

def scene_b(t):
    f = PURPLE_BG.copy()
    lt = t - T['dai']
    draw_text(f, 'РУТИНА', 'bold', 400, WHITE, -260 + 55 * lt, 1210, alpha=20)
    corner_spikes(f, (W, 0), prog(t, T['dai'], T['dai'] + 0.32), 3)
    corner_spikes(f, (0, H), prog(t, T['dai'] + 0.05, T['dai'] + 0.37), 5)
    # gears
    gp = prog(t, T['dai'] - 0.05, T['dai'] + 0.42)
    if gp > 0:
        GEARS.draw(f, 770, 470 + 9 * math.sin(t * 2.2), out_back(gp, 2.0), -28 * lt, sh_off=(30, 44))
    draw_text(f, 'ей —', 'light', 84, WHITE, X0, 935, op=prog(t, T['dai'], T['dai'] + 0.25), dy=20 * (1 - out_cubic(prog(t, T['dai'], T['dai'] + 0.3))))
    pop_text(f, 'рутину', 'bold', 172, WHITE, X0, 1100, t, T['rutinu'])
    # bulb + glow
    bp = prog(t, T['sebe'], T['sebe'] + 0.45)
    if bp > 0:
        gx, gy = 250, 1560 + 10 * math.sin(t * 2.6 + 1)
        ip = prog(t, T['idei'], T['idei'] + 0.5)
        if ip > 0:
            g = GLOW.resize((int(900 * (0.8 + 0.4 * out_cubic(ip))),) * 2, Image.BICUBIC)
            comp(f, fade(g, (0.55 + 0.45 * math.sin(math.pi * min(1, ip * 1.2))) * (0.85 + 0.15 * math.sin(t * 9))), gx - g.width / 2, gy - 120 - g.height / 2)
        BULB.draw(f, gx, gy, out_back(bp, 2.0), 8 * math.sin(t * 1.7), sh_off=(32, 44))
    draw_text(f, 'себе —', 'light', 84, WHITE, 560, 1395, op=prog(t, T['sebe'], T['sebe'] + 0.25), dy=20 * (1 - out_cubic(prog(t, T['sebe'], T['sebe'] + 0.3))))
    slam_text(f, 'идеи', 'bold', 200, WHITE, 552, 1590, t, T['idei'])
    sp = prog(t, T['idei'] + 0.12, T['idei'] + 0.45)
    if sp > 0:
        r = 46 * out_back(sp, 2.5)
        wi = text_w('идеи', 'bold', 200)
        star4(f, 552 + wi + 40, 1430, r, rot=40 * (t - T['idei']))
        star4(f, 540, 1640, r * 0.6, rot=-30 * (t - T['idei']))
    return f

def scene_c(t):
    f = wall(t)
    guides(f, 1)
    lt = t - T['burst0']
    draw_text(f, 'УМНЕЕ', 'bold', 420, CHAR, 120 - 45 * lt, 560, alpha=16)
    comp(f, DOF, W - DOF.width * 0.62 + 10 * math.sin(t), -110 + 8 * math.cos(t * 0.8))
    blur_reveal(f, 'Работай', 'bold', 150, CHAR, X0, 400, t, T['rabotai'])
    pop_text(f, 'умнее', 'bold', 270, PURPLE, X0 - 4, 650, t, T['umnee'], dur=0.48, frm=0.3)
    sp = prog(t, T['umnee'] + 0.2, T['umnee'] + 0.55)
    if sp > 0:
        r = 52 * out_back(sp, 2.5) * (1 + 0.08 * math.sin(t * 6))
        wi = text_w('умнее', 'bold', 270)
        star4(f, X0 + wi + 46, 470, r, PURPLE, rot=35 * (t - T['umnee']))
        star4(f, X0 + wi + 2, 412, r * 0.45, PURPLE, rot=-20 * (t - T['umnee']))
    # brain
    p = prog(t, 7.6, 8.4)
    if p > 0:
        e = out_back(p, 1.4)
        cx, cy = lerp(1250, 650, e), lerp(2600, 1400, e)
        BRAIN.draw(f, cx, cy + 12 * math.sin(t * 2.2), 1.0, lerp(-16, 0, e) + 2 * math.sin(t * 1.6), sh_off=(40, 52))
    # а не дольше — staggered word build
    x = X0 + 6
    for w, k in (('а', 'a'), ('не', 'ne'), ('дольше', 'dolshe')):
        q = out_cubic(prog(t, T[k], T[k] + 0.28))
        draw_text(f, w, 'light', 96, CHAR, x, 820, op=q, dy=30 * (1 - q))
        if w == 'дольше': xd = x
        x += text_w(w, 'light', 96) + 26
    marker(f, xd - 12, 790, xd + text_w('дольше', 'light', 96) + 16, 784, prog(t, T['strike2'], T['strike2'] + 0.26), width=14, seed=4)
    return f

# ---------------------------------------------------------------- frame assembly
rng = np.random.default_rng(11)
GRAIN = [rng.normal(0, 4.0, (H, W, 1)).astype(np.float32) for _ in range(4)]

def frame(t):
    if t < T['flood0']:
        f = scene_a(t)
    elif t < T['flood1']:
        a, b = scene_a(t), scene_b(t)
        R = in_cubic(prog(t, T['flood0'], T['flood1'])) * 2300
        f = Image.composite(b, a, circle_mask(CLICK[0], CLICK[1], R))
    elif t < T['burst0']:
        f = scene_b(t)
    elif t < T['burst1']:
        a, c = scene_b(t), scene_c(t)
        R = in_cubic(prog(t, T['burst0'], T['burst1'])) * 2600
        rot = 60 * (t - T['burst0'])
        a.paste(Image.new('RGBA', (W, H), WHITE + (255,)), (0, 0), starburst_mask(540, 960, R * 1.1 + 30, rot=rot))
        f = Image.composite(c, a, starburst_mask(540, 960, R, rot=rot))
    else:
        f = scene_c(t)
    # very slow gentle push-in
    z = 1 + 0.045 * (t / DUR)
    cw, ch = W / z, H / z
    f = f.transform((W, H), Image.AFFINE, (1 / z, 0, (W - cw) / 2, 0, 1 / z, (H - ch) / 2), resample=Image.BILINEAR)
    arr = np.asarray(f.convert('RGB')).astype(np.float32) + GRAIN[int(t * 12) % 4]
    return np.clip(arr, 0, 255).astype(np.uint8)

if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'preview':
        for s in sys.argv[2:]:
            Image.fromarray(frame(float(s))).save(A('work', f'preview_{s}.jpg'), quality=88)
    elif mode == 'video':
        ff = os.path.join(os.path.dirname(sys.executable), 'ffmpeg')
        p = subprocess.Popen([ff, '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                              '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-threads', '2', A('work', 'video_noaudio.mp4')],
                             stdin=subprocess.PIPE)
        N = int(DUR * FPS)
        for i in range(N):
            p.stdin.write(frame(i / FPS).tobytes())
            if i % 30 == 0: print('frame', i, flush=True)
        p.stdin.close(); p.wait(); print('done')
