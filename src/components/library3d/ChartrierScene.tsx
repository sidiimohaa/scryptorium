"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are mutated imperatively inside useFrame, as R3F intends. */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor, Sparkles, useCursor } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useParisDaylight, type Daylight } from "@/lib/daylight";
import { DayNightGlass, SkyTone, lerp, mix } from "./DayNight";
import { Candelabra, Candle } from "./LibraryScene";
import { flagstoneTexture, limestoneTexture, resolveFonts, woodTexture, type Fonts } from "./textures";

/**
 * Le chartrier : la salle forte où l'abbaye garde ses registres. Petite pièce voûtée de pierre ;
 * au fond, l'armoire à casiers où chaque rayonnage a sa colonne et un rouleau scellé par livre lu ;
 * au centre, le grand registre des annales ouvert sur la table ; à droite, le rouleau de la
 * chronologie pendu au mur ; à gauche, les coffres bardés de fer sous une étroite fenêtre.
 * Tous les chiffres viennent des fiches publiées : rien n'est estimé.
 */

export type ChartrierData = {
  finished: number;
  reading: number;
  pages: string; // déjà formaté (« — » si aucune page connue)
  rating: string; // déjà formaté (« — » si aucune note)
  byAuthor: [string, number][];
  byShelf: [string, number][];
  timeline: { date: string; title: string; author: string }[];
};
export type ChartrierFocus = "overview" | "register" | "casiers" | "roll";

type Props = {
  data: ChartrierData;
  focus: ChartrierFocus;
  onFocus: (f: ChartrierFocus) => void;
  lowPower: boolean;
  onDecline: () => void;
  onReady?: () => void;
};

const ROOM = { half: 3.2, z0: -4.5, z1: 4, spring: 2.5, rise: 1.5 };
const TOP = 0.86;
const INK = "#2a1a10";
const RUBRIC = "#8e2b1e";

export default function ChartrierScene(props: Props) {
  const { lowPower } = props;
  return (
    <Canvas
      dpr={lowPower ? 1 : [1, 1.75]}
      gl={{ antialias: !lowPower, powerPreference: "high-performance" }}
      camera={{ fov: 52, near: 0.05, far: 40, position: [0, 2.2, -4.2] }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.2;
        scene.background = new THREE.Color("#0b0908");
        scene.fog = new THREE.Fog("#0b0908", 8, 18);
      }}
    >
      <PerformanceMonitor onDecline={props.onDecline} />
      <Chartrier {...props} />
    </Canvas>
  );
}

function Chartrier({ data, focus, onFocus, lowPower, onReady }: Props) {
  const fonts = useMemo(() => resolveFonts(), []);
  const dl = useParisDaylight();
  const ready = useRef(false);
  useFrame(() => {
    if (!ready.current) {
      ready.current = true;
      onReady?.();
    }
  });
  return (
    <>
      <SkyTone daylight={dl} day="#1a1410" night="#0a0807" />
      <CameraRig focus={focus} />
      <Lights daylight={dl} lowPower={lowPower} />
      <Vault daylight={dl} />
      <Casiers shelves={data.byShelf} fonts={fonts} onClick={() => onFocus("casiers")} />
      <group position={[0, 0, 0.6]}>
        <Table />
        <Register data={data} fonts={fonts} onClick={() => onFocus("register")} />
        <group position={[0.78, TOP, -0.12]} rotation={[0, -0.4, 0]}>
          <Candelabra />
        </group>
        <group position={[-0.8, TOP, 0.2]}>
          <Inkhorn />
        </group>
      </group>
      <Rotulus timeline={data.timeline} fonts={fonts} onClick={() => onFocus("roll")} />
      <group position={[-ROOM.half + 0.45, 0, 1.6]} rotation={[0, Math.PI / 2, 0]}>
        <Chest />
      </group>
      <group position={[-ROOM.half + 0.45, 0, -0.4]} rotation={[0, Math.PI / 2, 0]} scale={0.85}>
        <Chest />
      </group>
      {!lowPower && <Sparkles count={50} scale={[5, 2.5, 6]} position={[0, 1.6, 0.5]} size={1.5} speed={0.08} opacity={0.35} color="#f3d9a6" noise={0.5} />}
    </>
  );
}

