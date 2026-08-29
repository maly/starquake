import { drainSfx, syncMusic, unlock, wireAudioUi } from "./audio/player";
import {
  DISPLAY_H,
  DISPLAY_W,
  LS_KEYS_KEY,
  LS_SAVE_KEY,
  NEW_GAME_ROOM,
  PAUSE_INVALID,
  PAUSE_LOADED,
  PAUSE_NO_SAVE,
  PAUSE_SAVED,
  SCREEN_H,
  SCREEN_W,
  TICK_MS,
} from "./constants";
import { actionFromEvent, DEFAULT_BINDINGS, type GameAction, type KeyBindings } from "./input";
import { decodeSave, encodeSave } from "./persist";
import { expectedCheopsCode, expectedDoorCode, teleportNameForRoom } from "./objects";
import {
  cellPos,
  fallSpeed,
  spawnBlob,
  tick,
  animationSet,
  createWorld,
  enterRoom,
  type Input,
} from "./physics";
import {
  HEIGHT,
  WIDTH,
  clampRoom,
  moveRoom,
  newBuffers,
  prepare,
  renderWorld,
  roomCol,
  roomRow,
} from "./render";
import { formatScore } from "./score";
import { parseCheatSprite, setInventorySlot } from "./cheat";
import type { GameData, Prepared } from "./types";
import { clampWorldStats, drawChrome, drawStatus } from "./ui/chrome";
import { blitPlayfieldRgba, rasterizeScreen } from "./ui/compose";
import {
  beginMenuUi,
  beginPauseUi,
  beginSplashUi,
  drawPauseOverlay,
  feedMenuKey,
  feedMenuRelease,
  feedPauseKey,
  type PauseUi,
} from "./ui/menu";
import { drawUiOverlay, feedCheopsKey, feedEndKey, feedTeleportKey, idleUi, isUiBlocking } from "./ui/overlay";
import { PLAY_Y0, clearScreen, newScreenBuffers, pastePlayfield } from "./ui/screen";

/** Same-origin `out/` next to the page (Pages `docs/out`, local `/viewer/out`). */
const DATA_BASE = "out";

const keys = { left: false, right: false, up: false, down: false, fire: false };

function input(): Input {
  return { left: keys.left, right: keys.right, up: keys.up, down: keys.down, fire: keys.fire };
}

function loadBindings(): KeyBindings {
  try {
    const raw = localStorage.getItem(LS_KEYS_KEY);
    if (!raw) return { control: DEFAULT_BINDINGS.control, udk: [...DEFAULT_BINDINGS.udk] };
    const j = JSON.parse(raw) as { control?: number; udk?: string[] };
    const control = j.control != null && j.control >= 2 && j.control <= 5 ? j.control : DEFAULT_BINDINGS.control;
    const udk = Array.isArray(j.udk) && j.udk.length >= 6 ? j.udk.slice(0, 6).map(String) : [...DEFAULT_BINDINGS.udk];
    return { control, udk };
  } catch {
    return { control: DEFAULT_BINDINGS.control, udk: [...DEFAULT_BINDINGS.udk] };
  }
}

function setHeld(action: GameAction, down: boolean): void {
  if (action === "pause") return;
  keys[action] = down;
}

function clearHeld(): void {
  keys.left = false;
  keys.right = false;
  keys.up = false;
  keys.down = false;
  keys.fire = false;
}

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error("#" + id);
  return el;
}

function fmtStat(n: number): string {
  return `${n} ($${n.toString(16).padStart(2, "0")})`;
}

async function loadJson(name: string): Promise<unknown> {
  const res = await fetch(DATA_BASE + "/" + name);
  if (!res.ok) throw new Error(name + " HTTP " + res.status);
  return res.json();
}

