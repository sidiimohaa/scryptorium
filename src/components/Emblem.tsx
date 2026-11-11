import Image from "next/image";
import armoiries from "@/assets/armoiries.webp";
import drawnArms from "../../public/brand/armoiries-vitrail.png";

/**
 * Armoiries de SCRYPTORIUM (illustration semi-réaliste générée puis détourée).
 * « De gueules au dragon d'or rampant, tenant un livre fermé à la serrure d'argent, à la bordure d'or. »
 * Timbre : heaume d'acier couronné d'or, sommé d'une plume. Lambrequins de sable et d'or. Ailes de dragon.
 * Devise : VERBA VOLANT · SCRIPTA MANENT.
 *
 * `Emblem` : l'écu seul, pour les petites tailles (en-tête, Bureau, favicon : voir app/icon.png).
 * `Arms`   : les armoiries complètes, pour la page d'accueil.
 * La version dessinée est désormais utilisée par défaut ; l'original reste réservé au préloader.
 */

export function Emblem({ className = "", title = "Armoiries de SCRYPTORIUM" }: { className?: string; title?: string }) {
  return (
    <Image
      src="/brand/armoiries-vitrail-128.webp"
      width={128}
      height={178}
      alt={title}
      unoptimized
      className={`object-contain ${className}`}
    />
  );
}

export function Arms({
  className = "",
  title = "Armoiries de SCRYPTORIUM — Verba volant, scripta manent",
  preload = false,
  variant = "drawn",
}: {
  className?: string;
  title?: string;
  preload?: boolean;
  variant?: "drawn" | "original";
}) {
  return (
    <Image
      src={variant === "original" ? armoiries : drawnArms}
      alt={title}
      sizes="(max-width: 640px) 45vw, 220px"
      preload={preload}
      className={`object-contain ${className}`}
    />
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-[family-name:var(--font-display)] tracking-[0.34em] ${className}`}>SCRYPTORIUM</span>;
}
