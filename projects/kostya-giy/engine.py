# Tiny low-poly 3D renderer: flat-shaded quads/triangles, painter's algorithm, near-plane clipping, fog.
import math
import numpy as np
from PIL import Image, ImageDraw

INF = 1e18

def norm(v):
    v = np.asarray(v, float); n = np.linalg.norm(v); return v / n if n > 0 else v

def Rx(a):
    c, s = math.cos(a), math.sin(a); return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
def Ry(a):
    c, s = math.cos(a), math.sin(a); return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
def Rz(a):
    c, s = math.cos(a), math.sin(a); return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
def rodrigues(axis, ang):
    k = norm(axis); K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
    return np.eye(3) + math.sin(ang) * K + (1 - math.cos(ang)) * (K @ K)

CORN = np.array([[(i & 1) - 0.5, ((i >> 1) & 1) - 0.5, ((i >> 2) & 1) - 0.5] for i in range(8)])
FIDX = np.array([[0, 2, 6, 4], [1, 3, 7, 5], [0, 1, 5, 4], [2, 3, 7, 6], [0, 1, 3, 2], [4, 5, 7, 6]])
FN = np.array([[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]], float)

# icosahedron (unit radius)
_p = (1 + 5 ** 0.5) / 2
ICO_V = np.array([[-1, _p, 0], [1, _p, 0], [-1, -_p, 0], [1, -_p, 0], [0, -1, _p], [0, 1, _p], [0, -1, -_p], [0, 1, -_p],
                  [_p, 0, -1], [_p, 0, 1], [-_p, 0, -1], [-_p, 0, 1]], float)
ICO_V /= np.linalg.norm(ICO_V[0])
ICO_F = np.array([[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
                  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]])


class Geo:
    """Accumulates faces. Every face: 4 verts (triangles repeat the last), colour, normal, layer, sort point, bias, owner."""
    def __init__(self):
        self.q, self.c, self.n, self.layer, self.sort, self.bias, self.cull, self.owner, self.brk, self.emis = ([] for _ in range(10))

    def _add(self, v4, col, nrm, layer, sortpt, bias, cull, owner, brk, emis):
        self.q.append(v4); self.c.append(col); self.n.append(nrm); self.layer.append(layer)
        self.sort.append(v4.mean(0) if sortpt is None else sortpt); self.bias.append(bias); self.cull.append(cull)
        self.owner.append(owner); self.brk.append(brk); self.emis.append(emis)

    def box(self, c, s, col, R=None, owner=-1, layer=4, bottom=False, sortpt=None, bias=0.0, brk=INF, emis=False, cols=None):
        P = CORN * np.asarray(s, float); N = FN
        if R is not None: P = P @ R.T; N = FN @ R.T
        P = P + np.asarray(c, float)
        for fi in range(6):
            if fi == 2 and not bottom: continue
            self._add(P[FIDX[fi]], cols[fi] if cols else col, N[fi], layer, sortpt, bias, True, owner, brk, emis)

    def quad(self, v4, col, nrm=None, owner=-1, layer=4, sortpt=None, bias=0.0, cull=False, brk=INF, emis=False):
        v4 = np.asarray(v4, float)
        if nrm is None: nrm = norm(np.cross(v4[1] - v4[0], v4[2] - v4[0]))
        self._add(v4, col, np.asarray(nrm, float), layer, sortpt, bias, cull, owner, brk, emis)

    def ico(self, c, r, col, owner=-1, layer=4, R=None, jitter=None):
        V = ICO_V * np.asarray(r, float)
        if R is not None: V = V @ R.T
        V = V + np.asarray(c, float)
        for k, f in enumerate(ICO_F):
            v = V[f]; nrm = norm(np.cross(v[1] - v[0], v[2] - v[0]))
            if np.dot(nrm, v.mean(0) - c) < 0: nrm = -nrm; v = v[::-1]
            cc = col if jitter is None else tuple(np.clip(np.array(col) * jitter[k % len(jitter)], 0, 255))
            self._add(np.vstack([v, v[2:3]]), cc, nrm, layer, None, 0.0, True, owner, INF, False)

    def arrays(self):
        if not self.q:
            return None
        return dict(q=np.array(self.q, float), c=np.array(self.c, float), n=np.array(self.n, float),
                    layer=np.array(self.layer, int), sort=np.array(self.sort, float), bias=np.array(self.bias, float),
                    cull=np.array(self.cull, bool), owner=np.array(self.owner, int), brk=np.array(self.brk, float),
                    emis=np.array(self.emis, bool))


