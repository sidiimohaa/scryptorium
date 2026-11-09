import * as THREE from "three";

/** Procedural canvas textures — no external assets, tiny footprint, fully original. */

export type Fonts = { display: string; serif: string; sans: string };

export function resolveFonts(): Fonts {
  const s = getComputedStyle(document.documentElement);
  const get = (v: string, fb: string) => s.getPropertyValue(v).trim() || fb;
  return {
    display: get("--font-cormorant", "Georgia, serif"),
    serif: get("--font-garamond", "Georgia, serif"),
    sans: get("--font-jost", "system-ui, sans-serif"),
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function finish(c: HTMLCanvasElement, repeat?: [number, number]) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export { hashString } from "@/lib/hash";

export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

/** Dark walnut grain, used for shelves, walls and floor. */
export function woodTexture(base = "#2a1d16", seed = 7, planks = false, repeat: [number, number] = [1, 1]) {
  const [c, g] = canvas(512, 512);
  const r = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 512);
  const rows = planks ? 8 : 1;
  for (let p = 0; p < rows; p++) {
    const y0 = (p * 512) / rows;
    const h = 512 / rows;
    g.fillStyle = shade(base, (r() - 0.5) * 0.06);
    g.fillRect(0, y0, 512, h);
    for (let i = 0; i < 70; i++) {
      const y = y0 + r() * h;
      g.strokeStyle = `rgba(${r() > 0.5 ? "0,0,0" : "120,80,50"},${0.05 + r() * 0.12})`;
      g.lineWidth = 0.5 + r() * 2;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + r() * 6) * 3 * r());
      g.stroke();
    }
    if (planks) {
      g.fillStyle = "rgba(0,0,0,0.55)";
      g.fillRect(0, y0, 512, 2);
      const off = r() * 512;
      g.fillRect(off, y0, 2, h);
    }
  }
  return finish(c, repeat);
}

/** Panelled wall with mouldings. */
export function panelTexture(seed = 3) {
  const tex = woodTexture("#221812", seed);
  const c = tex.image as HTMLCanvasElement;
  const g = c.getContext("2d")!;
  g.strokeStyle = "rgba(195,161,107,0.12)";
  g.lineWidth = 3;
  g.strokeRect(40, 40, 432, 432);
  g.strokeStyle = "rgba(0,0,0,0.5)";
  g.lineWidth = 6;
  g.strokeRect(52, 52, 408, 408);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** Spine of a recorded book: title & author in gilt. */
export function spineTexture(title: string, author: string, color: string, fonts: Fonts) {
  const [c, g] = canvas(128, 640);
  const grad = g.createLinearGradient(0, 0, 128, 0);
  grad.addColorStop(0, shade(color, -0.12));
  grad.addColorStop(0.35, shade(color, 0.06));
  grad.addColorStop(1, shade(color, -0.16));
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 640);
  g.fillStyle = "rgba(195,161,107,0.85)";
  for (const y of [34, 44, 596, 606]) g.fillRect(10, y, 108, 3);
  g.save();
  g.translate(64, 320);
  g.rotate(Math.PI / 2);
  g.fillStyle = "#e7cf9d";
  g.textAlign = "center";
  g.textBaseline = "middle";
  let size = 44;
  g.font = `500 ${size}px ${fonts.display}`;
  while (g.measureText(title).width > 500 && size > 18) {
    size -= 2;
    g.font = `500 ${size}px ${fonts.display}`;
  }
  g.fillText(title, 0, -10);
  g.font = `400 20px ${fonts.sans}`;
  g.globalAlpha = 0.8;
  g.fillText(author.toUpperCase(), 0, 28);
  g.restore();
  return finish(c);
}

