"use client";
import { useActionState, useState } from "react";
import { saveBook } from "@/app/bureau/actions";
import type { Book, Category } from "@/lib/types";
import { READING_STATUSES, STATUS_LABELS, VISIBILITIES, VISIBILITY_LABELS } from "@/lib/types";
import { Feedback, Submit } from "./FormStatus";

type Candidate = {
  source: "openlibrary" | "googlebooks";
  sourceId: string;
  title: string;
  author: string | null;
  year: number | null;
  pages: number | null;
  isbn: string | null;
  publisher: string | null;
  coverUrl: string | null;
  description: string | null;
  genres: string[];
  language: string | null;
};

const SOURCE_LABEL = { openlibrary: "Open Library", googlebooks: "Google Books", wikidata: "Wikidata", drive: "Mon carnet (Drive)", manual: "Saisie", scryptorium: "Rédaction SCRYPTORIUM" } as const;

type Values = Record<
  "title" | "author" | "originalTitle" | "authorNationality" | "originalLanguage" | "edition" | "publisher" | "year" | "pages" | "isbn" | "coverUrl" | "color" | "genres" | "themes" | "summary" | "spoilerAnalysis" | "editorial" | "status" | "rating" | "readStartedAt" | "readFinishedAt" | "currentPage" | "visibility" | "driveRefs" | "slug",
  string
>;

function initial(book: Book | null, scale: 5 | 10): Values {
  return {
    title: book?.title ?? "",
    author: book?.author ?? "",
    originalTitle: book?.originalTitle ?? "",
    authorNationality: book?.authorNationality ?? "",
    originalLanguage: book?.originalLanguage ?? "",
    edition: book?.edition ?? "",
    publisher: book?.publisher ?? "",
    year: book?.year?.toString() ?? "",
    pages: book?.pages?.toString() ?? "",
    isbn: book?.isbn ?? "",
    coverUrl: book?.coverUrl ?? "",
    color: book?.color ?? "#51252C",
    genres: book?.genres.join(", ") ?? "",
    themes: book?.themes.join(", ") ?? "",
    summary: book?.summary ?? "",
    spoilerAnalysis: book?.spoilerAnalysis ?? "",
    editorial: book?.editorial ?? "",
    status: book?.status ?? "",
    rating: book?.rating != null ? String(scale === 5 ? book.rating / 2 : book.rating) : "",
    readStartedAt: book?.readStartedAt ?? "",
    readFinishedAt: book?.readFinishedAt ?? "",
    currentPage: book?.currentPage?.toString() ?? "",
    visibility: book?.visibility ?? "draft",
    driveRefs: book?.driveRefs.join("\n") ?? "",
    slug: book?.slug ?? "",
  };
}

