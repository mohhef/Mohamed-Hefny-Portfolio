/**
 * Scene colours per lighting condition. They mirror the CSS tokens in
 * globals.css, and follow the classic SLAM viewer convention: map points
 * neutral, tracked points red, keyframes green, current camera blue.
 * Colours are sRGB and written straight to the canvas (colour management is
 * off in the engine), so these hex values are what you see.
 */
export type Lighting = "night" | "day";

export interface Palette {
  background: string;
  point: string;
  pointAlpha: number;
  pointSize: number;
  structureAlpha: number;
  tracked: string;
  keyframe: string;
  camera: string;
  loop: string;
  highlight: string;
  covisAlpha: number;
  precip: string;
  precipAlpha: number;
  boardLight: string;
  boardDark: string;
}

export const palettes: Record<Lighting, Palette> = {
  night: {
    background: "#06080b",
    point: "#c9d1db",
    pointAlpha: 0.95,
    pointSize: 1,
    structureAlpha: 0.62,
    tracked: "#ff4b3e",
    keyframe: "#3ddc84",
    camera: "#4aa3ff",
    loop: "#ffc53d",
    highlight: "#ffc53d",
    covisAlpha: 0.2,
    precip: "#9fb4cc",
    precipAlpha: 0.42,
    boardLight: "#9aa1aa",
    boardDark: "#14181d",
  },
  day: {
    background: "#efeee9",
    point: "#1a1e24",
    pointAlpha: 0.9,
    pointSize: 1.3,
    structureAlpha: 0.5,
    tracked: "#d8352a",
    keyframe: "#0e9a55",
    camera: "#1769e0",
    loop: "#c27f00",
    highlight: "#d07a00",
    covisAlpha: 0.26,
    precip: "#51606f",
    precipAlpha: 0.45,
    boardLight: "#fbfaf7",
    boardDark: "#1a1e24",
  },
};
