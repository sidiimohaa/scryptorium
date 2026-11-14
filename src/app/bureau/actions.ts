"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkPassword, createAdminSession, destroyAdminSession, requireAdmin } from "@/lib/auth";
import { extractText } from "@/lib/extract";
import { getRepo } from "@/lib/store";
import {
  bookSchema,
  NOTE_KINDS,
  READING_STATUSES,
  VISIBILITIES,
  type Book,
  type Category,
  type ImportRecord,
} from "@/lib/types";
import { newId, nowIso, sha256, slugify } from "@/lib/utils";

export type ActionState = { ok?: boolean; error?: string; message?: string; id?: string } | null;

const MAX_UPLOAD = 10 * 1024 * 1024;

function refresh() {
  revalidatePath("/", "layout");
}

async function writableRepo() {
  const repo = getRepo();
  if (!repo.writable)
    throw new Error("L'archive locale est en lecture seule sur cet hébergement. Configurez Supabase pour modifier la bibliothèque en ligne.");
  return repo;
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const optStr = (fd: FormData, k: string) => str(fd, k) || null;
const optInt = (fd: FormData, k: string) => {
  const v = str(fd, k);
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};
const list = (fd: FormData, k: string) =>
  [...new Set(str(fd, k).split(/[,;\n]/).map((s) => s.trim()).filter(Boolean))];

function message(err: unknown): string {
  if (err instanceof z.ZodError) return err.issues.map((i) => `${i.path.join(".")} : ${i.message}`).join(" · ");
  return err instanceof Error ? err.message : "Erreur inattendue.";
}

async function uniqueSlug(base: string, excludeId?: string) {
  const books = await getRepo().listBooks();
  let slug = slugify(base);
  let n = 2;
  while (books.some((b) => b.slug === slug && b.id !== excludeId)) slug = `${slugify(base)}-${n++}`;
  return slug;
}

/* ─── Session ─────────────────────────────────────────────────────────── */

const attempts = new Map<string, { n: number; until: number }>();

export async function login(_: ActionState, fd: FormData): Promise<ActionState> {
  const key = "admin";
  const a = attempts.get(key);
  if (a && a.until > Date.now()) return { error: "Trop de tentatives. Patientez une minute." };
  if (!checkPassword(str(fd, "password"))) {
    const n = (a?.n ?? 0) + 1;
    attempts.set(key, { n, until: n >= 5 ? Date.now() + 60_000 : 0 });
    await new Promise((r) => setTimeout(r, 600));
    return { error: "Mot de passe incorrect." };
  }
  attempts.delete(key);
  await createAdminSession();
  redirect("/bureau");
}

export async function logout() {
  await destroyAdminSession();
  redirect("/");
}

/* ─── Books ───────────────────────────────────────────────────────────── */

export async function saveBook(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  try {
    const repo = await writableRepo();
    const settings = await repo.getSettings();
    const id = str(fd, "id") || newId();
    const existing = await repo.getBook(id);
    const title = str(fd, "title");

    let coverUrl = optStr(fd, "coverUrl");
    const file = fd.get("coverFile");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_UPLOAD) throw new Error("Couverture trop lourde (10 Mo max).");
      if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) throw new Error("Couverture : JPEG, PNG, WebP ou AVIF uniquement.");
      const ext = file.type.split("/")[1].replace("jpeg", "jpg");
      coverUrl = await repo.uploadCover(`${id}-${Date.now()}.${ext}`, Buffer.from(await file.arrayBuffer()), file.type);
    }

    const ratingRaw = str(fd, "rating").replace(",", ".");
    const rating = ratingRaw === "" ? null : Number(ratingRaw) * (settings.ratingScale === 5 ? 2 : 1);
    const status = str(fd, "status");
    const visibility = str(fd, "visibility");
    const sources = (() => {
      try {
        return JSON.parse(str(fd, "sources") || "{}");
      } catch {
        return {};
      }
    })();

    const book: Book = bookSchema.parse({
      ...(existing ?? {}),
      id,
      slug: await uniqueSlug(str(fd, "slug") || title, id),
      title,
      originalTitle: optStr(fd, "originalTitle"),
      author: str(fd, "author"),
      authorNationality: optStr(fd, "authorNationality"),
      originalLanguage: optStr(fd, "originalLanguage"),
      edition: optStr(fd, "edition"),
      publisher: optStr(fd, "publisher"),
      year: optInt(fd, "year"),
      pages: optInt(fd, "pages"),
      isbn: optStr(fd, "isbn"),
      coverUrl,
      color: str(fd, "color") || "#51252C",
      genres: list(fd, "genres"),
      themes: list(fd, "themes"),
      categoryIds: fd.getAll("categoryIds").map(String),
      summary: str(fd, "summary"),
      spoilerAnalysis: str(fd, "spoilerAnalysis"),
      summarySpoilers: fd.get("summarySpoilers") === "on",
      editorial: str(fd, "editorial"),
      status: (READING_STATUSES as readonly string[]).includes(status) ? status : null,
      rating: rating !== null && Number.isFinite(rating) ? rating : null,
      readStartedAt: optStr(fd, "readStartedAt"),
      readFinishedAt: optStr(fd, "readFinishedAt"),
      currentPage: optInt(fd, "currentPage"),
      visibility: (VISIBILITIES as readonly string[]).includes(visibility) ? visibility : "draft",
      driveRefs: list(fd, "driveRefs").filter((u) => /^https:\/\/(docs|drive)\.google\.com\//.test(u)),
      sources: {
        ...(existing?.sources ?? {}),
        ...sources,
        // Rayonnages modifiés à la main : l'import ne les recalculera plus.
        ...(existing && [...fd.getAll("categoryIds").map(String)].sort().join() !== [...existing.categoryIds].sort().join() ? { categoryIds: "manual" } : {}),
      },
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    });
    await repo.saveBook(book);
    refresh();
    if (!existing) redirect(`/bureau/livres/${book.id}?cree=1`);
    return { ok: true, message: "Fiche enregistrée.", id: book.id };
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err; // let redirect() through
    return { error: message(err) };
  }
}

