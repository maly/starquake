# Vykreslování textu a znaková sada

Rozbor `$D3C1` (inline string → ROM `PRINT_A_2`), fontu `$ADD4` přes `CHARS`, řídicích kódů Spectrum a zápisu do standardního screenu `$4000`/`$5800`. Žádný vlastní textový framebuffer.

**Není to** blitter `$EA65` / `$DB24` (UDG místností a inventáře). **Není to** DOM/HTML. Skóre **není** oddělený digit-renderer — jde přes stejné `$D3C1`.

Hlavní tvrzení (skool + bajty `starquake.z80`): text = Spectrum kanál `$09F4` (`PRINT_OUT`), bitmapa znaku z `CHARS+$code×8`, atribut přes `ATTR-T`/`MASK-T` do `$5800`. Kurzor je sysvar `S_POSN`/`DF_CC`, ne workspace hry.

---

## Odvodené konstanty

| veličina | hodnota | adresa |
|---|---|---|
| print message | `$D3C1` | `c$D3C1` |
| uložení HL volajícího | word `$D3DD` | `$D3C1` / `$D3D9` |
| terminátor stringu | `$FF` | `$D3CA CP $FF` |
| jeden znak | ROM `$15F2` (`PRINT_A_2`) | `$D3CF` |
| kanál výstupu | `CURCHL` → `$09F4` `PRINT_OUT` | snapshot `CURCHL=$5CBB` |
| nastavení fontu | `CHARS ($5C36) := $ACD4` | `$5E81` / `$5E84` (**jediný** zápis) |
| bitmapa znaku `C` | `$ACD4 + C×8` | ROM `PO_CHAR` `$0B65` |
| start tisknutelných (space) | `$ADD4` (= `$ACD4+$100`) | `b$ADD4 Character set` |
| rozsah záměrného fontu | ASCII `$20`–`$5D` (62×8 B) | `$ADD4`…`$AFC3` |
| UDG base (title) | `$5E71` | `$5E8C` / `$5E8F` |
| UDG base (po title) | `$AEAC` | `$5EC8` / `$5ECB` |
| ne lower screen | `RES 0,(FLAGS2)` | `$5E87` |
| clear screen | `$4000`… | `$5FD0` |
| status HUD | `$D425` → lives/E/P/F/inv + `$D521` | `$D425` |
| update skóre + tisk | `$D521` → `$D54D CALL $D3C1` | `$D422 JP $D521` |
| playfield od řádku | 6 (status 0–5) | `PLAY_ROW0` / `$A80A` |
| mřížka | 32×24 buněk | ZX screen |

---

## 1. Znaková sada

### Odkud

`$5E81` (vstup main menu, též návraty `$60A7` / `$622D` / `$65B8`):

1. `LD HL,$ACD4` / `LD ($5C36),HL` — `CHARS` = `$ACD4` (ne ROM `$3C00`).
2. Skool komentář „to `#R$ADD4`“: `CHARS + 32×8 = $ADD4` = glyph space.

Jediný `LD ($5C36),HL` v celé hře je `$5E84`. Po menu zůstane custom font i ve hře. Init `$6351` / `$A426` `CHARS` **nemění**.

Snapshot `reference/src/starquake.z80` má v sysvarech ještě default `CHARS=$3C00` (stav před `$5E81`); data fontu v RAM na `$ADD4` jsou přítomná.

### Formát

- 8×8 pixelů, 8 bajtů na znak (řádek 0…7), stejné jako ROM.
- Adresa: `($5C36) + A×8` (`PO_CHAR` `$0B76`–`$0B7C`).
- Záměrný blok ctl `b $ADD4 Character set` končí před hoverpad grafikou `$AFC8` → kódy **`$20`…`$5D`**.
- Kódy `≥$5E` by četly do sprite dat (`$AFC8`…) — ve stringách `$D3C1` se nevyskytují (jen A–Z, cifry, mezerá, pár symbolů).

### Odlišnosti od ROM fontu `$3D00`

Glyphy `$20`–`$2F` **nejsou** klasická interpunkce. Jsou to HUD „bary“ a UI symboly:

| kód | „ASCII“ | skutečný glyph (`$ACD4+C×8`) |
|---|---|---|
| `$20` | space | prázdný |
| `$21`…`$27` | !…' | vodorovný fill 1…7 pixelů zleva (řádky 1,3,4,6) |
| `$28` | ( | téměř plný bar (kód při E/P/F = `$7F`, `$D48F`) |
| `$2B` | + | svislá čára (UI `$616E`) |
| `$30`…`$39` | 0–9 | cifry hry |
| `$41`…`$5A` | A–Z | písmena hry |

Příklad cifry `0` @ `$AE54`: `$00,$7E,$6E,$6E,$6F,$6F,$6F,$7F`.

### UDG přes print

- Znaky `$90`–`$A4` → `UDG` sysvar `$5C7B` (`PO_T_UDG` `$0B52`).
- Title `"STARQUAKE"`: mezi písmeny `$90` při `UDG=$5E71` (oddělovač `$00,$00,$00,$18,$18,$00,$00,$00`).
- Pak `$5ECB` přepne UDG na `$AEAC` (šipky v oblasti fontu).
- `$80`–`$8F` = ROM mozaiky (`PO_GR_1`), ne tabulka `$EB23` (ta je pro `$EA65`).

---

## 2. Protokol `$D3C1`

```
$D3C1  LD ($D3DD),HL     ; schovej HL volajícího
$D3C4  EX (SP),HL        ; HL := návratová adresa = start inline textu
$D3C5  PUSH AF / DE / BC
$D3C8  LD A,(HL) / INC HL
$D3CA  CP $FF → konec
$D3CE  PUSH HL / CALL $15F2 / POP HL
$D3D3  JR $D3C8
$D3D5  POP BC / DE / AF
$D3D8  EX (SP),HL        ; na stack adresu bajtu ZA $FF
$D3D9  LD HL,($D3DD)     ; obnov HL
$D3DC  RET               ; pokračuj za stringem
```

Vlastnosti:

| věc | chování | adresa |
|---|---|---|
| odkud text | bajty **hned za** `CALL $D3C1` | `$D3C4 EX (SP),HL` |
| konec | `$FF` (hra, ne ROM) | `$D3CA` |
| návrat | PC = adresa po `$FF` | `$D3D8` |
| HL | **zachováno** přes `$D3DD`; skool „HL = pointer na text“ je matoucí | `$D3C1`/`$D3D9` |
| AF,DE,BC | zachovány | `$D3C5`–`$D3D7` |
| kurzor X/Y | **ne** v `$D3xx`; ROM `S_POSN` `$5C88`/`$5C89`, `DF_CC` `$5C84` | `PO_FETCH` |
| ATTR | `ATTR-T` `$5C8F`, `MASK-T` `$5C90`, `P-FLAG` `$5C91` | `PO_ATTR` `$0BDB` |

`$15F2` jde přes `CURCHL` na `PRINT_OUT` `$09F4` — řídicí kódy Spectrum platí.

Placeholdery ve stringu se před `CALL` přepisují (`LD ($xxxx),A`), např. cifry skóre `$D548`, znak baru `$D511`, lives `$D435`.

---

## 3. Řídicí kódy

Statický walk všech 62× `CALL $D3C1` ve snapshotu (operandy po `$10`/`$11`/… započítány). Kódy `$00` v binárce jsou **placeholdery** přepsané před voláním (`$5FAF`, `$6177`, `$67EA`), ne záměrné `PO_QUEST`.

| kód | ROM jméno | operandy | efekt | příklad |
|---|---|---|---|---|
| `$08` | BACK | — | kurzor o 1 sloupec vlevo | `$6250` `"-"$08` |
| `$10` | INK | 1 B (`0`–`7`, `8` = transparent) | `ATTR-T` ink; `$08` → maska | `$D517 $10,$08`; HUD `$10,$06` |
| `$11` | PAPER | 1 B | paper | title `$5EAD $11,$00`; `$616E` |
| `$13` | BRIGHT | 1 B (`0`/`1`) | bright | `$5EAD $13,$01`; skóre `$D550` |
| `$15` | OVER | 1 B | overprint | death flash `$C39A $15,$01`…`$15,$00` |
| `$16` | AT | `y`, `x` | řádek shora 0…23, sloupec 0…31 | status `$D550 $16,$02,$03`; teleport `$CEE0 $16,$08,$04` |
| `$FF` | *(jen `$D3C1`)* | — | konec stringu; neposílá se do ROM | všechny zprávy |

**Neužité** ve stringách `$D3C1` (ROM je umí, hra neposílá): `$06` comma, `$09` right, `$0A`/`$0B` down/up, `$0D` Enter, `$12` FLASH, `$14` INVERSE, `$17` TAB.

Poznámky k parseru:

- `$16,$09,$17` u GAME OVER = AT **y=9, x=23**, ne kód `$17`.
- `$10,$10,$07` v lives stringu `$D450` = INK `$10` (neplatná/edge hodnota ROM) pak bajt `$07` jako další token — součást předpřipraveného HUD layoutu na `$D43C`…`$D45F`.
- Znaky `≥$20` = tisk glyphu; `$80`–`$8F` mozaika; `$90+` UDG.

---

## 4. Zápis do obrazové paměti

Cesta jednoho tisknutelného znaku:

1. `$D3CF CALL $15F2` → `PRINT_OUT` `$09F4`.
2. `PO_ABLE` / `PO_ANY` `$0B24` → `PO_CHAR` `$0B65`.
3. Bitmapa: `DE = CHARS + code×8`.
4. `PR_ALL` `$0B7F`: 8 řádků do display file na `HL` (`DF_CC`); `INC D` mezi pixel-řádky (standardní ZX layout třetin).
5. `PO_ATTR` `$0BDB`: z display adresy → atribut `$58xx` (`H := (H≫3)∧3 ∨ $58`), mix se `ATTR-T`/`MASK-T`.
6. `DEC C` / `INC HL` — posun kurzoru o 1 buňku vpravo.

Důsledky:

- Text jde do **stejného** `$4000` bitmap + `$5800` attr jako dlaždice/sprite.
- Žádný offscreen text buffer pro `$D3C1`.
- OVER/INVERSE z `P-FLAG` (`$0B9B`).
- Clear `$5FD0` maže od `$4000` — potvrzuje canonical screen.

Status (řádky 0–5) i overlay zprávy v playfieldu (AT y≥6/8/…) sdílí tutéž cestu. Inventář ikony kreslí `$DB24`, ne `$D3C1` (jen vymazání mezerami `$D4A4`).

---

## 5. Volající `$D3C1` (přehled)

62 volání. Skupiny:

| oblast | CALL site (příklady) | co tiskne |
|---|---|---|
| main menu / title | `$5EAA`, `$5EE0`…`$5F4E`, `$5F86`, `$5F94`, `$5FAC`, `$5FC9` | STARQUAKE, joystick/keys, highlight INK |
| quit / goodbye | `$6065`, `$60AA` | quit confirm, Olly |
| define keys UI | `$616B`, `$61AC`…`$6213`, `$624D` | mřížka kláves, labely, `-` |
| hiscore / intro | `$6550`, `$658C`, `$65A8`, `$65F0`, `$6672` | CORE OF HEROES, report, čísla |
| game over / complete | `$6735`, `$67CD`, `$67E7`, `$6830`, `$6838`, `$684F`, `$6873`, `$68F0`, `$694A` | SCORE/ADVENTURE/TIME/CORES, hi-score entry, THE CORES COMPLETE |
| first-visit hint | `$ABB1` | space na AT z `$9602` (za `$FF` je kód `DJNZ` `$10,$EF`, ne text) |
| death flash | `$C397` | OVER+INK cells |
| security door | `$CBF0`, `$D741`, `$D767` | SECURITY DOOR / ACCESS … |
| Cheops / exchange | `$CCFF`, `$CD74`, `$CD8D`, `$CE01`, `$CE5C` | CHEOPS…, HIT ANY KEY, `1.` |
| teleport | `$CEDD`, `$CF3A`, `$CF46`, `$CF73`, `$CFA6`, `$CFD8`, `$D00D` | jméno, ENTER CODE, dashes, NOW TELEPORTING, NOT RECOGNISED |
| item pickup flash? | `$D0CF` | AT + spaces |
| HUD status | `$D439`, `$D473`, `$D482`, `$D49C`, `$D4A4`, `$D514`, `$D54D` | lives, E/P/F bary, inv blank, score digits |
| ink helper | `$D580` (z `$D55F`/`$D58A`) | `$10,n` před některými zprávami |

Detail textů zpráv → jiné poznámky (`teleports.md`, `security-doors.md`, `endgame-score.md`).

---

## 6. Skóre vs obecný print

**Oddělená rutina pro bitmapu cifer neexistuje.**

| krok | adresa |
|---|---|
| entry | `$D422 JP $D521` |
| BCD add 6 cifer `$D413`←`$D419` | `$D521`…`$D53A` |
| `digit + $30` → ASCII do stringu | `$D545`…`$D54B` |
| `CALL $D3C1` | `$D54D` |
| string | `$D550 DEFM $16,$02,$03,$13,$01,$10,$07,"……",$FF` |

Lives: bin→ASCII do `$D441` pak `$D439 CALL $D3C1`. E/P/F: glyph `$20+n` / `$28` / `(` přes `$D3C1` (`$D514`, `$D49C`, `$D482`). Všechny cesty = obecný print + custom font.

---

## Open questions / spory

1. **Snapshot `CHARS=$3C00`** vs runtime `$ACD4` — ověřeno kódem `$5E84`; emulator bez projití menu by tiskl ROM font (u nás ROM v `.z80` loadu je navíc zero).
2. **Skool `R $D3C1 HL Pointer to character data`** — HL se jen schová; text je na stacku. Brát skool popis opatrně.
3. **INK `$10`** v lives stringu `$D450` — edge case ROM; vizuál neověřen headless (ROM print v probe se stubuje).
4. **Mozaika `$8C`** v define-keys (`$616E`) — ROM graphics, ne `$EA65`; přesný tvar neexportován.
5. **`$D55F` / `$D58A`** — střídání INK před zprávami; detail timing/flicker mimo rozsah tohoto textu.
6. Budoucí engine: stejný rastr 32×24 a attr buňky; font dump `$ADD4`…`$AFC3` (případně UDG `$5E71` / `$AEAC` pro title).
