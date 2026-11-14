"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are mutated imperatively inside useFrame, as R3F intends. */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor, Sparkles } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Candle, Copyist } from "./LibraryScene";
import {
  flagstoneTexture,
  generatedCoverTexture,
  pageEdgeTexture,
  resolveFonts,
  shaftTexture,
  stoneTexture,
  windowTexture,
  woodTexture,
} from "./textures";
import type { CopyistNote } from "./types";

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

export default function ScriptoriumScene(props: Props) {
  const { lowPower } = props;
  return (
    <Canvas
      dpr={lowPower ? 1 : [1, 1.75]}
      gl={{ antialias: !lowPower, powerPreference: "high-performance" }}
      camera={{ fov: 50, near: 0.05, far: 40, position: [0, 2.4, -2.6] }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.25;
        scene.background = new THREE.Color("#0b0908");
        scene.fog = new THREE.Fog("#0b0908", 7, 16);
      }}
    >
      <PerformanceMonitor onDecline={props.onDecline} />
      <Scriptorium {...props} />
    </Canvas>
  );
}

function Scriptorium({ book, copyist, onCopyistDone, lowPower, onReady }: Props) {
  const ready = useRef(false);
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
      <StoneRoom lowPower={lowPower} />
      {/* table du copiste : même repère que le bureau de la bibliothèque (centré en z = 1) */}
      <group position={[0, 0, 1]}>
        <TrestleTable />
        <Bench />
        <group position={[-0.6, TOP, 0.12]} rotation={[0, 0.5, 0]} scale={0.8}>
          <BookStand book={book} />
        </group>
        <group position={[0.66, TOP, -0.02]}>
          <IronCandlestick />
        </group>
        <BookPile />
        <Copyist note={copyist} top={TOP} onDone={onCopyistDone} />
      </group>
      <Armarium />
      {!lowPower && <Sparkles count={90} scale={[3, 3.5, 5]} position={[-2.2, 2.6, 1.6]} size={1.8} speed={0.1} opacity={0.45} color="#f3d9a6" noise={0.5} />}
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
  useFrame((_, dt) => {
    const narrow = size.width < 768;
    pos.set(narrow ? -1.2 : -1.08, narrow ? 1.85 : 1.66, narrow ? 0.05 : 0.4);
    target.set(narrow ? -0.15 : -0.3, 0.98, 1.72);
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

/* ─── Lumière : jour par les lancettes, chandelle sur la table ─── */

function Lights({ lowPower }: { lowPower: boolean }) {
  const candle = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (candle.current) candle.current.intensity = 4.2 * (1 + Math.sin(t * 9.7) * 0.07 + Math.sin(t * 23.3) * 0.05 + Math.sin(t * 3.1) * 0.04);
  });
  return (
    <>
      <ambientLight color="#ffdcb0" intensity={0.32} />
      <hemisphereLight args={["#e9dcc0", "#1a120c", 0.5]} />
      {/* jour entrant par les fenêtres du mur gauche */}
      <directionalLight color="#ffe6bf" intensity={1.5} position={[-6, 6, 1.5]} />
      {/* contre-jour de la grande lancette, derrière le copiste */}
      <pointLight color="#ffd9a0" intensity={6} position={[0, 3, 4.6]} distance={6} decay={1.6} />
      <pointLight ref={candle} color="#ff9e4a" position={[0.66, TOP + 0.45, 0.98]} distance={5} decay={1.6} />
      {!lowPower && <pointLight color="#ffe1b0" intensity={2} position={[-3.2, 2.4, 1]} distance={4} decay={1.8} />}
    </>
  );
}

/* ─── Salle : dallage, murs de pierre, lancettes et rayons, poutres ─── */

const ROOM = { x: 4, zFront: -3.5, zBack: 5.5, h: 6 };

function StoneRoom({ lowPower }: { lowPower: boolean }) {
  const tex = useMemo(
    () => ({
      floor: flagstoneTexture(11, [4, 4.5]),
      wallLong: stoneTexture(5, [4.5, 3]),
      wallShort: stoneTexture(9, [4, 3]),
      window: windowTexture(),
      shaft: shaftTexture(),
      beam: woodTexture("#2a1d16", 41),
    }),
    [],
  );
  const depth = ROOM.zBack - ROOM.zFront;
  const midZ = (ROOM.zBack + ROOM.zFront) / 2;
  const stone = { roughness: 0.95, color: "#b8aa98" } as const;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, midZ]}>
        <planeGeometry args={[ROOM.x * 2, depth]} />
        <meshStandardMaterial map={tex.floor} roughness={0.9} color="#c9bba5" />
      </mesh>
      {/* murs */}
      <mesh position={[-ROOM.x, ROOM.h / 2, midZ]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[depth, ROOM.h]} />
        <meshStandardMaterial map={tex.wallLong} {...stone} />
      </mesh>
      <mesh position={[ROOM.x, ROOM.h / 2, midZ]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[depth, ROOM.h]} />
        <meshStandardMaterial map={tex.wallLong} {...stone} />
      </mesh>
      <mesh position={[0, ROOM.h / 2, ROOM.zBack]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM.x * 2, ROOM.h]} />
        <meshStandardMaterial map={tex.wallShort} {...stone} />
      </mesh>
      <mesh position={[0, ROOM.h / 2, ROOM.zFront]}>
        <planeGeometry args={[ROOM.x * 2, ROOM.h]} />
        <meshStandardMaterial map={tex.wallShort} {...stone} />
      </mesh>
      {/* plafond et poutres */}
      <mesh position={[0, ROOM.h, midZ]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM.x * 2, depth]} />
        <meshStandardMaterial color="#1a1310" roughness={1} />
      </mesh>
      {[-2, 0.5, 3, 5].map((z) => (
        <mesh key={z} position={[0, ROOM.h - 0.18, z]}>
          <boxGeometry args={[ROOM.x * 2, 0.32, 0.28]} />
          <meshStandardMaterial map={tex.beam} color="#5a3a26" roughness={0.8} />
        </mesh>
      ))}

      {/* lancettes du mur gauche, avec ébrasement de pierre et rayons */}
      {[0, 2.8].map((z) => (
        <group key={z} position={[-ROOM.x + 0.02, 2.7, z]} rotation={[0, Math.PI / 2, 0]}>
          <Lancet tex={tex} w={1} h={2.3} />
          {!lowPower && (
            <mesh position={[0, -0.7, 1.4]} rotation={[-0.75, 0, 0]}>
              <planeGeometry args={[1.1, 3.4]} />
              <meshBasicMaterial map={tex.shaft} transparent opacity={0.14} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      ))}
      {/* grande lancette du fond, derrière le copiste */}
      <group position={[0, 2.9, ROOM.zBack - 0.02]} rotation={[0, Math.PI, 0]}>
        <Lancet tex={tex} w={1.3} h={2.9} />
      </group>
    </group>
  );
}

