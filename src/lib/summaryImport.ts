import "server-only";
import { getRepo } from "./store";
import { parseSummaries, type ParsedSummary } from "./summaries";
import { searchOpenLibrary } from "./metadata";
import { findWorks, workKey } from "./wikidata";
import { FAVORITES_SLUG } from "./categories";
import { hashString } from "./hash";
import { newId, nowIso, slugify } from "./utils";
import type { Book, Category, ImportRecord } from "./types";

/**
 * Transforme un document de résumés (import) en fiches.
 * - Le texte du bibliothécaire est repris tel quel ; sa note et le statut « Terminé » viennent du document.
 * - Les métadonnées complémentaires viennent de Wikidata (année de première publication, titre original)
 *   et d'Open Library (couverture), et sont marquées par leur source pour vérification dans le Bureau.
 * - Les rayonnages sont attribués par règles transparentes (voir `shelvesFor`), modifiables ensuite.
 */

const CLOTH = ["#5A1F27", "#2F3B2E", "#283447", "#4A3420", "#3B2A3F", "#5C3A1E", "#1F3A3A", "#4B1E2E"];

const key = (title: string, author: string | null) =>
  `${slugify(title.replace(/^(le|la|les|l['’])\s*/i, ""))}|${slugify((author ?? "").split(" ").pop() ?? "")}`;

function shelvesFor(s: ParsedSummary, year: number | null, cats: Category[]): string[] {
  const text = s.text.toLowerCase();
  const id = (slug: string) => cats.find((c) => c.slug === slug)?.id;
  const out = new Set<string | undefined>();
  if (/polici|thriller|enquête|meurtre|détective/.test(text)) out.add(id("romans-policiers"));
  if (/fantastique|gothique|science-fiction|surnaturel/.test(text)) out.add(id("fantasy-imaginaire"));
  if (/philosoph|stratégie|sens de l’existence|sens de la vie/.test(text)) out.add(id("philosophie"));
  if (/roman historique|coloni|guerre civile/.test(text)) out.add(id("histoire-civilisation"));
  if (/théâtre|poème|poésie|recueil/.test(text)) out.add(id("theatre-poesie"));
  if (year !== null) out.add(id(year < 1960 ? "litterature-classique" : "litterature-contemporaine"));
  if (s.ratingOutOf5 === 5) out.add(id(FAVORITES_SLUG));
  return [...out].filter((x): x is string => Boolean(x));
}

/**
 * Open Library : titre français, puis titre original. L'auteur est comparé sur le début du nom de famille
 * (« Dostoïevski » / « Dostoyevsky », « Saint-Exupéry » / « Saint-Exupery »), translittérations comprises.
 */
async function lookup(s: ParsedSummary, originalTitle?: string | null) {
  const stem = slugify((s.author ?? "").split(" ").pop() ?? "").replace(/-/g, "").slice(0, 5);
  const matches = (author: string | null) => Boolean(author && stem && slugify(author).replace(/-/g, "").includes(stem));
  for (const title of [s.title.replace(/’/g, "'"), originalTitle].filter(Boolean) as string[]) {
    try {
      const results = await searchOpenLibrary(title, "");
      const hit = results.find((r) => matches(r.author) && r.coverUrl) ?? results.find((r) => matches(r.author));
      if (hit) return hit;
    } catch {}
  }
  return null;
}

export type SummaryImportReport = { created: string[]; updated: string[]; drafts: string[]; errors: string[] };

