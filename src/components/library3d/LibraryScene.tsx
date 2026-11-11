"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are mutated imperatively inside useFrame, as R3F intends. */
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { PerformanceMonitor, Sparkles, useCursor } from "@react-three/drei";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CASE, computeRoom, packShelf, type CaseSlot, type PlacedBook } from "./layout";
import {
  generatedCoverTexture,
  panelTexture,
  plaqueTexture,
  resolveFonts,
  rugTexture,
  shaftTexture,
  spineTexture,
  windowTexture,
  woodTexture,
  type Fonts,
  globeTexture,
  leatherTexture,
  illuminatedPageTexture,
  pageEdgeTexture,
  velvetBackTexture,
  velvetSeatTexture,
  writingSheet,
} from "./textures";
import type { CopyistNote, SceneBook, SceneShelf, View } from "./types";

type Props = {
  shelves: SceneShelf[];
  view: View;
  lowPower: boolean;
  onView: (v: View) => void;
  onIntroDone: () => void;
  onDecline: () => void;
  /** Arrivée depuis la porte de l'accueil : portes déjà ouvertes, caméra sur le seuil. */
  entrance?: boolean;
  /** Appelé au premier rendu de la scène (pour lever le voile de lumière). */
  onReady?: () => void;
  /** Recommandation en cours d'écriture par le copiste (null = absent). */
  copyist?: CopyistNote | null;
  /** Clic sur le manuscrit du bureau. */
  onDeskBook?: () => void;
  /** Le copiste a fini d'écrire. */
  onCopyistDone?: () => void;
};

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export default function LibraryScene(props: Props) {
  const { lowPower } = props;
  return (
    <Canvas
      dpr={lowPower ? 1 : [1, 1.75]}
      gl={{ antialias: !lowPower, powerPreference: "high-performance" }}
      camera={{ fov: 50, near: 0.05, far: 80, position: [0, 2.3, 30] }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.3;
        scene.background = new THREE.Color("#0b0908");
        scene.fog = new THREE.Fog("#0b0908", 10, 38);
      }}
    >
      <PerformanceMonitor onDecline={props.onDecline} />
      <Room {...props} />
    </Canvas>
  );
}

function Room({ shelves, view, lowPower, onView, onIntroDone, entrance, onReady, copyist, onDeskBook, onCopyistDone }: Props) {
  const fonts = useMemo(() => resolveFonts(), []);
  const room = useMemo(() => computeRoom(shelves.length), [shelves.length]);
  const reveal = useRef(entrance ? 0.6 : view.kind === "intro" ? 0 : 1);
  const ready = useRef(false);
  const intro = useRef({ start: -1, done: view.kind !== "intro" });
  const doorAngle = useRef(view.kind === "intro" ? 0 : 1);

  useFrame((state, dt) => {
    if (!ready.current) {
      ready.current = true;
      onReady?.();
    }
    if (!intro.current.done) {
      if (intro.current.start < 0) intro.current.start = state.clock.elapsedTime;
      const t = state.clock.elapsedTime - intro.current.start;
      doorAngle.current = ease(clamp01((t - 0.6) / 2.6));
      if (t > 1.5) {
        intro.current.done = true;
        onIntroDone();
      }
    } else {
      doorAngle.current = THREE.MathUtils.damp(doorAngle.current, 1, 2, dt);
    }
    reveal.current = THREE.MathUtils.damp(reveal.current, view.kind === "intro" ? 0.05 : 1, 0.9, dt);
  });

  return (
    <>
      <CameraRig view={view} room={room} entrance={entrance} />
      <Lights reveal={reveal} lowPower={lowPower} />
      <group position={[0, 6.2, -6]} scale={0.72}>
        <GrandChandelier drop={(room.height - 6.2) / 0.72} reveal={reveal} lowPower={lowPower} />
      </group>
      <Architecture room={room} doorAngle={doorAngle} lowPower={lowPower} />
      <ReadingDesk copyist={copyist ?? null} onBook={onDeskBook} onDone={onCopyistDone} />
      {shelves.map((s, i) => (
        <Bookcase
          key={s.id}
          shelf={s}
          index={i}
          slot={room.slots[i]}
          fonts={fonts}
          view={view}
          lowPower={lowPower}
          onView={onView}
        />
      ))}
      {room.slots[0] && <Ladder slot={room.slots[Math.min(1, room.slots.length - 1)]} />}
      {!lowPower && (
        <Sparkles count={140} scale={[22, 9, room.depth - 2]} position={[0, 4.5, (room.front + -9.5) / 2]} size={1.6} speed={0.12} opacity={0.35} color="#f3d9a6" noise={0.6} />
      )}
    </>
  );
}

/* ─── Camera ─────────────────────────────────────────────────────────── */

function CameraRig({ view, room, entrance }: { view: View; room: ReturnType<typeof computeRoom>; entrance?: boolean }) {
  const { camera, pointer, size } = useThree();
  const look = useRef(new THREE.Vector3(0, 2.3, 0));
  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const targetLook = useMemo(() => new THREE.Vector3(), []);

  useLayoutEffect(() => {
    // Depuis la porte de l'accueil, on démarre déjà sur le seuil, regard vers la salle.
    camera.position.set(0, 2.3, room.front + (entrance ? 0.6 : 8));
    look.current.set(0, 2.3, room.front - 4);
    camera.lookAt(look.current);
  }, [camera, room.front, entrance]);

  useFrame((_, dt) => {
    let lambda = 2.2;
    let parallax = 0.35;
    if (view.kind === "intro") {
      targetPos.set(0, 2.3, room.front + 6);
      targetLook.set(0, 2.3, room.front - 4);
      lambda = 1;
    } else if (view.kind === "hall") {
      targetPos.set(0, 3.4, room.front - 3);
      targetLook.set(0, 2.6, -6);
      lambda = 1.1;
      parallax = 0.6;
    } else if (view.kind === "desk") {
      // De trois quarts face, côté gauche : on voit le copiste écrire et son feuillet (bureau centré en z = 1).
      const narrow = size.width < 768;
      targetPos.set(narrow ? -0.85 : -0.78, narrow ? 1.68 : 1.54, narrow ? 0.62 : 0.92);
      targetLook.set(narrow ? -0.06 : -0.22, 0.97, 1.76);
      lambda = 1.6;
      parallax = 0.04;
    } else {
      const slot = room.slots[view.shelf];
      if (view.kind === "shelf") {
        targetPos.set(0, 2.5, 4.4).applyMatrix4(slot.matrix);
        targetLook.set(0, 2.4, 0).applyMatrix4(slot.matrix);
      } else {
        const narrow = size.width < 768;
        targetPos.set(narrow ? 0 : 0.55, narrow ? 1.9 : 2.3, narrow ? 4.8 : 3.5).applyMatrix4(slot.matrix);
        targetLook.set(narrow ? 0 : 0.55, narrow ? 1.4 : 2.25, 1.2).applyMatrix4(slot.matrix);
        parallax = 0.05;
      }
    }
    const px = targetPos.x + pointer.x * parallax * 0.5;
    const py = targetPos.y + pointer.y * parallax * 0.25;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, px, lambda, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, py, lambda, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPos.z, lambda, dt);
    look.current.x = THREE.MathUtils.damp(look.current.x, targetLook.x, lambda * 1.2, dt);
    look.current.y = THREE.MathUtils.damp(look.current.y, targetLook.y, lambda * 1.2, dt);
    look.current.z = THREE.MathUtils.damp(look.current.z, targetLook.z, lambda * 1.2, dt);
    camera.lookAt(look.current);
  });
  return null;
}

/* ─── Light ──────────────────────────────────────────────────────────── */

function Lights({ reveal, lowPower }: { reveal: React.RefObject<number>; lowPower: boolean }) {
  const amb = useRef<THREE.AmbientLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const win = useRef<THREE.DirectionalLight>(null);
  const desk = useRef<THREE.PointLight>(null);
  const lamps = useRef<(THREE.PointLight | null)[]>([]);
  const lampPos = useMemo(() => {
    const zs = [-6, 2];
    return lowPower ? [[0, 6.2, -4] as const] : zs.flatMap((z) => [[-7, 6.2, z] as const, [7, 6.2, z] as const]);
  }, [lowPower]);

  useFrame(({ clock }) => {
    const r = reveal.current ?? 1;
    const t = clock.elapsedTime;
    const flicker = 1 + Math.sin(t * 7.3) * 0.03 + Math.sin(t * 13.1) * 0.02;
    // Une chandelle vacille davantage qu'un lustre de huit bougies.
    const candle = 1 + Math.sin(t * 9.7) * 0.07 + Math.sin(t * 23.3) * 0.05 + Math.sin(t * 3.1) * 0.04;
    if (amb.current) amb.current.intensity = 0.55 * r + 0.03;
    if (hemi.current) hemi.current.intensity = 0.7 * r;
    if (win.current) win.current.intensity = 1.1 * r;
    if (desk.current) desk.current.intensity = 7 * r * candle;
    lamps.current.forEach((l) => l && (l.intensity = 14 * r * flicker));
  });

  return (
    <>
      <ambientLight ref={amb} color="#ffdcb0" />
      <hemisphereLight ref={hemi} args={["#f3d9a6", "#1a0f0a"]} />
      <directionalLight ref={win} color="#ffe4b8" position={[-14, 11, 2]} />
      {/* Chandelle du bureau (le bureau est centré en z = 1) */}
      <pointLight ref={desk} color="#ff9e4a" position={[0.78, 1.38, 0.68]} distance={7.5} decay={1.6} />
      {lampPos.map((p, i) => (
        <group key={i} position={p as unknown as [number, number, number]}>
          <pointLight ref={(el) => { lamps.current[i] = el; }} color="#ffc27a" distance={16} decay={1.5} />
          <Chandelier drop={12 - p[1]} seed={i} />
        </group>
      ))}
    </>
  );
}

/** Flamme de bougie : cœur clair, flamme orangée, halo additif ; vacille et ondule. */
function Flame({ seed = 0, scale = 1 }: { seed?: number; scale?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime + seed * 1.37;
    const f = 1 + Math.sin(t * 11.3) * 0.08 + Math.sin(t * 27.1) * 0.05;
    g.scale.set(scale * (1 - (f - 1) * 0.5), scale * f, scale * (1 - (f - 1) * 0.5));
    g.rotation.z = Math.sin(t * 2.3) * 0.08;
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.032, 0]} scale={[1, 2.1, 1]}>
        <sphereGeometry args={[0.016, 10, 10]} />
        <meshBasicMaterial color="#ffb347" toneMapped={false} transparent opacity={0.92} />
      </mesh>
      <mesh position={[0, 0.026, 0]} scale={[1, 1.8, 1]}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshBasicMaterial color="#fff6d8" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.035, 0]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial color="#ffae55" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Bougie de cire : corps, coulure, mèche et flamme. */
