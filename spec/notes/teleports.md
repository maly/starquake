# Teleporty (kódová jména)

Hodnoty jsou z walku objektů `$CB8A`, overlay `$CED1`–`$D02E` a reloadu místnosti `$A426` / `$A4B1`. Východy z místnosti `$C8F4` **nejsou** teleporty.

Souřadnice Blobu: `$DD1D` = X (pixely zleva), `$DD1E` = Y odspodu obrazovky (kreslení na `$BF − Y`). Vstup do padu i přílet používají tentýž souřadný systém.

## Odvodené konstanty

| veličina | hodnota | adresa |
|---|---|---|
| typ objektu | `$0D` | `$CEC4 CP $0D` |
| high nibble `$9740` | `$D0` | `$A9E3` → `$A9F6 AND $0F` |
| jediný podblok s `$D0` | `$24` (36), raw `$D4` | `$9740+$24` |
| grafika padu / ikony overlay | `$EA65` s `L=$24` | `$A8F5`, `$CF0C LD L,$24` |
| záznam `$96FC` | 3 B: X, Y, typ | `$AA17`–`$AA1B`, `$CB90`–`$CB94` |
| detekce | **přesná** shoda X i Y, ne AABB | `$CBAA` |
| AABB `\|dx\|< $0F` / `\|dy\|< $0F` | jen typy `$01`–`$0B`, `$0E`, `≥$14` | `$CBB6`–`$CBD9` |
| vstupní podmínka | `$DD23 ∧ $03 ≠ 0` (Left nebo Right) | `$CEC9`–`$CECE` |
| Up samotné (`$DD23==$08`) | **ne** — to je sběr `$94E8` | `$D140` / `$CB68` |
| kódová jména | 15 × (5 znaků + word místnosti) | `$D036`, krok `$07` |
| buffer zadaného kódu | 5 B `$D031` | `$CF8E`, `$CFBA` |
| vlastní jméno padu | lookup `$D2C8` v poli místnosti tabulky | `$CF11` |
| platný kód → důvod reloadu | `A=$04` → `$D2C4` | `$CFFA`, `$A52A` |
| neplatný kód → důvod reloadu | `A=$03` přes `$CC4B` | `$CC55`, `$D02E` |
| přílet | X/Y prvního objektu typu `$0D` v `$96FC` | `$A4DB`–`$A4F6` |
| místnost | word `$D2C8` | `$CFCC` |
| žádný příznak „objeveno“ | `$CFB3` vždy 15 záznamů | `$CFB6 LD C,$0F` |

## 1. Reprezentace v místnosti

Teleport **není** záznam `$94E8` a **není** sprite z `$9088`. Je to dlaždice **a zároveň** objekt v seznamu `$96FC`.

### Dlaždice

`$A80A` kreslí 12 bloků (`$A8D3`). U každého podbloku `$A90F` čte raw atribut `$9740+id`:

- high nibble `$D0` nepatří mezi masky `$10`–`$40` ani mezi speciály `$50`/`$70`/`$80`/`$90`/`$B0`;
- padá na `$A9E3 JR $A9F6`;
- `$A9F6` vezme `raw ≫ 4` = **`$0D`** a volá `$AA02`.

Low nibble posune hotspot uvnitř podbloku (`$A92A AND $03` sloupec, `$A92F AND $0C` řádek). Jediný podblok s nibble `$D0` v celé tabulce `$9740` je **`$24`**, raw **`$D4`**: sloupec +0, řádek +1.

`$AA02` zapíše do seznamu za pointer `$96FA` (start `$A834 LD HL,$96FC`):

| pole | vzorec | adresa |
|---|---|---|
| X | `sloupec × 8` | `$AA0D RLCA×3` |
| Y | `(24 − řádek) × 8 − 1` | `$AA05 SUB B` / `$AA0B DEC A` |
| typ | A = `$0D` | `$AA1B LD (HL),A` |

