"use client";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Candle } from "./LibraryScene";

/**
 * Le Maestre debout, en gardien du trésor : même vieillard que le copiste (robe sombre, cheveux et longue
 * barbe blancs, chaîne de métaux mêlés), mais debout, une lanterne levée dans la main droite et le trousseau
 * de clés du trésor dans la gauche. Il va se placer près de la vitrine choisie et lève sa lanterne vers elle,
 * puis regagne son poste quand on revient à la salle. Repère : pieds à y = 0, regard vers −z.
 */

export type GardienGoal = { stand: { x: number; z: number }; look: { x: number; z: number } };

const WAIST = 0.92;

/** Angle de lacet pour que l'avant du personnage (−z) regarde dans la direction (dx, dz). */
const yawToward = (dx: number, dz: number) => Math.atan2(-dx, -dz);

function Limb({ a, b, r, material }: { a: THREE.Vector3; b: THREE.Vector3; r: number; material: THREE.Material }) {
  const { mid, len, q } = useMemo(() => {
    const dir = b.clone().sub(a);
    return {
      mid: a.clone().add(b).multiplyScalar(0.5),
      len: dir.length(),
      q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
    };
  }, [a, b]);
  return (
    <mesh position={mid} quaternion={q} material={material}>
      <capsuleGeometry args={[r, Math.max(0.001, len - 2 * r), 6, 12]} />
    </mesh>
  );
}

