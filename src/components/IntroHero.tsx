"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Arms } from "./Emblem";
import { StainedGlass } from "./StainedGlass";

type Phase = "dark" | "glow" | "inscription" | "ready" | "opening";

const reducedMotion = () =>
  document.documentElement.dataset.motion === "reduced" || matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Le seuil de SCRYPTORIUM : une porte cochère entre deux vitraux de scriptorium.
 * Noir → les vitraux s'allument → les armoiries apparaissent → la lumière filtre sous les vantaux.
 * Les portes s'entrouvrent au survol ; un clic les pousse : la caméra avance dans l'embrasure,
 * la lumière de la salle envahit l'écran et l'on se retrouve à l'intérieur (la salle 3D reprend
 * ce même voile de lumière, sans rejouer d'ouverture de portes).
 * Séquence complète à la première visite, instantanée ensuite (rejouable).
 */
export function IntroHero() {
  const [phase, setPhase] = useState<Phase>("dark");
  const router = useRouter();
  const camera = useRef<HTMLDivElement>(null);
  const door = useRef<HTMLButtonElement>(null);

  const play = () => {
    setPhase("dark");
    const t = [
      setTimeout(() => setPhase("glow"), 350),
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
    // La « caméra » avance vers le centre exact de l'embrasure.
    const cam = camera.current?.getBoundingClientRect();
    const d = door.current?.getBoundingClientRect();
    if (cam && d && camera.current) {
      camera.current.style.transformOrigin = `${d.left + d.width / 2 - cam.left}px ${d.top + d.height * 0.55 - cam.top}px`;
    }
    setPhase("opening");
    setTimeout(() => router.push("/bibliotheque?entree=porte"), 1900);
  };

  const lit = phase !== "dark";
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

      <div ref={camera} className="threshold-camera relative z-10 flex flex-col items-center">
      {/* Armoiries et inscription au-dessus de la porte */}
      <header
        className="relative z-10 flex flex-col items-center text-center transition-all duration-[1400ms] ease-[var(--ease-quill)]"
        style={{ opacity: inscription && !opening ? 1 : 0, transform: inscription ? "none" : "translateY(-10px)", filter: inscription ? "none" : "blur(6px)" }}
      >
        <Arms preload className="threshold-arms h-[clamp(6rem,17svh,13rem)] w-auto" />
        <h1 className="threshold-title display mt-1 text-[clamp(1.6rem,4.8vw,3.4rem)] tracking-[0.3em]" style={{ paddingLeft: "0.3em" }}>
          SCRYPTORIUM
        </h1>
        <p className="mt-2 flex items-center gap-3 whitespace-nowrap text-[0.56rem] uppercase tracking-[0.26em] text-gold-soft sm:tracking-[0.42em] md:text-[0.66rem]">
          <span aria-hidden className="hidden h-px w-8 bg-gold-soft/50 sm:block" />
          Bibliothèque &amp; cabinet de lecture
          <span aria-hidden className="hidden h-px w-8 bg-gold-soft/50 sm:block" />
        </p>
      </header>

      {/* La porte, entre deux vitraux */}
      <div className="relative z-10 mt-[clamp(1.6rem,5svh,3rem)] flex items-end justify-center gap-[clamp(0.6rem,4vw,3.5rem)]">
        <Window scene="copiste" lit={lit} delay={0} />

        <div
          className="threshold-stage relative transition-transform duration-[1700ms] ease-[var(--ease-velvet)]"

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
            ref={door}
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

        <Window scene="bibliotheque" lit={lit} delay={350} />
      </div>
      </div>

      {/* Voile de lumière : relayé par la salle 3D à l'arrivée */}
      <div aria-hidden className="threshold-veil pointer-events-none fixed inset-0 z-50" />

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

function Window({ scene, lit, delay }: { scene: "copiste" | "bibliotheque"; lit: boolean; delay: number }) {
  return (
    <div className="threshold-window relative" data-lit={lit} style={{ transitionDelay: `${delay}ms` }}>
      <StainedGlass scene={scene} className="threshold-glass h-full w-full" />
      {/* Lumière colorée projetée au sol */}
      <span aria-hidden className="threshold-pool pointer-events-none absolute left-1/2 top-full h-[16%] w-[180%] -translate-x-1/2" style={{ transitionDelay: `${delay}ms` }} />
    </div>
  );
}