export function BookForm({ book, categories, ratingScale }: { book: Book | null; categories: Category[]; ratingScale: 5 | 10 }) {
  const [state, action] = useActionState(saveBook, null);
  const [v, setV] = useState<Values>(() => initial(book, ratingScale));
  const [sources, setSources] = useState<Record<string, string>>(book?.sources ?? {});
  const [cats, setCats] = useState<string[]>(book?.categoryIds ?? []);
  const [summarySpoilers, setSummarySpoilers] = useState(book?.summarySpoilers ?? false);
  const [lookup, setLookup] = useState<{ loading: boolean; candidates: Candidate[]; errors: string[]; done: boolean }>({ loading: false, candidates: [], errors: [], done: false });

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setV((s) => ({ ...s, [k]: value }));
    setSources((s) => ({ ...s, [k]: "manual" }));
  };

  async function search() {
    if (!v.title.trim()) return;
    setLookup({ loading: true, candidates: [], errors: [], done: false });
    try {
      const r = await fetch(`/api/metadata?title=${encodeURIComponent(v.title)}&author=${encodeURIComponent(v.author)}`);
      const d = await r.json();
      setLookup({ loading: false, candidates: d.candidates ?? [], errors: d.errors ?? (d.error ? [d.error] : []), done: true });
    } catch {
      setLookup({ loading: false, candidates: [], errors: ["Recherche impossible (réseau)."], done: true });
    }
  }

  /** Applies only the fields the API actually returned; empty fields stay untouched. */
  function apply(c: Candidate) {
    const patch: Partial<Values> = {};
    const src: Record<string, string> = {};
    const put = (k: keyof Values, val: string | number | null | undefined) => {
      if (val === null || val === undefined || val === "") return;
      patch[k] = String(val);
      src[k] = c.source;
    };
    if (!v.author) put("author", c.author);
    put("year", c.year);
    put("pages", c.pages);
    put("isbn", c.isbn);
    put("publisher", c.publisher);
    put("coverUrl", c.coverUrl);
    put("originalLanguage", c.language);
    if (c.genres.length) put("genres", c.genres.slice(0, 5).join(", "));
    if (c.description && !v.summary) put("summary", c.description);
    if (c.title && c.title.toLowerCase() !== v.title.trim().toLowerCase() && !v.originalTitle) put("originalTitle", c.title);
    setV((s) => ({ ...s, ...patch }));
    setSources((s) => ({ ...s, ...src }));
  }

  const field = (k: keyof Values, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="label flex justify-between gap-2">
        {label}
        {sources[k] && sources[k] !== "manual" && <span className="normal-case tracking-normal text-gold-soft">via {SOURCE_LABEL[sources[k] as keyof typeof SOURCE_LABEL] ?? sources[k]} — à vérifier</span>}
      </span>
      <input name={k} value={v[k]} onChange={set(k)} className="field" {...props} />
    </label>
  );

  return (
    <form action={action} className="space-y-12">
      <input type="hidden" name="id" value={book?.id ?? ""} />
      <input type="hidden" name="sources" value={JSON.stringify(sources)} />

      <section className="panel space-y-6 p-6 md:p-8">
        <h2 className="display text-3xl">Identité de l&apos;ouvrage</h2>
        <div className="grid gap-5 md:grid-cols-2">
          {field("title", "Titre *", { required: true, maxLength: 300 })}
          {field("author", "Auteur *", { required: true, maxLength: 200 })}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={search} className="btn btn-ghost border-gold-soft" disabled={lookup.loading || !v.title.trim()}>
            {lookup.loading ? "Consultation des catalogues…" : "Rechercher les métadonnées"}
          </button>
          <p className="text-xs text-muted">Open Library & Google Books. Rien n&apos;est enregistré sans votre validation.</p>
        </div>
        {lookup.done && (
          <div className="space-y-3">
            {lookup.errors.map((e) => <p key={e} className="text-sm text-[#e3949e]">{e}</p>)}
            {lookup.candidates.length === 0 ? (
              <p className="text-sm text-muted">Aucune notice trouvée : complétez les champs manuellement.</p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {lookup.candidates.map((c) => (
                  <li key={c.source + c.sourceId} className="flex gap-4 border border-line p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {c.coverUrl ? <img src={c.coverUrl} alt="" className="h-24 w-16 shrink-0 object-cover" loading="lazy" /> : <div className="h-24 w-16 shrink-0 bg-walnut" />}
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-[family-name:var(--font-display)] text-lg leading-tight text-cream">{c.title}</p>
                      <p className="text-muted">{c.author ?? "Auteur inconnu"} · {c.year ?? "année ?"} · {c.pages ? `${c.pages} p.` : "pages ?"}</p>
                      <p className="mt-1 text-[0.62rem] uppercase tracking-[0.2em] text-gold-soft">{SOURCE_LABEL[c.source]}{c.description ? " · description" : ""}</p>
                      <button type="button" onClick={() => apply(c)} className="mt-2 text-xs uppercase tracking-[0.2em] text-gold hover:text-gold-bright">Utiliser cette notice →</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="grid gap-5 md:grid-cols-3">
          {field("originalTitle", "Titre original")}
          {field("year", "Année de publication", { inputMode: "numeric", pattern: "-?[0-9]{1,4}" })}
          {field("pages", "Pages (votre édition)", { inputMode: "numeric", pattern: "[0-9]{1,5}" })}
          {field("authorNationality", "Nationalité de l'auteur")}
          {field("originalLanguage", "Langue originale")}
          {field("isbn", "ISBN")}
          {field("publisher", "Éditeur")}
          {field("edition", "Édition / collection")}
          {field("slug", "Adresse (slug)", { placeholder: "générée depuis le titre" })}
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {field("genres", "Genres (séparés par des virgules)")}
          {field("themes", "Thèmes (séparés par des virgules)")}
        </div>
      </section>

      <section className="panel space-y-6 p-6 md:p-8">
        <h2 className="display text-3xl">Couverture & reliure</h2>
        <div className="grid gap-6 md:grid-cols-[1fr_1fr_auto]">
          {field("coverUrl", "URL de couverture")}
          <label className="block">
            <span className="label">…ou importer une image</span>
            <input type="file" name="coverFile" accept="image/jpeg,image/png,image/webp,image/avif" className="field file:mr-3 file:border-0 file:bg-gold/20 file:px-3 file:py-1 file:text-cream" />
          </label>
          <label className="block">
            <span className="label">Couleur de reliure</span>
            <input type="color" name="color" value={v.color} onChange={set("color")} className="h-[46px] w-20 cursor-pointer border border-line bg-transparent" />
          </label>
        </div>
        {v.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.coverUrl} alt="Aperçu de la couverture" className="h-40 w-auto border border-line" />
        )}
      </section>

      <section className="panel space-y-6 p-6 md:p-8">
        <h2 className="display text-3xl">Rayonnages</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const on = cats.includes(c.id);
            return (
              <label key={c.id} className={`cursor-pointer border px-4 py-2 text-sm transition-colors ${on ? "border-gold bg-gold/15 text-gold-bright" : "border-line text-muted hover:text-cream"}`}>
                <input type="checkbox" name="categoryIds" value={c.id} checked={on} onChange={() => setCats((s) => (on ? s.filter((x) => x !== c.id) : [...s, c.id]))} className="sr-only" />
                {c.name}
              </label>
            );
          })}
        </div>
      </section>

      <section className="panel space-y-6 p-6 md:p-8">
        <h2 className="display text-3xl">Ma lecture</h2>
        <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-5">
          <label className="block">
            <span className="label">Statut</span>
            <select name="status" value={v.status} onChange={set("status")} className="field">
              <option value="">— non renseigné —</option>
              {READING_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </label>
          {field("rating", `Ma note (sur ${ratingScale})`, { inputMode: "decimal", pattern: "[0-9]+([.,][0-9])?", placeholder: "laisser vide si non noté" })}
          {field("readStartedAt", "Commencé le", { type: "date" })}
          {field("readFinishedAt", "Terminé le", { type: "date" })}
          {field("currentPage", "Page actuelle (Scriptorium)", { inputMode: "numeric", pattern: "[0-9]{1,5}", placeholder: "pendant la lecture" })}
        </div>
      </section>

      <section className="panel space-y-6 p-6 md:p-8">
        <h2 className="display text-3xl">Textes</h2>
        <p className="text-sm text-muted">Mise en forme : <code>## Titre</code>, <code>- liste</code>, <code>**gras**</code>, <code>*italique*</code>, <code>&gt; citation</code>.</p>
        <label className="block">
          <span className="label flex justify-between">Résumé — sans révélation {sources.summary && sources.summary !== "manual" && <span className="normal-case tracking-normal text-gold-soft">via {SOURCE_LABEL[sources.summary as keyof typeof SOURCE_LABEL]} — à relire</span>}</span>
          <textarea name="summary" value={v.summary} onChange={set("summary")} rows={14} className="field" />
        </label>
        <label className="flex items-center gap-3 text-sm text-muted">
          <input type="checkbox" name="summarySpoilers" checked={summarySpoilers} onChange={(e) => setSummarySpoilers(e.target.checked)} className="accent-[#c3a16b]" />
          Ce résumé révèle des éléments de l&apos;intrigue (affiche un avertissement au-dessus)
        </label>
        <label className="block">
          <span className="label">Analyse avec spoilers (masquée par défaut)</span>
          <textarea name="spoilerAnalysis" value={v.spoilerAnalysis} onChange={set("spoilerAnalysis")} rows={8} className="field" />
        </label>
        <label className="block">
          <span className="label">Éditorial « Coup de cœur » (optionnel)</span>
          <textarea name="editorial" value={v.editorial} onChange={set("editorial")} rows={6} className="field" />
        </label>
        <label className="block">
          <span className="label">Références Google Drive (une par ligne, restent privées)</span>
          <textarea name="driveRefs" value={v.driveRefs} onChange={set("driveRefs")} rows={2} className="field font-[family-name:var(--font-sans)] text-sm" />
        </label>
      </section>

      <div className="sticky bottom-0 z-10 -mx-5 flex flex-wrap items-center gap-4 border-t border-line bg-ink/95 px-5 py-4 backdrop-blur md:-mx-12 md:px-12">
        <label className="flex items-center gap-3">
          <span className="label mb-0">Fiche</span>
          <select name="visibility" value={v.visibility} onChange={set("visibility")} className="field w-auto">
            {VISIBILITIES.map((x) => <option key={x} value={x}>{VISIBILITY_LABELS[x]}</option>)}
          </select>
        </label>
        <Submit>{book ? "Enregistrer" : "Créer la fiche"}</Submit>
        <Feedback state={state} />
      </div>
    </form>
  );
}