/* ─── Caméra : vue d'ensemble depuis la porte, ou approche du registre, des casiers, du rouleau ─── */

const SHOTS: Record<ChartrierFocus, { pos: [number, number, number]; look: [number, number, number]; narrowPos?: [number, number, number] }> = {
  overview: { pos: [0.9, 2.15, -3.9], look: [-0.5, 1.25, 1.6], narrowPos: [0.2, 2.4, -4.3] },
  register: { pos: [0.0, 1.62, 0.05], look: [-0.12, TOP, 0.8] },
  casiers: { pos: [-0.9, 2.0, -0.9], look: [-1.25, 1.1, ROOM.z1] },
  roll: { pos: [0.6, 1.75, 0.8], look: [ROOM.half, 1.55, 1.3] },
};

function CameraRig({ focus }: { focus: ChartrierFocus }) {
  const { camera, pointer, size } = useThree();
  const look = useRef(new THREE.Vector3(0, 1.3, 1.5));
  const pos = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  useLayoutEffect(() => {
    camera.position.set(0, 2.2, -4.2);
    camera.lookAt(look.current);
  }, [camera]);
  useFrame((_, dt) => {
    const narrow = size.width < 768;
    const s = SHOTS[focus];
    pos.set(...(narrow && s.narrowPos ? s.narrowPos : s.pos));
    target.set(...s.look);
    const parallax = focus === "overview" ? 0.18 : 0.04;
    const lambda = 1.6;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pos.x + pointer.x * parallax, lambda, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, pos.y + pointer.y * parallax * 0.4, lambda, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, pos.z, lambda, dt);
    look.current.x = THREE.MathUtils.damp(look.current.x, target.x, lambda * 1.2, dt);
    look.current.y = THREE.MathUtils.damp(look.current.y, target.y, lambda * 1.2, dt);
    look.current.z = THREE.MathUtils.damp(look.current.z, target.z, lambda * 1.2, dt);
    camera.lookAt(look.current);
  });
  return null;
}

/* ─── Lumière : chandelier de la table, lanterne, jour ou lune par la fenêtre ─── */

function Lights({ daylight: d, lowPower }: { daylight: Daylight; lowPower: boolean }) {
  const candle = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (candle.current) candle.current.intensity = 5 * (1 + Math.sin(t * 9.7) * 0.07 + Math.sin(t * 23.3) * 0.05 + Math.sin(t * 3.1) * 0.04);
  });
  return (
    <>
      <ambientLight color="#ffd6a8" intensity={lerp(0.14, 0.3, d.sun)} />
      <hemisphereLight args={[mix("#3a4560", "#eadcbe", d.sun), "#2a1a10", lerp(0.25, 0.7, d.sun)]} />
      {/* par l'étroite fenêtre du mur gauche */}
      <directionalLight color={mix("#8fa6d6", "#ffe6bf", d.sun).lerp(new THREE.Color("#ffad66"), d.warm * 0.6)} intensity={lerp(0.35, 1.6, d.sun)} position={[-6, 4, 0.5]} />
      <pointLight ref={candle} color="#ff9e4a" position={[0.78, TOP + 0.6, 0.5]} distance={6} decay={1.5} />
      {/* lanterne pendue près des casiers */}
      <pointLight color="#ffb366" intensity={2.6} position={[0, 2.3, 2.9]} distance={4.5} decay={1.6} />
      {!lowPower && <pointLight color="#ffb366" intensity={1.8} position={[2.4, 2, 1.3]} distance={3.5} decay={1.6} />}
    </>
  );
}

/* ─── Salle : dallage, murs et voûte en berceau de pierre, arcs, fenêtre, lanterne ─── */

