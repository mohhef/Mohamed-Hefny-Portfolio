"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { PickTarget, SlamEngine } from "@/scene/engine";
import { projects } from "@/content/projects";
import { Hud } from "./Hud";
import { Minimap } from "./Minimap";
import { capOf, getCap, getServerCap, subscribeCap } from "./compute";
import { getConditions, getServerConditions, subscribeConditions, watchConditions } from "./conditions";
import { isExploring, setExploring, subscribeExplore } from "./explore";
import { savePicture } from "./picture";
import { playCue, setSound, setSoundWeather } from "./sound";
import { emitEngineEvent, emitTelemetry, subscribeEngineEvents, subscribeTelemetry } from "./telemetry";

/** Phones can look around by tilting: needs an orientation sensor, and a visitor who is fine with motion. */
const noSubscription = () => () => {};
const canTiltNow = () =>
  "DeviceOrientationEvent" in window &&
  window.matchMedia("(pointer: coarse)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  const { weather, lighting } = useSyncExternalStore(subscribeConditions, getConditions, getServerConditions);
  const cap = useSyncExternalStore(subscribeCap, getCap, getServerCap);
  const canTilt = useSyncExternalStore(noSubscription, canTiltNow, () => false);
  const [tiltOn, setTiltOn] = useState(false);
  const exploring = useSyncExternalStore(subscribeExplore, isExploring, () => false);
  const exploringRef = useRef(false);
  const exploreBarRef = useRef<HTMLDivElement>(null);
  const weatherRef = useRef(weather);
  const lightingRef = useRef(lighting);
  const capRef = useRef(cap);

  useEffect(() => {
    capRef.current = cap;
    engineRef.current?.setSqueeze(capOf(cap).squeeze);
  }, [cap]);

  useEffect(() => {
    weatherRef.current = weather;
    engineRef.current?.setWeather(weather);
    setSoundWeather(weather);
    document.documentElement.dataset.weather = weather;
  }, [weather]);

  useEffect(() => {
    lightingRef.current = lighting;
    engineRef.current?.setLighting(lighting);
  }, [lighting]);

  useEffect(() => watchConditions(), []);

  // Explore mode: the text steps aside and the visitor takes the camera.
  useEffect(() => {
    exploringRef.current = exploring;
    engineRef.current?.setExplore(exploring);
    const root = document.documentElement;
    if (exploring) root.dataset.explore = "on";
    else delete root.dataset.explore;
    document.querySelector("main")?.toggleAttribute("inert", exploring);
    if (exploring) exploreBarRef.current?.focus({ preventScroll: true });
  }, [exploring]);

  // Sound cues, for visitors who turned sound on.
  useEffect(() => {
    let last: string | null = null;
    const offTelemetry = subscribeTelemetry((t) => {
      if (t.state === last) return;
      if (last !== null && t.state === "LOST") playCue("lost");
      if (last !== null && t.state === "RELOCALIZED") playCue("relocalized");
      last = t.state;
    });
    const offEvents = subscribeEngineEvents((e) => playCue(e.type, e.type === "keyframe" ? e.index : 0));
    return () => {
      offTelemetry();
      offEvents();
    };
  }, []);

  // Tilt to look: the phone becomes a window onto the map.
  useEffect(() => {
    if (!tiltOn) return;
    let neutral: { x: number; y: number } | null = null;
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      // Sideways and forward lean, whichever way up the phone is held.
      const angle = screen.orientation?.angle ?? 0;
      const [x, y] =
        angle === 90 ? [e.beta, -e.gamma] : angle === 270 ? [-e.beta, e.gamma] : angle === 180 ? [-e.gamma, -e.beta] : [e.gamma, e.beta];
      neutral ??= { x, y };
      // However the phone ends up being held slowly becomes the new neutral.
      neutral.x += (x - neutral.x) * 0.012;
      neutral.y += (y - neutral.y) * 0.012;
      const rad = Math.PI / 180;
      engineRef.current?.setTilt((x - neutral.x) * rad * 1.1, (neutral.y - y) * rad * 0.7);
    };
    window.addEventListener("deviceorientation", onOrientation);
    return () => {
      window.removeEventListener("deviceorientation", onOrientation);
      engineRef.current?.setTilt(0, 0);
    };
  }, [tiltOn]);

  const onTilt = (on: boolean) => {
    if (!on) {
      setTiltOn(false);
      return;
    }
    // iOS only hands out orientation data after asking, and only from a tap.
    const sensor = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof sensor.requestPermission === "function") {
      sensor
        .requestPermission()
        .then((answer) => setTiltOn(answer === "granted"))
        .catch(() => setTiltOn(false));
    } else {
      setTiltOn(true);
    }
  };

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

    // Each shot is centred in the space its own section leaves free next to the text.
    const focus = () => {
      if (!engine) return;
      const w = window.innerWidth;
      if (w < 900) {
        // Text sits at the bottom, so the shot aims high; less so on a phone held sideways.
        engine.setFocus(scroll.sections.map(() => 0.5), window.innerHeight < 560 ? 0.42 : 0.3);
        return;
      }
      engine.setFocus(
        scroll.sections.map((section) => {
          const panel = section.querySelector<HTMLElement>(".panel, .hero");
          const right = panel ? panel.getBoundingClientRect().right : w * 0.42;
          return Math.min(0.78, (right + w) / 2 / w);
        }),
        0.5,
      );
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
      setExploring(false);
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
    // In explore mode the same drag orbits the free camera (right-drag or shift pans), and touch
    // joins in: one finger orbits, two pinch to zoom and slide to pan.
    let drag: { x: number; y: number; moved: number; id: number; pan: boolean } | null = null;
    const touches = new Map<number, { x: number; y: number }>();
    let pinch: { span: number; x: number; y: number } | null = null;
    const measurePinch = () => {
      const [a, b] = [...touches.values()];
      return { span: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };
    const onCanvasMove = (e: PointerEvent) => {
      const free = exploringRef.current;
      if (e.pointerType === "mouse") {
        engine?.setCursor(e.clientX, e.clientY);
      } else {
        if (!free || !touches.has(e.pointerId)) return;
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pinch && touches.size >= 2) {
          const next = measurePinch();
          engine?.exploreZoom(pinch.span / next.span);
          engine?.explorePan(next.x - pinch.x, next.y - pinch.y);
          pinch = next;
          return;
        }
      }
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      drag.x = e.clientX;
      drag.y = e.clientY;
      if (!free) engine?.dragBy(dx, dy);
      else if (drag.pan) engine?.explorePan(dx, dy);
      else engine?.exploreRotate(dx, dy);
    };
    const onCanvasLeave = () => {
      if (!drag) engine?.clearCursor();
    };
    const onCanvasDown = (e: PointerEvent) => {
      const free = exploringRef.current;
      const mouse = e.pointerType === "mouse";
      if (mouse ? e.button !== 0 && !(free && e.button === 2) : !free) return;
      canvas.setPointerCapture(e.pointerId);
      if (!mouse) {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (touches.size >= 2) {
          // A second finger turns the orbit into a pinch.
          pinch = measurePinch();
          drag = null;
          return;
        }
      }
      drag = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId, pan: free && (e.button === 2 || e.shiftKey) };
      engine?.beginDrag();
    };
    const onCanvasUp = (e: PointerEvent) => {
      const wasTouch = touches.delete(e.pointerId);
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      if (wasTouch) {
        pinch = null;
        if (touches.size === 1) {
          // One of two fingers lifted: the other carries on orbiting from where it is.
          const [[id, p]] = [...touches];
          drag = { x: p.x, y: p.y, moved: 99, id, pan: false };
          return;
        }
        if (!touches.size && !drag) engine?.endDrag();
      }
      if (!drag || e.pointerId !== drag.id) return;
      const click = e.type === "pointerup" && drag.moved < 6;
      drag = null;
      engine?.endDrag();
      if (e.pointerType !== "mouse") return;
      if (document.elementFromPoint(e.clientX, e.clientY) !== canvas) engine?.clearCursor();
      if (!click) return;
      if (exploringRef.current) {
        engine?.exploreFocus();
        return;
      }
      const target = engine?.getPickTarget();
      if (target) relocalize(target);
    };
    const onContextMenu = (e: Event) => {
      if (exploringRef.current) e.preventDefault();
    };
    const onWheel = (e: WheelEvent) => {
      if (!exploringRef.current) return;
      e.preventDefault();
      engine?.exploreZoom(Math.exp((e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) * 0.0012));
    };

    // Arrow keys step keyframe to keyframe. Up/down still scroll through content taller than the screen.
    let keyTarget: number | null = null;
    let keyTimer = 0;
    const onKey = (e: KeyboardEvent) => {
      if (exploringRef.current) {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        const onControl = e.target instanceof Element && !!e.target.closest("button, a");
        if (e.key === "Escape") setExploring(false);
        else if (e.key === "ArrowLeft") engine?.exploreRotate(70, 0);
        else if (e.key === "ArrowRight") engine?.exploreRotate(-70, 0);
        else if (e.key === "ArrowUp") engine?.exploreRotate(0, 45);
        else if (e.key === "ArrowDown") engine?.exploreRotate(0, -45);
        else if (e.key === "+" || e.key === "=") engine?.exploreZoom(0.82);
        else if (e.key === "-" || e.key === "_") engine?.exploreZoom(1.22);
        // The page underneath stays where it is.
        else if (!/^(PageUp|PageDown|Home|End)$/.test(e.key) && !(e.key === " " && !onControl)) return;
        e.preventDefault();
        return;
      }
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
    window.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", onContextMenu);
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
          onEvent: emitEngineEvent,
        });
      } catch (err) {
        console.warn("WebGL unavailable, showing the static page.", err);
        root.dataset.webgl = "off";
        return;
      }
      engineRef.current = engine;
      engine.setSqueeze(capOf(capRef.current).squeeze);
      engine.setExplore(exploringRef.current);
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
      window.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContextMenu);
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
      setExploring(false);
      setSound(false);
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
      {exploring && (
        <div ref={exploreBarRef} className="explore-bar" role="toolbar" aria-label="Exploring the map" tabIndex={-1}>
          <p className="explore-hint" aria-hidden="true">
            <span className="for-mouse">Drag to orbit · scroll to zoom · right-drag to pan · click to focus</span>
            <span className="for-touch">Drag to orbit · pinch to zoom · two fingers to pan</span>
          </p>
          <button
            type="button"
            onClick={() => {
              const engine = engineRef.current;
              if (engine) savePicture(engine.snapshot());
            }}
          >
            Save picture
          </button>
          <button type="button" className="explore-exit" onClick={() => setExploring(false)}>
            Exit <kbd>Esc</kbd>
          </button>
        </div>
      )}
      <Hud tilt={canTilt ? tiltOn : null} onTilt={onTilt} />
      <Minimap />
    </>
  );
}
