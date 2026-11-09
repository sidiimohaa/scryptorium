import { useId } from "react";

/**
 * Vitraux du seuil — dessin original en verre et plomb.
 * Lancette gothique : bordure de perles colorées, fond de losanges, médaillon central.
 *  - « copiste » : un moine écrit au pupitre, à la lueur d'une chandelle.
 *  - « bibliotheque » : des rayonnages de livres sous une lampe suspendue.
 */

const LEAD = "#140d0b";
const GLASS = {
  blue: "#1f3f78",
  deepBlue: "#162c57",
  ruby: "#8e1f2c",
  gold: "#d9a441",
  amber: "#b8742a",
  green: "#2f6b4a",
  violet: "#4b2f6b",
  cream: "#efe2c2",
  skin: "#e7c49a",
  wood: "#6b3f1f",
  robe: "#4a2b1c",
};

const OUTER = "M0,320 V104 C0,52 30,16 70,0 C110,16 140,52 140,104 V320 Z";
const GLASS_AREA = "M12,312 V106 C12,62 38,30 70,15 C102,30 128,62 128,106 V312 Z";

/** Losanges du fond, colorés de façon déterministe. */
function Quarries({ seed }: { seed: number }) {
  const palette = [GLASS.deepBlue, GLASS.blue, GLASS.deepBlue, GLASS.ruby, GLASS.blue, GLASS.green, GLASS.deepBlue, GLASS.violet];
  const cells: React.ReactNode[] = [];
  // Couleur déterministe par case (hachage entier, sans état).
  const pick = (row: number, col: number) => {
    let h = Math.imul(seed * 374761393 + (row + 7) * 668265263 + (col + 11) * 2246822519, 3266489917) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
    return (h >>> 0) % palette.length;
  };
  const w = 18;
  const h = 26;
  for (let row = -1; row < 27; row++) {
    for (let col = -1; col < 9; col++) {
      const cx = col * w + (row % 2 ? w / 2 : 0);
      const cy = row * (h / 2) + 10;
      const fill = palette[pick(row, col)];
      cells.push(
        <path
          key={`${row}-${col}`}
          d={`M${cx},${cy - h / 2} L${cx + w / 2},${cy} L${cx},${cy + h / 2} L${cx - w / 2},${cy} Z`}
          fill={fill}
          stroke={LEAD}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />,
      );
    }
  }
  return <g>{cells}</g>;
}

function ScribeScene() {
  return (
    <g stroke={LEAD} strokeWidth="1.3" strokeLinejoin="round">
      {/* sol */}
      <path d="M24,200 H116 V222 H24 Z" fill={GLASS.amber} />
      {/* tabouret */}
      <path d="M46,196 H76 V201 H46 Z M50,201 H54 V214 H50 Z M68,201 H72 V214 H68 Z" fill={GLASS.wood} />
      {/* robe du moine, assis, tourné vers le pupitre */}
      <path d="M44,200 C44,184 48,168 56,160 C62,155 72,154 78,160 C84,168 86,184 84,200 Z" fill={GLASS.robe} />
      <path d="M56,170 C58,182 58,192 56,200 M70,166 C72,178 74,190 74,200" fill="none" stroke="#000" strokeOpacity="0.45" strokeWidth="0.9" />
      {/* capuchon et visage */}
      <path d="M58,160 C54,146 60,134 72,134 C80,135 84,142 82,152 C78,156 70,160 58,160 Z" fill={GLASS.robe} />
      <path d="M74,141 C80,141 84,146 83,152 C82,156 78,158 74,157 C72,152 72,146 74,141 Z" fill={GLASS.skin} />
      <circle cx="80" cy="146" r="0.9" fill={LEAD} stroke="none" />
      {/* bras tendu vers le livre */}
      <path d="M72,166 L94,164 L95,170 L73,173 Z" fill={GLASS.robe} />
      <circle cx="96" cy="166.5" r="2.6" fill={GLASS.skin} />
      {/* plume */}
      <path d="M96,166 L104,148 C107,150 106,156 98,166 Z" fill={GLASS.cream} />
      {/* pupitre incliné */}
      <path d="M90,172 L116,160 L118,166 L93,178 Z" fill={GLASS.wood} />
      <path d="M103,173 H108 V202 H103 Z" fill={GLASS.wood} />
      {/* livre ouvert */}
      <path d="M92,170 L103,165 L105,170 L94,175 Z M103,165 L114,160 L116,165 L105,170 Z" fill={GLASS.cream} />
      {/* encrier */}
      <path d="M111,154 H116 V160 H111 Z" fill={GLASS.violet} />
      {/* chandelle */}
      <path d="M30,168 H35 V196 H30 Z" fill={GLASS.cream} />
      <path d="M27,196 H38 V200 H27 Z" fill={GLASS.gold} />
      <path d="M32.5,156 C36,161 36,165 32.5,167 C29,165 29,161 32.5,156 Z" fill="#ffd56b" className="vitrail-flame" />
    </g>
  );
}

