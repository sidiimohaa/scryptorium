import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Client « service_role » pour la modération du Bureau (contourne la RLS). Jamais exposé au navigateur. */
export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}