function Vault({ daylight }: { daylight: Daylight }) {
  const len = ROOM.z1 - ROOM.z0;
  const midZ = (ROOM.z0 + ROOM.z1) / 2;
  const tex = useMemo(
    () => ({
      floor: flagstoneTexture(41, [3.2, 4.2]),
      wall: limestoneTexture(43, [len / 2.2, ROOM.spring / 2.2]),
      end: limestoneTexture(47, [(ROOM.half * 2) / 2.2, (ROOM.spring + ROOM.rise) / 2.2]),
      vault: limestoneTexture(53, [(Math.PI * ROOM.half) / 2.2, len / 2.2]),
    }),
    [len],
  );
  const vault = useMemo(() => {
    const g = new THREE.CylinderGeometry(ROOM.half, ROOM.half, len, 40, 1, true, Math.PI / 2, Math.PI);
    g.rotateX(Math.PI / 2);
    return g;
  }, [len]);
  const gable = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-ROOM.half, 0);
    s.lineTo(ROOM.half, 0);
    s.lineTo(ROOM.half, ROOM.spring);
    for (let k = 1; k <= 24; k++) {
      const a = (k / 24) * Math.PI;
      s.lineTo(Math.cos(a) * ROOM.half, ROOM.spring + Math.sin(a) * ROOM.rise);
    }
    s.lineTo(-ROOM.half, 0);
    return new THREE.ShapeGeometry(s, 1);
  }, []);
  const archZ = [-2.2, 0.6, 3.2];
  const stone = { color: "#cbb895", roughness: 0.9 } as const;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, midZ]}>
        <planeGeometry args={[ROOM.half * 2, len]} />
        <meshStandardMaterial map={tex.floor} color="#b8a88e" roughness={0.85} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * ROOM.half, ROOM.spring / 2, midZ]} rotation={[0, -s * (Math.PI / 2), 0]}>
          <planeGeometry args={[len, ROOM.spring]} />
          <meshStandardMaterial map={tex.wall} color="#d9c7a5" roughness={0.92} />
        </mesh>
      ))}
      <mesh geometry={gable} position={[0, 0, ROOM.z1]} rotation={[0, Math.PI, 0]}>
        <meshStandardMaterial map={tex.end} color="#d9c7a5" roughness={0.92} />
      </mesh>
      <mesh geometry={gable} position={[0, 0, ROOM.z0]}>
        <meshStandardMaterial map={tex.end} color="#d9c7a5" roughness={0.92} />
      </mesh>
      <mesh geometry={vault} position={[0, ROOM.spring, midZ]} scale={[1, ROOM.rise / ROOM.half, 1]}>
        <meshStandardMaterial map={tex.vault} color="#cdb994" side={THREE.BackSide} roughness={0.95} />
      </mesh>
      {/* arcs doubleaux posés sur des piliers engagés */}
      {archZ.map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, ROOM.spring, 0]} scale={[1, ROOM.rise / ROOM.half, 1]}>
            <torusGeometry args={[ROOM.half - 0.1, 0.12, 4, 32, Math.PI]} />
            <meshStandardMaterial {...stone} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (ROOM.half - 0.1), ROOM.spring / 2, 0]}>
              <boxGeometry args={[0.24, ROOM.spring, 0.32]} />
              <meshStandardMaterial {...stone} />
            </mesh>
          ))}
        </group>
      ))}
      {/* étroite fenêtre à barreaux, mur gauche */}
      <group position={[-ROOM.half + 0.02, 1.95, 0.6]} rotation={[0, Math.PI / 2, 0]}>
        <DayNightGlass daylight={daylight} w={0.42} h={0.95} />
        {[-0.1, 0.1].map((x) => (
          <mesh key={x} position={[x, 0, 0.03]}>
            <cylinderGeometry args={[0.012, 0.012, 0.95, 6]} />
            <meshStandardMaterial color="#2b2522" metalness={0.7} roughness={0.45} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.29, -0.02, 0.09]}>
            <boxGeometry args={[0.16, 1.05, 0.2]} />
            <meshStandardMaterial {...stone} />
          </mesh>
        ))}
      </group>
      {/* lanterne de fer pendue à la voûte */}
      <group position={[0, 2.3, 2.9]}>
        <mesh position={[0, 0.85, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 1.5, 4]} />
          <meshStandardMaterial color="#2b2522" metalness={0.7} roughness={0.45} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.1, 0.12, 0.26, 6, 1, true]} />
          <meshStandardMaterial color="#2b2522" metalness={0.6} roughness={0.5} wireframe />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <coneGeometry args={[0.14, 0.12, 6]} />
          <meshStandardMaterial color="#2b2522" metalness={0.7} roughness={0.45} />
        </mesh>
        <group position={[0, -0.12, 0]}>
          <Candle height={0.12} radius={0.025} seed={11} />
        </group>
      </group>
    </group>
  );
}

