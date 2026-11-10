/**
 * Opt-in sound. Everything is synthesized with Web Audio, so there are no
 * audio files to load: a ping per keyframe, a tick when the reticle locks, cues
 * for losing and regaining tracking, a chord for the loop closure and a bed of
 * rain or wind for the weather. Off until the visitor turns it on.
 */
import type { WeatherMode } from "@/scene/weather";

export type Cue = "keyframe" | "lock" | "lost" | "relocalized" | "loop" | "on";

/** C major pentatonic: one note per keyframe, rising along the trajectory. */
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let echo: GainNode | null = null;
let noise: AudioBuffer | null = null;
let bed: { rain: GainNode; wind: GainNode } | null = null;
let enabled = false;
let weather: WeatherMode = "clear";
let lastLock = 0;

const listeners = new Set<() => void>();

export function isSoundOn() {
  return enabled;
}

export function subscribeSound(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function build(): Ctx | null {
  if (ctx) return ctx;
  const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  ctx = new AudioCtor();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // A short feedback delay, so pings ring out like sonar.
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.21;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.28;
  const damp = ctx.createBiquadFilter();
  damp.type = "lowpass";
  damp.frequency.value = 2400;
  echo = ctx.createGain();
  echo.gain.value = 0.5;
  echo.connect(delay);
  delay.connect(damp);
  damp.connect(feedback);
  feedback.connect(delay);
  damp.connect(master);

  // Two seconds of white noise, looped, feeds both weather beds.
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = noise;
  source.loop = true;

  const rainFilter = ctx.createBiquadFilter();
  rainFilter.type = "bandpass";
  rainFilter.frequency.value = 3200;
  rainFilter.Q.value = 0.45;
  const rain = ctx.createGain();
  rain.gain.value = 0;
  source.connect(rainFilter);
  rainFilter.connect(rain);
  rain.connect(master);

  const windFilter = ctx.createBiquadFilter();
  windFilter.type = "lowpass";
  windFilter.frequency.value = 420;
  windFilter.Q.value = 0.9;
  const gust = ctx.createOscillator();
  gust.frequency.value = 0.13;
  const gustDepth = ctx.createGain();
  gustDepth.gain.value = 160;
  gust.connect(gustDepth);
  gustDepth.connect(windFilter.frequency);
  const wind = ctx.createGain();
  wind.gain.value = 0;
  source.connect(windFilter);
  windFilter.connect(wind);
  wind.connect(master);

  source.start();
  gust.start();
  bed = { rain, wind };
  return ctx;
}

function applyWeather() {
  if (!ctx || !bed) return;
  const t = ctx.currentTime;
  bed.rain.gain.setTargetAtTime(enabled && weather === "rain" ? 0.085 : 0, t, 0.6);
  bed.wind.gain.setTargetAtTime(enabled && weather === "snow" ? 0.2 : enabled && weather === "fog" ? 0.11 : 0, t, 0.8);
}

/** One enveloped oscillator. `to` glides the pitch; `wet` sends it to the echo. */
function tone(freq: number, opts: { at?: number; gain?: number; decay?: number; type?: OscillatorType; to?: number; wet?: number }) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + (opts.at ?? 0);
  const decay = opts.decay ?? 0.5;
  const osc = ctx.createOscillator();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, t);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + decay);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(opts.gain ?? 0.2, t + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  osc.connect(amp);
  amp.connect(master);
  if (opts.wet && echo) {
    const send = ctx.createGain();
    send.gain.value = opts.wet;
    amp.connect(send);
    send.connect(echo);
  }
  osc.start(t);
  osc.stop(t + decay + 0.05);
}

export function playCue(cue: Cue, index = 0) {
  if (!enabled || !ctx || ctx.state !== "running") return;
  switch (cue) {
    case "keyframe": {
      const f = SCALE[Math.max(0, Math.min(SCALE.length - 1, index))];
      tone(f, { gain: 0.16, decay: 0.9, wet: 0.7 });
      tone(f * 2, { gain: 0.035, decay: 0.45 });
      break;
    }
    case "lock": {
      const now = performance.now();
      if (now - lastLock < 140) return;
      lastLock = now;
      tone(2100, { gain: 0.045, decay: 0.045, type: "triangle" });
      break;
    }
    case "lost":
      tone(196, { gain: 0.14, decay: 0.42, to: 92, type: "triangle" });
      break;
    case "relocalized":
      tone(659.25, { gain: 0.1, decay: 0.22, wet: 0.3 });
      tone(880, { at: 0.11, gain: 0.11, decay: 0.4, wet: 0.5 });
      break;
    case "loop":
      // The loop closes: the scale resolves into a chord.
      [261.63, 392, 523.25, 659.25, 783.99].forEach((f, i) => tone(f, { at: i * 0.085, gain: 0.1, decay: 2.6, wet: 0.5 }));
      tone(130.81, { gain: 0.12, decay: 3 });
      break;
    case "on":
      tone(783.99, { gain: 0.09, decay: 0.3, wet: 0.4 });
      tone(1046.5, { at: 0.09, gain: 0.09, decay: 0.5, wet: 0.5 });
      break;
  }
}

/** Must be called from a user gesture the first time, which is when browsers allow audio to start. */
export function setSound(on: boolean) {
  if (on && !build()) return;
  enabled = on;
  if (ctx && master) {
    if (on && ctx.state === "suspended") void ctx.resume();
    master.gain.setTargetAtTime(on ? 0.85 : 0, ctx.currentTime, 0.05);
    applyWeather();
    if (on) window.setTimeout(() => playCue("on"), 60);
  }
  listeners.forEach((l) => l());
}

export function setSoundWeather(mode: WeatherMode) {
  weather = mode;
  applyWeather();
}
