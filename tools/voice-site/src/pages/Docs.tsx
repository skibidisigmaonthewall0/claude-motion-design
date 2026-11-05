import { useState } from "react";
import { cn } from "../utils/cn";
import { Icon } from "../components/Icon";
import { useLab } from "../store";
import { FORMATS, MODELS, RUSSIAN_VOICES, VOICES, copyText } from "../lib/puter";
import type { Page } from "../components/Shell";

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "quickstart", label: "Quick start" },
  { id: "text-to-speech", label: "Text to speech" },
  { id: "models", label: "Models" },
  { id: "voices", label: "Voices" },
  { id: "voice-changer", label: "Voice changer" },
  { id: "formats", label: "Formats & downloads" },
  { id: "pricing", label: "Pricing & accounts" },
  { id: "troubleshooting", label: "Troubleshooting" },
];

const TTS_SNIPPET = `import { puter } from "@heyputer/puter.js";

puter.ai.txt2speech("Hello from the voice lab.", {
  provider: "elevenlabs",
  voice: "21m00Tcm4TlvDq8ikWAM", // Rachel
  model: "eleven_multilingual_v2",
  output_format: "mp3_44100_128",
})
  .then((audio) => audio.play())
  .catch((error) => console.error(error));`;

const STS_SNIPPET = `puter.ai.speech2speech("https://assets.puter.site/example.mp3", {
  voice: "9BWtsMINqrJLrRacOk9x", // Aria
  model: "eleven_multilingual_sts_v2",
})
  .then((audio) => audio.play())
  .catch((error) => console.error(error));`;

const CDN_SNIPPET = `<!-- Add this once, in your HTML head or before your script -->
<script src="https://js.puter.com/v2/"></script>

<script>
  puter.ai.txt2speech("No build step required.", {
    provider: "elevenlabs",
    voice: "21m00Tcm4TlvDq8ikWAM",
    model: "eleven_turbo_v2_5",
  }).then((audio) => audio.play());
</script>`;

function CodeBlock({ code, label }: { code: string; label: string }) {
  const { toast } = useLab();
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-lab-line bg-[#0b0c0e]">
      <div className="flex items-center justify-between border-b border-lab-line px-3 py-2">
        <span className="font-mono text-[9px] tracking-[0.14em] text-lab-faint uppercase">{label}</span>
        <button
          type="button"
          onClick={() => {
            void copyText(code).then((ok) => {
              setCopied(ok);
              toast(ok ? "Code copied to clipboard." : "Could not copy the code.", ok ? "success" : "error");
              window.setTimeout(() => setCopied(false), 1800);
            });
          }}
          className="inline-flex items-center gap-1 font-mono text-[9px] tracking-wide text-lab-muted uppercase transition-colors hover:text-lab-lime"
        >
          <Icon name={copied ? "check" : "copy"} size={11} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="scroll-slim overflow-x-auto p-3.5 font-mono text-[11px] leading-relaxed text-lab-cream/80">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <p className="font-mono text-[9px] tracking-[0.18em] text-lab-lime/70 uppercase">{eyebrow}</p>
      <h2 className="mt-1.5 font-display text-[22px] leading-tight font-semibold tracking-[-0.02em] text-white">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[12.5px] leading-relaxed text-lab-muted">{children}</div>
    </section>
  );
}

