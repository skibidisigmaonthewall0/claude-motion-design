import { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { Icon } from "../components/Icon";
import { AudioPlayer, SectionLabel, VoiceAvatar, VoicePicker } from "../components/ui";
import { useLab } from "../store";
import {
  SAMPLE_UPLOAD_URL,
  convertSpeech,
  downloadAudio,
  friendlyError,
  slugify,
  uid,
} from "../lib/puter";
import type { Page } from "../components/Shell";

interface Source {
  url: string;
  name: string;
  kind: "file" | "url";
  size?: number;
  file?: File;
}

export function VoiceChanger({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const {
    selectedVoiceId,
    setSelectedVoiceId,
    toast,
    allVoices,
    resolveVoice,
    libraryStatus,
    loadLibrary,
  } = useLab();
  const [source, setSource] = useState<Source | null>(null);
  const [urlInput, setUrlInput] = useState(SAMPLE_UPLOAD_URL);
  const [dragging, setDragging] = useState(false);
  const [converting, setConverting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{ id: string; src: string; voiceId: string; sourceName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const voice = resolveVoice(selectedVoiceId);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!converting) return;
    const started = Date.now();
    setElapsed(0);
    const interval = window.setInterval(() => setElapsed((Date.now() - started) / 1000), 100);
    return () => window.clearInterval(interval);
  }, [converting]);

  const acceptFile = (file: File | undefined | null) => {
    if (!file) return;
    const looksLikeAudio =
      file.type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|opus|webm|flac|aac|aiff?)$/i.test(file.name);
    if (!looksLikeAudio) {
      toast("Please choose an audio file (MP3, WAV, M4A, OGG…).", "error");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast("That file is larger than 25 MB. Try a shorter clip.", "error");
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setSource({ url, name: file.name, kind: "file", size: file.size, file });
    setResult(null);
    setError(null);
    toast("Audio loaded. Pick a target voice and convert.");
  };

  const loadUrl = () => {
    const trimmed = urlInput.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      toast("Enter a full public URL starting with http:// or https://", "error");
      return;
    }
    setSource({ url: trimmed, name: trimmed.split("/").pop() || "Remote audio", kind: "url" });
    setResult(null);
    setError(null);
    toast("Remote audio loaded.");
  };

  const convert = async () => {
    if (!source || converting) return;
    setConverting(true);
    setError(null);
    try {
      const src = await convertSpeech(source.file ?? source.url, selectedVoiceId);
      setResult({ id: uid(), src, voiceId: selectedVoiceId, sourceName: source.name });
      toast(`Voice conversion complete — now speaking as ${voice.name}.`);
    } catch (err) {
      const message = friendlyError(err);
      setError(message);
      toast(message, "error");
    } finally {
      setConverting(false);
    }
  };

  const resultVoice = result ? resolveVoice(result.voiceId) : voice;

  return (
    <div className="space-y-5">
      <section className="animate-rise flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-lab-lime" />
            <span className="font-mono text-[10px] tracking-[0.18em] text-lab-lime/80 uppercase">
              Speech to speech · Voice conversion
            </span>
          </div>
          <h1 className="mt-2.5 font-display text-[32px] leading-[1.02] font-semibold tracking-[-0.03em] text-white sm:text-[38px]">
            Reskin any recording{" "}
            <span className="font-serif font-normal italic tracking-normal text-lab-lime">in seconds.</span>
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-lab-muted">
            Upload a clip or point to a public audio URL, then convert it into any voice in the library. The delivery
            stays; the voice changes.
          </p>
        </div>
        <span className="chip self-start border-lab-lime/20 bg-lab-lime/[0.05] text-lab-lime/80 lg:self-auto">
          <Icon name="zap" size={11} /> eleven_multilingual_sts_v2
        </span>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <section className="card animate-rise" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center justify-between border-b border-lab-line px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-lg border border-lab-line bg-white/[0.03] text-lab-lime">
                <Icon name="upload" size={14} />
              </span>
              <div>
                <h2 className="text-[13px] font-semibold text-white">Source audio</h2>
                <p className="font-mono text-[9px] tracking-[0.14em] text-lab-faint uppercase">01 / Provide a clip</p>
              </div>
            </div>
            {source && (
              <button
                type="button"
                onClick={() => {
                  setSource(null);
                  setResult(null);
                  setError(null);
                }}
                className="inline-flex items-center gap-1 font-mono text-[9px] tracking-wide text-lab-faint uppercase transition-colors hover:text-red-400"
              >
                <Icon name="trash" size={11} /> Remove
              </button>
            )}
          </div>

          <div className="space-y-3 p-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                acceptFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-7 text-center transition-colors",
                dragging
                  ? "border-lab-lime/70 bg-lab-lime/[0.06]"
                  : "border-lab-line2 bg-[#0b0c0e] hover:border-lab-line2",
              )}
            >
              <span className="grid size-11 place-items-center rounded-full border border-lab-line bg-white/[0.03] text-lab-lime">
                <Icon name="upload" size={18} />
              </span>
              <p className="mt-2.5 text-[12.5px] font-medium text-lab-cream">
                Drop an audio file here, or{" "}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-lab-lime underline decoration-lab-lime/40 underline-offset-2 hover:decoration-lab-lime"
                >
                  browse
                </button>
              </p>
              <p className="mt-1 font-mono text-[9px] tracking-wide text-lab-faint uppercase">
                MP3 · WAV · M4A · OGG — up to 25 MB
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => acceptFile(e.target.files?.[0])}
              />
            </div>

            <div>
              <SectionLabel>Or use a public audio URL</SectionLabel>
              <div className="mt-1.5 flex gap-2">
                <div className="relative flex-1">
                  <Icon name="link" size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-lab-faint" />
                  <input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/voice-note.mp3"
                    className="field !py-2.5 pl-9 font-mono text-[11px]"
                    aria-label="Public audio URL"
                  />
                </div>
                <button type="button" onClick={loadUrl} className="btn-ghost shrink-0 !py-2.5 text-[11.5px]">
                  Load
                </button>
              </div>
              <p className="mt-1.5 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-lab-faint">
                <Icon name="info" size={11} className="mt-0.5 shrink-0" />
                Local files are uploaded to Puter as a data source automatically. Public HTTPS URLs also work — use
                either.
              </p>
            </div>

            {source && (
              <div className="animate-rise rounded-xl border border-lab-line bg-[#0b0c0e] p-3">
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-lab-lime/10 text-lab-lime">
                    <Icon name="fileAudio" size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-lab-cream">{source.name}</p>
                    <p className="font-mono text-[9px] tracking-wide text-lab-faint uppercase">
                      {source.kind === "file" ? "Local file" : "Remote URL"}
                      {source.size ? ` · ${(source.size / 1024 / 1024).toFixed(1)} MB` : ""}
                    </p>
                  </div>
                  <span className="chip border-lab-lime/20 text-lab-lime/80">loaded</span>
                </div>
                <AudioPlayer
                  compact
                  src={source.url}
                  seed={`source-${source.url.slice(-24)}`}
                  filename={source.kind === "file" ? source.name : "voxel-source.mp3"}
                  tone="violet"
                  onDownloaded={(outcome) =>
                    toast(
                      outcome === "downloaded" ? "Source audio download started." : "Opened the source audio in a new tab.",
                      outcome === "downloaded" ? "success" : "info",
                    )
                  }
                />
              </div>
            )}
          </div>
        </section>

        <section className="card animate-rise h-fit" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center justify-between border-b border-lab-line px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-lg border border-lab-line bg-white/[0.03] text-lab-lime">
                <Icon name="sliders" size={14} />
              </span>
              <div>
                <h2 className="text-[13px] font-semibold text-white">Target voice</h2>
                <p className="font-mono text-[9px] tracking-[0.14em] text-lab-faint uppercase">02 / Convert</p>
              </div>
            </div>
            <VoiceAvatar voice={voice} size="xs" />
          </div>
          <div className="space-y-3 p-4">
            <VoicePicker
              voices={allVoices}
              value={selectedVoiceId}
              onChange={setSelectedVoiceId}
              onBrowse={() => onNavigate("voices")}
            />
            {libraryStatus === "idle" && (
              <button
                type="button"
                onClick={() => void loadLibrary()}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-lab-line bg-white/[0.02] px-2 py-1.5 text-[10.5px] text-lab-muted transition-colors hover:border-lab-lime/30 hover:text-lab-lime"
              >
                <Icon name="grid" size={11} /> Sync the full ElevenLabs library
              </button>
            )}
            <div className="rounded-lg border border-lab-line bg-[#0b0c0e] px-3 py-2.5">
              <p className="text-[11px] leading-relaxed text-lab-muted">
                <span className="font-medium text-lab-cream">{voice.name}</span> · {voice.accent} · {voice.category}
              </p>
              <p className="mt-0.5 font-serif text-[11.5px] leading-snug text-lab-faint italic">“{voice.sample}”</p>
            </div>
            <button
              type="button"
              onClick={convert}
              disabled={!source || converting}
              className="btn-lime w-full"
            >
              {converting ? (
                <>
                  <span className="size-3.5 animate-spin rounded-full border-2 border-[#0b0d05]/25 border-t-[#0b0d05]" />
                  Converting {elapsed.toFixed(1)}s
                </>
              ) : (
                <>
                  <Icon name="wand" size={15} />
                  Convert to {voice.name}
                </>
              )}
            </button>
            {!source && (
              <p className="text-center font-mono text-[9px] tracking-wide text-lab-faint uppercase">
                Add a source clip to continue
              </p>
            )}
            {error && (
              <div className="rounded-lg border border-red-500/25 bg-red-500/[0.06] p-2.5">
                <p className="text-[11px] leading-relaxed text-red-200/80">{error}</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {result && (
        <section className="card animate-rise" style={{ animationDelay: "80ms" }}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-lab-line px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-lg border border-lab-lime/25 bg-lab-lime/10 text-lab-lime">
                <Icon name="check" size={14} />
              </span>
              <div>
                <h2 className="text-[13px] font-semibold text-white">Conversion complete</h2>
                <p className="font-mono text-[9px] tracking-[0.14em] text-lab-faint uppercase">
                  A/B the original and the converted take
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const filename = `converted-${resultVoice.name.toLowerCase()}-${slugify(result.sourceName)}.mp3`;
                  void downloadAudio(result.src, filename)
                    .then((outcome) =>
                      toast(
                        outcome === "downloaded"
                          ? `Downloading ${filename}`
                          : "Opened the converted audio in a new tab — use “Save audio as…”.",
                        outcome === "downloaded" ? "success" : "info",
                      ),
                    )
                    .catch(() => toast("That download could not be started. Try again.", "error"));
                }}
                className="btn-ghost !border-lab-lime/30 !py-1.5 text-[11px] !text-lab-lime"
              >
                <Icon name="download" size={12} /> Download MP3
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  toast("Ready for another conversion.", "info");
                }}
                className="btn-ghost !py-1.5 text-[11px]"
              >
                <Icon name="refresh" size={12} /> Convert another
              </button>
            </div>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="chip">Original</span>
                <span className="truncate font-mono text-[9px] text-lab-faint">{result.sourceName}</span>
              </div>
              <AudioPlayer
                src={source?.url ?? ""}
                seed={`original-${result.id}`}
                title="Original recording"
                subtitle="Source audio"
                filename="original.mp3"
                tone="violet"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="chip border-lab-lime/25 bg-lab-lime/[0.06] text-lab-lime/80">Converted</span>
                <span className="truncate font-mono text-[9px] text-lab-faint">
                  {resultVoice.name} · {resultVoice.accent}
                </span>
              </div>
              <AudioPlayer
                src={result.src}
                seed={result.id}
                title={`New voice: ${resultVoice.flag} ${resultVoice.name}`}
                subtitle="Speech-to-speech · multilingual STS v2"
                filename={`converted-${resultVoice.name.toLowerCase()}.mp3`}
                tone="lime"
                autoPlay
                onDownloaded={(outcome) =>
                  toast(
                    outcome === "downloaded"
                      ? "Converted audio download started."
                      : "Opened the converted audio in a new tab — use “Save audio as…”.",
                    outcome === "downloaded" ? "success" : "info",
                  )
                }
              />
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { step: "01", title: "Add a source", body: "Drop in a clip or paste a public URL. Keep it under a minute for best results." },
          { step: "02", title: "Pick a target", body: "Choose any voice from the library. The model keeps the original timing and emotion." },
          { step: "03", title: "A/B and export", body: "Compare both takes side by side, then download the converted audio as MP3." },
        ].map((item) => (
          <div key={item.step} className="rounded-xl border border-lab-line bg-lab-panel/60 p-4">
            <span className="font-mono text-[10px] tracking-[0.16em] text-lab-lime/70">{item.step}</span>
            <h3 className="mt-1.5 text-[12px] font-semibold text-lab-cream">{item.title}</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-lab-faint">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
