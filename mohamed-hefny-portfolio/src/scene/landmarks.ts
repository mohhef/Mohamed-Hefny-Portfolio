/**
 * Point-cloud sculptures for projects. Each is roughly 4 units tall with its
 * base at y = 0; kind 1 is the subject, kind 0 is supporting structure.
 */
import type { LandmarkShape } from "@/content/projects";
import type { Rng } from "./rng";
import type { PointSet } from "./sampling";
import type { V3 } from "./world";

const put = (s: PointSet, p: V3, kind: number) => {
  s.positions.push(p[0], p[1], p[2]);
  s.kinds.push(kind);
};

function segment(s: PointSet, a: V3, b: V3, n: number, kind: number, r: Rng, jitter = 0.012) {
  for (let i = 0; i < n; i++) {
    const t = r.next();
    put(
      s,
      [
        a[0] + (b[0] - a[0]) * t + r.gauss() * jitter,
        a[1] + (b[1] - a[1]) * t + r.gauss() * jitter,
        a[2] + (b[2] - a[2]) * t + r.gauss() * jitter,
      ],
      kind,
    );
  }
}

function blob(s: PointSet, c: V3, radius: number, n: number, kind: number, r: Rng) {
  for (let i = 0; i < n; i++) {
    put(s, [c[0] + r.gauss() * radius, c[1] + r.gauss() * radius, c[2] + r.gauss() * radius], kind);
  }
}

function sphereShell(s: PointSet, c: V3, radius: number, n: number, kind: number, r: Rng) {
  for (let i = 0; i < n; i++) {
    const z = r.range(-1, 1);
    const a = r.next() * Math.PI * 2;
    const q = Math.sqrt(1 - z * z);
    put(s, [c[0] + radius * q * Math.cos(a), c[1] + radius * z, c[2] + radius * q * Math.sin(a)], kind);
  }
}

function pedestal(s: PointSet, radius: number, r: Rng) {
  for (let i = 0; i < 260; i++) {
    const a = r.next() * Math.PI * 2;
    const d = radius * Math.sqrt(r.next());
    put(s, [Math.cos(a) * d, r.gauss() * 0.02, Math.sin(a) * d], 0);
  }
}

