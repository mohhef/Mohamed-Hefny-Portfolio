/**
 * Telemetry fan-out from the engine to HUD widgets. Widgets write straight to
 * the DOM from their listener, so ~8 updates a second never re-render React.
 */
import type { Telemetry } from "@/scene/engine";

type Listener = (t: Telemetry) => void;

const listeners = new Set<Listener>();
let latest: Telemetry | null = null;

export function emitTelemetry(t: Telemetry) {
  latest = t;
  listeners.forEach((l) => l(t));
}

export function subscribeTelemetry(listener: Listener) {
  listeners.add(listener);
  if (latest) listener(latest);
  return () => {
    listeners.delete(listener);
  };
}

export const fmt = {
  int: (n: number) => Math.round(n).toLocaleString("en-US"),
  fixed: (n: number, d = 2) => (Object.is(Math.round(n * 10 ** d), -0) ? 0 : n).toFixed(d),
};
