import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { LiveTopic } from "@/components/refectory/LiveTopic";
import { getTopic } from "@/lib/refectory";
import { getReader } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Le Réfectoire", robots: { index: false, follow: false } };

export default async function TopicPage({ params }: PageProps<"/refectoire/[id]">) {
  const { id } = await params;
  const [data, reader] = await Promise.all([getTopic(id), getReader()]);
  if (!data) notFound();
  const { topic, posts } = data;
  const blocked = !reader
    ? "Pour répondre, entrez comme lecteur depuis la page Connexion."
    : reader.banned
      ? "Votre compte ne peut plus écrire au Réfectoire."
      : reader.needsPseudo
        ? "Choisissez d'abord votre pseudo dans « Mon compte »."
        : null;
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-5 py-16 md:px-10">
        <Link href="/refectoire" className="link-gilt text-xs uppercase tracking-[0.2em] text-parchment/70">← Le Réfectoire</Link>
        <h1 className="display mt-6 text-4xl md:text-5xl">{topic.title}</h1>
        <p className="mt-3 text-sm text-muted">
          Ouvert par {topic.author}
          {topic.book && <> · à propos de <Link href={`/livres/${topic.book.slug}`} className="link-gilt text-gold-soft">{topic.book.title}</Link></>}
        </p>
        <div className="mt-10">
          <LiveTopic topicId={topic.id} initial={posts} me={reader?.id ?? null} canWrite={blocked === null} blockedReason={blocked} />
        </div>
      </div>
    </PageShell>
  );
}
