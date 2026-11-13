# RomaRouter × Quartieri di Roma 2026 — note per il fork della mappa

La mappa comune (sfide 1, 2 e 4) è un fork di `urbe-hub/quartieri-roma-2026`, costruito come sito statico in `public/quartieri/` e incorporato in un iframe nella pagina `/mappa` dell'app (componente `src/components/mappa/MappaComune.tsx`). Finché quella cartella non c'è, `/mappa` mostra un'anteprima schematica con i dati di esempio. La cartella si chiama `quartieri` e non `mappa` per non confondersi con la rotta `/mappa`.

## 1. Build dentro l'app

```bash
# dalla cartella del fork, clonato accanto a RomaRouter
MAPPA_DIST=../RomaRouter/public/quartieri MAPPA_STATISTICHE_ID= python3 build.py
```

- `MAPPA_STATISTICHE_ID=` vuoto: niente Umami nel fork ("nessun dato personale esposto").
- I 15 minuti a piedi richiedono `data/rete/` (circa 20 MB, da rigenerare da OpenStreetMap). Senza, il build di anteprima prosegue e il pulsante non compare: per la demo va bene così.

## 2. Icone nuove

Copia i file di `docs/mappa/icone/` nella cartella `icone/` del fork e aggiungi in `build.py`, dentro `CATEGORIA_ICONA`:

```python
    "antenne": "antenna.svg",
    "misure_arpa": "misura-arpa.svg",
    "postazioni_arte": "arte-strada.svg",
    "ufficio_oggetti": "oggetti-rinvenuti.svg",
```

Lo sport usa la categoria esistente `impianti_sportivi` (397 punti, icona `sport.svg`).

## 3. Nuove categorie nei dati

In `data/servizi/servizi.json`, `c` è l'elenco delle categorie e ogni punto di `p` usa l'**indice** della sua categoria in `c`. Aggiungi le nuove categorie **in fondo** a `c` (così gli indici esistenti non cambiano) e i punti con lo stesso formato:

```json
[indice, "nome", "codice area", "municipio", lat, lon, "indirizzo", "nota"]
```

Esempio esistente: `[4, "Farmacia", "QU.I.01", "I", 41.87489, 12.48575, "Viale Marco Polo 35"]`.

## 4. Categorie e gruppo nel template

In `mappa-quartieri.template.html`, aggiungi un gruppo a `SERVIZI_GRUPPI` e le categorie a `SERVIZI_CATEGORIE`:

```js
{ chiave: "sfide", etichetta: "Sfide di Roma" },

{ chiave: "antenne",         gruppo: "sfide", genere: "f", etichetta: "Antenne",                   singolare: "Antenna" },
{ chiave: "misure_arpa",     gruppo: "sfide", genere: "f", etichetta: "Misure ARPA",               singolare: "Misura ARPA" },
{ chiave: "postazioni_arte", gruppo: "sfide", genere: "f", etichetta: "Postazioni arte di strada", singolare: "Postazione arte di strada" },
{ chiave: "ufficio_oggetti", gruppo: "sfide", genere: "m", etichetta: "Uffici oggetti rinvenuti",  singolare: "Ufficio oggetti rinvenuti" },
```

Il template scorre `SERVIZI_CATEGORIE` per legenda, conteggi e grappoli, e lo passa anche alla vista 3D: le nuove categorie dovrebbero comparire ovunque senza altro codice. Verificatelo al primo build.

## 5. Modalità incorporata (da aggiungere)

- `?intro=no` esiste già e salta l'animazione iniziale.
- Da aggiungere: `?incorporata=1` mette una classe sul `body` che nasconde testata e barra laterale del fork. Restano mappa, legenda, schede e 2D | 3D. Il pannello dell'agente di RomaRouter fa da barra laterale.

## 6. Protocollo app ↔ mappa (proposta)

L'hash lo usa già il fork per il suo stato (`#via=`, `#15=`, `#3d/…`), quindi:

- **Stato iniziale, nella query:**
  `/quartieri/index.html?intro=no&incorporata=1&livelli=sport&filtro=basket&centro=41.8765,12.4755&raggio=1500`
- **Aggiornamenti dall'app** (senza ricaricare l'iframe):
  `iframe.contentWindow.postMessage({ tipo: "rr:mostra", livelli: ["sport"], filtro: "basket", centro: [41.8765, 12.4755], raggio: 1500 }, origineMappa)`
- **Clic dalla mappa all'app** (pulsanti nella scheda del servizio):
  `window.parent.postMessage({ tipo: "rr:apri", ambito: "arte", id: "T-03" }, origineApp)`

In Next.js ascolta con `window.addEventListener("message", …)` e controlla sempre `event.origin`.

## 7. Verifica entro 300 m (antenne)

Cerchio di 300 m dal punto scelto e conteggio dei servizi già presenti nei dati: `nido`, `infanzia`, `primaria`, `media`, `superiore`, `parchi_e_aree_gioco`, `sanita`, `pronto_soccorso*`. Mostrala come verifica **informativa**: non sostituisce l'istruttoria del Comune.

## 8. Licenze e marchio

- Il codice è MIT: tieni `LICENSE` e cita il progetto d'origine.
- Nome e logo di Urbe Hub (`brand/`, anche dentro `og.png`) **non** sono coperti dalla MIT: toglili dal fork.
- I dati hanno licenze proprie (GeoRoma, ODbL, IODL 2.0): tieni `THIRD_PARTY.md` e la dicitura "© OpenStreetMap contributors".
- Le tile pubbliche di OpenStreetMap vanno bene per la demo; con traffico vero serve un fornitore di tile.
