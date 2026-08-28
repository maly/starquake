# Formát výstupních souborů

Všechny JSON soubory jsou UTF-8, pole jsou 0-indexovaná a identifikátory odpovídají bajtům ve snapshotu. Pixelové souřadnice mají počátek vlevo nahoře.

## `graphics.png`

Jednobarevný spritesheet (RGBA). Ink je neprůhledná bílá `(255,255,255,255)`, paper je plně průhledný `(0,0,0,0)`. Spectrum atribut se do PNG nezapeče.

Hra kreslí jen obsazené buňky (nastavený bit příznaku). Neobsazená buňka se nepřepisuje — zůstane výplň `$47` z rutiny `$A647`.

## `graphics.json`

```json
{
  "spritesheet": "graphics.png",
  "cell_size": 8,
  "colour": "...",
  "graphics": [
    {
      "id": 0,
      "ptr": 60612,
      "cols": 4,
      "rows": 3,
      "row_attrs": [4, 96, 96],
      "row_flags": [240, 240, 240],
      "cells": [{"row": 0, "col": 0, "data": [240, 240, 240, 0, 0, 0, 0, 0]}],
      "x": 0,
      "y": 0,
      "width": 32,
      "height": 24,
      "attr": 4
    }
  ]
}
```

| pole | význam |
|---|---|
| `id` | Identifikátor podbloku (index v tabulce ukazatelů `0xEB23`) |
| `ptr` | Adresa záznamu UDG ve snapshotu; `0` = prázdný záznam |
| `cols`, `rows` | Počet buněk 8×8 po ořezu prázdných sloupců a řádků |
| `row_flags` | Šest bajtů příznaků (řádek 0 je první). Hra kreslí 6×8 buněk; bit se zkouší přes `RLCA` + carry. |
| `cells` | Jen obsazené buňky, v pořadí kreslení. `data` je 8 bajtů bitmapy. `attr` je **surový** bajt z proudu před záznamem (jeden na obsazenou buňku, ne na řádek). |
| `x`, `y`, `width`, `height` | Obdélník ve spritesheetu v pixelech |

Atributy před záznamem jsou proud, který `$EAB9` čte pozpátku (`DEC DE`) **jednou za každou obsazenou buňku**. SkoolKit HtmlWriter bral jeden bajt na řádek a maskoval ho `$3F` — to neodpovídá hře.

## `blocks.json`

```json
{
  "order": "Four sub-block identifiers per block, stored as in memory and drawn right-to-left then bottom-to-top: [bottom-right, bottom-left, top-right, top-left].",
  "blocks": [{"id": 0, "subblocks": [20, 20, 20, 20]}]
}
```

256 bloků (`id` 0–255). Pořadí čtyř podbloků **není** normalizované: je to pořadí v paměti na `0x9840 + id * 4` a zároveň pořadí kreslení v referenčním `get_block_data` (zprava doleva, zdola nahoru).

Umístění podbloků v buňkách vzhledem k originu bloku `(x, y)`:

| index | podblok | origin |
|---|---|---|
| 0 | vpravo dole | `(x+4, y+3)` |
| 1 | vlevo dole | `(x, y+3)` |
| 2 | vpravo nahoře | `(x+4, y)` |
| 3 | vlevo nahoře | `(x, y)` |

Grafika podbloku může být až 8×6 buněk a překrývá sousedy. Později kreslený podblok přepíše dřívější (atribut i pixely).

## `block_attrs.json`

```json
{
  "translation_table": [32, 3, 2, 5, 6],
  "translation_rule": "If raw is 0 or raw >= 0x50, use raw as the attribute. Otherwise replace it with translation_table[raw >> 4] (from 0xA7F7).",
  "attributes": [{"id": 0, "raw": 81, "attr": 81}]
}
```

| pole | význam |
|---|---|
| `raw` | Bajty z `0x9740` |
| `attr` | Hodnota po aplikaci tabulky `0xA7F7` |
| `translation_table` | Pět bajtů z `0xA7F7` |

`raw` je bajt z `$9740`. Za běhu hra tabulku `$A7F8`–`$A7FB` (položky 1–4) **přestaví v `$A80A`** z checksumu `$DAC6`; `$A7F7` (`$20`) zůstává. Statická kopie ze snapshotu proto není maska použitá při kreslení místnosti.

## Masky `$EA62` a `$EA63`

Nastavují se za běhu, nejsou konstantní po celou místnost.

**`$EA62` (inkoust pro speciál 0)** — na začátku každého `$EA65` (tisk grafiky):

- `A = (DAC0) & 7`
- pokud `A >= 2`, uloží se `A`
- jinak `(řádek_originu & 7) | 2`

`DAC0` je 16bitový stav checksumu `$DAC6`. Seed je adresa dat místnosti (`$7530 + id*12`). `$DAC6` se volá při inicializaci `$A80A` (včetně smyčky čtyř unikátních hodnot do `$A7F8`) a **znovu před každou grafikou** v `$A8D3`.

**`$EA63` (paper+ink pro speciál `$36`)** — v `$A90F` před tiskem podbloku:

- raw atribut `$9740+id == 0`: maska se nemění
- `(raw & $F0) == 0` (hodnoty `$01`–`$0F`): nemění se
- `(raw & $F0) < $50` (tedy `$10`–`$4F`): `$EA63 = tabulka[raw >> 4]`, kde tabulka je `$A7F7` plus čtyři bajty přestavěné výše
- jinak se `$EA63` nemění (sticky)

Po startu ze snapshotu je `$EA63 = $05`, `$EA62 = $02`. Každá místnost se skládá z tohoto stavu znovu, nezávisle.

## Dekódování buňky (`$EAD3`)

`AND $3F` slouží jen k `CP $36` / `CP $00`. Do atributové paměti jde **celý bajt**:

```
masked = full & 0x3F
if masked == 0x36:  stored = (full & 0xC0) | EA63
elif masked == 0:   stored = (full & 0xF8) | EA62
else:               stored = full
```

`CP $36` platí i pro `$76` / `$B6` / `$F6` (bit 6/7 nastavený). Speciál 0 jen když jsou paper i ink nula.

## Pevnost (kolize)

Rutiny `$C7DF` a `$D280`: buňka je pevná, když je **bit 6** atributu nastavený, s výjimkou hodnoty **`$64`**.

- `$D280`: `BIT 6` a `CP $64` na celém bajtu — `$64` není pevná, `$E4` (flash + `$64`) je.
- `$C7DF`: totéž, ale porovnává `(attr & $7F)` s `$64`, takže i `$E4` bere jako výjimku.

Odvozené pole `solid` používá pravidlo `$D280`: `bit6 && attr != 0x64`. Není náhradou surového bajtu.

## `rooms.json`

```json
{
  "width": 4,
  "height": 3,
  "play_origin_row": 6,
  "cells": [32, 18],
  "clear_attr": 71,
  "rooms": [{
    "id": 0,
    "blocks": [2, 2, 5, 5, 100, 7, 7, 0, 20, 0, 0, 13],
    "attributes": [[71, 71, "... 32 bajtů"], "... 18 řádků"],
    "solid": [[0, 0, "..."], "..."]
  }]
}
```

512 místností. `blocks` je 4×3 identifikátorů. Hrací plocha začíná na obrazovce na řádku 6 (`$A80A` kreslí od `B=6`); `$A647` vyplní atributy hodnotou `$47`.

`attributes[y][x]` je plný bajt z `$5800 + (y+6)*32 + x`. Bit 6 a 7 jsou zachované.

Export je statická dlaždicová vrstva (12 bloků v `$A8D3`). `$A80A` na konci skáče na `$AA30` (předměty / stvoření). Pohyblivá vrstva **není** statická tabulka 512 místností — viz `items.json` a [`AA30.md`](AA30.md). Kolizní mřížka `solid` popisuje jen dlaždice.

## `sprites.json` / `sprites.png`

35 spritů `$00`–`$22` z tabulky `$9088`. `$CE68` mapuje identifikátor na `$9088 + id×32`.

Na rozdíl od dlaždic (`graphics.json`) **nemají** příznaky řádků ani proud atributů. Každý záznam je pevných 2×2 buněk, 32 bajtů, čtyři po sobě jdoucí 8bajtové UDG v pořadí řádek 0 sloupec 0, řádek 0 sloupec 1, řádek 1 sloupec 0, řádek 1 sloupec 1. `cells[].attr` je `null` — atribut dodá volající (`$AA30` po `OR $40`).

PNG je stejný jednobarevný spritesheet jako `graphics.png`.

| pole | význam |
|---|---|
| `id` | Identifikátor pro `$CE68` (0–34) |
| `ptr` | Adresa 32bajtového záznamu |
| `kind` | `"sprite"` |
| `set` | `"sprite-NN"` — každý identifikátor je samostatný objekt, ne animační fáze |
| `frame` | Vždy 0 |
| `cols`, `rows` | 2, 2 |
| `cells` | Čtyři obsazené buňky; `data` je 8 bajtů bitmapy |

Skládání přes pozadí (`$DB24`):

1. Každá z čtyř buněk se **XOR**uje do existující bitmapy (`XOR (HL)` na `$DB50`). Není to maska průhlednosti. Druhé vykreslení téhož spritu pixely vrátí.
2. Atribut se **přepíše celý**, pokud bit 7 (FLASH) nového bajtu není nastavený. `$AA30` FLASH nenastavuje a před voláním dělá `OR $40`, takže bit 6 (pevnost) je nastavený a kolizní mřížka se může změnit.
3. Při nastaveném bitu 6 `$DB24` uloží adresu atributu a hodnotu do bufferu `$EA60` (obvykle `$5B20`), aby šlo buňku později obnovit (`$D97B` při sebrání).

## `actors.json` / `actors.png`

Grafika hlavní postavy, vznášedla, nepřátel a příbuzných sad. Formát je SkoolKit `#GRAFIX` / `#BLOB`, ne dlaždice a ne sprity `$9088`.