export async function setVisibility(id: string, visibility: Book["visibility"]) {
  await requireAdmin();
  const repo = await writableRepo();
  const book = await repo.getBook(id);
  if (!book) return;
  await repo.saveBook({ ...book, visibility, updatedAt: nowIso() });
  refresh();
}

export async function deleteBook(id: string) {
  await requireAdmin();
  const repo = await writableRepo();
  await repo.deleteBook(id);
  refresh();
  redirect("/bureau");
}

/* ─── Reviews (versioned) ────────────────────────────────────────────── */

export async function saveReview(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  try {
    const repo = await writableRepo();
    const bookId = str(fd, "bookId");
    if (!(await repo.getBook(bookId))) throw new Error("Livre introuvable.");
    const asNew = fd.get("asNewVersion") === "on";
    const current = (await repo.listReviews(bookId))[0];
    const id = !asNew && current ? current.id : newId();
    await repo.saveReview({
      id,
      bookId,
      liked: str(fd, "liked"),
      disliked: str(fd, "disliked"),
      characters: str(fd, "characters"),
      themes: str(fd, "themes"),
      interpretation: str(fd, "interpretation"),
      learned: str(fd, "learned"),
      recommendedFor: str(fd, "recommendedFor"),
      spoilers: str(fd, "spoilers"),
      label: str(fd, "label"),
      createdAt: !asNew && current ? current.createdAt : nowIso(),
      updatedAt: nowIso(),
    });
    refresh();
    return { ok: true, message: asNew ? "Nouvelle lecture consignée — l'ancien avis rejoint les Archives." : "Avis enregistré." };
  } catch (err) {
    return { error: message(err) };
  }
}

/* ─── Notes & quotes ─────────────────────────────────────────────────── */

