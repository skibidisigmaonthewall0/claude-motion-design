import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { Icon } from "../components/Icon";
import { Equalizer, VoiceAvatar } from "../components/ui";
import { useLab } from "../store";
import {
  VOICE_LANGUAGES,
  copyText,
  friendlyError,
  generateSpeech,
  type Voice,
  type VoiceCategory,
  type VoiceGender,
  type VoiceLanguage,
} from "../lib/puter";
import type { Page } from "../components/Shell";

const CATEGORIES: Array<"All" | VoiceCategory> = ["All", "Narration", "Conversational", "Character"];
const GENDERS: Array<"All" | VoiceGender> = ["All", "Female", "Male"];
const BASE_LANGUAGES: Array<"All" | VoiceLanguage> = ["All", ...VOICE_LANGUAGES];

export function Voices({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const {
    selectedVoiceId,
    setSelectedVoiceId,
    toast,
    allVoices,
    libraryVoices,
    libraryStatus,
    libraryError,
    loadLibrary,
  } = useLab();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [gender, setGender] = useState<(typeof GENDERS)[number]>("All");
  const [language, setLanguage] = useState<"All" | VoiceLanguage>("All");
  const [visibleCount, setVisibleCount] = useState(48);

  const hasOtherLanguages = allVoices.some((voice) => voice.language === "Other");
  const russianCount = allVoices.filter((voice) => voice.language === "Russian").length;
  const LANGUAGES: Array<"All" | VoiceLanguage> = hasOtherLanguages
    ? [...BASE_LANGUAGES, "Other"]
    : BASE_LANGUAGES;

  useEffect(() => {
    setVisibleCount(48);
  }, [query, category, gender, language]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    return () => {
      requestRef.current += 1;
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allVoices.filter((voice) => {
      const matchesQuery =
        !q ||
        [
          voice.name,
          voice.accent,
          voice.category,
          voice.gender,
          voice.description,
          voice.age,
          voice.language,
          voice.languageLabel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      const matchesCategory = category === "All" || voice.category === category;
      const matchesGender = gender === "All" || voice.gender === gender;
      const matchesLanguage = language === "All" || voice.language === language;
      return matchesQuery && matchesCategory && matchesGender && matchesLanguage;
    });
  }, [allVoices, query, category, gender, language]);

  const stopPreview = () => {
    requestRef.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
    setPreviewId(null);
    setLoadingId(null);
  };

  const preview = async (voice: Voice) => {
    if (previewId === voice.id) {
      stopPreview();
      return;
    }
    stopPreview();
    const requestId = ++requestRef.current;
    setLoadingId(voice.id);
    try {
      const { src } = await generateSpeech({
        text: voice.sample,
        voice: voice.id,
        model: "eleven_turbo_v2_5",
        format: "mp3_44100_128",
      });
      if (requestId !== requestRef.current) return;
      const audio = new Audio(src);
      audioRef.current = audio;
      audio.onended = () => {
        if (requestId === requestRef.current) setPreviewId(null);
      };
      audio.onerror = () => {
        if (requestId !== requestRef.current) return;
        setPreviewId(null);
        toast("That preview could not be played. Try another voice.", "error");
      };
      await audio.play();
      if (requestId === requestRef.current) setPreviewId(voice.id);
    } catch (err) {
      if (requestId === requestRef.current) toast(friendlyError(err), "error");
    } finally {
      if (requestId === requestRef.current) setLoadingId(null);
    }
  };

  const useVoice = (voice: Voice) => {
    setSelectedVoiceId(voice.id);
    toast(`${voice.name} is now your studio voice.`);
    onNavigate("studio");
  };

  return (
    <div className="space-y-5">
      <section className="animate-rise flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-lab-lime" />
            <span className="font-mono text-[10px] tracking-[0.18em] text-lab-lime/80 uppercase">
              Voice library · {allVoices.length} voices
            </span>
          </div>
          <h1 className="mt-2.5 font-display text-[32px] leading-[1.02] font-semibold tracking-[-0.03em] text-white sm:text-[38px]">
            Find the voice that{" "}
            <span className="font-serif font-normal italic tracking-normal text-lab-lime">fits.</span>
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-lab-muted">
            Every voice below is a real ElevenLabs voice — {allVoices.length} available right now, including{" "}
            <span className="text-lab-cream">{russianCount} native Russian voices</span>. Sync your Puter
            library to pull in every voice your account can access.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setLanguage("Russian")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                language === "Russian"
                  ? "border-lab-lime/40 bg-lab-lime/10 text-lab-lime"
                  : "border-lab-line bg-white/[0.02] text-lab-muted hover:border-lab-line2 hover:text-white",
              )}
            >
              🇷🇺 Русский · {russianCount}
            </button>
            <span className="font-mono text-[9px] tracking-wide text-lab-faint uppercase">
              native Russian narration, ads &amp; ASMR
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-lab-line bg-lab-panel px-3 py-2.5">
          <Icon name="info" size={14} className="shrink-0 text-lab-lime/80" />
          <p className="text-[11px] leading-relaxed text-lab-muted">
            Previews use the Turbo model and are generated live. Some Russian voices are Voice Library voices — if one
            isn't on your Puter account yet, try another or use any multilingual voice with Russian text.
          </p>
        </div>
      </section>

      <section
        className="animate-rise flex flex-col gap-3 rounded-xl border border-lab-lime/15 bg-lab-lime/[0.035] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        style={{ animationDelay: "40ms" }}
      >
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-lab-lime/25 bg-lab-lime/10 text-lab-lime">
            <Icon name="globe" size={14} />
          </span>
          <div>
            <p className="text-[12px] font-medium text-lab-cream">
              {libraryStatus === "ready"
                ? `Full library synced · ${libraryVoices.length} extra voices`
                : libraryStatus === "loading"
                  ? "Syncing every ElevenLabs voice on your Puter account…"
                  : libraryStatus === "error"
                    ? "Library sync needs your attention"
                    : "Want every voice, not just the curated set?"}
            </p>
            <p className="mt-0.5 max-w-xl text-[11px] leading-relaxed text-lab-muted">
              {libraryError
                ? libraryError
                : libraryStatus === "ready"
                  ? "Voices from your ElevenLabs / Puter library are now included in search, previews and the studio. Community voices may support other languages too."
                  : "Load the complete list from puter.ai.txt2speech.listVoices() — community voices, other languages and every accent your account can use."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadLibrary()}
          disabled={libraryStatus === "loading" || libraryStatus === "ready"}
          className="btn-lime shrink-0 !py-2 text-[11.5px]"
        >
          {libraryStatus === "loading" ? (
            <>
              <span className="size-3 animate-spin rounded-full border-2 border-[#0b0d05]/25 border-t-[#0b0d05]" />
              Syncing…
            </>
          ) : libraryStatus === "ready" ? (
            <>
              <Icon name="check" size={13} /> {allVoices.length} voices loaded
            </>
          ) : (
            <>
              <Icon name="refresh" size={13} /> Sync full library
            </>
          )}
        </button>
      </section>

      <section className="card animate-rise p-3 sm:p-4" style={{ animationDelay: "60ms" }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Icon name="search" size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-lab-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, accent, language or style…"
              className="field !py-2.5 pl-9"
              aria-label="Search voices"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-lab-faint hover:text-white"
                aria-label="Clear search"
              >
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-lab-line bg-[#0b0c0e] p-1">
              {LANGUAGES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLanguage(item)}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    language === item
                      ? "bg-white/[0.09] text-white"
                      : "text-lab-muted hover:bg-white/[0.04] hover:text-white",
                  )}
                >
                  {item === "All"
                    ? "All languages"
                    : item === "Russian"
                      ? "🇷🇺 Русский"
                      : item === "Other"
                        ? "🌐 Other"
                        : "🇺🇸 English"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-lab-line bg-[#0b0c0e] p-1">
              {CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    category === item
                      ? "bg-lab-lime text-[#0b0d05]"
                      : "text-lab-muted hover:bg-white/[0.04] hover:text-white",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-lab-line bg-[#0b0c0e] p-1">
              {GENDERS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setGender(item)}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    gender === item
                      ? "bg-white/[0.09] text-white"
                      : "text-lab-muted hover:bg-white/[0.04] hover:text-white",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-lab-line pt-2.5">
          <p className="font-mono text-[10px] tracking-wide text-lab-faint uppercase">
            Showing {Math.min(filtered.length, visibleCount)} of {filtered.length} matching · {allVoices.length} total
          </p>
          {(query || category !== "All" || gender !== "All" || language !== "All") && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("All");
                setGender("All");
                setLanguage("All");
              }}
              className="inline-flex items-center gap-1 font-mono text-[10px] tracking-wide text-lab-muted uppercase transition-colors hover:text-lab-lime"
            >
              <Icon name="refresh" size={11} /> Reset
            </button>
          )}
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-full border border-lab-line bg-white/[0.03] text-lab-faint">
            <Icon name="search" size={20} />
          </span>
          <p className="mt-3 font-display text-lg font-medium text-lab-cream">No voices found</p>
          <p className="mt-1 max-w-sm text-[12px] text-lab-faint">
            Try a different name, accent or style. You can also reset the filters to see all {allVoices.length} voices.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.slice(0, visibleCount).map((voice, index) => {
            const isSelected = voice.id === selectedVoiceId;
            const isPreviewing = previewId === voice.id;
            const isLoading = loadingId === voice.id;
            return (
              <article
                key={voice.id}
                className={cn(
                  "animate-rise card group relative flex flex-col p-4 transition-colors",
                  isSelected ? "border-lab-lime/40 bg-lab-lime/[0.025]" : "hover:border-lab-line2",
                )}
                style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
              >
                {isSelected && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border border-lab-lime/30 bg-lab-lime/10 px-2 py-0.5 font-mono text-[8px] tracking-[0.12em] text-lab-lime uppercase">
                    <Icon name="check" size={9} /> In use
                  </span>
                )}
                <div className="flex items-start gap-3">
                  <VoiceAvatar voice={voice} size="lg" />
                  <div className="min-w-0 flex-1 pr-14">
                    <h2 className="truncate font-display text-[17px] leading-tight font-semibold text-white">
                      {voice.name}
                    </h2>
                    <p className="mt-0.5 flex items-center gap-1 font-mono text-[9px] tracking-[0.1em] text-lab-faint uppercase">
                      <span className="text-[10px] leading-none">{voice.flag}</span>
                      <span className="truncate">
                        {voice.accent} · {voice.gender}
                      </span>
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <span className="chip !px-2 !py-0.5 !text-[8px]">{voice.category}</span>
                      <span className="chip !px-2 !py-0.5 !text-[8px]">{voice.age}</span>
                      {voice.language === "Russian" && (
                        <span className="chip !border-lab-lime/25 !bg-lab-lime/[0.06] !px-2 !py-0.5 !text-[8px] !text-lab-lime/90">
                          RU native
                        </span>
                      )}
                      {voice.language === "Other" && voice.languageLabel && (
                        <span className="chip !px-2 !py-0.5 !text-[8px]">{voice.languageLabel}</span>
                      )}
                      {voice.isLibrary && (
                        <span className="chip !px-2 !py-0.5 !text-[8px] !text-sky-300/80">Library</span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-[11.5px] leading-relaxed text-lab-muted">{voice.description}</p>

                <div className="mt-3 rounded-lg border border-lab-line bg-[#0b0c0e] p-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void preview(voice)}
                      disabled={isLoading}
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full transition-all active:scale-95 disabled:opacity-60",
                        isPreviewing
                          ? "bg-lab-lime text-[#0b0d05]"
                          : "border border-lab-line2 bg-white/[0.04] text-lab-cream hover:border-lab-lime/50 hover:text-lab-lime",
                      )}
                      aria-label={isPreviewing ? `Stop ${voice.name} preview` : `Preview ${voice.name}`}
                    >
                      {isLoading ? (
                        <span className="size-3 animate-spin rounded-full border-[1.5px] border-lab-muted/40 border-t-lab-lime" />
                      ) : (
                        <Icon name={isPreviewing ? "pause" : "play"} size={11} className={isPreviewing ? "" : "ml-0.5"} />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-[12px] leading-snug text-lab-cream/75",
                          voice.language === "Russian" ? "font-sans" : "font-serif italic",
                        )}
                      >
                        “{voice.sample}”
                      </p>
                      {voice.sampleTranslation && (
                        <p className="mt-0.5 truncate font-mono text-[8.5px] tracking-wide text-lab-faint">
                          {voice.sampleTranslation}
                        </p>
                      )}
                    </div>
                    {isPreviewing && <Equalizer className="shrink-0 text-lab-lime" />}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => useVoice(voice)}
                    className={cn(
                      "flex-1 !py-2 text-[11.5px]",
                      isSelected ? "btn-ghost !border-lab-lime/30 !text-lab-lime" : "btn-lime",
                    )}
                  >
                    <Icon name={isSelected ? "check" : "sparkles"} size={13} />
                    {isSelected ? "Selected — open studio" : "Use this voice"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void preview(voice)}
                    className="icon-btn !size-8"
                    aria-label={`Generate a sample of ${voice.name}`}
                    title="Generate sample"
                  >
                    <Icon name="waveform" size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void copyText(voice.id).then((ok) =>
                        toast(
                          ok ? `${voice.name} voice ID copied.` : "Could not copy the voice ID.",
                          ok ? "success" : "error",
                        ),
                      );
                    }}
                    className="icon-btn !size-8"
                    aria-label={`Copy ${voice.name} voice ID`}
                    title={`Copy voice ID: ${voice.id}`}
                  >
                    <Icon name="copy" size={13} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {filtered.length > visibleCount && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + 48)}
            className="btn-ghost !px-5 !py-2.5 text-[12px]"
          >
            <Icon name="plus" size={14} /> Show {Math.min(48, filtered.length - visibleCount)} more voices
          </button>
        </div>
      )}

      <section className="flex flex-col items-start justify-between gap-3 rounded-xl border border-lab-line bg-lab-panel px-4 py-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-lab-line bg-white/[0.03] text-lab-lime">
            <Icon name="sliders" size={16} />
          </span>
          <div>
            <h2 className="text-[12.5px] font-semibold text-lab-cream">Need a voice that isn't here?</h2>
            <p className="mt-0.5 max-w-xl text-[11px] leading-relaxed text-lab-faint">
              Use the voice changer to reskin an existing recording with any voice in this library, or generate a
              fresh read in the studio with the voice you just found.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => onNavigate("changer")} className="btn-ghost shrink-0 !py-2 text-[11.5px]">
          <Icon name="sliders" size={13} /> Open voice changer
        </button>
      </section>
    </div>
  );
}
