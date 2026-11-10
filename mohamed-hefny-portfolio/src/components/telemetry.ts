/**
 * Telemetry fan-out from the engine to HUD widgets. Widgets write straight to
 * the DOM from their listener, so ~8 updates a second never re-render React.
 */
import type { EngineEvent, Telemetry } from "@/scene/engine";

type Listener = (t: Telemetry) => void;
type EventListener = (e: EngineEvent) => void;

const listeners = new Set<Listener>();
let latest: Telemetry | null = null;

export function emitTelemetry(t: Telemetry) {
  latest = t;
  listeners.forEach((l) => l(t));
}

export function getTelemetry() {
  return latest;
}

export function subscribeTelemetry(listener: Listener) {
  listeners.add(listener);
  if (latest) listener(latest);
  return () => {
    listeners.delete(listener);
  };
}

const eventListeners = new Set<EventListener>();

/** One-off moments (a keyframe taken, the loop closing), as opposed to the telemetry stream. */
export function emitEngineEvent(e: EngineEvent) {
  eventListeners.forEach((l) => l(e));
}

export function subscribeEngineEvents(listener: EventListener) {
  eventListeners.add(listener);
  return () => {
    eventListeners.delete(listener);
  };
}

export const fmt = {
  int: (n: number) => Math.round(n).toLocaleString("en-US"),
  fixed: (n: number, d = 2) => (Object.is(Math.round(n * 10 ** d), -0) ? 0 : n).toFixed(d),
};
