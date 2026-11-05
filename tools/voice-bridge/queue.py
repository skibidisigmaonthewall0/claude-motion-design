"""Add / list / clear voice jobs for the bridge.

    python queue.py "Текст реплики" projects/x/assets/vo/line1 [--voice ID] [--model eleven_v3]
    python queue.py --list
    python queue.py --clear-done
Output path is relative to the repo root, without extension (.mp3 and .wav are written).
"""
import argparse, json, os, time, uuid

HERE = os.path.dirname(os.path.abspath(__file__))
JOBS = os.path.join(HERE, 'jobs.json')
NIKOLAY = '3EuKHIEZbSzrHGNmdYsx'   # 🇷🇺 Nikolay (ElevenLabs), the owner's chosen voice


def load():
    return json.load(open(JOBS, encoding='utf-8')) if os.path.exists(JOBS) else []


def save(j):
    json.dump(j, open(JOBS, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)


ap = argparse.ArgumentParser()
ap.add_argument('text', nargs='?'); ap.add_argument('out', nargs='?')
ap.add_argument('--voice', default=NIKOLAY); ap.add_argument('--model', default='eleven_multilingual_v2')
ap.add_argument('--list', action='store_true'); ap.add_argument('--clear-done', action='store_true')
a = ap.parse_args()
jobs = load()
if a.clear_done:
    jobs = [j for j in jobs if j.get('status') != 'done']; save(jobs)
if a.text and a.out:
    jobs.append(dict(id=uuid.uuid4().hex[:10], text=a.text, out=a.out, voice=a.voice, model=a.model,
                     format='mp3_44100_192', status='pending', created=time.strftime('%H:%M:%S')))
    save(jobs)
if a.list or not (a.text or a.clear_done):
    for j in jobs: print(f"{j['id']}  {j['status']:8}  {j['out']}  «{j['text'][:50]}»  {j.get('error', '')}")