`$AA20 CP $0C` ukládá pozici jen vznášedla do `$D2CA`. Teleport samostatný slot nemá.

Grafika padu je UDG podbloku `$24` (`$EB23+$24×2` → `$FD57`, `$EA65`). Rozměr 4×3 buňky. Buňka hotspotu (řádek +1, sloupec 0 grafiky) má atribut **`$47`**; o dva sloupce vpravo je **`$05`**. Do atributové mapy se **`$D4` nezapisuje** — je to jen značka typu v `$9740`.

Dva bloky obsahují podblok `$24`:

| blok | podbloky `$9840+id×4` (BR, BL, TR, TL) | kde |
|---|---|---|
| `$2B` (43) | `$24,$14,$07,$14` | 13 místností, index 5 nebo 6 v 4×3 mřížce |
| `$FA` (250) | `$50,$50,$24,$29` | AMIGA `$01F3`, AMAHA `$01FA`, spodní řada bloků |

V overlay UI se totéž `L=$24` kreslí znovu jako ikona (`$CF09 LD BC,$0917`). Střecha a pravý sloup mají ATTR `$00` (speciál `$EAD3`) — ink z `$EA62`. Řádky 1–2 sloupec 1 jsou v `row_flags` prázdné (dveřní otvor `0xB0`). Overlay musí `$EA62` aplikovat, jinak je střecha černá na černém.

### Objekt `$96FC`

Walk `$CB8A` čte max `$16` (22) trojic. Typ `$0D` je v seznamu po každém `$A80A` právě v těch 15 místnostech, které jsou cíle tabulky `$D036` (ověřeno statickým `$A90F` i live `$A80A+$AA30`). Extra (`$01`) a sběratelné (`≥$14`) se připojí až v `$AA30`, tedy **za** dlaždicovými typy.

V OKTUP (`$01CD`) je první objekt vznášedlo `$0C`, teleport druhý. AMAHA (`$01FA`) má před ním `$06` a `$0C`. Vyhledání příletu hledá typ, ne první záznam (`$A4EA CP (HL)` s A=`$0D`).

Místnost `$C7` pad `$D0` **nemá**.

## 2. Vstup: jak hra pozná, že Blob vešel

Každý tick bez východu `$C8F4` spadne do `$CB58` → `$CB8A`.

Rozhodnutí AABB vs přesná shoda (`$CB9A`–`$CBA8`):

| typy | test |
|---|---|
| `$01`–`$0B`, `$0E`, `≥$14` | `\|ΔX\| < $0F` a `\|ΔY\| < $0F` (`$CBBB CP $0F` / `$CBCE`) |
| `$00`, `$0C`, **`$0D`**, `$0F`–`$13` | `X == objekt.X` a `Y == objekt.Y` (`$CBAA` / `$CBAF`) |

Teleport **nepoužívá** AABB předmětů. Ani buňku pod nohama (`$D2F4` se na vstup nevolá). Musí sedět pixely `$DD1D`/`$DD1E` na hotspotu z `$AA02`.

X hotspotu je násobek 8, Blob chodí po 2 px (`$C645`), takže při chůzi se trefí. Y je vždy `8k−1` (stejná mřížka jako `$C93D`).

Po shodě `$CBDC` skočí na `$CC5A` → `$CE77` → `$CEC4 CP $0D`:

```
$CEC9 LD A,($DD23)
$CECC AND $03
$CECE JP Z,$D1A6    ; bez Left/Right se pad ignoruje
```

`$DD23` bity z `$C613`: bit 0 Right, bit 1 Left, bit 2 Down (`$04`), bit 3 Up (`$08`). Vstup tedy **není** Up (to je latch sběru `$DD31` v `$CB68` / `$D140`) a **není** automatický AABB. Stačí kterýkoli horizontální bit — Down+Right taky.

Stání na padu bez směru overlay neotevře.

## 3. Vlastní jméno padu

Jméno **není** ve třech bajtech objektu. `$CF11` ho bere z tabulky `$D036` podle **aktuální** `$D2C8`:

| | |
|---|---|
| start | `HL=$D03B` (word místnosti prvního záznamu, jméno je 5 B před ním) |
| počet | `B=$0F` |
| shoda | low pak high bajt cíle proti `DE=($D2C8)` |
| krok | z high cíle `ADD HL,$0006` na high dalšího |
| jméno | po shodě `SBC HL,$0006`, `LDIR` 5 B do `$CF3D` |

Tabulka mapuje **jméno → místnost, ve které ten pad stojí**. Zobrazené „CODE :“ je tedy jméno **tohoto** padu. 15 cílových místností = 15 padů `$0D`; neshoda ve `$CF11` na živých datech nenastane (po vyčerpání `DJNZ` by stejně spadl do `$CF29` a vytiskl 5 bajtů před HL — mrtvá větev).

## 4. Sekvence: vstup → jméno → pět znaků → vyhodnocení

```mermaid
sequenceDiagram
  participant Loop as $A523
  participant Walk as $CB8A
  participant UI as $CED1
  participant Keys as $CF93
  participant Eval as $CFB3
  participant Reload as $A426/$A4B1
  Loop->>Walk: $C544 → $C5BD → $C8F4 → $CB58
  Walk->>Walk: typ $0D, X/Y přesně, $DD23∧$03
  Walk->>UI: $CED1
  UI->>UI: $A412 smazat plochu
  UI->>UI: "YOU HAVE ENTERED TELEPORT"
  UI->>UI: $CF11 jméno z $D036 podle $D2C8
  UI->>Keys: 5× uvolnit + stisk ≥$0A do $D031
  Keys->>Eval: $CFB3
  alt 5 znaků sedí
    Eval->>Reload: $D2C8=cíl, A=$04, RET
    Reload->>Reload: kresba cíle, spawn na $0D, $9C47
  else žádný záznam
    Eval->>Reload: "CODE NOT RECOGNISED", $CC4B A=$03
    Reload->>Reload: totéž $D2C8, bez $9C47
  end
```

### Overlay (`$CED1`)

1. `$A412` (`JP $A647`) smaže hrací plochu. `$EA60=0` (`$CED4`).
2. `$D3C1` tiskne (AT `$16`, konec `$FF`):

| adresa | bajty / text |
|---|---|
| `$CEE0` | `$16,$08,$04,"YOU HAVE ENTERED"` |
| `$CEF3` | `$16,$0A,$08,"TELEPORT"` |
| `$CEFE` | `$16,$0C,$06,"CODE : ",$FF` |
| `$CF3D` | 5 znaků jména + `$FF` (přepsáno z tabulky) |
| `$CF49` | `$16,$0E,$08,"ENTER TELEPORTAL"` |
| `$CF5C` | `$16,$10,$08,"DESTINATION CODE",$FF` |
| `$CF76` | `$16,$13,$0C,"- - - - -",$16,$13,$0C,$FF` |

3. Ikona: `$CF09 LD BC,$0917` / `$CF0C LD L,$24` / `$EA65`.
4. `$CF86 LD A,$07` / `$D7C0` (zvuk, mimo rozsah).
5. `$D55F` mění INK (z `$DAC6`); není herní stav.

### Zadání (`$CF8E`–`$CFB1`)

`HL=$D031`, `B=$05`. Žádný Enter, žádné zkrácení, žádný escape. Pět iterací:

1. `$CF93` `$D5C8` dokud `A≠0` — čeká na **uvolnění** klávesy.
2. `$CF9A` dokud `A < $0A` — čeká na znak kód ≥ 10.
3. `LD (HL),A` / `INC HL`.
4. `$CFA3 LD ($CFA9),A` přepíše první bajt `"L "` a `$D3C1` vytiskne znak + mezeru na AT `$13,$0C`.
5. `$CFAC LD A,$11` / `$D7C0`.

`$D5C8` skenuje 8 řad od `$FEFE`, tabulka `$D5A0` (40 B):

