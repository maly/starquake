# Prohlížeč mapy / BLOB

Zdroj je TypeScript v `game/src`. Sestavení:

```powershell
npm --prefix game install
npm test
```

(`npm test` v kořeni spustí `tsc`, unit testy a esbuild do `viewer/bundle.js` a `viewer/dump.js`.)

## Spuštění

Z kořene repozitáře (tam, kde je `out/`):

```powershell
npm start
```

Pak http://127.0.0.1:8000/viewer/ — server je `game/src/server.ts` (port `8000`, nebo `--port` / `PORT`). Obsluhuje `/viewer/` a `/out/`.

`index.html` tahá `out/rooms.json` (a další JSON) vedle stránky. Lokální server mapuje `/viewer/out/` na `out/`. Obrázky místností nepoužívá. Otevření souboru přes `file://` fetch zablokuje.

Nejdřív musí existovat export:

```powershell
python -m starquake_extract extract --out out
```

Náhledy PNG jsou jen referenční pro testy, prohlížeč je nenačítá:

```powershell
python -m starquake_extract render --out out --all
```

## Ovládání

| vstup | význam |
|---|---|
| Q / A / O / P | nahoru / dolů / vlevo / vpravo; Q sběr / nástup na pad; A plošinka; O/P na teleportu spustí kód |
| mezerník | palba ($C85A / na padu $CA15) |
| pole + Jít | identifikátor 0–511 |
| `#N` v URL | totéž |
| Pevné buňky | magenta překryv podle `rooms.json` → `solid` |
| Cheat (panel) | slot 0–3 + sprite (`$0F`); god = bez `$CB58` / `$C350`. `?dev=0` skryje |

Hrací plocha je 256×144 (32×18 buněk). Rám ze Spectrum řádků 0–5 se nekreslí.

Předměty z `items.json` se XOR-ují do bitmapy a přepíší atribut (`OR $40`), stejně jako `$DB24` v `$AA30`. Místnost 199 (jádro) předměty z tabulky nedostane.

## Testy

```powershell
python -m pytest tests/test_viewer.py
```

`dump.js` vykreslí rastr v Node (stejný `render.js` jako stránka) a porovná ho s PNG. U místností s předměty smí být rozdíl jen v jejich 2×2 buňkách.
