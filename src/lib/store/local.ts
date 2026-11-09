import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  bookSchema,
  categorySchema,
  DEFAULT_SETTINGS,
  importSchema,
  noteSchema,
  reviewSchema,
  settingsSchema,
  type Book,
  type Category,
  type ImportRecord,
  type Note,
  type Review,
  type Settings,
} from "../types";
import type { Repository } from "./repository";
import { z } from "zod";

const archiveSchema = z.object({
  version: z.literal(1),
  books: z.array(bookSchema).default([]),
  categories: z.array(categorySchema).default([]),
  notes: z.array(noteSchema).default([]),
  reviews: z.array(reviewSchema).default([]),
  imports: z.array(importSchema).default([]),
  settings: settingsSchema.default(DEFAULT_SETTINGS),
});
type Archive = z.infer<typeof archiveSchema>;

const DATA_DIR = path.join(process.cwd(), "data");
const ARCHIVE = path.join(DATA_DIR, "library.json");
const SECRETS = path.join(DATA_DIR, ".secrets.json");
/**
 * Contenu brut des imports (texte extrait de vos documents, brouillons IA) : rangé à part dans
 * data/private/ (ignoré par git), pour que library.json ne contienne que la bibliothèque publiable.
 */
const PRIVATE_IMPORTS = path.join(DATA_DIR, "private", "imports");
const importFile = (id: string) => path.join(PRIVATE_IMPORTS, `${id.replace(/[^\w-]/g, "")}.json`);

async function hydrate(record: ImportRecord): Promise<ImportRecord> {
  try {
    const raw = JSON.parse(await fs.readFile(importFile(record.id), "utf8")) as { text?: string; aiDraft?: string | null };
    return { ...record, text: raw.text ?? record.text, aiDraft: raw.aiDraft ?? record.aiDraft };
  } catch {
    return record; // ancien format : texte encore dans library.json
  }
}
const UPLOADS = path.join(process.cwd(), "public", "uploads");

let queue: Promise<unknown> = Promise.resolve();
/** Serialise writes so two server actions never clobber each other. */
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
}

async function read(): Promise<Archive> {
  try {
    const raw = await fs.readFile(ARCHIVE, "utf8");
    return archiveSchema.parse(JSON.parse(raw));
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return archiveSchema.parse({ version: 1 });
    throw err;
  }
}

async function write(archive: Archive): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${ARCHIVE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(archive, null, 2) + "\n", "utf8");
  await fs.rename(tmp, ARCHIVE);
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const copy = list.slice();
  copy[i] = item;
  return copy;
}

function mutate<T>(fn: (a: Archive) => { archive: Archive; result: T }): Promise<T> {
  return serial(async () => {
    const { archive, result } = fn(await read());
    await write(archive);
    return result;
  });
}

export function createLocalRepository(): Repository {
  const writable = process.env.VERCEL !== "1";
  return {
    driver: "local",
    writable,

    async listBooks() {
      return (await read()).books;
    },
    async getBook(id) {
      return (await read()).books.find((b) => b.id === id) ?? null;
    },
    async getBookBySlug(slug) {
      return (await read()).books.find((b) => b.slug === slug) ?? null;
    },
    saveBook(book) {
      return mutate((a) => ({ archive: { ...a, books: upsert(a.books, bookSchema.parse(book)) }, result: book }));
    },
    deleteBook(id) {
      return mutate((a) => ({
        archive: {
          ...a,
          books: a.books.filter((b) => b.id !== id),
          notes: a.notes.filter((n) => n.bookId !== id),
          reviews: a.reviews.filter((r) => r.bookId !== id),
          imports: a.imports.map((i) => (i.bookId === id ? { ...i, bookId: null } : i)),
          settings: a.settings.featuredBookId === id ? { ...a.settings, featuredBookId: null } : a.settings,
        },
        result: undefined,
      }));
    },

    async listCategories() {
      return (await read()).categories.sort((x, y) => x.order - y.order);
    },
    saveCategory(category) {
      return mutate((a) => ({
        archive: { ...a, categories: upsert(a.categories, categorySchema.parse(category)) },
        result: category,
      }));
    },
    deleteCategory(id) {
      return mutate((a) => ({
        archive: {
          ...a,
          categories: a.categories.filter((c) => c.id !== id),
          books: a.books.map((b) => ({ ...b, categoryIds: b.categoryIds.filter((c) => c !== id) })),
        },
        result: undefined,
      }));
    },

    async listNotes(bookId) {
      const notes = (await read()).notes;
      return bookId ? notes.filter((n) => n.bookId === bookId) : notes;
    },
    saveNote(note) {
      return mutate((a) => ({ archive: { ...a, notes: upsert(a.notes, noteSchema.parse(note)) }, result: note }));
    },
    deleteNote(id) {
      return mutate((a) => ({ archive: { ...a, notes: a.notes.filter((n) => n.id !== id) }, result: undefined }));
    },

    async listReviews(bookId) {
      const reviews = (await read()).reviews;
      return (bookId ? reviews.filter((r) => r.bookId === bookId) : reviews).sort((x, y) =>
        y.createdAt.localeCompare(x.createdAt),
      );
    },
    saveReview(review) {
      return mutate((a) => ({
        archive: { ...a, reviews: upsert(a.reviews, reviewSchema.parse(review)) },
        result: review,
      }));
    },
    deleteReview(id) {
      return mutate((a) => ({ archive: { ...a, reviews: a.reviews.filter((r) => r.id !== id) }, result: undefined }));
    },

    async listImports() {
      const imports = (await read()).imports.sort((x, y) => y.createdAt.localeCompare(x.createdAt));
      return Promise.all(imports.map(hydrate));
    },
    async getImport(id) {
      const record = (await read()).imports.find((i) => i.id === id);
      return record ? hydrate(record) : null;
    },
    async saveImport(record) {
      const parsed = importSchema.parse(record);
      await fs.mkdir(PRIVATE_IMPORTS, { recursive: true });
      await fs.writeFile(importFile(parsed.id), JSON.stringify({ text: parsed.text, aiDraft: parsed.aiDraft }), { encoding: "utf8", mode: 0o600 });
      return mutate((a) => ({
        archive: { ...a, imports: upsert(a.imports, { ...parsed, text: "", aiDraft: null }) },
        result: parsed,
      }));
    },
    async deleteImport(id) {
      await fs.rm(importFile(id), { force: true });
      return mutate((a) => ({ archive: { ...a, imports: a.imports.filter((i) => i.id !== id) }, result: undefined }));
    },

    async getSettings() {
      return (await read()).settings;
    },
    saveSettings(settings: Settings) {
      return mutate((a) => ({ archive: { ...a, settings: settingsSchema.parse(settings) }, result: settings }));
    },

    async getSecret(key) {
      try {
        const data = JSON.parse(await fs.readFile(SECRETS, "utf8")) as Record<string, string>;
        return data[key] ?? null;
      } catch {
        return null;
      }
    },
    setSecret(key, value) {
      return serial(async () => {
        let data: Record<string, string> = {};
        try {
          data = JSON.parse(await fs.readFile(SECRETS, "utf8"));
        } catch {}
        if (value === null) delete data[key];
        else data[key] = value;
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.writeFile(SECRETS, JSON.stringify(data, null, 2), { encoding: "utf8", mode: 0o600 });
      });
    },

    async uploadCover(fileName, data) {
      await fs.mkdir(UPLOADS, { recursive: true });
      await fs.writeFile(path.join(UPLOADS, fileName), data);
      return `/uploads/${fileName}`;
    },
  } satisfies Repository;
}

export type { Book, Category, Note, Review, ImportRecord };
