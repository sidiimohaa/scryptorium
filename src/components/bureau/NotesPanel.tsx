"use client";
import { useActionState, useRef, useEffect } from "react";
import { addNote, deleteNote, toggleNoteVisibility } from "@/app/bureau/actions";
import { NOTE_KINDS, NOTE_KIND_LABELS, type Note } from "@/lib/types";
import { Feedback, Submit } from "./FormStatus";

export function NotesPanel({ bookId, notes }: { bookId: string; notes: Note[] }) {
  const [state, action] = useActionState(addNote, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <section className="panel space-y-6 p-6 md:p-8">
      <div>
        <h2 className="display text-3xl">Notes, citations & annotations</h2>
        <p className="mt-1 text-sm text-muted">Privées par défaut. Pour les citations, privilégiez de courts extraits.</p>
      </div>
      <form ref={form} action={action} className="grid gap-4 md:grid-cols-[160px_1fr_120px]">
        <input type="hidden" name="bookId" value={bookId} />
        <select name="kind" className="field">
          {NOTE_KINDS.map((k) => <option key={k} value={k}>{NOTE_KIND_LABELS[k]}</option>)}
        </select>
        <textarea name="content" required maxLength={4000} rows={3} className="field" placeholder="Votre note, ou un court passage…" />
        <input name="pageRef" placeholder="Page" className="field" maxLength={40} />
        <div className="flex flex-wrap items-center gap-5 md:col-span-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="public" className="accent-[#c3a16b]" /> Afficher sur la fiche publique
          </label>
          <Submit className="btn px-4 py-2">Ajouter</Submit>
          <Feedback state={state} />
        </div>
      </form>
      {notes.length > 0 && (
        <ul className="divide-y divide-line border-t border-line">
          {notes.map((n) => (
            <li key={n.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="label">
                  {NOTE_KIND_LABELS[n.kind]}{n.pageRef ? ` · p. ${n.pageRef}` : ""} · <span className={n.visibility === "public" ? "text-gold-bright" : ""}>{n.visibility === "public" ? "publique" : "privée"}</span>
                </p>
                <p className="whitespace-pre-line font-[family-name:var(--font-serif)] text-parchment/90">{n.content.length > 600 ? n.content.slice(0, 600) + "…" : n.content}</p>
              </div>
              <div className="flex gap-3 text-xs uppercase tracking-[0.18em]">
                <button type="button" onClick={() => toggleNoteVisibility(n.id)} className="text-muted hover:text-gold">{n.visibility === "public" ? "Rendre privée" : "Publier"}</button>
                <button type="button" onClick={() => confirm("Supprimer définitivement cette note ?") && deleteNote(n.id)} className="text-muted hover:text-[#e3949e]">Supprimer</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
