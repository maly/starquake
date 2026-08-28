# Sound verify — důkazy hotovosti

Ověřovací běh (ne implementace). Datum: 2026-08-27.  
Nástroje: čtení `game/src/audio/*` + hooky, `npm --prefix game test`, `npm --prefix game run build`, `node viewer/dump.js --timing --repeat 80`, pytest suite níže, grep (`window.prompt`, `player.ts`, `$A41B`, MIME).

`all_pass: true`

## Kritéria

| # | kritérium | výsledek |
|---|---|---|
| 1 | Dokumentovaná tabulka efektů: 5 B, odvozené parametry, volající + adresy (`sound-effects.md` + `MOVEMENT.md` § zvuk) | **PASS** |
| 2 | Efekty při událostech volajících `$D7C0` v playable enginu; automat událost → `world.sfx` | **PASS** |
| 3 | BGM smyčka, nezávislý mute/gain, vypnutí hudby nechá SFX; chybějící `viewer/bgm.mp3` neshodí hru | **PASS** |
| 4 | Zvuk po prvním vstupu (unlock + pending); běh ≪ 20 ms/snímek (`dump.js --timing`) | **PASS** |
| 5 | Suite zelená (`npm test` / `build` / pytest) | **PASS** |
| 6 | `docs/MOVEMENT.md` doplněný o zvuk + nedořešené | **PASS** |

---

## 1. Dokumentace tabulky `$D839`

- [`sound-effects.md`](sound-effects.md): 24×5 B na `$D839`…`$D8B0`, vzorec periody **112+45D / 134+45D** T, F bity, 28× `CALL $D7C0` s adresami, kanál `$A41B` / `$6600` oddělen.
- [`MOVEMENT.md`](../MOVEMENT.md) § „Zvuk `$D7C0`“: stejných 24 řádků (H0 H1 L X F + událost), in-game hooky, nedořešené `$A41B` / `$6600` / digit-roll / IM1 / MP3.
- Engine `SFX_TABLE` v `game/src/audio/effects.ts` = bajty z dokumentace 1:1 (ověřeno `$0C`/`$14`/`$12`/`$17` v `effects.test.ts`; celá řada A=`$00`…`$16` při ověření `simulateSfx.nOut` vs sonda v `sound-effects.md`).

| A | n_out dokument | n_out `simulateSfx` |
|---|---:|---:|
| `$00`…`$16` | viz tabulka | **shoda všech 23** |
| `$17` | hang | `nOut=0`, prázdné PCM |

---

## 2. Hooky playable enginu vs `sound-impl.md`

Automat: `game/src/audio/hooks.test.ts` (událost → pole `world.sfx`). Fronta se plní `requestSfx` (`effects.ts`); `$17` a mimo 0…23 se zahodí.

| engine událost (`sound-impl.md`) | A | kód | test `world.sfx` |
|---|---|---|---|
| krok, wrap `ANIM_PERIOD`, jen `$DD22=0` | `$14`/`$15` XOR `$C6FF` | `physics.ts` `applyWalk` (`sfxStep ^= 1`) | `[0x15]` pak `[0x14]`; pad ne |
| `applyDeath` vždy | `$13` | `physics.ts` | `[0x13, 0x0f]` / `[0x13]` |
| `applyDeath` `(A∧7)==2` (energie `$02`) | navíc `$0F` | totéž | energie ano, terén `$10` ne |
| `hitByBullet` | `$12` | `entities.ts` | `includes(0x12)` |
| sběr `$94E8` unshift | `$0C` | `items.ts` `collectTableItem` | Up+item ano; prázdný Up ne |
| extra `$CC9A` (ne Cheops `$19`) | 1. B `$CCBC` | `items.ts` `applyExtra` → `off` | `$11`→`$01`; Cheops `[]` |
| dveře start overlay | `$08` | `overlay.ts` `beginDoorUi` | `includes(0x08)` |
| dveře result OK | `$0A` pak `$0F` | `tickDoorUi` | `[0x0a, 0x0f]` |
| dveře result fail | `$0F` | totéž | `[0x0f]` |
| teleport start | `$07` | `beginTeleportUi(room, world)` | `includes(0x07)` |
| teleport přijatý znak | `$11` | `feedTeleportKey` | `[0x11]` |
| teleport result OK | `$10` pak `$09` | `finishTeleportInput` | `[0x10, 0x09]` |
| teleport result fail | `$0F` | totéž | `includes(0x0f)` |
| socket `$0B`+`$10` úspěch | `$08` | `objects.ts` `tryClearSocket` | `includes(0x08)` |
| díl jádra `$A6C1` | `$03` jednou / díl | `core.ts` `matchCoreDeliveries` | `includes(0x03)` |
| ceremony start | `$14`/`$15` z `dac0∧1` | `beginCoreCeremony` | `[0x14]` / `[0x15]` |
| výhra `corePairs==5` | `$11` jednou | `deliverCoreParts` | `includes(0x11)` |

