/** Comptes lecteurs actifs seulement si l'URL du projet et la clé publique (anon / publishable) sont définies. */
export function readerAuthEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}