function Candle({ height = 0.18, radius = 0.03, seed = 0 }: { height?: number; radius?: number; seed?: number }) {
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[radius * 0.94, radius, height, 14]} />
        <meshStandardMaterial color="#efe3c8" roughness={0.55} emissive="#ffb766" emissiveIntensity={0.06} />
      </mesh>
      <mesh position={[radius * 0.55, height * 0.78, 0]} scale={[0.6, 1.6, 0.6]}>
        <sphereGeometry args={[radius * 0.45, 8, 8]} />
        <meshStandardMaterial color="#f3e9d2" roughness={0.5} />
      </mesh>
      <mesh position={[0, height + 0.008, 0]}>
        <cylinderGeometry args={[0.002, 0.002, 0.016, 4]} />
        <meshBasicMaterial color="#1a1410" />
      </mesh>
      <group position={[0, height + 0.012, 0]}>
        <Flame seed={seed} />
      </group>
    </group>
  );
}

const IRON = { color: "#2b2522", metalness: 0.75, roughness: 0.45 } as const;

/**
 * Lustre médiéval : couronne de fer forgé à huit bougies, suspendue par trois chaînes
 * réunies en une seule jusqu'au plafond (`drop` = distance au plafond).
 */
function Chandelier({ drop, seed = 0 }: { drop: number; seed?: number }) {
  const R = 0.62;
  const hub = 1.15;
  const chains = useMemo(
    () =>
      [0, 1, 2].map((k) => {
        const a = (k / 3) * Math.PI * 2 + Math.PI / 6;
        const from = new THREE.Vector3(Math.cos(a) * R, 0.02, Math.sin(a) * R);
        const to = new THREE.Vector3(0, hub, 0);
        const dir = to.clone().sub(from);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        return { mid: from.clone().add(to).multiplyScalar(0.5), len: dir.length(), q };
      }),
    [],
  );
  const candles = 8;
  return (
    <group>
      {/* chaîne principale jusqu'au plafond */}
      <mesh position={[0, hub + (drop - hub) / 2, 0]}>
        <cylinderGeometry args={[0.014, 0.014, drop - hub, 6]} />
        <meshStandardMaterial {...IRON} />
      </mesh>
      <mesh position={[0, hub, 0]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial {...IRON} />
      </mesh>
      {chains.map((c, i) => (
        <mesh key={i} position={c.mid} quaternion={c.q}>
          <cylinderGeometry args={[0.009, 0.009, c.len, 5]} />
          <meshStandardMaterial {...IRON} />
        </mesh>
      ))}
      {/* couronne de fer, moyeu et rayons */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R, 0.03, 10, 48]} />
        <meshStandardMaterial {...IRON} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
        <torusGeometry args={[R * 0.82, 0.014, 8, 40]} />
        <meshStandardMaterial {...IRON} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.13, 0.025, 8, 24]} />
        <meshStandardMaterial {...IRON} />
      </mesh>
      {[0, 1, 2, 3].map((k) => (
        <mesh key={k} rotation={[0, (k / 4) * Math.PI, 0]}>
          <boxGeometry args={[R * 2, 0.02, 0.025]} />
          <meshStandardMaterial {...IRON} />
        </mesh>
      ))}
      {/* fleuron pendant sous le moyeu */}
      <mesh position={[0, -0.16, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.05, 0.22, 10]} />
        <meshStandardMaterial {...IRON} />
      </mesh>
      {/* bougies et coupelles */}
      {Array.from({ length: candles }, (_, i) => {
        const a = (i / candles) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(a) * R, 0.03, Math.sin(a) * R]}>
            <mesh>
              <cylinderGeometry args={[0.055, 0.04, 0.025, 12]} />
              <meshStandardMaterial {...IRON} />
            </mesh>
            <group position={[0, 0.012, 0]}>
              <Candle height={0.15 + ((i * 7 + seed * 3) % 5) * 0.012} seed={seed * 8 + i} />
            </group>
          </group>
        );
      })}
    </group>
  );
}

/** Grand lustre central : cage gothique, deux étages de bougies et pampilles de cristal. */
function GrandChandelier({ drop, reveal, lowPower }: {
  drop: number;
  reveal: React.RefObject<number>;
  lowPower: boolean;
}) {
  const light = useRef<THREE.PointLight>(null);
  const segments = lowPower ? 24 : 48;
  const arms = lowPower ? 8 : 12;
  const bronze = { color: "#79542f", metalness: 0.8, roughness: 0.32 };
  const curves = useMemo(() => {
    const curve = (points: [number, number, number][]) => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return {
      arm: curve([[0.2, -0.65, 0], [0.7, -0.7, 0], [1.2, -0.38, 0], [1.55, 0.12, 0], [1.67, 0.48, 0]]),
      upper: curve([[0.2, 0.1, 0], [0.45, 0.05, 0], [0.8, 0.38, 0], [0.94, 1.15, 0]]),
      rib: curve([[0.16, 2.7, 0], [0.38, 1.85, 0], [0.7, 0.8, 0], [1.3, 0, 0]]),
      scroll: curve([[1.26, 0.02, 0], [1.46, 0.24, 0], [1.32, 0.44, 0], [1.14, 0.36, 0], [1.19, 0.22, 0]]),
    };
  }, []);

  useFrame(({ clock }) => {
    if (light.current) light.current.intensity = (reveal.current ?? 1) * 17 * (1 + Math.sin(clock.elapsedTime * 5.7) * 0.025);
  });

  const pendant = (length: number) => (
    <group>
      <mesh position={[0, -length / 2, 0]}>
        <cylinderGeometry args={[0.006, 0.006, length, 5]} />
        <meshStandardMaterial {...bronze} />
      </mesh>
      <mesh position={[0, -length - 0.1, 0]} scale={[0.065, 0.16, 0.065]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#f3e5c8" metalness={0.35} roughness={0.08} transparent opacity={0.72} flatShading />
      </mesh>
    </group>
  );

  return (
    <group name="Grand lustre central">
      <pointLight ref={light} color="#ffc482" position={[0, 0.7, 0]} distance={12} decay={1.7} />
      {/* Chaîne alternée et rosace de fixation au plafond. */}
      <mesh position={[0, drop - 0.08, 0]}>
        <cylinderGeometry args={[0.24, 0.16, 0.16, segments]} />
        <meshStandardMaterial {...bronze} />
      </mesh>
      {Array.from({ length: Math.ceil((drop - 2.85) / 0.18) }, (_, i) => (
        <mesh key={i} position={[0, 2.85 + i * 0.18, 0]} rotation={[0, i % 2 ? Math.PI / 2 : 0, 0]} scale={[0.7, 1, 1]}>
          <torusGeometry args={[0.1, 0.018, 6, 12]} />
          <meshStandardMaterial {...IRON} />
        </mesh>
      ))}
      {/* Tige, cage ajourée et couronnes moulurées. */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.1, 0.17, 3.6, 12]} />
        <meshStandardMaterial {...bronze} />
      </mesh>
      {[[0, 1.3, 0.09], [0.13, 1.3, 0.035], [-0.13, 1.3, 0.035], [1.4, 0.5, 0.04], [2.3, 0.34, 0.045], [2.7, 0.25, 0.065], [-0.8, 0.33, 0.045]].map(([y, radius, tube], i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, tube, 8, segments]} />
          <meshStandardMaterial {...(i === 0 ? IRON : bronze)} />
        </mesh>
      ))}
      <mesh position={[0, -0.66, 0]}>
        <sphereGeometry args={[0.32, 16, 12]} />
        <meshStandardMaterial {...bronze} />
      </mesh>
      <mesh position={[0, -1.1, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.17, 0.4, 12]} />
        <meshStandardMaterial {...bronze} />
      </mesh>
      <group position={[0, -1.3, 0]}>{pendant(0.12)}</group>
      {Array.from({ length: arms }, (_, i) => (
        <group key={i} rotation={[0, (i / arms) * Math.PI * 2, 0]}>
          <mesh>
            <tubeGeometry args={[curves.arm, segments, 0.026, 6, false]} />
            <meshStandardMaterial {...bronze} />
          </mesh>
          <mesh>
            <tubeGeometry args={[curves.rib, segments, 0.018, 6, false]} />
            <meshStandardMaterial {...bronze} />
          </mesh>
          {!lowPower && <mesh>
            <tubeGeometry args={[curves.scroll, 24, 0.016, 5, false]} />
            <meshStandardMaterial {...bronze} />
          </mesh>}
          <group position={[1.67, 0.48, 0]}>
            <mesh>
              <cylinderGeometry args={[0.13, 0.055, 0.09, 12]} />
              <meshStandardMaterial {...bronze} />
            </mesh>
            <group position={[0, 0.045, 0]}><Candle height={0.34 + (i % 3) * 0.04} radius={0.042} seed={80 + i} /></group>
          </group>
          <group position={[1.35, -0.18, 0]}>{pendant(i % 2 ? 0.26 : 0.42)}</group>
          {/* Perles de la frise et fleuron de la cage. */}
          <mesh position={[1.31, 0, 0]} scale={[0.055, 0.08, 0.055]}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial {...bronze} />
          </mesh>
          {i % 2 === 0 && <>
            <mesh>
              <tubeGeometry args={[curves.upper, segments, 0.022, 6, false]} />
              <meshStandardMaterial {...bronze} />
            </mesh>
            <group position={[0.94, 1.15, 0]}>
              <mesh><cylinderGeometry args={[0.1, 0.04, 0.07, 12]} /><meshStandardMaterial {...bronze} /></mesh>
              <group position={[0, 0.035, 0]}><Candle height={0.32} radius={0.038} seed={110 + i} /></group>
            </group>
          </>}
        </group>
      ))}
    </group>
  );
}

/* ─── Architecture ───────────────────────────────────────────────────── */

