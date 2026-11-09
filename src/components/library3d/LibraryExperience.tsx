"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Emblem } from "../Emblem";
import type { SceneShelf, View } from "./types";

const LibraryScene = dynamic(() => import("./LibraryScene"), { ssr: false, loading: () => null });

export type BookInfo = {
  id: string;
  slug: string;
  title: string;
  author: string;
  year: number | null;
  status: string | null;
  rating: string | null;
  excerpt: string;
  genres: string[];
};

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function LibraryExperience({
  shelves,
  books,
  initialBook,
  initialShelf,
  skipIntro,
}: {
  shelves: SceneShelf[];
  books: Record<string, BookInfo>;
  initialBook?: string;
  initialShelf?: string;
  skipIntro?: boolean;
}) {
  const [support, setSupport] = useState<"checking" | "ok" | "none">("checking");
  const [lowPower, setLowPower] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [view, setView] = useState<View>({ kind: "intro" });
  const pending = useRef<View | null>(null);

  // Resolve deep links (?livre= / ?rayon=) into a target view.
  const deepLink = useMemo<View | null>(() => {
    if (initialBook) {
      const shelf = shelves.findIndex((s) => s.books.some((b) => b.slug === initialBook));
      const book = shelf >= 0 ? shelves[shelf].books.find((b) => b.slug === initialBook) : undefined;
      if (book) return { kind: "book", shelf, bookId: book.id };
    }
    if (initialShelf) {
      const shelf = shelves.findIndex((s) => s.slug === initialShelf);
      if (shelf >= 0) return { kind: "shelf", shelf };
    }
    return null;
  }, [initialBook, initialShelf, shelves]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only state after hydration
    setSupport(hasWebGL() ? "ok" : "none");
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("scr-perf");
    } catch {}
    const weak = (navigator.hardwareConcurrency ?? 8) <= 4 || matchMedia("(max-width: 767px)").matches;
    setLowPower(stored ? stored === "low" : weak);
    const reduced = document.documentElement.dataset.motion === "reduced" || matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem("scr-hall") === "1";
    } catch {}
    if (skipIntro || reduced || seen) setView(deepLink ?? { kind: "hall" });
    else pending.current = deepLink;
    document.fonts.ready.then(() => setFontsReady(true));
  }, [deepLink, skipIntro]);

  const onIntroDone = useCallback(() => {
    try {
      sessionStorage.setItem("scr-hall", "1");
    } catch {}
    setView({ kind: "hall" });
    if (pending.current) {
      const target = pending.current;
      pending.current = null;
      setTimeout(() => setView(target), 2600);
    }
  }, []);

  const back = useCallback(() => {
    setView((v) => (v.kind === "book" ? { kind: "shelf", shelf: v.shelf } : { kind: "hall" }));
  }, []);

  // Keyboard exploration (optional): ←/→ between shelves, Échap to step back, H for the hall.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") back();
      if (e.key.toLowerCase() === "h") setView({ kind: "hall" });
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const d = e.key === "ArrowRight" ? 1 : -1;
        setView((v) => {
          const cur = v.kind === "shelf" || v.kind === "book" ? v.shelf : d > 0 ? -1 : 0;
          return { kind: "shelf", shelf: (cur + d + shelves.length) % shelves.length };
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [back, shelves.length]);

  const togglePerf = () => {
    const next = !lowPower;
    setLowPower(next);
    try {
      localStorage.setItem("scr-perf", next ? "low" : "high");
    } catch {}
  };

  const shelfIndex = view.kind === "shelf" || view.kind === "book" ? view.shelf : null;
  const selected = view.kind === "book" ? books[view.bookId] : null;
  const currentShelf = shelfIndex !== null ? shelves[shelfIndex] : null;
  const allBooks = useMemo(() => Object.values(books).sort((a, b) => a.title.localeCompare(b.title, "fr")), [books]);

  if (support === "none") return <NoWebGL shelves={shelves} />;

  return (
    <div className="fixed inset-0 bg-[#0b0908]">
      <div className="absolute inset-0" aria-hidden>
        {support === "ok" && fontsReady && (
          <LibraryScene shelves={shelves} view={view} lowPower={lowPower} onView={setView} onIntroDone={onIntroDone} onDecline={() => setLowPower(true)} />
        )}
      </div>

      {/* Screen-reader & no-3D access to every book */}
      <nav aria-label="Ouvrages de la salle" className="sr-only">
        <ul>
          {allBooks.map((b) => (
            <li key={b.id}><Link href={`/livres/${b.slug}`}>{b.title} — {b.author}</Link></li>
          ))}
        </ul>
      </nav>

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 md:p-6">
        <Link href="/" className="pointer-events-auto flex items-center gap-3 text-gold" aria-label="Retour à l'accueil">
          <Emblem className="h-9 w-9" />
          <span className="hidden font-[family-name:var(--font-display)] tracking-[0.34em] text-cream sm:inline">SCRYPTORIUM</span>
        </Link>
        <div className="pointer-events-auto flex max-w-[75vw] flex-wrap justify-end gap-0.5 rounded bg-ink/40 backdrop-blur-sm">
          <button type="button" onClick={() => window.dispatchEvent(new Event("scr:search"))} className="btn btn-ghost px-2.5 py-1.5 text-[0.62rem] tracking-[0.18em] md:px-3 md:py-2 md:text-[0.72rem]">Rechercher</button>
          <Link href="/catalogue" className="btn btn-ghost px-2.5 py-1.5 text-[0.62rem] tracking-[0.18em] md:px-3 md:py-2 md:text-[0.72rem]">Catalogue</Link>
          <button type="button" onClick={togglePerf} aria-pressed={lowPower} aria-label="Mode faible performance" className="btn btn-ghost px-2.5 py-1.5 text-[0.62rem] tracking-[0.18em] md:px-3 md:py-2 md:text-[0.72rem]" title="Réduit la résolution, la poussière et les rayons lumineux">
            {lowPower ? "Léger" : "Complet"}
          </button>
        </div>
      </div>

      {/* Intro caption */}
      <div className={`pointer-events-none absolute inset-x-0 top-1/3 text-center transition-opacity duration-1000 ${view.kind === "intro" ? "opacity-100" : "opacity-0"}`}>
        <p className="eyebrow">Les portes s&apos;ouvrent</p>
      </div>

      {/* Shelf caption */}
      {currentShelf && view.kind === "shelf" && (
        <div className="pointer-events-none absolute inset-x-0 top-20 text-center rise">
          <p className="eyebrow">Rayonnage</p>
          <h1 className="display mt-2 text-4xl md:text-5xl">{currentShelf.name}</h1>
          <p className="mt-2 font-[family-name:var(--font-serif)] italic text-muted">
            {currentShelf.books.length === 0 ? "Ce rayonnage attend ses premiers volumes." : `${currentShelf.books.length} ouvrage${currentShelf.books.length > 1 ? "s" : ""} — survolez, puis choisissez un volume.`}
          </p>
          <Link href={`/rayonnages/${currentShelf.slug}`} className="pointer-events-auto link-gilt mt-3 inline-block text-xs uppercase tracking-[0.2em] text-gold">Liste du rayonnage</Link>
        </div>
      )}
      {view.kind === "hall" && (
        <div className="pointer-events-none absolute inset-x-0 top-24 text-center rise">
          <p className="eyebrow">La salle principale</p>
          <p className="mt-3 font-[family-name:var(--font-serif)] text-lg italic text-parchment/80">Choisissez un rayonnage — d&apos;un clic, ou avec les flèches du clavier.</p>
        </div>
      )}

      {/* Book sheet */}
      {selected && (
        <aside aria-label={`Fiche : ${selected.title}`} className="panel rise absolute inset-x-3 bottom-20 max-h-[42vh] overflow-y-auto p-6 md:inset-x-auto md:bottom-auto md:right-8 md:top-1/2 md:max-h-[72vh] md:w-[420px] md:-translate-y-1/2 md:p-8">
          <p className="eyebrow">{selected.genres.join(" · ") || "Ouvrage"}</p>
          <h2 className="display mt-3 text-4xl">{selected.title}</h2>
          <p className="mt-2 font-[family-name:var(--font-serif)] text-lg italic text-gold-bright">
            {selected.author}{selected.year ? `, ${selected.year}` : ""}
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="label">Statut</dt><dd>{selected.status ?? <span className="text-muted">À renseigner</span>}</dd></div>
            <div><dt className="label">Ma note</dt><dd>{selected.rating ?? <span className="text-muted">Non notée</span>}</dd></div>
          </dl>
          {selected.excerpt && <p className="mt-5 font-[family-name:var(--font-serif)] leading-relaxed text-parchment/85">{selected.excerpt}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/livres/${selected.slug}`} className="btn px-4 py-2.5">Ouvrir la fiche</Link>
            <button type="button" onClick={back} className="btn btn-ghost px-4 py-2.5">Replacer dans le rayonnage</button>
          </div>
        </aside>
      )}

      {/* Bottom navigation */}
      <nav aria-label="Rayonnages" className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/80 to-transparent px-3 pb-4 pt-10">
        <div className="mx-auto flex max-w-6xl items-center gap-2">
          <button type="button" onClick={() => setView({ kind: "hall" })} aria-pressed={view.kind === "hall"} className={`btn shrink-0 px-3 py-2 ${view.kind === "hall" ? "border-gold text-gold" : "btn-ghost"}`}>
            Hall
          </button>
          <ul className="flex flex-1 gap-1 overflow-x-auto">
            {shelves.map((s, i) => (
              <li key={s.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setView({ kind: "shelf", shelf: i })}
                  aria-current={shelfIndex === i ? "true" : undefined}
                  className={`px-3 py-2 text-[0.68rem] uppercase tracking-[0.18em] transition-colors ${shelfIndex === i ? "text-gold-bright" : "text-muted hover:text-cream"}`}
                >
                  {s.name}
                  <span className="ml-1.5 tabular-nums text-gold-soft/70">{s.books.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {(!fontsReady || support === "checking") && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Emblem className="candle h-16 w-16 text-gold" />
        </div>
      )}
    </div>
  );
}

function NoWebGL({ shelves }: { shelves: SceneShelf[] }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <Emblem className="mx-auto h-16 w-16 text-gold" />
      <h1 className="display mt-8 text-5xl">La salle reste dans l&apos;ombre</h1>
      <p className="mt-5 font-[family-name:var(--font-serif)] text-lg text-muted">
        Votre navigateur ne permet pas l&apos;affichage 3D (WebGL). Toute la bibliothèque reste accessible :
      </p>
      <ul className="mt-10 grid gap-2 sm:grid-cols-2">
        {shelves.map((s) => (
          <li key={s.id}>
            <Link href={`/rayonnages/${s.slug}`} className="panel block px-5 py-4 text-left font-[family-name:var(--font-display)] text-xl text-cream hover:text-gold">
              {s.name} <span className="text-sm text-muted">· {s.books.length}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/catalogue" className="btn mt-10">Ouvrir le catalogue</Link>
    </div>
  );
}
