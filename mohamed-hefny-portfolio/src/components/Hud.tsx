"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { Lighting } from "@/scene/palette";
import type { WeatherMode } from "@/scene/weather";
import { fmt, subscribeTelemetry } from "./telemetry";

const NAV: Array<{ id: string; label: string; hint?: string }> = [
  { id: "calibration", label: "Calibration" },
  { id: "trajectory", label: "Trajectory" },
  { id: "landmarks", label: "Landmarks" },
  { id: "publications", label: "Publications" },
  { id: "contact", label: "Loop closure", hint: "Contact" },
];

const WEATHER: Array<{ mode: WeatherMode; label: string; icon: ReactNode }> = [
  {
    mode: "clear",
    label: "Clear",
    icon: <circle cx="8" cy="8" r="3.2" />,
  },
  {
    mode: "rain",
    label: "Rain",
    icon: <path d="M5 3.5 3.5 8M9 3.5 7.5 8M13 3.5 11.5 8M7 9 5.5 13.5M11 9 9.5 13.5" />,
  },
  {
    mode: "snow",
    label: "Snow",
    icon: <path d="M8 2.5v11M3.2 5.2l9.6 5.6M3.2 10.8l9.6-5.6" />,
  },
];

interface HudProps {
  weather: WeatherMode;
  onWeather: (mode: WeatherMode) => void;
  lighting: Lighting;
  onLighting: (lighting: Lighting) => void;
}

export function Hud({ weather, onWeather, lighting, onLighting }: HudProps) {
  const state = useRef<HTMLSpanElement>(null);
  const stateText = useRef<HTMLSpanElement>(null);
  const status = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      subscribeTelemetry((t) => {
        if (state.current && state.current.dataset.state !== t.state) {
          state.current.dataset.state = t.state;
          if (stateText.current) stateText.current.textContent = t.state;
        }
        const el = status.current;
        if (!el) return;
        const set = (key: string, value: string) => {
          const node = el.querySelector<HTMLElement>(`[data-k="${key}"]`);
          if (node && node.textContent !== value) node.textContent = value;
        };
        set("kf", `${t.keyframes}/${t.totalKeyframes}`);
        set("pts", fmt.int(t.mapPoints));
        set("feat", fmt.int(t.features));
        set("x", fmt.fixed(t.pose[0]));
        set("y", fmt.fixed(t.pose[1]));
        set("z", fmt.fixed(t.pose[2]));
        set("yaw", `${fmt.fixed(((t.pose[3] % 360) + 360) % 360, 1)}°`);
        set("drift", fmt.fixed(t.drift));
        set("fps", fmt.int(t.fps));
      }),
    [],
  );

  return (
    <>
      <header className="hud-top">
        <a className="brand" href="#top" aria-label="Mohamed Hefny, back to the start">
          <span className="brand-mark" aria-hidden="true">
            MH
          </span>
        </a>
        <nav className="hud-nav" aria-label="Sections">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} data-for={n.id}>
              {n.label}
              {n.hint && <span className="nav-hint"> · {n.hint}</span>}
            </a>
          ))}
        </nav>
        <div className="hud-right">
          <a className="cv-link" href="/cv" title="Plain-text CV">
            CV
          </a>
          <span className="state" ref={state} data-state="INITIALIZING" role="status" aria-live="off">
            <i aria-hidden="true" />
            <span ref={stateText}>INITIALIZING</span>
          </span>
          <div className="conditions" role="group" aria-label="Conditions">
            {WEATHER.map((w) => (
              <button
                key={w.mode}
                type="button"
                aria-pressed={weather === w.mode}
                onClick={() => onWeather(w.mode)}
                title={w.mode === "clear" ? "Clear conditions" : `${w.label}: watch tracking degrade`}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  {w.icon}
                </svg>
                <span>{w.label}</span>
              </button>
            ))}
            <span className="conditions-sep" aria-hidden="true" />
            <button
              type="button"
              className="lighting"
              aria-pressed={lighting === "night"}
              onClick={() => onLighting(lighting === "night" ? "day" : "night")}
              title={lighting === "night" ? "Switch to day" : "Switch to night"}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                {lighting === "night" ? (
                  <path d="M11.8 10.4A5 5 0 0 1 5.6 4.2a5 5 0 1 0 6.2 6.2Z" />
                ) : (
                  <>
                    <circle cx="8" cy="8" r="2.8" />
                    <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.3 1.3M11.3 11.3l1.3 1.3M3.4 12.6l1.3-1.3M11.3 4.7l1.3-1.3" />
                  </>
                )}
              </svg>
              <span>{lighting === "night" ? "Night" : "Day"}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="hud-status" ref={status} aria-hidden="true">
        <span className="hud-status-map">
          <span>
            <b>KF</b> <em data-k="kf">0/0</em>
          </span>
          <span>
            <b>MAP</b> <em data-k="pts">0</em> pts
          </span>
          <span className="wide">
            <b>FEAT</b> <em data-k="feat">0</em>
          </span>
          <span className="wide">
            <b>POSE</b> x <em data-k="x">0.00</em> y <em data-k="y">0.00</em> z <em data-k="z">0.00</em> yaw{" "}
            <em data-k="yaw">0.0°</em>
          </span>
          <span className="wide">
            <b>DRIFT</b> <em data-k="drift">0.00</em> m
          </span>
        </span>
        <span className="hud-status-hint">← → keyframes · drag to look · click to relocalize</span>
        <span className="hud-status-fps">
          <em data-k="fps">60</em> fps
        </span>
      </div>
    </>
  );
}