const FAQS = [
  {
    q: "Do I need an ElevenLabs API key?",
    a: "No. Voxel uses Puter.js, which routes ElevenLabs requests through the user-pays model. You never paste a key into this app, and there is no backend to configure.",
  },
  {
    q: "Why did a Puter sign-in window appear?",
    a: "Your first generation (or voice preview) may open a Puter authorization window. Approve it once and the browser remembers your session. Puter is free to join and each user covers their own usage.",
  },
  {
    q: "Where is my audio stored?",
    a: "Generated audio lives in your browser for the current session. History is held in memory and is cleared when you refresh. Download any take you want to keep — nothing is uploaded to a Voxel server.",
  },
  {
    q: "My local file failed to convert. What now?",
    a: "Voxel passes the File directly to puter.ai.speech2speech(), which converts it to a data source automatically. If a very large or unusual file is rejected, try a shorter MP3 or WAV clip, or load a public HTTPS URL such as the sample clip.",
  },
  {
    q: "Which model should I choose?",
    a: "Use Multilingual v2 for the best quality, Turbo v2.5 when you need speed, Flash v2.5 as a balance, and Eleven v3 when you want the most expressive delivery. All four models support Russian.",
  },
  {
    q: "How do I download the generated audio?",
    a: "Use the download icon in any audio player, or the Download MP3 / WAV button under a studio take. Voxel fetches the audio into a Blob first, so cross-origin files save as a real file. If the browser blocks the fetch, it opens the audio in a new tab where you can use “Save audio as…”.",
  },
  {
    q: "Do the Russian voices work out of the box?",
    a: `Voxel includes ${RUSSIAN_VOICES.length} native Russian voices, including narration, conversational, character and whispered styles. They are ElevenLabs Voice Library voices: if one isn't available on your Puter account yet, try another Russian voice, or use any multilingual voice with Russian text.`,
  },
  {
    q: "Why don't I see every ElevenLabs voice?",
    a: "The curated catalog loads instantly. To pull in every voice your Puter / ElevenLabs account can access — including community voices and other languages — click “Sync full library”. Voxel calls puter.ai.txt2speech.listVoices({ provider: 'elevenlabs' }) and merges the result into search, previews and the studio picker.",
  },
  {
    q: "Can I use the audio commercially?",
    a: "Usage is governed by Puter's and ElevenLabs' terms, not by Voxel. Review both before publishing or monetising generated audio.",
  },
];

