import { CELL, SCORE_DIGITS } from "../constants";
import type { Prepared, World } from "../types";
import { barGlyphs, clampStat } from "./bars";
import { newPrintState, printMessage, type PrintState } from "./print";
import { SCREEN_COLS, cellIndex, type ScreenBuffers } from "./screen";
import { UDG_CHROME } from "./udg-chrome";

/** `$EA65`-style blit of a chrome UDG at full-screen (row, col). */
export function blitChromeUdg(buf: ScreenBuffers, id: number, row: number, col: number): void {
  const udg = UDG_CHROME[id];
  if (!udg) return;
  for (const cell of udg.cells) {
    const cy = row + cell.row;
    const cx = col + cell.col;
    if (cy < 0 || cy >= 24 || cx < 0 || cx >= SCREEN_COLS) continue;
    const idx = cellIndex(cy, cx);
    buf.attr[idx] = cell.attr & 0xff;
    const dst = idx * CELL;
    for (let py = 0; py < CELL; py++) buf.data[dst + py] = cell.data[py]!;
  }
}

/**
 * `$D3DF` + `$A442`…`$A459`: frame + four panels.
 * Call once per room enter / chrome rebuild (not every frame).
 */
export function drawChrome(buf: ScreenBuffers): void {
  // `$D3DF` BC=$0001 → left `$91` at (0,1)
  blitChromeUdg(buf, 0x91, 0, 1);
  let c = 1 + 3; // after $91, ADD A,$03 → col 4
  // five `$93` pairs: cols 4, 8, 13, 18, 22 then right `$92` at 28
  for (let e = 5; e > 0; e--) {
    blitChromeUdg(buf, 0x93, 0, c);
    blitChromeUdg(buf, 0x93, 5, c);
    c += 4;
    if (e === 4 || e === 3) c += 1;
  }
  c += 2;
  blitChromeUdg(buf, 0x92, 0, c);
  // panels
  blitChromeUdg(buf, 0x94, 0, 2);
  blitChromeUdg(buf, 0x95, 0, 10);
  blitChromeUdg(buf, 0x96, 0, 18);
  blitChromeUdg(buf, 0x97, 0, 26);
}

function printBytes(buf: ScreenBuffers, bytes: number[], st?: PrintState): void {
  printMessage(buf, st ?? newPrintState(), bytes);
}

/** `$D521` / `$D54D`: six score digits AT (2,3) BRIGHT 1 INK 7. */
export function drawScore(buf: ScreenBuffers, digits: number[], st?: PrintState): void {
  const text = digits
    .slice(0, SCORE_DIGITS)
    .map((d) => String((d | 0) % 10))
    .join("")
    .padStart(SCORE_DIGITS, "0");
  printBytes(buf, [0x16, 2, 3, 0x13, 1, 0x10, 7, ...[...text].map((ch) => ch.charCodeAt(0)), 0xff], st);
}

/** Lives two digits AT (3,11) INK 6 (BRIGHT inherited from score in `$D425`). */
export function drawLives(buf: ScreenBuffers, lives: number, st?: PrintState): void {
  const text = String(lives & 0xff).padStart(2, "0").slice(-2);
  printBytes(buf, [0x16, 3, 11, 0x10, 6, ...[...text].map((ch) => ch.charCodeAt(0)), 0xff], st);
}

/**
 * Blank bar region then three E/P/F bars (`$D43C`…`$D463`).
 * Blank colours: energy INK2+INK4, platforms INK7, fire INK6; bars print INK 8.
 * Pass the same `PrintState` as score/lives so BRIGHT 1 from `$D550` persists (ROM channel).
 */
export function drawBars(
  buf: ScreenBuffers,
  energy: number,
  platforms: number,
  firepower: number,
  st?: PrintState,
): void {
  const ps = st ?? newPrintState();
  // blank (same DEFM as `$D443`…`$D462`)
  printBytes(
    buf,
    [
      0x16, 1, 16, 0x10, 2, 0x20, 0x10, 4, 0x20, 0x20, 0x20, 0x16, 2, 16, 0x10, 7, 0x20, 0x20, 0x20,
      0x20, 0x16, 3, 16, 0x10, 6, 0x20, 0x20, 0x20, 0x20, 0x10, 8, 0xff,
    ],
    ps,
  );
  const values = [clampStat(energy), clampStat(platforms), clampStat(firepower)];
  // `$D463` walks fire→plat→energy with AT y = 3,2,1; engine draws energy,plat,fire at y=1,2,3
  const rows = [1, 2, 3];
  const ordered = [values[0]!, values[1]!, values[2]!];
  for (let i = 0; i < 3; i++) {
    const glyphs = barGlyphs(ordered[i]!);
    const row = rows[i]!;
    // ROM bar cells inherit INK 8 from the blank trailer; no per-glyph INK.
    const msg: number[] = [0x16, row, 16];
    for (const g of glyphs) msg.push(g);
    msg.push(0xff);
    printBytes(buf, msg, ps);
  }
}

/** Clear inventory strip then draw up to 4×2×2 sprites at cols 21/23/25/27 row 1. */
export function drawInventory(
  buf: ScreenBuffers,
  prep: Prepared | null,
  world: World,
  st?: PrintState,
): void {
  // `$D4A7`: blanks with inherited INK 8 + BRIGHT from `$D425` channel
  printBytes(
    buf,
    [
      0x16, 1, 21, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x16, 2, 21, 0x20, 0x20, 0x20,
      0x20, 0x20, 0x20, 0x20, 0x20, 0xff,
    ],
    st,
  );
  if (!prep) return;
  const cols = [21, 23, 25, 27];
  for (let i = 0; i < world.inventory.length && i < 4; i++) {
    const it = world.inventory[i]!;
    if ((it.sprite & 0xff) === 0 && (it.attr & 0xff) === 0) continue;
    const sprite = prep.sprites[it.sprite];
    if (!sprite) continue;
    const attr = ((it.attr & 7) | 0x40) & 0xff;
    const col0 = cols[i]!;
    const row0 = 1;
    for (const cell of sprite.cells) {
      const cy = row0 + cell.row;
      const cx = col0 + cell.col;
      if (cy < 0 || cy >= 24 || cx < 0 || cx >= SCREEN_COLS) continue;
      const idx = cellIndex(cy, cx);
      const dst = idx * CELL;
      for (let py = 0; py < CELL; py++) buf.data[dst + py]! ^= cell.data[py]!;
      buf.attr[idx] = attr;
    }
  }
}

/** Full `$D425` dynamic status over existing chrome. */
export function drawStatus(buf: ScreenBuffers, world: World, prep: Prepared | null = null): void {
  // One print channel for the whole `$D425` (BRIGHT from score carries into lives/bars/inv).
  const st = newPrintState();
  drawScore(buf, world.scoreDigits, st);
  drawLives(buf, world.lives, st);
  drawBars(buf, world.energy, world.platforms, world.firepower, st);
  drawInventory(buf, prep, world, st);
}

/** Cap live stats in world (energy/platforms/firepower) to `$7F`. */
export function clampWorldStats(world: World): void {
  world.energy = clampStat(world.energy);
  world.platforms = clampStat(world.platforms);
  world.firepower = clampStat(world.firepower);
}
