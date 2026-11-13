# La mappa di RomaRouter: Quartieri di Roma 2026 come base comune

Ogni vista di ambito (`/oggetti`, `/sport`, `/antenne`, `/arte`, `/altro`) ha la stessa base: la mappa
[Quartieri di Roma 2026](https://github.com/urbe-hub/quartieri-roma-2026) (quella di romaquartieri.it),
costruita come sito statico in `public/quartieri/` e incorporata in un iframe dal componente
`src/components/mappa/Mappa.tsx`. Ogni ambito ci mette sopra solo i suoi punti e i suoi filtri, che
decide l'app.

- **Desktop**: vista 3D (come romaquartieri.it/#3d). **Telefono e tablet**: vista 2D, più leggibile
  nella fascia di metà schermo. Il tasto 3D | 2D resta sempre nella mappa.
- Senza `public/quartieri/` l'app usa l'anteprima schematica (`MappaSchematica.tsx`), con le stesse props.

## 1. Costruire la mappa

Le modifiche di RomaRouter al progetto della mappa stanno in `docs/mappa/quartieri-romarouter.patch`
(un commit sopra `a875cc6` di urbe-hub/quartieri-roma-2026). Nel fork:

```bash
git clone https://github.com/urbe-hub/quartieri-roma-2026   # oppure il vostro fork
cd quartieri-roma-2026
git am ../RomaRouter/docs/mappa/quartieri-romarouter.patch
cd ../RomaRouter
scripts/mappa.sh ../quartieri-roma-2026
```

`scripts/mappa.sh` rifà `public/quartieri/` (circa 7 MB), senza statistiche, senza logo e anteprima
social di Urbe Hub (`MAPPA_MARCHIO=0`) e con le licenze accanto. Il build è già nel repository: va
rifatto solo se cambia il progetto della mappa o la patch.

## 2. Cosa cambia nel progetto della mappa

| File | Modifica |
|---|---|
| `romarouter/incorporata.css` | Con `?incorporata=1` resta la base (2D e 3D, zoom, attribuzioni) e il tasto 3D \| 2D; il resto dell'interfaccia si nasconde, compresi i servizi della mappa. Stili dei segni di RomaRouter. |
| `romarouter/incorporata.js` | Livello dei punti dell'app in 2D (Leaflet) e in 3D (MapLibre), protocollo con l'app, inquadratura. |
| `mappa-quartieri.template.html` | Due segnaposto: `/*<<ROMAROUTER_CSS>>*/` e `/*<<ROMAROUTER_JS>>*/`. |
| `build.py` | Inlina i due file; `MAPPA_MARCHIO=0` toglie logo e `og.png` di Urbe Hub. |

## 3. Protocollo app ↔ mappa

Solo stessa origine: entrambe le parti controllano `event.origin` ed `event.source`.

| Direzione | Messaggio |
|---|---|
| mappa → app | `{ tipo: "rr:pronta" }` quando la mappa ascolta |
| app → mappa | `{ tipo: "rr:mostra", stili, punti, extra, selezionato, centro, raggio }` |
| mappa → app | `{ tipo: "rr:apri", ambito, id }` al tocco su un punto |

- `stili`: per ambito `{ nome, forma, colore }`; i colori sono letti dai token di `globals.css`.
- `punti`: `{ id, ambito, nome, dettaglio, lat, lon, conteggio? }`; con `conteggio` il segno mostra un numero.
- `extra`: segni senza tocco (siti sensibili con `icona`, misure ARPA con `valore`).
- `centro` `[lat, lon]` e `raggio` in metri: cerchio e segnaposto.

Inquadratura: nella 2D punti e cerchio; nella 3D l'area del centro per raggi fino a 500 m (la verifica
delle antenne), altrimenti il municipio che contiene più punti.

## 4. Prossimi passi

- **Antenne**: i siti sensibili vengono dai dati di esempio. La mappa ha già scuole, nidi, parchi e
  aree gioco e sanità reali (`servizi/servizi.json`): si possono contare quelli entro 300 m.
- **Indirizzi**: la geocodifica è di esempio; lo stradario della mappa (`strade/`) permette quella vera.
- Le icone in `docs/mappa/icone/` servono solo se le sfide diventano categorie dei servizi della mappa.

## 5. Licenze e marchio

- Il codice della mappa è MIT: in `public/quartieri/` ci sono `LICENSE-quartieri-roma-2026.txt` e
  `THIRD_PARTY.md`, con le licenze dei dati (GeoRoma, ODbL, IODL 2.0, CC BY 4.0).
- Nome e logo di Urbe Hub non sono coperti dalla MIT: il build per RomaRouter li toglie.
- La dicitura "© OpenStreetMap contributors" resta sempre visibile. Le tile pubbliche di OpenStreetMap
  vanno bene per la demo; con traffico vero serve un fornitore di tile.
