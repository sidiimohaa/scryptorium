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
      <path d="M43,202 C43,188 46,169 55,160 C62,153 72,154 78,160 L81,180 L77,191 L86,207 L48,207 Z" fill={GLASS.robe} />
      <path d="M55,164 C48,178 49,192 48,207 L60,207 C57,191 61,177 66,165 Z" fill={GLASS.wood} />
      <path d="M68,176 L78,183 L70,194 L78,207 H65 C60,192 63,183 68,176 Z" fill="#36231b" />
      <path d="M54,177 Q50,191 53,202 M60,183 L60,203 M72,194 L77,203" fill="none" stroke={GLASS.amber} strokeOpacity="0.65" strokeWidth="0.8" />
      <path d="M49,181 Q63,187 78,180" fill="none" stroke={GLASS.gold} strokeWidth="1.5" />
      <path d="M65,185 L63,199 M65,186 L69,197" fill="none" stroke={GLASS.gold} strokeWidth="1" />
      <path d="M69,208 Q77,206 82,209 L84,213 H68 Z M51,208 H60 L65,213 H50 Z" fill="#2a1a12" />
      {/* capuchon et visage */}
      <path d="M57,160 C54,151 57,138 66,134 C75,129 83,135 84,143 L78,155 L76,166 L65,169 Z" fill={GLASS.robe} />
      <path d="M61,156 C58,147 62,138 69,137 C76,135 81,139 82,144 L73,155 L70,163 Z" fill={GLASS.wood} />
      <path d="M70,139 C76,136 82,140 82,146 L87,151 L83,153 L82,159 L77,162 L75,168 L68,163 L71,157 C68,154 67,150 68,146 Z" fill={GLASS.skin} />
      <path d="M68,146 Q68,136 76,137 Q82,138 82,144 L76,142 L73,149 L70,153 Z" fill="#69503a" />
      <path d="M76,157 L82,155 L82,160 L77,163 L73,158" fill="#b98559" strokeWidth="0.7" />
      <path d="M77,146 L81,147 M79,154 L82,154" fill="none" strokeWidth="0.65" strokeLinecap="round" />
      <circle cx="79.5" cy="148" r="0.65" fill={LEAD} stroke="none" />
      <path d="M72,150 C69,146 68,151 71,153" fill="none" stroke="#9d6848" strokeWidth="0.7" />
      <path d="M58,159 L67,164 L75,161 L79,167 L68,173 Z" fill={GLASS.wood} />
      {/* bras tendu vers le livre */}
      <path d="M72,165 C78,163 79,169 83,173 L93,167 L97,172 L84,183 C80,185 76,178 70,174 Z" fill={GLASS.robe} />
      <path d="M73,168 L82,178 L91,173" fill="none" stroke={GLASS.amber} strokeWidth="0.85" />
      <path d="M90,168 L94,166 L98,172 L94,175 Z" fill={GLASS.wood} />
      <path d="M94,167 L98,164 Q100,163 101,165 L101,168 L104,171 L102,173 L98,171 L97,173 Z" fill={GLASS.skin} strokeWidth="0.9" />
      <path d="M99,167 L102,170 M97,169 L100,171" fill="none" stroke="#9d6848" strokeWidth="0.55" />
      {/* plume */}
      <path d="M100,166 C98,157 103,147 111,144 C111,151 108,158 102,163 Z" fill={GLASS.cream} strokeWidth="0.9" />
      <path d="M101,172 L107,150 M102,160 L106,157 M104,154 L103,151" fill="none" strokeWidth="0.65" strokeLinecap="round" />
      {/* pupitre incliné */}
      <path d="M90,172 L116,160 L118,166 L93,178 Z" fill={GLASS.wood} />
      <path d="M103,173 H108 V202 H103 Z" fill={GLASS.wood} />
      {/* livre ouvert */}
      <path d="M90,171 L101,165 L106,169 L114,161 L117,167 L105,175 Z" fill={GLASS.ruby} />
      <path d="M91,169 Q98,163 103,165 L105,172 Q100,170 93,173 Z M103,165 Q108,161 114,160 L116,165 Q109,167 105,172 Z" fill={GLASS.cream} strokeWidth="0.8" />
      <path d="M95,169 L101,167 M96,171 L102,169 M107,166 L112,163 M108,168 L114,165" fill="none" stroke="#88663e" strokeWidth="0.55" />
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
