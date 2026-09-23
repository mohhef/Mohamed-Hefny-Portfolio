"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { PickTarget, SlamEngine } from "@/scene/engine";
import type { WeatherMode } from "@/scene/weather";
import { projects } from "@/content/projects";
import { Hud } from "./Hud";
import { Minimap } from "./Minimap";
import { emitTelemetry } from "./telemetry";
import { getLighting, getServerLighting, setLighting, subscribeLighting } from "./lighting";

/** Maps scroll position to a continuous shot index: the camera sits on shot i while section i is centred. */
function createScrollMap() {
  let anchors: number[] = [];
  let sections: HTMLElement[] = [];

  const measure = () => {
    sections = [...document.querySelectorAll<HTMLElement>("[data-shot]")];
    const vh = window.innerHeight;
    const max = Math.max(0, document.documentElement.scrollHeight - vh);
    let prev = -Infinity;
    anchors = sections.map((el, i) => {
      const r = el.getBoundingClientRect();
      let a = i === 0 ? 0 : r.top + window.scrollY + r.height / 2 - vh / 2;
      a = Math.min(Math.max(a, 0), max);
      if (a <= prev) a = prev + 1;
      prev = a;
      return a;
    });
  };

  const progress = (y: number) => {
    if (!anchors.length || y <= anchors[0]) return 0;
    for (let i = 0; i < anchors.length - 1; i++) {
      if (y < anchors[i + 1]) return i + (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
    }
    return anchors.length - 1;
  };

  return {
    measure,
    progress,
    anchor: (i: number) => anchors[Math.max(0, Math.min(anchors.length - 1, i))] ?? 0,
    get count() {
      return anchors.length;
    },
    get sections() {
      return sections;
    },
  };
}

export function MapViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const reticleLabelRef = useRef<HTMLElement>(null);
  const reticleSubRef = useRef<HTMLElement>(null);
  const engineRef = useRef<SlamEngine | null>(null);
  const [weather, setWeather] = useState<WeatherMode>("clear");
  const lighting = useSyncExternalStore(subscribeLighting, getLighting, getServerLighting);
  const weatherRef = useRef(weather);
  const lightingRef = useRef(lighting);

  useEffect(() => {
    weatherRef.current = weather;
    engineRef.current?.setWeather(weather);
    document.documentElement.dataset.weather = weather;
  }, [weather]);

  useEffect(() => {
    lightingRef.current = lighting;
    engineRef.current?.setLighting(lighting);
  }, [lighting]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const root = document.documentElement;
    const media = (q: string) => window.matchMedia(q).matches;
    const reducedMotion = media("(prefers-reduced-motion: reduce)");
    const lowPower =
      media("(pointer: coarse)") || window.innerWidth < 760 || (navigator.hardwareConcurrency ?? 8) <= 4;
    const behavior: ScrollBehavior = reducedMotion ? "auto" : "smooth";
    const scroll = createScrollMap();
    let engine: SlamEngine | null = null;
    let cancelled = false;
    let raf = 0;

    const focus = () => {
      if (!engine) return;
      const w = window.innerWidth;
      if (w >= 900) {
        const panel = document.querySelector<HTMLElement>(".shot .panel");
        const right = panel ? panel.getBoundingClientRect().right : w * 0.42;
        engine.setFocus(Math.min(0.78, (right + w) / 2 / w), 0.5);
      } else {
        engine.setFocus(0.5, 0.3);
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const s = scroll.progress(window.scrollY);
        engine?.setProgress(s);
        const current = scroll.sections[Math.round(s)];
        if (current?.dataset.nav && root.dataset.section !== current.dataset.nav) root.dataset.section = current.dataset.nav;
      });
    };

    const relayout = () => {
      scroll.measure();
      engine?.resize();
      focus();
      onScroll();
    };

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      engine?.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    };

    // Hovering a skill lights its covisibility edges; hovering a project lights its landmark.
    const onOver = (e: Event) => {
      const target = e.target instanceof Element ? e.target : null;
      engine?.setSkill(target?.closest<HTMLElement>("[data-skill]")?.dataset.skill ?? null);
      engine?.setHoveredLandmark(target?.closest<HTMLElement>("[data-landmark]")?.dataset.landmark ?? null);
    };

    // In-page links centre their section: that's where each section's camera shot sits.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
      const id = link?.getAttribute("href")?.slice(1);
      const section = id ? document.getElementById(id) : null;
      if (!section) return;
      e.preventDefault();
      if (id === "top") window.scrollTo({ top: 0, behavior });
      else section.scrollIntoView({ behavior, block: "center" });
      history.replaceState(null, "", `#${id}`);
    };

    // Clicking something in the map relocalizes the camera there.
    const relocalize = (t: PickTarget) => {
      if (t.kind === "origin") {
        window.scrollTo({ top: 0, behavior });
      } else if (t.kind === "keyframe") {
        document.getElementById(`kf-${t.id}`)?.scrollIntoView({ behavior, block: "center" });
      } else if (t.kind === "calibration") {
        document.getElementById("calibration")?.scrollIntoView({ behavior, block: "center" });
      } else {
        const card = document.querySelector<HTMLElement>(`.project[data-landmark="${t.id}"]`);
        if (!card) return;
        card.scrollIntoView({ behavior, block: "center" });
        card.classList.remove("is-pinged");
        void card.offsetWidth;
        card.classList.add("is-pinged");
      }
    };

    // The mouse over the map: detects features, locks onto targets, drags to look around.
    let drag: { x: number; y: number; moved: number; id: number } | null = null;
    const onCanvasMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      engine?.setCursor(e.clientX, e.clientY);
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      drag.x = e.clientX;
      drag.y = e.clientY;
      engine?.dragBy(dx, dy);
    };
    const onCanvasLeave = () => {
      if (!drag) engine?.clearCursor();
    };
    const onCanvasDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId };
      canvas.setPointerCapture(e.pointerId);
      engine?.beginDrag();
    };
    const onCanvasUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const click = e.type === "pointerup" && drag.moved < 6;
      drag = null;
      engine?.endDrag();
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      if (document.elementFromPoint(e.clientX, e.clientY) !== canvas) engine?.clearCursor();
      const target = click ? engine?.getPickTarget() : null;
      if (target) relocalize(target);
    };

    // Arrow keys step keyframe to keyframe. Up/down still scroll through content taller than the screen.
    let keyTarget: number | null = null;
    let keyTimer = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const el = e.target instanceof HTMLElement ? e.target : null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const vertical = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
      const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : vertical;
      if (!dir || !scroll.count) return;
      const s = scroll.progress(window.scrollY);
      if (vertical && keyTarget === null) {
        const content = scroll.sections[Math.round(s)]?.querySelector<HTMLElement>(".panel, .hero");
        const r = content?.getBoundingClientRect();
        const top = 64;
        const bottom = window.innerHeight - 36;
        if (r && ((dir > 0 && r.bottom > bottom + 4) || (dir < 0 && r.top < top - 4))) return;
      }
      e.preventDefault();
      const from = keyTarget ?? s;
      const next = Math.max(0, Math.min(scroll.count - 1, dir > 0 ? Math.floor(from + 0.02) + 1 : Math.ceil(from - 0.02) - 1));
      keyTarget = next;
      window.clearTimeout(keyTimer);
      keyTimer = window.setTimeout(() => (keyTarget = null), 700);
      engine?.setNavigating(1.4);
      window.scrollTo({ top: scroll.anchor(next), behavior });
    };

    const resizeObserver = new ResizeObserver(relayout);
    resizeObserver.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", relayout);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerover", onOver);
    document.addEventListener("focusin", onOver);
    document.addEventListener("click", onClick);
    canvas.addEventListener("pointermove", onCanvasMove);
    canvas.addEventListener("pointerleave", onCanvasLeave);
    canvas.addEventListener("pointerdown", onCanvasDown);
    canvas.addEventListener("pointerup", onCanvasUp);
    canvas.addEventListener("pointercancel", onCanvasUp);
    scroll.measure();

    (async () => {
      const { SlamEngine } = await import("@/scene/engine");
      if (cancelled) return;
      try {
        engine = new SlamEngine(canvas, {
          lighting: lightingRef.current,
          weather: weatherRef.current,
          reducedMotion,
          lowPower,
          fontFamily: getComputedStyle(root).getPropertyValue("--font-sans").trim() || "sans-serif",
          onTelemetry: emitTelemetry,
        });
      } catch (err) {
        console.warn("WebGL unavailable, showing the static page.", err);
        root.dataset.webgl = "off";
        return;
      }
      engineRef.current = engine;
      root.dataset.webgl = "on";
      if (process.env.NODE_ENV !== "production") (window as unknown as { __slam?: SlamEngine }).__slam = engine;
      engine.setShots(scroll.sections.map((s) => s.dataset.shot ?? ""));
      const labels = new Map<string, HTMLElement>();
      labelsRef.current?.querySelectorAll<HTMLElement>("[data-landmark]").forEach((el) => {
        labels.set(el.dataset.landmark!, el);
      });
      engine.setLabels(labels);
      if (reticleRef.current && reticleLabelRef.current && reticleSubRef.current) {
        engine.setReticle({ root: reticleRef.current, label: reticleLabelRef.current, sub: reticleSubRef.current });
      }
      relayout();
      await engine.init();
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(keyTimer);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", relayout);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("focusin", onOver);
      document.removeEventListener("click", onClick);
      canvas.removeEventListener("pointermove", onCanvasMove);
      canvas.removeEventListener("pointerleave", onCanvasLeave);
      canvas.removeEventListener("pointerdown", onCanvasDown);
      canvas.removeEventListener("pointerup", onCanvasUp);
      canvas.removeEventListener("pointercancel", onCanvasUp);
      engine?.dispose();
      engineRef.current = null;
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="map-canvas" aria-hidden="true" />
      <div className="map-vignette" aria-hidden="true" />
      <div ref={labelsRef} className="landmark-labels" aria-hidden="true">
        {projects.map((p) => (
          <a key={p.id} href={p.url} target="_blank" rel="noreferrer" tabIndex={-1} className="landmark-label" data-landmark={p.id}>
            <span>{p.name}</span>
            <small>{p.year}</small>
          </a>
        ))}
      </div>
      <div ref={reticleRef} className="reticle" data-state="off" aria-hidden="true">
        <span className="reticle-box" />
        <span className="reticle-text">
          <b ref={reticleLabelRef} />
          <small ref={reticleSubRef} />
        </span>
      </div>
      <Hud weather={weather} onWeather={setWeather} lighting={lighting} onLighting={setLighting} />
      <Minimap />
    </>
  );
}
