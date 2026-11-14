"use client";
import { useEffect, useState } from "react";

/**
 * Le jour de l'abbaye suit l'heure de Paris : aube, jour, crépuscule, nuit, avec des passages doux.
 * `sun` vaut 1 en plein jour et 0 la nuit ; `warm` culmine à l'aube et au crépuscule (lumière dorée).
 * Pour essayer une heure précise : ajouter `?heure=21` (ou `?heure=6.5`) à l'adresse.
 */
export type Moment = "aube" | "jour" | "crepuscule" | "nuit";
export type Daylight = { hour: number; sun: number; warm: number; night: number; moment: Moment };

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const bell = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));

export function daylightAt(hour: number): Daylight {
  const h = ((hour % 24) + 24) % 24;
  const sun = smooth(5.5, 8.5, h) * (1 - smooth(17.5, 20.5, h));
  const warm = Math.max(bell(h, 7, 1.1), bell(h, 19, 1.2));
  const moment: Moment = h >= 5.5 && h < 8.5 ? "aube" : h >= 8.5 && h < 17.5 ? "jour" : h >= 17.5 && h < 21 ? "crepuscule" : "nuit";
  return { hour: h, sun, warm, night: 1 - sun, moment };
}

/** Heure décimale à Paris, quel que soit le fuseau du visiteur. */
export function parisHour(date = new Date()): number {
  const parts = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") + get("minute") / 60;
}

function currentHour(): number {
  try {
    const forced = new URLSearchParams(window.location.search).get("heure");
    if (forced !== null && forced.trim() !== "" && Number.isFinite(Number(forced))) return Number(forced);
  } catch {}
  return parisHour();
}

/** Lumière du moment, recalculée chaque minute. À n'utiliser que côté navigateur (scènes 3D). */
export function useParisDaylight(): Daylight {
  const [d, setD] = useState<Daylight>(() => daylightAt(currentHour()));
  useEffect(() => {
    const id = setInterval(() => setD(daylightAt(currentHour())), 60_000);
    return () => clearInterval(id);
  }, []);
  return d;
}
