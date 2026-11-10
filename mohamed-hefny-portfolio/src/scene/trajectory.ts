/**
 * The trajectory.
 *
 * - A camera-facing ribbon: a crisp core inside a soft halo, with perspective
 *   (thicker near, thinner far). The stretch already driven is solid, with a
 *   bead per metre like the poses of an odometry trail; the stretch still ahead
 *   is a thinner dashed line, so the whole route is visible from the start; the
 *   few metres behind the SLAM camera glow in the camera's colour.
 * - A soft strip on the floor underneath, which is what makes the height of
 *   the path readable.
 *
 * Odometry drift is applied in the shader with the same formula as
 * world.ts driftOffset(), so the geometry is built once.
 */
import * as THREE from "three";
import type { Lighting, Palette } from "./palette";
import * as W from "./world";

const SAMPLES = 720;
const FLOOR_HALF_WIDTH = 0.85;

const drift = /* glsl */ `
  uniform float uDrift;
  vec3 driftOffset(float u) {
    float c = clamp(u, 0.0, 1.0);
    float a = pow(c, 1.7) * uDrift;
    return vec3(3.4 * a, 1.5 * pow(c, 2.2) * uDrift, -2.6 * a);
  }
`;

/** Shared by both materials: how much of the route is driven, and the glow behind the camera. */
const progress = /* glsl */ `
  uniform float uHead;
  uniform float uCam;
  uniform vec3 uFog;
  float drivenAt(float u) { return 1.0 - smoothstep(uHead - 0.0012, uHead + 0.0012, u); }
  float tailAt(float u) { return step(u, uCam + 0.0006) * exp(-max(uCam - u, 0.0) * 130.0); }
  float fogAt(float dist) { return 1.0 - uFog.z * smoothstep(uFog.x, uFog.y, dist); }
`;

const ribbonVertex = /* glsl */ `
  attribute vec3 aPrev;
  attribute vec3 aNext;
  attribute float aU;
  attribute float aS;
  attribute float aSide;

  uniform float uDu;
  uniform vec2 uResolution;
  uniform float uWidth;
  uniform vec2 uPx;
  uniform float uSpread;

  varying float vSide;
  varying float vU;
  varying float vS;
  varying float vDist;
  varying float vHalf;
  varying float vNear;

  ${drift}

  void main() {
    vec4 mv = modelViewMatrix * vec4(position + driftOffset(aU), 1.0);
    vec3 a = (modelViewMatrix * vec4(aPrev + driftOffset(aU - uDu), 1.0)).xyz;
    vec3 b = (modelViewMatrix * vec4(aNext + driftOffset(aU + uDu), 1.0)).xyz;

    // Face the viewer: widen across the direction of travel, perpendicular to the line of sight.
    vec3 n = cross(b - a, mv.xyz);
    float len = length(n);
    n = len > 1e-5 ? n / len : vec3(0.0, 1.0, 0.0);

    // A world-space width, kept between a minimum and maximum size on screen.
    float dist = max(-mv.z, 0.05);
    float pxPerUnit = uResolution.y * 0.5 * projectionMatrix[1][1];
    float corePx = clamp(uWidth * pxPerUnit / dist, uPx.x, uPx.y);
    float halfCore = 0.5 * corePx * dist / pxPerUnit;
    mv.xyz += n * aSide * halfCore * uSpread;

    gl_Position = projectionMatrix * mv;
    vSide = aSide * uSpread;
    vU = aU;
    vS = aS;
    vDist = dist;
    vHalf = halfCore;
    // 0 where the ribbon is down to its minimum width (far away), 1 where it has real width.
    vNear = smoothstep(uPx.x, uPx.x * 1.9, uWidth * pxPerUnit / dist);
  }
`;

const ribbonFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uHeadColor;
  uniform float uSpread;
  uniform float uHalo;
  uniform float uAhead;
  uniform float uAdditive;
  uniform float uOpacity;
  uniform float uBeadGap;
  uniform float uFlash;

  varying float vSide;
  varying float vU;
  varying float vS;
  varying float vDist;
  varying float vHalf;
  varying float vNear;

  ${progress}

  void main() {
    float d = abs(vSide);
    float aa = fwidth(vSide);
    float driven = drivenAt(vU);
    float tail = tailAt(vU);

    // Core: full width where driven, a thinner dashed line ahead.
    float edge = mix(0.72, 1.0, driven);
    float core = 1.0 - smoothstep(edge - aa, edge + aa, d);
    float period = 0.62;
    float phase = fract(vS / period);
    float soft = clamp(fwidth(vS) / period, 0.001, 0.5);
    float dash = smoothstep(0.0, soft, phase) * (1.0 - smoothstep(0.56, 0.56 + soft, phase));
    dash = mix(0.72, dash, vNear);

    // Odometry beads on the driven stretch, one per uBeadGap metres.
    float cell = (fract(vS / uBeadGap) - 0.5) * uBeadGap;
    float r = length(vec2(cell / max(vHalf, 1e-4), vSide));
    float bead = (1.0 - smoothstep(2.1 - aa * 1.5, 2.1 + aa * 1.5, r)) * driven * vNear;

    float halo = pow(1.0 - clamp(d / uSpread, 0.0, 1.0), 2.6);
    float aCore = max(core * mix(uAhead * dash, 1.0, driven), bead);
    float aHalo = halo * uHalo * driven * (vNear + 2.2 * tail + 1.6 * uFlash);

    vec3 color = mix(uColor, uHeadColor, tail);
    float lit = aCore + (1.0 - aCore) * aHalo;
    float cover = aCore + (1.0 - aCore) * aHalo * (1.0 - uAdditive);
    float k = fogAt(vDist) * uOpacity;
    if (lit * k < 0.004) discard;
    // Premultiplied: the core covers what is behind it, the halo adds light at night.
    gl_FragColor = vec4(color * lit * k, cover * k);
  }
`;

const floorVertex = /* glsl */ `
  attribute float aU;
  attribute float aSide;
  varying float vSide;
  varying float vU;
  varying float vDist;

  ${drift}

  void main() {
    vec4 mv = modelViewMatrix * vec4(position + driftOffset(aU), 1.0);
    gl_Position = projectionMatrix * mv;
    vSide = aSide;
    vU = aU;
    vDist = -mv.z;
  }
`;

const floorFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uHeadColor;
  uniform float uAlpha;
  uniform float uAhead;
  uniform float uAdditive;
  uniform float uOpacity;
  varying float vSide;
  varying float vU;
  varying float vDist;

  ${progress}

  void main() {
    float band = pow(1.0 - abs(vSide), 1.7);
    float tail = tailAt(vU);
    float a = uAlpha * band * mix(uAhead, 1.0, drivenAt(vU)) * (1.0 + 1.4 * tail) * fogAt(vDist) * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(mix(uColor, uHeadColor, tail * uAdditive) * a, a * (1.0 - uAdditive));
  }
`;

const blended = {
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneMinusSrcAlphaFactor,
} as const;

export class Trajectory {
  readonly group = new THREE.Group();
  private ribbon: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private floor: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;

