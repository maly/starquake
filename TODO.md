# TODO

Zbývající práce na enginu. Hrací smyčka (chůze, sběr, palba, pad, zdviž, dveře, jádro, teleport, `$0F` průchody, HUD, SFX) je hotová.

## Hráč to pozná

- [x] Puls `$70` / jiskra `$DB88` — persist XOR (ne replace L6/L7). Rozbor: `spec/notes/pulse-spark.md`.
- [x] Cheops `$CCF1` — extra `$19` + Up: 2ciferný kód, výměna 1–5 z `$D2DE`.
- [x] Přeplněný inventář `$D1CA` — pátý předmět se zahodí z pole; ROM ho dropne zpět do místnosti (`$D1F8` / `$D267` col−1 / col+2 / orig).
- [x] Objekt `$0E` (nibble `$E0`) — stroj: pád z max. výšky položí dvě plošinky. Není zelené pole `$64`.
- [x] Door/TP overlay — text + ikony `$25`/`$26`/`$24` (`$EA65`) + digit-roll `$D78B` / SFX `$D679`/`$D70E`.
- [x] Title/menu `$5E81` — `STARQUAKE`, volby 1–5 (highlight + `$0C`), `0` start, `Q` quit Y/N. `$6600` skip; define-keys `$6194` skip; řízení ve hře dál Q/A/O/P.
- [x] Intro `$666D` `FLIGHT COMPUTER REPORT` (po `0`, další klávesa → hra). `$6600` B=4 skip.
- [x] `music/intro.mp3` — title/menu/intro hraje `viewer/intro.mp3`; smyčka ve hře je `viewer/bgm.mp3`. `$6600` dál skip. `music/` necommituj (intro vs duplicitní loop).

## Záměrně mimo

- [ ] Hop `TEMP_JUMP_*` — v `$C5BD` skok není (odmapovaný).
- [ ] Overlay `solid` (`$D280`) vs chůze `$D2F0` — na obrazovce obráceně, podle ROM správně. Neměnit export.
- [x] Kanál `$A41B`/`$A41C` → `$A57B` — palba `$05`, pád `$06`, dopad `$07`, plošinka `$08`, oblaka `$09`, spawn 1…4, kill `$0B`, ambient `$0C`…`$0F`.
- [ ] Melodie `$6600` — skip (title/end); pozadí = MP3.
- [x] Spectrum end-screen `$6730` / `$693F` + scramble `$64A0`. Hi-score `$64FA` zápis ne.
- [ ] Arrow `$BF88` ve zdviži — není v extractu.
- [ ] Digit `$0E` wildcard u dveří — 1× v enginu; Spectrum minihra ne.

## Věrnost (hra se dohraje)

- [x] Vetřelec po spawn proletí `attr < $40`; po volném 24×16 `clipTerrain` a bounce `$D2F0`.

- [x] Animace 4 GRAFIX snímků vetřelce + pad — `world.frames / 2`, live ptr beze změny.
- [ ] `$DD26` lean-to-stop `$E674` — engine drží poslední walk pose.
- [x] `$6351`/`$648A` / `$6399` — nová hra z menu losuje `$94E8` 0–19 i `$D2DE`; panel `$C4AB` kreslí živé ID. `#room` snapshot. XY `$AA30`.
- [ ] Live `$DAC6` po `$A80A` — engine seed `$7530+id×12`.
- [ ] HUD redraw každý frame (ROM chrome jen `$A426`).
- [ ] Inventář ve statusu: XOR blit vs přesné `$DB24` timing.
- [ ] `skip64` vs `$A132` (řada Y+1, skip jen Y, exact `$64`).
- [ ] Místnost 362 — jeden door hotspot (broken pair?).
- [x] 1. tick Up bez `$14+` — `$D1B3` vsune `00 00` (posun doprava); 4 plné → drop `$D1F8`. Pad/zdviž ne.
- [ ] Podlaha dál `$D2F4` foot-column, ne inkoust nohou.

## Hygiena

- [x] WORKLOG: poslední commit je `303cce3`.
- [x] WORKLOG bod 17: `viewer/bgm.mp3` už je v gitu (stejný soubor jako `music/game-loop.mp3`).
- [x] `spec/notes/item-effects.md` — `$0F` v enginu; Cheops výměna taky.
- [ ] Git remote `origin` — push teď nejde.
- [ ] Untracked `tmp_*` sondy necommituj; `music/` (intro + loop) necommituj — `viewer/intro.mp3` a `viewer/bgm.mp3` stačí k přehrání.
