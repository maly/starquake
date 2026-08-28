# UI verify — důkazy hotovosti

Ověřovací běh (ne implementace). Datum: 2026-08-27.  
Nástroje: `tmp_ui_verify_probe.py`, `tmp_ui_engine_hud.ts`, `tmp_ui_layout_probe.py`, `npm --prefix game test`, `node viewer/dump.js --timing`, pytest suite níže.

## Kritéria

| # | kritérium | výsledek |
|---|---|---|
| 1 | Obrazovka 32×24, playfield od řádku 6, status dle `ui-layout.md` | **PASS** |
| 2 | Status reaguje na změny; bary se stropem `$7F` (`$D463`) | **PASS** |
| 3 | Hlášení dveří/teleportů; zadání kódu bez `window.prompt` | **PASS** |
| 4 | ATTR+bitmap řádky 0–5 vs headless emu bod po bodu | **PASS** |
| 5 | Suite zelená + timing ≤20 ms/snímek (50 Hz) | **PASS** |

---

## 1. Layout 32×24 / playfield od 6

- Engine: `game/src/ui/screen.ts` — `SCREEN_COLS=32`, `SCREEN_ROWS=24`, `PLAY_ROW0=6`, `PLAY_Y0=48`.
- `clearPlayfield` maže jen řádky 6–23 na ATTR `$47`; HUD beze změny (`tmp_ui_engine_hud.ts` → `clear_playfield.hud_unchanged=true`, `play_row6_attr=71`).
- Emu `$A647`: status řádek 0 nedotčen, play od `$58C0` → `$47` (`tmp_ui_layout_probe.py`).
- Chrome UDG `$91`–`$97` na pozicích z `ui-layout.md` (`drawChrome`); srovnání s emu **chrome_only**: 0 ATTR / 0 pixel mismatch (viz tabulka §4).
- Viewer `main.ts`: full-screen 256×192, playfield blit na `Y+48`.

---

## 2. Dynamický status + strop `$7F`

- `drawStatus` = `$D425`: skóre AT (2,3), lives (3,11), blank+bary (1–3,16), inventář (1–2,21…).
- `barGlyphs` / `clampStat`: `$00`…`$7E` mapování + `$7F`/`≥$7F` → 4×`$28` (`bars.test.ts`).
- Emu `$D425` po vstupu `$FF`/`$80` uloží `$7F` do `$D2CD`/`$D2CE`; vizuál bary shodný s enginem (`bars_cap` v probe).
- Unit: `chrome.test.ts` „ATTR matches $D425“ — `$47` skóre, `$46` lives, `$42`/`$44` energie, `$40` inventář blank.
- Runtime: `clampWorldStats` každý frame v `main.ts` před `drawStatus`.

---

## 3. Dveře / teleport UI, žádný `window.prompt`

- Grep `game/src/**/*.ts`: **žádné** volání `window.prompt` (jen komentář v `objects.ts` že se nepoužívá).
- Teleport: FSM `ui/overlay.ts` (`feedTeleportKey` / `$D5C8` release gating, 5 znaků); testy `overlay.test.ts`, `goal.test.ts`.
- Dveře: inventářová minihra (`beginDoorUi` + `doorKeysAccepted`), texty přesné:
  - `SECURITY  DOOR` AT 8,9; `ACCESS  CODE` AT 15,10;
  - OK `ACCESS AUTHORISED` AT 21,7; fail `ACCESS CODE INVALID` AT 21,6.
- Teleport texty: `YOU HAVE ENTERED` / `TELEPORT` / `CODE : `+jméno / `ENTER TELEPORTAL` / `DESTINATION CODE` / `NOW TELEPORTING` / `CODE NOT RECOGNISED` (dump v probe).
- `dump.js --door-test --room 176` po doběhnutí overlay FSM: `shifted=true`, `message=ACCESS AUTHORISED`, `d2c4=3`.

---

## 4. Porovnání s emulátorem (řádky 0–5)

Metoda: chrome (`$D3DF`+panely) + `$D425` v `tmp_ui_layout_probe` harness; engine `drawChrome`+`drawStatus` přes `tmp_ui_engine_hud.ts`. Region: **char řádky 0–5**, všechny **32 sloupce**, ATTR + 8 bitmap bajtů/buňka.

