/** Small scene props: camera frustums, the world-frame gizmo and the calibration board. */
import * as THREE from "three";

/**
 * Wireframe camera: apex at the origin, image plane at +Z (three.js
 * Object3D.lookAt points +Z at the target), with a small "up" tick.
 */
export function frustumGeometry(w = 0.62, h = 0.42, d = 0.78): THREE.BufferGeometry {
  const c = [
    [-w, -h, d],
    [w, -h, d],
    [w, h, d],
    [-w, h, d],
  ];
  const pts: number[] = [];
  for (const k of c) pts.push(0, 0, 0, k[0], k[1], k[2]);
  for (let i = 0; i < 4; i++) pts.push(...c[i], ...c[(i + 1) % 4]);
  pts.push(-w * 0.35, h, d, 0, h * 1.55, d, 0, h * 1.55, d, w * 0.35, h, d);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
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
