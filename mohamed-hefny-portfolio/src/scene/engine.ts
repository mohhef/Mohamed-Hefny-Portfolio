/**
 * The map viewer. Owns the WebGL renderer and turns scroll progress into a
 * SLAM session: the portrait trains in, the camera drives the career loop,
 * keyframes get inserted, their landmarks are triangulated, drift accumulates
 * and is corrected when the loop closes at the end of the page.
 */
import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { covisibility, keyframes } from "@/content/timeline";
import { projects } from "@/content/projects";
import { palettes, type Lighting, type Palette } from "./palette";
import { buildPointGeometry, createMapPointMaterial, type MapPointMaterial } from "./mapPoints";
import { sampleCorridor, sampleSurroundings, sampleText } from "./sampling";
import { sampleLandmark } from "./landmarks";
import { buildPortrait, type Portrait } from "./splats";
import { CalibrationBoard, axesGizmo, frustumGeometry } from "./props";
import { Weather, type WeatherMode } from "./weather";
import { hashString, rng } from "./rng";
import * as W from "./world";

export type TrackingState = "INITIALIZING" | "TRACKING" | "LOST" | "RELOCALIZED" | "LOOP CLOSED";

export interface Telemetry {
  state: TrackingState;
  fps: number;
  keyframes: number;
  totalKeyframes: number;
  mapPoints: number;
  features: number;
  /** x, y, z (m) and yaw (deg) of the SLAM camera. */
  pose: [number, number, number, number];
  drift: number;
  u: number;
  active: string | null;
  train: { iter: number; psnr: number; gaussians: number; done: boolean };
}

/** Something in the map the cursor can lock onto and a click can relocalize to. */
export interface PickTarget {
  kind: "keyframe" | "landmark" | "calibration" | "origin";
  id: string;
  label: string;
  hint: string;
  /** Screen position, client pixels. */
  x: number;
  y: number;
}

export interface EngineOptions {
  lighting: Lighting;
  weather: WeatherMode;
  reducedMotion: boolean;
  lowPower: boolean;
  fontFamily: string;
  onTelemetry: (t: Telemetry) => void;
}

interface Anchored {
  obj: THREE.Object3D;
  base: THREE.Vector3;
  u: number;
}

interface MapScene {
  id: string;
  u: number;
  count: number;
  material: MapPointMaterial;
  group: THREE.Group;
  reveal: number;
  tracked: number;
  highlight: number;
  features: THREE.Vector3[];
}

interface KeyframeViz {
  id: string;
  u: number;
  group: THREE.Group;
  material: THREE.LineBasicMaterial;
  inserted: number;
}

interface LandmarkViz {
  id: string;
  u: number;
  count: number;
  material: MapPointMaterial;
  group: THREE.Group;
  reveal: number;
  highlight: number;
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
/** Hold still near each section's centre, move in between. */
const dwell = (f: number) => smoother(clamp((f - 0.12) / 0.76));
const easeOutBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
const v3 = (a: W.V3) => new THREE.Vector3(a[0], a[1], a[2]);
const TRAJECTORY_SAMPLES = 720;
const TRAIN_SECONDS = 4.8;
const UP = new THREE.Vector3(0, 1, 0);

// Palette hex values are sRGB and written straight to the canvas. This has to be
// off before any THREE.Color is built, including the ones in class field initialisers.
THREE.ColorManagement.enabled = false;

export class SlamEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
  private palette: Palette;
  private lighting: Lighting;
  private opts: EngineOptions;

  private raf = 0;
  private last = 0;
  private time = 0;
  private disposed = false;
  private size = { w: 1, h: 1 };
  private pixelRatio = 1;
  private focus = { x: 0.5, y: 0.5 };
  private pointer = { x: 0, y: 0, sx: 0, sy: 0 };

  private shots: W.Shot[] = [];
  private shotIndex = new Map<string, number>();
  private sTarget = 0;
  private sPrevTarget = 0;
  private s = 0;
  private scrollSpeed = 0;
  private u = 0;
  private head = 0;

  private drift = 1;
  private closure = -1;
  private train = 0;
  private portrait?: Portrait;
  private portraitGroup = new THREE.Group();

  private lostUntil = -1;
  private wasLost = false;
  private relocalizedUntil = -1;
  private nextWeatherLoss = 0;
  private fastScroll = 0;
  private noise = 0;

  private anchored: Anchored[] = [];
  private scenes: MapScene[] = [];
  private kfs: KeyframeViz[] = [];
  private originKf!: KeyframeViz;
  private landmarks: LandmarkViz[] = [];
  private corridor?: { material: MapPointMaterial; count: number };
  private board = new CalibrationBoard();
  private boardReveal = 0;
  private gizmo = axesGizmo();