function parseHash(): number | null {
  const h = (location.hash || "").replace(/^#/, "");
  if (!h) return null;
  const n = parseInt(h, 10);
  return Number.isNaN(n) ? null : clampRoom(n);
}

/** Dev panel default ON; `?dev=0` hides it (`body.dev-off`). */
function applyDevToggle(): void {
  const q = new URLSearchParams(location.search);
  const off = q.get("dev") === "0";
  document.body.classList.toggle("dev-off", off);
  document.body.classList.toggle("dev-on", !off);
}

async function boot(): Promise<void> {
  applyDevToggle();
  const canvas = $("screen") as HTMLCanvasElement;
  const rawCtx = canvas.getContext("2d", { alpha: false });
  if (!rawCtx) throw new Error("canvas");
  const ctx: CanvasRenderingContext2D = rawCtx;
  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  ctx.imageSmoothingEnabled = false;
  canvas.style.width = DISPLAY_W + "px";
  canvas.style.height = DISPLAY_H + "px";
  const imageData = ctx.createImageData(SCREEN_W, SCREEN_H);
  const screenRgba = imageData.data;
  const playRgba = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  const playBuf = newBuffers();
  const screenBuf = newScreenBuffers();
  const hudScratch = newScreenBuffers();
  const stage = $("stage");
  const overlayEl = $("overlay") as HTMLInputElement;
  const gotoEl = $("goto") as HTMLInputElement;

  $("status").textContent = "Načítám out/*.json …";

  const pack = (await Promise.all([
    loadJson("rooms.json"),
    loadJson("graphics.json"),
    loadJson("blocks.json"),
    loadJson("sprites.json"),
    loadJson("items.json"),
    loadJson("actors.json"),
    loadJson("block_attrs.json"),
  ])) as [
    GameData["rooms"],
    GameData["graphics"],
    GameData["blocks"],
    GameData["sprites"],
    GameData["items"],
    GameData["actors"],
    GameData["blockAttrs"],
  ];

  const prep: Prepared = prepare({
    rooms: pack[0],
    graphics: pack[1],
    blocks: pack[2],
    sprites: pack[3],
    items: pack[4],
    actors: pack[5],
    blockAttrs: pack[6],
  });

  const hashed = parseHash();
  const start = hashed ?? NEW_GAME_ROOM;
  let bindings = loadBindings();
  let world = createWorld(prep, start);
  wireAudioUi();
  let blob = spawnBlob(prep, start, world);
  let pause: PauseUi | null = null;
  let pendingHash: number | null = hashed;
  world.ui = beginSplashUi(bindings);
  syncMusic(world);
  let overlay = false;
  let lastMs = 0;
  let avgMs = 0;
  let frames = 0;
  let acc = 0;
  let last = performance.now();
  let chromeRoom = -1;

  function rebuildChrome(): void {
    clearScreen(hudScratch, 0);
    drawChrome(hudScratch);
    chromeRoom = blob.room;
  }

  function updatePanel(): void {
    $("room-id").textContent = String(blob.room);
    $("room-col").textContent = String(roomCol(blob.room));
    $("room-row").textContent = String(roomRow(blob.room));
    $("item-count").textContent = String(prep.itemsByRoom[blob.room]?.length ?? 0);
    $("blob-xy").textContent = `${blob.x}, ${blob.y}`;
    const cell = cellPos(blob);
    $("blob-cell").textContent = `${cell.col}, ${cell.row}`;
    $("blob-vy").textContent = String(fallSpeed(blob, world));
    $("stat-energy").textContent = fmtStat(world.energy);
    $("stat-platforms").textContent = fmtStat(world.platforms);
    $("stat-firepower").textContent = fmtStat(world.firepower);
    $("stat-lives").textContent = fmtStat(world.lives);
    $("stat-score").textContent = formatScore(world.scoreDigits);
    $("stat-cores").textContent = `${9 - world.coresLeft}/9 (pairs ${world.corePairs})`;
    $("stat-inv").textContent = world.inventory.length
      ? world.inventory.map((it) => "$" + it.sprite.toString(16)).join(" ")
      : "—";
    $("stat-extra").textContent = world.extra
      ? "$" + world.extra.sprite.toString(16) + " @ " + world.extra.col + "," + world.extra.row
      : "—";
    const on = world.pulses.filter((p) => p.flag !== 0);
    $("stat-pulse").textContent = on.length
      ? on.map((p) => p.col + "," + p.row).join(" ")
      : world.pulses.length
        ? "off"
        : "—";
    $("stat-dd22").textContent = String(world.dd22);
    $("stat-pad").textContent = world.pad ? `${world.pad.x}, ${world.pad.y}` : "—";
    $("stat-teleport").textContent = teleportNameForRoom(blob.room) || "—";
    const passage = prep.passagesByRoom?.[blob.room]?.[0];
    $("stat-passage").textContent = passage
      ? `${passage.x},${passage.y}  L→${blob.room - 1}  R→${blob.room + 1}`
      : "—";
    const doorEl = $("stat-door");
    const doors = prep.doorsByRoom?.[blob.room] ?? [];
    if (doors.length) {
      const need = expectedDoorCode(blob.room);
      const keyTxt = need.map((n) => "$" + n.toString(16).toUpperCase()).join(" ");
      const hasUni = world.inventory.some((it) => it.sprite === 0x0f);
      doorEl.textContent = hasUni ? `${keyTxt} (máš $0F)` : keyTxt;
    } else {
      doorEl.textContent = "—";
    }
    const cheopsEl = $("stat-cheops");
    if (cheopsEl) {
      if (world.ui.kind === "cheops") {
        const ui = world.ui;
        const code = ui.digits.map((n) => "$" + n.toString(16).toUpperCase()).join(" ");
        const offers = ui.offers.map((n, i) => `${i + 1}:$${n.toString(16)}`).join(" ");
        cheopsEl.textContent = ui.phase === "exchange" ? offers : `${ui.phase} ${code}`;
      } else if (world.extra?.sprite === 0x19) {
        const code = expectedCheopsCode(blob.room)
          .map((n) => "$" + n.toString(16).toUpperCase())
          .join(" ");
        cheopsEl.textContent = `extra $19  kód ${code}`;
      } else {
        cheopsEl.textContent = world.cheops ? "výměna hotová" : "—";
      }
    }
    $("stat-message").textContent =
      world.ui.kind === "end"
        ? world.ui.phase === "cores"
          ? "THE CORES COMPLETE"
          : "GAME OVER"
        : world.message || "—";
    gotoEl.value = String(blob.room);
    $("time").textContent = lastMs.toFixed(2) + " ms";
    $("avg").textContent = avgMs.toFixed(2) + " ms";
    $("fps").textContent = avgMs > 0 ? (1000 / avgMs).toFixed(0) : "—";
    $("scale").textContent = "×2";
  }

  function draw(): void {
    const t0 = performance.now();
    clampWorldStats(world);
    if (chromeRoom !== blob.room) rebuildChrome();

    // HUD base from chrome scratch
    screenBuf.data.set(hudScratch.data);
    screenBuf.attr.set(hudScratch.attr);
    drawStatus(screenBuf, world, prep);

    if (pause) {
      drawPauseOverlay(screenBuf, pause, prep);
      rasterizeScreen(screenBuf, screenRgba);
    } else if (isUiBlocking(world.ui)) {
      drawUiOverlay(screenBuf, world.ui, prep, world.dac.dac0);
      rasterizeScreen(screenBuf, screenRgba);
    } else {
      const anim = animationSet(blob, world);
      renderWorld(prep, world, playBuf, playRgba, blob.room, {
        items: true,
        overlay,
        blob: world.blobHidden
          ? null
          : { x: blob.x, y: blob.y, set: anim.set, frame: anim.frame, ink: world.blobInk },
      });
      // Cell paste for attrs under entities, then stamp playfield RGBA at Y+48
      pastePlayfield(screenBuf, playBuf);
      rasterizeScreen(screenBuf, screenRgba);
      blitPlayfieldRgba(screenRgba, playRgba, PLAY_Y0, HEIGHT, WIDTH);
    }

    ctx.putImageData(imageData, 0, 0);
    const dt = performance.now() - t0;
    lastMs = dt;
    frames += 1;
    avgMs += (dt - avgMs) / Math.min(frames, 50);
    updatePanel();
  }

  function persistKeys(): void {
    try {
      localStorage.setItem(LS_KEYS_KEY, JSON.stringify({ control: bindings.control, udk: bindings.udk }));
    } catch {
      /* private mode */
    }
  }

  function finishSplashIfNeeded(): void {
    if (world.ui.kind !== "menu" || world.ui.phase !== "options") return;
    if (pendingHash === null) return;
    const id = pendingHash;
    pendingHash = null;
    startPlay(id, false, false);
  }

  function openPause(): void {
    if (pause) return;
    if (world.ui.kind === "menu" || world.ui.kind === "end") return;
    pause = beginPauseUi();
    clearHeld();
  }

  function saveGame(): void {
    if (!pause) return;
    try {
      const raw = encodeSave({
        blob,
        world,
        itemTable: prep.itemTable ?? [],
        control: bindings.control,
        udk: bindings.udk,
      });
      localStorage.setItem(LS_SAVE_KEY, raw);
      pause.status = PAUSE_SAVED;
    } catch {
      pause.status = PAUSE_INVALID;
    }
  }

  function loadGame(): void {
    if (!pause) return;
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(LS_SAVE_KEY);
    } catch {
      pause.status = PAUSE_INVALID;
      return;
    }
    const got = decodeSave(raw);
    if (got.status === "empty") {
      pause.status = PAUSE_NO_SAVE;
      return;
    }
    if (got.status !== "ok") {
      pause.status = PAUSE_INVALID;
      return;
    }
    world = got.data.world;
    blob = got.data.blob;
    prep.itemTable = got.data.itemTable.map((it) => ({ ...it, raw: [...(it.raw ?? [])] }));
    bindings = { control: got.data.control, udk: [...got.data.udk] };
    persistKeys();
    chromeRoom = -1;
    pause.status = PAUSE_LOADED;
    syncMusic(world);
  }

  function handlePauseAction(act: ReturnType<typeof feedPauseKey>): void {
    if (!pause) return;
    if (act === "resume") {
      pause = null;
      return;
    }
    if (act === "end") {
      pause = null;
      world.ui = beginMenuUi(bindings);
      syncMusic(world);
      return;
    }
    if (act === "save") saveGame();
    else if (act === "load") loadGame();
  }

  function startPlay(id: number, writeHash: boolean, newGame = false): void {
    const room = clampRoom(id);
    pause = null;
    if (newGame) {
      const god = world.cheatGod;
      world = createWorld(prep, room, {
        shuffleItems: true,
        frames: (Date.now() ^ (performance.now() | 0)) & 0xffff,
      });
      world.cheatGod = god;
      blob = spawnBlob(prep, room, world);
      chromeRoom = -1;
    } else {
      world.ui = idleUi();
      blob = spawnBlob(prep, room, world);
      enterRoom(prep, world, room, { blob });
      chromeRoom = -1;
    }
    syncMusic(world);
    if (!writeHash) return;
    const hash = "#" + blob.room;
    if (location.hash !== hash) history.replaceState(null, "", hash);
  }

  function goRoom(id: number): void {
    startPlay(id, true);
  }

  document.addEventListener("keydown", (ev) => {
    unlock();
    if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLSelectElement) return;
    if (pause) {
      handlePauseAction(feedPauseKey(pause, ev.key, ev.code));
      ev.preventDefault();
      return;
    }
    if (world.ui.kind === "menu") {
      const act = feedMenuKey(world.ui, ev.key, world, ev.code);
      bindings = { control: world.ui.control, udk: [...world.ui.udk] };
      persistKeys();
      finishSplashIfNeeded();
      if (act === "start") startPlay(NEW_GAME_ROOM, false, true);
      ev.preventDefault();
      return;
    }
    if (world.ui.kind === "end") {
      feedEndKey(world.ui, ev.key);
      ev.preventDefault();
      return;
    }
    if (world.ui.kind === "teleport") {
      feedTeleportKey(world.ui, ev.key, true, world);
      if (ev.key.length === 1 || ev.key === " ") ev.preventDefault();
      return;
    }
    if (world.ui.kind === "cheops") {
      feedCheopsKey(world.ui, ev.key, world, ev.code);
      ev.preventDefault();
      return;
    }
    if (isUiBlocking(world.ui)) {
      ev.preventDefault();
      return;
    }
    const action = actionFromEvent(bindings, ev.key, ev.code);
    if (action === "pause") {
      openPause();
      ev.preventDefault();
      return;
    }
    if (action) {
      setHeld(action, true);
      ev.preventDefault();
      return;
    }
    if (ev.key === "PageUp") {
      goRoom(moveRoom(blob.room, 0, -1));
    } else if (ev.key === "PageDown") {
      goRoom(moveRoom(blob.room, 0, 1));
    }
  });
  document.addEventListener("keyup", (ev) => {
    if (world.ui.kind === "menu") feedMenuRelease(world.ui);
    if (world.ui.kind === "teleport") {
      feedTeleportKey(world.ui, ev.key, false, world);
    }
    const action = actionFromEvent(bindings, ev.key, ev.code);
    if (action) setHeld(action, false);
  });
  canvas.addEventListener("pointerdown", () => {
    unlock();
    if (pause) {
      handlePauseAction(feedPauseKey(pause, "click"));
      return;
    }
    if (world.ui.kind === "menu" && world.ui.phase === "splash") {
      feedMenuKey(world.ui, "click");
      finishSplashIfNeeded();
    }
  });
  document.addEventListener("pointerdown", () => unlock());
  document.addEventListener("click", () => unlock());
  $("go").addEventListener("click", () => goRoom(parseInt(gotoEl.value, 10) || 0));
  gotoEl.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") goRoom(parseInt(gotoEl.value, 10) || 0);
  });
  overlayEl.addEventListener("change", () => {
    overlay = overlayEl.checked;
  });
  const cheatGodEl = $("cheat-god") as HTMLInputElement;
  const cheatSlotEl = $("cheat-slot") as HTMLSelectElement;
  const cheatSpriteEl = $("cheat-sprite") as HTMLInputElement;
  function insertCheatSprite(raw: string): void {
    const sprite = parseCheatSprite(raw);
    if (sprite === null) {
      $("status").textContent = "Cheat: sprite $00–$FF (např. $0F)";
      return;
    }
    const slot = parseInt(cheatSlotEl.value, 10) || 0;
    setInventorySlot(world, slot, sprite);
    cheatSpriteEl.value = "$" + sprite.toString(16).toUpperCase().padStart(2, "0");
  }
  cheatGodEl.addEventListener("change", () => {
    world.cheatGod = cheatGodEl.checked;
  });
  $("cheat-insert").addEventListener("click", () => insertCheatSprite(cheatSpriteEl.value));
  cheatSpriteEl.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      insertCheatSprite(cheatSpriteEl.value);
    }
  });
  document.querySelectorAll<HTMLButtonElement>(".cheat-presets [data-sprite]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const raw = btn.getAttribute("data-sprite") || "";
      cheatSpriteEl.value = raw;
      insertCheatSprite(raw);
    });
  });
  window.addEventListener("hashchange", () => {
    const id = parseHash();
    if (id !== null && id !== blob.room) goRoom(id);
  });

  $("status").textContent =
    "50 Hz · HUD+playfield 256×192 · ESC pauza · klávesy z menu · teleport 5 znaků · dveře inventář · ?dev=0";
  void stage;

  function frame(now: number): void {
    acc += now - last;
    last = now;
    if (acc > 100) acc = 100;
    while (acc >= TICK_MS) {
      if (!pause) {
        const prev = blob.room;
        tick(prep, blob, input(), world);
        syncMusic(world);
        drainSfx(world);
        if (blob.room !== prev) {
          chromeRoom = -1;
          const hash = "#" + blob.room;
          if (location.hash !== hash) history.replaceState(null, "", hash);
        }
      }
      acc -= TICK_MS;
    }
    draw();
    requestAnimationFrame(frame);
  }
  rebuildChrome();
  requestAnimationFrame(frame);
}

void boot().catch((err: Error) => {
  const el = document.getElementById("status");
  if (el) {
    el.textContent =
      "Nelze načíst data. npm start z kořene repozitáře, /viewer/ (" + err.message + ")";
    el.className = "status error";
  }
});
