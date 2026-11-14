"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are mutated imperatively inside useFrame, as R3F intends. */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor, Sparkles, useCursor } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Candelabra, Candle, Copyist, Flame, GrandChandelier } from "./LibraryScene";
import {
  checkerMarbleTexture,
  damaskTexture,
  limestoneTexture,
  marbleTexture,
  paintedVaultTexture,
  panelTexture,
  placeCardTexture,
  resolveFonts,
  runnerTexture,
  shaftTexture,
  tableclothTexture,
  windowTexture,
  woodTexture,
  type Fonts,
} from "./textures";
import type { CopyistNote } from "./types";

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
const mats = () => (shared ??= makeMaterials());

export default function RefectoryScene(props: Props) {
  const { lowPower } = props;
  return (
    <Canvas
      dpr={lowPower ? 1 : [1, 1.75]}
      gl={{ antialias: !lowPower, powerPreference: "high-performance" }}
      camera={{ fov: 52, near: 0.05, far: 60, position: [0, 2.8, -7] }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.04;
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
  useFrame(() => {
    if (!ready.current) {
      ready.current = true;
      onReady?.();
    }
  });
  const selectedSlot = selected ? places.findIndex((p) => p.id === selected) : -1;
  return (
    <>
      <Reflections />
      <CameraRig slot={selectedSlot >= 0 ? SLOTS[selectedSlot] : null} lector={lectorView} />
      <Lights lowPower={lowPower} />
      <Hall lowPower={lowPower} />
      <Fireplace />
      {TABLE_X.map((x) => <BanquetTable key={x} x={x} />)}
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
function Reflections() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.32;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
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

/* ─── Lumière : jour par les baies, feu de la cheminée, lustres, chaire ─── */

function Lights({ lowPower }: { lowPower: boolean }) {
  const fire = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (fire.current) fire.current.intensity = 7 * (1 + Math.sin(t * 8.1) * 0.08 + Math.sin(t * 17.3) * 0.06 + Math.sin(t * 2.7) * 0.05);
  });
  return (
    <>
      <ambientLight color="#ffe2bc" intensity={0.16} />
      <hemisphereLight args={["#f2e2c6", "#2a1410", 0.26]} />
      <directionalLight color="#ffeccc" intensity={1.05} position={[8, 7, 3]} />
      <pointLight ref={fire} color="#ff8a3a" position={[0, 0.9, HALL.z1 - 0.9]} distance={10} decay={1.5} />
      <pointLight color="#ffb066" intensity={3.5} position={[PULPIT.x + 0.3, PULPIT.floor + 1.6, PULPIT.z]} distance={4} decay={1.6} />
      {!lowPower && <pointLight color="#fff0d6" intensity={2.4} position={[3.6, 3, 4]} distance={7} decay={1.6} />}
    </>
  );
}

/* ─── Architecture ─── */

function Hall({ lowPower }: { lowPower: boolean }) {
  const len = HALL.z1 - HALL.z0;
  const midZ = (HALL.z0 + HALL.z1) / 2;
  const tex = useMemo(() => {
    const wainscot = panelTexture(7);
    wainscot.repeat.set(len / 1.6, 1);
    const damask = damaskTexture();
    damask.repeat.set(len / 0.5, (HALL.spring - WAINSCOT) / 0.5);
    const damaskEnd = damaskTexture(47);
    damaskEnd.repeat.set((HALL.half * 2) / 0.5, (HALL.spring - WAINSCOT) / 0.5);
    const wainscotEnd = panelTexture(11);
    wainscotEnd.repeat.set((HALL.half * 2) / 1.6, 1);
    const runner = runnerTexture();
    runner.wrapS = runner.wrapT = THREE.RepeatWrapping;
    runner.repeat.set(1, 7);
    return {
      floor: checkerMarbleTexture(37, [3.75, 6.7]),
      wainscot,
      wainscotEnd,
      damask,
      damaskEnd,
      vault: paintedVaultTexture(),
      tympan: limestoneTexture(19, [2.4, 1]),
      marble: marbleTexture("#6a1d22", "#e9cdb8", 31, [1, 3]),
      window: windowTexture(),
      shaft: shaftTexture(),
      runner,
    };
  }, [len]);
  const m = mats();
  const vault = useMemo(() => {
    // Sommets (r·sinθ, h, r·cosθ) ; après rotation de π/2 autour de x : (r·sinθ, −r·cosθ, h).
    // θ ∈ [π/2, 3π/2] garde la moitié haute (y ≥ 0), axe le long de la nef (z).
    const g = new THREE.CylinderGeometry(HALL.half, HALL.half, len, 48, 1, true, Math.PI / 2, Math.PI);
    g.rotateX(Math.PI / 2);
    return g;
  }, [len]);
  const yAt = (x: number) => HALL.spring + (HALL.rise / HALL.half) * Math.sqrt(Math.max(0, HALL.half * HALL.half - x * x)) - 0.06;
  const ribs = useMemo(() => {
    const arc = (pts: THREE.Vector3[], r: number) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 56, r, 8, false);
    const list: { geo: THREE.TubeGeometry; main: boolean }[] = [];
    for (const z of BAYS) {
      list.push({ geo: arc(Array.from({ length: 21 }, (_, i) => { const x = -HALL.half + (i / 20) * HALL.half * 2; return new THREE.Vector3(x, yAt(x), z); }), 0.09), main: true });
    }
    for (let b = 0; b < BAYS.length - 1; b++) {
      const za = BAYS[b];
      const zb = BAYS[b + 1];
      for (const dir of [1, -1]) {
        list.push({ geo: arc(Array.from({ length: 21 }, (_, i) => {
          const s = i / 20;
          const x = dir * (-HALL.half + s * HALL.half * 2);
          return new THREE.Vector3(x, yAt(x), za + (zb - za) * s);
        }), 0.06), main: false });
      }
    }
    // faîtière dorée tout le long de la nef
    list.push({ geo: arc([new THREE.Vector3(0, yAt(0), HALL.z0), new THREE.Vector3(0, yAt(0), HALL.z1)], 0.05), main: false });
    return list;
  }, []);
  const stone = { roughness: 0.92 } as const;
  return (
    <group>
      {/* dallage de marbre en damier et chemin de velours dans l'allée */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, midZ]}>
        <planeGeometry args={[HALL.half * 2, len]} />
        <meshStandardMaterial map={tex.floor} roughness={0.2} metalness={0.05} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, (HALL.z0 + 0.6 + HALL.z1 - 1.6) / 2]}>
        <planeGeometry args={[1.1, len - 2.2]} />
        <meshStandardMaterial map={tex.runner} roughness={0.9} />
      </mesh>

      {/* murs latéraux : lambris à filets d'or, puis tentures de damas cramoisi jusqu'à la retombée */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * HALL.half, WAINSCOT / 2, midZ]} rotation={[0, -s * Math.PI / 2, 0]}>
            <planeGeometry args={[len, WAINSCOT]} />
            <meshStandardMaterial map={tex.wainscot} color="#8a5a3a" roughness={0.55} />
          </mesh>
          <mesh position={[s * HALL.half, (HALL.spring + WAINSCOT) / 2, midZ]} rotation={[0, -s * Math.PI / 2, 0]}>
            <planeGeometry args={[len, HALL.spring - WAINSCOT]} />
            <meshStandardMaterial map={tex.damask} roughness={0.75} />
          </mesh>
          {/* cimaise, plinthe et corniche dorées */}
          {[[WAINSCOT, 0.07, 0.06], [0.06, 0.12, 0.05], [HALL.spring - 0.05, 0.12, 0.12]].map(([y, h, d], i) => (
            <mesh key={i} position={[s * (HALL.half - d / 2), y, midZ]} material={i === 1 ? m.goldSoft : m.gold}>
              <boxGeometry args={[d, h, len]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* voûte peinte d'azur étoilé, nervures et clés dorées */}
      <mesh geometry={vault} position={[0, HALL.spring, midZ]} scale={[1, HALL.rise / HALL.half, 1]}>
        <meshStandardMaterial map={tex.vault} side={THREE.BackSide} roughness={0.8} />
      </mesh>
      {ribs.map((r, i) => <mesh key={i} geometry={r.geo} material={r.main ? m.gold : m.goldSoft} />)}
      {BAYS.slice(0, -1).map((z) => (
        <group key={z} position={[0, yAt(0) - 0.04, z + 2]}>
          <mesh material={m.gold}>
            <sphereGeometry args={[0.16, 18, 12]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={m.gold}>
            <torusGeometry args={[0.24, 0.035, 8, 24]} />
          </mesh>
        </group>
      ))}

      {/* tympans des pignons (pierre) au-dessus des tentures */}
      {[HALL.z0, HALL.z1].map((z) => (
        <group key={z} rotation={[0, z > 0 ? Math.PI : 0, 0]} position={[0, 0, z]}>
          <mesh position={[0, WAINSCOT / 2, 0]}>
            <planeGeometry args={[HALL.half * 2, WAINSCOT]} />
            <meshStandardMaterial map={tex.wainscotEnd} color="#8a5a3a" roughness={0.55} />
          </mesh>
          <mesh position={[0, (HALL.spring + WAINSCOT) / 2, 0]}>
            <planeGeometry args={[HALL.half * 2, HALL.spring - WAINSCOT]} />
            <meshStandardMaterial map={tex.damaskEnd} roughness={0.75} />
          </mesh>
          <mesh position={[0, HALL.spring + HALL.rise / 2, 0]}>
            <planeGeometry args={[HALL.half * 2, HALL.rise]} />
            <meshStandardMaterial map={tex.tympan} {...stone} color="#e7dcc6" />
          </mesh>
        </group>
      ))}

      {/* colonnes de marbre griotte, base et chapiteau dorés */}
      {BAYS.flatMap((z) => [-1, 1].map((s) => (
        <group key={`${z}${s}`} position={[s * (HALL.half - 0.22), 0, z]}>
          <mesh position={[0, 0.14, 0]} material={m.goldSoft}>
            <boxGeometry args={[0.5, 0.28, 0.5]} />
          </mesh>
          <mesh position={[0, 0.32, 0]} material={m.gold}>
            <torusGeometry args={[0.2, 0.035, 8, 24]} />
          </mesh>
          <mesh position={[0, HALL.spring / 2, 0]}>
            <cylinderGeometry args={[0.17, 0.19, HALL.spring - 0.55, 24]} />
            <meshStandardMaterial map={tex.marble} roughness={0.18} metalness={0.05} />
          </mesh>
          <mesh position={[0, HALL.spring - 0.22, 0]} material={m.gold}>
            <cylinderGeometry args={[0.3, 0.18, 0.3, 24]} />
          </mesh>
          {Array.from({ length: 8 }, (_, k) => {
            const a = (k / 8) * Math.PI * 2;
            return (
              <mesh key={k} position={[Math.cos(a) * 0.24, HALL.spring - 0.2, Math.sin(a) * 0.24]} rotation={[0, -a, 0.5]} scale={[0.05, 0.12, 0.03]} material={m.gold}>
                <sphereGeometry args={[1, 8, 6]} />
              </mesh>
            );
          })}
          <mesh position={[0, HALL.spring - 0.03, 0]} material={m.goldSoft}>
            <boxGeometry args={[0.62, 0.08, 0.62]} />
          </mesh>
        </group>
      )))}

      {/* baies du mur droit, drapées de velours, et leurs rayons */}
      {BAYS.slice(0, -1).map((z) => (
        <group key={z} position={[HALL.half - 0.02, 0, z + 2]} rotation={[0, -Math.PI / 2, 0]}>
          <mesh position={[0, 2.25, 0]}>
            <planeGeometry args={[0.9, 1.9]} />
            <meshBasicMaterial map={tex.window} toneMapped={false} transparent opacity={0.95} />
          </mesh>
          <Drapes />
          {!lowPower && (
            <mesh position={[0, 1.35, 1.4]} rotation={[-0.8, 0, 0]}>
              <planeGeometry args={[1, 3.6]} />
              <meshBasicMaterial map={tex.shaft} transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      ))}

      {/* grande tapisserie derrière le lecteur, pendue à la corniche entre les deux colonnes de la travée */}
      <group position={[-HALL.half + 0.03, HALL.spring - 0.1 - 3.2 / 1.4 / 2, PULPIT.z]} rotation={[0, Math.PI / 2, 0]}>
        <Tapestry width={3.2} />
      </group>
      {/* tapisserie plus petite près de l'entrée */}
      <group position={[-HALL.half + 0.03, 2.2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <Tapestry width={2.5} />
      </group>
    </group>
  );
}

/** Rideaux de velours cramoisi plissés, retenus par des embrasses, sous un lambrequin doré. */
function Drapes() {
  const m = mats();
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.62, 2.7, 24, 1);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      // plis verticaux, resserrés vers l'embrasse (au tiers bas)
      const pinch = 1 - 0.45 * Math.exp(-((y + 0.45) ** 2) / 0.08);
      p.setX(i, x * pinch);
      p.setZ(i, Math.sin(x * 38) * 0.035 + 0.04);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.62, 1.75, 0.05]}>
          <mesh geometry={geo} material={m.velvet} />
          <mesh position={[s * -0.02, -0.45, 0.08]} rotation={[Math.PI / 2, 0, 0]} material={m.gold}>
            <torusGeometry args={[0.1, 0.018, 6, 18]} />
          </mesh>
          <mesh position={[s * -0.02, -0.62, 0.1]} scale={[0.04, 0.09, 0.04]} material={m.gold}>
            <sphereGeometry args={[1, 10, 8]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 3.15, 0.08]} material={m.gold}>
        <boxGeometry args={[1.9, 0.16, 0.1]} />
      </mesh>
      <mesh position={[0, 3.0, 0.1]} material={m.velvet}>
        <boxGeometry args={[1.86, 0.22, 0.04]} />
      </mesh>
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
  const m = mats();
  const marble = useMemo(() => marbleTexture("#2f2b2a", "#bfb4a4", 53, [1, 1]), []);
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
      {/* piédroits et manteau de marbre */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.08, 0.82, 0.25]}>
          <boxGeometry args={[0.36, 1.64, 0.5]} />
          <meshStandardMaterial map={marble} roughness={0.2} />
        </mesh>
      ))}
      <mesh position={[0, 1.72, 0.3]}>
        <boxGeometry args={[2.7, 0.2, 0.62]} />
        <meshStandardMaterial map={marble} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.6, 0.56]} material={m.gold}>
        <boxGeometry args={[2.5, 0.05, 0.04]} />
      </mesh>
      {/* hotte de pierre au blason, jusqu'à la retombée de la voûte */}
      <mesh position={[0, 2.55, 0.2]}>
        <boxGeometry args={[2.3, 1.5, 0.42]} />
        <meshStandardMaterial map={hood} color="#d6c7aa" roughness={0.85} />
      </mesh>
      {/* cadre doré du panneau armorié */}
      {[[0, 3.06, 1.5, 0.04], [0, 2.04, 1.5, 0.04], [-0.73, 2.55, 0.04, 1.06], [0.73, 2.55, 0.04, 1.06]].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.43]} material={m.gold}>
          <boxGeometry args={[w, h, 0.03]} />
        </mesh>
      ))}
      <mesh position={[0, 2.55, 0.415]}>
        <planeGeometry args={[0.62, 0.86]} />
        <meshStandardMaterial map={arms} transparent alphaTest={0.05} roughness={0.6} />
      </mesh>
      <mesh position={[0, 3.32, 0.3]} material={m.gold}>
        <boxGeometry args={[2.5, 0.08, 0.6]} />
      </mesh>
      {/* chenets, bûches et flammes */}
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} position={[x, 0.18, 0.35]} material={m.gold}>
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

