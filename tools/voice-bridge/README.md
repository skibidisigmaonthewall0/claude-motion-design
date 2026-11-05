# Voice bridge — голос 🇷🇺 Nikolay через ваш аккаунт Puter

Агент сам ставит реплики в очередь. Вкладка браузера, где вы вошли в Puter, озвучивает их голосом **Nikolay** (ElevenLabs `3EuKHIEZbSzrHGNmdYsx`, `eleven_multilingual_v2`) и отправляет аудио обратно в репозиторий. Пароли и токены агенту не нужны: вход делаете вы, во всплывающем окне Puter.

```bash
python tools/voice-bridge/server.py      # http://0.0.0.0:8765 — открыть в браузере, «Войти в Puter»
python tools/voice-bridge/queue.py "Текст" projects/<видео>/assets/vo/line1   # → line1.mp3 + line1.wav
python tools/voice-bridge/queue.py --list
```

- `jobs.json` — очередь (не коммитится).
- Пути вывода задаются относительно корня репозитория, без расширения. Пишутся `.mp3` (оригинал ElevenLabs) и `.wav` (44.1 kHz, моно) для `mix.py`.
- Другой голос: `--voice <id>` (id есть в `tools/voice-site/src/lib/voices.ts`). Другая модель: `--model eleven_v3`.

Исходники вашего сайта Voxel лежат в `tools/voice-site/`; мост использует тот же вызов `puter.ai.txt2speech`.
