/**
 * Day/night lives on <html data-theme>, set before first paint by the inline
 * script in layout.tsx. This store lets React read and change it.
 */
import type { Lighting } from "@/scene/palette";

export const LIGHTING_KEY = "hefny-lighting";

const listeners = new Set<() => void>();

export function getLighting(): Lighting {
  return document.documentElement.dataset.theme === "day" ? "day" : "night";
}

export function getServerLighting(): Lighting {
  return "night";
}

export function setLighting(lighting: Lighting) {
  document.documentElement.dataset.theme = lighting;
  try {
    localStorage.setItem(LIGHTING_KEY, lighting);
  } catch {
    // Private mode or storage disabled: the choice just won't persist.
  }
  listeners.forEach((l) => l());
}

export function subscribeLighting(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Inline, pre-paint: saved choice, else the OS colour scheme. */
export const lightingScript = `(function(){try{var t=localStorage.getItem("${LIGHTING_KEY}");if(t!=="day"&&t!=="night"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"day":"night"}document.documentElement.dataset.theme=t}catch(e){}})()`;
