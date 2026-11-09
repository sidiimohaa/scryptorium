import { CategoryForm, MergeForm } from "@/components/bureau/CategoryForms";
import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/store";

export const metadata = { title: "Rayonnages" };

export default async function ShelvesAdmin() {
  await requireAdmin();
  const repo = getRepo();
  const [categories, books] = await Promise.all([repo.listCategories(), repo.listBooks()]);
  return (
    <div className="max-w-6xl space-y-12">
      <div>
        <p className="eyebrow">Architecture de la salle</p>
        <h1 className="display mt-3 text-5xl">Rayonnages</h1>
        <p className="mt-4 max-w-2xl text-muted">Chaque rayonnage devient une bibliothèque sculptée dans la salle 3D. La salle s&apos;agrandit d&apos;elle-même à mesure que vous en créez.</p>
      </div>
      <section className="space-y-4">
        <h2 className="display text-3xl">Nouveau rayonnage</h2>
        <CategoryForm />
      </section>
      <section className="space-y-4">
        <h2 className="display text-3xl">Rayonnages existants</h2>
        {categories.map((c) => (
          <div key={c.id}>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted">{books.filter((b) => b.categoryIds.includes(c.id)).length} ouvrage(s) · /{c.slug}</p>
            <CategoryForm category={c} count={books.filter((b) => b.categoryIds.includes(c.id)).length} />
          </div>
        ))}
      </section>
      <section className="space-y-4">
        <h2 className="display text-3xl">Fusionner deux rayonnages</h2>
        <MergeForm categories={categories} />
      </section>
    </div>
  );
}
