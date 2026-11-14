import Link from "next/link";
import { serviceClient } from "@/lib/supabase/admin";
import { frenchDateTime } from "@/lib/refectory";
import { resolveReport, setBanned, setPostHidden, setTopicHidden } from "./actions";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? (v[0] as T) ?? null : (v as T) ?? null);

/** Modération du Réfectoire : signalements ouverts, sujets récents, membres bannis. */
export default async function RefectoryModeration() {
  const s = serviceClient();
  if (!s) {
    return <p className="text-muted">Le Réfectoire nécessite Supabase.</p>;
  }
  const [{ data: reports }, { data: topics }, { data: banned }] = await Promise.all([
    s.from("refectory_reports")
      .select("id, reason, created_at, reporter:profiles(display_name), post:refectory_posts(id, content, hidden, topic_id, author_id, author:profiles(display_name, banned))")
      .eq("resolved", false)
      .order("created_at", { ascending: false }),
    s.from("refectory_topics").select("id, title, hidden, post_count, last_post_at, author:profiles(display_name)").order("last_post_at", { ascending: false }).limit(30),
    s.from("profiles").select("id, display_name").eq("banned", true),
  ]);

  return (
    <div className="space-y-12">
      <header>
        <p className="eyebrow">Réfectoire</p>
        <h1 className="display mt-2 text-4xl">Modération</h1>
        <p className="mt-2 text-sm text-muted">Les messages paraissent tout de suite ; vous intervenez après coup. Masquer est réversible.</p>
      </header>

      <section>
        <h2 className="display text-2xl">Signalements ouverts · {reports?.length ?? 0}</h2>
        {!reports?.length ? (
          <p className="mt-3 text-sm text-muted">Aucun signalement en attente.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {(reports as Row[]).map((r) => {
              const post = one<{ id: string; content: string; hidden: boolean; topic_id: string; author_id: string; author: unknown }>(r.post);
              const author = one<{ display_name: string; banned: boolean }>(post?.author);
              const reporter = one<{ display_name: string }>(r.reporter);
              if (!post) return null;
              return (
                <li key={String(r.id)} className="panel space-y-3 p-5">
                  <p className="text-xs text-muted">
                    Signalé par {reporter?.display_name ?? "?"} le {frenchDateTime(String(r.created_at))}
                    {r.reason ? <> · motif : « {String(r.reason)} »</> : null}
                  </p>
                  <p className="whitespace-pre-line border-l border-gold/40 pl-3 font-[family-name:var(--font-serif)] text-parchment/90">{post.content}</p>
                  <p className="text-sm text-muted">Auteur : {author?.display_name ?? "?"}{author?.banned ? " (banni)" : ""} · <Link className="link-gilt text-gold" href={`/refectoire/${post.topic_id}#m-${post.id}`}>voir dans le sujet</Link></p>
                  <div className="flex flex-wrap gap-3">
                    <form action={setPostHidden.bind(null, post.id, !post.hidden)}><button className="btn btn-ghost px-3 py-1.5 text-[0.65rem]">{post.hidden ? "Rétablir le message" : "Masquer le message"}</button></form>
                    <form action={setBanned.bind(null, post.author_id, !author?.banned)}><button className="btn btn-ghost px-3 py-1.5 text-[0.65rem]">{author?.banned ? "Lever le bannissement" : "Bannir l'auteur"}</button></form>
                    <form action={resolveReport.bind(null, String(r.id))}><button className="btn btn-ghost px-3 py-1.5 text-[0.65rem]">Classer sans suite</button></form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="display text-2xl">Sujets récents</h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {((topics as Row[]) ?? []).map((t) => (
            <li key={String(t.id)} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className={t.hidden ? "text-muted line-through" : "text-parchment"}>
                <Link href={`/refectoire/${String(t.id)}`} className="link-gilt">{String(t.title)}</Link>
                <span className="ml-2 text-xs text-muted">par {one<{ display_name: string }>(t.author)?.display_name ?? "?"} · {String(t.post_count)} msg</span>
              </span>
              <form action={setTopicHidden.bind(null, String(t.id), !t.hidden)}><button className="btn btn-ghost px-3 py-1.5 text-[0.65rem]">{t.hidden ? "Rétablir" : "Masquer le sujet"}</button></form>
            </li>
          ))}
          {!topics?.length && <li className="py-3 text-sm text-muted">Aucun sujet.</li>}
        </ul>
      </section>

      <section>
        <h2 className="display text-2xl">Membres bannis · {banned?.length ?? 0}</h2>
        <ul className="mt-4 space-y-2">
          {((banned as Row[]) ?? []).map((p) => (
            <li key={String(p.id)} className="flex items-center justify-between gap-3">
              <span>{String(p.display_name)}</span>
              <form action={setBanned.bind(null, String(p.id), false)}><button className="btn btn-ghost px-3 py-1.5 text-[0.65rem]">Lever le bannissement</button></form>
            </li>
          ))}
          {!banned?.length && <li className="text-sm text-muted">Personne.</li>}
        </ul>
      </section>
    </div>
  );
}
