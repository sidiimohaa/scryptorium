"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are mutated imperatively inside useFrame, as R3F intends. */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor, Sparkles, useCursor } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useParisDaylight, type Daylight } from "@/lib/daylight";
import { DayNightGlass, SkyTone, lerp, mix } from "./DayNight";
import { Candle } from "./LibraryScene";
import { MaestreGardien, type GardienGoal } from "./MaestreGardien";
import { Reflections } from "./RefectoryScene";
import { flagstoneTexture, generatedCoverTexture, limestoneTexture, resolveFonts, woodTexture, type Fonts } from "./textures";

/**
 * Le trésor de l'abbaye : une petite salle voûtée de pierre, contre l'église, où les coups de cœur
 * du bibliothécaire sont exposés comme des objets précieux. Chaque livre repose debout sur un coussin
 * de velours, sous une vitrine de verre cerclée de laiton, en deux rangées le long d'une allée.
 * Au fond, une châsse dorée sur une crédence, entre deux cierges. Le Maestre, gardien du trésor, veille
 * debout devant elle, lanterne levée et clés à la main ; quand on choisit une vitrine, il va s'y placer et
 * l'éclaire de sa lanterne. Une vitrine se choisit d'un clic.
 */

export type TreasureBook = { id: string; title: string; author: string; year: number | null; color: string; coverUrl: string | null };

type Props = {
  books: TreasureBook[];
  selected: string | null;
  onSelect: (id: string) => void;
  lowPower: boolean;
  onDecline: () => void;
  onReady?: () => void;
};

const HALF = 3.1;
const Z0 = -4.5;
const STEP = 1.45;
const FIRST = -2;
const ROW_X = 1.55;
const SPRING = 2.7;
const RISE = 1.6;
const PLINTH = 0.95;

/** Emplacements des vitrines : deux rangées face à l'allée, légèrement tournées vers l'entrée. */
function slots(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    const z = FIRST + Math.floor(i / 2) * STEP;
    // l'avant de la vitrine (+z local) regarde l'allée, tourné vers l'entrée
    return { x: side * ROW_X, z, ry: side > 0 ? -(Math.PI / 2 + 0.45) : Math.PI / 2 + 0.45, side };
  });
}

/**
 * Où se tient le gardien : à son poste devant la châsse, tourné vers l'entrée ; ou, quand une vitrine est
 * choisie, à son côté gauche (vu de l'entrée), un peu en retrait, tourné vers le livre.
 */
function gardienGoal(slot: { x: number; z: number } | null, z1: number): GardienGoal {
  if (!slot) return { stand: { x: 0, z: z1 - 1.6 }, look: { x: 0, z: -20 } };
  // +x apparaît à gauche de l'écran depuis l'entrée : le gardien reste du côté opposé au panneau
  return { stand: { x: slot.x + 0.68, z: slot.z + 0.5 }, look: { x: slot.x, z: slot.z } };
}

export default function TresorScene(props: Props) {
  const { lowPower } = props;
  return (
    <Canvas
      dpr={lowPower ? 1 : [1, 1.75]}
      gl={{ antialias: !lowPower, powerPreference: "high-performance" }}
      camera={{ fov: 52, near: 0.05, far: 50, position: [0, 2.2, -4.2] }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
        scene.background = new THREE.Color("#0b0908");
        scene.fog = new THREE.Fog("#0b0908", 9, 22);
      }}
    >
      <PerformanceMonitor onDecline={props.onDecline} />
      <Treasury {...props} />
    </Canvas>
  );
}

