import { TICK_MS } from "./constants";
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
import type { GameData, Prepared } from "./types";

const DATA_BASE = "../out";

const keys = { left: false, right: false, up: false, down: false };

function input(): Input {
  return { left: keys.left, right: keys.right, up: keys.up, down: keys.down };
}

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error("#" + id);
  return el;
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

async function boot(): Promise<void> {
  const canvas = $("screen") as HTMLCanvasElement;
  const rawCtx = canvas.getContext("2d", { alpha: false });
  if (!rawCtx) throw new Error("canvas");
  const ctx: CanvasRenderingContext2D = rawCtx;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  ctx.imageSmoothingEnabled = false;
  const imageData = ctx.createImageData(WIDTH, HEIGHT);
  const buf = newBuffers();
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
  ])) as [GameData["rooms"], GameData["graphics"], GameData["blocks"], GameData["sprites"], GameData["items"], GameData["actors"]];

  const prep: Prepared = prepare({
    rooms: pack[0],
    graphics: pack[1],
    blocks: pack[2],
    sprites: pack[3],
    items: pack[4],
    actors: pack[5],
  });

  const start = parseHash() ?? 0;
  const world = createWorld(prep, start);
  let blob = spawnBlob(prep, start, world);
  let overlay = false;
  let lastMs = 0;
  let avgMs = 0;
  let frames = 0;
  let acc = 0;
  let last = performance.now();

  function fitScale(): void {
    const scale = Math.max(1, Math.floor(Math.min(stage.clientWidth / WIDTH, stage.clientHeight / HEIGHT)));
    canvas.style.width = WIDTH * scale + "px";
    canvas.style.height = HEIGHT * scale + "px";
    $("scale").textContent = "×" + scale;
  }

  function updatePanel(): void {
    $("room-id").textContent = String(blob.room);
    $("room-col").textContent = String(roomCol(blob.room));
    $("room-row").textContent = String(roomRow(blob.room));
    $("item-count").textContent = String(prep.itemsByRoom[blob.room]?.length ?? 0);
    $("blob-xy").textContent = `${blob.x}, ${blob.y}`;
    const cell = cellPos(blob);
    $("blob-cell").textContent = `${cell.col}, ${cell.row}`;
    $("blob-vy").textContent = String(fallSpeed(blob));
    $("stat-energy").textContent = String(world.energy);
    $("stat-platforms").textContent = String(world.platforms);
    $("stat-firepower").textContent = String(world.firepower);
    gotoEl.value = String(blob.room);
    $("time").textContent = lastMs.toFixed(2) + " ms";
    $("avg").textContent = avgMs.toFixed(2) + " ms";
    $("fps").textContent = avgMs > 0 ? (1000 / avgMs).toFixed(0) : "—";
  }

  function draw(): void {
    const t0 = performance.now();
    const anim = animationSet(blob);
    renderWorld(prep, world, buf, imageData.data, blob.room, {
      items: true,
      overlay,
      blob: { x: blob.x, y: blob.y, set: anim.set, frame: anim.frame },
    });
    ctx.putImageData(imageData, 0, 0);
    const dt = performance.now() - t0;
    lastMs = dt;
    frames += 1;
    avgMs += (dt - avgMs) / Math.min(frames, 50);
    updatePanel();
  }

  function goRoom(id: number): void {
    const room = clampRoom(id);
    enterRoom(prep, world, room);
    blob = spawnBlob(prep, room, world);
    const hash = "#" + blob.room;
    if (location.hash !== hash) history.replaceState(null, "", hash);
  }

  document.addEventListener("keydown", (ev) => {
    if (ev.target instanceof HTMLInputElement) return;
    if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
      keys.left = true;
      ev.preventDefault();
    } else if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") {
      keys.right = true;
      ev.preventDefault();
    } else if (ev.key === "ArrowUp" || ev.key === "w" || ev.key === "W" || ev.key === " ") {
      keys.up = true;
      ev.preventDefault();
    } else if (ev.key === "ArrowDown" || ev.key === "s" || ev.key === "S") {
      keys.down = true;
      ev.preventDefault();
    } else if (ev.key === "PageUp") {
      goRoom(moveRoom(blob.room, 0, -1));
    } else if (ev.key === "PageDown") {
      goRoom(moveRoom(blob.room, 0, 1));
    }
  });
  document.addEventListener("keyup", (ev) => {
    if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") keys.left = false;
    else if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") keys.right = false;
    else if (ev.key === "ArrowUp" || ev.key === "w" || ev.key === "W" || ev.key === " ") keys.up = false;
    else if (ev.key === "ArrowDown" || ev.key === "s" || ev.key === "S") keys.down = false;
  });
  $("go").addEventListener("click", () => goRoom(parseInt(gotoEl.value, 10) || 0));
  gotoEl.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") goRoom(parseInt(gotoEl.value, 10) || 0);
  });
  overlayEl.addEventListener("change", () => {
    overlay = overlayEl.checked;
  });
  window.addEventListener("resize", fitScale);
  window.addEventListener("hashchange", () => {
    const id = parseHash();
    if (id !== null && id !== blob.room) goRoom(id);
  });

  $("status").textContent = "50 Hz · šipky / WASD pohyb · mezerník skok · dolů staví plošinku";
  fitScale();

  function frame(now: number): void {
    acc += now - last;
    last = now;
    if (acc > 100) acc = 100;
    while (acc >= TICK_MS) {
      const prev = blob.room;
      tick(prep, blob, input(), world);
      if (blob.room !== prev) {
        const hash = "#" + blob.room;
        if (location.hash !== hash) history.replaceState(null, "", hash);
      }
      acc -= TICK_MS;
    }
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

void boot().catch((err: Error) => {
  const el = document.getElementById("status");
  if (el) {
    el.textContent =
      "Nelze načíst data. python -m http.server 8000 z kořene repozitáře, /viewer/ (" + err.message + ")";
    el.className = "status error";
  }
});