function Lancet({ tex, w, h }: { tex: { window: THREE.Texture }; w: number; h: number }) {
  return (
    <group>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex.window} toneMapped={false} transparent opacity={0.92} />
      </mesh>
      {/* ébrasement : piédroits et appui */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 + 0.08), -0.05, 0.08]}>
          <boxGeometry args={[0.16, h - 0.1, 0.18]} />
          <meshStandardMaterial color="#8d806f" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, -h / 2 - 0.05, 0.1]}>
        <boxGeometry args={[w + 0.32, 0.1, 0.24]} />
        <meshStandardMaterial color="#8d806f" roughness={0.95} />
      </mesh>
    </group>
  );
}

/* ─── Mobilier ─── */

/** Table de copiste à tréteaux, en chêne : plateau épais, deux tréteaux et une entretoise. */
function TrestleTable() {
  const wood = useMemo(() => woodTexture("#4a3020", 53, true), []);
  const mat = <meshStandardMaterial map={wood} color="#8a6446" roughness={0.6} />;
  return (
    <group>
      <mesh position={[0, TOP - 0.035, 0]}>
        <boxGeometry args={[2.0, 0.07, 1.2]} />
        {mat}
      </mesh>
      {[-0.75, 0.75].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[0.08, 0.72, 0.5]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[0.12, 0.08, 0.95]} />
            {mat}
          </mesh>
          <mesh position={[0, TOP - 0.1, 0]}>
            <boxGeometry args={[0.12, 0.06, 1.05]} />
            {mat}
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.26, 0]}>
        <boxGeometry args={[1.5, 0.07, 0.07]} />
        {mat}
      </mesh>
    </group>
  );
}

/** Banc du copiste : assise à la hauteur du coussin du fauteuil de la bibliothèque (y ≈ 0,555). */
function Bench() {
  const wood = useMemo(() => woodTexture("#3e2818", 61, true), []);
  const mat = <meshStandardMaterial map={wood} color="#7a5638" roughness={0.65} />;
  return (
    <group position={[0, 0, 1.02]}>
      <mesh position={[0, 0.53, 0]}>
        <boxGeometry args={[1.0, 0.05, 0.38]} />
        {mat}
      </mesh>
      {[-0.4, 0.4].map((x) => (
        <mesh key={x} position={[x, 0.255, 0]}>
          <boxGeometry args={[0.06, 0.51, 0.32]} />
          {mat}
        </mesh>
      ))}
    </group>
  );
}

/** Bougeoir de fer forgé à large coupelle, une chandelle. */
function IronCandlestick() {
  const iron = { color: "#2b2522", metalness: 0.7, roughness: 0.45 } as const;
  return (
    <group>
      <mesh position={[0, 0.012, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.024, 20]} />
        <meshStandardMaterial {...iron} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.012, 0.016, 0.2, 10]} />
        <meshStandardMaterial {...iron} />
      </mesh>
      <mesh position={[0, 0.225, 0]}>
        <cylinderGeometry args={[0.05, 0.03, 0.02, 16]} />
        <meshStandardMaterial {...iron} />
      </mesh>
      <group position={[0, 0.235, 0]}>
        <Candle height={0.16} radius={0.026} seed={3} />
      </group>
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
    <group position={[0.62, 0, -0.38]}>
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

/** Armoire à livres (armarium) contre le mur de droite : rayons garnis de volumes reliés. */
function Armarium() {
  const wood = useMemo(() => woodTexture("#2d1f17", 71), []);
  const books = useMemo(() => {
    const out: { x: number; y: number; w: number; h: number; c: string }[] = [];
    let seed = 9;
    const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const palette = ["#5a2a22", "#2f3a2a", "#6b4a22", "#3b2a40", "#4a1e1e", "#6a5a3a", "#24304a"];
    for (const y of [0.55, 1.15, 1.75, 2.35]) {
      let x = -0.78;
      while (x < 0.74) {
        const w = 0.05 + r() * 0.06;
        const h = 0.32 + r() * 0.16;
        if (r() > 0.1) out.push({ x: x + w / 2, y: y + h / 2, w, h, c: palette[Math.floor(r() * palette.length)] });
        x += w + 0.008;
      }
    }
    return out;
  }, []);
  return (
    <group position={[ROOM.x - 0.3, 0, 2.6]} rotation={[0, -Math.PI / 2, 0]}>
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
      {books.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, -0.02]}>
          <boxGeometry args={[b.w, b.h, 0.3]} />
          <meshStandardMaterial color={b.c} roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}
