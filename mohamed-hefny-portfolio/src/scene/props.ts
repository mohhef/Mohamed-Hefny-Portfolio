/** Small scene props: camera frustums and their floor pins, the world-frame gizmo and the calibration board. */
import * as THREE from "three";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

export interface FrustumOptions {
  /** Half-width, half-height and depth of the image plane. */
  w: number;
  h: number;
  d: number;
  /** Line width in CSS pixels. */
  linewidth: number;
  /** Opacity of the filled image plane. */
  fill: number;
  /** Viewfinder brackets on the image-plane corners, drawn thicker than the body. */
  brackets?: boolean;
  /** Radius of a soft glow at the optical centre (the live camera only). */
  glow?: number;
}

function fatLines(points: number[], linewidth: number) {
  const material = new LineMaterial({ color: 0xffffff, linewidth, transparent: true, depthWrite: false });
  return new LineSegments2(new LineSegmentsGeometry().setPositions(points), material);
}

/** Triangles with a per-vertex alpha, tinted by the material colour. */
function tintedMesh(positions: number[], alphas: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(alphas.flatMap((a) => [1, 1, 1, a]), 4));
  return new THREE.Mesh(
    g,
    new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  );
}

let glowTexture: THREE.CanvasTexture | null = null;
function softDot() {
  if (glowTexture) return glowTexture;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.18, "rgba(255,255,255,0.55)");
  g.addColorStop(0.5, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTexture = new THREE.CanvasTexture(canvas);
  return glowTexture;
}

/**
 * A camera, drawn the way SLAM viewers draw one: a frustum with its apex at
 * the optical centre and its image plane at +Z (Object3D.lookAt points +Z at
 * the target), plus a small "up" tick. Lines have real width and the image
 * plane is lightly filled, so it reads as an object rather than a wire.
 */
export class Frustum {
  readonly group = new THREE.Group();
  private body: LineSegments2;
  private brackets?: LineSegments2;
  private plane: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private glow?: THREE.Sprite;
  private glowAlpha = 0.25;
  private fillAlpha: number;

  constructor(opts: FrustumOptions) {
    const { w, h, d } = opts;
    this.fillAlpha = opts.fill;
    const c = [
      [-w, -h, d],
      [w, -h, d],
      [w, h, d],
      [-w, h, d],
    ];
    const pts: number[] = [];
    for (const k of c) pts.push(0, 0, 0, ...k);
    for (let i = 0; i < 4; i++) pts.push(...c[i], ...c[(i + 1) % 4]);
    pts.push(-w * 0.32, h, d, 0, h * 1.5, d, 0, h * 1.5, d, w * 0.32, h, d);
    this.body = fatLines(pts, opts.linewidth);

    // Image plane, plus the four faces of the pyramid at a fraction of its opacity.
    const tri: number[] = [];
    const alpha: number[] = [];
    tri.push(...c[0], ...c[1], ...c[2], ...c[0], ...c[2], ...c[3]);
    alpha.push(1, 1, 1, 1, 1, 1);
    for (let i = 0; i < 4; i++) {
      tri.push(0, 0, 0, ...c[i], ...c[(i + 1) % 4]);
      alpha.push(0.1, 0.34, 0.34);
    }
    this.plane = tintedMesh(tri, alpha);
    this.group.add(this.plane, this.body);

    if (opts.brackets) {
      const b: number[] = [];
      const lx = w * 0.42;
      const ly = h * 0.42;
      for (const [x, y] of [[-w, -h], [w, -h], [w, h], [-w, h]]) {
        b.push(x, y, d, x - Math.sign(x) * lx, y, d, x, y, d, x, y - Math.sign(y) * ly, d);
      }
      this.brackets = fatLines(b, opts.linewidth * 1.9);
      this.group.add(this.brackets);
    }

    if (opts.glow) {
      this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), transparent: true, depthWrite: false }));
      this.glow.scale.setScalar(opts.glow * 2);
      this.group.add(this.glow);
    }
  }

  setColor(color: THREE.Color) {
    this.body.material.color.copy(color);
    this.brackets?.material.color.copy(color);
    this.plane.material.color.copy(color);
    this.glow?.material.color.copy(color);
  }

  /** `flash` (0..1) brightens the image plane, like a shutter firing when a keyframe is taken. */
  setOpacity(opacity: number, flash = 0) {
    this.body.material.opacity = opacity;
    if (this.brackets) this.brackets.material.opacity = opacity;
    this.plane.material.opacity = opacity * Math.min(1, this.fillAlpha + 0.55 * flash);
    if (this.glow) this.glow.material.opacity = opacity * Math.min(1, this.glowAlpha + 0.5 * flash);
  }

  /** At night the glow adds light; by day it is a faint tint. */
  setAdditive(additive: boolean) {
    const m = this.glow?.material;
    if (!m) return;
    this.glowAlpha = additive ? 0.7 : 0.2;
    const blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    if (m.blending !== blending) {
      m.blending = blending;
      m.needsUpdate = true;
    }
  }
}

