/**
 * Where the map's sky comes from: SFU's Burnaby campus, where the research on
 * this page happens. Weather and daylight follow it unless the visitor picks
 * a condition by hand.
 */
import type { WeatherMode } from "@/scene/weather";

export const PLACE = { name: "SFU Burnaby", lat: 49.2781, lon: -122.9199 };

/** Current conditions at PLACE, as served by /api/sky. */
export interface SkyReport {
  /** The condition the map shows for it. */
  weather: WeatherMode;
  /** Plain description, e.g. "light rain". */
  label: string;
  tempC: number;
  /** Precipitation rate, mm/h. */
  rate: number;
  /** When it was observed, Unix ms. */
  at: number;
}

/**
 * Is the sun above the horizon? Low-precision solar position (Astronomical
 * Almanac), good to a fraction of a degree, so day and night are known without
 * a network call. Keep it self-contained: its source is inlined into the
 * pre-paint script in layout.tsx.
 */
export function sunIsUp(ms: number, lat: number, lon: number): boolean {
  const rad = Math.PI / 180;
  const d = ms / 86400000 - 10957.5;
  const g = (357.529 + 0.98560028 * d) * rad;
  const l = (280.459 + 0.98564736 * d + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const e = (23.439 - 0.00000036 * d) * rad;
  const dec = Math.asin(Math.sin(e) * Math.sin(l));
  const ra = Math.atan2(Math.cos(e) * Math.sin(l), Math.cos(l));
  const ha = (18.697374558 + 24.06570982441908 * d) * 15 * rad + lon * rad - ra;
  const alt = Math.asin(Math.sin(lat * rad) * Math.sin(dec) + Math.cos(lat * rad) * Math.cos(dec) * Math.cos(ha));
  return alt > -0.833 * rad;
}
