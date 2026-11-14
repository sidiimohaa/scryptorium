"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are mutated imperatively inside useFrame, as R3F intends. */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor, Sparkles, useCursor } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Candelabra } from "./LibraryScene";
import { mats, Reflections } from "./RefectoryScene";
import { generatedCoverTexture, limestoneTexture, resolveFonts, terracottaTexture, woodTexture, type Fonts } from "./textures";

/**
 * La salle capitulaire : salle claire de neuf travées voûtées d'ogives, portées par quatre colonnes à
 * chapiteaux feuillagés. Au fond et à droite, de grandes baies brisées sur parapet, fermées de grilles
 * de fer, ouvrent sur le jardin du cloître ; le soleil y entre et dessine des flaques de lumière sur les
 * tomettes. Pendant le vote, chaque livre candidat est posé sur un lutrin au centre, avec à ses pieds un
 * jeton d'or par voix réelle. Pendant la lecture, le livre du mois trône seul sur le grand lutrin.
 */

export type ClubBook = { id: string; title: string; author: string; year: number | null; coverUrl: string | null; votes: number };

type Props = {
  mode: "voting" | "reading" | "none";
  books: ClubBook[];
  selected: string | null;
  onSelect: (id: string) => void;
  lowPower: boolean;
  onDecline: () => void;
  onReady?: () => void;
};

/* Plan : 3 × 3 travées de 3 m. Murs en x = ±4.5, z = −6 (entrée) et z = 3 (fond, côté jardin). */
const BAY = 3;
const HW = BAY / 2;
const X_LINES = [-4.5, -1.5, 1.5, 4.5];
const Z_LINES = [-6, -3, 0, 3];
const BAY_X = [-3, 0, 3];
const BAY_Z = [-4.5, -1.5, 1.5];
const CENTER_Z = -1.5;
const SPRING = 2.7; // naissance des voûtes (haut des tailloirs)
const RR = 1.4; // rayon relatif des arcs brisés (1 = plein cintre)
const WALL_T = 0.45;
/* Baies : parapet, largeur et naissance de l'arc brisé. */
const SILL = 0.85;
const OPEN_HW = 1.05;
const OPEN_SPRING = 2.45;

/** Hauteur d'un arc brisé de demi-portée `hw` au point relatif t ∈ [−1, 1]. */
function arch(t: number, hw = HW) {
  const d = Math.abs(t) + RR - 1;
  return hw * Math.sqrt(Math.max(0, RR * RR - d * d));
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lutrins des candidats : une rangée légèrement cintrée au centre de la salle, tournée vers l'entrée. */
function lecternSlots(n: number) {
  const step = n > 1 ? Math.min(0.85, 3.0 / (n - 1)) : 0;
  return Array.from({ length: n }, (_, i) => {
    const x = (i - (n - 1) / 2) * step;
    return { x, z: CENTER_Z - 0.12 * x * x, ry: Math.atan2(x, 3.5) };
  });
}

/* Matières de pierre, créées une fois. */
let stoneMats: ReturnType<typeof makeStone> | null = null;
function makeStone() {
  const wallTex = limestoneTexture(71, [0.4, 0.4]);
  const vaultTex = limestoneTexture(73, [0.45, 0.45]);
  return {
    wall: new THREE.MeshStandardMaterial({ map: wallTex, color: "#e2c79c", roughness: 0.92 }),
    vault: new THREE.MeshStandardMaterial({ map: vaultTex, color: "#e6cca2", roughness: 0.95, side: THREE.DoubleSide, shadowSide: THREE.DoubleSide }),
    rib: new THREE.MeshStandardMaterial({ color: "#d4b98c", roughness: 0.85 }),
    column: new THREE.MeshStandardMaterial({ color: "#c9ae86", roughness: 0.6 }),
    carved: new THREE.MeshStandardMaterial({ color: "#d9be93", roughness: 0.8 }),
    iron: new THREE.MeshStandardMaterial({ color: "#26221e", metalness: 0.6, roughness: 0.55 }),
  };
}
const stone = () => (stoneMats ??= makeStone());

export default function CapitularyScene(props: Props) {
  const { lowPower } = props;
  return (
    <Canvas
      shadows
      dpr={lowPower ? 1 : [1, 1.75]}
      gl={{ antialias: !lowPower, powerPreference: "high-performance" }}
      camera={{ fov: 55, near: 0.05, far: 80, position: [-0.3, 1.8, -5.6] }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
        scene.background = new THREE.Color("#d9e1e4");
        scene.fog = new THREE.Fog("#d9e1e4", 16, 46);
      }}
    >
      <PerformanceMonitor onDecline={props.onDecline} />
      <Chapter {...props} />
    </Canvas>
  );
}

