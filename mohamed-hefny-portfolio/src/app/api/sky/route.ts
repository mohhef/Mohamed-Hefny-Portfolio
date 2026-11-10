/**
 * Current weather at SFU Burnaby, from Open-Meteo. The response is cached and
 * regenerated at most every ten minutes, so visitors never call the weather
 * service themselves and it sees one request per interval, whatever the traffic.
 */
import { PLACE, type SkyReport } from "@/content/place";

export const revalidate = 600;

const SOURCE =
  `https://api.open-meteo.com/v1/forecast?latitude=${PLACE.lat}&longitude=${PLACE.lon}` +
  "&current=temperature_2m,precipitation,snowfall,weather_code&timeformat=unixtime";

/** WMO weather interpretation codes, as Open-Meteo reports them. */
const LABELS: Record<number, string> = {
  0: "clear sky",
  1: "mostly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "fog",
  48: "freezing fog",
  51: "light drizzle",
  53: "drizzle",
  55: "heavy drizzle",
  56: "freezing drizzle",
  57: "freezing drizzle",
  61: "light rain",
  63: "rain",
  65: "heavy rain",
  66: "freezing rain",
  67: "freezing rain",
  71: "light snow",
  73: "snow",
  75: "heavy snow",
  77: "snow grains",
  80: "light showers",
  81: "showers",
  82: "heavy showers",
  85: "snow showers",
  86: "heavy snow showers",
  95: "thunderstorm",
  96: "thunderstorm with hail",
  99: "thunderstorm with hail",
};

const SNOW = new Set([71, 73, 75, 77, 85, 86]);
const FOG = new Set([45, 48]);

interface Current {
  time: number;
  interval: number;
  temperature_2m: number;
  precipitation: number;
  snowfall: number;
  weather_code: number;
}

function toReport(c: Current): SkyReport {
  const code = c.weather_code;
  const snowing = c.snowfall > 0 || SNOW.has(code);
  const raining = !snowing && (c.precipitation > 0 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95);
  return {
    weather: snowing ? "snow" : raining ? "rain" : FOG.has(code) ? "fog" : "clear",
    label: LABELS[code] ?? (snowing ? "snow" : raining ? "rain" : "clear"),
    tempC: c.temperature_2m,
    // Precipitation is the total over the reporting interval; convert it to a rate.
    rate: (c.precipitation * 3600) / (c.interval || 900),
    at: c.time * 1000,
  };
}

export async function GET() {
  try {
    const res = await fetch(SOURCE, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Open-Meteo answered ${res.status}`);
    const data = (await res.json()) as { current: Current };
    return Response.json({ ok: true, report: toReport(data.current) });
  } catch (err) {
    // During the build there is no earlier report to fall back on, and the weather must not
    // fail a deploy. Later, throwing keeps the last good report in the cache until a retry works.
    if (process.env.NEXT_PHASE === "phase-production-build") return Response.json({ ok: false });
    throw err;
  }
}
