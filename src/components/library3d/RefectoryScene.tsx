"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are mutated imperatively inside useFrame, as R3F intends. */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor, RoundedBox, Sparkles, useCursor } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Candelabra, Candle, Copyist, Flame, GrandChandelier } from "./LibraryScene";
import {
  limestoneTexture,
  panelTexture,
  placeCardTexture,
  resolveFonts,
  runnerTexture,
  shaftTexture,
  tableclothTexture,
  terracottaTexture,
  woodTexture,
  type Fonts,
} from "./textures";
import type { CopyistNote } from "./types";
import { useParisDaylight, type Daylight } from "@/lib/daylight";
import { DayNightGlass, SkyTone, lerp, mix, shaftTint } from "./DayNight";

/**
 * Le Réfectoire d'apparat : la nef voûtée d'une abbaye, habillée comme les grands appartements
 * d'un château du Second Empire — voûte d'azur étoilée et ogives dorées, colonnes de marbre griotte,
 * lambris et tentures de damas cramoisi, tapisseries, lustres de bronze et cristal, cheminée
 * monumentale, tables nappées et dressées. Chaque couvert est un sujet du forum.
 */

/** Sujet du forum tel que la salle l'affiche : une place à table. */
export type RefectoryPlace = { id: string; title: string; postCount: number; active: boolean };

type Props = {
  places: RefectoryPlace[];
  selected: string | null;
  lectorView: boolean;
  onSelect: (id: string) => void;
  onLector: () => void;
  lector: CopyistNote | null;
  lowPower: boolean;
  onDecline: () => void;
  onReady?: () => void;
};

/* Nef de 9 m de large, quatre travées d'ogives de 4 m (z de −6 à 10). */
const HALL = { half: 4.5, z0: -6, z1: 10, spring: 3.2, rise: 2.7 };
const BAYS = [-6, -2, 2, 6, 10];
const TABLE_X = [-1.5, 1.5];
const TABLE = { z0: 0.4, z1: 8.6, top: 0.76, width: 0.9 };
const SEAT_STEP = 0.78;
const PULPIT = { x: -3.2, z: 4, floor: 1.2 };
const WAINSCOT = 1.15;

/** Places à table : quatre rangées (deux tables, deux côtés), de l'entrée vers le fond. */
function placeSlots() {
  const slots: { x: number; z: number; side: 1 | -1 }[] = [];
  for (let z = TABLE.z0 + 0.45; z < TABLE.z1 - 0.2; z += SEAT_STEP) {
    for (const tx of TABLE_X) {
      for (const side of [-1, 1] as const) slots.push({ x: tx + side * 0.24, z, side });
    }
  }
  return slots;
}
export const SLOTS = placeSlots();

/* Matières partagées, créées une fois. */
let shared: ReturnType<typeof makeMaterials> | null = null;
function makeMaterials() {
  return {
    gold: new THREE.MeshStandardMaterial({ color: "#d9ad52", metalness: 0.92, roughness: 0.24 }),
    goldSoft: new THREE.MeshStandardMaterial({ color: "#c99a45", metalness: 0.8, roughness: 0.35 }),
    velvet: new THREE.MeshPhysicalMaterial({ color: "#6e101c", roughness: 0.82, sheen: 1, sheenColor: new THREE.Color("#ff5a6a"), sheenRoughness: 0.45, side: THREE.DoubleSide }),
    porcelain: new THREE.MeshPhysicalMaterial({ color: "#f8f4ec", roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }),
    crystal: new THREE.MeshPhysicalMaterial({ color: "#eef4ff", roughness: 0.04, metalness: 0, transparent: true, opacity: 0.32, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }),
    silver: new THREE.MeshStandardMaterial({ color: "#d9d9de", metalness: 0.95, roughness: 0.2 }),
    stone: new THREE.MeshStandardMaterial({ color: "#c4b394", roughness: 0.85 }),
  };
}
/** Matières d'apparat partagées (aussi utilisées par la salle capitulaire). */
export const mats = () => (shared ??= makeMaterials());

export default function RefectoryScene(props: Props) {
  const { lowPower } = props;
  return (
    <Canvas
      dpr={lowPower ? 1 : [1, 1.75]}
      gl={{ antialias: !lowPower, powerPreference: "high-performance" }}
      camera={{ fov: 52, near: 0.05, far: 60, position: [0, 2.8, -7] }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.12;
        scene.background = new THREE.Color("#140e0b");
        scene.fog = new THREE.Fog("#140e0b", 13, 28);
      }}
    >
      <PerformanceMonitor onDecline={props.onDecline} />
      <Refectory {...props} />
    </Canvas>
  );
}

