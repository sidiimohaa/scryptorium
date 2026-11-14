"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { createPost, deleteOwnPost, reportPost, type FormState } from "@/app/refectoire/actions";
import { browserClient } from "@/lib/supabase/browser";
import { SpoilerReveal } from "../SpoilerReveal";

export type LivePost = { id: string; authorId: string; author: string; content: string; hasSpoilers: boolean; createdAt: string };

const when = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Fil d'un sujet : messages initiaux, puis nouveaux messages en direct (Supabase Realtime, filtré par la RLS). */
export function LiveTopic({ topicId, initial, me, canWrite, blockedReason }: {
  topicId: string;
  initial: LivePost[];
  me: string | null;
  canWrite: boolean;
  blockedReason: string | null;
}) {
  const [posts, setPosts] = useState(initial);
  const names = useRef(new Map(initial.map((p) => [p.authorId, p.author])));
  // Les données du serveur font foi après une action (publication, suppression).
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setPosts(initial);
  }

  useEffect(() => {
    const supabase = browserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`refectoire:${topicId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "refectory_posts", filter: `topic_id=eq.${topicId}` }, async (payload) => {
        const r = payload.new as { id: string; author_id: string; content: string; has_spoilers: boolean; created_at: string; hidden: boolean };
        if (r.hidden) return;
        let author: string = names.current.get(r.author_id) ?? "";
        if (!author) {
          const { data } = await supabase.from("profiles").select("display_name").eq("id", r.author_id).maybeSingle();
          author = (data?.display_name as string | undefined) ?? "lecteur";
          names.current.set(r.author_id, author);
        }
        const post: LivePost = { id: r.id, authorId: r.author_id, author, content: r.content, hasSpoilers: r.has_spoilers, createdAt: r.created_at };
        setPosts((list) => (list.some((p) => p.id === post.id) ? list : [...list, post]));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [topicId]);

  return (
    <>
      <ol className="space-y-4">
        {posts.map((p, i) => (
          <PostItem key={p.id} post={p} first={i === 0} topicId={topicId} mine={p.authorId === me} canReport={canWrite && p.authorId !== me}
            onRemoved={() => setPosts((list) => list.filter((x) => x.id !== p.id))} />
        ))}
      </ol>
      <div className="mt-10">
        {canWrite ? <ReplyForm topicId={topicId} /> : <p className="border border-line p-5 text-sm text-muted">{blockedReason}</p>}
      </div>
    </>
  );
}

function Body({ text }: { text: string }) {
  return <div className="whitespace-pre-line break-words font-[family-name:var(--font-serif)] text-lg leading-relaxed text-parchment/90">{text}</div>;
}

function PostItem({ post, first, topicId, mine, canReport, onRemoved }: {
  post: LivePost; first: boolean; topicId: string; mine: boolean; canReport: boolean; onRemoved: () => void;
}) {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <li id={`m-${post.id}`} className={`border border-line p-5 md:p-6 ${first ? "bg-ink-2/80" : "bg-ink/60"}`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-[family-name:var(--font-display)] text-xl text-gold-bright">{post.author}</p>
        <p className="text-xs text-muted">{when(post.createdAt)}</p>
      </div>
      {post.hasSpoilers ? (
        <SpoilerReveal label="Message avec révélations"><Body text={post.content} /></SpoilerReveal>
      ) : (
        <Body text={post.content} />
      )}
      <div className="mt-3 flex gap-4 text-[0.65rem] uppercase tracking-[0.18em]">
        {mine && !first && (
          <button type="button" disabled={busy} className="text-muted hover:text-parchment" onClick={async () => {
            if (!confirm("Supprimer définitivement votre message ?")) return;
            setBusy(true);
            const r = await deleteOwnPost(post.id, topicId);
            setBusy(false);
            if (r && !r.ok) setNote(r.message);
            else onRemoved();
          }}>Supprimer</button>
        )}
        {canReport && (
          <button type="button" disabled={busy || note !== null} className="text-muted hover:text-parchment" onClick={async () => {
            const reason = prompt("Pourquoi signaler ce message ? (facultatif)") ?? null;
            if (reason === null) return;
            setBusy(true);
            const r = await reportPost(post.id, reason);
            setBusy(false);
            setNote(r?.message ?? null);
          }}>Signaler</button>
        )}
      </div>
      {note && <p role="status" className="mt-2 text-sm text-gold">{note}</p>}
    </li>
  );
}

function ReplyForm({ topicId }: { topicId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createPost, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="space-y-3">
      <input type="hidden" name="topicId" value={topicId} />
      <label className="block">
        <span className="label">Votre réponse</span>
        <textarea name="content" required maxLength={4000} rows={4} className="field" />
      </label>
      <label className="flex items-center gap-3 text-sm text-parchment/80">
        <input type="checkbox" name="hasSpoilers" className="accent-[#c3a16b]" /> Révèle l&apos;intrigue (masqué par défaut)
      </label>
      {state && !state.ok && <p role="alert" className="text-sm text-[#e08a7a]">{state.message}</p>}
      <button type="submit" disabled={pending} className="btn">{pending ? "Envoi…" : "Répondre"}</button>
    </form>
  );
}