export async function addNote(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  try {
    const repo = await writableRepo();
    const kind = str(fd, "kind");
    await repo.saveNote({
      id: newId(),
      bookId: str(fd, "bookId"),
      kind: (NOTE_KINDS as readonly string[]).includes(kind) ? (kind as (typeof NOTE_KINDS)[number]) : "note",
      content: str(fd, "content"),
      pageRef: optStr(fd, "pageRef"),
      visibility: fd.get("public") === "on" ? "public" : "private",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    refresh();
    return { ok: true, message: "Note ajoutée." };
  } catch (err) {
    return { error: message(err) };
  }
}

export async function toggleNoteVisibility(id: string) {
  await requireAdmin();
  const repo = await writableRepo();
  const note = (await repo.listNotes()).find((n) => n.id === id);
  if (!note) return;
  await repo.saveNote({ ...note, visibility: note.visibility === "public" ? "private" : "public", updatedAt: nowIso() });
  refresh();
}

export async function deleteNote(id: string) {
  await requireAdmin();
  await (await writableRepo()).deleteNote(id);
  refresh();
}

/* ─── Categories ─────────────────────────────────────────────────────── */

export async function saveCategory(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  try {
    const repo = await writableRepo();
    const cats = await repo.listCategories();
    const id = str(fd, "id") || `cat-${newId().slice(0, 8)}`;
    const existing = cats.find((c) => c.id === id);
    const name = str(fd, "name");
    let slug = slugify(str(fd, "slug") || name);
    if (cats.some((c) => c.slug === slug && c.id !== id)) slug = `${slug}-${cats.length + 1}`;
    const cat: Category = {
      id,
      slug,
      name,
      inscription: str(fd, "inscription"),
      description: str(fd, "description"),
      accent: str(fd, "accent") || "#C3A16B",
      order: optInt(fd, "order") ?? existing?.order ?? cats.length,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    await repo.saveCategory(cat);
    refresh();
    return { ok: true, message: existing ? "Rayonnage modifié." : "Rayonnage créé." };
  } catch (err) {
    return { error: message(err) };
  }
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  await (await writableRepo()).deleteCategory(id);
  refresh();
}

/** Moves every book of `sourceId` onto `targetId`, then removes the source shelf. */
export async function mergeCategories(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  try {
    const repo = await writableRepo();
    const source = str(fd, "source");
    const target = str(fd, "target");
    if (!source || !target || source === target) throw new Error("Choisissez deux rayonnages différents.");
    const books = await repo.listBooks();
    let moved = 0;
    for (const b of books.filter((b) => b.categoryIds.includes(source))) {
      const ids = [...new Set(b.categoryIds.map((c) => (c === source ? target : c)))];
      await repo.saveBook({ ...b, categoryIds: ids, updatedAt: nowIso() });
      moved++;
    }
    await repo.deleteCategory(source);
    refresh();
    return { ok: true, message: `Fusion terminée : ${moved} ouvrage(s) déplacé(s).` };
  } catch (err) {
    return { error: message(err) };
  }
}

/* ─── Settings ───────────────────────────────────────────────────────── */

export async function saveSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  try {
    const repo = await writableRepo();
    const current = await repo.getSettings();
    const scale = str(fd, "ratingScale") === "10" ? 10 : 5;
    const goal = optInt(fd, "goalTarget");
    await repo.saveSettings({
      ...current,
      ratingScale: scale,
      readingGoal: goal !== null ? { year: optInt(fd, "goalYear") ?? new Date().getFullYear(), target: goal } : null,
      featuredBookId: optStr(fd, "featuredBookId"),
    });
    refresh();
    return { ok: true, message: "Réglages enregistrés." };
  } catch (err) {
    return { error: message(err) };
  }
}

/* ─── Imports (méthode 1 : manuelle) ─────────────────────────────────── */

async function storeImport(record: Omit<ImportRecord, "id" | "createdAt" | "updatedAt" | "contentHash" | "aiDraft" | "error">) {
  const repo = await writableRepo();
  const hash = record.text ? sha256(record.text) : null;
  const duplicate = hash ? (await repo.listImports()).find((i) => i.contentHash === hash) : undefined;
  const saved = await repo.saveImport({
    ...record,
    id: newId(),
    contentHash: hash,
    aiDraft: null,
    error: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  return { saved, duplicate };
}

export async function importFile(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  try {
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("Choisissez un fichier.");
    if (file.size > MAX_UPLOAD) throw new Error("Fichier trop lourd (10 Mo max).");
    const text = (await extractText(file.name, file.type, Buffer.from(await file.arrayBuffer()))).trim();
    if (!text) throw new Error("Aucun texte n'a pu être extrait (document scanné ?).");
    const bookId = optStr(fd, "bookId");
    const { duplicate } = await storeImport({
      source: "upload",
      bookId,
      fileName: file.name.slice(0, 300),
      mimeType: file.type || null,
      driveUrl: null,
      driveFileId: null,
      text,
      status: bookId ? "linked" : "processed",
    });
    refresh();
    return { ok: true, message: duplicate ? `Importé — attention, contenu identique à « ${duplicate.fileName ?? "un import précédent"} ».` : "Document importé, texte extrait." };
  } catch (err) {
    return { error: message(err) };
  }
}

export async function importPaste(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  try {
    const text = str(fd, "text");
    if (!text) throw new Error("Le texte est vide.");
    const bookId = optStr(fd, "bookId");
    const { duplicate } = await storeImport({
      source: "paste",
      bookId,
      fileName: optStr(fd, "label"),
      mimeType: "text/plain",
      driveUrl: null,
      driveFileId: null,
      text,
      status: bookId ? "linked" : "processed",
    });
    refresh();
    return { ok: true, message: duplicate ? "Enregistré — ce texte existe déjà dans les imports." : "Texte enregistré." };
  } catch (err) {
    return { error: message(err) };
  }
}

export async function importDriveRef(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  try {
    const url = str(fd, "url");
    if (!/^https:\/\/(docs|drive)\.google\.com\//.test(url)) throw new Error("Lien Google Drive / Docs attendu.");
    const repo = await writableRepo();
    if ((await repo.listImports()).some((i) => i.driveUrl === url)) throw new Error("Ce document Drive est déjà référencé.");
    const bookId = optStr(fd, "bookId");
    await storeImport({ source: "drive_ref", bookId, fileName: optStr(fd, "label"), mimeType: null, driveUrl: url, driveFileId: null, text: "", status: bookId ? "linked" : "pending" });
    if (bookId) {
      const book = await repo.getBook(bookId);
      if (book && !book.driveRefs.includes(url)) await repo.saveBook({ ...book, driveRefs: [...book.driveRefs, url], updatedAt: nowIso() });
    }
    refresh();
    return { ok: true, message: "Référence Drive enregistrée (le document reste privé sur votre Drive)." };
  } catch (err) {
    return { error: message(err) };
  }
}

export async function linkImport(id: string, bookId: string | null) {
  await requireAdmin();
  const repo = await writableRepo();
  const rec = await repo.getImport(id);
  if (!rec) return;
  await repo.saveImport({ ...rec, bookId, status: bookId ? "linked" : rec.text ? "processed" : "pending", updatedAt: nowIso() });
  refresh();
}

/** Turns (part of) an import into a private note on its book. Nothing becomes public without an explicit toggle. */
export async function importToNote(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  try {
    const repo = await writableRepo();
    const rec = await repo.getImport(str(fd, "importId"));
    if (!rec?.bookId) throw new Error("Associez d'abord ce document à un ouvrage.");
    const content = str(fd, "content") || rec.text;
    for (let i = 0; i < content.length; i += 4000) {
      await repo.saveNote({ id: newId(), bookId: rec.bookId, kind: "note", content: content.slice(i, i + 4000), pageRef: null, visibility: "private", createdAt: nowIso(), updatedAt: nowIso() });
    }
    refresh();
    return { ok: true, message: "Ajouté aux notes privées de l'ouvrage." };
  } catch (err) {
    return { error: message(err) };
  }
}

export async function deleteImport(id: string) {
  await requireAdmin();
  await (await writableRepo()).deleteImport(id);
  refresh();
}

/* ─── Google Drive (méthode 2) ───────────────────────────────────────── */

export async function driveSetFolder(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  try {
    const repo = await writableRepo();
    const [id, ...name] = str(fd, "folder").split("|");
    await repo.saveSettings({ ...(await repo.getSettings()), driveFolderId: id || null, driveFolderName: name.join("|") || null });
    refresh();
    return { ok: true, message: "Dossier autorisé enregistré." };
  } catch (err) {
    return { error: message(err) };
  }
}

export async function driveImport(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  try {
    const { fetchFileText } = await import("@/lib/drive");
    const repo = await writableRepo();
    const settings = await repo.getSettings();
    if (!settings.driveFolderId) throw new Error("Aucun dossier autorisé.");
    const fileId = str(fd, "fileId");
    const existing = (await repo.listImports()).find((i) => i.driveFileId === fileId);
    const { file, text } = await fetchFileText(fileId, settings.driveFolderId);
    if (!text) throw new Error("Aucun texte exploitable dans ce document.");
    const bookId = optStr(fd, "bookId");
    const hash = sha256(text);
    if (existing && existing.contentHash === hash) return { ok: true, message: `« ${file.name} » est déjà importé et n'a pas changé.` };
    await repo.saveImport({
      id: existing?.id ?? newId(),
      bookId: bookId ?? existing?.bookId ?? null,
      source: "drive_api",
      fileName: file.name,
      mimeType: file.mimeType,
      driveUrl: file.webViewLink ?? null,
      driveFileId: file.id,
      text,
      contentHash: hash,
      status: bookId ?? existing?.bookId ? "linked" : "processed",
      error: null,
      aiDraft: existing?.aiDraft ?? null,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    });
    refresh();
    return { ok: true, message: existing ? `« ${file.name} » mis à jour.` : `« ${file.name} » importé.` };
  } catch (err) {
    return { error: message(err) };
  }
}

export async function driveDisconnect() {
  await requireAdmin();
  const { disconnectDrive } = await import("@/lib/drive");
  await disconnectDrive();
  refresh();
}

/* ─── Assistant IA ───────────────────────────────────────────────────── */

export async function generateDraft(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  try {
    const { draftFromNotes, AI_TASKS } = await import("@/lib/ai");
    const repo = await writableRepo();
    const rec = await repo.getImport(str(fd, "importId"));
    if (!rec?.bookId) throw new Error("Associez d'abord ce document à un ouvrage.");
    const book = await repo.getBook(rec.bookId);
    if (!book) throw new Error("Ouvrage introuvable.");
    const task = str(fd, "task") as keyof typeof AI_TASKS;
    if (!(task in AI_TASKS)) throw new Error("Tâche inconnue.");
    const draft = await draftFromNotes({ task, title: book.title, author: book.author, notes: rec.text });
    await repo.saveImport({ ...rec, aiDraft: `<!-- ${AI_TASKS[task]} · ${new Date().toLocaleString("fr-FR")} · brouillon non publié -->\n\n${draft}`, updatedAt: nowIso() });
    refresh();
    return { ok: true, message: "Brouillon généré — relisez-le avant toute utilisation." };
  } catch (err) {
    return { error: message(err) };
  }
}

/* ─── Document de résumés → fiches ───────────────────────────────────── */

export async function importSummariesToBooks(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  try {
    const repo = await writableRepo();
    const rec = await repo.getImport(str(fd, "importId"));
    if (!rec?.text) throw new Error("Import sans texte.");
    const { applySummaryImport } = await import("@/lib/summaryImport");
    const r = await applySummaryImport(rec);
    refresh();
    const parts = [
      r.created.length && `${r.created.length} fiche(s) créée(s)`,
      r.updated.length && `${r.updated.length} mise(s) à jour (${r.updated.join(", ")})`,
      r.drafts.length && `${r.drafts.length} brouillon(s) inachevé(s) (${r.drafts.join(", ")})`,
      r.errors.length && `erreurs : ${r.errors.join(" ; ")}`,
    ].filter(Boolean);
    return { ok: r.errors.length === 0, message: parts.join(" · ") || "Rien à faire.", error: r.errors.length ? parts.join(" · ") : undefined };
  } catch (err) {
    return { error: message(err) };
  }
}
