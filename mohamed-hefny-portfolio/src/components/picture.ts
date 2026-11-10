/** Signs a snapshot of the map and hands it to the browser as a PNG download. */
import { profile } from "@/content/profile";
import { fmt, getTelemetry } from "./telemetry";

export function savePicture(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  // Type scales with the picture, whichever way up it is.
  const k = Math.min(canvas.width, canvas.height * 1.5) / 1600;
  const pad = 46 * k;
  const stats = getTelemetry();

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = token("--fg");
  ctx.font = `400 ${52 * k}px ${token("--font-display") || "serif"}, serif`;
  ctx.fillText(profile.name, pad, canvas.height - pad - 30 * k);

  ctx.fillStyle = token("--fg-3");
  ctx.font = `${14.5 * k}px ${token("--font-mono") || "monospace"}, monospace`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${1.6 * k}px`;
  const parts = ["Career map"];
  if (stats) parts.push(`${stats.keyframes} keyframes`, `${fmt.int(stats.mapPoints)} map points`);
  parts.push(new URL(profile.site).host.replace(/^www\./, ""));
  ctx.fillText(parts.join("  ·  ").toUpperCase(), pad, canvas.height - pad);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mohamed-hefny-map.png";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, "image/png");
}
