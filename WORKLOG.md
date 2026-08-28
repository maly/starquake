# WORKLOG

Živý stav enginu pro další sezení. Doplňuj na konec po každém úkolu; nahoře drž aktuální meze a ověření.

Poslední commit: `28fc706` (puls `$DB88` persist XOR + GRAFIX 4 snímky). Working tree: notes pulse-spark + `$A41B` ověření; `tmp_*` sondy necommituj.

## Tvrdé meze

- Nesahej na `reference/` (skool, ctl, `starquake.py`).
- Nepřepisuj Python extract, pokud o to výslovně nepožádám.
- Nesnižuj match thresholdy (emu vs export = 0 pixelů).
- Collision/static tile export (`rooms.json` `solid` / `$D280` overlay) neměň.
- Overlay dál ukazuje export `solid`; chůze, pad, zdviž a vetřelci berou `$D2F0` (`attr < $40`).
- Zatím **neimplementovat:** výměna Cheops `$CCF1`, drop přeplněného inventáře `$D1CA`, objekt `$0E` (stroj na plošinky — **není** zelené pole), Arrow `$BF88` do extractu, hi-score zápis `$64FA`, Spectrum end-screen bitmap / `$64A0` scramble low digits, digit `$0E` wildcard u dveří. `$6600` skip.
- Konstanty s ROM adresami do `docs/MOVEMENT.md` a comments v `constants.ts`.
- Untracked sondy **necommituj:** `tmp_aa30_probe.py`, `tmp_hover_probe.py`, `tmp_teleport_probe.py`, `tmp_attr64_probe.py`, `tmp_death_probe.py`, `tmp_killai_probe.py`, `tmp_killtile_probe.py`, `tmp_room52_probe.py`, `tmp_itemfx_probe.py`, `tmp_security_probe.py`, `tmp_core_probe.py`, `tmp_score_probe.py`, `tmp_ui_layout_probe.py`, `tmp_ui_verify_probe.py`, `tmp_ui_engine_hud.ts`, `tmp_sfx_probe.py`, `tmp_melody_probe.py` (+ další `tmp_ui_*` / `tmp_sfx_*`).

Ověření:

```
npm --prefix game test && npm --prefix game run build
python -m pytest tests/test_viewer.py tests/test_enemies.py tests/test_fire.py tests/test_items.py tests/test_transport.py tests/test_death.py tests/test_goal.py
```

## Spuštění

```
npm start
```

http://127.0.0.1:8000/viewer/ — canvas 256×192 (CSS ×2 → 512×384). `?dev=0` skryje vývojářský panel. Audio strip u canvasu (Zvuk / Hudba / hlasitosti); BGM `viewer/bgm.mp3` (chybí = ticho).

Q/A/O/P chůze (Q sběr/nástup na pad, A plošinka, O/P teleport / tajný přechod `$0F`), mezerník palba, security door inventář + overlay, PageUp/Down místnost. `#8` start extra `$17`, `#13` puls `$70` (1), `#198` dva pulsy `$70`, `#61`/`#236` přechod `$0F`, `#176` dveře, `#199` jádro `$C7`, `#249` výtah, `#15` pad, `#343` EXIAL, `#49` rostlina `$06`, `#52` badalien2, `#253` `$9F05`. Dump: `--door-test`, `--passage-test`, `--victory-test`, `--end-test`, `--timing`.

## Architektura

| soubor | role |
|---|---|
| `game/src/constants.ts` | ROM + `TEMP_JUMP_*` unbound + `TELEPORT_TABLE` + `DD22_*` + lift/pad + smrt A / `$06`/`$70`/`$80` |
| `game/src/types.ts` | `World` + `EndResult`, doors/sockets, score/core fields, `readDoorCode` |
| `game/src/objects.ts` | `scanHotspots` (+ doors `$01–$0F`, sockets `$B0`, passages `$F0`), teleport, door code, `$0B` clear |
| `game/src/physics.ts` | tick, `applyDeath`, `applySecurityDoor`, `applyPassage`, `enterRoom` first-visit + `$A6C1` |
| `game/src/core.ts` | `$D2DE` init, `deliverCoreParts` |
| `game/src/score.ts` | BCD `$D413`, `$A390`, `composeEndResult` |
| `game/src/projectiles.ts` | `tickFire` `$C85A`, `tickPadFire` `$CA15` |
| `game/src/entities.ts` | nasties, `$9F78` guardians, `$C6` cache wipe, kill score |
| `game/src/items.ts` | `$94E8` inventář; extra `$CC9A` / `$CCCC` |
| `game/src/render.ts` | `prepare()` hotspots, stamp pad, `blitPulses` `$DB88` (playfield-local) |
| `game/src/ui/*` | screen 32×24, font `$ADD4`, chrome UDG, `$D425`/`$D463`, print `$D3C1`, door/TP overlay |
| `game/src/dump.ts` | + `--door-test`, `--passage-test`, `--victory-test`, `--end-test`, `--timing` |
| `game/src/audio/*` | `$D7C0` `world.sfx`; `$A57B` `world.buzz`; `$6600` skip; BGM MP3 |

