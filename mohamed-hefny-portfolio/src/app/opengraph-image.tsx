import { ImageResponse } from "next/og";
import { profile } from "@/content/profile";
import { keyframes } from "@/content/timeline";
import { keyframeU, loopPoint } from "@/scene/world";
import { rng } from "@/scene/rng";

export const alt = "Mohamed Hefny: a portfolio reconstructed as a live SLAM map";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type FontFace = { name: string; data: ArrayBuffer; style: "normal" | "italic"; weight: 400 };

/** Instrument Serif (upright + italic) for the name; the default font is used if the fetch fails (e.g. offline builds). */
async function displayFonts(): Promise<FontFace[]> {
  try {
    const css = await (await fetch("https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap")).text();
    const faces = [...css.matchAll(/font-style: (normal|italic);[\s\S]*?src: url\((.+?)\) format\('(?:truetype|opentype)'\)/g)];
    return await Promise.all(
      faces.map(async ([, style, url]) => ({
        name: "Instrument Serif",
        data: await (await fetch(url)).arrayBuffer(),
        style: style as FontFace["style"],
        weight: 400 as const,
      })),
    );
  } catch {
    return [];
  }
}

function mapSvg(): string {
  const r = rng(11);
  const pts = Array.from({ length: 181 }, (_, i) => loopPoint(i / 180));
  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[2]);
  const minX = Math.min(...xs);
  const minZ = Math.min(...zs);
  const k = 520 / Math.max(Math.max(...xs) - minX, Math.max(...zs) - minZ);
  const to = (x: number, z: number) => [40 + (x - minX) * k, 40 + (z - minZ) * k * 0.62] as const;
  const d = pts.map((p, i) => `${i ? "L" : "M"}${to(p[0], p[2]).map((v) => v.toFixed(1)).join(" ")}`).join("");
  let dots = "";
  for (let i = 0; i < 900; i++) {
    const u = r.next();
    const p = loopPoint(u);
    const [x, y] = to(p[0] + r.gauss() * 4, p[2] + r.gauss() * 4);
    dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.8 + r.next() * 1.2).toFixed(2)}" fill="#c9d1db" fill-opacity="${(0.15 + r.next() * 0.5).toFixed(2)}"/>`;
  }
  const frustums = keyframes
    .map((_, i) => {
      const [x, y] = to(loopPoint(keyframeU[i])[0], loopPoint(keyframeU[i])[2]);
      return `<path d="M${x} ${y} l18 -10 v20 z" fill="none" stroke="#3ddc84" stroke-width="2"/>`;
    })
    .join("");
  const [ox, oy] = to(loopPoint(0)[0], loopPoint(0)[2]);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="420" viewBox="0 0 620 420">${dots}<path d="${d}" fill="none" stroke="#3ddc84" stroke-width="3"/>${frustums}<path d="M${ox} ${oy} l22 -13 v26 z" fill="none" stroke="#4aa3ff" stroke-width="3"/></svg>`;
}

export default async function Image() {
  const fonts = await displayFonts();
  const svg = `data:image/svg+xml;base64,${Buffer.from(mapSvg()).toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#06080b",
          color: "#e8ecf1",
          padding: "56px 64px",
          position: "relative",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={svg} width={620} height={420} alt="" style={{ position: "absolute", right: 30, top: 105 }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 22, letterSpacing: 3, color: "#3ddc84" }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: "#3ddc84" }} />
            TRACKING
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 128,
                lineHeight: 0.9,
                letterSpacing: -4,
                fontFamily: fonts.length ? "Instrument Serif" : undefined,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span>Mohamed</span>
              <span style={{ fontStyle: "italic", paddingLeft: 64 }}>Hefny</span>
            </div>
            <div style={{ marginTop: 28, fontSize: 28, color: "#aab3be", maxWidth: 560 }}>{profile.headline}</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length ? fonts : undefined,
    },
  );
}
