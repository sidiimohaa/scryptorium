import "server-only";
import { getRepo } from "./store";
import { extractText } from "./extract";

/**
 * Google Drive (méthode 2). OAuth côté serveur uniquement ; le jeton de rafraîchissement est
 * stocké dans les secrets serveur et n'atteint jamais le navigateur. Portée en lecture seule :
 * SCRYPTORIUM ne modifie ni ne partage jamais vos documents.
 */
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const TOKEN_KEY = "google_refresh_token";

export function driveConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri() {
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/drive/callback`;
}

export function authUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: DRIVE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export async function exchangeCode(code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const data = (await res.json()) as { refresh_token?: string; error?: string };
  if (!res.ok || !data.refresh_token) throw new Error(data.error ?? "Échange OAuth impossible");
  await getRepo().setSecret(TOKEN_KEY, data.refresh_token);
}

export async function driveConnected() {
  return Boolean(await getRepo().getSecret(TOKEN_KEY));
}

export async function disconnectDrive() {
  const token = await getRepo().getSecret(TOKEN_KEY);
  if (token) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => {});
  await getRepo().setSecret(TOKEN_KEY, null);
}

async function accessToken(): Promise<string> {
  const refresh = await getRepo().getSecret(TOKEN_KEY);
  if (!refresh) throw new Error("Google Drive n'est pas connecté.");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refresh,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(`Jeton Google refusé (${data.error ?? res.status}). Reconnectez Drive.`);
  return data.access_token;
}

async function gapi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Drive : erreur ${res.status}`);
  return res.json() as Promise<T>;
}

export type DriveFile = { id: string; name: string; mimeType: string; modifiedTime: string; webViewLink?: string; size?: string };

export const IMPORTABLE = [
  "application/vnd.google-apps.document",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];

export async function listFolders(): Promise<DriveFile[]> {
  const q = encodeURIComponent("mimeType='application/vnd.google-apps.folder' and trashed=false");
  const d = await gapi<{ files: DriveFile[] }>(`files?q=${q}&pageSize=100&orderBy=name&fields=files(id,name,mimeType,modifiedTime)`);
  return d.files;
}

export async function listFolderFiles(folderId: string): Promise<DriveFile[]> {
  if (!/^[\w-]+$/.test(folderId)) throw new Error("Dossier invalide");
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const d = await gapi<{ files: DriveFile[] }>(`files?q=${q}&pageSize=200&orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,webViewLink,size)`);
  return d.files.filter((f) => IMPORTABLE.includes(f.mimeType));
}

/** Downloads a file *inside the authorised folder* and returns its text. */
export async function fetchFileText(fileId: string, folderId: string): Promise<{ file: DriveFile; text: string }> {
  if (!/^[\w-]+$/.test(fileId)) throw new Error("Fichier invalide");
  const meta = await gapi<DriveFile & { parents?: string[] }>(`files/${fileId}?fields=id,name,mimeType,modifiedTime,webViewLink,size,parents`);
  if (!meta.parents?.includes(folderId)) throw new Error("Ce fichier n'appartient pas au dossier autorisé.");
  if (Number(meta.size ?? 0) > 10 * 1024 * 1024) throw new Error("Fichier trop lourd (10 Mo max).");
  const token = await accessToken();
  const url =
    meta.mimeType === "application/vnd.google-apps.document"
      ? `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`
      : `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Téléchargement impossible (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  const text = meta.mimeType === "application/vnd.google-apps.document" ? buf.toString("utf8") : await extractText(meta.name, meta.mimeType, buf);
  return { file: meta, text: text.trim() };
}
