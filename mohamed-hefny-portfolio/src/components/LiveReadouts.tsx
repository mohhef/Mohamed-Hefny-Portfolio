"use client";

import { useEffect, useRef } from "react";
import { fmt, subscribeTelemetry } from "./telemetry";

/** Hero line narrating the Gaussian-splat fit of the portrait. */
export function TrainingReadout() {
  const root = useRef<HTMLParagraphElement>(null);

  useEffect(
    () =>
      subscribeTelemetry((t) => {
        const el = root.current;
        if (!el) return;
        const set = (k: string, v: string) => {
          const n = el.querySelector<HTMLElement>(`[data-k="${k}"]`);
          if (n && n.textContent !== v) n.textContent = v;
        };
        el.dataset.done = String(t.train.done);
        el.style.setProperty("--p", String(t.train.iter / 30000));
        set("iter", fmt.int(t.train.iter));
        set("psnr", fmt.fixed(t.train.psnr, 1));
        set("gauss", fmt.int(t.train.gaussians));
      }),
    [],
  );

  return (
    <p className="training" ref={root} data-done="false">
      <span className="training-bar" aria-hidden="true" />
      <span className="training-text">
        <span className="training-label">
          <span className="when-training">Fitting 3D Gaussians to one photo</span>
          <span className="when-done">Reconstructed from one photo</span>
        </span>
        <span className="training-stats">
          <span className="when-training">
            iter <b data-k="iter">0</b> / 30,000 ·{" "}
          </span>
          PSNR <b data-k="psnr">–</b> dB · <b data-k="gauss">0</b> Gaussians
        </span>
      </span>
    </p>
  );
}

/** Footer summary of the finished map. */
export function MapStats() {
  const kf = useRef<HTMLElement>(null);
  const pts = useRef<HTMLElement>(null);

  useEffect(
    () =>
      subscribeTelemetry((t) => {
        if (kf.current) kf.current.textContent = String(t.keyframes);
        if (pts.current) pts.current.textContent = fmt.int(t.mapPoints);
      }),
    [],
  );

  return (
    <p className="map-stats">
      Map saved: <b ref={kf}>0</b> keyframes, <b ref={pts}>0</b> points.
    </p>
  );
}
