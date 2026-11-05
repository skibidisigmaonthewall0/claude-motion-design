import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { Icon } from "./Icon";
import {
  VOICE_LANGUAGES,
  downloadAudio,
  formatTime,
  seededBars,
  type Voice,
  type VoiceLanguage,
} from "../lib/puter";

/* ------------------------------------------------------------------ */
/* Voice avatar                                                        */
/* ------------------------------------------------------------------ */

const AVATAR_SIZES = {
  xs: "size-7 text-[9px]",
  sm: "size-9 text-[10px]",
  md: "size-11 text-[11px]",
  lg: "size-14 text-sm",
  xl: "size-20 text-lg",
} as const;

export function VoiceAvatar({
  voice,
  size = "md",
  className,
}: {
  voice: Voice;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-display font-semibold tracking-wide text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_6px_16px_-8px_rgba(0,0,0,0.8)]",
        voice.gradient,
        AVATAR_SIZES[size],
        className,
      )}
      aria-hidden="true"
    >
      <span className="absolute inset-0 rounded-full ring-1 ring-white/20 ring-inset" />
      <span className="relative drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">{voice.initials}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Equalizer                                                           */
/* ------------------------------------------------------------------ */

export function Equalizer({ active = true, className }: { active?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex h-3.5 items-center gap-[2px]", className)} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn("w-[2px] rounded-full bg-current", active ? "eq-bar h-full" : "h-1/3 opacity-50")}
          style={active ? { animationDelay: `${i * 0.13}s`, animationDuration: `${0.7 + i * 0.08}s` } : undefined}
        />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Waveform                                                            */
/* ------------------------------------------------------------------ */

interface WaveformProps {
  seed: string;
  progress?: number;
  playing?: boolean;
  bars?: number;
  className?: string;
  onSeek?: (ratio: number) => void;
  tone?: "lime" | "violet";
  label?: string;
}

export function Waveform({
  seed,
  progress = 0,
  playing = false,
  bars = 72,
  className,
  onSeek,
  tone = "lime",
  label = "Seek audio",
}: WaveformProps) {
  const heights = useMemo(() => seededBars(seed, bars), [seed, bars]);
  const clamped = Math.min(1, Math.max(0, progress));
  const activeIndex = Math.round(clamped * (bars - 1));

  return (
    <div
      role={onSeek ? "slider" : undefined}
      aria-label={onSeek ? label : undefined}
      aria-valuemin={onSeek ? 0 : undefined}
      aria-valuemax={onSeek ? 100 : undefined}
      aria-valuenow={onSeek ? Math.round(clamped * 100) : undefined}
      tabIndex={onSeek ? 0 : undefined}
      onClick={(event) => {
        if (!onSeek) return;
        const rect = event.currentTarget.getBoundingClientRect();
        onSeek(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)));
      }}
      onKeyDown={(event) => {
        if (!onSeek) return;
        if (event.key === "ArrowRight") onSeek(Math.min(1, clamped + 0.05));
        if (event.key === "ArrowLeft") onSeek(Math.max(0, clamped - 0.05));
      }}
      className={cn(
        "group relative flex h-full w-full items-center gap-[1px] sm:gap-[2px]",
        onSeek && "cursor-pointer",
        className,
      )}
    >
      {heights.map((h, i) => {
        const played = i <= activeIndex;
        const near = playing && Math.abs(i - activeIndex) <= 2;
        return (
          <span
            key={i}
            className={cn(
              "min-w-0 flex-1 rounded-full transition-colors duration-150",
              played
                ? tone === "lime"
                  ? "bg-lab-lime"
                  : "bg-violet-400"
                : "bg-white/[0.14] group-hover:bg-white/20",
              near && "eq-bar",
            )}
            style={{
              height: `${Math.round(h * 100)}%`,
              animationDelay: near ? `${(i % 3) * 0.1}s` : undefined,
            }}
          />
        );
      })}
      {clamped > 0 && (
        <span
          className="pointer-events-none absolute inset-y-0 w-px bg-white/50"
          style={{ left: `${clamped * 100}%` }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Audio player                                                        */
/* ------------------------------------------------------------------ */

interface AudioPlayerProps {
  src: string;
  seed: string;
  title?: string;
  subtitle?: string;
  filename?: string;
  tone?: "lime" | "violet";
  autoPlay?: boolean;
  compact?: boolean;
  className?: string;
  onDownloaded?: (result: "downloaded" | "opened") => void;
}

export function AudioPlayer({
  src,
  seed,
  title,
  subtitle,
  filename = "voxel-take.mp3",
  tone = "lime",
  autoPlay = false,
  compact = false,
  className,
  onDownloaded,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloadState, setDownloadState] = useState<"idle" | "busy" | "done">("idle");

  const handleDownload = async () => {
    if (downloadState === "busy") return;
    setDownloadState("busy");
    try {
      const result = await downloadAudio(src, filename);
      setDownloadState("done");
      onDownloaded?.(result);
    } catch {
      setDownloadState("idle");
    } finally {
      window.setTimeout(() => setDownloadState("idle"), 2200);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setFailed(false);
    setLoading(true);
    audio.load();
    if (autoPlay) {
      const play = () => {
        audio
          .play()
          .then(() => setPlaying(true))
          .catch(() => setPlaying(false));
      };
      if (audio.readyState >= 2) play();
      else audio.addEventListener("canplay", play, { once: true });
      return () => audio.removeEventListener("canplay", play);
    }
  }, [src, autoPlay]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
      audio.muted = muted;
    }
  }, [volume, muted]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setFailed(true));
  };

  const seek = (ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = ratio * duration;
    setCurrent(ratio * duration);
  };

  const progress = duration > 0 ? current / duration : 0;

  return (
    <div className={cn("rounded-xl border border-lab-line bg-[#0b0c0e]", compact ? "p-3" : "p-4", className)}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          setDuration(Number.isFinite(d) ? d : 0);
          setLoading(false);
        }}
        onDurationChange={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d)) setDuration(d);
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onError={() => {
          setFailed(true);
          setLoading(false);
        }}
        onCanPlay={() => setLoading(false)}
      />

      {(title || subtitle) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <p className="truncate text-[13px] font-medium text-lab-cream">{title}</p>}
            {subtitle && <p className="mt-0.5 truncate font-mono text-[10px] tracking-wide text-lab-faint uppercase">{subtitle}</p>}
          </div>
          <span className="chip shrink-0 border-lab-lime/20 bg-lab-lime/[0.06] text-lab-lime/80">
            <span className="size-1 rounded-full bg-lab-lime" />
            {failed ? "error" : loading ? "loading" : "ready"}
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={failed}
          aria-label={playing ? "Pause" : "Play"}
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-full transition-all active:scale-95 disabled:opacity-40",
            tone === "lime"
              ? "bg-lab-lime text-[#0b0d05] hover:bg-[#e4ff7a] shadow-[0_8px_24px_-10px_rgba(216,255,79,0.7)]"
              : "bg-violet-400 text-[#140a24] hover:bg-violet-300",
          )}
        >
          <Icon name={playing ? "pause" : "play"} size={17} className={playing ? "" : "ml-0.5"} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="h-9">
            <Waveform seed={seed} progress={progress} playing={playing} onSeek={seek} tone={tone} bars={compact ? 32 : 48} />
          </div>
          <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-lab-faint">
            <span className="text-lab-cream/70">{formatTime(current)}</span>
            <span>{duration ? formatTime(duration) : "--:--"}</span>
          </div>
        </div>

        {!compact && (
          <div className="hidden items-center gap-1.5 sm:flex">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="text-lab-faint transition-colors hover:text-white"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              <Icon name={muted || volume === 0 ? "volumeOff" : "volume"} size={15} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                setMuted(false);
              }}
              aria-label="Volume"
              className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/15"
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleDownload()}
          className={cn("icon-btn", downloadState === "done" && "!border-lab-lime/40 !text-lab-lime")}
          aria-label="Download audio"
          title="Download audio file"
          disabled={downloadState === "busy"}
        >
          <Icon
            name={downloadState === "done" ? "check" : downloadState === "busy" ? "refresh" : "download"}
            size={15}
            className={downloadState === "busy" ? "animate-spin" : undefined}
          />
        </button>
      </div>

      {failed && (
        <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-red-400/90">
          <Icon name="info" size={12} /> Audio preview unavailable. Try downloading the file instead.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Voice picker                                                        */
/* ------------------------------------------------------------------ */

export function VoicePicker({
  voices,
  value,
  onChange,
  onBrowse,
  className,
}: {
  voices: Voice[];
  value: string;
  onChange: (id: string) => void;
  onBrowse?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [lang, setLang] = useState<"All" | VoiceLanguage>("All");
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const selected = voices.find((v) => v.id === value) ?? voices[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return voices.filter((v) => {
      const matchesLang = lang === "All" || v.language === lang;
      const matchesQuery =
        !q ||
        [v.name, v.accent, v.category, v.gender, v.description, v.language]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return matchesLang && matchesQuery;
    });
  }, [query, voices, lang]);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border bg-[#0b0c0e] px-3 py-2.5 text-left transition-colors",
          open ? "border-lab-lime/50" : "border-lab-line hover:border-lab-line2",
        )}
      >
        <VoiceAvatar voice={selected} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="text-[11px] leading-none">{selected.flag}</span>
            <span className="truncate text-[13px] font-medium text-lab-cream">{selected.name}</span>
            <span className="font-mono text-[9px] tracking-wider text-lab-faint uppercase">{selected.accent}</span>
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-lab-muted">
            {selected.category} · {selected.age}
          </span>
        </span>
        <Icon
          name="chevronDown"
          size={15}
          className={cn("shrink-0 text-lab-faint transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="animate-rise absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border border-lab-line2 bg-lab-panel2 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]">
          <div className="border-b border-lab-line p-2.5">
            <div className="relative">
              <Icon name="search" size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-lab-faint" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search voices, accents, styles…"
                className="w-full rounded-lg border border-lab-line bg-[#0b0c0e] py-2 pr-2.5 pl-8 text-[12px] text-lab-cream placeholder:text-lab-faint focus:border-lab-lime/50 focus:outline-none"
              />
            </div>
            <div className="mt-2 flex items-center gap-1 rounded-md border border-lab-line bg-[#0b0c0e] p-0.5">
              {(["All", ...VOICE_LANGUAGES] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLang(item)}
                  className={cn(
                    "flex-1 rounded px-1.5 py-1 font-mono text-[9px] tracking-wide uppercase transition-colors",
                    lang === item
                      ? "bg-lab-lime text-[#0b0d05]"
                      : "text-lab-faint hover:bg-white/[0.04] hover:text-lab-cream",
                  )}
                >
                  {item === "All" ? "All" : item === "Russian" ? "🇷🇺 Рус" : "🇺🇸 EN"}
                </button>
              ))}
            </div>
          </div>
          <div className="scroll-slim max-h-72 overflow-y-auto p-1.5">
            {filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-[12px] text-lab-faint">No voices match “{query}”.</p>
            )}
            {filtered.slice(0, 150).map((voice) => {
              const active = voice.id === selected.id;
              return (
                <button
                  key={voice.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(voice.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors",
                    active ? "bg-lab-lime/[0.08]" : "hover:bg-white/[0.04]",
                  )}
                >
                  <VoiceAvatar voice={voice} size="xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium text-lab-cream">
                      <span className="mr-1 text-[10px]">{voice.flag}</span>
                      {voice.name}
                    </span>
                    <span className="block truncate font-mono text-[9px] tracking-wide text-lab-faint uppercase">
                      {voice.accent} · {voice.category}
                    </span>
                  </span>
                  {active && <Icon name="check" size={13} className="shrink-0 text-lab-lime" />}
                </button>
              );
            })}
            {filtered.length > 150 && (
              <p className="px-3 py-2 text-center font-mono text-[9px] tracking-wide text-lab-faint uppercase">
                Showing 150 of {filtered.length} — search or use the voice library
              </p>
            )}
          </div>
          {onBrowse && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onBrowse();
              }}
              className="flex w-full items-center justify-between border-t border-lab-line px-3 py-2.5 text-[11px] font-medium text-lab-muted transition-colors hover:bg-white/[0.03] hover:text-white"
            >
              Browse the full voice library
              <Icon name="arrowRight" size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("label-mono", className)}>{children}</p>;
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-lab-line2 bg-white/[0.04] px-1.5 font-mono text-[10px] text-lab-muted">
      {children}
    </kbd>
  );
}
