import "server-only";
import { readerClient } from "./supabase/server";

export type TopicSummary = {
  id: string;
  title: string;
  author: string;
  postCount: number;
  createdAt: string;
  lastPostAt: string;
  book: { title: string; slug: string } | null;
  /** Message dans les 7 derniers jours : la chandelle de sa place est allumée. */
  active: boolean;
};

export type Post = {
  id: string;
  authorId: string;
  author: string;
  content: string;
  hasSpoilers: boolean;
  createdAt: string;
};

type Row = Record<string, unknown>;
const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? (v[0] as T) ?? null : (v as T) ?? null);

function toTopic(r: Row): TopicSummary {
  const author = one<{ display_name: string }>(r.author);
  const book = one<{ title: string; slug: string }>(r.book);
  return {
    id: String(r.id),
    title: String(r.title),
    author: author?.display_name ?? "lecteur",
    postCount: Number(r.post_count ?? 0),
    createdAt: String(r.created_at),
    lastPostAt: String(r.last_post_at),
    book: book ? { title: book.title, slug: book.slug } : null,
    active: Date.now() - new Date(String(r.last_post_at)).getTime() < 7 * 24 * 3600 * 1000,
  };
}

export function toPost(r: Row): Post {
  const author = one<{ display_name: string }>(r.author);
  return {
    id: String(r.id),
    authorId: String(r.author_id),
    author: author?.display_name ?? "lecteur",
    content: String(r.content),
    hasSpoilers: Boolean(r.has_spoilers),
    createdAt: String(r.created_at),
  };
}

const TOPIC_COLS = "id, title, post_count, created_at, last_post_at, author:profiles(display_name), book:books(title, slug)";

/** Sujets visibles (RLS : non masqués), du plus récemment animé au plus ancien. `null` si les comptes sont fermés. */
export async function listTopics(): Promise<TopicSummary[] | null> {
  const db = await readerClient();
  if (!db) return null;
  const { data, error } = await db.from("refectory_topics").select(TOPIC_COLS).order("last_post_at", { ascending: false }).limit(100);
  if (error) throw new Error(`Réfectoire : ${error.message}`);
  return (data as Row[]).map(toTopic);
}

export async function getTopic(id: string): Promise<{ topic: TopicSummary; posts: Post[] } | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await readerClient();
  if (!db) return null;
  const { data: t } = await db.from("refectory_topics").select(TOPIC_COLS).eq("id", id).maybeSingle();
  if (!t) return null;
  const { data: posts, error } = await db
    .from("refectory_posts")
    .select("id, author_id, content, has_spoilers, created_at, author:profiles(display_name)")
    .eq("topic_id", id)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw new Error(`Réfectoire : ${error.message}`);
  return { topic: toTopic(t as Row), posts: (posts as Row[]).map(toPost) };
}

export type LatestPost = { topicId: string; topicTitle: string; author: string; content: string };

/** Dernier message publié sans révélations (lu par le moine en chaire). */
export async function getLatestPost(): Promise<LatestPost | null> {
  const db = await readerClient();
  if (!db) return null;
  const { data } = await db
    .from("refectory_posts")
    .select("content, topic_id, author:profiles(display_name), topic:refectory_topics(title)")
    .eq("has_spoilers", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const r = data as Row;
  return {
    topicId: String(r.topic_id),
    topicTitle: one<{ title: string }>(r.topic)?.title ?? "",
    author: one<{ display_name: string }>(r.author)?.display_name ?? "lecteur",
    content: String(r.content),
  };
}

export const frenchDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
