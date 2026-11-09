"use client";
import { useId, useState } from "react";

export function SpoilerReveal({ label = "Analyse avec spoilers", children }: { label?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="border border-bordeaux-2/60 bg-bordeaux/15">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span>
          <span className="eyebrow text-[#d59aa3]">Attention — révélations</span>
          <span className="mt-1 block font-[family-name:var(--font-display)] text-2xl text-cream">{label}</span>
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-muted">{open ? "Masquer" : "Révéler"}</span>
      </button>
      <div id={id} hidden={!open} className="border-t border-bordeaux-2/40 px-6 py-6">
        {children}
      </div>
    </div>
  );
}
