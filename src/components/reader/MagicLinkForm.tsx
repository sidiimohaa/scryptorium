"use client";
import { useActionState } from "react";
import { sendMagicLink, type MagicLinkState } from "@/app/connexion/actions";

export function MagicLinkForm() {
  const [state, action, pending] = useActionState<MagicLinkState, FormData>(sendMagicLink, null);
  if (state?.ok) {
    return <p role="status" className="mt-8 font-[family-name:var(--font-serif)] text-lg leading-relaxed text-parchment/90">{state.message}</p>;
  }
  return (
    <form action={action} className="mt-8 space-y-4 text-left">
      <label className="block">
        <span className="label">Adresse e-mail</span>
        <input name="email" type="email" required autoComplete="email" className="field" placeholder="vous@exemple.fr" />
      </label>
      {state && !state.ok && <p role="alert" className="text-sm text-[#e08a7a]">{state.message}</p>}
      <button type="submit" disabled={pending} className="btn w-full justify-center">{pending ? "Envoi…" : "Recevoir un lien de connexion"}</button>
      <p className="text-xs leading-relaxed text-muted">Pas de mot de passe : un lien vous est envoyé par e-mail. Votre adresse n&apos;est jamais affichée sur le site.</p>
    </form>
  );
}