function Chapter({ mode, books, selected, onSelect, lowPower, onReady }: Props) {
  const fonts = useMemo(() => resolveFonts(), []);
  const ready = useRef(false);
  useFrame(() => {
    if (!ready.current) {
      ready.current = true;
      onReady?.();
    }
  });
  const slots = useMemo(() => lecternSlots(mode === "voting" ? books.length : 0), [mode, books.length]);
  const selIndex = selected ? books.findIndex((b) => b.id === selected) : -1;
  return (
    <>
      <Reflections />
      <CameraRig focus={mode === "voting" && selIndex >= 0 ? slots[selIndex] : null} />
      <Sun lowPower={lowPower} />
      <Hall />
      <Garden lowPower={lowPower} />
      {mode === "voting" &&
        books.map((b, i) => (
          <group key={b.id} position={[slots[i].x, 0, slots[i].z]} rotation={[0, slots[i].ry, 0]}>
            <Lectern book={b} fonts={fonts} selected={b.id === selected} onSelect={onSelect} tokens={b.votes} />
          </group>
        ))}
      {mode === "reading" && books[0] && (
        <group position={[0, 0, CENTER_Z]}>
          <Lectern book={books[0]} fonts={fonts} selected={false} onSelect={onSelect} tokens={0} grand />
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.75, 0, 0.1]}>
              <mesh position={[0, 0.5, 0]} material={mats().gold} castShadow>
                <cylinderGeometry args={[0.03, 0.06, 1, 12]} />
              </mesh>
              <group position={[0, 1, 0]} scale={2}>
                <Candelabra />
              </group>
            </group>
          ))}
        </group>
      )}
      {mode === "none" && (
        <group position={[0, 0, CENTER_Z]}>
          <Lectern book={null} fonts={fonts} selected={false} onSelect={onSelect} tokens={0} grand />
        </group>
      )}
      {/* poussière dorée dans les rais de soleil */}
      {!lowPower && <Sparkles count={90} scale={[8, 3.6, 8]} position={[0.5, 1.9, CENTER_Z + 1]} size={1.6} speed={0.08} opacity={0.45} color="#fff1d2" noise={0.6} />}
    </>
  );
}

