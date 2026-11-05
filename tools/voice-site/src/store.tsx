import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_VOICE_ID,
  VOICES,
  fetchPuterVoices,
  friendlyError,
  isPuterLoaded,
  loadPuter,
  mapLibraryVoices,
  mergeLibraryVoices,
  uid,
  type Voice,
} from "./lib/puter";
import { Icon } from "./components/Icon";

export interface Take {
  id: string;
  text: string;
  voiceId: string;
  voiceName: string;
  model: string;
  format: string;
  src: string;
  createdAt: number;
}

export interface Toast {
  id: string;
  message: string;
  tone: "success" | "error" | "info";
}

interface LabContextValue {
  takes: Take[];
  addTake: (take: Omit<Take, "id" | "createdAt">) => string;
  removeTake: (id: string) => void;
  clearTakes: () => void;
  selectedVoiceId: string;
  setSelectedVoiceId: (id: string) => void;
  studioSeed: Take | null;
  loadTake: (take: Take) => void;
  clearStudioSeed: () => void;
  newTakeSignal: number;
  requestNewTake: () => void;
  allVoices: Voice[];
  resolveVoice: (id: string, fallbackName?: string) => Voice;
  libraryVoices: Voice[];
  libraryStatus: "idle" | "loading" | "ready" | "error";
  libraryError: string | null;
  loadLibrary: (silent?: boolean) => Promise<void>;
  toasts: Toast[];
  toast: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;
  puterReady: boolean;
}

const FALLBACK_GRADIENT = "from-[#cbd5e1] via-[#64748b] to-[#1e293b]";

export function fallbackVoice(id: string, name?: string): Voice {
  const label = name || "Library voice";
  return {
    id,
    name: label,
    gender: "Neutral",
    language: "Other",
    accent: "Voice library",
    category: "Narration",
    age: "Voice library",
    description: "An ElevenLabs Voice Library voice loaded through Puter.",
    sample: "",
    gradient: FALLBACK_GRADIENT,
    initials: label.slice(0, 2).toUpperCase(),
    flag: "🌐",
    isLibrary: true,
  };
}

const LabContext = createContext<LabContextValue | null>(null);

export function LabProvider({ children }: { children: ReactNode }) {
  const [takes, setTakes] = useState<Take[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState(DEFAULT_VOICE_ID);
  const [studioSeed, setStudioSeed] = useState<Take | null>(null);
  const [newTakeSignal, setNewTakeSignal] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [puterReady, setPuterReady] = useState(isPuterLoaded());
  const [libraryVoices, setLibraryVoices] = useState<Voice[]>([]);
  const [libraryStatus, setLibraryStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const libraryStarted = useRef(false);
  const timers = useRef<Record<string, number>>({});

  useEffect(() => {
    if (puterReady) return;
    const interval = window.setInterval(() => {
      if (isPuterLoaded()) {
        setPuterReady(true);
        window.clearInterval(interval);
      }
    }, 400);
    return () => window.clearInterval(interval);
  }, [puterReady]);

  useEffect(() => {
    const active = timers.current;
    return () => {
      Object.values(active).forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current[id];
    if (timer) {
      window.clearTimeout(timer);
      delete timers.current[id];
    }
  }, []);

  const toast = useCallback(
    (message: string, tone: Toast["tone"] = "success") => {
      const id = uid();
      setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
      timers.current[id] = window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        delete timers.current[id];
      }, 4200);
    },
    [],
  );

  const addTake = useCallback((take: Omit<Take, "id" | "createdAt">) => {
    const id = uid();
    setTakes((prev) => [{ ...take, id, createdAt: Date.now() }, ...prev].slice(0, 40));
    return id;
  }, []);

  const removeTake = useCallback((id: string) => {
    setTakes((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearTakes = useCallback(() => setTakes([]), []);

  const loadTake = useCallback((take: Take) => setStudioSeed(take), []);
  const clearStudioSeed = useCallback(() => setStudioSeed(null), []);
  const requestNewTake = useCallback(() => setNewTakeSignal((n) => n + 1), []);

  const allVoices = useMemo(() => mergeLibraryVoices(VOICES, libraryVoices), [libraryVoices]);

  const resolveVoice = useCallback(
    (id: string, fallbackName?: string): Voice =>
      allVoices.find((voice) => voice.id === id) ?? fallbackVoice(id, fallbackName),
    [allVoices],
  );

  const loadLibrary = useCallback(
    async (silent = false) => {
      if (libraryStarted.current) return;
      libraryStarted.current = true;
      setLibraryStatus("loading");
      setLibraryError(null);
      try {
        const records = await fetchPuterVoices();
        const mapped = mapLibraryVoices(records);
        setLibraryVoices(mapped);
        setLibraryStatus("ready");
        if (!silent) {
          toast(
            mapped.length > 0
              ? `Loaded ${mapped.length} more ElevenLabs voices from your Puter library.`
              : "No extra library voices available right now — the curated catalog still works.",
            mapped.length > 0 ? "success" : "info",
          );
        }
      } catch (error) {
        libraryStarted.current = false;
        const message = friendlyError(error);
        setLibraryStatus("error");
        setLibraryError(message);
        if (!silent) toast(message, "error");
      }
    },
    [toast],
  );

  useEffect(() => {
    if (!puterReady) return;
    let cancelled = false;
    (async () => {
      try {
        const puter = await loadPuter(8000);
        const signedIn = await puter.auth?.isSignedIn?.();
        if (!cancelled && signedIn) void loadLibrary(true);
      } catch {
        /* not signed in yet — the library can be loaded manually */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [puterReady, loadLibrary]);

  const value = useMemo<LabContextValue>(
    () => ({
      takes,
      addTake,
      removeTake,
      clearTakes,
      selectedVoiceId,
      setSelectedVoiceId,
      studioSeed,
      loadTake,
      clearStudioSeed,
      newTakeSignal,
      requestNewTake,
      allVoices,
      resolveVoice,
      libraryVoices,
      libraryStatus,
      libraryError,
      loadLibrary,
      toasts,
      toast,
      dismissToast,
      puterReady,
    }),
    [
      takes,
      addTake,
      removeTake,
      clearTakes,
      selectedVoiceId,
      studioSeed,
      loadTake,
      clearStudioSeed,
      newTakeSignal,
      requestNewTake,
      allVoices,
      resolveVoice,
      libraryVoices,
      libraryStatus,
      libraryError,
      loadLibrary,
      toasts,
      toast,
      dismissToast,
      puterReady,
    ],
  );

  return (
    <LabContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-toast pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-lab-line bg-lab-panel2/95 px-4 py-3 shadow-2xl backdrop-blur"
          >
            <span
              className={
                t.tone === "error"
                  ? "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400"
                  : t.tone === "info"
                    ? "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-300"
                    : "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-lab-lime/15 text-lab-lime"
              }
            >
              <Icon name={t.tone === "error" ? "info" : t.tone === "info" ? "info" : "check"} size={12} />
            </span>
            <p className="flex-1 text-[13px] leading-relaxed text-lab-cream/90">{t.message}</p>
            <button
              onClick={() => dismissToast(t.id)}
              className="text-lab-faint transition-colors hover:text-white"
              aria-label="Dismiss notification"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
    </LabContext.Provider>
  );
}

export function useLab(): LabContextValue {
  const ctx = useContext(LabContext);
  if (!ctx) throw new Error("useLab must be used inside LabProvider");
  return ctx;
}
