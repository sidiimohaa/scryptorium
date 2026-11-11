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
  const texture = finish(c);

  // Applique le dessin IA dans ses couleurs originales, sans correction de luminosité.
  const source = new Image();
  let disposed = false;
  texture.addEventListener("dispose", () => { disposed = true; });
  source.onload = () => {
    if (disposed) return;
    g.drawImage(source, 0, 0, c.width, c.height);
    texture.needsUpdate = true;
  };
  // Le dessin procédural existant reste le repli si l'image ne peut pas être chargée.
  source.src = "/textures/rug-unicorn-drawn.png";
  return texture;
}

/** Cuir de bureau bordeaux-brun, finement grainé, avec filet doré au fer. */
export function leatherTexture() {
  const [c, g] = canvas(512, 256);
  g.fillStyle = "#4a2219";
  g.fillRect(0, 0, 512, 256);
  const r = rng(29);
  const img = g.getImageData(0, 0, 512, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 16;
    img.data[i] += n;
    img.data[i + 1] += n * 0.7;
    img.data[i + 2] += n * 0.6;
  }
  g.putImageData(img, 0, 0);
  const shade = g.createRadialGradient(256, 128, 40, 256, 128, 300);
  shade.addColorStop(0, "rgba(255,200,150,0.06)");
  shade.addColorStop(1, "rgba(0,0,0,0.35)");
  g.fillStyle = shade;
  g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "rgba(214,176,98,0.85)";
  g.lineWidth = 3;
  g.strokeRect(18, 18, 476, 220);
  g.lineWidth = 1;
  g.strokeRect(26, 26, 460, 204);
  return finish(c);
}

/** Globe ancien : océans crème, terres ocre, méridiens, parallèles et lignes de rhumb (équirectangulaire). */
export function globeTexture() {
  const W = 1024;
  const H = 512;
  const [c, g] = canvas(W, H);
  const img = g.createImageData(W, H);
  const r = rng(43);
  const land = (x: number, y: number) => {
    const lon = (x / W) * Math.PI * 2;
    const lat = (y / H) * Math.PI;
    return (
      Math.sin(lon * 2 + 0.6) * Math.sin(lat * 3 + 0.4) * 0.9 +
      Math.sin(lon * 5 + 1.7) * Math.cos(lat * 4) * 0.45 +
      Math.cos(lon * 9 + lat * 7) * 0.22 +
      Math.sin(lon * 13 - lat * 11) * 0.1
    );
  };
  const T = 0.18;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const v = land(x, y);
      const polar = Math.abs(y / H - 0.5) > 0.44;
      const isLand = v > T && !polar;
      const coast = isLand && (land(x + 3, y) <= T || land(x - 3, y) <= T || land(x, y + 3) <= T || land(x, y - 3) <= T);
      const n = (r() - 0.5) * 18;
      let rgb: [number, number, number];
      if (coast) rgb = [96, 70, 44];
      else if (isLand) rgb = v > 0.7 ? [168, 112, 62] : [186, 138, 80];
      else rgb = [214, 200, 158];
      img.data[i] = rgb[0] + n;
      img.data[i + 1] = rgb[1] + n;
      img.data[i + 2] = rgb[2] + n * 0.8;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // Méridiens et parallèles
  g.strokeStyle = "rgba(90,60,35,0.45)";
  g.lineWidth = 1;
  for (let k = 0; k <= 12; k++) {
    g.beginPath();
    g.moveTo((k / 12) * W, 0);
    g.lineTo((k / 12) * W, H);
    g.stroke();
  }
  for (let k = 1; k < 6; k++) {
    g.beginPath();
    g.moveTo(0, (k / 6) * H);
    g.lineTo(W, (k / 6) * H);
    g.stroke();
  }
  g.strokeStyle = "rgba(140,40,40,0.55)";
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(0, H / 2);
  g.lineTo(W, H / 2);
  g.stroke();
  // Roses des vents et lignes de rhumb
  g.strokeStyle = "rgba(70,90,110,0.35)";
  g.lineWidth = 0.8;
  for (const [cx, cy] of [[300, 230], [760, 280]]) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * 260, cy + Math.sin(a) * 260);
      g.stroke();
    }
    g.fillStyle = "rgba(140,40,40,0.7)";
    g.beginPath();
    g.arc(cx, cy, 6, 0, Math.PI * 2);
    g.fill();
  }
  // Patine : bords assombris
  const v = g.createLinearGradient(0, 0, 0, H);
  v.addColorStop(0, "rgba(80,50,20,0.35)");
  v.addColorStop(0.2, "rgba(80,50,20,0)");
  v.addColorStop(0.8, "rgba(80,50,20,0)");
  v.addColorStop(1, "rgba(80,50,20,0.35)");
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  return finish(c);
}

