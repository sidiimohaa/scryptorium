"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { readerClient } from "@/lib/supabase/server";

export type MagicLinkState = { ok: boolean; message: string } | null;

export async function sendMagicLink(_prev: MagicLinkState, fd: FormData): Promise<MagicLinkState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { ok: false, message: "Adresse e-mail invalide." };
  const supabase = await readerClient();
  if (!supabase) return { ok: false, message: "Les comptes lecteurs ne sont pas encore ouverts." };
  const h = await headers();
  const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/auth/callback` } });
  if (error) {
    const rate = /rate|seconds|too many/i.test(error.message);
    return { ok: false, message: rate ? "Trop de demandes : réessayez dans quelques minutes." : "L'envoi du lien a échoué. Réessayez plus tard." };
  }
  return { ok: true, message: "Un lien de connexion vient de partir. Ouvrez-le depuis ce navigateur." };
}

export async function signOut() {
  const supabase = await readerClient();
  await supabase?.auth.signOut();
  redirect("/");
}