/**
 * Pins a point of the trajectory to the floor: a stem straight down and a ring
 * where it lands. `ping` sends a second ring outwards, sonar style.
 */
export class Pin {
  readonly group = new THREE.Group();
  private stem: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private base = new THREE.Group();
  private ring: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private wave: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;

  constructor(private radius: number) {
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, -1, 0], 3));
    sg.setAttribute("color", new THREE.Float32BufferAttribute([1, 1, 1, 0.5, 1, 1, 1, 0.16], 4));
    this.stem = new THREE.Line(sg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));

    const flat = (g: THREE.BufferGeometry) => {
      g.rotateX(-Math.PI / 2);
      return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    };
    this.ring = flat(new THREE.RingGeometry(radius * 0.9, radius, 56));
    const dot = flat(new THREE.CircleGeometry(radius * 0.17, 20));
    dot.material = this.ring.material;
    this.wave = flat(new THREE.RingGeometry(0.955, 1, 72));
    this.wave.visible = false;
    this.base.add(this.ring, dot, this.wave);
    this.group.add(this.stem, this.base);
    this.setHeight(1);
  }

  /** Distance from the pinned point down to the floor. */
  setHeight(height: number) {
    this.stem.scale.y = height;
    this.base.position.y = -height + 0.03;
  }

  setColor(color: THREE.Color) {
    this.stem.material.color.copy(color);
    this.ring.material.color.copy(color);
    this.wave.material.color.copy(color);
  }

  /** `ping` runs 0 → 1 as the wave travels out; outside that range there is no wave. */
  setOpacity(opacity: number, ping = -1) {
    this.stem.material.opacity = opacity;
    this.ring.material.opacity = opacity * 0.7;
    const on = ping > 0 && ping < 1;
    this.wave.visible = on && opacity > 0.01;
    if (on) {
      const ease = 1 - Math.pow(1 - ping, 3);
      this.wave.scale.setScalar(this.radius * (1 + 5.5 * ease));
      this.wave.material.opacity = opacity * 0.7 * (1 - ping);
    }
    this.group.visible = opacity > 0.01;
  }
}

/** RGB axes marking the world frame, as every SLAM viewer draws at the origin. */
export function axesGizmo(size = 1.3): THREE.LineSegments {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, 0, size, 0, 0, 0, 0, 0, 0, size, 0, 0, 0, 0, 0, 0, size], 3),
  );
  g.setAttribute(
    "color",
    new THREE.Float32BufferAttribute([0.95, 0.27, 0.23, 0.95, 0.27, 0.23, 0.24, 0.86, 0.52, 0.24, 0.86, 0.52, 0.29, 0.64, 1, 0.29, 0.64, 1], 3),
  );
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }));
}

const ROW_COLORS = ["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#32ade6", "#5e5ce6"];

/**
 * A 10×7 chessboard with OpenCV-style corner detections: a circle on each of
 * the 9×6 inner corners and the coloured zig-zag joining them row by row.
 * setReveal(t) "detects" corners in order.
 */
