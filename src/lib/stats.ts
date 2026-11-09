import type { Book, Category } from "./types";

/** Every figure is derived from recorded books. Nothing is estimated or padded. */
export function computeStats(books: Book[], categories: Category[]) {
  const finished = books.filter((b) => b.status === "finished" || b.status === "to_reread");
  const withPages = finished.filter((b) => b.pages);
  const rated = books.filter((b) => b.rating !== null);

  const count = <K extends string>(keys: K[]) => {
    const m = new Map<K, number>();
    keys.forEach((k) => m.set(k, (m.get(k) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  const byYear = count(
    finished.filter((b) => b.readFinishedAt).map((b) => b.readFinishedAt!.slice(0, 4)),
  ).sort((a, b) => a[0].localeCompare(b[0]));

  return {
    totalBooks: books.length,
    finishedCount: finished.length,
    readingCount: books.filter((b) => b.status === "reading").length,
    toReadCount: books.filter((b) => b.status === "to_read").length,
    pagesRead: withPages.reduce((s, b) => s + (b.pages ?? 0), 0),
    pagesKnownFor: withPages.length,
    averageRating: rated.length ? rated.reduce((s, b) => s + (b.rating ?? 0), 0) / rated.length : null,
    ratedCount: rated.length,
    byGenre: count(finished.flatMap((b) => b.genres)),
    byAuthor: count(finished.map((b) => b.author)),
    byShelf: count(finished.flatMap((b) => b.categoryIds.map((id) => categories.find((c) => c.id === id)?.name ?? "—"))),
    byYear,
    timeline: finished
      .filter((b) => b.readFinishedAt)
      .sort((a, b) => a.readFinishedAt!.localeCompare(b.readFinishedAt!)),
    undatedFinished: finished.filter((b) => !b.readFinishedAt),
  };
}
