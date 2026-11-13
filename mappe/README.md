# Le quattro mappe di RomaRouter

Ogni sezione del sito ha la **sua** mappa. Tutte partono dalla stessa base, la mappa «Quartieri di Roma 2026», con quartieri, municipi, ricerca delle vie dello stradario e viste 2D e 3D. Ognuna però si personalizza a parte, così i dati e il comportamento di una sezione non finiscono mai nelle altre.

| Sezione | Personalizzazioni | Pubblicata in | Si apre da |
| --- | --- | --- | --- |
| Antenne di telefonia mobile | `mappe/antenne/` | `public/mappe/antenne/` | `/antenne` |
| Arte di strada | `mappe/artisti-di-strada/` | `public/mappe/artisti-di-strada/` | `/arte` |
| Impianti sportivi | `mappe/impianti-sportivi/` | `public/mappe/impianti-sportivi/` | `/sport` |
| Oggetti smarriti | `mappe/oggetti-smarriti/` | `public/mappe/oggetti-smarriti/` | `/oggetti` |

## Struttura

- `mappe/base/` è la copia **non modificata** della mappa originale (vedi `base/FONTE.md`). Non modificatela: per aggiornarla basta ricopiarla dall'originale.
- `mappe/comune.mts` contiene le modifiche valide per tutte le sezioni:
  - toglie nome e logo di Urbe Hub, che non sono coperti dalla licenza MIT;
  - spegne le statistiche;
  - condivide stradario e vista 3D tra le mappe;
  - aggiunge l'aggancio della 3D;
  - aggiunge la modalità «incorporata».
- `mappe/<sezione>/sezione.mts` è la configurazione della sezione: titolo, testi, modifiche al template e file CSS e JS da iniettare.
- `mappe/<sezione>/file/` (facoltativa): i file da sostituire o aggiungere nella base, per esempio icone o dati.

Le modifiche al template sono **sostituzioni di testo verificate**: se una non trova il testo atteso esattamente quante volte deve, la build si ferma con un errore. Così, se la mappa originale cambia, ce ne accorgiamo subito invece di pubblicare una mappa rotta.

## Costruire le mappe

Serve Python 3.9 o successivo; la build della mappa usa solo la libreria standard.

```bash
npm run mappe:build -- antenne
```

```bash
npm run mappe:build -- tutte
```

La build scrive in `public/mappe/<sezione>/`. Stradario e vista 3D, uguali per tutte, finiscono una volta sola in `public/mappe/_comune/`. Il risultato è nel repository, quindi chi non ha Python vede comunque le mappe.

## Incorporare una mappa in una pagina

```tsx
<iframe src="/mappe/antenne/index.html?incorporata=1" title="Mappa delle antenne" allow="geolocation" />
```

- Usate sempre `index.html` nell'indirizzo: Next.js non serve l'indice di una cartella di `public/`.
- `?incorporata=1` nasconde la testata e la striscia dei numeri della mappa, perché la pagina ha già i suoi.
- I dati arrivano dalle API della sezione sullo stesso dominio (es. `/api/antenne/*`), mai da un'altra sezione.

## Licenze

La mappa di base è MIT (`base/LICENSE`): il file di licenza va tenuto. I dati della base hanno licenze proprie (`base/THIRD_PARTY.md`), e le attribuzioni restano visibili sulla mappa: Roma Capitale e © OpenStreetMap contributors (ODbL).
