import {
  CELL,
  CHEOPS_DIGIT_COL,
  CHEOPS_DIGIT_ROW,
  CHEOPS_MSG_CODE,
  CHEOPS_MSG_EXCHANGE,
  CHEOPS_MSG_HINT,
  CHEOPS_MSG_TITLE,
  CHEOPS_OFFERS,
  CHEOPS_SFX_INTRO,
  CHEOPS_SFX_PICK,
  D5FD_ATTR_OK,
  D5FD_ATTR_WAIT,
  D5FD_DIGIT_STRIDE,
  D5FD_FAIL_FLASH,
  D5FD_INTRO_HALT,
  D5FD_INV_COL0,
  D5FD_INV_ROW,
  D5FD_MATCH_FLASH,
  D5FD_OK_FLASH,
  D5FD_PAUSE,
  D5FD_ROLL,
  D5FD_SFX_MATCH,
  D5FD_SFX_ROLL_BASE,
  DOOR_DIGIT_COL,
  DOOR_DIGIT_ROW,
  DOOR_KEY_SPRITE,
  DOOR_MSG_BAD,
  DOOR_MSG_OK,
  INTRO_TITLE,
  MENU_GOODBYE,
  MENU_QUIT_MSG,
  DOOR_SINGLE_WILDCARD,
  DOOR_UDG_COL_L,
  DOOR_UDG_COL_R,
  DOOR_UDG_LEFT,
  DOOR_UDG_RIGHT,
  DOOR_UDG_ROW,
  TELEPORT_MSG_BAD,
  TELEPORT_MSG_OK,
  TELEPORT_NAME_LEN,
  TELEPORT_UDG,
  TELEPORT_UDG_COL,
  TELEPORT_UDG_ROW,
} from "../constants";
import { requestSfx } from "../audio/effects";
import { dacStep } from "../entities";
import {
  applyCheopsChoice,
  pickCheopsSlot,
  rollCheopsOffers,
} from "../items";
import {
  cheopsKeysAccepted,
  doorKeysAccepted,
  evaluateTeleport,
  expectedCheopsCode,
  expectedDoorCode,
  teleportNameForRoom,
} from "../objects";
import type { Prepared, World } from "../types";
import { ea62ForRow, resolveEad3Attr } from "./ead3";
import { drawEndOverlay, type EndUi } from "./end";
import { drawMenuOverlay, type MenuUi } from "./menu";
import { newPrintState, printMessage } from "./print";
import { cellIndex, clearPlayfield, SCREEN_COLS, type ScreenBuffers } from "./screen";

export { feedEndKey } from "./end";

/** Exact ROM overlay copy (double spaces where present). */
export const MSG_SECURITY_DOOR = "SECURITY  DOOR";
export const MSG_ACCESS_CODE = "ACCESS  CODE";
export const MSG_ACCESS_OK = "ACCESS AUTHORISED";
export const MSG_ACCESS_BAD = "ACCESS CODE INVALID";
export const MSG_ENTERED = "YOU HAVE ENTERED";
export const MSG_TELEPORT = "TELEPORT";
export const MSG_CODE_PREFIX = "CODE : ";
export const MSG_ENTER_TP = "ENTER TELEPORTAL";
export const MSG_DEST_CODE = "DESTINATION CODE";
export const MSG_DASHES = "- - - - -";
export const MSG_TP_OK = "NOW TELEPORTING";
export const MSG_TP_BAD = "CODE NOT RECOGNISED";

export type UiKind = "none" | "door" | "teleport" | "cheops" | "menu";

/** Shared `$D5FD` phases before the caller-specific result text. */
export type D5fdPhase = "intro" | "roll" | "match" | "pause" | "result" | "done";

export interface DoorUi {
  kind: "door";
  phase: D5fdPhase;
  ok: boolean;
  /** Bit0 of `$DD23` when the door was opened (Right=1 → X+`$30`). */
  openRight: boolean;
  ticks: number;
  digits: number[];
  digitIndex: number;
  /** Slot flashed by `$D64C` (`($DAC0)∧$1F % N`). */
  rollSlot: number;
  /** `$D589` ink after `$D55F`. */
  ink: number;
  /** Pair flags `$03` then `$07` after a match. */
  flags: number[];
  matched: boolean[];
  /** HUD column of the inventory 2×2 flashed at `$D6F6`. */
  invCols: number[];
}

