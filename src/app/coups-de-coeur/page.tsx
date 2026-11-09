import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { BookCover } from "@/components/BookCover";
import { Prose } from "@/components/Prose";
import { getCategories, getPublishedBooks, isFavorite } from "@/lib/library";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Le Cabinet des Coups de Cœur", description: "Les lectures préférées du bibliothécaire." };

export default async function FavoritesPage() {
  const [books, categories] = await Promise.all([getPublishedBooks(), getCategories()]);
  const favorites = books.filter((b) => isFavorite(b, categories));
  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-10">
        <p className="eyebrow rise text-center">Un cabinet plus intime</p>
        <h1 className="display rise rise-1 mt-4 text-center text-6xl md:text-7xl">Les Coups de Cœur</h1>
        <p className="rise rise-2 mx-auto mt-5 max-w-xl text-center font-[family-name:var(--font-serif)] text-lg italic text-muted">Les livres qui ont laissé une trace — chacun accompagné, quand il le mérite, d&apos;un mot du bibliothécaire.</p>
        {favorites.length === 0 ? (
          <div className="panel mx-auto mt-20 max-w-xl p-10 text-center">
            <p className="font-[family-name:var(--font-display)] text-3xl text-cream">Le cabinet est encore fermé à clé</p>
            <p className="mt-4 font-[family-name:var(--font-serif)] text-lg text-muted">Aucun ouvrage n&apos;a encore rejoint le rayonnage « Mes coups de cœur ».</p>
          </div>
        ) : (
          <div className="mt-24 space-y-32">
            {favorites.map((b, i) => (
              <article key={b.id} className={`grid items-center gap-12 md:grid-cols-2 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
                <div className="mx-auto w-full max-w-xs [perspective:1200px]">
                  <div className="[transform:rotateY(10deg)]"><BookCover book={b} /></div>
                </div>
                <div>
                  <p className="eyebrow">{b.author}</p>
                  <h2 className="display mt-3 text-5xl">{b.title}</h2>
                  {b.editorial ? <Prose text={b.editorial} className="mt-6" /> : <p className="mt-6 font-[family-name:var(--font-serif)] italic text-muted">L&apos;éditorial de ce coup de cœur reste à écrire.</p>}
                  <Link href={`/livres/${b.slug}`} className="btn mt-8">Lire la fiche</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