function Refectory({ places, selected, lectorView, onSelect, onLector, lector, lowPower, onReady }: Props) {
  const fonts = useMemo(() => resolveFonts(), []);
  const ready = useRef(false);
  const lit = useRef(1);
  const dl = useParisDaylight();
  useFrame(() => {
    // lustres plus discrets en plein jour
    lit.current = lerp(0.3, 0.55, dl.night);
    if (!ready.current) {
      ready.current = true;
      onReady?.();
    }
  });
  const selectedSlot = selected ? places.findIndex((p) => p.id === selected) : -1;
  return (
    <>
      <Reflections intensity={lerp(0.08, 0.32, dl.sun)} />
      <CameraRig slot={selectedSlot >= 0 ? SLOTS[selectedSlot] : null} lector={lectorView} />
      <SkyTone daylight={dl} day="#1e1712" night="#0c0907" />
      <Lights lowPower={lowPower} daylight={dl} />
      <Hall lowPower={lowPower} daylight={dl} />
      <Fireplace />
      {TABLE_X.map((x) => <BanquetTable key={x} x={x} lowPower={lowPower} />)}
      {SLOTS.map((s, i) => (
        <Place key={i} slot={s} place={places[i] ?? null} selected={i === selectedSlot} fonts={fonts} onSelect={onSelect} />
      ))}
      <Pulpit lector={lector} onLector={onLector} />
      {[1.9, 6.6].map((z) => (
        <group key={z} position={[0, 3.55, z]} scale={0.4}>
          <GrandChandelier drop={(HALL.spring + HALL.rise - 3.6) / 0.4} reveal={lit} lowPower={lowPower} />
        </group>
      ))}
      {!lowPower && <Sparkles count={120} scale={[8, 4, 14]} position={[1.5, 2.6, 2]} size={1.6} speed={0.1} opacity={0.4} color="#f6e2b8" noise={0.5} />}
    </>
  );
}

