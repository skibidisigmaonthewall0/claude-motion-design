import { useMemo, useState } from "react";
import { cn } from "../utils/cn";
import { Icon } from "../components/Icon";
import { AudioPlayer, VoiceAvatar } from "../components/ui";
import { useLab, type Take } from "../store";
import {
  MODELS,
  copyText,
  countWords,
  downloadAudio,
  extensionForFormat,
  relativeTime,
  slugify,
} from "../lib/puter";
import type { Page } from "../components/Shell";

function TakeCard({
  take,
  index,
  onReuse,
  onRemove,
  onCopy,
  onDownload,
}: {
  take: Take;
  index: number;
  onReuse: () => void;
  onRemove: () => void;
  onCopy: () => void;
  onDownload: () => void;
}) {
  const [open, setOpen] = useState(index === 0);
  const { resolveVoice } = useLab();
  const voice = resolveVoice(take.voiceId, take.voiceName);
  const model = MODELS.find((m) => m.id === take.model);

  return (
    <article className="animate-rise card overflow-hidden" style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
      <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-full transition-all active:scale-95",
              open
                ? "bg-lab-lime text-[#0b0d05]"
                : "border border-lab-line2 bg-white/[0.04] text-lab-cream hover:border-lab-lime/50 hover:text-lab-lime",
            )}
            aria-label={open ? "Hide audio player" : "Show audio player"}
          >
            <Icon
              name={open ? "chevronDown" : "play"}
              size={14}
              className={open ? "rotate-180" : "ml-0.5"}
            />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] text-lab-cream/90">{take.text}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] tracking-wide text-lab-faint uppercase">
              <span className="inline-flex items-center gap-1 text-lab-muted">
                <VoiceAvatar voice={voice} size="xs" className="!size-4 !text-[7px]" />
                <span>{voice.flag}</span>
                {voice.name}
              </span>
              <span className="text-lab-faint/40">·</span>
              <span>{model?.name ?? take.model}</span>
              <span className="text-lab-faint/40">·</span>
              <span>{countWords(take.text)} words</span>
              <span className="text-lab-faint/40">·</span>
              <span>{relativeTime(take.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-auto">
          <button type="button" onClick={onReuse} className="btn-ghost !px-2.5 !py-1.5 text-[11px]" title="Load into studio">
            <Icon name="refresh" size={12} />
            <span className="hidden sm:inline">Reuse</span>
          </button>
          <button type="button" onClick={onCopy} className="icon-btn !size-8" title="Copy script" aria-label="Copy script">
            <Icon name="copy" size={13} />
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="icon-btn !size-8"
            title="Download audio"
            aria-label="Download audio"
          >
            <Icon name="download" size={13} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="icon-btn !size-8 hover:!border-red-500/40 hover:!text-red-400"
            title="Delete take"
            aria-label="Delete take"
          >
            <Icon name="trash" size={13} />
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-lab-line bg-[#0c0d0f] p-3">
          <AudioPlayer
            src={take.src}
            seed={take.id}
            title={`${voice.name} — ${new Date(take.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            subtitle={`${model?.name ?? take.model} · ${take.format.replace(/_/g, " ")}`}
            filename={`${slugify(take.text)}-${voice.name.toLowerCase()}.${extensionForFormat(take.format)}`}
            tone="lime"
          />
        </div>
      )}
    </article>
  );
}

export function History({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { takes, removeTake, clearTakes, toast, loadTake } = useLab();
  const [query, setQuery] = useState("");
  const [confirming, setConfirming] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return takes;
    return takes.filter((take) =>
      [take.text, take.voiceName, take.model].join(" ").toLowerCase().includes(q),
    );
  }, [takes, query]);

  const totalWords = useMemo(() => takes.reduce((sum, take) => sum + countWords(take.text), 0), [takes]);
  const uniqueVoices = useMemo(() => new Set(takes.map((t) => t.voiceId)).size, [takes]);

  const reuse = (take: Take) => {
    loadTake(take);
    onNavigate("studio");
    toast(`Take loaded into the studio with ${take.voiceName}.`, "info");
  };

  return (
    <div className="space-y-5">
      <section className="animate-rise flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-lab-lime" />
            <span className="font-mono text-[10px] tracking-[0.18em] text-lab-lime/80 uppercase">
              Session history · {takes.length} takes
            </span>
          </div>
          <h1 className="mt-2.5 font-display text-[32px] leading-[1.02] font-semibold tracking-[-0.03em] text-white sm:text-[38px]">
            Every take,{" "}
            <span className="font-serif font-normal italic tracking-normal text-lab-lime">in one place.</span>
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-lab-muted">
            Replay, compare, download or clear your generated audio. Takes live in this browser session, so download
            anything you want to keep.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onNavigate("studio")} className="btn-lime !py-2 text-[12px]">
            <Icon name="plus" size={14} /> New take
          </button>
          {takes.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (!confirming) {
                  setConfirming(true);
                  window.setTimeout(() => setConfirming(false), 4000);
                  return;
                }
                clearTakes();
                setConfirming(false);
                toast("Session history cleared.", "info");
              }}
              className={cn("btn-ghost !py-2 text-[12px]", confirming && "!border-red-500/40 !text-red-300")}
            >
              <Icon name="trash" size={13} />
              {confirming ? "Confirm clear" : "Clear all"}
            </button>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Takes", value: String(takes.length), icon: "waveform" as const },
          { label: "Words voiced", value: totalWords.toLocaleString(), icon: "text" as const },
          { label: "Voices used", value: String(uniqueVoices), icon: "mic" as const },
          { label: "Storage", value: "Session", icon: "lock" as const },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-lab-line bg-lab-panel px-3.5 py-3">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[9px] tracking-[0.14em] text-lab-faint uppercase">{stat.label}</p>
              <Icon name={stat.icon} size={13} className="text-lab-faint/70" />
            </div>
            <p className="mt-1.5 font-display text-xl leading-none font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </section>

      {takes.length > 0 && (
        <div className="relative">
          <Icon name="search" size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-lab-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your takes by script, voice or model…"
            className="field !py-2.5 pl-9"
            aria-label="Search takes"
          />
        </div>
      )}

      {takes.length === 0 ? (
        <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-full border border-lab-line bg-white/[0.03] text-lab-faint">
            <Icon name="history" size={22} />
          </span>
          <p className="mt-3 font-display text-lg font-medium text-lab-cream">No takes yet</p>
          <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-lab-faint">
            Generate your first piece of audio in the studio and it will show up here, ready to replay and download.
          </p>
          <button type="button" onClick={() => onNavigate("studio")} className="btn-lime mt-4 !py-2 text-[12px]">
            <Icon name="sparkles" size={14} /> Open the studio
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <p className="text-[13px] text-lab-muted">No takes match “{query}”.</p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-2 font-mono text-[10px] tracking-wide text-lab-lime uppercase hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((take, index) => (
            <TakeCard
              key={take.id}
              take={take}
              index={index}
              onReuse={() => reuse(take)}
              onRemove={() => {
                removeTake(take.id);
                toast("Take removed from history.", "info");
              }}
              onCopy={() => {
                void copyText(take.text).then((ok) =>
                  toast(ok ? "Script copied." : "Could not copy the script.", ok ? "success" : "error"),
                );
              }}
              onDownload={() => {
                const filename = `${slugify(take.text)}-${take.voiceName.toLowerCase()}.${extensionForFormat(take.format)}`;
                void downloadAudio(take.src, filename)
                  .then((outcome) =>
                    toast(
                      outcome === "downloaded"
                        ? `Downloading ${filename}`
                        : "Opened the audio in a new tab — use “Save audio as…”.",
                      outcome === "downloaded" ? "success" : "info",
                    ),
                  )
                  .catch(() => toast("That download could not be started. Try again.", "error"));
              }}
            />
          ))}
        </div>
      )}

      <p className="flex items-start gap-2 rounded-xl border border-lab-line bg-lab-panel/60 px-4 py-3 text-[11px] leading-relaxed text-lab-faint">
        <Icon name="info" size={13} className="mt-0.5 shrink-0 text-lab-lime/70" />
        History is kept in memory for this session only — refreshing the page clears it. Download any take you want to
        keep. Audio is generated by ElevenLabs and delivered through Puter.js.
      </p>
    </div>
  );
}
