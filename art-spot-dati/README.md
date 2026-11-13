# Art Spot – regole e luoghi per gli artisti di strada a Roma

Dataset di studio del 13 novembre 2026: dove ci si può esibire a Roma, quali divieti risultano dagli atti, e quali luoghi di contesto (piazze, scuole, parchi, locali) stanno intorno. I file stanno tutti in questa cartella. Non sono collegati al database `rr_artisti_strada` dell'applicazione.

La licenza MIT del repository copre il software. Questi dati restano dei rispettivi titolari, con le condizioni indicate più sotto.

## Cartelle

| Cartella | Contenuto |
| --- | --- |
| `geo/` | 19 layer, ciascuno in `.geojson` (EPSG:4326) e in `.csv`, più `geo/_tutti_i_layer.geojson` (7.655 elementi, l'unione dei layer) e `geo/LEGGIMI.md` |
| `fonti/` | Copie degli atti e delle pagine usate come fonte, con `fonti/INDEX.csv` e le note di licenza urbe-hub |
| `tabelle/` | Tabelle di riepilogo: postazioni, divieti, contatti dei Municipi, regole generali, confronto con altre città |

## Layer

Ogni `.geojson` è una FeatureCollection RFC 7946 (lon/lat, senza membro `crs`). Il `.csv` omonimo ha le stesse righe, con `lat`, `lon`, `geometry_type` e `wkt` (WKT per linee e poligoni).

| File | Elementi | Cosa è |
| --- | ---: | --- |
| `postazioni_allegatoB` | 28 | Postazioni dell'Allegato B al regolamento DAC 24/2012. La posizione è stimata dalle planimetrie |
| `divieti` | 24 | Luoghi non idonei e divieti (soprattutto Municipio I) |
| `aree_consentite_munX` | 12 | Aree consentite del Municipio X (Ostia, Acilia, Infernetto e altre) |
| `esoterici` | 8 | Aree per cartomanti e attività esoteriche (art. 13 DAC 24/2012). Geometria approssimata |
| `arti_figurative_aree_2018` | 63 | Aree arti figurative dell'elenco 2018. L'elenco ne ha 65: mancano 3.f Espero e 4.g Via Tiburtina Shopping Center, non geocodificate. L'elenco 2026 (254 postazioni) non è stato scaricato |
| `polizia_locale` | 18 | Sedi dei Gruppi di Polizia Locale, per il preavviso dell'art. 10 |
| `uffici` | 1 | Dipartimento Attività Culturali, ufficio arti figurative e di strada |
| `venue_eventi` | 25 | Arene estive, mercatini e feste. Date da stampa e siti turistici |
| `zone_contesto` | 2 | ZTL diurna Centro Storico e Trastevere (OpenStreetMap, non normativo) |
| `stazioni` | 207 | Stazioni e fermate |
| `piazze_pedonali` | 1.556 | Piazze e aree pedonali |
| `attrazioni` | 893 | Attrazioni |
| `mercati` | 125 | Mercati |
| `parchi` | 522 | Parchi |
| `nightlife` | 750 | Bar, pub e discoteche. Copertura OpenStreetMap incompleta |
| `venue_cultura` | 274 | Luoghi di cultura |
| `ospedali` | 93 | Ospedali |
| `luoghi_culto` | 378 | Luoghi di culto del solo centro storico (bbox 41.86–41.93 / 12.44–12.52) |
| `scuole` | 2.676 | Scuole e servizi educativi |

I layer da `stazioni` a `luoghi_culto`, più le ZTL, sono contesto: non sono regole.

## Schema dei campi

Campi presenti su ogni elemento:

| Campo | Significato |
| --- | --- |
| `municipio` | Municipio I–XV. Confini della delibera 150/2026 (urbe-hub), assegnato con punto nel poligono |
| `name` | Nome del luogo o della postazione |
| `type` | Tipo (`postazione_allegatoB`, `divieto_suono`, `area_consentita`, …) |
| `rules` | Regola applicabile, in testo |
| `time_slots` | Fasce orarie o validità |
| `source` | Atto, pagina o base dati da cui viene la voce |
| `source_url` | URL della fonte, quando c'è |
| `verification_status` | Quanto la voce è ancorata a un atto scaricato. Vedi sotto |
| `coord_note` | Come è stata ottenuta la coordinata. Dice sempre se la posizione è stimata |

Ci sono anche `id` e `layer`. Campi in più, solo su alcuni layer: Allegato B `scheda`, `radius_m`, `area`; divieti `act`, `valid_to`; arti figurative `localizzazioni`, `codice_area`, `municipio_elenco_2018`; OpenStreetMap `osm_id`, `wikidata`; Polizia Locale `indirizzo`, `pec`.

Valori usati in `verification_status`:

- `ufficiale` (anche con una precisazione tra parentesi): la regola viene da un atto o da una pagina istituzionale scaricati.
- `dato OSM (non normativo)`: contesto da OpenStreetMap.
- `dato aperto (non normativo)`: scuole, da dato aperto.
- `da stampa/turismo (date)`: il luogo dell'evento è geocodificato, le date vengono da stampa o siti turistici.
- `da verificare`: la voce non risulta da un atto scaricato. Nei divieti sono 12 righe, e vengono solo da stampa o da siti di artisti (Il Messaggero, la Repubblica, RomaToday, Il Tempo, Buskers in Rome). Tre di queste, con `da verificare – NON in vigore`, sono richieste di divieto riportate dai giornali. Nelle 18 sedi di Polizia Locale la dicitura è `PEC da verificare su IPA (elenco 2018)`: lì va ricontrollato l'indirizzo PEC, preso da un elenco del luglio 2018, non la regola di esibizione.

## Tabelle di riepilogo

| File | Righe | Contenuto |
| --- | ---: | --- |
| `tabelle/spots.csv` | 111 | Postazioni Allegato B (28), aree arti figurative 2018 (63), aree consentite del Municipio X (12), aree esoterici (8) |
| `tabelle/bans.csv` | 24 | Gli stessi divieti del layer `divieti`, con `act` e `valid_to` |
| `tabelle/contacts_municipi.csv` | 19 | PEC del Municipio e Gruppo di Polizia Locale (15 Municipi, alcune sedi in più, più una riga valida per tutti) |
| `tabelle/regole_generali.csv` | 17 | Articoli del DAC 24/2012 e note su acustica, SIAE, offerte e assicurazione |
| `tabelle/benchmark_citta.csv` | 6 | Confronto con Milano, Firenze, Bologna, Barcellona, Westminster e Camden |

## Fonti

`fonti/INDEX.csv` elenca ogni fonte con titolo, data, ente, URL originale e, quando esiste, URL su archive.org. In cartella ci sono i regolamenti DAC 24/2012 (con Allegato B) e DAC 304/2025, le delibere del Municipio I 32/2018 e 59/2024, gli atti sulle arti figurative scaricabili in questa raccolta, il modulo di iscrizione al Registro, la KML «Buskers in Rome» del 2021, due pagine HTML del sito di Roma Capitale, il regolamento di Firenze usato come confronto e `fonti/urbehub_THIRD_PARTY.md`.

Due PDF sono nell'indice e non sono in cartella, per le dimensioni:

- `Arti_figurative_QD21155_2024_All2_elenco_aree_localizzazioni.pdf` — Allegato 2, elenco di 65 aree e 204 localizzazioni (2024). URL: https://www.comune.roma.it/web-resources/cms/documents/Rep._QD_21155_2024_Allegato_2___elenco_aree_e_localizzazioni_1.pdf
- `Arti_figurative_Avviso_2018.pdf` — Avviso pubblico arti figurative 2018 (D.D. QD 1702 del 27/07/2018). URL: https://www.comune.roma.it/web-resources/cms/documents/AVVISO_artifigurativeperpubblicazione.pdf e copia su archive.org https://web.archive.org/web/20231223060501/https://www.comune.roma.it/web-resources/cms/documents/AVVISO_artifigurativeperpubblicazione.pdf

Le righe `urbehub_*` e `OSM_*` dell'indice indicano le estrazioni usate per costruire i layer. I file grezzi di quelle estrazioni non sono in questa cartella.

## Licenze

- **OpenStreetMap.** I layer di contesto ricavati da OSM (stazioni, piazze, attrazioni, mercati, parchi, nightlife, luoghi di cultura, ospedali, luoghi di culto, ZTL) e le geometrie di vie e piazze usate per posizionare alcuni divieti sono © OpenStreetMap contributors, [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Un prodotto derivato si ridistribuisce con la stessa licenza e con la stessa attribuzione.
- **urbe-hub.** Le condizioni dei materiali di [urbe-hub/quartieri-roma-2026](https://github.com/urbe-hub/quartieri-roma-2026) sono copiate in `fonti/urbehub_THIRD_PARTY.md`. I confini dei Municipi (delibera 150/2026) usati per il campo `municipio` vengono da OpenStreetMap (ODbL). Le scuole uniscono GeoRoma e l'anagrafe del Ministero dell'Istruzione e del Merito: per la parte ministeriale vale la Italian Open Data License 2.0 (IODL 2.0), con indicazione della fonte.
- **Roma Capitale.** Regolamenti, delibere, moduli e pagine del Comune sono dati pubblicati dall'amministrazione (art. 52, comma 2, del d.lgs. 82/2005 per gli open data del geoportale). La licenza CC BY 4.0 vale solo per gli strati che la dichiarano. Per gli altri il geoportale non indica una licenza: si cita la fonte. Le linee guida AgID indicano CC BY 4.0 come riferimento per i dati della pubblica amministrazione. I PDF in `fonti/` sono copie degli atti, per consultazione.

Attribuzione minima quando si mostra la mappa: «Roma Capitale», «© OpenStreetMap contributors (ODbL)», e per le scuole «Ministero dell'Istruzione e del Merito (IODL 2.0)» insieme a urbe-hub.

## Avvertenze

- Le coordinate delle postazioni dell'Allegato B sono stimate: centroide del luogo più uno scostamento letto a vista dalla planimetria. L'errore atteso è di 10–30 metri. `coord_note` lo ripete su ogni riga (`STIMATA`, precisione ±10–30 m) e `verification_status` è `ufficiale (posizione da planimetria)`.
- Le voci marcate `da verificare` nei divieti sono solo di stampa: l'atto non è stato trovato. Non vanno trattate come un divieto vigente. Le tre con `NON in vigore` sono richieste, non divieti.
- `luoghi_culto` copre solo il centro storico. `nightlife` è incompleto. Le aree arti figurative sono l'elenco 2018, non quello del 2026.
- Il dataset descrive le fonti raccolte al 13 novembre 2026. Non sostituisce il regolamento né un parere del Municipio o della Polizia Locale.
