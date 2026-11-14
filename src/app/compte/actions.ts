"use server";
import { revalidatePath } from "next/cache";
import { readerClient, getReader } from "@/lib/supabase/server";

export type PseudoState = { ok: boolean; message: string } | null;

/** Pseudo : 3 à 24 caractères, lettres (accents compris), chiffres, espace, point, tiret, tiret bas. Unique sans tenir compte de la casse. */
export async function savePseudo(_prev: PseudoState, fd: FormData): Promise<PseudoState> {
  const pseudo = String(fd.get("pseudo") ?? "").trim().replace(/\s+/g, " ");
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]{1,22}[\p{L}\p{N}]$/u.test(pseudo)) {
    return { ok: false, message: "3 à 24 caractères : lettres, chiffres, espace, point ou tiret ; commence et finit par une lettre ou un chiffre." };
  }
  const reader = await getReader();
  const supabase = await readerClient();
  if (!reader || !supabase) return { ok: false, message: "Session expirée : reconnectez-vous." };
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: pseudo, preferences: { pseudoChosen: true } })
    .eq("id", reader.id);
  if (error) {
    if (error.code === "23505") return { ok: false, message: "Ce pseudo est déjà pris." };
    return { ok: false, message: "L'enregistrement a échoué. Réessayez." };
  }
  revalidatePath("/compte");
  return { ok: true, message: "Pseudo enregistré." };
}
