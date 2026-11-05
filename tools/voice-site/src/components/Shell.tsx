import { useEffect, useState, type ReactNode } from "react";
import { cn } from "../utils/cn";
import { Icon, type IconName } from "./Icon";
import { loadPuter } from "../lib/puter";
import { useLab } from "../store";

export type Page = "studio" | "voices" | "changer" | "history" | "docs";

export const PAGE_META: Record<Page, { label: string; title: string; icon: IconName }> = {
  studio: { label: "Studio", title: "Studio", icon: "waveform" },
  voices: { label: "Voice library", title: "Voice library", icon: "grid" },
  changer: { label: "Voice changer", title: "Voice changer", icon: "sliders" },
  history: { label: "History", title: "History", icon: "history" },
  docs: { label: "Documentation", title: "Documentation", icon: "book" },
};

const WORKSPACE_NAV: Page[] = ["studio", "voices", "changer", "history"];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative grid size-9 place-items-center overflow-hidden rounded-[11px] bg-lab-lime text-[#0b0d05] shadow-[0_8px_24px_-10px_rgba(216,255,79,0.8)]">
        <Icon name="waveform" size={20} strokeWidth={2.2} />
        <span className="absolute inset-0 rounded-[11px] ring-1 ring-white/30 ring-inset" />
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="font-display text-[21px] leading-none font-semibold tracking-[-0.03em] text-white">voxel</span>
        <span className="rounded border border-lab-line2 px-1 py-0.5 font-mono text-[8px] tracking-[0.16em] text-lab-muted uppercase">
          lab
        </span>
      </span>
    </div>
  );
}

function NavItem({
  page,
  active,
  onClick,
  badge,
}: {
  page: Page;
  active: boolean;
  onClick: () => void;
  badge?: string;
}) {
  const meta = PAGE_META[page];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
        active
          ? "bg-white/[0.055] font-medium text-white"
          : "text-lab-muted hover:bg-white/[0.03] hover:text-lab-cream",
      )}
    >
      {active && <span className="absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 rounded-full bg-lab-lime" />}
      <Icon
        name={meta.icon}
        size={16}
        className={cn("shrink-0 transition-colors", active ? "text-lab-lime" : "text-lab-faint group-hover:text-lab-muted")}
      />
      <span className="flex-1 truncate">{meta.label}</span>
      {badge && (
        <span className="rounded-full border border-lab-line2 px-1.5 py-px font-mono text-[9px] text-lab-muted">{badge}</span>
      )}
    </button>
  );
}

function SidebarContent({
  page,
  onNavigate,
  onClose,
}: {
  page: Page;
  onNavigate: (page: Page) => void;
  onClose?: () => void;
}) {
  const { puterReady, takes, toast } = useLab();
  const [user, setUser] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const puter = await loadPuter(6000);
        const signed = await puter.auth?.isSignedIn?.();
        if (!signed) return;
        const account = await puter.auth?.getUser?.();
        if (alive) setUser(account?.username ?? account?.name ?? "Puter user");
      } catch {
        /* not signed in — that's fine */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const signIn = async () => {
    if (authBusy) return;
    setAuthBusy(true);
    try {
      const puter = await loadPuter();
      await puter.auth?.signIn?.();
      const account = await puter.auth?.getUser?.();
      setUser(account?.username ?? account?.name ?? "Puter user");
      toast("Signed in to Puter. Your generations are now covered by your own account.");
    } catch {
      toast("The Puter sign-in window was closed. You can try again any time.", "info");
    } finally {
      setAuthBusy(false);
    }
  };

  const go = (next: Page) => {
    onNavigate(next);
    onClose?.();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-4">
        <button type="button" onClick={() => go("studio")} aria-label="Voxel home">
          <Logo />
        </button>
        {onClose && (
          <button type="button" onClick={onClose} className="icon-btn lg:hidden" aria-label="Close menu">
            <Icon name="close" size={16} />
          </button>
        )}
      </div>

      <div className="scroll-slim flex-1 overflow-y-auto px-3 pb-4">
        <p className="label-mono px-2.5 pt-4 pb-2">Workspace</p>
        <nav className="space-y-0.5">
          {WORKSPACE_NAV.map((item) => (
            <NavItem
              key={item}
              page={item}
              active={page === item}
              onClick={() => go(item)}
              badge={item === "history" && takes.length > 0 ? String(takes.length) : undefined}
            />
          ))}
        </nav>

        <p className="label-mono px-2.5 pt-6 pb-2">Resources</p>
        <nav className="space-y-0.5">
          <NavItem page="docs" active={page === "docs"} onClick={() => go("docs")} />
          <a
            href="https://docs.puter.com/AI/txt2speech/"
            target="_blank"
            rel="noreferrer"
            className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-lab-muted transition-colors hover:bg-white/[0.03] hover:text-lab-cream"
          >
            <Icon name="external" size={16} className="shrink-0 text-lab-faint group-hover:text-lab-muted" />
            <span className="flex-1 truncate">Puter.js docs</span>
            <Icon name="arrowUpRight" size={12} className="text-lab-faint" />
          </a>
          <a
            href="https://elevenlabs.io/"
            target="_blank"
            rel="noreferrer"
            className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-lab-muted transition-colors hover:bg-white/[0.03] hover:text-lab-cream"
          >
            <Icon name="external" size={16} className="shrink-0 text-lab-faint group-hover:text-lab-muted" />
            <span className="flex-1 truncate">ElevenLabs</span>
            <Icon name="arrowUpRight" size={12} className="text-lab-faint" />
          </a>
        </nav>

        <div className="mt-6 rounded-xl border border-lab-line bg-[#0b0c0e] p-3">
          <div className="flex items-center gap-2">
            <span className="relative flex size-1.5">
              <span
                className={cn(
                  "absolute inline-flex size-full rounded-full",
                  puterReady ? "animate-ping bg-lab-lime/60" : "bg-amber-400/60",
                )}
              />
              <span
                className={cn("relative inline-flex size-1.5 rounded-full", puterReady ? "bg-lab-lime" : "bg-amber-400")}
              />
            </span>
            <span className="font-mono text-[9px] tracking-[0.14em] text-lab-muted uppercase">
              {puterReady ? "Puter.js ready" : "Connecting to Puter"}
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-lab-faint">
            No API keys. No backend. Each generation runs on your own Puter account.
          </p>
          <button
            type="button"
            onClick={() => go("docs")}
            className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-lab-lime/90 transition-colors hover:text-lab-lime"
          >
            How it works <Icon name="arrowRight" size={12} />
          </button>
        </div>
      </div>

      <div className="border-t border-lab-line p-3">
        <button
          type="button"
          onClick={signIn}
          disabled={authBusy}
          className="flex w-full items-center gap-2.5 rounded-xl border border-lab-line bg-white/[0.02] p-2 text-left transition-colors hover:border-lab-line2 hover:bg-white/[0.04] disabled:opacity-60"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-lab-panel3 to-lab-panel2 text-lab-muted ring-1 ring-lab-line2 ring-inset">
            <Icon name={user ? "user" : "lock"} size={14} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-medium text-lab-cream">
              {user ? `@${user}` : authBusy ? "Opening Puter…" : "Sign in with Puter"}
            </span>
            <span className="block truncate font-mono text-[9px] tracking-wide text-lab-faint uppercase">
              {user ? "Account connected" : "Free · user-pays"}
            </span>
          </span>
          <Icon name={user ? "check" : "arrowUpRight"} size={13} className="shrink-0 text-lab-faint" />
        </button>
        <p className="mt-2.5 px-1 font-mono text-[9px] tracking-wide text-lab-faint/70">
          VOXEL v1.0 · ELEVENLABS V3 READY
        </p>
      </div>
    </div>
  );
}

