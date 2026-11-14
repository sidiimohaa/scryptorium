"use client";
import { createBrowserClient } from "@supabase/ssr";

/** Client Supabase du navigateur (clé publique) ; `null` si les comptes ne sont pas configurés. */
export function browserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createBrowserClient(url, key) : null;
}
