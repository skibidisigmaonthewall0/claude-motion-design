# «Що, якщо кожне «Костя Гій!» буде вдвічі гучнішим?» — low-poly escalation short (9:16, 32 s).
# python render.py preview 3.0 9.5 ...   -> work/p_<t>.jpg
# python render.py video [start end]     -> work/video.mp4 (or a chunk)
import sys, os, math, functools, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from engine import Geo, Camera, render, sky, concat, norm, Rx, Ry, Rz, rodrigues, INF

W, H, FPS = 1080, 1920, 30
SS = float(os.environ.get('SS', 2))
RW, RH = int(W * SS), int(H * SS)
ROOT = os.path.dirname(os.path.abspath(__file__))
A = lambda *p: os.path.join(ROOT, *p)
os.makedirs(A('work'), exist_ok=True)

# ------------------------------------------------------------------ timeline
S = [None] + [2.6 + (k - 1) * 2.25 for k in range(1, 13)]
END = 32.0
SPACE_T = S[12] - 0.12
T_OFF = S[12] + 1.15      # Костя pulls the headphones off
T_GA, T_SHO = S[12] + 1.5, S[12] + 2.75
STEPS = [None,
    (70, 'ЗВИЧАЙНА РОЗМОВА', 'Крик №1. Костя в навушниках. Не чує.'),
    (90, 'ВАНТАЖІВКА ПОРУЧ', 'Злітають голуби. Костя йде далі.'),
    (110, 'РОК-КОНЦЕРТ', 'Перехожі обертаються. Костя — ні.'),
    (130, 'ЗЛІТ ЛІТАКА', 'Завили всі автосигналізації.'),
    (150, 'РОЗРИВ БАРАБАННИХ ПЕРЕТИНОК', 'Перехожі тікають. Костя підспівує.'),
    (170, 'ВИЛІТАЮТЬ ШИБКИ', 'У кварталі вилетіли всі вікна.'),
    (194, 'МЕЖА ЗВУКУ В ПОВІТРІ', 'Далі це вже не звук, а ударна хвиля.'),
    (210, 'УДАРНА ХВИЛЯ', 'Машини, дерева, ліхтарі — у сусідньому районі.'),
    (230, 'ГУЧНІШЕ ЗА КРАКАТАУ', 'Будинки падають, як доміно. Костя досі не чує.'),
    (260, 'ЧУТНО НАВІТЬ В АВСТРАЛІЇ', 'Над країною розігнало всі хмари.'),
    (300, 'ТРЯСЕ ВСЮ ПЛАНЕТУ', 'Хвиля викидає вас обох у космос.'),
    (0, 'ЗВУК НЕ ЛЕТИТЬ У КОСМОСІ', 'Крик №12: 0 дБ. У космосі ніхто не почує «Костя Гій!».'),
]

def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def prog(t, a, b): return clamp((t - a) / (b - a)) if b > a else float(t >= a)
def ease(x): return x * x * (3 - 2 * x)
def out_cubic(x): return 1 - (1 - x) ** 3
def in_quad(x): return x * x
def lerp(a, b, x): return a + (b - a) * x
def vlerp(a, b, x): return np.asarray(a, float) * (1 - x) + np.asarray(b, float) * x

def step_at(t):
    k = 0
    for i in range(1, 13):
        if t >= S[i]: k = i
    return k

rng = np.random.default_rng(7)

# ------------------------------------------------------------------ palette
SKIN = [(236, 196, 160), (214, 168, 128), (160, 110, 75), (245, 210, 180)]
SHIRTS = [(50, 85, 185), (190, 50, 55), (225, 180, 40), (235, 235, 235), (60, 150, 90), (120, 70, 150)]
BLD = [(198, 188, 172), (178, 108, 82), (152, 152, 158), (208, 194, 164), (122, 132, 148), (192, 142, 112), (214, 214, 206)]
CARS = [(232, 190, 40), (200, 45, 45), (235, 235, 235), (60, 100, 190), (40, 40, 45)]
LIGHT = norm([-0.45, 0.8, -0.55])
HERO_POS = np.array([0.0, 0.0, -0.3])
KOSTYA_Z = -2.5

# ------------------------------------------------------------------ people
def person_boxes(skin, shirt, pants=(45, 45, 60), hair=(40, 30, 25), hat=None):
    b = []  # (center, size, color, part)
    for sx in (-0.1, 0.1):
        b.append(((sx, 0.42, 0), (0.17, 0.8, 0.2), pants, 'leg'))
        b.append(((sx, 0.04, 0.03), (0.18, 0.08, 0.28), (230, 230, 230), 'shoe'))
    b.append(((0, 1.1, 0), (0.46, 0.6, 0.26), shirt, 'torso'))
    for sx in (-0.3, 0.3):
        b.append(((sx, 1.1, 0), (0.14, 0.56, 0.16), shirt, 'arm'))
        b.append(((sx, 0.78, 0), (0.12, 0.1, 0.12), skin, 'hand'))
    b.append(((0, 1.6, 0), (0.32, 0.32, 0.32), skin, 'head'))
    b.append(((0, 1.78, -0.02), (0.34, 0.08, 0.34), hair, 'hair'))
    if hat: b.append(((0, 1.84, 0.04), (0.36, 0.1, 0.42), hat, 'hat'))
    return b

# ------------------------------------------------------------------ world (static geometry + owners)
class Owner:
    def __init__(self, center, kind='rigid', **kw):
        self.center = np.asarray(center, float); self.kind = kind
        self.walk = np.asarray(kw.get('walk', (0, 0, 0)), float)
        self.tb = kw.get('tb', INF); self.v = np.asarray(kw.get('v', (0, 0, 0)), float)
        self.axis = kw.get('axis', (0, 0, 1)); self.spin = kw.get('spin', 0.0)
        self.grav = kw.get('grav', 9.8); self.pivot = kw.get('pivot', None)
        self.fall = kw.get('fall', 1.0); self.maxang = kw.get('maxang', math.radians(86))
        self.flap = kw.get('flap', False)
        self.tt = self.tr = self.th = INF; self.turn = 0.0; self.rv = np.zeros(3); self.yaw0 = 0.0

    def xf(self, t):
        """returns (R, pivot, translation) or None for identity, or 'hide'"""
        if self.kind == 'topple':
            if t < self.tb: return None
            a = self.maxang * in_quad(prog(t, self.tb, self.tb + self.fall))
            return rodrigues(self.axis, -a), self.pivot, np.zeros(3)
        if self.kind == 'ped':
            if t > self.th: return 'hide'
            ang = self.turn * ease(prog(t, self.tt, self.tt + 0.35)) + math.pi * ease(prog(t, self.tr, self.tr + 0.25))
            trans = self.walk * min(t, self.tt) + self.rv * max(0.0, t - self.tr)
            if t > self.tr: trans = trans + np.array([0, 0.07 * abs(math.sin((t - self.tr) * 13)), 0])
            return Ry(ang), self.center + self.walk * min(t, self.tt), trans
        trans = self.walk * min(t, self.tb)
        if t < self.tb:
            if not self.walk.any(): return None
            return np.eye(3), self.center, trans
        tau = t - self.tb
        if tau > 4.0: return 'hide'
        trans = trans + self.v * tau + np.array([0, -0.5 * self.grav * tau * tau, 0])
        if self.grav > 0:
            trans[1] = max(trans[1], -self.center[1] + 0.2 - 0.0) if tau < 0.05 else trans[1]
        return rodrigues(self.axis, self.spin * tau), self.center, trans


