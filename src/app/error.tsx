"use client";
import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-32 text-center">
      <p className="eyebrow">Incident</p>
      <h1 className="display mt-4 text-5xl">Une page s&apos;est déchirée</h1>
      <p className="mt-6 font-[family-name:var(--font-serif)] text-lg italic text-muted">Une erreur inattendue s&apos;est produite. Vos données ne sont pas affectées.</p>
      <div className="mt-10 flex justify-center gap-4">
        <button type="button" onClick={reset} className="btn">Réessayer</button>
        <Link href="/" className="btn btn-ghost">Accueil</Link>
      </div>
    </div>
  );
}
