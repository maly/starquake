import { BRIGHT, CELL, SPECTRUM } from "../constants";
import type { Rgb } from "../types";
import {
  SCREEN_COLS,
  SCREEN_H,
  SCREEN_ROWS,
  SCREEN_W,
  type ScreenBuffers,
} from "./screen";

function paperInk(attr: number): [Rgb, Rgb] {
  const table = attr & 0x40 ? BRIGHT : SPECTRUM;
  return [table[(attr >> 3) & 7]!, table[attr & 7]!];
}

/** Rasterize a full 32×24 screen buffer to RGBA (256×192). */
export function rasterizeScreen(buf: ScreenBuffers, rgba: Uint8ClampedArray): Uint8ClampedArray {
  let p = 0;
  for (let cy = 0; cy < SCREEN_ROWS; cy++) {
    for (let py = 0; py < CELL; py++) {
      for (let cx = 0; cx < SCREEN_COLS; cx++) {
        const idx = cy * SCREEN_COLS + cx;
        const [paper, ink] = paperInk(buf.attr[idx]!);
        const bits = buf.data[idx * CELL + py]!;
        for (let px = 0; px < CELL; px++) {
          const on = bits & (0x80 >> px);
          rgba[p] = on ? ink[0]! : paper[0]!;
          rgba[p + 1] = on ? ink[1]! : paper[1]!;
          rgba[p + 2] = on ? ink[2]! : paper[2]!;
          rgba[p + 3] = 255;
          p += 4;
        }
      }
    }
  }
  return rgba;
}

/**
 * Copy a playfield RGBA (256×144) into a full-screen RGBA at Y=`playY0`.
 * Used when the playfield was rasterized separately (entities stamped in).
 */
export function blitPlayfieldRgba(
  screen: Uint8ClampedArray,
  play: Uint8ClampedArray,
  playY0: number,
  playH: number,
  width: number,
): void {
  const rowBytes = width * 4;
  for (let y = 0; y < playH; y++) {
    const src = y * rowBytes;
    const dst = (y + playY0) * rowBytes;
    screen.set(play.subarray(src, src + rowBytes), dst);
  }
}

export function clearRgbaRows(rgba: Uint8ClampedArray, y0: number, rows: number, width: number, rgb: Rgb = [0, 0, 0]): void {
  const rowBytes = width * 4;
  for (let y = y0; y < y0 + rows; y++) {
    let p = y * rowBytes;
    for (let x = 0; x < width; x++) {
      rgba[p] = rgb[0];
      rgba[p + 1] = rgb[1];
      rgba[p + 2] = rgb[2];
      rgba[p + 3] = 255;
      p += 4;
    }
  }
}

export { SCREEN_W, SCREEN_H };
