import * as THREE from "three";
import { hashString } from "./textures";
import type { SceneShelf } from "./types";

export const CASE = { width: 3.4, height: 5.2, depth: 0.55, rowBase: 0.3, rowStep: 0.8, rows: 6 };
export const ROW_ORDER = [2, 3, 1, 4, 0, 5];
const SLOT = 3.85;
export const BACK_Z = -9.5;

export type CaseSlot = { position: THREE.Vector3; rotationY: number; matrix: THREE.Matrix4 };

/** Bookcases follow a U: back wall first, then both side walls. The room grows with the collection. */
export function computeRoom(n: number) {
  const back = Math.min(n, 6);
  const side = Math.max(0, Math.ceil((n - back) / 2));
  const depth = Math.max(20, side * SLOT + 9);
  const front = BACK_Z + depth;
  const halfW = 12.6;
  const slots: CaseSlot[] = [];
  for (let i = 0; i < back; i++) {
    const x = (i - (back - 1) / 2) * SLOT;
    slots.push(slot(new THREE.Vector3(x, 0, BACK_Z + 0.3), 0));
  }
  for (let i = 0; i < n - back; i++) {
    const left = i % 2 === 0;
    const k = Math.floor(i / 2);
    const z = BACK_Z + 2.8 + k * SLOT;
    slots.push(slot(new THREE.Vector3(left ? -halfW + 0.3 : halfW - 0.3, 0, z), left ? Math.PI / 2 : -Math.PI / 2));
  }
  return { slots, front, depth, halfW, height: 12 };
}

function slot(position: THREE.Vector3, rotationY: number): CaseSlot {
  const matrix = new THREE.Matrix4().compose(
    position,
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotationY, 0)),
    new THREE.Vector3(1, 1, 1),
  );
  return { position, rotationY, matrix };
}

export type PlacedBook = {
  id: string;
  local: THREE.Vector3; // centre, bookcase-local
  size: [number, number, number]; // thickness, height, depth
};

export type DecorBook = { local: THREE.Vector3; size: [number, number, number]; color: THREE.Color; tilt: number };

const DECOR = ["#3a1e1c", "#2c2a1f", "#1f2a26", "#3b2b1a", "#24222b", "#40301f", "#2e1a22", "#1c2430"];

export function bookSize(b: { id: string; pages: number | null }): [number, number, number] {
  const h = hashString(b.id);
  const thick = b.pages ? THREE.MathUtils.clamp(0.03 + b.pages * 0.00016, 0.035, 0.13) : 0.062;
  return [thick, 0.33 + (h % 7) * 0.013, 0.24];
}

/** Packs real books on eye-level rows, then fills the remainder with anonymous, non-interactive bindings. */
export function packShelf(shelf: SceneShelf, decorDensity: number) {
  const inner = CASE.width - 0.3;
  const zFront = CASE.depth / 2 - 0.02;
  const placed: PlacedBook[] = [];
  const cursors = new Array(CASE.rows).fill(-inner / 2);
  let r = 0;
  for (const b of shelf.books) {
    const size = bookSize(b);
    while (r < ROW_ORDER.length && cursors[ROW_ORDER[r]] + size[0] > inner / 2) r++;
    if (r >= ROW_ORDER.length) break; // shelf full: remaining books stay reachable through the catalogue
    const row = ROW_ORDER[r];
    const x = cursors[row] + size[0] / 2;
    cursors[row] += size[0] + 0.004;
    placed.push({ id: b.id, local: new THREE.Vector3(x, CASE.rowBase + row * CASE.rowStep + size[1] / 2, zFront - size[2] / 2), size });
  }

  const decor: DecorBook[] = [];
  let seed = hashString(shelf.id);
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let row = 0; row < CASE.rows; row++) {
    let x = cursors[row] + 0.03;
    while (x < inner / 2 - 0.05) {
      if (rand() > decorDensity) {
        x += 0.12 + rand() * 0.3; // a gap, as in any real library
        continue;
      }
      const t = 0.035 + rand() * 0.06;
      const h = 0.26 + rand() * 0.16;
      const d = 0.18 + rand() * 0.07;
      if (x + t > inner / 2) break;
      const c = new THREE.Color(DECOR[Math.floor(rand() * DECOR.length)]).multiplyScalar(0.7 + rand() * 0.5);
      decor.push({ local: new THREE.Vector3(x + t / 2, CASE.rowBase + row * CASE.rowStep + h / 2, zFront - d / 2), size: [t, h, d], color: c, tilt: 0 });
      x += t + 0.003;
    }
  }
  return { placed, decor };
}
