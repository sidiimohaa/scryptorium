import "server-only";
import { getRepo } from "./store";
import type { Book, Category, Note, Review } from "./types";
import { FAVORITES_SLUG } from "./categories";

export type PublicBook = Book;

export async function getPublishedBooks(): Promise<Book[]> {
  const books = await getRepo().listBooks();
  return books
    .filter((b) => b.visibility === "published")
    .sort((a, b) => a.author.localeCompare(b.author, "fr") || a.title.localeCompare(b.title, "fr"));
}

export async function getCategories(): Promise<Category[]> {
  return getRepo().listCategories();
}

export async function getPublishedBook(slug: string) {
  const repo = getRepo();
  const book = await repo.getBookBySlug(slug);
  if (!book || book.visibility !== "published") return null;
  const [notes, reviews, categories] = await Promise.all([
    repo.listNotes(book.id),
    repo.listReviews(book.id),
    repo.listCategories(),
  ]);
  return {
    book,
    publicNotes: notes.filter((n) => n.visibility === "public"),
    reviews,
    // Keep the librarian's order: the first shelf chosen is the book's "home" shelf.
    categories: book.categoryIds.map((id) => categories.find((c) => c.id === id)).filter((c): c is Category => Boolean(c)),
  };
}

export function hasReviewContent(r: Review | undefined): boolean {
  if (!r) return false;
  return [r.liked, r.disliked, r.characters, r.themes, r.interpretation, r.learned, r.recommendedFor].some(
    (s) => s.trim().length > 0,
  );
}

/** A sheet is a "brouillon de contenu personnel" until the librarian has written something of their own. */
export function personalContentMissing(book: Book, latestReview: Review | undefined): boolean {
  return book.rating === null && book.status === null && !hasReviewContent(latestReview);
}

export function isFavorite(book: Book, categories: Category[]): boolean {
  const fav = categories.find((c) => c.slug === FAVORITES_SLUG);
  return Boolean(fav && book.categoryIds.includes(fav.id));
}

/** Livre du jour: explicit pick from the Bureau, else a stable daily rotation through published books. */
export async function getBookOfTheDay(books: Book[]): Promise<Book | null> {
  if (books.length === 0) return null;
  const settings = await getRepo().getSettings();
  const featured = settings.featuredBookId && books.find((b) => b.id === settings.featuredBookId);
  if (featured) return featured;
  const day = Math.floor(Date.now() / 86_400_000);
  const ordered = [...books].sort((a, b) => a.id.localeCompare(b.id));
  return ordered[day % ordered.length];
}

export type Connection = { book: Book; score: number; reasons: string[] };

/** Connexions littéraires: shared author, genres, themes, shelves and era — only from recorded data. */
export function connectionsFor(book: Book, all: Book[], categories: Category[]): Connection[] {
  const norm = (s: string) => s.toLowerCase().trim();
  const catName = (id: string) => categories.find((c) => c.id === id)?.name;
  return all
    .filter((b) => b.id !== book.id)
    .map((b) => {
      const reasons: string[] = [];
      let score = 0;
      if (norm(b.author) === norm(book.author)) {
        score += 5;
        reasons.push(`Même auteur : ${b.author}`);
      }
      const genres = b.genres.filter((g) => book.genres.map(norm).includes(norm(g)));
      if (genres.length) {
        score += genres.length * 2;
        reasons.push(`Genre commun : ${genres.join(", ")}`);
      }
      const themes = b.themes.filter((t) => book.themes.map(norm).includes(norm(t)));
      if (themes.length) {
        score += themes.length * 2;
        reasons.push(`Thèmes : ${themes.join(", ")}`);
      }
      const shelves = b.categoryIds.filter((c) => book.categoryIds.includes(c)).map(catName).filter(Boolean);
      if (shelves.length) {
        score += shelves.length;
        reasons.push(`Rayonnage : ${shelves.join(", ")}`);
      }
      if (b.year && book.year && Math.abs(b.year - book.year) <= 15) {
        score += 1;
        reasons.push(`Même époque (${b.year})`);
      }
      return { book: b, score, reasons };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function formatRating(rating: number | null, scale: 5 | 10): string | null {
  if (rating === null) return null;
  const v = scale === 5 ? rating / 2 : rating;
  return `${String(Math.round(v * 100) / 100).replace(".", ",")} / ${scale}`;
}

export type { Note, Review };
