"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are mutated imperatively inside useFrame, as R3F intends. */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor, Sparkles } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { Candelabra, Candle, Copyist, GrandChandelier } from "./LibraryScene";
import {
  flagstoneTexture,
  generatedCoverTexture,
  moonWindowTexture,
  pageEdgeTexture,
  resolveFonts,
  shaftTexture,
  stoneTexture,
  woodTexture,
} from "./textures";
import type { CopyistNote } from "./types";

/**
 * Le scriptorium, de nuit : une longue salle voûtée en berceau, rythmée d'arcs doubleaux sur colonnes
 * engagées. À gauche, des lancettes de verre bleu laissent passer la lune ; à droite, la bibliothèque
 * murale (armoires, rouleaux, livres enchaînés). Au centre, la table du copiste à la chandelle, puis une
 * enfilade de pupitres vides, le grand lustre de la bibliothèque, une herse à parchemin et des feuillets qui sèchent.
 */

/** Livre en cours de lecture, tel que le Scriptorium l'affiche (aucune donnée devinée). */
export type ScriptoriumBook = {
  id: string;
  slug: string;
  title: string;
  author: string;
  year: number | null;
  color: string;
  coverUrl: string | null;
  pages: number | null;
  currentPage: number | null;
};

type Props = {
  book: ScriptoriumBook | null;
  copyist: CopyistNote | null;
  onCopyistDone: () => void;
  lowPower: boolean;
  onDecline: () => void;
  onReady?: () => void;
};

/** Hauteur du plateau : la même que le bureau de la bibliothèque, pour que le copiste s'y asseye à l'identique. */
const TOP = 0.82;

/* La salle : murs en x = ±4, de l'entrée (z = −3,5) au chevet (z = 10) ; berceau plein cintre sur 3,4 m. */
const HALL = { x: 4, z0: -3.5, z1: 10, spring: 3.4 };
const ARCH_Z = [-1, 1.5, 4, 6.5, 9];
const BAYS = [0.25, 2.75, 5.25, 7.75];
const IRON = { color: "#2b2522", metalness: 0.7, roughness: 0.45 } as const;
const PARCHMENT = "#e6d5b0";

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export default function ScriptoriumScene(props: Props) {
  const { lowPower } = props;
  return (
    <Canvas
      dpr={lowPower ? 1 : [1, 1.75]}
      gl={{ antialias: !lowPower, powerPreference: "high-performance" }}
      camera={{ fov: 52, near: 0.05, far: 40, position: [0, 2.4, -2.6] }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.25;
        scene.background = new THREE.Color("#0a0807");
        scene.fog = new THREE.Fog("#0a0807", 8, 19);
      }}
    >
      <PerformanceMonitor onDecline={props.onDecline} />
      <Scriptorium {...props} />
    </Canvas>
  );
}

function Scriptorium({ book, copyist, onCopyistDone, lowPower, onReady }: Props) {
  const ready = useRef(false);
  const lit = useRef(1);
  useFrame(() => {
    if (!ready.current) {
      ready.current = true;
      onReady?.();
    }
  });
  return (
    <>
      <CameraRig />
      <Lights lowPower={lowPower} />
      <Hall lowPower={lowPower} />
      {/* table du copiste : même repère que le bureau de la bibliothèque (centré en z = 1) */}
      <group position={[0, 0, 1]}>
        <CopyistDesk />
        <group position={[0, 0, 1.02]}>
          <CushionStool />
        </group>
        <SideTable />
        {/* rouleaux sur la tablette basse de la table d'appoint, et tas au pied, près du copiste */}
        <group position={[1.05, 0.175, 0.35]}>
          <ScrollHeap seed={101} count={9} spread={0.3} />
        </group>
        <group position={[0.75, 0, -0.55]}>
          <ScrollHeap seed={137} count={16} spread={0.45} />
        </group>
        {/* rouleaux liés au coin du pupitre du copiste */}
        <Scroll position={[-0.2, TOP + 0.026, 0.3]} rotation={[0, 0.25, Math.PI / 2]} radius={0.026} length={0.26} tone={0} tied />
        <Scroll position={[-0.17, TOP + 0.022, 0.37]} rotation={[0, -0.1, Math.PI / 2]} radius={0.022} length={0.22} tone={3} />
        <Scroll position={[-0.19, TOP + 0.068, 0.335]} rotation={[0, 0.1, Math.PI / 2]} radius={0.02} length={0.24} tone={4} tied />
        <group position={[0.82, TOP, 0.42]} rotation={[0, 0.44, 0]} scale={0.9}>
          <BookStand book={book} />
        </group>
        <group position={[1.35, TOP, 0.3]}>
          <Candelabra />
        </group>
        <BookPile />
        <CopyistTools />
        <Copyist note={copyist} top={TOP} onDone={onCopyistDone} />
      </group>
      {/* enfilade de pupitres vides derrière le copiste */}
      <Desk position={[-1.7, 0, 4.3]} seed={1} lit scrolls />
      <Desk position={[1.7, 0, 4.3]} seed={2} scrolls />
      <Desk position={[-1.7, 0, 6.8]} seed={3} />
      <Desk position={[1.7, 0, 6.8]} seed={4} lit />
      <group scale={1.3}>
        <Telescope position={[1.1, 0, 6.95]} yaw={-0.35} />
      </group>
      <ParchmentFrame position={[2.3, 0, 3.4]} rotation={[0, Math.PI - 0.35, 0]} />
      <DryingLine />
      <WallLibrary />
      {/* le grand lustre de la bibliothèque, à mi-nef */}
      <group position={[-0.7, 3.5, 6.2]} scale={0.38}>
        <GrandChandelier drop={(HALL.spring + HALL.x - 3.5) / 0.38} reveal={lit} lowPower={lowPower} />
      </group>
      {!lowPower && <Sparkles count={70} scale={[5, 3, 7]} position={[0, 2.2, 3.5]} size={1.6} speed={0.08} opacity={0.4} color="#f3d9a6" noise={0.5} />}
    </>
  );
}

/* ─── Caméra : arrivée depuis l'entrée, puis plan de trois quarts sur la table ─── */

function CameraRig() {
  const { camera, pointer, size } = useThree();
  const look = useRef(new THREE.Vector3(0, 1.2, 2));
  const pos = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  useLayoutEffect(() => {
    camera.position.set(0, 2.4, -2.6);
    camera.lookAt(look.current);
  }, [camera]);
  /* Sur écran étroit, le panneau occupe le bas : on remonte le centre optique au quart supérieur. */
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (size.width < 768) cam.setViewOffset(size.width, size.height * 1.5, 0, size.height * 0.5, size.width, size.height);
    else cam.clearViewOffset();
    return () => cam.clearViewOffset();
  }, [camera, size.width, size.height]);
  useFrame((_, dt) => {
    const narrow = size.width < 768;
    pos.set(narrow ? -0.5 : -0.6, narrow ? 2.4 : 2.2, narrow ? -3.0 : -1.9);
    target.set(narrow ? 0 : -0.8, narrow ? 1.0 : 1.55, narrow ? 3.0 : 4.0);
    const lambda = 1.4;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pos.x + pointer.x * 0.06, lambda, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, pos.y + pointer.y * 0.03, lambda, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, pos.z, lambda, dt);
    look.current.x = THREE.MathUtils.damp(look.current.x, target.x, lambda * 1.2, dt);
    look.current.y = THREE.MathUtils.damp(look.current.y, target.y, lambda * 1.2, dt);
    look.current.z = THREE.MathUtils.damp(look.current.z, target.z, lambda * 1.2, dt);
    camera.lookAt(look.current);
  });
  return null;
}

