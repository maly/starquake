import { TICK_MS } from "./constants";
import { expectedDoorCode, teleportNameForRoom } from "./objects";
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
import type { GameData, Prepared } from "./types";

const DATA_BASE = "../out";

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

  const start = parseHash() ?? 0;
  const world = createWorld(prep, start);
  world.readTeleportCode = (ownName: string) => {
    const typed = window.prompt(
      `YOU HAVE ENTERED TELEPORT\nCODE : ${ownName}\nENTER TELEPORTAL DESTINATION CODE`,
      "",
    );
    keys.left = false;
    keys.right = false;
    return typed;
  };
  let blob = spawnBlob(prep, start, world);
  if (blob.room === start) enterRoom(prep, world, start, { blob });
  let overlay = false;
  let endShown = false;
  let lastMs = 0;
  let avgMs = 0;
  let frames = 0;
  let acc = 0;
  let last = performance.now();

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
    const dd22El = $("stat-dd22");
    dd22El.textContent = String(world.dd22);
    const padEl = $("stat-pad");
    padEl.textContent = world.pad ? `${world.pad.x}, ${world.pad.y}` : "—";
    const tpEl = $("stat-teleport");
    tpEl.textContent = teleportNameForRoom(blob.room) || "—";
    const doorEl = $("stat-door");
    const doors = prep.doorsByRoom?.[blob.room] ?? [];
    if (doors.length) {
      const need = expectedDoorCode(blob.room);
      const keys = need.map((n) => "$" + n.toString(16).toUpperCase()).join(" ");
      const hasUni = world.inventory.some((it) => it.sprite === 0x0f);
      doorEl.textContent = hasUni ? `${keys} (máš $0F)` : keys;
    } else {
      doorEl.textContent = "—";
    }
    const msgEl = $("stat-message");
    msgEl.textContent = world.message || "—";
    gotoEl.value = String(blob.room);
    $("time").textContent = lastMs.toFixed(2) + " ms";
    $("avg").textContent = avgMs.toFixed(2) + " ms";
    $("fps").textContent = avgMs > 0 ? (1000 / avgMs).toFixed(0) : "—";
    if (world.gameOver) showEndOverlay();
  }

  function draw(): void {
    const t0 = performance.now();
    const anim = animationSet(blob, world);
    renderWorld(prep, world, buf, imageData.data, blob.room, {
      items: true,
      overlay,
      blob: world.blobHidden
        ? null
        : { x: blob.x, y: blob.y, set: anim.set, frame: anim.frame, ink: world.blobInk },
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
    blob = spawnBlob(prep, room, world);
    enterRoom(prep, world, room, { blob });
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
    } else if (ev.key === "ArrowUp" || ev.key === "w" || ev.key === "W") {
      keys.up = true;
      ev.preventDefault();
    } else if (ev.key === " ") {
      keys.fire = true;
      ev.preventDefault();
    } else if (ev.key === "ArrowDown" || ev.key === "s" || ev.key === "S") {
      keys.down = true;
      ev.preventDefault();
    } else if (ev.key === "p" || ev.key === "P" || ev.key === "x" || ev.key === "X") {
      keys.fire = true;
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
    else if (ev.key === "ArrowUp" || ev.key === "w" || ev.key === "W") keys.up = false;
    else if (ev.key === "ArrowDown" || ev.key === "s" || ev.key === "S") keys.down = false;
    else if (ev.key === " " || ev.key === "p" || ev.key === "P" || ev.key === "x" || ev.key === "X") keys.fire = false;
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

  $("status").textContent =
    "50 Hz · šipky / WASD · Up sběr/pad · Down plošinka · mezerník palba · Left/Right teleport/dveře · jádro #199";
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
