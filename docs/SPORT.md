# Impianti sportivi: studio dei dati e progetto della pagina

Studio del 14/11/2026 per la sfida 04, «Impianti sportivi: sapere dove praticare sport — mappa filtrabile per
disciplina, Municipio e accessibilità». Oggi `/sport` mostra dati di esempio (`src/data/esempi`) e il database
`rr_impianti_sportivi` è vuoto. Valgono le stesse regole delle altre mappe (`docs/MAPPE.md`): una domanda per
mappa con risposta in 3 secondi, la forma dice il tipo e il colore dice lo stato, schede di una schermata,
dettagli nella Guida, mappa vettoriale «Roma», copie statiche se il database non c'è, ogni dato con la sua fonte.

## La domanda della pagina

**«Dove posso fare il mio sport vicino a me, e come ci entro?»** Come ci entro vuol dire: è libero e gratis,
è comunale a tariffa calmierata, oppure è un club privato? È accessibile? Quando è aperto?

## Fonti verificate

Numeri contati scaricando i dati, non stimati.

| Fonte | Cosa dà | Quanti a Roma | Licenza | Uso |
| --- | --- | --- | --- | --- |
| **Roma Capitale, GeoServer** `DIPPC:243_ServiziSportivi` (WFS, EPSG:4326 su richiesta) | impianti con nome, indirizzo, Municipio, tipo (aperto, coperto, piscina, equestre), competenza (dipartimentale o municipale), concessionario, telefono, email, codice SIS | **270** | non dichiarata (come gli altri dati del Comune già usati: si cita la fonte) | base ufficiale con coordinate |
| GeoServer `DIPAU:punti_servizi_7792` (famiglia Sport) | nome e posizione | **310** centri sportivi municipali, **89** impianti capitolini, **16** piscine comunali | non dichiarata | coordinate per i centri municipali |
| GeoServer `DIPAMB:aree_fitness` | aree fitness e sport libere, con l'elenco delle attrezzature («campo basket, skatepark, attrezzi») | **94** | non dichiarata | sport gratis all'aperto |
| GeoServer `DIPAU` Playground | campetti e aree gioco | **294** | non dichiarata | sport gratis |
| GeoServer `GABSIN:piscine` | piscine dell'estate over 70: giorni, orari, contatti | **17** | non dichiarata | unica fonte con orari strutturati |
| **Classificazione degli impianti capitolini** (D.D. QA/682 del 18/11/2025, PDF) | elenco attuale degli impianti del Comune in classi A, B, C con codice SIS | **165** | atto pubblico | elenco ufficiale aggiornato, si unisce al GeoServer col codice SIS |
| **Centri Sportivi Municipali** (15 PDF, uno per Municipio) | associazione che gestisce, **discipline**, **giorni e orari** dei corsi, contatti | ~360 palestre scolastiche | atto pubblico | corsi per ragazzi e adulti con orari; PDF diversi tra loro, alcuni del 2022 |
| **Tariffe 2026/27** (D.D. QA/530 del 28/08/2026; D.D. 234/2026 per i centri municipali) | prezzi massimi: affitto campo (es. calcetto 71–79 €/h), corsi | tutta Roma | atto pubblico | «al massimo X €» negli impianti comunali |
| **OpenStreetMap** (ODbL) | campi con disciplina, fondo e illuminazione, centri sportivi, palestre, piste, aree fitness | **4.295 campi** (tennis 1.352, calcio 1.287, padel 385, basket 365, calcetto 233, pallavolo 130…), **421 centri**, 130 palestre, 83 piste, 63 aree fitness | ODbL, si cita | le discipline campo per campo e i club privati |
| Wikidata (CC0) | stadi e grandi impianti con foto e voci Wikipedia | 47 | CC0 | arricchire gli impianti famosi |
| ACoS, rapporto dicembre 2025 | controllo a campione di 34 impianti comunali: 68% senza barriere, 15% trovati chiusi, tariffe esposte nel 24% | aggregato | pubblico | pannello «come stanno gli impianti comunali» |
| ISTAT, pratica sportiva 2024 | quante persone fanno sport, per regione | Lazio | CC BY 4.0 | contesto |

**Non riusabili** (solo per controlli a mano o collegamenti):
- il censimento nazionale di Sport e Salute («Dove fare sport», circa 2.258 impianti a Roma): niente licenza, API interna;
- il registro RASD delle associazioni;
- le federazioni: FIN, FITP, FIGC, FIDAL;
- Google Places e Playtomic: le condizioni vietano di copiare i dati.

