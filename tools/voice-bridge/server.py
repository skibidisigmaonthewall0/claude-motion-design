"""Voice bridge: lets the agent use the owner's Puter account (ElevenLabs voices) from the sandbox.

The owner opens the page in a browser and signs in to Puter once. The page polls /api/jobs, runs
puter.ai.txt2speech for every pending job under the owner's account, and POSTs the audio back.
The server saves it inside the repo (mp3 + a 44.1 kHz wav copy when ffmpeg is available).

    python tools/voice-bridge/server.py            # port 8765, bind 0.0.0.0
    python tools/voice-bridge/queue.py "Текст" projects/x/assets/vo/line1   # add a job
"""
import json, os, shutil, subprocess, sys, threading, time
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
JOBS = os.path.join(HERE, 'jobs.json')
LOCK = threading.Lock()


def load_jobs():
    if not os.path.exists(JOBS): return []
    with open(JOBS, encoding='utf-8') as f: return json.load(f)


def save_jobs(jobs):
    tmp = JOBS + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f: json.dump(jobs, f, ensure_ascii=False, indent=2)
    os.replace(tmp, JOBS)


def safe_out(rel):
    p = os.path.abspath(os.path.join(REPO, rel))
    if not p.startswith(REPO + os.sep): raise ValueError('path outside repo')
    return p


def ffmpeg():
    cand = [shutil.which('ffmpeg'), os.path.join(os.path.dirname(sys.executable), 'ffmpeg')]
    try:
        import imageio_ffmpeg; cand.append(imageio_ffmpeg.get_ffmpeg_exe())
    except Exception: pass
    return next((c for c in cand if c and os.path.exists(c)), None)


class H(BaseHTTPRequestHandler):
    def log_message(self, fmt, *a): sys.stdout.write('[bridge] ' + fmt % a + '\n'); sys.stdout.flush()

    def send(self, code, body, ctype='application/json; charset=utf-8'):
        if not isinstance(body, bytes): body = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code); self.send_header('Content-Type', ctype)
        self.send_header('Cache-Control', 'no-store'); self.send_header('Content-Length', str(len(body)))
        self.end_headers(); self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path in ('/', '/index.html'):
            with open(os.path.join(HERE, 'bridge.html'), 'rb') as f: return self.send(200, f.read(), 'text/html; charset=utf-8')
        if u.path == '/api/jobs':
            with LOCK: return self.send(200, load_jobs())
        if u.path == '/api/audio':
            q = parse_qs(u.query); p = safe_out(q['path'][0])
            if not os.path.exists(p): return self.send(404, {'error': 'no file'})
            with open(p, 'rb') as f: return self.send(200, f.read(), 'audio/mpeg')
        self.send(404, {'error': 'not found'})

    def do_POST(self):
        u = urlparse(self.path); q = parse_qs(u.query)
        n = int(self.headers.get('Content-Length', 0)); body = self.rfile.read(n)
        with LOCK:
            jobs = load_jobs(); job = next((j for j in jobs if j['id'] == q.get('id', [''])[0]), None)
            if not job: return self.send(404, {'error': 'unknown job'})
            if u.path == '/api/fail':
                job['status'] = 'error'; job['error'] = body.decode('utf-8', 'replace')[:500]
                save_jobs(jobs); return self.send(200, {'ok': True})
            if u.path != '/api/upload': return self.send(404, {'error': 'not found'})
            if len(body) < 500:
                job['status'] = 'error'; job['error'] = f'audio too small ({len(body)} bytes)'
                save_jobs(jobs); return self.send(400, {'error': job['error']})
            base = safe_out(job['out']); os.makedirs(os.path.dirname(base), exist_ok=True)
            mp3 = base + '.mp3'
            with open(mp3, 'wb') as f: f.write(body)
            files = [os.path.relpath(mp3, REPO)]
            ff = ffmpeg()
            if ff:
                wav = base + '.wav'
                r = subprocess.run([ff, '-y', '-loglevel', 'error', '-i', mp3, '-ar', '44100', '-ac', '1', wav])
                if r.returncode == 0: files.append(os.path.relpath(wav, REPO))
            job.update(status='done', files=files, bytes=len(body), done_at=time.strftime('%H:%M:%S'))
            job.pop('error', None)
            save_jobs(jobs)
        self.log_message('saved %s', files)
        self.send(200, {'ok': True, 'files': files})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8765))
    print(f'voice bridge on 0.0.0.0:{port}, repo {REPO}', flush=True)
    ThreadingHTTPServer(('0.0.0.0', port), H).serve_forever()