  private trajectory!: Line2;
  private trajectoryMaterial!: LineMaterial;
  private covis!: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private covisEdges = covisibility();
  private loopEdge!: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private matches!: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private currentCam = new THREE.Group();
  private currentCamMaterial = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false });
  private weather: Weather;

  private labels = new Map<string, HTMLElement>();
  private labelsShown = false;
  private skill: string | null = null;
  private hovered: string | null = null;

  private cursor = { x: 9, y: 9, px: 0, py: 0, on: false, fade: 0 };
  private orbit = { yaw: 0, pitch: 0, dragging: false };
  private spherical = new THREE.Spherical();
  private pickHover: PickTarget | null = null;
  private reticle?: { root: HTMLElement; label: HTMLElement; sub: HTMLElement };
  private reticlePos = { x: 0, y: 0, placed: false };
  private navigatingUntil = -1;

  private colors = { camera: new THREE.Color(), keyframe: new THREE.Color(), highlight: new THREE.Color() };
  private covisAlpha = new Float32Array(0);

  private telemetryAt = 0;
  private fps = 60;
  private fpsFrames = 0;
  private fpsTime = 0;
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();

  constructor(private canvas: HTMLCanvasElement, opts: EngineOptions) {
    this.opts = opts;
    this.lighting = opts.lighting;
    this.palette = palettes[opts.lighting];
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.weather = new Weather(opts.lowPower ? 0.55 : 1);
    this.weather.mode = opts.weather;
    this.buildStatic();
    this.setLighting(opts.lighting);
    this.resize();
    this.train = opts.reducedMotion ? 1 : 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  /* ------------------------------------------------------------- building */

  /** Attaches an object to the loop at u so it drifts (and gets corrected) with the trajectory. */
  private anchor(obj: THREE.Object3D, u: number) {
    const base = obj.position.clone();
    this.anchored.push({ obj, base, u });
    obj.position.copy(base).add(v3(W.driftOffset(u, this.drift)));
  }

  private buildStatic() {
    const s = this.scene;

    // World frame at the origin keyframe.
    this.gizmo.position.copy(v3(W.loopPoint(0)));
    s.add(this.gizmo);

    // Keyframes: the origin plus one per career entry. They appear on insertion.
    const makeKf = (id: string, u: number, lookAt: THREE.Vector3): KeyframeViz => {
      const material = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.95, depthWrite: false });
      const group = new THREE.Group();
      group.add(new THREE.LineSegments(frustumGeometry(0.5, 0.34, 0.62), material));
      group.position.copy(v3(W.loopPoint(u)));
      group.lookAt(lookAt);
      group.scale.setScalar(0.001);
      s.add(group);
      this.anchor(group, u);
      return { id, u, group, material, inserted: 0 };
    };
    this.originKf = makeKf("origin", 0, v3(W.portrait.center));
    this.kfs = keyframes.map((kf, i) => makeKf(kf.id, W.keyframeU[i], v3(W.sceneAnchor(i).center)));

    // The SLAM camera itself.
    this.currentCam.add(new THREE.LineSegments(frustumGeometry(0.64, 0.43, 0.8), this.currentCamMaterial));
    this.currentCam.visible = false;
    s.add(this.currentCam);

    // The whole trajectory is drawn up front so it's clear where the camera is heading.
    const geometry = new LineGeometry();
    geometry.setPositions(this.trajectoryPositions());
    this.trajectoryMaterial = new LineMaterial({ linewidth: 2.2, transparent: true, opacity: 0.9, worldUnits: false, depthWrite: false });
    this.trajectory = new Line2(geometry, this.trajectoryMaterial);
    this.trajectory.frustumCulled = false;
    s.add(this.trajectory);

    // Covisibility graph between keyframes that share skills.
    const cg = new THREE.BufferGeometry();
    cg.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(this.covisEdges.length * 6), 3));
    cg.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(this.covisEdges.length * 8), 4));
    this.covis = new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
    this.covis.frustumCulled = false;
    s.add(this.covis);

    // Loop-closure edge from the last keyframe back to the origin.
    this.loopEdge = new THREE.Line(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(6), 3)),
      new THREE.LineBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    this.loopEdge.frustumCulled = false;
    s.add(this.loopEdge);

    // Feature matches from the SLAM camera to the tracked landmark.
    this.matches = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(48 * 6), 3)),
      new THREE.LineBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    this.matches.frustumCulled = false;
    s.add(this.matches);

    // Calibration board.
    this.board.group.position.copy(v3(W.board.center));
    this.board.group.lookAt(this.tmp.copy(this.board.group.position).add(v3(W.board.facing)));
    s.add(this.board.group);
    this.anchor(this.board.group, W.board.u);

    // Portrait frame.
    this.portraitGroup.position.copy(v3(W.portrait.center));
    this.portraitGroup.lookAt(this.tmp.copy(this.portraitGroup.position).add(v3(W.portrait.facing)));
    s.add(this.portraitGroup);

    s.add(this.weather.group);
  }

  private trajectoryPositions(): number[] {
    const out: number[] = [];
    for (let i = 0; i < TRAJECTORY_SAMPLES; i++) {
      const p = W.estimatedPoint(i / (TRAJECTORY_SAMPLES - 1), this.drift);
      out.push(p[0], p[1], p[2]);
    }
    return out;
  }

  /** Loads the portrait, then reconstructs the rest of the map in the background. */
  async init() {
    const low = this.opts.lowPower;
    this.portrait = await buildPortrait({
      image: "/images/self.jpg",
      matte: "/images/portrait-matte.png",
      count: low ? 14000 : 32000,
      height: W.portrait.height,
    });
    if (this.disposed) return;
    this.portraitGroup.add(this.portrait.mesh);

    const font = `800 150px ${this.opts.fontFamily}`;
    try {
      await document.fonts.load(font);
    } catch {
      // Fall back to whatever font the canvas resolves.
    }

    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    for (let i = 0; i < keyframes.length; i++) {
      await nextFrame();
      if (this.disposed) return;
      this.buildScene(i);
    }
    await nextFrame();
    if (this.disposed) return;
    this.buildCorridor();
    for (let i = 0; i < projects.length; i++) {
      if (i % 3 === 0) await nextFrame();
      if (this.disposed) return;
      this.buildLandmark(i);
    }
  }

  private buildScene(i: number) {
    const kf = keyframes[i];
    const r = rng(hashString(kf.id));
    const anchor = W.sceneAnchor(i);
    const low = this.opts.lowPower;
    const text = sampleText(
      kf.landmark,
      this.opts.fontFamily,
      { count: low ? 3200 : 5600, letterHeight: 1.7, maxWidth: 8.4, depth: 0.42 },
      r,
    );
    sampleSurroundings(text, r, { width: text.width, floorY: W.FLOOR_Y - anchor.center[1], density: low ? 0.6 : 1 });

    const material = createMapPointMaterial();
    this.stylePoints(material);
    const points = new THREE.Points(buildPointGeometry(text.positions, text.kinds, r.next), material);
    const group = new THREE.Group();
    group.add(points);
    group.position.copy(v3(anchor.center));
    group.lookAt(this.tmp.copy(group.position).add(v3(anchor.facing)));
    group.updateMatrixWorld(true);
    material.uniforms.uOrigin.value.copy(group.worldToLocal(v3(W.loopPoint(W.keyframeU[i]))));
    material.uniforms.uFacing.value.copy(v3(anchor.facing));
    material.uniforms.uUseFacing.value = 1;
    this.scene.add(group);
    this.anchor(group, anchor.u);

    const features: THREE.Vector3[] = [];
    for (let f = 0; f + 2 < text.features.length; f += 3) {
      features.push(new THREE.Vector3(text.features[f], text.features[f + 1], text.features[f + 2]));
    }
    this.scenes.push({
      id: kf.id,
      u: W.keyframeU[i],
      count: text.positions.length / 3,
      material,
      group,
      reveal: 0,
      tracked: 0,
      highlight: 0,
      features: features.slice(0, 36),
    });
  }

  private buildCorridor() {
    const r = rng(7);
    const set = sampleCorridor(this.opts.lowPower ? 4200 : 8000, r);
    const material = createMapPointMaterial(true);
    this.stylePoints(material, 0.9);
    const points = new THREE.Points(buildPointGeometry(set.positions, set.kinds, r.next, set.us), material);
    points.frustumCulled = false;
    this.scene.add(points);
    this.corridor = { material, count: set.positions.length / 3 };
  }

  private buildLandmark(i: number) {
    const p = projects[i];
    const placement = W.landmarkPlacements[i];
    const r = rng(hashString(p.id));
    const set = sampleLandmark(p.shape, r);
    const material = createMapPointMaterial();
    this.stylePoints(material, 1.05);
    const group = new THREE.Group();
    group.add(new THREE.Points(buildPointGeometry(set.positions, set.kinds, r.next), material));
    group.position.copy(v3(placement.center));
    group.rotation.y = r.range(0, Math.PI * 2);
    group.scale.setScalar(1.35);
    group.updateMatrixWorld(true);
    material.uniforms.uOrigin.value.set(0, 9, 0);
    this.scene.add(group);
    this.anchor(group, placement.u);
    this.landmarks.push({
      id: p.id,
      u: placement.u,
      count: set.positions.length / 3,
      material,
      group,
      reveal: 0,
      highlight: 0,
    });
  }

  /* ------------------------------------------------------------ public API */

  setShots(keys: string[]) {
    this.shots = W.buildShots(keys);
    this.shotIndex = new Map(keys.map((k, i) => [k, i]));
  }

  /** Continuous section index: 2.5 = halfway between the 3rd and 4th shot. */
  setProgress(s: number) {
    this.sTarget = s;
  }

  /** Where the focus of the shot should land on screen, in 0..1 viewport units. */
  setFocus(x: number, y: number) {
    this.focus = { x, y };
    this.applyView();
  }

  setPointer(x: number, y: number) {
    this.pointer.x = x;
    this.pointer.y = y;
  }

  setWeather(mode: WeatherMode) {
    this.weather.mode = mode;
    this.nextWeatherLoss = this.time + 2.5;
  }

  setSkill(skill: string | null) {
    this.skill = skill;
  }

  setHoveredLandmark(id: string | null) {
    this.hovered = id;
  }

  /** Mouse position in client pixels: the cursor detects features and picks targets. */
  setCursor(clientX: number, clientY: number) {
    const { w, h } = this.size;
    this.cursor.px = clientX;
    this.cursor.py = clientY;
    this.cursor.x = (clientX / w) * 2 - 1;
    this.cursor.y = -((clientY / h) * 2 - 1);
    if (!this.cursor.on) this.reticlePos.placed = false;
    this.cursor.on = true;
  }

  clearCursor() {
    this.cursor.on = false;
    this.pickHover = null;
  }

  /** Drag to look: orbit around the current shot, easing back once released. */
  beginDrag() {
    this.orbit.dragging = true;
  }

  dragBy(dx: number, dy: number) {
    this.orbit.yaw -= dx * 0.0045;
    this.orbit.pitch = clamp(this.orbit.pitch - dy * 0.0035, -0.9, 0.9);
  }

  endDrag() {
    this.orbit.dragging = false;
  }

  /** What a click would relocalize to, if anything. */
  getPickTarget(): PickTarget | null {
    return this.pickHover;
  }

  setReticle(reticle: { root: HTMLElement; label: HTMLElement; sub: HTMLElement }) {
    this.reticle = reticle;
  }

  /** Stepping with the arrow keys shouldn't read as a motion-blur tracking loss. */
  setNavigating(seconds: number) {
    this.navigatingUntil = this.time + seconds;
  }

  setLabels(labels: Map<string, HTMLElement>) {
    this.labels = labels;
    this.labelsShown = true;
  }

  private stylePoints(m: MapPointMaterial, baseSize?: number) {
    const p = this.palette;
    if (baseSize !== undefined) m.userData.baseSize = baseSize;
    m.uniforms.uSize.value = (m.userData.baseSize ?? 1) * p.pointSize;
    m.uniforms.uColor.value.set(p.point);
    m.uniforms.uTrackColor.value.set(p.tracked);
    m.uniforms.uHighlightColor.value.set(p.highlight);
    m.uniforms.uDetectColor.value.set(p.highlight);
    m.uniforms.uStructureAlpha.value = p.structureAlpha;
    m.uniforms.uOpacity.value = p.pointAlpha;
    m.uniforms.uPixelRatio.value = this.pixelRatio;
  }

  setLighting(lighting: Lighting) {
    this.lighting = lighting;
    const p = (this.palette = palettes[lighting]);
    this.renderer.setClearColor(p.background, 1);
    this.colors.camera.set(p.camera);
    this.colors.keyframe.set(p.keyframe);
    this.colors.highlight.set(p.highlight);
    for (const m of [
      ...this.scenes.map((x) => x.material),
      ...this.landmarks.map((x) => x.material),
      ...(this.corridor ? [this.corridor.material] : []),
    ]) {
      this.stylePoints(m);
    }
    this.currentCamMaterial.color.set(p.camera);
    this.trajectoryMaterial.color.set(p.keyframe);
    this.loopEdge.material.color.set(p.loop);
    this.matches.material.color.set(p.tracked);
    this.board.setColors(p.boardLight, p.boardDark);
    this.weather.setColor(p.precip, p.precipAlpha);
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.size = { w, h };
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.opts.lowPower ? 1.5 : 2);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h, false);
    this.trajectoryMaterial.resolution.set(w * this.pixelRatio, h * this.pixelRatio);
    this.weather.setPixelRatio(this.pixelRatio);
    this.applyView();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    const disposeMaterial = (m: THREE.Material) => {
      (m as THREE.MeshBasicMaterial).map?.dispose();
      m.dispose();
    };
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach(disposeMaterial);
      else if (mat) disposeMaterial(mat);
    });
    this.renderer.dispose();
  }

  /* ------------------------------------------------------------- per frame */

  private applyView() {
    const { w, h } = this.size;
    this.camera.aspect = w / h;
    // Keep at least ~34° horizontally so portrait phones don't crop the scene.
    const minHorizontal = (34 * Math.PI) / 180;
    const vertical = 2 * Math.atan(Math.tan(minHorizontal / 2) / this.camera.aspect);
    this.camera.fov = Math.max(38, (vertical * 180) / Math.PI);
    this.camera.setViewOffset(w, h, w * (0.5 - this.focus.x), h * (0.5 - this.focus.y), w, h);
    this.camera.updateProjectionMatrix();
  }

  private poseAt(s: number): { pos: W.V3; target: W.V3; u: number } {
    const n = this.shots.length;
    if (!n) return { ...W.buildShots(["hero"])[0].pose!, u: 0 };
    const i = Math.max(0, Math.min(n - 1, Math.floor(s)));
    const a = this.shots[i];
    const b = this.shots[Math.min(i + 1, n - 1)];
    const e = dwell(clamp(s - i));
    const u = a.u + (b.u - a.u) * e;
    if (a.follow && b.follow) {
      return { ...W.followPose(u, this.drift, a.lift + (b.lift - a.lift) * e), u };
    }
    const pa = W.shotPose(a, this.drift);
    const pb = W.shotPose(b, this.drift);
    const pos = W.lerp3(pa.pos, pb.pos, e);
    pos[1] += Math.sin(Math.PI * e) * Math.min(9, W.length(W.sub(pb.pos, pa.pos)) * 0.18);
    return { pos, target: W.lerp3(pa.target, pb.target, e), u };
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    if (document.hidden) {
      this.last = now;
      return;
    }
    const dt = Math.min(0.05, this.last ? (now - this.last) / 1000 : 0.016);
    this.last = now;
    this.time += dt;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);

    this.fpsFrames++;
    this.fpsTime += dt;
    if (this.fpsTime > 0.5) {
      this.fps = this.fpsFrames / this.fpsTime;
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
  };

  private update(dt: number) {
    const reduced = this.opts.reducedMotion;
    const approach = (k: number) => 1 - Math.exp(-dt * k);

    // Scroll → camera.
    const rawSpeed = Math.abs(this.sTarget - this.sPrevTarget) / Math.max(dt, 1e-3);
    this.sPrevTarget = this.sTarget;
    this.scrollSpeed += (rawSpeed - this.scrollSpeed) * approach(8);
    this.s += (this.sTarget - this.s) * approach(reduced ? 20 : 3.2);
    const pose = this.poseAt(this.s);
    this.u = pose.u;
    if (this.train >= 1) this.head = Math.max(this.head, this.u);

    const pos = v3(pose.pos);
    const target = v3(pose.target);
    if (!reduced) {
      this.pointer.sx += (this.pointer.x - this.pointer.sx) * approach(3);
      this.pointer.sy += (this.pointer.y - this.pointer.sy) * approach(3);
      const right = this.tmp.copy(target).sub(pos).cross(UP).normalize();
      pos.addScaledVector(right, this.pointer.sx * 0.7).addScaledVector(UP, this.pointer.sy * 0.4);
    }
    if (!this.orbit.dragging) {
      const k = approach(reduced ? 30 : 2.2);
      this.orbit.yaw -= this.orbit.yaw * k;
      this.orbit.pitch -= this.orbit.pitch * k;
    }
    if (Math.abs(this.orbit.yaw) + Math.abs(this.orbit.pitch) > 1e-4) {
      const offset = this.tmp.copy(pos).sub(target);
      this.spherical.setFromVector3(offset);
      this.spherical.theta += this.orbit.yaw;
      this.spherical.phi = clamp(this.spherical.phi + this.orbit.pitch, 0.15, 1.5);
      pos.copy(target).add(offset.setFromSpherical(this.spherical));
    }
    this.camera.position.copy(pos);
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld();

    // Portrait training.
    if (this.portrait) {
      this.train = reduced ? 1 : Math.min(1, this.train + dt / TRAIN_SECONDS);
      const m = this.portrait.material.uniforms;
      m.uTrain.value = this.train;
      m.uTime.value = reduced ? 0 : this.time;
    }

    // Loop closure.
    if (this.u > 0.975 && this.closure < 0 && this.train >= 1) this.closure = 0;
    if (this.closure >= 0) {
      this.closure += dt;
      const drift = 1 - smoother(clamp(this.closure / (reduced ? 0.01 : 2.4)));
      if (drift !== this.drift) {
        this.drift = drift;
        this.applyDrift();
      }
    }

    // Tracking state.
    const lost = this.updateTracking(dt);
    const weatherNoise = this.weather.severity + (this.lighting === "night" ? 0.2 : 0);
    this.noise += (weatherNoise + (lost ? 2.2 : 0) - this.noise) * approach(4);

    // Keyframe insertion: the blue current frame becomes a green keyframe.
    // Wireframes fade out when the viewer is right on top of them; the origin props also
    // stay out of the hero close-up so the portrait has the frame to itself.
    const nearFade = (obj: THREE.Object3D) => clamp((this.camera.position.distanceTo(obj.position) - 5) / 5);
    const heroHide = 1 - clamp(1 - this.s / 0.6);
    const insert = (kf: KeyframeViz, due: boolean) => {
      if (due) kf.inserted = Math.min(1, kf.inserted + dt * (reduced ? 10 : 1.8));
      const t = kf.inserted;
      const picked = this.pickHover?.kind === "keyframe" && this.pickHover.id === kf.id;
      kf.group.scale.setScalar(Math.max(0.001, easeOutBack(t)) * (picked ? 1.35 : 1));
      if (picked) kf.material.color.copy(this.colors.highlight);
      else kf.material.color.copy(this.colors.camera).lerp(this.colors.keyframe, clamp(t * 1.6 - 0.4));
      kf.material.opacity = 0.95 * nearFade(kf.group);
      kf.group.visible = t > 0 && kf.material.opacity > 0.01;
    };
    insert(this.originKf, this.train > 0.9);
    this.originKf.material.opacity *= heroHide;
    this.originKf.group.visible &&= this.originKf.material.opacity > 0.01;
    this.kfs.forEach((kf) => insert(kf, this.head >= kf.u - 0.008));
    const gizmoFade = nearFade(this.gizmo) * heroHide;
    (this.gizmo.material as THREE.LineBasicMaterial).opacity = 0.9 * gizmoFade;
    this.gizmo.visible = this.train > 0.9 && gizmoFade > 0.01;

    // Scenes: triangulate as the camera approaches, turn red while tracked.
    let active: string | null = null;
    let nearest = Infinity;
    for (const sc of this.scenes) {
      if (this.head >= sc.u - 0.035) sc.reveal = Math.min(1, sc.reveal + dt * (reduced ? 10 : 0.5));
      const d = Math.abs(this.u - sc.u);
      if (d < 0.03 && d < nearest) {
        nearest = d;
        active = sc.id;
      }
    }
    for (const sc of this.scenes) {
      const want = sc.id === active && !lost ? 1 : 0;
      sc.tracked += (want - sc.tracked) * approach(5);
      const lit = this.pickHover?.kind === "keyframe" && this.pickHover.id === sc.id ? 1 : 0;
      sc.highlight += (lit - sc.highlight) * approach(8);
      const m = sc.material.uniforms;
      m.uHighlight.value = sc.highlight;
      m.uReveal.value = sc.reveal;
      m.uTracked.value = sc.tracked;
      m.uTime.value = this.time;
      m.uNoise.value = this.noise;
      m.uPixelRatio.value = this.pixelRatio;
    }

    if (this.corridor) {
      const m = this.corridor.material.uniforms;
      m.uHead.value = this.head + 0.012;
      m.uDrift.value = this.drift;
      m.uTime.value = this.time;
      m.uNoise.value = this.noise * 0.5;
      m.uPixelRatio.value = this.pixelRatio;
    }

    const near = (key: string, width: number) => {
      const index = this.shotIndex.get(key);
      return index === undefined ? 0 : clamp(1 - Math.abs(this.s - index) / width);
    };
    const overview = near("landmarks", 0.6);

    // Calibration board: shown around its own section and in the wide shots, hidden
    // where the passing follow camera would put it right behind the text.
    if (this.head >= W.CALIBRATION_U - 0.03 || this.u >= W.CALIBRATION_U - 0.03) {
      this.boardReveal = Math.min(1, this.boardReveal + dt * (reduced ? 10 : 0.45));
    }
    this.board.setReveal(this.boardReveal, Math.max(near("calibration", 0.9), overview, near("loop", 0.9)));

    // Landmarks and the overview.
    for (const lm of this.landmarks) {
      if (this.head >= lm.u - 0.02 || overview > 0.25) lm.reveal = Math.min(1, lm.reveal + dt * (reduced ? 10 : 0.6));
      const lit = this.hovered === lm.id || (this.pickHover?.kind === "landmark" && this.pickHover.id === lm.id);
      lm.highlight += ((lit ? 1 : 0) - lm.highlight) * approach(8);
      const m = lm.material.uniforms;
      m.uReveal.value = lm.reveal;
      m.uHighlight.value = lm.highlight;
      m.uTime.value = this.time;
      m.uNoise.value = this.noise * 0.6;
      m.uPixelRatio.value = this.pixelRatio;
      if (!reduced) lm.group.rotation.y += dt * 0.06;
    }
    this.updateLabels(overview);

    // The cursor as a feature detector, plus picking for click-to-relocalize.
    this.cursor.fade += ((this.cursor.on && !this.orbit.dragging ? 1 : 0) - this.cursor.fade) * approach(10);
    for (const m of [
      ...this.scenes.map((x) => x.material),
      ...this.landmarks.map((x) => x.material),
      ...(this.corridor ? [this.corridor.material] : []),
    ]) {
      m.uniforms.uCursor.value.set(this.cursor.x, this.cursor.y);
      m.uniforms.uCursorOn.value = this.cursor.fade;
      m.uniforms.uAspect.value = this.size.w / this.size.h;
    }
    if (this.cursor.on && !this.orbit.dragging) this.pickHover = this.pick(heroHide);
    this.updateReticle(dt);

    // Trajectory and the SLAM camera.
    this.trajectoryMaterial.opacity = 0.9 * heroHide;
    this.trajectory.visible = heroHide > 0.01;
    const camPos = v3(W.estimatedPoint(this.u, this.drift));
    const look = v3(W.followPose(this.u, this.drift).target);
    this.currentCam.position.copy(camPos);
    this.currentCam.lookAt(look);
    const camFade = nearFade(this.currentCam) * heroHide;
    this.currentCam.visible = this.train >= 1 && camFade > 0.01;
    this.currentCamMaterial.opacity = (lost ? 0.35 + 0.35 * Math.sin(this.time * 30) : 1) * camFade;

    this.updateMatches(active, camPos, lost);
    this.updateCovisibility(dt);
    this.updateLoopEdge();

    this.weather.update(dt, this.time, this.camera.position, !reduced);

    this.telemetryAt -= dt;
    if (this.telemetryAt <= 0) {
      this.telemetryAt = 0.12;
      this.emitTelemetry(active, camPos, look, lost);
    }
  }

  /** LOST when scrolling too fast (motion blur) or when the weather wins. */
  private updateTracking(dt: number): boolean {
    if (this.opts.reducedMotion || this.train < 1) return false;
    this.fastScroll = this.scrollSpeed > 2.4 && this.time > this.navigatingUntil ? this.fastScroll + dt : 0;
    if (this.fastScroll > 0.2) this.lostUntil = this.time + 0.45;
    if (this.weather.severity > 0.5 && this.time > this.nextWeatherLoss) {
      this.lostUntil = this.time + 0.8 + Math.random() * 0.7;
      this.nextWeatherLoss = this.time + 7 + Math.random() * 7;
    }
    const lost = this.time < this.lostUntil;
    if (this.wasLost && !lost) this.relocalizedUntil = this.time + 1.3;
    this.wasLost = lost;
    return lost;
  }

  private applyDrift() {
    for (const a of this.anchored) {
      a.obj.position.copy(a.base).add(v3(W.driftOffset(a.u, this.drift)));
    }
    this.trajectory.geometry.setPositions(this.trajectoryPositions());
  }

  private updateMatches(active: string | null, camPos: THREE.Vector3, lost: boolean) {
    const sc = this.scenes.find((x) => x.id === active);
    const mat = this.matches.material;
    const target = sc && !lost ? 0.26 * sc.tracked * sc.reveal : 0;
    mat.opacity += (target - mat.opacity) * 0.15;
    this.matches.visible = mat.opacity > 0.01;
    if (!sc || !this.matches.visible) return;
    const attr = this.matches.geometry.getAttribute("position") as THREE.BufferAttribute;
    sc.features.forEach((f, i) => {
      const w = this.tmp.copy(f).applyMatrix4(sc.group.matrixWorld);
      attr.setXYZ(i * 2, camPos.x, camPos.y, camPos.z);
      attr.setXYZ(i * 2 + 1, w.x, w.y, w.z);
    });
    this.matches.geometry.setDrawRange(0, sc.features.length * 2);
    attr.needsUpdate = true;
  }

  private updateCovisibility(dt: number) {
    const pos = this.covis.geometry.getAttribute("position") as THREE.BufferAttribute;
    const col = this.covis.geometry.getAttribute("color") as THREE.BufferAttribute;
    if (this.covisAlpha.length !== this.covisEdges.length) this.covisAlpha = new Float32Array(this.covisEdges.length);
    const base = this.colors.keyframe;
    const hot = this.colors.highlight;
    this.covisEdges.forEach((e, i) => {
      const A = this.kfs[e.a].group.position;
      const B = this.kfs[e.b].group.position;
      pos.setXYZ(i * 2, A.x, A.y, A.z);
      pos.setXYZ(i * 2 + 1, B.x, B.y, B.z);
      const seen = Math.min(this.kfs[e.a].inserted, this.kfs[e.b].inserted);
      const lit = this.skill !== null && e.shared.includes(this.skill);
      const want = seen * (this.skill === null ? this.palette.covisAlpha * (0.7 + 0.15 * e.shared.length) : lit ? 0.95 : 0.04);
      this.covisAlpha[i] += (want - this.covisAlpha[i]) * (1 - Math.exp(-dt * 8));
      const c = lit ? hot : base;
      col.setXYZW(i * 2, c.r, c.g, c.b, this.covisAlpha[i]);
      col.setXYZW(i * 2 + 1, c.r, c.g, c.b, this.covisAlpha[i]);
    });
    pos.needsUpdate = true;
    col.needsUpdate = true;
  }

  private updateLoopEdge() {
    const mat = this.loopEdge.material;
    if (this.closure < 0) {
      mat.opacity = 0;
      return;
    }
    const last = this.kfs[this.kfs.length - 1]?.group.position ?? this.originKf.group.position;
    const o = this.originKf.group.position;
    const attr = this.loopEdge.geometry.getAttribute("position") as THREE.BufferAttribute;
    attr.setXYZ(0, last.x, last.y, last.z);
    attr.setXYZ(1, o.x, o.y, o.z);
    attr.needsUpdate = true;
    const flash = Math.exp(-this.closure * 1.2);
    mat.opacity = 0.55 + 0.45 * flash * (0.5 + 0.5 * Math.sin(this.closure * 18));
  }

  private updateLabels(overview: number) {
    if (!this.labels.size) return;
    if (overview < 0.01) {
      if (this.labelsShown) {
        this.labels.forEach((el) => (el.style.opacity = "0"));
        this.labelsShown = false;
      }
      return;
    }
    this.labelsShown = true;
    const { w, h } = this.size;
    // Project every label, then lift the ones that would collide (nearest first keeps the short leader).
    const items = this.landmarks
      .map((lm) => {
        const el = this.labels.get(lm.id);
        const v = this.tmp.copy(lm.group.position).add(this.tmp2.set(0, 4.2, 0)).project(this.camera);
        return { lm, el, x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, z: v.z };
      })
      .filter((it): it is typeof it & { el: HTMLElement } => !!it.el)
      .sort((a, b) => a.z - b.z);
    const placed: Array<{ l: number; r: number; t: number; b: number }> = [];
    for (const it of items) {
      const lw = it.el.offsetWidth || 120;
      const lh = 22;
      let lift = 0;
      const box = () => ({ l: it.x - lw / 2 - 4, r: it.x + lw / 2 + 4, t: it.y - 40 - lift - lh, b: it.y - 40 - lift });
      while (lift < 160 && placed.some((p) => { const q = box(); return q.l < p.r && q.r > p.l && q.t < p.b && q.b > p.t; })) lift += lh + 6;
      placed.push(box());
      const visible = it.z < 1 && it.lm.reveal > 0.2;
      it.el.style.opacity = visible ? String(overview * Math.min(1, it.lm.reveal)) : "0";
      it.el.style.transform = `translate3d(${it.x.toFixed(1)}px, ${it.y.toFixed(1)}px, 0)`;
      it.el.style.setProperty("--lift", `${lift}px`);
    }
  }

  /** Nearest pickable thing under the cursor, scored by distance over its on-screen radius. */
  private pick(heroHide: number): PickTarget | null {
    const { w, h } = this.size;
    const pxPerUnit = h / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2));
    let best: PickTarget | null = null;
    let bestScore = 1;
    const consider = (pos: THREE.Vector3, radius: number, t: Omit<PickTarget, "x" | "y">) => {
      const v = this.tmp2.copy(pos).project(this.camera);
      if (v.z < -1 || v.z > 1) return;
      const x = ((v.x + 1) / 2) * w;
      const y = ((1 - v.y) / 2) * h;
      const dist = this.camera.position.distanceTo(pos);
      const r = clamp((radius * pxPerUnit) / dist, 28, 170);
      const score = Math.hypot(x - this.cursor.px, y - this.cursor.py) / r;
      if (score < bestScore) {
        bestScore = score;
        best = { ...t, x, y };
      }
    };
    this.kfs.forEach((kf, i) => {
      const target = { kind: "keyframe" as const, id: kf.id, label: `KF ${String(i + 1).padStart(2, "0")} · ${keyframes[i].org}`, hint: "click to relocalize" };
      if (kf.inserted > 0.5) consider(kf.group.position, 0.9, target);
      // A word can be visible (triangulating ahead of the camera) before its keyframe is inserted.
      const sc = this.scenes.find((x) => x.id === kf.id);
      if (sc && sc.reveal > 0.3) consider(sc.group.position, 3.4, target);
    });
    this.landmarks.forEach((lm) => {
      if (lm.reveal < 0.3) return;
      const name = projects.find((p) => p.id === lm.id)?.name ?? lm.id;
      // Sculptures are ~6 units tall once scaled: aim at their middle with a generous radius.
      const middle = this.tmp.copy(lm.group.position).addScaledVector(UP, 2.8);
      consider(middle, 3.6, { kind: "landmark", id: lm.id, label: name, hint: "click to see project" });
    });
    if (this.boardReveal > 0.5 && this.board.group.visible) {
      consider(this.board.group.position, 1.9, { kind: "calibration", id: "calibration", label: "Calibration target", hint: "click for about" });
    }
    if (heroHide > 0.99) {
      consider(this.portraitGroup.position, 3.3, { kind: "origin", id: "top", label: "KF 00 · origin", hint: "click to return" });
    }
    return best;
  }

  private updateReticle(dt: number) {
    const r = this.reticle;
    if (!r) return;
    if (!this.cursor.on) {
      if (r.root.dataset.state !== "off") r.root.dataset.state = "off";
      return;
    }
    const t = this.orbit.dragging ? null : this.pickHover;
    const tx = t ? t.x : this.cursor.px;
    const ty = t ? t.y : this.cursor.py;
    const pos = this.reticlePos;
    if (!pos.placed) {
      pos.x = tx;
      pos.y = ty;
      pos.placed = true;
    }
    // Locking on eases in like a magnet; free movement tracks the mouse almost 1:1.
    const k = 1 - Math.exp(-dt * (t ? 16 : 70));
    pos.x += (tx - pos.x) * k;
    pos.y += (ty - pos.y) * k;
    r.root.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`;
    const state = this.orbit.dragging ? "drag" : t ? "lock" : "free";
    if (r.root.dataset.state !== state) r.root.dataset.state = state;
    if (t && r.label.textContent !== t.label) {
      r.label.textContent = t.label;
      r.sub.textContent = t.hint;
    }
  }

  private emitTelemetry(active: string | null, camPos: THREE.Vector3, look: THREE.Vector3, lost: boolean) {
    const t = this.train;
    const done = t >= 1;
    let state: TrackingState = "TRACKING";
    if (!done) state = "INITIALIZING";
    else if (lost) state = "LOST";
    else if (this.time < this.relocalizedUntil) state = "RELOCALIZED";
    else if (this.closure >= 0 && this.u > 0.95) state = "LOOP CLOSED";

    const weatherFactor = 1 - 0.55 * this.weather.severity;
    const light = this.lighting === "night" ? 0.8 : 1;
    const base = 1050 + 170 * Math.sin(this.time * 0.9) + 40 * Math.sin(this.time * 7.3);
    const features = lost ? Math.round(12 + Math.random() * 30) : Math.round(base * weatherFactor * light * (active ? 1 : 0.72));

    const mapPoints =
      this.scenes.reduce((n, s) => n + s.count * s.reveal, 0) +
      this.landmarks.reduce((n, l) => n + l.count * l.reveal, 0) +
      (this.corridor ? this.corridor.count * Math.min(1, this.head) : 0) +
      this.board.cornerCount * this.boardReveal;

    const births = this.portrait?.births;
    let gaussians = 0;
    if (births) {
      let lo = 0;
      let hi = births.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (births[mid] <= t) lo = mid + 1;
        else hi = mid;
      }
      gaussians = lo;
    }

    const dir = this.tmp.copy(look).sub(camPos);
    const drift = W.length(W.driftOffset(this.u, this.drift));
    const inserted = this.kfs.filter((k) => k.inserted > 0.5).length + (this.originKf.inserted > 0.5 ? 1 : 0);
    this.opts.onTelemetry({
      state,
      fps: this.fps,
      keyframes: inserted,
      totalKeyframes: this.kfs.length + 1,
      mapPoints: Math.round(mapPoints),
      features,
      pose: [camPos.x, camPos.y, camPos.z, (Math.atan2(dir.x, dir.z) * 180) / Math.PI],
      drift,
      u: this.u,
      active,
      train: {
        iter: Math.round(30000 * (1 - Math.pow(1 - t, 1.6))),
        psnr: 12.4 + 19.3 * (1 - Math.exp(-3.4 * t)),
        gaussians,
        done,
      },
    });
  }
}