export function Shell({
  page,
  onNavigate,
  children,
}: {
  page: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { requestNewTake } = useLab();
  const meta = PAGE_META[page];

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-lab-line bg-[#0a0b0c]/90 backdrop-blur-xl lg:block">
        <SidebarContent page={page} onNavigate={onNavigate} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="animate-rise absolute inset-y-0 left-0 w-[280px] border-r border-lab-line bg-[#0a0b0c]">
            <SidebarContent page={page} onNavigate={onNavigate} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 border-b border-lab-line bg-lab-bg/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="icon-btn lg:hidden"
              aria-label="Open menu"
            >
              <Icon name="menu" size={17} />
            </button>

            <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase">
              <span className="hidden text-lab-faint sm:inline">Workspace</span>
              <Icon name="chevronRight" size={11} className="hidden text-lab-faint/60 sm:inline" />
              <span className="truncate text-lab-cream/90">{meta.title}</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full border border-lab-line bg-white/[0.02] px-2.5 py-1 font-mono text-[9px] tracking-[0.12em] text-lab-muted uppercase md:inline-flex">
                <span className="size-1 rounded-full bg-lab-lime" />
                ElevenLabs · via Puter
              </span>
              <a
                href="https://developer.puter.com/tutorials/free-unlimited-elevenlabs-api/"
                target="_blank"
                rel="noreferrer"
                className="btn-ghost hidden sm:inline-flex"
              >
                <Icon name="book" size={14} />
                API guide
              </a>
              <button
                type="button"
                onClick={() => {
                  requestNewTake();
                  onNavigate("studio");
                }}
                className="btn-lime !px-3 !py-2 text-[12px]"
              >
                <Icon name="plus" size={14} />
                New take
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 pt-6 pb-10 sm:px-6 lg:px-8 lg:pt-8">{children}</main>

        <footer className="mx-auto w-full max-w-[1440px] border-t border-lab-line px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-3 text-[11px] text-lab-faint sm:flex-row sm:items-center">
            <p className="flex items-center gap-2">
              <Icon name="waveform" size={13} className="text-lab-lime/70" />
              Voxel is an independent voice lab. Audio generated with ElevenLabs via Puter.js.
            </p>
            <div className="flex items-center gap-4 font-mono text-[10px] tracking-wide uppercase">
              <a
                href="https://docs.puter.com/AI/txt2speech/"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-lab-cream"
              >
                txt2speech
              </a>
              <a
                href="https://docs.puter.com/AI/speech2speech/"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-lab-cream"
              >
                speech2speech
              </a>
              <span className="text-lab-faint/60">No keys stored</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
