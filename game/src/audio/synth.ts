import { SFX_HANG, SFX_TABLE } from "./effects";

/** 48K CPU. Period between `OUT` is 112+45D or 134+45D T-states. */
export const SFX_CPU_HZ = 3_500_000;
export const SFX_SAMPLE_RATE = 44100;
const DELAY_T = 45;
const PERIOD_BIT7_0 = 112;
const PERIOD_BIT7_1 = 134;
const PCM_LEVEL = 12000;
const MAX_OUT = 1_000_000;

export interface SfxSim {
  nOut: number;
  pcm: Int16Array;
}

const simCache = new Map<number, SfxSim>();

function periodT(d: number, bit7: boolean): number {
  const base = bit7 ? PERIOD_BIT7_1 : PERIOD_BIT7_0;
  const delay = d === 0 ? 256 : d;
  return base + DELAY_T * delay;
}

/**
 * Simulate `$D7C0` for one table index. No hang on L=0 (`$17`).
 * `nOut` counts `OUT ($FE)` (probe: `$0C`=46, `$14`=10, `$12`=65).
 */
export function simulateSfx(index: number): SfxSim {
  const hit = simCache.get(index);
  if (hit) return hit;
  const rec = SFX_TABLE[index];
  if (!rec || index === SFX_HANG) {
    const empty: SfxSim = { nOut: 0, pcm: new Int16Array(0) };
    simCache.set(index, empty);
    return empty;
  }
  const [h0, h1, l0, x, f] = rec;
  if (l0 === 0 && (f & 0x40) === 0) {
    const empty: SfxSim = { nOut: 0, pcm: new Int16Array(0) };
    simCache.set(index, empty);
    return empty;
  }

  const bit6 = (f & 0x40) !== 0;
  const bit5 = (f & 0x20) !== 0;
  const bit7 = (f & 0x80) !== 0;
  const nMask = f & 0x1f;
  const rounds = nMask === 0 ? 256 : nMask;
  const tStates: number[] = [];
  const signs: number[] = [];

  for (let i = 0; i < rounds; i++) {
    const aPrime = (nMask - i) & 0xff;
    let l = l0;
    if (bit6) {
      l = bit5 ? (l - aPrime) & 0xff : (l + aPrime) & 0xff;
      if (l === 0) l = 1;
    }
    if (l === 0) break;

    let h = h0;
    let b = h;
    let speaker = 0;
    let steps = 0;
    for (;;) {
      let d = (h & b) ^ x;
      if (bit7) d = (((d >> 1) - h) & 0xff) & 0x3f;
      tStates.push(periodT(d, bit7));
      signs.push(speaker ? PCM_LEVEL : -PCM_LEVEL);
      speaker ^= 1;
      if (tStates.length >= MAX_OUT) break;

      const carry = b < l;
      b = (b - l) & 0xff;
      if (!carry) continue;
      if (h === h1) break;
      h = h < h1 ? (h + 1) & 0xff : (h - 1) & 0xff;
      b = h;
      steps += 1;
      if (steps > 512) break;
    }
    if (tStates.length >= MAX_OUT) break;
  }

  let cursorT = 0;
  let sampleIdx = 0;
  const samples: number[] = [];
  for (let i = 0; i < tStates.length; i++) {
    cursorT += tStates[i]!;
    const end = Math.round((cursorT * SFX_SAMPLE_RATE) / SFX_CPU_HZ);
    const amp = signs[i]!;
    while (sampleIdx < end) {
      samples.push(amp);
      sampleIdx += 1;
    }
  }
  const sim: SfxSim = { nOut: tStates.length, pcm: Int16Array.from(samples) };
  simCache.set(index, sim);
  return sim;
}

/** Cached Int16 PCM at 44100 Hz (empty for `$17`). */
export function sfxPcm(index: number): Int16Array {
  return simulateSfx(index).pcm;
}
