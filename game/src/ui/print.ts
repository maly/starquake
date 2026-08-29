import { CELL } from "../constants";
import { FONT_ADD4, FONT_COUNT, FONT_FIRST } from "./font-data";
import { SCREEN_COLS, SCREEN_ROWS, cellIndex, type ScreenBuffers } from "./screen";

/** Spectrum-like print state for $D3C1 strings (AT/INK/PAPER/BRIGHT/OVER). */
export interface PrintState {
  row: number;
  col: number;
  ink: number;
  paper: number;
  bright: number;
  flash: number;
  over: number;
  /** INK 8 keeps existing cell ink. */
  transparentInk: boolean;
}

export function newPrintState(): PrintState {
  return {
    row: 0,
    col: 0,
    ink: 7,
    paper: 0,
    bright: 0,
    flash: 0,
    over: 0,
    transparentInk: false,
  };
}

/** ZX ROM mosaic `$80`–`$8F`: 2×2 quadrants, 4×4 px each (PO_GR). */
function mosaicBytes(code: number): number[] {
  const n = code & 0x0f;
  const top = (n & 1 ? 0xf0 : 0) | (n & 2 ? 0x0f : 0);
  const bot = (n & 4 ? 0xf0 : 0) | (n & 8 ? 0x0f : 0);
  return [top, top, top, top, bot, bot, bot, bot];
}

function glyphBytes(code: number): Uint8Array | number[] | null {
  if (code >= 0x80 && code <= 0x8f) return mosaicBytes(code);
  const idx = code - FONT_FIRST;
  if (idx < 0 || idx >= FONT_COUNT) return null;
  return FONT_ADD4.subarray(idx * 8, idx * 8 + 8);
}

function writeAttr(buf: ScreenBuffers, row: number, col: number, st: PrintState): void {
  const idx = cellIndex(row, col);
  let ink = st.ink & 7;
  if (st.transparentInk) ink = buf.attr[idx]! & 7;
  const attr =
    ((st.flash & 1) << 7) | ((st.bright & 1) << 6) | ((st.paper & 7) << 3) | ink;
  if (st.over) {
    // OVER 1: leave attr (ROM still updates; we keep existing for overlay flash paths)
    return;
  }
  buf.attr[idx] = attr;
}

export function plotChar(buf: ScreenBuffers, st: PrintState, code: number): void {
  const g = glyphBytes(code);
  if (!g) {
    st.col = (st.col + 1) & 0x1f;
    return;
  }
  const { row, col } = st;
  if (row >= 0 && row < SCREEN_ROWS && col >= 0 && col < SCREEN_COLS) {
    const dst = cellIndex(row, col) * CELL;
    if (st.over) {
      for (let py = 0; py < CELL; py++) buf.data[dst + py]! ^= g[py]!;
    } else {
      for (let py = 0; py < CELL; py++) buf.data[dst + py] = g[py]!;
    }
    writeAttr(buf, row, col, st);
  }
  st.col = (st.col + 1) & 0x1f;
}

/**
 * Interpret a Spectrum control-code string the way `$D3C1` → `PRINT_A_2` does.
 * Terminates on `$FF` (not sent to ROM). Returns bytes consumed including `$FF`.
 */
export function printMessage(buf: ScreenBuffers, st: PrintState, bytes: ArrayLike<number>, start = 0): number {
  let i = start;
  while (i < bytes.length) {
    const b = bytes[i]! & 0xff;
    i += 1;
    if (b === 0xff) break;
    if (b === 0x10) {
      // INK n
      const n = bytes[i]! & 0xff;
      i += 1;
      st.transparentInk = n === 8;
      if (n <= 7) st.ink = n;
      continue;
    }
    if (b === 0x11) {
      st.paper = bytes[i]! & 7;
      i += 1;
      continue;
    }
    if (b === 0x12) {
      st.flash = bytes[i]! & 1;
      i += 1;
      continue;
    }
    if (b === 0x13) {
      st.bright = bytes[i]! & 1;
      i += 1;
      continue;
    }
    if (b === 0x15) {
      st.over = bytes[i]! & 1;
      i += 1;
      continue;
    }
    if (b === 0x16) {
      st.row = bytes[i]! & 0xff;
      st.col = bytes[i + 1]! & 0xff;
      i += 2;
      continue;
    }
    if (b === 0x08) {
      st.col = (st.col - 1) & 0x1f;
      continue;
    }
    if (b >= 0x20) plotChar(buf, st, b);
  }
  return i - start;
}

/** Encode ASCII (or raw bytes) plus `$FF` terminator. */
export function encodePrintString(text: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) out.push(text.charCodeAt(i) & 0xff);
  out.push(0xff);
  return out;
}

export function atInkString(row: number, col: number, text: string, opts?: { ink?: number; bright?: number }): number[] {
  const out: number[] = [0x16, row & 0xff, col & 0xff];
  if (opts?.bright !== undefined) out.push(0x13, opts.bright & 1);
  if (opts?.ink !== undefined) out.push(0x10, opts.ink & 0xff);
  for (let i = 0; i < text.length; i++) out.push(text.charCodeAt(i) & 0xff);
  out.push(0xff);
  return out;
}

export function glyphPresent(code: number): boolean {
  return code >= FONT_FIRST && code < FONT_FIRST + FONT_COUNT;
}
