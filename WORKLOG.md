# WORKLOG

Živý stav enginu pro další sezení. Doplňuj na konec po každém úkolu; nahoře drž aktuální meze a ověření.

Poslední commit: `554c635` (spawn home `$9EE2`, energie `$7F`/`$DD30=0`, ink≠0). Working tree: jen `tmp_*_probe.py`.

## Tvrdé meze

- Nesahej na `reference/` (skool, ctl, `starquake.py`).
- Nepřepisuj Python extract, pokud o to výslovně nepožádám.
- Nesnižuj match thresholdy (emu vs export = 0 pixelů).
- Collision/static tile export (`rooms.json` `solid` / `$D280` overlay) neměň.
- Overlay dál ukazuje export `solid`; chůze, pad, zdviž a vetřelci berou `$D2F0` (`attr < $40`).
- Zatím **neimplementovat:** jádro `$C7`, security doors, zvuk `$D7C0`, minihra kódu `$D693`, výměna Cheops `$CCF1`, drop přeplněného inventáře `$D1CA`, objekt `$0E` (stroj na plošinky — **není** zelené pole), Arrow `$BF88` do extractu, původní stavovou obrazovku.
- Konstanty s ROM adresami do `docs/MOVEMENT.md` a comments v `constants.ts`.
- Untracked sondy **necommituj:** `tmp_aa30_probe.py`, `tmp_hover_probe.py`, `tmp_teleport_probe.py`, `tmp_attr64_probe.py`, `tmp_death_probe.py`, `tmp_killai_probe.py`, `tmp_killtile_probe.py`, `tmp_room52_probe.py`, `tmp_itemfx_probe.py`.

Ověření:

```
npm --prefix game test && npm --prefix game run build
python -m pytest tests/test_viewer.py tests/test_enemies.py tests/test_fire.py tests/test_items.py tests/test_transport.py tests/test_death.py
```

## Spuštění

```
npm start
```

http://127.0.0.1:8000/viewer/

Šipky / WASD chůze, Up/W sběr a nástup na pad, Down/S plošinka, mezerník palba, Left/Right na teleportu = kód, PageUp/Down místnost. `#8` start extra `$17` (dobíjení, nibble `$90`), `#13` puls `$70` (výboj `$DB88`), `#249` výtah, `#15` pad, `#343` teleport EXIAL, `#49` rostlina `$06`, `#52` badalien2, `#253` `$9F05`.

## Architektura

| soubor | role |
|---|---|
| `game/src/constants.ts` | ROM + `TEMP_JUMP_*` unbound + `TELEPORT_TABLE` + `DD22_*` + lift/pad + smrt A / `$06`/`$70`/`$80` |
| `game/src/types.ts` | `World`: `dd22`, `lastDir`, `station`, `pad`, `padShot*`, `collected`, `a350`, `extra`, `inventory`, `cheops`, `teleportLatch`, `message`, `readTeleportCode`, `lives`, `gameOver`, `d2c4`, `deathA`, `entry`, `pulses`, `pulseIndex` |
| `game/src/objects.ts` | `scanHotspots` (`$A90F`/`$AA02` z rooms+blocks+`block_attrs` raw: `$C0/$D0/$60/$70/$80/$90`), `evaluateTeleport`, `walkSpecialObjects` |
| `game/src/physics.ts` | tick (viz pořadí), `applyDeath` `$C350` |
| `game/src/projectiles.ts` | `tickFire` `$C85A`, `tickPadFire` `$CA15` |
| `game/src/entities.ts` | nasties + pad spawn/kopie, home `$9EE2`, ink `$9E1C`, `hitByBullet`, kontakt `$A305`, `$9F05`, AI 5/6 |
| `game/src/items.ts` | `$94E8` inventář; extra `$CC9A` / `$CCCC`; teleport/pad/rostlina sem nepatří |
| `game/src/render.ts` | `prepare()` hotspots, stamp pad, `blitPulses` `$DB88`, kreslí `nastyCount` slotů |
| `game/src/dump.ts` | `--fire-trace`, `--collect-test`, `--lift-test`, `--pad-test`, `--teleport-test`, `--teleport-eval`, `--death-test`, `--enemy-trace`, `--timing` |