/* ─── Lumière : chandelles, lustre, appliques ; lune par les lancettes ─── */

function Lights({ lowPower }: { lowPower: boolean }) {
  const candle = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (candle.current) candle.current.intensity = 4.2 * (1 + Math.sin(t * 9.7) * 0.07 + Math.sin(t * 23.3) * 0.05 + Math.sin(t * 3.1) * 0.04);
  });
  return (
    <>
      <ambientLight color="#ffd6a8" intensity={0.2} />
      <hemisphereLight args={["#3a4560", "#2a1a10", 0.45]} />
      {/* clair de lune entrant par les lancettes de gauche */}
      <directionalLight color="#8fa6d6" intensity={0.45} position={[-6, 5, 2]} />
      <pointLight color="#7d94c8" intensity={2.2} position={[0, 3.2, 9.3]} distance={6} decay={1.6} />
      {/* lueur chaude sur la lunette, près du chevet */}
      <pointLight color="#ffcf8a" intensity={1.6} position={[0.6, 2.2, 8.4]} distance={3.2} decay={1.6} />
      {/* chandelier de la table d'appoint (le grand lustre porte sa propre lumière) */}
      <pointLight ref={candle} color="#ff9e4a" position={[1.35, TOP + 0.45, 1.3]} distance={5} decay={1.6} />
      {/* appliques sur les colonnes */}
      {!lowPower && <pointLight color="#ffa95a" intensity={2.4} position={[3.55, 2.3, 1.5]} distance={4.5} decay={1.7} />}
      {!lowPower && <pointLight color="#ffa95a" intensity={2.4} position={[-3.55, 2.3, 6.5]} distance={4.5} decay={1.7} />}
    </>
  );
}

/* ─── Salle : dallage, berceau sur doubleaux, colonnes engagées, lancettes ─── */

function Hall({ lowPower }: { lowPower: boolean }) {
  const depth = HALL.z1 - HALL.z0;
  const midZ = (HALL.z1 + HALL.z0) / 2;
  const tex = useMemo(
    () => ({
      floor: flagstoneTexture(11, [6, 10]),
      wall: stoneTexture(5, [depth / 1.3, HALL.spring / 1.3]),
      end: stoneTexture(9, [1 / 1.3, 1 / 1.3]),
      vault: stoneTexture(23, [(Math.PI * HALL.x) / 1.3, depth / 1.3]),
      moon: moonWindowTexture(19),
      shaft: shaftTexture(),
    }),
    [depth],
  );
  const vault = useMemo(() => {
    const g = new THREE.CylinderGeometry(HALL.x, HALL.x, depth, 48, 1, true, Math.PI / 2, Math.PI);
    g.rotateX(Math.PI / 2);
    return g;
  }, [depth]);
  /* mur pignon : rectangle surmonté du demi-cercle du berceau */
  const gable = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-HALL.x, 0);
    s.lineTo(HALL.x, 0);
    s.lineTo(HALL.x, HALL.spring);
    s.absarc(0, HALL.spring, HALL.x, 0, Math.PI, false);
    s.lineTo(-HALL.x, 0);
    return new THREE.ShapeGeometry(s, 32);
  }, []);
  const stone = { roughness: 0.95, color: "#a89a88" } as const;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, midZ]}>
        <planeGeometry args={[HALL.x * 2, depth]} />
        <meshStandardMaterial map={tex.floor} roughness={0.8} color="#bdae98" />
      </mesh>
      {/* murs gouttereaux */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * HALL.x, HALL.spring / 2, midZ]} rotation={[0, -s * (Math.PI / 2), 0]}>
          <planeGeometry args={[depth, HALL.spring]} />
          <meshStandardMaterial map={tex.wall} {...stone} />
        </mesh>
      ))}
      {/* pignons */}
      <mesh geometry={gable} position={[0, 0, HALL.z1]} rotation={[0, Math.PI, 0]}>
        <meshStandardMaterial map={tex.end} {...stone} />
      </mesh>
      <mesh geometry={gable} position={[0, 0, HALL.z0]}>
        <meshStandardMaterial map={tex.end} {...stone} />
      </mesh>
      {/* berceau */}
      <mesh geometry={vault} position={[0, HALL.spring, midZ]}>
        <meshStandardMaterial map={tex.vault} color="#9a8c7a" roughness={0.97} side={THREE.DoubleSide} />
      </mesh>
      {/* corniche à la naissance de la voûte */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (HALL.x - 0.08), HALL.spring, midZ]}>
          <boxGeometry args={[0.16, 0.14, depth]} />
          <meshStandardMaterial color="#8d806f" roughness={0.9} />
        </mesh>
      ))}
      {/* arcs doubleaux sur colonnes engagées */}
      {ARCH_Z.map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, HALL.spring, 0]}>
            <torusGeometry args={[HALL.x - 0.13, 0.15, 4, 48, Math.PI]} />
            <meshStandardMaterial color="#9c8f7c" roughness={0.92} />
          </mesh>
          {[-1, 1].map((s) => (
            <EngagedColumn key={s} x={s * (HALL.x - 0.14)} />
          ))}
        </group>
      ))}
      {/* appliques de fer sur deux colonnes */}
      <Sconce position={[HALL.x - 0.36, 2.05, 1.5]} />
      <Sconce position={[-HALL.x + 0.36, 2.05, 6.5]} />
      {/* lancettes du mur gauche, au clair de lune */}
      {BAYS.map((z, i) => (
        <group key={z} position={[-HALL.x + 0.02, 2.25, z]} rotation={[0, Math.PI / 2, 0]}>
          <Lancet tex={tex.moon} w={0.85} h={1.9} />
          {!lowPower && i < 3 && (
            <mesh position={[0, -0.75, 1.3]} rotation={[-0.8, 0, 0]}>
              <planeGeometry args={[0.95, 3.1]} />
              <meshBasicMaterial map={tex.shaft} color="#9fb4e6" transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      ))}
      {/* grande lancette du chevet, derrière le copiste, et oculus */}
      <group position={[0, 2.9, HALL.z1 - 0.02]} rotation={[0, Math.PI, 0]}>
        <Lancet tex={tex.moon} w={1.25} h={2.8} />
      </group>
      <mesh position={[0, 5.6, HALL.z1 - 0.03]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[0.55, 32]} />
        <meshBasicMaterial map={tex.moon} toneMapped={false} />
      </mesh>
      <mesh position={[0, 5.6, HALL.z1 - 0.06]}>
        <torusGeometry args={[0.6, 0.08, 6, 32]} />
        <meshStandardMaterial color="#8d806f" roughness={0.95} />
      </mesh>
    </group>
  );
}