def blow_time(k, x):
    vf = {2: 18, 3: 30, 7: 80, 8: 120}[k]
    return S[k] + 0.08 + max(0.0, x) / vf


def build_world():
    g = Geo(); owners = []
    def new_owner(o): owners.append(o); return len(owners) - 1
    # ground & terrain
    g.quad([(-40000, 0, -40000), (-40000, 0, 40000), (40000, 0, 40000), (40000, 0, -40000)], (140, 160, 110), (0, 1, 0), layer=0)
    T = 280; ext = 7000
    nz = rng.random((60, 60))
    from scipy.ndimage import zoom
    n1 = zoom(rng.random((8, 8)), 60 / 8, order=3)[:60, :60]
    n2 = zoom(rng.random((14, 14)), 60 / 14, order=1)[:60, :60]
    greens = [(118, 168, 82), (96, 150, 70), (140, 178, 90), (170, 186, 104), (84, 132, 66), (196, 190, 120)]
    for i, x in enumerate(range(-ext, ext, T)):
        for j, z in enumerate(range(-ext, ext, T)):
            if -700 < x < 1400 and -700 < z < 900: continue
            a, b = n1[i % 60, j % 60], n2[i % 60, j % 60]
            if a > 0.72: col = (70, 120, 190)
            elif a > 0.66: col = (110, 160, 200)
            else: col = greens[int(b * 5.99)]
            col = tuple(np.clip(np.array(col) * (0.93 + 0.12 * nz[i % 60, j % 60]), 0, 255))
            g.quad([(x, 0.2, z), (x, 0.2, z + T), (x + T, 0.2, z + T), (x + T, 0.2, z)], col, (0, 1, 0), layer=1)
    g.quad([(-700, 0.3, -700), (-700, 0.3, 900), (1400, 0.3, 900), (1400, 0.3, -700)], (168, 168, 164), (0, 1, 0), layer=1)
    # roads
    road = (74, 76, 82); walk = (182, 182, 178)
    def rquad(x0, x1, z0, z1, col, layer=2, y=0.4):
        g.quad([(x0, y, z0), (x0, y, z1), (x1, y, z1), (x1, y, z0)], col, (0, 1, 0), layer=layer)
    rquad(-700, 1400, -3.6, 0.8, walk, 2)
    rquad(-700, 1400, 8.8, 13.0, walk, 2)
    rquad(-700, 1400, 0.8, 8.8, road, 3)
    for zc in list(range(60, 900, 60)) + list(range(-50, -700, -60)):
        rquad(-700, 1400, zc - 4.5, zc + 4.5, road, 3)
    for xc in range(-680, 1400, 60):
        rquad(xc - 4.5, xc + 4.5, -700, 900, road, 3)
    for x in range(-60, 500, 7):
        rquad(x, x + 3.5, 4.72, 4.88, (230, 200, 60), 4, 0.45)
    rquad(-700, 1400, 0.72, 0.88, (235, 235, 235), 4, 0.45)
    # buildings
    def building(x0, x1, z0, z1, h, col, windows=False, face=-1):
        cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
        oid = new_owner(Owner((cx, h / 2, cz), 'topple', pivot=np.array([x1, 0, cz]), axis=(0, 0, 1)))
        owners[oid].dims = (x0, x1, z0, z1, h)
        g.box((cx, h / 2, cz), (x1 - x0, h, z1 - z0), col, owner=oid)
        g.box((cx, h + 0.4, cz), (x1 - x0 + 0.4, 0.8, z1 - z0 + 0.4), tuple(np.array(col) * 0.86), owner=oid)
        if windows:
            fz = z0 - 0.06 if face < 0 else z1 + 0.06
            sp = np.array([cx, h / 2, z0 if face < 0 else z1]); nrm = (0, 0, face)
            # shopfront
            g.quad([(x0 + 0.4, 0.5, fz), (x0 + 0.4, 3.6, fz), (x1 - 0.4, 3.6, fz), (x1 - 0.4, 0.5, fz)], (62, 80, 98), nrm,
                   owner=oid, sortpt=sp, bias=-0.04, brk=INF)
            nx = max(1, int((x1 - x0 - 1.0) / 3.0)); gap = (x1 - x0) / nx
            for fl in range(int((h - 5) / 3.3)):
                y = 5.0 + fl * 3.3
                for c in range(nx):
                    wx = x0 + gap * (c + 0.5)
                    shade = rng.uniform(0.85, 1.15)
                    wc = tuple(np.clip(np.array((128, 150, 172)) * shade, 0, 255))
                    g.quad([(wx - 0.75, y, fz), (wx - 0.75, y + 1.8, fz), (wx + 0.75, y + 1.8, fz), (wx + 0.75, y, fz)], wc, nrm,
                           owner=oid, sortpt=sp, bias=-0.05, brk=-1)  # brk=-1: set later
        return oid
    blds = []
    for bx in range(-680, 1400, 60):
        for bz in list(range(0, 900, 60)) + list(range(-60, -700, -60)):
            # block spans x [bx+4.5, bx+55.5], z [bz+13 .. bz+55.5] for bz>=0 (north of main street)
            x = bx + 5.5
            while x < bx + 54:
                w = rng.uniform(10, 18); x1 = min(x + w, bx + 54.5)
                if x1 - x < 6: break
                if bz >= 0:
                    z0, z1 = bz + 13.5, bz + 13.5 + rng.uniform(14, 20)
                    main = (bz == 0)
                    h = rng.uniform(16, 42) if main else rng.uniform(8, 40) * (1.25 if 60 < bx < 400 else 1)
                    col = BLD[rng.integers(len(BLD))]
                    win = main and -70 < x < 420
                    blds.append(building(x, x1, z0, z1, h, col, win, -1))
                    if bz + 55.5 - z1 > 10:
                        blds.append(building(x, x1, z1 + 1, bz + 55, rng.uniform(8, 34), BLD[rng.integers(len(BLD))]))
                else:
                    z1 = bz + 55.5 if bz == -60 else bz + 55
                    if bz == -60:
                        z1 = -4.2
                        if -16 < x < 8 or -16 < x1 < 8: x = x1 + rng.uniform(0, 1.5); continue
                    z0 = z1 - rng.uniform(14, 22)
                    blds.append(building(x, x1, z0, z1, rng.uniform(10, 38), BLD[rng.integers(len(BLD))]))
                x = x1 + rng.uniform(0, 1.5)
    # trees & lamps
    def tree(x, z, scale=1.0):
        oid = new_owner(Owner((x, 2.0, z)))
        g.box((x, 1.3 * scale, z), (0.3, 2.6 * scale, 0.3), (110, 80, 55), owner=oid)
        jit = [0.86, 1.0, 1.12, 0.94, 1.06]
        g.ico((x, 3.7 * scale, z), (1.7 * scale, 1.5 * scale, 1.7 * scale), (104, 172, 70), owner=oid, R=Ry(rng.uniform(0, 3)), jitter=jit)
        return oid
    trees = [tree(x, 10.6) for x in range(-30, 420, 11)] + [tree(x, -3.0) for x in range(9, 420, 13)]
    def lamp(x, z):
        oid = new_owner(Owner((x, 3.0, z)))
        g.box((x, 3.2, z), (0.16, 6.4, 0.16), (60, 62, 68), owner=oid)
        g.box((x, 6.35, z + 0.8), (0.14, 0.14, 1.7), (60, 62, 68), owner=oid)
        g.box((x, 6.25, z + 1.55), (0.3, 0.14, 0.4), (240, 230, 200), owner=oid, emis=True)
        return oid
    lamps = [lamp(x, 0.4) for x in range(3, 420, 22)]
    # pedestrians
    peds = []; hats = []
    for i, (x, z, d) in enumerate([(4.5, -2.1, 1), (10, -2.4, -1), (16, -1.8, 1), (24, -2.6, 1), (33, -2.0, -1),
                                   (3, 10.2, -1), (8, 11.4, 1), (13, 10.0, 1), (19, 11.8, -1), (27, 10.5, 1), (38, 11.0, -1), (48, 10.4, 1)]):
        hat = None
        oid = new_owner(Owner((x, 0.9, z), 'ped', walk=(0.9 * d, 0, 0)))
        owners[oid].yaw0 = math.pi / 2 * d + (0.4 if i == 0 else 0)
        R = Ry(math.pi / 2 * d + (0.4 if i == 0 else 0))
        for c, s, col, part in person_boxes(SKIN[i % 4], SHIRTS[i % 6], hat=None):
            g.box(np.array([x, 0, z]) + R @ np.array(c), s, col, R=R, owner=oid)
        peds.append(oid)
        if hat:
            hid = new_owner(Owner((x, 1.86, z), walk=(0.9 * d, 0, 0)))
            g.box((x, 1.86, z), (0.36, 0.1, 0.42), hat, R=R, owner=hid)
            g.box(np.array([x, 1.82, z]) + R @ np.array([0, 0, 0.28]), (0.34, 0.04, 0.2), hat, R=R, owner=hid)
            hats = [hid]
    # pigeons
    pigeons = []
    for x, z in [(1.6, -2.6), (2.4, -2.9), (2.9, -2.2), (3.6, -2.8), (2.1, -1.9), (4.4, -2.5)]:
        oid = new_owner(Owner((x, 0.15, z)))
        R = Ry(rng.uniform(0, 6.28))
        g.box((x, 0.14, z), (0.3, 0.16, 0.15), (112, 118, 130), R=R, owner=oid)
        g.box(np.array([x, 0.26, z]) + R @ np.array([0.16, 0, 0]), (0.1, 0.1, 0.1), (80, 86, 100), R=R, owner=oid)
        pigeons.append(oid)
    # cars
    cars = []
    for i, (x, z, v) in enumerate([(9, 1.9, 0), (22, 1.9, 0), (39, 1.9, 0), (-14, 5.6, 4.0), (14, 5.6, 4.0), (30, 7.4, -3.0), (56, 7.4, -3.0)]):
        col = CARS[i % len(CARS)]
        oid = new_owner(Owner((x, 0.8, z), walk=(v, 0, 0)))
        g.box((x, 0.75, z), (4.2, 0.9, 1.8), col, owner=oid)
        g.box((x - 0.2, 1.5, z), (2.3, 0.65, 1.62), tuple(np.array(col) * 0.55 + np.array((40, 50, 60)) * 0.45), owner=oid)
        for wx in (-1.35, 1.35):
            for wz in (-0.85, 0.85):
                g.box((x + wx, 0.35, z + wz), (0.7, 0.7, 0.3), (25, 25, 28), owner=oid)
        for lx in (-2.13, 2.13):
            for lz in (-0.65, 0.65):
                g.box((x + lx, 0.9, z + lz), (0.06, 0.2, 0.34), (255, 150, 40), owner=oid, brk=-2, emis=True)
        cars.append(oid)
    # clouds
    clouds = []
    for _ in range(260):
        x, z = rng.uniform(-6000, 9000), rng.uniform(-6000, 6000)
        s = rng.uniform(180, 520)
        oid = new_owner(Owner((x, 420, z)))
        g.box((x, 420, z), (s, rng.uniform(25, 60), s * rng.uniform(0.5, 1.0)), (248, 248, 250), owner=oid)
        g.box((x + s * 0.2, 450, z), (s * 0.5, 40, s * 0.4), (252, 252, 252), owner=oid)
        clouds.append(oid)

    G = g.arrays()
    # ---- assign blow behaviour
    O = owners
    def blow(oid, k, speed, up, spin=4.0, spread=0.3):
        o = O[oid]; p = o.center + o.walk * S[k] - HERO_POS
        dvec = norm([p[0], 0, p[2]]); dist = math.hypot(p[0], p[2])
        o.tb = blow_time(k, dist)
        side = np.array([-dvec[2], 0, dvec[0]])
        o.v = dvec * speed * rng.uniform(0.8, 1.2) + np.array([0, up * rng.uniform(0.7, 1.3), 0]) + side * rng.uniform(-spread, spread) * speed
        o.axis = norm(rng.normal(size=3)); o.spin = spin * rng.uniform(0.6, 1.4)
    for oid in pigeons: blow(oid, 2, 6, 6, 1.0); O[oid].grav = -1.0
    for oid in peds:
        o = O[oid]; pp = o.center + o.walk * S[3] - HERO_POS
        want = math.atan2(-pp[0], -pp[2])
        o.tt = S[3] + 0.1 + math.hypot(pp[0], pp[2]) / 40
        o.turn = (want - o.yaw0 + math.pi) % (2 * math.pi) - math.pi
        o.tr = S[5] + 0.12 + rng.uniform(0, 0.25)
        o.rv = norm([pp[0], 0, pp[2]]) * rng.uniform(5, 7)
        o.th = S[7] + 1.0
    for oid in cars: blow(oid, 7, 40, 9, 3)
    for oid in trees + lamps: blow(oid, 8, 70, 14, 3)
    global BLINK
    BLINK = G['brk'] == -2; G['brk'][BLINK] = INF
    win = G['brk'] < 0
    G['brk'][win] = S[6] + 0.06 + np.clip(G['sort'][win, 0], 0, None) / 240
    # buildings topple in a fan downwind
    for oid in blds:
        o = O[oid]; x0, x1, z0, z1, h = o.dims; cx, cz = o.center[0], o.center[2]
        dx, dz = cx - HERO_POS[0], cz - HERO_POS[2]
        dist = math.hypot(dx, dz)
        if dist > 1300: continue
        dvec = norm([dx, 0, dz])
        o.axis = tuple(np.cross(dvec, [0, 1, 0]))
        half = abs(dvec[0]) * (x1 - x0) / 2 + abs(dvec[2]) * (z1 - z0) / 2
        o.pivot = np.array([cx, 0, cz]) + dvec * half
        if dist < 330: o.tb = S[9] + 0.15 + dist / 170
        else: o.tb = S[10] + 0.3 + (dist - 330) / 700
        o.fall = 0.75 + h / 80
    for oid in clouds:
        o = O[oid]; dx, dz = o.center[0], o.center[2]; dist = math.hypot(dx, dz)
        if dist < 6500:
            o.tb = S[10] + 0.35 + dist / 3000
            o.v = norm([dx, 0.05 * dist, dz]) * 2600.0; o.grav = 0; o.spin = 0.0
    # per-owner face index lists
    faces_of = {}
    for i, ow in enumerate(G['owner']):
        if ow >= 0: faces_of.setdefault(ow, []).append(i)
    faces_of = {k: np.array(v) for k, v in faces_of.items()}
    return G, owners, faces_of, blds


