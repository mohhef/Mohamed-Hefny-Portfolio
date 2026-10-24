/**
 * Procedural "reconstructions": point clouds for the landmark words and the
 * structure around them (floor, wall panels, pillars, outliers), so each
 * keyframe looks like a scanned place rather than floating text.
 */
import type { Rng } from "./rng";
import { FLOOR_Y, add, inward, loopPoint, scale, tangent } from "./world";

export interface PointSet {
  positions: number[];
  kinds: number[];
}

const push = (set: PointSet, x: number, y: number, z: number, kind: number) => {
  set.positions.push(x, y, z);
  set.kinds.push(kind);
};

function splitLines(text: string): string[] {
  if (text.length <= 10 || !text.includes(" ")) return [text];
  const mid = text.length / 2;
  let best = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  }
  return [text.slice(0, best), text.slice(best + 1)];
}

export interface TextCloud extends PointSet {
  width: number;
  height: number;
  /** A few front-face points, used as feature-match targets. */
  features: number[];
}

/**
 * Rasterises `text` with the page's display font and samples it into an
 * extruded point cloud centred on the origin, facing +Z.
 */
export function sampleText(
  text: string,
  fontFamily: string,
  opts: { count: number; letterHeight: number; maxWidth: number; depth: number },
  r: Rng,
): TextCloud {
  const px = 150;
  const tracking = px * 0.06;
  const font = `800 ${px}px ${fontFamily}`;
  const lines = splitLines(text);

  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = font;
  const lineWidth = (line: string) =>
    [...line].reduce((w, ch) => w + measure.measureText(ch).width + tracking, -tracking);
  const widths = lines.map(lineWidth);
  const pad = 8;
  const lineHeight = px * 0.92;
  const w = Math.ceil(Math.max(...widths) + pad * 2);
  const h = Math.ceil(lineHeight * lines.length + pad * 2);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.font = font;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  lines.forEach((line, li) => {
    let x = (w - widths[li]) / 2;
    const y = pad + lineHeight * (li + 0.5);
    for (const ch of line) {
      ctx.fillText(ch, x, y);
      x += ctx.measureText(ch).width + tracking;
    }
  });

  const data = ctx.getImageData(0, 0, w, h).data;
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 128;
  const inside: number[] = [];
  const edge: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!filled(x, y)) continue;
      inside.push(x, y);
      if (!filled(x - 1, y) || !filled(x + 1, y) || !filled(x, y - 1) || !filled(x, y + 1)) edge.push(x, y);
    }
  }

  let k = opts.letterHeight / px;
  if (w * k > opts.maxWidth) k = opts.maxWidth / w;
  const set: TextCloud = { positions: [], kinds: [], width: w * k, height: h * k, features: [] };
  if (!inside.length) return set;

  const toWorld = (x: number, y: number): [number, number] => [(x - w / 2) * k, (h / 2 - y) * k];
  const front = Math.round(opts.count * 0.68);
  const sides = Math.round(opts.count * 0.24);
  const back = opts.count - front - sides;

  for (let i = 0; i < front; i++) {
    const j = Math.floor(r.next() * (inside.length / 2)) * 2;
    const [x, y] = toWorld(inside[j] + r.next(), inside[j + 1] + r.next());
    const z = r.gauss() * 0.018;
    push(set, x, y, z, 1);
    if (i % 97 === 0) set.features.push(x, y, z);
  }
  for (let i = 0; i < sides && edge.length; i++) {
    const j = Math.floor(r.next() * (edge.length / 2)) * 2;
    const [x, y] = toWorld(edge[j] + r.next(), edge[j + 1] + r.next());
    push(set, x, y, -r.next() * opts.depth, 1);
  }
  for (let i = 0; i < back; i++) {
    const j = Math.floor(r.next() * (inside.length / 2)) * 2;
    const [x, y] = toWorld(inside[j] + r.next(), inside[j + 1] + r.next());
    push(set, x, y, -opts.depth + r.gauss() * 0.02, 1);
  }
  return set;
}

