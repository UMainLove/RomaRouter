# Layer antenne di telefonia mobile

Dati, API e pagina per la sfida 02 dell'Agentic Hack Rome, «Antenne di telefonia mobile: impianti, misure e contesto». Le spiegazioni sulle fonti e sulle norme sono nel report di ricerca in `reports/`.

## La pagina `/antenne`

| Sezione | Cosa mostra |
| --- | --- |
| Cifre | Impianti nel Comune secondo ARPA, istanze in mappa, siti sensibili, valore di attenzione |
| **Mappa** (mappa del team, basata su quartieri-roma-2026, in iframe) | Istanze SRB, siti sensibili, aree vincolate, centraline ARPA; ricerca vie con «antenne lungo la via»; schede delle antenne; vista 3D |
| Misure | Scala dei limiti (6 / 15 / 20 V/m), pareri ed esposti ARPA anno per anno, centraline, come chiedere una misura |
| Regole | Iter di un'antenna a Roma e norme comunali, regionali e nazionali |
| Elenco | Le stesse istanze in tabella, filtrabile: funziona anche senza JavaScript. Il pulsante «Mappa» apre l'antenna sulla mappa |
| Fonti | Registro delle fonti e lacune dei dati pubblici |

La mappa è costruita in `mappe/antenne/` (personalizzazioni di `mappe/base/`) con `npm run mappe:build -- antenne` e pubblicata in `public/mappe/antenne/`. La pagina la incorpora con `MappaSezione`. Legge le API qui sotto usando gli id delle feature e i campi `gestori`, `indirizzo`, `tipo_intervento`, `regime`, `data_pubblicazione`, `protocollo`, `quartiere`, `municipio_nome`, `qualita_posizione`, `sito_sensibile_vicino` e `url_avviso`. **Se cambiate nomi o forma di questi campi, aggiornate `mappe/antenne/antenne.js` e rilanciate la build.**

La prima versione della mappa (`src/components/antenne/MappaAntenne.tsx`, MapLibre GL, con il worker servito da `/api/antenne/maplibre-worker`) resta nel repo come riserva, ma nessuna pagina la usa.

## In breve

- **Tutto in EPSG:4326 (WGS84, lon/lat)**, quindi si sovrappone a qualunque mappa web: Leaflet, MapLibre, OpenLayers.
- **Ogni dato dichiara la fonte e se è ufficiale.** Quello che arriva da OpenStreetMap è marcato `ufficiale: false`.
- **Per le antenne non esiste un catasto pubblico a Roma.** Il layer mostra le **istanze** di installazione e modifica pubblicate dal Comune: sono la parte visibile, non il totale. ARPA Lazio conta circa 3.538 impianti nel Comune di Roma.

## Aggiornare i dati

```bash
npm run db:migrate -- antenne
```

```bash
npm run antenne:import
```

Il secondo comando scarica tutto dalle fonti originali, salva una copia in `data/raw/antenne/` (fuori da git) e riempie lo schema `antenne`. Si possono lanciare anche singoli passi:

```bash
npm run antenne:import -- istanze arpa
```

I passi disponibili sono `normativa`, `territorio`, `sensibili`, `istanze` e `arpa`. Ogni passo si può rilanciare senza duplicare dati. I dati finiscono nel database della sezione, `rr_antenne` (variabile `DATABASE_URL_ANTENNE`).

**Geocoding.** Si usa prima lo **stradario ufficiale di Roma Capitale**: circa 559.000 numeri civici del layer GeoRoma `DIPCUL:GeoromaCiviciLocator`. OpenStreetMap Nominatim resta come riserva, con al massimo una richiesta ogni 1,5 secondi, e si disattiva da solo se risponde 429. La cache sta in `data/raw/antenne/geocode-cache.json`. Sulle istanze che hanno sia coordinate pubblicate sia indirizzo, lo scarto mediano tra i due è di circa 24 m.

**Dopo ogni import** rigenerate i dati versionati (dump e GeoJSON in `data/`), con `npm run dev` attivo:

```bash
npm run antenne:esporta
```

Test del parser di coordinate e indirizzi:

```bash
npm run antenne:test
```

## Tabelle (schema `antenne`)

| Tabella | Contenuto |
| --- | --- |
| `fonti` | Registro delle fonti: URL, ente, licenza, sha256 del file scaricato, numero di record |
| `istanze_srb` | Istanze di installazione o modifica delle Stazioni Radio Base, con operatori, indirizzo, tipo di intervento, data, protocollo e qualità della posizione |
| `siti_sensibili` | Ospedali, scuole, asili nido, scuole dell'infanzia, RSA, carceri, parchi giochi (art. 4 DAC 78/2024) |
| `aree_vincolate` | Sito UNESCO e aree naturali protette |
| `punti_monitoraggio`, `misure_cem` | Centraline ARPA Lazio e relativi report mensili |
| `statistiche` | Numeri ufficiali ARPA e ISPRA: impianti, siti, pareri, esposti |
| `limiti_normativi`, `riferimenti_normativi` | Limiti di legge (20 e 15 V/m) e norme, spiegati per i cittadini |
| `v_istanze` (vista) | Istanze con Municipio, quartiere e sito sensibile più vicino |
| `v_riepilogo_municipi` (vista) | Conteggi per Municipio |

I confini di Municipi, suddivisione toponomastica (rioni, quartieri, suburbi, zone) e zone urbanistiche sono nello schema `opendata`. Servono per assegnare Municipio e quartiere a ogni dato. **Non vanno disegnati per forza**: se la vostra mappa ha già i suoi confini, usate quelli.

