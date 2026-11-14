import Link from "next/link";
import { Emblem } from "./Emblem";
import { SearchButton } from "./SearchDialog";
import { MobileNav } from "./MobileNav";

export const NAV = [
  { href: "/abbaye", label: "L'Abbaye" },
  { href: "/bibliotheque", label: "La Salle" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/coups-de-coeur", label: "Coups de cœur" },
  { href: "/cabinet", label: "Cabinet des lectures" },
  { href: "/club", label: "Le Club" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-ink/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 md:px-10">
        <Link href="/" className="group flex items-center gap-3 text-gold" aria-label="SCRYPTORIUM — accueil">
          <Emblem className="h-9 w-9 transition-transform duration-700 group-hover:-translate-y-0.5 group-hover:scale-105" />
          <span className="font-[family-name:var(--font-display)] text-lg tracking-[0.34em] text-cream">SCRYPTORIUM</span>
        </Link>
        <nav aria-label="Navigation principale" className="hidden items-center gap-5 xl:gap-7 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="link-gilt whitespace-nowrap text-[0.7rem] uppercase tracking-[0.2em] text-parchment/80">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <SearchButton />
          <MobileNav items={NAV} />
        </div>
      </div>
    </header>
  );
}
