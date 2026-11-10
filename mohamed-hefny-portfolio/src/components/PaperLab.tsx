"use client";

import { useSyncExternalStore } from "react";
import { capFindings, conditionFindings } from "@/content/findings";
import type { WeatherMode } from "@/scene/weather";
import { CAPS, getCap, getServerCap, setCap, subscribeCap } from "./compute";
import { chooseLighting, chooseWeather, getConditions, getServerConditions, subscribeConditions } from "./conditions";

const WEATHER: Array<{ mode: WeatherMode; label: string }> = [
  { mode: "clear", label: "Clear" },
  { mode: "rain", label: "Rain" },
  { mode: "fog", label: "Fog" },
  { mode: "snow", label: "Snow" },
];

/** The paper's adverse conditions, applied to this map. */
function ConditionsLab() {
  const { weather, lighting } = useSyncExternalStore(subscribeConditions, getConditions, getServerConditions);
  const night = lighting === "night";
  // Night and fog together are the paper's own example of conditions compounding.
  const findings =
    night && weather === "fog"
      ? [conditionFindings.nightFog]
      : [weather !== "clear" && conditionFindings[weather], night && conditionFindings.night].filter(Boolean);
  return (
    <div className="lab">
      <p className="lab-title">Try it on this map</p>
      <div className="lab-controls" role="group" aria-label="Conditions">
        {WEATHER.map((w) => (
          <button key={w.mode} type="button" aria-pressed={weather === w.mode} onClick={() => chooseWeather(w.mode)}>
            {w.label}
          </button>
        ))}
        <span className="lab-sep" aria-hidden="true" />
        <button type="button" aria-pressed={night} onClick={() => chooseLighting(night ? "day" : "night")}>
          Night
        </button>
      </div>
      {(findings.length ? findings : [conditionFindings.clear]).map((text) => (
        <p key={text as string} className="lab-finding">
          <b>In the paper</b> {text}
        </p>
      ))}
    </div>
  );
}

/** The paper's processor caps, applied to this map's tracker. */
function ComputeLab() {
  const cap = useSyncExternalStore(subscribeCap, getCap, getServerCap);
  return (
    <div className="lab">
      <p className="lab-title">Try it on this map</p>
      <div className="lab-controls" role="group" aria-label="Processor cap">
        {CAPS.map((c) => (
          <button key={c.id} type="button" aria-pressed={cap === c.id} onClick={() => setCap(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <p className="lab-finding">
        <b>In the paper</b> {capFindings[cap]}
      </p>
    </div>
  );
}

export function PaperLab({ kind }: { kind: "conditions" | "compute" }) {
  return kind === "conditions" ? <ConditionsLab /> : <ComputeLab />;
}
