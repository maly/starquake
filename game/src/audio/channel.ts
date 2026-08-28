import { SFX_CPU_HZ, SFX_SAMPLE_RATE } from "./synth";
import type { World } from "../types";

/** `$A607` 16×4 B, index = A−1 (`$A5DE DEC A / *4`). */
export const CHAN_TABLE: ReadonlyArray<readonly [number, number, number, number]> = [
  [0x0a, 0x0c, 0x03, 0x64],
  [0x09, 0x0c, 0x03, 0x00],
  [0x0a, 0x5a, 0x00, 0x0d],
  [0x0e, 0x18, 0x0c, 0xf3],
  [0x06, 0xc8, 0xf7, 0xfa],
  [0x46, 0xc8, 0xeb, 0xfa],
  [0x01, 0x96, 0x00, 0x00],
  [0x03, 0x78, 0x0a, 0x0f],
  [0x3f, 0x00, 0x00, 0x1a],
  [0x05, 0x1d, 0x0c, 0x1a],
  [0x04, 0x3b, 0x05, 0x21],
  [0x42, 0x0c, 0xf4, 0xff],
  [0x1e, 0x00, 0x00, 0x1e],
  [0x4a, 0x0c, 0x03, 0xc8],
  [0x49, 0x78, 0x03, 0x00],
  [0x00, 0x00, 0x00, 0x00],
];

export const CHAN_FIRE = 5;
export const CHAN_FALL = 6;
export const CHAN_LAND = 7;
export const CHAN_PLATFORM = 8;
export const CHAN_DEATH = 9;
export const CHAN_KILL = 0x0b;
export const CHAN_AMBIENT_BASE = 0x0c;
/** `$C87B CP $F7` — fire shot skipped while this increment is live. */
export const CHAN_FIRE_DELTA = 0xf7;

const PCM_LEVEL = 12000;
const FRAME_HZ = 50;
const OUTER_T = 23;
const INNER_T = 35;

export function emptyChan(): World["chan"] {
  return { req0: 0, req1: 0, dur: 0, pitch: 0, delta: 0, noise: 0, count: 0, reload: 0 };
}

export function requestA41B(world: World, a: number): void {
  if (!Number.isInteger(a) || a < 1 || a > 16) return;
  world.chan.req0 = a;
}

export function requestA41C(world: World, a: number): void {
  if (!Number.isInteger(a) || a < 1 || a > 16) return;
  world.chan.req1 = a;
}

export function fireSoundBusy(world: World): boolean {
  return world.chan.dur !== 0 && world.chan.delta === CHAN_FIRE_DELTA;
}

function load(world: World, a: number): void {
  const rec = CHAN_TABLE[a - 1];
  if (!rec) return;
  const b0 = rec[0]!;
  world.chan.dur = b0 & 0x3f;
  world.chan.pitch = rec[1]!;
  world.chan.delta = rec[2]!;
  world.chan.noise = rec[3]!;
  const r = ((b0 >> 6) & 3) + 1;
  world.chan.count = r;
  world.chan.reload = r;
}

function framePcm(e: number): Int16Array {
  const n = e === 0 ? 256 : e;
  const halfT = OUTER_T + INNER_T * n;
  const nSamp = Math.round(SFX_SAMPLE_RATE / FRAME_HZ);
  const tPer = SFX_CPU_HZ / SFX_SAMPLE_RATE;
  const pcm = new Int16Array(nSamp);
  let acc = 0;
  let speaker = 1;
  for (let i = 0; i < nSamp; i++) {
    acc += tPer;
    while (acc >= halfT) {
      acc -= halfT;
      speaker ^= 1;
    }
    pcm[i] = speaker ? PCM_LEVEL : -PCM_LEVEL;
  }
  return pcm;
}

/**
 * `$A57B` once per 50 Hz tick. A41B interrupts; A41C starts when A41D=0.
 * Ambient `$A5CA`: if idle and `$DAC0<$04`, queue `($DAC1∧3)+$0C`.
 */
export function tickChannel(world: World): void {
  const ch = world.chan;
  if (ch.req0) {
    load(world, ch.req0);
    ch.req0 = 0;
  } else if (ch.dur === 0) {
    if (ch.req1) {
      load(world, ch.req1);
      ch.req1 = 0;
    } else {
      const dac0 = world.dac.dac0 & 0xff;
      if (dac0 < 4) {
        const dac1 = (world.dac.dac0 >> 8) & 0xff;
        ch.req1 = (dac1 & 3) + CHAN_AMBIENT_BASE;
      }
      return;
    }
  }
  ch.count = (ch.count - 1) & 0xff;
  if (ch.count !== 0) return;
  ch.count = ch.reload;
  ch.dur = (ch.dur - 1) & 0xff;
  ch.pitch = (ch.pitch + ch.delta) & 0xff;
  const e = ((ch.pitch ^ ch.noise) >> 1) & 0x7f;
  ch.noise = (ch.noise + 1) & 0xff;
  world.buzz.push(framePcm(e));
}