/** Reflets : un environnement de salle neutre (local, sans téléchargement) pour l'or, le cristal et le marbre. */
export function Reflections({ intensity = 0.32 }: { intensity?: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  // L'environnement éclaire aussi la pierre : il suit la lumière du jour quand la salle le demande.
  useEffect(() => {
    scene.environmentIntensity = intensity;
  }, [scene, intensity]);
  return null;
}

/* ─── Caméra : vue d'ensemble depuis l'entrée, approche d'une place, ou de la chaire ─── */

function CameraRig({ slot, lector }: { slot: { x: number; z: number } | null; lector: boolean }) {
  const { camera, pointer, size } = useThree();
  const look = useRef(new THREE.Vector3(0, 1.4, 4));
  const pos = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  useLayoutEffect(() => {
    camera.position.set(0, 2.8, -7);
    camera.lookAt(look.current);
  }, [camera]);
  useFrame((_, dt) => {
    const narrow = size.width < 768;
    let parallax = 0.25;
    if (slot) {
      // Depuis l'allée centrale, un peu au-dessus de la place ; décalé pour laisser le panneau à droite.
      pos.set(narrow ? slot.x * 0.4 : slot.x * 0.35 - 0.35, 1.85, slot.z - 1.25);
      target.set(narrow ? slot.x : slot.x - 0.45, TABLE.top + 0.05, slot.z + 0.35);
      parallax = 0.04;
    } else if (lector) {
      pos.set(-0.9, 3.15, PULPIT.z - 2.1);
      target.set(-3.7, PULPIT.floor + 0.95, PULPIT.z + 0.15);
      parallax = 0.05;
    } else {
      pos.set(narrow ? 0.4 : 0.9, narrow ? 2.9 : 2.6, narrow ? -4.6 : -3.9);
      target.set(narrow ? -0.4 : -0.8, 1.45, 5.6);
    }
    const lambda = 1.5;
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

/* ─── Lumière : soir d'hiver ; dernier jour par les baies, feu, lustres, candélabres, chaire ─── */

function Lights({ lowPower, daylight: d }: { lowPower: boolean; daylight: Daylight }) {
  const fire = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (fire.current) fire.current.intensity = 9 * (1 + Math.sin(t * 8.1) * 0.08 + Math.sin(t * 17.3) * 0.06 + Math.sin(t * 2.7) * 0.05);
  });
  return (
    <>
      {/* jour par les lancettes (doré à l'aube et au soir), lune la nuit ; le feu et les chandelles restent */}
      <ambientLight color="#ffd9b0" intensity={lerp(0.02, 0.3, d.sun)} />
      <hemisphereLight args={[mix("#33405e", "#efdcbc", d.sun), "#1e0f0a", lerp(0.03, 0.75, d.sun)]} />
      <directionalLight color={mix("#8fa6d6", "#fff0d6", d.sun).lerp(new THREE.Color("#ffb070"), d.warm * 0.7)} intensity={lerp(0.25, 3.0, d.sun)} position={[8, 4.5, 3]} />
      <pointLight ref={fire} color="#ff8a3a" position={[0, 0.9, HALL.z1 - 0.9]} distance={11} decay={1.4} />
      <pointLight color="#ffb066" intensity={3.5} position={[PULPIT.x + 0.3, PULPIT.floor + 1.6, PULPIT.z]} distance={4} decay={1.6} />
      {/* lueur sur la façade de la chaire et son escalier */}
      <pointLight color="#ffb877" intensity={3} position={[-1.9, 1.5, PULPIT.z - 1.0]} distance={4.5} decay={1.5} />
      {!lowPower && <pointLight color="#ffd7a0" intensity={1.6} position={[3.6, 3, 4]} distance={7} decay={1.6} />}
    </>
  );
}

/* ─── Architecture ─── */

/* Matières de l'abbaye (pierre, fer, étain), propres au réfectoire. */
let abbeyMats: ReturnType<typeof makeAbbey> | null = null;
function makeAbbey() {
  return {
    stone: new THREE.MeshStandardMaterial({ color: "#cdb995", roughness: 0.9 }),
    carved: new THREE.MeshStandardMaterial({ color: "#d8c5a0", roughness: 0.85 }),
    iron: new THREE.MeshStandardMaterial({ color: "#2b2522", metalness: 0.7, roughness: 0.45 }),
    pewter: new THREE.MeshStandardMaterial({ color: "#a29c90", metalness: 0.75, roughness: 0.35 }),
  };
}
const abbey = () => (abbeyMats ??= makeAbbey());

function Hall({ lowPower, daylight }: { lowPower: boolean; daylight: Daylight }) {
  const len = HALL.z1 - HALL.z0;
  const midZ = (HALL.z0 + HALL.z1) / 2;
  const tex = useMemo(() => {
    const wainscot = panelTexture(7);
    wainscot.repeat.set(len / 1.6, 1);
    const wainscotEnd = panelTexture(11);
    wainscotEnd.repeat.set((HALL.half * 2) / 1.6, 1);
    return {
      floor: terracottaTexture(17, [HALL.half * 2 / 1.6, len / 1.6]),
      wainscot,
      wainscotEnd,
      wall: limestoneTexture(19, [len / 2.5, (HALL.spring - WAINSCOT) / 2.5]),
      wallEnd: limestoneTexture(23, [(HALL.half * 2) / 2.5, (HALL.spring - WAINSCOT) / 2.5]),
      vault: limestoneTexture(29, [(Math.PI * HALL.half) / 2.5, len / 2.5]),
      tympan: limestoneTexture(31, [(HALL.half * 2) / 2.5, HALL.rise / 2.5]),
      shaft: shaftTexture(),
    };
  }, [len]);
  const a = abbey();
  const vault = useMemo(() => {
    // Sommets (r·sinθ, h, r·cosθ) ; après rotation de π/2 autour de x : (r·sinθ, −r·cosθ, h).
    // θ ∈ [π/2, 3π/2] garde la moitié haute (y ≥ 0), axe le long de la nef (z).
    const g = new THREE.CylinderGeometry(HALL.half, HALL.half, len, 48, 1, true, Math.PI / 2, Math.PI);
    g.rotateX(Math.PI / 2);
    return g;
  }, [len]);
  const yAt = (x: number) => HALL.spring + (HALL.rise / HALL.half) * Math.sqrt(Math.max(0, HALL.half * HALL.half - x * x)) - 0.06;
  const ribs = useMemo(() => {
    const arc = (pts: THREE.Vector3[], r: number) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 56, r, 6, false);
    const list: { geo: THREE.TubeGeometry; main: boolean }[] = [];
    for (const z of BAYS) {
      list.push({ geo: arc(Array.from({ length: 21 }, (_, i) => { const x = -HALL.half + (i / 20) * HALL.half * 2; return new THREE.Vector3(x, yAt(x), z); }), 0.11), main: true });
    }
    for (let b = 0; b < BAYS.length - 1; b++) {
      const za = BAYS[b];
      const zb = BAYS[b + 1];
      for (const dir of [1, -1]) {
        list.push({ geo: arc(Array.from({ length: 21 }, (_, i) => {
          const s = i / 20;
          const x = dir * (-HALL.half + s * HALL.half * 2);
          return new THREE.Vector3(x, yAt(x), za + (zb - za) * s);
        }), 0.07), main: false });
      }
    }
    return list;
  }, []);
  return (
    <group>
      {/* sol de tomettes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, midZ]}>
        <planeGeometry args={[HALL.half * 2, len]} />
        <meshStandardMaterial map={tex.floor} roughness={0.75} />
      </mesh>

      {/* murs latéraux : lambris de chêne, puis pierre de taille jusqu'à la retombée */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * HALL.half, WAINSCOT / 2, midZ]} rotation={[0, -s * Math.PI / 2, 0]}>
            <planeGeometry args={[len, WAINSCOT]} />
            <meshStandardMaterial map={tex.wainscot} color="#c48e5e" roughness={0.6} />
          </mesh>
          <mesh position={[s * HALL.half, (HALL.spring + WAINSCOT) / 2, midZ]} rotation={[0, -s * Math.PI / 2, 0]}>
            <planeGeometry args={[len, HALL.spring - WAINSCOT]} />
            <meshStandardMaterial map={tex.wall} color="#e6d5b6" roughness={0.92} />
          </mesh>
          {/* cimaise de chêne, plinthe et corniche de pierre */}
          <mesh position={[s * (HALL.half - 0.03), WAINSCOT, midZ]}>
            <boxGeometry args={[0.06, 0.07, len]} />
            <meshStandardMaterial color="#5a3c26" roughness={0.6} />
          </mesh>
          <mesh position={[s * (HALL.half - 0.025), 0.06, midZ]} material={a.stone}>
            <boxGeometry args={[0.05, 0.12, len]} />
          </mesh>
          <mesh position={[s * (HALL.half - 0.08), HALL.spring - 0.05, midZ]} material={a.carved}>
            <boxGeometry args={[0.16, 0.14, len]} />
          </mesh>
        </group>
      ))}

      {/* voûte en berceau de pierre, arcs doubleaux et ogives de pierre, clés sculptées */}
      <mesh geometry={vault} position={[0, HALL.spring, midZ]} scale={[1, HALL.rise / HALL.half, 1]}>
        <meshStandardMaterial map={tex.vault} color="#d9c7a5" side={THREE.BackSide} roughness={0.95} />
      </mesh>
      {ribs.map((r, i) => <mesh key={i} geometry={r.geo} material={r.main ? a.carved : a.stone} />)}
      {BAYS.slice(0, -1).map((z) => (
        <group key={z} position={[0, yAt(0) - 0.05, z + 2]}>
          <mesh material={a.carved}>
            <cylinderGeometry args={[0.2, 0.16, 0.12, 12]} />
          </mesh>
          <mesh position={[0, -0.08, 0]} material={a.carved}>
            <sphereGeometry args={[0.07, 12, 8]} />
          </mesh>
        </group>
      ))}

      {/* pignons : lambris, pierre, tympan */}
      {[HALL.z0, HALL.z1].map((z) => (
        <group key={z} rotation={[0, z > 0 ? Math.PI : 0, 0]} position={[0, 0, z]}>
          <mesh position={[0, WAINSCOT / 2, 0]}>
            <planeGeometry args={[HALL.half * 2, WAINSCOT]} />
            <meshStandardMaterial map={tex.wainscotEnd} color="#c48e5e" roughness={0.6} />
          </mesh>
          <mesh position={[0, (HALL.spring + WAINSCOT) / 2, 0]}>
            <planeGeometry args={[HALL.half * 2, HALL.spring - WAINSCOT]} />
            <meshStandardMaterial map={tex.wallEnd} color="#e6d5b6" roughness={0.92} />
          </mesh>
          <mesh position={[0, HALL.spring + HALL.rise / 2, 0]}>
            <planeGeometry args={[HALL.half * 2, HALL.rise]} />
            <meshStandardMaterial map={tex.tympan} color="#e6d5b6" roughness={0.92} />
          </mesh>
        </group>
      ))}

      {/* colonnes engagées de pierre, base moulurée et chapiteau à crochets */}
      {BAYS.flatMap((z) => [-1, 1].map((s) => (
        <group key={`${z}${s}`} position={[s * (HALL.half - 0.2), 0, z]}>
          <mesh position={[0, 0.14, 0]} material={a.stone}>
            <cylinderGeometry args={[0.28, 0.3, 0.28, 8]} />
          </mesh>
          <mesh position={[0, 0.31, 0]} rotation={[Math.PI / 2, 0, 0]} material={a.carved}>
            <torusGeometry args={[0.2, 0.04, 8, 24]} />
          </mesh>
          <mesh position={[0, HALL.spring / 2, 0]} material={a.carved}>
            <cylinderGeometry args={[0.17, 0.19, HALL.spring - 0.55, 20]} />
          </mesh>
          <mesh position={[0, HALL.spring - 0.22, 0]} material={a.carved}>
            <cylinderGeometry args={[0.3, 0.18, 0.3, 20]} />
          </mesh>
          {Array.from({ length: 8 }, (_, k) => {
            const ang = (k / 8) * Math.PI * 2;
            return (
              <mesh key={k} position={[Math.cos(ang) * 0.24, HALL.spring - 0.18, Math.sin(ang) * 0.24]} rotation={[0, -ang, 0.5]} scale={[0.05, 0.11, 0.035]} material={a.carved}>
                <sphereGeometry args={[1, 8, 6]} />
              </mesh>
            );
          })}
          <mesh position={[0, HALL.spring - 0.03, 0]} material={a.stone}>
            <boxGeometry args={[0.6, 0.08, 0.6]} />
          </mesh>
        </group>
      )))}

      {/* hautes lancettes du mur droit, ébrasement de pierre, et leurs rayons */}
      {BAYS.slice(0, -1).map((z) => (
        <group key={z} position={[HALL.half - 0.02, 0, z + 2]} rotation={[0, -Math.PI / 2, 0]}>
          <group position={[0, 2.25, 0]}>
            <DayNightGlass daylight={daylight} w={0.9} h={1.9} />
          </group>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.53, 2.2, 0.08]} material={a.stone}>
              <boxGeometry args={[0.16, 2.0, 0.18]} />
            </mesh>
          ))}
          <mesh position={[0, 1.25, 0.1]} material={a.stone}>
            <boxGeometry args={[1.22, 0.1, 0.24]} />
          </mesh>
          {!lowPower && (
            <mesh position={[0, 1.35, 1.4]} rotation={[-0.8, 0, 0]}>
              <planeGeometry args={[1, 3.6]} />
              <meshBasicMaterial map={tex.shaft} color={shaftTint(daylight)} transparent opacity={lerp(0.06, 0.12, daylight.sun)} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      ))}

      {/* grande tapisserie derrière le lecteur, pendue à la corniche entre les deux colonnes de la travée */}
      <group position={[-HALL.half + 0.03, HALL.spring - 0.1 - 3.2 / 1.4 / 2, PULPIT.z]} rotation={[0, Math.PI / 2, 0]}>
        <Tapestry width={3.2} />
      </group>
    </group>
  );
}

