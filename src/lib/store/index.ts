import "server-only";
import { createLocalRepository } from "./local";
import { createSupabaseRepository } from "./supabase";
import type { Repository } from "./repository";

let repo: Repository | null = null;

/** Supabase when configured, otherwise the local JSON archive in /data. */
export function getRepo(): Repository {
  if (repo) return repo;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  repo = url && key ? createSupabaseRepository(url, key) : createLocalRepository();
  return repo;
}

export type { Repository };
