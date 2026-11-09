import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import { lookupMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const title = (req.nextUrl.searchParams.get("title") ?? "").trim().slice(0, 200);
  const author = (req.nextUrl.searchParams.get("author") ?? "").trim().slice(0, 200);
  if (!title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  return NextResponse.json(await lookupMetadata(title, author));
}