/** Table de banquet : nappe damassée retombante, chemin de table, candélabres dorés, bancs de velours. */
function BanquetTable({ x }: { x: number }) {
  const m = mats();
  const tex = useMemo(() => {
    const cloth = tableclothTexture();
    cloth.wrapS = cloth.wrapT = THREE.RepeatWrapping;
    cloth.repeat.set(1.2, 10);
    const runner = runnerTexture();
    runner.wrapS = runner.wrapT = THREE.RepeatWrapping;
    runner.repeat.set(1, 6);
    return { cloth, runner, wood: woodTexture("#3a2416", 83 + Math.round(x), true) };
  }, [x]);
  const len = TABLE.z1 - TABLE.z0;
  const mid = (TABLE.z0 + TABLE.z1) / 2;
  const W = TABLE.width + 0.12;
  const drop = 0.42;
  return (
    <group position={[x, 0, mid]}>
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
      {/* nappe : dessus et retombées */}
      <mesh position={[0, TABLE.top - 0.005, 0]}>
        <boxGeometry args={[W, 0.01, len + 0.12]} />
        <meshStandardMaterial map={tex.cloth} color="#e9dfcb" roughness={0.88} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * W / 2, TABLE.top - drop / 2, 0]} rotation={[0, s * Math.PI / 2, 0]}>
          <planeGeometry args={[len + 0.12, drop]} />
          <meshStandardMaterial map={tex.cloth} color="#ddd1ba" roughness={0.88} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`e${s}`} position={[0, TABLE.top - drop / 2, s * (len / 2 + 0.06)]}>
          <planeGeometry args={[W, drop]} />
          <meshStandardMaterial map={tex.cloth} color="#ddd1ba" roughness={0.88} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* chemin de table cramoisi et or */}
      <mesh position={[0, TABLE.top + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.22, len - 0.2]} />
        <meshStandardMaterial map={tex.runner} roughness={0.85} />
      </mesh>
      {/* candélabres dorés le long de la table */}
      {[-len / 2 + 1.7, -len / 6 + 0.35, len / 6 + 0.35, len / 2 - 1.3].map((z) => (
        <group key={z} position={[0, TABLE.top, z]} scale={1.55} rotation={[0, Math.PI / 2, 0]}>
          <Candelabra />
        </group>
      ))}
      {/* bancs garnis de velours, piétement doré */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.74, 0, 0]}>
          <mesh position={[0, 0.43, 0]} material={m.velvet}>
            <boxGeometry args={[0.34, 0.08, len - 0.2]} />
          </mesh>
          <mesh position={[0, 0.385, 0]} material={m.goldSoft}>
            <boxGeometry args={[0.36, 0.03, len - 0.18]} />
          </mesh>
          {[-len / 2 + 0.3, -len / 4, 0, len / 4, len / 2 - 0.3].map((z) =>
            [-1, 1].map((t) => (
              <mesh key={`${z}${t}`} position={[t * 0.13, 0.185, z]} material={m.goldSoft}>
                <cylinderGeometry args={[0.022, 0.016, 0.37, 8]} />
              </mesh>
            )),
          )}
        </group>
      ))}
    </group>
  );
}

