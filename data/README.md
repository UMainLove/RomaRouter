# Dati elaborati

Dati già importati e puliti, così chi fa `git pull` non deve rilanciare gli import (richiedono diversi minuti e qualche migliaio di richieste ai server del Comune e di OpenStreetMap). Aggiornati al 13/11/2026.

| Cartella | Contenuto |
| --- | --- |
| `seed/rr_antenne.dump` | Copia completa del database antenne: schemi `antenne` e `opendata` (formato `pg_dump -Fc`), comprese le 74.735 celle radio e i 3.131 siti in funzione |
| `seed/rr_artisti_strada.dump` | Copia completa del database dell'arte di strada: schema `artisti` (zone, postazioni, divieti con gli atti 2026, esibizioni dimostrative) |
| `geojson/` | I layer della sezione antenne in GeoJSON (WGS84, lon/lat, RFC 7946), pronti per qualunque mappa |
| `raw/` | Copie dei file scaricati dalle fonti. **Fuori da git**: si rigenerano con `npm run antenne:import` |

## Caricare le copie: da solo

Non serve fare niente: `npm run dev` e `npm start` lanciano prima `scripts/db/allinea.mts`, che

1. applica a ogni database le migrazioni che mancano;
2. se `rr_antenne.dump` o `rr_artisti_strada.dump` sono cambiati (per esempio dopo un `git pull`), li carica al posto degli schemi vecchi, in una transazione sola: se qualcosa va storto il database resta com'era. Poi riapplica le migrazioni più nuove della copia, se ce ne sono;
3. si ricorda quale copia ha caricato (tabella `public.rr_copie`), quindi agli avvii successivi impiega mezzo secondo.

Prerequisito: i database creati da `db/init.sql` (vedi `docs/SETUP.md`). Se il database è spento o manca `.env.local`, scrive una riga e il sito parte lo stesso. Attenzione: caricare una copia nuova sostituisce i dati locali di quella sezione (per esempio le prenotazioni di prova). Per saltarlo: `$env:RR_NO_ALLINEA=1`. A mano: `npm run db:allinea`.

Chi modifica i dati li rimette nel repository con `npm run artisti:esporta` o `npm run antenne:esporta` (con il sito avviato): la copia contiene anche l'elenco delle migrazioni applicate. La copia dell'arte di strada comprende i dati OpenStreetMap delle regole generali (suolo, superstrade, beni culturali, edifici e vie della città storica, © OpenStreetMap contributors, ODbL), che si rifanno con `node --env-file=.env.local scripts/artisti/vincoli_osm.mts --scarica`.

**Senza database anche la mappa dell'arte di strada funziona**: legge `public/dati/artisti/` (copertura di tutta Roma, zone, postazioni, piazze, esibizioni), aggiornate da `npm run artisti:esporta` con il sito avviato.

**Senza database la mappa delle antenne funziona lo stesso**: se le API non rispondono legge le copie in `public/dati/antenne/` (richieste, antenne in funzione, impianti OpenStreetMap), aggiornate da `npm run antenne:esporta`.

## GeoJSON per la mappa

| File | Elementi | Cosa sono |
| --- | --- | --- |
| `geojson/antenne_istanze_srb.geojson` | 192 | Istanze di installazione o modifica delle Stazioni Radio Base pubblicate da Roma Capitale, con operatori, indirizzo, Municipio, quartiere, qualità della posizione e sito sensibile più vicino |
| `geojson/antenne_siti_sensibili.geojson` | 2.519 | Scuole, asili nido, ospedali, RSA, carceri, parchi giochi (art. 4 DAC 78/2024). `ufficiale: false` indica che il dato viene da OpenStreetMap |
| `geojson/antenne_aree_vincolate.geojson` | 37 | Sito UNESCO e aree naturali protette (poligoni semplificati) |
| `geojson/antenne_monitoraggio.geojson` | 2 | Centraline ARPA Lazio di monitoraggio dei campi elettromagnetici |
| `geojson/antenne_in_funzione.geojson` | 3.131 | Antenne in funzione ricostruite dalle celle radio misurate dai telefoni (OpenCelliD maggio 2024, **CC BY-SA 4.0**: citare «© OpenCelliD»). Proprietà corte: `o` operatori, `t` tecnologie, `n` celle, `p` precisione in metri, `a` ultima misura. Posizioni stimate |
| `geojson/antenne_impianti_osm.geojson` | 317 | Tralicci, pali e antenne per telecomunicazioni censiti su OpenStreetMap (ODbL) |

Per caricarli si può usare per esempio `fetch("/data/...")` dopo averli copiati in `public/`, oppure le API live `/api/antenne/*` (vedi `docs/ANTENNE.md`), che restituiscono gli stessi dati sempre aggiornati.

## Avvertenze da mostrare con i dati

- Le istanze **non provano** che un impianto sia attivo e non sono il catasto completo. ARPA Lazio conta circa 3.538 impianti nel Comune di Roma, ma il catasto non è pubblico.
- Le distanze dai siti sensibili sono solo informative: il regolamento di Roma non fissa distanze minime.
- **Attribuzioni obbligatorie**: «Roma Capitale – GeoRoma», «ARPA Lazio», «© OpenStreetMap contributors (ODbL)» per i dati non ufficiali e per il geocoding.
- I dati di Roma Capitale non dichiarano una licenza. Le linee guida AgID indicano CC BY 4.0 come riferimento per i dati della PA.