print('building world...', flush=True)
WORLD, OWNERS, FACES_OF, BLDS = build_world()
print('faces', len(WORLD['q']), flush=True)


BLD_FACE = np.isin(WORLD['owner'], np.array(BLDS))

def world_at(t, alt=0.0):
    G = dict(WORLD); q = WORLD['q'].copy(); n = WORLD['n'].copy(); sort = WORLD['sort'].copy()
    keep = np.ones(len(q), bool)
    for oid, fi in FACES_OF.items():
        x = OWNERS[oid].xf(t)
        if x is None: continue
        if isinstance(x, str): keep[fi] = False; continue
        R, p, tr = x
        q[fi] = (q[fi] - p) @ R.T + p + tr
        n[fi] = n[fi] @ R.T
        sort[fi] = (sort[fi] - p) @ R.T + p + tr
    c = WORLD['c'].copy()
    broken = t >= WORLD['brk']
    c[broken] = (34, 36, 44)
    c[BLINK] = ((255, 160, 50) if int(t * 5) % 2 == 0 else (90, 52, 24)) if t >= S[4] else (150, 100, 60)
    m = clamp((alt - 400) / 1400) * 0.75
    if m > 0: c[BLD_FACE] = c[BLD_FACE] * (1 - m) + np.array([176, 172, 166]) * m
    G.update(q=q, n=n, sort=sort, c=c)
    return {k: v[keep] for k, v in G.items()}


