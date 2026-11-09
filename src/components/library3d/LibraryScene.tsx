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
} from "./textures";
import type { SceneBook, SceneShelf, View } from "./types";

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

function Room({ shelves, view, lowPower, onView, onIntroDone, entrance, onReady }: Props) {
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
      <Architecture room={room} doorAngle={doorAngle} lowPower={lowPower} />
      <ReadingDesk />
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
    if (desk.current) desk.current.intensity = 5.5 * r * candle;
    lamps.current.forEach((l) => l && (l.intensity = 14 * r * flicker));
  });

  return (
    <>
      <ambientLight ref={amb} color="#ffdcb0" />
      <hemisphereLight ref={hemi} args={["#f3d9a6", "#1a0f0a"]} />
      <directionalLight ref={win} color="#ffe4b8" position={[-14, 11, 2]} />
      {/* Chandelle du bureau (le bureau est centré en z = 1) */}
      <pointLight ref={desk} color="#ff9e4a" position={[0.72, 1.32, 0.82]} distance={7} decay={1.6} />
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
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color="#ffae55" transparent opacity={0.14} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
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

function ReadingDesk() {
  return (
    <group position={[0, 0, 1]}>
      <mesh position={[0, 0.78, 0]}>
        <boxGeometry args={[2.4, 0.08, 1.2]} />
        <meshStandardMaterial color="#3a271b" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.79, 0]}>
        <boxGeometry args={[2.0, 0.085, 0.9]} />
        <meshStandardMaterial color="#2b3b2e" roughness={0.9} />
      </mesh>
      {[[-1.08, -0.5], [1.08, -0.5], [-1.08, 0.5], [1.08, 0.5]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.37, z]}>
          <boxGeometry args={[0.12, 0.74, 0.12]} />
          <meshStandardMaterial color="#2e1f16" roughness={0.6} />
        </mesh>
      ))}
      {/* open book */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.19, 0.85, 0.05]} rotation={[-Math.PI / 2, s * 0.12, 0]}>
          <planeGeometry args={[0.36, 0.5]} />
          <meshStandardMaterial color="#ecdfc4" roughness={0.95} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* chandelier de laiton et sa bougie */}
      <group position={[0.72, 0.82, -0.18]}>
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.09, 0.1, 0.02, 24]} />
          <meshStandardMaterial color="#b08d57" metalness={0.9} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.014, 0.02, 0.11, 10]} />
          <meshStandardMaterial color="#b08d57" metalness={0.9} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.055, 0.03, 0.02, 16]} />
          <meshStandardMaterial color="#b08d57" metalness={0.9} roughness={0.28} />
        </mesh>
        <mesh position={[0.07, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.035, 0.007, 6, 16, Math.PI * 1.2]} />
          <meshStandardMaterial color="#b08d57" metalness={0.9} roughness={0.28} />
        </mesh>
        <group position={[0, 0.14, 0]}>
          <Candle height={0.22} radius={0.028} seed={41} />
        </group>
      </group>
      {/* bougie entamée dans une coupelle */}
      <group position={[0.9, 0.82, 0.02]}>
        <mesh position={[0, 0.008, 0]}>
          <cylinderGeometry args={[0.055, 0.06, 0.016, 16]} />
          <meshStandardMaterial color="#8a6a3a" metalness={0.8} roughness={0.35} />
        </mesh>
        <group position={[0, 0.016, 0]}>
          <Candle height={0.07} radius={0.032} seed={57} />
        </group>
      </group>
      {/* chair */}
      <group position={[0, 0, 1.1]}>
        <mesh position={[0, 0.48, 0]}>
          <boxGeometry args={[0.6, 0.08, 0.6]} />
          <meshStandardMaterial color="#51252c" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.95, 0.27]}>
          <boxGeometry args={[0.6, 0.9, 0.06]} />
          <meshStandardMaterial color="#3a271b" roughness={0.5} />
        </mesh>
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
  const focused = view.kind !== "hall" && view.kind !== "intro" && view.shelf === index;
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

function coverSrc(url: string) {
  return url.startsWith("/uploads/") ? url : `/_next/image?url=${encodeURIComponent(url)}&w=384&q=75`;
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
