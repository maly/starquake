import {
  CELL,
  DEFAULT_UDK,
  DEFINE_GRID_KEYS,
  DEFINE_LABELS,
  INTRO_LINE2,
  INTRO_LINE3,
  INTRO_LINE4,
  INTRO_LINE5,
  INTRO_LINE6,
  INTRO_LINE7,
  INTRO_TITLE,
  MENU_BAR_H,
  MENU_BAR_V,
  MENU_CONTROL_DEFAULT,
  MENU_CORNERS,
  MENU_FOOT_COL_L,
  MENU_FOOT_COL_R,
  MENU_FOOT_L,
  MENU_FOOT_R,
  MENU_FOOT_ROW,
  MENU_GOODBYE,
  MENU_INK_DISABLED,
  MENU_INK_IDLE,
  MENU_INK_SELECTED,
  MENU_INK_STATIC,
  MENU_KEYS_4,
  MENU_OLLY_COL,
  MENU_OLLY_ROW,
  MENU_OLLY_UDG,
  MENU_QUIT_HINT,
  MENU_QUIT_MSG,
  MENU_QUIT_YN,
  MENU_SFX_DEFINE,
  MENU_SFX_SELECT,
  MENU_TITLE,
  MENU_TITLE_COL,
  MENU_TITLE_ROW,
  MENU_TITLE_UDG90,
  PAUSE_END,
  PAUSE_LOAD,
  PAUSE_SAVE,
  SPLASH_HINT,
  SPLASH_HINT_COL,
  SPLASH_HINT_ROW,
} from "../constants";
import { requestSfx } from "../audio/effects";
import type { Prepared, World } from "../types";
import { resolveEad3Attr } from "./ead3";
import { newPrintState, printMessage } from "./print";
import { SCREEN_COLS, cellIndex, clearScreen, type ScreenBuffers } from "./screen";

export type MenuPhase = "splash" | "options" | "define" | "intro" | "quit" | "goodbye";

export interface MenuOpts {
  control?: number;
  udk?: string[];
}

export interface MenuUi {
  kind: "menu";
  phase: MenuPhase;
  /** `$5E58` 1–5. */
  control: number;
  /** Six UDK keys `$5E6B`…PAUSE. */
  udk: string[];
  /** `$6230` index 0…5 while `phase === "define"`. */
  defineStep: number;
  /** Live `$6109` (ASCII or `$90+n`). */
  defineGrid: number[];
  defineNeedRelease: boolean;
}

export type PauseStatus = "" | "GAME SAVED" | "GAME LOADED" | "NO SAVE" | "SAVE INVALID";

export interface PauseUi {
  kind: "pause";
  status: PauseStatus;
}

export type PauseAction = "stay" | "resume" | "end" | "save" | "load";

function defaultUdk(udk?: string[]): string[] {
  return udk && udk.length >= 6 ? udk.slice(0, 6) : [...DEFAULT_UDK];
}

export function beginMenuUi(opts?: MenuOpts): MenuUi {
  return {
    kind: "menu",
    phase: "options",
    control: opts?.control ?? MENU_CONTROL_DEFAULT,
    udk: defaultUdk(opts?.udk),
    defineStep: 0,
    defineGrid: [],
    defineNeedRelease: false,
  };
}

export function beginSplashUi(opts?: MenuOpts): MenuUi {
  const ui = beginMenuUi(opts);
  ui.phase = "splash";
  return ui;
}

export function beginPauseUi(): PauseUi {
  return { kind: "pause", status: "" };
}

function printAt(buf: ScreenBuffers, row: number, col: number, text: string, ink: number, bright = 1): void {
  const bytes = [0x16, row, col, 0x13, bright, 0x10, ink, 0x11, 0, ...[...text].map((c) => c.charCodeAt(0)), 0xff];
  printMessage(buf, newPrintState(), bytes);
}

function blitGraphic(
  buf: ScreenBuffers,
  prep: Prepared | undefined,
  id: number,
  row: number,
  col: number,
  ea63 = 0x05,
): void {
  const graphic = prep?.graphics[id];
  if (!graphic) return;
  for (const cell of graphic.cells) {
    const cy = row + cell.row;
    const cx = col + cell.col;
    if (cy < 0 || cy >= 24 || cx < 0 || cx >= SCREEN_COLS) continue;
    const idx = cellIndex(cy, cx);
    const dst = idx * CELL;
    for (let py = 0; py < CELL; py++) buf.data[dst + py] = cell.data[py]!;
    if (cell.attr != null) buf.attr[idx] = resolveEad3Attr(cell.attr, 0x02, ea63);
  }
}