const Architecture = memo(function Architecture({
  room,
  doorAngle,
  lowPower,
}: {
  room: ReturnType<typeof computeRoom>;
  doorAngle: React.RefObject<number>;
  lowPower: boolean;
}) {
  const { front, depth, halfW, height } = room;
  const tex = useMemo(() => {
    const floor = woodTexture("#2a1c14", 21, true, [6, (depth / 26) * 6]);
    const wall = panelTexture(5);
    wall.repeat.set(8, 3);
    const wallSide = panelTexture(9);
    wallSide.repeat.set(depth / 3, 3);
    return { floor, wall, wallSide, window: windowTexture(), shaft: shaftTexture(), rug: rugTexture(), door: woodTexture("#2b1e16", 31) };
  }, [depth]);
  const midZ = (front + -9.5) / 2;
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = (doorAngle.current ?? 1) * 1.75;
    if (left.current) left.current.rotation.y = a;
    if (right.current) right.current.rotation.y = -a;
  });
  const windows = useMemo(() => {
    const out: { x: number; z: number; ry: number }[] = [];
    for (let z = -6; z < front - 3; z += 6) {
      out.push({ x: -halfW + 0.02, z, ry: Math.PI / 2 }, { x: halfW - 0.02, z, ry: -Math.PI / 2 });
    }
    return out;
  }, [front, halfW]);

  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, midZ]}>
        <planeGeometry args={[halfW * 2, depth]} />
        <meshStandardMaterial map={tex.floor} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 1]}>
        <planeGeometry args={[7, 5]} />
        <meshStandardMaterial map={tex.rug} roughness={0.95} />
      </mesh>
      {/* ceiling with beams */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, height, midZ]}>
        <planeGeometry args={[halfW * 2, depth]} />
        <meshStandardMaterial color="#120d0a" roughness={1} />
      </mesh>
      {Array.from({ length: Math.ceil(depth / 3.2) }, (_, i) => (
        <mesh key={i} position={[0, height - 0.25, -9.5 + 1.6 + i * 3.2]}>
          <boxGeometry args={[halfW * 2, 0.5, 0.35]} />
          <meshStandardMaterial color="#1d1410" roughness={0.9} />
        </mesh>
      ))}
      {/* walls */}
      <mesh position={[0, height / 2, -9.5]}>
        <planeGeometry args={[halfW * 2, height]} />
        <meshStandardMaterial map={tex.wall} roughness={0.85} />
      </mesh>
      <mesh position={[-halfW, height / 2, midZ]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial map={tex.wallSide} roughness={0.85} />
      </mesh>
      <mesh position={[halfW, height / 2, midZ]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial map={tex.wallSide} roughness={0.85} />
      </mesh>
      {/* front wall with door opening (3 m wide, 6 m high) */}
      <mesh position={[-(halfW + 1.6) / 2, height / 2, front]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[halfW - 1.6, height]} />
        <meshStandardMaterial map={tex.wall} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[(halfW + 1.6) / 2, height / 2, front]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[halfW - 1.6, height]} />
        <meshStandardMaterial map={tex.wall} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, (height + 6) / 2, front]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[3.2, height - 6]} />
        <meshStandardMaterial map={tex.wall} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      {/* door frame */}
      <mesh position={[0, 6.1, front]}>
        <boxGeometry args={[3.6, 0.25, 0.4]} />
        <meshStandardMaterial color="#3b2a1e" roughness={0.6} />
      </mesh>
      {[-1.7, 1.7].map((x) => (
        <mesh key={x} position={[x, 3, front]}>
          <boxGeometry args={[0.22, 6, 0.4]} />
          <meshStandardMaterial color="#3b2a1e" roughness={0.6} />
        </mesh>
      ))}
      {/* doors, hinged on the frame */}
      <group ref={left} position={[-1.6, 0, front]}>
        <Door tex={tex.door} offset={0.8} />
      </group>
      <group ref={right} position={[1.6, 0, front]}>
        <Door tex={tex.door} offset={-0.8} />
      </group>
      {/* gothic windows + light shafts */}
      {windows.map((w, i) => (
        <group key={i} position={[w.x, 0, w.z]} rotation={[0, w.ry, 0]}>
          <mesh position={[0, 8.4, 0]}>
            <planeGeometry args={[1.8, 3.6]} />
            <meshBasicMaterial map={tex.window} toneMapped={false} transparent opacity={0.9} />
          </mesh>
          {!lowPower && (
            <mesh position={[0, 5.2, 3.4]} rotation={[0.95, 0, 0]}>
              <planeGeometry args={[1.9, 7.4]} />
              <meshBasicMaterial map={tex.shaft} transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
});

function Door({ tex, offset }: { tex: THREE.Texture; offset: number }) {
  return (
    <group position={[offset, 0, 0]}>
      <mesh position={[0, 3, 0]}>
        <boxGeometry args={[1.6, 6, 0.12]} />
        <meshStandardMaterial map={tex} roughness={0.7} />
      </mesh>
      {[1.6, 4.3].map((y) => (
        <mesh key={y} position={[0, y, 0.07]}>
          <boxGeometry args={[1.1, y === 1.6 ? 1.9 : 2.6, 0.03]} />
          <meshStandardMaterial color="#2a1d15" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[-offset * 0.8, 3, 0.1]}>
        <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
        <meshStandardMaterial color="#c3a16b" metalness={0.9} roughness={0.25} />
      </mesh>
    </group>
  );
}

const GILT = { color: "#c9a050", metalness: 0.95, roughness: 0.26 } as const;
const BRASS = { color: "#b8914f", metalness: 0.9, roughness: 0.3 } as const;
/** Dorure à la feuille : moins métallique, pour rester dorée sans reflets d'environnement. */
const GILDING = { color: "#d4ac58", metalness: 0.55, roughness: 0.32, emissive: "#3a2808", emissiveIntensity: 0.35 } as const;

/** Pied galbé (cabriole) : genou saillant, cheville rentrée, sabot doré ; garniture dorée au genou. */
function CabrioleLeg({ x, z, wood, gilt = false }: { x: number; z: number; wood?: THREE.Texture; gilt?: boolean }) {
  const segs = useMemo(() => {
    const out = new THREE.Vector3(Math.sign(x), 0, Math.sign(z)).normalize();
    const at = (o: number, y: number) => new THREE.Vector3(x + out.x * o, y, z + out.z * o);
    const curve = new THREE.CatmullRomCurve3([at(0, 0.64), at(0.06, 0.54), at(0.035, 0.36), at(-0.025, 0.14), at(0.005, 0.03)]);
    const radius = (t: number) => (t < 0.18 ? 0.05 + t * 0.05 : THREE.MathUtils.lerp(0.059, 0.024, Math.min(1, (t - 0.18) / 0.62)));
    const N = 12;
    return Array.from({ length: N }, (_, i) => {
      const t0 = i / N;
      const t1 = (i + 1) / N;
      const p0 = curve.getPoint(t0);
      const p1 = curve.getPoint(t1);
      const dir = p1.clone().sub(p0);
      return {
        mid: p0.clone().add(p1).multiplyScalar(0.5),
        len: dir.length() * 1.12,
        q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
        r0: radius(t0),
        r1: radius(t1),
      };
    });
  }, [x, z]);
  const out = new THREE.Vector3(Math.sign(x), 0, Math.sign(z)).normalize();
  return (
    <group>
      {segs.map((s, i) => (
        <mesh key={i} position={s.mid} quaternion={s.q}>
          <cylinderGeometry args={[s.r1, s.r0, s.len, 10]} />
          {gilt ? <meshStandardMaterial {...GILDING} /> : <meshStandardMaterial map={wood} color="#5a3220" roughness={0.38} />}
        </mesh>
      ))}
      {/* espagnolette dorée au genou */}
      <mesh position={[x + out.x * 0.1, 0.55, z + out.z * 0.1]} scale={[0.035, 0.075, 0.035]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial {...(gilt ? GILDING : GILT)} />
      </mesh>
      <mesh position={[x + out.x * 0.095, 0.45, z + out.z * 0.095]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.03, 0.13, 8]} />
        <meshStandardMaterial {...(gilt ? GILDING : GILT)} />
      </mesh>
      {/* sabot de bronze */}
      <mesh position={[x + out.x * 0.005, 0.025, z + out.z * 0.005]}>
        <cylinderGeometry args={[0.024, 0.034, 0.05, 12]} />
        <meshStandardMaterial {...(gilt ? GILDING : GILT)} />
      </mesh>
    </group>
  );
}

/** Tiroir de ceinture : façade à filet doré et poignée en accolade. */
function Drawer({ x, z, w, face }: { x: number; z: number; w: number; face: 1 | -1 }) {
  const fz = z + face * 0.008;
  return (
    <group>
      <mesh position={[x, 0.71, fz]}>
        <boxGeometry args={[w, 0.12, 0.016]} />
        <meshStandardMaterial color="#3b1f14" roughness={0.4} />
      </mesh>
      {/* filet doré */}
      {[0.052, -0.052].map((dy) => (
        <mesh key={dy} position={[x, 0.71 + dy, fz + face * 0.009]}>
          <boxGeometry args={[w - 0.02, 0.006, 0.004]} />
          <meshStandardMaterial {...GILT} />
        </mesh>
      ))}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[x + sx * (w / 2 - 0.013), 0.71, fz + face * 0.009]}>
          <boxGeometry args={[0.006, 0.11, 0.004]} />
          <meshStandardMaterial {...GILT} />
        </mesh>
      ))}
      {/* poignée */}
      <mesh position={[x, 0.705, fz + face * 0.02]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.04, 0.006, 6, 20, Math.PI]} />
        <meshStandardMaterial {...GILT} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[x + sx * 0.05, 0.712, fz + face * 0.014]}>
          <sphereGeometry args={[0.012, 10, 10]} />
          <meshStandardMaterial {...GILT} />
        </mesh>
      ))}
    </group>
  );
}

/** Encrier de cristal hexagonal, couvercle de laiton ouvert, plume noire dans son porte-plume. */
function Inkwell() {
  const feather = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.bezierCurveTo(0.03, 0.04, 0.045, 0.12, 0.028, 0.2);
    sh.bezierCurveTo(0.02, 0.23, 0.008, 0.25, 0, 0.26);
    sh.bezierCurveTo(-0.012, 0.22, -0.03, 0.14, -0.02, 0.05);
    sh.bezierCurveTo(-0.016, 0.03, -0.008, 0.01, 0, 0);
    return new THREE.ShapeGeometry(sh, 16);
  }, []);
  return (
    <group>
      {/* flacon de cristal */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.048, 0.052, 0.06, 6]} />
        <meshPhysicalMaterial color="#e6eef5" roughness={0.04} metalness={0} transparent opacity={0.32} clearcoat={1} />
      </mesh>
      <mesh position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.04, 0.044, 0.042, 6]} />
        <meshStandardMaterial color="#0c1840" roughness={0.15} transparent opacity={0.92} />
      </mesh>
      {/* col et couvercle de laiton */}
      <mesh position={[0, 0.068, 0]}>
        <cylinderGeometry args={[0.026, 0.028, 0.018, 20]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <group position={[-0.026, 0.077, 0]} rotation={[0, 0, 1.75]}>
        <mesh position={[0.026, 0, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.006, 20]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
      </group>
      {/* porte-plume et plume, inclinés vers l'arrière-droite */}
      <group position={[0, 0.07, 0]} rotation={[-0.25, 0, -0.38]}>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.0055, 0.004, 0.07, 8]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh geometry={feather} position={[0, 0.06, 0]}>
          <meshStandardMaterial color="#1b1a22" roughness={0.6} metalness={0.15} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={feather} position={[0, 0.06, 0]} rotation={[0, Math.PI / 2, 0]} scale={[0.6, 1, 1]}>
          <meshStandardMaterial color="#26242e" roughness={0.6} metalness={0.15} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.19, 0]}>
          <cylinderGeometry args={[0.0012, 0.002, 0.26, 4]} />
          <meshStandardMaterial color="#d9d2c4" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

