import type { Metadata } from "next";
import Link from "next/link";
import { RefectoryExperience, type ReaderState } from "@/components/library3d/RefectoryExperience";
import { PageShell } from "@/components/PageShell";
import { getPublishedBooks } from "@/lib/library";
import { getLatestPost, getTopic, listTopics } from "@/lib/refectory";
import { getReader } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Le Réfectoire",
  description: "Le forum des lecteurs de l'abbaye SCRYPTORIUM.",
  robots: { index: false, follow: false },
};

export default async function RefectoryPage({ searchParams }: PageProps<"/refectoire">) {
  const sp = await searchParams;
  const wanted = typeof sp.sujet === "string" ? sp.sujet : null;
  const [topics, reader] = await Promise.all([listTopics(), getReader()]);

  if (topics === null) {
    return (
      <PageShell>
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
          <h1 className="display text-5xl">Le Réfectoire</h1>
          <p className="mt-6 text-muted">Le Réfectoire n&apos;est pas encore ouvert.</p>
          <Link href="/abbaye" className="btn mt-10">Plan de l&apos;abbaye</Link>
        </div>
      </PageShell>
    );
  }

  const [books, latest, initialThread] = await Promise.all([
    getPublishedBooks().then((list) => list.map((b) => ({ id: b.id, title: b.title })).sort((a, b) => a.title.localeCompare(b.title, "fr"))),
    getLatestPost(),
    wanted ? getTopic(wanted) : Promise.resolve(null),
  ]);
  const state: ReaderState = !reader
    ? { id: null, status: "guest" }
    : { id: reader.id, status: reader.banned ? "banned" : reader.needsPseudo ? "needsPseudo" : "member" };

  return <RefectoryExperience topics={topics} reader={state} books={books} latest={latest} initialThread={initialThread} />;
}