Souřadnice: `$DD1D` X zleva, `$DD1E` Y odspodu; playY = `143 − gameY`. Start Blob: X=`$88` Y=`$3F`. Entity Y je game-Y.

Rozbory: `docs/notes/hoverpad.md`, `teleports.md`, `attr64.md`, `energy-death.md`, `kill-terrain.md`, `kill-enemies.md`, `item-effects.md`. Konstanty: `docs/MOVEMENT.md`.

### Tick

1. walk / lift `$C761` / pad `$C967`
2. plošinky jen při chůzi mimo `$D2CA` + `tickBridges`
3. palba Blob `$C85A` nebo pad `$CA15`
4. energy drain `$CB58`
5. `tickPickup` extra + `$94E8`
6. `walkSpecialObjects` `$0C`/`$0D`/`$06` (teleport i rostlina skip zbytku)
7. `energy==0` → `applyDeath(A=2)`
8. puls `$70` + AABB (`$9635`)
9. `tickNasties` (kontakt může `applyDeath`)
10. room exit (park v `enterRoom`)

`gameOver` zamkne tick. ROM je `$C8F4` pak `$CB8A` pak `$A530` pak `$A01B`; engine má objekty před východem, drain před vetřelci.

## Hotovo

- Extract: grafika, bloky, 512 místností, attrs `$EAD3`, solid bit 6 / `$64`, items `$94E8`, actors, `$AA30`.
- BLOB: ±2 px, pád `$C751`, inkoust + `attr < $40`, 4 směry `$C8F4`. Hop `TEMP_JUMP_*` unbound.
- Plošinky `$C79F`. Nepřátelé 4 sloty, stampGrafix, park se nekreslí. Home `$9EE2` (Z80 `SUB`/`ADD`, `$DAC1` hrana, OOB ≠ vzduch). Ink 0 → `$9E16` 2…6. S padem `nastyCount=3`.
- Střelba `$C85A`, předměty `$94E8` (inventář, **ne** refill) + extra `$A350` / `$CC9A` (`$11`–`$16` tabulka, `$17` `$CCCC`, `$18` lives+1 bez stropu `$7F`, `$19` Cheops flag).
- Vznášedlo `$0C` / `$C967` / `$CA15`. Teleport `$0D` / `$D036` (prompt, ne Spectrum overlay).
- Zdviž `$64` / `$DD22=1`. `$D2F0` 2 řady když `(Y+1)∧7=0`, jinak 3 — otvor `$44` v `#249` neposkakuje.
- Energie `$CB58` −4 při wrap `$78` (`$DD30` start 0, energie `$7F` jako nová hra); obtěžující `$DD30 += $0A` (až 4×/tick, bez i-frames). Smrt `applyDeath` `$C350`: flash 45 / `$BEC8`×4 let 80 / HALT 50, pak A=2 nula, A=1/`$11` vetřelec, A=`$10` rostlina `$06`, A=0 puls `$70`. Životy 4, DEC, energy `$7F`, plat `∨$08`. lives=0 → animace a `GAME OVER`. Puls `$70`: AABB + kresba `$DB88` (L=5/6/7) když flag≠0.
- `$9F05` nibble `$80` → živý `$B2C8` AI 6. Perioda spawnu 4…8. AI 5 dir=0 / RRCA, AI 3 zapisuje 8-směr. `$A2B9` = `$08,$09,$01,$05,$04,$06,$02,$0A`.

Ověřeno (working tree): `npm test` 95 pass; pytest viewer+enemies+fire+items+transport+death 22 pass (enemies rooms 0, 1, 52, 253); live ~0,24 ms/snímek (limit 20).

## Otevřené

