import { drainSfx, syncMusic, unlock, wireAudioUi } from "./audio/player";
import { DISPLAY_H, DISPLAY_W, NEW_GAME_ROOM, SCREEN_H, SCREEN_W, TICK_MS } from "./constants";
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
import { formatScore, formatTime } from "./score";
import { parseCheatSprite, setInventorySlot } from "./cheat";
import type { GameData, Prepared } from "./types";
import { clampWorldStats, drawChrome, drawStatus } from "./ui/chrome";
import { blitPlayfieldRgba, rasterizeScreen } from "./ui/compose";
import { beginMenuUi, feedMenuKey } from "./ui/menu";
import { drawUiOverlay, feedCheopsKey, feedTeleportKey, idleUi, isUiBlocking } from "./ui/overlay";
import { PLAY_Y0, clearScreen, newScreenBuffers, pastePlayfield } from "./ui/screen";

/** Same-origin `out/` next to the page (Pages `docs/out`, local `/viewer/out`). */
const DATA_BASE = "out";

const keys = { left: false, right: false, up: false, down: false, fire: false };

function input(): Input {
  return { left: keys.left, right: keys.right, up: keys.up, down: keys.down, fire: keys.fire };
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
  let world = createWorld(prep, start);
  wireAudioUi();
  let blob = spawnBlob(prep, start, world);
  if (hashed === null) world.ui = beginMenuUi();
  else if (blob.room === start) enterRoom(prep, world, start, { blob });
  syncMusic(world);
  let overlay = false;
  let endShown = false;
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

  function showEndOverlay(): void {
    if (endShown || !world.endResult) return;
    endShown = true;
    const er = world.endResult;
    const panel = document.createElement("div");
    panel.id = "end-overlay";
    panel.className = "end-overlay";
    const title = er.victory ? er.banner || "THE CORES COMPLETE" : "GAME OVER";
    panel.innerHTML = `<div class="end-card"><h2>${title}</h2>
      <dl>
        <div><dt>SCORE</dt><dd>${formatScore(er.scoreDigits)}</dd></div>
        <div><dt>ADVENTURE</dt><dd>${er.adventure}</dd></div>
        <div><dt>TIME</dt><dd>${formatTime(er.timeMinutes, er.timeSeconds)}</dd></div>
        <div><dt>CORES REPLACED</dt><dd>${er.coresReplaced}</dd></div>
      </dl></div>`;
    document.body.appendChild(panel);
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
    $("stat-message").textContent = world.message || "—";
    gotoEl.value = String(blob.room);
    $("time").textContent = lastMs.toFixed(2) + " ms";
    $("avg").textContent = avgMs.toFixed(2) + " ms";
    $("fps").textContent = avgMs > 0 ? (1000 / avgMs).toFixed(0) : "—";
    $("scale").textContent = "×2";
    if (world.gameOver) showEndOverlay();
  }

  function draw(): void {
    const t0 = performance.now();
    clampWorldStats(world);
    if (chromeRoom !== blob.room) rebuildChrome();

    // HUD base from chrome scratch
    screenBuf.data.set(hudScratch.data);
    screenBuf.attr.set(hudScratch.attr);
    drawStatus(screenBuf, world, prep);

    if (isUiBlocking(world.ui)) {
      drawUiOverlay(screenBuf, world.ui, prep);
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

  function startPlay(id: number, writeHash: boolean, newGame = false): void {
    const room = clampRoom(id);
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
    if (world.ui.kind === "menu") {
      const act = feedMenuKey(world.ui, ev.key, world, ev.code);
      if (act === "start") startPlay(NEW_GAME_ROOM, false, true);
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
    // Spectrum layout: Q up, A down, O left, P right, Space fire.
    if (ev.key === "o" || ev.key === "O") {
      keys.left = true;
      ev.preventDefault();
    } else if (ev.key === "p" || ev.key === "P") {
      keys.right = true;
      ev.preventDefault();
    } else if (ev.key === "q" || ev.key === "Q") {
      keys.up = true;
      ev.preventDefault();
    } else if (ev.key === "a" || ev.key === "A") {
      keys.down = true;
      ev.preventDefault();
    } else if (ev.key === " ") {
      keys.fire = true;
      ev.preventDefault();
    } else if (ev.key === "PageUp") {
      goRoom(moveRoom(blob.room, 0, -1));
    } else if (ev.key === "PageDown") {
      goRoom(moveRoom(blob.room, 0, 1));
    }
  });
  document.addEventListener("keyup", (ev) => {
    if (world.ui.kind === "teleport") {
      feedTeleportKey(world.ui, ev.key, false, world);
    }
    if (ev.key === "o" || ev.key === "O") keys.left = false;
    else if (ev.key === "p" || ev.key === "P") keys.right = false;
    else if (ev.key === "q" || ev.key === "Q") keys.up = false;
    else if (ev.key === "a" || ev.key === "A") keys.down = false;
    else if (ev.key === " ") keys.fire = false;
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
    "50 Hz · HUD+playfield 256×192 · Q/A/O/P + mezerník · teleport 5 znaků · dveře inventář · ?dev=0";
  void stage;

  function frame(now: number): void {
    acc += now - last;
    last = now;
    if (acc > 100) acc = 100;
    while (acc >= TICK_MS) {
      const prev = blob.room;
      tick(prep, blob, input(), world);
      syncMusic(world);
      drainSfx(world);
      if (blob.room !== prev) {
        chromeRoom = -1;
        const hash = "#" + blob.room;
        if (location.hash !== hash) history.replaceState(null, "", hash);
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
