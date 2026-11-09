import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { CatalogueBrowser } from "@/components/CatalogueBrowser";
import { FeaturedBook } from "@/components/FeaturedBook";
import { getBookOfTheDay, getCategories, getPublishedBooks } from "@/lib/library";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Catalogue", description: "Le catalogue complet de la bibliothèque SCRYPTORIUM." };

export default async function CataloguePage() {
  const [books, categories] = await Promise.all([getPublishedBooks(), getCategories()]);
  const featured = await getBookOfTheDay(books);
  return (
    <PageShell>
      {featured && <FeaturedBook book={featured} />}
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-10">
        <p className="eyebrow rise">Mode Catalogue</p>
        <h1 className="display rise rise-1 mt-4 text-6xl md:text-7xl">Le Registre</h1>
        <p className="rise rise-2 mt-5 max-w-2xl font-[family-name:var(--font-serif)] text-lg italic text-muted">
          Tous les volumes de la bibliothèque, consultables d&apos;un regard. Les mêmes ouvrages vous attendent dans la salle.
        </p>
        <div className="rise rise-3 mt-12">
          <CatalogueBrowser books={books} categories={categories} />
        </div>
      </div>
    </PageShell>
  );
}
