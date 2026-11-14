import { NextResponse, type NextRequest } from "next/server";
import { readerClient } from "@/lib/supabase/server";

/** Retour du lien de connexion envoyé par e-mail : échange le code contre une session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/compte";
  const supabase = await readerClient();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${target}`);
  }
  return NextResponse.redirect(`${origin}/connexion?erreur=lien`);
}