# ------------------------------------------------------------------ hero
BLACK = (28, 28, 32); STRIPE = (240, 240, 240); HSKIN = (236, 196, 160)

def rig(pos, yaw, body_R, scale, pose, look):
    """Generic blocky person. pose: hp (head pitch), hy (head yaw), tp (torso pitch), arms [(rx, rz)]*2, legs [rx]*2,
    mouth, eyes, cup (hands to mouth 0..1), phones (None | offset vec for headphones)."""
    g = Geo()
    neck = np.array([0, 1.52, 0]); hip = np.array([0, 0.92, 0]); sy = 1.44
    R_head = Ry(pose.get('hy', 0.0)) @ Rx(pose.get('hp', 0.0)); R_t = Rx(pose.get('tp', 0.0))
    Rb = Ry(yaw) if body_R is None else body_R @ Ry(yaw)
    def W_(p, R_local=np.eye(3), chain=()):
        p = np.asarray(p, float); R = R_local
        for Rc, piv in chain:
            p = piv + Rc @ (p - piv); R = Rc @ R
        return pos + scale * (Rb @ p), Rb @ R
    def add(c, s_, col, chain=(), R_local=np.eye(3), sortpt=None, bias=0.0):
        cw, Rw = W_(c, R_local, chain)
        g.box(cw, np.asarray(s_) * scale, col, R=Rw, sortpt=sortpt, bias=bias, bottom=True)
    torso = ((R_t, hip),); head = ((R_head, neck), (R_t, hip))
    legs = pose.get('legs', (0, 0))
    for i, sx in enumerate((-0.12, 0.12)):
        ch = ((Rx(legs[i]), hip),)
        add((sx, 0.47, 0), (0.21, 0.86, 0.24), look['pants'], ch)
        if look.get('stripes'): add((sx + np.sign(sx) * 0.108, 0.47, 0), (0.012, 0.84, 0.05), STRIPE, ch)
        add((sx, 0.05, 0.04), (0.22, 0.1, 0.32), (245, 245, 245), ch)
    add((0, 1.2, 0), (0.54, 0.62, 0.3), look['top'], torso)
    if look.get('stripes'): add((0, 1.2, 0.152), (0.02, 0.6, 0.01), (200, 200, 200), torso)
    if look.get('hood'): add((0, 1.5, -0.16), (0.44, 0.16, 0.12), tuple(np.array(look['top']) * 0.85), torso)
    cup = pose.get('cup', 0.0); arms = pose.get('arms', ((0, 0), (0, 0)))
    for i, sx in enumerate((-1, 1)):
        rx, rz = arms[i]
        sh = np.array([sx * 0.36, sy, 0]); hand = np.array([sx * 0.36, 0.84, 0])
        Rs = Rx(rx) @ Rz(sx * (0.06 + rz)); off = np.zeros(3)
        if cup > 0:
            T = np.array([sx * 0.2, 1.66, 0.32]); dvec = norm(T - sh); a0 = np.array([0.0, -1.0, 0.0])
            ang = math.acos(float(np.clip(dvec @ a0, -1, 1)))
            Rs = rodrigues(norm(np.cross(a0, dvec)), ang * cup)
            off = (T - (sh + Rs @ (hand - sh))) * cup
        def arm_part(c, s_, col):
            c = np.asarray(c, float)
            add(sh + Rs @ (c - sh) + off, s_, col, torso, R_local=Rs)
        arm_part((sx * 0.36, 1.18, 0), (0.17, 0.58, 0.19), look['top'])
        if look.get('stripes'): arm_part((sx * 0.448, 1.18, 0), (0.01, 0.56, 0.05), STRIPE)
        arm_part((sx * 0.36, 0.84, 0), (0.15, 0.12, 0.15), look['skin'])
    add((0, 1.5, 0), (0.18, 0.08, 0.18), look['skin'], torso)
    add((0, 1.78, 0), (0.46, 0.46, 0.44), look['skin'], head)
    add((0, 2.03, -0.02), (0.48, 0.1, 0.48), look['hair'], head)
    add((0, 1.9, -0.2), (0.48, 0.3, 0.08), look['hair'], head)
    front_c, _ = W_((0, 1.78, 0.22), chain=head)
    eyes = pose.get('eyes', 1.0)
    for sx in (-0.1, 0.1):
        add((sx, 1.82, 0.225), (0.07, max(0.012, 0.075 * eyes), 0.012), (20, 20, 24), head, sortpt=front_c, bias=-0.002)
        add((sx, 1.91, 0.225), (0.1, 0.022, 0.012), tuple(np.array(look['hair']) * 1.2), head,
            R_local=Rz(-sx * pose.get('brow', 2.0)), sortpt=front_c, bias=-0.002)
    add((0, 1.66, 0.225), (pose.get('mw', 0.13), pose.get('mouth', 0.03), 0.012), (120, 30, 40), head, sortpt=front_c, bias=-0.002)
    add((0, 1.75, 0.25), (0.06, 0.08, 0.06), tuple(np.array(look['skin']) * 0.93), head, sortpt=front_c, bias=-0.003)
    ph = pose.get('phones')
    if ph is not None:
        off = np.asarray(ph, float)
        add(np.array((0, 2.13, 0)) + off, (0.56, 0.06, 0.1), (40, 40, 46), head)
        for sx in (-1, 1):
            add(np.array((sx * 0.25, 2.06, 0)) + off, (0.05, 0.16, 0.08), (40, 40, 46), head)
            add(np.array((sx * 0.27, 1.8, 0)) + off, (0.1, 0.22, 0.22), (22, 22, 26), head)
            add(np.array((sx * 0.325, 1.8, 0)) + off, (0.012, 0.12, 0.12), (230, 60, 70), head)
    mouth_w, _ = W_((0, 1.66, 0.3), chain=head)
    return g, mouth_w


BLACK = (28, 28, 32); STRIPE = (240, 240, 240); HSKIN = (236, 196, 160)
HERO_LOOK = dict(top=BLACK, pants=BLACK, skin=HSKIN, hair=(30, 26, 24), stripes=True)
KOSTYA_LOOK = dict(top=(232, 120, 40), pants=(62, 84, 134), skin=(240, 205, 172), hair=(120, 78, 44), hood=True)


