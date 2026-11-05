import { useCallback, useEffect, useState } from "react";
import { LabProvider } from "./store";
import { PAGE_META, Shell, type Page } from "./components/Shell";
import { Studio } from "./pages/Studio";
import { Voices } from "./pages/Voices";
import { VoiceChanger } from "./pages/VoiceChanger";
import { History } from "./pages/History";
import { Docs } from "./pages/Docs";

const PAGES = Object.keys(PAGE_META) as Page[];

function pageFromHash(): Page | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#\/?/, "");
  return PAGES.includes(hash as Page) ? (hash as Page) : null;
}

export default function App() {
  const [page, setPage] = useState<Page>(() => pageFromHash() ?? "studio");

  useEffect(() => {
    const onHashChange = () => {
      const next = pageFromHash();
      if (next) setPage(next);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    document.title = `${PAGE_META[page].title} — Voxel AI Voice Lab`;
  }, [page]);

  const navigate = useCallback((next: Page) => {
    setPage(next);
    if (window.location.hash !== `#${next}`) {
      window.history.pushState(null, "", `#${next}`);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <LabProvider>
      <Shell page={page} onNavigate={navigate}>
        {page === "studio" && <Studio onNavigate={navigate} />}
        {page === "voices" && <Voices onNavigate={navigate} />}
        {page === "changer" && <VoiceChanger onNavigate={navigate} />}
        {page === "history" && <History onNavigate={navigate} />}
        {page === "docs" && <Docs onNavigate={navigate} />}
      </Shell>
    </LabProvider>
  );
}
