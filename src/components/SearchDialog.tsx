"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Entry = { slug: string; title: string; author: string; year: number | null; genres: string[]; originalTitle: string | null };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

let cache: Entry[] | null = null;

export function SearchButton({ hideTrigger = false }: { hideTrigger?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scr:search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scr:search", onOpen);
    };
  }, []);
  if (hideTrigger) return open ? <SearchDialog onClose={() => setOpen(false)} /> : null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost gap-3 px-3" aria-haspopup="dialog">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
        <span className="hidden sm:inline">Rechercher</span>
        <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-[0.6rem] tracking-normal text-muted md:inline">⌘K</kbd>
      </button>
      {open && <SearchDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<Entry[] | null>(cache);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    input.current?.focus();
    if (!cache)
      fetch("/api/search")
        .then((r) => r.json())
        .then((d: Entry[]) => {
          cache = d;
          setEntries(d);
        })
        .catch(() => setEntries([]));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const results = useMemo(() => {
    if (!entries) return [];
    const terms = norm(q).split(/\s+/).filter(Boolean);
    if (!terms.length) return entries.slice(0, 8);
    return entries
      .filter((e) => {
        const hay = norm([e.title, e.author, e.originalTitle ?? "", e.genres.join(" "), String(e.year ?? "")].join(" "));
        return terms.every((t) => hay.includes(t));
      })
      .slice(0, 12);
  }, [entries, q]);

  const go = useCallback(
    (slug: string) => {
      onClose();
      router.push(`/livres/${slug}`);
    },
    [onClose, router],
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="Recherche universelle" className="fixed inset-0 z-[90] flex items-start justify-center bg-ink/80 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel rise w-full max-w-2xl">
        <div className="flex items-center gap-3 border-b border-line px-5">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-gold" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" />
          </svg>
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === "Enter" && results[active]) go(results[active].slug);
            }}
            placeholder="Un titre, un auteur, un genre…"
            aria-label="Rechercher un ouvrage"
            aria-controls="search-results"
            className="h-16 flex-1 bg-transparent font-[family-name:var(--font-display)] text-2xl text-cream placeholder:text-muted/60 focus:outline-none"
          />
          <button type="button" onClick={onClose} className="text-xs uppercase tracking-[0.2em] text-muted hover:text-gold">Échap</button>
        </div>
        <ul id="search-results" role="listbox" className="max-h-[50vh] overflow-y-auto py-2">
          {entries === null && <li className="px-5 py-6 text-muted">Consultation du registre…</li>}
          {entries !== null && results.length === 0 && (
            <li className="px-5 py-6 font-[family-name:var(--font-serif)] italic text-muted">Aucun ouvrage ne répond à ce nom dans la bibliothèque.</li>
          )}
          {results.map((r, i) => (
            <li key={r.slug} role="option" aria-selected={i === active}>
              <Link
                href={`/livres/${r.slug}`}
                onClick={onClose}
                onMouseEnter={() => setActive(i)}
                className={`flex items-baseline justify-between gap-4 px-5 py-3 transition-colors ${i === active ? "bg-gold/10" : ""}`}
              >
                <span>
                  <span className="font-[family-name:var(--font-display)] text-xl text-cream">{r.title}</span>
                  <span className="ml-3 text-sm text-muted">{r.author}</span>
                </span>
                {r.year && <span className="text-xs tabular-nums text-gold-soft">{r.year}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
