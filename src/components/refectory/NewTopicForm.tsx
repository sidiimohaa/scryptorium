"use client";
import { useActionState, useEffect } from "react";
import { createTopic, type FormState } from "@/app/refectoire/actions";

export function NewTopicForm({ books, onCreated }: { books: { id: string; title: string }[]; onCreated?: (id: string) => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createTopic, null);
  useEffect(() => {
    if (state?.ok && state.id) onCreated?.(state.id);
  }, [state, onCreated]);
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">Titre du sujet</span>
        <input name="title" required minLength={3} maxLength={120} className="field" placeholder="De quoi voulez-vous parler ?" />
      </label>
      <label className="block">
        <span className="label">Livre concerné (facultatif)</span>
        <select name="bookId" defaultValue="" className="field">
          <option value="">— aucun en particulier —</option>
          {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="label">Premier message</span>
        <textarea name="content" required maxLength={4000} rows={6} className="field" />
      </label>
      <label className="flex items-center gap-3 text-sm text-parchment/80">
        <input type="checkbox" name="hasSpoilers" className="accent-[#c3a16b]" /> Mon message révèle l&apos;intrigue (il sera masqué)
      </label>
      {state && !state.ok && <p role="alert" className="text-sm text-[#e08a7a]">{state.message}</p>}
      <button type="submit" disabled={pending} className="btn">{pending ? "Ouverture…" : "Ouvrir le sujet"}</button>
    </form>
  );
}
