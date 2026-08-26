import {
  A390_BYTES,
  CORE_LEFT_INIT,
  CORE_SLOTS,
  FRAME_HZ,
  SCORE_DIGITS,
  SCORE_END_BONUS,
  SCORE_KILL_HI_BASE,
} from "./constants";
import type { EndResult, World } from "./types";

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

/**
 * `$64A0` then `$6730`: +1000 (scramble of low digits skipped — +1000 only),
 * compose EndResult. Hi-score `$64FA` not written.
 */
export function composeEndResult(world: World, victory: boolean, banner?: string): EndResult {
  addScore(world, SCORE_END_BONUS);
  const time = framesToTime(world.frames);
  const result: EndResult = {
    scoreDigits: world.scoreDigits.slice(),
    adventure: adventureScore(world.visitedCount),
    timeMinutes: time.minutes,
    timeSeconds: time.seconds,
    coresReplaced: CORE_LEFT_INIT - (world.coresLeft & 0xff),
    victory,
    banner,
  };
  world.endResult = result;
  world.victory = victory;
  world.gameOver = true;
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