def shout_pose(t, silent_last=False):
    hp = tp = 0.0; cup = 0.0; mouth = 0.03; eyes = 1.0; brow = 2.0; mw = 0.13
    for k in range(1, 13):
        s_ = S[k]
        if s_ - 0.55 <= t < s_ + 1.25:
            if t < s_:
                u = ease(prog(t, s_ - 0.55, s_)); hp = -0.22 * u; tp = -0.12 * u; cup = u; mouth = 0.03 + 0.03 * u
            elif t < s_ + 0.95:
                u = out_cubic(prog(t, s_, s_ + 0.12)); hp = lerp(-0.22, 0.14, u); tp = lerp(-0.12, 0.16, u); cup = 1.0
                wob = 0.02 * math.sin((t - s_) * 40) * min(1, k / 6)
                mouth = 0.14 + wob; mw = 0.17; eyes = 0.35; brow = -1.4; hp += wob
            else:
                u = ease(prog(t, s_ + 0.95, s_ + 1.25)); hp = 0.14 * (1 - u); tp = 0.16 * (1 - u); cup = 1 - u
                mouth = lerp(0.14, 0.03, u); eyes = lerp(0.35, 1, u); brow = lerp(-1.4, 2.0, u)
            break
    return dict(hp=hp, tp=tp, cup=cup, mouth=mouth, eyes=eyes, brow=brow, mw=mw)


def hero_geo(t, pos, yaw, body_R=None, scale=1.0):
    return rig(pos, yaw, body_R, scale, shout_pose(t), HERO_LOOK)


def kostya_walk_x(t):
    return -3.6 - 0.3 * min(t, S[11])


def kostya_pose(t, walking=True):
    ph = 2 * math.pi * 0.95 * t
    sw = 0.42 * math.sin(ph) if walking else 0.12 * math.sin(t * 1.3)
    bob = 0.14 * math.sin(2 * math.pi * 2.0 * t)          # nodding to the beat
    sing = S[5] + 0.3 < t < S[6] + 0.8                     # «Костя підспівує»
    mouth = 0.03 + (0.05 * abs(math.sin(t * 9)) if sing else 0.0)
    eyes = 0.15 if sing or (t * 0.7) % 1 < 0.06 else 1.0
    pose = dict(hp=0.08 + bob * 0.5, hy=0.05 * math.sin(t * 0.8), legs=(sw, -sw), arms=((-sw * 0.8, 0.02), (sw * 0.8, 0.02)),
                mouth=mouth, eyes=eyes, phones=(0, 0, 0))
    return pose


def kostya_geo(t, pos, yaw, body_R=None, scale=1.0, walking=True):
    pose = kostya_pose(t, walking)
    if t >= T_OFF - 0.3:   # reaction in space: lift headphones off, look surprised
        u = ease(prog(t, T_OFF - 0.3, T_OFF + 0.35))
        pose['phones'] = (0.0, 0.32 * u, -0.12 * u) if u < 1 else (0.0, 0.32, -0.12)
        pose['arms'] = ((-2.6 * min(1, u * 1.6), -0.25), (-2.6 * min(1, u * 1.6), -0.25))
        pose['hp'] = 0.0; pose['eyes'] = 1.25; pose['brow'] = 3.0
        talk = (T_GA <= t < T_GA + 0.45) or (T_SHO <= t < T_SHO + 0.35)
        pose['mouth'] = 0.09 if talk else 0.035
    return rig(pos, yaw, body_R, scale, pose, KOSTYA_LOOK)


HERO_YAW = math.atan2(-0.96, -0.28)
KOSTYA_YAW = math.atan2(-1.0, -0.12)


# ------------------------------------------------------------------ particles (analytic)
def make_puffs():
    P = []
    for k in range(1, 12):
        n = int(min(26 + 12 * k, 150)); r = np.random.default_rng(100 + k)
        sz = min(0.05 * 1.4 ** k, 2.4); sp = min(3.5 * 1.45 ** k, 90)
        if k >= 10: sz, sp, n = 0.09, 5.0, 60
        d = norm(FACING + np.array([0, 0.12, 0]))
        for i in range(n):
            dirv = norm(d + r.normal(0, 0.28, 3))
            P.append(dict(k=k, t0=S[k] - 0.02 + r.uniform(0, 0.08), v=dirv * sp * r.uniform(0.5, 1.2), s=sz * r.uniform(0.4, 1.3),
                          life=r.uniform(0.7, 1.4) * (1 + 0.1 * k), col=tuple(r.integers(222, 252, 3)), axis=norm(r.normal(size=3)), spin=r.uniform(2, 8)))
    return P
PUFFS = []

def make_shards():
    r = np.random.default_rng(5); P = []
    for i in range(170):
        x = r.uniform(-5, 110); y = r.uniform(5, 30); z = 13.4
        t0 = S[6] + 0.06 + max(0, x) / 240
        P.append(dict(p=np.array([x, y, z]), t0=t0, v=np.array([r.uniform(8, 30), r.uniform(-2, 6), r.uniform(-12, -3)]),
                      s=r.uniform(0.15, 0.45), col=(170 + r.integers(0, 60), 205 + r.integers(0, 40), 235), axis=norm(r.normal(size=3)), spin=r.uniform(4, 14)))
    return P
SHARDS = make_shards()

def make_chunks():
    r = np.random.default_rng(9); P = []
    for i in range(70):
        x = r.uniform(2, 90); z = r.uniform(-3, 12)
        t0 = S[8] + 0.08 + x / 120
        P.append(dict(p=np.array([x, 0.3, z]), t0=t0, v=np.array([r.uniform(30, 80), r.uniform(6, 20), r.uniform(-6, 6)]),
                      s=r.uniform(0.4, 1.4), col=(70 + r.integers(0, 30),) * 3, axis=norm(r.normal(size=3)), spin=r.uniform(2, 8)))
    return P
CHUNKS = make_chunks()

def make_dust():
    r = np.random.default_rng(3); P = []
    for oid in BLDS:
        o = OWNERS[oid]
        if o.tb >= INF or o.tb > S[10] + 3 or math.hypot(*(o.center[[0, 2]] - HERO_POS[[0, 2]])) > 220: continue
        x0, x1, z0, z1, h = o.dims
        for i in range(3):
            dv = norm([o.center[0] - HERO_POS[0], 0, o.center[2] - HERO_POS[2]])
            P.append(dict(p=o.pivot + dv * r.uniform(0, h * 0.9) + np.array([0, 2, r.uniform(-5, 5)]), t0=o.tb + o.fall * 0.9, s=r.uniform(5, 10) * (1 + h / 40),
                          col=(205 + r.integers(0, 25), 195 + r.integers(0, 20), 175 + r.integers(0, 20)), axis=norm(r.normal(size=3))))
    return P
DUST = make_dust()

