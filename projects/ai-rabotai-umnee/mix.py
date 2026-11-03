# Voiceover + sound-design bed (SFX from the kit's make_sfx.py), placed on the same timings as render.py.
import wave, os, numpy as np
from scipy.signal import resample_poly
SR, DUR = 44100, 10.0
ROOT = os.path.dirname(os.path.abspath(__file__))

def load(path):
    w = wave.open(path); sr = w.getframerate(); ch = w.getnchannels()
    x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    x = x.reshape(-1, ch)
    if ch == 1: x = np.repeat(x, 2, 1)
    if sr != SR:
        g = np.gcd(SR, sr); x = resample_poly(x, SR // g, sr // g, axis=0)
    return x

out = np.zeros((int(SR * DUR), 2), np.float32)
def place(x, t, gain):
    i = int(t * SR); n = min(len(x), len(out) - i)
    if n > 0: out[i:i + n] += x[:n] * gain

vo = load(os.path.join(ROOT, 'assets/vo/full.wav'))
place(vo, 0.0, 1.0)

S = {n: load(os.path.join(ROOT, f'assets/sfx/{n}.wav')) for n in
     ['whoosh', 'whoosh_short', 'hit', 'pop', 'tick', 'rustle', 'riser', 'subdrop', 'impact']}
cues = [
    ('whoosh_short', 0.02, .05), ('whoosh', 0.40, .09), ('hit', 0.95, .10), ('pop', 1.38, .07),
    ('rustle', 2.22, .10), *[('tick', 2.45 + i * 0.067, .05) for i in range(9)],
    ('hit', 3.45, .11), ('whoosh_short', 3.58, .07), ('tick', 4.27, .10), ('whoosh', 4.18, .07),
    ('impact', 4.60, .06), ('pop', 4.62, .07), ('pop', 4.90, .07), ('pop', 5.93, .07), ('hit', 6.69, .10),
    ('riser', 5.95, .035), ('whoosh', 7.05, .10), ('whoosh', 7.60, .07), ('hit', 8.10, .10), ('pop', 8.32, .06),
    ('rustle', 9.22, .10), ('subdrop', 9.30, .08),
]
for n, t, g in cues: place(S[n], t, g)
# short fade-out at the very end
f = int(0.25 * SR); out[-f:] *= np.linspace(1, 0, f)[:, None]
out = np.clip(out, -1, 1)
with wave.open(os.path.join(ROOT, 'work/mix.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
print('mix ok')
