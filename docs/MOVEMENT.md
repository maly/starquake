# Pohyb BLOBu

Hodnoty jsou z rutiny `$C5BD` (ovládání a chůze) a z kolizních sond `$D2F0` / `$D2F4`. Smyčka hry visí na `HALT` v `$D9C8` / `$A5DC`, tedy **50 Hz**.

Souřadnice v paměti: `$DD1D` = X (pixely zleva), `$DD1E` = Y **odspodu obrazovky** (kreslení na `$BF − Y`). Hrací plocha začíná na pixelu 48; playY = `143 − gameY`.

## Odvodené konstanty

| veličina | hodnota | adresa |
|---|---|---|
| vodorovná rychlost | 2 px / tick | `$C645 ADD A,$02` / `$C68D SUB $02` na `$DD1D` |
| pád (tabulka 16 kroků `$DD29`) | 1,0,1,0,1,2,1,2,1,2,2,3,2,3,3,4 px | `$C751`, aplikace `$C747 SUB (HL)` na `$DD1E` |
| max. pád | 4 px / tick | poslední bajt `$C760` |
| perioda animace | 3 ticky | `$C64C CP $03` na `$DD28` |
| snímky chůze | 4 sady × `$C0` | `$C674 CP $04` na `$DD25` |
| krok vpravo | `blobwr1` → `blobsr1` → `blobwr2` → `blobsr2` (frame 0) | `$C67C HL=$E074` + `$DD25*$C0` |
| krok vlevo | `blobwl1` → `blobsl1` → `blobwl2` → `blobsl2` (frame 0) | `$C6C3 HL=$E374` + `$DD25*$C0` |
| stání / dojezd | `$E674` (`blobxr`) | `$C666` — engine drží poslední pose, když není směr |
| jetpack nahoru | 2 px / tick | `$C76D ADD A,$02` |
| práh výstupu vpravo | X ∈ `$F0`..`$F3` | `$C8FC SUB $F0 / CP $04` |
| vstup zleva | X = 0 | `$C906 LD (HL),$00` |
| práh výstupu vlevo | X + 2 < 4 | `$C90E ADD A,$02 / CP $04` |
| vstup zprava | X = `$F0` | `$C918 LD (HL),$F0` |
| výstup dolů | Y < `$0E` | `$C921 CP $0E` → Y=`$8F`, místnost +16 |
| výstup nahoru | Y ≥ `$90` | `$C92C CP $90` → Y=`$0F`, místnost −16 |
| zarovnání Y po přechodu | `(Y+1) ∧ $F8 − 1` | `$C93D` |
| start X, Y | `$88`, `$3F` | `$6468 LD HL,$3F88` |
| kreslení | XOR 3 bajty/scanline, inkoust `AND $F8 / OR ink` pokud není bit 5 | `$DF70`, `$D8B1` |
| pevnost (export / overlay) | bit 6 a ne `$64` | `$D280`, `$C7DF` |
| start energie / plošinky / palba | `$17`, `$30`, `$7E` | `$D2CD`, `$D2CE`, `$D2CF` |
| stavba plošinky | Down samotné (`$DD23 == $04`) | `$C79F CP $04` |
| zámek opakování | `$DD2C` = 1 do uvolnění Down | `$C7B9` / `$C856` |
| cena | 2 z `$D2CE` | `$C848 A=1, C=2` → `$D41F` / `$D4E9` |
| max. současně | 12 slotů po 4 bajtech | `$C807 LD B,$0C`, tabulka `$DBBB` |
| sloupec | `(X+4) ∧ $F8 ≫ 3`, dvě buňky | `$C819`, `$DB88 INC C` |
| řádek (celá obrazovka) | `($D6 − Y) ∧ $F8 ≫ 3` | `$C827` |
| grafika | 4 vrstvy × 2 buňky, XOR | `$DC55` + L×`$10`, `$DB88` |
| atribut | `RES 6` (ponechá paper/ink) | `$DBA6` při A∨`$80` |
| životnost | `($DAC0 ∧ 3) + 5` návštěv `$DBEC` | `$C833` |
| zánik | `$DBEC` sloupne XOR, `SET 6` | `$DC3C A=$40` |
| odchod z místnosti | sloty na nulu, terén z exportu | `$A4B1` po `$A426` / `$A7FC` |
| tabulka entit | 6 × 32 B od `$DD18` (0 = Blob) | `$DF70` kreslí 6, `$A01B` 1..`$9C43` |
| vetřelci na místnost | 4 sloty `$DD38`–`$DD98` | `$9FEF` B=4..1, `RRCA×3` |
| grafika GRAFIX | `$B208` + n×`$C0` | `$9DF9` |
| smrtící / obtěžující | hi bajt grafiky `< $B4` / `≥ $B4` | `$A327 CP $B4` |
| smrtící následek | `JP $C350` (smrt) | `$A305` |
| obtěžující následek | `$DD30 += $0A` | `$A345` |
| periodický úbytek energie | `$DD30` wrap `$78` → energie −4 | `$CB58` / `$D41F A=0 C=$04` |
| hitbox | \|dx\| < `$0E`, \|dy\| < `$0B` | `$A305` |
| rychlost | 2 px (typ 3 umí 1) | `$A2A5` / `$9E90` |
| podkroky | 4× za tick | `$A043 LD A,$04` |
| hrany | X `<3`/`≥$EE`, Y `<$12`/`≥$8D` | `$A0E4`–`$A15D` |
| terén vetřelce | `$D2F0` / `$D2F4`, attr `< $40` | `$A0FD` / `$A16F` |
| kreslení | XOR `$DF70`, ink `$D8B1` (ne bit 6) | `$D9CB` / `$D9CE` |
| engine kreslení | per-pixel overlay, bez clash `$D8B1` | `stampGrafix` |
| parkování před objevením | X=0 Y=`$0F` grafika `$DF40`; nekreslit když X∨Y `< $10` | `$9E83`, `$D8B1 CP $10` |
| pointer sady | `$B208+n×$C0`; `alien5` ve skoolu až `$B750` | `$9DF9` vs `#GRAFIX` |
| cache mezi místnostmi | 21 B × 4 ve `$959C` (jen předchozí) | `$9C78` |