function plotUdg(buf: ScreenBuffers, row: number, col: number, data: readonly number[], attr: number): void {
  if (row < 0 || row >= 24 || col < 0 || col >= SCREEN_COLS) return;
  const idx = cellIndex(row, col);
  const dst = idx * CELL;
  for (let py = 0; py < 8; py++) buf.data[dst + py] = data[py]!;
  buf.attr[idx] = attr & 0xff;
}

/** `$6615` A=`$EA63`: edge bars `$8A`/`$8B` + corners `$8C`–`$8F`. */
function drawBanners(buf: ScreenBuffers, prep: Prepared | undefined, ea63: number): void {
  for (let i = 0; i < 7; i++) {
    const col = 2 + i * 4;
    blitGraphic(buf, prep, MENU_BAR_H, 0, col, ea63);
    blitGraphic(buf, prep, MENU_BAR_H, MENU_FOOT_ROW, col, ea63);
  }
  for (let i = 0; i < 5; i++) {
    const row = 2 + i * 4;
    blitGraphic(buf, prep, MENU_BAR_V, row, 0, ea63);
    blitGraphic(buf, prep, MENU_BAR_V, row, 0x1e, ea63);
  }
  for (const [col, row, id] of MENU_CORNERS) blitGraphic(buf, prep, id, row, col, ea63);
}

function drawTitle(buf: ScreenBuffers): void {
  const attr = 0x47;
  let col = MENU_TITLE_COL;
  for (let i = 0; i < MENU_TITLE.length; i++) {
    printAt(buf, MENU_TITLE_ROW, col, MENU_TITLE[i]!, 7);
    col += 1;
    if (i + 1 < MENU_TITLE.length) {
      plotUdg(buf, MENU_TITLE_ROW, col, MENU_TITLE_UDG90, attr);
      col += 1;
    }
  }
}

function optionInk(ui: MenuUi, n: number): number {
  return ui.control === n ? MENU_INK_SELECTED : MENU_INK_IDLE;
}

function udkLine(ui: MenuUi): string {
  return ui.udk.slice(0, 5).map((k) => (k === " " ? "_" : k)).join("");
}

function drawOptions(buf: ScreenBuffers, ui: MenuUi): void {
  printAt(buf, 6, 4, "1.KEMPSTON JOYSTICK", MENU_INK_DISABLED);
  printAt(buf, 8, 4, "2.CURSOR JOYSTICK", optionInk(ui, 2));
  printAt(buf, 10, 4, "3.SINCLAIR ZX2 JOYSTICK", optionInk(ui, 3));
  printAt(buf, 12, 4, "4.KEYBOARD ... " + MENU_KEYS_4, optionInk(ui, 4));
  printAt(buf, 14, 4, "5.UDK KEYBOARD ... " + udkLine(ui), optionInk(ui, 5));
  printAt(buf, 16, 4, "6.DEFINE YOUR OWN KEYS", MENU_INK_STATIC);
  printAt(buf, 18, 4, "0.START GAME", MENU_INK_STATIC);
  printAt(buf, 20, 4, "Q.QUIT", MENU_INK_STATIC);
}

/** `$AEAC` UDG `$90` = font `$3B` left arrow, then right/down/up/fire/pause. */
const DEFINE_UDG_FIRST = 0x3b;
const DEFINE_SPACE_ROW = 12;
const DEFINE_SPACE_COL = 11;

/** `$613A`: row 0 E=0, row 1 E=1, row 2 E=2, row 3 (A=3) E=0. */
function defineRowOffset(r: number): number {
  return r === 3 ? 0 : r;
}

function drawDefineKey(buf: ScreenBuffers, row: number, col: number, code: number): void {
  const assigned = code >= 0x90;
  const paper = assigned ? 2 : 1;
  const bright = assigned ? 1 : 0;
  const glyph = assigned ? DEFINE_UDG_FIRST + ((code - 0x90) % 6) : code;
  const bytes = [
    0x10, 7, 0x11, paper, 0x16, row, col, 0x13, bright, glyph,
    0x10, 0, 0x2b,
    0x16, (row + 1) & 0xff, col, 0x8c, 0x2c,
    0x10, 5, 0x13, 1, 0x11, 0,
    0xff,
  ];
  printMessage(buf, newPrintState(), bytes);
}

