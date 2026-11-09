import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Administration du Bureau du Bibliothécaire.
 * Session signée HMAC-SHA256 dans un cookie httpOnly. Le mot de passe et le secret
 * vivent uniquement dans les variables d'environnement serveur.
 */
const COOKIE = "scr_admin";
const MAX_AGE = 60 * 60 * 12; // 12 h

function secret(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && secret());
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function checkPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  const key = secret();
  if (!expected || !key) return false;
  // Compare digests so length differences leak nothing.
  return safeEqual(sign(candidate, key), sign(expected, key));
}

export async function createAdminSession(): Promise<void> {
  const key = secret();
  if (!key) throw new Error("SESSION_SECRET manquant");
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `admin.${exp}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload, key)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroyAdminSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const key = secret();
  if (!key) return false;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const parts = raw.split(".");
  if (parts.length !== 3) return false;
  const [role, exp, sig] = parts;
  if (role !== "admin" || !safeEqual(sig, sign(`${role}.${exp}`, key))) return false;
  return Number(exp) > Math.floor(Date.now() / 1000);
}

/** Server-side guard for every admin page and server action. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/bureau/connexion");
}