/** Tapisserie à la licorne (le dessin du tapis de la bibliothèque), bordée d'or, sur tringle. */
function Tapestry({ width }: { width: number }) {
  const m = mats();
  const tex = useMemo(() => {
    const t = new THREE.TextureLoader().load("/textures/rug-unicorn-drawn-1024.webp");
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  const w = width;
  const h = width / 1.4; // proportions du dessin (1024 × 731)
  return (
    <group>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} roughness={0.95} />
      </mesh>
      {/* tringle et pommeaux */}
      <mesh position={[0, h / 2 + 0.05, 0.04]} rotation={[0, 0, Math.PI / 2]} material={m.gold}>
        <cylinderGeometry args={[0.025, 0.025, w + 0.2, 10]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 + 0.12), h / 2 + 0.05, 0.04]} material={m.gold}>
          <sphereGeometry args={[0.05, 12, 10]} />
        </mesh>
      ))}
      {/* galons latéraux et frange dorée */}
      {[-1, 1].map((s) => (
        <mesh key={`g${s}`} position={[s * (w / 2 - 0.02), 0, 0.006]} material={m.goldSoft}>
          <boxGeometry args={[0.04, h, 0.008]} />
        </mesh>
      ))}
      <mesh position={[0, -h / 2 - 0.02, 0.006]} material={m.goldSoft}>
        <boxGeometry args={[w, 0.06, 0.012]} />
      </mesh>
    </group>
  );
}

