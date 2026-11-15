"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { arrival, type Passage } from "@/lib/passage";
import { Emblem } from "../Emblem";
import { PassageVeil } from "../PassageVeil";
import { PlanOverlay } from "../PlanOverlay";
import type { ChartrierData, ChartrierFocus } from "./ChartrierScene";

const ChartrierScene = dynamic(() => import("./ChartrierScene"), { ssr: false, loading: () => null });

export type ChartrierView = ChartrierData & {
  pagesNote: string;
  byGenre: [string, number][];
  byYear: [string, number][];
  goal: { year: number; target: number; done: number } | null;
  timelineFull: { id: string; slug: string; date: string; title: string; author: string }[];
};

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function Ledger({ title, rows, total }: { title: string; rows: [string, number][]; total: number }) {
  return (
    <section className="mt-6">
      <h3 className="eyebrow">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 font-[family-name:var(--font-serif)] italic text-muted">Rien à consigner pour l&apos;instant.</p>
      ) : (
        <ol className="mt-3 space-y-2.5">
          {rows.slice(0, 8).map(([k, v]) => (
            <li key={k}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-[family-name:var(--font-serif)] text-base text-parchment">{k}</span>
                <span className="tabular-nums text-gold-soft">{v}</span>
              </div>
              <div className="mt-1 h-px bg-line">
                <div className="h-px bg-gold" style={{ width: `${(v / Math.max(total, 1)) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const SPOTS: { id: ChartrierFocus; label: string }[] = [
  { id: "register", label: "Le registre" },
  { id: "casiers", label: "Les casiers" },
  { id: "roll", label: "Le rouleau" },
];

export function ChartrierExperience({ view }: { view: ChartrierView }) {
  const [support, setSupport] = useState<"checking" | "ok" | "none">("checking");
  const [lowPower, setLowPower] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [veil, setVeil] = useState(true);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [focus, setFocus] = useState<ChartrierFocus>("overview");

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
      if (e.key === "Escape" && focus !== "overview") setFocus("overview");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus]);

  const maxYear = Math.max(1, ...view.byYear.map(([, n]) => n));
  const subtitle =
    focus === "register" ? "Le registre des annales : les chiffres tirés des fiches publiées."
      : focus === "casiers" ? "Une colonne par rayonnage, un rouleau scellé par livre lu."
        : focus === "roll" ? "Le rouleau de la chronologie, une ligne par lecture datée."
          : "Les registres du bibliothécaire : approchez-vous du registre, des casiers ou du rouleau.";

  return (
    <div className="fixed inset-0 bg-[#0b0908]">
      <div className="absolute inset-0" aria-hidden>
        {support === "ok" && fontsReady && (
          <ChartrierScene data={view} focus={focus} onFocus={setFocus} lowPower={lowPower}
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
          {focus !== "overview" && (
            <button type="button" onClick={() => setFocus("overview")} className="btn btn-ghost px-3 py-2 text-[0.68rem] tracking-[0.18em]">Toute la salle</button>
          )}
          <PlanOverlay current="chartrier" />
        </div>
      </div>

      <div className="pointer-events-none absolute left-4 top-20 md:left-8 md:top-24">
        <p className="eyebrow">L&apos;abbaye · Chartarium</p>
        <h1 className="display mt-2 text-4xl md:text-6xl">Le Chartrier</h1>
        <p className="mt-2 max-w-sm font-[family-name:var(--font-serif)] text-parchment/80">{subtitle}</p>
        <div className="pointer-events-auto mt-4 flex flex-wrap gap-2">
          {SPOTS.map((s) => (
            <button key={s.id} type="button" aria-pressed={focus === s.id} onClick={() => setFocus(focus === s.id ? "overview" : s.id)}
              className={`btn btn-ghost px-3 py-2 text-[0.65rem] tracking-[0.18em] ${focus === s.id ? "border-gold text-gold" : ""}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <aside className="absolute inset-x-3 bottom-3 max-h-[46svh] overflow-y-auto border border-line bg-ink/85 p-5 backdrop-blur-md md:inset-x-auto md:bottom-auto md:right-8 md:top-24 md:max-h-[calc(100svh-8rem)] md:w-[400px] md:p-7">
        <p className="eyebrow">Le cabinet des lectures</p>
        <p className="mt-2 font-[family-name:var(--font-serif)] text-sm italic text-muted">
          Chaque chiffre est tiré des fiches publiées. Rien n&apos;est estimé, rien n&apos;est arrondi pour faire bonne figure.
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-px border border-line bg-line">
          {[
            ["Livres lus", String(view.finished)],
            ["En cours", String(view.reading)],
            ["Pages lues", view.pages],
            ["Note moyenne", view.rating],
          ].map(([k, v]) => (
            <div key={k} className="bg-ink p-4">
              <dt className="label">{k}</dt>
              <dd className="font-[family-name:var(--font-display)] text-3xl text-cream">{v}</dd>
            </div>
          ))}
        </dl>
        {view.pagesNote && <p className="mt-2 text-xs text-muted">{view.pagesNote}</p>}

        {view.goal && (
          <section className="mt-6">
            <h3 className="eyebrow">Objectif {view.goal.year}</h3>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl text-cream">{view.goal.done} / {view.goal.target} livres</p>
            <div className="mt-2 h-1 bg-line"><div className="h-1 bg-gold" style={{ width: `${Math.min(100, (view.goal.done / Math.max(view.goal.target, 1)) * 100)}%` }} /></div>
          </section>
        )}

        <Ledger title="Par auteur" rows={view.byAuthor} total={view.finished} />
        <Ledger title="Par rayonnage" rows={view.byShelf} total={view.finished} />
        <Ledger title="Par genre" rows={view.byGenre} total={view.finished} />

        <section className="mt-6">
          <h3 className="eyebrow">Livres lus par année</h3>
          {view.byYear.length === 0 ? (
            <p className="mt-3 font-[family-name:var(--font-serif)] italic text-muted">Renseignez la date de fin de lecture pour voir apparaître les années.</p>
          ) : (
            <div className="mt-4 flex h-32 items-end gap-3" role="img" aria-label={view.byYear.map(([y, n]) => `${y} : ${n}`).join(", ")}>
              {view.byYear.map(([y, n]) => (
                <div key={y} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-xs tabular-nums text-gold-soft">{n}</span>
                  <div className="w-full max-w-10 bg-gradient-to-t from-bordeaux to-gold/80" style={{ height: `${(n / maxYear) * 90}px` }} />
                  <span className="text-xs tabular-nums text-muted">{y}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6">
          <h3 className="eyebrow">Chronologie</h3>
          {view.timelineFull.length === 0 ? (
            <p className="mt-3 font-[family-name:var(--font-serif)] italic text-muted">La chronologie commencera avec la première lecture datée.</p>
          ) : (
            <ol className="mt-4 space-y-4 border-l border-line pl-5">
              {view.timelineFull.map((b) => (
                <li key={b.id}>
                  <p className="text-[0.65rem] uppercase tracking-[0.2em] text-gold-soft">{b.date}</p>
                  <Link href={`/livres/${b.slug}`} className="font-[family-name:var(--font-display)] text-xl text-cream hover:text-gold-bright">{b.title}</Link>
                  <p className="text-sm text-muted">{b.author}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </aside>
    </div>
  );
}
