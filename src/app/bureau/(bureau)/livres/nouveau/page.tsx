import { BookForm } from "@/components/bureau/BookForm";
import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/store";

export const metadata = { title: "Ajouter un livre" };

export default async function NewBookPage() {
  await requireAdmin();
  const repo = getRepo();
  const [categories, settings] = await Promise.all([repo.listCategories(), repo.getSettings()]);
  return (
    <div className="max-w-5xl">
      <p className="eyebrow">Nouvelle entrée</p>
      <h1 className="display mt-3 text-5xl">Ajouter un livre</h1>
      <p className="mt-4 max-w-2xl font-[family-name:var(--font-serif)] text-lg text-muted">
        Saisissez le titre et l&apos;auteur, puis laissez les catalogues proposer le reste. La fiche est créée en brouillon : vous la publiez quand elle vous ressemble.
      </p>
      <div className="mt-10">
        <BookForm book={null} categories={categories} ratingScale={settings.ratingScale} />
      </div>
    </div>
  );
}