## Kolizní sondy

`$D2F7` spočte atributovou adresu buňky v `(X≫3, ($BF−Y)≫3)` — levý horní roh 24×16 GRAFIX.

**Podlaha (`$D2F4`, jen když `(Y+1) ∧ 7 = 0`):** dvě buňky dolů od originu (`ADD HL,$20` dvakrát). Při `X ∧ 7 = 0` dvě sloupce, jinak tři (`$D3A2`). Bit 2 = podlaha. Engine takhle hledá `supportY`.

**Stěny (`$D2F0`, jen když `X ∧ 7 = 0`):** sloupec vlevo (`DEC HL`) a o dva vpravo (`INC HL` dvakrát, origin+2, ne origin+3). Bit 1 / bit 0.

Vodorovná neprůchodnost v engine **není** 24×16 AABB. Prochází se inkoustové pixely aktuálního GRAFIX (`blobInkPixels`) a buňka s `attr < $40` blokuje jen tam, kde je bit kresby. Pixel mimo 256×144 **není** stěna — jinak by sloupec 32 (X=`$F0`, 24px sprite) zakázal pravý výstup z místnosti.

**Průchozí / neprůchozí pro BLOBa je `$D2F0` / `$D2F4`:** `CP $40` / `JR C` — blokuje, když `attr < $40` (bit 6 **není** nastavený). Prázdná výplň hrací plochy je `$47` (bit 6, průchozí). Dlaždice `$07` / `$03` jsou podlaha a stěny.

To je **opak** pole `solid` v exportu (`$D280`: bit 6 nastavený, překryv v panelu). Překryv dál ukazuje export; chůze bere `$D2F0`.

Bez `actors.json` (jednotkové testy) maska padá na plný 24×16 box, pořád se OOB nepočítá jako zeď.

## Plošinky

`$C79F` staví po stisku **jen Down** (`$DD23 == $04`). Není to hop: `$C79F CP $04` je větev stavby, jetpack je `$C76D`. Zásoba je `$D2CE` (druhý bajt od `$D2CD`). `$D41F` je trampolína na `$D4E9`; stavba volá `A=1, C=2`. Při nule se nestaví (`$C7B2 CP $00 / JP Z`).

Umístění: dvě buňky pod BLOBem, sloupec `(X+$04)≫3`, řádek play-area `((($D6−Y) ∧ $F8)≫3) − 6`. Bitmapa se **XORuje** (čtyři vrstvy `$DC55`). Atribut se **nepřepisuje**: `$DBA6` udělá `RES 6` na stávající buňce (`$47` → `$07`). Chůze bere `$D2F0` (`attr < $40`), proto na plošinku lze stoupnout. Overlay `$D280` (bit 6 nastavený) ji naopak neoznačí.