/* ─── Mobilier ─── */

function Table() {
  const wood = useMemo(() => woodTexture("#4a3020", 59, true), []);
  const mat = <meshStandardMaterial map={wood} color="#8a6446" roughness={0.6} />;
  return (
    <group>
      <mesh position={[0, TOP - 0.035, 0]}>
        <boxGeometry args={[2.1, 0.07, 1.1]} />
        {mat}
      </mesh>
      {[-0.85, 0.85].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, (TOP - 0.07) / 2, 0]}>
            <boxGeometry args={[0.09, TOP - 0.07, 0.6]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.14, 0.1, 0.95]} />
            {mat}
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.7, 0.08, 0.08]} />
        {mat}
      </mesh>
    </group>
  );
}

/** Corne à encre et plume posées près du registre. */
function Inkhorn() {
  return (
    <group>
      <mesh position={[0, 0.03, 0]} rotation={[0, 0, 0.1]}>
        <cylinderGeometry args={[0.03, 0.035, 0.06, 12]} />
        <meshStandardMaterial color="#2a1c14" roughness={0.6} />
      </mesh>
      <mesh position={[0.02, 0.15, 0]} rotation={[0, 0, -0.35]}>
        <cylinderGeometry args={[0.0025, 0.002, 0.24, 5]} />
        <meshStandardMaterial color="#e8e0cc" roughness={0.6} />
      </mesh>
      <mesh position={[0.06, 0.22, 0]} rotation={[0, 0, -0.42]} scale={[0.35, 1, 0.08]}>
        <sphereGeometry args={[0.065, 10, 8]} />
        <meshStandardMaterial color="#f1ebdd" roughness={0.8} />
      </mesh>
    </group>
  );
}

/** Coffre bardé de fer, couvercle bombé, moraillon. */
function Chest() {
  const wood = useMemo(() => woodTexture("#2d1f17", 83, true), []);
  const iron = <meshStandardMaterial color="#2b2522" metalness={0.7} roughness={0.45} />;
  return (
    <group>
      <mesh position={[0, 0.27, 0]}>
        <boxGeometry args={[1.1, 0.54, 0.55]} />
        <meshStandardMaterial map={wood} color="#6a4630" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.54, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.275, 0.275, 1.1, 18, 1, false, 0, Math.PI]} />
        <meshStandardMaterial map={wood} color="#6a4630" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      {[-0.42, 0, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.4, 0]}>
          <boxGeometry args={[0.05, 0.82, 0.57]} />
          {iron}
        </mesh>
      ))}
      <mesh position={[0, 0.46, -0.285]}>
        <boxGeometry args={[0.1, 0.14, 0.02]} />
        {iron}
      </mesh>
    </group>
  );
}

/* ─── Textures écrites : registre, étiquettes, rouleau ─── */

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function parchment(g: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  g.fillStyle = "#efe2c2";
  g.fillRect(0, 0, w, h);
  let s = seed;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let k = 0; k < 120; k++) {
    g.fillStyle = `rgba(${r() < 0.5 ? "150,115,70" : "255,248,230"},${0.03 + r() * 0.05})`;
    g.beginPath();
    g.arc(r() * w, r() * h, 6 + r() * 40, 0, Math.PI * 2);
    g.fill();
  }
  const edge = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(1, "rgba(110,80,40,0.35)");
  g.fillStyle = edge;
  g.fillRect(0, 0, w, h);
}

