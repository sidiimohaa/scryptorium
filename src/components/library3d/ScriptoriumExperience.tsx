"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Emblem } from "../Emblem";
import type { ScriptoriumBook } from "./ScriptoriumScene";
import type { CopyistNote } from "./types";

const ScriptoriumScene = dynamic(() => import("./ScriptoriumScene"), { ssr: false, loading: () => null });

export type ScriptoriumNote = {
  id: string;
  kind: string;
  kindLabel: string;
  pageRef: string | null;
  content: string;
};

export type ScriptoriumEntry = ScriptoriumBook & {
  readStartedAt: string | null;
  /** Notes publiques uniquement, de la plus récente à la plus ancienne. */
  notes: ScriptoriumNote[];
};

const reducedMotion = () =>
  document.documentElement.dataset.motion === "reduced" || matchMedia("(prefers-reduced-motion: reduce)").matches;

const frenchDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, s.lastIndexOf(" ", max))}…` : s);

/** Relevé d'avancement : uniquement ce que le bibliothécaire a saisi. */
function progressLine(b: ScriptoriumEntry): string {
  if (b.currentPage != null && b.pages) return `Arrivé à la page ${b.currentPage} sur ${b.pages}.`;
  if (b.currentPage != null) return `Arrivé à la page ${b.currentPage}.`;
  if (b.readStartedAt) return `Lecture commencée le ${frenchDate(b.readStartedAt)}.`;
  return "Lecture en cours.";
}

function sheetFor(b: ScriptoriumEntry, note: ScriptoriumNote | null, instant: boolean): CopyistNote {
  const base = { key: Date.now(), title: b.title, author: b.author, year: b.year, instant };
  if (!note) return { ...base, heading: "Lecture en cours", phrase: progressLine(b), quoted: false };
  return {
    ...base,
    heading: note.pageRef ? `${note.kindLabel} · page ${note.pageRef}` : note.kindLabel,
    phrase: clip(note.content, 260),
    quoted: note.kind === "quote",
  };
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function ScriptoriumExperience({ entries }: { entries: ScriptoriumEntry[] }) {
  const [support, setSupport] = useState<"checking" | "ok" | "none">("checking");
  const [lowPower, setLowPower] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [veil, setVeil] = useState(true);
  const [index, setIndex] = useState(0);
  const [copyist, setCopyist] = useState<CopyistNote | null>(null);
  const [writing, setWriting] = useState(false);
  const entry = entries[index] ?? null;

  const write = useCallback(
    (e: ScriptoriumEntry, note: ScriptoriumNote | null, instant = false) => {
      setCopyist(sheetFor(e, note, instant || reducedMotion()));
      setWriting(true);
    },
    [],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only state after hydration
    setSupport(hasWebGL() ? "ok" : "none");
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("scr-perf");
    } catch {}
    const weak = (navigator.hardwareConcurrency ?? 8) <= 4 || matchMedia("(max-width: 767px)").matches;
    setLowPower(stored ? stored === "low" : weak);
    if (!hasWebGL()) setVeil(false);
    document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  // Le copiste se met à l'ouvrage : la note publique la plus récente, sinon le relevé d'avancement.
  useEffect(() => {
    if (!fontsReady || !entry) return;
    const t = setTimeout(() => write(entry, entry.notes[0] ?? null), 900);
    return () => clearTimeout(t);
  }, [fontsReady, entry, write]);

  const onReady = useCallback(() => setTimeout(() => setVeil(false), 120), []);

  const pct = entry?.pages && entry.currentPage != null ? Math.min(100, Math.round((entry.currentPage / entry.pages) * 100)) : null;

  return (
    <div className="fixed inset-0 bg-[#0b0908]">
      <div className="absolute inset-0" aria-hidden>
        {support === "ok" && fontsReady && (
          <ScriptoriumScene
            book={entry}
            copyist={copyist}
            onCopyistDone={() => setWriting(false)}
            lowPower={lowPower}
            onDecline={() => setLowPower(true)}
            onReady={onReady}
          />
        )}
      </div>
      <div className={`pointer-events-none absolute inset-0 bg-[#0b0908] transition-opacity duration-[1400ms] ${veil ? "opacity-100" : "opacity-0"}`} />

      {/* barre du haut */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 md:p-6">
        <Link href="/" className="pointer-events-auto flex items-center gap-3 text-gold" aria-label="SCRYPTORIUM — accueil">
          <Emblem className="h-9 w-9" />
          <span className="hidden font-[family-name:var(--font-display)] tracking-[0.34em] text-cream sm:inline">SCRYPTORIUM</span>
        </Link>
        <Link href="/abbaye" className="btn btn-ghost pointer-events-auto px-3 py-2 text-[0.68rem] tracking-[0.18em]">Plan de l&apos;abbaye</Link>
      </div>

      <div className="pointer-events-none absolute left-4 top-20 md:left-8 md:top-24">
        <p className="eyebrow">L&apos;abbaye · Scriptorium</p>
        <h1 className="display mt-2 text-4xl md:text-6xl">Le Scriptorium</h1>
      </div>

      {writing && (
        <button type="button" onClick={() => setCopyist((c) => (c ? { ...c, key: c.key + 1, instant: true } : c))}
          className="btn btn-ghost absolute bottom-6 left-4 px-4 py-2 text-[0.68rem] tracking-[0.18em] md:left-8">
          Passer
        </button>
      )}

      {/* panneau de lecture */}
      <aside className="absolute inset-x-3 bottom-3 max-h-[46svh] overflow-y-auto border border-line bg-ink/85 p-5 backdrop-blur-md md:inset-x-auto md:bottom-auto md:right-8 md:top-24 md:max-h-[calc(100svh-8rem)] md:w-[380px] md:p-7">
        {!entry ? (
          <>
            <p className="eyebrow">Lecture en cours</p>
            <p className="mt-3 font-[family-name:var(--font-serif)] text-lg leading-relaxed text-parchment/85">
              Aucune lecture en cours pour l&apos;instant : le lutrin attend le prochain livre.
            </p>
          </>
        ) : (
          <>
            {entries.length > 1 && (
              <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Lectures en cours">
                {entries.map((e, i) => (
                  <button key={e.id} type="button" role="tab" aria-selected={i === index} onClick={() => setIndex(i)}
                    className={`border px-3 py-1 text-[0.65rem] uppercase tracking-[0.16em] ${i === index ? "border-gold text-gold" : "border-line text-muted"}`}>
                    {e.title}
                  </button>
                ))}
              </div>
            )}
            <p className="eyebrow">Lecture en cours</p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-cream">{entry.title}</h2>
            <p className="mt-1 font-[family-name:var(--font-serif)] italic text-gold-soft">{entry.author}{entry.year ? `, ${entry.year}` : ""}</p>

            <div className="mt-5">
              {pct !== null ? (
                <>
                  <div className="h-1.5 w-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Avancement de la lecture">
                    <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-parchment/85">Page {entry.currentPage} sur {entry.pages} · {pct} %</p>
                </>
              ) : entry.currentPage != null ? (
                <p className="text-sm text-parchment/85">Page {entry.currentPage}</p>
              ) : (
                <p className="text-sm text-muted">Avancement non renseigné.</p>
              )}
              {entry.readStartedAt && <p className="mt-1 text-sm text-muted">Commencé le {frenchDate(entry.readStartedAt)}</p>}
            </div>

            <div className="mt-6 border-t border-line pt-5">
              <p className="eyebrow">Feuillets · {entry.notes.length}</p>
              {entry.notes.length === 0 ? (
                <p className="mt-2 text-sm text-muted">Aucune note publique pour l&apos;instant.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {entry.notes.map((n) => (
                    <li key={n.id} className="border-l border-gold/40 pl-3">
                      <p className="text-[0.65rem] uppercase tracking-[0.18em] text-gold">{n.kindLabel}{n.pageRef ? ` · p. ${n.pageRef}` : ""}</p>
                      <p className="mt-1 line-clamp-3 font-[family-name:var(--font-serif)] text-parchment/85">{n.content}</p>
                      <button type="button" onClick={() => write(entry, n)} className="link-gilt mt-1 text-[0.65rem] uppercase tracking-[0.18em] text-parchment/70">
                        Faire copier ce feuillet
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" onClick={() => write(entry, null)} className="link-gilt mt-4 text-[0.65rem] uppercase tracking-[0.18em] text-parchment/70">
                Faire copier l&apos;avancement
              </button>
            </div>

            <Link href={`/livres/${entry.slug}`} className="btn mt-6">Ouvrir la fiche</Link>
          </>
        )}
        {support === "none" && <p className="mt-6 text-xs text-muted">La salle en 3D n&apos;est pas disponible sur ce navigateur.</p>}
      </aside>
    </div>
  );
}