```
$01 Z X C V | A S D F G | Q W E R T | 1 2 3 4 5
0 9 8 7 6 | P O I U Y | $02 L K J H | SPC $03 M N B
```

`$01` CAPS, `$02` ENTER, `$03` Symbol Shift — `$CF9D CP $0A` je zahodí. Písmena jsou **velká ASCII** (`A=$41` … `Z=$5A`). Číslice `$30`–`$39` a mezera `$20` projdou filtrem, v tabulce jmen ale nejsou. Více kláves najednou → `$D5C8` vrací 0. Kempston se na zadání kódu nepoužije.

Porovnání je holé `CP (HL)` (`$CFBE`) — bez `AND $DF`, bez case-fold.

Snapshot má v `$D031` `"EXIAL"` (platné jméno). Za běhu se všech pět bajtů přepíše; prázdný odeslat nelze.

## 5. Platný kód

`$CFB3`: `HL=$D036`, `C=$0F` záznamů, každých 5 znaků proti `$D031`. Neshoda: `POP HL`, `ADD HL,$0007`, `DEC C`.

Shoda (`$CFC6`):

1. Tři `POP DE` sundají `$CFBD` a rámec `$CB8F`/`$CB95` — `RET` se vrací do `$A523` (`CALL $C544`), ne do `$D1A6`.
2. Word za jménem → `$D2C8` (`$CFC9`–`$CFCC`).
3. Smyčka `B=$14`: `$D58A` / `$D3C1` `"NOW TELEPORTING"` (`$16,$15,$09,...$FF` na `$CFDB`) / `$D7C0 A=$10`.
4. `$CFF5 LD A,$09` / `$D7C0`.
5. `$CFFA LD A,$04` / `RET`.

`$A526 CP $64` / `$A52A LD ($D2C4),A` / `$A52D JP $A426`.

**Odemčení / návštěva cíle se nekontroluje.** Stačí znát pět znaků. Tabulka je statická ROM; žádný bit „discovered“ u jmen není.

Cíl je právě ta místnost, kde stojí pad daného jména. Stejné jméno jako u aktuálního padu = teleport do téže místnosti (reload + spawn na tentýž hotspot).

## 6. Neplatný kód

Po vyčerpání 15 záznamů (`$D003 JR NZ,$CFB8` selže):

| krok | adresa | chování |
|---|---|---|
| zpráva | `$D010` | `$16,$15,$06,"CODE NOT RECOGNISED",$FF` |
| blikání | `$D008 LD B,$28` + `$D58A` | 40× střídání INK |
| zvuk | `$D027 LD A,$0F` / `$D7C0` | mimo rozsah |
| `$D2C8` | — | **nemění se** |
| energie | — | `$D41F` se **nevolá** |
| lockout | — | žádný; pad lze hned znovu použít |

`$D02E JP $CC4B`: Y zarovná `(Y+1) ∧ $F8 − 1` (`$CC4B`–`$CC52`), `A=$03`, dva `POP`, `RET` → zase `$A426`.

Sémantika pro prohlížečové UI (originál je Spectrum overlay, engine má prompt/DOM, ne kopii obrazovky):

- zůstat v aktuální místnosti;
- ukázat text ekvivalentní „CODE NOT RECOGNISED“;
- nebrat energii, nezamykat pad;
- pět znaků je povinných (nejde odeslat kratší kód);
- originál po chybě **překreslí celou místnost** (`$A426`), což smaže plošinky — viz § 8.

## 7. Přílet

`$A426` nejdřív zarovná **stávající** X/Y (`X ∧ $F8`, Y na mřížku `$C93D`) a teprve pak kreslí **novou** `$D2C8` (`$A46F CALL $A7FC` → `$A80A`). To zdrojové zarovnání přílet přepíše.

`$A4B1` po smazání plošinek:

```
$A4D4 LD A,($D2C4)
$A4D7 CP $04
$A4DB LD A,$0D          ; hledaný typ
$A4E5 LD HL,$96FE       ; typ prvního záznamu $96FC
$A4E8 LD B,$14
$A4EA CP (HL) / krok +3
$A4F2 DEC HL            ; Y
$A4F3 LD D,(HL)
$A4F4 DEC HL            ; X
$A4F5 LD E,(HL)
$A4F6 LD ($DD1D),DE
```

**Pravidlo:** Blob X/Y = X/Y objektu typu `$0D` v cílové místnosti (první takový v `$96FC`). Ne kopie zdrojových souřadnic, ne pevný bod, ne tabulka jmen. Tytéž hodnoty, které `$AA02` spočetl z hotspotu `$D4`.

Zarovnání `$A426` po snapu už neběží; hodnoty z `$AA02` už na mřížce jsou.

Nudge / sonda terénu **neexistuje**. Hra nespawnuje „vedle“ padu. Ověření 15 cílových místností po `$A80A+$AA30`:

| jméno | místnost | spawn X,Y | buňka originu | attr originu | podlaha `$D2F4` (+2 řádky, 2 sloupce, `X∧7=0`) |
|---|---|---|---|---|---|
| VEROX | `$0028` | `$A0,$3F` | (20,16) | `$47` | `$03,$03` |
| RAMIX | `$001F` | `$60,$3F` | (12,16) | `$47` | `$06,$06` |
| TULSA | `$0042` | `$A0,$3F` | (20,16) | `$47` | `$05,$05` |
| ASOIC | `$0096` | `$A0,$3F` | (20,16) | `$47` | `$03,$03` |
| DELTA | `$00A2` | `$A0,$3F` | (20,16) | `$47` | `$02,$02` |
| QUAKE | `$00D5` | `$A0,$3F` | (20,16) | `$47` | `$02,$02` |
| ALGOL | `$0121` | `$A0,$3F` | (20,16) | `$47` | `$06,$06` |
| EXIAL | `$0157` | `$A0,$3F` | (20,16) | `$47` | `$06,$06` |
| KYZIA | `$017C` | `$60,$3F` | (12,16) | `$47` | `$06,$06` |
| ULTRA | `$01B1` | `$A0,$3F` | (20,16) | `$47` | `$03,$03` |
| IRAGE | `$01C9` | `$A0,$3F` | (20,16) | `$47` | `$03,$03` |
| OKTUP | `$01CD` | `$A0,$3F` | (20,16) | `$47` | `$04,$07` |
| SONIQ | `$01D6` | `$A0,$3F` | (20,16) | `$47` | `$04,$07` |
| AMIGA | `$01F3` | `$60,$27` | (12,19) | `$47` | `$02,$02` |
| AMAHA | `$01FA` | `$A0,$27` | (20,19) | `$47` | `$05,$05` |

`$D2F0` / `$D2F4` blokuje při `attr < $40`. Origin je `$47` (≥ `$40`, průchozí). Podlaha pod nohama je vždy `< $40` — Blob po příletu nespadne. GRAFIX 3×2 má vpravo (origin.sloupec+2) buňky `$05` (součást grafiky `$24`). To je **stejná** pozice, na které se pad aktivuje; ROM ji nenapravuje. Kolize chůze není AABB 24×16 (viz `MOVEMENT.md`, inkoustové pixely).

Když `$D2C4≠$04` a `≠$05`, snap se neprovádí. Kdyby v cíli `$0D` chyběl, smyčka `$A4EA` by po 20 krocích přesto načetla cokoliv pod HL — u všech 15 jmen `$0D` je.

`$A50D` uloží výsledné X/Y do `$D2DC`.

## 8. Vedlejší účinky vstupu / odchodu

Platný i neplatný kód končí `$A426` (důvod `$04` vs `$03`). `$A426` vždy:

| efekt | platný (`$D2C4=$04`) | neplatný (`$D2C4=$03`) | adresa |
|---|---|---|---|
| plošinky `$DBBB` na nulu (49 B) | ano | ano | `$A4B1 LD B,$31` |
| `$DD29`/`$DD2C` = 0, `$DD21=$07` | ano | ano | `$A4BB`–`$A4C4` |
| `$C8DD` parkování střely | **ne** | **ne** | `$C947` je jen u východu `$C8F4` |
| `$9C47` respawn vetřelců | ano (`CP $03` mine) | **ne** (`$A51C JR Z,$A523`) | `$A519`–`$A520` |
| extra `$A350` | bit se nemaže (`$A801` není) | totéž | `$AA30` extra znovu nakreslí, pokud bit drží |
| `$94E8` předměty | přetrvají (`placed` / sebráno) | totéž | `$AB40` |
| `$DD22` vznášedlo | neobnovuje se (`CP $01` je `$D2C4=$01`) | totéž | `$A4FA` |

`$A426` kopíruje 5 bajtů z `$A4A7` do každé z 6 entit (`$A48F`), **ne** X/Y. Střela `$DDBD`/`$DDBE` se tedy na rozdíl od `$C8DD` (`X=0,Y=$0F`, grafika `$DF40`) výslovně neparkovuje. Živý zbytek střely v cílové místnosti **nebyl** krokovaný v emulátoru — tvrzení je z toku kódu.

Po příletu stojí Blob znovu přesně na `$0D`. Další tick `$CEC9` overlay znovu otevře, pokud `$DD23∧$03≠0`. Po pěti písmenech z `$D5C8` jsou směrové klávesy (T/I) typicky puštěné. Držený Kempston skrz overlay to může spustit znovu (UNVERIFIED živě; `$C55A` Kempston čte každý tick `$C5BD`).

## 9. Tabulka `$D036` (úplná)

15 záznamů × 7 B, `$D036`–`$D09E`. Žádná kolize jmen, žádný duplicitní cíl, `$C7` v cílech není. Little-endian word.

| # | jméno | adresa jména | cíl (word) | místnost | spawn X | spawn Y |
|---|---|---|---|---|---|---|
| 0 | `VEROX` | `$D036` | `$0028` | 40 | `$A0` | `$3F` |
| 1 | `RAMIX` | `$D03D` | `$001F` | 31 | `$60` | `$3F` |
| 2 | `TULSA` | `$D044` | `$0042` | 66 | `$A0` | `$3F` |
| 3 | `ASOIC` | `$D04B` | `$0096` | 150 | `$A0` | `$3F` |
| 4 | `DELTA` | `$D052` | `$00A2` | 162 | `$A0` | `$3F` |
| 5 | `QUAKE` | `$D059` | `$00D5` | 213 | `$A0` | `$3F` |
| 6 | `ALGOL` | `$D060` | `$0121` | 289 | `$A0` | `$3F` |
| 7 | `EXIAL` | `$D067` | `$0157` | 343 | `$A0` | `$3F` |
| 8 | `KYZIA` | `$D06E` | `$017C` | 380 | `$60` | `$3F` |
| 9 | `ULTRA` | `$D075` | `$01B1` | 433 | `$A0` | `$3F` |
| 10 | `IRAGE` | `$D07C` | `$01C9` | 457 | `$A0` | `$3F` |
| 11 | `OKTUP` | `$D083` | `$01CD` | 461 | `$A0` | `$3F` |
| 12 | `SONIQ` | `$D08A` | `$01D6` | 470 | `$A0` | `$3F` |
| 13 | `AMIGA` | `$D091` | `$01F3` | 499 | `$60` | `$27` |
| 14 | `AMAHA` | `$D098` | `$01FA` | 506 | `$A0` | `$27` |

Bajty jmen jsou ASCII `$41`–`$5A`. Příklad VEROX: `$56,$45,$52,$4F,$58,$28,$00`.

## 10. Hrany