Souřadnice: `$DD1D` X zleva, `$DD1E` Y odspodu; playY = `143 − gameY` (playfield-local). Compose: playfield Y += 48. Start Blob: X=`$88` Y=`$3F`. Entity Y je game-Y.

Rozbory: `docs/notes/hoverpad.md`, `teleports.md`, `attr64.md`, `energy-death.md`, `kill-terrain.md`, `kill-enemies.md`, `pulse-spark.md`, `item-effects.md`, `security-doors.md`, `core.md`, `endgame-score.md`, `ui-layout.md`, `ui-text.md`, `ui-messages.md`, `ui-verify.md`, `sound-effects.md`, `melodies.md`, `sound-impl.md`, `sound-verify.md`. Konstanty: `docs/MOVEMENT.md`.

### Tick

1. walk / lift `$C761` / pad `$C967`
2. plošinky jen při chůzi mimo `$D2CA` + `tickBridges`
3. palba Blob `$C85A` nebo pad `$CA15`
4. energy drain `$CB58`
5. `tickPickup` extra + `$94E8`
6. `walkSpecialObjects` `$06`/`$00`/`$0B`/`$0C`/`$0D`/`$0F` (door/teleport/passage skip zbytku)
7. `energy==0` → `applyDeath(A=2)`
8. puls `$70` + AABB (`$9635`)
9. `tickNasties` (kontakt může `applyDeath`)
10. room exit (park v `enterRoom`; `$C7` delivery v `enterRoom`)

`gameOver` / `endResult` zamkne tick. ROM je `$C8F4` pak `$CB8A` pak `$A530` pak `$A01B`; engine má objekty před východem, drain před vetřelci.

## Hotovo

- Extract: grafika, bloky, 512 místností, attrs `$EAD3`, solid bit 6 / `$64`, items `$94E8`, actors, `$AA30`.
- BLOB: ±2 px, pád `$C751`, inkoust + `attr < $40`, 4 směry `$C8F4`. Hop `TEMP_JUMP_*` unbound.
- Plošinky `$C79F`. Nepřátelé 4 sloty, stampGrafix, park se nekreslí. Home `$9EE2` (Z80 `SUB`/`ADD`, `$DAC1` hrana, OOB ≠ vzduch). Ink 0 → `$9E16` 2…6. S padem `nastyCount=3`.
- Střelba `$C85A`, předměty `$94E8` (inventář, **ne** refill) + extra `$A350` / `$CC9A` (`$11`–`$16` tabulka, `$17` `$CCCC`, `$18` lives+1 bez stropu `$7F`, `$19` Cheops flag).
- Vznášedlo `$0C` / `$C967` / `$CA15`. Teleport `$0D` / `$D036` (5 znaků do rastru, ne `prompt`). Tajný přechod `$0F` / nibble `$F0` (exact XY + L\|R, room±1, snap dest `$0F`, sfx `$04`).
- Zdviž `$64` / `$DD22=1`. `$D2F0` 2 řady když `(Y+1)∧7=0`, jinak 3 — otvor `$44` v `#249` neposkakuje.
- Energie `$CB58` −1 při wrap `$78` (ROM `C=$04`; HUD 1 px = 4 energie). `$DD30` start 0, energie `$7F`. Obtěžující `$DD30 += $0A` **1×/tick** (ROM až 4×). Smrt `applyDeath` `$C350`: flash 45 / `$BEC8`×4 let 80 / HALT 50, pak A=2 nula, A=1/`$11` vetřelec, A=`$10` rostlina `$06`, A=0 puls `$70`. Životy 4, DEC, energy `$7F`, plat `∨$08`. lives=0 → animace a `GAME OVER`. Puls `$70`: AABB + kresba `$DB88` (L=5/6/7) když flag≠0.
- `$9F05` nibble `$80` → živý `$B2C8` AI 6. Perioda spawnu 4…8. AI 5 dir=0 / RRCA, AI 3 zapisuje 8-směr. `$A2B9` = `$08,$09,$01,$05,$04,$06,$02,$0A`.
- Security doors typ `$00` (raw `$01`–`$0F`), klíč `$0F` / inventář; jádro `$C7` doručení `$A6C1` (9×`$D2DE`), výhra `$D2E8==5`; skóre + společný `EndResult` (HTML overlay).
- UI: 32×24 screen, HUD 0–5 (`$D3DF`/`$D425`/`$D463`), font `$ADD4`, print `$D3C1`, door/TP overlay v rastru; `?dev=0`.
- Zvuk: `$D7C0` syntéza z tabulky `$D839` (24×5 B) → `world.sfx` → Web Audio; BGM MP3 smyčka, mute/gain persist. `$6600` a `$A41B` ne.

