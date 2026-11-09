import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { getPublishedBooks } from "@/lib/library";
import { getRepo } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Les Archives", description: "L'historique des lectures et des avis successifs du bibliothécaire." };

export default async function ArchivesPage() {
  const [books, reviews] = await Promise.all([getPublishedBooks(), getRepo().listReviews()]);
  const withHistory = books
    .map((b) => ({ book: b, reviews: reviews.filter((r) => r.bookId === b.id) }))
    .filter((x) => x.reviews.length > 0)
    .sort((a, b) => b.reviews[0].updatedAt.localeCompare(a.reviews[0].updatedAt));
  const fields: [keyof (typeof reviews)[number], string][] = [["liked", "Apprécié"], ["disliked", "Moins aimé"], ["interpretation", "Interprétation"], ["learned", "Appris"]];

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl px-5 py-16 md:px-10">
        <p className="eyebrow rise">Mémoire du lecteur</p>
        <h1 className="display rise rise-1 mt-4 text-6xl md:text-7xl">Les Archives</h1>
        <p className="rise rise-2 mt-5 max-w-2xl font-[family-name:var(--font-serif)] text-lg italic text-muted">Un avis change avec celui qui relit. Chaque relecture est conservée ici, à côté des précédentes.</p>
        {withHistory.length === 0 ? (
          <p className="mt-16 font-[family-name:var(--font-serif)] text-xl italic text-muted">Aucun avis n&apos;a encore été consigné.</p>
        ) : (
          <div className="mt-16 space-y-16">
            {withHistory.map(({ book, reviews }) => (
              <section key={book.id} id={book.slug} className="scroll-mt-24">
                <Link href={`/livres/${book.slug}`} className="font-[family-name:var(--font-display)] text-4xl text-cream hover:text-gold-bright">{book.title}</Link>
                <p className="text-muted">{book.author}</p>
                <ol className="mt-6 space-y-6 border-l border-line pl-8">
                  {reviews.map((r, i) => (
                    <li key={r.id}>
                      <p className="eyebrow">{r.label || (i === 0 ? "Avis actuel" : "Avis antérieur")} · {new Date(r.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                      <dl className="mt-3 space-y-3">
                        {fields.filter(([k]) => String(r[k]).trim()).map(([k, label]) => (
                          <div key={k}>
                            <dt className="label">{label}</dt>
                            <dd className="whitespace-pre-line font-[family-name:var(--font-serif)] text-parchment/85">{String(r[k])}</dd>
                          </div>
                        ))}
                      </dl>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
