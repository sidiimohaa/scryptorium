import Link from "next/link";
import { PageShell } from "@/components/PageShell";

export default function NotFound() {
  return (
    <PageShell>
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <p className="eyebrow">Erreur 404</p>
        <h1 className="display mt-4 text-6xl">Ce volume est introuvable</h1>
        <p className="mt-6 font-[family-name:var(--font-serif)] text-xl italic text-muted">Peut-être a-t-il été emprunté, ou rangé sur un autre rayonnage.</p>
        <Link href="/catalogue" className="btn mt-10">Consulter le registre</Link>
      </div>
    </PageShell>
  );
}
