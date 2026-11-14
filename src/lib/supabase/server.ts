import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readerAuthEnv } from "./env";

/**
 * Client Supabase « lecteur » côté serveur : clé publique + session du visiteur (cookies),
 * donc soumis aux politiques RLS. À créer à chaque requête. `null` si les comptes ne sont pas configurés.
 */
export async function readerClient() {
  const env = readerAuthEnv();
  if (!env) return null;
  const store = await cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Composant serveur : écriture impossible ; le Proxy rafraîchit la session.
        }
      },
    },
  });
}

export type Reader = { id: string; displayName: string; role: "admin" | "member"; needsPseudo: boolean };

/** Le lecteur connecté (session vérifiée auprès de Supabase), ou `null`. */
export async function getReader(): Promise<Reader | null> {
  const supabase = await readerClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("display_name, role, preferences").eq("id", data.user.id).maybeSingle();
  if (!profile) return { id: data.user.id, displayName: "", role: "member", needsPseudo: true };
  return {
    id: data.user.id,
    displayName: profile.display_name,
    role: profile.role === "admin" ? "admin" : "member",
    needsPseudo: !(profile.preferences as { pseudoChosen?: boolean } | null)?.pseudoChosen,
  };
}