Playable volající předávají `world` do overlay (`physics.ts` `tick` / `tickOverlay`, `main.ts` `feedTeleportKey`). ROM smyčky `B=n CALL $D7C0` = jeden `requestSfx` na fázi (dveře/teleport/jádro), ne n-krát v ticku.

### Záměrně nespouštěné (shoda s `sound-impl.md`)

- menu / define keys / hi-score
- Cheops `$CD17`/`$CDDC`, digit-roll `$D679`/`$D70E`
- stroj `$0E`, místnost ±1 `$0F`
- prázdný Up bez sběru (`$D1CA` v ROM by hrál `$0C`)
- palba / pád / plošinka / oblaka = kanál `$A41B` — `audio/channel.ts` + hooky; ne `$D7C0`
- `$A41B` se **nehrálo** jako `$D7C0`
- `melody.ts`: jen id 1–5 + komentář, **bez** přehrávače `$6600`/`$D9DE`

### Odchylky od `sound-impl.md` (žádná nemění A)

1. Overlay helpery (`beginTeleportUi`, `feedTeleportKey`, `finishTeleportInput`, `tickDoorUi`) mají `world?` volitelné — SFX se přeskočí bez `world`. Playable cesta `world` vždy předá.
2. Výhra `$11` je za `if (!world.gameOver)` (jednou; po `composeEndResult` se neopakuje). Impl: „jednou“.
3. Krok je v `applyWalk`, ne v samostatné `walkTick` — podmínka je totéž (`walkTick >= ANIM_PERIOD` ∧ `dd22===0`).

---

## 3. BGM + mute/gain + chybějící MP3

`game/src/audio/player.ts`:

- BGM: `new Audio("bgm.mp3")`, `loop=true`, vlastní `GainNode`; mute BGM (`bgmMuted`) **nesahá** na `sfxGain`.
- Master mute (`muted`) vypne obojí. Persist: `starquake.audio.muted` / `bgmMuted` / `sfxGain` / `bgmGain`.
- Chybějící soubor: `error` → `console.warn`, `play().catch`; `createMediaElementSource` v `try/catch`. Žádný throw. **`viewer/bgm.mp3` v repu není** (nedořešené v `MOVEMENT.md`) — hra se nenačítá přes ten soubor.
- Viewer: `#audio-strip` v `#stage`, **mimo** `aside.panel`. `body.dev-off` (`?dev=0`) schová jen `.panel`.
- `server.ts` MIME `".mp3": "audio/mpeg"`.
- Grep `game/src/**/*.ts`: **žádné** volání `window.prompt` (jen komentář v `objects.ts`).

---

## 4. Unlock / pending / 50 Hz

