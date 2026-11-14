"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are mutated imperatively inside useFrame, as R3F intends. */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor, Sparkles, useCursor } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Candle, Copyist } from "./LibraryScene";
import { limestoneTexture, placeCardTexture, resolveFonts, shaftTexture, terracottaTexture, windowTexture, woodTexture, type Fonts } from "./textures";
import type { CopyistNote } from "./types";

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

/* Réfectoire voûté : nef de 9 m de large, quatre travées d'ogives de 4 m (z de −6 à 10). */
const HALL = { half: 4.5, z0: -6, z1: 10, spring: 3.2, rise: 2.7 };
const BAYS = [-6, -2, 2, 6, 10];
const TABLE_X = [-1.5, 1.5];
const TABLE = { z0: 0.4, z1: 8.6, top: 0.76, width: 0.9 };
const SEAT_STEP = 0.78;
const PULPIT = { x: -3.2, z: 4, floor: 1.2 };

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

export default function RefectoryScene(props: Props) {
  const { lowPower } = props;
  return (
    <Canvas
      dpr={lowPower ? 1 : [1, 1.75]}
      gl={{ antialias: !lowPower, powerPreference: "high-performance" }}
      camera={{ fov: 52, near: 0.05, far: 60, position: [0, 2.8, -7] }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
        scene.background = new THREE.Color("#1a1511");
        scene.fog = new THREE.Fog("#1a1511", 12, 26);
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
  useFrame(() => {
    if (!ready.current) {
      ready.current = true;
      onReady?.();
    }
  });
  const selectedSlot = selected ? places.findIndex((p) => p.id === selected) : -1;
  return (
    <>
      <CameraRig slot={selectedSlot >= 0 ? SLOTS[selectedSlot] : null} lector={lectorView} />
      <Lights lowPower={lowPower} />
      <Hall lowPower={lowPower} />
      {TABLE_X.map((x) => <LongTable key={x} x={x} />)}
      {SLOTS.map((s, i) => (
        <Place key={i} slot={s} place={places[i] ?? null} selected={i === selectedSlot} fonts={fonts} onSelect={onSelect} />
      ))}
      <Pulpit lector={lector} onLector={onLector} />
      {[1.6, 6.4].map((z) => <IronCorona key={z} z={z} />)}
      {!lowPower && <Sparkles count={110} scale={[8, 4, 14]} position={[1.5, 2.6, 2]} size={1.6} speed={0.1} opacity={0.4} color="#f6e2b8" noise={0.5} />}
    </>
  );
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
      target.set(narrow ? -0.4 : -0.8, 1.3, 5.2);
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

/* ─── Lumière : jour par les baies du mur droit, couronnes de chandelles, chaire ─── */

function Lights({ lowPower }: { lowPower: boolean }) {
  const crowns = useRef<(THREE.PointLight | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    crowns.current.forEach((l, i) => l && (l.intensity = 9 * (1 + Math.sin(t * 7.3 + i) * 0.04 + Math.sin(t * 13.1 + i) * 0.03)));
  });
  return (
    <>
      <ambientLight color="#ffe6c4" intensity={0.42} />
      <hemisphereLight args={["#f4ead8", "#3a2418", 0.55]} />
      <directionalLight color="#fff0d6" intensity={1.7} position={[8, 7, 3]} />
      {[1.6, 6.4].map((z, i) => (
        <pointLight key={z} ref={(el) => { crowns.current[i] = el; }} color="#ffc27a" position={[0, 3.3, z]} distance={9} decay={1.5} />
      ))}
      <pointLight color="#ffb066" intensity={4} position={[PULPIT.x + 0.3, PULPIT.floor + 1.6, PULPIT.z]} distance={4} decay={1.6} />
      {!lowPower && <pointLight color="#fff0d6" intensity={3} position={[3.6, 3, 4]} distance={7} decay={1.6} />}
    </>
  );
}

/* ─── Architecture : sol, murs, voûtes d'ogives, colonnes, baies, porte ─── */

function Hall({ lowPower }: { lowPower: boolean }) {
  const len = HALL.z1 - HALL.z0;
  const midZ = (HALL.z0 + HALL.z1) / 2;
  const tex = useMemo(
    () => ({
      floor: terracottaTexture(17, [6, 11]),
      wall: limestoneTexture(13, [4, 1.6]),
      end: limestoneTexture(19, [2.4, 1.6]),
      vault: limestoneTexture(23, [3, 6]),
      window: windowTexture(),
      shaft: shaftTexture(),
      door: woodTexture("#3a2a1e", 37, true),
    }),
    [],
  );
  const stone = { roughness: 0.92, color: "#ffffff" } as const;
  const vault = useMemo(() => {
    // Berceau surbaissé : demi-cylindre aplati, vu de l'intérieur.
    // Sommets (r·sinθ, h, r·cosθ) ; après rotation de π/2 autour de x : (r·sinθ, −r·cosθ, h).
    // θ ∈ [π/2, 3π/2] garde la moitié haute (y ≥ 0), axe le long de la nef (z).
    const g = new THREE.CylinderGeometry(HALL.half, HALL.half, len, 40, 1, true, Math.PI / 2, Math.PI);
    g.rotateX(Math.PI / 2);
    return g;
  }, [len]);
  const ribs = useMemo(() => {
    const arc = (pts: THREE.Vector3[]) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.07, 6, false);
    const yAt = (x: number) => HALL.spring + (HALL.rise / HALL.half) * Math.sqrt(Math.max(0, HALL.half * HALL.half - x * x)) - 0.06;
    const list: THREE.TubeGeometry[] = [];
    for (const z of BAYS) {
      // doubleau (arc transversal)
      list.push(arc(Array.from({ length: 17 }, (_, i) => { const x = -HALL.half + (i / 16) * HALL.half * 2; return new THREE.Vector3(x, yAt(x), z); })));
    }
    for (let b = 0; b < BAYS.length - 1; b++) {
      const za = BAYS[b];
      const zb = BAYS[b + 1];
      for (const dir of [1, -1]) {
        // ogive diagonale d'un angle de la travée à l'autre
        list.push(arc(Array.from({ length: 17 }, (_, i) => {
          const s = i / 16;
          const x = dir * (-HALL.half + s * HALL.half * 2);
          return new THREE.Vector3(x, yAt(x), za + (zb - za) * s);
        })));
      }
    }
    return list;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, midZ]}>
        <planeGeometry args={[HALL.half * 2, len]} />
        <meshStandardMaterial map={tex.floor} roughness={0.85} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * HALL.half, HALL.spring / 2, midZ]} rotation={[0, -s * Math.PI / 2, 0]}>
          <planeGeometry args={[len, HALL.spring]} />
          <meshStandardMaterial map={tex.wall} {...stone} />
        </mesh>
      ))}
      <mesh geometry={vault} position={[0, HALL.spring, midZ]} scale={[1, HALL.rise / HALL.half, 1]}>
        <meshStandardMaterial map={tex.vault} side={THREE.BackSide} {...stone} />
      </mesh>
      {/* murs pignons, jusque sous la voûte */}
      {[HALL.z0, HALL.z1].map((z) => (
        <mesh key={z} position={[0, (HALL.spring + HALL.rise) / 2, z]} rotation={[0, z > 0 ? Math.PI : 0, 0]}>
          <planeGeometry args={[HALL.half * 2, HALL.spring + HALL.rise]} />
          <meshStandardMaterial map={tex.end} {...stone} />
        </mesh>
      ))}
      {ribs.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#cdbfa8" roughness={0.85} />
        </mesh>
      ))}
      {/* colonnes engagées à chapiteau, aux retombées des ogives */}
      {BAYS.flatMap((z) => [-1, 1].map((s) => (
        <group key={`${z}${s}`} position={[s * (HALL.half - 0.2), 0, z]}>
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[0.46, 0.24, 0.46]} />
            <meshStandardMaterial color="#c7baa4" roughness={0.9} />
          </mesh>
          <mesh position={[0, HALL.spring / 2, 0]}>
            <cylinderGeometry args={[0.17, 0.19, HALL.spring - 0.3, 18]} />
            <meshStandardMaterial color="#d8ccb6" roughness={0.88} />
          </mesh>
          <mesh position={[0, HALL.spring - 0.2, 0]}>
            <cylinderGeometry args={[0.3, 0.18, 0.28, 18]} />
            <meshStandardMaterial color="#cbbda5" roughness={0.88} />
          </mesh>
          <mesh position={[0, HALL.spring - 0.03, 0]}>
            <boxGeometry args={[0.6, 0.08, 0.6]} />
            <meshStandardMaterial color="#c2b49b" roughness={0.9} />
          </mesh>
        </group>
      )))}
      {/* baies en plein cintre du mur droit, une par travée, et leurs rayons */}
      {BAYS.slice(0, -1).map((z) => (
        <group key={z} position={[HALL.half - 0.02, 2.35, z + 2]} rotation={[0, -Math.PI / 2, 0]}>
          <mesh>
            <planeGeometry args={[0.9, 1.9]} />
            <meshBasicMaterial map={tex.window} toneMapped={false} transparent opacity={0.95} />
          </mesh>
          {!lowPower && (
            <mesh position={[0, -0.9, 1.4]} rotation={[-0.8, 0, 0]}>
              <planeGeometry args={[1, 3.6]} />
              <meshBasicMaterial map={tex.shaft} transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      ))}
      {/* porte du fond, en arc */}
      <group position={[0, 0, HALL.z1 - 0.03]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 1.1, 0]}>
          <planeGeometry args={[1.4, 2.2]} />
          <meshStandardMaterial map={tex.door} color="#7a5638" roughness={0.7} />
        </mesh>
        <mesh position={[0, 2.2, 0]} rotation={[0, 0, 0]}>
          <circleGeometry args={[0.7, 24, 0, Math.PI]} />
          <meshStandardMaterial map={tex.door} color="#7a5638" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

/* ─── Mobilier ─── */

function LongTable({ x }: { x: number }) {
  const wood = useMemo(() => woodTexture("#5a3c26", 83 + Math.round(x), true), [x]);
  const mat = <meshStandardMaterial map={wood} color="#a77a52" roughness={0.6} />;
  const len = TABLE.z1 - TABLE.z0;
  const mid = (TABLE.z0 + TABLE.z1) / 2;
  return (
    <group position={[x, 0, mid]}>
      <mesh position={[0, TABLE.top - 0.03, 0]}>
        <boxGeometry args={[TABLE.width, 0.06, len]} />
        {mat}
      </mesh>
      {[-len / 2 + 0.4, -len / 6, len / 6, len / 2 - 0.4].map((z) => (
        <mesh key={z} position={[0, (TABLE.top - 0.06) / 2, z]}>
          <boxGeometry args={[0.7, TABLE.top - 0.06, 0.08]} />
          {mat}
        </mesh>
      ))}
      {/* bancs de part et d'autre */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.68, 0, 0]}>
          <mesh position={[0, 0.44, 0]}>
            <boxGeometry args={[0.3, 0.05, len - 0.2]} />
            {mat}
          </mesh>
          {[-len / 2 + 0.4, 0, len / 2 - 0.4].map((z) => (
            <mesh key={z} position={[0, 0.21, z]}>
              <boxGeometry args={[0.24, 0.42, 0.06]} />
              {mat}
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/**
 * Une place à table. Libre : assiette et gobelet seuls. Prise par un sujet : feuillet à son titre,
 * cliquable ; chandelle allumée si le sujet a vécu ces derniers jours.
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
  const glow = place && (hovered || selected);
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
      {/* assiette jaune à fond clair, comme celles du réfectoire */}
      <mesh position={[0, 0.006, 0]}>
        <cylinderGeometry args={[0.12, 0.1, 0.012, 28]} />
        <meshStandardMaterial color={glow ? "#f3cf4e" : "#dcb63c"} roughness={0.45} emissive={glow ? "#6a4a08" : "#000000"} />
      </mesh>
      <mesh position={[0, 0.0125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.075, 24]} />
        <meshStandardMaterial color="#f1ead8" roughness={0.5} />
      </mesh>
      {/* gobelet d'étain */}
      <mesh position={[0.17, 0.05, -0.12]}>
        <cylinderGeometry args={[0.03, 0.024, 0.1, 14]} />
        <meshStandardMaterial color="#9a9890" metalness={0.6} roughness={0.4} />
      </mesh>
      {place && card && (
        <>
          {/* feuillet plié en tente, titre vers l'allée */}
          <mesh position={[0, 0.06, 0.2]} rotation={[-0.35, 0, 0]}>
            <planeGeometry args={[0.24, 0.12]} />
            <meshStandardMaterial map={card} roughness={0.9} side={THREE.DoubleSide} emissive={glow ? "#3a2a10" : "#000000"} />
          </mesh>
          {place.active && (
            <group position={[-0.17, 0, -0.12]}>
              <mesh position={[0, 0.008, 0]}>
                <cylinderGeometry args={[0.03, 0.035, 0.016, 12]} />
                <meshStandardMaterial color="#2b2522" metalness={0.7} roughness={0.45} />
              </mesh>
              <group position={[0, 0.016, 0]}>
                <Candle height={0.09} radius={0.016} seed={slot.z} />
              </group>
            </group>
          )}
          {selected && (
            <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.16, 0.2, 32]} />
              <meshBasicMaterial color="#e8c46a" transparent opacity={0.55} toneMapped={false} />
            </mesh>
          )}
        </>
      )}
    </group>
  );
}

