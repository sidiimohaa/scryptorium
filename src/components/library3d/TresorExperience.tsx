"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { arrival, type Passage } from "@/lib/passage";
import { Emblem } from "../Emblem";
import { PassageVeil } from "../PassageVeil";
import { PlanOverlay } from "../PlanOverlay";
import { Prose } from "../Prose";
import type { TreasureBook } from "./TresorScene";

const TresorScene = dynamic(() => import("./TresorScene"), { ssr: false, loading: () => null });

export type TreasureView = TreasureBook & { slug: string; editorial: string };

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function TresorExperience({ books }: { books: TreasureView[] }) {
  const [support, setSupport] = useState<"checking" | "ok" | "none">("checking");
  const [lowPower, setLowPower] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [veil, setVeil] = useState(true);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only state after hydration
    setSupport(hasWebGL() ? "ok" : "none");
    setPassage(arrival());
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("scr-perf");
    } catch {}
    const weak = (navigator.hardwareConcurrency ?? 8) <= 4 || matchMedia("(max-width: 767px)").matches;
    setLowPower(stored ? stored === "low" : weak);
    if (!hasWebGL()) setVeil(false);
    document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current = books.find((b) => b.id === selected) ?? null;
  const index = current ? books.indexOf(current) : -1;
  const go = (d: number) => setSelected(books[(index + d + books.length) % books.length].id);

  return (
    <div className="fixed inset-0 bg-[#0b0908]">
      <div className="absolute inset-0" aria-hidden>
        {support === "ok" && fontsReady && (
          <TresorScene books={books} selected={selected} onSelect={setSelected} lowPower={lowPower}
            onDecline={() => setLowPower(true)} onReady={() => setTimeout(() => setVeil(false), 120)} />
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(12_8_6/0.55)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgb(17_16_15/0.8),rgb(17_16_15/0.3)_38%,transparent_62%)]" />
      <PassageVeil visible={veil} passage={passage} tone="#0b0908" />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 md:p-6">
        <Link href="/" className="pointer-events-auto flex items-center gap-3 text-gold" aria-label="SCRYPTORIUM — accueil">
          <Emblem className="h-9 w-9" />
          <span className="hidden font-[family-name:var(--font-display)] tracking-[0.34em] text-cream sm:inline">SCRYPTORIUM</span>
        </Link>
        <div className="pointer-events-auto flex gap-2">
          {current && (
            <button type="button" onClick={() => setSelected(null)} className="btn btn-ghost px-3 py-2 text-[0.68rem] tracking-[0.18em]">Toute la salle</button>
          )}
          <PlanOverlay current="tresor" />
        </div>
      </div>

      <div className="pointer-events-none absolute left-4 top-20 md:left-8 md:top-24">
        <p className="eyebrow">L&apos;abbaye · Thesaurus</p>
        <h1 className="display mt-2 text-4xl md:text-6xl">Le Trésor</h1>
        <p className="mt-2 max-w-sm font-[family-name:var(--font-serif)] text-parchment/80">
          {books.length ? "Les coups de cœur du bibliothécaire, gardés sous verre : approchez-vous d'une vitrine." : "Le trésor est encore fermé à clé."}
        </p>
      </div>

      <aside className="absolute inset-x-3 bottom-3 max-h-[48svh] overflow-y-auto border border-line bg-ink/85 p-5 backdrop-blur-md md:inset-x-auto md:bottom-auto md:right-8 md:top-24 md:max-h-[calc(100svh-8rem)] md:w-[420px] md:p-7">
        {books.length === 0 ? (
          <>
            <p className="eyebrow">Les coups de cœur</p>
            <p className="mt-3 font-[family-name:var(--font-serif)] text-lg leading-relaxed text-parchment/85">
              Aucun ouvrage n&apos;a encore rejoint le rayonnage « Mes coups de cœur ».
            </p>
          </>
        ) : current ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => setSelected(null)} className="link-gilt text-[0.65rem] uppercase tracking-[0.2em] text-parchment/70">← Tout le trésor</button>
              <div className="flex gap-1">
                <button type="button" onClick={() => go(-1)} aria-label="Vitrine précédente" className="btn btn-ghost px-3 py-1.5 text-xs">‹</button>
                <button type="button" onClick={() => go(1)} aria-label="Vitrine suivante" className="btn btn-ghost px-3 py-1.5 text-xs">›</button>
              </div>
            </div>
            <p className="eyebrow mt-4">{current.author}</p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-cream">{current.title}</h2>
            {current.year && <p className="mt-1 font-[family-name:var(--font-serif)] italic text-gold-soft">{current.year}</p>}
            {current.editorial ? (
              <Prose text={current.editorial} className="mt-5" />
            ) : (
              <p className="mt-5 font-[family-name:var(--font-serif)] italic text-muted">L&apos;éditorial de ce coup de cœur reste à écrire.</p>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href={`/livres/${current.slug}`} className="btn">Lire la fiche</Link>
            </div>
          </>
        ) : (
          <>
            <p className="eyebrow">Les coups de cœur · {books.length}</p>
            <p className="mt-2 font-[family-name:var(--font-serif)] text-sm italic text-muted">Les livres qui ont laissé une trace, chacun accompagné, quand il le mérite, d&apos;un mot du bibliothécaire.</p>
            <ol className="mt-5 space-y-1">
              {books.map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => setSelected(b.id)} className="group flex w-full items-baseline justify-between gap-3 border-b border-line/60 py-2 text-left">
                    <span className="font-[family-name:var(--font-display)] text-lg text-parchment group-hover:text-gold-bright">{b.title}</span>
                    <span className="shrink-0 text-xs text-muted">{b.author}</span>
                  </button>
                </li>
              ))}
            </ol>
          </>
        )}
      </aside>
    </div>
  );
}
