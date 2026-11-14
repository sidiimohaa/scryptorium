"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Plan de l'abbaye, à la manière des plans de monastère médiévaux (plan de Saint-Gall) :
 * parchemin, encre, rubriques et dorures, bâtiments vus du dessus.
 * Les salles du site sont des lieux cliquables (liens HTML posés sur le dessin, pour le clavier
 * et les lecteurs d'écran) ; les autres bâtiments sont du décor, nommés en latin.
 * Repère du dessin : viewBox 1000 × 720.
 */

type Room = {
  id: string;
  name: string;
  latin: string;
  status: "open" | "soon";
  href?: string;
  description: string;
  box: { x: number; y: number; w: number; h: number };
  lines: string[];
};

const ROOMS: Room[] = [
  {
    id: "bibliotheque",
    name: "La Bibliothèque",
    latin: "Bibliotheca",
    status: "open",
    href: "/bibliotheque",
    description: "La salle des rayonnages : on y parcourt les livres, on les sort des étagères, et le copiste y recommande une lecture.",
    box: { x: 760, y: 92, w: 140, h: 68 },
    lines: ["BIBLIOTHÈQUE"],
  },
  {
    id: "scriptorium",
    name: "Le Scriptorium",
    latin: "Scriptorium",
    status: "open",
    href: "/scriptorium",
    description: "La lecture en cours du bibliothécaire, posée sur son pupitre : où il en est, et les notes qu'il écrit au fil des pages.",
    box: { x: 760, y: 160, w: 140, h: 68 },
    lines: ["SCRIPTORIUM"],
  },
  {
    id: "capitulaire",
    name: "La Salle capitulaire",
    latin: "Capitulum",
    status: "soon",
    description: "Le club de lecture : le livre du mois, les dates de séance, les propositions et les votes des membres.",
    box: { x: 580, y: 242, w: 100, h: 148 },
    lines: ["SALLE", "CAPITULAIRE"],
  },
  {
    id: "refectoire",
    name: "Le Réfectoire",
    latin: "Refectorium",
    status: "open",
    href: "/refectoire",
    description: "Le salon des lecteurs : chacun y parle de ses lectures, avec un compte, sous l'œil du bibliothécaire.",
    box: { x: 340, y: 446, w: 230, h: 78 },
    lines: ["RÉFECTOIRE"],
  },
];

const INK = "#3a2416";
const SEPIA = "#6b4a2e";
const GOLD = "#a98135";
const RUBRIC = "#8e2b1e";
const VELLUM = "#f2e5c6";

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

export function AbbeyPlan() {
  const [active, setActive] = useState<string | null>(null);
  const current = ROOMS.find((r) => r.id === active) ?? null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="relative w-full shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)]" style={{ aspectRatio: "1000 / 720" }}>
        <PlanDrawing active={active} />
        {ROOMS.map((r) => {
          const style = {
            left: pct(r.box.x, 1000),
            top: pct(r.box.y, 720),
            width: pct(r.box.w, 1000),
            height: pct(r.box.h, 720),
          };
          const common = {
            style,
            className: "absolute rounded-[2px] outline-offset-2 focus-visible:outline-2 focus-visible:outline-gold",
            onMouseEnter: () => setActive(r.id),
            onMouseLeave: () => setActive((a) => (a === r.id ? null : a)),
            onFocus: () => setActive(r.id),
            "aria-label": `${r.name}${r.status === "soon" ? " (en construction)" : ""}`,
          };
          return r.status === "open" && r.href ? (
            <Link key={r.id} href={r.href} {...common} />
          ) : (
            <button key={r.id} type="button" {...common} onClick={() => setActive(r.id)} />
          );
        })}
      </div>

      <aside aria-live="polite" className="border border-line bg-ink-2/80 p-7">
        {current ? (
          <>
            <p className="eyebrow">{current.latin}</p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-cream">{current.name}</h2>
            <p className="mt-4 font-[family-name:var(--font-serif)] text-lg leading-relaxed text-parchment/85">{current.description}</p>
            {current.status === "open" && current.href ? (
              <Link href={current.href} className="btn mt-6">Entrer</Link>
            ) : (
              <p className="mt-6 text-xs uppercase tracking-[0.2em] text-muted">En construction · pas encore ouverte</p>
            )}
          </>
        ) : (
          <>
            <p className="eyebrow">Légende</p>
            <p className="mt-3 font-[family-name:var(--font-serif)] text-lg leading-relaxed text-parchment/85">
              Survolez une salle du plan pour la découvrir. Les salles dorées sont ouvertes ; les autres sont en construction.
            </p>
          </>
        )}
        <ul className="mt-8 space-y-2 border-t border-line pt-6">
          {ROOMS.map((r) => (
            <li key={r.id}>
              {r.status === "open" && r.href ? (
                <Link href={r.href} onMouseEnter={() => setActive(r.id)} onFocus={() => setActive(r.id)} className="link-gilt flex items-baseline justify-between gap-3 text-parchment">
                  <span className="font-[family-name:var(--font-display)] text-xl">{r.name}</span>
                  <span className="text-[0.65rem] uppercase tracking-[0.2em] text-gold">Ouverte</span>
                </Link>
              ) : (
                <button type="button" onClick={() => setActive(r.id)} onMouseEnter={() => setActive(r.id)} onFocus={() => setActive(r.id)} className="flex w-full items-baseline justify-between gap-3 text-left text-parchment/70">
                  <span className="font-[family-name:var(--font-display)] text-xl">{r.name}</span>
                  <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted">Bientôt</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

/* ---------- Dessin ---------- */

function Label({ x, y, children, size = 11, color = INK, spacing = 2.2, anchor = "middle" as const, italic = false }: {
  x: number; y: number; children: React.ReactNode; size?: number; color?: string; spacing?: number; anchor?: "middle" | "start" | "end"; italic?: boolean;
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} fill={color} fontSize={size} letterSpacing={spacing} fontStyle={italic ? "italic" : undefined}
      className="font-[family-name:var(--font-display)]" style={{ fontWeight: 600 }}>
      {children}
    </text>
  );
}

function Decor({ x, y, w, h, label, vertical = false }: { x: number; y: number; w: number; h: number; label?: string; vertical?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="url(#hatch)" stroke={INK} strokeWidth={1.4} />
      {label && (
        <g transform={vertical ? `rotate(-90 ${x + w / 2} ${y + h / 2})` : undefined}>
          <rect x={x + w / 2 - label.length * 4.6} y={y + h / 2 - 9} width={label.length * 9.2} height={14} fill={VELLUM} opacity={0.92} />
          <Label x={x + w / 2} y={y + h / 2 + 2} size={9.5} color={SEPIA} spacing={2}>{label}</Label>
        </g>
      )}
    </g>
  );
}

function RoomShape({ room, active }: { room: Room; active: boolean }) {
  const { x, y, w, h } = room.box;
  const open = room.status === "open";
  const lineH = 13;
  const top = y + h / 2 - ((room.lines.length - 1) * lineH) / 2 + 4;
  return (
    <g style={{ transition: "opacity 300ms" }}>
      <rect x={x} y={y} width={w} height={h} fill={active ? "url(#goldwash)" : open ? "#f6e6bb" : VELLUM} stroke={INK} strokeWidth={1.8}
        style={{ transition: "fill 300ms" }} />
      <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} fill="none" stroke={open || active ? GOLD : SEPIA} strokeWidth={open || active ? 1.4 : 0.7}
        strokeDasharray={open || active ? undefined : "3 3"} />
      {active && <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} fill="none" stroke={GOLD} strokeWidth={2} filter="url(#glow)" />}
      {room.lines.map((l, i) => (
        <Label key={l} x={x + w / 2} y={top + i * lineH} size={room.lines.length > 1 ? 9.5 : 11.5} spacing={room.lines.length > 1 ? 1.2 : 2.2} color={open ? RUBRIC : INK}>{l}</Label>
      ))}
      <Label x={x + w / 2} y={top + room.lines.length * lineH + 1} size={8} color={SEPIA} spacing={1.2} italic>
        {open ? "ouverte" : "à venir"}
      </Label>
    </g>
  );
}

function PlanDrawing({ active }: { active: string | null }) {
  const naveColumns = Array.from({ length: 9 }, (_, i) => 290 + i * 36);
  const cloisterCols: [number, number][] = [];
  for (let i = 0; i <= 10; i++) {
    const t = 366 + i * 17.8;
    cloisterCols.push([t, 231], [t, 409]);
    if (i > 0 && i < 10) cloisterCols.push([366, 231 + i * 17.8], [544, 231 + i * 17.8]);
  }
  const trees: [number, number][] = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) trees.push([100 + c * 45 + (r % 2) * 20, 310 + r * 48]);

  return (
    <svg viewBox="0 0 1000 720" className="absolute inset-0 h-full w-full" role="img" aria-label="Plan de l'abbaye de SCRYPTORIUM : église, cloître, bibliothèque, scriptorium, salle capitulaire, réfectoire, cellier, cuisine, jardin des simples et verger">
      <defs>
        <radialGradient id="vellum" cx="50%" cy="45%" r="75%">
          <stop offset="0" stopColor="#f1e3c0" />
          <stop offset="0.7" stopColor="#e3cd9f" />
          <stop offset="1" stopColor="#bf9f6a" />
        </radialGradient>
        <linearGradient id="goldwash" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6dc94" />
          <stop offset="1" stopColor="#d9ae55" />
        </linearGradient>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#ead8b0" />
          <line x1="0" y1="0" x2="0" y2="6" stroke={SEPIA} strokeWidth="0.9" opacity="0.45" />
        </pattern>
        <pattern id="grass" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#d9d3a1" />
          <path d="M2 6 l1 -2 l1 2 M6 3 l1 -2 l1 2" stroke="#7d7a43" strokeWidth="0.6" fill="none" opacity="0.6" />
        </pattern>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.12  0 0 0 0.16 0" />
        </filter>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* parchemin */}
      <rect width="1000" height="720" fill="url(#vellum)" />
      <rect width="1000" height="720" filter="url(#grain)" />
      <rect x="16" y="16" width="968" height="688" fill="none" stroke={GOLD} strokeWidth="2.5" />
      <rect x="24" y="24" width="952" height="672" fill="none" stroke={RUBRIC} strokeWidth="1" />
      {[[24, 24], [976, 24], [24, 696], [976, 696]].map(([cx, cy]) => (
        <g key={`${cx}${cy}`}>
          <circle cx={cx} cy={cy} r="9" fill={RUBRIC} stroke={GOLD} strokeWidth="2" />
          <circle cx={cx} cy={cy} r="3" fill={GOLD} />
        </g>
      ))}

      {/* titre */}
      <Label x={500} y={56} size={22} color={RUBRIC} spacing={7}>PLAN DE L&apos;ABBAYE</Label>
      <Label x={500} y={74} size={11} color={SEPIA} spacing={2} italic>abbatia Scryptorii, ad usum lectorum</Label>

      {/* enceinte */}
      <rect x="50" y="88" width="900" height="500" rx="18" fill="none" stroke={INK} strokeWidth="1.2" strokeDasharray="10 4 2 4" />

      {/* porte et chemin vers l'église */}
      <Decor x={110} y={140} w={56} h={40} label="PORTA" />
      <path d="M166 160 L232 160" stroke={SEPIA} strokeWidth="1.2" strokeDasharray="4 4" />

      {/* église : nef, tours, transept, chœur, abside */}
      <g>
        <circle cx="250" cy="126" r="17" fill="url(#hatch)" stroke={INK} strokeWidth="1.6" />
        <circle cx="250" cy="194" r="17" fill="url(#hatch)" stroke={INK} strokeWidth="1.6" />
        <rect x="250" y="125" width="350" height="70" fill={VELLUM} stroke={INK} strokeWidth="1.8" />
        <rect x="600" y="86" width="70" height="148" fill={VELLUM} stroke={INK} strokeWidth="1.8" />
        <rect x="670" y="125" width="40" height="70" fill={VELLUM} stroke={INK} strokeWidth="1.8" />
        <path d="M710 125 A35 35 0 0 1 710 195 Z" fill={VELLUM} stroke={INK} strokeWidth="1.8" />
        {naveColumns.map((x) => (
          <g key={x}>
            <circle cx={x} cy={143} r="2.6" fill={INK} />
            <circle cx={x} cy={177} r="2.6" fill={INK} />
          </g>
        ))}
        <path d="M715 154 v12 M709 160 h12" stroke={RUBRIC} strokeWidth="2" />
        <Label x={430} y={164} size={12} spacing={5}>ECCLESIA</Label>
        {/* passage vers la bibliothèque */}
        <rect x="744" y="150" width="16" height="20" fill="url(#hatch)" stroke={INK} strokeWidth="1.2" />
      </g>

      {/* cloître : galeries, colonnes, préau, puits */}
      <g>
        <rect x="340" y="205" width="230" height="230" fill={VELLUM} stroke={INK} strokeWidth="1.8" />
        <rect x="366" y="231" width="178" height="178" fill="url(#grass)" stroke={INK} strokeWidth="1.2" />
        <path d="M455 231 V409 M366 320 H544" stroke={SEPIA} strokeWidth="5" opacity="0.35" />
        {cloisterCols.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="2.2" fill={INK} />)}
        <circle cx="455" cy="320" r="11" fill="#b9c7c4" stroke={INK} strokeWidth="1.4" />
        <circle cx="455" cy="320" r="5" fill="#6f8a8a" />
        <Label x={455} y={300} size={9.5} color={SEPIA} spacing={2.5}>CLAVSTRVM</Label>
      </g>

      {/* ailes de service */}
      <Decor x={250} y={215} w={80} h={310} label="CELLARIVM" vertical />
      <Decor x={580} y={392} w={100} h={44} label="PARLATORIVM" />
      <Decor x={580} y={446} w={76} h={78} label="CVLINA" vertical />

      {/* jardin des simples */}
      <g>
        <rect x="728" y="290" width="194" height="214" fill="#e6d7a8" stroke={INK} strokeWidth="1.2" strokeDasharray="6 3" />
        {Array.from({ length: 12 }, (_, i) => {
          const bx = 744 + (i % 3) * 58;
          const by = 304 + Math.floor(i / 3) * 46;
          return (
            <g key={i}>
              <rect x={bx} y={by} width="46" height="32" fill="#cfc28a" stroke={SEPIA} strokeWidth="1" />
              <path d={`M${bx + 8} ${by + 24} q4 -10 8 0 M${bx + 22} ${by + 24} q4 -12 8 0 M${bx + 34} ${by + 22} q3 -8 6 0`} stroke="#5e6a32" strokeWidth="1" fill="none" />
            </g>
          );
        })}
        <Label x={825} y={524} size={10} color={SEPIA} spacing={2.5}>HORTVS SIMPLICIVM</Label>
      </g>

      {/* verger */}
      <g>
        {trees.map(([cx, cy], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r="13" fill="#b9b779" stroke={INK} strokeWidth="1.1" />
            <path d={`M${cx - 5} ${cy} h10 M${cx} ${cy - 5} v10`} stroke={INK} strokeWidth="0.8" />
          </g>
        ))}
        <Label x={145} y={560} size={10} color={SEPIA} spacing={2.5}>POMARIVM</Label>
      </g>

      {/* salles du site */}
      {ROOMS.map((r) => <RoomShape key={r.id} room={r} active={active === r.id} />)}

      {/* rose des vents */}
      <g transform="translate(880 652)">
        <circle r="30" fill="none" stroke={GOLD} strokeWidth="1.4" />
        <path d="M0 -38 L7 0 L0 38 L-7 0 Z" fill={INK} />
        <path d="M-38 0 L0 -7 L38 0 L0 7 Z" fill={RUBRIC} />
        <circle r="4" fill={GOLD} />
        <Label x={0} y={-44} size={10} color={RUBRIC} spacing={1}>SEPTENTRIO</Label>
      </g>

      {/* échelle */}
      <g transform="translate(80 636)">
        {[0, 1, 2, 3].map((i) => <rect key={i} x={i * 36} y={0} width="36" height="7" fill={i % 2 ? VELLUM : INK} stroke={INK} strokeWidth="1" />)}
        <Label x={72} y={24} size={9.5} color={SEPIA} spacing={2}>CENTVM PEDES</Label>
      </g>
      <Label x={500} y={640} size={11} color={SEPIA} spacing={1.5} italic>« Claustrum sine armario, quasi castrum sine armamentario »</Label>
    </svg>
  );
}