function drawDefineGrid(buf: ScreenBuffers, ui: MenuUi): void {
  for (let r = 0; r < 4; r++) {
    const e0 = defineRowOffset(r);
    for (let c = 0; c < 10; c++) {
      const code = ui.defineGrid[r * 10 + c] ?? DEFINE_GRID_KEYS.charCodeAt(r * 10 + c);
      drawDefineKey(buf, r * 3, e0 + c * 3, code);
    }
  }
  const space = ui.defineGrid[40] ?? 0x20;
  if (space >= 0x90) {
    drawDefineKey(buf, DEFINE_SPACE_ROW, DEFINE_SPACE_COL, space);
  } else {
    printAt(buf, DEFINE_SPACE_ROW, DEFINE_SPACE_COL, "SPACE", MENU_INK_STATIC);
  }
}

function definePromptPos(step: number): { row: number; col: number } {
  // `$61AF` LEFT AT 17,5; then RIGHT 17,20; DOWN 19,5; UP 19,20; FIRE 21,5; PAUSE 21,20.
  const row = 17 + (step >> 1) * 2;
  const col = step & 1 ? 20 : 5;
  return { row, col };
}

function drawDefine(buf: ScreenBuffers, ui: MenuUi): void {
  drawDefineGrid(buf, ui);
  printAt(buf, 14, 0, "HIT KEY REQUIRED ...", 7);
  const n = Math.min(ui.defineStep, 5);
  const pos = definePromptPos(n);
  printAt(buf, pos.row, pos.col, DEFINE_LABELS[n] ?? "LEFT  ", 7);
}

function drawSplash(buf: ScreenBuffers): void {
  drawTitle(buf);
  printAt(buf, SPLASH_HINT_ROW, SPLASH_HINT_COL, SPLASH_HINT, MENU_INK_STATIC);
}

function drawQuit(buf: ScreenBuffers): void {
  printAt(buf, 4, 9, MENU_QUIT_MSG, 6);
  printAt(buf, 6, 9, MENU_QUIT_HINT, 6);
  printAt(buf, 9, 12, MENU_QUIT_YN, 6);
}

/** `$6615` edge bars + corners. A is the `$EA63` mask; graphics come from `prep`. */
export function drawBannerFrame(buf: ScreenBuffers, prep?: Prepared, ea63 = 0x05): void {
  drawBanners(buf, prep, ea63);
}

function menuEa63(phase: MenuPhase): number {
  if (phase === "intro" || phase === "quit" || phase === "goodbye") return 0x04;
  return 0x05;
}

export function drawMenuOverlay(buf: ScreenBuffers, ui: MenuUi, prep?: Prepared): void {
  clearScreen(buf, 0x07);
  if (ui.phase !== "define") drawBannerFrame(buf, prep, menuEa63(ui.phase));
  if (ui.phase === "splash") {
    blitGraphic(buf, prep, MENU_FOOT_L, MENU_FOOT_ROW, MENU_FOOT_COL_L);
    blitGraphic(buf, prep, MENU_FOOT_R, MENU_FOOT_ROW, MENU_FOOT_COL_R);
    drawSplash(buf);
    return;
  }
  if (ui.phase === "options") {
    blitGraphic(buf, prep, MENU_FOOT_L, MENU_FOOT_ROW, MENU_FOOT_COL_L);
    blitGraphic(buf, prep, MENU_FOOT_R, MENU_FOOT_ROW, MENU_FOOT_COL_R);
    drawTitle(buf);
    drawOptions(buf, ui);
    return;
  }
  if (ui.phase === "define") {
    drawDefine(buf, ui);
    return;
  }
  if (ui.phase === "intro") {
    printAt(buf, 4, 5, INTRO_TITLE, 5);
    printAt(buf, 7, 3, INTRO_LINE2, 3);
    printAt(buf, 9, 5, INTRO_LINE3, 3);
    printAt(buf, 11, 4, INTRO_LINE4, 3);
    printAt(buf, 13, 10, INTRO_LINE5, 3);
    printAt(buf, 15, 5, INTRO_LINE6, 3);
    printAt(buf, 17, 7, INTRO_LINE7, 3);
    return;
  }
  drawQuit(buf);
  if (ui.phase === "goodbye") {
    printAt(buf, 19, 6, MENU_GOODBYE, 2);
    blitGraphic(buf, prep, MENU_OLLY_UDG, MENU_OLLY_ROW, MENU_OLLY_COL);
  }
}

export function drawPauseOverlay(buf: ScreenBuffers, ui: PauseUi, prep?: Prepared): void {
  clearScreen(buf, 0x07);
  drawBannerFrame(buf, prep);
  drawTitle(buf);
  printAt(buf, 8, 4, PAUSE_END, MENU_INK_STATIC);
  printAt(buf, 10, 4, PAUSE_SAVE, MENU_INK_STATIC);
  printAt(buf, 12, 4, PAUSE_LOAD, MENU_INK_STATIC);
  if (ui.status) printAt(buf, 20, 4, ui.status, 6);
}