/** Cheminée monumentale au fond de la salle : piédroits, manteau, hotte au blason, feu de bûches. */
function Fireplace() {
  const a = abbey();
  const jamb = useMemo(() => limestoneTexture(53, [0.6, 1]), []);
  const hood = useMemo(() => limestoneTexture(61, [1.4, 1]), []);
  const arms = useMemo(() => {
    const t = new THREE.TextureLoader().load("/brand/armoiries-vitrail-480.webp");
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => arms.dispose(), [arms]);
  const z = HALL.z1;
  return (
    <group position={[0, 0, z]} rotation={[0, Math.PI, 0]}>
      {/* âtre sombre */}
      <mesh position={[0, 0.75, 0.02]}>
        <planeGeometry args={[1.8, 1.5]} />
        <meshStandardMaterial color="#120c0a" roughness={1} />
      </mesh>
      {/* piédroits et manteau de pierre */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.08, 0.82, 0.25]}>
          <boxGeometry args={[0.36, 1.64, 0.5]} />
          <meshStandardMaterial map={jamb} color="#d2bf9c" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, 1.72, 0.3]}>
        <boxGeometry args={[2.7, 0.2, 0.62]} />
        <meshStandardMaterial map={jamb} color="#d2bf9c" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.6, 0.56]} material={a.carved}>
        <boxGeometry args={[2.5, 0.05, 0.04]} />
      </mesh>
      {/* hotte de pierre au blason, jusqu'à la retombée de la voûte */}
      <mesh position={[0, 2.55, 0.2]}>
        <boxGeometry args={[2.3, 1.5, 0.42]} />
        <meshStandardMaterial map={hood} color="#d6c7aa" roughness={0.85} />
      </mesh>
      {/* cadre de pierre sculptée du panneau armorié */}
      {[[0, 3.06, 1.5, 0.04], [0, 2.04, 1.5, 0.04], [-0.73, 2.55, 0.04, 1.06], [0.73, 2.55, 0.04, 1.06]].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.43]} material={a.carved}>
          <boxGeometry args={[w, h, 0.03]} />
        </mesh>
      ))}
      <mesh position={[0, 2.55, 0.415]}>
        <planeGeometry args={[0.62, 0.86]} />
        <meshStandardMaterial map={arms} transparent alphaTest={0.05} roughness={0.6} />
      </mesh>
      <mesh position={[0, 3.32, 0.3]} material={a.carved}>
        <boxGeometry args={[2.5, 0.08, 0.6]} />
      </mesh>
      {/* chenets, bûches et flammes */}
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} position={[x, 0.18, 0.35]} material={a.iron}>
          <cylinderGeometry args={[0.04, 0.06, 0.36, 10]} />
        </mesh>
      ))}
      {[[-0.1, 0.12, 0.25, 0.3], [0.15, 0.14, 0.3, -0.2], [0, 0.26, 0.28, 0.1]].map(([x, y, zz, r], i) => (
        <mesh key={i} position={[x, y, zz]} rotation={[0, r, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.08, 0.9, 10]} />
          <meshStandardMaterial color="#3a2416" roughness={0.95} emissive="#5a1a04" emissiveIntensity={0.6} />
        </mesh>
      ))}
      {[-0.32, -0.12, 0.08, 0.28].map((x, i) => (
        <group key={x} position={[x, 0.3, 0.3]} scale={[4.5, 5.5 + (i % 2) * 1.5, 4.5]}>
          <Flame seed={i * 1.7} />
        </group>
      ))}
    </group>
  );
}

/* ─── Mobilier ─── */

/**
 * Retombée de nappe : plis verticaux qui s'ouvrent vers le bas, ourlet légèrement ondulé.
 * Plan vertical, haut à y = +drop/2 ; le relief est porté par z (vers l'extérieur une fois tourné).
 */
function drapeGeometry(width: number, drop: number, foldsPerMeter = 7, amp = 0.022) {
  const g = new THREE.PlaneGeometry(width, drop, Math.max(24, Math.round(width * 36)), 8);
  const p = g.attributes.position as THREE.BufferAttribute;
  const k = Math.PI * 2 * foldsPerMeter;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const t = (drop / 2 - y) / drop; // 0 en haut, 1 à l'ourlet
    const wave = Math.sin(x * k) + 0.35 * Math.sin(x * k * 2.3 + 1.1);
    p.setZ(i, wave * amp * Math.pow(t, 0.85) + t * 0.012);
    if (t > 0.99) p.setY(i, y + Math.sin(x * k) * 0.012);
  }
  g.computeVertexNormals();
  return g;
}

