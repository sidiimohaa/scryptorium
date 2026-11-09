"use client";
import { useActionState } from "react";
import { saveReview } from "@/app/bureau/actions";
import type { Review } from "@/lib/types";
import { Feedback, Submit } from "./FormStatus";

const FIELDS: [keyof Review, string, number][] = [
  ["liked", "Ce que j'ai apprécié", 4],
  ["disliked", "Ce que j'ai moins aimé", 4],
  ["characters", "Les personnages qui m'ont marqué", 4],
  ["themes", "Les thèmes que j'ai retenus", 4],
  ["interpretation", "Mon interprétation", 6],
  ["learned", "Ce que le livre m'a appris", 4],
  ["recommendedFor", "À qui je recommande cette lecture", 3],
  ["spoilers", "Mon analyse avec spoilers (masquée)", 5],
];

export function ReviewForm({ bookId, current }: { bookId: string; current: Review | undefined }) {
  const [state, action] = useActionState(saveReview, null);
  return (
    <form action={action} key={current?.id ?? "new"} className="panel space-y-6 p-6 md:p-8">
      <input type="hidden" name="bookId" value={bookId} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="display text-3xl">Mon avis</h2>
          <p className="mt-1 text-sm text-muted">Votre voix uniquement — aucun champ n&apos;est jamais rempli automatiquement.</p>
        </div>
        <label className="block w-64">
          <span className="label">Intitulé de cette lecture</span>
          <input name="label" defaultValue={current?.label ?? ""} placeholder="ex. Première lecture, été 2024" className="field" />
        </label>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {FIELDS.map(([k, label, rows]) => (
          <label key={k} className={`block ${k === "interpretation" || k === "spoilers" ? "md:col-span-2" : ""}`}>
            <span className="label">{label}</span>
            <textarea name={k} defaultValue={current ? String(current[k]) : ""} rows={rows} className="field" />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-5">
        {current && (
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="asNewVersion" className="accent-[#c3a16b]" />
            Relecture : enregistrer comme nouvel avis (l&apos;actuel rejoint les Archives)
          </label>
        )}
        <Submit>Enregistrer l&apos;avis</Submit>
        <Feedback state={state} />
      </div>
    </form>
  );
}