| případ | chování | adresa |
|---|---|---|
| teleport v `$C7` | pad `$D0` není; `$A4B1` při `$D2C8=$00C7` skáče na `$A6C1` **před** snapem `$04` | `$A4CE`–`$A4D1` |
| kolize jmen | žádná (15 unikátních) | dump `$D036` |
| prázdné `$D031` | nelze odeslat; vždy 5 znaků | `$CF91 LD B,$05` |
| stejná místnost | platné; `$D2C8` se zapíše znovu, `$A426` reload, spawn na tentýž `$0D` | `$CFCC`, `$A4F6` |
| dvě `$0D` v jedné místnosti | v ROM datech 0; `$A4EA` by vzal první v `$96FC` | `$A90F` scan 512 místností |
| pad mimo tabulku | 0 takových; `$CF11` by ukázal 5 bajtů před vyčerpaným HL | `$CF27` fall-through |
| číslice / mezera v kódu | vstupně povolené, tabulka je nemá → neplatný kód | `$D5A0`, `$CF9D` |
| `$C8F4` východy | jiná cesta (`A=$00`), `$C8DD`, jiný posun `$D2C8` | `$C936` |

## (a) Konstanty pro pozdější `constants.ts`

```
TELEPORT_TYPE = 0x0D
TELEPORT_ATTR_HI = 0xD0
TELEPORT_SUBBLOCK = 0x24
TELEPORT_GRAPHIC = 0x24          // $EA65 L
TELEPORT_RAW = 0xD4              // col+0 row+1
TELEPORT_COUNT = 15
TELEPORT_NAME_LEN = 5
TELEPORT_STRIDE = 7
TELEPORT_TABLE = 0xD036
TELEPORT_CODE_BUF = 0xD031
TELEPORT_INPUT_MASK = 0x03       // Left|Right, ne Up
TELEPORT_REASON = 0x04           // $D2C4 po platném kódu
TELEPORT_INVALID_REASON = 0x03   // $CC4B
OBJECT_EXACT_TYPES includes 0x0D // ne ITEM_NEAR
```

Mapa jméno → `room` z § 9. Spawn se **neukládá** do tabulky jmen; počítá se z `$96FC` typu `$0D` po `$A80A` cíle (většina `$A0,$3F`, tři `$60,$3F`, AMIGA/AMAHA Y=`$27`).

## (b) Jméno → místnost

`VEROX→40, RAMIX→31, TULSA→66, ASOIC→150, DELTA→162, QUAKE→213, ALGOL→289, EXIAL→343, KYZIA→380, ULTRA→433, IRAGE→457, OKTUP→461, SONIQ→470, AMIGA→499, AMAHA→506`.

## (c) Nevyřešené

1. Zbytek střely bez `$C8DD` po platném teleportu — z kódu vyplývá, že `$DDBD` se nemění; live snímek v cíli není.
2. Opakovaný vstup overlay při drženém Kempstonu po příletu na pad.
3. `$D7C0` ID `$07`/`$11`/`$10`/`$09`/`$0F` — zvuk záměrně mimo rozsah.
4. Přesný vzhled overlay (barvy `$D55F`/`$D58A`) engine replikovat nemusí.

## (d) Poznámky k implementaci

- Zadání kódu v enginu: **browser prompt / DOM**, ne Spectrum obrazovka. Sémantika: 5 znaků, porovnání s tabulkou bez ohledu na case-fold originálu (originál je jen uppercase ASCII), platný → změna `room` a spawn na hotspot cílového `$0D`, neplatný → zpráva „CODE NOT RECOGNISED“, zůstat, bez trestu energie.
- `tickPickup` v `game/src/items.ts` teleport **přeskakuje** (komentář u funkce: „Teleport / hoverpad / core / doors skipped“). Vstup padu není Up-sběr; patří do walku objektů s přesnou shodou a Left/Right.
- Plošinky: originál je maže při každém `$A426`, tedy i po chybě kódu. Jestli to engine u neplatného kódu zopakuje, je produktové rozhodnutí; v ROM to tak je.
- Testy později musí krýt všech 15 jmen z § 9.
