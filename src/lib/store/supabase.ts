import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  bookSchema,
  categorySchema,
  DEFAULT_SETTINGS,
  importSchema,
  noteSchema,
  reviewSchema,
  settingsSchema,
  type Book,
} from "../types";
import type { Repository } from "./repository";

const COVERS_BUCKET = "covers";

const toSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

function rowFrom<T extends object>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [toSnake(k), v]));
}
function objFrom(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [toCamel(k), v]));
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Supabase : ${res.error.message}`);
  return res.data;
}

export function createSupabaseRepository(url: string, serviceKey: string): Repository {
  // Service-role client: this module is server-only and never shipped to the browser.
  const db: SupabaseClient = createClient(url, serviceKey, { auth: { persistSession: false } });

  async function hydrateBooks(rows: Record<string, unknown>[]): Promise<Book[]> {
    if (rows.length === 0) return [];
    const links = check(
      await db.from("book_categories").select("book_id, category_id").in("book_id", rows.map((r) => r.id as string)),
    ) as { book_id: string; category_id: string }[];
    return rows.map((r) => {
      const obj = objFrom(r);
      obj.categoryIds = links.filter((l) => l.book_id === r.id).map((l) => l.category_id);
      return bookSchema.parse(obj);
    });
  }

  return {
    driver: "supabase",
    writable: true,

    async listBooks() {
      return hydrateBooks(check(await db.from("books").select("*").order("created_at")) ?? []);
    },
    async getBook(id) {
      const rows = check(await db.from("books").select("*").eq("id", id).limit(1));
      return (await hydrateBooks(rows ?? []))[0] ?? null;
    },
    async getBookBySlug(slug) {
      const rows = check(await db.from("books").select("*").eq("slug", slug).limit(1));
      return (await hydrateBooks(rows ?? []))[0] ?? null;
    },
    async saveBook(book) {
      const parsed = bookSchema.parse(book);
      const { categoryIds, ...rest } = parsed;
      check(await db.from("books").upsert(rowFrom(rest)));
      check(await db.from("book_categories").delete().eq("book_id", parsed.id));
      if (categoryIds.length)
        check(
          await db.from("book_categories").insert(categoryIds.map((c) => ({ book_id: parsed.id, category_id: c }))),
        );
      return parsed;
    },
    async deleteBook(id) {
      check(await db.from("books").delete().eq("id", id));
    },

    async listCategories() {
      const rows = check(await db.from("categories").select("*").order("order")) ?? [];
      return rows.map((r) => categorySchema.parse(objFrom(r)));
    },
    async saveCategory(category) {
      const parsed = categorySchema.parse(category);
      check(await db.from("categories").upsert(rowFrom(parsed)));
      return parsed;
    },
    async deleteCategory(id) {
      check(await db.from("categories").delete().eq("id", id));
    },

    async listNotes(bookId) {
      let q = db.from("notes").select("*").order("created_at");
      if (bookId) q = q.eq("book_id", bookId);
      return (check(await q) ?? []).map((r) => noteSchema.parse(objFrom(r)));
    },
    async saveNote(note) {
      const parsed = noteSchema.parse(note);
      check(await db.from("notes").upsert(rowFrom(parsed)));
      return parsed;
    },
    async deleteNote(id) {
      check(await db.from("notes").delete().eq("id", id));
    },

    async listReviews(bookId) {
      let q = db.from("reviews").select("*").order("created_at", { ascending: false });
      if (bookId) q = q.eq("book_id", bookId);
      return (check(await q) ?? []).map((r) => reviewSchema.parse(objFrom(r)));
    },
    async saveReview(review) {
      const parsed = reviewSchema.parse(review);
      check(await db.from("reviews").upsert(rowFrom(parsed)));
      return parsed;
    },
    async deleteReview(id) {
      check(await db.from("reviews").delete().eq("id", id));
    },

    async listImports() {
      const rows = check(await db.from("imports").select("*").order("created_at", { ascending: false })) ?? [];
      return rows.map((r) => importSchema.parse(objFrom(r)));
    },
    async getImport(id) {
      const rows = check(await db.from("imports").select("*").eq("id", id).limit(1)) ?? [];
      return rows[0] ? importSchema.parse(objFrom(rows[0])) : null;
    },
    async saveImport(record) {
      const parsed = importSchema.parse(record);
      check(await db.from("imports").upsert(rowFrom(parsed)));
      return parsed;
    },
    async deleteImport(id) {
      check(await db.from("imports").delete().eq("id", id));
    },

    async getSettings() {
      const rows = check(await db.from("settings").select("data").eq("id", 1).limit(1)) ?? [];
      return rows[0] ? settingsSchema.parse(rows[0].data) : DEFAULT_SETTINGS;
    },
    async saveSettings(settings) {
      const parsed = settingsSchema.parse(settings);
      check(await db.from("settings").upsert({ id: 1, data: parsed }));
      return parsed;
    },

    async getSecret(key) {
      const rows = check(await db.from("app_secrets").select("value").eq("key", key).limit(1)) ?? [];
      return (rows[0]?.value as string | undefined) ?? null;
    },
    async setSecret(key, value) {
      if (value === null) check(await db.from("app_secrets").delete().eq("key", key));
      else check(await db.from("app_secrets").upsert({ key, value }));
    },

    async uploadCover(fileName, data, contentType) {
      check(await db.storage.from(COVERS_BUCKET).upload(fileName, data, { contentType, upsert: true }));
      return db.storage.from(COVERS_BUCKET).getPublicUrl(fileName).data.publicUrl;
    },
  } satisfies Repository;
}