export type MenuAction = "start" | "stay";

/**
 * `$D5C8` digits as ASCII `$30`–`$36`. Czech QWERTZ sends `+ěščřžý` on the
 * number row — use `ev.code` Digit0–6 / Numpad0–6 (same as Cheops 1–5).
 */
export function menuDigitFromKey(key: string, physical?: string): number | null {
  if (physical) {
    const digit = physical.match(/^(?:Digit|Numpad)([0-6])$/);
    if (digit) return (digit[1]!.charCodeAt(0) - 0x30) & 0xff;
  }
  if (key.length === 1 && key >= "0" && key <= "6") return key.charCodeAt(0) - 0x30;
  return null;
}

function isModifierKey(key: string): boolean {
  return key === "Shift" || key === "Control" || key === "Alt" || key === "AltGraph";
}

export function feedMenuRelease(ui: MenuUi): void {
  if (ui.phase === "define") ui.defineNeedRelease = false;
}

function defineToken(key: string, physical?: string): string | null {
  if (key === " " || physical === "Space") return " ";
  if (physical) {
    const digit = physical.match(/^Digit([0-9])$/);
    if (digit) return digit[1]!;
    const letter = physical.match(/^Key([A-Z])$/);
    if (letter) return letter[1]!;
    if (physical === "Backslash") return "\\";
    if (physical === "BracketLeft") return "[";
  }
  if (key === "*" || key === "\\" || key === "[") return key;
  if (key.length === 1) {
    const up = key.toUpperCase();
    if (DEFINE_GRID_KEYS.includes(up)) return up;
    if (DEFINE_GRID_KEYS.includes(key)) return key;
  }
  return null;
}

function feedDefineKey(ui: MenuUi, key: string, world: World | undefined, physical?: string): MenuAction {
  if (ui.defineNeedRelease) return "stay";
  const token = defineToken(key, physical);
  if (token == null) return "stay";
  const code = token.charCodeAt(0);
  const slot = ui.defineGrid.findIndex((c) => c === code);
  if (slot < 0) return "stay";
  const step = ui.defineStep;
  ui.defineGrid[slot] = 0x90 + step;
  ui.udk[step] = token;
  if (world) requestSfx(world, MENU_SFX_DEFINE);
  ui.defineStep = step + 1;
  ui.defineNeedRelease = true;
  if (ui.defineStep >= 6) {
    ui.control = 5;
    ui.phase = "options";
    ui.defineNeedRelease = false;
  }
  return "stay";
}

/** `$5FF4` / `$666D` / `$6060` / `$6194`. `$6600` skipped. */
export function feedMenuKey(ui: MenuUi, key: string, world?: World, physical?: string): MenuAction {
  if (ui.phase === "goodbye") return "stay";
  if (ui.phase === "splash") {
    if (isModifierKey(key)) return "stay";
    ui.phase = "options";
    return "stay";
  }
  if (ui.phase === "define") return feedDefineKey(ui, key, world, physical);
  if (ui.phase === "intro") {
    if (isModifierKey(key)) return "stay";
    return "start";
  }
  if (ui.phase === "quit") {
    const ch = key.length === 1 ? key.toUpperCase() : "";
    if (ch === "Y") ui.phase = "goodbye";
    else if (ch === "N") ui.phase = "options";
    return "stay";
  }
  const digit = menuDigitFromKey(key, physical);
  if (digit === 0) {
    ui.phase = "intro";
    return "stay";
  }
  if (digit === 6) {
    ui.phase = "define";
    ui.defineStep = 0;
    ui.defineGrid = [...DEFINE_GRID_KEYS].map((c) => c.charCodeAt(0));
    ui.defineGrid.push(0x20);
    ui.defineNeedRelease = true;
    return "stay";
  }
  if (digit !== null && digit >= 2 && digit <= 5) {
    if (digit !== ui.control) {
      ui.control = digit;
      if (world) requestSfx(world, MENU_SFX_SELECT);
    }
    return "stay";
  }
  if (key === "q" || key === "Q") {
    ui.phase = "quit";
    return "stay";
  }
  return "stay";
}

export function feedPauseKey(ui: PauseUi, key: string, physical?: string): PauseAction {
  if (key === "Escape" || key === "click") return "resume";
  const digit = menuDigitFromKey(key, physical);
  if (digit === 1) return "end";
  if (digit === 2) return "save";
  if (digit === 3) return "load";
  return "stay";
}