export function Docs({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { allVoices, libraryVoices, libraryStatus, loadLibrary } = useLab();

  return (
    <div className="space-y-5">
      <section className="animate-rise flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-lab-lime" />
            <span className="font-mono text-[10px] tracking-[0.18em] text-lab-lime/80 uppercase">
              Documentation · v1.0
            </span>
          </div>
          <h1 className="mt-2.5 font-display text-[32px] leading-[1.02] font-semibold tracking-[-0.03em] text-white sm:text-[38px]">
            Everything you need to{" "}
            <span className="font-serif font-normal italic tracking-normal text-lab-lime">sound good.</span>
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-lab-muted">
            How Voxel generates speech with Puter.js and ElevenLabs — the API calls, models, formats and the
            user-pays model that keeps this lab keyless.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="https://docs.puter.com/AI/txt2speech/"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost !py-2 text-[11.5px]"
          >
            <Icon name="external" size={13} /> txt2speech docs
          </a>
          <a
            href="https://developer.puter.com/tutorials/free-unlimited-elevenlabs-api/"
            target="_blank"
            rel="noreferrer"
            className="btn-lime !py-2 text-[11.5px]"
          >
            <Icon name="book" size={13} /> Read the tutorial
          </a>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="card animate-rise space-y-8 p-5 sm:p-6" style={{ animationDelay: "60ms" }}>
          <Section id="overview" eyebrow="01" title="A voice lab with no keys">
            <p>
              Voxel is a browser-only studio for AI speech. It calls{" "}
              <a
                href="https://docs.puter.com/AI/txt2speech/"
                target="_blank"
                rel="noreferrer"
                className="text-lab-cream underline decoration-lab-line2 underline-offset-2 hover:decoration-lab-lime"
              >
                <code className="font-mono text-[11.5px] text-lab-lime/90">puter.ai.txt2speech()</code>
              </a>{" "}
              with the ElevenLabs provider, so every generation is produced by ElevenLabs models without an API key in
              your project.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { icon: "lock" as const, title: "No keys", body: "Nothing to paste, leak or rotate." },
                { icon: "globe" as const, title: "No backend", body: "Static site, serverless by design." },
                { icon: "zap" as const, title: "User-pays", body: "Each listener covers their own usage." },
              ].map((item) => (
                <div key={item.title} className="rounded-lg border border-lab-line bg-[#0b0c0e] p-3">
                  <Icon name={item.icon} size={15} className="text-lab-lime" />
                  <p className="mt-1.5 text-[11.5px] font-medium text-lab-cream">{item.title}</p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-lab-faint">{item.body}</p>
                </div>
              ))}
            </div>
          </Section>

          <div className="h-px bg-lab-line" />

          <Section id="quickstart" eyebrow="02" title="Quick start">
            <p>
              Add the Puter.js script to your page, then call <code className="font-mono text-[11.5px] text-lab-cream">txt2speech</code>{" "}
              with the ElevenLabs provider. The returned audio object can be played directly.
            </p>
            <CodeBlock label="CDN · no build step" code={CDN_SNIPPET} />
            <p>
              Using npm? Install <code className="font-mono text-[11.5px] text-lab-cream">@heyputer/puter.js</code> and
              import it instead. Voxel itself loads the CDN build so the app stays a single static bundle.
            </p>
            <CodeBlock label="npm module" code={TTS_SNIPPET} />
          </Section>

          <div className="h-px bg-lab-line" />

          <Section id="text-to-speech" eyebrow="03" title="Text to speech">
            <p>
              The first argument is your script. The options object selects the provider, voice, model and output
              format. Keep scripts under 3,000 characters for a single request.
            </p>
            <div className="scroll-slim overflow-x-auto rounded-xl border border-lab-line">
              <table className="w-full min-w-[420px] text-left text-[11.5px]">
                <thead className="bg-white/[0.03] font-mono text-[9px] tracking-[0.12em] text-lab-faint uppercase">
                  <tr>
                    <th className="px-3 py-2">Option</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lab-line text-lab-muted">
                  {[
                    ["provider", "string", 'Always "elevenlabs" for these voices.'],
                    ["voice", "string", "An ElevenLabs voice ID from the library."],
                    ["model", "string", "One of the four models below."],
                    ["output_format", "string", "MP3, PCM or µ-law. Defaults to MP3 128."],
                  ].map((row) => (
                    <tr key={row[0]}>
                      <td className="px-3 py-2 font-mono text-[10.5px] text-lab-lime/85">{row[0]}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-lab-faint">{row[1]}</td>
                      <td className="px-3 py-2">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="h-px bg-lab-line" />

          <Section id="models" eyebrow="04" title="Models">
            <p>Each model trades latency against fidelity. Voxel exposes all four in the studio.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {MODELS.map((model) => (
                <div key={model.id} className="rounded-lg border border-lab-line bg-[#0b0c0e] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-medium text-lab-cream">{model.name}</p>
                    {model.badge && (
                      <span className="rounded-full border border-lab-lime/25 bg-lab-lime/[0.07] px-1.5 py-0.5 font-mono text-[8px] tracking-wide text-lab-lime uppercase">
                        {model.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-lab-faint">{model.blurb}</p>
                  <p className="mt-1.5 font-mono text-[9px] tracking-wide text-lab-faint/80 uppercase">
                    {model.id} · {model.latency}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          <div className="h-px bg-lab-line" />

          <Section id="voices" eyebrow="05" title="Voices">
            <p>
              Voxel ships with {VOICES.length} curated ElevenLabs voices, including{" "}
              <span className="text-lab-cream">{RUSSIAN_VOICES.length} native Russian voices</span>, and can merge in
              the rest of your account's library for {allVoices.length} voices right now. Browse the{" "}
              <button
                type="button"
                onClick={() => onNavigate("voices")}
                className="text-lab-lime underline decoration-lab-lime/30 underline-offset-2 hover:decoration-lab-lime"
              >
                voice library
              </button>{" "}
              to filter by language, preview a live sample, then send one to the studio.
            </p>
            <div className="flex flex-col items-start justify-between gap-2 rounded-lg border border-lab-line bg-[#0b0c0e] p-3 sm:flex-row sm:items-center">
              <p className="text-[11px] leading-relaxed text-lab-muted">
                <span className="font-medium text-lab-cream">Full library:</span>{" "}
                {libraryStatus === "ready"
                  ? `${libraryVoices.length} additional voices synced from Puter.`
                  : "Sync every Voice Library voice your account can access."}
              </p>
              <button
                type="button"
                onClick={() => void loadLibrary()}
                disabled={libraryStatus === "loading" || libraryStatus === "ready"}
                className="btn-ghost shrink-0 !border-lab-lime/25 !py-1.5 text-[11px] !text-lab-lime"
              >
                <Icon name={libraryStatus === "ready" ? "check" : "refresh"} size={12} />
                {libraryStatus === "loading"
                  ? "Syncing…"
                  : libraryStatus === "ready"
                    ? "Synced"
                    : "Sync full library"}
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {[...RUSSIAN_VOICES.slice(0, 4), ...VOICES.filter((v) => v.featured)].slice(0, 6).map((voice) => (
                <div key={voice.id} className="flex items-center gap-2 rounded-lg border border-lab-line bg-[#0b0c0e] px-2.5 py-2">
                  <span className={cn("grid size-6 shrink-0 place-items-center rounded-full bg-gradient-to-br font-display text-[8px] font-semibold text-white", voice.gradient)}>
                    {voice.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-lab-cream">
                      <span className="mr-1">{voice.flag}</span>
                      {voice.name}
                    </p>
                    <p className="truncate font-mono text-[8.5px] text-lab-faint">{voice.id}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="rounded-lg border border-lab-line bg-[#0b0c0e] p-3 text-[11px] leading-relaxed text-lab-muted">
              <span className="font-medium text-lab-cream">Russian tip:</span> choose a 🇷🇺 voice for a native accent,
              or keep any multilingual voice and paste Russian text — all four models are multilingual. Not every
              Voice Library ID is available on every account; if one is rejected, try another Russian voice.
            </p>
          </Section>

          <div className="h-px bg-lab-line" />

          <Section id="voice-changer" eyebrow="06" title="Voice changer">
            <p>
              Speech-to-speech keeps the performance and swaps the speaker. Pass a public audio URL and a target voice
              ID. The model is <code className="font-mono text-[11.5px] text-lab-cream">eleven_multilingual_sts_v2</code>.
            </p>
            <CodeBlock label="speech2speech" code={STS_SNIPPET} />
            <p className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.05] p-3 text-[11px] text-amber-100/80">
              <Icon name="info" size={13} className="mt-0.5 shrink-0" />
              The source must be reachable by the service. Public HTTPS URLs are the most reliable; local file uploads
              may be rejected.
            </p>
          </Section>

          <div className="h-px bg-lab-line" />

          <Section id="formats" eyebrow="07" title="Output formats & downloads">
            <div className="scroll-slim overflow-x-auto rounded-xl border border-lab-line">
              <table className="w-full min-w-[360px] text-left text-[11.5px]">
                <thead className="bg-white/[0.03] font-mono text-[9px] tracking-[0.12em] text-lab-faint uppercase">
                  <tr>
                    <th className="px-3 py-2">Format</th>
                    <th className="px-3 py-2">Best for</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lab-line text-lab-muted">
                  {FORMATS.map((format) => (
                    <tr key={format.id}>
                      <td className="px-3 py-2 font-mono text-[10.5px] text-lab-lime/85">{format.id}</td>
                      <td className="px-3 py-2">{format.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              <span className="font-medium text-lab-cream">Downloading:</span> every player has a download icon, and
              each studio take has a dedicated Download button labelled with its real file type (MP3 or WAV). Voxel
              fetches the audio into a Blob before saving, which makes cross-origin ElevenLabs audio download as a
              normal file rather than navigating away. If a browser blocks the fetch, the audio opens in a new tab so
              you can still save it manually.
            </p>
          </Section>

          <div className="h-px bg-lab-line" />

          <Section id="pricing" eyebrow="08" title="Pricing & accounts">
            <p>
              Voxel is free to use and does not include an API key. Puter uses a{" "}
              <a
                href="https://docs.puter.com/user-pays-model/"
                target="_blank"
                rel="noreferrer"
                className="text-lab-cream underline decoration-lab-line2 underline-offset-2 hover:decoration-lab-lime"
              >
                user-pays model
              </a>
              : each person who generates audio covers their own usage through their Puter account. There is no
              monthly credit pool for you to manage and no server bill.
            </p>
            <div className="flex items-start gap-2.5 rounded-lg border border-lab-lime/20 bg-lab-lime/[0.04] p-3">
              <Icon name="lock" size={14} className="mt-0.5 shrink-0 text-lab-lime" />
              <p className="text-[11px] leading-relaxed text-lab-cream/80">
                <span className="font-medium text-lab-cream">No keys stored.</span> Voxel never asks for an ElevenLabs
                key and never proxies your audio through its own server.
              </p>
            </div>
          </Section>

          <div className="h-px bg-lab-line" />

          <Section id="troubleshooting" eyebrow="09" title="Troubleshooting">
            <div className="divide-y divide-lab-line overflow-hidden rounded-xl border border-lab-line">
              {FAQS.map((faq, index) => {
                const open = openFaq === index;
                return (
                  <div key={faq.q}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : index)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between gap-3 bg-[#0b0c0e] px-3.5 py-3 text-left transition-colors hover:bg-white/[0.03]"
                    >
                      <span className="text-[11.5px] font-medium text-lab-cream">{faq.q}</span>
                      <Icon
                        name="chevronDown"
                        size={14}
                        className={cn("shrink-0 text-lab-faint transition-transform", open && "rotate-180")}
                      />
                    </button>
                    {open && (
                      <p className="animate-rise border-t border-lab-line/60 bg-[#0b0c0e] px-3.5 py-3 text-[11px] leading-relaxed text-lab-muted">
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-lab-line bg-[#0b0c0e] p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-[12px] font-medium text-lab-cream">Ready to make some noise?</p>
              <p className="mt-0.5 text-[11px] text-lab-faint">The studio is one click away.</p>
            </div>
            <button type="button" onClick={() => onNavigate("studio")} className="btn-lime !py-2 text-[11.5px]">
              <Icon name="sparkles" size={13} /> Open the studio
            </button>
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-lab-line bg-lab-panel p-3">
            <p className="label-mono px-1.5 pb-2">On this page</p>
            <nav className="space-y-0.5">
              {TOC.map((item, index) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="group flex items-center gap-2 rounded-md px-1.5 py-1.5 text-[11px] text-lab-muted transition-colors hover:bg-white/[0.04] hover:text-lab-cream"
                >
                  <span className="font-mono text-[8.5px] text-lab-faint/70 group-hover:text-lab-lime/70">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-3 border-t border-lab-line pt-3">
              <p className="label-mono px-1.5 pb-1.5">Reference</p>
              {[
                { label: "txt2speech", href: "https://docs.puter.com/AI/txt2speech/" },
                { label: "listVoices", href: "https://docs.puter.com/AI/txt2speech.listVoices/" },
                { label: "speech2speech", href: "https://docs.puter.com/AI/speech2speech/" },
                { label: "Puter.js SDK", href: "https://docs.puter.com/" },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1.5 font-mono text-[10px] text-lab-muted transition-colors hover:bg-white/[0.04] hover:text-lab-lime"
                >
                  {link.label}
                  <Icon name="arrowUpRight" size={11} />
                </a>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
