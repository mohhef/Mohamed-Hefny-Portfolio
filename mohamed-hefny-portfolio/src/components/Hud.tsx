"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { PLACE } from "@/content/place";
import type { WeatherMode } from "@/scene/weather";
import { capOf, getCap, getServerCap, setCap, subscribeCap } from "./compute";
import { chooseLighting, chooseWeather, getConditions, getServerConditions, goLive, subscribeConditions } from "./conditions";
import { isSoundOn, setSound, subscribeSound } from "./sound";
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
    icon: <circle cx="8" cy="8" r="3.2" className="solid" />,
  },
  {
    mode: "rain",
    label: "Rain",
    icon: <path d="M5 3.5 3.5 8M9 3.5 7.5 8M13 3.5 11.5 8M7 9 5.5 13.5M11 9 9.5 13.5" />,
  },
  {
    mode: "fog",
    label: "Fog",
    icon: <path d="M2.5 4.8h11M4.5 8h9M2.5 11.2h8" />,
  },
  {
    mode: "snow",
    label: "Snow",
    icon: <path d="M8 2.5v11M3.2 5.2l9.6 5.6M3.2 10.8l9.6-5.6" />,
  },
];

const liveIcon = (
  <>
    <circle cx="8" cy="8" r="1.7" className="solid" />
    <path d="M4.7 11.3a4.7 4.7 0 0 1 0-6.6M11.3 4.7a4.7 4.7 0 0 1 0 6.6" />
  </>
);

interface HudProps {
  /** null where the device has no orientation sensor to offer. */
  tilt: boolean | null;
  onTilt: (on: boolean) => void;
}

export function Hud({ tilt, onTilt }: HudProps) {
  const state = useRef<HTMLSpanElement>(null);
  const stateText = useRef<HTMLSpanElement>(null);
  const status = useRef<HTMLDivElement>(null);
  const conditions = useSyncExternalStore(subscribeConditions, getConditions, getServerConditions);
  const sound = useSyncExternalStore(subscribeSound, isSoundOn, () => false);
  const cap = useSyncExternalStore(subscribeCap, getCap, getServerCap);

  const { weather, lighting, report } = conditions;
  const live = conditions.weatherLive && conditions.lightingLive;
  const current = WEATHER.find((w) => w.mode === weather) ?? WEATHER[0];
  // On small screens one button steps through live and the hand-picked conditions.
  const cycle = () => {
    const next = live ? 0 : WEATHER.indexOf(current) + 1;
    if (next < WEATHER.length) chooseWeather(WEATHER[next].mode);
    else goLive();
  };

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
            <button
              type="button"
              className="seg live"
              aria-pressed={live}
              onClick={goLive}
              title={`Live: the weather and daylight at ${PLACE.name} right now`}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                {liveIcon}
              </svg>
              <span>Live</span>
            </button>
            {WEATHER.map((w) => (
              <button
                key={w.mode}
                type="button"
                className="seg"
                aria-pressed={!conditions.weatherLive && weather === w.mode}
                data-now={conditions.weatherLive && weather === w.mode}
                onClick={() => chooseWeather(w.mode)}
                title={w.mode === "clear" ? "Clear conditions" : `${w.label}: watch tracking degrade`}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  {w.icon}
                </svg>
                <span>{w.label}</span>
              </button>
            ))}
            <button
              type="button"
              className="cycle"
              data-live={live}
              onClick={cycle}
              aria-label={`Conditions: ${live ? `live from ${PLACE.name}, ` : ""}${current.label.toLowerCase()}. Change`}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                {current.icon}
              </svg>
            </button>
            <span className="conditions-sep" aria-hidden="true" />
            <button
              type="button"
              className="lighting"
              aria-pressed={lighting === "night"}
              onClick={() => chooseLighting(lighting === "night" ? "day" : "night")}
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

      {/* What the controls above are currently doing, when it isn't obvious from the map. */}
      <div className="hud-notes">
        {conditions.weatherLive && (
          <p className="hud-note">
            <i aria-hidden="true" />
            <span>Live</span>
            <span>{PLACE.name}</span>
            {report && <span>{Math.round(report.tempC)}°C</span>}
            {report && (
              <span>
                {report.label}
                {report.rate >= 0.1 ? ` ${report.rate.toFixed(1)} mm/h` : ""}
              </span>
            )}
          </p>
        )}
        {cap !== "uncapped" && (
          <p className="hud-note hud-note--squeeze">
            <span>Processor cap</span>
            <span>{capOf(cap).label}</span>
            <button type="button" onClick={() => setCap("uncapped")}>
              Lift
            </button>
          </p>
        )}
      </div>

      <div className="hud-status" ref={status}>
        <span className="hud-status-map" aria-hidden="true">
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
        <span className="hud-status-hint" aria-hidden="true">
          ← → step · drag to look · click to relocalize
        </span>
        <span className="hud-toggles">
          {tilt !== null && (
            <button type="button" aria-pressed={tilt} onClick={() => onTilt(!tilt)} title="Tilt your phone to look around the map">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <rect x="5.2" y="2.6" width="5.6" height="10.8" rx="1.2" transform="rotate(-16 8 8)" />
                <path d="M1.8 11.6c.8 1.5 2.1 2.4 3.7 2.6M14.2 4.4c-.8-1.5-2.1-2.4-3.7-2.6" />
              </svg>
              Tilt
            </button>
          )}
          <button type="button" aria-pressed={sound} onClick={() => setSound(!sound)} title={sound ? "Turn sound off" : "Turn sound on"}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2.4 6.3v3.4h2.5l3.3 2.8v-9L4.9 6.3Z" />
              {sound ? <path d="M10.5 5.7a3.3 3.3 0 0 1 0 4.6M12.3 4a5.7 5.7 0 0 1 0 8" /> : <path d="M10.7 6.2l3 3.6M13.7 6.2l-3 3.6" />}
            </svg>
            Sound
          </button>
        </span>
        <span className="hud-status-fps" aria-hidden="true">
          <em data-k="fps">60</em> fps
        </span>
      </div>
    </>
  );
}
