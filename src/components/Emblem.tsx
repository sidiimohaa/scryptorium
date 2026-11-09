import { useId } from "react";

/**
 * Armoiries de SCRYPTORIUM — dessin original.
 * « De gueules au dragon d'or, ailes déployées, gardant un livre fermé d'or à la serrure de sable,
 *   la queue enroulée en pointe ; à la bordure d'or. »
 * Timbre : couronne d'or à cinq fleurons, celui du milieu en bec de plume. Lambrequins de gueules doublés d'or.
 * Devise : VERBA VOLANT · SCRIPTA MANENT.
 *
 * `Emblem` : l'écu seul (petites tailles : en-tête, favicon, clé de voûte).
 * `Arms`   : les armoiries complètes (couronne, lambrequins, devise).
 */

const INK = "#2a120f";
const SHIELD = "M100,120 H300 V245 C300,325 255,372 200,398 C145,372 100,325 100,245 Z";
const SHIELD_INNER = "M111,131 H289 V245 C289,317 250,358 200,384 C150,358 111,317 111,245 Z";

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stopColor="#f6e2ad" />
        <stop offset="0.45" stopColor="#d4b173" />
        <stop offset="1" stopColor="#8f6a37" />
      </linearGradient>
      <linearGradient id={`${id}-gold-dark`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#b8935a" />
        <stop offset="1" stopColor="#7a5a2e" />
      </linearGradient>
      <linearGradient id={`${id}-field`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7a3540" />
        <stop offset="0.6" stopColor="#51252c" />
        <stop offset="1" stopColor="#331519" />
      </linearGradient>
      <pattern id={`${id}-damask`} width="16" height="16" patternUnits="userSpaceOnUse">
        <path d="M8,0 L16,8 L8,16 L0,8 Z" fill="none" stroke="#000" strokeOpacity="0.16" strokeWidth="0.8" />
        <circle cx="8" cy="8" r="1" fill="#000" fillOpacity="0.14" />
      </pattern>
      <radialGradient id={`${id}-sheen`} cx="0.35" cy="0.2" r="0.8">
        <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/** Le dragon gardant le livre, en coordonnées de l'écu. */
function DragonAndBook({ id }: { id: string }) {
  const gold = `url(#${id}-gold)`;
  const goldDark = `url(#${id}-gold-dark)`;
  const wing = (
    <g>
      <path
        d="M196,212 C180,192 152,164 118,142 Q134,160 116,180 Q136,192 126,212 Q146,214 150,234 Q170,222 192,230 Z"
        fill={gold}
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M194,216 Q160,192 116,180 M193,221 Q162,208 126,212 M192,226 Q172,224 150,234" fill="none" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M150,166 l-7,-6 l9,2" fill={gold} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
    </g>
  );
  return (
    <g>
      {/* Ailes déployées */}
      {wing}
      <g transform="matrix(-1 0 0 1 400 0)">{wing}</g>

      {/* Corps */}
      <ellipse cx="200" cy="238" rx="19" ry="23" fill={gold} stroke={INK} strokeWidth="1.6" />
      <path d="M188,224 Q200,231 212,224 M189,233 Q200,240 211,233 M190,242 Q200,249 210,242" fill="none" stroke={INK} strokeWidth="1" />

      {/* Cou puissant et épines dorsales */}
      <path d="M187,230 C180,209 187,190 199,176 L223,169 C234,186 228,210 215,230 Z" fill={gold} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M227,178 l10,2 l-8,6 M226,192 l10,4 l-10,4 M222,206 l9,6 l-11,2 M217,219 l8,7 l-11,0" fill={gold} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M193,186 Q203,190 213,185 M190,198 Q200,202 210,197 M188,210 Q198,214 208,209 M188,221 Q197,225 207,221" fill="none" stroke={INK} strokeWidth="0.9" />

      {/* Cornes recourbées */}
      <path d="M213,145 C221,133 232,125 249,119 C239,130 231,141 223,150 Z" fill={goldDark} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M220,155 C231,150 242,149 252,152 C242,156 234,160 225,164 Z" fill={goldDark} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />

      {/* Tête, gueule ouverte, tournée à dextre */}
      <path
        d="M226,158 C226,150 222,145 216,143 L208,140 L203,133 L200,141 C193,142 186,145 178,147 L166,150 C161,151 160,155 165,157 L194,160 L171,169 C167,171 169,176 174,176 L204,177 C212,177 220,174 224,168 C226,165 227,161 226,158 Z"
        fill={gold}
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M166,157 L194,160 L171,169 Z" fill={INK} />
      <path d="M170,157.3 L172,161.5 L174,157.6 Z M177,158 L179,162 L181,158.4 Z M184,158.7 L185.8,162.3 L187.6,159.2 Z M174,167.8 L176.4,163.8 L178,166.6 Z M181,165.4 L183,162 L184.6,164.4 Z" fill="#f3e7c9" />
      <path d="M182,163 L161,163 M161,163 L154,159 M161,163 L154,167" fill="none" stroke="#d0473f" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M189,146 Q199,141 208,146" fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
      <ellipse cx="199" cy="149.5" rx="3.3" ry="1.8" fill={INK} />
      <circle cx="198.2" cy="149" r="0.7" fill="#f6e2ad" />
      <circle cx="168.5" cy="152.5" r="1" fill={INK} />
      <path d="M224,166 l10,5 l-10,2" fill={gold} stroke={INK} strokeWidth="1" strokeLinejoin="round" />

      {/* Le livre gardé */}
      <rect x="172" y="249" width="64" height="84" rx="2" fill="#efe3c8" stroke={INK} strokeWidth="1.4" />
      <path d="M232,253 V331 M228,333 H172" fill="none" stroke={INK} strokeWidth="0.6" strokeOpacity="0.5" />
      <rect x="166" y="245" width="64" height="84" rx="3" fill={gold} stroke={INK} strokeWidth="1.6" />
      <rect x="166" y="245" width="9" height="84" rx="2" fill={goldDark} stroke={INK} strokeWidth="1.2" />
      <path d="M166,258 H175 M166,316 H175" stroke={INK} strokeWidth="1.2" />
      <rect x="180" y="253" width="43" height="68" rx="2" fill="none" stroke={INK} strokeWidth="1" />
      <path d="M180,253 l6,0 l-6,6 Z M223,253 l-6,0 l6,6 Z M180,321 l6,0 l-6,-6 Z M223,321 l-6,0 l6,-6 Z" fill={INK} />
      <rect x="225" y="279" width="10" height="14" rx="2" fill={goldDark} stroke={INK} strokeWidth="1.2" />
      <circle cx="201.5" cy="283" r="4.6" fill={INK} />
      <path d="M199,285 H204 L205.6,296 H197.4 Z" fill={INK} />

      {/* Pattes antérieures agrippant le livre */}
      {[0, 1].map((m) => (
        <g key={m} transform={m ? "matrix(-1 0 0 1 400 0)" : undefined}>
          <path d="M191,231 C183,236 177,241 172,247 L181,251 C185,245 190,243 195,241 Z" fill={gold} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M171,247 q-3,5 0,9 M176,249 q-2,5 1,9 M181,250 q-1,5 2,8" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      ))}

      {/* Queue enroulée sous le livre, en pointe de lance */}
      <path
        d="M214,329 C246,330 263,346 251,361 C237,378 178,381 154,365 C142,357 136,345 138,333 L131,336 L138,316 L147,332 L143,334 C143,344 150,352 160,358 C182,369 228,368 241,356 C249,347 241,338 214,338 Z"
        fill={gold}
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M226,334 C250,338 254,352 240,362 C216,375 172,373 155,361" fill="none" stroke={INK} strokeWidth="0.9" strokeDasharray="3 3" />
      <path d="M250,346 l9,-3 l-6,8 M236,371 l6,7 l-10,-2 M200,375 l3,8 l-8,-6 M166,369 l-2,8 l-5,-9" fill={gold} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
    </g>
  );
}

function Shield({ id }: { id: string }) {
  return (
    <g>
      <path d={SHIELD} fill={`url(#${id}-field)`} />
      <path d={SHIELD} fill={`url(#${id}-damask)`} />
      <DragonAndBook id={id} />
      {/* Bordure d'or */}
      <path d={SHIELD} fill="none" stroke={`url(#${id}-gold)`} strokeWidth="11" strokeLinejoin="round" clipPath={`url(#${id}-clip)`} />
      <path d={SHIELD_INNER} fill="none" stroke={INK} strokeWidth="1.4" />
      <path d={SHIELD} fill="none" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d={SHIELD} fill={`url(#${id}-sheen)`} />
      <clipPath id={`${id}-clip`}>
        <path d={SHIELD} />
      </clipPath>
    </g>
  );
}

/** L'écu seul. */
export function Emblem({ className = "", title = "Armoiries de SCRYPTORIUM" }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="94 114 212 290" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <Defs id={id} />
      <Shield id={id} />
    </svg>
  );
}

/** Les armoiries complètes : couronne, lambrequins, écu et devise. */
export function Arms({ className = "", title = "Armoiries de SCRYPTORIUM — Verba volant, scripta manent" }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  const gold = `url(#${id}-gold)`;
  const mantle = (
    <g>
      <path
        d="M162,110 C130,102 96,108 78,128 C64,144 66,162 76,170 C64,172 54,186 58,202 C62,218 76,222 82,220 C70,232 66,252 74,266 C82,280 94,280 98,276 C90,292 92,312 104,324 C110,332 116,338 112,356 C126,344 128,328 120,314 C112,300 112,288 120,280 C110,276 100,262 104,248 C108,236 118,232 124,234 C112,222 106,206 112,192 C118,180 128,178 134,182 C126,168 130,150 146,138 C152,134 158,130 162,126 Z"
        fill="#5a2530"
        stroke={gold}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M150,120 C112,130 92,168 100,208 C106,238 98,268 110,300 C114,312 118,324 116,340" fill="none" stroke={gold} strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.8" />
      <path d="M78,128 c-6,8 -2,18 7,16 c6,-2 5,-9 0,-9 M58,202 c-2,-9 6,-15 13,-10 c4,4 0,9 -4,7 M74,266 c-4,-8 2,-16 10,-12 c5,3 2,9 -3,8 M112,356 c6,-4 6,-12 0,-14 c-5,-1 -7,5 -3,7" fill="none" stroke={gold} strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
  return (
    <svg viewBox="50 58 300 400" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <Defs id={id} />

      {/* Lambrequins */}
      {mantle}
      <g transform="matrix(-1 0 0 1 400 0)">{mantle}</g>

      {/* Couronne à cinq fleurons, le central en bec de plume */}
      <g stroke={INK} strokeWidth="1.4" strokeLinejoin="round">
        <path d="M144,104 L150,88 L156,104 Z M244,104 L250,88 L256,104 Z" fill={gold} />
        <path d="M163,104 L170,80 L177,104 Z M223,104 L230,80 L237,104 Z" fill={gold} />
        <circle cx="150" cy="86" r="3" fill={gold} />
        <circle cx="250" cy="86" r="3" fill={gold} />
        <circle cx="170" cy="77" r="4" fill={gold} />
        <circle cx="230" cy="77" r="4" fill={gold} />
        <path d="M191,104 C191,92 195,80 200,66 C205,80 209,92 209,104 Z" fill={gold} />
        <path d="M200,72 V93" fill="none" strokeWidth="1.1" />
        <circle cx="200" cy="95" r="2" fill={INK} stroke="none" />
        <path d="M138,104 H262 L257,120 H143 Z" fill={gold} />
        <path d="M141,108 H259" fill="none" strokeWidth="0.8" />
      </g>
      {[160, 180, 200, 220, 240].map((x, i) => (
        <circle key={x} cx={x} cy="113" r={i % 2 ? 2.4 : 3.2} fill={i % 2 ? "#e9ddc8" : "#7a3540"} stroke={INK} strokeWidth="0.9" />
      ))}

      {/* Écu */}
      <Shield id={id} />

      {/* Listel et devise */}
      <path d="M93,398 L68,393 L80,412 L67,431 L97,426 Z" fill="#9c7a45" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M307,398 L332,393 L320,412 L333,431 L303,426 Z" fill="#9c7a45" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M90,396 Q200,428 310,396 L306,426 Q200,458 94,426 Z" fill={gold} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path id={`${id}-motto`} d="M96,413 Q200,444 304,413" fill="none" />
      <text fill="#4a1a20" fontSize="11.2" letterSpacing="0.9" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontWeight: 600 }}>
        <textPath href={`#${id}-motto`} startOffset="50%" textAnchor="middle">
          VERBA VOLANT · SCRIPTA MANENT
        </textPath>
      </text>
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-[family-name:var(--font-display)] tracking-[0.34em] ${className}`}>SCRYPTORIUM</span>;
}