**Non esistono**:
- sul portale open data di Roma: impianti, piscine, palestre, accessibilità;
- un elenco ufficiale dell'accessibilità impianto per impianto;
- per la Regione Lazio: il dataset «Monitoraggio impianti sportivi» (2015) dà errore, mentre i livelli del geoportale regionale sono solo i finanziamenti ricevuti.

## Quanto si copre

Unione delle fonti, con la verifica fatta oggi:

- **82%** dei 270 impianti ufficiali ha un elemento OpenStreetMap entro 100 m (94% entro 250 m). Quindi le
  discipline campo per campo arrivano da OSM anche per gli impianti comunali.
- **circa 290 dei 421** centri sportivi OSM non sono negli elenchi del Comune: sono i club privati (tennis,
  padel, piscine, palestre). OSM li aggiunge.
- Stima del risultato: **circa 2.500 luoghi** (impianti, centri municipali, campi liberi, aree fitness) con
  **oltre 4.000 campi**. È lo stesso ordine dei 2.258 impianti del censimento nazionale, che conta solo gli
  impianti e non i campetti liberi.

Lacune da dire con onestà (pannello «Cosa non sappiamo»):
- **accessibilità**: c'è solo per 73 luoghi su OSM e nel campione ACoS. Ogni luogo mostra «Accessibile: sì,
  no o non si sa» con la fonte, mai un sì inventato;
- **orari**: ci sono per i centri municipali (PDF), per 17 piscine e per 95 luoghi OSM;
- **prezzi**: per gli impianti comunali c'è il tetto massimo per legge, non il prezzo del singolo impianto;
- **palestre private**: OSM ne ha 130, ma a Roma sono molte di più.

## Come si mettono insieme

1. **Luogo e spazi**, come il censimento nazionale e lo schema della Puglia: un *luogo* (centro sportivo,
   piscina, parco con campetti) ha più *spazi* (campo da tennis in terra, piscina coperta 25 m). Ogni spazio
   ha disciplina, copertura, fondo e illuminazione. Così un domani un estratto ufficiale di Sport e Salute si
   carica senza cambiare nulla.
2. **Ufficiale prima**: si parte dai 270 del GeoServer, uniti alla classificazione 2025 col codice SIS. Poi si
   aggiungono i centri municipali (posizione da `punti_servizi`, discipline e orari dai PDF), le piscine e le
   aree fitness.
3. **OSM per gli spazi e per i privati**:
   - i campi dentro un centro sportivo OSM, o entro 60 m da un impianto ufficiale, diventano i suoi spazi;
   - i centri OSM senza corrispondente diventano luoghi privati (come la mappa delle antenne usava OSM accanto
     ai dati ufficiali);
   - i campi liberi nei parchi, senza accesso privato, diventano «campi liberi».