export interface TeleportUi {
  kind: "teleport";
  phase: "prompt" | "input" | "result" | "done";
  ownName: string;
  buffer: string;
  /** True while a key is held — wait for release before next char ($CF93). */
  waitingRelease: boolean;
  ok: boolean;
  dest: number;
  ticks: number;
}

export interface CheopsUi {
  kind: "cheops";
  phase: D5fdPhase | "exchange";
  ok: boolean;
  chosen: boolean;
  ticks: number;
  digits: number[];
  digitIndex: number;
  rollSlot: number;
  ink: number;
  flags: number[];
  matched: boolean[];
  invCols: number[];
  slot: number;
  given: number;
  offers: number[];
}

export type UiState = { kind: "none" } | DoorUi | TeleportUi | CheopsUi | MenuUi | EndUi;

export function idleUi(): UiState {
  return { kind: "none" };
}

function printAt(buf: ScreenBuffers, row: number, col: number, text: string, ink = 7): void {
  const bytes = [0x16, row, col, 0x10, ink, 0x13, 1, ...[...text].map((c) => c.charCodeAt(0)), 0xff];
  printMessage(buf, newPrintState(), bytes);
}

/** `$D689`/`$D6AB`: which digits match, and the HUD col of the slot that covered them. */
function planDigitMatches(world: World, digits: number[]): { matched: boolean[]; invCols: number[] } {
  const matched = digits.map(() => false);
  const invCols = digits.map(() => D5FD_INV_COL0);
  const used = world.inventory.map(() => false);
  for (let d = 0; d < digits.length; d++) {
    let hit = -1;
    for (let i = 0; i < world.inventory.length && i < 4; i++) {
      if (used[i]) continue;
      if ((world.inventory[i]!.sprite & 0xff) === DOOR_KEY_SPRITE) {
        hit = i;
        break;
      }
    }
    if (hit < 0) {
      for (let i = 0; i < world.inventory.length && i < 4; i++) {
        if (used[i]) continue;
        if ((world.inventory[i]!.sprite & 0xff) === (digits[d]! & 0xff)) {
          hit = i;
          used[i] = true;
          break;
        }
      }
    }
    if (hit < 0) {
      for (let i = 0; i < world.inventory.length && i < 4; i++) {
        if (used[i]) continue;
        if ((world.inventory[i]!.sprite & 0xff) === DOOR_SINGLE_WILDCARD) {
          hit = i;
          used[i] = true;
          break;
        }
      }
    }
    if (hit >= 0) {
      matched[d] = true;
      invCols[d] = D5FD_INV_COL0 + hit * 2;
    }
  }
  return { matched, invCols };
}

function d5fdFields(world: World, digits: number[]) {
  const { matched, invCols } = planDigitMatches(world, digits);
  return {
    digitIndex: 0,
    rollSlot: 0,
    ink: 7,
    flags: digits.map(() => D5FD_ATTR_WAIT),
    matched,
    invCols,
  };
}

/** Door overlay intro: titles; result comes from inventory (`$D5FD`), not a typed code. */
export function beginDoorUi(world: World, room: number, openRight: boolean): DoorUi {
  const ok = doorKeysAccepted(world, room);
  requestSfx(world, 0x08);
  const digits = expectedDoorCode(room);
  return {
    kind: "door",
    phase: "intro",
    ok,
    openRight,
    ticks: 0,
    digits,
    ...d5fdFields(world, digits),
  };
}

export function beginTeleportUi(room: number, world?: World): TeleportUi {
  if (world) requestSfx(world, 0x07);
  return {
    kind: "teleport",
    phase: "prompt",
    ownName: teleportNameForRoom(room) || "?????",
    buffer: "",
    waitingRelease: true,
    ok: false,
    dest: room,
    ticks: 0,
  };
}

/** `$CCF1`: CHEOPS KEY CODE then `$D5FD` A=2. Exchange after OK. */
export function beginCheopsUi(world: World, room: number): CheopsUi {
  requestSfx(world, CHEOPS_SFX_INTRO);
  const digits = expectedCheopsCode(room);
  return {
    kind: "cheops",
    phase: "intro",
    ok: cheopsKeysAccepted(world, room),
    chosen: false,
    ticks: 0,
    digits,
    ...d5fdFields(world, digits),
    slot: 0,
    given: 0,
    offers: [],
  };
}

