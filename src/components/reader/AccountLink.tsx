"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase/browser";

/** Lien de l'en-tête : « Se connecter », ou le pseudo du lecteur connecté. Rien si les comptes sont fermés. */
export function AccountLink() {
  const [state, setState] = useState<{ ready: boolean; name: string | null }>({ ready: false, name: null });
  useEffect(() => {
    const supabase = browserClient();
    if (!supabase) return;
    let alive = true;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return alive && setState({ ready: true, name: null });
      const { data: p } = await supabase.from("profiles").select("display_name, preferences").eq("id", user.id).maybeSingle();
      const chosen = (p?.preferences as { pseudoChosen?: boolean } | null)?.pseudoChosen;
      if (alive) setState({ ready: true, name: chosen && p ? p.display_name : "Mon compte" });
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void load());
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  if (!state.ready) return null;
  return (
    <Link href={state.name ? "/compte" : "/connexion"} className="link-gilt hidden whitespace-nowrap text-[0.7rem] uppercase tracking-[0.2em] text-parchment/80 sm:inline">
      {state.name ?? "Se connecter"}
    </Link>
  );
}
