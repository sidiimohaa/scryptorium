"use server";
import { revalidatePath } from "next/cache";
import { getTopic } from "@/lib/refectory";
import { getReader, readerClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/admin";

export type FormState = { ok: boolean; message: string; id?: string } | null;

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);

/** Membre autorisé à écrire : connecté, pseudo choisi, non banni. */
async function writer() {
  const reader = await getReader();
  const db = await readerClient();
  if (!reader || !db) return { error: "Connectez-vous pour prendre la parole." } as const;
  if (reader.banned) return { error: "Votre compte ne peut plus écrire au Réfectoire." } as const;
  if (reader.needsPseudo) return { error: "Choisissez d'abord votre pseudo dans « Mon compte »." } as const;
  return { reader, db } as const;
}

/** Anti-déluge : un message toutes les 15 secondes par membre. */
async function tooSoon(db: NonNullable<Awaited<ReturnType<typeof readerClient>>>, authorId: string) {
  const { data } = await db.from("refectory_posts").select("created_at").eq("author_id", authorId).order("created_at", { ascending: false }).limit(1);
  const last = data?.[0]?.created_at as string | undefined;
  return last ? Date.now() - new Date(last).getTime() < 15_000 : false;
}

export async function createTopic(_prev: FormState, fd: FormData): Promise<FormState> {
  const w = await writer();
  if ("error" in w) return { ok: false, message: w.error! };
  const title = clean(fd.get("title"), 120).replace(/\s+/g, " ");
  const content = clean(fd.get("content"), 4000);
  const bookId = clean(fd.get("bookId"), 200) || null;
  if (title.length < 3) return { ok: false, message: "Le titre doit faire au moins 3 caractères." };
  if (!content) return { ok: false, message: "Écrivez le premier message du sujet." };
  if (await tooSoon(w.db, w.reader.id)) return { ok: false, message: "Patientez quelques secondes avant d'écrire à nouveau." };
  const { data: topic, error } = await w.db.from("refectory_topics").insert({ title, author_id: w.reader.id, book_id: bookId }).select("id").single();
  if (error || !topic) return { ok: false, message: "Le sujet n'a pas pu être ouvert." };
  const { error: postError } = await w.db.from("refectory_posts").insert({
    topic_id: topic.id,
    author_id: w.reader.id,
    content,
    has_spoilers: fd.get("hasSpoilers") === "on",
  });
  if (postError) {
    // Pas de sujet vide : on retire le sujet si son premier message a échoué.
    await serviceClient()?.from("refectory_topics").delete().eq("id", topic.id);
    return { ok: false, message: "Le message n'a pas pu être publié." };
  }
  revalidatePath("/refectoire");
  return { ok: true, message: "", id: topic.id as string };
}

/** Fil d'un sujet, pour la salle 3D (lu avec la session du visiteur : RLS). */
export async function loadThread(id: string) {
  return getTopic(id);
}

export async function createPost(_prev: FormState, fd: FormData): Promise<FormState> {
  const w = await writer();
  if ("error" in w) return { ok: false, message: w.error! };
  const topicId = clean(fd.get("topicId"), 36);
  const content = clean(fd.get("content"), 4000);
  if (!content) return { ok: false, message: "Le message est vide." };
  if (await tooSoon(w.db, w.reader.id)) return { ok: false, message: "Patientez quelques secondes avant d'écrire à nouveau." };
  const { error } = await w.db.from("refectory_posts").insert({ topic_id: topicId, author_id: w.reader.id, content, has_spoilers: fd.get("hasSpoilers") === "on" });
  if (error) return { ok: false, message: "Le message n'a pas pu être publié." };
  revalidatePath(`/refectoire/${topicId}`);
  return { ok: true, message: "" };
}

export async function reportPost(postId: string, reason: string): Promise<FormState> {
  const w = await writer();
  if ("error" in w) return { ok: false, message: w.error! };
  const { error } = await w.db.from("refectory_reports").insert({ post_id: postId, reporter_id: w.reader.id, reason: reason.trim().slice(0, 500) });
  if (error && error.code !== "23505") return { ok: false, message: "Le signalement n'a pas pu être envoyé." };
  return { ok: true, message: "Merci : le bibliothécaire examinera ce message." };
}

export async function deleteOwnPost(postId: string, topicId: string): Promise<FormState> {
  const reader = await getReader();
  const db = await readerClient();
  if (!reader || !db) return { ok: false, message: "Session expirée." };
  const { error } = await db.from("refectory_posts").delete().eq("id", postId).eq("author_id", reader.id);
  if (error) return { ok: false, message: "Suppression impossible." };
  revalidatePath(`/refectoire/${topicId}`);
  return { ok: true, message: "" };
}