function enterCheopsExchange(ui: CheopsUi, world: World): void {
  ui.slot = pickCheopsSlot(world.inventory);
  const given = world.inventory[ui.slot]?.sprite ?? 0;
  ui.given = given & 0xff;
  ui.offers = rollCheopsOffers(world, ui.given);
  ui.phase = "exchange";
  ui.ticks = 0;
}

function blitGraphic(
  buf: ScreenBuffers,
  prep: Prepared | undefined,
  id: number,
  row: number,
  col: number,
  dac0 = 0,
): void {
  const graphic = prep?.graphics[id];
  if (!graphic) return;
  const ea62 = ea62ForRow(row, dac0);
  for (const cell of graphic.cells) {
    const cy = row + cell.row;
    const cx = col + cell.col;
    if (cy < 0 || cy >= 24 || cx < 0 || cx >= SCREEN_COLS) continue;
    const idx = cellIndex(cy, cx);
    const dst = idx * CELL;
    for (let py = 0; py < CELL; py++) buf.data[dst + py] = cell.data[py]!;
    if (cell.attr != null) buf.attr[idx] = resolveEad3Attr(cell.attr, ea62);
  }
}

function blitSprite(buf: ScreenBuffers, prep: Prepared | undefined, spriteId: number, row: number, col: number, attr: number): void {
  const sprite = prep?.sprites[spriteId];
  if (!sprite) return;
  for (const cell of sprite.cells) {
    const cy = row + cell.row;
    const cx = col + cell.col;
    if (cy < 0 || cy >= 24 || cx < 0 || cx >= SCREEN_COLS) continue;
    const idx = cellIndex(cy, cx);
    const dst = idx * CELL;
    for (let py = 0; py < CELL; py++) buf.data[dst + py]! ^= cell.data[py]!;
    buf.attr[idx] = attr;
  }
}

function digitAttr(
  ui: { phase: string; digitIndex: number; rollSlot: number; ink: number; flags: number[] },
  i: number,
): number {
  if (ui.phase === "roll" && i === ui.rollSlot) return ui.ink & 7;
  if (ui.phase === "match" && i === ui.digitIndex) return (ui.ink & 7) | 2;
  return ui.flags[i] ?? D5FD_ATTR_WAIT;
}

function drawDigitRoll(
  buf: ScreenBuffers,
  prep: Prepared | undefined,
  ui: {
    phase: string;
    digits: number[];
    digitIndex: number;
    rollSlot: number;
    ink: number;
    flags: number[];
    invCols: number[];
  },
  row: number,
  col0: number,
): void {
  if (ui.phase === "intro") return;
  for (let i = 0; i < ui.digits.length; i++) {
    blitSprite(buf, prep, ui.digits[i]!, row, col0 + i * D5FD_DIGIT_STRIDE, digitAttr(ui, i));
  }
  if (ui.phase === "match") {
    const col = ui.invCols[ui.digitIndex] ?? D5FD_INV_COL0;
    const attr = (ui.ink & 7) | 2;
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const idx = cellIndex(D5FD_INV_ROW + dy, col + dx);
        if (idx >= 0 && idx < buf.attr.length) buf.attr[idx] = attr;
      }
    }
  }
}

export function drawDoorOverlay(buf: ScreenBuffers, ui: DoorUi, prep?: Prepared, dac0 = 0): void {
  clearPlayfield(buf);
  printAt(buf, 8, 9, MSG_SECURITY_DOOR);
  printAt(buf, 15, 10, MSG_ACCESS_CODE);
  blitGraphic(buf, prep, DOOR_UDG_LEFT, DOOR_UDG_ROW, DOOR_UDG_COL_L, dac0);
  blitGraphic(buf, prep, DOOR_UDG_RIGHT, DOOR_UDG_ROW, DOOR_UDG_COL_R, dac0);
  drawDigitRoll(buf, prep, ui, DOOR_DIGIT_ROW, DOOR_DIGIT_COL);
  if (ui.phase === "result" || ui.phase === "done") {
    if (ui.ok) printAt(buf, 21, 7, MSG_ACCESS_OK);
    else printAt(buf, 21, 6, MSG_ACCESS_BAD);
  }
}

