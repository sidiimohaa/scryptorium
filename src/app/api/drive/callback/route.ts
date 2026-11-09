import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { isAdmin } from "@/lib/auth";
import { exchangeCode } from "@/lib/drive";

export async function GET(req: NextRequest) {
  const back = (q: string) => {
    const res = NextResponse.redirect(new URL(`/bureau/imports?drive=${q}`, req.url));
    res.cookies.delete({ name: "scr_oauth_state", path: "/api/drive" });
    return res;
  };
  if (!(await isAdmin())) return NextResponse.redirect(new URL("/bureau/connexion", req.url));
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const expected = req.cookies.get("scr_oauth_state")?.value ?? "";
  const ok = state.length > 0 && state.length === expected.length && timingSafeEqual(Buffer.from(state), Buffer.from(expected));
  if (!ok) return back("etat-invalide");
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return back("refuse");
  try {
    await exchangeCode(code);
    return back("connecte");
  } catch {
    return back("echec");
  }
}
