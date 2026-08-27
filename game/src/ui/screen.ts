import { CELL, CLEAR_ATTR, COLS, ROWS } from "../constants";

/** Full Spectrum bitmap: HUD rows 0–5 + playfield 6–23. */
export const SCREEN_COLS = 32;
export const SCREEN_ROWS = 24;
export const SCREEN_W = SCREEN_COLS * CELL;
export const SCREEN_H = SCREEN_ROWS * CELL;
/** Playfield starts at character row 6 ($A80A). */
export const PLAY_ROW0 = 6;
export const PLAY_Y0 = PLAY_ROW0 * CELL;
/** Display CSS size (2× nearest-neighbour). */
export const DISPLAY_W = SCREEN_W * 2;
export const DISPLAY_H = SCREEN_H * 2;

export interface ScreenBuffers {
  data: Uint8Array;
  attr: Uint8Array;
}

export function newScreenBuffers(): ScreenBuffers {
  return {
    data: new Uint8Array(SCREEN_COLS * SCREEN_ROWS * CELL),
    attr: new Uint8Array(SCREEN_COLS * SCREEN_ROWS),
  };
}

export function clearScreen(buf: ScreenBuffers, attr = 0): void {
  buf.data.fill(0);
  buf.attr.fill(attr);
}

/** $A647: clear playfield rows 6–23 to blank + ATTR $47; HUD untouched. */
export function clearPlayfield(buf: ScreenBuffers): void {
  for (let row = PLAY_ROW0; row < SCREEN_ROWS; row++) {
    const base = row * SCREEN_COLS;
    for (let col = 0; col < SCREEN_COLS; col++) {
      const idx = base + col;
      buf.attr[idx] = CLEAR_ATTR;
      const dst = idx * CELL;
      for (let py = 0; py < CELL; py++) buf.data[dst + py] = 0;
    }
  }
}

/** Copy a 32×18 playfield buffer into full-screen rows 6–23. */
export function pastePlayfield(
  screen: ScreenBuffers,
  play: { data: Uint8Array; attr: Uint8Array },
): void {
  for (let row = 0; row < ROWS; row++) {
    const sBase = (row + PLAY_ROW0) * SCREEN_COLS;
    const pBase = row * COLS;
    for (let col = 0; col < COLS; col++) {
      screen.attr[sBase + col] = play.attr[pBase + col]!;
      const sDst = (sBase + col) * CELL;
      const pDst = (pBase + col) * CELL;
      for (let py = 0; py < CELL; py++) screen.data[sDst + py] = play.data[pDst + py]!;
    }
  }
}

export function cellIndex(row: number, col: number): number {
  return row * SCREEN_COLS + col;
}

export function newScreenRgba(): Uint8ClampedArray {
  return new Uint8ClampedArray(SCREEN_W * SCREEN_H * 4);
}