def particles_geo(t, mouth_pos, in_world=True):
    g = Geo()
    for p in PUFFS:
        if not in_world and p['k'] < 10: continue
        if in_world and p['k'] >= 10: continue
        tau = t - p['t0']
        if tau < 0 or tau > p['life']: continue
        kdrag = 2.2
        pos = mouth_pos + p['v'] * (1 - math.exp(-kdrag * tau)) / kdrag + np.array([0, 0.3 * tau, 0])
        s = p['s'] * (0.6 + 1.2 * tau) * (1 - (tau / p['life']) ** 3)
        if s <= 0.003: continue
        g.box(pos, (s, s, s), p['col'], R=rodrigues(p['axis'], p['spin'] * tau), bottom=True)
    if in_world:
        for lst, grav in ((SHARDS, 9.8), (CHUNKS, 9.8)):
            for p in lst:
                tau = t - p['t0']
                if tau < 0 or tau > 3: continue
                pos = p['p'] + p['v'] * tau + np.array([0, -0.5 * grav * tau * tau, 0])
                if pos[1] < -2: continue
                s = p['s']
                g.box(pos, (s, s * 0.7, s * 0.25), p['col'], R=rodrigues(p['axis'], p['spin'] * tau), bottom=True)
        for p in DUST:
            tau = t - p['t0']
            if tau < 0 or tau > 3.5: continue
            s = p['s'] * (0.4 + 0.5 * tau) * (1 - (tau / 3.5) ** 2)
            g.box(p['p'] + np.array([0, 3 * tau + s * 0.4, 0]), (s, s, s), p['col'], R=rodrigues(p['axis'], 0.4 * tau), bottom=True)
    return g.arrays()

# ------------------------------------------------------------------ cameras
CAM_AERIAL = (np.array([-170.0, 190.0, -200.0]), np.array([30.0, 0.0, 30.0]))
CAM_HIGH = (np.array([-1500.0, 2300.0, -2100.0]), np.array([900.0, 0.0, 400.0]))
SHAKE = [0, 0.001, 0.002, 0.004, 0.008, 0.016, 0.04, 0.05, 0.06, 0.07, 0.05, 0.06, 0]

def street_cam(t):
    kx = kostya_walk_x(t)
    pos = np.array([kx - 5.2, 1.4, -2.2]); tgt = np.array([kx + 8, 1.45, -0.6 - 0.03 * t])
    return pos, tgt

def camera_at(t, launch_h=0.0):
    if t < S[8] + 0.35:
        pos, tgt = street_cam(t); fov = 50
    elif t < S[10] - 0.5:
        u = ease(prog(t, S[8] + 0.35, S[9] - 0.15))
        p0, t0 = street_cam(t)
        pos = vlerp(p0, CAM_AERIAL[0], u); tgt = vlerp(t0, CAM_AERIAL[1], u)
        pos = pos + (np.array([8.0, 4.0, 6.0]) * prog(t, S[9], S[10]))
        fov = lerp(50, 54, u)
    else:
        u = ease(prog(t, S[10] - 0.5, S[10] + 0.35))
        a0 = CAM_AERIAL[0] + np.array([8.0, 4.0, 6.0]) * prog(t, S[9], S[10])
        pos = np.exp(vlerp(np.log(np.abs(a0) + 1), np.log(np.abs(CAM_HIGH[0]) + 1), u)) * np.sign(CAM_HIGH[0]) - np.sign(CAM_HIGH[0])
        tgt = vlerp(CAM_AERIAL[1], CAM_HIGH[1], u)
        fov = 54
        if t > S[11]:
            v = ease(prog(t, S[11] + 0.5, S[12] - 0.2))
            tgt = vlerp(tgt, np.array([0, launch_h, -1]), v)
            pos = pos + np.array([300, 900, 300]) * v
    k = step_at(t); roll = 0.0
    if k:
        tau = t - S[k]; a = SHAKE[k] * math.exp(-4 * tau) * (1 if tau < 1.0 else 0)
        roll = a * math.sin(55 * tau)
        right = norm(np.cross(norm(tgt - pos), [0, 1, 0]))
        off = right * a * 2 * math.sin(47 * tau + 1) * (np.linalg.norm(tgt - pos) / 12)
        pos = pos + off; tgt = tgt + off
    return pos, tgt, fov, roll

# ------------------------------------------------------------------ space
def value_noise(h, w, cells, seed):
    from scipy.ndimage import zoom
    r = np.random.default_rng(seed).random((cells, cells * 2))
    z = zoom(r, (h / cells, w / (cells * 2)), order=3)
    return z[:h, :w]

def earth_tex():
    h, w = 64, 128
    n = value_noise(h, w, 6, 1) * 0.65 + value_noise(h, w, 14, 2) * 0.35
    lat = np.linspace(90, -90, h)[:, None] * np.ones((1, w))
    t = np.zeros((h, w, 3))
    land = n > 0.52
    g2 = value_noise(h, w, 10, 3)
    greens = np.array([(96, 160, 72), (126, 176, 84), (160, 182, 96), (80, 136, 62)])
    t[:] = (44, 104, 196)
    t[(n > 0.47) & ~land] = (66, 132, 206)
    gi = np.clip((g2 * 4).astype(int), 0, 3)
    t[land] = greens[gi[land]]
    desert = land & (np.abs(lat) < 30) & (g2 > 0.55)
    t[desert] = (214, 196, 140)
    t[np.abs(lat) > 68] = (238, 242, 248)
    return t

def moon_tex():
    h, w = 64, 128
    n = value_noise(h, w, 8, 4) * 0.6 + value_noise(h, w, 20, 5) * 0.4
    t = (150 + (n - 0.5) * 90)[..., None] * np.ones(3)
    r = np.random.default_rng(6)
    yy, xx = np.mgrid[0:h, 0:w]
    for _ in range(26):
        cy, cx, rad = r.uniform(5, h - 5), r.uniform(0, w), r.uniform(1.5, 6)
        d = np.hypot(yy - cy, (xx - cx + w / 2) % w - w / 2)
        t[d < rad] *= 0.8; t[(d >= rad) & (d < rad + 1)] *= 1.1
    return np.clip(t, 0, 255)

ETEX, MTEX = earth_tex(), moon_tex()
SUN = norm([-0.6, 0.45, 0.66])

def draw_sphere(arr, cx, cy, R, tex, rot, atmo=None, tilt=0.35):
    Hh, Ww = arr.shape[:2]
    pad = R * 0.08 if atmo else 0
    x0, x1 = int(max(0, cx - R - pad)), int(min(Ww, cx + R + pad + 1))
    y0, y1 = int(max(0, cy - R - pad)), int(min(Hh, cy + R + pad + 1))
    if x1 <= x0 or y1 <= y0 or R < 1: return
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    nx = (xx - cx) / R; ny = -(yy - cy) / R
    d2 = nx * nx + ny * ny
    inside = d2 < 1
    nz = np.sqrt(np.clip(1 - d2, 0, 1))
    # tilt about x
    c, s = math.cos(tilt), math.sin(tilt)
    ty = ny * c - nz * s; tz = ny * s + nz * c
    lat = np.arcsin(np.clip(ty, -1, 1)); lon = np.arctan2(nx, tz) + rot
    th, tw = tex.shape[:2]
    iy = np.clip(((0.5 - lat / math.pi) * th).astype(int), 0, th - 1)
    ix = ((lon / (2 * math.pi) % 1) * tw).astype(int) % tw
    col = tex[iy, ix]
    lam = np.clip(nx * SUN[0] + ny * SUN[1] + nz * SUN[2], 0, 1)
    shade = 0.12 + 0.95 * lam
    col = col * shade[..., None]
    sub = arr[y0:y1, x0:x1]
    if atmo is not None:
        rim = np.clip((d2 - 0.75) / 0.25, 0, 1) ** 2
        col = col * (1 - 0.45 * rim[..., None]) + np.array(atmo) * 0.45 * rim[..., None] * (0.35 + lam[..., None])
        d = np.sqrt(d2)
        glow = np.clip(1 - (d - 1) / 0.08, 0, 1) ** 2 * (d >= 1)
        sub[:] = sub * (1 - 0.8 * glow[..., None]) + np.array(atmo) * 0.8 * glow[..., None]
    # antialias edge
    d = np.sqrt(d2); aa = np.clip((1 - d) * R, 0, 1)[..., None]
    sub[:] = sub * (1 - aa) + col * aa