4. **Accesso**, in quattro classi che diventano il colore in mappa:
   - **libero** (gratis, all'aperto);
   - **comunale** (tariffa massima per legge);
   - **municipale** (corsi nelle scuole);
   - **club o privato**.
5. **Municipio** di ogni luogo dalla sua posizione; **provenienza per campo**, cioè ogni informazione dice da
   quale fonte arriva.

## Idee per la pagina

| Idea | Impatto | Chiarezza | Costo | Scelta |
| --- | --- | --- | --- | --- |
| **Scegli il tuo sport**: nove tasselli (Calcio, Tennis, Padel, Nuoto, Basket, Volley, Palestra, Corsa e atletica, Altro) col numero di posti. La città mostra solo i posti per quello sport. Il glifo dice lo sport, il colore dice come si entra (verde libero, blu comunale, viola municipale, grigio club) | alto | alta | medio | **sì** |
| **Gioca gratis**: un interruttore accende campetti, aree fitness e playground liberi. «Il campo da basket libero più vicino è a 350 m» | alto | alta | basso | **sì** |
| **Il più vicino**: scrivi l'indirizzo e partono gli anelli di 500 m, 1 e 2 km (come il radar delle antenne). In grande la distanza del posto più vicino per il tuo sport | alto | alta | basso (si riusa) | **sì** |
| **Corsi della settimana**: dai PDF dei centri municipali, «Martedì sera vicino a te: pallavolo alle 19 alla scuola X». Scegli giorno e fascia oraria | alto | alta | alto (15 PDF diversi da leggere) | **sì, seconda fase** |
| **Accessibilità onesta**: filtro «Accessibile» a tre stati (sì, no, non si sa) con la fonte. Il numero dei «non si sa» resta visibile | medio | alta | basso | **sì** |
| **Equità per Municipio**: nella Guida, campi e impianti per 10.000 abitanti, Municipio per Municipio, con la mappa colorata | medio | media | medio | sì, nella Guida |
| Prenotare un campo | alto | alta | non fattibile (nessun sistema aperto) | no: si collega al sito o al telefono del gestore |
| Valutazioni e recensioni | basso | media | alto | no |

**Scheda di un luogo** (una schermata):
- nome e glifo dello sport;
- in grande come si entra («Libero e gratis», «Comunale: calcetto al massimo 79 €/h»);
- tre fatti: i campi del tuo sport e quanti sono, coperto o illuminato, accessibile sì, no o non si sa;
- due azioni: «Portami lì» e «Chiama» o «Sito».

**Guida**: tariffe capitoline, come funzionano i centri municipali, accessibilità e cosa non sappiamo, fonti e
licenze, numeri per Municipio.

## Piano di lavoro

1. Migrazione `002`: luoghi, spazi, provenienza, accesso, orari, tariffe e Municipi.
2. Import (`scripts/sport/import.mts`):
   - livelli WFS del GeoServer;
   - PDF della classificazione e delle tariffe (con `pdftotext`);
   - OpenStreetMap con Overpass e copia in `data/raw`;
   - Wikidata;
   - unione e deduplica.
3. API leggere: luoghi in GeoJSON, scheda di un luogo, i più vicini. Poi le copie statiche in `public/dati/sport/`
   e la copia del database in `data/seed/` (si carica da sola all'avvio, come artisti e antenne).
4. Mappa `SportMappa`, con la stessa cornice di arte e antenne: tasselli, interruttore «Gratis», radar, schede, Guida.
5. Seconda fase: lettura dei 15 PDF dei centri municipali, per i «Corsi della settimana» con giorni e orari.
6. Prove, build, commit; push con l'ok.

## Da chiedere fuori (facoltativo, migliora i dati)

- A **Roma Capitale**: la licenza dei livelli del GeoServer (oggi non dichiarata) e i centri municipali in formato aperto.
- A **Sport e Salute** (censimentoimpianti@sportesalute.eu) o alla **Regione Lazio**, che è convenzionata:
  l'estratto del censimento nazionale per Roma, che ha anche l'accessibilità campo per campo.

## Fatto (14/11/2026)

- Import: `npm run sport:import`, script `scripts/sport/import.mts` (file scaricati in `data/raw/sport`, fuori da git). Esporta con
  `npm run sport:esporta`, con il sito avviato: copia del database in `data/seed/rr_impianti_sportivi.dump` (si carica da sola
  all'avvio del sito) e copie statiche in `public/dati/sport/`.
- Risultato: **2.296 luoghi e 4.248 campi e spazi**. Per accesso: 268 impianti comunali (165 classificati 2025, 33 senza
  posizione), 310 centri sportivi municipali, 242 luoghi liberi e gratis (94 aree sportive del Comune e i campetti nei parchi),
  1.476 club o privati. Per sport: calcio 842, tennis 536, basket 262, palestra 248, nuoto 133, volley 113, padel 110, corsa 58,
  altro 372. Accessibilità nota per 38 luoghi.
- Regole di unione: campi dentro l'area di un centro o entro 70 m da un impianto diventano suoi spazi. Campi sparsi entro 50 m
  diventano un luogo. Nei parchi o con accesso pubblico: libero. Nelle scuole: esclusi. Altrimenti: club o privato.
- Pagina `/sport` (`src/components/sport/SportMappa.tsx`):
  - tasselli degli sport con i numeri e «Gioca gratis»;
  - filtri per accesso, accessibilità a tre stati;
  - anelli di 500 m, 1 e 2 km dall'indirizzo;
  - scheda con la tariffa massima per gli impianti comunali;
  - Guida: come si entra con le tariffe, numeri per Municipio, cosa non sappiamo, fonti.
- API: `/api/sport/luoghi`, `/api/sport/tariffe`, `/api/sport/indirizzo`.
- Da fare: corsi e orari dei centri municipali dai 15 PDF; i 33 impianti classificati senza posizione; la pagina
  `/sport/[id]` usa ancora i dati di esempio del frontend.
