/**
 * World layout, shared by the WebGL engine and the minimap. Pure math, no
 * three.js, so the minimap can use it without pulling the renderer in.
 *
 * The career is one closed loop on the ground plane. u ∈ [0, 1] runs once
 * around it: u = 0 is the world origin (the portrait), u = 1 is back at the
 * origin, where the loop closure happens.
 */
import { keyframes, decimalYear } from "@/content/timeline";
import { projects } from "@/content/projects";

export type V3 = [number, number, number];

export const LOOP = { cx: 0, cz: -34, rx: 31, rz: 35 };
export const FLOOR_Y = -1.9;

const TAU = Math.PI * 2;

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const lerp3 = (a: V3, b: V3, t: number): V3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
export const length = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const normalize = (a: V3): V3 => {
  const l = length(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/**
 * Camera centre on the (drift-free) loop. It runs clockwise seen from above,
 * so the camera looks left of its direction of travel (into the loop) and
 * moving forward reads as moving right on screen.
 */
export function loopPoint(u: number): V3 {
  const th = Math.PI / 2 + u * TAU;
  const wobble = 1 + 0.06 * Math.sin(u * TAU * 3 + 0.7) + 0.025 * Math.sin(u * TAU * 7);
  return [
    LOOP.cx - LOOP.rx * wobble * Math.cos(th),
    0.9 * Math.sin(u * TAU * 3) * Math.sin(u * Math.PI),
    LOOP.cz + LOOP.rz * wobble * Math.sin(th),
  ];
}

/** Unit direction of travel. */
export function tangent(u: number): V3 {
  const e = 1e-4;
  const d = sub(loopPoint(u + e), loopPoint(u - e));
  return normalize([d[0], 0, d[2]]);
}

/** Horizontal unit vector pointing into the loop (to the left of travel). */
export function inward(u: number): V3 {
  const t = tangent(u);
  return [t[2], 0, -t[0]];
}

/**
 * Odometry drift: the estimate wanders further from the truth the longer the
 * camera travels, until the loop closure pulls it back (amount → 0).
 */
export function driftOffset(u: number, amount: number): V3 {
  const a = Math.pow(u, 1.7) * amount;
  return [3.4 * a, 1.5 * Math.pow(u, 2.2) * amount, -2.6 * a];
}

export function estimatedPoint(u: number, drift: number): V3 {
  return add(loopPoint(u), driftOffset(u, drift));
}

/* ---------------------------------------------------------------- keyframes */

const U_FIRST = 0.13;
const U_LAST = 0.9;

/** Keyframes are spaced half evenly, half by start date. */
export const keyframeU: number[] = (() => {
  const years = keyframes.map((k) => decimalYear(k.start));
  const y0 = years[0];
  const y1 = years[years.length - 1];
  const n = keyframes.length;
  return keyframes.map((_, i) => {
    const even = n > 1 ? i / (n - 1) : 0;
    const time = y1 > y0 ? (years[i] - y0) / (y1 - y0) : even;
    return U_FIRST + (U_LAST - U_FIRST) * (0.5 * even + 0.5 * time);
  });
})();

/** Where a keyframe at u looks: its landmark word stands here, ahead and inside the loop. */
const SCENE_AHEAD = 0.02;
const SCENE_INWARD = 7.8;
const SCENE_UP = 1.7;

function sceneSlot(u: number, drift = 0): V3 {
  const a = u + SCENE_AHEAD;
  return add(add(estimatedPoint(a, drift), scale(inward(a), SCENE_INWARD)), [0, SCENE_UP, 0]);
}

export function sceneAnchor(i: number): { center: V3; facing: V3; u: number } {
  const center = sceneSlot(keyframeU[i]);
  const facing = normalize(sub(loopPoint(keyframeU[i]), center));
  return { center, facing: [facing[0], 0, facing[2]], u: keyframeU[i] + SCENE_AHEAD };
}

/* ------------------------------------------------------------ fixed objects */

export const CALIBRATION_U = 0.055;

export const portrait = (() => {
  const n = inward(0);
  const center = add(add(loopPoint(0), scale(n, 9)), [0.4, 2.3, 0]);
  return { center, facing: scale(n, -1) as V3, height: 7.2 };
})();

export const board = (() => {
  const u = CALIBRATION_U + 0.012;
  const center = add(add(loopPoint(u), scale(inward(u), 5.6)), [0, 1.1, 0]);
  const facing = normalize(sub(loopPoint(CALIBRATION_U), center));
  return { center, facing: [facing[0], 0, facing[2]] as V3, u };
})();

/** Projects sit deeper inside the loop, near the keyframe they belong to. */
export const landmarkPlacements = (() => {
  const byAnchor = new Map<string, number>();
  return projects.map((p) => {
    if (p.shape === "miniloop") {
      return { id: p.id, center: [LOOP.cx + 1.5, 0.6, LOOP.cz + 1] as V3, u: 0.95 };
    }
    const k = Math.max(0, keyframes.findIndex((kf) => kf.id === p.anchor));
    const slot = byAnchor.get(p.anchor) ?? 0;
    byAnchor.set(p.anchor, slot + 1);
    const u = keyframeU[k] + 0.03 + slot * 0.045;
    const depth = 16 + (slot % 2) * 3.5;
    const center = add(add(loopPoint(u), scale(inward(u), depth)), [0, 0.6, 0]);
    return { id: p.id, center, u };
  });
})();

/* ------------------------------------------------------------------- shots */

export type ShotKey = string;

export interface Pose {
  pos: V3;
  target: V3;
}

export interface Shot {
  key: ShotKey;
  /** Where the SLAM camera (blue frustum) sits on the loop for this shot. */
  u: number;
  follow: boolean;
  lift: number;
  pose?: Pose;
  /** For fixed poses near objects on the loop: the u they sit at, so the pose drifts with them. */
  anchorU?: number;
}

/** Third-person "follow camera": behind, outside and above the SLAM camera, looking at its scene slot. */
export function followPose(u: number, drift: number, lift = 0): Pose {
  const p = estimatedPoint(u, drift);
  const t = tangent(u);
  const n = inward(u);
  const pos = add(add(add(p, scale(t, -9.6 - lift * 0.8)), scale(n, -7.6 - lift * 0.5)), [0, 4.3 + lift, 0]);
  const target = add(sceneSlot(u, drift), [0, -0.9 - lift * 0.2, 0]);
  return { pos, target };
}

const heroPose: Pose = {
  pos: add(add(portrait.center, scale(portrait.facing, 16.4)), [0, 0.2, 0]),
  target: add(portrait.center, [0, -0.55, 0]),
};

export function buildShots(keys: ShotKey[]): Shot[] {
  return keys.map((key) => {
    if (key === "hero") return { key, u: 0, follow: false, lift: 0, pose: heroPose };
    if (key === "calibration") {
      return {
        key,
        u: CALIBRATION_U,
        follow: false,
        lift: 0,
        pose: {
          pos: add(add(board.center, scale(board.facing, 12.5)), [1.8, 1.9, 0]),
          target: add(board.center, [0, -0.5, 0]),
        },
      };
    }
    if (key === "trajectory") return { key, u: 0.116, follow: true, lift: 2.2 };
    if (key.startsWith("kf:")) {
      const i = keyframes.findIndex((k) => `kf:${k.id}` === key);
      return { key, u: keyframeU[Math.max(0, i)], follow: true, lift: 0 };
    }
    if (key === "landmarks") {
      return {
        key,
        u: 0.955,
        follow: false,
        lift: 0,
        pose: { pos: [LOOP.cx + 4, 82, LOOP.cz + 68], target: [LOOP.cx + 1, -4, LOOP.cz - 5] },
      };
    }
    if (key === "publications") {
      // Close-up on the SLAM Adversarial Lab sculpture, from the path side looking into the loop.
      const focus = landmarkPlacements.find((l) => l.id === "slam-adversarial-lab") ?? landmarkPlacements[0];
      const out = normalize([focus.center[0] - LOOP.cx, 0, focus.center[2] - LOOP.cz]);
      return {
        key,
        u: 0.965,
        follow: false,
        lift: 0,
        anchorU: focus.u,
        pose: {
          pos: add(add(focus.center, scale(out, 11)), [0, 5.4, 0]),
          target: add(focus.center, [0, 1.6, 0]),
        },
      };
    }
    // "loop": back at the origin, pulled out enough to see the loop close.
    return {
      key,
      u: 1,
      follow: false,
      lift: 0,
      pose: {
        pos: add(heroPose.pos, [5.5, 4.6, 7]),
        target: add(portrait.center, [-0.6, -1.9, 3]),
      },
    };
  });
}

export function shotPose(shot: Shot, drift: number): Pose {
  if (shot.follow) return followPose(shot.u, drift, shot.lift);
  const pose = shot.pose!;
  if (shot.anchorU === undefined) return pose;
  const d = driftOffset(shot.anchorU, drift);
  return { pos: add(pose.pos, d), target: add(pose.target, d) };
}
