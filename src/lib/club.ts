import "server-only";
import { readerClient } from "./supabase/server";

export type Candidate = { id: string; title: string; author: string; year: number | null; coverUrl: string | null; blurb: string; votes: number };
export type Session = { id: string; startsAt: string; title: string; note: string };
export type Round = {
  id: string;
  label: string;
  status: "voting" | "reading" | "archived";
  votingEndsAt: string | null;
  closedAt: string | null;
  winnerId: string | null;
  candidates: Candidate[];
  sessions: Session[];
  members: number;
};

type Row = Record<string, unknown>;

/** Normalise un titre pour comparer avec la bibliothèque (casse, accents, articles, ponctuation). */
export function normTitle(t: string) {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`]/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(le|la|les|l|un|une|des|du|de|the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function hydrate(db: NonNullable<Awaited<ReturnType<typeof readerClient>>>, rounds: Row[]): Promise<Round[]> {
  if (!rounds.length) return [];
  const ids = rounds.map((r) => String(r.id));
  const [{ data: cands }, { data: counts }, { data: sessions }, { data: members }] = await Promise.all([
    db.from("club_candidates").select("id, round_id, title, author, year, cover_url, blurb, created_at").in("round_id", ids).order("created_at"),
    db.from("club_vote_counts").select("round_id, candidate_id, votes").in("round_id", ids),
    db.from("club_sessions").select("id, round_id, starts_at, title, note").in("round_id", ids).order("starts_at"),
    db.from("club_enrollment_counts").select("round_id, members").in("round_id", ids),
  ]);
  const votes = new Map(((counts ?? []) as Row[]).map((c) => [String(c.candidate_id), Number(c.votes)]));
  return rounds.map((r) => ({
    id: String(r.id),
    label: String(r.label),
    status: r.status as Round["status"],
    votingEndsAt: (r.voting_ends_at as string | null) ?? null,
    closedAt: (r.closed_at as string | null) ?? null,
    winnerId: (r.winner_id as string | null) ?? null,
    candidates: ((cands ?? []) as Row[])
      .filter((c) => c.round_id === r.id)
      .map((c) => ({
        id: String(c.id),
        title: String(c.title),
        author: String(c.author ?? ""),
        year: (c.year as number | null) ?? null,
        coverUrl: (c.cover_url as string | null) ?? null,
        blurb: String(c.blurb ?? ""),
        votes: votes.get(String(c.id)) ?? 0,
      })),
    sessions: ((sessions ?? []) as Row[])
      .filter((s) => s.round_id === r.id)
      .map((s) => ({ id: String(s.id), startsAt: String(s.starts_at), title: String(s.title), note: String(s.note ?? "") })),
    members: Number(((members ?? []) as Row[]).find((m) => m.round_id === r.id)?.members ?? 0),
  }));
}

/** Le scrutin actif (vote ou lecture en cours) et les lectures archivées. `null` si le club n'est pas configuré. */
export async function getClub(): Promise<{ active: Round | null; archives: Round[] } | null> {
  const db = await readerClient();
  if (!db) return null;
  const { data, error } = await db.from("club_rounds").select("*").order("created_at", { ascending: false }).limit(25);
  if (error) throw new Error(`Club : ${error.message}`);
  const rounds = await hydrate(db, (data ?? []) as Row[]);
  return { active: rounds.find((r) => r.status !== "archived") ?? null, archives: rounds.filter((r) => r.status === "archived") };
}

/** Voix et inscription du lecteur connecté pour un scrutin (RLS : il ne voit que les siennes). */
export async function getMyClubState(roundId: string): Promise<{ vote: string | null; enrolled: boolean }> {
  const db = await readerClient();
  if (!db) return { vote: null, enrolled: false };
  const { data: u } = await db.auth.getUser();
  if (!u.user) return { vote: null, enrolled: false };
  const [{ data: v }, { data: e }] = await Promise.all([
    db.from("club_votes").select("candidate_id").eq("round_id", roundId).eq("member_id", u.user.id).maybeSingle(),
    db.from("club_enrollments").select("round_id").eq("round_id", roundId).eq("member_id", u.user.id).maybeSingle(),
  ]);
  return { vote: (v?.candidate_id as string | undefined) ?? null, enrolled: Boolean(e) };
}

export const frenchDay = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
