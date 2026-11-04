# Sound design: «Костя Гій!» louder every time + kit SFX + car alarms + Костя's leaking headphone beat,
# ambience that follows the camera (street -> sky -> space silence), then «Га? Шо?» in the vacuum.
import wave, os, math, numpy as np
from scipy.signal import resample_poly, butter, sosfilt
SR = 44100
ROOT = os.path.dirname(os.path.abspath(__file__))
S = [None] + [2.6 + (k - 1) * 2.25 for k in range(1, 13)]
END = 32.0
SPACE_T = S[12] - 0.12
T_OFF, T_GA = S[12] + 1.15, S[12] + 1.5
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
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x, axis=0)

out = np.zeros((int(SR * END), 2), np.float32)
def place(x, t, g=1.0):
    x = st(x); i = int(t * SR)
    if i < 0: x = x[-i:]; i = 0
    n = min(len(x), len(out) - i)
    if n > 0: out[i:i + n] += x[:n] * g

def onset(x, after=0.0, thr_db=-30):
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

sh1 = load('assets/vo/shout1.wav', mono=True); sh1 /= np.max(np.abs(sh1)); o1 = onset(sh1)
sh2 = load('assets/vo/shout2.wav', mono=True); sh2 /= np.max(np.abs(sh2)); o2 = onset(sh2)
ko = load('assets/vo/kostya.wav', mono=True); ko /= np.max(np.abs(ko)); ok = onset(ko)

SFX = {n: load(f'assets/sfx/{n}.wav') for n in ['whoosh', 'whoosh_short', 'impact', 'hit', 'riser', 'tick', 'subdrop', 'pop', 'crack', 'rustle', 'tear']}

def boom(dur=1.2, f0=55):
    n = int(SR * dur); tt = np.arange(n) / SR
    f = f0 * np.exp(-tt * 1.5); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-tt * 3.2) + 0.3 * lp(rng.standard_normal(n), 200) * np.exp(-tt * 5)).astype(np.float32)

# ---- shouts 1..11, louder every time: drive, pitch-down sub layer, reverb, boom
for k in range(1, 12):
    src, on = (sh1, o1) if k <= 3 else (sh2, o2)
    rate = [1, 1, 1, 1, 1, 0.99, 0.97, 0.95, 0.93, 0.9, 0.88, 0.86][k]
    x = resample_poly(src, int(1000 / rate), 1000) if rate != 1 else src.copy()
    drive = 1 + 0.45 * max(0, k - 3)
    x = np.tanh(x * drive) / np.tanh(drive)
    if k >= 5:   # octave-down monster layer
        sub = resample_poly(src, 2000, 1000)[:int(len(x) * 1.6)]
        sub = np.tanh(sub * 3) * min(0.15 + 0.06 * (k - 5), 0.5)
        y = np.zeros(max(len(x), len(sub))); y[:len(x)] += x; y[:len(sub)] += sub; x = y
    if k >= 3:
        x = reverb(x, 0.4 + 0.15 * k, min(0.1 + 0.045 * k, 0.5))
    g = [0, 0.32, 0.42, 0.52, 0.6, 0.66, 0.72, 0.78, 0.82, 0.86, 0.88, 0.92][k]
    place(x, S[k] - on / rate, g)
    if k >= 6: place(boom(1.0 + 0.15 * k, 60 - 2 * k), S[k] + 0.05, min(0.3 + 0.06 * (k - 6), 0.65))
    place(SFX['tick'], S[k] + 0.15, 0.16)

# ---- Костя's headphones leaking a tinny 120 bpm beat (street only)
n = int(SR * (S[8] + 0.5)); beat = np.zeros(n, np.float32)
kick = boom(0.18, 90) * 0.9; hat = hp(rng.standard_normal(int(SR * 0.04)), 6000) * np.exp(-np.linspace(0, 6, int(SR * 0.04)))
tt = 0.05
while tt < n / SR - 0.5:
    i = int(tt * SR); beat[i:i + len(kick)] += kick[:n - i]
    j = int((tt + 0.25) * SR); beat[j:j + len(hat)] += hat[:max(0, n - j)] * 0.6
    tt += 0.5
beat = bp(beat, 700, 4000) * np.clip(np.linspace(1.6, 0, n), 0, 1) ** 0.3
place(beat / (np.max(np.abs(beat)) + 1e-9), 0, 0.05)

