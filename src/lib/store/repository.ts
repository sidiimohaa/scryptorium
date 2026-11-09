import type { Book, Category, ImportRecord, Note, Review, Settings } from "../types";

/**
 * Storage contract shared by every driver. Pages and server actions only ever talk to this interface,
 * so switching from the local JSON archive to Supabase is a matter of environment variables.
 */
export interface Repository {
  readonly driver: "local" | "supabase";
  readonly writable: boolean;

  listBooks(): Promise<Book[]>;
  getBook(id: string): Promise<Book | null>;
  getBookBySlug(slug: string): Promise<Book | null>;
  saveBook(book: Book): Promise<Book>;
  deleteBook(id: string): Promise<void>;

  listCategories(): Promise<Category[]>;
  saveCategory(category: Category): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  listNotes(bookId?: string): Promise<Note[]>;
  saveNote(note: Note): Promise<Note>;
  deleteNote(id: string): Promise<void>;

  listReviews(bookId?: string): Promise<Review[]>;
  saveReview(review: Review): Promise<Review>;
  deleteReview(id: string): Promise<void>;

  listImports(): Promise<ImportRecord[]>;
  getImport(id: string): Promise<ImportRecord | null>;
  saveImport(record: ImportRecord): Promise<ImportRecord>;
  deleteImport(id: string): Promise<void>;

  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<Settings>;

  /** Server-only secrets (e.g. Google refresh token). Never exposed to the client. */
  getSecret(key: string): Promise<string | null>;
  setSecret(key: string, value: string | null): Promise<void>;

  /** Stores an uploaded cover and returns its public URL. */
  uploadCover(fileName: string, data: Buffer, contentType: string): Promise<string>;
}