function LibraryScene() {
  const books = [
    // [x, width, height, color, tilt]
    [30, 6, 22, GLASS.ruby, 0], [36, 5, 19, GLASS.green, 0], [41, 7, 23, GLASS.gold, 0], [48, 5, 18, GLASS.violet, 0],
    [53, 6, 21, GLASS.cream, 0], [59, 5, 22, GLASS.ruby, 0], [66, 7, 20, GLASS.blue, -12], [80, 6, 23, GLASS.green, 0],
    [86, 5, 18, GLASS.amber, 0], [91, 7, 22, GLASS.ruby, 0], [98, 5, 20, GLASS.cream, 0], [103, 6, 21, GLASS.violet, 0],
  ] as const;
  const shelf = (y: number, offset: number) =>
    books.map(([x, w, h, c, tilt], i) => {
      const xx = 30 + ((x - 30 + offset * 9 + i * 3) % 80);
      return (
        <path
          key={`${y}-${i}`}
          d={`M${xx},${y} h${w} v${-h} h${-w} Z`}
          fill={c}
          transform={tilt ? `rotate(${tilt} ${xx + w} ${y})` : undefined}
        />
      );
    });
  return (
    <g stroke={LEAD} strokeWidth="1.3" strokeLinejoin="round">
      {/* niche de bois */}
      <path d="M26,222 V150 C26,136 44,128 70,128 C96,128 114,136 114,150 V222 Z" fill={GLASS.wood} />
      <path d="M30,218 V152 C30,141 46,134 70,134 C94,134 110,141 110,152 V218 Z" fill="#2a1a12" />
      {shelf(170, 0)}
      {shelf(194, 2)}
      {shelf(218, 4)}
      <path d="M30,170 H110 V174 H30 Z M30,194 H110 V198 H30 Z" fill={GLASS.amber} />
      {/* lampe suspendue */}
      <path d="M70,120 V138" fill="none" />
      <path d="M62,138 H78 L74,146 H66 Z" fill={GLASS.gold} />
      <path d="M70,146 C73,150 72,154 70,155 C68,154 67,150 70,146 Z" fill="#ffd56b" className="vitrail-flame" />
    </g>
  );
}

