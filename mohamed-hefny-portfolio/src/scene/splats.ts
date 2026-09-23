/**
 * The portrait as 3D Gaussian splats.
 *
 * The photo is sampled into anisotropic Gaussians: big soft ones on flat
 * regions, small ones stretched along edges where the image has detail. Depth
 * comes from inflating the subject's silhouette (a distance transform of the
 * matte), so the portrait has real parallax. uTrain animates the fit the way a
 * 3DGS optimiser converges: a noisy initial cloud settles, coarse splats first,
 * fine ones densifying in later.
 */
import * as THREE from "three";
import { rng } from "./rng";

const vertexShader = /* glsl */ `
  attribute vec3 aCenter;
  attribute vec3 aStart;
  attribute vec3 aColor;
  attribute vec4 aShape; // sigma along, sigma across, rotation, opacity
  attribute float aBirth;

  uniform float uTrain;
  uniform float uTime;
  uniform float uOpacity;

  varying vec3 vColor;
  varying vec2 vUv;
  varying float vAlpha;

  void main() {
    float born = smoothstep(aBirth, aBirth + 0.1, uTrain);
    float settle = smoothstep(aBirth, aBirth + 0.38, uTrain);
    float e = 1.0 - pow(1.0 - settle, 3.0);
    vec3 c = mix(aStart, aCenter, e);
    c.z += sin(uTime * 0.7 + aCenter.x * 1.3 + aCenter.y * 0.9) * 0.025 * uTrain;

    vec2 sigma = aShape.xy * mix(1.9, 1.0, e);
    float cr = cos(aShape.z);
    float sr = sin(aShape.z);
    vec2 q = position.xy * 3.0 * sigma;
    vec3 p = c + vec3(cr * q.x - sr * q.y, sr * q.x + cr * q.y, 0.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);

    vUv = position.xy * 3.0;
    float luma = dot(aColor, vec3(0.299, 0.587, 0.114));
    vColor = mix(vec3(luma * 0.85 + 0.08), aColor, smoothstep(0.15, 0.95, settle));
    vAlpha = aShape.w * born * uOpacity;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying vec2 vUv;
  varying float vAlpha;

  void main() {
    float r2 = dot(vUv, vUv);
    if (r2 > 9.0) discard;
    float a = vAlpha * exp(-0.5 * r2);
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

export interface Portrait {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  count: number;
  /** Sorted birth times, to count how many Gaussians exist at a given step. */
  births: Float32Array;
}

async function loadImageData(url: string, size: number): Promise<ImageData> {
  const blob = await (await fetch(url)).blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, size, size);
  bitmap.close();
  return ctx.getImageData(0, 0, size, size);
}

/** Two-pass chamfer distance to the nearest background pixel. */
function distanceTransform(inside: Uint8Array, n: number): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) d[i] = inside[i] ? INF : 0;
  const a = 1;
  const b = Math.SQRT2;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (!d[i]) continue;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + a);
      if (y > 0) v = Math.min(v, d[i - n] + a);
      if (x > 0 && y > 0) v = Math.min(v, d[i - n - 1] + b);
      if (x < n - 1 && y > 0) v = Math.min(v, d[i - n + 1] + b);
      d[i] = v;
    }
  }
  for (let y = n - 1; y >= 0; y--) {
    for (let x = n - 1; x >= 0; x--) {
      const i = y * n + x;
      if (!d[i]) continue;
      let v = d[i];
      if (x < n - 1) v = Math.min(v, d[i + 1] + a);
      if (y < n - 1) v = Math.min(v, d[i + n] + a);
      if (x < n - 1 && y < n - 1) v = Math.min(v, d[i + n + 1] + b);
      if (x > 0 && y < n - 1) v = Math.min(v, d[i + n - 1] + b);
      d[i] = v;
    }
  }
  return d;
}

function buildCdf(weights: Float32Array): Float32Array {
  const cdf = new Float32Array(weights.length);
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    cdf[i] = sum;
  }
  return cdf;
}

function sampleCdf(cdf: Float32Array, u: number): number {
  const target = u * cdf[cdf.length - 1];
  let lo = 0;
  let hi = cdf.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cdf[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export async function buildPortrait(opts: {
  image: string;
  matte: string;
  count: number;
  height: number;
}): Promise<Portrait> {
  const N = 435;
  const [img, matteImg] = await Promise.all([loadImageData(opts.image, N), loadImageData(opts.matte, N)]);
  const r = rng(1729);
  const px = N * N;

  const rgb = new Float32Array(px * 3);
  const matte = new Float32Array(px);
  const lum = new Float32Array(px);
  for (let i = 0; i < px; i++) {
    rgb[i * 3] = img.data[i * 4] / 255;
    rgb[i * 3 + 1] = img.data[i * 4 + 1] / 255;
    rgb[i * 3 + 2] = img.data[i * 4 + 2] / 255;
    lum[i] = 0.299 * rgb[i * 3] + 0.587 * rgb[i * 3 + 1] + 0.114 * rgb[i * 3 + 2];
    matte[i] = matteImg.data[i * 4] / 255;
  }

  // Lightly blurred colour for the large, low-frequency splats.
  const blur = new Float32Array(px * 3);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      for (let c = 0; c < 3; c++) {
        let s = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
            s += rgb[(yy * N + xx) * 3 + c];
            n++;
          }
        }
        blur[(y * N + x) * 3 + c] = s / n;
      }
    }
  }

  // Sobel gradients on luminance.
  const gx = new Float32Array(px);
  const gy = new Float32Array(px);
  const gm = new Float32Array(px);
  for (let y = 1; y < N - 1; y++) {
    for (let x = 1; x < N - 1; x++) {
      const i = y * N + x;
      const L = (dx: number, dy: number) => lum[i + dy * N + dx];
      gx[i] = L(1, -1) + 2 * L(1, 0) + L(1, 1) - L(-1, -1) - 2 * L(-1, 0) - L(-1, 1);
      gy[i] = L(-1, 1) + 2 * L(0, 1) + L(1, 1) - L(-1, -1) - 2 * L(0, -1) - L(1, -1);
      gm[i] = Math.hypot(gx[i], gy[i]);
    }
  }
  const sorted = Float32Array.from(gm).sort();
  const g98 = sorted[Math.floor(px * 0.98)] || 1;

  // Inflate the silhouette for depth.
  const inside = new Uint8Array(px);
  for (let i = 0; i < px; i++) inside[i] = matte[i] > 0.5 ? 1 : 0;
  const dist = distanceTransform(inside, N);
  let maxDist = 1;
  for (let i = 0; i < px; i++) maxDist = Math.max(maxDist, dist[i]);

  const subjectW = new Float32Array(px);
  const wallW = new Float32Array(px);
  for (let i = 0; i < px; i++) {
    const g = Math.min(gm[i] / g98, 1);
    subjectW[i] = Math.pow(matte[i], 1.5) * (0.3 + 1.7 * Math.pow(g, 0.75));
    // The wall only survives as a faint halo that thins out away from the subject.
    const dx = (i % N) / N - 0.5;
    const dy = Math.floor(i / N) / N - 0.48;
    wallW[i] = (1 - matte[i]) * Math.pow(Math.max(0, 1 - Math.hypot(dx, dy) / 0.52), 2.2);
  }
  const subjectCdf = buildCdf(subjectW);
  const wallCdf = buildCdf(wallW);

  const count = opts.count;
  const nSubject = Math.round(count * 0.95);
  const k = opts.height / N;

  const centers = new Float32Array(count * 3);
  const starts = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const shapes = new Float32Array(count * 4);
  const births = new Float32Array(count);

  for (let s = 0; s < count; s++) {
    const subject = s < nSubject;
    const i = sampleCdf(subject ? subjectCdf : wallCdf, r.next());
    const x = (i % N) + r.next();
    const y = Math.floor(i / N) + r.next();
    const g = Math.min(gm[i] / g98, 1);

    let sigma: number;
    let aniso: number;
    let alpha: number;
    let z: number;
    let birth: number;
    let src = rgb;
    if (subject) {
      sigma = (2.5 - 1.8 * Math.pow(g, 0.6)) * r.range(0.85, 1.15);
      aniso = 1 + 1.5 * g;
      alpha = r.range(0.75, 0.98) * Math.min(1, Math.max(0, (matte[i] - 0.3) / 0.5));
      z = 0.95 * Math.sqrt(dist[i] / maxDist) + r.gauss() * 0.015;
      birth = 0.03 + 0.62 * Math.min(1, Math.max(0, (2.5 - sigma) / 1.8)) + r.next() * 0.1;
      if (sigma > 2.1) src = blur;
    } else {
      sigma = r.range(1.2, 2.6);
      aniso = 1;
      alpha = r.range(0.05, 0.14);
      z = -1.7 + r.gauss() * 0.15;
      birth = 0.08 + r.next() * 0.55;
      src = blur;
    }

    centers[s * 3] = (x - N / 2) * k;
    centers[s * 3 + 1] = (N / 2 - y) * k;
    centers[s * 3 + 2] = z;
    starts[s * 3] = centers[s * 3] + r.gauss() * 1.1;
    starts[s * 3 + 1] = centers[s * 3 + 1] + r.gauss() * 1.1;
    starts[s * 3 + 2] = z + r.gauss() * 2.2 - 1.2;
    if (subject) {
      colors[s * 3] = src[i * 3];
      colors[s * 3 + 1] = src[i * 3 + 1];
      colors[s * 3 + 2] = src[i * 3 + 2];
    } else {
      // The surroundings stay a neutral grey halo, whatever the photo's background was.
      const grey = 0.3 + 0.55 * (0.299 * src[i * 3] + 0.587 * src[i * 3 + 1] + 0.114 * src[i * 3 + 2]);
      colors.fill(grey, s * 3, s * 3 + 3);
    }
    shapes[s * 4] = sigma * Math.sqrt(aniso) * k;
    shapes[s * 4 + 1] = (sigma / Math.sqrt(aniso)) * k;
    // Stretch along the edge (perpendicular to the gradient); image y points down.
    shapes[s * 4 + 2] = -(Math.atan2(gy[i], gx[i]) + Math.PI / 2);
    shapes[s * 4 + 3] = alpha;
    births[s] = birth;
  }

  // Back-to-front for the default (front-on) view.
  const order = Array.from({ length: count }, (_, i) => i).sort((a, b) => centers[a * 3 + 2] - centers[b * 3 + 2]);
  const permute = (src: Float32Array, stride: number) => {
    const out = new Float32Array(src.length);
    order.forEach((from, to) => out.set(src.subarray(from * stride, from * stride + stride), to * stride));
    return out;
  };

  const base = new THREE.PlaneGeometry(2, 2);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = base.index;
  geometry.setAttribute("position", base.getAttribute("position"));
  geometry.setAttribute("aCenter", new THREE.InstancedBufferAttribute(permute(centers, 3), 3));
  geometry.setAttribute("aStart", new THREE.InstancedBufferAttribute(permute(starts, 3), 3));
  geometry.setAttribute("aColor", new THREE.InstancedBufferAttribute(permute(colors, 3), 3));
  geometry.setAttribute("aShape", new THREE.InstancedBufferAttribute(permute(shapes, 4), 4));
  geometry.setAttribute("aBirth", new THREE.InstancedBufferAttribute(permute(births, 1), 1));
  geometry.instanceCount = count;

  const material = new THREE.ShaderMaterial({
    uniforms: { uTrain: { value: 0 }, uTime: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;

  return { mesh, material, count, births: births.slice().sort() };
}
