import Link from "next/link";
import { Emblem } from "./Emblem";
import { MotionToggle } from "./MotionToggle";

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-line/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-3 md:px-10">
        <div className="flex items-start gap-4">
          <Emblem className="h-12 w-12 shrink-0 text-gold" />
          <div>
            <p className="font-[family-name:var(--font-display)] text-xl tracking-[0.3em] text-cream">SCRYPTORIUM</p>
            <p className="mt-2 font-[family-name:var(--font-serif)] italic text-muted">« Chaque livre est une porte vers un autre monde. »</p>
          </div>
        </div>
        <nav aria-label="Pied de page" className="grid grid-cols-2 gap-2 text-sm text-parchment/70">
          <Link className="link-gilt w-fit" href="/abbaye">Plan de l&apos;abbaye</Link>
          <Link className="link-gilt w-fit" href="/bibliotheque">La Salle</Link>
          <Link className="link-gilt w-fit" href="/catalogue">Catalogue</Link>
          <Link className="link-gilt w-fit" href="/coups-de-coeur">Coups de cœur</Link>
          <Link className="link-gilt w-fit" href="/cabinet">Cabinet des lectures</Link>
          <Link className="link-gilt w-fit" href="/archives">Les Archives</Link>
          <Link className="link-gilt w-fit" href="/club">Le Club</Link>
        </nav>
        <div className="flex flex-col items-start gap-3 text-sm text-muted md:items-end">
          <MotionToggle />
          <Link href="/bureau" className="link-gilt text-xs uppercase tracking-[0.22em]">Bureau du Bibliothécaire</Link>
        </div>
      </div>
    </footer>
  );
}