1. `TEMP_JUMP_*` unbound; originál skáče jetpackem / plošinou / zdviží.
2. `$DD26` lean-to-stop `$E674` — engine drží poslední walk pose (na padu `SEATED_SETS`).
3. Overlay `$D280` vs chůze `$D2F0` — na obrazovce obráceně, podle ROM správně. Hotspot `$06` je overlay-solid a `$D2F0` průchozí.
4. `$DF70` bit-shift `X∧7≠0` — `blitGrafix` emuluje; live je stamp.
5. Podlaha dál `$D2F4` foot-column, ne inkoust nohou.
6. Live `$DAC6` po `$A80A` — engine seed `$7530+id×12`. Extra spawn, pad bounce i perioda `$70` z `dac0` po spawn vetřelců.
7. Jádro `$C7`, security doors. Smrt v `$C7` jde na `$A6C1` (mimo rozsah).
8. Animace 4 GRAFIX snímků vetřelce — frame 0. Pad vždy `$AFC8`.
9. Extra `$17`/`$18` v enginu (`$CCCC` / přetečení `$CCBC`). 1. tick Up bez `$14+` vsune `00 00` do inventáře — mimo rozsah.
10. Inventář overflow `$D1CA`, Cheops UI, pickup `$0F`/`$10` (kód / `$B0`).
11. Arrow `$BF88` ve zdviži — není v extractu.
12. `skip64` vs `$A132` (řada Y+1, skip jen Y, exact `$64`).
13. Objekt `$0E` (auto-plošiny při dopadu).
14. Zvuk `$D7C0`, teleport overlay, plný `$64A0` — až řeknu. Puls `$DB88` se kreslí (flag≠0).

## Sezení

### 2026-08-26 — doprava + oprava zdviže `#249`

Orchestrátor: souběžné rozbory pad / teleport / `$64` → implementace → testy jiným agentem.

Spor: `$C6D6`/`$D2CA` je stanice `$0C`, ne (0,0). `$0E` mimo rozsah. Arrow `$BF88` bez extractu.

Bug `#249`: u otvoru `$44` Blob poskakoval, protože `$D2F0` sondovalo 2 řady místo 3 při nezarovnaném Y (`$D330`). Idle jízda teď otvorem projede; jeden snímek uprostřed lze Left/Right vystoupit.

### 2026-08-26 — energie, životy, smrtící terén a vetřelci

Orchestrátor: souběžné rozbory energie/smrti, terénu `$06`/`$70`, smrtících vetřelců → implementace → testy jiným agentem → oprava AI 3 / `$A2B9` po FAIL room 52.

Spor 1: `$C544` A≥`$64` **není** smrtící terén. Terén je objekt `$06` (nibble `$60`), AABB `$CBBB`, `JP $C350` A=`$10`. Práh `$A526 CP $64` je reload vs běžný tick (A=`$FF`). `$64` zdviž je jiné číslo.

Spor 2: `$A2B9` je `$08,$09,$01,$05,$04,$06,$02,$0A` (ne `$04/$05` prohozené). AI 3 `$A236` zapisuje 8-směr přes `$A2C1`; engine dřív měnil jen rychlost → room 52 frame 14 slot 2 Y 127 vs 125.

Spor 3: start stats `$17/$30/$7E` jsou snapshot, ne nová hra (`$7F/$32/$7F`). Engine nechává snapshot.

`$9F05` (nibble `$80`, místnost 253) a AI 5 dir=0 (místnost 52) sedí krok za krokem s emu. Extra `$17`: lives==0 → +1, jinak no-op.

### 2026-08-26 — spawn grafik, zdi, teleport latch, mezerník

1. Náhodný typ bral `modBias($DAC0, $0F, $11) % 16` → často index 1 = `badalien1` (actors.png ř. 0 sl. 16–19) mezi obtěžujícími. ROM `$9DE6` je `$DAC1 SUB $0F ADD $11` → 2…16, tedy `badalien2` (ř. 1 sl. 0–3) + AI 5. `$B2C8` zůstává jen u `$9F05` (nibble `$80`).
2. `$D2F0` u vetřelce sondovalo 2 řady i při nezarovnaném Y; ROM `$D330` dá 3. Procházeli zdí na třetí řadě.
3. Po `prompt()` zůstala držená šipka: `teleportLatch` blokuje overlay, ale ne chůzi. Latch teď maže Left/Right ve `steer` a viewer po promptu klávesy shodí.
4. Palba: mezerník (P/X pořád platí).

