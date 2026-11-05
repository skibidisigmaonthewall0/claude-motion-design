export * from "./voices";
import type { PuterVoiceRecord } from "./voices";

export interface ModelOption {
  id: string;
  name: string;
  blurb: string;
  badge?: string;
  latency: string;
}

export interface FormatOption {
  id: string;
  name: string;
  detail: string;
}

export const MODELS: ModelOption[] = [
  {
    id: "eleven_multilingual_v2",
    name: "Multilingual v2",
    blurb: "Highest quality · 29 languages",
    badge: "Default",
    latency: "~4s",
  },
  {
    id: "eleven_turbo_v2_5",
    name: "Turbo v2.5",
    blurb: "Ultra-low latency · 32 languages",
    badge: "Fastest",
    latency: "~1.5s",
  },
  {
    id: "eleven_flash_v2_5",
    name: "Flash v2.5",
    blurb: "Fast generation · 32 languages",
    latency: "~2s",
  },
  {
    id: "eleven_v3",
    name: "Eleven v3",
    blurb: "Most expressive · 70+ languages",
    badge: "New",
    latency: "~5s",
  },
];

export const FORMATS: FormatOption[] = [
  { id: "mp3_44100_128", name: "MP3 · 128 kbps", detail: "44.1 kHz · balanced" },
  { id: "mp3_44100_192", name: "MP3 · 192 kbps", detail: "44.1 kHz · high quality" },
  { id: "wav_44100", name: "WAV · 44.1 kHz", detail: "Lossless · editing" },
  { id: "pcm_16000", name: "PCM · 16 kHz", detail: "Raw · telephony" },
  { id: "pcm_24000", name: "PCM · 24 kHz", detail: "Raw · studio" },
  { id: "opus_48000_128", name: "Opus · 128 kbps", detail: "48 kHz · web & streaming" },
  { id: "ulaw_8000", name: "µ-law · 8 kHz", detail: "Compressed · IVR" },
];

/* ------------------------------------------------------------------ */
/* Puter.js integration                                                */
/* ------------------------------------------------------------------ */

export interface PuterAudioLike {
  src?: string;
  url?: string;
  play?: () => Promise<void> | void;
  pause?: () => void;
  toString?: () => string;
}

interface Txt2SpeechFn {
  (text: string, options?: Record<string, unknown>): Promise<PuterAudioLike>;
  listVoices?: (options?: Record<string, unknown>) => Promise<unknown>;
}

interface PuterAI {
  txt2speech: Txt2SpeechFn;
  speech2speech: (
    source: string | File | Blob,
    options?: Record<string, unknown>,
  ) => Promise<PuterAudioLike>;
}

interface PuterAuth {
  signIn?: () => Promise<unknown>;
  signOut?: () => Promise<unknown>;
  isSignedIn?: () => Promise<boolean>;
  getUser?: () => Promise<{ username?: string; name?: string }>;
}

export interface PuterSDK {
  ai: PuterAI;
  auth?: PuterAuth;
}

declare global {
  interface Window {
    puter?: PuterSDK;
  }
}

let puterPromise: Promise<PuterSDK> | null = null;

export function isPuterLoaded(): boolean {
  return typeof window !== "undefined" && Boolean(window.puter?.ai);
}

export function loadPuter(timeoutMs = 20000): Promise<PuterSDK> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Puter.js requires a browser environment."));
  }
  if (window.puter?.ai) return Promise.resolve(window.puter);
  if (puterPromise) return puterPromise;

  puterPromise = new Promise<PuterSDK>((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (window.puter?.ai) {
        resolve(window.puter);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        puterPromise = null;
        reject(
          new Error(
            "Puter.js could not be loaded. Check your connection, or disable any script blockers and try again.",
          ),
        );
        return;
      }
      window.setTimeout(tick, 120);
    };
    tick();
  });

  return puterPromise;
}

function extractAudioSrc(audio: PuterAudioLike | string): string {
  if (typeof audio === "string") {
    if (audio.length > 0) return audio;
    throw new Error("Puter returned an empty audio response.");
  }
  if (!audio) throw new Error("Puter returned an empty audio response.");
  if (typeof audio.src === "string" && audio.src.length > 0) return audio.src;
  if (typeof audio.url === "string" && audio.url.length > 0) return audio.url;
  try {
    const asString = audio.toString?.() ?? "";
    if (asString && asString !== "[object Object]" && asString !== "[object HTMLAudioElement]") {
      return asString;
    }
  } catch {
    /* ignore */
  }
  throw new Error("The audio response could not be read. Please try generating again.");
}

export interface SpeechRequest {
  text: string;
  voice: string;
  model: string;
  format: string;
}

