"use client";

import { useEffect, useRef } from "react";
import { keyframes } from "@/content/timeline";
import { projects } from "@/content/projects";
import { keyframeU, landmarkPlacements, loopPoint } from "@/scene/world";
import { subscribeTelemetry } from "./telemetry";

const W = 200;
const H = 200;
const PAD = 14;

/** Top-down view of the map: x → right, z → down (the origin sits at the bottom). */
function projector() {
  const pts = Array.from({ length: 241 }, (_, i) => loopPoint(i / 240));
  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[2]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const k = Math.min((W - PAD * 2) / (maxX - minX), (H - PAD * 2) / (maxZ - minZ));
  const ox = (W - (maxX - minX) * k) / 2;
  const oz = (H - (maxZ - minZ) * k) / 2;
  const to = (x: number, z: number): [number, number] => [ox + (x - minX) * k, oz + (z - minZ) * k];
  const d = pts.map((p, i) => `${i ? "L" : "M"}${to(p[0], p[2]).map((v) => v.toFixed(1)).join(" ")}`).join("") + "Z";
  return { to, d, k };
}

const MAP = projector();

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
}

export function Minimap() {
  const { to, d, k } = MAP;
  const cam = useRef<SVGGElement>(null);
  const mapped = useRef<SVGPathElement>(null);
  const dots = useRef<Array<SVGGElement | null>>([]);

  useEffect(() => {
    let head = 0;
    return subscribeTelemetry((t) => {
      const [x, , z, yaw] = t.pose;
      const [px, py] = to(x, z);
      // Heading: yaw is atan2(dx, dz); in the map, +z points down.
      cam.current?.setAttribute("transform", `translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${(180 - yaw).toFixed(1)})`);
      head = t.train.done ? Math.max(head, t.u) : head;
      mapped.current?.setAttribute("stroke-dashoffset", String(1 - head));
      keyframeU.forEach((u, i) => dots.current[i]?.setAttribute("data-on", String(head >= u - 0.008)));
    });
  }, [to]);

  const origin = to(loopPoint(0)[0], loopPoint(0)[2]);
  const tenMetres = 10 * k;

  return (
    <figure className="minimap" aria-label="Map overview. Select a keyframe to jump to it.">
      <svg viewBox={`0 0 ${W} ${H}`} role="group">
        <path d={d} className="minimap-loop" />
        <path ref={mapped} d={d} className="minimap-mapped" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} />
        {landmarkPlacements.map((l, i) => {
          const [x, y] = to(l.center[0], l.center[2]);
          return <rect key={l.id} x={x - 2} y={y - 2} width={4} height={4} className="minimap-landmark" aria-label={projects[i].name} />;
        })}
        <g className="minimap-origin" transform={`translate(${origin[0]} ${origin[1]})`}>
          <circle r={3.2} />
        </g>
        {keyframes.map((kf, i) => {
          const p = loopPoint(keyframeU[i]);
          const [x, y] = to(p[0], p[2]);
          return (
            <g
              key={kf.id}
              ref={(el) => {
                dots.current[i] = el;
              }}
              className="minimap-kf"
              data-on="false"
              transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
              role="link"
              tabIndex={0}
              aria-label={`${kf.role}, ${kf.org}`}
              onClick={() => scrollToId(`kf-${kf.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  scrollToId(`kf-${kf.id}`);
                }
              }}
            >
              <circle r={7} className="minimap-hit" />
              <circle r={3.4} />
              <title>{`${kf.org}`}</title>
            </g>
          );
        })}
        <g ref={cam} className="minimap-cam" transform={`translate(${origin[0]} ${origin[1]})`}>
          <path d="M0 -7 L4.5 3 L0 1.2 L-4.5 3 Z" />
        </g>
        <g className="minimap-scale" transform={`translate(${PAD} ${H - 8})`}>
          <path d={`M0 -3V0H${tenMetres.toFixed(1)}V-3`} />
          <text x={tenMetres + 5} y={0}>
            10 m
          </text>
        </g>
      </svg>
      <figcaption>top view</figcaption>
    </figure>
  );
}
