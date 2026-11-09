"use client";
import { useActionState } from "react";
import { deleteCategory, mergeCategories, saveCategory } from "@/app/bureau/actions";
import type { Category } from "@/lib/types";
import { Feedback, Submit } from "./FormStatus";

export function CategoryForm({ category, count }: { category?: Category; count?: number }) {
  const [state, action] = useActionState(saveCategory, null);
  return (
    <form action={action} className="panel grid gap-4 p-5 md:grid-cols-[2fr_2fr_90px_80px_auto] md:items-end">
      <input type="hidden" name="id" value={category?.id ?? ""} />
      <label className="block"><span className="label">Nom</span><input name="name" required defaultValue={category?.name} className="field" maxLength={120} /></label>
      <label className="block"><span className="label">Inscription</span><input name="inscription" defaultValue={category?.inscription} className="field" maxLength={200} /></label>
      <label className="block"><span className="label">Ordre</span><input name="order" type="number" defaultValue={category?.order} className="field" /></label>
      <label className="block"><span className="label">Accent</span><input name="accent" type="color" defaultValue={category?.accent ?? "#C3A16B"} className="h-[46px] w-full cursor-pointer border border-line bg-transparent" /></label>
      <div className="flex items-center gap-2">
        <Submit className="btn px-4 py-2.5">{category ? "Modifier" : "Créer"}</Submit>
        {category && (
          <button type="button" className="btn btn-danger px-4 py-2.5" onClick={() => confirm(`Supprimer le rayonnage « ${category.name} » ? Les ${count ?? 0} ouvrage(s) restent dans la bibliothèque.`) && deleteCategory(category.id)}>
            Supprimer
          </button>
        )}
      </div>
      <label className="block md:col-span-5"><span className="label">Description</span><input name="description" defaultValue={category?.description} className="field" maxLength={2000} /></label>
      <div className="md:col-span-5"><Feedback state={state} /></div>
    </form>
  );
}

export function MergeForm({ categories }: { categories: Category[] }) {
  const [state, action] = useActionState(mergeCategories, null);
  return (
    <form action={action} className="panel flex flex-wrap items-end gap-4 p-5">
      <label className="block min-w-56 flex-1"><span className="label">Fusionner</span>
        <select name="source" required className="field"><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </label>
      <label className="block min-w-56 flex-1"><span className="label">dans</span>
        <select name="target" required className="field"><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </label>
      <Submit className="btn px-4 py-2.5">Fusionner</Submit>
      <Feedback state={state} />
    </form>
  );
}