/** Table du réfectoire : nappe de lin aux retombées plissées, chemin écru, chandeliers de laiton, bancs de chêne. */
function BanquetTable({ x, lowPower }: { x: number; lowPower: boolean }) {
  const tex = useMemo(() => {
    const cloth = tableclothTexture();
    cloth.wrapS = cloth.wrapT = THREE.RepeatWrapping;
    cloth.repeat.set(1.2, 10);
    const hang = tableclothTexture(45);
    hang.wrapS = hang.wrapT = THREE.RepeatWrapping;
    hang.repeat.set(10, 0.6);
    const hangEnd = tableclothTexture(46);
    hangEnd.wrapS = hangEnd.wrapT = THREE.RepeatWrapping;
    hangEnd.repeat.set(1.2, 0.6);
    return { cloth, hang, hangEnd, wood: woodTexture("#3a2416", 83 + Math.round(x), true) };
  }, [x]);
  const len = TABLE.z1 - TABLE.z0;
  const W = TABLE.width + 0.12;
  const drop = 0.58;
  const drapes = useMemo(() => ({ side: drapeGeometry(len + 0.14, drop), end: drapeGeometry(W + 0.02, drop) }), [len, W]);
  const leg = useMemo(() => {
    const prof = [[0.05, 0], [0.04, 0.04], [0.028, 0.08], [0.036, 0.16], [0.024, 0.24], [0.022, 0.34], [0.04, 0.37]];
    return new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 12);
  }, []);
  const candelabras = [-len / 2 + 1.7, -len / 6 + 0.35, len / 6 + 0.35, len / 2 - 1.3];
  const benchLegs = [-len / 2 + 0.3, -len / 4, 0, len / 4, len / 2 - 0.3];
  return (
    <group position={[x, 0, (TABLE.z0 + TABLE.z1) / 2]}>
      <mesh position={[0, TABLE.top - 0.05, 0]}>
        <boxGeometry args={[TABLE.width, 0.06, len]} />
        <meshStandardMaterial map={tex.wood} color="#6a4428" roughness={0.6} />
      </mesh>
      {[-len / 2 + 0.4, 0, len / 2 - 0.4].map((z) => (
        <mesh key={z} position={[0, (TABLE.top - 0.08) / 2, z]}>
          <boxGeometry args={[0.6, TABLE.top - 0.08, 0.1]} />
          <meshStandardMaterial map={tex.wood} color="#6a4428" roughness={0.6} />
        </mesh>
      ))}
      {/* nappe : dessus et retombées plissées */}
      <mesh position={[0, TABLE.top - 0.005, 0]}>
        <boxGeometry args={[W, 0.01, len + 0.12]} />
        <meshStandardMaterial map={tex.cloth} color="#ece3d0" roughness={0.88} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={drapes.side} position={[s * W / 2, TABLE.top - drop / 2, 0]} rotation={[0, s * Math.PI / 2, 0]}>
          <meshStandardMaterial map={tex.hang} color="#e2d7c2" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`e${s}`} geometry={drapes.end} position={[0, TABLE.top - drop / 2, s * (len / 2 + 0.06)]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <meshStandardMaterial map={tex.hangEnd} color="#e2d7c2" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* chemin de lin écru à liteaux bruns, qui retombe aux deux bouts */}
      <mesh position={[0, TABLE.top + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.26, len + 0.1]} />
        <meshStandardMaterial color="#cbb894" roughness={0.95} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`b${s}`} position={[s * 0.1, TABLE.top + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.018, len + 0.1]} />
          <meshStandardMaterial color="#7a5638" roughness={0.95} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`r${s}`} position={[0, TABLE.top - 0.16, s * (len / 2 + 0.08)]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[0.26, 0.32]} />
          <meshStandardMaterial color="#cbb894" roughness={0.95} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* chandeliers de laiton le long de la table, chacun avec sa lueur */}
      {candelabras.map((z) => (
        <group key={z} position={[0, TABLE.top, z]} scale={1.55} rotation={[0, Math.PI / 2, 0]}>
          <Candelabra />
        </group>
      ))}
      {!lowPower &&
        [candelabras[0], candelabras[2]].map((z) => (
          <pointLight key={`l${z}`} color="#ffae5c" intensity={2.2} position={[0, TABLE.top + 0.6, z + 0.6]} distance={4} decay={1.5} />
        ))}
      {/* bancs de chêne massif sur pieds tournés */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.78, 0, 0]}>
          <RoundedBox args={[0.36, 0.06, len - 0.2]} radius={0.015} smoothness={2} position={[0, 0.43, 0]}>
            <meshStandardMaterial map={tex.wood} color="#b07a4c" roughness={0.6} />
          </RoundedBox>
          <mesh position={[0, 0.37, 0]}>
            <boxGeometry args={[0.3, 0.06, len - 0.3]} />
            <meshStandardMaterial map={tex.wood} color="#8a5c38" roughness={0.6} />
          </mesh>
          {benchLegs.map((z) =>
            [-1, 1].map((t) => (
              <mesh key={`${z}${t}`} geometry={leg} position={[t * 0.13, 0, z]}>
                <meshStandardMaterial map={tex.wood} color="#8a5c38" roughness={0.55} />
              </mesh>
            )),
          )}
        </group>
      ))}
    </group>
  );
}