r_ = np.random.default_rng(12)
STARS = [(r_.uniform(0, W), r_.uniform(0, H), r_.uniform(0.6, 2.2), r_.uniform(120, 255)) for _ in range(380)]

def space_frame(t):
    img = Image.new('RGB', (W, H), (4, 5, 10)); d = ImageDraw.Draw(img)
    for x, y, s_, b in STARS:
        d.ellipse((x - s_, y - s_, x + s_, y + s_), fill=(int(b), int(b), int(min(255, b + 10))))
    arr = np.asarray(img).astype(np.float32).copy()
    u = ease(prog(t, SPACE_T, END))
    R = lerp(2600, 900, out_cubic(prog(t, SPACE_T, SPACE_T + 2.2))); top = lerp(1300, 1560, u); cx = lerp(560, 470, u)
    draw_sphere(arr, cx, top + R, R, ETEX, 1.2 + t * 0.05, atmo=(120, 170, 255))
    mu = ease(prog(t, SPACE_T + 0.4, END))
    draw_sphere(arr, lerp(960, 900, mu), lerp(300, 330, mu), lerp(40, 95, mu), MTEX, 0.4 + t * 0.02, tilt=0.1)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

def space_poses(t):
    """(screen x, screen y, distance, body R) for shouter and Костя"""
    u = out_cubic(prog(t, SPACE_T, SPACE_T + 0.9))
    hero = (lerp(360, 300, u), lerp(1650, 1360, u), lerp(16, 10.5, u), Rz(0.12 + 0.05 * math.sin(t * 1.4)) @ Rx(0.06 * math.sin(t)))
    kos = (lerp(800, 790, u), lerp(1580, 1300, u), lerp(16, 9.5, u), Rz(-0.18 + 0.06 * math.sin(t * 1.1 + 1)) @ Rx(0.05 * math.sin(t * 0.9)))
    return hero, kos

# ------------------------------------------------------------------ HUD
FONTS = {k: A('fonts', v) for k, v in dict(serif='Lora-Regular.ttf', italic='Lora-Italic.ttf', medium='Lora-Medium.ttf',
                                             bold='Inter-Bold.ttf', xbold='Inter-ExtraBold.ttf').items()}
@functools.lru_cache(None)
def F(kind, size): return ImageFont.truetype(FONTS[kind], size)

def tracked(d, xy, text, font, fill, track):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill, anchor='ls'); x += font.getlength(ch) + track
    return x

def tracked_w(text, font, track): return sum(font.getlength(c) + track for c in text) - track

def wrap(text, font, width):
    words = text.split(); lines = []; cur = ''
    for w in words:
        test = (cur + ' ' + w).strip()
        if font.getlength(test) > width and cur: lines.append(cur); cur = w
        else: cur = test
    lines.append(cur); return lines

def fmt(v): return f'{int(round(v)):,}'.replace(',', ' ')

def with_shadow(layer, op=0.8, blur=5):
    a = layer.getchannel('A').filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * op))
    sh = Image.new('RGBA', layer.size, (0, 0, 0, 0)); sh.putalpha(a)
    out = Image.new('RGBA', layer.size, (0, 0, 0, 0)); out.alpha_composite(sh, (2, 3)); out.alpha_composite(layer)
    return out

_g = np.zeros((H, W, 4), np.uint8); _g[..., 3] = (np.clip(1 - np.arange(H) / 980, 0, 1) ** 1.6 * 120).astype(np.uint8)[:, None]
TOPGRAD = Image.fromarray(_g, 'RGBA')

def hud(img, t):
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    X0 = 70
    # hook
    hk = 1 - prog(t, 2.35, 2.6)
    if hk > 0:
        a = int(255 * hk * prog(t, 0.0, 0.25))
        for i, line in enumerate(['Що, якщо кожне', '«Костя Гій!» буде вдвічі', 'гучнішим за попереднє?']):
            d.text((W / 2, 400 + i * 84), line, font=F('medium', 66), fill=(255, 255, 255, a), anchor='ms')
    k = step_at(t)
    if k >= 1:
        ap = prog(t, S[k] - 0.05 if k == 1 else S[1], S[1] + 0.25)
        A_ = int(255 * ap)
        val_prev = STEPS[k - 1][0] if k > 1 else 0
        val = lerp(val_prev, STEPS[k][0], out_cubic(prog(t, S[k] + 0.15, S[k] + 0.6)))
        tracked(d, (X0, 268), f'КРИК №{k}', F('bold', 30), (255, 255, 255, A_), 4)
        num = fmt(val)
        fn = F('serif', 150)
        d.text((X0 - 4, 400), num, font=fn, fill=(255, 255, 255, A_), anchor='ls')
        d.text((X0 + fn.getlength(num) + 18, 400), 'дБ', font=F('serif', 110), fill=(255, 255, 255, A_), anchor='ls')
        tracked(d, (X0, 452), STEPS[k][1], F('bold', 28), (255, 255, 255, A_), 2.5)
        tag = 'ЩОРАЗУ ВДВІЧІ ГУЧНІШЕ'; ft = F('xbold', 24); tw = tracked_w(tag, ft, 1.8)
        d.rounded_rectangle((X0, 478, X0 + tw + 28, 522), radius=8, fill=(226, 32, 64, A_))
        tracked(d, (X0 + 14, 509), tag, ft, (255, 255, 255, A_), 1.8)
        # caption
        cp = prog(t, S[k] + 0.12, S[k] + 0.4)
        fc = F('italic', 56)
        for i, line in enumerate(wrap(STEPS[k][2], fc, W - 2 * X0)):
            d.text((X0, 640 + i * 72 + 12 * (1 - out_cubic(cp))), line, font=fc, fill=(255, 255, 255, int(255 * cp)), anchor='ls')
    # «Га? Шо?» speech bubble next to Костя
    if t >= T_GA:
        (hx, hy, _, _), (kx, ky, _, _) = space_poses(t)
        txt = 'Га?' if t < T_SHO else 'Га? Шо?'
        bp = out_cubic(prog(t, T_GA, T_GA + 0.25)); sc = lerp(0.5, 1, bp) * (1 + 0.04 * math.sin(math.pi * prog(t, T_SHO, T_SHO + 0.2)))
        fb = F('medium', int(78 * sc)); tw = fb.getlength(txt)
        bx, by = kx + 80, ky - 470
        x0, y0, x1, y1 = bx - tw / 2 - 34 * sc, by - 64 * sc, bx + tw / 2 + 34 * sc, by + 40 * sc
        d.rounded_rectangle((x0, y0, x1, y1), radius=int(36 * sc), fill=(255, 255, 255, int(255 * bp)))
        d.polygon([(bx - 70 * sc, y1 - 2), (bx - 20 * sc, y1 - 2), (bx - 120 * sc, y1 + 50 * sc)], fill=(255, 255, 255, int(255 * bp)))
        d.text((bx, by + 12 * sc), txt, font=fb, fill=(20, 20, 26, int(255 * bp)), anchor='ms')
    img.alpha_composite(TOPGRAD)
    img.alpha_composite(with_shadow(lay))
    return img