export function StainedGlass({ scene, className = "" }: { scene: "copiste" | "bibliotheque"; className?: string }) {
  const id = useId().replace(/:/g, "");
  const label =
    scene === "copiste" ? "Vitrail : un moine copiste écrit à la chandelle" : "Vitrail : des rayonnages de livres sous une lampe";
  return (
    <svg viewBox="0 0 140 320" className={className} role="img" aria-label={label}>
      <defs>
        <clipPath id={`${id}-glass`}>
          <path d={GLASS_AREA} />
        </clipPath>
        <clipPath id={`${id}-medallion`}>
          <circle cx="70" cy="178" r="47" />
        </clipPath>
        <linearGradient id={`${id}-stone`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4a4037" />
          <stop offset="1" stopColor="#241d18" />
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx="0.35" cy="0.25" r="0.9">
          <stop offset="0" stopColor="#fff6dc" stopOpacity="0.45" />
          <stop offset="0.5" stopColor="#fff6dc" stopOpacity="0.08" />
          <stop offset="1" stopColor="#000" stopOpacity="0.25" />
        </radialGradient>
      </defs>

      {/* Encadrement de pierre */}
      <path d={OUTER} fill={`url(#${id}-stone)`} stroke="#0f0b09" strokeWidth="1.5" />
      <path d="M5,318 V105 C5,56 33,22 70,6 C107,22 135,56 135,105 V318" fill="none" stroke="#000" strokeOpacity="0.4" strokeWidth="1" />

      {/* Verre */}
      <g clipPath={`url(#${id}-glass)`} className="vitrail-glass">
        <Quarries seed={scene === "copiste" ? 7 : 19} />

        {/* Rosace sommitale */}
        <g stroke={LEAD} strokeWidth="1.3">
          <circle cx="70" cy="64" r="20" fill={GLASS.ruby} />
          {[0, 90, 180, 270].map((a) => (
            <circle key={a} cx={70 + 10 * Math.cos((a * Math.PI) / 180)} cy={64 + 10 * Math.sin((a * Math.PI) / 180)} r="8.5" fill={a % 180 ? GLASS.gold : GLASS.blue} />
          ))}
          <circle cx="70" cy="64" r="5" fill={GLASS.cream} />
        </g>

        {/* Médaillon et sa scène */}
        <circle cx="70" cy="178" r="52" fill={GLASS.gold} stroke={LEAD} strokeWidth="1.6" />
        <circle cx="70" cy="178" r="52" fill="none" stroke={GLASS.ruby} strokeWidth="5" strokeDasharray="5 5" />
        <circle cx="70" cy="178" r="47" fill={GLASS.blue} stroke={LEAD} strokeWidth="1.6" />
        <g clipPath={`url(#${id}-medallion)`}>
          <path d="M23,140 L70,128 L117,146 M23,170 L60,150 M84,140 L117,128" fill="none" stroke={LEAD} strokeWidth="1" opacity="0.8" />
          {scene === "copiste" ? <ScribeScene /> : <LibraryScene />}
        </g>
        <circle cx="70" cy="178" r="47" fill="none" stroke={LEAD} strokeWidth="2" />

        {/* Petits médaillons bas */}
        <g stroke={LEAD} strokeWidth="1.3">
          <circle cx="70" cy="268" r="14" fill={GLASS.green} />
          <path d="M62,268 L70,258 L78,268 L70,278 Z" fill={GLASS.gold} />
        </g>

        {/* Lumière qui traverse le verre */}
        <rect x="0" y="0" width="140" height="320" fill={`url(#${id}-sun)`} className="vitrail-sun" />
      </g>

      {/* Bordure de perles colorées, plombs */}
      <path d={GLASS_AREA} fill="none" stroke={GLASS.gold} strokeWidth="7" />
      <path d={GLASS_AREA} fill="none" stroke={GLASS.ruby} strokeWidth="7" strokeDasharray="6 6" />
      <path d={GLASS_AREA} fill="none" stroke={LEAD} strokeWidth="1.6" />
      <path d="M19,312 V107 C19,67 43,38 70,24 C97,38 121,67 121,107 V312" fill="none" stroke={LEAD} strokeWidth="1.4" />
      {/* Barlotières (fers horizontaux) */}
      <path d="M12,120 H128 M12,240 H128" stroke="#0b0807" strokeWidth="2.2" />
      {/* Appui de pierre */}
      <path d="M-4,312 H144 V320 H-4 Z" fill="#3a3129" stroke="#0f0b09" strokeWidth="1" />
    </svg>
  );
}