/**
 * Un couvert de réfectoire : plat d'étain, écuelle de terre vernissée, gobelet d'étain,
 * cuillère et couteau. Pris par un sujet : feuillet à son titre, cliquable ; chandelle s'il est animé.
 */
function Place({ slot, place, selected, fonts, onSelect }: {
  slot: { x: number; z: number; side: 1 | -1 };
  place: RefectoryPlace | null;
  selected: boolean;
  fonts: Fonts;
  onSelect: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && Boolean(place));
  const card = useMemo(() => (place ? placeCardTexture(place.title, place.postCount, fonts) : null), [place, fonts]);
  const goblet = useMemo(() => {
    const pts = [[0, 0], [0.032, 0], [0.034, 0.004], [0.006, 0.012], [0.005, 0.07], [0.012, 0.08], [0.034, 0.1], [0.038, 0.15], [0.036, 0.152]];
    return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 20);
  }, []);
  const glow = Boolean(place && (hovered || selected));
  return (
    <group
      position={[slot.x, TABLE.top, slot.z]}
      rotation={[0, slot.side === 1 ? -Math.PI / 2 : Math.PI / 2, 0]}
      onClick={(e) => {
        if (!place) return;
        e.stopPropagation();
        onSelect(place.id);
      }}
      onPointerOver={(e) => {
        if (!place) return;
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[0, 0.004, 0]}>
        <cylinderGeometry args={[0.14, 0.135, 0.008, 36]} />
        <meshStandardMaterial color="#a29c90" metalness={0.75} roughness={0.35} emissive={glow ? "#7a5210" : "#000000"} emissiveIntensity={glow ? 0.8 : 0} />
      </mesh>
      <mesh position={[0, 0.026, 0]}>
        <cylinderGeometry args={[0.085, 0.05, 0.04, 28, 1, true]} />
        <meshStandardMaterial color="#8a5a32" roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.05, 24]} />
        <meshStandardMaterial color="#6e4426" roughness={0.4} />
      </mesh>
      <mesh geometry={goblet} position={[0.16, 0, -0.13]} material={abbey().pewter} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.165, 0.003, 0]} material={s > 0 ? abbey().pewter : undefined}>
          <boxGeometry args={[0.014, 0.004, 0.17]} />
          {s < 0 && <meshStandardMaterial color="#6e4c32" roughness={0.6} />}
        </mesh>
      ))}
      {place && card && (
        <>
          {/* feuillet plié en tente, titre vers l'allée */}
          <mesh position={[0, 0.06, 0.2]} rotation={[-0.35, 0, 0]}>
            <planeGeometry args={[0.24, 0.12]} />
            <meshStandardMaterial map={card} roughness={0.9} side={THREE.DoubleSide} emissive={glow ? "#3a2a10" : "#000000"} />
          </mesh>
          {place.active && (
            <group position={[-0.17, 0, -0.12]}>
              <mesh position={[0, 0.008, 0]} material={abbey().pewter}>
                <cylinderGeometry args={[0.03, 0.035, 0.016, 12]} />
              </mesh>
              <group position={[0, 0.016, 0]}>
                <Candle height={0.09} radius={0.016} seed={slot.z} />
              </group>
            </group>
          )}
          {selected && (
            <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.17, 0.21, 40]} />
              <meshBasicMaterial color="#f0cf78" transparent opacity={0.6} toneMapped={false} />
            </mesh>
          )}
        </>
      )}
    </group>
  );
}

/**
 * Chaire du lecteur, contre le mur gauche : tribune de chêne à panneaux moulurés, balustrade de balustres
 * tournés, poteaux d'angle à pommeaux, parement brodé, escalier de bois à rampe.
 * Le vieux moine y recopie le dernier message publié.
 */