function CameraRig({ focus }: { focus: { x: number; z: number; ry: number } | null }) {
  const { camera, pointer, size } = useThree();
  const look = useRef(new THREE.Vector3(0, 1.9, 1.5));
  const pos = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  useLayoutEffect(() => {
    camera.position.set(-0.3, 1.8, -5.6);
    camera.lookAt(look.current);
  }, [camera]);
  useFrame((_, dt) => {
    const narrow = size.width < 768;
    let parallax = 0.2;
    if (focus) {
      // Face au lutrin choisi, un peu au-dessus ; décalé pour laisser le panneau à droite.
      const fx = -Math.sin(focus.ry);
      const fz = -Math.cos(focus.ry);
      pos.set(focus.x + fx * 1.35 - (narrow ? 0 : 0.35), 1.75, focus.z + fz * 1.35);
      target.set(focus.x - (narrow ? 0 : 0.3), 1.05, focus.z);
      parallax = 0.04;
    } else {
      pos.set(narrow ? 0 : -0.3, narrow ? 2.0 : 1.8, -5.6);
      target.set(narrow ? 0 : 0.45, 1.95, 1.5);
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

/** Soleil d'après-midi qui entre par les baies du fond et de droite, et lumière renvoyée par la pierre. */
function Sun({ lowPower }: { lowPower: boolean }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  useLayoutEffect(() => {
    const l = sun.current;
    if (!l) return;
    l.target.position.set(0, 0, CENTER_Z);
    l.target.updateMatrixWorld();
    const cam = l.shadow.camera;
    cam.left = -9;
    cam.right = 9;
    cam.top = 9;
    cam.bottom = -9;
    cam.near = 1;
    cam.far = 40;
    cam.updateProjectionMatrix();
  }, []);
  return (
    <>
      <ambientLight color="#fff1dc" intensity={0.15} />
      <hemisphereLight args={["#e3ecf2", "#b8784a", 0.55]} />
      <directionalLight
        ref={sun}
        color="#fff0d2"
        intensity={4.2}
        position={[8, 8.5, 9]}
        castShadow
        shadow-mapSize-width={lowPower ? 1024 : 2048}
        shadow-mapSize-height={lowPower ? 1024 : 2048}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      {/* lumière chaude renvoyée par le sol ensoleillé */}
      <pointLight color="#ffd3a0" intensity={4} position={[0.5, 0.6, 0.5]} distance={9} decay={1.4} />
    </>
  );
}

/** La salle : sol de tomettes, voûtes d'ogives, colonnes, murs percés de baies et banc de pierre. */
function Hall() {
  const s = stone();
  const floorTex = useMemo(() => terracottaTexture(79, [5.6, 5.6]), []);
  const vault = useMemo(() => {
    const N = 24;
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    for (const bx of BAY_X) {
      for (const bz of BAY_Z) {
        const base = pos.length / 3;
        for (let j = 0; j <= N; j++) {
          for (let i = 0; i <= N; i++) {
            const u = -1 + (2 * i) / N;
            const v = -1 + (2 * j) / N;
            // Voûte d'arêtes : intersection de deux berceaux brisés, d'où le max des deux profils.
            const x = bx + u * HW;
            const z = bz + v * HW;
            pos.push(x, SPRING + Math.max(arch(u), arch(v)), z);
            uv.push(x / 2.5, z / 2.5);
          }
        }
        for (let j = 0; j < N; j++) {
          for (let i = 0; i < N; i++) {
            const a = base + j * (N + 1) + i;
            const b = a + 1;
            const c = a + N + 1;
            const d = c + 1;
            idx.push(a, c, b, b, c, d);
          }
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);
  const ribs = useMemo(() => {
    const tube = (pts: THREE.Vector3[], r: number) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, r, 6, false);
    const along = (f: (t: number) => THREE.Vector3) => Array.from({ length: 41 }, (_, k) => f(-1 + k / 20));
    const list: { g: THREE.TubeGeometry; main: boolean }[] = [];
    for (const bx of BAY_X) {
      for (const bz of BAY_Z) {
        // ogives croisées
        list.push({ g: tube(along((t) => new THREE.Vector3(bx + t * HW, SPRING + arch(t) - 0.04, bz + t * HW)), 0.07), main: false });
        list.push({ g: tube(along((t) => new THREE.Vector3(bx + t * HW, SPRING + arch(t) - 0.04, bz - t * HW)), 0.07), main: false });
      }
    }
    // arcs doubleaux et formerets, sur chaque ligne de travée
    for (const x of X_LINES) for (const bz of BAY_Z) list.push({ g: tube(along((t) => new THREE.Vector3(x, SPRING + arch(t) - 0.06, bz + t * HW)), 0.11), main: true });
    for (const z of Z_LINES) for (const bx of BAY_X) list.push({ g: tube(along((t) => new THREE.Vector3(bx + t * HW, SPRING + arch(t) - 0.06, z)), 0.11), main: true });
    return list;
  }, []);
  /* colonnes engagées le long des murs, aux retombées des voûtes */
  const responds = useMemo(() => {
    const r: { x: number; z: number }[] = [];
    for (const x of X_LINES) {
      r.push({ x: x === -4.5 ? x + 0.1 : x === 4.5 ? x - 0.1 : x, z: -6 + 0.1 });
      r.push({ x: x === -4.5 ? x + 0.1 : x === 4.5 ? x - 0.1 : x, z: 3 - 0.1 });
    }
    for (const z of [-3, 0]) {
      r.push({ x: -4.5 + 0.1, z });
      r.push({ x: 4.5 - 0.1, z });
    }
    return r;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, CENTER_Z]} receiveShadow>
        <planeGeometry args={[9, 9]} />
        <meshStandardMaterial map={floorTex} roughness={0.7} />
      </mesh>
      <mesh geometry={vault} material={s.vault} castShadow receiveShadow />
      {ribs.map((r, i) => <mesh key={i} geometry={r.g} material={r.main ? s.rib : s.carved} castShadow />)}
      {/* toit au-dessus des voûtes : arrête le soleil */}
      <mesh position={[0, 5.1, CENTER_Z]} material={s.wall} castShadow>
        <boxGeometry args={[10, 0.3, 10]} />
      </mesh>
      {[-1.5, 1.5].flatMap((x) => [-3, 0].map((z) => <Column key={`${x}${z}`} position={[x, 0, z]} />))}
      {responds.map((p, i) => <Column key={i} position={[p.x, 0, p.z]} slim />)}
      {/* fond (z = 3) : trois baies sur le jardin */}
      {BAY_X.map((x) => (
        <group key={`n${x}`} position={[x, 0, 3]}>
          <ArchWall open />
        </group>
      ))}
      {/* droite (x = 4.5) : trois baies */}
      {BAY_Z.map((z) => (
        <group key={`e${z}`} position={[4.5, 0, z]} rotation={[0, Math.PI / 2, 0]}>
          <ArchWall open />
        </group>
      ))}
      {/* gauche (x = −4.5) : mur plein, banc de pierre des moines */}
      {BAY_Z.map((z) => (
        <group key={`w${z}`} position={[-4.5, 0, z]} rotation={[0, -Math.PI / 2, 0]}>
          <ArchWall />
        </group>
      ))}
      <mesh position={[-4.2, 0.22, CENTER_Z]} material={s.wall} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.44, 9]} />
      </mesh>
      {/* entrée (z = −6) : mur plein */}
      {BAY_X.map((x) => (
        <group key={`s${x}`} position={[x, 0, -6]} rotation={[0, Math.PI, 0]}>
          <ArchWall />
        </group>
      ))}
      {/* piles d'angle */}
      {[-1, 1].flatMap((sx) => [-6, 3].map((z) => (
        <mesh key={`${sx}${z}`} position={[sx * (4.5 + WALL_T / 2), 2.5, z + (z > 0 ? WALL_T / 2 : -WALL_T / 2)]} material={s.wall} castShadow>
          <boxGeometry args={[WALL_T, 5, WALL_T]} />
        </mesh>
      )))}
    </group>
  );
}

/** Colonne : socle octogonal, base moulurée, fût lisse, chapiteau à feuilles et tailloir. */
function Column({ position, slim = false }: { position: [number, number, number]; slim?: boolean }) {
  const s = stone();
  const capital = useMemo(() => {
    const pts = [[0.17, 0], [0.19, 0.06], [0.24, 0.16], [0.3, 0.26], [0.34, 0.32]].map(([r, y]) => new THREE.Vector2(r, y));
    return new THREE.LatheGeometry(pts, 20);
  }, []);
  const k = slim ? 0.75 : 1;
  return (
    <group position={position} scale={[k, 1, k]}>
      <mesh position={[0, 0.15, 0]} material={s.carved} castShadow receiveShadow>
        <cylinderGeometry args={[0.32, 0.34, 0.3, 8]} />
      </mesh>
      <mesh position={[0, 0.33, 0]} rotation={[Math.PI / 2, 0, 0]} material={s.carved} castShadow>
        <torusGeometry args={[0.2, 0.045, 8, 24]} />
      </mesh>
      <mesh position={[0, 1.27, 0]} material={s.column} castShadow receiveShadow>
        <cylinderGeometry args={[0.155, 0.17, 1.9, 20]} />
      </mesh>
      <group position={[0, 2.2, 0]}>
        <mesh geometry={capital} material={s.carved} castShadow />
        {/* feuilles d'acanthe recourbées */}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.sin(a) * 0.25, 0.17, Math.cos(a) * 0.25]} rotation={[0, a, 0.0]} scale={[0.07, 0.13, 0.05]} material={s.carved} castShadow>
              <sphereGeometry args={[1, 8, 6]} />
            </mesh>
          );
        })}
      </group>
      <mesh position={[0, 2.61, 0]} material={s.carved} castShadow>
        <cylinderGeometry args={[0.4, 0.36, 0.18, 8]} />
      </mesh>
    </group>
  );
}

