import type { MetadataRoute } from "next";
import { getCategories, getPublishedBooks } from "@/lib/library";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [books, categories] = await Promise.all([getPublishedBooks(), getCategories()]);
  const statics = ["", "/abbaye", "/scriptorium", "/capitulaire", "/catalogue", "/bibliotheque", "/coups-de-coeur", "/chartrier", "/archives"];
  return [
    ...statics.map((p) => ({ url: `${base}${p}` })),
    ...categories.map((c) => ({ url: `${base}/rayonnages/${c.slug}` })),
    ...books.map((b) => ({ url: `${base}/livres/${b.slug}`, lastModified: b.updatedAt })),
  ];
}
