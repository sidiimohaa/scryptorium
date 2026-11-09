"use client";
import { useEffect, useState } from "react";

export function MotionToggle() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only state after hydration
    setReduced(document.documentElement.dataset.motion === "reduced");
  }, []);
  const toggle = () => {
    const next = !reduced;
    setReduced(next);
    document.documentElement.dataset.motion = next ? "reduced" : "full";
    try {
      localStorage.setItem("scr-motion", next ? "reduced" : "full");
    } catch {}
  };
  return (
    <button type="button" onClick={toggle} aria-pressed={reduced} className="text-xs uppercase tracking-[0.22em] text-muted hover:text-gold">
      Animations : {reduced ? "réduites" : "complètes"}
    </button>
  );
}
