import "server-only";

/**
 * Bibliographic lookup — Open Library first, Google Books for descriptions.
 * Only fields actually returned by the APIs are proposed; anything missing stays empty.
 */
export type MetadataCandidate = {
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

const UA = { "User-Agent": "SCRYPTORIUM/1.0 (bibliotheque personnelle)" };
const LANG: Record<string, string> = { eng: "Anglais", fre: "Français", fra: "Français", ger: "Allemand", spa: "Espagnol", ita: "Italien", rus: "Russe", por: "Portugais", jpn: "Japonais", en: "Anglais", fr: "Français", de: "Allemand", es: "Espagnol", it: "Italien", ru: "Russe" };

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function searchOpenLibrary(title: string, author: string): Promise<MetadataCandidate[]> {
  const q = new URLSearchParams({ title, limit: "5", fields: "key,title,author_name,first_publish_year,cover_i,number_of_pages_median,subject,isbn,publisher,language" });
  if (author) q.set("author", author);
  type Doc = { key: string; title: string; author_name?: string[]; first_publish_year?: number; cover_i?: number; number_of_pages_median?: number; subject?: string[]; isbn?: string[]; publisher?: string[]; language?: string[] };
  const data = (await getJson(`https://openlibrary.org/search.json?${q}`)) as { docs?: Doc[] };
  const docs = data.docs ?? [];
  return Promise.all(
    docs.map(async (d) => {
      let description: string | null = null;
      try {
        const w = (await getJson(`https://openlibrary.org${d.key}.json`)) as { description?: string | { value: string } };
        description = typeof w.description === "string" ? w.description : (w.description?.value ?? null);
      } catch {}
      return {
        source: "openlibrary" as const,
        sourceId: d.key,
        title: d.title,
        author: d.author_name?.[0] ?? null,
        year: d.first_publish_year ?? null,
        pages: d.number_of_pages_median ?? null,
        isbn: d.isbn?.find((i) => i.length === 13) ?? d.isbn?.[0] ?? null,
        publisher: d.publisher?.[0] ?? null,
        coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
        description,
        genres: (d.subject ?? []).filter((s) => s.length < 40).slice(0, 8),
        // Open Library lists every translation's language: the original language cannot be inferred reliably.
        language: null,
      };
    }),
  );
}

export async function searchGoogleBooks(title: string, author: string): Promise<MetadataCandidate[]> {
  const q = `intitle:${title}${author ? `+inauthor:${author}` : ""}`;
  const key = process.env.GOOGLE_BOOKS_API_KEY ? `&key=${process.env.GOOGLE_BOOKS_API_KEY}` : "";
  type Item = { id: string; volumeInfo: { title: string; authors?: string[]; publishedDate?: string; pageCount?: number; publisher?: string; description?: string; categories?: string[]; language?: string; imageLinks?: { thumbnail?: string }; industryIdentifiers?: { type: string; identifier: string }[] } };
  const data = (await getJson(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5${key}`)) as { items?: Item[] };
  return (data.items ?? []).map((it) => {
    const v = it.volumeInfo;
    const year = v.publishedDate ? Number.parseInt(v.publishedDate.slice(0, 4), 10) : NaN;
    return {
      source: "googlebooks" as const,
      sourceId: it.id,
      title: v.title,
      author: v.authors?.[0] ?? null,
      year: Number.isFinite(year) ? year : null,
      pages: v.pageCount || null,
      isbn: v.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier ?? null,
      publisher: v.publisher ?? null,
      coverUrl: v.imageLinks?.thumbnail?.replace("http://", "https://").replace("&edge=curl", "") ?? null,
      description: v.description?.replace(/<[^>]+>/g, "") ?? null,
      genres: v.categories ?? [],
      language: v.language ? (LANG[v.language] ?? v.language) : null,
    };
  });
}

export async function lookupMetadata(title: string, author: string) {
  const [ol, gb] = await Promise.allSettled([searchOpenLibrary(title, author), searchGoogleBooks(title, author)]);
  return {
    candidates: [...(ol.status === "fulfilled" ? ol.value : []), ...(gb.status === "fulfilled" ? gb.value : [])],
    errors: [ol.status === "rejected" ? "Open Library indisponible" : null, gb.status === "rejected" ? "Google Books indisponible" : null].filter(Boolean),
  };
}