/* ─── Velours brodé et manuscrit enluminé ─────────────────────────────── */

function velvetBase(g: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const grad = g.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#9a2230");
  grad.addColorStop(0.5, "#7d1724");
  grad.addColorStop(1, "#6a121e");
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const r = rng(seed);
  // reflets du velours : fines traînées verticales
  for (let i = 0; i < 260; i++) {
    g.strokeStyle = `rgba(${r() > 0.5 ? "255,120,130" : "40,0,10"},${0.03 + r() * 0.05})`;
    g.lineWidth = 1 + r() * 3;
    const x = r() * w;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + (r() - 0.5) * 20, h);
    g.stroke();
  }
}

/** Broderie : tige ondulante dorée avec feuilles vert-olive, le long d'un chemin. */
function embroider(g: CanvasRenderingContext2D, pts: [number, number][], seed: number) {
  const r = rng(seed);
  g.strokeStyle = "#d8bb6e";
  g.lineWidth = 3;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
  for (let i = 1; i < pts.length - 1; i += 2) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    const a = Math.atan2(ny - y, nx - x) + (i % 4 === 1 ? 1 : -1) * 0.9;
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.fillStyle = r() > 0.5 ? "#8a915a" : "#c9ac63";
    g.beginPath();
    g.ellipse(9, 0, 10, 4, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    if (i % 6 === 1) {
      g.fillStyle = "#e9cf86";
      g.beginPath();
      g.arc(x, y, 4, 0, Math.PI * 2);
      g.fill();
    }
  }
}

/** Panneau de dossier en arc, velours brodé, transparent hors de l'arc (alphaTest). */
export function velvetBackTexture() {
  const W = 512;
  const H = 768;
  const [c, g] = canvas(W, H);
  const arch = (inset: number) => {
    g.beginPath();
    g.moveTo(inset, H);
    g.lineTo(inset, H * 0.32);
    g.bezierCurveTo(inset, H * 0.02, W * 0.22, inset * 0.4, W / 2, inset * 0.5);
    g.bezierCurveTo(W * 0.78, inset * 0.4, W - inset, H * 0.02, W - inset, H * 0.32);
    g.lineTo(W - inset, H);
    g.closePath();
  };
  g.save();
  arch(0);
  g.clip();
  velvetBase(g, W, H, 61);
  // galon doré et broderie le long de l'arc
  g.strokeStyle = "#c9a050";
  g.lineWidth = 6;
  arch(28);
  g.stroke();
  const pts: [number, number][] = [];
  for (let t = 0; t <= 1.0001; t += 0.025) {
    // parcours : montant gauche, arc, montant droit
    const inset = 52;
    let x: number, y: number;
    if (t < 0.3) { x = inset; y = H - (t / 0.3) * (H * 0.66); }
    else if (t < 0.7) { const u = (t - 0.3) / 0.4; x = inset + u * (W - 2 * inset); y = H * 0.34 - Math.sin(u * Math.PI) * H * 0.24; }
    else { x = W - inset; y = H * 0.34 + ((t - 0.7) / 0.3) * (H * 0.66); }
    pts.push([x + Math.sin(t * 60) * 6, y + Math.cos(t * 60) * 6]);
  }
  embroider(g, pts, 7);
  // médaillon brodé en haut
  g.strokeStyle = "#d8bb6e";
  g.lineWidth = 4;
  g.beginPath();
  g.ellipse(W / 2, H * 0.24, 40, 22, 0, 0, Math.PI * 2);
  g.stroke();
  g.restore();
  const t = finish(c);
  return t;
}

