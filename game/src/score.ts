import {
  A390_BYTES,
  CORE_LEFT_INIT,
  CORE_SLOTS,
  FRAME_HZ,
  SCORE_DIGITS,
  SCORE_END_BONUS,
  SCORE_KILL_HI_BASE,
} from "./constants";
import type { DacState, EndResult, World } from "./types";
import { beginEndUi } from "./ui/end";

/** Fresh `$A390`: all bits set = unvisited (first-visit awards +250 then clears). */
export function freshA390(): Uint8Array {
  return new Uint8Array(A390_BYTES).fill(0xff);
}

export function zeroScore(): number[] {
  return Array.from({ length: SCORE_DIGITS }, () => 0);
}

/** Add an integer amount into 6 BCD score digits (`$D521` carry semantics). */
export function addScore(world: World, amount: number): void {
  let n = Math.max(0, amount | 0);
  for (let i = SCORE_DIGITS - 1; i >= 0; i--) {
    const sum = (world.scoreDigits[i] ?? 0) + (n % 10);
    world.scoreDigits[i] = sum % 10;
    n = Math.floor(n / 10) + Math.floor(sum / 10);
  }
}

/** `$A2E7`: points = `(hi−$AE)×2` tens. */
export function killScorePoints(ptr: number): number {
  const hi = (ptr >> 8) & 0xff;
  const tens = ((hi - SCORE_KILL_HI_BASE) * 2) & 0xff;
  return tens * 10;
}

/** `$ABBE`-style bit test on `$A390`: true when bit0 after rotate is set (unvisited). */
export function a390Unvisited(a390: Uint8Array, room: number): boolean {
  const high = (room >> 8) & 1;
  const low = room & 0xff;
  const offset = ((high >> 3) | ((low & 0xf8) >> 3)) & 0xff;
  let value = a390[offset] ?? 0;
  for (let i = 0; i < (low & 7) + 1; i++) value = ((value << 1) | (value >> 7)) & 0xff;
  return (value & 1) !== 0;
}

/** `$A801` clear bit on `$A390` after first-visit award. */
export function clearA390Bit(a390: Uint8Array, room: number): void {
  const high = (room >> 8) & 1;
  const low = room & 0xff;
  const offset = ((high >> 3) | ((low & 0xf8) >> 3)) & 0xff;
  const rot = (low & 7) + 1;
  let value = a390[offset] ?? 0;
  for (let i = 0; i < rot; i++) value = ((value << 1) | (value >> 7)) & 0xff;
  value = (value & 0xfe) & 0xff;
  for (let i = 0; i < rot; i++) value = ((value >> 1) | ((value & 1) << 7)) & 0xff;
  a390[offset] = value;
}

/** Adventure = `(visitedCount * 50) >> 8` (`$679C`). */
export function adventureScore(visitedCount: number): number {
  return ((visitedCount * 50) >> 8) & 0xff;
}

export function framesToTime(frames: number): { minutes: number; seconds: number } {
  const totalSec = Math.floor(Math.max(0, frames) / FRAME_HZ);
  return { minutes: Math.floor(totalSec / 60), seconds: totalSec % 60 };
}

/** Same `$DAC6` step as `entities.dacStep` — kept here to avoid a cycle. */
function dac6(d: DacState): void {
  let hl = d.dac0 & 0xffff;
  const bc = hl;
  hl = ((hl << 8) | (hl >> 8)) & 0xffff;
  hl = (hl + bc + 0x29 + (d.dac2 & 0xffff)) & 0xffff;
  d.dac0 = hl;
  d.db19 = (d.db19 - 1) & 0xff;
  if (d.db19 !== 0) return;
  d.db19 = 5;
  let dac2 = d.dac2 & 0xffff;
  hl = (dac2 * 16 + dac2 + 0xc5 + (d.dac4 & 0xffff)) & 0xffff;
  d.dac2 = hl;
  d.db1a = (d.db1a - 1) & 0xff;
  if (d.db1a !== 0) return;
  d.db1a = 0x0b;
  hl = d.dac4 & 0xffff;
  hl = (((hl + hl + (d.dac0 & 0xffff)) & 0xffff) + (hl + hl + (d.dac0 & 0xffff)) + 0x4bbb) & 0xffff;
  d.dac4 = hl;
}

/**
 * `$64A0` after +1000: seed `$DAC0` from `$D413`..`$D415` + adventure A,
 * 30× `$DAC6`, then `$D416`/`$D417` = `$DAC0 % 10`, `$D418` = 5 or 0.
 */
export function scrambleEndDigits(world: World, adventure: number): void {
  const d0 = world.scoreDigits[0] ?? 0;
  const d1 = world.scoreDigits[1] ?? 0;
  const d2 = world.scoreDigits[2] ?? 0;
  const a = adventure & 0xff;
  world.dac.dac0 = (d0 | (d1 << 8)) & 0xffff;
  world.dac.dac2 = (d2 | (a << 8)) & 0xffff;
  world.dac.dac4 = (a | (a << 8)) & 0xffff;
  world.dac.db19 = 3;
  world.dac.db1a = 3;
  for (let i = 0; i < 0x1e; i++) dac6(world.dac);
  for (let i = 3; i <= 4; i++) {
    dac6(world.dac);
    let v = world.dac.dac0 & 0xff;
    while (v >= 10) v -= 10;
    world.scoreDigits[i] = v;
  }
  world.scoreDigits[5] = (world.dac.dac0 >> 8) & 1 ? 5 : 0;
}

/**
 * `$64A0` then `$6730`: +1000, scramble low digits, compose EndResult.
 * Hi-score `$64FA` is not written. UI is the Spectrum bitmap, not HTML.
 */
export function composeEndResult(world: World, victory: boolean, banner?: string): EndResult {
  addScore(world, SCORE_END_BONUS);
  const adventure = adventureScore(world.visitedCount);
  scrambleEndDigits(world, adventure);
  const time = framesToTime(world.frames);
  const result: EndResult = {
    scoreDigits: world.scoreDigits.slice(),
    adventure,
    timeMinutes: time.minutes,
    timeSeconds: time.seconds,
    coresReplaced: CORE_LEFT_INIT - (world.coresLeft & 0xff),
    victory,
    banner,
  };
  world.endResult = result;
  world.victory = victory;
  world.gameOver = true;
  world.ui = beginEndUi(victory, result);
  return result;
}

export function formatScore(digits: number[]): string {
  return digits.map((d) => String(d & 0xf)).join("");
}

export function formatTime(minutes: number, seconds: number): string {
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return `${mm}.${ss}`;
}

export function coresNeeded(d2de: number[]): number {
  let n = 0;
  for (let i = 0; i < CORE_SLOTS; i++) if ((d2de[i] ?? 0) & 0x80) n += 1;
  return n;
}
