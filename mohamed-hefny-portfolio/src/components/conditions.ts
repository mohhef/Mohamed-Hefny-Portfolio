/**
 * Weather and daylight for the map. Both follow SFU Burnaby live until the
 * visitor picks one by hand; "Live" hands both back.
 *
 * Daylight lives on <html data-theme>, set before first paint by the inline
 * script in layout.tsx, and comes from the sun's position, so it needs no
 * network. The weather comes from /api/sky.
 */
import { PLACE, sunIsUp, type SkyReport } from "@/content/place";
import { palettes, type Lighting } from "@/scene/palette";
import type { WeatherMode } from "@/scene/weather";

/** A hand-picked day/night is remembered here; absent means "follow the sun". */
export const LIGHTING_KEY = "hefny-sky-lighting";

export interface Conditions {
  weather: WeatherMode;
  lighting: Lighting;
  weatherLive: boolean;
  lightingLive: boolean;
  report: SkyReport | null;
}

const SERVER: Conditions = { weather: "clear", lighting: "night", weatherLive: true, lightingLive: true, report: null };
const REPORT_MAX_AGE = 2 * 60 * 60 * 1000;

let state = SERVER;
let ready = false;
const listeners = new Set<() => void>();

const sunLighting = (): Lighting => (sunIsUp(Date.now(), PLACE.lat, PLACE.lon) ? "day" : "night");

function remember(lighting: Lighting | null) {
  try {
    if (lighting) localStorage.setItem(LIGHTING_KEY, lighting);
    else localStorage.removeItem(LIGHTING_KEY);
  } catch {
    // Private mode or storage disabled: the choice just won't persist.
  }
}

function set(patch: Partial<Conditions>) {
  state = { ...state, ...patch };
  const root = document.documentElement;
  if (root.dataset.theme !== state.lighting) root.dataset.theme = state.lighting;
  // The browser chrome follows the map's lighting, not the OS colour scheme.
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", palettes[state.lighting].background));
  listeners.forEach((l) => l());
}

export function getConditions(): Conditions {
  if (!ready && typeof document !== "undefined") {
    ready = true;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LIGHTING_KEY);
    } catch {
      // Same as nothing stored.
    }
    state = {
      ...state,
      lighting: document.documentElement.dataset.theme === "day" ? "day" : "night",
      lightingLive: stored !== "day" && stored !== "night",
    };
  }
  return state;
}

export function getServerConditions(): Conditions {
  return SERVER;
}

export function subscribeConditions(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function chooseWeather(weather: WeatherMode) {
  set({ weather, weatherLive: false });
}

export function chooseLighting(lighting: Lighting) {
  remember(lighting);
  set({ lighting, lightingLive: false });
}

export function goLive() {
  remember(null);
  set({ weatherLive: true, lightingLive: true, weather: state.report?.weather ?? "clear", lighting: sunLighting() });
}

/** Keeps the live conditions current while the page is open. Returns a stop function. */
export function watchConditions(): () => void {
  let stopped = false;
  const load = async () => {
    try {
      const res = await fetch("/api/sky");
      if (!res.ok) return;
      const data = (await res.json()) as { ok: boolean; report?: SkyReport };
      // A report from hours ago says nothing about now.
      if (stopped || !data.ok || !data.report || Date.now() - data.report.at > REPORT_MAX_AGE) return;
      set({ report: data.report, ...(state.weatherLive ? { weather: data.report.weather } : {}) });
    } catch {
      // Offline or blocked: the map simply stays clear.
    }
  };
  const followSun = () => {
    if (state.lightingLive && sunLighting() !== state.lighting) set({ lighting: sunLighting() });
  };
  getConditions();
  set({});
  void load();
  const weatherTimer = window.setInterval(load, 10 * 60 * 1000);
  const sunTimer = window.setInterval(followSun, 60 * 1000);
  return () => {
    stopped = true;
    window.clearInterval(weatherTimer);
    window.clearInterval(sunTimer);
  };
}

/** Inline, pre-paint: a hand-picked lighting if one is stored, else the sun over Burnaby. */
export const lightingScript = `(function(){var t=null;try{t=localStorage.getItem("${LIGHTING_KEY}")}catch(e){}if(t!=="day"&&t!=="night"){t=(${sunIsUp.toString()})(Date.now(),${PLACE.lat},${PLACE.lon})?"day":"night"}document.documentElement.dataset.theme=t})()`;
