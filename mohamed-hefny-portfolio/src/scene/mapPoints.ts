import * as THREE from "three";

/**
 * Material for reconstructed map points.
 *
 * Every point is "triangulated" in: it starts at a wrong depth along the ray
 * from the observing keyframe (uOrigin) and converges onto its true position
 * as uReveal goes 0 → 1, the way depth estimates settle as a SLAM system gets
 * more views. A subset of points turns red while the scene is being tracked.
 *
 * With the CORRIDOR define, points are revealed by trajectory progress instead
 * (attribute aU against uHead) and drop in from above.
 *
 * The mouse acts as a feature detector: map points near the cursor (uCursor,
 * in NDC) are drawn as ORB-style keypoint rings.
 */

const vertexShader = /* glsl */ `
  attribute vec2 aSeed;
  attribute float aKind;
  #ifdef CORRIDOR
  attribute float aU;
  uniform float uHead;
  uniform float uDrift;
  #endif

  uniform float uReveal;
  uniform float uTracked;
  uniform float uHighlight;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uNoise;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uStructureAlpha;
  uniform vec3 uOrigin;
  uniform vec3 uFacing;
  uniform float uUseFacing;
  uniform vec3 uColor;
  uniform vec3 uTrackColor;
  uniform vec3 uHighlightColor;
  uniform vec2 uCursor;
  uniform float uCursorOn;
  uniform float uAspect;
  uniform vec3 uDetectColor;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vRing;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    #ifdef CORRIDOR
      // Same odometry drift as world.ts driftOffset(), so the floor stays
      // under the keyframes until the loop closure pulls both back.
      float da = pow(aU, 1.7) * uDrift;
      vec3 target = position + vec3(3.4 * da, 1.5 * pow(aU, 2.2) * uDrift, -2.6 * da);
      float r = smoothstep(aU, aU + 0.02, uHead);
      vec3 start = target + vec3(0.0, 1.6 + 2.0 * aSeed.y, 0.0);
    #else
      vec3 target = position;
      float begin = aSeed.x * 0.72;
      float r = smoothstep(begin, begin + 0.28, uReveal);
      float depthScale = mix(0.3, 2.1, hash(aSeed.y * 91.7));
      vec3 start = uOrigin + (position - uOrigin) * depthScale;
    #endif
    float settle = 1.0 - pow(1.0 - r, 3.0);
    vec3 p = mix(start, target, settle);

    // Sensor noise: tracking jitter grows in bad weather.
    float t = floor(uTime * 12.0);
    p += uNoise * 0.09 * (vec3(hash(aSeed.x * 17.0 + t), hash(aSeed.y * 23.0 + t), hash(aSeed.x * 31.0 - t)) - 0.5);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float tracked = step(aSeed.y, 0.46) * uTracked * aKind;
    float size = uSize * mix(0.8, 1.15, aKind) * (1.0 + 0.5 * tracked + 0.35 * uHighlight * aKind);
    gl_PointSize = clamp(size * uPixelRatio * 30.0 / -mv.z, 1.0, 8.0 * uPixelRatio);

    // Feature detector: only "corner-like" points (a seeded ~40%) fire near the cursor.
    vec2 ndc = gl_Position.xy / gl_Position.w;
    float near = 1.0 - smoothstep(0.07, 0.13, length((ndc - uCursor) * vec2(uAspect, 1.0)));
    float detected = near * uCursorOn * step(0.6, fract(aSeed.x * 7.13 + aSeed.y * 3.71)) * step(0.5, r);
    gl_PointSize = mix(gl_PointSize, max(gl_PointSize * 2.6, 9.0 * uPixelRatio), detected);
    vRing = detected;

    float fog = 1.0 - smoothstep(uFogNear, uFogFar, -mv.z);
    // Words are only legible from the front; from behind they drop to a faint trace.
    vec3 toCamera = normalize(cameraPosition - (modelMatrix * vec4(p, 1.0)).xyz);
    float front = mix(1.0, mix(0.12, 1.0, smoothstep(-0.05, 0.3, dot(toCamera, uFacing))), uUseFacing * aKind);
    vAlpha = r * fog * front * mix(uStructureAlpha, 1.0, aKind);
    vColor = mix(uColor, uTrackColor, tracked);
    vColor = mix(vColor, uHighlightColor, uHighlight * aKind * 0.85);
    vColor = mix(vColor, uDetectColor, detected);
    vAlpha = max(vAlpha, detected * r * fog * 0.95);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vRing;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    // Detected keypoints are hollow rings; everything else is a soft dot.
    if (vRing > 0.5 && d < 0.11) discard;
    float a = vAlpha * uOpacity * (1.0 - smoothstep(0.14, 0.25, d));
    a = mix(a, vAlpha * uOpacity, step(0.5, vRing));
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

export interface MapPointUniforms {
  [uniform: string]: THREE.IUniform;
  uReveal: THREE.IUniform<number>;
  uTracked: THREE.IUniform<number>;
  uHighlight: THREE.IUniform<number>;
  uTime: THREE.IUniform<number>;
  uSize: THREE.IUniform<number>;
  uPixelRatio: THREE.IUniform<number>;
  uNoise: THREE.IUniform<number>;
  uFogNear: THREE.IUniform<number>;
  uFogFar: THREE.IUniform<number>;
  uStructureAlpha: THREE.IUniform<number>;
  uOpacity: THREE.IUniform<number>;
  uHead: THREE.IUniform<number>;
  uDrift: THREE.IUniform<number>;
  uOrigin: THREE.IUniform<THREE.Vector3>;
  uFacing: THREE.IUniform<THREE.Vector3>;
  uUseFacing: THREE.IUniform<number>;
  uColor: THREE.IUniform<THREE.Color>;
  uTrackColor: THREE.IUniform<THREE.Color>;
  uHighlightColor: THREE.IUniform<THREE.Color>;
  uCursor: THREE.IUniform<THREE.Vector2>;
  uCursorOn: THREE.IUniform<number>;
  uAspect: THREE.IUniform<number>;
  uDetectColor: THREE.IUniform<THREE.Color>;
}

export type MapPointMaterial = THREE.ShaderMaterial & { uniforms: MapPointUniforms };

export function createMapPointMaterial(corridor = false): MapPointMaterial {
  const uniforms: MapPointUniforms = {
    uReveal: { value: 0 },
    uTracked: { value: 0 },
    uHighlight: { value: 0 },
    uTime: { value: 0 },
    uSize: { value: 1 },
    uPixelRatio: { value: 1 },
    uNoise: { value: 0 },
    uFogNear: { value: 22 },
    uFogFar: { value: 110 },
    uStructureAlpha: { value: 0.5 },
    uOpacity: { value: 1 },
    uHead: { value: 0 },
    uDrift: { value: 1 },
    uOrigin: { value: new THREE.Vector3() },
    uFacing: { value: new THREE.Vector3(0, 0, 1) },
    uUseFacing: { value: 0 },
    uColor: { value: new THREE.Color("#c9d1db") },
    uTrackColor: { value: new THREE.Color("#ff4b3e") },
    uHighlightColor: { value: new THREE.Color("#ffc53d") },
    uCursor: { value: new THREE.Vector2(9, 9) },
    uCursorOn: { value: 0 },
    uAspect: { value: 1 },
    uDetectColor: { value: new THREE.Color("#ffc53d") },
  };
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    defines: corridor ? { CORRIDOR: "" } : {},
    transparent: true,
    depthWrite: false,
  }) as MapPointMaterial;
}

/** Packs point positions plus the per-point attributes the material expects. */
export function buildPointGeometry(positions: number[], kinds: number[], seed: () => number, us?: number[]) {
  const count = positions.length / 3;
  const geometry = new THREE.BufferGeometry();
  const seeds = new Float32Array(count * 2);
  for (let i = 0; i < count * 2; i++) seeds[i] = seed();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 2));
  geometry.setAttribute("aKind", new THREE.Float32BufferAttribute(kinds, 1));
  if (us) geometry.setAttribute("aU", new THREE.Float32BufferAttribute(us, 1));
  geometry.computeBoundingSphere();
  return geometry;
}