### 2026-08-26 — animace smrti `$C35E`

BLOB se zarazí, 45 snímků XOR inkoustu `$05`, čtyři `$BEC8` obláčky 80 snímků (`$A01B`, směry `$C498`), 50 HALT, teprve pak DEC života / respawn. ROM bliká jen A∧7=2; engine bliká u všech smrtí. Zvuk `$D7C0` ne. `--death-test` dokroutí sekvenci (do 200 ticků).

### 2026-08-26 — účinky sbíraných předmětů

Orchestrátor: rozbor `$CE82`/`$D09F` → implementace extra `$CC9A` → ověření jiným agentem.

Spor: zadání čekalo refill z `$D09F`. Emu (`tmp_itemfx_probe.py`): `$D09F`/`$94E8` jde do inventáře, `$CC9A`=0, `$D4E9`=0. Staty mění jen extra typ `$01`. `$D4E9` je SUB (min 0); zvyšuje `$CC9A` (ADD od `$D2CC` + `$D425`). Druhá rutina na `$D4xx` je `$D422` skóre, ne refill.

`$17` při lives≠0 **není** no-op: `$CCCC` A=`$12`/`$14`/`$16` (energie +`$60` / plošinky +`$32` / palba +`$3C`). `$18` lives+1 bez stropu (`$7F`→`$80`, `$FF`→0). `$0E`/`$0F` zdokumentované, mimo rozsah.

Ověřeno jiným agentem: `npm test` 85; pytest 22.

### 2026-08-26 — extra `$11`–`$19` nebyly vidět

Spawn hledal nakreslený attr `$90` (0 buněk v exportu). ROM `$A90F` bere raw nibble `$90` do `$96CB`, stejně jako `$C0` pad. 399 místností má ≥2 markery; start `#8` spawne extra `$17` na (13,19). Panel: `Extra $A350` ukáže sprite i buňku. Sebrání extra je AABB (bez Up), `$94E8` pořád Up.

### 2026-08-26 — výboje `$70` / `$DB88`

Sloupy (terén) byly, AABB zabíjela, jiskra se nekreslila. `$A66C` při flag≠0 XOR `$DC55` L=`$05` a anim L=`$06`/`$07` (`$A6BD`), attr `$44`+(`$DAC0`∧3). Engine kreslí na snímek, ne persist XOR. Panel `Puls $70`. Příklad `#13`.

### 2026-08-26 — energie `$7F` a ink 0

Snapshot `$17`/`$DD30=$51` došel za ~13 s. Engine bere novou hru `$6343`/`$D425` energie `$7F`, `$DD30=0` (první −4 po `$78` ticích ≈ 2,4 s, do nuly ≈ 77 s). Plošinky/palba dál snapshot. Ink `$9E1C` 0 na paper 0 je neviditelný; při 0 se bere `$9E16` `SUB $05 ADD $07` (2…6).

### 2026-08-26 — spawn vetřelců ve stropě

Home `$9EE2` bral `modBias` (bez underflow) a `$DAC2` bit 0. Y vycházelo `$9F`–`$B7` nad play-area; `spawnCellOk` bralo OOB jako `$47`. ROM: po `RRCA` `$DAC0` `SUB $09 ADD $0F` / `SUB $17 ADD $1B`, hrana z `$DAC1`. Mimo 32×18 teď není vzduch.

### 2026-08-26 — tempo výbojů `$A66C`

Engine toggloval **všechny** pulsy každý 50 Hz tick (perioda 8…20 → 0,16–0,4 s). ROM `$A66C` INC `$9634`, wrap `$04`, DEC jen jeden záznam; prázdný řádek RET. Jeden puls se aktualizuje každé 4 snímky: perioda 8 → 9 návštěv × 4 = 36 ticků ≈ 0,72 s fáze; 12 → 1,0 s; 20 → 1,7 s. Wrap je DEC na `$FF` (ne nula). AABB pořád kontroluje všechny flagy (`$A530`). Úbytek `$CB58`/`$78` beze změny tempa; později start energie `$7F`/`$DD30=0` (viz sezení výše).
