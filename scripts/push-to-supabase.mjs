// Copie l'archive locale data/library.json vers Supabase (upsert, idempotent).
// Prérequis : supabase/schema.sql exécuté, NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY définis.
// Usage : node --env-file=.env.local scripts/push-to-supabase.mjs
import { promises as fs } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const a = JSON.parse(await fs.readFile("data/library.json", "utf8"));
const snake = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase()), v]));
const ok = (r, what) => { if (r.error) { console.error(what, r.error.message); process.exit(1); } };

ok(await db.from("categories").upsert(a.categories.map(snake)), "categories");
ok(await db.from("books").upsert(a.books.map(({ categoryIds, ...b }) => snake(b))), "books");
const links = a.books.flatMap((b) => b.categoryIds.map((c) => ({ book_id: b.id, category_id: c })));
if (links.length) ok(await db.from("book_categories").upsert(links), "book_categories");
if (a.notes.length) ok(await db.from("notes").upsert(a.notes.map(snake)), "notes");
if (a.reviews.length) ok(await db.from("reviews").upsert(a.reviews.map(snake)), "reviews");
if (a.imports.length) ok(await db.from("imports").upsert(a.imports.map(snake)), "imports");
ok(await db.from("settings").upsert({ id: 1, data: a.settings }), "settings");
console.log(`Transféré : ${a.books.length} livre(s), ${a.categories.length} rayonnage(s).`);
