/**
 * Parseur du document « CLUB DE LECTURE : Le Scryptorium » (Google Docs exporté en texte).
 *
 * Structure attendue, telle qu'écrite par le bibliothécaire :
 *   <Titre> de|d’ <Auteur>
 *   <paragraphes du résumé / ressenti>
 *   Je le note 4,5/5   (ou ⅗, « note 5/5 », « 4,5/5 », « note /5 » si pas encore noté)
 *
 * Module pur (aucune dépendance serveur) : réutilisable par les scripts et par le Bureau.
 */

export type ParsedSummary = {
  heading: string;
  title: string;
  author: string | null;
  /** Texte du bibliothécaire, verbatim (seule la ligne de note est retirée ; son commentaire éventuel est conservé). */
  text: string;
  /** Note sur 5 telle qu'écrite ; null si absente (« note /5 »). */
  ratingOutOf5: number | null;
  /** Année citée dans le texte (« Paru en 1926 », « Publié en 1945 »…). */
  yearInText: number | null;
  /** Le bibliothécaire indique ne pas avoir terminé la fiche. */
  unfinished: boolean;
};

const FRACTIONS: Record<string, number> = { "⅕": 1, "⅖": 2, "⅗": 3, "⅘": 4 };

/** Noms courts utilisés dans le document → forme complète. */
const AUTHOR_ALIASES: Record<string, string> = {
  dostoievski: "Fiodor Dostoïevski",
  "dostoïevski": "Fiodor Dostoïevski",
  "fiodor dostoïevski": "Fiodor Dostoïevski",
  stevenson: "Robert Louis Stevenson",
};

const RATING_LINE = /^(?:je\s+(?:le|lui)\s+(?:note|mets)|note\b|\d+(?:[.,]\d+)?\s*\/\s*5)/i;

function isRatingLine(line: string): boolean {
  return RATING_LINE.test(line.trim());
}

function parseRating(line: string): { value: number | null; tail: string } {
  const frac = line.match(/[⅕⅖⅗⅘]/);
  if (frac) return { value: FRACTIONS[frac[0]], tail: line.slice(line.indexOf(frac[0]) + 1) };
  const m = line.match(/(\d+(?:[.,]\d+)?)\s*\/\s*5/);
  if (!m || m.index === undefined) return { value: null, tail: "" };
  const v = Number(m[1].replace(",", "."));
  return { value: Number.isFinite(v) && v >= 0 && v <= 5 ? v : null, tail: line.slice(m.index + m[0].length) };
}

const capitalized = (w: string) => /^[A-ZÀ-ÖØ-Þ]/.test(w);

/** Sépare « Titre de Auteur » en évitant les « de » internes au titre (« La promesse de l’aube de Romain Gary »). */
export function splitHeading(heading: string): { title: string; author: string | null } {
  const re = /\s(?:de|d[’'])\s?(?=\S)/g;
  const cuts: { start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(heading))) cuts.push({ start: m.index, end: m.index + m[0].length });
  for (let i = cuts.length - 1; i >= 0; i--) {
    const rest = heading.slice(cuts[i].end).trim();
    if (!rest || !capitalized(rest)) continue;
    let start = i;
    // « Antoine de Saint-Exupéry », « Honoré de Balzac » : on rattache le prénom précédé lui-même de « de »/« d’ ».
    while (start > 0) {
      const between = heading.slice(cuts[start - 1].end, cuts[start].start).trim();
      if (between && !between.includes(" ") && capitalized(between)) start--;
      else break;
    }
    const title = heading.slice(0, cuts[start].start).trim();
    const author = heading.slice(cuts[start].end).trim();
    if (title) return { title, author: normalizeAuthor(author) };
  }
  return { title: heading.trim(), author: null };
}

export function normalizeAuthor(author: string): string {
  return AUTHOR_ALIASES[author.toLowerCase().trim()] ?? author.trim();
}

export function parseSummaries(raw: string): ParsedSummary[] {
  const lines = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/^#+\s*/, "").replace(/\s+$/, ""));
  type Draft = { heading: string; body: string[]; rating: string | null };
  const drafts: Draft[] = [];
  let current: Draft | null = null;
  let expectTitle = true;

  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      current?.body.push("");
      continue;
    }
    if (expectTitle) {
      if (!/\p{L}/u.test(t) || isRatingLine(t)) continue; // lignes parasites (« . », note orpheline)
      if (t.length <= 140) {
        current = { heading: t.replace(/\\!/g, "!"), body: [], rating: null };
        drafts.push(current);
        expectTitle = false;
        continue;
      }
    }
    if (!current) continue;
    if (isRatingLine(t)) {
      current.rating = t;
      expectTitle = true;
      continue;
    }
    current.body.push(t.replace(/\\!/g, "!"));
  }

  return drafts
    .map((d): ParsedSummary | null => {
      const { title, author } = splitHeading(d.heading);
      const { value, tail } = d.rating ? parseRating(d.rating) : { value: null, tail: "" };
      const paragraphs = d.body.join("\n").replace(/\n{3,}/g, "\n\n").trim();
      const cleanTail = tail.replace(/^[\s,.;:–-]+/, "").trim();
      const text = [paragraphs, cleanTail ? cleanTail.charAt(0).toUpperCase() + cleanTail.slice(1) : ""].filter(Boolean).join("\n\n");
      if (text.replace(/\s/g, "").length < 40) return null; // gabarits vides (« Texte », « Titre … »)
      const year = text.match(/\b(?:paru|publiée?|sorti|écrit|rédigé)\s+en\s+(\d{3,4})\b/i);
      return {
        heading: d.heading,
        title,
        author,
        text,
        ratingOutOf5: value,
        yearInText: year ? Number(year[1]) : null,
        unfinished: /pas fini|pas terminé|à compléter/i.test(text),
      };
    })
    .filter((x): x is ParsedSummary => x !== null);
}