export function drawTeleportOverlay(buf: ScreenBuffers, ui: TeleportUi, prep?: Prepared, dac0 = 0): void {
  clearPlayfield(buf);
  printAt(buf, 8, 4, MSG_ENTERED);
  printAt(buf, 10, 8, MSG_TELEPORT);
  printAt(buf, 12, 6, MSG_CODE_PREFIX + ui.ownName.slice(0, TELEPORT_NAME_LEN));
  blitGraphic(buf, prep, TELEPORT_UDG, TELEPORT_UDG_ROW, TELEPORT_UDG_COL, dac0);
  printAt(buf, 14, 8, MSG_ENTER_TP);
  printAt(buf, 16, 8, MSG_DEST_CODE);
  if (ui.phase === "prompt" || ui.phase === "input") {
    printAt(buf, 19, 12, MSG_DASHES);
    // echo typed chars as "X " over the dashes
    let col = 12;
    for (let i = 0; i < ui.buffer.length; i++) {
      printAt(buf, 19, col, ui.buffer[i]! + " ");
      col += 2;
    }
  }
  if (ui.phase === "result" || ui.phase === "done") {
    if (ui.ok) printAt(buf, 21, 9, MSG_TP_OK);
    else printAt(buf, 21, 6, MSG_TP_BAD);
  }
}

export function drawCheopsOverlay(buf: ScreenBuffers, ui: CheopsUi, prep?: Prepared): void {
  clearPlayfield(buf);
  printAt(buf, 9, 6, CHEOPS_MSG_TITLE);
  if (ui.phase === "intro" || ui.phase === "roll" || ui.phase === "match" || ui.phase === "pause" || ui.phase === "result") {
    printAt(buf, 13, 9, CHEOPS_MSG_CODE);
    drawDigitRoll(buf, prep, ui, CHEOPS_DIGIT_ROW, CHEOPS_DIGIT_COL);
  }
  if (ui.phase === "result") {
    if (ui.ok) printAt(buf, 21, 7, MSG_ACCESS_OK);
    else printAt(buf, 21, 6, MSG_ACCESS_BAD);
  }
  if (ui.phase === "exchange" || (ui.phase === "done" && ui.chosen)) {
    printAt(buf, 13, 8, CHEOPS_MSG_EXCHANGE);
    printAt(buf, 21, 4, CHEOPS_MSG_HINT);
    blitSprite(buf, prep, ui.given, 12, 17, 0x47);
    for (let i = 0; i < CHEOPS_OFFERS; i++) {
      const col = 4 + i * 6;
      printAt(buf, 15, col, `${i + 1}.`);
      blitSprite(buf, prep, ui.offers[i] ?? 0, 16, col, 0x47);
    }
  }
}

export function drawUiOverlay(buf: ScreenBuffers, ui: UiState, prep?: Prepared, dac0 = 0): void {
  if (ui.kind === "door") drawDoorOverlay(buf, ui, prep, dac0);
  else if (ui.kind === "teleport") drawTeleportOverlay(buf, ui, prep, dac0);
  else if (ui.kind === "cheops") drawCheopsOverlay(buf, ui, prep);
  else if (ui.kind === "menu") drawMenuOverlay(buf, ui, prep);
  else if (ui.kind === "end") drawEndOverlay(buf, ui, prep);
}

interface D5fdUi {
  phase: D5fdPhase | "exchange";
  ticks: number;
  digits: number[];
  digitIndex: number;
  rollSlot: number;
  ink: number;
  flags: number[];
  matched: boolean[];
  ok: boolean;
}

function nextD5fdInk(world: World, prev: number): number {
  dacStep(world.dac);
  let a = ((world.dac.dac0 >> 8) & 0x3f);
  while (a >= 6) a -= 6;
  a = (a + 2) & 0xff;
  if (a === (prev & 0xff)) a ^= 1;
  return a;
}

function advanceDigit(ui: D5fdUi): void {
  ui.digitIndex += 1;
  ui.ticks = 0;
  if (ui.digitIndex >= ui.digits.length) ui.phase = "pause";
  else ui.phase = "roll";
}