/** Chandelier de laiton à trois branches : pied tourné, deux bras en volute, trois bougies. */
function Candelabra() {
  const lathe = useMemo(() => {
    const pts = [
      [0.0, 0], [0.08, 0], [0.08, 0.006], [0.06, 0.014], [0.036, 0.03], [0.024, 0.06], [0.018, 0.12],
      [0.026, 0.15], [0.016, 0.17], [0.022, 0.19], [0.014, 0.215], [0.0, 0.215],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    return new THREE.LatheGeometry(pts, 28);
  }, []);
  const cup = useMemo(() => {
    const pts = [[0, 0], [0.012, 0], [0.016, 0.01], [0.042, 0.016], [0.044, 0.022], [0.024, 0.026], [0.026, 0.05], [0.022, 0.05], [0, 0.05]].map(
      ([r, y]) => new THREE.Vector2(r, y),
    );
    return new THREE.LatheGeometry(pts, 24);
  }, []);
  const arm = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [[0, 0.2, 0], [0.04, 0.19, 0], [0.085, 0.205, 0], [0.11, 0.235, 0], [0.115, 0.255, 0]].map(([a, b, c2]) => new THREE.Vector3(a, b, c2)),
      ),
    [],
  );
  return (
    <group>
      <mesh geometry={lathe}>
        <meshStandardMaterial {...BRASS} />
      </mesh>
      {[1, -1].map((sx) => (
        <group key={sx} scale={[sx, 1, 1]}>
          <mesh>
            <tubeGeometry args={[arm, 24, 0.008, 8, false]} />
            <meshStandardMaterial {...BRASS} />
          </mesh>
          <mesh position={[0.07, 0.19, 0]} rotation={[0, 0, -0.6]}>
            <coneGeometry args={[0.009, 0.03, 8]} />
            <meshStandardMaterial {...BRASS} />
          </mesh>
          <group position={[0.115, 0.252, 0]}>
            <mesh geometry={cup}>
              <meshStandardMaterial {...BRASS} />
            </mesh>
            <group position={[0, 0.045, 0]}>
              <Candle height={0.2} radius={0.019} seed={sx > 0 ? 61 : 67} />
            </group>
          </group>
        </group>
      ))}
      <group position={[0, 0.215, 0]}>
        <mesh geometry={cup} scale={[1.1, 1.3, 1.1]}>
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <group position={[0, 0.06, 0]}>
          <Candle height={0.23} radius={0.02} seed={64} />
        </group>
      </group>
    </group>
  );
}