/** Dessus d'assise : velours brodé, forme d'assise évasée à l'avant. */
export function velvetSeatTexture() {
  const S = 512;
  const [c, g] = canvas(S, S);
  g.save();
  g.beginPath();
  g.moveTo(60, 0);
  g.lineTo(S - 60, 0);
  g.quadraticCurveTo(S, S * 0.55, S - 20, S);
  g.lineTo(20, S);
  g.quadraticCurveTo(0, S * 0.55, 60, 0);
  g.closePath();
  g.clip();
  velvetBase(g, S, S, 73);
  const pts: [number, number][] = [];
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const x = 70 + t * (S - 140);
    pts.push([x, S - 60 + Math.sin(t * 40) * 8]);
  }
  embroider(g, pts, 11);
  g.strokeStyle = "#c9a050";
  g.lineWidth = 5;
  g.strokeRect(40, 30, S - 80, S - 50);
  g.restore();
  return finish(c);
}

/** Tranche de pages : fines lignes crème, légèrement jaunies. */
export function pageEdgeTexture() {
  const [c, g] = canvas(256, 64);
  g.fillStyle = "#e6d6b2";
  g.fillRect(0, 0, 256, 64);
  const r = rng(88);
  for (let y = 0; y < 64; y += 2) {
    g.fillStyle = `rgba(120,90,50,${0.08 + r() * 0.12})`;
    g.fillRect(0, y, 256, 1);
  }
  return finish(c);
}

const LATIN = [
  "Verba volant, scripta manent. In principio erat verbum,",
  "et verbum erat apud deum. Liber scriptus proferetur,",
  "in quo totum continetur. Tolle, lege; tolle, lege.",
  "Habent sua fata libelli. Nulla dies sine linea.",
  "Littera scripta manet. Festina lente. Sapere aude.",
  "Dum spiro, spero. Ars longa, vita brevis. Lux in libris.",
  "Omnia mutantur, nihil interit. Carpe diem, quam minimum",
  "credula postero. Per aspera ad astra. Ex libris lumen.",
];