/** `$D64C`…`$D723` then HALT `$14` then result. Returns true when result text should start. */
function tickD5fd(ui: D5fdUi, world?: World): boolean {
  if (ui.phase === "result" || ui.phase === "done" || ui.phase === "exchange") return false;
  ui.ticks += 1;
  if (ui.phase === "intro") {
    if (ui.ticks >= D5FD_INTRO_HALT) {
      ui.phase = "roll";
      ui.ticks = 0;
      ui.digitIndex = 0;
    }
    return false;
  }
  if (ui.phase === "roll") {
    if (world) {
      ui.ink = nextD5fdInk(world, ui.ink);
      const n = ui.digits.length || 1;
      let slot = world.dac.dac0 & 0x1f;
      while (slot >= n) slot -= n;
      ui.rollSlot = slot;
      requestSfx(world, ((world.dac.dac0 >> 8) & 3) + D5FD_SFX_ROLL_BASE);
    }
    if (ui.ticks >= D5FD_ROLL) {
      if (ui.matched[ui.digitIndex]) {
        ui.phase = "match";
        ui.ticks = 0;
        ui.flags[ui.digitIndex] = D5FD_ATTR_OK;
        if (world) requestSfx(world, D5FD_SFX_MATCH);
      } else {
        advanceDigit(ui);
      }
    }
    return false;
  }
  if (ui.phase === "match") {
    ui.ink = ((ui.ink ^ 7) | 2) & 0xff;
    if (world) requestSfx(world, D5FD_SFX_MATCH);
    if (ui.ticks >= D5FD_MATCH_FLASH) advanceDigit(ui);
    return false;
  }
  if (ui.phase === "pause") {
    if (ui.ticks >= D5FD_PAUSE) {
      ui.phase = "result";
      ui.ticks = 0;
      return true;
    }
  }
  return false;
}

/**
 * Advance door UI. Returns true when the caller should apply `applySecurityDoor`
 * and clear the UI.
 */
export function tickDoorUi(ui: DoorUi, world?: World): boolean {
  if (tickD5fd(ui, world) && world) {
    if (ui.ok) requestSfx(world, 0x0a);
    requestSfx(world, 0x0f);
  }
  if (ui.phase === "result") {
    ui.ticks += 1;
    if (ui.ticks >= (ui.ok ? D5FD_OK_FLASH : D5FD_FAIL_FLASH)) {
      ui.phase = "done";
      return true;
    }
  }
  return ui.phase === "done";
}

export function tickCheopsUi(ui: CheopsUi, world?: World): boolean {
  if (ui.phase === "done") return true;
  if (ui.phase === "exchange") return false;
  if (tickD5fd(ui, world) && world) requestSfx(world, 0x0f);
  if (ui.phase === "result") {
    ui.ticks += 1;
    if (ui.ticks >= (ui.ok ? D5FD_OK_FLASH : D5FD_FAIL_FLASH)) {
      if (ui.ok && world) {
        enterCheopsExchange(ui, world);
        return false;
      }
      ui.phase = "done";
      return true;
    }
  }
  return false;
}

/**
 * ROM `$CDCD` wants ASCII `'1'`–`'5'`.
 * Czech QWERTZ number row unshifted is `+ěščř…` (`ev.key`), digits need Shift;
 * Numpad still sends `"1"`–`"5"`. Use `ev.code` Digit1–5 / Numpad1–5 so the
 * physical top-row keys work without Shift.
 */
export function cheopsChoiceFromKey(key: string, physical?: string): number | null {
  if (physical) {
    const digit = physical.match(/^(?:Digit|Numpad)([1-5])$/);
    if (digit) return (digit[1]!.charCodeAt(0) - 0x31) & 0xff;
  }
  if (key.length === 1) {
    const c = key.charCodeAt(0);
    if (c >= 0x31 && c <= 0x35) return c - 0x31;
  }
  return null;
}

/** `$D5C8` then `$CDCD` CP `$31` / `$36`. */
export function feedCheopsKey(ui: CheopsUi, key: string, world?: World, physical?: string): void {
  if (ui.phase !== "exchange") return;
  const choice = cheopsChoiceFromKey(key, physical);
  if (choice === null) return;
  if (world) {
    applyCheopsChoice(world, ui.slot, ui.offers, choice);
    requestSfx(world, CHEOPS_SFX_PICK);
  }
  ui.chosen = true;
  ui.phase = "done";
}

/**
 * Map a browser key to the `$D5C8` character set (uppercase ASCII / digit / space).
 * CAPS/ENTER/Sym equivalents return null (ignored like `$01`–`$03`).
 */