/** Colonne engagée : base, fût, chapiteau cubique et tailloir, jusqu'à la naissance de l'arc. */
function EngagedColumn({ x }: { x: number }) {
  const mat = <meshStandardMaterial color="#9c8f7c" roughness={0.9} />;
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.36, 0.24, 0.4]} />
        {mat}
      </mesh>
      <mesh position={[0, (HALL.spring - 0.5) / 2 + 0.24, 0]}>
        <cylinderGeometry args={[0.13, 0.14, HALL.spring - 0.5, 14]} />
        {mat}
      </mesh>
      <mesh position={[0, HALL.spring - 0.17, 0]}>
        <cylinderGeometry args={[0.22, 0.14, 0.2, 4, 1, false, Math.PI / 4]} />
        {mat}
      </mesh>
      <mesh position={[0, HALL.spring - 0.04, 0]}>
        <boxGeometry args={[0.4, 0.07, 0.42]} />
        {mat}
      </mesh>
    </group>
  );
}

/** Applique de fer forgé : potence et chandelle. */
function Sconce({ position }: { position: [number, number, number] }) {
  const side = position[0] > 0 ? 1 : -1;
  return (
    <group position={position}>
      <mesh position={[side * 0.11, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.24, 6]} />
        <meshStandardMaterial {...IRON} />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.05, 0.03, 0.02, 14]} />
        <meshStandardMaterial {...IRON} />
      </mesh>
      <group position={[0, 0.02, 0]}>
        <Candle height={0.2} radius={0.024} seed={Math.round(position[2] * 10)} />
      </group>
    </group>
  );
}

function Lancet({ tex, w, h }: { tex: THREE.Texture; w: number; h: number }) {
  return (
    <group>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} toneMapped={false} transparent opacity={0.95} />
      </mesh>
      {/* ébrasement : piédroits et appui */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 + 0.08), -0.05, 0.08]}>
          <boxGeometry args={[0.16, h - 0.1, 0.18]} />
          <meshStandardMaterial color="#7d7062" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, -h / 2 - 0.05, 0.1]}>
        <boxGeometry args={[w + 0.32, 0.1, 0.24]} />
        <meshStandardMaterial color="#7d7062" roughness={0.95} />
      </mesh>
    </group>
  );
}

/* ─── Mobilier ─── */

/** Pied de pupitre : colonne tournée en balustre sur trois pieds griffus recourbés. */
function Pedestal({ height, wood }: { height: number; wood: THREE.Texture }) {
  const shaft = useMemo(() => {
    const prof = [[0.05, 0], [0.07, 0.03], [0.045, 0.08], [0.038, 0.25], [0.066, 0.38], [0.04, 0.5], [0.034, 0.7], [0.056, 0.8], [0.038, 0.92], [0.064, 1]];
    return new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, 0.13 + y * (height - 0.13))), 16);
  }, [height]);
  const feet = useMemo(
    () =>
      [0, 1, 2].map((k) => {
        const a = (k / 3) * Math.PI * 2 + Math.PI / 3;
        const p = (r: number, y: number) => new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r);
        const curve = new THREE.CatmullRomCurve3([p(0.02, 0.2), p(0.12, 0.13), p(0.22, 0.05), p(0.3, 0.025)]);
        return { geo: new THREE.TubeGeometry(curve, 16, 0.022, 6, false), claw: p(0.31, 0.025) };
      }),
    [],
  );
  const mat = <meshStandardMaterial map={wood} color="#6e4c32" roughness={0.6} />;
  return (
    <group>
      <mesh geometry={shaft}>{mat}</mesh>
      {feet.map((f, i) => (
        <group key={i}>
          <mesh geometry={f.geo}>{mat}</mesh>
          <mesh position={f.claw} scale={[1, 0.7, 1]}>
            <sphereGeometry args={[0.032, 10, 8]} />
            {mat}
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.17, 0]}>
        <sphereGeometry args={[0.06, 12, 10]} />
        {mat}
      </mesh>
    </group>
  );
}

/**
 * Pupitre du copiste : plateau sur pied tourné, à hauteur de la table de la bibliothèque, pour que le
 * copiste y pose son écritoire incliné comme ailleurs. Le pied est avancé, loin de ses jambes.
 */
function CopyistDesk() {
  const wood = useMemo(() => woodTexture("#4a3020", 53, true), []);
  return (
    <group>
      <mesh position={[0.08, TOP - 0.025, 0.45]}>
        <boxGeometry args={[0.72, 0.05, 0.46]} />
        <meshStandardMaterial map={wood} color="#8a6446" roughness={0.6} />
      </mesh>
      <mesh position={[0.08, TOP - 0.065, 0.45]}>
        <boxGeometry args={[0.5, 0.04, 0.3]} />
        <meshStandardMaterial map={wood} color="#6e4c32" roughness={0.6} />
      </mesh>
      <group position={[0.08, 0, 0.3]}>
        <Pedestal height={TOP - 0.08} wood={wood} />
      </group>
    </group>
  );
}

/** Siège à coussin de velours : assise à la hauteur du coussin du fauteuil de la bibliothèque (y ≈ 0,555). */
function CushionStool({ w = 0.6, d = 0.42 }: { w?: number; d?: number }) {
  const wood = useMemo(() => woodTexture("#3e2818", 61, true), []);
  const mat = <meshStandardMaterial map={wood} color="#7a5638" roughness={0.65} />;
  return (
    <group>
      <mesh position={[0, 0.47, 0]}>
        <boxGeometry args={[w, 0.04, d]} />
        {mat}
      </mesh>
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} position={[sx * (w / 2 - 0.05), 0.225, sz * (d / 2 - 0.05)]}>
          <cylinderGeometry args={[0.025, 0.03, 0.45, 8]} />
          {mat}
        </mesh>
      )))}
      <mesh position={[0, 0.522, 0]}>
        <boxGeometry args={[w - 0.04, 0.065, d - 0.04]} />
        <meshPhysicalMaterial color="#6e1a22" roughness={0.85} sheen={1} sheenColor="#ff6a6a" sheenRoughness={0.5} />
      </mesh>
    </group>
  );
}

/** Petite table d'appoint à côté du copiste : le livre en cours, la chandelle, les couleurs. */
function SideTable() {
  const wood = useMemo(() => woodTexture("#4a3020", 57, true), []);
  const mat = <meshStandardMaterial map={wood} color="#8a6446" roughness={0.6} />;
  return (
    <group position={[1.05, 0, 0.35]}>
      <mesh position={[0, TOP - 0.025, 0]}>
        <boxGeometry args={[1.0, 0.05, 0.7]} />
        {mat}
      </mesh>
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} position={[sx * 0.44, (TOP - 0.05) / 2, sz * 0.29]}>
          <boxGeometry args={[0.05, TOP - 0.05, 0.05]} />
          {mat}
        </mesh>
      )))}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.9, 0.03, 0.6]} />
        {mat}
      </mesh>
    </group>
  );
}

