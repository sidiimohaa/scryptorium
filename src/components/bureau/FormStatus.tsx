"use client";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/app/bureau/actions";

export function Submit({ children, className = "btn" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? "Un instant…" : children}
    </button>
  );
}

export function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p role={state.error ? "alert" : "status"} className={`text-sm ${state.error ? "text-[#e3949e]" : "text-gold-bright"}`}>
      {state.error ?? state.message}
    </p>
  );
}
