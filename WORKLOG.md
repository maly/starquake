# WORKLOG

Živý stav enginu pro další sezení. Doplňuj na konec po každém úkolu; nahoře drž aktuální meze a ověření.

Poslední commit: `276cdb2` (střelba, předměty, vznášedlo, teleporty, zelené pole, `$D2F0` 3 řady).

## Tvrdé meze

- Nesahej na `reference/` (skool, ctl, `starquake.py`).
- Nepřepisuj Python extract, pokud o to výslovně nepožádám.
- Nesnižuj match thresholdy (emu vs export = 0 pixelů).
- Collision/static tile export (`rooms.json` `solid` / `$D280` overlay) neměň.
- Overlay dál ukazuje export `solid`; chůze, pad, zdviž a vetřelci berou `$D2F0` (`attr < $40`).
- Zatím **neimplementovat:** jádro `$C7`, security doors, zvuk `$D7C0`, smrt/respawn `$C35E` pořádně (teď jen `energy=0`), minihra kódu `$D693`, výměna Cheops `$CCF1`, drop přeplněného inventáře `$D1CA`, objekt `$0E` (stroj na plošinky — **není** zelené pole), Arrow `$BF88` do extractu.
- Konstanty s ROM adresami do `docs/MOVEMENT.md` a comments v `constants.ts`.
- Untracked sondy **necommituj:** `tmp_aa30_probe.py`, `tmp_hover_probe.py`, `tmp_teleport_probe.py`, `tmp_attr64_probe.py`.

Ověření:

```
npm --prefix game test && npm --prefix game run build
python -m pytest tests/test_viewer.py tests/test_enemies.py tests/test_fire.py tests/test_items.py tests/test_transport.py
```

## Spuštění

```
npm start
```

http://127.0.0.1:8000/viewer/

Šipky / WASD chůze, Up/W sběr a nástup na pad, Down/S plošinka, P/X palba, Left/Right na teleportu = kód, PageUp/Down místnost. `#249` výtah, `#15` pad, `#343` teleport EXIAL.

## Architektura

| soubor | role |
|---|---|
| `game/src/constants.ts` | ROM + `TEMP_JUMP_*` unbound + `TELEPORT_TABLE` + `DD22_*` + lift/pad |
| `game/src/types.ts` | `World`: `dd22`, `lastDir`, `station`, `pad`, `padShot*`, `collected`, `a350`, `extra`, `inventory`, `cheops`, `teleportLatch`, `message`, `readTeleportCode` |
| `game/src/objects.ts` | `scanHotspots` (`$A90F`/`$AA02` z rooms+blocks+`block_attrs` raw), `evaluateTeleport`, `walkSpecialObjects` |
| `game/src/physics.ts` | tick (viz pořadí) |
| `game/src/projectiles.ts` | `tickFire` `$C85A`, `tickPadFire` `$CA15` |
| `game/src/entities.ts` | nasties + pad spawn/kopie, `hitByBullet` (`shotFlying`) |
| `game/src/items.ts` | `$94E8` / extra; teleport/pad sem nepatří |
| `game/src/render.ts` | `prepare()` hotspots, stamp pad, kreslí `nastyCount` slotů |
| `game/src/dump.ts` | `--fire-trace`, `--collect-test`, `--lift-test`, `--pad-test`, `--teleport-test`, `--teleport-eval`, `--timing` |

Souřadnice: `$DD1D` X zleva, `$DD1E` Y odspodu; playY = `143 − gameY`. Start Blob: X=`$88` Y=`$3F`. Entity Y je game-Y.

Rozbory: `docs/notes/hoverpad.md`, `teleports.md`, `attr64.md`. Konstanty: `docs/MOVEMENT.md`.

### Tick

1. walk / lift `$C761` / pad `$C967`
2. plošinky jen při chůzi mimo `$D2CA`
3. palba Blob `$C85A` nebo pad `$CA15`
4. `tickNasties` (zásah střely)
5. energy drain
6. `tickPickup` extra + `$94E8`
7. `walkSpecialObjects` `$0C`/`$0D` (teleport hned `applyTeleport`, zbytek ticku skip)
8. room exit (park v `enterRoom`)

ROM je `$C8F4` pak `$CB8A`; engine má objekty před východem.

## Hotovo

- Extract: grafika, bloky, 512 místností, attrs `$EAD3`, solid bit 6 / `$64`, items `$94E8`, actors, `$AA30`.
- BLOB: ±2 px, pád `$C751`, inkoust + `attr < $40`, 4 směry `$C8F4`. Hop `TEMP_JUMP_*` unbound.
- Plošinky `$C79F`. Nepřátelé 4 sloty, stampGrafix, park se nekreslí. S padem `nastyCount=3`.
- Střelba `$C85A`, předměty `$94E8` + extra `$A350`.
- Vznášedlo `$0C` / `$C967` / `$CA15`. Teleport `$0D` / `$D036` (prompt, ne Spectrum overlay).
- Zdviž `$64` / `$DD22=1`. `$D2F0` 2 řady když `(Y+1)∧7=0`, jinak 3 — otvor `$44` v `#249` neposkakuje.

Ověřeno při `276cdb2`: `npm test` 62 pass; pytest viewer+enemies+fire+items+transport 13 pass; live ~0,54 ms/snímek (limit 20).

## Otevřené

1. `TEMP_JUMP_*` unbound; originál skáče jetpackem / plošinou / zdviží.
2. `$DD26` lean-to-stop `$E674` — engine drží poslední walk pose (na padu `SEATED_SETS`).
3. Overlay `$D280` vs chůze `$D2F0` — na obrazovce obráceně, podle ROM správně.
4. `$DF70` bit-shift `X∧7≠0` — `blitGrafix` emuluje; live je stamp.
5. Podlaha dál `$D2F4` foot-column, ne inkoust nohou.
6. Live `$DAC6` po `$A80A` — engine seed `$7530+id×12`. Extra spawn i pad bounce RNG z `dac0`.
7. Jádro `$C7`, security doors; smrt na padu `$C35E` ne.
8. Animace 4 GRAFIX snímků vetřelce — frame 0. Pad vždy `$AFC8`.
9. `$CCCC` extra `$17` životy — engine +0.
10. Inventář overflow `$D1CA`, Cheops UI, pickup `$0F`/`$10` (kód / `$B0`).
11. Arrow `$BF88` ve zdviži — není v extractu.
12. `skip64` vs `$A132` (řada Y+1, skip jen Y, exact `$64`).
13. Objekt `$0E` (auto-plošiny při dopadu).
14. Zvuk, smrt/respawn pořádně, teleport overlay replika — až řeknu.

## Sezení

### 2026-08-26 — doprava + oprava zdviže `#249`

Orchestrátor: souběžné rozbory pad / teleport / `$64` → implementace → testy jiným agentem.

Spor: `$C6D6`/`$D2CA` je stanice `$0C`, ne (0,0). `$0E` mimo rozsah. Arrow `$BF88` bez extractu.

Bug `#249`: u otvoru `$44` Blob poskakoval, protože `$D2F0` sondovalo 2 řady místo 3 při nezarovnaném Y (`$D330`). Idle jízda teď otvorem projede; jeden snímek uprostřed lze Left/Right vystoupit.
