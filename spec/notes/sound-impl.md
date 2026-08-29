# Zvuk — rozhodnutí orchestrátora (2026-08-27)

Podklad: [`sound-effects.md`](sound-effects.md), [`melodies.md`](melodies.md). Toto není rozbor ROM; jsou to závazná rozhodnutí pro implementaci.

## Melodie `$6600`

**Nezahrnovat.** Pět call sites (`$5ED3`, `$65B5`, `$6727`, `$685F`, `$69D0`) je title / menu / intro / hi-score / end-screen. Menu `$5E81` je v enginu **bez** `$6600`. `$D9DE` je blokující `DI`. Pozadí = jen MP3.

## Kanál `$A41B` / `$A57B` (palba, pád, plošinka, oblaka)

**Zapojeno 2026-08-28.** Tabulka `$A607`, `tickChannel` 50 Hz, PCM burst do `world.buzz`. A41B interrupt, A41C až A41D=0, ambient `$A5CA`. Není `$D7C0`.

## `$D7C0` v enginu

Originál je blokující busy-wait bez `DI`. Engine **nesmí** blokovat 50 Hz tick (zadání). Syntéza stejné smyčky (`OUT` XOR `$10`, periody 112+45D / 134+45D T) do AudioBuffer; přehrát přes Web Audio, mimo rAF. Fronta požadavků na `World` (testovatelná bez `AudioContext`).

Index `$17` (L=0 hang) **nikdy** nehrát. A=`$05`/`$06`/`$16` bez CALL — nehrát, dokud se neobjeví volající.

## Co napojit (playable in-game)

| engine událost | A | ROM |
|---|---|---|
| krok chůze, `walkTick` wrap `ANIM_PERIOD`, jen `$DD22=0` | `$14`/`$15` střídavě (`$C6FF` XOR) | `$C6FA` |
| `applyDeath` vždy | `$13` | `$C3EC` |
| `applyDeath` když `(deathA ∧ 7)==2` (energie `$02`) | navíc `$0F` | `$C3AA` |
| kill střelou `hitByBullet` | `$12` | `$A2FA` |
| sběr `$94E8` do inventáře | `$0C` | `$D1CC` |
| extra `$CC9A` (ne Cheops `$19`) | A z páru `$CCBC` (`$01`/`$02`/`$03`/`$00`) | `$CCAA` |
| Cheops overlay | `$0B` | `$CD17` |
| Cheops `$D5FD` výsledek | `$0F` | `$D75B` / `$D783` |
| Cheops výběr 1–5 | `$10` jednou (ROM ×`$23`) | `$CDDC` |
| dveře: start overlay | `$08` | `$CC24` |
| dveře: vstup do `result`, OK | `$0A` pak `$0F` | `$CC35` + `$D75B` |
| dveře: vstup do `result`, fail | `$0F` | `$D783` |
| teleport: start overlay | `$07` | `$CF88` |
| teleport: každý přijatý znak | `$11` | `$CFAE` |
| teleport: `result` OK | `$10` pak `$09` | `$CFF0` + `$CFF7` |
| teleport: `result` fail | `$0F` | `$D029` |
| socket `$0B` + nástroj `$10` (úspěšný clear) | `$08` | `$CEA7` |
| doručení jednoho dílu v `$A6C1` | `$03` jednou za díl | `$A715` (ROM ×`$19` = delay) |
| ceremony start | `$14` nebo `$15` podle `dac0∧1` | `$A76E` (ROM ×`$C8` = delay) |
| vítězství (`corePairs` dosáhne 5) | `$11` jednou | `$A7BF` (ROM vnořené ×80 = fanfára/delay) |

**ROM smyčky `B=n CALL $D7C0` jako delay u textu:** jeden `requestSfx` na začátku odpovídající fáze enginu, ne n-krát v jednom ticku (překryv bufferů by neseděl s busy-wait).

## Co nespouštět (není v enginu / zakázané)

- menu select `$605A` `$0C` je v `feedMenuKey`; define keys `$6295` / hi-score `$68F8` skip
- házení cifer `$D679` / shoda `$D70E` — overlay dveří/Cheops: 1 SFX / tick roll (`$0C`…`$0F`) a match (`$03`)
- stroj `$0E` (`$D0E0`), místnost ±1 `$0F` (`$D133`)
- `$D1CA` prázdný Up (`$D1B3`) hraje `$0C` stejně jako sběr. Skip `$D2BE≥4`+$D2DB≠0 engine ne.

## Web Audio + MP3

- Efekty: obdélník z simulace `$D7C0` (ne vzorky, ne OscillatorNode s jedním Hz — D není konstantní).
- BGM: **`viewer/intro.mp3`** na title/menu/intro (`$5E81` / `$666D`); **`viewer/bgm.mp3`** ve hře (smyčka). Vlastní Gain, mute BGM ≠ mute SFX. Chybějící soubor = ticho, žádný throw. `music/` (intro + loop) necommituj, dokud nerozhodneme duplicitu.
- Master mute vypne obojí. Persist `localStorage` klíče `starquake.audio.muted`, `starquake.audio.bgmMuted`, `starquake.audio.sfxGain`, `starquake.audio.bgmGain`.
- Unlock `AudioContext` na prvním keydown/pointerdown; při `suspended` nic neshodit.
- Ovládání viditelné i při `?dev=0` (malý audio strip u canvasu).
- `dump.js` / Node testy **bez** `AudioContext`. Server MIME `.mp3`. Výběr stopy: `musicUrlFor` v `audio/tracks.ts`.

## Testy

Automat: událost → `world.sfx` (pole indexů A) obsahuje očekávané A. Bez Web Audio.

Pokrýt aspoň: krok, smrt energie (`$13`+`$0F`), smrt terén `$10` jen `$13`, kill `$12`, sběr `$0C`, extra energie `$01`, dveře OK/fail, teleport znak + OK/fail, socket `$08`.

## Dokumenty po implementaci

Do `spec/MOVEMENT.md` sekce zvuk: tabulka A, 5 bajtů, vzorec periody, call map, **nedořešené:** `$A41B`, `$6600`, digit-roll SFX, jitter IM1.
}