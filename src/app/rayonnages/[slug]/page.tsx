import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { CatalogueBrowser } from "@/components/CatalogueBrowser";
import { getCategories, getPublishedBooks } from "@/lib/library";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/rayonnages/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const cat = (await getCategories()).find((c) => c.slug === slug);
  return cat ? { title: cat.name, description: cat.inscription || cat.description } : {};
}

export default async function ShelfPage({ params }: PageProps<"/rayonnages/[slug]">) {
  const { slug } = await params;
  const [books, categories] = await Promise.all([getPublishedBooks(), getCategories()]);
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) notFound();
  const onShelf = books.filter((b) => b.categoryIds.includes(cat.id));
  return (
    <PageShell>
      <div className="relative">
        <div aria-hidden className="absolute inset-x-0 top-0 h-96 opacity-30" style={{ background: `radial-gradient(50% 100% at 50% 0%, ${cat.accent}, transparent)` }} />
        <div className="relative mx-auto max-w-7xl px-5 py-16 md:px-10">
          <nav aria-label="Fil d'Ariane" className="text-xs uppercase tracking-[0.2em] text-muted">
            <Link href="/catalogue" className="link-gilt">Catalogue</Link> <span aria-hidden>·</span> Rayonnage
          </nav>
          <h1 className="display rise mt-6 text-6xl md:text-7xl">{cat.name}</h1>
          {cat.inscription && <p className="rise rise-1 mt-4 font-[family-name:var(--font-serif)] text-xl italic text-gold-bright">{cat.inscription}</p>}
          {cat.description && <p className="rise rise-2 mt-6 max-w-2xl font-[family-name:var(--font-serif)] text-lg text-parchment/80">{cat.description}</p>}
          <div className="mt-6 flex gap-4">
            <Link href={`/bibliotheque?rayon=${cat.slug}`} className="btn btn-ghost">Voir ce rayonnage dans la salle</Link>
          </div>
          <div className="mt-12">
            {onShelf.length === 0 ? (
              <p className="py-20 text-center font-[family-name:var(--font-serif)] text-xl italic text-muted">Ce rayonnage attend encore ses premiers volumes.</p>
            ) : (
              <CatalogueBrowser books={onShelf} categories={categories} />
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
