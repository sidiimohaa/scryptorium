"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import type { Daylight } from "@/lib/daylight";
import { moonWindowTexture, windowTexture } from "./textures";

/** Mélange de deux teintes (format CSS) : t = 0 donne a, t = 1 donne b. */
export function mix(a: string, b: string, t: number): THREE.Color {
  return new THREE.Color(a).lerp(new THREE.Color(b), Math.min(1, Math.max(0, t)));
}
export const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, Math.max(0, t));

/**
 * Ciel et brouillard de la scène suivant le moment : `day` et `night` sont les teintes de fond,
 * `dusk` celle de l'aube et du crépuscule. Le passage est lissé image par image.
 */
export function SkyTone({ daylight, day, night, dusk }: { daylight: Daylight; day: string; night: string; dusk?: string }) {
  const { scene } = useThree();
  const target = useMemo(() => {
    const base = mix(night, day, daylight.sun);
    return dusk ? base.lerp(new THREE.Color(dusk), daylight.warm * 0.6) : base;
  }, [daylight, day, night, dusk]);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 2);
    if (scene.background instanceof THREE.Color) scene.background.lerp(target, k);
    if (scene.fog) scene.fog.color.lerp(target, k);
  });
  return null;
}

/* Vitres partagées : verre de jour (ambré) et verre de nuit (bleu, lune). */
let glass: { day: THREE.Texture; night: THREE.Texture } | null = null;
const glassTextures = () => (glass ??= { day: windowTexture(), night: moonWindowTexture(19) });

/**
 * Vitre qui suit le jour : verre ambré éclairé le jour, doré à l'aube et au crépuscule,
 * verre bleu au clair de lune la nuit. Remplace un simple plan texturé de fenêtre.
 */
export function DayNightGlass({ daylight, w, h, opacity = 0.95 }: { daylight: Daylight; w: number; h: number; opacity?: number }) {
  const t = glassTextures();
  const tint = useMemo(() => mix("#ffffff", "#ffb877", daylight.warm), [daylight.warm]);
  return (
    <group>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={t.night} toneMapped={false} transparent opacity={opacity * daylight.night} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={t.day} color={tint} toneMapped={false} transparent opacity={opacity * daylight.sun} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Teinte des rais de lumière : soleil doré le jour, bleu pâle la nuit. */
export function shaftTint(daylight: Daylight) {
  return mix("#9fb4e6", "#ffe2aa", daylight.sun).lerp(new THREE.Color("#ffb070"), daylight.warm * 0.5);
}
