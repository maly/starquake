import { DEFAULT_PAUSE_KEY, DEFAULT_UDK, MENU_CONTROL_DEFAULT } from "./constants";

export type GameAction = "left" | "right" | "down" | "up" | "fire" | "pause";

export interface KeyBindings {
  control: number;
  udk: string[];
}

export const DEFAULT_BINDINGS: KeyBindings = {
  control: MENU_CONTROL_DEFAULT,
  udk: [...DEFAULT_UDK],
};

const SCHEME2: Record<string, GameAction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowDown: "down",
  ArrowUp: "up",
  " ": "fire",
  [DEFAULT_PAUSE_KEY]: "pause",
};

const SCHEME3: Record<string, GameAction> = {
  a: "left",
  d: "right",
  s: "down",
  w: "up",
  " ": "fire",
  [DEFAULT_PAUSE_KEY]: "pause",
};

const SCHEME4: Record<string, GameAction> = {
  o: "left",
  p: "right",
  a: "down",
  q: "up",
  m: "fire",
  [DEFAULT_PAUSE_KEY]: "pause",
};

const UDK_ACTIONS: GameAction[] = ["left", "right", "down", "up", "fire", "pause"];

function normLetter(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

function lookup(map: Record<string, GameAction>, key: string): GameAction | null {
  return map[key] ?? map[normLetter(key)] ?? null;
}

/** ESC always pauses. Schemes 2–5 as spec; 1 is unused (greyed). */
export function actionFromEvent(b: KeyBindings, key: string, _physical?: string): GameAction | null {
  if (key === "Escape") return "pause";
  if (b.control === 2) return lookup(SCHEME2, key);
  if (b.control === 3) return lookup(SCHEME3, key);
  if (b.control === 5) {
    const token = key.length === 1 ? key.toUpperCase() : key;
    for (let i = 0; i < UDK_ACTIONS.length; i++) {
      const bound = b.udk[i] ?? "";
      if (!bound) continue;
      if (bound === key || bound === token || bound.toLowerCase() === key.toLowerCase()) return UDK_ACTIONS[i]!;
    }
    return null;
  }
  return lookup(SCHEME4, key);
}
