import type { World } from "../types";
import { SFX_HANG } from "./effects";
import { SFX_SAMPLE_RATE, sfxPcm } from "./synth";

const LS_MUTED = "starquake.audio.muted";
const LS_BGM_MUTED = "starquake.audio.bgmMuted";
const LS_SFX_GAIN = "starquake.audio.sfxGain";
const LS_BGM_GAIN = "starquake.audio.bgmGain";

const BGM_URL = "bgm.mp3";

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === "1" || v === "true";
  } catch {
    return fallback;
  }
}

function readNum(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? clamp01(n) : fallback;
  } catch {
    return fallback;
  }
}

let muted = readBool(LS_MUTED, false);
let bgmMuted = readBool(LS_BGM_MUTED, false);
let sfxGainValue = readNum(LS_SFX_GAIN, 0.75);
let bgmGainValue = readNum(LS_BGM_GAIN, 0.4);

let ctx: AudioContext | null = null;
let sfxGain: GainNode | null = null;
let bgmGain: GainNode | null = null;
let bgmEl: HTMLAudioElement | null = null;
let bgmSource: MediaElementAudioSourceNode | null = null;
let unlocked = false;
let nextSfxAt = 0;
let resumeWait: Promise<void> | null = null;
const PENDING_MAX = 32;
const pending: number[] = [];
const bufferCache = new Map<number, AudioBuffer>();

function persist(): void {
  try {
    localStorage.setItem(LS_MUTED, muted ? "1" : "0");
    localStorage.setItem(LS_BGM_MUTED, bgmMuted ? "1" : "0");
    localStorage.setItem(LS_SFX_GAIN, String(sfxGainValue));
    localStorage.setItem(LS_BGM_GAIN, String(bgmGainValue));
  } catch {
    /* private mode */
  }
}

function audioContextCtor(): typeof AudioContext | null {
  if (typeof AudioContext !== "undefined") return AudioContext;
  const w = globalThis as unknown as { webkitAudioContext?: typeof AudioContext };
  return w.webkitAudioContext ?? null;
}

function applyGains(): void {
  if (sfxGain) sfxGain.gain.value = muted ? 0 : sfxGainValue;
  if (bgmGain) bgmGain.gain.value = muted || bgmMuted ? 0 : bgmGainValue;
  if (!bgmEl) return;
  if (muted || bgmMuted || !unlocked) {
    bgmEl.pause();
    return;
  }
  const p = bgmEl.play();
  if (p && typeof p.catch === "function") p.catch(() => undefined);
}

function setupBgm(ac: AudioContext): void {
  if (bgmEl) return;
  const el = new Audio(BGM_URL);
  el.loop = true;
  el.preload = "auto";
  el.addEventListener("error", () => {
    console.warn("starquake: bgm.mp3 missing or unreadable; BGM silent");
  });
  bgmEl = el;
  try {
    bgmSource = ac.createMediaElementSource(el);
    bgmSource.connect(bgmGain ?? ac.destination);
  } catch {
    console.warn("starquake: cannot attach bgm.mp3 to AudioContext; BGM silent");
  }
}

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = audioContextCtor();
  if (!Ctor) return null;
  const ac = new Ctor({ sampleRate: SFX_SAMPLE_RATE });
  sfxGain = ac.createGain();
  bgmGain = ac.createGain();
  sfxGain.connect(ac.destination);
  bgmGain.connect(ac.destination);
  setupBgm(ac);
  ctx = ac;
  applyGains();
  return ac;
}

function bufferFor(ac: AudioContext, id: number): AudioBuffer | null {
  const hit = bufferCache.get(id);
  if (hit) return hit;
  const pcm = sfxPcm(id);
  if (pcm.length === 0) return null;
  const buf = ac.createBuffer(1, pcm.length, SFX_SAMPLE_RATE);
  const ch = buf.getChannelData(0);
  const scale = 1 / 32768;
  for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i]! * scale;
  bufferCache.set(id, buf);
  return buf;
}

function enqueueSfx(id: number): void {
  if (pending.length >= PENDING_MAX) pending.shift();
  pending.push(id);
}

function startSfx(ac: AudioContext, id: number): void {
  if (muted) return;
  const buf = bufferFor(ac, id);
  if (!buf || !sfxGain) return;
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.connect(sfxGain);
  const t = Math.max(ac.currentTime, nextSfxAt);
  src.start(t);
  nextSfxAt = t + buf.duration;
}

function flushPending(): void {
  const ac = ctx;
  if (!ac || ac.state === "suspended") return;
  const ids = pending.splice(0, pending.length);
  for (const id of ids) startSfx(ac, id);
}

function kickResume(ac: AudioContext): void {
  if (ac.state !== "suspended") {
    flushPending();
    return;
  }
  if (resumeWait) return;
  // Must run inside a user-gesture stack (unlock). rAF / drainSfx must not call this.
  const p = ac.resume();
  resumeWait = Promise.resolve(p).then(
    () => {
      resumeWait = null;
      flushPending();
      applyGains();
    },
    () => {
      resumeWait = null;
    },
  );
}

/**
 * Create/resume AudioContext. Call only from a user gesture (keydown, click, …).
 * Creating or resuming from the 50 Hz loop trips Chrome's autoplay policy.
 */
export function unlock(): void {
  unlocked = true;
  const ac = ensureCtx();
  if (ac) kickResume(ac);
  applyGains();
}

export function playSfx(id: number): void {
  if (!Number.isInteger(id) || id < 0 || id > 0x17 || id === SFX_HANG) return;
  if (muted) return;
  if (!unlocked || !ctx || ctx.state === "suspended") {
    enqueueSfx(id);
    return;
  }
  startSfx(ctx, id);
}

/** Drain `world.sfx` into Web Audio. Safe when the context is locked. */
export function drainSfx(world: World): void {
  for (const id of world.sfx) playSfx(id);
  world.sfx.length = 0;
}

export function setMuted(value: boolean): void {
  muted = value;
  persist();
  applyGains();
}

export function setBgmMuted(value: boolean): void {
  bgmMuted = value;
  persist();
  applyGains();
}

export function setSfxGain(value: number): void {
  sfxGainValue = clamp01(value);
  persist();
  applyGains();
}

export function setBgmGain(value: number): void {
  bgmGainValue = clamp01(value);
  persist();
  applyGains();
}

export function isMuted(): boolean {
  return muted;
}

export function isBgmMuted(): boolean {
  return bgmMuted;
}

export function getSfxGain(): number {
  return sfxGainValue;
}

export function getBgmGain(): number {
  return bgmGainValue;
}

function bindCheck(id: string, checked: boolean, onChange: (on: boolean) => void): void {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLInputElement)) return;
  el.checked = checked;
  el.addEventListener("change", () => onChange(el.checked));
}

function bindRange(id: string, value: number, onChange: (v: number) => void): void {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLInputElement)) return;
  el.value = String(Math.round(value * 100));
  el.addEventListener("input", () => onChange(Number(el.value) / 100));
}

/** Wire the viewer audio strip. Missing nodes are ignored (dump / tests). */
export function wireAudioUi(): void {
  bindCheck("audio-sfx", !muted, (on) => {
    unlock();
    setMuted(!on);
  });
  bindCheck("audio-bgm", !bgmMuted, (on) => {
    unlock();
    setBgmMuted(!on);
  });
  bindRange("audio-sfx-gain", sfxGainValue, (v) => {
    unlock();
    setSfxGain(v);
  });
  bindRange("audio-bgm-gain", bgmGainValue, (v) => {
    unlock();
    setBgmGain(v);
  });
}
