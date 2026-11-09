"use client";
import { useActionState } from "react";
import { saveSettings } from "@/app/bureau/actions";
import type { Settings } from "@/lib/types";
import { Feedback, Submit } from "./FormStatus";

export function SettingsForm({ settings, books }: { settings: Settings; books: { id: string; title: string }[] }) {
  const [state, action] = useActionState(saveSettings, null);
  const year = new Date().getFullYear();
  return (
    <form action={action} className="panel max-w-3xl space-y-6 p-6 md:p-8">
      <label className="block">
        <span className="label">Échelle de notation</span>
        <select name="ratingScale" defaultValue={String(settings.ratingScale)} className="field">
          <option value="5">Sur 5</option>
          <option value="10">Sur 10</option>
        </select>
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block"><span className="label">Objectif de lecture — année</span><input name="goalYear" type="number" defaultValue={settings.readingGoal?.year ?? year} className="field" /></label>
        <label className="block"><span className="label">Nombre de livres (vide = aucun objectif)</span><input name="goalTarget" type="number" min={0} defaultValue={settings.readingGoal?.target ?? ""} className="field" /></label>
      </div>
      <label className="block">
        <span className="label">Livre du jour</span>
        <select name="featuredBookId" defaultValue={settings.featuredBookId ?? ""} className="field">
          <option value="">Rotation quotidienne automatique</option>
          {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
        </select>
      </label>
      <div className="flex items-center gap-4"><Submit>Enregistrer</Submit><Feedback state={state} /></div>
    </form>
  );
}