/** Floor, wall panels, pillars and a few outliers around a landmark word. */
export function sampleSurroundings(set: PointSet, r: Rng, opts: { width: number; floorY: number; density?: number }) {
  const d = opts.density ?? 1;
  const floor = Math.round(1000 * d);
  for (let i = 0; i < floor; i++) {
    const x = r.gauss() * (opts.width * 0.45 + 2.4);
    const z = 1.4 + r.gauss() * 3.4;
    push(set, x, opts.floorY + r.gauss() * 0.025, z, 0);
  }

  // Wall panels behind the word, with a grid of "window" holes.
  const panels = 2 + Math.floor(r.next() * 2);
  for (let p = 0; p < panels; p++) {
    const pw = r.range(2.6, 5.4);
    const ph = r.range(2.8, 5.2);
    const cx = r.range(-opts.width * 0.55 - 1.5, opts.width * 0.55 + 1.5);
    const cz = r.range(-3.8, -2.1);
    const yaw = r.range(-0.5, 0.5);
    const cols = 2 + Math.floor(r.next() * 3);
    const rows = 2 + Math.floor(r.next() * 3);
    const n = Math.round(330 * d);
    for (let i = 0; i < n; i++) {
      const u = r.next();
      const v = r.next();
      const cu = (u * cols) % 1;
      const cv = (v * rows) % 1;
      if (cu > 0.28 && cu < 0.72 && cv > 0.3 && cv < 0.7 && r.next() < 0.85) continue;
      const lx = (u - 0.5) * pw;
      const ly = opts.floorY + v * ph;
      push(set, cx + lx * Math.cos(yaw), ly, cz + lx * Math.sin(yaw) + r.gauss() * 0.02, 0);
    }
  }

  // Two pillars framing the word.
  for (const side of [-1, 1]) {
    const px = side * (opts.width / 2 + r.range(1.3, 2.6));
    const pz = r.range(-1.6, 0.4);
    const height = r.range(3.2, 4.6);
    const n = Math.round(170 * d);
    for (let i = 0; i < n; i++) {
      const a = r.next() * Math.PI * 2;
      push(set, px + Math.cos(a) * 0.22, opts.floorY + r.next() * height, pz + Math.sin(a) * 0.22, 0);
    }
  }

  // Outliers: every real map has a few bad triangulations.
  const outliers = Math.round(110 * d);
  for (let i = 0; i < outliers; i++) {
    push(set, r.range(-8, 8), r.range(opts.floorY, opts.floorY + 6.5), r.range(-6, 5), 0);
  }
}

/**
 * Sparse floor and edge structure along the whole loop, in world space.
 * Returns per-point u so the corridor maps itself as the camera passes.
 */
export function sampleCorridor(count: number, r: Rng) {
  const set: PointSet & { us: number[] } = { positions: [], kinds: [], us: [] };
  for (let i = 0; i < count; i++) {
    const u = r.next();
    const p = loopPoint(u);
    const n = inward(u);
    const t = tangent(u);
    const roll = r.next();
    let q;
    if (roll < 0.72) {
      // Floor, denser near the path.
      const lateral = r.gauss() * 4.2;
      q = add(add(add(p, scale(n, lateral)), scale(t, r.gauss() * 0.6)), [0, FLOOR_Y - p[1] + r.gauss() * 0.03, 0]);
    } else if (roll < 0.93) {
      // Outer edge: broken wall segments the camera drives along.
      const segment = Math.floor(u * 90);
      if (segment % 3 === 0) {
        i--;
        continue;
      }
      const lateral = -r.range(8.5, 10.5);
      q = add(add(p, scale(n, lateral)), [0, FLOOR_Y - p[1] + r.next() * r.range(1.2, 4.2), 0]);
    } else {
      // Clutter.
      q = add(add(p, scale(n, r.gauss() * 7)), [0, FLOOR_Y - p[1] + r.next() * 3, 0]);
    }
    set.positions.push(q[0], q[1], q[2]);
    set.kinds.push(0);
    set.us.push(u);
  }
  return set;
}