/**
 * Pan de mur d'une travée, de 3 m, fermé en haut par l'arc formeret. Ouvert : baie brisée sur parapet,
 * garnie d'une grille de barreaux de fer avec un anneau à croix. Face intérieure à z = 0 (repère local).
 */
function ArchWall({ open = false }: { open?: boolean }) {
  const s = stone();
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-HW, 0);
    shape.lineTo(HW, 0);
    shape.lineTo(HW, SPRING);
    for (let k = 1; k <= 40; k++) {
      const t = 1 - k / 20;
      shape.lineTo(t * HW, SPRING + arch(t));
    }
    shape.lineTo(-HW, 0);
    if (open) {
      const hole = new THREE.Path();
      hole.moveTo(-OPEN_HW, SILL);
      hole.lineTo(-OPEN_HW, OPEN_SPRING);
      for (let k = 1; k <= 40; k++) {
        const t = -1 + k / 20;
        hole.lineTo(t * OPEN_HW, OPEN_SPRING + arch(t, OPEN_HW));
      }
      hole.lineTo(OPEN_HW, SILL);
      hole.lineTo(-OPEN_HW, SILL);
      shape.holes.push(hole);
    }
    return new THREE.ExtrudeGeometry(shape, { depth: WALL_T, bevelEnabled: false, curveSegments: 1 });
  }, [open]);
  const bars = useMemo(() => {
    if (!open) return [];
    const list: { x: number; h: number }[] = [];
    for (let x = -OPEN_HW + 0.17; x < OPEN_HW - 0.1; x += 0.19) {
      const top = OPEN_SPRING + arch(x / OPEN_HW, OPEN_HW);
      list.push({ x, h: top - SILL });
    }
    return list;
  }, [open]);
  return (
    <group>
      <mesh geometry={geo} material={s.wall} castShadow receiveShadow />
      {open && (
        <group position={[0, 0, WALL_T * 0.55]}>
          {bars.map((b) => (
            <mesh key={b.x} position={[b.x, SILL + b.h / 2, 0]} material={s.iron} castShadow>
              <cylinderGeometry args={[0.012, 0.012, b.h, 6]} />
            </mesh>
          ))}
          <mesh position={[0, OPEN_SPRING, 0]} material={s.iron} castShadow>
            <boxGeometry args={[OPEN_HW * 2, 0.03, 0.03]} />
          </mesh>
          <mesh position={[0, OPEN_SPRING + 0.75, 0]} material={s.iron} castShadow>
            <torusGeometry args={[0.3, 0.018, 8, 40]} />
          </mesh>
          <mesh position={[0, OPEN_SPRING + 0.75, 0]} material={s.iron} castShadow>
            <boxGeometry args={[0.6, 0.025, 0.025]} />
          </mesh>
          <mesh position={[0, OPEN_SPRING + 0.75, 0]} material={s.iron} castShadow>
            <boxGeometry args={[0.025, 0.6, 0.025]} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** Le jardin du cloître, derrière les baies : gazon, allée de gravier, massifs, ifs, galerie au loin. */
function Garden({ lowPower }: { lowPower: boolean }) {
  const s = stone();
  const bushes = useMemo(() => {
    const r = rng(83);
    const list: { p: [number, number, number]; s: number; c: string }[] = [];
    const greens = ["#3d5a28", "#4f6d33", "#2e4620", "#5d7a3b"];
    const add = (x0: number, x1: number, z0: number, z1: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const sc = 0.5 + r() * 0.8;
        list.push({ p: [x0 + r() * (x1 - x0), sc * 0.6, z0 + r() * (z1 - z0)], s: sc, c: greens[Math.floor(r() * greens.length)] });
      }
    };
    add(-6, 7, 5.5, 8.5, lowPower ? 14 : 30);
    add(6.5, 9.5, -7, 6, lowPower ? 12 : 26);
    return list;
  }, [lowPower]);
  const yews = useMemo(() => {
    const r = rng(89);
    return Array.from({ length: 9 }, (_, i) => ({ x: i < 5 ? -5 + i * 2.6 + r() : 9 + r(), z: i < 5 ? 9 + r() * 1.5 : -5 + (i - 5) * 3 + r(), h: 3.5 + r() * 2 }));
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[90, 90]} />
        <meshStandardMaterial color="#76824f" roughness={1} />
      </mesh>
      {/* allée de gravier le long des baies */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1, -0.01, 4.4]} receiveShadow>
        <planeGeometry args={[14, 1.9]} />
        <meshStandardMaterial color="#cdbf9f" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5.6, -0.01, -1]} receiveShadow>
        <planeGeometry args={[1.9, 12]} />
        <meshStandardMaterial color="#cdbf9f" roughness={1} />
      </mesh>
      {bushes.map((b, i) => (
        <mesh key={i} position={b.p} scale={[b.s, b.s * 0.85, b.s]} castShadow receiveShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={b.c} roughness={0.95} flatShading />
        </mesh>
      ))}
      {yews.map((y, i) => (
        <mesh key={i} position={[y.x, y.h / 2, y.z]} castShadow>
          <coneGeometry args={[0.8, y.h, 9]} />
          <meshStandardMaterial color="#26391c" roughness={1} flatShading />
        </mesh>
      ))}
      {/* galeries du cloître au loin */}
      <mesh position={[1, 2, 12]} material={s.wall} receiveShadow>
        <boxGeometry args={[30, 4, 0.6]} />
      </mesh>
      <mesh position={[12.5, 2, 0]} material={s.wall} receiveShadow>
        <boxGeometry args={[0.6, 4, 26]} />
      </mesh>
    </group>
  );
}