/** Couronne de lumière en fer : cercle, chaînes, six chandelles. */
function IronCorona({ z }: { z: number }) {
  const iron = { color: "#231d1a", metalness: 0.75, roughness: 0.45 } as const;
  const y = 3.25;
  const top = HALL.spring + HALL.rise - 0.1;
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, (top + y + 0.9) / 2, 0]}>
        <cylinderGeometry args={[0.012, 0.012, top - y - 0.9, 6]} />
        <meshStandardMaterial {...iron} />
      </mesh>
      {Array.from({ length: 3 }, (_, i) => {
        const a = (i / 3) * Math.PI * 2;
        const from = new THREE.Vector3(Math.cos(a) * 0.62, y, Math.sin(a) * 0.62);
        const to = new THREE.Vector3(0, y + 0.9, 0);
        const mid = from.clone().add(to).multiplyScalar(0.5);
        const len = from.distanceTo(to);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
        return (
          <mesh key={i} position={mid} quaternion={q}>
            <cylinderGeometry args={[0.008, 0.008, len, 5]} />
            <meshStandardMaterial {...iron} />
          </mesh>
        );
      })}
      <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.65, 0.03, 8, 48]} />
        <meshStandardMaterial {...iron} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        return (
          <group key={i} position={[Math.cos(a) * 0.65, y + 0.02, Math.sin(a) * 0.65]}>
            <Candle height={0.14} radius={0.022} seed={i + z} />
          </group>
        );
      })}
    </group>
  );
}

