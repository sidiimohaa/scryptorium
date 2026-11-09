import { NextResponse } from "next/server";
import { getPublishedBooks } from "@/lib/library";

export const dynamic = "force-dynamic";

export async function GET() {
  const books = await getPublishedBooks();
  return NextResponse.json(
    books.map((b) => ({ slug: b.slug, title: b.title, originalTitle: b.originalTitle, author: b.author, year: b.year, genres: b.genres })),
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" } },
  );
}
