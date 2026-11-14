"use client";
import { useActionState } from "react";
import { savePseudo, type PseudoState } from "@/app/compte/actions";

export function PseudoForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState<PseudoState, FormData>(savePseudo, null);
  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="label">Pseudo affiché</span>
        <input name="pseudo" defaultValue={current} required minLength={3} maxLength={24} autoComplete="nickname" className="field" />
      </label>
      {state && <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-gold" : "text-[#e08a7a]"}`}>{state.message}</p>}
      <button type="submit" disabled={pending} className="btn">{pending ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}