function Pulpit({ lector, onLector }: { lector: CopyistNote | null; onLector: () => void }) {
  const m = mats();
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const wood = useMemo(() => woodTexture("#4a3020", 91, true), []);
  const panels = useMemo(() => {
    const t = panelTexture(17);
    t.repeat.set(2.4, 1);
    return t;
  }, []);
  const runner = useMemo(() => runnerTexture(), []);
  const baluster = useMemo(() => {
    const prof = [[0.03, 0], [0.032, 0.03], [0.018, 0.07], [0.034, 0.2], [0.04, 0.28], [0.02, 0.4], [0.016, 0.5], [0.026, 0.56], [0.03, 0.6]];
    return new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 10);
  }, []);
  const F = PULPIT.floor;
  const W = HALL.half - 2.9;
  const x0 = -HALL.half;
  const front = x0 + W; // bord de la tribune côté salle
  const oak = <meshStandardMaterial map={wood} color="#b07a4c" roughness={0.5} />;
  const carved = <meshStandardMaterial map={panels} color="#c89464" roughness={0.5} />;
  /* balustres : façade (le long de z) et deux côtés (le long de x) */
  const rail = [
    ...Array.from({ length: 12 }, (_, i) => [front - 0.06, PULPIT.z - 0.88 + i * 0.16] as const),
    ...[-1, 1].flatMap((sz) => Array.from({ length: 8 }, (_, i) => [x0 + 0.18 + i * 0.16, PULPIT.z + sz * 0.95] as const)),
  ];
  const posts = [[front - 0.06, PULPIT.z - 0.97], [front - 0.06, PULPIT.z + 0.97], [x0 + 0.06, PULPIT.z + 0.97]] as const;
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onLector();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* caisson à panneaux moulurés, socle et corniche */}
      <mesh position={[x0 + W / 2, F / 2, PULPIT.z]}>
        <boxGeometry args={[W, F, 2]} />
        {carved}
      </mesh>
      <mesh position={[x0 + W / 2 + 0.02, 0.08, PULPIT.z]}>
        <boxGeometry args={[W + 0.06, 0.16, 2.06]} />
        {oak}
      </mesh>
      <mesh position={[x0 + W / 2 + 0.03, F - 0.03, PULPIT.z]}>
        <boxGeometry args={[W + 0.1, 0.08, 2.1]} />
        {oak}
      </mesh>
      {/* balustrade : lisse basse, balustres tournés, main courante */}
      {rail.map(([x, z], i) => (
        <mesh key={i} geometry={baluster} position={[x, F + 0.04, z]}>
          {oak}
        </mesh>
      ))}
      <mesh position={[front - 0.06, F + 0.02, PULPIT.z]}>
        <boxGeometry args={[0.1, 0.04, 2]} />
        {oak}
      </mesh>
      <mesh position={[front - 0.06, F + 0.68, PULPIT.z]}>
        <boxGeometry args={[0.13, 0.06, 2.02]} />
        {oak}
      </mesh>
      {[-1, 1].map((sz) => (
        <group key={sz}>
          <mesh position={[x0 + W / 2, F + 0.02, PULPIT.z + sz * 0.95]}>
            <boxGeometry args={[W, 0.04, 0.08]} />
            {oak}
          </mesh>
          <mesh position={[x0 + W / 2, F + 0.68, PULPIT.z + sz * 0.95]}>
            <boxGeometry args={[W, 0.06, 0.11]} />
            {oak}
          </mesh>
        </group>
      ))}
      {/* poteaux d'angle à pommeau tourné */}
      {posts.map(([x, z], i) => (
        <group key={i} position={[x, F, z]}>
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[0.1, 0.8, 0.1]} />
            {oak}
          </mesh>
          <mesh position={[0, 0.86, 0]}>
            <sphereGeometry args={[0.05, 14, 10]} />
            {oak}
          </mesh>
        </group>
      ))}
      {/* parement de velours cramoisi galonné d'or, retombant de la main courante */}
      <mesh position={[front + 0.012, F + 0.22, PULPIT.z]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.8, 1.0]} />
        <meshStandardMaterial map={runner} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      {/* console sculptée sous la tribune */}
      <mesh position={[front - 0.12, F - 0.32, PULPIT.z]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[0.12, 0.5, 0.5]} />
        {oak}
      </mesh>
      {/* escalier de chêne vers l'entrée, avec sa rampe */}
      {Array.from({ length: 5 }, (_, i) => (
        <group key={i}>
          <mesh position={[x0 + 0.55, (F * (i + 1)) / 10, PULPIT.z - 1.1 - (4 - i) * 0.26]}>
            <boxGeometry args={[1, (F * (i + 1)) / 5, 0.26]} />
            {carved}
          </mesh>
          <mesh position={[x0 + 0.57, (F * (i + 1)) / 5 + 0.012, PULPIT.z - 1.1 - (4 - i) * 0.26]}>
            <boxGeometry args={[1.04, 0.025, 0.28]} />
            {oak}
          </mesh>
          <mesh geometry={baluster} position={[x0 + 1.0, (F * (i + 1)) / 5 + 0.02, PULPIT.z - 1.1 - (4 - i) * 0.26]} scale={[1, 1.2, 1]}>
            {oak}
          </mesh>
        </group>
      ))}
      <mesh position={[x0 + 1.0, F * 0.6 + 0.76, PULPIT.z - 1.62]} rotation={[-Math.atan2(F * 0.8, 1.04), 0, 0]}>
        <boxGeometry args={[0.07, 0.05, 1.42]} />
        {oak}
      </mesh>
      {/* table du lecteur, banc, et le moine : repère de la table du scriptorium tourné vers la salle */}
      <group position={[PULPIT.x, F, PULPIT.z]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0.06, 0.79, 0.42]}>
          <boxGeometry args={[0.7, 0.06, 0.42]} />
          <meshStandardMaterial map={wood} color="#8a6446" roughness={0.6} />
        </mesh>
        {/* pied étroit, en retrait : laisse la place aux jambes du moine */}
        <mesh position={[0.06, 0.38, 0.33]}>
          <boxGeometry args={[0.6, 0.76, 0.16]} />
          <meshStandardMaterial map={wood} color="#7a5638" roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.53, 1.02]} material={m.velvet}>
          <boxGeometry args={[0.7, 0.05, 0.34]} />
        </mesh>
        <mesh position={[0, 0.255, 1.02]}>
          <boxGeometry args={[0.6, 0.51, 0.28]} />
          <meshStandardMaterial map={wood} color="#6a4a30" roughness={0.65} />
        </mesh>
        <Copyist note={lector} top={0.82} />
      </group>
    </group>
  );
}
