import Link from "next/link";
import { Emblem } from "@/components/Emblem";
import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/store";
import { logout } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

const NAV = [
  { href: "/bureau", label: "Registre" },
  { href: "/bureau/livres/nouveau", label: "Ajouter un livre" },
  { href: "/bureau/rayonnages", label: "Rayonnages" },
  { href: "/bureau/imports", label: "Imports & Drive" },
  { href: "/bureau/refectoire", label: "Réfectoire" },
  { href: "/bureau/reglages", label: "Réglages" },
];

export default async function BureauLayout({ children }: LayoutProps<"/bureau">) {
  await requireAdmin();
  const repo = getRepo();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[250px_1fr]">
      <aside className="border-b border-line bg-ink-2/80 p-6 md:sticky md:top-0 md:h-dvh md:border-b-0 md:border-r">
        <Link href="/" className="flex items-center gap-3 text-gold">
          <Emblem className="h-9 w-9" />
          <span className="font-[family-name:var(--font-display)] tracking-[0.3em] text-cream">SCRYPTORIUM</span>
        </Link>
        <p className="eyebrow mt-6">Bureau du Bibliothécaire</p>
        <nav aria-label="Bureau" className="mt-6 flex gap-1 overflow-x-auto md:flex-col">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="shrink-0 px-3 py-2 text-sm text-parchment/80 transition-colors hover:bg-gold/10 hover:text-gold-bright">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 space-y-3 text-xs text-muted">
          <p>
            Stockage : <span className="text-parchment">{repo.driver === "supabase" ? "Supabase" : "archive locale"}</span>
            {!repo.writable && <span className="block text-[#e3949e]">lecture seule</span>}
          </p>
          <form action={logout}>
            <button className="uppercase tracking-[0.2em] hover:text-gold">Se déconnecter</button>
          </form>
        </div>
      </aside>
      <main id="contenu" className="min-w-0 px-5 py-10 md:px-12">{children}</main>
    </div>
  );
}
