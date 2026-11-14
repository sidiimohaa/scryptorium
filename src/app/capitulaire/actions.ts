"use server";
import { revalidatePath } from "next/cache";
import { getReader, readerClient } from "@/lib/supabase/server";

export type ClubActionResult = { ok: boolean; message: string };

async function member() {
  const reader = await getReader();
  const db = await readerClient();
  if (!reader || !db) return { error: "Connectez-vous pour voter ou vous inscrire." } as const;
  if (reader.banned) return { error: "Votre compte ne peut plus participer au club." } as const;
  if (reader.needsPseudo) return { error: "Choisissez d'abord votre pseudo dans « Mon compte »." } as const;
  return { reader, db } as const;
}

/** Une voix par membre et par scrutin ; voter pour un autre livre déplace la voix (RLS : vote ouvert seulement). */
export async function castVote(roundId: string, candidateId: string): Promise<ClubActionResult> {
  const m = await member();
  if ("error" in m) return { ok: false, message: m.error! };
  const { error } = await m.db.from("club_votes").upsert({ round_id: roundId, member_id: m.reader.id, candidate_id: candidateId }, { onConflict: "round_id,member_id" });
  if (error) return { ok: false, message: "Le vote n'a pas pu être enregistré (le scrutin est peut-être clos)." };
  revalidatePath("/capitulaire");
  return { ok: true, message: "Votre voix est comptée." };
}

export async function withdrawVote(roundId: string): Promise<ClubActionResult> {
  const m = await member();
  if ("error" in m) return { ok: false, message: m.error! };
  await m.db.from("club_votes").delete().eq("round_id", roundId).eq("member_id", m.reader.id);
  revalidatePath("/capitulaire");
  return { ok: true, message: "Voix retirée." };
}

export async function setEnrollment(roundId: string, join: boolean): Promise<ClubActionResult> {
  const m = await member();
  if ("error" in m) return { ok: false, message: m.error! };
  const q = join
    ? m.db.from("club_enrollments").insert({ round_id: roundId, member_id: m.reader.id })
    : m.db.from("club_enrollments").delete().eq("round_id", roundId).eq("member_id", m.reader.id);
  const { error } = await q;
  if (error && error.code !== "23505") return { ok: false, message: "L'inscription n'a pas pu être enregistrée." };
  revalidatePath("/capitulaire");
  return { ok: true, message: join ? "Vous êtes inscrit à cette lecture." : "Inscription retirée." };
}
