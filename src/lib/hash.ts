/** FNV-1a 32 bits — stable, rapide, sans dépendance (couleurs, mise en page 3D). */
export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