Jeden snímek: 3×2 buněk, 48 bajtů. Scanline `p` horního řádku jsou tři po sobě jdoucí bajty na `ptr + p×3` (sloupce 0, 1, 2). Dolní řádek začíná na `ptr+$18`. Čtyři snímky sady jsou na `+$00 / +$30 / +$60 / +$90` (`$C0` bajtů; rutina `$C6CA` tímto krokem indexuje fázi). `blobfire` má osm snímků.

`$AA30` tuto grafiku nekreslí. Herní smyčka ji XOR-uje na pixelových souřadnicích v nepopsané rutině `$DF70` (tři bajty na scanline, posun když `x&7 ≠ 0`). `$D8B1` potom míchá jen inkoust do existujícího atributu: pokud je už nastavený BRIGHT (bit 5), buňka se přeskočí, jinak `AND $F8` / `OR ink`. Bit 6 (pevnost) se nenastavuje.

| pole | význam |
|---|---|
| `sets` | Seznam sad: `name`, `ptr`, `frames`, `kind` (`grafix` nebo `blob`) |
| `graphics[].set` | Příslušnost k sadě |
| `graphics[].frame` | Index snímku v sadě (0-based) |
| `graphics[].kind` | `"grafix"` (hoverpad, vetřelci, …) nebo `"blob"` (hlavní postava) |
| `cells[].attr` | `null` — atribut dodá herní smyčka |

## `items.json`

45 záznamů tabulky sbíratelných předmětů na `$94E8` **po prvním vstupu** do každé místnosti, která měla ve snapshotu nepřiřazený záznam. Není to vrstva 512 místností (extra objekty a sebrání zůstávají stavové), ale počáteční souřadnice už engine z checksumu skládat nemusí.

```json
{
  "table": 38120,
  "count": 45,
  "initialized": true,
  "d2c6": [120, 123],
  "items": [{
    "index": 0,
    "room": 168,
    "col": 25,
    "row": 7,
    "placed": true,
    "sprite": 15,
    "attr_bits": 2,
    "raw": [89, 7, 168, 15],
    "snapshot_raw": [221, 0, 168, 15],
    "initialized": true
  }]
}
```

| pole | význam |
|---|---|
| `initialized` (soubor) | `true` — 20 záznamů s `row < 6` ve snapshotu už má souřadnice z `$AA30` |
| `d2c6` | Dva bajty `$D2C6` ze snapshotu (kopie `FRAMES` z `$636F`); vstup do losování slotu a Y |
| `room` | `(byte1 bit 7)×256 + byte2` |
| `col` | `byte0 & $1F` |
| `row` | `byte1 & $7F` |
| `placed` | `row >= 6` — `$AB40` takový záznam kreslí |
| `sprite` | Identifikátor pro `$CE68` |
| `attr_bits` | `byte0 >> 5`; `$AB40` z toho udělá inkoust a `OR $40` |
| `raw` | Čtyři bajty po umístění |
| `snapshot_raw` | Čtyři bajty ve snapshotu před prvním vstupem |
| `initialized` (záznam) | `true`, pokud se `raw` liší od `snapshot_raw` |

Souřadnice jsou funkce identifikátoru místnosti (seed `$DAC6` = adresa dat místnosti, markery `$90`) a zmrazeného `$D2C6`. Pořadí návštěv je nemění.

Pole `assignment` je statický whitelist pro nové hry (`$6351` / `$648A`): dvě čtveřice pro sprity `$0F` a `$10`, 18 dvojic pro záznamy 2–19, osm pevných jádrových místností z `$95F0`. Záznamy 20–44 se nelosují. Rozbor: [`AA30.md`](AA30.md).

## Renderované místnosti (`rooms/room_<id>.png`)

RGB PNG 256×144. Paleta je paleta SkoolKitu (`ImageWriter`):

| ink/paper | běžná | bright |
|---|---|---|
| 0 | 0,0,0 | 0,0,0 |
| 1 | 0,0,197 | 0,0,255 |
| 2 | 197,0,0 | 255,0,0 |
| 3 | 197,0,197 | 255,0,255 |
| 4 | 0,198,0 | 0,255,0 |
| 5 | 0,198,197 | 0,255,255 |
| 6 | 197,198,0 | 255,255,0 |
| 7 | 205,198,205 | 255,255,255 |

Bit 6 atributu je ve hře **pevnost**, ne jen jas. Flash (bit 7) se v PNG nevykresluje jako animace.

## Rozdíly proti starému SkoolKit HtmlWriteru

Tyto odchylky jsou opravy podle `$EAD3`, ne regrese:

1. Do mřížky se ukládá celý atributový bajt. HtmlWriter dělal `attr & $3F` a zahodil bity 6 a 7 (pevnost / flash).
2. Atributy jsou po jednom na obsazenou buňku (`DEC DE` v `$EAB9`), ne jeden na řádek.
3. Speciál 0: `(full & $F8) | EA62`. Speciál `$36`/`$76`/…: `(full & $C0) | EA63`. HtmlWriter místo toho dosazoval přeložený atribut bloku, případně 7.
4. Neobsazená buňka se nekreslí (pozadí `$47`), HtmlWriter ji přepsal prázdným UDG s atributem 0.
5. `$EA62`/`$EA63` se mění během místnosti (viz výše); nejsou to konstanty ze snapshotu.