const shapes: Record<LandmarkShape, (s: PointSet, r: Rng) => void> = {
  // Peer-to-peer streaming: two peers, a relay, and streams arcing between them.
  network(s, r) {
    const a: V3 = [-1.7, 1.6, 0];
    const b: V3 = [1.7, 1.9, 0.3];
    sphereShell(s, a, 0.55, 260, 1, r);
    sphereShell(s, b, 0.55, 260, 1, r);
    sphereShell(s, [0, 3.3, -0.4], 0.28, 90, 1, r);
    for (let k = 0; k < 16; k++) {
      const lift = r.range(0.4, 2.2);
      const sway = r.range(-0.9, 0.9);
      for (let i = 0; i < 55; i++) {
        const t = i / 54;
        const x = a[0] + (b[0] - a[0]) * t;
        const y = a[1] + (b[1] - a[1]) * t + Math.sin(Math.PI * t) * lift;
        const z = a[2] + (b[2] - a[2]) * t + Math.sin(Math.PI * t) * sway;
        put(s, [x + r.gauss() * 0.01, y, z], k % 3 === 0 ? 1 : 0);
      }
    }
    pedestal(s, 2.4, r);
  },

  // SuperHypercube: a tesseract projected from 4D.
  tesseract(s, r) {
    const verts: number[][] = [];
    for (let i = 0; i < 16; i++) verts.push([0, 1, 2, 3].map((b) => ((i >> b) & 1 ? 1 : -1)));
    const rot = (v: number[]) => {
      const [x, y, z, w] = v;
      const a = 0.62;
      const b = 0.41;
      const x1 = x * Math.cos(a) - w * Math.sin(a);
      const w1 = x * Math.sin(a) + w * Math.cos(a);
      const y1 = y * Math.cos(b) - z * Math.sin(b);
      const z1 = y * Math.sin(b) + z * Math.cos(b);
      return [x1, y1, z1, w1];
    };
    const project = (v: number[]): V3 => {
      const [x, y, z, w] = rot(v);
      const k = 2.6 / (3.2 - w);
      return [x * k * 1.05, 2.1 + y * k * 1.05, z * k * 1.05];
    };
    for (let i = 0; i < 16; i++) {
      for (let j = i + 1; j < 16; j++) {
        const diff = verts[i].reduce((n, v, d) => n + (v !== verts[j][d] ? 1 : 0), 0);
        if (diff === 1) segment(s, project(verts[i]), project(verts[j]), 58, 1, r, 0.01);
      }
    }
    verts.forEach((v) => blob(s, project(v), 0.05, 10, 1, r));
    pedestal(s, 2.2, r);
  },

  // A* over a crime grid: raised blocks for high-crime cells, the path in between.
  gridpath(s, r) {
    const n = 9;
    const cell = 0.46;
    const off = ((n - 1) * cell) / 2;
    const blocked = new Set<number>();
    for (let i = 0; i < n * n; i++) if (r.next() < 0.3) blocked.add(i);
    const path: Array<[number, number]> = [];
    let x = 0;
    let z = 0;
    path.push([x, z]);
    while (x < n - 1 || z < n - 1) {
      if (x < n - 1 && (z === n - 1 || r.next() < 0.5)) x++;
      else z++;
      path.push([x, z]);
      blocked.delete(z * n + x);
    }
    for (let gz = 0; gz < n; gz++) {
      for (let gx = 0; gx < n; gx++) {
        const cx = gx * cell - off;
        const cz = gz * cell - off;
        if (blocked.has(gz * n + gx)) {
          const h = r.range(0.25, 1.1);
          for (let i = 0; i < 34; i++) {
            put(s, [cx + r.range(-0.19, 0.19), r.next() * h, cz + r.range(-0.19, 0.19)], 0);
          }
        } else {
          for (let i = 0; i < 5; i++) put(s, [cx + r.range(-0.2, 0.2), 0, cz + r.range(-0.2, 0.2)], 0);
        }
      }
    }
    for (let i = 1; i < path.length; i++) {
      const [ax, az] = path[i - 1];
      const [bx, bz] = path[i];
      segment(s, [ax * cell - off, 0.12, az * cell - off], [bx * cell - off, 0.12, bz * cell - off], 40, 1, r, 0.015);
    }
    // Start and goal markers.
    blob(s, [-off, 0.5, -off], 0.07, 60, 1, r);
    blob(s, [off, 0.5, off], 0.07, 60, 1, r);
  },

  // Naive Bayes: four class clusters.
  clusters(s, r) {
    const centres: Array<[V3, number]> = [
      [[-1.1, 2.4, 0.2], 0.38],
      [[1.0, 2.9, -0.3], 0.3],
      [[0.6, 1.3, 0.6], 0.42],
      [[-0.9, 1.1, -0.7], 0.22],
    ];
    centres.forEach(([c, rad], k) => blob(s, c, rad, 320 - k * 40, 1, r));
    segment(s, [-2, 0, 0], [2, 0, 0], 90, 0, r, 0.005);
    segment(s, [0, 0, 0], [0, 4, 0], 90, 0, r, 0.005);
    segment(s, [0, 0, -2], [0, 0, 2], 90, 0, r, 0.005);
  },

  // Eight-Minute Empire: a hex map with claimed regions and armies.
  board(s, r) {
    const size = 0.42;
    const hexes: V3[] = [];
    for (let q = -3; q <= 3; q++) {
      for (let rr = Math.max(-3, -q - 3); rr <= Math.min(3, -q + 3); rr++) {
        hexes.push([size * 1.5 * q, 0, size * Math.sqrt(3) * (rr + q / 2)]);
      }
    }
    hexes.forEach((c) => {
      const claimed = r.next() < 0.35;
      for (let e = 0; e < 6; e++) {
        const a0 = (Math.PI / 3) * e;
        const a1 = (Math.PI / 3) * (e + 1);
        segment(
          s,
          [c[0] + Math.cos(a0) * size * 0.94, 0, c[2] + Math.sin(a0) * size * 0.94],
          [c[0] + Math.cos(a1) * size * 0.94, 0, c[2] + Math.sin(a1) * size * 0.94],
          7,
          claimed ? 1 : 0,
          r,
          0.004,
        );
      }
      if (claimed && r.next() < 0.6) {
        const h = r.range(0.2, 0.7);
        for (let i = 0; i < 26; i++) put(s, [c[0] + r.range(-0.09, 0.09), r.next() * h, c[2] + r.range(-0.09, 0.09)], 1);
      }
    });
  },

  // CONPASS: stacked floor plans with an indoor route climbing through them.
  floors(s, r) {
    const w = 3;
    const d = 2.2;
    const route: V3[] = [];
    for (let f = 0; f < 3; f++) {
      const y = 0.2 + f * 1.15;
      const rect: V3[] = [
        [-w / 2, y, -d / 2],
        [w / 2, y, -d / 2],
        [w / 2, y, d / 2],
        [-w / 2, y, d / 2],
      ];
      for (let e = 0; e < 4; e++) segment(s, rect[e], rect[(e + 1) % 4], 70, 0, r, 0.006);
      segment(s, [-w / 2 + 1, y, -d / 2], [-w / 2 + 1, y, d / 2 - 0.6], 30, 0, r, 0.006);
      segment(s, [w / 2 - 1.1, y, -d / 2 + 0.7], [w / 2 - 1.1, y, d / 2], 30, 0, r, 0.006);
      segment(s, [-w / 2, y, 0.2], [-w / 2 + 1, y, 0.2], 20, 0, r, 0.006);
      route.push([-1.1 + f * 0.9, y + 0.05, -0.5 + (f % 2) * 0.9]);
      route.push([1.0 - f * 0.4, y + 0.05, 0.6 - (f % 2) * 1.1]);
    }
    for (let i = 1; i < route.length; i++) segment(s, route[i - 1], route[i], 60, 1, r, 0.01);
    blob(s, route[route.length - 1], 0.06, 50, 1, r);
  },

  // SLAM Adversarial Lab: a camera with a cracked lens, caught in rain and fog.
  storm(s, r) {
    const apex: V3 = [0, 1.9, -0.8];
    const w = 0.85;
    const h = 0.58;
    const z = apex[2] + 1.25;
    const corners: V3[] = [
      [-w, apex[1] - h, z],
      [w, apex[1] - h, z],
      [w, apex[1] + h, z],
      [-w, apex[1] + h, z],
    ];
    corners.forEach((c, e) => {
      segment(s, apex, c, 50, 1, r, 0.006);
      segment(s, c, corners[(e + 1) % 4], 60, 1, r, 0.006);
    });
    // Cracks radiating across the image plane from one impact point.
    const inside = (p: V3): V3 => [
      Math.max(-w, Math.min(w, p[0])),
      Math.max(apex[1] - h, Math.min(apex[1] + h, p[1])),
      z,
    ];
    for (let k = 0; k < 7; k++) {
      let p: V3 = [0.24, apex[1] + 0.12, z];
      let a = (k / 7) * Math.PI * 2 + r.range(-0.3, 0.3);
      for (let step = 0; step < 4; step++) {
        a += r.range(-0.5, 0.5);
        const len = r.range(0.12, 0.28);
        const q = inside([p[0] + Math.cos(a) * len, p[1] + Math.sin(a) * len, z]);
        segment(s, p, q, 14, 1, r, 0.003);
        p = q;
      }
    }
    // Rain streaks falling through the scene, and fog around the camera.
    for (let k = 0; k < 44; k++) {
      const ang = r.next() * Math.PI * 2;
      const rad = r.range(0.4, 2.5);
      const x = Math.cos(ang) * rad;
      const zz = Math.sin(ang) * rad;
      const top = r.range(1.0, 4.3);
      segment(s, [x, top, zz], [x + 0.08, top - r.range(0.35, 0.7), zz], 12, 0, r, 0.004);
    }
    blob(s, [0, 1.9, 0], 1.1, 420, 0, r);
    pedestal(s, 2.4, r);
  },

  // Pollution Lens: facility smokestacks feeding Sankey ribbons into air, water and land.
  sankey(s, r) {
    const smooth = (t: number) => t * t * (3 - 2 * t);
    const stacks: Array<[number, number]> = [
      [-0.55, 1.5],
      [0, 2.2],
      [0.55, 1.1],
    ];
    const sinks = [3.1, 1.9, 0.7];
    stacks.forEach(([z, h], i) => {
      for (let k = 0; k < 90; k++) put(s, [-2 + r.range(-0.12, 0.12), r.next() * h, z + r.range(-0.12, 0.12)], 0);
      blob(s, [-2, h + 0.35, z], 0.16, 40, 0, r);
      sinks.forEach((y1, j) => {
        const width = 0.06 + ((i + j * 2) % 3) * 0.05;
        const y0 = h - 0.2 - j * 0.28;
        const z1 = (j - 1) * 0.3;
        for (let n = 0; n < 150; n++) {
          const t = r.next();
          const e = smooth(t);
          put(
            s,
            [-2 + t * 3.8, y0 + (y1 - y0) * e + r.range(-width, width), z + (z1 - z) * e + r.gauss() * 0.02],
            1,
          );
        }
      });
    });
    sinks.forEach((y) => segment(s, [1.8, y - 0.35, 0], [1.8, y + 0.35, 0], 60, 1, r, 0.02));
    pedestal(s, 2.4, r);
  },

  // This site: a miniature of the loop you're driving around.
  miniloop(s, r) {
    for (let i = 0; i < 520; i++) {
      const a = r.next() * Math.PI * 2;
      put(s, [Math.cos(a) * 2.1 + r.gauss() * 0.02, 0.9 + Math.sin(a * 3) * 0.08, Math.sin(a) * 2.4 + r.gauss() * 0.02], 1);
    }
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      const c: V3 = [Math.cos(a) * 2.1, 1.05, Math.sin(a) * 2.4];
      blob(s, c, 0.05, 18, 1, r);
      blob(s, [c[0] * 0.62, 1.4 + r.next() * 0.9, c[2] * 0.62], 0.16, 40, 0, r);
    }
    blob(s, [0, 2.3, 0], 0.5, 260, 1, r);
    pedestal(s, 2.8, r);
  },
};

export function sampleLandmark(shape: LandmarkShape, r: Rng): PointSet {
  const set: PointSet = { positions: [], kinds: [] };
  shapes[shape](set, r);
  return set;
}
