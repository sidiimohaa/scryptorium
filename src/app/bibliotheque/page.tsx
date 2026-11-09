import type { Metadata } from "next";
import { LibraryExperience, type BookInfo } from "@/components/library3d/LibraryExperience";
import { SearchButton } from "@/components/SearchDialog";
import { formatRating, getCategories, getPublishedBooks } from "@/lib/library";
import { getRepo } from "@/lib/store";
import { STATUS_LABELS } from "@/lib/types";
import type { SceneShelf } from "@/components/library3d/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "La Salle — Mode Immersion",
  description: "Parcourez la salle de lecture de SCRYPTORIUM, ses rayonnages et ses volumes.",
};

function excerpt(md: string, max = 300) {
  const plain = md.split(/\n{2,}/).filter((b) => !b.startsWith("#") && !b.startsWith("- ")).join(" ").replace(/\*+/g, "").replace(/\s+/g, " ").trim();
  return plain.length > max ? plain.slice(0, plain.lastIndexOf(" ", max)) + "…" : plain;
}

export default async function LibraryPage({ searchParams }: PageProps<"/bibliotheque">) {
  const sp = await searchParams;
  const [books, categories, settings] = await Promise.all([getPublishedBooks(), getCategories(), getRepo().getSettings()]);
  const shelves: SceneShelf[] = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    inscription: c.inscription,
    accent: c.accent,
    books: books
      .filter((b) => b.categoryIds.includes(c.id))
      .map((b) => ({ id: b.id, slug: b.slug, title: b.title, author: b.author, year: b.year, color: b.color, pages: b.pages, coverUrl: b.coverUrl })),
  }));
  const info: Record<string, BookInfo> = Object.fromEntries(
    books.map((b) => [
      b.id,
      {
        id: b.id,
        slug: b.slug,
        title: b.title,
        author: b.author,
        year: b.year,
        genres: b.genres,
        status: b.status ? STATUS_LABELS[b.status] : null,
        rating: formatRating(b.rating, settings.ratingScale),
        excerpt: excerpt(b.summary),
      },
    ]),
  );
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return (
    <>
      <SearchButton hideTrigger />
      <LibraryExperience
        shelves={shelves}
        books={info}
        initialBook={one(sp.livre)}
        initialShelf={one(sp.rayon)}
        skipIntro={one(sp.intro) === "0"}
        entrance={one(sp.entree) === "porte"}
      />
    </>
  );
}