### Qualità della posizione delle antenne (`qualita`)

| Valore | Significato |
| --- | --- |
| `originale` | Coordinate pubblicate dal Comune, valide così come sono |
| `corretta` | Coordinate pubblicate con un errore di formato (es. minuti oltre 60, simbolo ° usato come virgola), corrette in modo deterministico. La correzione è spiegata in `nota_qualita` |
| `geocodificata` | Posizione ricavata dall'indirizzo con OpenStreetMap |
| `assente` | Nessuna posizione affidabile: l'istanza non va in mappa |

## API (GeoJSON)

| Endpoint | Cosa restituisce | Filtri |
| --- | --- | --- |
| `GET /api/antenne/istanze` | Punti delle istanze SRB | `municipio=1..15`, `gestore=Iliad`, `qualita=originale,corretta`, `bbox=minLon,minLat,maxLon,maxLat` |
| `GET /api/antenne/siti-sensibili` | Punti dei siti sensibili | `categoria=scuola,asilo_nido`, `ufficiale=true`, `municipio`, `bbox` |
| `GET /api/antenne/aree-vincolate` | Poligoni del sito UNESCO e delle aree protette | nessuno |
| `GET /api/antenne/monitoraggio` | Centraline ARPA con i link ai report | nessuno |
| `GET /api/antenne/contesto?lat=&lon=&raggio=500` | Per un punto: Municipio, quartiere, antenne nel raggio, siti sensibili più vicini, vincoli, limiti di legge | `raggio` da 50 a 3000 m |
| `GET /api/antenne/info` | Limiti, norme, procedure, statistiche, fonti, riepilogo per Municipio | nessuno |
| `GET /api/antenne/indirizzo?q=via salaria 292` | Fino a 6 indirizzi dallo stradario ufficiale di Roma Capitale, con coordinate e Municipio | `q`, almeno 3 caratteri |

Ogni FeatureCollection ha un campo `metadata` con attribuzioni, avvertenze e legenda. **Mostrate le attribuzioni sulla mappa**, perché la licenza ODbL di OpenStreetMap le rende obbligatorie.

### Esempio: sovrapporre i layer con Leaflet

```js
const istanze = await fetch("/api/antenne/istanze").then((r) => r.json());
L.geoJSON(istanze, {
  pointToLayer: (f, latlng) =>
    L.circleMarker(latlng, {
      radius: 6,
      color: f.properties.qualita_posizione === "geocodificata" ? "#888" : "#d1006c",
    }),
  onEachFeature: (f, layer) =>
    layer.bindPopup(
      `<b>${f.properties.gestori.join(", ")}</b><br>${f.properties.indirizzo ?? ""}<br>${f.properties.tipo_intervento ?? ""}`,
    ),
}).addTo(map);

map.on("click", async (e) => {
  const ctx = await fetch(`/api/antenne/contesto?lat=${e.latlng.lat}&lon=${e.latlng.lng}`).then((r) => r.json());
  // ctx.municipio, ctx.quartiere, ctx.istanze_srb_nel_raggio, ctx.siti_sensibili_piu_vicini ...
});
```

### Esempio: MapLibre

```js
map.addSource("antenne", { type: "geojson", data: "/api/antenne/istanze" });
map.addLayer({
  id: "antenne",
  type: "circle",
  source: "antenne",
  paint: {
    "circle-radius": 6,
    "circle-color": ["match", ["get", "qualita_posizione"], "geocodificata", "#888888", "#d1006c"],
  },
});
```

## Le domande dei cittadini e dove sta la risposta

- **«Ci sono antenne vicino a casa mia?»** Clic sulla mappa o indirizzo geocodificato, poi `/api/antenne/contesto`.
- **«Qual è il limite di legge?»** e **«Come chiedo una misura?»** In `/api/antenne/info`, sezioni `limiti` e `riferimenti_normativi` (vedi `arpa_richiesta_misura` e `roma_procedura`).
- **Va sempre detto che un'istanza non prova che l'impianto sia attivo.** Le distanze dai siti sensibili sono solo informative: il regolamento di Roma non fissa distanze minime.

## Lacune note, da chiedere agli enti

1. **Allegato A della DAC 78/2024** (elenco georeferenziato ufficiale dei siti sensibili) in formato vettoriale: va chiesto al Dipartimento Urbanistica o al SUAP. Per ora lo ricostruiamo con i layer GeoRoma più OpenStreetMap.
2. **Catasto degli impianti attivi**: ARPA Lazio (NirWeb, da aprile 2026) e MIMIT non lo pubblicano. Andrebbe chiesta un'apertura dei dati, anche a precisione ridotta.
3. **Misure CEM puntuali**: ARPA non le pubblica, e i report della centralina di via Boncompagni sono solo grafici, fermi a giugno 2022.
4. **Elenchi SRB degli altri Municipi**: per ora abbiamo il Municipio X (PDF 2025) più la tabella 2025 del Dipartimento Urbanistica e gli avvisi pubblicati sul sito. Il PDF 2024 del Municipio X oggi risponde 404. Su 196 istanze, 192 hanno una posizione. Delle altre 4, tre hanno l'indirizzo scritto in modo diverso dallo stradario (es. «Bagigalupo» invece di «Bacigalupo», «Fontebuono») e una non ha né indirizzo né coordinate.
5. **Licenza dei dati comunali**: non è dichiarata né sugli avvisi né sui layer GeoRoma. Per le linee guida AgID il riferimento è CC BY 4.0, ma va confermata con il Comune.
