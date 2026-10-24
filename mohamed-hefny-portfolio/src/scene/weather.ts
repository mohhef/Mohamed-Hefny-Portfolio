/**
 * Rain streaks and snow flakes in a box that wraps around the camera, so the
 * precipitation is fixed in world space but never runs out.
 */
import * as THREE from "three";
import { rng } from "./rng";

export type WeatherMode = "clear" | "rain" | "snow";

const rainVertex = /* glsl */ `
  attribute float aEnd;
  attribute float aSpeed;
  uniform float uTime;
  uniform vec3 uCenter;
  uniform vec3 uBox;
  uniform float uLen;
  uniform float uOpacity;
  varying float vAlpha;

  void main() {
    vec3 base = position * uBox;
    base.y -= uTime * aSpeed;
    vec3 rel = mod(base - uCenter + 0.5 * uBox, uBox) - 0.5 * uBox;
    vec3 p = uCenter + rel + vec3(0.12, 1.0, 0.0) * uLen * aEnd;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vAlpha = uOpacity * (1.0 - smoothstep(8.0, 32.0, -mv.z)) * mix(0.9, 0.0, aEnd);
  }
`;

const snowVertex = /* glsl */ `
  attribute float aSpeed;
  attribute float aPhase;
  uniform float uTime;
  uniform vec3 uCenter;
  uniform vec3 uBox;
  uniform float uOpacity;
  uniform float uPixelRatio;
  varying float vAlpha;

  void main() {
    vec3 base = position * uBox;
    base.y -= uTime * aSpeed;
    base.x += sin(uTime * 0.7 + aPhase * 6.2831) * 0.9;
    base.z += cos(uTime * 0.5 + aPhase * 4.0) * 0.6;
    vec3 rel = mod(base - uCenter + 0.5 * uBox, uBox) - 0.5 * uBox;
    vec4 mv = modelViewMatrix * vec4(uCenter + rel, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp((2.0 + aPhase * 3.0) * uPixelRatio * 26.0 / -mv.z, 1.5, 14.0 * uPixelRatio);
    vAlpha = uOpacity * (1.0 - smoothstep(6.0, 30.0, -mv.z));
  }
`;

const lineFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() { gl_FragColor = vec4(uColor, vAlpha); }
`;

const flakeFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    gl_FragColor = vec4(uColor, vAlpha * (1.0 - smoothstep(0.02, 0.25, d)));
  }
`;

export class Weather {
  readonly group = new THREE.Group();
  private rain: THREE.LineSegments<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private snow: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private rainLevel = 0;
  private snowLevel = 0;
  private alpha = 0.4;
  mode: WeatherMode = "clear";

  constructor(density = 1) {
    const r = rng(99);
    const box = new THREE.Vector3(34, 22, 34);

    const drops = Math.round(2600 * density);
    const pos = new Float32Array(drops * 6);
    const end = new Float32Array(drops * 2);
    const speed = new Float32Array(drops * 2);
    for (let i = 0; i < drops; i++) {
      const x = r.next() - 0.5;
      const y = r.next() - 0.5;
      const z = r.next() - 0.5;
      const v = r.range(15, 22);
      pos.set([x, y, z, x, y, z], i * 6);
      end.set([0, 1], i * 2);
      speed.set([v, v], i * 2);
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    rg.setAttribute("aEnd", new THREE.BufferAttribute(end, 1));
    rg.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    this.rain = new THREE.LineSegments(
      rg,
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uCenter: { value: new THREE.Vector3() },
          uBox: { value: box },
          uLen: { value: 0.55 },
          uOpacity: { value: 0 },
          uColor: { value: new THREE.Color() },
        },
        vertexShader: rainVertex,
        fragmentShader: lineFragment,
        transparent: true,
        depthWrite: false,
      }),
    );

    const flakes = Math.round(3600 * density);
    const fpos = new Float32Array(flakes * 3);
    const fspeed = new Float32Array(flakes);
    const phase = new Float32Array(flakes);
    for (let i = 0; i < flakes; i++) {
      fpos.set([r.next() - 0.5, r.next() - 0.5, r.next() - 0.5], i * 3);
      fspeed[i] = r.range(0.8, 1.8);
      phase[i] = r.next();
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(fpos, 3));
    sg.setAttribute("aSpeed", new THREE.BufferAttribute(fspeed, 1));
    sg.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    this.snow = new THREE.Points(
      sg,
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uCenter: { value: new THREE.Vector3() },
          uBox: { value: box },
          uOpacity: { value: 0 },
          uPixelRatio: { value: 1 },
          uColor: { value: new THREE.Color() },
        },
        vertexShader: snowVertex,
        fragmentShader: flakeFragment,
        transparent: true,
        depthWrite: false,
      }),
    );

    for (const obj of [this.rain, this.snow]) {
      obj.frustumCulled = false;
      obj.renderOrder = 5;
      obj.visible = false;
      this.group.add(obj);
    }
  }

  setColor(hex: string, alpha: number) {
    this.rain.material.uniforms.uColor.value.set(hex);
    this.snow.material.uniforms.uColor.value.set(hex);
    this.alpha = alpha;
  }

  setPixelRatio(pr: number) {
    this.snow.material.uniforms.uPixelRatio.value = pr;
  }

  /** How strongly the current weather degrades tracking, 0..1. */
  get severity() {
    return Math.max(this.rainLevel, this.snowLevel * 0.65);
  }

  update(dt: number, time: number, center: THREE.Vector3, animate: boolean) {
    const k = 1 - Math.exp(-dt * 2.5);
    this.rainLevel += ((this.mode === "rain" ? 1 : 0) - this.rainLevel) * k;
    this.snowLevel += ((this.mode === "snow" ? 1 : 0) - this.snowLevel) * k;
    const t = animate ? time : 0;
    for (const [obj, level, a] of [
      [this.rain, this.rainLevel, this.alpha],
      [this.snow, this.snowLevel, Math.min(1, this.alpha * 1.9)],
    ] as const) {
      obj.visible = level > 0.01;
      obj.material.uniforms.uOpacity.value = level * a;
      obj.material.uniforms.uTime.value = t;
      obj.material.uniforms.uCenter.value.copy(center);
    }
  }
}