Ověřeno (working tree): `npm test` 163 pass. Puls `$DB88` persist XOR. `$A57B` kanál.

## Otevřené

1. `TEMP_JUMP_*` unbound; originál skáče jetpackem / plošinou / zdviží.
2. `$DD26` lean-to-stop `$E674` — engine drží poslední walk pose (na padu `SEATED_SETS`).
3. Overlay `$D280` vs chůze `$D2F0` — na obrazovce obráceně, podle ROM správně. Hotspot `$06` je overlay-solid a `$D2F0` průchozí.
4. `$DF70` bit-shift `X∧7≠0` — `blitGrafix` emuluje; pad na stanici se nestampuje (dock tiles), mimo stanici stamp; ostatní entity stamp.
5. Podlaha dál `$D2F4` foot-column, ne inkoust nohou.
6. Live `$DAC6` po `$A80A` — engine seed `$7530+id×12`. Extra spawn, pad bounce i perioda `$70` z `dac0` po spawn vetřelců.
7. Vetřelci i pad: 4 GRAFIX fáze z `world.frames / 2`; live ptr / `$AFC8` beze změny (kresba `+$30`).
8. Extra `$17`/`$18` v enginu. 1. tick Up bez `$14+` vsune `00 00` — mimo rozsah.
9. Inventář overflow `$D1CA`, Cheops UI.
10. Arrow `$BF88` ve zdviži — není v extractu.
11. `skip64` vs `$A132` (řada Y+1, skip jen Y, exact `$64`).
12. Objekt `$0E` (auto-plošiny při dopadu).
13. Spectrum end bitmap, hi-score `$64FA`, `$64A0` scramble. Melodie `$6600` skip. `$A41B`/`$A57B` je v `audio/channel.ts`.
14. Puls `$70` / `$DB88` — **opraveno persist XOR.** Engine dřív každý snímek *přepisoval* aktuální L6/L7 (vypadalo to jako všechny fáze najednou). ROM `$DB88`/`$DB50` vrstvy XORuje do display file: toggle L5 A=`$47`, při flag≠0 `$A6BD[timer∧3]`. `xorInk` = delta, blit `^=` na terrain. `#13` jeden, `#198` dva.
15. Door/TP overlay: chybí digit-sprite animace `$D78B` / ikony `$25`/`$26`/`$24` (text OK); SFX házení cifer `$D679`/`$D70E` proto taky ne.
17. BGM soubor `viewer/bgm.mp3` zadavatel ještě nedodal — hra bez něj jen varuje.
16. Inventář ve statusu: XOR blit vs přesné `$DB24` timing; HUD redraw každý frame (ROM chrome jen `$A426`).

## Sezení

### 2026-08-28 — puls `$DB88` persist XOR

Kořen: `$A66C` volá `$DB88` (XOR na obrazovku), ne replace. Replace aktuální L6/L7 kreslil hustý blob („stack fází“). Testy ten model držely. `xorInk` teď persistuje L5 toggl + anim XOR; dvě L7 se vyruší; perioda 8 on/off se vrátí na prázdno. Bundle přestavěn. Rozbor: `docs/notes/pulse-spark.md`.

`$A41B`/`$A57B` zapojeno: `channel.ts`, hooky palba/pád/dopad/plošinka/oblaka/spawn/kill/ambient. PCM 20 ms / tick.

### 2026-08-28 — animace vetřelců + pad

4 GRAFIX snímky, tempo `frames/2`. Snímky 1–3 jsou předshift `+2/+4/+6` (ne nová póza) — kresba na `X−2×frame`, jinak cukají do strany. Live ptr beze změny.

### 2026-08-27 — tajný přechod `$0F`

Nibble `$F0` / typ `$0F`: exact XY + L|R, room ±1, sfx `$04`, `$D2C4=$05`, snap na dest `$0F` (`$A4DF`). 22 místností (11 párů). `#61` (200,`$57`) Right → `#62` (40,`$57`). Zeď ve výklenku zůstává; hotspot `$47`. Dump `--passage-test`. Panel `Přechod $0F`.

### 2026-08-27 — zvuk `$D7C0` + BGM

Orchestrátor: paralelní rozbory SFX / melodie → rozhodnutí sporů → implementace → oddělené ověření.