- `main.ts`: `unlock()` na `keydown` / `pointerdown` / `click`; `drainSfx(world)` **po** `tick` ve smyčce 50 Hz.
- `playSfx` při `ac.state === "suspended"` **nevolá** `startSfx` (první SFX by zmizel); `enqueueSfx` + `kickResume` → `flushPending` po `resume`. `$17` se nehraje.
- `dump.ts` **neimportuje** `player.ts`. Po buildu `viewer/dump.js` nemá `AudioContext` / `unlock` (obsahuje jen `requestSfx` z enginu). Node testy bez Web Audio.

### Timing (`node viewer/dump.js --timing --repeat 80`)

| metrička | hodnota | limit 20 ms @50 Hz |
|---|---:|---|
| static `mean_ms` (`renderRoom`) | **0.243 ms** | PASS |
| live `live_mean_ms` (`tick`+`renderWorld`) | **0.253 ms** | PASS |
| live_fps (odvozené) | ~3950 | ≫ 50 |

`dump --timing` neměří `drainSfx`/PCM (záměr: tick bez `AudioContext`). Syntéza je mimo 50 Hz smyčku (AudioBuffer + `AudioBufferSourceNode`).

---

## 5. Suite + build

### npm

```
npm --prefix game test   → 144 pass, 0 fail (vč. effects.test.ts + hooks.test.ts)
npm --prefix game run build → viewer/bundle.js 130.0kb, viewer/dump.js 105.6kb
```

### pytest (požadované)

```
tests/test_viewer.py tests/test_enemies.py tests/test_fire.py
tests/test_items.py tests/test_transport.py tests/test_death.py tests/test_goal.py
→ 25 passed
```

Opravy harnessu při ověření: **žádné**.

---

## 6. `MOVEMENT.md`

Sekce „Zvuk `$D7C0`“ (tabulka A + 5 B, hooky, BGM, **nedořešené:** `$A41B`, `$6600`, digit-roll `$D679`, IM1 jitter, MP3 od zadavatele). Open Q #5 odkazuje sem.

---

## Kontroly kódu (checklist ze zadání)

| kontrola | výsledek |
|---|---|
| `audio/{effects,synth,player,melody}.ts` + `*.test.ts` | effects/hooks testy; melody jen konstanty |
| hooky physics / entities / items / objects / core / overlay | viz §2 |
| `main.ts` drain po tick, unlock na gesture | ano |
| `dump.ts` neimportuje `player.ts` | ano |
| audio strip mimo `aside.panel` i `?dev=0` | ano |
| `server.ts` MIME `.mp3` | ano |
| žádný `window.prompt` | ano |
| `melody.ts` bez přehrávače `$6600` | ano |
| `$A41B` se nehrálo jako `$D7C0` | ano |
| `requestSfx` ignoruje `$17` | ano |
| `playSfx` při suspended nebere první SFX (pending) | ano (kód; bez `AudioContext` unit testu) |

---

## Zbytkové mezery

1. **`viewer/bgm.mp3` není v repu** — ticho + warn; smyčka ověřena kódem, ne ušima v prohlížeči.
2. **Pending/unlock** nemá `player.test.ts` (Node bez `AudioContext`).
3. Hook test extra pokrývá `$01` + Cheops ticho; `$00`/`$02`/`$03` jdou stejnou větví `requestSfx(off)` (`EXTRA_EFFECTS`).
4. `n_out` v commitu je u `$00`/`$0C`/`$12`/`$14`/`$17`; zbytek tabulky shodný při ověření, není v suite.
5. **`$A41B` / `$6600` / digit-roll / IM1** — záměrně mimo; viz `MOVEMENT.md`.
6. První `simulateSfx` v prohlížeči (cache PCM) dump timing neměří; po unlock mimo tick accounting.

## Soubory důkazů

- `game/src/audio/effects.test.ts`, `hooks.test.ts`
- `game/src/audio/{effects,synth,player,melody}.ts`
- `viewer/index.html` (`#audio-strip`), `viewer/style.css` (`body.dev-off .panel`)
- `node viewer/dump.js --timing --repeat 80` → JSON výše
- `docs/notes/sound-effects.md`, `sound-impl.md`, `docs/MOVEMENT.md`
