"use client";

/**
 * Passage d'une salle à l'autre : la salle de départ s'assombrit sur le nom latin de la salle visée,
 * puis la salle d'arrivée lève ce même voile quand sa scène est prête. Le nom voyage par sessionStorage.
 */
export type Passage = { latin: string; name: string };
const KEY = "scr-passage";

export function leaveFor(p: Passage) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...p, at: Date.now() }));
  } catch {}
}

/**
 * Lit le passage en cours (s'il date de moins de 20 s) et l'efface peu après : pas tout de suite,
 * car React (mode strict, en développement) exécute deux fois les effets de montage.
 */
export function arrival(): Passage | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    setTimeout(() => {
      try {
        sessionStorage.removeItem(KEY);
      } catch {}
    }, 3000);
    const p = JSON.parse(raw) as Passage & { at: number };
    return Date.now() - p.at < 20_000 ? { latin: p.latin, name: p.name } : null;
  } catch {
    return null;
  }
}