/** Typographic cover used when no cover image is recorded or when it fails to load. */
export function generatedCoverTexture(title: string, author: string, year: number | null, color: string, fonts: Fonts) {
  const [c, g] = canvas(512, 768);
  g.fillStyle = color;
  g.fillRect(0, 0, 512, 768);
  g.strokeStyle = "rgba(195,161,107,0.7)";
  g.lineWidth = 3;
  g.strokeRect(28, 28, 456, 712);
  g.strokeStyle = "rgba(195,161,107,0.35)";
  g.strokeRect(40, 40, 432, 688);
  g.fillStyle = "#e7cf9d";
  g.textAlign = "center";
  g.font = `400 22px ${fonts.sans}`;
  g.fillText(author.toUpperCase(), 256, 140);
  g.font = `500 54px ${fonts.display}`;
  wrap(g, title, 256, 360, 400, 60);
  g.font = `400 30px ${fonts.serif}`;
  g.fillText(`❦ ${year ?? ""}`.trim(), 256, 660);
  return finish(c);
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > max && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  lines.push(line);
  const start = y - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => g.fillText(l, x, start + i * lh));
}

/** Brass plaque engraved with the shelf name. */
export function plaqueTexture(name: string, inscription: string, accent: string, fonts: Fonts) {
  const [c, g] = canvas(1024, 192);
  const grad = g.createLinearGradient(0, 0, 0, 192);
  grad.addColorStop(0, "#1c1410");
  grad.addColorStop(1, "#120d0a");
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 192);
  g.strokeStyle = "#c3a16b";
  g.lineWidth = 3;
  g.strokeRect(10, 10, 1004, 172);
  g.fillStyle = accent;
  g.fillRect(470, 24, 84, 2);
  g.fillStyle = "#e7cf9d";
  g.textAlign = "center";
  g.textBaseline = "middle";
  let size = 64;
  g.font = `500 ${size}px ${fonts.display}`;
  while (g.measureText(name).width > 940 && size > 30) g.font = `500 ${(size -= 2)}px ${fonts.display}`;
  g.fillText(name, 512, 82);
  g.font = `italic 400 30px ${fonts.serif}`;
  g.globalAlpha = 0.75;
  g.fillText(inscription, 512, 140);
  return finish(c);
}

/** Gothic window: pointed arch with mullions and a warm-cool glow. */
export function windowTexture() {
  const [c, g] = canvas(256, 512);
  g.fillStyle = "#000";
  g.fillRect(0, 0, 256, 512);
  g.save();
  g.beginPath();
  g.moveTo(20, 512);
  g.lineTo(20, 180);
  g.quadraticCurveTo(20, 20, 128, 10);
  g.quadraticCurveTo(236, 20, 236, 180);
  g.lineTo(236, 512);
  g.closePath();
  g.clip();
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#f6e2b4");
  grad.addColorStop(0.6, "#d9b98a");
  grad.addColorStop(1, "#9a7a5a");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 512);
  g.strokeStyle = "#1a120d";
  g.lineWidth = 7;
  for (const x of [85, 171]) {
    g.beginPath();
    g.moveTo(x, 60);
    g.lineTo(x, 512);
    g.stroke();
  }
  for (let y = 200; y < 512; y += 78) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(256, y);
    g.stroke();
  }
  g.beginPath();
  g.arc(128, 120, 34, 0, Math.PI * 2);
  g.stroke();
  g.restore();
  return finish(c);
}

/** Soft vertical gradient for volumetric light shafts. */
export function shaftTexture() {
  const [c, g] = canvas(64, 256);
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "rgba(255,226,170,0.55)");
  grad.addColorStop(1, "rgba(255,226,170,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 256);
  const h = g.createLinearGradient(0, 0, 64, 0);
  h.addColorStop(0, "rgba(0,0,0,1)");
  h.addColorStop(0.5, "rgba(0,0,0,0)");
  h.addColorStop(1, "rgba(0,0,0,1)");
  g.globalCompositeOperation = "destination-out";
  g.fillStyle = h;
  g.fillRect(0, 0, 64, 256);
  return finish(c);
}

/** Bordeaux rug with a gilt border. */
export function rugTexture() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = "#3d1a20";
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(195,161,107,0.55)";
  g.lineWidth = 8;
  g.strokeRect(24, 24, 464, 464);
  g.lineWidth = 2;
  g.strokeRect(46, 46, 420, 420);
  g.strokeStyle = "rgba(195,161,107,0.25)";
  for (let i = 0; i < 8; i++) {
    g.beginPath();
    g.ellipse(256, 256, 60 + i * 22, 40 + i * 16, 0, 0, Math.PI * 2);
    g.stroke();
  }
  const r = rng(11);
  const img = g.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 18;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return finish(c);
}
