import type { Metadata } from "next";
import { TresorExperience, type TreasureView } from "@/components/library3d/TresorExperience";
import { getCategories, getPublishedBooks, isFavorite } from "@/lib/library";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Le Trésor", description: "Les coups de cœur du bibliothécaire, exposés sous verre dans le trésor de l'abbaye." };

export default async function TresorPage() {
  const [books, categories] = await Promise.all([getPublishedBooks(), getCategories()]);
  const favorites: TreasureView[] = books
    .filter((b) => isFavorite(b, categories))
    .map((b) => ({ id: b.id, slug: b.slug, title: b.title, author: b.author, year: b.year, color: b.color, coverUrl: b.coverUrl, editorial: b.editorial }));
  return <TresorExperience books={favorites} />;
}