function fit(g: CanvasRenderingContext2D, text: string, maxW: number) {
  if (g.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && g.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

/** Les deux pages du registre : à gauche les annales chiffrées, à droite les auteurs les plus lus. */
function registerTextures(data: ChartrierData, fonts: Fonts) {
  const W = 512;
  const H = 680;
  const left = canvasTex(W, H, (g) => {
    parchment(g, W, H, 7);
    g.textAlign = "center";
    g.fillStyle = RUBRIC;
    g.font = `600 40px ${fonts.display}`;
    g.fillText("Annales", W / 2, 84);
    g.font = `italic 22px ${fonts.serif}`;
    g.fillStyle = INK;
    g.fillText("du bibliothécaire", W / 2, 116);
    const rows: [string, string][] = [
      ["Livres lus", String(data.finished)],
      ["En cours", String(data.reading)],
      ["Pages lues", data.pages],
      ["Note moyenne", data.rating],
    ];
    rows.forEach(([k, v], i) => {
      const y = 200 + i * 112;
      g.font = `600 22px ${fonts.display}`;
      g.fillStyle = RUBRIC;
      g.fillText(k.toUpperCase(), W / 2, y);
      g.font = `600 58px ${fonts.display}`;
      g.fillStyle = INK;
      g.fillText(v, W / 2, y + 56);
    });
  });
  const right = canvasTex(W, H, (g) => {
    parchment(g, W, H, 11);
    g.fillStyle = RUBRIC;
    g.textAlign = "center";
    g.font = `600 34px ${fonts.display}`;
    g.fillText("Les auteurs", W / 2, 84);
    g.font = `italic 22px ${fonts.serif}`;
    g.fillStyle = INK;
    g.fillText("les plus fréquentés", W / 2, 116);
    const rows = data.byAuthor.slice(0, 9);
    if (!rows.length) {
      g.font = `italic 24px ${fonts.serif}`;
      g.fillText("Rien à consigner encore.", W / 2, 240);
    }
    rows.forEach(([name, n], i) => {
      const y = 186 + i * 52;
      g.textAlign = "left";
      g.font = `26px ${fonts.serif}`;
      g.fillStyle = INK;
      g.fillText(fit(g, name, 360), 56, y);
      g.textAlign = "right";
      g.font = `600 28px ${fonts.display}`;
      g.fillStyle = RUBRIC;
      g.fillText(String(n), W - 56, y);
      g.strokeStyle = "rgba(60,40,20,0.25)";
      g.beginPath();
      g.moveTo(56, y + 14);
      g.lineTo(W - 56, y + 14);
      g.stroke();
    });
  });
  return { left, right };
}

/** Le grand registre des annales, ouvert sur la table. Cliquable : on s'en approche pour le lire. */
function Register({ data, fonts, onClick }: { data: ChartrierData; fonts: Fonts; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const tex = useMemo(() => registerTextures(data, fonts), [data, fonts]);
  useEffect(() => () => { tex.left.dispose(); tex.right.dispose(); }, [tex]);
  const PW = 0.4;
  const PH = 0.53;
  return (
    <group
      position={[-0.15, TOP, 0.15]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* reliure de cuir et ais de bois */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[PW * 2 + 0.06, 0.04, PH + 0.05]} />
        <meshStandardMaterial color="#4a2618" roughness={0.6} />
      </mesh>
      {/* pages, tête vers le fond de la salle : le registre se lit depuis la porte (−z), où se tient
          le visiteur ; vu de là, la page de gauche est du côté +x */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (PW / 2 + 0.005), 0.05, 0]} rotation={[-Math.PI / 2, 0, Math.PI]}>
          <planeGeometry args={[PW, PH]} />
          <meshStandardMaterial map={s > 0 ? tex.left : tex.right} roughness={0.9} emissive={hovered ? "#3a2a10" : "#000000"} />
        </mesh>
      ))}
      {/* tranches des cahiers */}
      {[-1, 1].map((s) => (
        <mesh key={`e${s}`} position={[s * (PW + 0.005), 0.035, 0]}>
          <boxGeometry args={[0.012, 0.03, PH]} />
          <meshStandardMaterial color="#e6d6b2" roughness={0.9} />
        </mesh>
      ))}
      {/* signet de soie */}
      <mesh position={[0.05, 0.051, PH / 2 + 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.02, 0.12]} />
        <meshStandardMaterial color="#6e1520" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Étiquette de casier : nom du rayonnage et nombre de livres lus. */
function labelTexture(name: string, n: number, fonts: Fonts) {
  return canvasTex(256, 96, (g) => {
    parchment(g, 256, 96, name.length * 7 + n);
    g.textAlign = "center";
    g.fillStyle = INK;
    g.font = `600 22px ${fonts.display}`;
    g.fillText(fit(g, name, 236), 128, 40);
    g.fillStyle = RUBRIC;
    g.font = `600 26px ${fonts.display}`;
    g.fillText(`${n} ${n > 1 ? "livres" : "livre"}`, 128, 76);
  });
}

/**
 * L'armoire à casiers du fond : une colonne par rayonnage, quatre casiers par colonne,
 * un rouleau scellé de cire rouge par livre lu (jusqu'à 16 visibles ; l'étiquette porte le vrai nombre).
 */
function Casiers({ shelves, fonts, onClick }: { shelves: [string, number][]; fonts: Fonts; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const wood = useMemo(() => woodTexture("#2d1f17", 61), []);
  const cols = Math.max(1, Math.min(8, shelves.length));
  const list = shelves.slice(0, cols);
  const cw = Math.min(0.72, 5.2 / cols);
  const W = cw * cols;
  const rows = 4;
  const rh = 0.42;
  const base = 0.35;
  const labels = useMemo(() => list.map(([n, c]) => labelTexture(n, c, fonts)), [list, fonts]);
  useEffect(() => () => labels.forEach((t) => t.dispose()), [labels]);
  const rolls = useMemo(() => {
    const out: { x: number; y: number; r: number; seal: boolean }[] = [];
    list.forEach(([, n], ci) => {
      const shown = Math.min(n, 16);
      for (let k = 0; k < shown; k++) {
        const cell = Math.floor(k / 4);
        const inCell = k % 4;
        const x = -W / 2 + cw * (ci + 0.5) + (inCell % 2 === 0 ? -1 : 1) * cw * 0.17;
        const y = base + (rows - 1 - cell) * rh + 0.06 + (inCell >= 2 ? 0.1 : 0);
        out.push({ x, y, r: 0.045 + ((k * 7 + ci) % 3) * 0.006, seal: (k + ci) % 2 === 0 });
      }
    });
    return out;
  }, [list, W, cw]);
  const mat = <meshStandardMaterial map={wood} color="#5a3c28" roughness={0.65} />;
  return (
    <group
      position={[0, 0, ROOM.z1 - 0.3]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* fond, montants, tablettes, socle et corniche */}
      <mesh position={[0, base + (rows * rh) / 2, 0.2]}>
        <boxGeometry args={[W + 0.1, rows * rh + 0.05, 0.03]} />
        {mat}
      </mesh>
      {Array.from({ length: cols + 1 }, (_, i) => (
        <mesh key={`v${i}`} position={[-W / 2 + i * cw, base + (rows * rh) / 2, 0]}>
          <boxGeometry args={[0.035, rows * rh + 0.05, 0.42]} />
          {mat}
        </mesh>
      ))}
      {Array.from({ length: rows + 1 }, (_, j) => (
        <mesh key={`h${j}`} position={[0, base + j * rh, 0]}>
          <boxGeometry args={[W + 0.04, 0.03, 0.42]} />
          {mat}
        </mesh>
      ))}
      <mesh position={[0, base / 2, 0]}>
        <boxGeometry args={[W + 0.12, base, 0.46]} />
        {mat}
      </mesh>
      <mesh position={[0, base + rows * rh + 0.06, 0.02]}>
        <boxGeometry args={[W + 0.2, 0.1, 0.5]} />
        {mat}
      </mesh>
      {/* étiquettes de parchemin sur le socle */}
      {list.map(([name], i) => (
        <mesh key={name} position={[-W / 2 + cw * (i + 0.5), base / 2 + 0.02, -0.235]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[cw * 0.86, cw * 0.86 * (96 / 256)]} />
          <meshStandardMaterial map={labels[i]} roughness={0.9} emissive={hovered ? "#3a2a10" : "#000000"} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* rouleaux couchés, bout vers la salle, scellés de cire */}
      {rolls.map((r, i) => (
        <group key={i} position={[r.x, r.y + r.r, -0.02]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[r.r, r.r, 0.36, 12]} />
            <meshStandardMaterial color={i % 3 === 0 ? "#d9c49a" : "#e6d5b0"} roughness={0.85} />
          </mesh>
          {r.seal && (
            <mesh position={[0, -r.r * 0.6, -0.19]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.022, 0.022, 0.01, 12]} />
              <meshStandardMaterial color="#8e1b16" roughness={0.45} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/** Le rouleau de la chronologie, pendu au mur droit : une ligne par lecture datée. */
function rollTexture(timeline: ChartrierData["timeline"], fonts: Fonts) {
  const W = 360;
  const H = 1024;
  return canvasTex(W, H, (g) => {
    parchment(g, W, H, 23);
    g.textAlign = "center";
    g.fillStyle = RUBRIC;
    g.font = `600 30px ${fonts.display}`;
    g.fillText("Chronologie", W / 2, 70);
    g.fillStyle = INK;
    g.font = `italic 19px ${fonts.serif}`;
    g.fillText("histoire d'un lecteur", W / 2, 98);
    if (!timeline.length) {
      g.font = `italic 22px ${fonts.serif}`;
      ["La chronologie", "commencera avec", "la première lecture", "datée."].forEach((l, i) => g.fillText(l, W / 2, 200 + i * 32));
      return;
    }
    const rows = timeline.slice(-14);
    rows.forEach((b, i) => {
      const y = 160 + i * 60;
      g.textAlign = "left";
      g.fillStyle = RUBRIC;
      g.font = `600 16px ${fonts.display}`;
      g.fillText(b.date.toUpperCase(), 34, y);
      g.fillStyle = INK;
      g.font = `21px ${fonts.serif}`;
      g.fillText(fit(g, b.title, W - 68), 34, y + 24);
    });
  });
}

function Rotulus({ timeline, fonts, onClick }: { timeline: ChartrierData["timeline"]; fonts: Fonts; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const tex = useMemo(() => rollTexture(timeline, fonts), [timeline, fonts]);
  useEffect(() => () => tex.dispose(), [tex]);
  const W = 0.62;
  const H = 1.75;
  return (
    <group
      position={[ROOM.half - 0.06, 0.55 + H / 2, 1.3]}
      rotation={[0, -Math.PI / 2, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial map={tex} roughness={0.9} emissive={hovered ? "#3a2a10" : "#000000"} side={THREE.DoubleSide} />
      </mesh>
      {/* bâtons du rouleau, en haut et en bas, et cordelette */}
      {[H / 2 + 0.03, -H / 2 - 0.03].map((y) => (
        <group key={y} position={[0, y, 0.02]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, W + 0.06, 12]} />
            <meshStandardMaterial color="#e1cfa6" roughness={0.85} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (W / 2 + 0.06), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.022, 0.022, 0.08, 10]} />
              <meshStandardMaterial color="#5a3820" roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, H / 2 + 0.2, 0.02]}>
        <cylinderGeometry args={[0.004, 0.004, 0.32, 4]} />
        <meshStandardMaterial color="#b9a27a" roughness={0.9} />
      </mesh>
    </group>
  );
}