export async function applySummaryImport(record: ImportRecord): Promise<SummaryImportReport> {
  const repo = getRepo();
  const parsed = parseSummaries(record.text);
  if (parsed.length === 0) throw new Error("Aucune fiche reconnue (format attendu : « Titre de Auteur », texte, « Je le note x/5 »).");
  const [books, cats] = await Promise.all([repo.listBooks(), repo.listCategories()]);
  const byKey = new Map(books.map((b) => [key(b.title, b.author), b]));
  const report: SummaryImportReport = { created: [], updated: [], drafts: [], errors: [] };
  const driveRefs = record.driveUrl ? [record.driveUrl] : [];

  // Open Library par petits lots, uniquement pour les fiches incomplètes (ré-exécuter l'import comble les manques).
  const meta = new Map<ParsedSummary, Awaited<ReturnType<typeof lookup>>>();
  const complete = (b: Book | undefined) => Boolean(b?.coverUrl && b.year);
  for (let i = 0; i < parsed.length; i += 3) {
    const batch = parsed.slice(i, i + 3);
    const res = await Promise.all(
      batch.map((s) => {
        const b = byKey.get(key(s.title, s.author));
        return complete(b) ? null : lookup(s, b?.originalTitle);
      }),
    );
    batch.forEach((s, j) => meta.set(s, res[j]));
  }
  // Wikidata : année de première publication et titre original, si absents.
  // Une seule requête groupée ; on interroge aussi quand l'année ou le titre viennent d'Open Library
  // (souvent l'année d'une édition, pas de la première publication).
  const wdNeeded = parsed.filter((s) => {
    const b = byKey.get(key(s.title, s.author));
    return s.author && (!b || !b.year || b.sources.year === "openlibrary" || !b.originalTitle || b.sources.originalTitle === "openlibrary");
  });
  const wdWorks = await findWorks(wdNeeded.map((s) => ({ title: s.title, author: s.author! }))).catch(() => new Map());
  const wd = new Map(wdNeeded.map((s) => [s, wdWorks.get(workKey(s.title, s.author!)) ?? null]));

  const usedSlugs = new Set(books.map((b) => b.slug));
  for (const s of parsed) {
    try {
      const existing = byKey.get(key(s.title, s.author));
      const ol = meta.get(s) ?? null;
      const w = wd.get(s) ?? null;
      const rating = s.ratingOutOf5 !== null ? s.ratingOutOf5 * 2 : null;
      const now = nowIso();

      if (existing) {
        const sources: Record<string, string> = { ...existing.sources, summary: "drive" };
        if (!existing.categoryIds.length) sources.categoryIds = "auto";
        if (rating !== null) sources.rating = "drive";
        // Priorité : saisie manuelle / carnet > Wikidata (première publication) > Open Library (souvent une édition).
        const fromOl = (f: string) => existing.sources[f] === "openlibrary";
        const year = existing.year && !fromOl("year") ? existing.year : (s.yearInText ?? w?.year ?? existing.year ?? ol?.year ?? null);
        if (year !== existing.year || !sources.year) sources.year = s.yearInText && year === s.yearInText ? "drive" : w?.year && year === w.year ? "wikidata" : (sources.year ?? "openlibrary");
        if (!year) delete sources.year;
        const originalTitle = existing.originalTitle && !fromOl("originalTitle") ? existing.originalTitle : (w ? w.originalTitle : existing.originalTitle);
        if (originalTitle && w && originalTitle === w.originalTitle) sources.originalTitle = "wikidata";
        if (!originalTitle) delete sources.originalTitle;
        if (!existing.coverUrl && ol?.coverUrl) sources.coverUrl = "openlibrary";
        await repo.saveBook({
          ...existing,
          year,
          originalTitle,
          // Rayonnages : recalculés seulement s'ils sont vides ou attribués automatiquement (jamais après une modification manuelle).
          categoryIds: !existing.categoryIds.length || existing.sources.categoryIds === "auto" ? shelvesFor(s, year, cats) : existing.categoryIds,
          summary: s.text,
          rating: rating ?? existing.rating,
          status: rating !== null ? existing.status ?? "finished" : existing.status,
          coverUrl: existing.coverUrl ?? ol?.coverUrl ?? null,
          driveRefs: [...new Set([...existing.driveRefs, ...driveRefs])],
          sources,
          updatedAt: now,
        });
        report.updated.push(existing.title);
        continue;
      }

      const year = s.yearInText ?? w?.year ?? ol?.year ?? null;
      const sources: Record<string, string> = { title: "drive", author: "drive", summary: "drive", categoryIds: "auto" };
      if (s.yearInText) sources.year = "drive";
      else if (w?.year) sources.year = "wikidata";
      else if (ol?.year) sources.year = "openlibrary";
      if (rating !== null) sources.rating = "drive";
      let originalTitle: string | null = w?.originalTitle ?? null;
      if (originalTitle) sources.originalTitle = "wikidata";
      else if (ol?.title && slugify(ol.title) !== slugify(s.title)) {
        originalTitle = ol.title;
        sources.originalTitle = "openlibrary";
      }
      if (ol?.coverUrl) sources.coverUrl = "openlibrary";

      let slug = slugify(s.title);
      for (let n = 2; usedSlugs.has(slug); n++) slug = `${slugify(s.title)}-${n}`;
      usedSlugs.add(slug);

      const book: Book = {
        id: newId(),
        slug,
        title: s.title,
        originalTitle,
        author: s.author ?? "Auteur à préciser",
        authorNationality: null,
        originalLanguage: null,
        edition: null,
        publisher: null,
        year,
        pages: null,
        isbn: null,
        coverUrl: ol?.coverUrl ?? null,
        color: CLOTH[hashString(s.title) % CLOTH.length],
        genres: [],
        themes: [],
        categoryIds: shelvesFor(s, year, cats),
        summary: s.text,
        spoilerAnalysis: "",
        summarySpoilers: false,
        editorial: "",
        status: rating !== null ? "finished" : null,
        rating,
        readStartedAt: null,
        readFinishedAt: null,
        visibility: s.unfinished ? "draft" : "published",
        driveRefs,
        sources,
        createdAt: now,
        updatedAt: now,
      };
      await repo.saveBook(book);
      byKey.set(key(book.title, book.author), book);
      (s.unfinished ? report.drafts : report.created).push(book.title);
    } catch (e) {
      report.errors.push(`${s.title} : ${e instanceof Error ? e.message : "erreur"}`);
    }
  }

  await repo.saveImport({ ...record, status: "processed", updatedAt: nowIso() });
  return report;
}

