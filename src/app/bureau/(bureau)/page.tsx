import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/store";
import { STATUS_LABELS, VISIBILITY_LABELS } from "@/lib/types";
import { personalContentMissing } from "@/lib/library";

export default async function BureauHome() {
  await requireAdmin();
  const repo = getRepo();
  const [books, reviews, imports, categories] = await Promise.all([repo.listBooks(), repo.listReviews(), repo.listImports(), repo.listCategories()]);
  const sorted = [...books].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const count = (v: string) => books.filter((b) => b.visibility === v).length;
  const pendingImports = imports.filter((i) => i.status !== "linked").length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Le Registre</p>
          <h1 className="display mt-3 text-5xl">Tous les ouvrages</h1>
        </div>
        <Link href="/bureau/livres/nouveau" className="btn">Ajouter un livre</Link>
      </div>

      <dl className="mt-10 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 xl:grid-cols-5">
        {[
          ["Publiées", count("published")],
          ["Brouillons", count("draft")],
          ["Archivées", count("archived")],
          ["Rayonnages", categories.length],
          ["Imports à traiter", pendingImports],
        ].map(([k, v]) => (
          <div key={k} className="bg-ink p-5">
            <dt className="label">{k}</dt>
            <dd className="font-[family-name:var(--font-display)] text-4xl text-cream">{v}</dd>
          </div>
        ))}
      </dl>

      {books.length === 0 ? (
        <p className="mt-16 font-[family-name:var(--font-serif)] text-xl italic text-muted">Le registre est vierge. Ajoutez votre premier ouvrage.</p>
      ) : (
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-[0.65rem] uppercase tracking-[0.2em] text-muted">
              <tr>
                <th className="py-3 pr-4 font-normal">Titre</th>
                <th className="py-3 pr-4 font-normal">Auteur</th>
                <th className="py-3 pr-4 font-normal">Statut de lecture</th>
                <th className="py-3 pr-4 font-normal">Fiche</th>
                <th className="py-3 pr-4 font-normal">Modifiée</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {sorted.map((b) => {
                const missing = personalContentMissing(b, reviews.find((r) => r.bookId === b.id));
                return (
                  <tr key={b.id} className="hover:bg-walnut/40">
                    <td className="py-3 pr-4">
                      <Link href={`/bureau/livres/${b.id}`} className="font-[family-name:var(--font-display)] text-lg text-cream hover:text-gold-bright">{b.title}</Link>
                      {missing && <span className="ml-2 text-[0.6rem] uppercase tracking-[0.2em] text-gold-soft">avis à rédiger</span>}
                    </td>
                    <td className="py-3 pr-4 text-muted">{b.author}</td>
                    <td className="py-3 pr-4">{b.status ? STATUS_LABELS[b.status] : <span className="text-muted">—</span>}</td>
                    <td className="py-3 pr-4">
                      <span className={b.visibility === "published" ? "text-gold-bright" : "text-muted"}>{VISIBILITY_LABELS[b.visibility]}</span>
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-muted">{new Date(b.updatedAt).toLocaleDateString("fr-FR")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
