# Sound design: escalating sneezes + kit SFX + ambience that follows the camera (street -> sky -> space silence).
import wave, os, math, numpy as np
from scipy.signal import resample_poly, butter, sosfilt
SR = 44100
ROOT = os.path.dirname(os.path.abspath(__file__))
S = [None] + [2.6 + (k - 1) * 2.25 for k in range(1, 12)] + [27.35]
END = 31.0
SPACE_T = S[10] - 0.12
rng = np.random.default_rng(1)

def load(p, mono=False):
    w = wave.open(os.path.join(ROOT, p)); sr = w.getframerate(); ch = w.getnchannels()
    x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32).reshape(-1, ch) / 32768
    x = x.mean(1) if mono else (np.repeat(x, 2, 1) if ch == 1 else x)
    if sr != SR:
        g = math.gcd(SR, sr); x = resample_poly(x, SR // g, sr // g, axis=0)
    return x.astype(np.float32)

def st(x): return np.stack([x, x], 1) if x.ndim == 1 else x
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x, axis=0)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x, axis=0)

out = np.zeros((int(SR * END), 2), np.float32)
def place(x, t, g=1.0):
    x = st(x); i = int(t * SR)
    if i < 0: x = x[-i:]; i = 0
    n = min(len(x), len(out) - i)
    if n > 0: out[i:i + n] += x[:n] * g

def onset(x, after, thr_db=-30):
    hop = int(SR * 0.005)
    for i in range(int(after * SR), len(x) - hop, hop):
        if 20 * np.log10(np.sqrt(np.mean(x[i:i + hop] ** 2)) + 1e-9) > thr_db: return i / SR
    return after

def reverb(x, secs, wet):
    n = int(SR * secs); ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 7, n)); ir = lp(ir, 5000)
    ir /= np.sqrt(np.sum(ir ** 2))
    L = len(x) + n; y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)
    xx = np.concatenate([x, np.zeros(n)])
    return xx * (1 - wet) + y * wet

sn = load('assets/vo/sneeze2.wav', mono=True)
sn = sn / np.max(np.abs(sn))
burst = onset(sn, 0.62, -28)
sn1 = load('assets/vo/sneeze1.wav', mono=True); sn1 = sn1 / np.max(np.abs(sn1))
b1 = onset(sn1, 1.45)

SFX = {n: load(f'assets/sfx/{n}.wav') for n in ['whoosh', 'whoosh_short', 'impact', 'hit', 'riser', 'tick', 'subdrop', 'pop', 'crack', 'rustle', 'tear']}

# ---- sneezes 1..11, bigger every time: pitch down, drive, bass boom, reverb
for k in range(1, 12):
    rate = [1, 1.0, 1.0, 0.97, 0.94, 0.9, 0.86, 0.82, 0.78, 0.74, 0.8, 0.9][k]
    x = resample_poly(sn, int(1000 / rate), 1000) if rate != 1 else sn.copy()
    drive = 1 + 0.35 * max(0, k - 2)
    x = np.tanh(x * drive) / np.tanh(drive)
    if k >= 4:
        x = reverb(x, 0.4 + 0.12 * k, min(0.12 + 0.04 * k, 0.45))
    if k >= 10:   # thin air at the edge of space
        x = hp(x, 900); x = lp(x, 3500)
    g = [0, 0.55, 0.62, 0.68, 0.75, 0.8, 0.84, 0.88, 0.9, 0.92, 0.6, 0.45][k]
    place(x, S[k] - burst / rate, g)
    place(SFX['tick'], S[k] + 0.02, 0.18)            # number roll tick

# ---- step 12: only the "а... а..." wind-up, then silence
pre = sn1[int((b1 - 0.85) * SR):int((b1 - 0.02) * SR)].copy()
pre *= np.linspace(1, 0.6, len(pre))
place(hp(pre, 300), S[12] - 0.85, 0.55)

# ---- event SFX
ev = [
    ('rustle', S[2] + 0.1, 0.35), ('rustle', S[2] + 0.25, 0.3), ('whoosh_short', S[2] + 0.05, 0.25),
    ('whoosh', S[3], 0.4),
    ('impact', S[4], 0.55), ('crack', S[4] + 0.08, 0.5), ('crack', S[4] + 0.3, 0.35),
    ('whoosh', S[5], 0.5), ('hit', S[5] + 0.15, 0.4), ('impact', S[5] + 0.05, 0.35),
    ('whoosh', S[6], 0.55), ('impact', S[6], 0.45), ('tear', S[6] + 0.2, 0.3),
    ('whoosh', S[6] + 0.5, 0.3),
    ('subdrop', S[7], 0.6), ('impact', S[7] + 0.4, 0.5), ('crack', S[7] + 0.6, 0.4), ('impact', S[7] + 1.0, 0.35),
    ('whoosh', S[8] - 0.5, 0.35), ('impact', S[8], 0.6), ('whoosh', S[8] + 0.3, 0.55),
    ('impact', S[9], 0.6), ('riser', S[9] + 0.3, 0.45), ('whoosh', SPACE_T - 0.35, 0.5),
    ('whoosh_short', S[10], 0.3), ('whoosh_short', S[11], 0.25),
]
for n, t, g in ev: place(SFX[n], t, g)

# rumble under building collapse
n = int(SR * 2.6); r = lp(rng.standard_normal(n), 140, 4) * np.sin(np.linspace(0, np.pi, n)) ** 0.7
place(r / np.max(np.abs(r)), S[7] + 0.3, 0.55)

# ---- ambience by camera altitude
T = np.arange(len(out)) / SR
city = lp(rng.standard_normal(len(out)), 900, 2) * 0.5 + lp(rng.standard_normal(len(out)), 220, 2) * 0.8
city = city / np.max(np.abs(city))
cityg = np.clip(1 - (T - (S[6] + 0.3)) / 1.5, 0, 1) * 0.07
wind = hp(lp(rng.standard_normal(len(out)), 1400, 2), 150, 2); wind /= np.max(np.abs(wind))
wmod = 0.6 + 0.4 * np.sin(T * 1.7) * np.sin(T * 0.6 + 1)
windg = np.clip((T - S[6]) / 1.5, 0, 1) * np.clip(1 - (T - (SPACE_T - 0.1)) / 0.3, 0, 1) * 0.09 * wmod
space = lp(rng.standard_normal(len(out)), 120, 2); space /= np.max(np.abs(space))
spaceg = np.clip((T - SPACE_T) / 1.0, 0, 1) * 0.03 * np.clip(1 - (T - S[12]) / 0.4, 0.15, 1)
amb = city * cityg + wind * windg + space * spaceg
out += np.stack([amb, amb * 0.95 + np.roll(amb, 300) * 0.05], 1)

# hard vacuum on the last sneeze: duck everything at S[12]
duck = np.clip(1 - (T - (S[12] - 0.02)) / 0.05, 0.08, 1)
out *= duck[:, None]
place(SFX['pop'], S[12] + 1.95, 0.3)   # «Будь здоров.»
f = int(0.3 * SR); out[-f:] *= np.linspace(1, 0, f)[:, None]
out = np.clip(out, -1, 1)
with wave.open(os.path.join(ROOT, 'work/mix.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
print('mix ok, burst at', round(burst, 3), 'b1', round(b1, 3))