/**
 * Un couvert dressé : sous-assiette dorée, assiette de porcelaine à filet d'or, verre de cristal,
 * couverts d'argent. Pris par un sujet : feuillet à son titre, cliquable ; chandelle s'il est animé.
 */
function Place({ slot, place, selected, fonts, onSelect }: {
  slot: { x: number; z: number; side: 1 | -1 };
  place: RefectoryPlace | null;
  selected: boolean;
  fonts: Fonts;
  onSelect: (id: string) => void;
}) {
  const m = mats();
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
        <meshStandardMaterial color="#d9ad52" metalness={0.9} roughness={0.25} emissive={glow ? "#7a5210" : "#000000"} emissiveIntensity={glow ? 0.8 : 0} />
      </mesh>
      <mesh position={[0, 0.012, 0]} material={m.porcelain}>
        <cylinderGeometry args={[0.11, 0.075, 0.012, 36]} />
      </mesh>
      <mesh position={[0, 0.0185, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.gold}>
        <torusGeometry args={[0.103, 0.0035, 6, 40]} />
      </mesh>
      <mesh geometry={goblet} position={[0.16, 0, -0.13]} material={m.crystal} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.165, 0.003, 0]} material={m.silver}>
          <boxGeometry args={[0.014, 0.004, 0.17]} />
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
              <mesh position={[0, 0.008, 0]} material={m.gold}>
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
 * Chaire du lecteur, contre le mur gauche : estrade de pierre ornée d'or, parement de velours, escalier.
 * Le vieux moine y recopie le dernier message publié.
 */
