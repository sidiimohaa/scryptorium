import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { authUrl, driveConfigured } from "@/lib/drive";

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.redirect(new URL("/bureau/connexion", req.url));
  if (!driveConfigured()) return NextResponse.redirect(new URL("/bureau/imports?drive=non-configure", req.url));
  const state = randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(authUrl(state));
  res.cookies.set("scr_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/api/drive" });
  return res;
}
