# TODO

Zbývající práce na enginu. Hrací smyčka (chůze, sběr, palba, pad, zdviž, dveře, jádro, teleport, `$0F` průchody, HUD, SFX) je hotová.

## Hráč to pozná

- [x] Puls `$70` / jiskra `$DB88` — persist XOR (ne replace L6/L7). Rozbor: `docs/notes/pulse-spark.md`.
- [ ] Cheops `$CCF1` — extra `$19` jen nastaví `cheops`; výměna v pyramidě chybí.
- [ ] Přeplněný inventář `$D1CA` — pátý předmět se zahodí z pole; ROM ho dropne zpět do místnosti.
- [ ] Objekt `$0E` (nibble `$E0`) — stroj: pád z max. výšky položí dvě plošinky. Není zelené pole `$64`.
- [ ] Door/TP overlay — text OK; chybí animace cifer `$D78B` / ikony `$25`/`$26`/`$24` a SFX `$D679`/`$D70E`.
- [ ] Intro hudba — `music/intro.mp3` není zapojené (smyčka je `viewer/bgm.mp3`). Title/menu obrazovky taky ne.

## Záměrně mimo

- [ ] Hop `TEMP_JUMP_*` — v `$C5BD` skok není (odmapovaný).
- [ ] Overlay `solid` (`$D280`) vs chůze `$D2F0` — na obrazovce obráceně, podle ROM správně. Neměnit export.
- [x] Kanál `$A41B`/`$A41C` → `$A57B` — palba `$05`, pád `$06`, dopad `$07`, plošinka `$08`, oblaka `$09`, spawn 1…4, kill `$0B`, ambient `$0C`…`$0F`.
- [ ] Melodie `$6600` — skip (title/end); pozadí = MP3.
- [ ] Spectrum end-screen, hi-score `$64FA`, scramble `$64A0` — HTML overlay +1000.
- [ ] Arrow `$BF88` ve zdviži — není v extractu.
- [ ] Digit `$0E` wildcard u dveří — 1× v enginu; Spectrum minihra ne.

## Věrnost (hra se dohraje)

- [x] Animace 4 GRAFIX snímků vetřelce + pad — `world.frames / 2`, live ptr beze změny.
- [ ] `$DD26` lean-to-stop `$E674` — engine drží poslední walk pose.
- [ ] Live `$DAC6` po `$A80A` — engine seed `$7530+id×12`.
- [ ] HUD redraw každý frame (ROM chrome jen `$A426`).
- [ ] Inventář ve statusu: XOR blit vs přesné `$DB24` timing.
- [ ] `skip64` vs `$A132` (řada Y+1, skip jen Y, exact `$64`).
- [ ] Místnost 362 — jeden door hotspot (broken pair?).
- [ ] 1. tick Up bez `$14+` — ROM vsune prázdný slot `00 00`; engine ne.
- [ ] Podlaha dál `$D2F4` foot-column, ne inkoust nohou.

## Hygiena

- [ ] WORKLOG: poslední commit je `d4523e1`, ne `cc710eb`.
- [ ] WORKLOG bod 17: `viewer/bgm.mp3` už je v gitu (stejný soubor jako `music/game-loop.mp3`).
- [ ] `docs/notes/item-effects.md` — `$0F` pořád „mimo rozsah“, v enginu je.
- [ ] Git remote `origin` — push teď nejde.
- [ ] Untracked `tmp_*` sondy necommituj; `music/` (intro + duplicitní loop) rozhodnout.