/** Pile de volumes reliés, au fond de la table. */
function BookPile() {
  const books = [
    { w: 0.3, d: 0.22, t: 0.06, c: "#5a2a22", r: 0.1 },
    { w: 0.26, d: 0.2, t: 0.05, c: "#2f3a2a", r: -0.15 },
    { w: 0.22, d: 0.17, t: 0.045, c: "#6b4a22", r: 0.3 },
  ];
  let y = TOP;
  return (
    <group position={[1.13, 0, 0.57]}>
      {books.map((b, i) => {
        const pos: [number, number, number] = [0, y + b.t / 2, 0];
        y += b.t;
        return (
          <mesh key={i} position={pos} rotation={[0, b.r, 0]}>
            <boxGeometry args={[b.w, b.t, b.d]} />
            <meshStandardMaterial color={b.c} roughness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * Lutrin de table et le livre en cours, debout, couverture vers la salle.
 * Un signet de parchemin dépasse de la tranche de tête à la hauteur de la page atteinte
 * (seulement si la page actuelle et le nombre de pages sont renseignés).
 */
function BookStand({ book }: { book: ScriptoriumBook | null }) {
  const fonts = useMemo(() => resolveFonts(), []);
  const W = 0.2;
  const H = 0.29;
  const D = 0.055;
  const mats = useMemo(() => {
    if (!book) return null;
    const cover = new THREE.MeshStandardMaterial({ map: generatedCoverTexture(book.title, book.author, book.year, book.color, fonts), roughness: 0.6 });
    const cloth = new THREE.MeshStandardMaterial({ color: book.color, roughness: 0.75 });
    const edge = new THREE.MeshStandardMaterial({ map: pageEdgeTexture(), roughness: 0.9 });
    const plain = new THREE.MeshStandardMaterial({ color: "#e6d6b2", roughness: 0.9 });
    // ordre des faces d'une boîte : +x, −x, +y, −y, +z, −z (couverture vers −z, dos à gauche vu de face)
    return { list: [cloth, edge, plain, plain, cloth, cover], cover };
  }, [book, fonts]);

  useEffect(() => {
    if (!book?.coverUrl || !mats) return;
    let alive = true;
    const width = book.coverUrl.startsWith("/uploads/") ? 640 : 384;
    new THREE.TextureLoader().load(`/_next/image?url=${encodeURIComponent(book.coverUrl)}&w=${width}&q=75`, (t) => {
      if (!alive) return t.dispose();
      t.colorSpace = THREE.SRGBColorSpace;
      mats.cover.map?.dispose();
      mats.cover.map = t;
      mats.cover.needsUpdate = true;
    });
    return () => {
      alive = false;
    };
  }, [book?.coverUrl, mats]);

  useEffect(() => () => mats?.list.forEach((m) => { (m as THREE.MeshStandardMaterial).map?.dispose(); m.dispose(); }), [mats]);

  const progress = book?.pages && book.currentPage != null ? Math.min(1, Math.max(0, book.currentPage / book.pages)) : null;
  const wood = { color: "#5a3b26", roughness: 0.6 } as const;
  return (
    <group>
      {/* socle, appui incliné et rebord */}
      <mesh position={[0, 0.012, 0]}>
        <boxGeometry args={[0.26, 0.024, 0.16]} />
        <meshStandardMaterial {...wood} />
      </mesh>
      <mesh position={[0, 0.16, 0.06]} rotation={[0.32, 0, 0]}>
        <boxGeometry args={[0.24, 0.3, 0.015]} />
        <meshStandardMaterial {...wood} />
      </mesh>
      <mesh position={[0, 0.035, -0.045]}>
        <boxGeometry args={[0.26, 0.026, 0.018]} />
        <meshStandardMaterial {...wood} />
      </mesh>
      {book && mats && (
        <group position={[0, 0.03, 0.012]} rotation={[0.32, 0, 0]}>
          <mesh position={[0, H / 2, 0]} material={mats.list}>
            <boxGeometry args={[W, H, D]} />
          </mesh>
          {/* signet glissé à la page atteinte */}
          {progress !== null && (
            <mesh position={[-0.03, H + 0.03, -D / 2 + 0.004 + progress * (D - 0.008)]}>
              <boxGeometry args={[0.035, 0.07, 0.002]} />
              <meshStandardMaterial color="#efe1c0" roughness={0.9} />
            </mesh>
          )}
          {/* ruban du livre */}
          <mesh position={[0.05, H + 0.012, 0]} rotation={[0, 0, 0.1]}>
            <boxGeometry args={[0.008, 0.03, 0.002]} />
            <meshStandardMaterial color="#6e1520" roughness={0.7} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** Matériel du copiste sur la table d'appoint : pots de pigments, coquilles de couleurs, grattoir, pot à plumes. */
function CopyistTools() {
  const pigments = ["#1f3f9a", "#b8342a", "#3f8f6a", "#c9962e", "#d9b44a"];
  return (
    <group position={[1.05, 0, 0.35]}>
      {/* pots de terre, pigment à ras bord */}
      {pigments.map((c, i) => (
        <group key={c} position={[-0.42 + i * 0.07, TOP, -0.27]}>
          <mesh position={[0, 0.022, 0]}>
            <cylinderGeometry args={[0.022, 0.026, 0.044, 14]} />
            <meshStandardMaterial color="#7a5a3e" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.042, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.019, 14]} />
            <meshStandardMaterial color={c} roughness={i === 4 ? 0.35 : 0.9} metalness={i === 4 ? 0.8 : 0} />
          </mesh>
        </group>
      ))}
      {/* coquilles de moules où l'on délaye les couleurs */}
      {[["#1f3f9a", -0.02, -0.26, 0.4], ["#b8342a", 0.08, -0.29, -0.3], ["#3f8f6a", 0.04, -0.18, 1.2]].map(([c, x, z, r]) => (
        <group key={c as string} position={[x as number, TOP + 0.006, z as number]} rotation={[0, r as number, 0]}>
          <mesh scale={[1, 0.32, 0.62]}>
            <sphereGeometry args={[0.04, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
            <meshStandardMaterial color="#2a2c3a" roughness={0.4} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.6, 1]}>
            <circleGeometry args={[0.032, 16]} />
            <meshStandardMaterial color={c as string} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* grattoir : manche de bois, lame courbe */}
      <group position={[0.2, TOP + 0.008, -0.22]} rotation={[0, 0.7, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.009, 0.011, 0.1, 8]} />
          <meshStandardMaterial color="#5a3b26" roughness={0.6} />
        </mesh>
        <mesh position={[0.08, 0, 0]}>
          <boxGeometry args={[0.07, 0.003, 0.022]} />
          <meshStandardMaterial color="#b9b6b0" metalness={0.85} roughness={0.3} />
        </mesh>
      </group>
      {/* pot à plumes */}
      <group position={[0.4, TOP, 0.24]}>
        <mesh position={[0, 0.045, 0]}>
          <cylinderGeometry args={[0.032, 0.036, 0.09, 14]} />
          <meshStandardMaterial color="#3b2a1e" roughness={0.7} />
        </mesh>
        {[-0.25, 0.05, 0.3].map((a, i) => (
          <group key={i} position={[0, 0.07, 0]} rotation={[a * 0.6, i * 2, a]}>
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.0025, 0.002, 0.22, 5]} />
              <meshStandardMaterial color="#e8e0cc" roughness={0.6} />
            </mesh>
            <mesh position={[0.012, 0.17, 0]} rotation={[0, 0, -0.08]} scale={[0.35, 1, 0.08]}>
              <sphereGeometry args={[0.06, 10, 8]} />
              <meshStandardMaterial color="#f1ebdd" roughness={0.8} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/**
 * Pupitre de copiste sur pied tourné (comme dans les enluminures) : plan incliné à rebord, livre ouvert ;
 * un siège à coussin. Parfois une chandelle sur une potence fixée au pied.
 */
function Desk({ position, seed, lit = false, scrolls = false }: { position: [number, number, number]; seed: number; lit?: boolean; scrolls?: boolean }) {
  const wood = useMemo(() => woodTexture("#3e2818", 40 + seed, true), [seed]);
  const mat = <meshStandardMaterial map={wood} color="#6e4c32" roughness={0.65} />;
  const tilt = 0.4;
  const topY = 1.0;
  const open = seed % 2 === 1;
  return (
    <group position={position}>
      <Pedestal height={topY - 0.06} wood={wood} />
      {/* plan incliné, haut côté salle (−z), et son rebord côté copiste */}
      <group position={[0, topY, 0]} rotation={[tilt, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.6, 0.03, 0.44]} />
          {mat}
        </mesh>
        <mesh position={[0, 0.03, 0.21]}>
          <boxGeometry args={[0.6, 0.045, 0.02]} />
          {mat}
        </mesh>
        {open ? (
          /* livre ouvert : deux pages légèrement relevées */
          [-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.1, 0.022, 0.02]} rotation={[-Math.PI / 2, s * 0.08, 0]}>
              <planeGeometry args={[0.2, 0.28]} />
              <meshStandardMaterial color={PARCHMENT} roughness={0.9} side={THREE.DoubleSide} />
            </mesh>
          ))
        ) : (
          <mesh position={[-0.02, 0.017, 0.02]} rotation={[-Math.PI / 2, 0, 0.05]}>
            <planeGeometry args={[0.28, 0.36]} />
            <meshStandardMaterial color={PARCHMENT} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
      {/* corne à encre fichée au bord */}
      <mesh position={[0.27, topY + 0.02, 0.12]} rotation={[0.3, 0, 0.2]}>
        <coneGeometry args={[0.02, 0.11, 10]} />
        <meshStandardMaterial color="#d8c39a" roughness={0.6} />
      </mesh>
      {lit && (
        <group position={[-0.32, 0, -0.05]}>
          <mesh position={[0.16, 0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.01, 0.01, 0.32, 6]} />
            <meshStandardMaterial {...IRON} />
          </mesh>
          <mesh position={[0, 0.805, 0]}>
            <cylinderGeometry args={[0.09, 0.07, 0.015, 16]} />
            <meshStandardMaterial {...IRON} />
          </mesh>
          <group position={[0, 0.812, 0]} rotation={[0, seed, 0]}>
            <Candelabra />
          </group>
        </group>
      )}
      <group position={[0, 0, 0.5]}>
        <CushionStool w={0.46} d={0.38} />
      </group>
      {scrolls && (
        <>
          {/* deux rouleaux calés contre le rebord du plan incliné */}
          <group position={[0, topY, 0]} rotation={[tilt, 0, 0]}>
            <Scroll position={[0.08, 0.05, 0.17]} rotation={[0, 0, Math.PI / 2]} radius={0.03} length={0.42} tone={1} tied />
            <Scroll position={[-0.12, 0.05, 0.12]} rotation={[0, 0.06, Math.PI / 2]} radius={0.024} length={0.34} tone={2} />
          </group>
          {/* tas de rouleaux et de feuillets au pied du pupitre */}
          <group position={[-Math.sign(position[0]) * 0.6, 0, -0.15]} rotation={[0, seed * 1.3, 0]}>
            <ScrollHeap seed={seed * 17} count={14} spread={0.42} />
          </group>
        </>
      )}
    </group>
  );
}

const SCROLL_TONES = ["#e6d5b0", "#d9c49a", "#cdb588", "#efe2c4", "#c4a878"];

/** Rouleau de parchemin : cylindre au bord plus sombre, parfois lié d'un cordon, parfois à demi déroulé. */
function Scroll({ position, rotation, radius, length, tone, tied = false, unrolled = 0 }: {
  position: [number, number, number];
  rotation: [number, number, number];
  radius: number;
  length: number;
  tone: number;
  tied?: boolean;
  unrolled?: number;
}) {
  const color = SCROLL_TONES[tone % SCROLL_TONES.length];
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <cylinderGeometry args={[radius, radius, length, 14]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {/* tranches enroulées, un peu plus sombres */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, (s * length) / 2 + s * 0.001, 0]} rotation={[s > 0 ? -Math.PI / 2 : Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 0.25, radius, 16]} />
          <meshStandardMaterial color="#a88d62" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {tied && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius + 0.002, 0.003, 5, 18]} />
          <meshStandardMaterial color="#6e1520" roughness={0.7} />
        </mesh>
      )}
      {unrolled > 0 && (
        /* feuille à demi déroulée, posée à plat et qui se recourbe */
        <mesh position={[radius * 0.2, 0, -radius - unrolled / 2]} rotation={[0, 0, Math.PI / 2]}>
          <planeGeometry args={[length * 0.96, unrolled]} />
          <meshStandardMaterial color={color} roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Tas de rouleaux de parchemin et de feuillets en désordre, posé à plat (origine au sol ou sur une tablette) :
 * une couche de rouleaux couchés, quelques-uns par-dessus, des feuillets épars et un rouleau à demi déroulé.
 */
function ScrollHeap({ seed, count, spread }: { seed: number; count: number; spread: number }) {
  const items = useMemo(() => {
    const r = rng(seed);
    const scrolls: { p: [number, number, number]; ry: number; radius: number; length: number; tone: number; tied: boolean; unrolled: number }[] = [];
    const bottom = Math.ceil(count * 0.65);
    for (let i = 0; i < count; i++) {
      const layer = i < bottom ? 0 : 1;
      const radius = 0.022 + r() * 0.022;
      const reach = layer === 0 ? spread : spread * 0.55;
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * reach;
      scrolls.push({
        p: [Math.cos(a) * d, radius + layer * 0.05, Math.sin(a) * d],
        ry: r() * Math.PI,
        radius,
        length: 0.24 + r() * 0.2,
        tone: Math.floor(r() * SCROLL_TONES.length),
        tied: r() > 0.6,
        unrolled: layer === 0 && r() > 0.8 ? 0.12 + r() * 0.1 : 0,
      });
    }
    const sheets = Array.from({ length: Math.round(count / 3) }, () => {
      const a = r() * Math.PI * 2;
      const d = r() * spread * 1.1;
      return { p: [Math.cos(a) * d, 0.002 + r() * 0.004, Math.sin(a) * d] as [number, number, number], ry: r() * Math.PI, rx: (r() - 0.5) * 0.12, tone: Math.floor(r() * SCROLL_TONES.length) };
    });
    return { scrolls, sheets };
  }, [seed, count, spread]);
  return (
    <group>
      {items.sheets.map((s, i) => (
        <mesh key={`f${i}`} position={s.p} rotation={[-Math.PI / 2 + s.rx, 0, s.ry]}>
          <planeGeometry args={[0.24, 0.32]} />
          <meshStandardMaterial color={SCROLL_TONES[s.tone]} roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {items.scrolls.map((s, i) => (
        <group key={i} position={s.p} rotation={[0, s.ry, 0]}>
          <Scroll position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} radius={s.radius} length={s.length} tone={s.tone} tied={s.tied} unrolled={s.unrolled} />
        </group>
      ))}
    </group>
  );
}

/** Pièce de bois ou de laiton tendue entre deux points. */
function Rod({ a, b, r, children }: { a: THREE.Vector3; b: THREE.Vector3; r: number; children: ReactNode }) {
  const { mid, len, q } = useMemo(() => {
    const dir = b.clone().sub(a);
    return {
      mid: a.clone().add(b).multiplyScalar(0.5),
      len: dir.length(),
      q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
    };
  }, [a, b]);
  return (
    <mesh position={mid} quaternion={q}>
      <cylinderGeometry args={[r, r, len, 10]} />
      {children}
    </mesh>
  );
}

/**
 * Lunette d'astronome sur trépied d'acajou, près de la lancette du chevet : tube gainé de cuir brun,
 * viroles et tirages de laiton, chercheur, rotule à molette, chaînette et cache-objectif pendant.
 */
function Telescope({ position, yaw }: { position: [number, number, number]; yaw: number }) {
  const brass = <meshStandardMaterial color="#c9a24a" metalness={0.55} roughness={0.3} />;
  const wood = <meshStandardMaterial color="#5a2a1a" roughness={0.45} />;
  const HEAD = 1.2;
  const legs = useMemo(
    () =>
      [0, 1, 2].map((k) => {
        const a = (k / 3) * Math.PI * 2;
        return {
          top: new THREE.Vector3(Math.sin(a) * 0.06, HEAD - 0.06, Math.cos(a) * 0.06),
          foot: new THREE.Vector3(Math.sin(a) * 0.5, 0.03, Math.cos(a) * 0.5),
          brace: new THREE.Vector3(Math.sin(a) * 0.3, 0.45, Math.cos(a) * 0.3),
        };
      }),
    [],
  );
  const center = useMemo(() => new THREE.Vector3(0, 0.42, 0), []);
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {legs.map((l, i) => (
        <group key={i}>
          <Rod a={l.top} b={l.foot} r={0.022}>{wood}</Rod>
          {/* sabot et bague de laiton */}
          <mesh position={l.foot}>
            <cylinderGeometry args={[0.028, 0.03, 0.06, 10]} />
            {brass}
          </mesh>
          <mesh position={l.brace}>
            <cylinderGeometry args={[0.03, 0.03, 0.05, 10]} />
            {brass}
          </mesh>
          {/* chaînette d'écartement */}
          <Rod a={l.brace} b={center} r={0.004}>
            <meshStandardMaterial color="#b08a45" metalness={0.6} roughness={0.35} />
          </Rod>
        </group>
      ))}
      {/* tête : plateau, colonne et molette */}
      <mesh position={[0, HEAD - 0.04, 0]}>
        <cylinderGeometry args={[0.09, 0.08, 0.05, 16]} />
        {brass}
      </mesh>
      <mesh position={[0, HEAD + 0.06, 0]}>
        <cylinderGeometry args={[0.025, 0.03, 0.16, 12]} />
        {brass}
      </mesh>
      <mesh position={[0.05, HEAD + 0.13, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.055, 0.008, 6, 24]} />
        {brass}
      </mesh>
      {/* le tube, incliné vers le ciel de la lancette */}
      <group position={[0, HEAD + 0.17, 0]} rotation={[-0.42, 0, 0]}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          {/* tube principal gainé de cuir (axe y local = vers l'avant, +z du trépied) */}
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.058, 0.052, 0.82, 20]} />
            <meshStandardMaterial color="#3a1f14" roughness={0.55} />
          </mesh>
          {/* objectif : virole évasée */}
          <mesh position={[0, 0.63, 0]}>
            <cylinderGeometry args={[0.068, 0.062, 0.1, 20]} />
            {brass}
          </mesh>
          <mesh position={[0, 0.681, 0]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.004, 20]} />
            <meshStandardMaterial color="#0e1626" metalness={0.2} roughness={0.05} />
          </mesh>
          {/* collier de fixation */}
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.064, 0.064, 0.05, 20]} />
            {brass}
          </mesh>
          {/* tirages de laiton vers l'oculaire */}
          <mesh position={[0, -0.33, 0]}>
            <cylinderGeometry args={[0.04, 0.045, 0.22, 16]} />
            {brass}
          </mesh>
          <mesh position={[0, -0.5, 0]}>
            <cylinderGeometry args={[0.03, 0.035, 0.16, 14]} />
            {brass}
          </mesh>
          <mesh position={[0, -0.6, 0]}>
            <cylinderGeometry args={[0.024, 0.02, 0.06, 12]} />
            {brass}
          </mesh>
          {/* chercheur fixé sur le dessus */}
          <mesh position={[0, -0.1, 0.1]}>
            <cylinderGeometry args={[0.02, 0.02, 0.32, 12]} />
            {brass}
          </mesh>
          {[-0.2, 0.0].map((y) => (
            <mesh key={y} position={[0, y, 0.075]}>
              <boxGeometry args={[0.012, 0.012, 0.04]} />
              {brass}
            </mesh>
          ))}
        </group>
        {/* cache-objectif pendu à sa chaînette */}
        <mesh position={[0, -0.22, 0.6]}>
          <cylinderGeometry args={[0.003, 0.003, 0.3, 4]} />
          <meshStandardMaterial color="#b08a45" metalness={0.6} roughness={0.35} />
        </mesh>
      </group>
      <mesh position={[0, HEAD + 0.17 - 0.38, 0.62 * Math.cos(0.42) + 0.0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.012, 18]} />
        {brass}
      </mesh>
    </group>
  );
}

/** Corde tendue entre deux points (cordelette de lin). */
function Cord({ a, b, r = 0.004, color = "#b9a27a" }: { a: THREE.Vector3; b: THREE.Vector3; r?: number; color?: string }) {
  const { mid, len, q } = useMemo(() => {
    const dir = b.clone().sub(a);
    return {
      mid: a.clone().add(b).multiplyScalar(0.5),
      len: dir.length(),
      q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
    };
  }, [a, b]);
  return (
    <mesh position={mid} quaternion={q}>
      <cylinderGeometry args={[r, r, len, 5]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

/** Herse : peau de parchemin tendue par des cordelettes dans un cadre de bois, sur deux pieds. */
function ParchmentFrame({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  const wood = useMemo(() => woodTexture("#3e2818", 77), []);
  const mat = <meshStandardMaterial map={wood} color="#6e4c32" roughness={0.65} />;
  const W = 0.9;
  const H = 1.05;
  const cy = 1.2;
  const cords = useMemo(() => {
    const pw = 0.62;
    const ph = 0.78;
    const list: { a: THREE.Vector3; b: THREE.Vector3 }[] = [];
    for (const t of [-0.35, 0, 0.35]) {
      list.push({ a: new THREE.Vector3(t * pw, ph / 2, 0), b: new THREE.Vector3(t * W * 0.9, H / 2 - 0.03, 0) });
      list.push({ a: new THREE.Vector3(t * pw, -ph / 2, 0), b: new THREE.Vector3(t * W * 0.9, -H / 2 + 0.03, 0) });
      list.push({ a: new THREE.Vector3(pw / 2, t * ph, 0), b: new THREE.Vector3(W / 2 - 0.03, t * H * 0.9, 0) });
      list.push({ a: new THREE.Vector3(-pw / 2, t * ph, 0), b: new THREE.Vector3(-W / 2 + 0.03, t * H * 0.9, 0) });
    }
    return list;
  }, []);
  return (
    <group position={position} rotation={rotation}>
      <group position={[0, cy, 0]} rotation={[-0.12, 0, 0]}>
        {[-1, 1].map((s) => (
          <mesh key={`v${s}`} position={[s * W / 2, 0, 0]}>
            <boxGeometry args={[0.05, H + 0.05, 0.05]} />
            {mat}
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={`h${s}`} position={[0, s * H / 2, 0]}>
            <boxGeometry args={[W + 0.05, 0.05, 0.05]} />
            {mat}
          </mesh>
        ))}
        {/* la peau, aux bords irréguliers resserrés par les liens */}
        <mesh>
          <planeGeometry args={[0.62, 0.78]} />
          <meshStandardMaterial color="#e9dbbb" roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
        {cords.map((c, i) => <Cord key={i} a={c.a} b={c.b} />)}
      </group>
      {/* pieds */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * W / 2, 0.5, 0.12]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.06, 1.05, 0.06]} />
          {mat}
        </mesh>
      ))}
      <mesh position={[0, 0.03, 0.2]}>
        <boxGeometry args={[W + 0.2, 0.06, 0.08]} />
        {mat}
      </mesh>
    </group>
  );
}

/** Feuillets qui sèchent sur une corde tendue en travers de la nef, d'une colonne à l'autre. */
function DryingLine() {
  const z = 6.5;
  const y = 2.75;
  const span = HALL.x - 0.16;
  const sheets = useMemo(() => {
    const r = rng(53);
    return [-2.3, -1.7, -1.1, 0.9, 1.5, 2.1, 2.7].map((x) => ({ x, ry: (r() - 0.5) * 0.35, rz: (r() - 0.5) * 0.06, h: 0.34 + r() * 0.08 }));
  }, []);
  const a = useMemo(() => new THREE.Vector3(-span, y + 0.05, z), [span]);
  const b = useMemo(() => new THREE.Vector3(span, y + 0.05, z), [span]);
  /* la corde fléchit au milieu : deux brins rejoignant un point bas */
  const sag = useMemo(() => new THREE.Vector3(0, y - 0.12, z), []);
  const yAt = (x: number) => y + 0.05 - 0.17 * (1 - Math.abs(x) / span);
  return (
    <group>
      <Cord a={a} b={sag} r={0.005} />
      <Cord a={sag} b={b} r={0.005} />
      {sheets.map((s) => (
        <group key={s.x} position={[s.x, yAt(s.x), z]} rotation={[0, s.ry, s.rz]}>
          <mesh position={[0, -s.h / 2 - 0.01, 0]}>
            <planeGeometry args={[0.3, s.h]} />
            <meshStandardMaterial color={PARCHMENT} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
          {/* pince de bois */}
          <mesh position={[0, -0.005, 0]}>
            <boxGeometry args={[0.02, 0.05, 0.02]} />
            <meshStandardMaterial color="#6e4c32" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ─── Bibliothèque murale (mur de droite) ─── */

function WallLibrary() {
  const x = HALL.x;
  return (
    <group>
      <group position={[x - 0.3, 0, BAYS[0]]} rotation={[0, -Math.PI / 2, 0]}>
        <Chest />
        <group position={[0, 1.05, -0.05]}>
          <ScrollRack />
        </group>
      </group>
      <Armarium z={BAYS[1]} seed={9} />
      <group position={[x - 0.35, 0, BAYS[2]]} rotation={[0, -Math.PI / 2, 0]}>
        <ChainedDesk />
      </group>
      <Armarium z={BAYS[3]} seed={21} />
    </group>
  );
}

/** Coffre bardé de fer, couvercle bombé. */
function Chest() {
  const wood = useMemo(() => woodTexture("#2d1f17", 83, true), []);
  return (
    <group>
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[1.1, 0.5, 0.5]} />
        <meshStandardMaterial map={wood} color="#5a3c28" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 1.1, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial map={wood} color="#5a3c28" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      {[-0.4, 0, 0.4].map((bx) => (
        <mesh key={bx} position={[bx, 0.37, 0]}>
          <boxGeometry args={[0.05, 0.76, 0.52]} />
          <meshStandardMaterial {...IRON} />
        </mesh>
      ))}
      <mesh position={[0, 0.42, -0.26]}>
        <boxGeometry args={[0.1, 0.12, 0.02]} />
        <meshStandardMaterial {...IRON} />
      </mesh>
    </group>
  );
}

/** Casier à rouleaux : alvéoles de bois, rouleaux de parchemin couchés, bout vers la salle. */
function ScrollRack() {
  const wood = useMemo(() => woodTexture("#2d1f17", 87), []);
  const mat = <meshStandardMaterial map={wood} color="#4a3324" roughness={0.7} />;
  const cols = 4;
  const rows = 3;
  const cw = 0.28;
  const ch = 0.3;
  const scrolls = useMemo(() => {
    const r = rng(91);
    const out: { x: number; y: number; rad: number; len: number }[] = [];
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const n = 1 + Math.floor(r() * 3);
        for (let k = 0; k < n; k++) {
          const rad = 0.035 + r() * 0.02;
          out.push({ x: (i - (cols - 1) / 2) * cw + (k - (n - 1) / 2) * 0.085, y: j * ch + rad + 0.02 + (k === 1 ? 0.04 : 0), rad, len: 0.3 + r() * 0.12 });
        }
      }
    }
    return out;
  }, []);
  return (
    <group>
      {Array.from({ length: cols + 1 }, (_, i) => (
        <mesh key={`v${i}`} position={[(i - cols / 2) * cw, (rows * ch) / 2, 0]}>
          <boxGeometry args={[0.025, rows * ch, 0.4]} />
          {mat}
        </mesh>
      ))}
      {Array.from({ length: rows + 1 }, (_, j) => (
        <mesh key={`h${j}`} position={[0, j * ch, 0]}>
          <boxGeometry args={[cols * cw + 0.025, 0.025, 0.4]} />
          {mat}
        </mesh>
      ))}
      <mesh position={[0, (rows * ch) / 2, 0.2]}>
        <boxGeometry args={[cols * cw, rows * ch, 0.02]} />
        {mat}
      </mesh>
      {scrolls.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, 0.2 - s.len / 2 - 0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[s.rad, s.rad, s.len, 12]} />
          <meshStandardMaterial color={i % 4 === 0 ? "#d9c49a" : PARCHMENT} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/** Pupitre à livres enchaînés : codex couchés sur le plan incliné, chaînes vers une tringle de fer. */
function ChainedDesk() {
  const wood = useMemo(() => woodTexture("#3e2818", 93, true), []);
  const mat = <meshStandardMaterial map={wood} color="#5e4030" roughness={0.65} />;
  const tilt = 0.42;
  const books = [
    { x: -0.62, c: "#5a2a22" },
    { x: 0, c: "#2f3a2a" },
    { x: 0.62, c: "#4a1e1e" },
  ];
  const links = 9;
  return (
    <group>
      {[-0.85, 0.85].map((x) => (
        <mesh key={x} position={[x, 0.55, 0]}>
          <boxGeometry args={[0.07, 1.1, 0.5]} />
          {mat}
        </mesh>
      ))}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.7, 0.03, 0.45]} />
        {mat}
      </mesh>
      {/* livres couchés sur la tablette basse */}
      {[-0.5, -0.1, 0.35].map((x, i) => (
        <mesh key={x} position={[x, 0.345 + (i === 1 ? 0.02 : 0), 0]} rotation={[0, 0.2 * (i - 1), 0]}>
          <boxGeometry args={[0.3, 0.06 + i * 0.01, 0.22]} />
          <meshStandardMaterial color={["#6b4a22", "#3b2a40", "#5a2a22"][i]} roughness={0.7} />
        </mesh>
      ))}
      <group position={[0, 1.1, 0]} rotation={[-tilt, 0, 0]}>
        <mesh>
          <boxGeometry args={[1.8, 0.035, 0.6]} />
          {mat}
        </mesh>
        <mesh position={[0, 0.03, -0.29]}>
          <boxGeometry args={[1.8, 0.04, 0.025]} />
          {mat}
        </mesh>
        {/* tringle de fer au haut du pupitre */}
        <mesh position={[0, 0.06, 0.32]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 1.8, 8]} />
          <meshStandardMaterial {...IRON} />
        </mesh>
        {books.map((b) => (
          <group key={b.x} position={[b.x, 0.045, -0.04]}>
            <mesh>
              <boxGeometry args={[0.36, 0.05, 0.42]} />
              <meshStandardMaterial color={b.c} roughness={0.7} />
            </mesh>
            {/* fermoirs de laiton */}
            <mesh position={[0.18, 0, -0.08]}>
              <boxGeometry args={[0.02, 0.03, 0.05]} />
              <meshStandardMaterial color="#b08a45" metalness={0.8} roughness={0.35} />
            </mesh>
            {/* chaîne : anneaux du plat supérieur jusqu'à la tringle */}
            {Array.from({ length: links }, (_, k) => {
              const t = (k + 0.5) / links;
              return (
                <mesh key={k} position={[0, 0.03 + Math.sin(t * Math.PI) * 0.04, 0.21 + t * 0.15]} rotation={[0, k % 2 ? Math.PI / 2 : 0, 0]}>
                  <torusGeometry args={[0.012, 0.003, 4, 10]} />
                  <meshStandardMaterial {...IRON} />
                </mesh>
              );
            })}
          </group>
        ))}
      </group>
    </group>
  );
}

/** Armoire à livres (armarium) contre le mur de droite : rayons garnis de volumes reliés. */
function Armarium({ z, seed }: { z: number; seed: number }) {
  const wood = useMemo(() => woodTexture("#2d1f17", 71), []);
  const books = useMemo(() => {
    const out: { x: number; y: number; w: number; h: number; c: string; lean: number }[] = [];
    const r = rng(seed);
    const palette = ["#5a2a22", "#2f3a2a", "#6b4a22", "#3b2a40", "#4a1e1e", "#6a5a3a", "#24304a"];
    for (const y of [0.55, 1.15, 1.75, 2.35]) {
      let x = -0.78;
      while (x < 0.74) {
        const w = 0.05 + r() * 0.06;
        const h = 0.32 + r() * 0.16;
        if (r() > 0.1) out.push({ x: x + w / 2, y: y + h / 2, w, h, c: palette[Math.floor(r() * palette.length)], lean: r() > 0.92 ? 0.18 : 0 });
        x += w + 0.008;
      }
    }
    return out;
  }, [seed]);
  return (
    <group position={[HALL.x - 0.3, 0, z]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh position={[0, 1.5, -0.2]}>
        <boxGeometry args={[1.8, 3, 0.04]} />
        <meshStandardMaterial map={wood} color="#4a3324" roughness={0.7} />
      </mesh>
      {[-0.88, 0.88].map((x) => (
        <mesh key={x} position={[x, 1.5, 0]}>
          <boxGeometry args={[0.06, 3, 0.42]} />
          <meshStandardMaterial map={wood} color="#4a3324" roughness={0.7} />
        </mesh>
      ))}
      {[0.53, 1.13, 1.73, 2.33, 2.97].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[1.76, 0.04, 0.42]} />
          <meshStandardMaterial map={wood} color="#4a3324" roughness={0.7} />
        </mesh>
      ))}
      {/* corniche */}
      <mesh position={[0, 3.04, 0.02]}>
        <boxGeometry args={[1.9, 0.1, 0.48]} />
        <meshStandardMaterial map={wood} color="#4a3324" roughness={0.7} />
      </mesh>
      {books.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, -0.02]} rotation={[0, 0, b.lean]}>
          <boxGeometry args={[b.w, b.h, 0.3]} />
          <meshStandardMaterial color={b.c} roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}
