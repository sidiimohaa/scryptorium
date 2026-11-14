"use client";
import type { Passage } from "@/lib/passage";

/** Voile de passage : nuit de chandelle soufflée, nom latin de la salle en lettres d'or. */
export function PassageVeil({ visible, passage, tone = "#0b0908", fadeIn = false }: {
  visible: boolean;
  passage: Passage | null;
  tone?: string;
  /** Départ : le voile naît en fondu. À l'arrivée, il est déjà là et se lève seulement. */
  fadeIn?: boolean;
}) {
  return (
    <div
      aria-hidden={!visible}
      className={`pointer-events-none fixed inset-0 z-[90] flex flex-col items-center justify-center transition-opacity duration-[900ms] ease-[var(--ease-velvet)] ${visible ? `${fadeIn ? "passage-in " : ""}opacity-100` : "opacity-0"}`}
      style={{ background: `radial-gradient(70% 60% at 50% 50%, #1c140e 0%, ${tone} 70%)` }}
    >
      {passage && (
        <div className={`text-center transition-all duration-[1200ms] ease-[var(--ease-quill)] ${visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}>
          <p className="font-[family-name:var(--font-display)] text-4xl uppercase tracking-[0.42em] text-gold-bright md:text-6xl" style={{ paddingLeft: "0.42em", textShadow: "0 0 28px rgb(220 170 90 / 0.35)" }}>
            {passage.latin}
          </p>
          <p className="mt-4 font-[family-name:var(--font-serif)] text-lg italic text-parchment/70">{passage.name}</p>
        </div>
      )}
    </div>
  );
}