  constructor() {
    const n = SAMPLES;
    const du = 1 / (n - 1);
    const position = new Float32Array(n * 6);
    const prev = new Float32Array(n * 6);
    const next = new Float32Array(n * 6);
    const floorPosition = new Float32Array(n * 6);
    const aU = new Float32Array(n * 2);
    const aS = new Float32Array(n * 2);
    const aSide = new Float32Array(n * 2);
    const index: number[] = [];

    let s = 0;
    let last = W.loopPoint(0);
    for (let i = 0; i < n; i++) {
      const u = i * du;
      const p = W.loopPoint(u);
      const a = W.loopPoint(u - du);
      const b = W.loopPoint(u + du);
      const inward = W.inward(u);
      s += W.length(W.sub(p, last));
      last = p;
      for (let side = 0; side < 2; side++) {
        const v = i * 2 + side;
        const sign = side === 0 ? -1 : 1;
        position.set(p, v * 3);
        prev.set(a, v * 3);
        next.set(b, v * 3);
        floorPosition.set(
          [p[0] + inward[0] * sign * FLOOR_HALF_WIDTH, W.FLOOR_Y + 0.02, p[2] + inward[2] * sign * FLOOR_HALF_WIDTH],
          v * 3,
        );
        aU[v] = u;
        aS[v] = s;
        aSide[v] = sign;
      }
      if (i < n - 1) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }

    // Each material gets its own uniform objects: the two are coloured differently.
    const shared = () => ({
      uDrift: { value: 1 },
      uHead: { value: 0 },
      uCam: { value: 0 },
      uFog: { value: new THREE.Vector3(24, 105, 0.28) },
      uColor: { value: new THREE.Color() },
      uHeadColor: { value: new THREE.Color() },
      uAhead: { value: 0.85 },
      uAdditive: { value: 0 },
      uOpacity: { value: 1 },
    });

    const rg = new THREE.BufferGeometry();
    rg.setAttribute("position", new THREE.BufferAttribute(position, 3));
    rg.setAttribute("aPrev", new THREE.BufferAttribute(prev, 3));
    rg.setAttribute("aNext", new THREE.BufferAttribute(next, 3));
    rg.setAttribute("aU", new THREE.BufferAttribute(aU, 1));
    rg.setAttribute("aS", new THREE.BufferAttribute(aS, 1));
    rg.setAttribute("aSide", new THREE.BufferAttribute(aSide, 1));
    rg.setIndex(index);
    this.ribbon = new THREE.Mesh(
      rg,
      new THREE.ShaderMaterial({
        uniforms: {
          ...shared(),
          uDu: { value: du },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uWidth: { value: 0.034 },
          uPx: { value: new THREE.Vector2(1.7, 4.6) },
          uSpread: { value: 8 },
          uHalo: { value: 0.2 },
          uBeadGap: { value: 1 },
          uFlash: { value: 0 },
        },
        vertexShader: ribbonVertex,
        fragmentShader: ribbonFragment,
        ...blended,
      }),
    );

    const fg = new THREE.BufferGeometry();
    fg.setAttribute("position", new THREE.BufferAttribute(floorPosition, 3));
    fg.setAttribute("aU", new THREE.BufferAttribute(aU, 1));
    fg.setAttribute("aSide", new THREE.BufferAttribute(aSide, 1));
    fg.setIndex(index);
    this.floor = new THREE.Mesh(
      fg,
      new THREE.ShaderMaterial({
        uniforms: { ...shared(), uAlpha: { value: 0.1 } },
        vertexShader: floorVertex,
        fragmentShader: floorFragment,
        ...blended,
      }),
    );

    for (const mesh of [this.floor, this.ribbon]) {
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    this.floor.renderOrder = -2;
    this.ribbon.renderOrder = -1;
  }

  setPalette(p: Palette, lighting: Lighting) {
    const night = lighting === "night";
    const r = this.ribbon.material.uniforms;
    const f = this.floor.material.uniforms;
    r.uColor.value.set(p.keyframe);
    r.uHeadColor.value.set(p.camera);
    r.uAdditive.value = night ? 1 : 0;
    r.uHalo.value = night ? 0.3 : 0.11;
    // At night the path lights the floor; by day it casts a soft shadow on it.
    f.uColor.value.set(night ? p.keyframe : p.point);
    f.uHeadColor.value.set(p.camera);
    f.uAdditive.value = night ? 1 : 0;
    f.uAlpha.value = night ? 0.085 : 0.075;
  }

  setResolution(width: number, height: number) {
    this.ribbon.material.uniforms.uResolution.value.set(width, height);
  }

  /**
   * `head`: furthest u reached; `cam`: where the SLAM camera is; `flash`: 0..1 pulse on loop
   * closure; `fog`: the distances over which the path fades, and by how much.
   */
  update(state: { drift: number; head: number; cam: number; opacity: number; flash: number; fog: [number, number, number] }) {
    for (const mesh of [this.ribbon, this.floor]) {
      const m = mesh.material.uniforms;
      m.uDrift.value = state.drift;
      m.uHead.value = state.head;
      m.uCam.value = state.cam;
      m.uOpacity.value = state.opacity;
      m.uFog.value.set(...state.fog);
    }
    this.ribbon.material.uniforms.uFlash.value = state.flash;
    this.group.visible = state.opacity > 0.01;
  }
}