/**
 * Lutrin de bois sculpté portant un livre ouvert sur sa couverture. Au pied, un jeton d'or par voix.
 * Cliquable pendant le vote.
 */
function Lectern({ book, fonts, selected, onSelect, tokens, grand = false }: {
  book: ClubBook | null;
  fonts: Fonts;
  selected: boolean;
  onSelect: (id: string) => void;
  tokens: number;
  grand?: boolean;
}) {
  const m = mats();
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && Boolean(book) && !grand);
  const wood = useMemo(() => woodTexture("#4a3020", 97, true), []);
  const cover = useMemo(() => {
    if (!book) return null;
    return new THREE.MeshStandardMaterial({ map: generatedCoverTexture(book.title, book.author, book.year, "#5a1a22", fonts), roughness: 0.6 });
  }, [book, fonts]);
  useEffect(() => {
    if (!book?.coverUrl || !cover) return;
    let alive = true;
    new THREE.TextureLoader().load(`/_next/image?url=${encodeURIComponent(book.coverUrl)}&w=384&q=75`, (t) => {
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
  const s = grand ? 1.25 : 1;
  const glow = hovered || selected;
  return (
    <group
      scale={s}
      onClick={(e) => {
        if (!book || grand) return;
        e.stopPropagation();
        onSelect(book.id);
      }}
      onPointerOver={(e) => {
        if (!book || grand) return;
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* pied, fût tourné et pupitre incliné */}
      <mesh position={[0, 0.04, 0]} material={m.goldSoft}>
        <cylinderGeometry args={[0.22, 0.26, 0.08, 16]} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 1, 12]} />
        <meshStandardMaterial map={wood} color="#7a5638" roughness={0.6} />
      </mesh>
      <group position={[0, 1.08, 0]} rotation={[-0.55, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.03, 0.4]} />
          <meshStandardMaterial map={wood} color="#7a5638" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.02, 0.19]} material={m.gold}>
          <boxGeometry args={[0.5, 0.03, 0.02]} />
        </mesh>
        {cover && (
          <mesh position={[0, 0.03, -0.01]} rotation={[-Math.PI / 2, 0, Math.PI]} material={cover}>
            <planeGeometry args={[0.26, 0.36]} />
          </mesh>
        )}
        {glow && (
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.26, 0.3, 36]} />
            <meshBasicMaterial color="#f0cf78" transparent opacity={0.65} toneMapped={false} />
          </mesh>
        )}
      </group>
      {/* un jeton d'or par voix réelle, empilés au pied du lutrin */}
      {Array.from({ length: Math.min(tokens, 30) }, (_, k) => (
        <mesh key={k} position={[(k % 3) * 0.075 - 0.075, 0.095 + Math.floor(k / 3) * 0.012, 0.32]} material={m.gold}>
          <cylinderGeometry args={[0.03, 0.03, 0.01, 18]} />
        </mesh>
      ))}
    </group>
  );
}