/** Page enluminée (gauche : grande lettrine et texte ; droite : miniature du copiste et texte). */
export function illuminatedPageTexture(side: "left" | "right", fonts: Fonts) {
  const W = 600;
  const H = 820;
  const [c, g] = canvas(W, H);
  // parchemin
  g.fillStyle = "#efe2c2";
  g.fillRect(0, 0, W, H);
  const r = rng(side === "left" ? 5 : 9);
  const img = g.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 14;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n * 0.8;
  }
  g.putImageData(img, 0, 0);
  // ombre de la reliure (côté gouttière) et bords jaunis
  const gutterX = side === "left" ? W : 0;
  const gut = g.createLinearGradient(gutterX, 0, side === "left" ? W - 120 : 120, 0);
  gut.addColorStop(0, "rgba(90,60,30,0.45)");
  gut.addColorStop(1, "rgba(90,60,30,0)");
  g.fillStyle = gut;
  g.fillRect(0, 0, W, H);
  const edge = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75);
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(1, "rgba(120,80,30,0.3)");
  g.fillStyle = edge;
  g.fillRect(0, 0, W, H);

  const x0 = side === "left" ? 90 : 110;
  const x1 = side === "left" ? W - 110 : W - 90;

  // bordure florale (rinceaux) côté extérieur
  const vineX = side === "left" ? 52 : W - 52;
  g.strokeStyle = "#3d5a8a";
  g.lineWidth = 3;
  g.beginPath();
  for (let y = 70; y <= H - 70; y += 6) {
    const x = vineX + Math.sin(y / 28) * 14;
    if (y === 70) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  for (let y = 90; y < H - 70; y += 42) {
    const x = vineX + Math.sin(y / 28) * 14;
    const col = ["#a8282f", "#2f5ea8", "#c99a2e", "#4f7a3a"][Math.floor(y / 42) % 4];
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(x + 12, y, 9, 5, 0.6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#d8b24a";
    g.beginPath();
    g.arc(x - 10, y + 16, 4, 0, Math.PI * 2);
    g.fill();
  }

  let y = 90;
  const ink = "#2a1a10";
  const red = "#a3242b";
  const line = (text: string, size = 25, color = ink, x = x0) => {
    g.fillStyle = color;
    g.font = `italic 400 ${size}px ${fonts.serif}`;
    g.fillText(text, x, y, x1 - x);
    y += size * 1.35;
  };

  const initial = (letter: string, x: number, top: number, s: number) => {
    g.fillStyle = "#c99a2e";
    g.fillRect(x, top, s, s);
    g.fillStyle = "#2f4f8f";
    g.fillRect(x + 6, top + 6, s - 12, s - 12);
    g.strokeStyle = "#e8c66a";
    g.lineWidth = 2;
    g.strokeRect(x + 6, top + 6, s - 12, s - 12);
    g.fillStyle = "#f1d27a";
    g.font = `600 ${s * 0.78}px ${fonts.display}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(letter, x + s / 2, top + s / 2 + 4);
    g.textAlign = "left";
    g.textBaseline = "alphabetic";
    // filigrane rouge qui descend dans la marge
    g.strokeStyle = red;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x + 4, top + s);
    g.bezierCurveTo(x - 20, top + s + 60, x + 10, top + s + 120, x - 6, top + s + 200);
    g.stroke();
  };

  if (side === "left") {
    initial("V", x0, 80, 120);
    y = 110;
    const indent = x0 + 136;
    line("erba volant, scripta", 26, ink, indent);
    line("manent. In principio", 26, ink, indent);
    line("erat verbum.", 26, red, indent);
    y += 30;
    LATIN.forEach((t, i) => line(t, 22, i === 3 ? red : ink));
    y += 10;
    initial("T", x0, y - 20, 70);
    y += 14;
    line("olle, lege; tolle, lege.", 22, ink, x0 + 84);
    line("Habent sua fata libelli.", 22, red, x0 + 84);
    y += 20;
    LATIN.slice(2, 7).forEach((t) => line(t, 22));
  } else {
    // miniature : un copiste à son pupitre, fond bleu semé d'or
    const mx = x0;
    const my = 80;
    const mw = x1 - x0;
    const mh = 330;
    g.fillStyle = "#c99a2e";
    g.fillRect(mx - 8, my - 8, mw + 16, mh + 16);
    g.fillStyle = "#24407a";
    g.fillRect(mx, my, mw, mh);
    g.fillStyle = "#e1bf5e";
    for (let i = 0; i < 70; i++) g.fillRect(mx + ((i * 53) % mw), my + ((i * 97) % mh), 3, 3);
    g.fillStyle = "#6b4a2c";
    g.fillRect(mx, my + mh - 60, mw, 60); // sol
    // pupitre
    g.fillStyle = "#7a4a26";
    g.beginPath();
    g.moveTo(mx + mw * 0.62, my + mh - 120);
    g.lineTo(mx + mw * 0.92, my + mh - 150);
    g.lineTo(mx + mw * 0.94, my + mh - 132);
    g.lineTo(mx + mw * 0.64, my + mh - 104);
    g.fill();
    g.fillRect(mx + mw * 0.76, my + mh - 120, 12, 70);
    g.fillStyle = "#efe2c2";
    g.fillRect(mx + mw * 0.66, my + mh - 138, 70, 16);
    // copiste en robe rouge, auréole d'or
    g.fillStyle = "#a3242b";
    g.beginPath();
    g.moveTo(mx + mw * 0.22, my + mh - 50);
    g.quadraticCurveTo(mx + mw * 0.24, my + mh - 200, mx + mw * 0.4, my + mh - 205);
    g.quadraticCurveTo(mx + mw * 0.56, my + mh - 200, mx + mw * 0.58, my + mh - 50);
    g.closePath();
    g.fill();
    g.fillStyle = "#e3c27a";
    g.beginPath();
    g.arc(mx + mw * 0.41, my + mh - 228, 34, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ecc9a2";
    g.beginPath();
    g.arc(mx + mw * 0.42, my + mh - 226, 22, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#ecc9a2";
    g.lineWidth = 12;
    g.beginPath();
    g.moveTo(mx + mw * 0.5, my + mh - 160);
    g.lineTo(mx + mw * 0.66, my + mh - 132);
    g.stroke();
    g.strokeStyle = "#f6f1e4";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(mx + mw * 0.66, my + mh - 132);
    g.lineTo(mx + mw * 0.6, my + mh - 185);
    g.stroke();
    y = my + mh + 70;
    initial("L", x0, y - 44, 64);
    line("ittera scripta manet.", 23, red, x0 + 80);
    line("Ex libris lumen; lux in libris.", 23, ink, x0 + 80);
    y += 8;
    LATIN.slice(0, 6).forEach((t, i) => line(t, 22, i === 4 ? red : ink));
  }
  return finish(c);
}

/* ─── Feuillet du copiste : écriture progressive ──────────────────────── */

export type WritingSheet = {
  texture: THREE.CanvasTexture;
  /** Dessine l'écriture jusqu'à `p` (0 → 1) et renvoie la position de la plume, en pixels du feuillet. */
  render: (p: number) => { x: number; y: number };
  width: number;
  height: number;
};

/**
 * Feuillet de parchemin sur lequel le copiste écrit sa recommandation.
 * Le texte final est composé hors écran, puis révélé ligne à ligne, de gauche à droite.
 */
export function writingSheet(
  note: { title: string; author: string; year: number | null; phrase: string },
  fonts: Fonts,
): WritingSheet {
  const W = 480;
  const H = 640;
  const [c, g] = canvas(W, H);
  const [base, bg] = canvas(W, H);
  const [ink, ig] = canvas(W, H);

  // Parchemin vierge
  bg.fillStyle = "#efe1c0";
  bg.fillRect(0, 0, W, H);
  const r = rng(101);
  const img = bg.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 16;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n * 0.8;
  }
  bg.putImageData(img, 0, 0);
  const edge = bg.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.72);
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(1, "rgba(110,70,30,0.35)");
  bg.fillStyle = edge;
  bg.fillRect(0, 0, W, H);

  // Composition du texte final (encre)
  type Line = { text: string; font: string; color: string; x: number; y: number; w: number };
  const lines: Line[] = [];
  const add = (text: string, font: string, color: string, y: number, center = false) => {
    ig.font = font;
    const w = Math.min(ig.measureText(text).width, W - 80);
    lines.push({ text, font, color, x: center ? (W - w) / 2 : 44, y, w });
  };
  const wrap = (text: string, font: string, maxW: number) => {
    ig.font = font;
    const words = text.split(/\s+/);
    const out: string[] = [];
    let cur = "";
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (ig.measureText(t).width > maxW && cur) {
        out.push(cur);
        cur = w;
      } else cur = t;
    }
    if (cur) out.push(cur);
    return out;
  };
  const red = "#9c2128";
  const brown = "#2b1a10";
  add("Le copiste vous recommande", `600 22px ${fonts.display}`, red, 70, true);
  let y = 132;
  for (const t of wrap(note.title, `600 40px ${fonts.display}`, W - 88)) {
    add(t, `600 40px ${fonts.display}`, brown, y, true);
    y += 44;
  }
  add(`${note.author}${note.year ? `, ${note.year}` : ""}`, `italic 400 22px ${fonts.serif}`, red, y + 4, true);
  y += 58;
  for (const t of wrap(`« ${note.phrase} »`, `italic 400 21px ${fonts.serif}`, W - 88).slice(0, 9)) {
    add(t, `italic 400 21px ${fonts.serif}`, brown, y);
    y += 30;
  }
  for (const l of lines) {
    ig.font = l.font;
    ig.fillStyle = l.color;
    ig.fillText(l.text, l.x, l.y, W - 80);
  }
  // fleuron final
  ig.fillStyle = red;
  ig.font = `400 26px ${fonts.serif}`;
  ig.fillText("❦", W / 2 - 10, Math.min(H - 40, y + 20));

  const total = lines.reduce((s, l) => s + l.w, 0);
  const texture = finish(c);

  const render = (p: number) => {
    g.drawImage(base, 0, 0);
    let budget = Math.max(0, Math.min(1, p)) * total;
    let cursor = { x: 44, y: 70 };
    for (const l of lines) {
      if (budget <= 0) break;
      const w = Math.min(l.w, budget);
      // révèle la ligne jusqu'à w (zone de la ligne seulement)
      g.drawImage(ink, l.x, l.y - 40, w, 52, l.x, l.y - 40, w, 52);
      cursor = { x: l.x + w, y: l.y - 6 };
      budget -= l.w;
    }
    if (p >= 1) g.drawImage(ink, 0, 0);
    texture.needsUpdate = true;
    return cursor;
  };
  render(0);
  return { texture, render, width: W, height: H };
}