`$64` (`AND $7F`) stavbu zruší (`$C800`). Mimo 32×18 se buňka nezapisuje. Latch `$DD2C` brání opakování, dokud Down držíš. Volný slot musí být v 12 pozicích `$DBBB`.

Odstranění je **časovač**, ne klávesa. `$DBEC` (každý tick jedna z 12) snižuje byte3; pod 4 začne sloupávat XOR vrstvy a nakonec `SET 6`. Zásoba se nevrací.

Při odchodu z místnosti `$C8F4` vrací `A=$00`, `$A523` skočí na `$A426`: `$A7FC` znovu vykreslí místnost z dat a `$A4B1` vynuluje `$DBBB` (`LD B,$31`). Postavené plošinky **nejsou** perzistentní — platí jen pro aktuální místnost, dokud nevyprší nebo dokud Blob neodejde. Návrat obnoví export.

## Nepřátelé

`$D9C8` volá `$DF70` (XOR 6 GRAFIX slotů od `$DD18`) a `$D8B1` (inkoust `AND $F8 / OR ink`, buňka s bit 5 se přeskočí). **Bit 6 se nemění** — vetřelec neupravuje pevnost terénu. Kolize postavy dál čte živou atributovou mřížku bez kresby entit.

Pohyb je `$A01B` (komentář „Move the nasties“). Jednou `$DAC6`, pak sloty `$9C43`..1, každý **4 podkroky** (`$A01A`). Slot 0 je Blob; vetřelci začínají na `$DD38`. Y=0 = neaktivní (`$A03D`).

Spawn `$9C47` po vstupu do místnosti (`$A520`). Čtyři sloty, grafika `$B208+n×$C0`. Stav 0: čeká na časovač, pak 16 kroků `corepieces1` (`$B148`) na `home` (`IX+$0A/$0B`), potom stav 1 a živá sada. Typ AI `IX+$19` (0 bounce, 1–2 náhodný směr, 3 náhodná rychlost, 4 chase, 5 mix, 6 bez svislé sondy). Terén: totéž `$D2F0`/`$D2F4` (`attr < $40`) — **neprocházejí zdí**.

Kontakt `$A305` jen ve stavu 1. Smrtící sady `badalien*` mají high bajt `< $B4` → `$C350` (okamžitá smrt, ne −N energie). `alien*` `≥ $B4` přičtou `$0A` k `$DD30`; `$CB58` každý tick `$DD30++` a při `$78` bere 4 energie (`$D41F`). Doba nezranitelnosti **není**.

Mezi místnostmi: `$9C78` prohodí 21 bajtů × 4 se `$959C`. Návrat do **ihned předchozí** místnosti obnoví cache; třetí místnost ji zahodí a spawne znovu. Stav se **nehromadí** (vždy ≤ 4). Nejsou vázaní na 512 místností napevno.

## Dočasné hodnoty

| veličina | dočasně | důvod |
|---|---|---|
| skok | 12 ticků × 2 px nahoru | V `$C5BD` není hop. `$C79F CP $04` staví plošinku (`$D2CE`), jetpack je +2 px/tick (`$C76D`). Označeno `TEMP_JUMP_*` v `constants.ts`. |

## Otevřené otázky

1. **Skok při chůzi.** Impulz v `$C5BD` chybí. Down staví plošinku (`$C79F`); jetpack je `$C76D`. Hop v engine zůstává `TEMP_JUMP_*`.
2. **Překryv `solid` vs chůze.** Overlay = `$D280` (bit 6). Blob = `$D2F0` (`attr < $40`). Plošinka po `RES 6` je pro chůzi pevná a v overlay ne.
3. **Přesný posun `$DF70` při `X∧7 ≠ 0`.** XOR po pixelech v `blitGrafix` posun emuluje; atributový merge `$D8B1` bere obsazené buňky po XOR.
4. **Přesný `$DAC6` po `$A80A`.** Live spawn v enginu seeduje `$7530+id×12`, bez celého řetězce `$DAC6` při kreslení bloků. Krok za krokem proti emulátoru proto bere výchozí sloty z `$9C47` (test `test_enemies.py`).
5. **Místnost `$C7` (jádro)** a **jetpack ve slotu 4** (`$9C43=3`, `$AFC8`) — mimo rozsah.
6. **Animace 4 GRAFIX snímků** u vetřelce — engine drží frame 0; `$A01B` pointer sady neposouvá.