# ---- car alarms from S4 (two-tone siren), silenced when the cars fly at S7
n = int(SR * (S[7] + 0.5 - S[4])); tt = np.arange(n) / SR
f = np.where((tt * 2.5) % 1 < 0.5, 1350, 950); ph = 2 * np.pi * np.cumsum(f) / SR
al = np.sign(np.sin(ph)) * 0.5 + np.sin(ph) * 0.5
al2 = np.sign(np.sin(2 * np.pi * np.cumsum(np.where((tt * 3.3 + 0.2) % 1 < 0.5, 1180, 820)) / SR))
alarm = lp(al + 0.6 * al2, 3500) * np.clip(tt / 0.15, 0, 1) * np.clip((n / SR - tt) / 0.3, 0, 1)
place(np.stack([alarm, np.roll(alarm, 900)], 1), S[4] + 0.25, 0.07)

# ---- glass at S6: noise burst + tinkles
gl = hp(rng.standard_normal(int(SR * 1.2)), 2500) * np.exp(-np.linspace(0, 6, int(SR * 1.2)))
for _ in range(60):
    t0 = rng.uniform(0, 1.6); fr = rng.uniform(2500, 7000); d = int(SR * 0.12)
    ping = np.sin(2 * np.pi * fr * np.arange(d) / SR) * np.exp(-np.linspace(0, 8, d))
    place(ping * rng.uniform(0.2, 0.6), S[6] + 0.1 + t0, 0.25)
place(gl, S[6] + 0.06, 0.4)

# ---- event SFX
ev = [
    ('rustle', S[2] + 0.1, 0.4), ('rustle', S[2] + 0.3, 0.35), ('whoosh_short', S[2] + 0.1, 0.25),
    ('whoosh_short', S[3] + 0.15, 0.25),
    ('whoosh', S[5] + 0.1, 0.35), ('rustle', S[5] + 0.2, 0.3),
    ('impact', S[6], 0.5), ('crack', S[6] + 0.1, 0.45),
    ('whoosh', S[7], 0.55), ('hit', S[7] + 0.15, 0.4), ('impact', S[7] + 0.05, 0.4),
    ('whoosh', S[8], 0.55), ('impact', S[8], 0.45), ('tear', S[8] + 0.2, 0.3), ('whoosh', S[8] + 0.5, 0.3),
    ('subdrop', S[9], 0.6), ('impact', S[9] + 0.4, 0.5), ('crack', S[9] + 0.6, 0.4), ('impact', S[9] + 1.0, 0.35),
    ('whoosh', S[10] - 0.5, 0.35), ('impact', S[10], 0.55), ('whoosh', S[10] + 0.3, 0.5),
    ('impact', S[11], 0.6), ('riser', S[11] + 0.3, 0.45), ('whoosh', SPACE_T - 0.35, 0.5),
]
for nme, t, g in ev: place(SFX[nme], t, g)
n = int(SR * 2.6); r = lp(rng.standard_normal(n), 140, 4) * np.sin(np.linspace(0, np.pi, n)) ** 0.7
place(r / np.max(np.abs(r)), S[9] + 0.3, 0.55)

# ---- ambience by camera altitude
T = np.arange(len(out)) / SR
city = lp(rng.standard_normal(len(out)), 900, 2) * 0.5 + lp(rng.standard_normal(len(out)), 220, 2) * 0.8
city = city / np.max(np.abs(city))
cityg = np.clip(1 - (T - (S[8] + 0.3)) / 1.5, 0, 1) * 0.07
wind = hp(lp(rng.standard_normal(len(out)), 1400, 2), 150, 2); wind /= np.max(np.abs(wind))
wmod = 0.6 + 0.4 * np.sin(T * 1.7) * np.sin(T * 0.6 + 1)
windg = np.clip((T - S[8]) / 1.5, 0, 1) * np.clip(1 - (T - (SPACE_T - 0.1)) / 0.3, 0, 1) * 0.09 * wmod
space = lp(rng.standard_normal(len(out)), 120, 2); space /= np.max(np.abs(space))
spaceg = np.clip((T - SPACE_T) / 1.0, 0, 1) * 0.03 * np.clip(1 - (T - S[12]) / 0.4, 0.15, 1)
amb = city * cityg + wind * windg + space * spaceg
out += np.stack([amb, amb * 0.95 + np.roll(amb, 300) * 0.05], 1)

# hard vacuum on shout 12: he shouts, nothing is heard
duck = np.clip(1 - (T - (S[12] - 0.02)) / 0.05, 0.08, 1)
out *= duck[:, None]
place(SFX['rustle'], T_OFF - 0.1, 0.35)          # headphones off
place(ko, T_GA - ok, 0.8)                         # «Га? ... Шо?»
place(SFX['pop'], T_GA - 0.02, 0.18)
f = int(0.3 * SR); out[-f:] *= np.linspace(1, 0, f)[:, None]
out *= 0.9 / np.max(np.abs(out))   # headroom; loudnorm sets the final level
out = np.clip(out, -1, 1)
with wave.open(os.path.join(ROOT, 'work/mix.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
print('mix ok; onsets', round(o1, 3), round(o2, 3), round(ok, 3))
