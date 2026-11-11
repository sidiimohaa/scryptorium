"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Arms } from "./Emblem";
import armoiries from "@/assets/armoiries.webp";

/** Le sceau précède l'accueil ; le dessin terminé, il révèle la page chargée. */
export function HomePreloader({ onComplete }: { onComplete: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [started, setStarted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const ready = loaded && drawn;

  useEffect(() => {
    let active = true;
    const frame = requestAnimationFrame(() => setStarted(true));
    let onLoad: () => void = () => {};
    const pageLoaded = document.readyState === "complete" ? Promise.resolve() : new Promise<void>((resolve) => {
      onLoad = resolve;
      window.addEventListener("load", onLoad, { once: true });
    });
    const logo = new window.Image();
    logo.src = armoiries.src;
    Promise.all([pageLoaded, document.fonts.ready, logo.decode().catch(() => {})]).then(() => {
      if (active) setLoaded(true);
    });
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  if (dismissed) return null;
  return (
    <div
      className="home-preloader fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#0b0908]"
      data-ready={ready}
      data-started={started}
      aria-hidden={ready}
      onTransitionEnd={(event) => {
        if (ready && event.target === event.currentTarget && event.propertyName === "opacity") {
          setDismissed(true);
          onComplete();
        }
      }}
    >
      <div className="relative h-64 w-[184px]" aria-hidden>
        <Arms variant="original" preload className="seal-arms h-full w-full" />
        <svg viewBox="0 0 720 1000" className="pointer-events-none absolute inset-0 h-full w-full" fill="none">
          <path
            className="seal-outline"
            onAnimationEnd={() => setDrawn(true)}
            pathLength="1"
            d="M170 357 Q364 331 557 347 L543 564 Q527 731 361 830 Q190 741 176 574 Z"
            stroke="#efd294"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="mt-7 font-[family-name:var(--font-display)] text-xl tracking-[0.3em] text-gold-bright">SCRYPTORIUM</p>
      <p role="status" className="mt-4 text-xs tracking-[0.12em] text-muted">Chargement de SCRYPTORIUM…</p>
      <Link href="/catalogue" className="link-gilt mt-8 text-xs text-muted">Consulter le catalogue</Link>
    </div>
  );
}