| region / scénář | stats (L/E/P/F + score) | ATTR mismatch | pixel-cell mismatch | PASS |
|---|---|---:|---:|---|
| chrome_only | (jen UDG) | 0 | 0 | yes |
| known_mid | 4 / `$17` / `$30` / `$7E` + `002950` | 0 | 0 | yes |
| bars_cap | 4 / `$FF`→draw `$7F` / `$80`→`$7F` / 0 + zeros | 0 | 0 | yes |
| bars_zero | 9 / 0 / 0 / 0 + `123456` | 0 | 0 | yes |
| bars_7f | 4 / `$7F`×3 + zeros | 0 | 0 | yes |

Souhrn: `tmp_ui_verify_result.json` → `all_pass: true`.

### Co nešlo navodit v emu 1:1

| situace | důvod | náhradní ověření |
|---|---|---|
| Celý security overlay včetně animace `$D5FD` (házení cifer, match) | Složitá minihra + zvuky/HALT; ne stejný seed bez plné smyčky | Textové AT+stringy enginu vs `ui-messages.md`; mechanika inventáře v `goal.test.ts` |
| Live teleport keyboard `$CF93`/`$D5C8` v headless Z80 | Chybí Spectrum keyboard / porty v harnessi | Engine FSM vs tabulka `$D036`; overlay text dump |
| Inventář 2×2 `$DB24` pixely ve statusu | Srovnání §4 běželo s prázdným `$D2D2` (deterministické ATTR/bitmap) | Pozice slotů 21/23/25/27 + XOR blit v `drawInventory`; layout probe dříve ověřil emu pozice |
| `$D4E9` single-cell úbytek | Mimo full `$D425` refresh | Dokumentováno v `ui-layout.md`; full redraw cesta je hlavní HUD |

---

## 5. Suite + timing

### npm

```
npm --prefix game test   → 121 pass, 0 fail
npm --prefix game run build → bundle.js + dump.js OK
```

### pytest (požadované)

```
tests/test_viewer.py tests/test_enemies.py tests/test_fire.py
tests/test_items.py tests/test_transport.py tests/test_death.py tests/test_goal.py
→ 25 passed
```

### Timing (`node viewer/dump.js --timing --repeat 80`)

| metrička | hodnota | limit 20 ms @50 Hz |
|---|---:|---|
| static `mean_ms` (renderRoom) | **0.50 ms** | PASS |
| live `live_mean_ms` (tick+renderWorld) | **0.52 ms** | PASS |
| live_fps (odvozené) | ~1938 | ≫ 50 |

(Opakovaný běh dříve: live ~1.35 ms — stále ≪ 20 ms.)

---

## Opravy provedené při ověření (ne „feature“ práce)

1. **`game/src/ui/chrome.ts`** — `drawStatus` sdílí jeden `PrintState` přes skóre/lives/bary/inventář, aby BRIGHT 1 z `$D550` přetrval jako Spectrum print kanál (bez toho ATTR lives/bary/inv blank byly `$06`/`$02`/`$07` místo `$46`/`$42`/`$40`). Nutné pro kritérium 4.
2. **`game/src/dump.ts` `--door-test`** — po UI overlay je potřeba ~65 ticků FSM než `applySecurityDoor`; harness dřív dělal 1 tick → pytest `test_door_opens_with_key` fail. Nutné pro kritérium 5.

## Zbytkové mezery

1. Pixel-perfect overlay playfieldu (dveře/teleport) vs ROM screenshot **neprobed** end-to-end; jen textové konstanty + FSM.
2. `drawStatus` **nekouše** world stats na `$7F` (to dělá `clampWorldStats`); vizuál bary ano. Emu `$D425` zapisuje strop do paměti.
3. Inventář se sprity: ATTR/bitmap slotů vs `$DB24` v tomto běhu neporovnán buňka-po-buňce.
4. `$D4E9` inkrementální update jedné buňky baru — engine spoléhá na plný `drawStatus` každý frame (dostačuje vizuálně, jiná cesta než ROM).
5. `spec/notes/ui-messages.md` open Q #5 stále zmiňuje starý `window.prompt` u teleportu — **zastaralé** vůči aktuálnímu kódu; ponecháno (verify doc to opravuje fakticky).

## Soubory důkazů

- `tmp_ui_verify_probe.py` / `tmp_ui_engine_hud.ts` / `tmp_ui_verify_result.json`
- `tmp_ui_layout_probe.py` (emu chrome+`$D425`)
- `game/src/ui/*.test.ts`, `game/src/goal.test.ts`
