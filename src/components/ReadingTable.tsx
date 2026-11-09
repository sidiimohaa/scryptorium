"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/**
 * La Table de Lecture — le visiteur y dépose des ouvrages pour consulter plusieurs fiches
 * sans perdre sa navigation. Conservée dans ce navigateur uniquement.
 */
type Fiche = { slug: string; title: string; author: string; year: number | null; excerpt: string; genres: string[] };
const KEY = "scr-table";

function load(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
function save(slugs: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(slugs));
  } catch {}
  window.dispatchEvent(new Event("scr:table"));
}

export function useTable() {
  const [slugs, setSlugs] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setSlugs(load());
    sync();
    window.addEventListener("scr:table", sync);
    return () => window.removeEventListener("scr:table", sync);
  }, []);
  const toggle = useCallback((slug: string) => {
    const cur = load();
    save(cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug].slice(-8));
  }, []);
  return { slugs, toggle };
}

export function AddToTable({ slug }: { slug: string }) {
  const { slugs, toggle } = useTable();
  const on = slugs.includes(slug);
  return (
    <button type="button" onClick={() => toggle(slug)} aria-pressed={on} className="btn btn-ghost">
      {on ? "Retirer de la table de lecture" : "Déposer sur la table de lecture"}
    </button>
  );
}

export function ReadingTableDock() {
  const { slugs, toggle } = useTable();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [fiches, setFiches] = useState<Record<string, Fiche>>({});

  useEffect(() => {
    slugs
      .filter((s) => !fiches[s])
      .forEach((s) =>
        fetch(`/api/fiche/${s}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((f: Fiche | null) => f && setFiches((m) => ({ ...m, [s]: f }))),
      );
  }, [slugs, fiches]);

  if (slugs.length === 0) return null;
  const shown = active && slugs.includes(active) ? active : slugs[0];
  const current = fiches[shown] ?? null;

  return (
    <div className="fixed bottom-5 left-5 z-50">
      {open && (
        <div role="dialog" aria-label="Table de lecture" className="panel rise mb-3 w-[min(92vw,420px)]">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <p className="eyebrow">La Table de Lecture</p>
            <button type="button" onClick={() => setOpen(false)} className="text-xs uppercase tracking-[0.2em] text-muted hover:text-gold">Fermer</button>
          </div>
          <div className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2" role="tablist">
            {slugs.map((s) => (
              <button key={s} role="tab" aria-selected={shown === s} onClick={() => setActive(s)} className={`shrink-0 px-3 py-1.5 text-left text-xs ${shown === s ? "bg-gold/15 text-gold-bright" : "text-muted hover:text-cream"}`}>
                {fiches[s]?.title ?? "…"}
              </button>
            ))}
          </div>
          <div className="max-h-[50vh] overflow-y-auto p-5" role="tabpanel">
            {!current ? (
              <p className="text-sm text-muted">Choisissez un ouvrage déposé sur la table.</p>
            ) : (
              <>
                <p className="font-[family-name:var(--font-display)] text-2xl text-cream">{current.title}</p>
                <p className="mt-1 text-sm text-gold-soft">{current.author}{current.year ? ` · ${current.year}` : ""}</p>
                {current.excerpt && <p className="mt-4 font-[family-name:var(--font-serif)] leading-relaxed text-parchment/85">{current.excerpt}</p>}
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={`/livres/${current.slug}`} className="btn px-4 py-2">Fiche complète</Link>
                  <button type="button" onClick={() => toggle(current.slug)} className="btn btn-ghost px-4 py-2">Retirer</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="btn gap-3 bg-ink/90 px-4 py-3">
        <span aria-hidden>❦</span> Table de lecture <span className="tabular-nums text-gold">{slugs.length}</span>
      </button>
    </div>
  );
}