function Treasury({ books, selected, onSelect, lowPower, onReady }: Props) {
  const fonts = useMemo(() => resolveFonts(), []);
  const dl = useParisDaylight();
  const ready = useRef(false);
  useFrame(() => {
    if (!ready.current) {
      ready.current = true;
      onReady?.();
    }
  });
  // au moins deux vitrines, même vides : la salle ne paraît pas abandonnée
  const count = Math.max(2, books.length);
  const places = useMemo(() => slots(count), [count]);
  const z1 = FIRST + Math.ceil(count / 2) * STEP + 1.6;
  const selIndex = selected ? books.findIndex((b) => b.id === selected) : -1;
  return (
    <>
      <Reflections intensity={lerp(0.12, 0.3, dl.sun)} />
      <SkyTone daylight={dl} day="#1a1410" night="#0a0807" />
      <CameraRig focus={selIndex >= 0 ? places[selIndex] : null} z1={z1} />
      <Lights daylight={dl} z1={z1} lowPower={lowPower} />
      <Room z1={z1} daylight={dl} />
      {places.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.ry, 0]}>
          <Showcase book={books[i] ?? null} fonts={fonts} selected={books[i]?.id === selected} onSelect={onSelect} />
        </group>
      ))}
      <group position={[0, 0, z1 - 0.55]}>
        <Credence />
      </group>
      {/* le Maestre, gardien du trésor : à son poste devant la châsse, ou près de la vitrine choisie */}
      <MaestreGardien goal={gardienGoal(selIndex >= 0 ? places[selIndex] : null, z1)} start={{ x: 0, z: z1 - 1.6 }} />
      {!lowPower && <Sparkles count={60} scale={[4, 2.5, z1 - Z0 - 2]} position={[0, 1.7, (Z0 + z1) / 2]} size={1.4} speed={0.08} opacity={0.35} color="#f6e2b8" noise={0.5} />}
    </>
  );
}

/* ─── Caméra : l'allée depuis la porte, ou face à la vitrine choisie ─── */