export class CalibrationBoard {
  readonly group = new THREE.Group();
  readonly cornerCount: number;
  private board: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private rings: THREE.LineSegments;
  private zigzag: THREE.LineSegments;
  private ringSegments = 18;

  constructor(private squares = { x: 10, y: 7, size: 0.36 }) {
    const W = squares.x * squares.size;
    const H = squares.y * squares.size;
    this.board = new THREE.Mesh(
      new THREE.PlaneGeometry(W + 0.36, H + 0.36),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.94 }),
    );
    this.group.add(this.board);

    const cx = squares.x - 1;
    const cy = squares.y - 1;
    this.cornerCount = cx * cy;
    const corners: THREE.Vector3[] = [];
    for (let j = 0; j < cy; j++) {
      for (let i = 0; i < cx; i++) {
        corners.push(new THREE.Vector3((i + 1) * squares.size - W / 2, H / 2 - (j + 1) * squares.size, 0.012));
      }
    }
    const color = (idx: number) => new THREE.Color(ROW_COLORS[Math.floor(idx / cx) % ROW_COLORS.length]);

    const ringPos: number[] = [];
    const ringCol: number[] = [];
    const rad = squares.size * 0.2;
    corners.forEach((c, idx) => {
      const col = color(idx);
      for (let s = 0; s < this.ringSegments; s++) {
        const a0 = (s / this.ringSegments) * Math.PI * 2;
        const a1 = ((s + 1) / this.ringSegments) * Math.PI * 2;
        ringPos.push(c.x + Math.cos(a0) * rad, c.y + Math.sin(a0) * rad, c.z, c.x + Math.cos(a1) * rad, c.y + Math.sin(a1) * rad, c.z);
        ringCol.push(col.r, col.g, col.b, col.r, col.g, col.b);
      }
    });
    const rg = new THREE.BufferGeometry();
    rg.setAttribute("position", new THREE.Float32BufferAttribute(ringPos, 3));
    rg.setAttribute("color", new THREE.Float32BufferAttribute(ringCol, 3));
    this.rings = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true }));

    const zPos: number[] = [];
    const zCol: number[] = [];
    for (let idx = 1; idx < corners.length; idx++) {
      const a = corners[idx - 1];
      const b = corners[idx];
      const col = color(idx);
      zPos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      zCol.push(col.r, col.g, col.b, col.r, col.g, col.b);
    }
    const zg = new THREE.BufferGeometry();
    zg.setAttribute("position", new THREE.Float32BufferAttribute(zPos, 3));
    zg.setAttribute("color", new THREE.Float32BufferAttribute(zCol, 3));
    this.zigzag = new THREE.LineSegments(zg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true }));

    this.group.add(this.rings, this.zigzag);
    this.setReveal(0);
  }

  setColors(light: string, dark: string) {
    const { x, y } = this.squares;
    const canvas = document.createElement("canvas");
    const cell = 64;
    const margin = 32;
    canvas.width = x * cell + margin * 2;
    canvas.height = y * cell + margin * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = dark;
    for (let j = 0; j < y; j++) {
      for (let i = 0; i < x; i++) if ((i + j) % 2 === 0) ctx.fillRect(margin + i * cell, margin + j * cell, cell, cell);
    }
    const old = this.board.material.map;
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    this.board.material.map = tex;
    this.board.material.needsUpdate = true;
    old?.dispose();
  }

  /** t ∈ [0, 1]: board fades in, then corners are detected one by one. `fade` hides it where it'd be in the way. */
  setReveal(t: number, fade = 1) {
    this.board.material.opacity = 0.94 * Math.min(1, t * 3) * fade;
    (this.rings.material as THREE.LineBasicMaterial).opacity = fade;
    (this.zigzag.material as THREE.LineBasicMaterial).opacity = fade;
    const detected = Math.round(Math.max(0, Math.min(1, (t - 0.25) / 0.75)) * this.cornerCount);
    this.rings.geometry.setDrawRange(0, detected * this.ringSegments * 2);
    this.zigzag.geometry.setDrawRange(0, Math.max(0, detected - 1) * 2);
    this.group.visible = t > 0.001 && fade > 0.01;
  }
}
