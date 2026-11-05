import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { Icon } from "../components/Icon";
import { AudioPlayer, Equalizer, Kbd, SectionLabel, VoiceAvatar, VoicePicker, Waveform } from "../components/ui";
import { useLab } from "../store";
import {
  DEFAULT_VOICE_ID,
  FORMATS,
  MODELS,
  RUSSIAN_VOICES,
  SAMPLES,
  copyText,
  countWords,
  downloadAudio,
  estimateSeconds,
  extensionForFormat,
  formatTime,
  friendlyError,
  generateSpeech,
  relativeTime,
  slugify,
  type SampleLanguage,
} from "../lib/puter";
import type { Page } from "../components/Shell";

interface Result {
  id: string;
  src: string;
  text: string;
  voiceId: string;
  model: string;
  format: string;
  createdAt: number;
}

function SelectField({
  label,
  value,
  onChange,
  children,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between">
        <span className="label-mono">{label}</span>
        {hint && <span className="font-mono text-[9px] text-lab-faint/80">{hint}</span>}
      </span>
      <span className="relative mt-1.5 block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field cursor-pointer appearance-none pr-8"
        >
          {children}
        </select>
        <Icon
          name="chevronDown"
          size={14}
          className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-lab-faint"
        />
      </span>
    </label>
  );
}

