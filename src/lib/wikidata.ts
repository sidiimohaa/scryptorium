import "server-only";
import { slugify } from "./utils";

/**
 * Wikidata — base publique, sans clé. Complète l'année de première publication et le titre original.
 *
 * Une seule requête SPARQL groupée pour tous les ouvrages (l'API Wikidata classique limite fortement
 * le nombre d'appels anonymes). On récupère les œuvres des auteurs concernés, puis on ne retient que
 * celles dont le libellé français correspond exactement au titre : les homonymes (films, traductions,
 * adaptations) sont écartés. Si rien ne correspond, rien n'est proposé — jamais d'invention.
 */
const ENDPOINT = "https://query.wikidata.org/sparql";
const HEADERS = { Accept: "application/sparql-results+json", "User-Agent": "SCRYPTORIUM/1.0 (bibliotheque personnelle)" };

export type WikidataWork = { id: string; year: number | null; originalTitle: string | null };

type Binding = { name: { value: string }; work: { value: string }; frLabel: { value: string }; date?: { value: string }; title?: { value: string } };

const norm = (s: string) => slugify(s.replace(/[’]/g, "'"));
const lit = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"@fr`;

/** Clé de correspondance utilisée par l'appelant. */
export const workKey = (title: string, author: string) => `${norm(title)}|${norm(author)}`;

export async function findWorks(items: { title: string; author: string }[]): Promise<Map<string, WikidataWork>> {
  const out = new Map<string, WikidataWork>();
  const authors = [...new Set(items.map((i) => i.author.trim()).filter(Boolean))];
  if (authors.length === 0) return out;

  const query = `SELECT ?name ?work ?frLabel ?date ?title WHERE {
  VALUES ?name { ${authors.map(lit).join(" ")} }
  ?author rdfs:label ?name ; wdt:P31 wd:Q5 .
  ?work wdt:P50 ?author ; rdfs:label ?frLabel .
  FILTER(lang(?frLabel) = "fr")
  OPTIONAL { ?work wdt:P577 ?date }
  OPTIONAL { ?work wdt:P1476 ?title }
}`;
  const res = await fetch(`${ENDPOINT}?${new URLSearchParams({ query })}`, { headers: HEADERS, signal: AbortSignal.timeout(45000) });
  if (!res.ok) throw new Error(`Wikidata ${res.status}`);
  const rows = ((await res.json()) as { results: { bindings: Binding[] } }).results.bindings;

  // Regroupe par œuvre.
  type Work = { id: string; author: string; label: string; years: number[]; titles: Set<string> };
  const works = new Map<string, Work>();
  for (const r of rows) {
    const id = r.work.value.split("/").pop()!;
    const w = works.get(id) ?? { id, author: r.name.value, label: r.frLabel.value, years: [], titles: new Set<string>() };
    const y = r.date ? Number.parseInt(r.date.value.slice(0, 4), 10) : NaN;
    if (Number.isFinite(y)) w.years.push(y);
    if (r.title?.value) w.titles.add(r.title.value);
    works.set(id, w);
  }

  for (const item of items) {
    const candidates = [...works.values()].filter((w) => norm(w.author) === norm(item.author) && norm(w.label) === norm(item.title));
    if (candidates.length === 0) continue;
    // L'œuvre datée la plus ancienne est l'originale ; les entités sans date sont souvent des éditions.
    candidates.sort((a, b) => Math.min(...a.years, 9999) - Math.min(...b.years, 9999));
    const best = candidates[0];
    const titles = [...best.titles];
    const original = titles.some((t) => norm(t) === norm(item.title)) ? null : (titles[0] ?? null);
    out.set(workKey(item.title, item.author), {
      id: best.id,
      year: best.years.length ? Math.min(...best.years) : null,
      originalTitle: original,
    });
  }
  return out;
}