function CameraRig({ focus, z1 }: { focus: { x: number; z: number; side: number } | null; z1: number }) {
  const { camera, pointer, size } = useThree();
  const look = useRef(new THREE.Vector3(0, 1.2, 2));
  const pos = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  useLayoutEffect(() => {
    camera.position.set(0, 2.2, -4.2);
    camera.lookAt(look.current);
  }, [camera]);
  useFrame((_, dt) => {
    const narrow = size.width < 768;
    let parallax = 0.18;
    if (focus) {
      // depuis l'allée, un peu en avant de la vitrine ; décalé pour laisser le panneau à droite
      pos.set(focus.x * 0.05 + (narrow ? 0 : 0.25), 1.6, focus.z - 1.05);
      target.set(focus.x * 0.82 - (narrow ? 0 : 0.2), PLINTH + 0.25, focus.z + 0.1);
      parallax = 0.04;
    } else {
      pos.set(narrow ? 0 : 0.6, narrow ? 2.3 : 2.05, narrow ? -4.4 : -4.0);
      target.set(narrow ? 0 : -0.55, 1.25, Math.min(z1 - 1, 3.5));
    }
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

/* ─── Lumière : cierges du fond, lampes sur l'allée, jour ou lune par les oculi ─── */

function Lights({ daylight: d, z1, lowPower }: { daylight: Daylight; z1: number; lowPower: boolean }) {
  const altar = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (altar.current) altar.current.intensity = 4 * (1 + Math.sin(t * 8.3) * 0.05 + Math.sin(t * 19.1) * 0.04);
  });
  const lamps = lowPower ? [(Z0 + z1) / 2] : [-1.2, 1.6, 4.4].filter((z) => z < z1 - 1);
  return (
    <>
      <ambientLight color="#ffd6a8" intensity={lerp(0.1, 0.24, d.sun)} />
      <hemisphereLight args={[mix("#3a4560", "#eadcbe", d.sun), "#2a1a10", lerp(0.2, 0.55, d.sun)]} />
      <directionalLight color={mix("#8fa6d6", "#ffe6bf", d.sun).lerp(new THREE.Color("#ffad66"), d.warm * 0.6)} intensity={lerp(0.25, 1.2, d.sun)} position={[5, 6, 1]} />
      <pointLight ref={altar} color="#ffa95a" position={[0, 1.7, z1 - 1.1]} distance={5} decay={1.5} />
      {/* lampes suspendues au-dessus de l'allée : elles font briller le verre et le laiton */}
      {lamps.map((z) => (
        <pointLight key={z} color="#ffd29a" intensity={lerp(3.2, 2.2, d.sun)} position={[0, 2.5, z]} distance={4.5} decay={1.5} />
      ))}
    </>
  );
}

/* ─── Salle : dallage, murs, voûte en berceau, arcs, oculi ─── */

function Room({ z1, daylight }: { z1: number; daylight: Daylight }) {
  const len = z1 - Z0;
  const midZ = (Z0 + z1) / 2;
  const tex = useMemo(
    () => ({
      floor: flagstoneTexture(61, [3, len / 1.8]),
      wall: limestoneTexture(67, [len / 2.2, SPRING / 2.2]),
      end: limestoneTexture(71, [(HALF * 2) / 2.2, (SPRING + RISE) / 2.2]),
      vault: limestoneTexture(73, [(Math.PI * HALF) / 2.2, len / 2.2]),
    }),
    [len],
  );
  const vault = useMemo(() => {
    const g = new THREE.CylinderGeometry(HALF, HALF, len, 40, 1, true, Math.PI / 2, Math.PI);
    g.rotateX(Math.PI / 2);
    return g;
  }, [len]);
  const gable = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-HALF, 0);
    s.lineTo(HALF, 0);
    s.lineTo(HALF, SPRING);
    for (let k = 1; k <= 24; k++) {
      const a = (k / 24) * Math.PI;
      s.lineTo(Math.cos(a) * HALF, SPRING + Math.sin(a) * RISE);
    }
    s.lineTo(-HALF, 0);
    return new THREE.ShapeGeometry(s, 1);
  }, []);
  const arches = useMemo(() => {
    const out: number[] = [];
    for (let z = FIRST - STEP / 2 - 0.4; z < z1 - 0.3; z += STEP * 2) out.push(z);
    return out;
  }, [z1]);
  const stone = { color: "#cbb895", roughness: 0.9 } as const;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, midZ]}>
        <planeGeometry args={[HALF * 2, len]} />
        <meshStandardMaterial map={tex.floor} color="#b8a88e" roughness={0.6} />
      </mesh>
      {/* tapis étroit le long de l'allée */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, midZ + 0.3]}>
        <planeGeometry args={[0.9, len - 2.2]} />
        <meshStandardMaterial color="#5a1a1e" roughness={0.95} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`b${s}`} rotation={[-Math.PI / 2, 0, 0]} position={[s * 0.4, 0.005, midZ + 0.3]}>
          <planeGeometry args={[0.04, len - 2.2]} />
          <meshStandardMaterial color="#b08a45" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * HALF, SPRING / 2, midZ]} rotation={[0, -s * (Math.PI / 2), 0]}>
          <planeGeometry args={[len, SPRING]} />
          <meshStandardMaterial map={tex.wall} color="#d9c7a5" roughness={0.92} />
        </mesh>
      ))}
      <mesh geometry={gable} position={[0, 0, z1]} rotation={[0, Math.PI, 0]}>
        <meshStandardMaterial map={tex.end} color="#d9c7a5" roughness={0.92} />
      </mesh>
      <mesh geometry={gable} position={[0, 0, Z0]}>
        <meshStandardMaterial map={tex.end} color="#d9c7a5" roughness={0.92} />
      </mesh>
      <mesh geometry={vault} position={[0, SPRING, midZ]} scale={[1, RISE / HALF, 1]}>
        <meshStandardMaterial map={tex.vault} color="#cdb994" side={THREE.BackSide} roughness={0.95} />
      </mesh>
      {arches.map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, SPRING, 0]} scale={[1, RISE / HALF, 1]}>
            <torusGeometry args={[HALF - 0.1, 0.12, 4, 32, Math.PI]} />
            <meshStandardMaterial {...stone} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (HALF - 0.1), SPRING / 2, 0]}>
              <boxGeometry args={[0.24, SPRING, 0.32]} />
              <meshStandardMaterial {...stone} />
            </mesh>
          ))}
        </group>
      ))}
      {/* oculi : un petit vitrail rond dans chaque pignon */}
      {[
        { z: z1 - 0.03, r: Math.PI },
        { z: Z0 + 0.03, r: 0 },
      ].map((o) => (
        <group key={o.z} position={[0, SPRING + 0.75, o.z]} rotation={[0, o.r, 0]}>
          <DayNightGlass daylight={daylight} w={0.7} h={0.7} />
          <mesh position={[0, 0, 0.02]}>
            <torusGeometry args={[0.38, 0.06, 6, 28]} />
            <meshStandardMaterial {...stone} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ─── Vitrine : socle de chêne, coussin de velours, livre debout, cloche de verre cerclée de laiton ─── */

const brassMat = () => new THREE.MeshStandardMaterial({ color: "#c9a24a", metalness: 0.85, roughness: 0.28 });
let shared: { brass: THREE.MeshStandardMaterial; glass: THREE.MeshPhysicalMaterial; velvet: THREE.MeshPhysicalMaterial } | null = null;
const mats = () =>
  (shared ??= {
    brass: brassMat(),
    glass: new THREE.MeshPhysicalMaterial({ color: "#eef4ff", roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }),
    velvet: new THREE.MeshPhysicalMaterial({ color: "#5c1220", roughness: 0.82, sheen: 1, sheenColor: new THREE.Color("#ff6a6a"), sheenRoughness: 0.45 }),
  });

function Showcase({ book, fonts, selected, onSelect }: { book: TreasureBook | null; fonts: Fonts; selected: boolean; onSelect: (id: string) => void }) {
  const m = mats();
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && Boolean(book));
  const wood = useMemo(() => woodTexture("#5a3a24", 79, true), []);
  const cover = useMemo(() => {
    if (!book) return null;
    return new THREE.MeshStandardMaterial({ map: generatedCoverTexture(book.title, book.author, book.year, book.color, fonts), roughness: 0.55 });
  }, [book, fonts]);
  useEffect(() => {
    if (!book?.coverUrl || !cover) return;
    let alive = true;
    const w = book.coverUrl.startsWith("/uploads/") ? 640 : 384;
    new THREE.TextureLoader().load(`/_next/image?url=${encodeURIComponent(book.coverUrl)}&w=${w}&q=75`, (t) => {
      if (!alive) return t.dispose();
      t.colorSpace = THREE.SRGBColorSpace;
      cover.map?.dispose();
      cover.map = t;
      cover.needsUpdate = true;
    }, undefined, () => {});
    return () => {
      alive = false;
    };
  }, [book?.coverUrl, cover]);
  useEffect(() => () => { cover?.map?.dispose(); cover?.dispose(); }, [cover]);
  const bodyMats = useMemo(() => {
    if (!book || !cover) return null;
    const cloth = new THREE.MeshStandardMaterial({ color: book.color, roughness: 0.7 });
    const pages = new THREE.MeshStandardMaterial({ color: "#e8dcc0", roughness: 0.9 });
    // faces d'une boîte : +x, −x, +y, −y, +z (couverture, vers l'allée), −z
    return [pages, cloth, pages, pages, cover, cloth];
  }, [book, cover]);
  const glow = hovered || selected;
  const W = 0.62;
  const D = 0.5;
  const H = 0.62;
  return (
    <group
      onClick={(e) => {
        if (!book) return;
        e.stopPropagation();
        onSelect(book.id);
      }}
      onPointerOver={(e) => {
        if (!book) return;
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* socle de chêne mouluré, filet de laiton */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[W + 0.16, 0.08, D + 0.16]} />
        <meshStandardMaterial map={wood} color="#b8844f" roughness={0.5} />
      </mesh>
      <mesh position={[0, PLINTH / 2, 0]}>
        <boxGeometry args={[W, PLINTH - 0.08, D]} />
        <meshStandardMaterial map={wood} color="#c8945e" roughness={0.5} />
      </mesh>
      <mesh position={[0, PLINTH - 0.02, 0]}>
        <boxGeometry args={[W + 0.1, 0.05, D + 0.1]} />
        <meshStandardMaterial map={wood} color="#b8844f" roughness={0.5} />
      </mesh>
      <mesh position={[0, PLINTH + 0.006, 0]} material={m.brass}>
        <boxGeometry args={[W + 0.11, 0.008, D + 0.11]} />
      </mesh>
      {/* coussin de velours */}
      <mesh position={[0, PLINTH + 0.04, 0]} material={m.velvet} scale={[1, 0.3, 0.85]}>
        <sphereGeometry args={[0.23, 24, 14]} />
      </mesh>
      {/* le livre, debout et un peu incliné, couverture vers l'allée */}
      {book && bodyMats && (
        <group position={[0, PLINTH + 0.07, -0.05]} rotation={[-0.2, 0, 0]}>
          <mesh position={[0, 0.225, 0]} material={bodyMats}>
            <boxGeometry args={[0.32, 0.45, 0.055]} />
          </mesh>
        </group>
      )}
      {/* cloche de verre et montants de laiton */}
      <mesh position={[0, PLINTH + H / 2 + 0.01, 0]} material={m.glass}>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} position={[sx * W / 2, PLINTH + H / 2 + 0.01, sz * D / 2]} material={m.brass}>
          <boxGeometry args={[0.018, H, 0.018]} />
        </mesh>
      )))}
      {[-1, 1].map((sz) => (
        <mesh key={`t${sz}`} position={[0, PLINTH + H + 0.01, sz * D / 2]} material={m.brass}>
          <boxGeometry args={[W + 0.018, 0.018, 0.018]} />
        </mesh>
      ))}
      {[-1, 1].map((sx) => (
        <mesh key={`u${sx}`} position={[sx * W / 2, PLINTH + H + 0.01, 0]} material={m.brass}>
          <boxGeometry args={[0.018, 0.018, D + 0.018]} />
        </mesh>
      ))}
      {glow && (
        <mesh position={[0, PLINTH + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.34, 40]} />
          <meshBasicMaterial color="#f0cf78" transparent opacity={0.7} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/* ─── Au fond : crédence de pierre, châsse dorée, deux cierges ─── */

function Credence() {
  const m = mats();
  const roof = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.24, 0);
    s.lineTo(0.24, 0);
    s.lineTo(0, 0.2);
    s.lineTo(-0.24, 0);
    return new THREE.ExtrudeGeometry(s, { depth: 0.62, bevelEnabled: false });
  }, []);
  return (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.8, 1, 0.6]} />
        <meshStandardMaterial color="#cdb994" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.02, 0]}>
        <boxGeometry args={[1.9, 0.06, 0.66]} />
        <meshStandardMaterial color="#d9c7a5" roughness={0.85} />
      </mesh>
      {/* la châsse : coffret à toit en bâtière, laiton doré, arcatures */}
      <group position={[0, 1.05, 0]}>
        <mesh position={[0, 0.17, 0]} material={m.brass}>
          <boxGeometry args={[0.62, 0.34, 0.42]} />
        </mesh>
        <mesh geometry={roof} position={[0.31, 0.34, 0]} rotation={[0, -Math.PI / 2, 0]} material={m.brass} />
        {[-0.2, -0.07, 0.07, 0.2].map((x) => (
          <mesh key={x} position={[x, 0.17, -0.215]}>
            <boxGeometry args={[0.08, 0.22, 0.01]} />
            <meshStandardMaterial color="#5c1220" roughness={0.6} />
          </mesh>
        ))}
        {[-0.3, 0.3].map((x) => (
          <mesh key={x} position={[x, 0.56, 0]} material={m.brass}>
            <sphereGeometry args={[0.035, 12, 10]} />
          </mesh>
        ))}
      </group>
      {[-0.7, 0.7].map((x) => (
        <group key={x} position={[x, 1.05, 0]}>
          <mesh position={[0, 0.1, 0]} material={m.brass}>
            <cylinderGeometry args={[0.02, 0.06, 0.2, 12]} />
          </mesh>
          <group position={[0, 0.2, 0]}>
            <Candle height={0.32} radius={0.03} seed={x * 10} />
          </group>
        </group>
      ))}
    </group>
  );
}