def concat(parts):
    parts = [p for p in parts if p is not None]
    return {k: np.concatenate([p[k] for p in parts]) for k in parts[0]}


class Camera:
    def __init__(self, pos, target, fov_deg, W, H, roll=0.0):
        self.pos = np.asarray(pos, float); f = norm(np.asarray(target, float) - self.pos)
        r = norm(np.cross(f, [0, 1, 0])); u = np.cross(r, f)
        if roll:
            c, s = math.cos(roll), math.sin(roll); r, u = r * c + u * s, -r * s + u * c
        self.f, self.r, self.u = f, r, u
        self.W, self.H = W, H
        self.fp = (H / 2) / math.tan(math.radians(fov_deg) / 2)

    def project(self, P):
        V = np.asarray(P, float) - self.pos
        z = V @ self.f; x = V @ self.r; y = V @ self.u
        with np.errstate(divide='ignore', invalid='ignore'):
            return self.W / 2 + x / z * self.fp, self.H / 2 - y / z * self.fp, z


NEAR = 0.12

def _clip(poly, near=NEAR):
    out = []
    n = len(poly)
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        ina, inb = a[2] > near, b[2] > near
        if ina: out.append(a)
        if ina != inb:
            t = (near - a[2]) / (b[2] - a[2]); out.append(a + (b - a) * t)
    return out


def render(img, cam, G, light, fog_col, fog_d, amb=0.6, dif=0.42):
    if G is None: return
    q = G['q']; N = len(q)
    V = q - cam.pos
    Z = V @ cam.f; X = V @ cam.r; Y = V @ cam.u
    cen = G['sort']
    vis = ~G['cull'] | (np.einsum('ij,ij->i', G['n'], cam.pos - q.mean(1)) > 0)
    front = Z > NEAR
    vis &= front.any(1)
    with np.errstate(divide='ignore', invalid='ignore'):
        sx = cam.W / 2 + X / Z * cam.fp; sy = cam.H / 2 - Y / Z * cam.fp
    allf = front.all(1)
    off = allf & ((np.nanmax(sx, 1) < 0) | (np.nanmin(sx, 1) > cam.W) | (np.nanmax(sy, 1) < 0) | (np.nanmin(sy, 1) > cam.H))
    vis &= ~off
    idx = np.nonzero(vis)[0]
    if len(idx) == 0: return
    sh = amb + dif * np.clip(G['n'][idx] @ light, 0, 1)
    col = np.where(G['emis'][idx, None], G['c'][idx], G['c'][idx] * sh[:, None])
    d = np.linalg.norm(cen[idx] - cam.pos, axis=1)
    fg = (1 - np.exp(-d / fog_d))[:, None]
    col = np.clip(col * (1 - fg) + np.asarray(fog_col, float) * fg, 0, 255).astype(int)
    depth = (cen[idx] - cam.pos) @ cam.f + G['bias'][idx]
    order = np.lexsort((-depth, G['layer'][idx]))
    draw = ImageDraw.Draw(img)
    for o in order:
        i = idx[o]
        if allf[i]:
            pts = list(zip(sx[i].tolist(), sy[i].tolist()))
        else:
            poly = [np.array([X[i, k], Y[i, k], Z[i, k]]) for k in range(4)]
            cp = _clip(poly)
            if len(cp) < 3: continue
            pts = [(cam.W / 2 + p[0] / p[2] * cam.fp, cam.H / 2 - p[1] / p[2] * cam.fp) for p in cp]
        draw.polygon(pts, fill=tuple(col[o]))


def sky(W, H, cam, horizon, zenith, below=None):
    rows = np.arange(H)
    pitch = math.asin(max(-1, min(1, cam.f[1])))
    elev = pitch + np.arctan((H / 2 - rows) / cam.fp)
    k = np.clip(elev / 0.7, 0, 1)[:, None] ** 0.8
    col = np.asarray(horizon, float) * (1 - k) + np.asarray(zenith, float) * k
    if below is not None:
        col = np.where((elev < 0)[:, None], below, col)
    arr = np.repeat(col[:, None, :], W, axis=1).astype(np.uint8)
    return Image.fromarray(arr, 'RGB')