/** Globe terrestre ancien : socle de bois tourné, trépied de laiton, méridien incliné ; tourne lentement. */
function Globe() {
  const tex = useMemo(() => globeTexture(), []);
  const spin = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += dt * 0.12;
  });
  const base = useMemo(() => {
    const pts = [[0, 0], [0.11, 0], [0.115, 0.008], [0.108, 0.018], [0.1, 0.022], [0.098, 0.03], [0.07, 0.034], [0, 0.034]].map(
      ([r, y]) => new THREE.Vector2(r, y),
    );
    return new THREE.LatheGeometry(pts, 32);
  }, []);
  const R = 0.105;
  const cy = 0.27;
  return (
    <group>
      <mesh geometry={base}>
        <meshStandardMaterial color="#5a3018" roughness={0.35} />
      </mesh>
      {/* boussole sur le socle */}
      <mesh position={[0, 0.036, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.04, 24]} />
        <meshStandardMaterial color="#d9cfae" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.037, 0]} rotation={[-Math.PI / 2, 0, 0.4]}>
        <planeGeometry args={[0.006, 0.065]} />
        <meshStandardMaterial color="#7a1e22" />
      </mesh>
      {/* trépied : trois arcs de laiton */}
      {[0, 1, 2].map((k) => (
        <mesh key={k} position={[0, 0.034, 0]} rotation={[0, (k / 3) * Math.PI * 2, 0]}>
          <torusGeometry args={[0.06, 0.006, 6, 20, Math.PI]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
      ))}
      <mesh position={[0, 0.125, 0]}>
        <cylinderGeometry args={[0.009, 0.014, 0.07, 12]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.016, 12, 12]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      {/* globe et méridien inclinés */}
      <group position={[0, cy, 0]} rotation={[0, 0, -0.41]}>
        <mesh ref={spin}>
          <sphereGeometry args={[R, 40, 28]} />
          <meshStandardMaterial map={tex} roughness={0.55} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[R + 0.012, 0.0055, 8, 64]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh position={[0, R + 0.03, 0]}>
          <coneGeometry args={[0.006, 0.03, 8]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh position={[0, -(R + 0.02), 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.03, 6]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
      </group>
      {/* cercle d'horizon, porté par le pied */}
      <mesh position={[0, cy - 0.01, 0]} rotation={[Math.PI / 2 + 0.25, 0, 0]}>
        <torusGeometry args={[R + 0.022, 0.006, 8, 64]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh position={[0, (cy + 0.16) / 2 - 0.02, 0]}>
        <cylinderGeometry args={[0.005, 0.005, cy - 0.16 - 0.06, 6]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
    </group>
  );
}

/* ─── Le moine copiste ──────────────────────────────────────────────────── */

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

/** Résout un bras à deux segments : renvoie le coude pour atteindre `target` depuis `shoulder`. */
function solveArm(shoulder: THREE.Vector3, target: THREE.Vector3, a: number, b: number, pole: THREE.Vector3, outElbow: THREE.Vector3, outHand: THREE.Vector3) {
  const dir = target.clone().sub(shoulder);
  const d = THREE.MathUtils.clamp(dir.length(), Math.abs(a - b) + 1e-3, (a + b) * 0.999);
  dir.normalize();
  const cosA = (a * a + d * d - b * b) / (2 * a * d);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const perp = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  outElbow.copy(shoulder).addScaledVector(dir, a * cosA).addScaledVector(perp, a * sinA);
  outHand.copy(shoulder).addScaledVector(dir, d);
}

/** Place un cylindre unitaire (hauteur 1) entre deux points. */
function placeSegment(mesh: THREE.Object3D | null, from: THREE.Vector3, to: THREE.Vector3) {
  if (!mesh) return;
  const dir = to.clone().sub(from);
  const len = dir.length();
  mesh.position.copy(from).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.scale.set(1, len, 1);
}

/**
 * Moine copiste (dessin original, procédural), d'après l'iconographie des scriptoria :
 * assis dans le fauteuil du bureau. Vieil érudit au front dégarni, cheveux et longue barbe
 * blancs, habit sombre à larges manches, cordelière nouée, sandales, et lourde chaîne de
 * maillons de métaux mêlés (or, argent, fer, bronze, cuivre) passée autour du cou. Il trempe sa plume dans son cornet à encre puis écrit
 * sur un feuillet posé sur un pupitre incliné, devant lui.
 * Coordonnées locales du bureau ; le moine regarde vers −z.
 */
function Copyist({ note, top, onDone }: { note: CopyistNote | null; top: number; onDone?: () => void }) {
  const fonts = useMemo(() => resolveFonts(), []);
  const [current, setCurrent] = useState<CopyistNote | null>(note);
  const root = useRef<THREE.Group>(null);
  const upper = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const beard = useRef<THREE.Group>(null);
  const segs = useRef<(THREE.Mesh | null)[]>([]);
  const hands = useRef<(THREE.Mesh | null)[]>([]);
  const quill = useRef<THREE.Group>(null);
  const clock = useRef({ start: -1, leaveStart: -1, done: false });

  // Nouvelle recommandation : on l'adopte pendant le rendu (le moine reste affiché pendant sa sortie).
  if (note && note.key !== current?.key) setCurrent(note);
  const hasNote = note !== null;
  useEffect(() => {
    if (hasNote) clock.current = { start: -1, leaveStart: -1, done: false };
    else clock.current.leaveStart = -2; // sortie demandée : démarre au prochain frame
  }, [hasNote, note?.key]);

  const sheet = useMemo(() => (current ? writingSheet(current, fonts) : null), [current, fonts]);
  useEffect(() => () => sheet?.texture.dispose(), [sheet]);

  const mats = useMemo(
    () => ({
      robe: new THREE.MeshStandardMaterial({ color: "#36312c", roughness: 1, transparent: true }),
      fold: new THREE.MeshStandardMaterial({ color: "#26221f", roughness: 1, transparent: true }),
      sleeve: new THREE.MeshStandardMaterial({ color: "#36312c", roughness: 1, transparent: true, side: THREE.DoubleSide }),
      skin: new THREE.MeshStandardMaterial({ color: "#dab49c", roughness: 0.8, transparent: true }),
      wrinkle: new THREE.MeshStandardMaterial({ color: "#a97f68", roughness: 0.9, transparent: true }),
      hair: new THREE.MeshStandardMaterial({ color: "#ece8e0", roughness: 0.95, transparent: true }),
      eye: new THREE.MeshStandardMaterial({ color: "#1a120c", roughness: 0.4, transparent: true }),
      rope: new THREE.MeshStandardMaterial({ color: "#cdb48a", roughness: 0.9, transparent: true }),
      wood: new THREE.MeshStandardMaterial({ color: "#6a4228", roughness: 0.6, transparent: true }),
      leather: new THREE.MeshStandardMaterial({ color: "#5a3a22", roughness: 0.7, transparent: true }),
      quill: new THREE.MeshStandardMaterial({ color: "#f2ede0", roughness: 0.6, transparent: true, side: THREE.DoubleSide }),
      sheet: new THREE.MeshStandardMaterial({ roughness: 0.92, transparent: true }),
      // Maillons de la chaîne : chaque métal correspond à une discipline étudiée.
      gold: new THREE.MeshStandardMaterial({ color: "#d1a54c", metalness: 0.6, roughness: 0.35, emissive: "#2a1c06", transparent: true }),
      silver: new THREE.MeshStandardMaterial({ color: "#d4d5da", metalness: 0.6, roughness: 0.32, emissive: "#1a1a1c", transparent: true }),
      iron: new THREE.MeshStandardMaterial({ color: "#6a6d72", metalness: 0.55, roughness: 0.55, transparent: true }),
      bronze: new THREE.MeshStandardMaterial({ color: "#b07a3e", metalness: 0.6, roughness: 0.4, emissive: "#1e1206", transparent: true }),
      copper: new THREE.MeshStandardMaterial({ color: "#c06a40", metalness: 0.6, roughness: 0.4, emissive: "#1e0c04", transparent: true }),
    }),
    [],
  );
  useEffect(() => {
    if (sheet) {
      mats.sheet.map = sheet.texture;
      mats.sheet.needsUpdate = true;
    }
  }, [sheet, mats]);

  const geo = useMemo(() => {
    const lathe = (pts: number[][], seg = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
    const wedge = new THREE.Shape();
    // Le grand côté passe sous le bord haut du pupitre (côté opposé au moine, −z une fois tourné).
    wedge.moveTo(-0.15, 0);
    wedge.lineTo(0.15, 0);
    wedge.lineTo(0.15, 0.115);
    wedge.closePath();
    return {
      torso: lathe([[0, 0], [0.2, 0], [0.215, 0.16], [0.2, 0.31], [0.13, 0.43], [0, 0.44]]),
      skirt: lathe([[0, 0.58], [0.17, 0.58], [0.2, 0.4], [0.24, 0.08], [0.26, 0], [0, 0]]),
      // Longue barbe : goutte arrondie en haut, en pointe en bas (normalisée, mise à l'échelle au rendu).
      beard: lathe([[0, -0.5], [0.15, -0.45], [0.45, -0.3], [0.8, -0.1], [1, 0.15], [0.95, 0.3], [0.6, 0.45], [0, 0.5]], 20),
      wedge: new THREE.ExtrudeGeometry(wedge, { depth: 0.012, bevelEnabled: false }),
      link: new THREE.TorusGeometry(0.016, 0.0045, 6, 14),
      feather: (() => {
        const sh = new THREE.Shape();
        sh.moveTo(0, 0);
        sh.bezierCurveTo(0.018, 0.03, 0.026, 0.09, 0.012, 0.15);
        sh.lineTo(0, 0.16);
        sh.bezierCurveTo(-0.014, 0.1, -0.018, 0.04, 0, 0);
        return new THREE.ShapeGeometry(sh, 10);
      })(),
    };
  }, []);

  // Chaîne de maillons autour du cou, posée sur le buste (repère du buste) : elle passe
  // sur la nuque et descend en pointe sur la poitrine. Maillons alternés à plat / de chant.
  const chain = useMemo(() => {
    const METALS = ["gold", "iron", "silver", "bronze", "copper", "iron", "silver"] as const;
    const profile = [[0, 0.2], [0.16, 0.215], [0.31, 0.2], [0.43, 0.13]]; // (y, rayon) du buste
    const radiusAt = (y: number) => {
      for (let k = 1; k < profile.length; k++) {
        const [y0, r0] = profile[k - 1];
        const [y1, r1] = profile[k];
        if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
      }
      return profile[profile.length - 1][1];
    };
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k < 28; k++) {
      const phi = (k / 28) * Math.PI * 2;
      const y = 0.43 - 0.18 * Math.pow((1 + Math.cos(phi)) / 2, 1.5);
      const r = radiusAt(y) + 0.013;
      pts.push(new THREE.Vector3(Math.sin(phi) * r, y, -Math.cos(phi) * r));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);
    const n = Math.round(curve.getLength() / 0.034);
    return Array.from({ length: n }, (_, i) => {
      const p = curve.getPointAt(i / n);
      const t = curve.getTangentAt(i / n);
      const out = new THREE.Vector3(p.x, 0, p.z).normalize();
      const flat = out.clone().sub(t.clone().multiplyScalar(t.dot(out))).normalize();
      const normal = i % 2 === 0 ? flat : new THREE.Vector3().crossVectors(t, flat).normalize();
      const up = new THREE.Vector3().crossVectors(normal, t);
      const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(t, up, normal));
      return { p, q, metal: METALS[i % METALS.length] };
    });
  }, []);

  // Points clés (repère du bureau)
  const P = useMemo(() => {
    // Pupitre au bord avant du bureau, face au fauteuil (siège centré en z = 1.05).
    const BOARD = { x: 0.04, z: 0.45, yaw: 0, tilt: 0.38, w: 0.28, d: 0.3 };
    const yOff = Math.sin(BOARD.tilt) * (BOARD.d / 2) + 0.006;
    // Repère du pupitre : pour placer la pointe de la plume sur le feuillet.
    const outer = new THREE.Object3D();
    outer.position.set(BOARD.x, top, BOARD.z);
    outer.rotation.y = BOARD.yaw;
    const inner = new THREE.Object3D();
    inner.position.y = yOff;
    inner.rotation.x = BOARD.tilt;
    outer.add(inner);
    outer.updateMatrixWorld(true);
    return {
      BOARD,
      yOff,
      board: inner,
      // Assis sur le coussin du fauteuil (dessus à y ≈ 0.55), vers l'avant de l'assise.
      hip: new THREE.Vector3(0, 0.645, 1.0),
      shinZ: 0.65,
      // Cornet à encre du copiste, à droite du pupitre (l'encrier de cristal est hors de portée).
      ink: new THREE.Vector3(0.3, top + 0.07, 0.47),
      inkAbove: new THREE.Vector3(0.3, top + 0.17, 0.47),
      rest: new THREE.Vector3(0.22, top + 0.04, 0.57),
      leftHand: inner.localToWorld(new THREE.Vector3(-0.12, 0.03, -0.01)),
    };
  }, [top]);

  const SW = 0.2;
  const SH = 0.26;
  const sheetPoint = (cx: number, cy: number, lift: number) => {
    const u = (cx / (sheet?.width ?? 480) - 0.5) * SW;
    const v = (cy / (sheet?.height ?? 640) - 0.5) * SH;
    return P.board.localToWorld(new THREE.Vector3(u, 0.0075 + lift, v));
  };

  useFrame(({ clock: c }) => {
    const g = root.current;
    if (!g) return;
    if (!current) {
      g.visible = false;
      return;
    }
    g.visible = true;
    const ck = clock.current;
    const now = c.elapsedTime;
    if (ck.start < 0) ck.start = current.instant ? now - 60 : now;
    if (ck.leaveStart === -2) ck.leaveStart = now;
    const t = now - ck.start;

    // Durées
    const writeStart = 3.5;
    const chars = current.title.length + current.author.length + current.phrase.length + 30;
    const writeDur = THREE.MathUtils.clamp(chars * 0.035, 4, 9);
    const writeEnd = writeStart + writeDur;
    const end = writeEnd + 0.7;

    // Apparition, penchée (plus forte pour atteindre l'encrier), sortie
    let appear = smooth(t / 1.0);
    const dip = smooth((t - 1.6) / 0.5) * (1 - smooth((t - 3.0) / 0.5));
    let lean = 0.12 + 0.23 * smooth((t - 0.6) / 0.8) + 0.1 * dip;
    if (t > writeEnd) lean -= 0.12 * smooth((t - writeEnd) / 0.7);
    if (ck.leaveStart > 0) {
      const lt = now - ck.leaveStart;
      appear *= 1 - smooth(lt / 0.9);
      lean *= 1 - smooth(lt / 0.6);
      if (lt > 1) {
        setCurrent(null);
        return;
      }
    }
    for (const m of Object.values(mats)) {
      m.opacity = appear;
      m.depthWrite = appear > 0.98;
    }
    g.position.y = -0.03 * (1 - appear);
    if (upper.current) upper.current.rotation.x = -lean;

    // Épaules (repère du bureau)
    const shoulder = (sx: number) =>
      new THREE.Vector3(P.hip.x + sx * 0.17, P.hip.y + 0.38 * Math.cos(lean), P.hip.z - 0.38 * Math.sin(lean));

    // Trajet de la pointe de la plume
    let tip = P.rest.clone();
    if (t < 1.8) tip = P.rest.clone();
    else if (t < 2.6) tip = P.rest.clone().lerp(P.inkAbove, smooth((t - 1.8) / 0.8));
    else if (t < 3.0) {
      const k = Math.sin(((t - 2.6) / 0.4) * Math.PI);
      tip = P.inkAbove.clone().lerp(P.ink, k);
    } else if (t < writeStart) {
      tip = P.inkAbove.clone().lerp(sheetPoint(44, 64, 0.02), smooth((t - 3.0) / (writeStart - 3.0)));
    } else if (t < writeEnd) {
      const cur = sheet ? sheet.render((t - writeStart) / writeDur) : { x: 240, y: 300 };
      const wiggle = Math.sin(t * 38) * 0.004 + Math.abs(Math.sin(t * 9)) * 0.004;
      tip = sheetPoint(cur.x, cur.y, 0.002 + wiggle);
    } else {
      tip = sheetPoint(380, 500, 0.03).lerp(P.rest, smooth((t - writeEnd) / 0.7));
    }
    if (t >= writeEnd && sheet && !ck.done) sheet.render(1);
    if (t >= end && !ck.done) {
      ck.done = true;
      onDone?.();
    }

    // Le regard suit la plume
    if (head.current) {
      head.current.rotation.x = -0.18 - 0.12 * dip + 0.25 * lean;
      head.current.rotation.y = THREE.MathUtils.clamp((tip.x - P.hip.x) * 0.9, -0.5, 0.5);
      // La longue barbe pivote avec la tête autour de l'axe du buste (buste de révolution :
      // l'écart à l'habit reste le même), sans suivre l'inclinaison pour ne pas y rentrer.
      if (beard.current) beard.current.rotation.y = head.current.rotation.y;
    }

    // Bras droit : la main tient la plume un peu au-dessus et en arrière de la pointe
    const handTarget = tip.clone().add(new THREE.Vector3(0.012, 0.055, 0.03));
    const rs = shoulder(1);
    const re = new THREE.Vector3();
    const rh = new THREE.Vector3();
    solveArm(rs, handTarget, 0.3, 0.3, new THREE.Vector3(0.8, -0.7, 0.5), re, rh);
    placeSegment(segs.current[0], rs, re);
    placeSegment(segs.current[1], re, rh);
    hands.current[0]?.position.copy(rh);
    if (quill.current) {
      const dir = tip.clone().sub(rh).normalize();
      quill.current.position.copy(tip);
      quill.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    }
    // Bras gauche : la main maintient le bord du pupitre
    const ls = shoulder(-1);
    const le = new THREE.Vector3();
    const lh = new THREE.Vector3();
    solveArm(ls, P.leftHand, 0.3, 0.3, new THREE.Vector3(-0.5, -0.9, 0.4), le, lh);
    placeSegment(segs.current[2], ls, le);
    placeSegment(segs.current[3], le, lh);
    hands.current[1]?.position.copy(lh);
  });

  if (!current) return null;
  const B = P.BOARD;
  const H = P.hip;
  return (
    <group>
      {/* pupitre incliné et feuillet */}
      <group position={[B.x, top, B.z]} rotation={[0, B.yaw, 0]}>
        <group position={[0, P.yOff, 0]} rotation={[B.tilt, 0, 0]}>
          <mesh material={mats.wood}>
            <boxGeometry args={[B.w, 0.012, B.d]} />
          </mesh>
          <mesh position={[0, 0.0075, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.sheet}>
            <planeGeometry args={[SW, SH]} />
          </mesh>
          <mesh position={[0, 0.014, B.d / 2 - 0.008]} material={mats.wood}>
            <boxGeometry args={[B.w, 0.018, 0.012]} />
          </mesh>
        </group>
        {[-1, 1].map((sx) => (
          <mesh key={sx} geometry={geo.wedge} position={[sx * (B.w / 2 - 0.012) - 0.006, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={mats.wood} />
        ))}
      </group>

      {/* cornet à encre */}
      <group position={[P.ink.x, top, P.ink.z]}>
        <mesh position={[0, 0.008, 0]} material={mats.wood}>
          <cylinderGeometry args={[0.032, 0.036, 0.016, 16]} />
        </mesh>
        <mesh position={[0, 0.048, 0]} material={mats.rope}>
          <cylinderGeometry args={[0.022, 0.013, 0.07, 14]} />
        </mesh>
        <mesh position={[0, 0.0835, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.eye}>
          <circleGeometry args={[0.018, 14]} />
        </mesh>
      </group>

      {/* corps assis */}
      <group ref={root}>
        {/* robe sur l'assise et les cuisses */}
        <mesh position={[H.x, H.y + 0.01, H.z - 0.02]} scale={[0.23, 0.1, 0.2]} material={mats.robe}>
          <sphereGeometry args={[1, 20, 14]} />
        </mesh>
        {[-1, 1].map((sx) => (
          <mesh key={sx} position={[H.x + sx * 0.09, H.y - 0.01, H.z - 0.15]} rotation={[Math.PI / 2 - 0.06, 0, 0]} material={mats.robe}>
            <capsuleGeometry args={[0.085, 0.2, 6, 12]} />
          </mesh>
        ))}
        {/* pan de robe tombant des genoux, plis */}
        <mesh geometry={geo.skirt} position={[H.x, 0, P.shinZ]} material={mats.robe} />
        {[-0.12, -0.04, 0.05, 0.13].map((dx, k) => (
          <mesh key={k} position={[H.x + dx, 0.27, P.shinZ - 0.215 + Math.abs(dx) * 0.25]} rotation={[0.08, 0, dx * 0.6]} material={mats.fold}>
            <cylinderGeometry args={[0.012, 0.022, 0.52, 6]} />
          </mesh>
        ))}
        {/* sandales */}
        {[-1, 1].map((sx) => (
          <group key={sx} position={[H.x + sx * 0.08, 0, P.shinZ - 0.27]}>
            <mesh position={[0, 0.008, 0]} material={mats.leather}>
              <boxGeometry args={[0.075, 0.016, 0.13]} />
            </mesh>
            <mesh position={[0, 0.03, -0.01]} rotation={[Math.PI / 2, 0, 0]} material={mats.skin}>
              <capsuleGeometry args={[0.03, 0.06, 4, 10]} />
            </mesh>
            <mesh position={[0, 0.042, -0.015]} material={mats.leather}>
              <boxGeometry args={[0.07, 0.012, 0.018]} />
            </mesh>
          </group>
        ))}

        {/* buste, penché vers le pupitre */}
        <group ref={upper} position={[H.x, H.y, H.z]}>
          <mesh geometry={geo.torso} material={mats.robe} />
          {/* plis du buste */}
          {[-0.08, 0.08].map((dx) => (
            <mesh key={dx} position={[dx, 0.2, -0.2]} rotation={[0.1, 0, dx]} material={mats.fold}>
              <cylinderGeometry args={[0.01, 0.018, 0.34, 6]} />
            </mesh>
          ))}
          {/* cordelière nouée */}
          <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.rope}>
            <torusGeometry args={[0.205, 0.013, 6, 28]} />
          </mesh>
          <group position={[0.1, 0.03, -0.18]} rotation={[0.25, 0, 0.15]}>
            <mesh position={[0, -0.16, 0]} material={mats.rope}>
              <cylinderGeometry args={[0.008, 0.008, 0.32, 6]} />
            </mesh>
            {[-0.06, -0.16, -0.28].map((y) => (
              <mesh key={y} position={[0, y, 0]} material={mats.rope}>
                <sphereGeometry args={[0.016, 8, 8]} />
              </mesh>
            ))}
          </group>
          {/* chaîne de métaux mêlés, et ses pendeloques sur la poitrine */}
          {chain.map((l, k) => (
            <mesh key={k} geometry={geo.link} position={l.p} quaternion={l.q} scale={[1.35, 1, 1]} material={mats[l.metal]} />
          ))}
          <mesh position={[0, 0.212, -0.226]} material={mats.gold}>
            <torusGeometry args={[0.026, 0.006, 8, 22]} />
          </mesh>
          <mesh position={[-0.055, 0.235, -0.218]} rotation={[Math.PI / 2, 0, 0]} material={mats.silver}>
            <cylinderGeometry args={[0.017, 0.017, 0.004, 16]} />
          </mesh>
          <mesh position={[0.055, 0.228, -0.219]} rotation={[0, 0, 0.12]} material={mats.iron}>
            <boxGeometry args={[0.007, 0.045, 0.005]} />
          </mesh>

          {/* longue barbe posée sur la poitrine (repère du buste, ~1 cm au-dessus de l'habit) :
              du menton (y 0.50, z −0.145) à la pointe (y 0.30, z −0.258), aplatie contre le buste */}
          <group ref={beard}>
            <mesh geometry={geo.beard} position={[0, 0.399, -0.2015]} rotation={[0.5064, 0, 0]} scale={[0.08, 0.2332, 0.04]} material={mats.hair} />
          </group>

          {/* cou */}
          <mesh position={[0, 0.45, -0.005]} material={mats.skin}>
            <cylinderGeometry args={[0.042, 0.05, 0.08, 12]} />
          </mesh>
          {/* tête de vieillard : front dégarni, cheveux et longue barbe blancs, regard baissé */}
          <group ref={head} position={[0, 0.56, -0.015]}>
            <mesh material={mats.skin}>
              <sphereGeometry args={[0.095, 20, 16]} />
            </mesh>
            {/* couronne de cheveux blancs : des tempes à la nuque, le dessus du crâne dégarni */}
            <mesh position={[0, 0.025, 0.004]} rotation={[Math.PI / 2 + 0.2, 0, -Math.PI / 6]} material={mats.hair}>
              <torusGeometry args={[0.088, 0.021, 8, 28, (Math.PI * 4) / 3]} />
            </mesh>
            {[-1, 1].map((sx) => (
              <mesh key={`favori${sx}`} position={[sx * 0.082, -0.012, -0.036]} scale={[0.018, 0.046, 0.03]} material={mats.hair}>
                <sphereGeometry args={[1, 10, 8]} />
              </mesh>
            ))}
            {/* rides du front */}
            {[0.05, 0.064].map((y, k) => (
              <mesh key={`ride${k}`} position={[0, y, 0]} rotation={[Math.PI / 2, 0, -Math.PI / 2 - 0.45]} material={mats.wrinkle}>
                <torusGeometry args={[Math.sqrt(0.095 * 0.095 - y * y) + 0.0008, 0.0016, 4, 12, 0.9]} />
              </mesh>
            ))}
            <mesh position={[0, -0.03, 0.03]} scale={[0.1, 0.07, 0.085]} material={mats.hair}>
              <sphereGeometry args={[1, 16, 12]} />
            </mesh>
            {[-1, 1].map((sx) => (
              <mesh key={sx} position={[sx * 0.094, -0.012, 0.004]} scale={[0.014, 0.028, 0.02]} material={mats.skin}>
                <sphereGeometry args={[1, 10, 8]} />
              </mesh>
            ))}
            {/* barbe de la mâchoire (s'arrête au-dessus des épaules) et moustache tombante ;
                la longue barbe est posée sur le buste */}
            <mesh position={[0, -0.062, -0.052]} scale={[0.075, 0.05, 0.065]} material={mats.hair}>
              <sphereGeometry args={[1, 16, 12]} />
            </mesh>
            {[-1, 1].map((sx) => (
              <mesh key={`moust${sx}`} position={[sx * 0.022, -0.044, -0.088]} rotation={[0, 0, sx * (Math.PI / 2 - 0.45)]} scale={[1, 1, 0.6]} material={mats.hair}>
                <capsuleGeometry args={[0.009, 0.026, 4, 8]} />
              </mesh>
            ))}
            {/* nez, yeux, sourcils */}
            <mesh position={[0, -0.014, -0.098]} scale={[0.016, 0.024, 0.018]} material={mats.skin}>
              <sphereGeometry args={[1, 10, 8]} />
            </mesh>
            {[-1, 1].map((sx) => (
              <group key={sx}>
                <mesh position={[sx * 0.033, 0.012, -0.083]} material={mats.eye}>
                  <sphereGeometry args={[0.0075, 8, 8]} />
                </mesh>
                <mesh position={[sx * 0.034, 0.029, -0.086]} rotation={[0, 0, sx * -0.2]} material={mats.hair}>
                  <boxGeometry args={[0.032, 0.01, 0.01]} />
                </mesh>
              </group>
            ))}
          </group>
        </group>
      </group>

      {/* bras : manches larges évasées (repère du bureau, posées à chaque image) */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} ref={(el) => { segs.current[i] = el; }} material={i % 2 === 0 ? mats.robe : mats.sleeve}>
          {i % 2 === 0 ? <cylinderGeometry args={[0.052, 0.06, 1, 12]} /> : <cylinderGeometry args={[0.078, 0.055, 1, 14, 1, true]} />}
        </mesh>
      ))}
      {[0, 1].map((i) => (
        <mesh key={i} ref={(el) => { hands.current[i] = el; }} material={mats.skin}>
          <sphereGeometry args={[0.03, 12, 10]} />
        </mesh>
      ))}
      {/* plume : la pointe suit l'écriture */}
      <group ref={quill}>
        <mesh position={[0, 0.06, 0]} material={mats.quill}>
          <cylinderGeometry args={[0.0018, 0.0008, 0.12, 5]} />
        </mesh>
        <mesh geometry={geo.feather} position={[0, 0.08, 0]} material={mats.quill} />
        <mesh geometry={geo.feather} position={[0, 0.08, 0]} rotation={[0, Math.PI / 2, 0]} scale={[0.7, 1, 1]} material={mats.quill} />
      </group>
    </group>
  );
}

/**
 * Manuscrit enluminé ouvert : plats de cuir, deux blocs de pages à tranches visibles,
 * pages courbées vers la gouttière, lettrines, rubriques, miniature et signet.
 */
function IlluminatedBook({ onClick }: { onClick?: () => void }) {
  const fonts = useMemo(() => resolveFonts(), []);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && Boolean(onClick));
  const tex = useMemo(
    () => ({ left: illuminatedPageTexture("left", fonts), right: illuminatedPageTexture("right", fonts), edge: pageEdgeTexture() }),
    [fonts],
  );
  const PW = 0.33;
  const PD = 0.45;
  const T = 0.028;
  const pages = useMemo(() => {
    const make = (side: -1 | 1) => {
      const geo = new THREE.PlaneGeometry(PW, PD, 32, 1);
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        // distance à la gouttière (côté reliure)
        const u = side === -1 ? PW / 2 - x : x + PW / 2;
        const h = 0.016 * (1 - Math.exp(-u / 0.035)) - 0.005 * Math.pow(u / PW, 5);
        pos.setZ(i, h);
      }
      geo.computeVertexNormals();
      return geo;
    };
    return { left: make(-1), right: make(1) };
  }, []);
  const edgeMat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex.edge, roughness: 0.9 }), [tex.edge]);
  const plainMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e6d6b2", roughness: 0.9 }), []);
  const blockMats = [edgeMat, edgeMat, plainMat, plainMat, edgeMat, edgeMat];
  return (
    <group
      onClick={(e) => {
        if (!onClick) return;
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {[-1, 1].map((side) => (
        <group key={side} rotation={[0, 0, side * -0.05]}>
          {/* plat de reliure */}
          <mesh position={[side * (PW / 2 + 0.006), 0.004, 0]}>
            <boxGeometry args={[PW + 0.02, 0.008, PD + 0.024]} />
            <meshStandardMaterial color="#3a1a12" roughness={0.65} />
          </mesh>
          {/* bloc de pages */}
          <mesh position={[side * (PW / 2), 0.008 + T / 2, 0]} material={blockMats}>
            <boxGeometry args={[PW, T, PD]} />
          </mesh>
          {/* page visible, courbée */}
          <mesh geometry={side === -1 ? pages.left : pages.right} position={[side * (PW / 2), 0.008 + T + 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial map={side === -1 ? tex.left : tex.right} roughness={0.92} />
          </mesh>
        </group>
      ))}
      {/* tranchefile et dos */}
      <mesh position={[0, 0.03, -PD / 2 + 0.006]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.006, 0.006, 0.03, 8]} />
        <meshStandardMaterial color="#8e1f2c" roughness={0.6} />
      </mesh>
      {/* signet rouge : posé dans la gouttière, il retombe sur le bureau */}
      <mesh position={[0.004, 0.039, 0.05]} rotation={[-Math.PI / 2, 0, 0.04]}>
        <planeGeometry args={[0.008, PD * 0.92]} />
        <meshStandardMaterial color="#6e1520" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.012, 0.02, PD / 2 + 0.02]} rotation={[-0.7, 0, 0.04]}>
        <planeGeometry args={[0.008, 0.06]} />
        <meshStandardMaterial color="#6e1520" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * Fauteuil rococo doré : dossier en arc garni de velours brodé et sommé d'un cartouche,
 * accoudoirs à volutes et manchettes de velours, assise brodée, ceinture à coquille, pieds galbés dorés.
 * Repère : l'avant du fauteuil regarde vers −z (vers le bureau), le dossier est vers +z.
 */
function RococoArmchair() {
  const back = useMemo(() => velvetBackTexture(), []);
  const seat = useMemo(() => velvetSeatTexture(), []);
  const SEAT_Y = 0.47;
  const geo = useMemo(() => {
    // Cadre du dossier : arc extérieur, évidé d'un arc intérieur.
    const arch = (w: number, h: number, peak: number) => {
      const sh = new THREE.Shape();
      sh.moveTo(-w, 0);
      sh.lineTo(-w * 1.04, h * 0.62);
      sh.bezierCurveTo(-w * 1.06, h * 1.0, -w * 0.55, h * 1.07, 0, h + peak);
      sh.bezierCurveTo(w * 0.55, h * 1.07, w * 1.06, h * 1.0, w * 1.04, h * 0.62);
      sh.lineTo(w, 0);
      sh.closePath();
      return sh;
    };
    const frame = arch(0.29, 0.72, 0.03);
    const hole = arch(0.245, 0.66, 0.02);
    const holePath = new THREE.Path(hole.getPoints(48).map((p) => new THREE.Vector2(p.x, p.y + 0.03)));
    frame.holes.push(holePath);
    const backFrame = new THREE.ExtrudeGeometry(frame, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 3, curveSegments: 32 });
    // Assise et ceinture : trapèze évasé vers l'avant.
    const seatShape = (s: number) => {
      const sh = new THREE.Shape();
      sh.moveTo(-0.25 * s, 0.25 * s);
      sh.lineTo(0.25 * s, 0.25 * s);
      sh.quadraticCurveTo(0.33 * s, -0.02 * s, 0.31 * s, -0.27 * s);
      sh.quadraticCurveTo(0, -0.3 * s, -0.31 * s, -0.27 * s);
      sh.quadraticCurveTo(-0.33 * s, -0.02 * s, -0.25 * s, 0.25 * s);
      return sh;
    };
    const rail = seatShape(1.04);
    rail.holes.push(new THREE.Path(seatShape(0.86).getPoints(40)));
    const railGeo = new THREE.ExtrudeGeometry(rail, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 24 });
    const cushion = new THREE.ExtrudeGeometry(seatShape(0.98), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 4, curveSegments: 24 });
    // Accoudoir : courbe du dossier vers l'avant, terminée en volute ; support jusqu'à la ceinture.
    const armCurve = new THREE.CatmullRomCurve3(
      [[0, 0.62, 0.2], [0.01, 0.65, 0.05], [0.0, 0.64, -0.12], [0.0, 0.6, -0.22], [0.0, 0.56, -0.25], [0.0, 0.53, -0.22]].map((p) => new THREE.Vector3(...p)),
    );
    const postCurve = new THREE.CatmullRomCurve3(
      [[0, 0.56, -0.2], [0, 0.52, -0.16], [0, 0.48, -0.19], [0, 0.44, -0.22]].map((p) => new THREE.Vector3(...p)),
    );
    return { backFrame, railGeo, cushion, armCurve, postCurve };
  }, []);

  return (
    <group>
      {/* pieds galbés dorés (le pied de bureau, réduit) */}
      <group scale={[1, 0.68, 1]}>
        {[[-0.24, -0.22], [0.24, -0.22], [-0.22, 0.2], [0.22, 0.2]].map(([x, z]) => (
          <CabrioleLeg key={`${x}${z}`} x={x} z={z} gilt />
        ))}
      </group>
      {/* ceinture dorée et coquille centrale */}
      <mesh geometry={geo.railGeo} position={[0, SEAT_Y - 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial {...GILDING} />
      </mesh>
      <group position={[0, SEAT_Y - 0.035, -0.29]}>
        {Array.from({ length: 7 }, (_, k) => (
          <mesh key={k} rotation={[0, 0, ((k - 3) / 3) * 0.9]} position={[0, -0.02, 0]}>
            <boxGeometry args={[0.012, 0.08, 0.012]} />
            <meshStandardMaterial {...GILDING} />
          </mesh>
        ))}
        <mesh position={[0, -0.05, 0]}>
          <sphereGeometry args={[0.018, 10, 10]} />
          <meshStandardMaterial {...GILDING} />
        </mesh>
      </group>
      {/* coussin de velours et dessus brodé */}
      <mesh geometry={geo.cushion} position={[0, SEAT_Y + 0.0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#86192a" roughness={0.95} />
      </mesh>
      <mesh position={[0, SEAT_Y + 0.082, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.66, 0.6]} />
        <meshStandardMaterial map={seat} roughness={0.92} transparent alphaTest={0.5} />
      </mesh>
      {/* dossier légèrement incliné vers l'arrière */}
      <group position={[0, SEAT_Y + 0.06, 0.24]} rotation={[-0.12, Math.PI, 0]}>
        <mesh geometry={geo.backFrame} position={[0, 0, -0.02]}>
          <meshStandardMaterial {...GILDING} />
        </mesh>
        <mesh position={[0, 0.39, 0]}>
          <planeGeometry args={[0.5, 0.72]} />
          <meshStandardMaterial map={back} roughness={0.93} transparent alphaTest={0.5} side={THREE.DoubleSide} />
        </mesh>
        {/* cartouche sculpté au sommet */}
        <group position={[0, 0.79, 0.01]}>
          <mesh scale={[0.06, 0.075, 0.025]}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshStandardMaterial {...GILDING} />
          </mesh>
          {[-1, 1].map((sx) => (
            <group key={sx}>
              <mesh position={[sx * 0.085, -0.025, 0]} rotation={[0, 0, sx * 0.5]}>
                <torusGeometry args={[0.035, 0.01, 6, 14, Math.PI * 1.3]} />
                <meshStandardMaterial {...GILDING} />
              </mesh>
              <mesh position={[sx * 0.14, -0.05, 0]}>
                <sphereGeometry args={[0.02, 10, 10]} />
                <meshStandardMaterial {...GILDING} />
              </mesh>
              <mesh position={[sx * 0.045, 0.06, 0]}>
                <sphereGeometry args={[0.016, 10, 10]} />
                <meshStandardMaterial {...GILDING} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
      {/* accoudoirs */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * 0.3, 0, 0]}>
          <mesh>
            <tubeGeometry args={[geo.armCurve, 40, 0.018, 8, false]} />
            <meshStandardMaterial {...GILDING} />
          </mesh>
          <mesh>
            <tubeGeometry args={[geo.postCurve, 20, 0.016, 8, false]} />
            <meshStandardMaterial {...GILDING} />
          </mesh>
          {/* volute de l'accoudoir */}
          <mesh position={[0, 0.555, -0.235]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.022, 0.009, 6, 16]} />
            <meshStandardMaterial {...GILDING} />
          </mesh>
          {/* manchette de velours */}
          <mesh position={[0, 0.66, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.03, 0.2, 6, 12]} />
            <meshStandardMaterial color="#8a1c2a" roughness={0.95} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Bureau plat de style Louis XV : plateau de noyer garni de cuir à filet doré, lingotière dorée,
 * ceinture à trois tiroirs, pieds cambrés à espagnolettes et sabots dorés.
 * Sur le plateau : le livre ouvert, l'encrier et sa plume (à droite du livre),
 * le chandelier à trois branches (arrière droit) et le globe (arrière gauche).
 */
function ReadingDesk({ copyist, onBook, onDone }: { copyist: CopyistNote | null; onBook?: () => void; onDone?: () => void }) {
  // Tout le bureau (manuscrit, meubles) appelle le copiste : depuis le hall, le fauteuil masque le livre.
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && Boolean(onBook) && !copyist);
  const wood = useMemo(() => woodTexture("#3b1f14", 77), []);
  const leather = useMemo(() => leatherTexture(), []);
  const W = 2.4;
  const D = 1.2;
  const TOP = 0.82;
  return (
    <group
      position={[0, 0, 1]}
      onClick={(e) => {
        if (!onBook || copyist) return;
        e.stopPropagation();
        onBook();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* plateau mouluré et lingotière dorée */}
      <mesh position={[0, TOP - 0.025, 0]}>
        <boxGeometry args={[W, 0.05, D]} />
        <meshStandardMaterial map={wood} color="#6a3a24" roughness={0.32} />
      </mesh>
      {[[0, D / 2 + 0.004, W + 0.01, 0.008], [0, -D / 2 - 0.004, W + 0.01, 0.008]].map(([x, z, w, d], i) => (
        <mesh key={`lz${i}`} position={[x, TOP - 0.025, z]}>
          <boxGeometry args={[w, 0.03, d]} />
          <meshStandardMaterial {...GILT} />
        </mesh>
      ))}
      {[W / 2 + 0.004, -W / 2 - 0.004].map((x, i) => (
        <mesh key={`lx${i}`} position={[x, TOP - 0.025, 0]}>
          <boxGeometry args={[0.008, 0.03, D + 0.01]} />
          <meshStandardMaterial {...GILT} />
        </mesh>
      ))}
      {/* cuir */}
      <mesh position={[0, TOP + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W - 0.24, D - 0.24]} />
        <meshStandardMaterial map={leather} roughness={0.7} />
      </mesh>

      {/* ceinture et tiroirs (façade et revers) */}
      <mesh position={[0, 0.71, 0]}>
        <boxGeometry args={[W - 0.14, 0.17, D - 0.12]} />
        <meshStandardMaterial map={wood} color="#5a3220" roughness={0.38} />
      </mesh>
      {([1, -1] as const).map((face) =>
        [-0.75, 0, 0.75].map((x) => <Drawer key={`${face}${x}`} x={x} z={face * ((D - 0.12) / 2)} w={x === 0 ? 0.72 : 0.56} face={face} />),
      )}
      {/* rocaille dorée au centre de la ceinture */}
      {([1, -1] as const).map((face) => (
        <mesh key={`roc${face}`} position={[0, 0.63, face * ((D - 0.12) / 2 + 0.012)]} rotation={[0, 0, 0]} scale={[1.6, 1, 0.5]}>
          <torusGeometry args={[0.035, 0.01, 6, 16, Math.PI]} />
          <meshStandardMaterial {...GILT} />
        </mesh>
      ))}

      {/* pieds cambrés */}
      {[[-1.06, -0.48], [1.06, -0.48], [-1.06, 0.48], [1.06, 0.48]].map(([x, z]) => (
        <CabrioleLeg key={`${x}${z}`} x={x} z={z} wood={wood} />
      ))}

      {/* manuscrit enluminé ouvert */}
      <group position={[0, TOP, 0.05]}>
        <IlluminatedBook />
      </group>
      {/* le moine copiste, appelé par un clic sur le manuscrit */}
      <Copyist note={copyist} top={TOP} onDone={onDone} />

      {/* encrier et plume, à droite du livre */}
      <group position={[0.56, TOP, 0.14]}>
        <Inkwell />
      </group>
      {/* chandelier à trois branches, arrière droit */}
      <group position={[0.78, TOP, -0.32]} rotation={[0, -0.35, 0]}>
        <Candelabra />
      </group>
      {/* globe, arrière gauche */}
      <group position={[-0.82, TOP, -0.3]} rotation={[0, 0.6, 0]}>
        <Globe />
      </group>

      {/* fauteuil rococo, tourné vers le bureau */}
      <group position={[0, 0, 1.05]}>
        <RococoArmchair />
      </group>
    </group>
  );
}

function Ladder({ slot }: { slot: CaseSlot }) {
  return (
    <group position={slot.position} rotation={[0, slot.rotationY, 0]}>
      <group position={[CASE.width / 2 + 0.25, 0, 0.9]} rotation={[-0.2, 0, 0]}>
        {[-0.25, 0.25].map((x) => (
          <mesh key={x} position={[x, 2.6, 0]}>
            <boxGeometry args={[0.05, 5.3, 0.06]} />
            <meshStandardMaterial color="#3d2a1d" roughness={0.5} />
          </mesh>
        ))}
        {Array.from({ length: 14 }, (_, i) => (
          <mesh key={i} position={[0, 0.3 + i * 0.36, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.018, 0.018, 0.5, 8]} />
            <meshStandardMaterial color="#b08d57" metalness={0.7} roughness={0.35} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ─── Bookcases & books ──────────────────────────────────────────────── */

function Bookcase({
  shelf,
  index,
  slot,
  fonts,
  view,
  lowPower,
  onView,
}: {
  shelf: SceneShelf;
  index: number;
  slot: CaseSlot;
  fonts: Fonts;
  view: View;
  lowPower: boolean;
  onView: (v: View) => void;
}) {
  const { placed, decor } = useMemo(() => packShelf(shelf, lowPower ? 0.55 : 0.82), [shelf, lowPower]);
  const wood = useMemo(() => woodTexture("#2d1f17", index * 13 + 1), [index]);
  const plaque = useMemo(() => plaqueTexture(shelf.name, shelf.inscription, shelf.accent, fonts), [shelf, fonts]);
  const [hoverCase, setHoverCase] = useState(false);
  const focused = (view.kind === "shelf" || view.kind === "book") && view.shelf === index;
  useCursor(hoverCase && !focused);

  const W = CASE.width;
  const H = CASE.height;
  const D = CASE.depth;
  const woodMat = <meshStandardMaterial map={wood} roughness={0.55} metalness={0.05} />;

  return (
    <group position={slot.position} rotation={[0, slot.rotationY, 0]}>
      {/* invisible hit area to focus the shelf from the hall */}
      <mesh
        position={[0, H / 2, D / 2 + 0.01]}
        onPointerOver={(e) => { e.stopPropagation(); setHoverCase(true); }}
        onPointerOut={() => setHoverCase(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (!focused) onView({ kind: "shelf", shelf: index });
        }}
        visible={false}
      >
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial />
      </mesh>
      {/* carcass */}
      <mesh position={[0, H / 2, -D / 2 + 0.02]}>
        <boxGeometry args={[W, H, 0.04]} />
        <meshStandardMaterial color="#1a120d" roughness={0.9} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (W / 2 - 0.06), H / 2, 0]}>
          <boxGeometry args={[0.12, H, D]} />
          {woodMat}
        </mesh>
      ))}
      {Array.from({ length: CASE.rows + 1 }, (_, r) => (
        <mesh key={r} position={[0, CASE.rowBase + r * CASE.rowStep - 0.02, 0]}>
          <boxGeometry args={[W - 0.12, 0.04, D]} />
          {woodMat}
        </mesh>
      ))}
      {/* plinth & carved cornice */}
      <mesh position={[0, 0.13, 0.02]}>
        <boxGeometry args={[W + 0.1, 0.26, D + 0.06]} />
        {woodMat}
      </mesh>
      <mesh position={[0, H + 0.08, 0.03]}>
        <boxGeometry args={[W + 0.2, 0.16, D + 0.1]} />
        {woodMat}
      </mesh>
      <mesh position={[0, H + 0.22, 0.05]}>
        <boxGeometry args={[W + 0.34, 0.12, D + 0.16]} />
        {woodMat}
      </mesh>
      <mesh position={[0, H + 0.02, D / 2 + 0.06]}>
        <boxGeometry args={[W + 0.14, 0.03, 0.02]} />
        <meshStandardMaterial color={shelf.accent} metalness={0.7} roughness={0.35} />
      </mesh>
      {/* plaque */}
      <mesh position={[0, H + 0.62, 0.1]}>
        <planeGeometry args={[2.6, 0.49]} />
        <meshStandardMaterial map={plaque} roughness={0.4} metalness={0.2} emissive="#ffffff" emissiveMap={plaque} emissiveIntensity={hoverCase || focused ? 0.35 : 0.15} />
      </mesh>
      {focused && <pointLight position={[0, 3.6, 2.4]} color="#ffd29a" intensity={7} distance={7.5} decay={1.4} />}
      <DecorBooks decor={decor} />
      {placed.map((p) => {
        const b = shelf.books.find((x) => x.id === p.id)!;
        const selected = view.kind === "book" && view.shelf === index && view.bookId === b.id;
        return (
          <RealBook
            key={p.id}
            book={b}
            placed={p}
            fonts={fonts}
            selected={selected}
            onSelect={() => onView({ kind: "book", shelf: index, bookId: b.id })}
          />
        );
      })}
    </group>
  );
}

function DecorBooks({ decor }: { decor: ReturnType<typeof packShelf>["decor"] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    decor.forEach((d, i) => {
      o.position.copy(d.local);
      o.scale.set(...d.size);
      o.rotation.set(0, 0, d.tilt);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, d.color);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [decor]);
  if (decor.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, decor.length]} raycast={() => null}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.75} />
    </instancedMesh>
  );
}

// Toutes les couvertures passent par l'optimiseur de Next (WebP redimensionné). Les couvertures
// importées sont plus nettes que celles d'Open Library : 640 px, pour rester fines en gros plan.
function coverSrc(url: string) {
  const width = url.startsWith("/uploads/") ? 640 : 384;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75`;
}

function RealBook({
  book,
  placed,
  fonts,
  selected,
  onSelect,
}: {
  book: SceneBook;
  placed: PlacedBook;
  fonts: Fonts;
  selected: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && !selected);
  const progress = useRef(0);
  const hover = useRef(0);

  const materials = useMemo(() => {
    const pages = new THREE.MeshStandardMaterial({ color: "#e8dcc2", roughness: 0.95 });
    const cloth = new THREE.MeshStandardMaterial({ color: book.color, roughness: 0.6 });
    const cover = new THREE.MeshStandardMaterial({
      map: generatedCoverTexture(book.title, book.author, book.year, book.color, fonts),
      roughness: 0.55,
    });
    const spine = new THREE.MeshStandardMaterial({
      map: spineTexture(book.title, book.author, book.color, fonts),
      roughness: 0.5,
      emissive: new THREE.Color("#c3a16b"),
      emissiveIntensity: 0,
    });
    // box faces: +x (front cover), -x (back cover), +y, -y, +z (spine), -z (fore-edge)
    return [cover, cloth, pages, pages, spine, pages];
  }, [book, fonts]);

  useEffect(() => {
    if (!book.coverUrl) return;
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.load(
      coverSrc(book.coverUrl),
      (t) => {
        if (!alive) return t.dispose();
        t.colorSpace = THREE.SRGBColorSpace;
        const mat = materials[0] as THREE.MeshStandardMaterial;
        mat.map?.dispose();
        mat.map = t;
        mat.needsUpdate = true;
      },
      undefined,
      () => {}, // keep the typographic cover
    );
    return () => {
      alive = false;
    };
  }, [book.coverUrl, materials]);

  useEffect(() => () => materials.forEach((m) => { (m as THREE.MeshStandardMaterial).map?.dispose(); m.dispose(); }), [materials]);

  const base = placed.local;
  const present = useMemo(() => new THREE.Vector3(0, 2.25, 1.2), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    progress.current = THREE.MathUtils.damp(progress.current, selected ? 1 : 0, 2.4, dt);
    hover.current = THREE.MathUtils.damp(hover.current, hovered && !selected ? 1 : 0, 8, dt);
    const t = progress.current;
    const s1 = ease(clamp01(t / 0.35));
    const s2 = ease(clamp01((t - 0.25) / 0.75));
    tmp.copy(base);
    tmp.z += 0.07 * hover.current + 0.34 * s1;
    tmp.lerp(present, s2);
    g.position.copy(tmp);
    g.rotation.set(0.04 * s2, -Math.PI / 2 * s2 + Math.sin(performance.now() / 1600) * 0.04 * s2, 0);
    g.scale.setScalar(1 + 1.6 * s2);
    const spine = materials[4] as THREE.MeshStandardMaterial;
    spine.emissiveIntensity = hover.current * 0.25;
  });

  return (
    <group ref={ref} position={base}>
      <mesh
        material={materials}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (!selected) onSelect();
        }}
      >
        <boxGeometry args={placed.size} />
      </mesh>
    </group>
  );
}
