"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AbbeyPlan } from "./AbbeyPlan";

/**
 * Onglet « Plan de l'abbaye » des salles : déplie le plan par-dessus la scène (touche M), pour passer
 * d'une salle à l'autre sans quitter l'ambiance. Échap referme sans déclencher les raccourcis de la salle.
 */
export function PlanOverlay({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (open && e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        setOpen(false);
      } else if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "m") {
        e.stopImmediatePropagation();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Plan de l'abbaye (M)"
        className="btn btn-ghost pointer-events-auto px-2.5 py-1.5 text-[0.62rem] tracking-[0.18em] md:px-3 md:py-2 md:text-[0.68rem]"
      >
        Plan de l&apos;abbaye
      </button>
      {open && createPortal(
        // Rendu à la racine du document : une barre parente à backdrop-filter (bibliothèque) ou à
        // pointer-events-none deviendrait sinon le repère du dialogue « fixed » et l'enfermerait.
        // Pas de backdrop-filter ici : il ferait du dialogue le repère des éléments « fixed » (le voile de passage).
        // pointer-events-auto : le bouton vit dans des barres qui laissent passer les clics vers la scène.
        <div role="dialog" aria-modal="true" aria-label="Plan de l'abbaye" className="pointer-events-auto fixed inset-0 z-[80] overflow-y-auto bg-[#0b0908]/94"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
            <div className="mb-6 flex items-baseline justify-between gap-4">
              <div>
                <p className="eyebrow">L&apos;abbaye</p>
                <h2 className="display mt-1 text-4xl md:text-5xl">Plan de l&apos;abbaye</h2>
              </div>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="btn btn-ghost px-3 py-2 text-[0.68rem] tracking-[0.18em]">Fermer · Échap</button>
            </div>
            <AbbeyPlan current={current} />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
