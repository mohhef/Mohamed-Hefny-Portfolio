/**
 * Explore mode: once the loop has closed, the visitor can take the camera and
 * fly around the finished map. Shared by the button in the last section and
 * the viewer.
 */
let exploring = false;
const listeners = new Set<() => void>();

export function isExploring() {
  return exploring;
}

export function setExploring(on: boolean) {
  if (on === exploring) return;
  exploring = on;
  listeners.forEach((l) => l());
}

export function subscribeExplore(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
