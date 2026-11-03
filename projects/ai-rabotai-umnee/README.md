# «Работай умнее» — моушн 9:16, 10 с

Built with the **motion-director** kit (Editorial Collage house style), rendered locally instead of Google Flow.

**VO (ru):** «Ты тратишь восемь часов на то, что нейросеть делает за минуту. Дай ей рутину — себе оставь идеи. Работай умнее, а не дольше.»

| Time | Beat | Hero | Words on screen | Transition |
|---|---|---|---|---|
| 0.0–4.6 | Hook: hours vs minute | brass hourglass (flips) | «8 часов» (crossed out), «нейросеть», «1 минута» | cursor click → purple circle flood |
| 4.6–7.1 | Turn: routine vs ideas | brass gears, purple glass bulb | «ей — рутину», «себе — идеи» | white starburst explosion |
| 7.1–10.0 | Punch + poster | purple glass brain | «Работай умнее», «а не дольше» (crossed out) | final poster |

## Rebuild
```bash
pip install numpy pillow scipy imageio-ffmpeg
python cutout.py              # white-background cutouts -> assets/cut
python render.py video        # -> work/video_noaudio.mp4  (preview: python render.py preview 1.5 5 9)
python mix.py                 # VO + SFX bed -> work/mix.wav
ffmpeg -i work/video_noaudio.mp4 -i work/mix.wav -map 0:v -map 1:a -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11,alimiter=limit=0.89" -c:a aac -b:a 256k -shortest -movflags +faststart out.mp4
```
(`render.py` expects an `ffmpeg` next to the Python executable — symlink the imageio-ffmpeg binary there or edit the path.)