/**
 * Chaire du lecteur, contre le mur gauche : estrade de pierre, garde-corps, escalier.
 * Le vieux moine y recopie le dernier message publié (sa table et son banc sont à son échelle).
 */
function Pulpit({ lector, onLector }: { lector: CopyistNote | null; onLector: () => void }) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const wood = useMemo(() => woodTexture("#4a3020", 91, true), []);
  const stone = <meshStandardMaterial color="#cfc2ab" roughness={0.9} />;
  const F = PULPIT.floor;
  const W = HALL.half - 2.9; // profondeur de l'estrade depuis le mur
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
      <mesh position={[-HALL.half + W / 2, F / 2, PULPIT.z]}>
        <boxGeometry args={[W, F, 2]} />
        {stone}
      </mesh>
      <mesh position={[-HALL.half + W - 0.05, F + 0.36, PULPIT.z]}>
        <boxGeometry args={[0.1, 0.72, 2]} />
        {stone}
      </mesh>
      {/* moulures : appui du garde-corps et corniche de l'estrade */}
      <mesh position={[-HALL.half + W - 0.05, F + 0.74, PULPIT.z]}>
        <boxGeometry args={[0.18, 0.06, 2.06]} />
        <meshStandardMaterial color="#bdae94" roughness={0.85} />
      </mesh>
      <mesh position={[-HALL.half + W / 2 + 0.03, F - 0.04, PULPIT.z]}>
        <boxGeometry args={[W + 0.08, 0.1, 2.08]} />
        <meshStandardMaterial color="#bdae94" roughness={0.85} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-HALL.half + W / 2, F + 0.36, PULPIT.z + s * 0.97]}>
          <boxGeometry args={[W, 0.72, 0.06]} />
          {stone}
        </mesh>
      ))}
      {/* escalier vers l'entrée */}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[-HALL.half + 0.55, (F * (i + 1)) / 10, PULPIT.z - 1.1 - (4 - i) * 0.26]}>
          <boxGeometry args={[1, (F * (i + 1)) / 5, 0.26]} />
          {stone}
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
        <mesh position={[0, 0.53, 1.02]}>
          <boxGeometry args={[0.7, 0.05, 0.34]} />
          <meshStandardMaterial map={wood} color="#7a5638" roughness={0.65} />
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
