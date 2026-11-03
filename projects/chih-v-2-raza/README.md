# «Что, если каждый чих будет в 2 раза сильнее предыдущего?» — 9:16, 31 s

Escalation short in the format of the reference video (`../ai-rabotai-umnee/Что будет, если каждый раз кричать…mp4`):
low-poly blocky 3D world, HUD top-left (ЧИХ №N · big number · comparison · red tag), one dry caption per step,
camera pulls out every few steps (street → city → country → space), anticlimax punchline.

| # | km/h | comparison | what happens |
|---|---|---|---|
| 1 | 160 | обычный чих | nobody notices |
| 2 | 320 | ураган 5 категории | pigeons take off, cap flies |
| 3 | 640 | сильнее любого торнадо | passers-by blown down the street |
| 4 | 1 280 | быстрее звука | sonic boom, all windows blow out |
| 5 | 2 560 | как пуля АК-47 | cars fly like leaves |
| 6 | 5 120 | 4 скорости звука | trees, lamps, asphalt; camera lifts off |
| 7 | 10 240 | гиперзвук | buildings fall outward like dominoes |
| 8 | 20 480 | в 16 раз быстрее звука | clouds cleared over the country |
| 9 | 40 960 | вторая космическая | recoil launches you into the sky |
| 10 | 81 920 | в 2 раза быстрее «Аполлона» | through the stratosphere |
| 11 | 163 840 | до Луны за 2 часа | last sneeze at the edge of the atmosphere |
| 12 | 0 | в космосе нет воздуха | nothing to sneeze with. «Будь здоров.» |

## Files
- `engine.py` — tiny flat-shaded 3D renderer (painter's algorithm, near-plane clipping, fog) on PIL + numpy
- `render.py` — world, hero rig, particles, cameras, Earth/Moon, HUD, timeline
- `mix.py` — escalating sneezes (pitch down + drive + reverb), kit SFX, ambience by altitude, vacuum silence at the end
- `make_sfx.py` — SFX synth from the motion-director kit

## Rebuild
```bash
pip install numpy pillow scipy imageio-ffmpeg
ln -s "$(python -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')" "$(dirname $(which python))/ffmpeg"
python make_sfx.py assets/sfx
SS=2 python render.py video            # -> work/video.mp4   (preview: python render.py preview 3 10 20 29)
python mix.py                          # -> work/mix.wav
ffmpeg -i work/video.mp4 -i work/mix.wav -map 0:v -map 1:a -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11,volume=-2dB,alimiter=limit=0.89" -c:a aac -b:a 192k -shortest -movflags +faststart out.mp4
```