export function MaestreGardien({ goal, start }: { goal: GardienGoal; start: { x: number; z: number } }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const lantern = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const yaw = useRef(yawToward(0, -1));

  const mats = useMemo(
    () => ({
      robe: new THREE.MeshStandardMaterial({ color: "#36312c", roughness: 1 }),
      skin: new THREE.MeshStandardMaterial({ color: "#dab49c", roughness: 0.8 }),
      wrinkle: new THREE.MeshStandardMaterial({ color: "#a97f68", roughness: 0.9 }),
      hair: new THREE.MeshStandardMaterial({ color: "#ece8e0", roughness: 0.95 }),
      eye: new THREE.MeshStandardMaterial({ color: "#1a120c", roughness: 0.4 }),
      rope: new THREE.MeshStandardMaterial({ color: "#cdb48a", roughness: 0.9 }),
      leather: new THREE.MeshStandardMaterial({ color: "#5a3a22", roughness: 0.7 }),
      iron: new THREE.MeshStandardMaterial({ color: "#2b2522", metalness: 0.7, roughness: 0.45 }),
      brass: new THREE.MeshStandardMaterial({ color: "#c9a24a", metalness: 0.8, roughness: 0.3 }),
      gold: new THREE.MeshStandardMaterial({ color: "#d1a54c", metalness: 0.6, roughness: 0.35, emissive: "#2a1c06" }),
      silver: new THREE.MeshStandardMaterial({ color: "#d4d5da", metalness: 0.6, roughness: 0.32, emissive: "#1a1a1c" }),
      ironLink: new THREE.MeshStandardMaterial({ color: "#6a6d72", metalness: 0.55, roughness: 0.55 }),
      bronze: new THREE.MeshStandardMaterial({ color: "#b07a3e", metalness: 0.6, roughness: 0.4, emissive: "#1e1206" }),
      copper: new THREE.MeshStandardMaterial({ color: "#c06a40", metalness: 0.6, roughness: 0.4, emissive: "#1e0c04" }),
      glass: new THREE.MeshStandardMaterial({ color: "#ffe2a8", transparent: true, opacity: 0.25, emissive: "#ffb766", emissiveIntensity: 0.4 }),
    }),
    [],
  );

  const geo = useMemo(() => {
    const lathe = (pts: number[][], seg = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
    return {
      torso: lathe([[0, 0], [0.2, 0], [0.215, 0.16], [0.2, 0.31], [0.13, 0.43], [0, 0.44]]),
      // longue robe jusqu'aux pieds, évasée vers l'ourlet
      skirt: lathe([[0, WAIST], [0.2, WAIST], [0.22, 0.62], [0.26, 0.2], [0.3, 0.02], [0.29, 0], [0, 0]]),
      beard: lathe([[0, -0.5], [0.15, -0.45], [0.45, -0.3], [0.8, -0.1], [1, 0.15], [0.95, 0.3], [0.6, 0.45], [0, 0.5]], 20),
      link: new THREE.TorusGeometry(0.016, 0.0045, 6, 14),
    };
  }, []);

  // Chaîne de maillons posée sur le buste, comme celle du copiste.
  const chain = useMemo(() => {
    const METALS = ["gold", "ironLink", "silver", "bronze", "copper", "ironLink", "silver"] as const;
    const profile = [[0, 0.2], [0.16, 0.215], [0.31, 0.2], [0.43, 0.13]];
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

  /* Bras (repère du buste) : le droit lève la lanterne devant lui, le gauche tient le trousseau à la ceinture. */
  const arms = useMemo(() => {
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    return {
      rs: v(0.19, 0.37, -0.01), re: v(0.27, 0.2, -0.13), rh: v(0.22, 0.36, -0.33),
      ls: v(-0.19, 0.37, -0.01), le: v(-0.25, 0.13, -0.05), lh: v(-0.15, 0.04, -0.17),
    };
  }, []);

  const reached = useRef(true);
  useFrame(({ clock }, dt) => {
    const g = root.current;
    if (!g) return;
    const t = clock.elapsedTime;
    // marche : il avance vers son poste, tourné dans le sens de la marche ; arrivé, il se tourne vers ce qu'il garde
    const dx = goal.stand.x - g.position.x;
    const dz = goal.stand.z - g.position.z;
    const dist = Math.hypot(dx, dz);
    const walking = dist > 0.04;
    if (walking) {
      const step = Math.min(dist, dt * 0.9);
      g.position.x += (dx / dist) * step;
      g.position.z += (dz / dist) * step;
    }
    const wantYaw = walking ? yawToward(dx, dz) : yawToward(goal.look.x - g.position.x, goal.look.z - g.position.z);
    let dy = wantYaw - yaw.current;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    yaw.current += dy * Math.min(1, dt * 4);
    g.rotation.y = yaw.current;
    reached.current = !walking;
    // pas : léger balancement de la robe ; à l'arrêt, souffle lent
    if (body.current) {
      body.current.position.y = walking ? Math.abs(Math.sin(t * 6.5)) * 0.018 : 0;
      body.current.rotation.z = walking ? Math.sin(t * 6.5) * 0.025 : 0;
      body.current.scale.y = 1 + (walking ? 0 : Math.sin(t * 1.4) * 0.004);
    }
    if (head.current) {
      head.current.rotation.x = walking ? 0.05 : 0.12 + Math.sin(t * 0.7) * 0.03;
      head.current.rotation.y = walking ? 0 : Math.sin(t * 0.45) * 0.12;
    }
    // la lanterne se balance au bout de son anneau
    if (lantern.current) lantern.current.rotation.z = Math.sin(t * (walking ? 6.5 : 1.6)) * (walking ? 0.18 : 0.05);
    if (light.current) light.current.intensity = 2.2 * (1 + Math.sin(t * 9.1) * 0.06 + Math.sin(t * 21.7) * 0.04);
  });

  return (
    <group ref={root} position={[start.x, 0, start.z]} rotation={[0, yawToward(0, -1), 0]}>
      <group ref={body}>
        {/* robe longue */}
        <mesh geometry={geo.skirt} material={mats.robe} />
        {/* sandales qui dépassent de l'ourlet */}
        {[-1, 1].map((sx) => (
          <mesh key={sx} position={[sx * 0.09, 0.012, -0.26]} material={mats.leather}>
            <boxGeometry args={[0.08, 0.024, 0.12]} />
          </mesh>
        ))}

        <group position={[0, WAIST, 0]}>
          <mesh geometry={geo.torso} material={mats.robe} />
          {/* cordelière et ses nœuds */}
          <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.rope}>
            <torusGeometry args={[0.205, 0.013, 6, 28]} />
          </mesh>
          <group position={[0.09, 0.0, -0.19]} rotation={[0.15, 0, 0.1]}>
            <mesh position={[0, -0.2, 0]} material={mats.rope}>
              <cylinderGeometry args={[0.008, 0.008, 0.4, 6]} />
            </mesh>
            {[-0.1, -0.22, -0.36].map((y) => (
              <mesh key={y} position={[0, y, 0]} material={mats.rope}>
                <sphereGeometry args={[0.016, 8, 8]} />
              </mesh>
            ))}
          </group>
          {chain.map((l, k) => (
            <mesh key={k} geometry={geo.link} position={l.p} quaternion={l.q} scale={[1.35, 1, 1]} material={mats[l.metal]} />
          ))}
          <mesh position={[0, 0.212, -0.226]} material={mats.gold}>
            <torusGeometry args={[0.026, 0.006, 8, 22]} />
          </mesh>
          {/* longue barbe sur la poitrine */}
          <mesh geometry={geo.beard} position={[0, 0.399, -0.2015]} rotation={[0.5064, 0, 0]} scale={[0.08, 0.2332, 0.04]} material={mats.hair} />
          {/* bras dans leurs larges manches */}
          <Limb a={arms.rs} b={arms.re} r={0.06} material={mats.robe} />
          <Limb a={arms.re} b={arms.rh} r={0.055} material={mats.robe} />
          <Limb a={arms.ls} b={arms.le} r={0.06} material={mats.robe} />
          <Limb a={arms.le} b={arms.lh} r={0.055} material={mats.robe} />
          {[arms.rh, arms.lh].map((p, i) => (
            <mesh key={i} position={p} material={mats.skin}>
              <sphereGeometry args={[0.035, 12, 10]} />
            </mesh>
          ))}
          {/* lanterne de fer levée dans la main droite */}
          <group ref={lantern} position={[arms.rh.x, arms.rh.y + 0.01, arms.rh.z]}>
            <mesh position={[0, -0.03, 0]} rotation={[0, Math.PI / 2, 0]} material={mats.iron}>
              <torusGeometry args={[0.03, 0.004, 6, 16, Math.PI]} />
            </mesh>
            <group position={[0, -0.16, 0]}>
              <mesh position={[0, 0.08, 0]} material={mats.iron}>
                <coneGeometry args={[0.07, 0.06, 6]} />
              </mesh>
              {[0, 1, 2, 3, 4, 5].map((k) => {
                const a = (k / 6) * Math.PI * 2;
                return (
                  <mesh key={k} position={[Math.cos(a) * 0.055, -0.01, Math.sin(a) * 0.055]} material={mats.iron}>
                    <boxGeometry args={[0.008, 0.16, 0.008]} />
                  </mesh>
                );
              })}
              <mesh position={[0, -0.01, 0]} material={mats.glass}>
                <cylinderGeometry args={[0.052, 0.052, 0.15, 6, 1, true]} />
              </mesh>
              <mesh position={[0, -0.095, 0]} material={mats.iron}>
                <cylinderGeometry args={[0.065, 0.06, 0.02, 6]} />
              </mesh>
              <group position={[0, -0.085, 0]}>
                <Candle height={0.07} radius={0.014} seed={5} />
              </group>
              <pointLight ref={light} color="#ffb366" position={[0, 0, 0]} distance={3.2} decay={1.6} />
            </group>
          </group>
          {/* trousseau de clés du trésor dans la main gauche */}
          <group position={[arms.lh.x, arms.lh.y - 0.05, arms.lh.z]} rotation={[0.3, 0, 0.2]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.iron}>
              <torusGeometry args={[0.05, 0.006, 6, 20]} />
            </mesh>
            {[-0.6, 0, 0.6].map((a, k) => (
              <group key={k} position={[Math.sin(a) * 0.05, -0.03, Math.cos(a) * 0.05]} rotation={[0, 0, a * 0.4]}>
                <mesh position={[0, -0.06, 0]} material={mats.brass}>
                  <boxGeometry args={[0.008, 0.11, 0.008]} />
                </mesh>
                <mesh position={[0.012, -0.11, 0]} material={mats.brass}>
                  <boxGeometry args={[0.022, 0.016, 0.006]} />
                </mesh>
                <mesh position={[0, 0.005, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.brass}>
                  <torusGeometry args={[0.012, 0.004, 6, 12]} />
                </mesh>
              </group>
            ))}
          </group>
          {/* cou et tête */}
          <mesh position={[0, 0.45, -0.005]} material={mats.skin}>
            <cylinderGeometry args={[0.042, 0.05, 0.08, 12]} />
          </mesh>
          <group ref={head} position={[0, 0.56, -0.015]}>
            <mesh material={mats.skin}>
              <sphereGeometry args={[0.095, 20, 16]} />
            </mesh>
            <mesh position={[0, 0.025, 0.004]} rotation={[Math.PI / 2 + 0.2, 0, -Math.PI / 6]} material={mats.hair}>
              <torusGeometry args={[0.088, 0.021, 8, 28, (Math.PI * 4) / 3]} />
            </mesh>
            {[-1, 1].map((sx) => (
              <mesh key={`f${sx}`} position={[sx * 0.082, -0.012, -0.036]} scale={[0.018, 0.046, 0.03]} material={mats.hair}>
                <sphereGeometry args={[1, 10, 8]} />
              </mesh>
            ))}
            {[0.05, 0.064].map((y, k) => (
              <mesh key={`r${k}`} position={[0, y, 0]} rotation={[Math.PI / 2, 0, -Math.PI / 2 - 0.45]} material={mats.wrinkle}>
                <torusGeometry args={[Math.sqrt(0.095 * 0.095 - y * y) + 0.0008, 0.0016, 4, 12, 0.9]} />
              </mesh>
            ))}
            <mesh position={[0, -0.03, 0.03]} scale={[0.1, 0.07, 0.085]} material={mats.hair}>
              <sphereGeometry args={[1, 16, 12]} />
            </mesh>
            {[-1, 1].map((sx) => (
              <mesh key={`o${sx}`} position={[sx * 0.094, -0.012, 0.004]} scale={[0.014, 0.028, 0.02]} material={mats.skin}>
                <sphereGeometry args={[1, 10, 8]} />
              </mesh>
            ))}
            <mesh position={[0, -0.062, -0.052]} scale={[0.075, 0.05, 0.065]} material={mats.hair}>
              <sphereGeometry args={[1, 16, 12]} />
            </mesh>
            {[-1, 1].map((sx) => (
              <mesh key={`m${sx}`} position={[sx * 0.022, -0.044, -0.088]} rotation={[0, 0, sx * (Math.PI / 2 - 0.45)]} scale={[1, 1, 0.6]} material={mats.hair}>
                <capsuleGeometry args={[0.009, 0.026, 4, 8]} />
              </mesh>
            ))}
            <mesh position={[0, -0.014, -0.098]} scale={[0.016, 0.024, 0.018]} material={mats.skin}>
              <sphereGeometry args={[1, 10, 8]} />
            </mesh>
            {[-1, 1].map((sx) => (
              <group key={`e${sx}`}>
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
    </group>
  );
}
