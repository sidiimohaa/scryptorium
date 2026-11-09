"use client";
import { useMemo, useState } from "react";
import type { Book, Category } from "@/lib/types";
import { READING_STATUSES, STATUS_LABELS, type ReadingStatus } from "@/lib/types";
import { BookCard } from "./BookCard";
import Link from "next/link";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
type Sort = "author" | "title" | "year" | "recent";

export function CatalogueBrowser({ books, categories, initialShelf }: { books: Book[]; categories: Category[]; initialShelf?: string }) {
  const [q, setQ] = useState("");
  const [shelf, setShelf] = useState<string>(initialShelf ?? "all");
  const [status, setStatus] = useState<ReadingStatus | "all">("all");
  const [sort, setSort] = useState<Sort>("author");
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    const terms = norm(q).split(/\s+/).filter(Boolean);
    const list = books.filter((b) => {
      if (shelf !== "all" && !b.categoryIds.includes(shelf)) return false;
      if (status !== "all" && b.status !== status) return false;
      if (!terms.length) return true;
      const hay = norm([b.title, b.originalTitle ?? "", b.author, b.genres.join(" "), b.themes.join(" "), String(b.year ?? "")].join(" "));
      return terms.every((t) => hay.includes(t));
    });
    const by: Record<Sort, (a: Book, b: Book) => number> = {
      author: (a, b) => a.author.localeCompare(b.author, "fr") || a.title.localeCompare(b.title, "fr"),
      title: (a, b) => a.title.localeCompare(b.title, "fr"),
      year: (a, b) => (a.year ?? 9999) - (b.year ?? 9999),
      recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    return list.sort(by[sort]);
  }, [books, q, shelf, status, sort]);

  return (
    <div>
      <div className="panel grid gap-4 p-5 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-end">
        <label className="block">
          <span className="label">Rechercher</span>
          <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Titre, auteur, genre, thème…" />
        </label>
        <label className="block">
          <span className="label">Rayonnage</span>
          <select className="field" value={shelf} onChange={(e) => setShelf(e.target.value)}>
            <option value="all">Tous</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Statut</span>
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value as ReadingStatus | "all")}>
            <option value="all">Tous</option>
            {READING_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Classer par</span>
          <select className="field" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="author">Auteur</option>
            <option value="title">Titre</option>
            <option value="year">Année de parution</option>
            <option value="recent">Entrée récente</option>
          </select>
        </label>
        <div className="flex gap-1" role="group" aria-label="Affichage">
          {(["grid", "list"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`btn px-4 ${view === v ? "border-gold text-gold" : "btn-ghost"}`}>
              {v === "grid" ? "Grille" : "Liste"}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-sm text-muted" aria-live="polite">
        {filtered.length} ouvrage{filtered.length > 1 ? "s" : ""} sur {books.length}
      </p>

      {filtered.length === 0 ? (
        <p className="py-24 text-center font-[family-name:var(--font-serif)] text-xl italic text-muted">
          {books.length === 0 ? "Les rayonnages attendent leurs premiers volumes." : "Aucun ouvrage ne correspond à cette recherche."}
        </p>
      ) : view === "grid" ? (
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-14 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      ) : (
        <ol className="mt-8 divide-y divide-line border-y border-line">
          {filtered.map((b) => (
            <li key={b.id}>
              <Link href={`/livres/${b.slug}`} className="grid grid-cols-[1fr_auto] items-baseline gap-4 py-4 transition-colors hover:bg-walnut/50 md:grid-cols-[3fr_2fr_1fr_1fr] md:px-3">
                <span className="font-[family-name:var(--font-display)] text-xl text-cream">{b.title}</span>
                <span className="text-sm text-muted max-md:hidden">{b.author}</span>
                <span className="text-sm tabular-nums text-gold-soft">{b.year ?? "—"}</span>
                <span className="text-[0.62rem] uppercase tracking-[0.2em] text-muted max-md:hidden">{b.status ? STATUS_LABELS[b.status] : ""}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
