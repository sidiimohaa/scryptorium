import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Emblem } from "@/components/Emblem";

export const metadata: Metadata = { title: "Le Club", description: "Le club de lecture SCRYPTORIUM — en préparation." };

const COMING = [
  ["Lectures communes", "Un livre du mois, un calendrier, des étapes de lecture partagées."],
  ["Salons de discussion", "Un salon par ouvrage, des questions ouvertes par le bibliothécaire, spoilers masqués."],
  ["Votes", "Les membres proposent et choisissent les prochaines lectures."],
  ["Marque-pages", "Chaque membre garde ses ouvrages favoris à portée de main."],
];

export default function ClubPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-5xl px-5 py-20 text-center md:px-10">
        <Emblem className="rise mx-auto h-16 w-16 text-gold" />
        <p className="eyebrow rise rise-1 mt-8">Le Club SCRYPTORIUM</p>
        <h1 className="display rise rise-2 mt-4 text-6xl md:text-7xl">La salle de lecture se prépare</h1>
        <p className="rise rise-3 mx-auto mt-6 max-w-2xl font-[family-name:var(--font-serif)] text-xl leading-relaxed text-parchment/85">
          Le club n&apos;est pas encore ouvert : pas de membres fictifs, pas de discussions inventées. Lorsque les portes s&apos;ouvriront, voici ce qui vous attendra.
        </p>
        <ul className="mt-16 grid gap-px border border-line bg-line text-left md:grid-cols-2">
          {COMING.map(([t, d]) => (
            <li key={t} className="bg-ink p-8">
              <p className="font-[family-name:var(--font-display)] text-2xl text-cream">{t}</p>
              <p className="mt-2 font-[family-name:var(--font-serif)] text-muted">{d}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs uppercase tracking-[0.2em] text-muted">Statut : en préparation · aucune inscription n&apos;est encore ouverte</p>
        <Link href="/catalogue" className="btn mt-12">En attendant, parcourir la bibliothèque</Link>
      </div>
    </PageShell>
  );
}
