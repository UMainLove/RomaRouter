# Infrastruttura dati di Roma Capitale e standard della PA italiana per dati e servizi al cittadino

Note di ricerca per il team "Agentic Hack Rome" (Urbe Hub). Stack del team: Next.js + PostgreSQL/PostGIS, servizi su mappa e chatbot. Stato verificato al 13/11/2026, salvo dove indicato. Le chiamate API al portale CKAN e al GeoServer di Roma sono state eseguite in questa sessione, quindi quei valori sono osservazioni dirette e non riprese da terzi.

## 1. Portale open data di Roma Capitale (dati.comune.roma.it): piattaforma, API, licenze, formati

### Takeaway
dati.comune.roma.it gira su CKAN 2.9.5 con le estensioni DCAT-AP_IT, spatial e datastore. Le API Action CKAN standard sono pubbliche sotto `/catalog/api/3/action/`. Il catalogo conta 365 dataset, quasi tutti con licenza CC-BY (340). I formati sono soprattutto CSV e JSON. Non c'è quasi nulla di geografico: i formati KML/GeoJSON sono rarissimi, quindi i geodati vanno presi dal GeoServer del Geoportale (sezione 2).

### Cited Findings
- **Piattaforma e versione.** `status_show` restituisce CKAN **2.9.5**, site_url `https://dati.comune.roma.it` e locale `it`. — [CKAN status_show](https://dati.comune.roma.it/catalog/api/3/action/status_show)
- **Estensioni attive (26).** datastore, datapusher, recline_view, harvest, ckan_harvester, **spatial_metadata, spatial_query**, **dcat**, dcat_rdf_harvester, dcat_json_harvester, dcat_json_interface, structured_data, multilang, **dcatapit_pkg, dcatapit_org, dcatapit_config, dcatapit_csw_harvester**, simplesso, roma_theme e altre. — [CKAN status_show](https://dati.comune.roma.it/catalog/api/3/action/status_show)
- **Base API.** `https://dati.comune.roma.it/catalog/api/3/action/`. Esempio verificato: `package_search?rows=2&facet.field=["license_id","res_format","organization","groups"]`. — [package_search](https://dati.comune.roma.it/catalog/api/3/action/package_search?rows=2&facet.field=[%22license_id%22,%22res_format%22,%22organization%22,%22groups%22]&facet.limit=30)
- **Numero di dataset.** 365 al 13/11/2026. — [package_search](https://dati.comune.roma.it/catalog/api/3/action/package_search?rows=2&facet.field=[%22license_id%22,%22res_format%22,%22organization%22,%22groups%22]&facet.limit=30)
- **Licenze (facet license_id).** `cc-by` 340, `cc-by-sa` 14, `other-nc` 11. — [package_search](https://dati.comune.roma.it/catalog/api/3/action/package_search?rows=2&facet.field=[%22license_id%22,%22res_format%22,%22organization%22,%22groups%22]&facet.limit=30)
- **Formati (facet res_format).** CSV 276, JSON 161, XML 88, XSD 59, ZIP 14, RDF 10, RDF_turtle 5, json_LD 5, ODS 4, GTFS 1, **KML 1**, pb 1. Non risultano GeoJSON né SHP come formato di risorsa. — [package_search](https://dati.comune.roma.it/catalog/api/3/action/package_search?rows=2&facet.field=[%22license_id%22,%22res_format%22,%22organization%22,%22groups%22]&facet.limit=30)
- **Organizzazioni (facet).** istituzione-sistema-biblioteche-centri-culturali 146; roma-capitale-area-tematica-servizi-alla-persona 118; …-cultura-e-valorizzazione 32; …-innovazione-nell-informazione 21; …-servizi-al-territorio 18; …-supporto-all-amministrazione 17; atac-s-p-a-azienda-per-la-mobilita 10; …-economia-e-finanza 2; roma-servizi-per-la-mobilita 1. — [package_search](https://dati.comune.roma.it/catalog/api/3/action/package_search?rows=2&facet.field=[%22license_id%22,%22res_format%22,%22organization%22,%22groups%22]&facet.limit=30)
- **Gruppi tematici.** cultura 137, anagrafe-e-servizi-civici 90, istruzione 71, commercio-e-impresa 34, ambiente 24, sicurezza-urbana 24, mobilita-e-trasporti 21, turismo 19, sociale 16, territorio 9, **sport 8**. — [package_search](https://dati.comune.roma.it/catalog/api/3/action/package_search?rows=2&facet.field=[%22license_id%22,%22res_format%22,%22organization%22,%22groups%22]&facet.limit=30)
- **Metadati DCAT-AP_IT nei dataset.** Campi presenti: `theme` (vocabolario EU, es. `http://publications.europa.eu/resource/authority/data-theme/TRAN`), `publisher_name`, `holder_name`, `frequency` (es. DAILY), `identifier` con prefisso IPA del Comune `c_h501:` (es. `c_h501:D.9000`, `c_h501:wifi2026`). Contatto: info.opendata@comune.roma.it. — [package_search](https://dati.comune.roma.it/catalog/api/3/action/package_search?rows=2&facet.field=[%22license_id%22,%22res_format%22,%22organization%22,%22groups%22]&facet.limit=30)
- **Pattern URL delle risorse.** `https://dati.comune.roma.it/catalog/dataset/<dataset-uuid>/resource/<resource-uuid>/download/<file>`. Esempio: `.../download/20260101.csv` del dataset WiFi 2026. — [package_search](https://dati.comune.roma.it/catalog/api/3/action/package_search?rows=2&facet.field=[%22license_id%22,%22res_format%22,%22organization%22,%22groups%22]&facet.limit=30)
- **Ambiguità di licenza (dato storico, 2023).** Su una mailing list OSM è stato segnalato che i singoli dataset non dichiaravano la licenza e che il link "Licenza" nel footer rimandava a CC-BY 4.0. Il poster chiedeva al Comune di chiarire se fosse CC-BY o CC-BY-SA. Oggi le licenze compaiono per dataset nel campo `license_id`. — [Talk-it-lazio, marzo 2023](https://lists.openstreetmap.org/pipermail/talk-it-lazio/2023-March/000990.html)

### Inferences
- **Ricerche utili via API.** Sono le query CKAN standard (sintassi Solr):
  - `package_search?q=sport`
  - `package_search?fq=groups:sport`
  - `package_search?fq=organization:roma-capitale-area-tematica-servizi-al-territorio`
  - `package_search?fq=res_format:CSV&rows=100&start=0`
  - `package_show?id=<name>`
  - `organization_list`, `group_list`

  Con `datastore` attivo, alcune risorse CSV potrebbero essere interrogabili con `datastore_search?resource_id=<id>&q=...`. Va verificato per singola risorsa (`datastore_active: true`).
- **Ricerca per bounding box.** L'estensione `spatial_query` suggerisce che sia supportato il parametro ckanext-spatial `ext_bbox=minx,miny,maxx,maxy` in `package_search`. Visto il numero esiguo di dataset geografici, però, è poco utile.
- **Ripubblicazione e mash-up.** I dataset CC-BY richiedono solo attribuzione, che va resa visibile nell'interfaccia (es. "Fonte: Roma Capitale, CC-BY 4.0"). I 14 dataset CC-BY-SA, tra cui il GTFS di RSM, impongono lo share-alike sui dati derivati. Gli 11 `other-nc` vietano l'uso commerciale.
- **Identificatori dei dataset derivati.** Usare il prefisso `c_h501:` (codice IPA/catastale di Roma) se il team dovesse proporre dataset da pubblicare sul portale.

### Gaps
- Non ho letto la pagina "Licenza/Note legali" del portale per sapere se esista una licenza di default per i dataset senza indicazione.
- Non ho verificato quali risorse abbiano il DataStore attivo.
- Non ho verificato se dati.comune.roma.it esponga un endpoint DCAT RDF/catalog (es. `/catalog/catalog.rdf` o `/catalog/catalog.ttl` tramite ckanext-dcat). L'estensione `dcat` è installata, ma l'URL esatto non è stato provato.

## 2. Geoportale / SIT di Roma Capitale (GeoRoma): URL, WMS/WFS, layer di base, CRS, stradario e geocoding

### Takeaway
Il Geoportale ufficiale è `https://geoportale.comune.roma.it`, con dentro il SIT "GeoRoma" e il sistema di toponomastica "SIS.TO". Espone un GeoServer pubblico con WMS e WFS (endpoint `https://geoportale.comune.roma.it/geoserver/ows`). È anche annunciata un'**OGC API Features** su gateway API, ma con API-KEY e solo in ambiente di test. I CRS sono eterogenei: prevalgono **EPSG:7792** (RDN2008 / UTM 33N), **EPSG:6708** (RDN2008 / UTM 33N N-E) ed **EPSG:4326**, con casi di EPSG:3004 (Monte Mario / Gauss-Boaga fuso Est), EPSG:6706 ed EPSG:32632. Molti layer chiave, come i **numeri civici** e il **grafo stradale**, sono marcati "non pubblici" nel geocatalogo. Non ho trovato un servizio ufficiale e aperto di geocoding degli indirizzi romani.

### Cited Findings
- **Struttura del Geoportale.**
  - GeoSistemi: GeoRoma (SIT, `./geo_roma/`), Forma Romae (`https://formaromae.comune.roma.it/content/home`), **SIS.TO – Sistema Informativo della Toponomastica** (`./sisto/home`), Atlante del Patrimonio, Aerofototeca, Atlante delle Scuole.
  - GeoServizi: Geodatabase Topografico/Geodetico (`./geodatabasetopografico/`), Geocatalogo (`./catalogo/`), "Servizi, API, OGC" (`./servizi/`).
  - Il footer rimanda alla dichiarazione di accessibilità del Comune `https://www.comune.roma.it/web/it/accessibilita.page`.

  — [Geoportale Roma Capitale](https://geoportale.comune.roma.it)
- **Endpoint OGC pubblicati.**
  - WMS: `https://geoportale.comune.roma.it/geoserver/ows?service=WMS&request=GetCapabilities`
  - WFS: `https://geoportale.comune.roma.it/geoserver/ows?service=WFS&request=GetCapabilities`

  Entrambi sono indicati come validi per utenti autenticati e non autenticati. — [Geoportale, pagina Servizi](https://geoportale.comune.roma.it/servizi/)
- **OGC API Features (solo test, con API-KEY).**
  - `https://gw-int-test.ws-comune.roma.it/geo/collections/{{nome_layer}}/items?f=json`
  - `https://gw-test.ws-comune.roma.it/geo/collections/{{nome_layer}}/items?f=json`

  Header richiesto: `Authorization: API-KEY <token>`. — [Geoportale, pagina Servizi](https://geoportale.comune.roma.it/servizi/)
- **WFS 1.1.0.** Provider "GeoRoma". Fees e AccessConstraints vuoti. GetFeature supporta `application/json` (GeoJSON), `csv`, `SHAPE-ZIP`, KML e GML 2/3.1.1/3.2. — [WFS GetCapabilities](https://geoportale.comune.roma.it/geoserver/ows?service=WFS&version=1.1.0&request=GetCapabilities)
- **Layer di base osservati nel GetCapabilities WFS (nome: DefaultSRS).**
  - **Municipi:**
    - `DIPPC:municipi` EPSG:7792
    - `DIPPC:210_RomaCapitale_Municipi` EPSG:7792
    - `DIPAU:municipi_piano_servizi` EPSG:7792
    - `DIPAMB:zonizzazione-3` (Municipi) EPSG:4326
    - `GABSIN:MUNICIPI_TOPONOMASTICA` EPSG:4326
    - `DIPSER:MunicipiToponomasticaI…XV` EPSG:4326
  - **Limiti comunali:**
    - `DIPPC:210_RomaCapitale_Limiti` EPSG:7792
    - `GABSIN:comune_roma` EPSG:7792
    - `DIPPC:210_LAZIO_LimitiComuni` EPSG:7792
  - **Zone urbanistiche:** `DIPDIT:ZoneUrbanistiche` EPSG:6708
  - **Sezioni di censimento:** `DIPDIT:ZoneCensimento` EPSG:32632
  - **Toponomastica:**
    - `DIPSER:SuddivisioniToponomastica` EPSG:6708 (rioni/quartieri/suburbi/zone dell'agro)
    - `DIPAMB:zonizzazione-2` EPSG:4326
  - **Possibile layer delle nuove "località":** `DIPAU:nuova_geografia_urbana_localita` EPSG:7792 (nome ambiguo)
  - **Numeri civici:**
    - `DIPPC:210_RomaCapitale_NumeriCivici` EPSG:7792
    - `DIPAMB:zonizzazione-18` (PCN – Numeri Civici) EPSG:4326
    - `DIPCUL:GeoromaCiviciLocator` EPSG:4326
  - **Viabilità:**
    - `REGLAZ:CTRN_Viabilita_Linee` EPSG:3004
    - `DIPPC:grande_viabilita` EPSG:7792
  - **Sport:**
    - `DIPAMB:aree_fitness` EPSG:6706
    - `GABSIN:piscine` EPSG:7792
  - **Altri:** `DIPAMB:zonizzazione-12` (Metro) e `-15` (GRA), entrambi EPSG:6708

  — [WFS GetCapabilities](https://geoportale.comune.roma.it/geoserver/ows?service=WFS&version=1.1.0&request=GetCapabilities). Nota: il documento è di circa 238k caratteri e ne ho letti circa 200k, quindi l'elenco è parziale.
- **Geocatalogo (flag "pubblico").** Sono indicati come pubblici (SI): Municipi I–XV, Zone Urbanistiche, Aggregato Toponomastica, Suddivisioni Toponomastiche, Sezioni di Censimento, CTRN Viabilità 2003, Carta Tecnica Regionale 2003 e 2014. Sono indicati come **non pubblici** (NO): **Numeri Civici**, Civici PCN, Civici Statistica, Strade (Catasto), Grafo Stradale Statistica, Perimetro Comunale, Zone OMI, Paline Toponomastica. Nel catalogo non esiste un layer "quartieri" con quel nome. — [Geocatalogo](https://geoportale.comune.roma.it/catalogo/)
- **SIS.TO.** È descritto come riferimento ufficiale per la gestione del viario e dei numeri civici di Roma. GeoRoma offre servizi interoperabili (WMS, WFS, API REST). — [GEOmedia – GeoRoma (PDF)](https://www.mediageo.it/ojs/index.php/GEOmedia/article/download/2085/1883)
- **Cartografia di base.** La base ufficiale di GeoRoma è la CTR della Regione Lazio in scala 1:5000, giudicata non adeguata per il centro storico. — [GEOmedia – GeoRoma (PDF)](https://www.mediageo.it/ojs/index.php/GEOmedia/article/download/2085/1883)
- **Contesto del progetto.** L'articolo GEOmedia (pubblicato l'8/2/2026, vol. 29 n. 2/2025) è un'intervista all'ing. Daniele Condurso, responsabile di GeoRoma. Descrive la centralizzazione su WebGIS, il Geoportale istituzionale e l'app GeoRoma, "allineati agli standard nazionali e internazionali". — [GEOmedia – GeoRoma](https://ojs.mediageo.it/index.php/GEOmedia/article/view/2085)
- **Evoluzione annunciata.** Un articolo GEOmedia successivo parla dell'evoluzione "dal webGIS al Digital Twin". Non sono riuscito a leggerne il contenuto: il PDF è risultato illeggibile. — [GEOmedia 2169](https://ojs.mediageo.it/index.php/GEOmedia/article/view/2169)
- **Mappa territoriale legacy.** Roma Servizi per la Mobilità rimanda anche a una vecchia applicazione cartografica del Comune: `https://www.comune.roma.it/TERRITORIO/nic-gwt/`. — [RSM Open Data](https://romamobilita.it/it/tecnologie/open-data)

### Inferences
- **Significato dei codici EPSG** (da registro EPSG; non ho riletto le singole schede in questa sessione):
  - [EPSG:7792](https://epsg.io/7792) = RDN2008 / UTM zone 33N
  - [EPSG:6708](https://epsg.io/6708) = RDN2008 / UTM zone 33N (N-E)
  - [EPSG:6706](https://epsg.io/6706) = RDN2008 geografico
  - [EPSG:3004](https://epsg.io/3004) = Monte Mario / Italy zone 2 (Gauss-Boaga fuso Est)
  - [EPSG:32632](https://epsg.io/32632) = WGS84 / UTM 32N

  Nessun layer osservato è in EPSG:25833 (ETRS89/UTM33N). RDN2008 è il datum geodetico nazionale ufficiale, coerente con la normativa italiana (DM 10/11/2011).
- **Gestione dei CRS nel progetto.** Conviene salvare tutto in PostGIS come `geometry(…, 4326)` per il frontend web (MapLibre/Leaflet). Se servono calcoli metrici (buffer, distanze per antenne o impianti), usare una colonna o vista trasformata in EPSG:7792 o 32633. GeoServer riproietta al volo, quindi basta chiedere il GeoJSON già in WGS84:

  `https://geoportale.comune.roma.it/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=DIPDIT:ZoneUrbanistiche&outputFormat=application/json&srsName=EPSG:4326`

  È la sintassi GeoServer standard; la query specifica non l'ho testata.
- **Import in PostGIS.** `ogr2ogr -f PostgreSQL PG:"..." "WFS:https://geoportale.comune.roma.it/geoserver/ows" DIPPC:municipi -t_srs EPSG:4326`.
- **Geocoding degli indirizzi.** Non risulta un geocoder aperto ufficiale. Le opzioni realistiche per un prototipo sono:
  - (a) il layer `DIPPC:210_RomaCapitale_NumeriCivici` o `DIPCUL:GeoromaCiviciLocator`, se interrogabile via WFS senza autenticazione (il geocatalogo li dichiara non pubblici: va verificato);
  - (b) Nominatim/OSM o un geocoder commerciale come fallback, dichiarando la fonte.

  In produzione il riferimento ufficiale sarebbe SIS.TO e lo stradario del Comune, tramite accordo con Roma Capitale. Esiste anche l'ANNCSU nazionale (Archivio Nazionale Numeri Civici e Strade Urbane, ISTAT/Agenzia Entrate), che però non ho verificato in questa sessione.
- **Livello dei "quartieri" per le sfide.** Per ancorare i servizi a un'unità territoriale, i layer consigliati sono:
  - Municipi (15);
  - Zone Urbanistiche (155 storicamente; numero non verificato qui);
  - Suddivisioni Toponomastiche (rioni, quartieri, suburbi, zone dell'Agro), che sono la divisione "storica" dei quartieri.

### Gaps
- Non ho letto la porzione finale del GetCapabilities WFS, gli ultimi ~38k caratteri: possibili altri layer utili (mercati, antenne, impianti sportivi).
- Non ho verificato se i layer "non pubblici" del geocatalogo, come i civici, rispondano comunque al WFS anonimo.
- Non ho trovato documentazione su come ottenere un'API-KEY per il gateway `ws-comune.roma.it`, né la versione di produzione (non-test) dell'OGC API Features.
- Non ho trovato un endpoint WMTS o tile cache pubblico.
- La licenza dei layer GeoServer non è dichiarata: AccessConstraints è vuoto. Per un uso in produzione serve una conferma dal Comune.

## 3. Roma Servizi per la Mobilità: GTFS statico e realtime come layer di contesto

### Takeaway
RSM pubblica GTFS statico e tre feed GTFS-Realtime (trip updates, vehicle positions, service alerts) come file `.pb` su romamobilita.it, senza registrazione. I feed realtime si aggiornano circa ogni 60 secondi e coprono solo Atac e Roma TPL. Lo stesso dataset è catalogato su dati.comune.roma.it con licenza CC-BY-SA, ma lì i `.pb` sono copie aggiornate in modo intermittente: per il realtime vanno usati gli URL di romamobilita.it. Le licenze dichiarate nelle diverse fonti non coincidono.

### Cited Findings
- **URL ufficiali dei feed.**
  - GTFS statico: `https://romamobilita.it/sites/default/files/rome_static_gtfs.zip`, con checksum `.../rome_static_gtfs.zip.md5`; aggiornamento "quasi quotidiano".
  - Trip updates: `https://romamobilita.it/sites/default/files/rome_rtgtfs_trip_updates_feed.pb` (~60 s)
  - Vehicle positions: `https://romamobilita.it/sites/default/files/rome_rtgtfs_vehicle_positions_feed.pb` (~60 s)
  - Service alerts: `https://romamobilita.it/sites/default/files/rome_rtgtfs_service_alerts_feed.pb`

  Il GTFS statico copre Atac, Troiani, SAP, BIS e TUSCIA; il realtime solo Atac e Roma TPL. Non è richiesta registrazione. I dati di affollamento sono "in via sperimentale". — [RSM Open Data](https://romamobilita.it/it/tecnologie/open-data)
- **Altri dataset geografici RSM** (perimetri e varchi ZTL, impianti semaforici): `https://romamobilita.it/sistemi-e-tecnologie/dataset-geografici/`. — [RSM Open Data](https://romamobilita.it/it/tecnologie/open-data)
- **Copia sul portale comunale.** Dataset `c_h501-d-9000` "Dati del Trasporto Pubblico (GTFS) del Comune di Roma", licenza **cc-by-sa**, tema TRAN, frequenza DAILY. Le risorse `.pb` risultavano modificate l'ultima volta l'11/11/2026, mentre lo ZIP statico il 13/11/2026. — [package_show c_h501-d-9000](https://dati.comune.roma.it/catalog/api/3/action/package_show?id=c_h501-d-9000)
- **Licenza indicata su una pagina RSM più datata:** "CreativeCommons 3.0 Italy Attribution", ribadita in una presentazione RSM del 2018 per statico e realtime. — [romamobilita.it node 574](https://romamobilita.it/en/node/574); [Cagnoli, Mobility Week 2018](https://romamobilita.it/sites/default/files/pdf/MobilityWeek2018/Marco_Cagnoli.pdf). In contrasto con la licenza CC-BY-SA del catalogo CKAN: [package_show](https://dati.comune.roma.it/catalog/api/3/action/package_show?id=c_h501-d-9000)

### Inferences
- **Uso nel prototipo.** Importare il GTFS statico in PostGIS (es. `gtfs-via-postgres` o simili) per avere fermate (`stops`) e percorsi (`shapes`) come layer di contesto. Utile per indicare la fermata più vicina a un impianto sportivo o alla postazione di un artista di strada.
- **Licenza da adottare.** Per prudenza va applicata la più restrittiva, cioè CC-BY-SA, citando "Roma Servizi per la Mobilità". Lo share-alike riguarda i dati derivati, non il codice dell'app.
- **Realtime.** È opzionale per un hackathon. Se usato, il polling non deve scendere sotto i 60 s.

### Gaps
- La licenza attuale "ufficiale" dei feed realtime sulla pagina RSM non è esplicitata: la pagina open-data non riporta termini d'uso.

## 4. Regione Lazio, Città Metropolitana di Roma Capitale, ISTAT

### Takeaway
Il portale dati.lazio.it è CKAN con API `https://dati.lazio.it/api/3` e licenza di riferimento CC BY 4.0. Il geoportale regionale è `geoportale.regione.lazio.it`, fonte della CTR 1:5000 usata anche da GeoRoma. La Città Metropolitana ha un geoportale basato su QGIS e PostGIS, ma non ho trovato endpoint WMS documentati. ISTAT pubblica i confini amministrativi aggiornati al 1/1/2026 in WGS84 UTM32N (EPSG:32632).

### Cited Findings
- **dati.lazio.it.** Base API `https://dati.lazio.it/api/3`, esempio `https://dati.lazio.it/api/3/action/package_list`. Rimanda alla documentazione CKAN 2.9. Icona di licenza CC BY 4.0, pagina licenze `/licenze-di-utilizzo`, sezione "Servizi geografici" (`/servizi-geografici`) e filtro "Geo Data" per le risorse WMS. — [Open Data Lazio – API](https://dati.lazio.it/en/application-programming-interface)
- **Geoportale regionale.** `https://geoportale.regione.lazio.it`, con catalogo e export dei metadati (es. DTM passo 5 m). — [Geoportale Regione Lazio – About](https://geoportale.regione.lazio.it/about/); [pagina Regione Lazio – Geoportale regionale](https://regione.lazio.it/cittadini/urbanistica/sistema-informativo-territoriale-regionale/geoportale-regionale)
- **Layer regionali dentro GeoRoma.** Il GeoServer di GeoRoma ripubblica layer regionali, es. `REGLAZ:CTRN_Viabilita_Linee` in EPSG:3004. — [WFS GetCapabilities GeoRoma](https://geoportale.comune.roma.it/geoserver/ows?service=WFS&version=1.1.0&request=GetCapabilities)
- **Città Metropolitana.** Geoportale `https://geoportale.cittametropolitanaroma.it`. Il GIS dell'ente si basa su software open source (QGIS, database PostGIS). — [Documento attività GIS 2021](https://geoportale.cittametropolitanaroma.it/sites/default/files/inline-files/DOCUMENTO_ATTIVITA%27_GIS_2021_2.pdf)
- **Piano ICT metropolitano.** La Città Metropolitana ha un Piano Strategico ICT 2024-2026, allegato al PIAO, allineato al Piano Triennale nazionale. — [Allegato A – Piano Strategico ICT metropolitano](https://static.cittametropolitanaroma.it/uploads/Allegato-A-Piano-Strategico-ICT-metropolitano-sottosezione-Piano-Strategico-ICT-metropolitano-PIAO-2024-2026.pdf)
- **Confini ISTAT.** Confini delle unità amministrative a fini statistici aggiornati al **1 gennaio 2026**, shapefile **WGS84 UTM32N**, in versione generalizzata e non generalizzata. Livelli: ripartizioni, regioni, province/CM, comuni. Attributi in UTF-8. Archivio storico dal 1991/2001 e versioni precedenti in ED50 UTM32N. — [ISTAT archivio 222527](https://www.istat.it/it/archivio/222527)
- **Basi territoriali ISTAT** (sezioni di censimento): documentazione dei dati. — [Descrizione dei dati – Basi territoriali](https://www.istat.it/wp-content/uploads/2024/07/Descrizione-dei-dati-Basi-territoriali.pdf)

### Inferences
- **Quando servono i confini ISTAT.** Per un progetto limitato al Comune di Roma i confini ISTAT servono solo per il perimetro comunale o per il contesto metropolitano. Per Municipi e zone urbanistiche la fonte autorevole è GeoRoma.
- **Doppia proiezione.** I file ISTAT (EPSG:32632, fuso 32) vanno riproiettati: Roma cade nel fuso 33.

### Gaps
- Non ho trovato endpoint WMS/WFS documentati del geoportale della Città Metropolitana, né un suo portale CKAN attivo.
- Non ho verificato il link diretto allo ZIP ISTAT 2026: si trova nella prima riga della colonna "WGS84 UTM32N" della pagina archivio.

## 5. Regole nazionali: open data, metadati, geodati, interoperabilità, design, accessibilità, identità, pagamenti, GDPR; prototipo vs produzione

### Takeaway
Per i dati valgono le Linee guida AgID open data (Determinazione 183/2023), con **CC BY 4.0 come licenza di riferimento obbligatoria**, metadati **DCAT-AP_IT** con federazione su dati.gov.it, e per i geodati **RNDT** (geodati.gov.it, Linee guida RNDT del 2022) e INSPIRE. Lo scambio tra enti passa da **PDND/ModI**. I servizi al cittadino richiedono il design system .italia (Bootstrap Italia 2.x; Dev Kit Italia in beta da luglio 2026), le Linee guida accessibilità AgID (WCAG 2.1 / EN 301 549 v3.2.1) con dichiarazione di accessibilità, login SPID/CIE (CNS), pagamenti pagoPA e GDPR. In un hackathon va mostrata la conformità di design, accessibilità, licenze e formati. SPID/CIE, pagoPA, PDND, RNDT e DPIA sono passi di produzione che richiedono l'adesione dell'ente.

### Cited Findings
**Open data e metadati**
- **Linee guida open data.** Le Linee guida AgID sull'apertura dei dati e il riutilizzo dell'informazione del settore pubblico (D.Lgs. 36/2006, recepimento della Direttiva UE 2019/1024) sono state adottate con **Determinazione AgID n. 183 del 3 agosto 2023**. **CC BY 4.0** è adottata come licenza nazionale di riferimento per i nuovi dati, passando da raccomandata a obbligatoria. — [AgendaDigitale.eu](https://www.agendadigitale.eu/cittadinanza-digitale/apertura-dei-dati-e-riutilizzo-dellinformazione-verso-nuovi-obblighi-alle-pa-italiane/); testo: [AgID – LG Open Data v1.0 (PDF)](https://www.agid.gov.it/sites/default/files/repository_files/lg-open-data_v.1.0_1.pdf)
- **Dati di elevato valore (HVD, Reg. UE 2023/138).** Esistono una Guida operativa AgID (dicembre 2024) e un Vademecum (v1.4, 2026). Le categorie HVD includono dati geospaziali e mobilità, quindi rilevanti per i layer di questo progetto. — [AgID – Guida operativa HVD](https://www.agid.gov.it/sites/agid/files/2024-12/Guida_operativa_sulle_serie_di_dati_di_elevato_valore.pdf); [open.gov.it – Vademecum HVD v1.4](https://open.gov.it/sites/default/files/media/documents/2026-07/Vademecum%20sull%E2%80%99importanza%20dei%20dati%20di%20elevato%20valore%20in%20ottica%20di%20governo%20aperto%20-%20AgID%20%28%20Versione%201.4%29.pdf)
- **DCAT-AP_IT.** Le linee guida per i cataloghi dati sono su docs.italia.it (profilo nazionale di metadati per popolare i cataloghi), con licenza CC-BY 4.0. — [docs.italia.it – Linee guida cataloghi dati DCAT-AP_IT](https://docs.italia.it/projects/linee-guida-cataloghi-dati-dcat-ap-it/downloads/pdf/stabile)
- **Implementazione su Roma.** Il portale di Roma implementa DCAT-AP_IT tramite `ckanext-dcatapit` (`dcatapit_pkg/org/config`, `dcatapit_csw_harvester`). — [CKAN status_show Roma](https://dati.comune.roma.it/catalog/api/3/action/status_show)

**Geodati: RNDT e INSPIRE**
- **RNDT.** È il catalogo nazionale dei metadati sui dati territoriali delle PA. Linee guida adottate con **Determinazione AgID n. 50/2022** (art. 59 c. 5 CAD). Il portale è geodati.gov.it dal 2018, con CSW e API REST; un rinnovo è stato annunciato ad aprile 2026, con workshop il 22/4/2026. — [AgID – Linee guida RNDT 2022](https://www.agid.gov.it/it/agenzia/stampa-e-comunicazione/notizie/2022/03/08/dati-territoriali-agid-adotta-linee-guida-rndt); [AgID – portale Geodati si rinnova (17/04/2026)](https://www.agid.gov.it/index.php/it/notizie/il-portale-geodati-si-rinnova-programma-il-22-aprile-un-workshop-le-pa-accreditate)
- **GeoDCAT-AP.** AgID ha pubblicato nel 2018 le linee guida per l'implementazione di GeoDCAT-AP, il ponte tra metadati RNDT/INSPIRE e DCAT. — [AgID 2018 – GeoDCAT-AP](https://www.agid.gov.it/it/agenzia/stampa-e-comunicazione/notizie/2018/01/12/dati-geografici-sono-online-linee-guida-limplementazione-geodcat-ap)

**Interoperabilità: PDND e ModI**
- **Obblighi per gli erogatori.** Le Linee guida AgID su PDND/ModI prevedono che gli erogatori **DEVONO** registrare e pubblicare sul Catalogo API gli e-service, con i requisiti di fruizione. Ogni e-service deve usare una tecnologia ModI (REST o SOAP). Ogni client fruitore ha materiale crittografico proprio. — [Documentazione PDND Interoperabilità – glossario](https://docs.pagopa.it/interoperabilita-1/glossario); [docs PDND](https://docs.pagopa.it/interoperabilita-1)
- **Aggiornamento di giugno 2025.** Le nuove Linee guida PDND introducono la firma delle risposte da parte degli erogatori e regole di naming degli e-service (Allegato 7). — [AgID news 24/06/2025](https://www.agid.gov.it/index.php/it/notizie/nuove-linee-guida-pdnd-linteroperabilita-si-arricchisce-di-funzionalita-evolute)
- **Apertura alle imprese.** Dal 15/01/2026 la PDND è aperta alle imprese iscritte al Registro Imprese. Questa informazione viene da fonte secondaria. — [PMI.it](https://www.pmi.it/pubblica-amministrazione/riforma-pa/382391/piattaforma-digitale-nazionale-dati.html)

**Design dei servizi**
- **Modello di sito per i Comuni.** È su Designers Italia, documentato su Docs Italia, con template Bootstrap Italia. Nell'ambito della misura PNRR 1.4.1 i criteri di conformità richiedono:
  - uso esclusivo di componenti Bootstrap Italia, versione **≥ 2.0** (il decreto di rettifica di aprile 2022 fissava il minimo a 1.6.4);
  - font del design system, vocabolari controllati e voci di menu del modello.

  L'avviso 1.4.1 è chiuso. — [AgendaDigitale – siti dei Comuni e linee guida di design](https://agendadigitale.eu/cittadinanza-digitale/siti-dei-comuni-come-rispettare-le-linee-guida-di-design-e-creare-vantaggi-ai-cittadini); [Brochure 1.4.1 Comuni](https://assets.innovazione.gov.it/1670239161-1-4-1_comuni_brochureinformativa.pdf); [Decreto di rettifica avviso 1.4.1](https://presidenza.governo.it/AmministrazioneTrasparente/Sovvenzioni/CriteriModalita/Avviso_Comuni_1_4_1/Decreto%20di%20rettifica%20Avviso%201_4_1_aprile%202022.pdf)
- **Bootstrap Italia e kit React.** Bootstrap Italia 2.x è basato su Bootstrap 5 (2.0.0 rilasciato il 22/07/2022; versioni 2.18.x presenti su CDN). Il kit React è `design-react-kit`, che implementa Bootstrap Italia e va usato insieme al pacchetto `bootstrap-italia` per CSS e font. — [Bootstrap Italia README 2.18.2](https://cdn.jsdelivr.net/npm/bootstrap-italia@2.18.2/README.EN.md); [Design React Kit README 5.10.0](https://cdn.jsdelivr.net/npm/design-react-kit@5.10.0/README.EN.md)
- **Dev Kit Italia (23/07/2026).** Designers Italia ha rilasciato in **beta** Dev Kit Italia: toolkit front-end del Design System .italia basato su **Web Components**, indipendente dal framework e compatibile con React, Angular, Vue e Svelte. Rinnovato anche il portale Developers Italia. — [AgID news 23/07/2026](https://www.agid.gov.it/index.php/it/notizie/designers-italia-e-developers-italia-nuovi-strumenti-e-un-sito-tutto-rinnovato); [Designers Italia – Dev Kit Italia](https://designers.italia.it/community/notizie/202607-un-kit-per-ogni-ambiente-di-sviluppo-il-nuovo-dev-kit-italia/)

**Accessibilità**
- **Linee guida AgID.** Le Linee guida AgID sull'accessibilità degli strumenti informatici (versione PA aggiornata al 21/12/2022; quadro della Legge 4/2004 "Stanca") recepiscono le **WCAG 2.1** e rimandano alla norma **EN 301 549**. Dal 12/02/2022 la **v3.2.1** è l'unica norma pertinente. Allegati: modello di **dichiarazione di accessibilità** (all. 1) e modello di autovalutazione (all. 2). — [AgID – LG accessibilità PA (PDF)](https://www.agid.gov.it/sites/agid/files/2024-06/Linee%20Guida%20sull%27accessibilit%C3%A0%20degli%20strumenti%20informatici%20-%20PA.pdf); [docs.italia.it – LG accessibilità](https://docs.italia.it/projects/lg-accessibilita-docs/downloads/epub/stabile)
- **Dichiarazione di Roma Capitale.** È pubblicata su `https://www.comune.roma.it/web/it/accessibilita.page`. — [Geoportale Roma Capitale, footer](https://geoportale.comune.roma.it)

**Piano Triennale nazionale**
- L'aggiornamento 2026 del Piano Triennale per l'informatica nella PA (AgID, 22/10/2025) amplia le sezioni su IT-Wallet e intelligenza artificiale. — [AgID news 22/10/2025](https://www.agid.gov.it/it/notizie/online-laggiornamento-2026-del-piano-triennale-linformatica-nella-pa)

**Identità digitale e pagamenti su Roma**
- **Autenticazione forte.** Dal 1/1/2021 l'area riservata del portale di Roma Capitale è accessibile solo con autenticazione forte (SPID/CIE/CNS). I pagamenti pagoPA sono in costante crescita. — [Agenzia Roma – Qualità della vita / servizi online (PDF)](https://www.agenzia.roma.it/documenti/schede/07_qdv_sol_finale_def.pdf)
- **Servizi 2026.** I servizi scolastici 2026/27 (tariffe mensa e trasporto, supplenze nidi) si richiedono sul portale con SPID, CIE o CNS. Fonte secondaria. — [NewsIstruzione, 05/08/2026](https://www.newsistruzione.it/2026/08/05/roma-domande-mensa-trasporto-scolastico-2026-2027/amp)

### Inferences
**Matrice prototipo vs produzione**

| Requisito | Hackathon (prototipo) | Servizio adottato da Roma Capitale |
|---|---|---|
| Licenze dati (CC BY 4.0 / attribuzione; SA per GTFS) | **Sì**: attribuzione visibile, rispetto di SA/NC | Sì |
| Formati aperti (CSV, GeoJSON, API documentate OpenAPI) | **Sì**: consigliato esporre GeoJSON e un'API REST documentata | Sì, con pubblicazione su dati.comune.roma.it |
| Metadati DCAT-AP_IT / federazione dati.gov.it | Facoltativo (bonus: `dcat.json` o descrizione DCAT dei dataset generati) | Sì, tramite CKAN comunale, harvestato da dati.gov.it |
| RNDT / INSPIRE per geodati | No | Sì, se si producono nuovi dati territoriali (metadati RNDT via GeoRoma) |
| PDND / ModI | No (mock) | Sì, se il servizio consuma dati di altri enti (es. ANPR) o li eroga |
| Design system .italia (Bootstrap Italia / design-react-kit / Dev Kit Italia) | **Fortemente consigliato**: dimostra adottabilità e coerenza con comune.roma.it | Sì (modello Comuni) |
| Accessibilità WCAG 2.1 AA / EN 301 549 | **Sì per le basi** (contrasto, tastiera, alt, ARIA sulle mappe, alternativa testuale/lista alla mappa) | Obbligatoria, con dichiarazione di accessibilità |
| SPID/CIE | Mock o pulsanti "Entra con SPID/CIE" non funzionanti; eventualmente ambiente di test SPID | Sì, con adesione dell'ente come Service Provider o integrazione con l'IdP proxy del portale comunale |
| pagoPA (es. prenotazione impianti, suolo pubblico artisti) | Mock (avviso di pagamento simulato) | Sì, tramite il partner tecnologico pagoPA del Comune |
| GDPR (art. 25 privacy by design, minimizzazione, informativa, base giuridica art. 6 c.1 lett. e) | **Sì per le basi**: niente dati personali reali, informativa, minimizzazione (lost & found: niente dati identificativi in chiaro) | Sì, con DPIA (art. 35) per trattamenti su larga scala o geolocalizzazione, nomina responsabile (art. 28) |

- **Next.js e design system.** `design-react-kit` è maturo ma incompleto. Dev Kit Italia, essendo in Web Components, si integra in Next.js con attenzione al SSR (custom elements solo lato client). Per un hackathon il percorso più rapido è `bootstrap-italia` (CSS) più `design-react-kit`.
- **Riferimenti normativi da tenere presenti** (non riletti in questa sessione): CAD D.Lgs. 82/2005, artt. 50-52 (dati) e art. 64 (SPID/CIE); Reg. UE 2016/679 (GDPR); D.Lgs. 36/2006 come modificato dal D.Lgs. 200/2021; Legge 4/2004 "Stanca" come modificata dal D.Lgs. 106/2018. Testi su [normattiva.it](https://www.normattiva.it).

### Gaps
- Non ho verificato la versione corrente di DCAT-AP_IT. Le linee guida su docs.italia.it non riportavano il numero di versione nello snippet. È noto un allineamento in corso a DCAT-AP 2.x/3, non confermato qui.
- Non ho verificato in questa sessione la documentazione ufficiale SPID/CIE (es. docs.italia.it SPID, ambiente di test `demo.spid.gov.it`), le specifiche tecniche pagoPA (developer.pagopa.it) e la scadenza annuale della dichiarazione di accessibilità (storicamente 23 settembre, su form.agid.gov.it): sono da confermare.
- Non ho trovato l'URL corrente esatto dell'endpoint CSW di geodati.gov.it (in passato `rndt.gov.it/RNDT/CSW`, dato del 2014).

## 6. Strategia digitale di Roma Capitale: Piano Triennale, portale servizi, chatbot "Julia"

### Takeaway
Non ho trovato un "Piano Triennale per l'informatica" di Roma Capitale come documento autonomo per il 2025-2027: probabilmente è nel PIAO. Il riferimento operativo più rilevante per il team è **Julia 3.0**, l'assistente IA ufficiale di Roma Capitale (`julia.comune.roma.it` più app). È un sistema multi-agente su Microsoft Azure/OpenAI che usa solo fonti ufficiali, si integra con SPID/CIE/CNS ed esegue già 30 servizi. Il chatbot del team deve posizionarsi rispetto a Julia, come complemento o come possibile "agente specializzato" integrabile, non come duplicato.

### Cited Findings
- **Julia 3.0.** Evoluzione dell'assistente IA lanciato a marzo 2025, presentata a Maker Faire Rome 2026 (validità indicata "dal 26 ottobre 2026 al 31 dicembre 2027"). Caratteristiche:
  - **Architettura:** un agente principale smista le richieste a 5 assistenti specializzati (portale istituzionale, vita in città, anagrafe, scuola, 060606). Gira su **Microsoft Azure con modelli OpenAI**, usa solo fonti ufficiali, con fonti, regole e dati controllati da Roma Capitale.
  - **Canali:** web `julia.comune.roma.it` e nuova app iOS/Android.
  - **Login:** SPID/CIE/CNS, con continuità della conversazione tra portale e app.
  - **Funzioni:** oltre 80 lingue, voce, itinerari e servizi vicini con geolocalizzazione su richiesta (fino a 24 h, revocabile), riconoscimento della pagina del sito, numero di pratica a fine interazione, passaggio a un operatore umano, informazioni ufficiali da AMA, ATAC e RSM.
  - **Servizi transazionali (30):** 16 anagrafici, 7 scuola, 7 assistenza e segnalazioni (060606, AMA, cimiteri, rimozione veicoli).

  — [Turismo Roma – Julia 3.0](https://turismoroma.it/it/node/178814)
- **Partecipazione civica.** Roma Capitale ha descritto il proprio modello di "cittadinanza digitale partecipativa" su AgendaDigitale. L'articolo non è datato nello snippet e va considerato storico. — [AgendaDigitale – Roma Capitale cittadinanza digitale](https://www.agendadigitale.eu/cittadinanza-digitale/roma-capitale-ecco-il-nostro-modello-di-cittadinanza-digitale-partecipativa/)
- **Facilitazione digitale.** Nel 2026 è attiva nei Municipi la facilitazione digitale gratuita (Mondo Digitale/Didaké) per attivare SPID e CIE. Indica che l'utenza target non è tutta digitalmente autonoma. — [Mondo Digitale – nota facilitazione 2025](https://mondodigitale.org/sites/default/files/allegati/progetti/2025/Nota-Novembre-Facilitazione-2025.pdf); [Mondo Digitale – assistenza negli uffici municipali](https://mondodigitale.org/en/news/digital-assistance-resumes-romes-municipal-offices)
- **Interventi PNRR.** Il programma "Roma si trasforma" elenca un intervento di acquisizione di dati geospaziali per GeoRoma. — [Roma si trasforma – Geospatial data acquisition GeoRoma](https://romasitrasforma.it/en/intervento/innovation/geospatial-data-acquisition-georoma)

### Inferences
- **Le linee implicite di Roma per i nuovi servizi:**
  - accesso tramite portale istituzionale con identità forte (SPID/CIE/CNS);
  - un unico assistente conversazionale (Julia) con agenti verticali;
  - dati geografici centralizzati in GeoRoma (GeoServer/OGC più gateway API con API-KEY);
  - open data su CKAN DCAT-AP_IT.

  Un prototipo che esponga API OGC/REST pulite, GeoJSON in EPSG:4326 e un'interfaccia Bootstrap Italia sarebbe il più facilmente "innestabile".
- **Il chatbot del team.** Per allinearsi a Julia dovrebbe:
  - rispondere solo da fonti ufficiali citate (RAG su open data e geodati comunali);
  - prevedere l'escalation al 060606;
  - gestire la geolocalizzazione con consenso esplicito e revocabile;
  - essere multilingue.

  Un'architettura "agente specializzato" (es. impianti sportivi o oggetti smarriti) è coerente con il modello multi-agente di Julia.

### Gaps
- Non ho trovato il Piano Triennale ICT / sezione digitale del PIAO 2025-2027 di Roma Capitale. Andrebbe cercato su comune.roma.it, sezione Amministrazione Trasparente.
- Non ho trovato riscontri ufficiali su un portale chiamato "Roma Semplice": il nome non è emerso nelle ricerche, quindi potrebbe essere obsoleto o informale.
- Non ho verificato se Julia esponga API o un meccanismo di integrazione per agenti terzi.
