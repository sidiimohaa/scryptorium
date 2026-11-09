import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { ReadingTableDock } from "./ReadingTable";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-gold focus:px-4 focus:py-2 focus:text-ink">
        Aller au contenu
      </a>
      <SiteHeader />
      <main id="contenu">{children}</main>
      <SiteFooter />
      <ReadingTableDock />
    </>
  );
}