export function mapTeleportKey(key: string): string | null {
  if (key === " ") return " ";
  if (key.length === 1) {
    const ch = key.toUpperCase();
    const code = ch.charCodeAt(0);
    if (code >= 0x30 && code <= 0x39) return ch;
    if (code >= 0x41 && code <= 0x5a) return ch;
  }
  return null;
}

/**
 * Feed a key event into the teleport input FSM (`$CF8E`…`$CFB1`).
 * `down` false = keyup (release). Only the first 5 accepted chars matter.
 */
export function feedTeleportKey(ui: TeleportUi, key: string, down: boolean, world?: World): void {
  if (ui.phase !== "input" && ui.phase !== "prompt") return;
  if (ui.phase === "prompt") ui.phase = "input";
  if (!down) {
    ui.waitingRelease = false;
    return;
  }
  if (ui.waitingRelease) return;
  if (ui.buffer.length >= TELEPORT_NAME_LEN) return;
  const ch = mapTeleportKey(key);
  if (!ch) return;
  // `$CF9A` drops A < $0A (control); letters/digits/space pass
  ui.buffer += ch;
  ui.waitingRelease = true;
  if (world) requestSfx(world, 0x11);
}

/** After 5 chars, evaluate against `$D036`. */
export function finishTeleportInput(ui: TeleportUi, room: number, world?: World): void {
  const ev = evaluateTeleport(ui.buffer, room);
  ui.ok = ev.ok;
  ui.dest = ev.dest;
  ui.phase = "result";
  ui.ticks = 0;
  if (world) {
    if (ui.ok) {
      requestSfx(world, 0x10);
      requestSfx(world, 0x09);
    } else {
      requestSfx(world, 0x0f);
    }
  }
}

export function tickTeleportUi(ui: TeleportUi, room: number, world?: World): boolean {
  if (ui.phase === "prompt") {
    ui.phase = "input";
    ui.waitingRelease = true;
  }
  if (ui.phase === "input" && ui.buffer.length >= TELEPORT_NAME_LEN) {
    finishTeleportInput(ui, room, world);
  }
  if (ui.phase === "result") {
    ui.ticks += 1;
    if (ui.ticks >= 40) {
      ui.phase = "done";
      return true;
    }
  }
  return ui.phase === "done";
}

/** Sync legacy `world.message` strings used by the dev panel / dumps. */
export function syncWorldMessage(world: World, ui: UiState): void {
  if (ui.kind === "door") {
    world.message = ui.ok ? DOOR_MSG_OK : DOOR_MSG_BAD;
  } else if (ui.kind === "teleport" && (ui.phase === "result" || ui.phase === "done")) {
    world.message = ui.ok ? TELEPORT_MSG_OK : TELEPORT_MSG_BAD;
  } else if (ui.kind === "cheops") {
    if (ui.phase === "exchange" || (ui.phase === "done" && ui.chosen)) {
      world.message = CHEOPS_MSG_EXCHANGE;
    } else if (ui.phase === "result" || ui.phase === "done") {
      world.message = ui.ok ? DOOR_MSG_OK : DOOR_MSG_BAD;
    } else {
      world.message = CHEOPS_MSG_CODE;
    }
  } else if (ui.kind === "menu") {
    world.message =
      ui.phase === "splash"
        ? "CLICK OR PRESS A KEY"
        : ui.phase === "options"
          ? "STARQUAKE"
          : ui.phase === "define"
            ? "HIT KEY REQUIRED ..."
            : ui.phase === "intro"
              ? INTRO_TITLE
              : ui.phase === "quit"
                ? MENU_QUIT_MSG
                : MENU_GOODBYE;
  } else if (ui.kind === "end") {
    world.message = ui.phase === "cores" ? "THE CORES COMPLETE" : "GAME OVER";
  }
}

export function isUiBlocking(ui: UiState): boolean {
  return ui.kind !== "none";
}

/** Test helper: push five characters without release gating. */
export function typeTeleportCode(ui: TeleportUi, code: string, world?: World): void {
  ui.phase = "input";
  ui.waitingRelease = false;
  for (const ch of code.slice(0, TELEPORT_NAME_LEN)) {
    feedTeleportKey(ui, ch, true, world);
    feedTeleportKey(ui, ch, false, world);
  }
}
