import type { Metadata } from "next";
import { ScriptoriumExperience, type ScriptoriumEntry } from "@/components/library3d/ScriptoriumExperience";
import { getPublishedBooks } from "@/lib/library";
import { getRepo } from "@/lib/store";
import { NOTE_KIND_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Le Scriptorium",
  description: "La lecture en cours du bibliothécaire, son avancement et ses notes, recopiées par le copiste.",
};

export default async function ScriptoriumPage() {
  const books = (await getPublishedBooks()).filter((b) => b.status === "reading");
  const repo = getRepo();
  const entries: ScriptoriumEntry[] = await Promise.all(
    books.map(async (b) => {
      const notes = (await repo.listNotes(b.id))
        .filter((n) => n.visibility === "public")
        .sort((x, y) => y.createdAt.localeCompare(x.createdAt));
      return {
        id: b.id,
        slug: b.slug,
        title: b.title,
        author: b.author,
        year: b.year,
        color: b.color,
        coverUrl: b.coverUrl,
        pages: b.pages,
        currentPage: b.currentPage,
        readStartedAt: b.readStartedAt,
        notes: notes.map((n) => ({ id: n.id, kind: n.kind, kindLabel: NOTE_KIND_LABELS[n.kind], pageRef: n.pageRef, content: n.content })),
      };
    }),
  );
  // La lecture la plus récemment mise à jour d'abord.
  entries.sort((a, b) => (books.find((x) => x.id === b.id)?.updatedAt ?? "").localeCompare(books.find((x) => x.id === a.id)?.updatedAt ?? ""));
  return <ScriptoriumExperience entries={entries} />;
}
