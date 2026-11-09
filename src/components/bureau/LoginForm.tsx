"use client";
import { useActionState } from "react";
import { login } from "@/app/bureau/actions";
import { Feedback, Submit } from "./FormStatus";

export function LoginForm() {
  const [state, action] = useActionState(login, null);
  return (
    <form action={action} className="mt-8 space-y-5 text-left">
      <label className="block">
        <span className="label">Mot de passe</span>
        <input type="password" name="password" required autoComplete="current-password" className="field" autoFocus />
      </label>
      <Feedback state={state} />
      <Submit className="btn w-full">Entrer</Submit>
    </form>
  );
}
