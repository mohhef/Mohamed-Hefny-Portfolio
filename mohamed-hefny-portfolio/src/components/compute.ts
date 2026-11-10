/**
 * The processor cap on this page's tracker. The caps are the ones
 * SLAMSqueezeBench applies to real systems (four, two, one and half a core);
 * `squeeze` is how hard each one starves the simulation, 0 to 1. Shared by the
 * control on the paper's card and the HUD.
 */
export const CAPS = [
  { id: "uncapped", label: "Uncapped", squeeze: 0 },
  { id: "4", label: "4 cores", squeeze: 0.3 },
  { id: "2", label: "2 cores", squeeze: 0.55 },
  { id: "1", label: "1 core", squeeze: 0.8 },
  { id: "0.5", label: "0.5 core", squeeze: 1 },
] as const;

export type CapId = (typeof CAPS)[number]["id"];

let cap: CapId = "uncapped";
const listeners = new Set<() => void>();

export function getCap(): CapId {
  return cap;
}

export function getServerCap(): CapId {
  return "uncapped";
}

export function setCap(next: CapId) {
  if (next === cap) return;
  cap = next;
  listeners.forEach((l) => l());
}

export function subscribeCap(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const capOf = (id: CapId) => CAPS.find((c) => c.id === id) ?? CAPS[0];
