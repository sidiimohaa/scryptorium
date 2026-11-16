"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { normTitle } from "@/lib/club";
import { getRepo } from "@/lib/store";
import { serviceClient } from "@/lib/supabase/admin";

export type ClubFormState = { ok: boolean; message: string } | null;

async function db() {
  await requireAdmin();
  const s = serviceClient();
  if (!s) throw new Error("Supabase n'est pas configuré.");
  return s;
}
const done = () => {
  revalidatePath("/bureau/capitulaire");
  revalidatePath("/capitulaire");
};
const str = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);

/** « AAAA-MM-JJTHH:mm » saisi à l'heure de Paris, converti en instant UTC. */
function parisToIso(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const paris = new Date(new Date(guess).toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const utc = new Date(new Date(guess).toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess - (paris.getTime() - utc.getTime())).toISOString();
}

export async function openRound(_p: ClubFormState, fd: FormData): Promise<ClubFormState> {
  const s = await db();
  const label = str(fd, "label", 80);
  if (label.length < 3) return { ok: false, message: "Donnez un intitulé (ex. « Lecture de décembre 2026 »)." };
  const ends = str(fd, "votingEndsAt", 20);
  const { error } = await s.from("club_rounds").insert({ label, status: "voting", voting_ends_at: ends ? parisToIso(`${ends}T23:59`) : null });
  if (error) return { ok: false, message: error.code === "23505" ? "Un scrutin est déjà en cours : archivez-le d'abord." : "Le scrutin n'a pas pu être ouvert." };
  done();
  return { ok: true, message: "Scrutin ouvert." };
}

/**
 * Choix direct du livre du mois, sans vote : un livre déjà présent dans la bibliothèque devient la
 * lecture en cours. La règle « hors bibliothèque » ne vaut que pour les livres proposés au vote.
 */
export async function chooseBook(_p: ClubFormState, fd: FormData): Promise<ClubFormState> {
  const s = await db();
  const label = str(fd, "label", 80);
  if (label.length < 3) return { ok: false, message: "Donnez un intitulé (ex. « Lecture de décembre 2026 »)." };
  const book = (await getRepo().listBooks()).find((b) => b.id === str(fd, "bookId", 64));
  if (!book) return { ok: false, message: "Choisissez un livre de la bibliothèque." };
  const { data: round, error } = await s
    .from("club_rounds")
    .insert({ label, status: "reading", closed_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error || !round) return { ok: false, message: error?.code === "23505" ? "Une lecture ou un scrutin est déjà en cours : archivez-le d'abord." : "La lecture n'a pas pu être ouverte." };
  const cover = book.coverUrl && (/^https:\/\//.test(book.coverUrl) || book.coverUrl.startsWith("/")) ? book.coverUrl : null;
  const { data: cand, error: cErr } = await s
    .from("club_candidates")
    .insert({
      round_id: round.id,
      title: book.title.slice(0, 300),
      author: book.author.slice(0, 200),
      year: book.year,
      cover_url: cover,
      // le résumé du bibliothécaire, s'il ne dévoile pas l'intrigue
      blurb: book.summarySpoilers ? "" : book.summary.replace(/[#>*_]/g, "").replace(/\s+/g, " ").trim().slice(0, 600),
    })
    .select("id")
    .single();
  if (cErr || !cand) {
    await s.from("club_rounds").delete().eq("id", round.id);
    return { ok: false, message: "La lecture n'a pas pu être ouverte." };
  }
  await s.from("club_rounds").update({ winner_id: cand.id }).eq("id", round.id);
  done();
  return { ok: true, message: `« ${book.title} » est la lecture du mois.` };
}

export async function addCandidate(_p: ClubFormState, fd: FormData): Promise<ClubFormState> {
  const s = await db();
  const roundId = str(fd, "roundId", 36);
  const title = str(fd, "title", 300);
  const author = str(fd, "author", 200);
  if (!title) return { ok: false, message: "Le titre est requis." };
  // Le club lit des livres qui ne sont pas encore dans la bibliothèque.
  const books = await getRepo().listBooks();
  const n = normTitle(title);
  const clash = books.find((b) => normTitle(b.title) === n || normTitle(b.originalTitle ?? "") === n);
  if (clash) return { ok: false, message: `« ${clash.title} » est déjà dans la bibliothèque : le club choisit des livres qui n'y sont pas encore.` };
  const yearRaw = Number(str(fd, "year", 6));
  const cover = str(fd, "coverUrl", 2000);
  const { error } = await s.from("club_candidates").insert({
    round_id: roundId,
    title,
    author,
    year: Number.isInteger(yearRaw) && yearRaw > -3000 && yearRaw < 3000 && yearRaw !== 0 ? yearRaw : null,
    cover_url: /^https:\/\//.test(cover) ? cover : null,
    blurb: str(fd, "blurb", 1000),
  });
  if (error) return { ok: false, message: "Le candidat n'a pas pu être ajouté." };
  done();
  return { ok: true, message: `« ${title} » ajouté au scrutin.` };
}

export async function removeCandidate(id: string) {
  const s = await db();
  await s.from("club_candidates").delete().eq("id", id);
  done();
}

export async function closeVoting(fd: FormData) {
  const s = await db();
  const roundId = str(fd, "roundId", 36);
  const winnerId = str(fd, "winnerId", 36);
  if (!winnerId) return;
  await s.from("club_rounds").update({ status: "reading", winner_id: winnerId, closed_at: new Date().toISOString() }).eq("id", roundId);
  done();
}

export async function addSession(_p: ClubFormState, fd: FormData): Promise<ClubFormState> {
  const s = await db();
  const startsAt = parisToIso(str(fd, "startsAt", 20));
  const title = str(fd, "title", 160);
  if (!startsAt) return { ok: false, message: "Date et heure invalides." };
  if (title.length < 2) return { ok: false, message: "Donnez un intitulé à la séance." };
  const { error } = await s.from("club_sessions").insert({ round_id: str(fd, "roundId", 36), starts_at: startsAt, title, note: str(fd, "note", 500) });
  if (error) return { ok: false, message: "La séance n'a pas pu être ajoutée." };
  done();
  return { ok: true, message: "Séance ajoutée." };
}

export async function removeSession(id: string) {
  const s = await db();
  await s.from("club_sessions").delete().eq("id", id);
  done();
}

export async function archiveRound(id: string) {
  const s = await db();
  await s.from("club_rounds").update({ status: "archived" }).eq("id", id);
  done();
}