function Pulpit({ lector, onLector }: { lector: CopyistNote | null; onLector: () => void }) {
  const m = mats();
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const wood = useMemo(() => woodTexture("#4a3020", 91, true), []);
  const runner = useMemo(() => runnerTexture(), []);
  const F = PULPIT.floor;
  const W = HALL.half - 2.9;
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
      <mesh position={[-HALL.half + W / 2, F / 2, PULPIT.z]} material={m.stone}>
        <boxGeometry args={[W, F, 2]} />
      </mesh>
      <mesh position={[-HALL.half + W - 0.05, F + 0.36, PULPIT.z]} material={m.stone}>
        <boxGeometry args={[0.1, 0.72, 2]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-HALL.half + W / 2, F + 0.36, PULPIT.z + s * 0.97]} material={m.stone}>
          <boxGeometry args={[W, 0.72, 0.06]} />
        </mesh>
      ))}
      {/* moulures dorées : appui du garde-corps et corniche de l'estrade */}
      <mesh position={[-HALL.half + W - 0.05, F + 0.74, PULPIT.z]} material={m.gold}>
        <boxGeometry args={[0.18, 0.06, 2.06]} />
      </mesh>
      <mesh position={[-HALL.half + W / 2 + 0.03, F - 0.04, PULPIT.z]} material={m.goldSoft}>
        <boxGeometry args={[W + 0.08, 0.1, 2.08]} />
      </mesh>
      {/* parement de velours cramoisi galonné d'or, retombant du garde-corps */}
      <mesh position={[-HALL.half + W + 0.012, F + 0.2, PULPIT.z]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.8, 1.05]} />
        <meshStandardMaterial map={runner} roughness={0.85} />
      </mesh>
      {/* escalier vers l'entrée */}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[-HALL.half + 0.55, (F * (i + 1)) / 10, PULPIT.z - 1.1 - (4 - i) * 0.26]} material={m.stone}>
          <boxGeometry args={[1, (F * (i + 1)) / 5, 0.26]} />
        </mesh>
      ))}
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