function TakeRow({
  take,
  onReuse,
  onRemove,
}: {
  take: ReturnType<typeof useLab>["takes"][number];
  onReuse: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { resolveVoice } = useLab();
  const voice = resolveVoice(take.voiceId, take.voiceName);
  return (
    <div className="rounded-xl border border-lab-line bg-[#0b0c0e] transition-colors hover:border-lab-line2">
      <div className="flex items-center gap-2.5 p-2.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="grid size-8 shrink-0 place-items-center rounded-full bg-white/[0.04] text-lab-muted transition-colors hover:bg-lab-lime hover:text-[#0b0d05]"
          aria-label={open ? "Hide take" : "Play take"}
        >
          <Icon
            name={open ? "chevronDown" : "play"}
            size={12}
            className={open ? "rotate-180" : "ml-0.5"}
          />
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <p className="truncate text-[12px] text-lab-cream/90">{take.text}</p>
          <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[9px] tracking-wide text-lab-faint uppercase">
            <span className="text-lab-muted">
              {voice.flag} {voice.name}
            </span>
            <span className="text-lab-faint/50">·</span>
            {relativeTime(take.createdAt)}
          </p>
        </button>
        <button
          type="button"
          onClick={onReuse}
          className="hidden text-lab-faint transition-colors hover:text-lab-lime sm:block"
          aria-label="Load take into studio"
          title="Load into studio"
        >
          <Icon name="refresh" size={14} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-lab-faint transition-colors hover:text-red-400"
          aria-label="Delete take"
        >
          <Icon name="trash" size={14} />
        </button>
      </div>
      {open && (
        <div className="px-2.5 pb-2.5">
          <AudioPlayer
            compact
            src={take.src}
            seed={take.id}
            filename={`${slugify(take.text)}-${voice.name.toLowerCase()}.${extensionForFormat(take.format)}`}
            tone="lime"
          />
        </div>
      )}
    </div>
  );
}

export function Studio({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const {
    selectedVoiceId,
    setSelectedVoiceId,
    takes,
    addTake,
    removeTake,
    toast,
    puterReady,
    studioSeed,
    clearStudioSeed,
    newTakeSignal,
    allVoices,
    resolveVoice,
    libraryStatus,
    loadLibrary,
  } = useLab();
  const [text, setText] = useState(() => {
    try {
      const saved = window.sessionStorage.getItem("voxel:draft:text");
      return saved !== null ? saved : SAMPLES.English[0];
    } catch {
      return SAMPLES.English[0];
    }
  });
  const [model, setModel] = useState(() => {
    try {
      const saved = window.sessionStorage.getItem("voxel:draft:model");
      return saved && MODELS.some((m) => m.id === saved) ? saved : MODELS[0].id;
    } catch {
      return MODELS[0].id;
    }
  });
  const [format, setFormat] = useState(() => {
    try {
      const saved = window.sessionStorage.getItem("voxel:draft:format");
      return saved && FORMATS.some((f) => f.id === saved) ? saved : FORMATS[0].id;
    } catch {
      return FORMATS[0].id;
    }
  });
  const [generating, setGenerating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [scriptLang, setScriptLang] = useState<SampleLanguage>("English");
  const [sampleIndex, setSampleIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);

  const voice = resolveVoice(selectedVoiceId);
  const words = countWords(text);
  const seconds = estimateSeconds(text);
  const overLimit = text.length > 3000;
  const canGenerate = text.trim().length > 0 && !overLimit && !generating;

  useEffect(() => {
    if (!generating) return;
    const started = Date.now();
    setElapsed(0);
    const interval = window.setInterval(() => setElapsed((Date.now() - started) / 1000), 100);
    return () => window.clearInterval(interval);
  }, [generating]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem("voxel:draft:text", text);
      window.sessionStorage.setItem("voxel:draft:model", model);
      window.sessionStorage.setItem("voxel:draft:format", format);
    } catch {
      /* storage may be unavailable — the studio still works */
    }
  }, [text, model, format]);

  useEffect(() => {
    if (!studioSeed) return;
    setText(studioSeed.text);
    setSelectedVoiceId(studioSeed.voiceId);
    setModel(studioSeed.model);
    setFormat(studioSeed.format);
    setResult({
      id: studioSeed.id,
      src: studioSeed.src,
      text: studioSeed.text,
      voiceId: studioSeed.voiceId,
      model: studioSeed.model,
      format: studioSeed.format,
      createdAt: studioSeed.createdAt,
    });
    setError(null);
    clearStudioSeed();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [studioSeed, setSelectedVoiceId, clearStudioSeed]);

  useEffect(() => {
    if (newTakeSignal === 0) return;
    setText("");
    setResult(null);
    setError(null);
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [newTakeSignal]);

  const runGeneration = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    setError(null);
    try {
      const response = await generateSpeech({ text, voice: selectedVoiceId, model, format });
      const created: Result = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        src: response.src,
        text: text.trim(),
        voiceId: selectedVoiceId,
        model,
        format,
        createdAt: Date.now(),
      };
      setResult(created);
      addTake({
        text: created.text,
        voiceId: created.voiceId,
        voiceName: voice.name,
        model: created.model,
        format: created.format,
        src: created.src,
      });
      toast(`Take generated with ${voice.name}. Press play to listen.`);
      if (window.innerWidth < 1280) {
        window.setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
      }
    } catch (err) {
      const message = friendlyError(err);
      setError(message);
      toast(message, "error");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void runGeneration();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const reuse = (take: (typeof takes)[number]) => {
    setText(take.text);
    setSelectedVoiceId(take.voiceId);
    setModel(take.model);
    setFormat(take.format);
    setResult({
      id: take.id,
      src: take.src,
      text: take.text,
      voiceId: take.voiceId,
      model: take.model,
      format: take.format,
      createdAt: take.createdAt,
    });
    setError(null);
    toast("Take loaded into the studio.", "info");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const newTake = () => {
    setText("");
    setResult(null);
    setError(null);
    textareaRef.current?.focus();
  };

  const nextSample = () => {
    const list = SAMPLES[scriptLang];
    const next = (sampleIndex + 1) % list.length;
    setSampleIndex(next);
    setText(list[next]);
  };

  const loadLanguageSample = (lang: SampleLanguage) => {
    setScriptLang(lang);
    setSampleIndex(0);
    setText(SAMPLES[lang][0]);
    setResult(null);
    setError(null);
    const current = resolveVoice(selectedVoiceId);
    if (lang === "Russian" && current.language !== "Russian") {
      setSelectedVoiceId(RUSSIAN_VOICES[0].id);
      toast(`Switched to ${RUSSIAN_VOICES[0].name} for a native Russian read.`, "info");
    }
    if (lang === "English" && current.language !== "English") {
      setSelectedVoiceId(DEFAULT_VOICE_ID);
    }
  };

  const modelMeta = useMemo(() => MODELS.find((m) => m.id === model) ?? MODELS[0], [model]);
  const formatMeta = useMemo(() => FORMATS.find((f) => f.id === format) ?? FORMATS[0], [format]);
  const resultVoice = result ? resolveVoice(result.voiceId) : voice;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="animate-rise relative overflow-hidden rounded-2xl border border-lab-line bg-lab-panel px-5 py-6 sm:px-7 sm:py-7">
        <div className="grid-fade pointer-events-none absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-lab-lime/[0.06] blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-lab-lime/60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-lab-lime" />
              </span>
              <span className="font-mono text-[10px] tracking-[0.18em] text-lab-lime/80 uppercase">
                Text to speech · ElevenLabs
              </span>
            </div>
            <h1 className="mt-3 font-display text-[34px] leading-[1.04] font-semibold tracking-[-0.035em] text-white sm:text-[44px]">
              Give your words{" "}
              <span className="font-serif font-normal italic tracking-normal text-lab-lime">a voice.</span>
            </h1>
            <p className="mt-2.5 max-w-xl text-[13px] leading-relaxed text-lab-muted sm:text-sm">
              Studio-grade AI voices, generated right in your browser. Write a script, choose a voice, and press
              generate — no API keys, no backend, no setup.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: String(allVoices.length), label: "voices" },
              { value: String(MODELS.length), label: "models" },
              { value: "0", label: "API keys" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex min-w-[86px] flex-col rounded-xl border border-lab-line bg-[#0b0c0e]/80 px-3 py-2"
              >
                <span className="font-display text-lg leading-none font-semibold text-white">{stat.value}</span>
                <span className="mt-1 font-mono text-[9px] tracking-[0.14em] text-lab-faint uppercase">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* Left: composer */}
        <section className="card animate-rise overflow-visible" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center justify-between border-b border-lab-line px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-lg border border-lab-line bg-white/[0.03] text-lab-lime">
                <Icon name="text" size={14} />
              </span>
              <div>
                <h2 className="text-[13px] font-semibold text-white">Script</h2>
                <p className="font-mono text-[9px] tracking-[0.14em] text-lab-faint uppercase">01 / Write</p>
              </div>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] text-lab-faint">
              <span className={cn(overLimit && "text-red-400")}>
                {text.length.toLocaleString()} / 3,000
              </span>
              <span className="hidden items-center gap-1 sm:flex">
                <Icon name="clock" size={11} /> ~{formatTime(seconds)}
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="rounded-xl border border-lab-line bg-[#0b0c0e] transition-colors focus-within:border-lab-lime/40">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste your script here. Punctuation and paragraph breaks shape the delivery…"
                rows={8}
                spellCheck
                className="scroll-slim block min-h-[190px] w-full resize-y bg-transparent px-4 py-3.5 text-[14px] leading-7 text-lab-cream placeholder:text-lab-faint/70 focus:outline-none sm:min-h-[210px] sm:text-[15px]"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-lab-line/70 px-3 py-2">
                <div className="flex items-center gap-2 font-mono text-[10px] text-lab-faint">
                  <span>{words} words</span>
                  <span className="text-lab-faint/40">·</span>
                  <span>~{formatTime(seconds)} runtime</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="mr-1 flex items-center gap-0.5 rounded-md border border-lab-line bg-white/[0.02] p-0.5">
                    {(["English", "Russian"] as SampleLanguage[]).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => loadLanguageSample(lang)}
                        title={`Load a ${lang} sample script`}
                        className={cn(
                          "rounded px-1.5 py-0.5 font-mono text-[9px] tracking-wide uppercase transition-colors",
                          scriptLang === lang
                            ? "bg-lab-lime text-[#0b0d05]"
                            : "text-lab-faint hover:bg-white/[0.05] hover:text-lab-cream",
                        )}
                      >
                        {lang === "English" ? "EN" : "РУ"}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={nextSample}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-lab-muted transition-colors hover:bg-white/[0.04] hover:text-white"
                  >
                    <Icon name="sparkles" size={12} className="text-lab-lime/80" />
                    Surprise me
                  </button>
                  <button
                    type="button"
                    onClick={() => setText("")}
                    disabled={!text}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-lab-muted transition-colors hover:bg-white/[0.04] hover:text-white disabled:opacity-40"
                  >
                    <Icon name="close" size={12} />
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <SectionLabel>Voice</SectionLabel>
                  <button
                    type="button"
                    onClick={() => onNavigate("voices")}
                    className="inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.12em] text-lab-faint uppercase transition-colors hover:text-lab-lime"
                  >
                    All voices <Icon name="arrowUpRight" size={11} />
                  </button>
                </div>
                <VoicePicker
                  voices={allVoices}
                  value={selectedVoiceId}
                  onChange={setSelectedVoiceId}
                  onBrowse={() => onNavigate("voices")}
                />
                <p className="mt-1.5 flex items-start gap-1.5 text-[10px] leading-relaxed text-lab-faint">
                  <Icon name="globe" size={11} className="mt-0.5 shrink-0 text-lab-lime/70" />
                  {voice.language === "Russian" ? (
                    <span>
                      {voice.name} speaks native Russian {voice.flag} — Russian text works with every multilingual
                      model.
                    </span>
                  ) : (
                    <span>
                      {allVoices.length} voices, English &amp; Russian. Every model is multilingual — choose a 🇷🇺
                      voice for a native Russian accent.{" "}
                      {libraryStatus !== "ready" && libraryStatus !== "loading" && (
                        <button
                          type="button"
                          onClick={() => void loadLibrary()}
                          className="text-lab-lime/90 underline decoration-lab-lime/30 underline-offset-2 hover:text-lab-lime"
                        >
                          Sync full library
                        </button>
                      )}
                    </span>
                  )}
                </p>
              </div>
              <SelectField label="Model" value={model} onChange={setModel} hint={modelMeta.latency}>
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.blurb}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Output format" value={format} onChange={setFormat} hint={formatMeta.detail}>
                {FORMATS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-lab-line bg-[#0c0d0f] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            {overLimit ? (
              <p className="flex items-center gap-1.5 text-[11px] text-red-400">
                <Icon name="info" size={12} />
                Over the 3,000-character limit — trim {(text.length - 3000).toLocaleString()} characters to generate.
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-[11px] text-lab-faint">
                <Icon name="lock" size={12} className="text-lab-lime/70" />
                Free with your Puter account. No keys stored.
              </p>
            )}
            <div className="flex items-center gap-2.5">
              <span className="hidden items-center gap-1.5 sm:flex">
                <Kbd>⌘</Kbd>
                <Kbd>↵</Kbd>
              </span>
              <button
                type="button"
                onClick={runGeneration}
                disabled={!canGenerate}
                className="btn-lime min-w-[168px] flex-1 sm:flex-none"
              >
                {generating ? (
                  <>
                    <span className="size-3.5 animate-spin rounded-full border-2 border-[#0b0d05]/25 border-t-[#0b0d05]" />
                    Generating {elapsed.toFixed(1)}s
                  </>
                ) : (
                  <>
                    <Icon name="sparkles" size={15} />
                    Generate speech
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Right: output */}
        <div className="space-y-4">
          <section
            ref={outputRef}
            className="card animate-rise scroll-mt-24"
            style={{ animationDelay: "120ms" }}
          >
            <div className="flex items-center justify-between border-b border-lab-line px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-7 place-items-center rounded-lg border border-lab-line bg-white/[0.03] text-lab-lime">
                  <Icon name="headphones" size={14} />
                </span>
                <div>
                  <h2 className="text-[13px] font-semibold text-white">Output</h2>
                  <p className="font-mono text-[9px] tracking-[0.14em] text-lab-faint uppercase">02 / Listen</p>
                </div>
              </div>
              <span className="chip border-lab-lime/20 bg-lab-lime/[0.06] text-lab-lime/80">
                {formatMeta.name.split(" · ")[0]}
              </span>
            </div>

            <div className="p-4">
              {generating && (
                <div className="rounded-xl border border-lab-line bg-[#0b0c0e] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <VoiceAvatar voice={voice} size="sm" />
                      <div>
                        <p className="text-[12px] font-medium text-lab-cream">Synthesizing with {voice.name}</p>
                        <p className="font-mono text-[9px] tracking-wide text-lab-faint uppercase">
                          {modelMeta.name} · {elapsed.toFixed(1)}s elapsed
                        </p>
                      </div>
                    </div>
                    <Equalizer className="text-lab-lime" />
                  </div>
                  <div className="relative mt-4 h-12 overflow-hidden rounded-lg bg-white/[0.03]">
                    <div className="absolute inset-0 flex items-center gap-[3px] px-2 opacity-40">
                      {Array.from({ length: 40 }).map((_, i) => (
                        <span
                          key={i}
                          className="eq-bar flex-1 rounded-full bg-lab-lime/70"
                          style={{
                            height: `${20 + Math.abs(Math.sin(i * 1.3)) * 70}%`,
                            animationDelay: `${(i % 7) * 0.08}s`,
                          }}
                        />
                      ))}
                    </div>
                    <div className="animate-sweep absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-lab-faint">
                    {puterReady
                      ? "Generating audio on Puter. If a sign-in window appears, approve it to continue — it's free."
                      : "Warming up Puter.js… this only happens on your first generation."}
                  </p>
                </div>
              )}

              {!generating && error && (
                <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] p-4">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-red-500/15 text-red-400">
                      <Icon name="info" size={13} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-red-200">Generation failed</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-red-200/70">{error}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={runGeneration} className="btn-ghost !py-1.5 text-[11px]">
                      <Icon name="refresh" size={12} /> Try again
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate("docs")}
                      className="btn-ghost !py-1.5 text-[11px]"
                    >
                      <Icon name="book" size={12} /> Troubleshoot
                    </button>
                  </div>
                </div>
              )}

              {!generating && !error && result && (
                <div className="animate-rise space-y-3">
                  <AudioPlayer
                    src={result.src}
                    seed={result.id}
                    title={`${resultVoice.name} — new take`}
                    subtitle={`${MODELS.find((m) => m.id === result.model)?.name ?? result.model} · ${FORMATS.find((f) => f.id === result.format)?.name ?? result.format}`}
                    filename={`${slugify(result.text)}-${resultVoice.name.toLowerCase()}.${extensionForFormat(result.format)}`}
                    tone="lime"
                    autoPlay
                    onDownloaded={(outcome) =>
                      toast(
                        outcome === "downloaded"
                          ? "Download started — check your downloads folder."
                          : "Opened in a new tab. Use “Save audio as…” to keep it.",
                        outcome === "downloaded" ? "success" : "info",
                      )
                    }
                  />
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Words", value: String(countWords(result.text)) },
                      { label: "Runtime", value: `~${formatTime(estimateSeconds(result.text))}` },
                      { label: "Voice", value: `${resultVoice.flag} ${resultVoice.name}` },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-lg border border-lab-line bg-[#0b0c0e] px-2.5 py-2">
                        <p className="font-mono text-[8px] tracking-[0.14em] text-lab-faint uppercase">{stat.label}</p>
                        <p className="mt-0.5 truncate text-[12px] font-medium text-lab-cream">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        void copyText(result.text).then((ok) =>
                          toast(ok ? "Script copied to clipboard." : "Could not copy the script.", ok ? "success" : "error"),
                        );
                      }}
                      className="btn-ghost flex-1 !py-2 text-[11px]"
                    >
                      <Icon name="copy" size={12} /> Copy script
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const filename = `${slugify(result.text)}-${resultVoice.name.toLowerCase()}.${extensionForFormat(result.format)}`;
                        void downloadAudio(result.src, filename)
                          .then((outcome) =>
                            toast(
                              outcome === "downloaded"
                                ? `Downloading ${filename}`
                                : "Opened the audio in a new tab — use “Save audio as…” there.",
                              outcome === "downloaded" ? "success" : "info",
                            ),
                          )
                          .catch(() => toast("That download could not be started. Try the download icon in the player.", "error"));
                      }}
                      className="btn-ghost flex-1 !border-lab-lime/30 !py-2 text-[11px] !text-lab-lime"
                    >
                      <Icon name="download" size={12} /> Download{" "}
                      {extensionForFormat(result.format).toUpperCase()}
                    </button>
                    <button
                      type="button"
                      onClick={newTake}
                      className="icon-btn !size-8"
                      aria-label="Start a new take"
                      title="New take"
                    >
                      <Icon name="plus" size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-lab-line bg-white/[0.015] px-3 py-2">
                    <p className="flex min-w-0 items-center gap-2 text-[11px] text-lab-faint">
                      <VoiceAvatar voice={resultVoice} size="xs" />
                      <span className="truncate">
                        Saved to <span className="text-lab-cream/80">History</span> · {relativeTime(result.createdAt)}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => onNavigate("history")}
                      className="shrink-0 font-mono text-[9px] tracking-wide text-lab-lime/80 uppercase hover:text-lab-lime"
                    >
                      View
                    </button>
                  </div>
                </div>
              )}

              {!generating && !error && !result && (
                <div className="rounded-xl border border-dashed border-lab-line2 bg-[#0b0c0e]/60 px-4 py-6 text-center">
                  <div className="mx-auto flex h-14 w-full max-w-[220px] items-center opacity-40">
                    <Waveform seed="empty-output" progress={0.32} bars={40} tone="lime" />
                  </div>
                  <p className="mt-3 font-display text-[15px] font-medium text-lab-cream">Your take will appear here</p>
                  <p className="mx-auto mt-1 max-w-[240px] text-[11px] leading-relaxed text-lab-faint">
                    Write a script, pick a voice, then generate. Audio lands here with a waveform, download and
                    history.
                  </p>
                  <div className="mx-auto mt-4 flex max-w-[230px] flex-col gap-1.5 text-left">
                    {[
                      "Write or paste your script",
                      "Choose a voice and model",
                      "Generate, then press play",
                    ].map((step, i) => (
                      <div key={step} className="flex items-center gap-2 text-[11px] text-lab-muted">
                        <span className="grid size-4 shrink-0 place-items-center rounded-full border border-lab-line2 font-mono text-[8px] text-lab-faint">
                          {i + 1}
                        </span>
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="card animate-rise" style={{ animationDelay: "180ms" }}>
            <div className="flex items-center justify-between border-b border-lab-line px-4 py-3">
              <div className="flex items-center gap-2">
                <Icon name="history" size={14} className="text-lab-faint" />
                <h2 className="text-[12px] font-semibold text-white">Recent takes</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("history")}
                className="font-mono text-[9px] tracking-[0.12em] text-lab-faint uppercase transition-colors hover:text-lab-lime"
              >
                View all
              </button>
            </div>
            <div className="space-y-2 p-3">
              {takes.length === 0 && (
                <p className="px-1 py-3 text-center text-[11px] text-lab-faint">
                  No takes yet. Your generated audio will collect here.
                </p>
              )}
              {takes.slice(0, 3).map((take) => (
                <TakeRow
                  key={take.id}
                  take={take}
                  onReuse={() => reuse(take)}
                  onRemove={() => removeTake(take.id)}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Bottom strip */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: "zap" as const,
            title: "Instant, keyless synthesis",
            body: "Puter.js handles the ElevenLabs request in the browser. No server, no keys, no config.",
          },
          {
            icon: "sliders" as const,
            title: "Direct the delivery",
            body: "Switch between four models and seven output formats. Punctuation is your direction.",
          },
          {
            icon: "headphones" as const,
            title: "Takes that stay with you",
            body: "Every generation is saved to your session history for instant A/B listening.",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border border-lab-line bg-lab-panel/60 p-4">
            <span className="grid size-8 place-items-center rounded-lg border border-lab-line bg-white/[0.03] text-lab-lime">
              <Icon name={item.icon} size={15} />
            </span>
            <h3 className="mt-2.5 text-[12px] font-semibold text-lab-cream">{item.title}</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-lab-faint">{item.body}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-lab-lime/15 bg-lab-lime/[0.035] px-4 py-3 sm:flex-row sm:items-center">
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-lab-muted">
          <Icon name="info" size={14} className="mt-0.5 shrink-0 text-lab-lime/80" />
          <span>
            <span className="font-medium text-lab-cream">First generation?</span> Puter may open a free sign-in
            window. Each user covers their own usage under the user-pays model.
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => onNavigate("changer")} className="btn-ghost !py-1.5 text-[11px]">
            <Icon name="sliders" size={12} /> Voice changer
          </button>
          <button type="button" onClick={() => onNavigate("docs")} className="btn-ghost !py-1.5 text-[11px]">
            <Icon name="book" size={12} /> Read the guide
          </button>
        </div>
      </div>
    </div>
  );
}