**Spory (rozhodnuto):**
1. Melodie `$6600` **nezahrnout** — 5 call sites jen title/menu/intro/hi-score/end (`$5ED3`/`$65B5`/`$6727`/`$685F`/`$69D0`); `$D9DE` blokující `DI`. Pozadí = MP3.
2. Kanál `$A41B`/`$A57B` (palba/pád/plošinka) **není** `$D7C0` — mimo toto zadání.
3. `$D7C0` v ROM busy-wait; engine hraje asynchronně (50 Hz se nesmí zastavit). ROM smyčky `B=n CALL` u overlay/jádra = jeden `requestSfx` na fázi.

Rozbory: `docs/notes/sound-effects.md`, `melodies.md`. Rozhodnutí: `sound-impl.md`. Verify: `sound-verify.md` (`all_pass`). Bez commitu. MP3 dodá zadavatel (`viewer/bgm.mp3`).

### 2026-08-27 — puls `$DB88` — vzdáváme, odloženo

- **Stav:** pořád špatně (víc framů přes sebe). Odloženo na jindy.
- Cyan sloupy = správně (žlutá ve Skoolkitu = accessibility).
- Neúspěšné pokusy: XOR buffer / replace L6→L7 / assign jedné vrstvy / erase-then-draw + blit `=` / cache `pulse-erase-1`.
- Příště: frame-by-frame ROM `$A66C` vs engine (`#13` jeden, `#198` dva), ne další slepé úpravy blit/tick. Bug je ve všech místnostech s `$70`.

### 2026-08-27 — pad / item+extra / lethal spawn

- Pad: vždy `stampGrafix` `$AFC8` (na stanici při chůzi; prázdná stanice = Blob na padu, entity odjela).
- `#416`: extra a `$94E8` na stejném marku → XOR bordel; `spawnExtra` bere volný mark.
- Lethal (AI5) home/materialize ≥`$40` px od BloBa.
- Místnost `$C6` (198): bez alienů.

### 2026-08-27 — herní UI (HUD / text / hlášení)

Orchestrátor: 3 paralelní rozbory → rozhodnutí sporů → implementace → oddělené ověření (emu ATTR+bitmap).

**Spory (rozhodnuto):**
1. Pod playfieldem nic — UI jen řádky 0–5; play 6–23 (`$A8B5`, `$A647`).
2. Hint „`$D5FD` = čtení znaků“ je **špatně**. `$D5FD` = inventářová minihra dveří (3×`$09`–`$0D`); klávesnici čte `$D5C8` u teleportu (5 znaků).
3. Display: logicky 256×192, CSS ×2 → 512×384 (výhrada uživatele).

Rozbory: `docs/notes/ui-layout.md`, `ui-text.md`, `ui-messages.md`. Verify: `ui-verify.md` (0 mismatch HUD vs emu). Bez commitu.

### 2026-08-26 — scéna jádra `$A6C1` (koule / Blob / `$C6`)

- Neaktivní sloty `$9FD3` Y=**0** (dřív Y=`$0F` → appear do rohu).
- Vstup `$C7`: skryje Blob, `$9F78` strážci (AI 0 / dir `$05`), `$C8` ticků, eject `$C6` `($F0,$27)` — i bez doručení.
- `$C6` dál maže entity cache.

### 2026-08-26 — core panel + door keys (oprava UX)

- Jádro `$C7`: 3×3 nápověda `$A78D`/`$C4AB` (need-sprite, pending bliká, done ink `$07`).
- Dveře: bez promptu — inventář má 3 digit-sprity **nebo** `$0F` (`$D693`); panel ukáže požadované klíče.

### 2026-08-26 — playable goal (doors / core / score / end)

Orchestrátor: 3 paralelní rozbory → kontrola (emu) → implementace → oddělené ověření (+coverage).

**Spory (rozhodnuto emu):**
1. Hint/AA30 „dveře = nibble `$80`“ je **špatně**. `$80` = `$9F05` nasties; dveře = typ `$00` z raw `$01`–`$0F` (`$A936`→`$AA02`).
2. `$95F0`/`$B0` + nástroj `$10` **nejsou** nesené jádrové díly — jen clear socketu. Výhra = 9× inventář vs `$D2DE` v `$C7` (`$A6C1`), milník `$D2E8==5`.
3. Vstupní hint `$C74F` → jádro spawn je `$9C4F`/`$9C57` → `$9F78`.

- Dveře: `doorsByRoom`, prompt / `$0F`, X±`$30`, `$D2C4=3`, skip `$9C47`.
- Jádro: `$A6C1`, +10000, eject `$C6` `($F0,$27)`, `$9F78` ×`$B208`, `$C6` wipe `$959C`.
- Skóre/end: BCD, +250 first-visit, kill `(hi−$AE)×2` tens, `EndResult` (+1000, scramble/hi-score skip). HTML overlay.
- Dump `--door-test` / `--victory-test` / `--end-test`. Ověřeno 104+25; timing ~0,23 ms. Bez commitu.

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
