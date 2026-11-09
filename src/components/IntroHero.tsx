"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { Arms } from "./Emblem";

type Phase = "dark" | "candles" | "inscription" | "ready" | "opening";

const reducedMotion = () =>
  document.documentElement.dataset.motion === "reduced" || matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Le seuil de SCRYPTORIUM : une porte cochère, rien d'autre.
 * Noir → les bougies s'allument → l'inscription apparaît → la lumière filtre sous les vantaux.
 * Les portes s'entrouvrent au survol ; un clic les pousse et conduit dans la salle.
 * Séquence complète à la première visite, instantanée ensuite (rejouable).
 */
export function IntroHero() {
  const [phase, setPhase] = useState<Phase>("dark");
  const router = useRouter();

  const play = () => {
    setPhase("dark");
    const t = [
      setTimeout(() => setPhase("candles"), 350),
      setTimeout(() => setPhase("inscription"), 1500),
      setTimeout(() => setPhase("ready"), 2900),
    ];
    try {
      localStorage.setItem("scr-visited", "1");
    } catch {}
    return () => t.forEach(clearTimeout);
  };

  useEffect(() => {
    router.prefetch("/bibliotheque");
    let visited = false;
    try {
      visited = localStorage.getItem("scr-visited") === "1";
    } catch {}
    if (visited || reducedMotion()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only state after hydration
      setPhase("ready");
      return;
    }
    return play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enter = () => {
    if (phase === "opening") return;
    if (reducedMotion()) return router.push("/bibliotheque?intro=0");
    setPhase("opening");
    setTimeout(() => router.push("/bibliotheque"), 1700);
  };

  const candles = phase !== "dark";
  const inscription = phase === "inscription" || phase === "ready" || phase === "opening";
  const ready = phase === "ready" || phase === "opening";
  const opening = phase === "opening";

  return (
    <section
      aria-label="Entrée de la bibliothèque"
      data-phase={phase}
      className="threshold relative isolate flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-4 py-4"
    >
      {/* Wall: dark wainscot + vignette */}
      <div aria-hidden className="threshold-wall absolute inset-0 -z-10" />

      {/* Inscription carved above the door */}
      <header
        className="relative z-10 flex flex-col items-center text-center transition-all duration-[1400ms] ease-[var(--ease-quill)]"
        style={{ opacity: inscription && !opening ? 1 : 0, transform: inscription ? "none" : "translateY(-10px)", filter: inscription ? "none" : "blur(6px)" }}
      >
        <Arms className="threshold-arms h-[clamp(6.5rem,18svh,12rem)] w-auto" />
        <h1 className="threshold-title display mt-1 text-[clamp(1.6rem,4.8vw,3.4rem)] tracking-[0.3em]" style={{ paddingLeft: "0.3em" }}>
          SCRYPTORIUM
        </h1>
        <p className="mt-2 flex items-center gap-3 whitespace-nowrap text-[0.56rem] uppercase tracking-[0.26em] text-gold-soft sm:tracking-[0.42em] md:text-[0.66rem]">
          <span aria-hidden className="hidden h-px w-8 bg-gold-soft/50 sm:block" />
          Bibliothèque &amp; cabinet de lecture
          <span aria-hidden className="hidden h-px w-8 bg-gold-soft/50 sm:block" />
        </p>
      </header>

      {/* The doorway, flanked by two candle sconces */}
      <div className="relative z-10 mt-[clamp(1.6rem,5svh,3rem)] flex items-end justify-center gap-[clamp(1rem,6vw,4.5rem)]">
        <Sconce lit={candles} delay={0} />

        <div
          className="threshold-stage relative transition-transform duration-[1700ms] ease-[var(--ease-velvet)]"
          style={{ transform: opening ? "scale(2.6) translateY(6%)" : "none" }}
        >
          {/* Stone archivolt */}
          <div aria-hidden className="threshold-arch absolute -inset-x-[11%] -top-[8%] bottom-0">
            <div className="threshold-voussoirs absolute inset-0" />
            <div className="absolute inset-[5%_6.5%_0] rounded-t-[50%_32%] border border-gold/15" />
            {/* Keystone */}
            <div className="threshold-keystone absolute left-1/2 top-[-1%] -translate-x-1/2" />
          </div>

          {/* Doorway (the button) */}
          <button
            type="button"
            onClick={enter}
            disabled={!ready}
            aria-label="Pousser les portes et entrer dans la bibliothèque"
            className="threshold-door group relative block overflow-hidden rounded-t-[50%_32%] focus-visible:outline-offset-[6px]"
            style={{ perspective: "1400px" }}
          >
            {/* What lies beyond: warm light and the silhouettes of shelves */}
            <span aria-hidden className="threshold-beyond absolute inset-0" />

            {(["left", "right"] as const).map((side) => (
              <span
                key={side}
                aria-hidden
                className={`threshold-leaf threshold-leaf--${side} absolute inset-y-0 w-1/2`}
                style={
                  {
                    [side]: 0,
                    transformOrigin: side === "left" ? "left center" : "right center",
                    "--swing": opening ? (side === "left" ? "-112deg" : "112deg") : "0deg",
                  } as CSSProperties
                }
              >
                <span className="threshold-panel absolute inset-x-[16%] top-[12%] h-[30%]" />
                <span className="threshold-panel absolute inset-x-[16%] top-[48%] h-[38%]" />
                <span className="threshold-strap absolute inset-x-0 top-[20%]" />
                <span className="threshold-strap absolute inset-x-0 top-[78%]" />
                <span className={`threshold-knocker absolute top-[54%] ${side === "left" ? "right-[12%]" : "left-[12%]"}`} />
              </span>
            ))}

            {/* Light through the seam and under the door */}
            <span aria-hidden className="threshold-seam absolute inset-y-[3%] left-1/2 w-[3px] -translate-x-1/2" />
            <span aria-hidden className="threshold-sill absolute inset-x-[6%] bottom-0 h-[3px]" />
            {/* Flood of light while opening */}
            <span aria-hidden className="threshold-flood pointer-events-none absolute inset-0" />
          </button>

          {/* Light spilling on the floor + dust in the beam */}
          <div aria-hidden className="threshold-spill pointer-events-none absolute left-1/2 top-full h-[22%] w-[170%] -translate-x-1/2" />
          <div aria-hidden className="pointer-events-none absolute inset-x-[10%] bottom-0 top-[30%] overflow-hidden">
            {Array.from({ length: 14 }, (_, i) => (
              <span
                key={i}
                className="threshold-mote absolute rounded-full"
                style={{ left: `${(i * 37) % 100}%`, bottom: `${(i * 13) % 40}%`, animationDelay: `${-i * 1.7}s`, animationDuration: `${11 + (i % 5) * 2}s` }}
              />
            ))}
          </div>
        </div>

        <Sconce lit={candles} delay={260} />
      </div>

      {/* Threshold text and actions */}
      <div
        className="relative z-10 mt-[clamp(1rem,3.5svh,2.5rem)] flex flex-col items-center text-center transition-all duration-1000 ease-[var(--ease-quill)]"
        style={{ opacity: ready && !opening ? 1 : 0, transform: ready ? "none" : "translateY(12px)", pointerEvents: ready && !opening ? "auto" : "none" }}
      >
        <p className="max-w-md font-[family-name:var(--font-serif)] text-[clamp(1rem,2.2vw,1.25rem)] italic text-parchment/80">
          « Chaque livre est une porte vers un autre monde. »
        </p>
        <button type="button" onClick={enter} className="btn mt-7 min-w-60">
          Pousser les portes
        </button>
        <Link href="/catalogue" className="link-gilt mt-5 text-[0.66rem] uppercase tracking-[0.28em] text-muted hover:text-gold-bright">
          ou consulter le catalogue
        </Link>
      </div>

      <div className="absolute bottom-4 right-5 z-10 text-[0.6rem] uppercase tracking-[0.24em] text-muted/70">
        {!ready ? (
          <button type="button" onClick={() => setPhase("ready")} className="hover:text-gold">Passer</button>
        ) : (
          !opening && <button type="button" onClick={play} className="hover:text-gold">Revoir l&apos;ouverture</button>
        )}
      </div>
    </section>
  );
}

function Sconce({ lit, delay }: { lit: boolean; delay: number }) {
  return (
    <div aria-hidden className="threshold-sconce relative mb-[34%] hidden flex-col items-center sm:flex" data-lit={lit} style={{ transitionDelay: `${delay}ms` }}>
      <span className="threshold-glow absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full" style={{ transitionDelay: `${delay}ms` }} />
      <span className="threshold-flame relative h-4 w-2.5" style={{ transitionDelay: `${delay}ms` }} />
      <span className="h-10 w-3 rounded-[2px] bg-gradient-to-b from-[#efe3c8] to-[#c9b48c]" />
      <span className="h-1.5 w-8 rounded-full bg-gradient-to-b from-gold-bright to-gold-soft" />
      <span className="h-6 w-1 bg-gradient-to-b from-gold to-[#6d5634]" />
      <span className="h-1 w-10 rounded-full bg-[#6d5634]" />
    </div>
  );
}
