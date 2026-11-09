import Link from "next/link";
import { notFound } from "next/navigation";
import { BookForm } from "@/components/bureau/BookForm";
import { BookActions } from "@/components/bureau/BookActions";
import { NotesPanel } from "@/components/bureau/NotesPanel";
import { ReviewForm } from "@/components/bureau/ReviewForm";
import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/store";
import { VISIBILITY_LABELS } from "@/lib/types";

export const metadata = { title: "Modifier une fiche" };

export default async function EditBookPage({ params, searchParams }: PageProps<"/bureau/livres/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const repo = getRepo();
  const book = await repo.getBook(id);
  if (!book) notFound();
  const [categories, settings, notes, reviews, imports] = await Promise.all([
    repo.listCategories(),
    repo.getSettings(),
    repo.listNotes(id),
    repo.listReviews(id),
    repo.listImports(),
  ]);
  const linked = imports.filter((i) => i.bookId === id);

  return (
    <div className="max-w-5xl space-y-12">
      <div>
        <Link href="/bureau" className="link-gilt text-xs uppercase tracking-[0.2em] text-muted">← Registre</Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Fiche · {VISIBILITY_LABELS[book.visibility]}</p>
            <h1 className="display mt-3 text-5xl">{book.title}</h1>
            <p className="mt-2 font-[family-name:var(--font-serif)] text-xl italic text-gold-bright">{book.author}</p>
          </div>
          <BookActions book={book} />
        </div>
        {sp.cree === "1" && <p role="status" className="mt-6 text-sm text-gold-bright">Fiche créée en brouillon. Complétez-la, puis publiez-la quand vous le souhaitez.</p>}
      </div>

      <BookForm book={book} categories={categories} ratingScale={settings.ratingScale} />
      <ReviewForm bookId={book.id} current={reviews[0]} />
      {reviews.length > 1 && (
        <p className="text-sm text-muted">{reviews.length - 1} avis antérieur(s) conservé(s) dans <Link href="/archives" className="link-gilt text-gold">Les Archives</Link>.</p>
      )}
      <NotesPanel bookId={book.id} notes={notes} />

      <section className="panel space-y-4 p-6 md:p-8">
        <h2 className="display text-3xl">Documents associés</h2>
        {linked.length === 0 ? (
          <p className="text-sm text-muted">Aucun document importé pour cet ouvrage. <Link href="/bureau/imports" className="link-gilt text-gold">Importer des notes</Link></p>
        ) : (
          <ul className="space-y-2 text-sm">
            {linked.map((i) => (
              <li key={i.id}>
                <Link href={`/bureau/imports#${i.id}`} className="link-gilt text-parchment">{i.fileName ?? i.driveUrl ?? "Texte collé"}</Link>
                <span className="ml-2 text-muted">· {new Date(i.createdAt).toLocaleDateString("fr-FR")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