export interface SpeechResult {
  src: string;
  raw: PuterAudioLike;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function generateSpeech({
  text,
  voice,
  model,
  format,
}: SpeechRequest): Promise<SpeechResult> {
  const puter = await loadPuter();
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Add a script before generating.");

  const audio = await withTimeout(
    puter.ai.txt2speech(trimmed, {
      provider: "elevenlabs",
      voice,
      model,
      output_format: format,
    }),
    120000,
    "The request timed out. If a Puter sign-in window is open, approve it and try again.",
  );

  return { src: extractAudioSrc(audio), raw: audio };
}

export async function convertSpeech(source: string | File | Blob, voice: string): Promise<string> {
  const puter = await loadPuter();
  if (typeof source === "string" && !source.trim()) throw new Error("Add an audio source to convert.");
  const audio = await withTimeout(
    puter.ai.speech2speech(typeof source === "string" ? source.trim() : source, {
      voice,
      model: "eleven_multilingual_sts_v2",
      output_format: "mp3_44100_128",
    }),
    180000,
    "The conversion timed out. Try a shorter clip and try again.",
  );
  return extractAudioSrc(audio);
}

/**
 * Loads every ElevenLabs voice available to the signed-in Puter account,
 * including community / Voice Library voices that are not in the curated list.
 */
export async function fetchPuterVoices(): Promise<PuterVoiceRecord[]> {
  const puter = await loadPuter();
  const listVoices = puter.ai.txt2speech.listVoices;
  if (typeof listVoices !== "function") {
    throw new Error(
      "This Puter.js build does not expose listVoices(). Reload the page to fetch the latest SDK and try again.",
    );
  }
  const raw = await withTimeout(
    listVoices.call(puter.ai.txt2speech, { provider: "elevenlabs" }),
    45000,
    "Loading the ElevenLabs voice library timed out. Approve the Puter sign-in window and try again.",
  );
  const container = (raw ?? {}) as Record<string, unknown>;
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(container.voices)
      ? container.voices
      : Array.isArray(container.data)
        ? container.data
        : Array.isArray(container.result)
          ? container.result
          : [];
  return list.filter(
    (entry): entry is PuterVoiceRecord =>
      Boolean(entry) && typeof entry === "object" && "id" in (entry as Record<string, unknown>),
  );
}

export function friendlyError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : "";
  const message = raw.replace(/^Error:\s*/i, "").trim();
  if (!message) return "Something went wrong. Please try again.";
  if (/popup|window|auth|sign in|permission/i.test(message)) {
    return "Puter needs you to sign in to continue. Allow the pop-up, then try again — it's free.";
  }
  if (/network|fetch|failed to fetch|load/i.test(message)) {
    return "We couldn't reach the voice service. Check your connection and try again.";
  }
  if (/quota|credit|limit|usage/i.test(message)) {
    return "Your Puter usage limit was reached for this request. Try again shortly.";
  }
  if (/voice|not found|404/i.test(message)) {
    return `${message} — some library voices must be added to the Puter / ElevenLabs account before use. Try a default voice, then retry this one.`;
  }
  return message;
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

export function estimateSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round((words / 155) * 60));
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function seededBars(seed: string, count = 64): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i += 1) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const noise = Math.abs(h % 1000) / 1000;
    const envelope = 0.42 + 0.58 * Math.sin((Math.PI * (i + 1)) / (count + 1));
    const texture = 0.55 + 0.45 * Math.abs(Math.sin(i * 1.7 + noise * 3));
    bars.push(Math.min(1, Math.max(0.12, noise * 0.65 + envelope * texture * 0.55)));
  }
  return bars;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

export type DownloadResult = "downloaded" | "opened";

function sanitizeFilename(filename: string, fallback = "voxel-take.mp3"): string {
  const clean = filename.replace(/[\\/:*?"<>|\n\r]+/g, "-").trim();
  return clean || fallback;
}

function triggerAnchor(href: string, filename: string, openInNewTab = false): void {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  if (openInNewTab) {
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
  }
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
  }, 400);
}

/**
 * Downloads generated audio reliably. Tries to fetch the source into a Blob so
 * cross-origin MP3/PCM URLs save as a file instead of navigating. If the fetch
 * is blocked (no CORS), it falls back to opening the audio in a new tab so the
 * browser's own "Save audio as…" flow still works.
 */
export async function downloadAudio(src: string, filename: string): Promise<DownloadResult> {
  const safeName = sanitizeFilename(filename);
  if (!src) throw new Error("There is no audio to download yet.");

  try {
    const response = await fetch(src, { mode: "cors", credentials: "omit" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (blob.size === 0) throw new Error("Empty audio file");
    const objectUrl = URL.createObjectURL(blob);
    triggerAnchor(objectUrl, safeName);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    return "downloaded";
  } catch {
    triggerAnchor(src, safeName, true);
    return "opened";
  }
}

/** Fire-and-forget helper kept for simple call sites. */
export function downloadSrc(src: string, filename: string): void {
  void downloadAudio(src, filename).catch(() => {
    /* ignore */
  });
}

export function extensionForFormat(format: string): string {
  if (format.startsWith("mp3")) return "mp3";
  if (format.startsWith("opus")) return "opus";
  if (format.startsWith("ulaw") || format.startsWith("alaw")) return "wav";
  return "wav";
}

export function slugify(text: string, fallback = "voxel-take"): string {
  const slug = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || fallback;
}