# ------------------------------------------------------------------ frame
def ring_overlay(img, cam, t):
    """expanding shockwave ring on the ground for steps 4..9"""
    d = ImageDraw.Draw(img)
    for k in range(7, 12):
        tau = t - S[k]
        if tau < 0 or tau > 1.4 or cam.pos[1] < 60: continue
        Rm = [0, 0, 0, 0, 0, 0, 0, 90, 220, 700, 5000, 7000][k] * out_cubic(min(1, tau / 1.2))
        op = 1 - tau / 1.4
        ang = np.linspace(0, 2 * np.pi, 120)
        P = HERO_POS + np.stack([np.cos(ang) * Rm, np.full_like(ang, 0.6), np.sin(ang) * Rm], 1)
        sx, sy, z = cam.project(P)
        wpx = max(2, int(6 * SS))
        for i in range(len(ang) - 1):
            if z[i] > 1 and z[i + 1] > 1:
                d.line([(sx[i], sy[i]), (sx[i + 1], sy[i + 1])], fill=(255, 255, 255, int(200 * op)), width=wpx)

def launch_height(t):
    if t < S[11] + 0.05: return 0.0
    tau = t - S[11] - 0.05
    return 40 * (math.exp(2.9 * tau) - 1)

def sound_rings(img, sx, sy, t, scale=1.0):
    """2D expanding sound-wave arcs from the shouter's mouth"""
    k = step_at(t)
    if not (1 <= k <= 11): return
    tau = t - S[k]
    if tau < 0 or tau > 1.3: return
    d = ImageDraw.Draw(img, 'RGBA')
    n = min(2 + k, 9); spd = (240 + 120 * k) * scale; wdt = max(2, int((2 + k * 0.9) * scale))
    for i in range(n):
        tt = tau - i * 0.09
        if tt < 0 or tt > 0.95: continue
        r = 20 * scale + spd * tt
        a = int(230 * (1 - tt / 0.95))
        d.arc((sx - r, sy - r, sx + r, sy + r), 110, 250, fill=(255, 255, 255, a), width=wdt)
        d.arc((sx - r, sy - r, sx + r, sy + r), -70, 70, fill=(255, 255, 255, a), width=wdt)


def frame(t):
    mouth2d = None
    if t < SPACE_T:
        lh = launch_height(t)
        pos, tgt, fov, roll = camera_at(t, lh)
        cam = Camera(pos, tgt, fov, RW, RH, roll)
        alt = pos[1]
        hz = vlerp((206, 216, 226), (190, 210, 235), clamp(alt / 2000))
        zen = vlerp((150, 182, 222), (70, 120, 200), clamp(alt / 2500))
        img = sky(RW, RH, cam, hz, zen)
        Gw = world_at(t, alt)
        hg, mouth = hero_geo(t, HERO_POS + np.array([0, lh, 0]), HERO_YAW)
        kx = kostya_walk_x(t)
        kg, _ = kostya_geo(t, np.array([kx, lh * 0.93, KOSTYA_Z]), KOSTYA_YAW)
        parts = concat([Gw, hg.arrays(), kg.arrays(), particles_geo(t, mouth)])
        fog_d = max(260.0, alt * 7 / (1 + alt / 900))
        render(img, cam, parts, LIGHT, hz, fog_d)
        img = img.convert('RGBA')
        ring_overlay(img, cam, t)
        if lh > 0:   # two launch streaks
            d = ImageDraw.Draw(img)
            for base, hh in ((HERO_POS, lh), (np.array([kx, 0, KOSTYA_Z]), lh * 0.93)):
                sx, sy, z = cam.project(np.array([base, base + [0, hh, 0]]))
                if z[1] > 1:
                    for wdt, a in ((int(26 * SS), 70), (int(12 * SS), 160), (int(5 * SS), 255)):
                        d.line([(sx[0], sy[0]), (sx[1], sy[1])], fill=(255, 255, 255, a), width=wdt)
                    d.ellipse((sx[1] - 10 * SS, sy[1] - 10 * SS, sx[1] + 10 * SS, sy[1] + 10 * SS), fill=(255, 255, 255, 255))
        msx, msy, mz = cam.project(mouth[None])
        dist = float(np.linalg.norm(mouth - pos))
        img = img.convert('RGB').resize((W, H), Image.LANCZOS).convert('RGBA')
        if mz[0] > 0.5 and dist < 400:
            sound_rings(img, msx[0] / SS, msy[0] / SS, t, clamp(9 / dist, 0.35, 1.6) * 1.6)
    else:
        img = space_frame(t)
        (hsx, hsy, hd, hR), (ksx, ksy, kd, kR) = space_poses(t)
        big = img.resize((RW, RH), Image.BILINEAR)
        cam = Camera((0, 0, -10), (0, 0, 0), 32, RW, RH)
        fp = cam.fp / SS
        def place(sx, sy, dist):
            # world point at depth dist (camera at z=-10) that projects to (sx, sy)
            zc = dist; X = -(sx - W / 2) / fp * zc; Y = -(sy - H / 2) / fp * zc
            return np.array([X, Y - 1.0, zc - 10])
        hg, _ = hero_geo(t, place(hsx, hsy, hd), math.pi - 0.75, body_R=hR)
        kg, _ = kostya_geo(t, place(ksx, ksy, kd), math.pi + 0.75, body_R=kR, walking=False)
        if t < SPACE_T + 0.8:
            d = ImageDraw.Draw(big, 'RGBA'); a = int(220 * (1 - prog(t, SPACE_T, SPACE_T + 0.8)))
            for sx_, sy_ in ((hsx, hsy), (ksx, ksy)):
                for wdt, al in ((int(30 * SS), 0.25), (int(12 * SS), 0.6), (int(5 * SS), 1.0)):
                    d.line([(sx_ * SS, (sy_ + 150) * SS), (sx_ * SS + 20, RH + 50)], fill=(255, 255, 255, int(a * al)), width=wdt)
        render(big, cam, concat([hg.arrays(), kg.arrays()]), norm([-0.5, 0.5, -0.7]), (0, 0, 0), 1e9, amb=0.45, dif=0.65)
        img = big.resize((W, H), Image.LANCZOS).convert('RGBA')
    fl = 0.0
    tau6 = t - S[6]
    if 0 <= tau6 < 0.4: fl = max(fl, 0.6 * (1 - tau6 / 0.4))
    if S[12] - 0.5 <= t < SPACE_T: fl = max(fl, prog(t, S[12] - 0.5, SPACE_T))
    if SPACE_T <= t < SPACE_T + 0.45: fl = max(fl, 1 - prog(t, SPACE_T, SPACE_T + 0.45))
    if fl > 0:
        img = Image.blend(img, Image.new('RGBA', (W, H), (255, 255, 255, 255)), fl)
    hud(img, t)
    return np.asarray(img.convert('RGB'))


if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'preview':
        for s in sys.argv[2:]:
            Image.fromarray(frame(float(s))).save(A('work', f'p_{s}.jpg'), quality=86)
    elif mode == 'video':
        a = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0
        b = float(sys.argv[3]) if len(sys.argv) > 3 else END
        out = sys.argv[4] if len(sys.argv) > 4 else A('work', 'video.mp4')
        ff = os.path.join(os.path.dirname(sys.executable), 'ffmpeg')
        p = subprocess.Popen([ff, '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                              '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-threads', '1', out], stdin=subprocess.PIPE)
        i0, i1 = int(round(a * FPS)), int(round(b * FPS))
        for i in range(i0, i1):
            p.stdin.write(frame(i / FPS).tobytes())
            if i % 30 == 0: print('frame', i, flush=True)
        p.stdin.close(); p.wait(); print('done', out)
