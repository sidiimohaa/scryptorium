import { NextResponse } from "next/server";
import { getPublishedBook } from "@/lib/library";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/fiche/[slug]">) {
  const { slug } = await ctx.params;
  const data = await getPublishedBook(slug);
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const { book } = data;
  const plain = book.summary
    .split(/\n{2,}/)
    .filter((b) => !b.startsWith("#") && !b.startsWith("- "))
    .join(" ")
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return NextResponse.json({
    slug: book.slug,
    title: book.title,
    author: book.author,
    year: book.year,
    genres: book.genres,
    excerpt: plain.length > 420 ? plain.slice(0, plain.lastIndexOf(" ", 420)) + "…" : plain,
  });
}
