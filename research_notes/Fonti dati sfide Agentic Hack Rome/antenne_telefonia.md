# Antenne di telefonia mobile a Roma: fonti dati (impianti, misure CEM, contesto normativo) per la sfida 02 di Agentic Hack Rome

Note di ricerca aggiornate al 13/11/2026. Stack del team: Next.js + PostgreSQL/PostGIS. Fonti primarie quando possibile. Le fonti non ufficiali o secondarie sono segnalate come tali.

---

## 1. Quadro normativo nazionale: leggi, limiti, procedure autorizzative (da spiegare ai cittadini)

### Takeaway
La cornice è la Legge quadro 36/2001, con i limiti fissati dal DPCM 8 luglio 2003. Sono tre i livelli da conoscere: limite di esposizione 20 V/m (3 MHz–3 GHz), valore di attenzione e obiettivo di qualità. Questi ultimi due erano a 6 V/m e sono stati portati in via provvisoria a 15 V/m dall'art. 10 della Legge 30 dicembre 2023 n. 214 (legge annuale concorrenza 2022). La verifica si fa come media sulle 24 ore a 1,5 m di altezza, una regola introdotta dal DL 179/2012. Le procedure autorizzative stanno nel Codice delle comunicazioni elettroniche (D.Lgs. 259/2003, sostituito integralmente dal D.Lgs. 207/2021 e modificato dal D.Lgs. 48/2024). Sono di due tipi: autorizzazione con silenzio-assenso a 90 giorni (art. 44) oppure procedure semplificate (art. 45). In entrambi i casi è previsto un parere tecnico dell'ARPA.

### Cited Findings
**Limiti (DPCM 8/7/2003, Allegato B)**
- Tabella 1, limiti di esposizione: 60 V/m tra 0,1 e 3 MHz; 20 V/m (0,05 A/m; 1 W/m²) tra 3 e 3000 MHz; 40 V/m tra 3 e 300 GHz. Tabelle 2 e 3, valori di attenzione e obiettivi di qualità: in origine 6 V/m (0,016 A/m; 0,10 W/m²) tra 0,1 MHz e 300 GHz — [medicoeleggi, testo DPCM All. B](https://www.medicoeleggi.com/argomenti00/italia9/16620.htm); [bosettiegatti, DPCM 8/7/2003](https://www.bosettiegatti.eu/info/norme/statali/2003_dpcm0807.htm)
- Gli obiettivi di qualità valgono per le "aree intensamente frequentate" all'aperto. Nel testo originale erano mediati su qualsiasi intervallo di 6 minuti. Il decreto non si applica ai lavoratori esposti per ragioni professionali — [bosettiegatti, DPCM art. 1 e 4](https://www.bosettiegatti.eu/info/norme/statali/2003_dpcm0807.htm)

**La modifica 2023-2024 (15 V/m), fatti verificati sul testo di legge**
- La norma è la Legge 30 dicembre 2023, n. 214, art. 10 "Adeguamento dei limiti dei campi elettromagnetici". Il comma 1 chiede di adeguare limiti, valori di attenzione e obiettivi di qualità entro 120 giorni dall'entrata in vigore, secondo la procedura dell'art. 4 c.2 della L. 36/2001 — [ReteAmbiente, L. 214/2023](https://www.reteambiente.it/normativa/52056/legge-30-dicembre-2023-n-214); [testo PDF ospitato da Regione Lazio](https://www.regione.lazio.it/sites/default/files/2025-06/Legge-214-30122023.pdf)
- Comma 2: scaduto quel termine senza un nuovo regolamento, i valori di attenzione e gli obiettivi di qualità delle tabelle 2 e 3 dell'All. B del DPCM sono fissati "in via provvisoria e cautelativa" a 15 V/m (E), 0,039 A/m (H) e 0,59 W/m² (densità di potenza) — [ReteAmbiente](https://www.reteambiente.it/normativa/52056/legge-30-dicembre-2023-n-214); [Astrid, testo GU](https://www.astrid-online.it/static/upload/___-/0002/___-atto-completo-___8.pdf)
- L'innalzamento riguarda il valore di attenzione e l'obiettivo di qualità, non il limite di esposizione, che resta 20/40/60 V/m in tabella 1 — [testo L. 214/2023 art. 10 c.2](https://www.reteambiente.it/normativa/52056/legge-30-dicembre-2023-n-214); [DPCM All. B](https://www.medicoeleggi.com/argomenti00/italia9/16620.htm)
- Il MIMIT, nella sua rivista tecnica (n. 71, 2026), conferma: "Legge n. 214 del 30 dicembre 2023 … l'Articolo 10 … innalzamento del valore di attenzione e dell'obiettivo di qualità … da 6 V/m a 15 V/m". L'articolo spiega la logica del "limite assentibile" e dell'"equa ripartizione" tra operatori — [MIMIT, Rivista 71/2026](https://www.mimit.gov.it/images/stories/digitale/Rivista/Rivista_71_2026/06_-_La_nuova_normativa_sui_campi_elettromagnetici_in_Italia_un_paradigma_di_sostenibilit%C3%A0_per_levoluzione_delle_reti_mobili.pdf)
- Le FAQ MIMIT 2024 spiegano come calcolare il limite assentibile per ciascun richiedente a 15 V/m, tenendo conto degli altri operatori presenti sul sito — [MIMIT FAQ 2024 CEM](https://www.mise.gov.it/images/stories/documenti/FAQ_2024_campi_elettromagnetici_CCE.pdf) (citata dalla ricerca; ho letto solo lo snippet)
- Ci sono date discordanti nelle fonti secondarie (legge "del 30" o "del 31 dicembre 2023"). Il testo ufficiale riporta "Legge 30 dicembre 2023, n. 214" — [ReteAmbiente](https://www.reteambiente.it/normativa/52056/legge-30-dicembre-2023-n-214)
- RomaToday (27/09/2024) scrive che la legge "lo scorso aprile ha alzato … il limite di emissioni da 6 a 16 volte al metro". Il "16" è un refuso (il valore corretto è 15 V/m) e il testo confonde "limite" con "valore di attenzione" — [RomaToday](https://www.romatoday.it/politica/regolamento-antenne-campidoglio-approva-delibera.html). Esempio utile di disinformazione da correggere nell'app.

**Come si misura (DL 179/2012, art. 14 c.8, conv. L. 221/2012)**
- Valori di attenzione e obiettivi di qualità si rilevano a 1,5 m dal piano di calpestio, come media nell'arco delle 24 ore. Il DPCM originale prevedeva invece la media su 6 minuti. Si applicano dentro edifici abitativi con permanenze continuative non inferiori a 4 ore al giorno, e nelle pertinenze esterne abitabili (balconi, terrazzi, cortili). Sono esclusi tetti e lastrici solari — [Testo aggiornato DL 179/2012, AgID](https://www.agid.gov.it/sites/agid/files/2024-05/dl-18-ottobre-2012-n.179_0.pdf); [Corecom Lazio](https://corecom.regione.lazio.it/app/uploads/www.corecomlazio.it/1954-campi-elettromagnetici-i-nuovi-limiti-applicabili-a-radio-e-tv.html); [Lopresto, CNI 2025](https://www.cni.it/images/eventi/2025/Lopresto_Revisione_limiti_CEM-AF.pdf)
- Tecniche di misura: norma CEI 211-7. Calcolo previsionale: CEI 211-10, su valori mediati nelle 24 ore con fattori di riduzione della potenza massima. Le linee guida ISPRA-ARPA sono state approvate con DM Ambiente 2/12/2014 e DM 7/12/2016 (pertinenze esterne) — [AgID, DL 179/2012](https://www.agid.gov.it/sites/agid/files/2024-05/dl-18-ottobre-2012-n.179_0.pdf); [ReteAmbiente, DM 7/12/2016](https://www.reteambiente.it/normativa/28097)

**Procedure autorizzative (Codice comunicazioni elettroniche)**
- Il D.Lgs. 259/2003 è stato sostituito integralmente dal D.Lgs. 8 novembre 2021 n. 207, che recepisce la direttiva (UE) 2018/1972. Gli articoli sono rinumerati: l'art. 44 (ex 87) riguarda i nuovi impianti radioelettrici, l'art. 45 (ex 87-bis) le procedure semplificate — [Formez, webinar 1/3/2022](https://eventipa.formez.it/sites/default/files/allegati_eventi/10%20-%2001-03-2022%20-%20Puggioni%20Slide%20webinar.pdf)
- Art. 44 c.10: l'istanza si intende accolta se entro 90 giorni perentori non arriva un diniego o un parere negativo dell'organismo di controllo (l'ARPA, ex art. 14 L. 36/2001) — [Formez](https://eventipa.formez.it/sites/default/files/allegati_eventi/10%20-%2001-03-2022%20-%20Puggioni%20Slide%20webinar.pdf); [Comune di Asti, scheda procedimento](https://trasparenza.comune.asti.it/archivio/asti.etrasparenza2.it/archivio16_procedimenti_0_41709_25_1.html)
- Art. 44 c.11: le opere vanno realizzate entro 12 mesi dall'autorizzazione o dal silenzio-assenso. Gli operatori comunicano l'attivazione all'ente locale e all'ARPA entro 15 giorni. Chi presenta l'istanza versa un contributo per il parere ambientale ARPA — [bosettiegatti, D.Lgs. 259/2003 testo vigente con modifiche 207/2021 e 48/2024](https://www.bosettiegatti.eu/info/norme/statali/2003_0259.htm)
- Il D.Lgs. 48/2024 prevede una semplice comunicazione a Comune e ARPA, con autocertificazione, per impianti con potenza al connettore ≤ 10 W e superficie radiante ≤ 0,5 m². Le pratiche vanno presentate tramite il portale SUAP/SUE. In conferenza di servizi resta il silenzio-assenso a 60 giorni, e un parere negativo ARPA reso nei termini può chiudere la conferenza con esito negativo — [Comune di Val della Torre, nota su D.Lgs. 48/2024](https://hosting.pa-online.it/001284/su_news/d-lgs-24-marzo-2024-n-48-modifiche-al-codice-delle-comunicazioni-elettroniche)
- Un esempio di guida comunale (Piemonte, quindi da usare solo come schema): istanza di autorizzazione per potenza in singola antenna > 20 W; SCIA per ≤ 20 W e per modifiche o aggiunte di tecnologie su infrastrutture esistenti — [Comune di Saluggia, guida](https://comune.saluggia.vc.it/wp-content/uploads/sites/79/2024/09/PRCC-2018-00039-A5.pdf)

**Legge quadro 36/2001 (articoli da citare)**
- Art. 4 c.2: limiti, valori di attenzione e obiettivi di qualità sono fissati con DPCM (richiamato dall'art. 10 della L. 214/2023) — [ReteAmbiente](https://www.reteambiente.it/normativa/52056/legge-30-dicembre-2023-n-214)
- Art. 7 c.1: istituisce il catasto nazionale delle sorgenti nell'ambito del SINA — [Arcube](https://www.arcube.eu/un-catasto-nazionale-per-le-sorgenti-elettromagnetiche)
- Art. 8 c.6: base del regolamento comunale di Roma, il cui titolo cita espressamente "art. 8, comma 6, della legge n. 36 del 22 febbraio 2001" — [DAC 78/2024](https://www.comune.roma.it/web-resources/cms/documents/Deliberazione_Assemblea_Capitolina_n._782024.pdf)
- Art. 14: controlli affidati alle ARPA — [Formez](https://eventipa.formez.it/sites/default/files/allegati_eventi/10%20-%2001-03-2022%20-%20Puggioni%20Slide%20webinar.pdf)

### Inferences
- La L. 214/2023 è entrata in vigore a fine dicembre 2023. Con il termine di 120 giorni, il valore provvisorio di 15 V/m è operativo da fine aprile 2024. Questo è coerente con RomaToday, che parla di "lo scorso aprile" in un articolo di settembre 2024.
- Nell'app, il confronto "misura vs limite" va fatto con due soglie. Contro 15 V/m (valore di attenzione) si confronta la media su 24 ore, dentro gli edifici o nelle pertinenze. Contro 20 V/m (limite di esposizione) si confronta qualunque misura nella banda 3 MHz–3 GHz. Mostrare anche il vecchio 6 V/m ha senso solo come riferimento storico.

### Gaps
- Non ho verificato se a novembre 2026 sia stato adottato il DPCM o regolamento definitivo previsto dal comma 1 (che renderebbe superato il regime "provvisorio" del comma 2). Il MIMIT cita un "DM criteri limite emissivo" ([PDF](https://www.mimit.gov.it/images/stories/digitale/4.1_DM_criteri_limite_emissivo_signed.pdf)) che non ho potuto leggere (PDF compresso). Da controllare su normattiva.it.
- I risultati di ricerca citano un "Regolamento (UE) 2025/2650" sui limiti tra 100 kHz e 300 GHz ([certifico](https://www.certifico.com/ambiente/legislazione-ambiente/legislazione-emc/adeguamento-limiti-esposizione-emc-a-frequenze-tra-100-khz-e-300-ghz)). Non l'ho verificato e potrebbe riguardare prodotti o norme armonizzate, non l'esposizione della popolazione. Non usarlo senza controllo.
- Non ho verificato sul testo vigente il termine esatto per il parere ARPA nell'art. 44 c.5 (secondo alcune fonti 30 giorni).

---

## 2. Chi fa cosa e quali dati esistono a livello nazionale (ISPRA, CEN, MIMIT, AGCOM, Infratel, dati.gov.it)

### Takeaway
A livello nazionale non esiste un dataset aperto con le coordinate delle SRB di Roma. ISPRA pubblica numeri aggregati per regione (Annuario, Osservatorio CEM, dashboard Superset). Il Catasto Elettromagnetico Nazionale (CEN) e il nuovo "Catasto delle sorgenti radiomobili" del MIMIT (DD 9/12/2024) sono strumenti per le amministrazioni, senza accesso pubblico documentato. AGCOM e Infratel pubblicano mappe di copertura, non di impianti. Su dati.gov.it ci sono dataset SRB georeferenziati (CC BY 4.0) per altre regioni e comuni, ma nulla per Lazio o Roma.

### Cited Findings
**Ruoli**
- ARPA: parere tecnico preventivo sui progetti, controlli e misure (art. 14 L. 36/2001), riceve le comunicazioni di attivazione. Comuni e SUAP: titolo autorizzativo. Operatori: istanza, comunicazioni, invio dei dati al catasto — [Formez](https://eventipa.formez.it/sites/default/files/allegati_eventi/10%20-%2001-03-2022%20-%20Puggioni%20Slide%20webinar.pdf); [bosettiegatti D.Lgs. 259/2003](https://www.bosettiegatti.eu/info/norme/statali/2003_0259.htm)
- La L. 214/2023 modifica l'art. 4 c.1 lett. b) della L. 36/2001: "il Ministro delle imprese e del made in Italy" entra nel procedimento per l'alta frequenza, insieme al Ministro della salute — [Astrid, testo L. 214/2023](https://www.astrid-online.it/static/upload/___-/0002/___-atto-completo-___8.pdf)
- ISPRA gestisce l'Osservatorio CEM (dati raccolti dalle ARPA/APPA) e pubblica il CEN e dashboard tematiche — [ISPRA, banche dati agenti fisici](https://www.isprambiente.gov.it/it/banche-dati/banche-dati-folder/agenti-fisici)

**ISPRA / Osservatorio CEM (dati aggregati)**
- Dashboard SRB: https://superset.isprambiente.it/superset/dashboard/28fcc11b-40b8-4c01-ae90-9057bb69e7cd/?permalink_key=gdb0O6KwqjJ ; dashboard RTV: https://superset.isprambiente.it/superset/dashboard/8b4bb35c-ad4e-469c-bee8-9d55d2c865a1/?permalink_key=2E50VpKvbj6 ; story map "Sorgenti elettromagnetiche e territorio": https://sinacloud.isprambiente.it/portal/apps/storymaps/stories/70a8a504ecb44136ade16df6d9ade255 ; portale https://agentifisici.isprambiente.it/ — [ISPRA](https://www.isprambiente.gov.it/it/banche-dati/banche-dati-folder/agenti-fisici)
- Dati 2023 (elaborazione ISPRA su dati ARPA/APPA): Lazio 4.558 siti SRB e 9.031 impianti SRB; Italia 44.271 siti, 291.773 servizi, 61.579 impianti — [ARPA Lazio, Impianti RF CEM 2024 (nov. 2025), Tab. 1](https://www.arpalazio.it/documents/20124/51651/IMPIANTI_RF_CEM_2024.pdf)

**Catasti (CEN e catasto MIMIT)**
- Il CEN è stato istituito con DM 13 febbraio 2014 e si appoggia ai catasti regionali (CER) — [SNPA, nov. 2025](https://www.snpambiente.it/notizie/temi/campi-elettromagnetici/catasto-delle-sorgenti-elettromagnetiche-nel-lazio-arpa-presenta-agli-operatori-la-nuova-piattaforma/); [Arpae Ecoscienza 4/2019](https://arpae.it/it/ecoscienza/numeri-ecoscienza/anno-2019/numero-4-2019/campi-elettromagnetici/e-in-via-di-realizzazione-il-catasto-nazionale-cem)
- La Fondazione Ugo Bordoni descrive il CEN come un progetto "in corso", commissionato da MIMIT-DGTEL, che serve a dare "al Ministero" visibilità dei dati di esposizione. Non si parla di accesso pubblico né di un portale — [FUB, scheda CEN](https://www.fub.it/progetti/catasto-elettromagnetico-nazionale-cen)
- Il DD MIMIT 9/12/2024 (GU n. 295 del 17/12/2024) disciplina il "Catasto delle sorgenti radiomobili" tenuto dall'ISCTI. Gli operatori inviano i dati dei siti nuovi e aggiornano quelli esistenti ogni trimestre, via PEC, nel formato dell'allegato. Abroga i DM del 22/7/2003 e del 27/11/2003. La pagina non dice nulla sull'accesso pubblico — [MIMIT, DD 9/12/2024](https://www.mimit.gov.it/it/normativa/decreti-direttoriali/decreto-direttoriale-9-dicembre-2024-catasto-delle-sorgenti-radiomobili); [testo PDF](https://www.mimit.gov.it/images/stories/normativa/decreto_mimit_AOO_DCT_09-12-2024.pdf)

**AGCOM**
- La Broadband Map (https://maps.agcom.it) mappa le reti di accesso fisse, FWA e mobili, con dati aggregati anche su griglie INSPIRE da 100 m o 1 km — [AGCOM, presentazione](https://www.to.camcom.it/sites/default/files/pid/Milan_20nov_v1.pdf)
- La "visura" (https://geo.agcom.it/visura) restituisce per indirizzo il "Numero infrastrutture di rete mobile 4G / 5G / 5G DSS" e la data di aggiornamento del database di rete mobile, ai sensi dell'art. 22 del Codice — [BBmap AGCOM, visura](https://geo.agcom.it/visura)
- Il 16/10/2026 AGCOM ha annunciato un progetto di potenziamento della Broadband Map — [Facile.it](https://www.facile.it/adsl/news/broadband-map-novita-agcom-verificare-copertura.html) (fonte secondaria)

**Infratel / Piano Italia 5G**
- Infratel pubblica le mappature delle reti mobili (aree non coperte o sotto i 30 Mbps al 2026), un WebGIS e una Data Room — [Infratel, home](http://www.infratelitalia.it/home); [MondoMobileWeb](https://www.mondomobileweb.it/313696-infratel-italia-come-funziona-la-mappa-interattiva-su-copertura-reti-mobili-4g-e-5g) (secondaria)
- Il Piano Italia 5G Backhauling prevede di collegare in fibra oltre 9.000 SRB esistenti in aree a fallimento di mercato. Lavori da chiudere entro il 30/06/2026, dati di avanzamento "SRB collegabili al 31/01/2026" — [Connetti Italia](https://connetti.italia.it/it/piano/5g-bh). La mappa dei siti per lotto (Lotto 4 comprende il Lazio) è su https://pianoitalia5g.fibercop.com — [FiberCop](https://pianoitalia5g.fibercop.com)

**dati.gov.it**
- La ricerca "stazioni radio base" su CKAN dà 69 risultati. Tra questi: "Stazioni radio base", Comune di Arezzo/Regione Toscana (SHP, GeoJSON, KML, GML; CC BY 4.0); "Stazioni radio base e antenne Messina" (SHP, GeoJSON, CSV; CC BY 4.0); "Radiazioni - Impianti di telefonia mobile", ARPA FVG (CSV, JSON; CC BY 4.0); catasti SRB della Sardegna (SHP; CC BY 4.0). Nei risultati visibili non c'è nulla per Lazio o Roma — [API CKAN dati.gov.it](https://www.dati.gov.it/opendata/api/3/action/package_search?q=stazioni%20radio%20base&rows=20)
- Altri modelli regionali utili come benchmark: [Arpae Emilia-Romagna, dataset SRB CSV CC-BY](https://dati.arpae.it/dataset/campi-elettromagnetici-stazioni-radio-base); [ARPAV, SRB attive](https://www.arpa.veneto.it/temi-ambientali/agenti-fisici/radiazioni-non-ionizzanti/dati/stazioni-radiobase-attive-del-veneto); [ARPAT, impianti di radiocomunicazione con misure](https://www.arpat.toscana.it/impianti-di-radiocomunicazione); [ARPA Umbria NIR](https://apps.arpa.umbria.it/nir)

### Inferences
- Per Roma non c'è una fonte nazionale con le posizioni dei singoli impianti che sia pubblica e scaricabile. Le fonti nazionali servono per contesto (densità, trend, copertura), non per il layer dei siti.
- I dataset di Arezzo, Messina, FVG ed Emilia-Romagna sono un buon modello di schema (campi, licenza) da proporre a Roma Capitale e ARPA Lazio come output "advocacy" della sfida.

### Gaps
- Non ho verificato granularità, export ed eventuali API delle dashboard Superset ISPRA (pagine JavaScript, non leggibili con fetch).
- Non è chiaro se il catasto MIMIT (DD 9/12/2024) o il CEN prevedano una consultazione pubblica. Nessuna fonte trovata lo afferma.
- Non ho verificato se la Data Room Infratel contenga posizioni di SRB in formato aperto.

---

## 3. Livello regionale: ARPA Lazio e Regione Lazio

### Takeaway
ARPA Lazio pubblica dati aggregati: densità SRB per comune (XLSX), conteggi di pareri e controlli per provincia (XLSX), report annuali "Impianti RF CEM" (PDF), mensili PDF della centralina di via Boncompagni (Roma, agosto 2021–giugno 2022). Non pubblica le coordinate delle SRB né i risultati delle singole misure. Il catasto regionale è in fase di avvio con la piattaforma NirWeb/NirGis, operativa per gli operatori da aprile 2026 con accesso autenticato. Non risultano dataset CEM su dati.lazio.it né servizi WMS dedicati. Il cittadino può chiedere una misura scrivendo ad ARPA Lazio via PEC.

### Cited Findings
**Pagina dati ARPA Lazio** — https://www.arpalazio.it/ambiente/elettromagnetismo/dati-elettromagnetismo
- Densità SRB: mappa PDF https://www.arpalazio.it/documents/20124/49537/densita_cem.pdf e dati XLSX https://www.arpalazio.it/documents/20124/49537/Densita_impianti_telefonia_mobile.xlsx — [ARPA Lazio, Dati](https://www.arpalazio.it/ambiente/elettromagnetismo/dati-elettromagnetismo)
- Impianti TV: localizzazione PDF https://www.arpalazio.it/documents/20124/49537/ImpiantiTV.pdf e anagrafica XLSX https://www.arpalazio.it/documents/20124/49537/ImpiantiTV.xlsx. Impianti radio: PDF https://www.arpalazio.it/documents/20124/49537/ImpiantiRadio.pdf e anagrafica RAR https://www.arpalazio.it/documents/20124/49537/ImpiantiRadio.rar — [ARPA Lazio, Dati](https://www.arpalazio.it/ambiente/elettromagnetismo/dati-elettromagnetismo)
- Pareri e controlli CEM 2020-2025: https://www.arpalazio.it/documents/20124/154891/Pareri_controlli_cem_2020_2025.xlsx. Ho letto il contenuto: un unico foglio con dati aggregati per provincia (Frosinone, Latina, Rieti, Roma, Viterbo, Totale Lazio), indicatori "PARERI RILASCIATI al 31/12 (Alta Frequenza)" e "ESPOSTI EVASI al 31/12", "Data aggiornamento: dicembre 2025". Nessuna coordinata — [file ARPA Lazio](https://www.arpalazio.it/documents/20124/154891/Pareri_controlli_cem_2020_2025.xlsx)
- Monitoraggio continuo della stazione di via Boncompagni 101 (Roma): report mensili PDF da agosto 2021 a giugno 2022, per esempio https://www.arpalazio.it/documents/20124/154891/Monitoraggio+CEM+Boncompagni+202206.pdf — [ARPA Lazio, Dati](https://www.arpalazio.it/ambiente/elettromagnetismo/dati-elettromagnetismo)
- La pagina non ha WebGIS né indicazioni di licenza o aggiornamento. La sezione Open Data di ARPA Lazio (https://www.arpalazio.it/web/guest/open-data) rimanda a 6 dataset su dati.lazio.it (aria, meteo, radioattività), nessuno sui CEM — [ARPA Lazio, Open Data](https://www.arpalazio.it/web/guest/open-data)
- L'API CKAN di dati.lazio.it con q=elettromagnetici restituisce 0 dataset (13/11/2026) — [dati.lazio.it API](https://dati.lazio.it/api/3/action/package_search?q=elettromagnetici)

**Numeri per Roma (report annuale)**
- Anno 2024, provincia di Roma: 3.678 siti SRB e 116 siti RTV, su un totale Lazio di 4.973 SRB e 322 RTV. Fonte ISPRA, Annuario dei dati ambientali 2024. Documento ARPA Lazio di novembre 2025 — [ARPA Lazio, Impianti RF CEM 2024](https://www.arpalazio.it/documents/20124/51651/IMPIANTI_RF_CEM_2024.pdf)
- Serie storica: [2018](https://www.arpalazio.it/documents/20124/51651/Impianti_RF_CEM_2018.pdf), [2021](https://www.arpalazio.it/documents/20124/51651/IMPIANTI_RF_CEM_2021.pdf), [2023](https://www.arpalazio.it/documents/20124/51651/IMPIANTI_RF_CEM_2023.pdf). Il 2018 riporta 4.137 siti SRB nel Lazio, ma le annate non sono del tutto confrontabili e alcune tabelle avvertono che i dati non coprono tutto il territorio — sintesi della ricerca sui PDF ARPA Lazio citati (verificato in parte)
- Un post Facebook di ARPA Lazio parla di 9.317 SRB "sparse su 344 comuni". Non è datato nello snippet, e probabilmente conta impianti, non siti — [Facebook ARPA Lazio](https://www.facebook.com/arpalazio/posts/vi-chiedevate-quante-antenne-di-telefonia-mobile-stazioni-radio-base-srb-ci-sono/10164807513595372) (da verificare)

**Catasto regionale (CER) – NirWeb/NirGis**
- Il 14/11/2025 ARPA Lazio ha presentato a TIM, Vodafone, WindTre, Iliad e Zefiro la piattaforma NirWeb/NirGis. Prima di presentare la pratica previsionale, l'operatore deve inserire la scheda tecnica dell'impianto e allegare la ricevuta NirWeb. È operativa da aprile 2026, con accesso tramite OTP. Il database segue lo schema del DM 13/2/2014 e una routine invia i dati al CEN. Si auspica una DGR o un protocollo d'intesa per formalizzarla. Non si parla di pubblicazione al pubblico — [SNPA, 20/11/2025](https://www.snpambiente.it/notizie/temi/campi-elettromagnetici/catasto-delle-sorgenti-elettromagnetiche-nel-lazio-arpa-presenta-agli-operatori-la-nuova-piattaforma/)
- La DGR Lazio n. 1136 del 7/12/2022 richiama il finanziamento dell'aggiornamento del catasto regionale delle sorgenti — [Regione Lazio, DGR 1136/2022](https://regione.lazio.it/sites/default/files/documentazione/BIL-DGR-1136-07-12-2022.pdf) (sintesi della ricerca)

**Rete di monitoraggio**
- La stazione pilota in via Boncompagni segue il 5G a Roma con andamenti giornalieri, settimanali e mensili. Una seconda centralina è stata installata al Dipartimento di ingegneria elettronica dell'Università di Tor Vergata (accordo quadro con il CNIT) — [ARPA Lazio, news Tor Vergata](https://www.arpalazio.it/en/aggiornamenti/-/asset_publisher/Ix28jmeJZ2I8/blog/id/159634); [SNPA, seconda centralina](https://www.snpambiente.it/snpa/arpa-lazio/monitoraggio-campi-elettromagnetici-arpa-lazio-attiva-una-seconda-centralina/)
- Il rapporto ARPA Lazio "Rapporto CEM" (non datato, dell'epoca APQ8) descrive i compiti di ARPA: pareri preventivi, controlli ispettivi su richiesta di enti, autorità giudiziarie, associazioni e cittadini, campagne mirate — [ARPA Lazio, Rapporto CEM](https://www.arpalazio.it/documents/20124/110371/Rapporto+CEM.pdf)

**SIRA Lazio (sistema informativo ambientale)**
- Le FAQ ARPA dicono che sul SIRA (https://sira.arpalazio.it) "sono presenti mappe con la distribuzione degli impianti di telefonia mobile (SRB)" e RTV — [ARPA Lazio FAQ](https://www.arpalazio.it/en/servizi/faq)
- La sezione Cartografia del SIRA (https://sira.arpalazio.it/web/guest/cartografia) offre PDF/TIFF/JPEG e vettoriali GeoPackage (GPKG) per matrice, con accesso WebDAV. Non indica la licenza ("relative limitazioni d'uso"). La pagina non cita espressamente i CEM — [SIRA Cartografia](https://sira.arpalazio.it/web/guest/cartografia)

**Richiesta di misura da parte del cittadino**
- Si invia una richiesta formale di sopralluogo ad "ARPA Lazio, Dipartimento pressioni sull'ambiente, Sezione provinciale di …" via PEC o fax. Può farla solo il proprietario, l'affittuario o un suo rappresentante (per esempio l'amministratore di condominio), non per un immobile che si vuole acquistare. Il verbale viene rilasciato sul posto. Il rapporto di prova va al Comune e al richiedente su richiesta. I superamenti confermati vanno alla Regione per la riduzione a conformità. ARPA "non ha alcuna competenza" per impedire un impianto oltre al parere tecnico — [ARPA Lazio FAQ](https://www.arpalazio.it/en/servizi/faq)
- Il sito non pubblica le misure fatte per enti o cittadini. Pubblica solo il numero di pareri e controlli e le mappe degli impianti tramite SIRA — [ARPA Lazio FAQ](https://www.arpalazio.it/en/servizi/faq)
- Recapiti: PEC direzione.centrale@arpalazio.legalmailpa.it; URP https://www.arpalazio.it/web/guest/urp — [ARPA Lazio, Dati](https://www.arpalazio.it/ambiente/elettromagnetismo/dati-elettromagnetismo)

**Normativa regionale**
- Il Regolamento regionale Lazio 21 febbraio 2001 n. 1 riguarda gli impianti radioelettrici. Definisce obiettivi di qualità, procedure di certificazione ARPA e competenze di risanamento. Fa riferimento al DM 381/1998, quindi è precedente alla L. 36/2001 attuata e al DPCM 2003 — [Regione Lazio, RR 1/2001 testo coordinato](https://www.regione.lazio.it/regolamenti-regionali-testo-coordinato/regolamento-regionale-21-febbraio-2001-n-1/14052021)
- Secondo il "Rapporto CEM" di ARPA Lazio, la Regione stava preparando una "Norma concernente gli impianti radioelettrici … fino a 300 GHz e gli elettrodotti" — [ARPA Lazio, Rapporto CEM](https://www.arpalazio.it/documents/20124/110371/Rapporto+CEM.pdf). Non ho trovato conferma che sia stata approvata.

### Inferences
- Per un layer "misure" a Roma le uniche serie pubbliche sono i PDF di Boncompagni (2021-2022): un solo punto, già vecchio. Le misure puntuali di ARPA esistono ma non sono pubblicate, e si possono ottenere solo con accesso civico (FOIA) o tramite un accordo.
- Il catasto NirWeb, operativo da aprile 2026, è la fonte più promettente per una futura base dati completa dei siti. Va chiesta ad ARPA Lazio e Regione una release open (anche a precisione ridotta).

### Gaps
- Non ho potuto aprire la cartella GPKG del SIRA per capire se contiene un layer SRB (posizioni, CRS). È da verificare a mano su https://sira.arpalazio.it/web/guest/cartografia e https://sira.arpalazio.it/web/guest/reti-di-monitoraggio/agenti-fisici.
- Non so se i monitoraggi di Boncompagni e Tor Vergata dopo giugno 2022 siano pubblicati altrove.
- Non ho verificato colonne e livello di dettaglio (per comune?) di Densita_impianti_telefonia_mobile.xlsx.
- Non ho trovato una legge regionale del Lazio sui CEM più recente del RR 1/2001.

---

## 4. Roma Capitale: regolamento, siti sensibili, uffici, pubblicità delle istanze

### Takeaway
Il regolamento vigente è quello approvato con Deliberazione dell'Assemblea Capitolina n. 78 del 27/09/2024, "Regolamento per la localizzazione, l'installazione e la modifica degli impianti di telefonia mobile e tecnologie assimilabili". Sostituisce la DAC 26/2015. Dall'8/11/2024 le nuove istanze passano alla Direzione SUAP del Dipartimento Sviluppo Economico e Attività Produttive. I siti sensibili sono individuati "in formato georeferenziato" nell'Allegato A. Il Comune non pubblica un catasto: pubblica avvisi e elenchi delle istanze (PDF o pagine web, per Municipio) con indirizzo, operatore, tipo di intervento e spesso lat/long. È di fatto l'unica fonte ufficiale con coordinate a livello di singolo impianto, ma è parziale e "sporca".

### Cited Findings
**Regolamento**
- DAC n. 78 del 27/09/2024, PDF di 61 pagine: https://www.comune.roma.it/web-resources/cms/documents/Deliberazione_Assemblea_Capitolina_n._782024.pdf. Il titolo cita "art. 8, comma 6, della legge n. 36 del 22 febbraio 2001". L'Allegato A è composto da Elaborato 0 (Relazione), Tavola 1.a (Ambito territoriale comunale), Elaborato 1.b (Elenco dei Siti Sensibili) e 15 tavole, da 1.01 a 1.15, una per Municipio — [DAC 78/2024](https://www.comune.roma.it/web-resources/cms/documents/Deliberazione_Assemblea_Capitolina_n._782024.pdf)
- Art. 4 "Divieto di installazione": le localizzazioni devono minimizzare l'esposizione nei siti sensibili, "definiti ed individuati in modo specifico ed in formato georeferenziato negli elaborati allegati … (Allegato A)". È vietato installare su ospedali, case di cura, RSA, case di riposo, centri diurni e residenziali, orfanotrofi, asili nido pubblici e privati, scuole, oratori, parchi gioco e carceri, comprese le pertinenze — [DAC 78/2024](https://www.comune.roma.it/web-resources/cms/documents/Deliberazione_Assemblea_Capitolina_n._782024.pdf); [RomaToday 1/10/2024](https://www.romatoday.it/politica/nuovo-regolamento-antenne-telefonia-mobile-divieti-previsti.html)
- Sono vietate anche le aree con vincoli paesaggistici, culturali, forestali, idrogeologici e naturalistici e le zone a tutela integrale (Caffarella, Appia Antica, Acquedotti). I Municipi possono indicare "aree preferenziali" (nuovo art. 3 c.2 lett. d). Il regolamento favorisce il co-siting e l'uso di strutture esistenti come i pali dell'illuminazione — [RomaToday](https://www.romatoday.it/politica/nuovo-regolamento-antenne-telefonia-mobile-divieti-previsti.html); [DAC 78/2024](https://www.comune.roma.it/web-resources/cms/documents/Deliberazione_Assemblea_Capitolina_n._782024.pdf)
- Il regolamento non prevede distanze minime fisse dai siti sensibili. Il Consiglio di Stato aveva bocciato i 100 m del regolamento 2015 come "limitazione generalizzata". La proposta di un "Piano di localizzazione" è stata respinta: i Dipartimenti l'hanno ritenuta assorbita dall'Allegato A, e la maggioranza non ha accolto gli emendamenti di AVS e M5S. È stato invece respinto il parere contrario sull'aggiornamento dei siti sensibili "senza obbligo di delocalizzazione" degli impianti esistenti — [RomaToday 27/9/2024](https://www.romatoday.it/politica/regolamento-antenne-campidoglio-approva-delibera.html); [DAC 78/2024](https://www.comune.roma.it/web-resources/cms/documents/Deliberazione_Assemblea_Capitolina_n._782024.pdf)
- Il regolamento precedente era la DAC n. 26 del 14/05/2015: https://www.comune.roma.it/web-resources/cms/documents/DAC_n_26_del_14052015.pdf. Il testo "caducato" è qui: https://www.comune.roma.it/web-resources/cms/documents/regol-tel-mobile-caducato.pdf. Gli operatori lo avevano impugnato al TAR e in appello — [Roma Capitale, avviso SRB 2025](https://www.comune.roma.it/web/it/bando-concorso.page?contentId=BEC1313463); [MondoMobileWeb](https://www.mondomobileweb.it/?p=194798) (secondaria); [Abitarearoma, 5/8/2022, abrogazione in Giunta](https://abitarearoma.it/giunta-capitolina-approva-abrogazione-regolamento-per-impianti-di-telefonia-mobile)

**Uffici competenti**
- Dall'8/11/2024 le nuove istanze sono gestite dalla Direzione SUAP del Dipartimento Sviluppo Economico Attività Produttive. L'"Ufficio Stazioni Radio Base" del Dipartimento Programmazione e Attuazione Urbanistica (PAU) chiude solo le pratiche avviate prima di quella data — [Roma Capitale, avviso 6/11/2024](https://www.comune.roma.it/web/it/informazione-di-servizio.page?contentId=IDS1282807)
- Nel catalogo dei rischi del PIAO 2026 compare ancora il procedimento "Autorizzazioni per l'installazione/adeguamento di Stazioni Radio Base", attribuito al Dipartimento Programmazione Urbanistica con rischio "ALTO" — [Roma Capitale, All. 2 Catalogo rischi 2026](https://www.comune.roma.it/web-resources/cms/documents/All_2_Catalogo_rischi_misure_2026_pubblicazione_1_1.pdf)

**Pubblicità delle istanze e partecipazione (art. 7.1 DAC 78/2024)**
- Il SUAP trasmette il progetto al Municipio, che entro 15 giorni pubblica l'istanza sul sito municipale per le osservazioni dei cittadini, "pur senza diffondere i dati caratteristici dell'impianto, salvo che l'operatore … autorizzi". Entro 20 giorni dalla pubblicazione il Municipio può fare osservazioni o opposizioni e indicare localizzazioni alternative. La documentazione completa è consultabile presso il Dipartimento PAU, il SUAP o il Municipio — [Municipio X, Elenco SRB al 31/01/2025 (estratto art. 7.1 c.9-10)](https://www.comune.roma.it/web-resources/cms/documents/Elenco_Stazione_Radio_Base_Anno_20242025__aggiornato_al_31.01.2025.pdf)
- Con il regime 2015 (art. 11 DAC 26/2015) le opposizioni andavano presentate entro 90 giorni dalla domanda — [Roma Capitale, SRB Anno 2025](https://www.comune.roma.it/web/it/bando-concorso.page?contentId=BEC1313463)

**Elenchi pubblicati (fonte ufficiale con coordinate)**
- Dipartimento PAU, "Stazioni Radio Base - Anno 2025": tabella HTML di circa 57 voci con protocollo del Municipio, società richiedente, ubicazione, coordinate (lat/long) e tipo di intervento (Installazione, Modifica, Adeguamento). Pubblicata l'8/1/2025, aggiornata il 23/12/2025. Ci sono coordinate incoerenti, per esempio "41°86'61.11''N" con minuti e secondi oltre 60 — [Roma Capitale, BEC1313463](https://www.comune.roma.it/web/it/bando-concorso.page?contentId=BEC1313463)
- Municipio X, PDF di 19 pagine "Antenne telefonia mobile – Stazioni Radio Base – Elenco Interventi aggiornato al 31/01/2025". Colonne: STAZIONE (codice e nome del sito, per esempio "RX200 (OSTIA LUNGOMARE NORD)"), LOCALIZZAZIONE (indirizzo, Foglio e particella catastale, Lat/Long), GESTORE, TIPOLOGIA, PROT. Le coordinate sono in formati misti: DMS ("41°44' 14.92" N"), decimali ("41.735933 N") e decimali con il simbolo dei gradi sbagliato ("41°734438 N"). Ci sono errori evidenti come "41° 74 69.21"" e "41°46' 80.50"". Compaiono anche le voci "INCREMENTO LIMITI EMISSIVI" — [Municipio X, PDF](https://www.comune.roma.it/web-resources/cms/documents/Elenco_Stazione_Radio_Base_Anno_20242025__aggiornato_al_31.01.2025.pdf)
- Altri elenchi: Municipio X 2024 (https://www.comune.roma.it/web-resources/cms/documents/Elenco_SRB_Anno_2024_aggiornato_al_17102024.pdf), Municipio I 2016-2018 (https://www.comune.roma.it/web-resources/cms/documents/SRB.1_agg.13.09.2018.pdf) — [risultati di ricerca su comune.roma.it](https://www.comune.roma.it/web-resources/cms/documents/Elenco_SRB_Anno_2024_aggiornato_al_17102024.pdf)
- Avvisi singoli nella sezione "Informazioni di servizio", tema impianti tecnologici (https://www.comune.roma.it/web/it/informazioni-di-servizio.page?tem=impianti_tecnologici), circa 7 pagine di risultati. Esempi 2026: modifica SRB in via Ostiense 131/L (Direzione Tecnica Municipio VIII, 8/9/2026, IDS1638101); Iliad in via Ignazio Guidi 88 (20/1/2026, IDS1519089); Vodafone 3RM08536 in via del Serafico (12/1/2026, IDS1513429) — [Roma Capitale, Informazioni di servizio](https://www.comune.roma.it/web/it/informazioni-di-servizio.page?tem=impianti_tecnologici)
- L'API CKAN di dati.comune.roma.it con q=antenne e q=telefonia restituisce 0 dataset (13/11/2026) — [API antenne](https://dati.comune.roma.it/catalog/api/3/action/package_search?q=antenne); [API telefonia](https://dati.comune.roma.it/catalog/api/3/action/package_search?q=telefonia)

**Sviluppi 2025-2026**
- A giugno 2025 il presidente della Commissione capitolina (Riccardo Corbucci) ha annunciato modifiche al regolamento antenne e alle NTA del PRG per i ripetitori. Gli obiettivi: più poteri a Municipi e Soprintendenza, mascheramento degli impianti, un elenco dei ripetitori da condividere con la Soprintendenza. Non sono indicati numero né data di delibera — [Il Post, 23/6/2025](https://www.ilpost.it/2025/06/23/piano-comune-roma-antenne-tetti/)
- La variante 2026 alle NTA del PRG "reintroduce il Piano di localizzazione degli impianti radiomobili", che richiederà un regolamento successivo per individuare le aree preferenziali — [BibLus/ACCA, NTA Roma 2026](https://biblus.acca.it/nta-roma) (fonte secondaria; non ho verificato data e numero della delibera)
- Il Municipio X ha chiesto con una mozione la modifica del regolamento e una valutazione preventiva ARPA degli effetti cumulativi — [RomaToday, Ostia](https://www.romatoday.it/zone/ostia/antenne-telefoniche-municipio-x-chiede-modifica-regolamento.html) (secondaria)
- Il PIAO 2025-2027 prevede un PPP di 25 anni per le infrastrutture mobili (Metro 5G, Outdoor 5G, Wi-Fi, IoT), utile come contesto sullo small-cell — [PIAO 2025-2027](https://www.comune.roma.it/web-resources/cms/documents/PIAO_2025__2027_di_Roma_Capitale.pdf)
- Dato storico (2005 circa): Roma aveva una rete di sensori mobili per l'elettrosmog — [PuntoSicuro](https://www.puntosicuro.it/sicurezza-delle-persone-C-92/elettrosmog-roma-il-primo-comune-italiano-sotto-controllo-AR-5640/). Non ho trovato dati pubblicati da quella rete.

### Inferences
- Il layer "impianti" di Roma si può costruire solo facendo scraping e parsing degli avvisi del Dipartimento PAU e dei 15 Municipi (HTML e PDF), con normalizzazione delle coordinate (DMS e decimali) e geocoding dell'indirizzo come controllo incrociato. Queste fonti coprono le istanze (installazioni e modifiche dal 2015 circa in poi), non lo stock completo degli impianti attivi: in provincia ci sono 3.678 siti secondo ARPA/ISPRA.
- Il layer dei siti sensibili può arrivare dall'Allegato A della DAC 78/2024, che è georeferenziato. Va chiesto in formato vettoriale al Dipartimento PAU, perché online si trova solo nel PDF della delibera.

### Gaps
- Non ho trovato online l'Allegato A (Elaborato 1.b e tavole 1.01-1.15) come file separato o dato vettoriale.
- Non è chiaro se dopo novembre 2024 i Municipi pubblichino in modo uniforme. Ho trovato elenchi solo per Municipi I, II, IV, VIII e X.
- Data, numero e stato di approvazione della variante NTA 2026 non sono verificati su fonte primaria.

---

## 5. Cosa si aspettano i cittadini e la sfida ("impianti, misure, contesto"): cosa è disponibile, lacune, layer credibile

### Takeaway
"Impianti": nessuna fonte pubblica completa. Il meglio disponibile sono gli avvisi comunali e municipali con coordinate (istanze, parziali, dal 2015), da integrare con OpenCelliD (non ufficiale, posizioni stimate delle celle). "Misure": quasi nulla di pubblico a scala urbana, solo i PDF della centralina Boncompagni (2021-22). "Contesto": ricco e affidabile (limiti di legge, procedura, siti sensibili, numeri ARPA/ISPRA, copertura AGCOM e Infratel, come chiedere una misura). Un layer credibile deve dichiarare per ogni punto fonte, data e livello di affidabilità.

### Cited Findings
- Campi disponibili dalle fonti comunali: codice sito dell'operatore, nome del sito, indirizzo, foglio e particella, lat/long, gestore (anche più operatori in co-siting o tower company come INWIT e Cellnex), tipo di intervento, protocollo. I dati tecnici (potenza, altezza, azimut, tecnologia) di regola non si diffondono senza il consenso dell'operatore — [Municipio X PDF](https://www.comune.roma.it/web-resources/cms/documents/Elenco_Stazione_Radio_Base_Anno_20242025__aggiornato_al_31.01.2025.pdf)
- Le tecnologie 4G, 5G e 5G DSS sono disponibili solo come conteggio di infrastrutture per indirizzo sulla visura AGCOM — [BBmap AGCOM](https://geo.agcom.it/visura)
- Le misure puntuali ARPA non sono pubblicate. Sono pubblici solo i conteggi di pareri ed esposti per provincia — [ARPA Lazio FAQ](https://www.arpalazio.it/en/servizi/faq); [Pareri_controlli_cem_2020_2025.xlsx](https://www.arpalazio.it/documents/20124/154891/Pareri_controlli_cem_2020_2025.xlsx)
- Modelli di altre regioni che pubblicano mappa degli impianti con misure: ARPAT ("nel database vengono inoltre riportate le misure di campo elettromagnetico") e ARPA FVG (open data con localizzazione degli impianti e misure RF) — [Toscana Notizie](https://www.toscana-notizie.it/-/arpat-la-mappa-degli-impianti-di-radiocomunicazione); [ARPA FVG](https://www.arpa.fvg.it/temi/temi/campi-elettromagnetici/sezioni-principali/impianti-per-le-telecomunicazioni/)

### Inferences (proposta di layer per la mappa)
- **Layer "Impianti (istanze ufficiali)"**: punti dagli avvisi di Roma Capitale. Attributi: operatore/i, codice sito, indirizzo, tipo di intervento, data e protocollo, URL dell'avviso, qualità della coordinata (originale, corretta o geocodificata), Municipio (spatial join con i confini municipali). Badge "dato ufficiale – istanza, non conferma di attivazione".
- **Layer "Celle stimate (crowdsourcing)"**: OpenCelliD, con tecnologia GSM/UMTS/LTE/NR e operatore (MNC). Badge "non ufficiale – posizione stimata della cella, non del traliccio". Raggruppare le celle vicine per suggerire un possibile sito.
- **Layer "Siti sensibili"**: dall'Allegato A della DAC 78/2024 se ottenuto. In alternativa, dataset di scuole e ospedali (MIUR, Ministero della Salute, OSM) con la dicitura "approssimazione, non l'elenco ufficiale del regolamento". Calcolo in PostGIS (ST_DWithin / KNN `<->`) del sito sensibile più vicino. Le distanze vanno mostrate solo a scopo informativo, perché il regolamento non fissa distanze minime.
- **Layer "Misure"**: punto via Boncompagni (e Tor Vergata) con il valore medio dai PDF, confrontato con 15 V/m (attenzione, media 24 h) e 20 V/m (limite). Spazio per misure richieste ad ARPA tramite FOIA, sempre con data e metodo.
- **Pannello "Contesto"**: limiti di legge spiegati (6 → 15 V/m, cosa vuol dire "media su 24 ore"), iter autorizzativo (SUAP, ARPA, Municipio, 15 + 20 giorni per le osservazioni), come chiedere una misura (PEC ARPA, chi può farlo), conteggi ARPA/ISPRA (3.678 siti SRB in provincia di Roma, 2024), copertura AGCOM e Infratel.
- **Lacune da dichiarare**: niente altezza, potenza o azimut; niente distinzione 4G/5G per sito (solo tramite OpenCelliD); lo stato "attivo" non è confermato; le misure sono quasi assenti. Mostrare queste lacune è parte del valore civico della mappa.

### Gaps
- Non ho trovato un dataset ufficiale di Roma Capitale con scuole e ospedali corrispondente all'Elaborato 1.b. Da cercare su dati.comune.roma.it e nel geoportale capitolino.

---

## 6. Dettagli tecnici per l'overlay (endpoint, formato, CRS, licenza, aggiornamento, accesso programmatico)

### Takeaway
Nessuna fonte su Roma offre WMS, WFS o GeoJSON per gli impianti. Le fonti ufficiali sono HTML e PDF (Comune), XLSX e PDF (ARPA), dashboard (ISPRA, AGCOM). L'unica fonte con API e bulk CSV è OpenCelliD (non ufficiale, CC BY-SA 4.0). In PostGIS conviene salvare tutto in EPSG:4326, con una colonna di provenienza e una di qualità.

### Cited Findings (tabella fonti)
| Fonte | Endpoint / URL | Formato | CRS / coordinate | Licenza | Aggiornamento | Accesso programmatico |
|---|---|---|---|---|---|---|
| Roma Capitale – Dip. PAU, SRB Anno 2025 | https://www.comune.roma.it/web/it/bando-concorso.page?contentId=BEC1313463 | Tabella HTML | Lat/long, tipicamente WGS84 in DMS (non dichiarato), con errori | Non indicata | Aggiornata fino al 23/12/2025 | Scraping HTML — [fonte](https://www.comune.roma.it/web/it/bando-concorso.page?contentId=BEC1313463) |
| Roma Capitale – Avvisi SRB (Municipi e PAU) | https://www.comune.roma.it/web/it/informazioni-di-servizio.page?tem=impianti_tecnologici | Pagine HTML, una per avviso | Indirizzo, a volte coordinate | Non indicata | Continuo (avvisi 2026) | Scraping con paginazione — [fonte](https://www.comune.roma.it/web/it/informazioni-di-servizio.page?tem=impianti_tecnologici) |
| Municipio X – Elenco SRB | https://www.comune.roma.it/web-resources/cms/documents/Elenco_Stazione_Radio_Base_Anno_20242025__aggiornato_al_31.01.2025.pdf | PDF testuale (estraibile) | DMS e decimali misti, errori | Non indicata | Periodico (2024, gen. 2025) | Parsing PDF — [fonte](https://www.comune.roma.it/web-resources/cms/documents/Elenco_Stazione_Radio_Base_Anno_20242025__aggiornato_al_31.01.2025.pdf) |
| DAC 78/2024 + Allegato A (siti sensibili) | https://www.comune.roma.it/web-resources/cms/documents/Deliberazione_Assemblea_Capitolina_n._782024.pdf | PDF (61 pp.) | "Formato georeferenziato" dichiarato, vettoriale non pubblicato | Non indicata | Statico (2024) | No; da chiedere al Dip. PAU — [fonte](https://www.comune.roma.it/web-resources/cms/documents/Deliberazione_Assemblea_Capitolina_n._782024.pdf) |
| ARPA Lazio – Densità SRB | https://www.arpalazio.it/documents/20124/49537/Densita_impianti_telefonia_mobile.xlsx | XLSX + PDF | Aggregato (non puntuale) | Non indicata | Non indicato | Download diretto — [fonte](https://www.arpalazio.it/ambiente/elettromagnetismo/dati-elettromagnetismo) |
| ARPA Lazio – Pareri/controlli CEM | https://www.arpalazio.it/documents/20124/154891/Pareri_controlli_cem_2020_2025.xlsx | XLSX | Per provincia | Non indicata | Annuale (dic. 2025) | Download diretto — [fonte](https://www.arpalazio.it/documents/20124/154891/Pareri_controlli_cem_2020_2025.xlsx) |
| ARPA Lazio – Monitoraggio Boncompagni | https://www.arpalazio.it/documents/20124/154891/Monitoraggio+CEM+Boncompagni+202206.pdf (e mesi precedenti) | PDF mensili | Un solo punto (via Boncompagni 101) | Non indicata | Fermo a giugno 2022 | Parsing PDF — [fonte](https://www.arpalazio.it/ambiente/elettromagnetismo/dati-elettromagnetismo) |
| ARPA Lazio – Report Impianti RF CEM | https://www.arpalazio.it/documents/20124/51651/IMPIANTI_RF_CEM_2024.pdf | PDF | Per provincia | Non indicata | Annuale (nov. 2025 per il 2024) | Manuale — [fonte](https://www.arpalazio.it/documents/20124/51651/IMPIANTI_RF_CEM_2024.pdf) |
| SIRA Lazio – Cartografia | https://sira.arpalazio.it/web/guest/cartografia | PDF/TIFF/JPEG, GeoPackage, WebDAV | Non dichiarato | "Limitazioni d'uso" non specificate | Non indicato | Download e WebDAV (da verificare se c'è il layer SRB) — [fonte](https://sira.arpalazio.it/web/guest/cartografia) |
| ISPRA – Dashboard SRB | https://superset.isprambiente.it/superset/dashboard/28fcc11b-40b8-4c01-ae90-9057bb69e7cd/?permalink_key=gdb0O6KwqjJ | Dashboard Superset | Aggregato | Non indicata | Annuale (Annuario) | Non verificato — [fonte](https://www.isprambiente.gov.it/it/banche-dati/banche-dati-folder/agenti-fisici) |
| AGCOM – BBmap / visura | https://maps.agcom.it ; https://geo.agcom.it/visura | Web app | Per indirizzo; griglie INSPIRE 100 m / 1 km | Non indicata | Periodico | Non documentato — [fonte](https://www.to.camcom.it/sites/default/files/pid/Milan_20nov_v1.pdf) |
| Infratel – Mappature mobile / WebGIS / Data Room | http://www.infratelitalia.it/home | Web app / Data Room | Pixel o aree | Non indicata | Mappatura 2024 (orizzonte 2026) | Data Room (da verificare) — [fonte](http://www.infratelitalia.it/home) |
| OpenCelliD (non ufficiale) | https://opencellid.org (API getInArea; download CSV per paese) | CSV.gz, API JSON | WGS84, posizione stimata della cella | CC BY-SA 4.0 | Giornaliero (daily changes) | Sì, con API key — [licenza](https://docs.opencellid.org/docs/attribution); [glossario](https://docs.opencellid.org/docs/help/glossary) |

### Inferences
- Pipeline consigliata: (1) crawler per gli avvisi di comune.roma.it e i PDF municipali; (2) parser delle coordinate (DMS e decimali, rifiuto dei valori fuori range, minuti o secondi ≥ 60), poi geocoding dell'indirizzo (per esempio Nominatim) come fallback e controllo, flag se lo scarto supera ~200 m; (3) deduplica per codice sito e indirizzo; (4) tabella PostGIS `srb_istanze(geom geometry(Point,4326), operatore text[], codice_sito, indirizzo, tipo_intervento, data, protocollo, fonte_url, qualita_geom)`.
- OpenCelliD va tenuto in una tabella separata e mai fuso con i dati ufficiali, per via della licenza share-alike (CC BY-SA 4.0) e della diversa natura del dato.

### Gaps
- Nessuna delle fonti ufficiali romane dichiara CRS o licenza. Il CRS WGS84 è dedotto dal formato delle coordinate. Per riusarle serve chiarire la licenza: i dati pubblici della PA sono di norma riutilizzabili (D.Lgs. 36/2006, CAD art. 52, "open by default"), ma non ho verificato una licenza esplicita sul portale di Roma Capitale.

---

## 7. Licenze, frequenza di aggiornamento, API

### Takeaway
Per antenne e CEM a Roma non esistono dataset con licenza aperta esplicita (IODL 2.0 o CC BY 4.0): le fonti ufficiali non dichiarano una licenza. Quelle con licenza chiara sono i dataset SRB di altre regioni su dati.gov.it (CC BY 4.0) e OpenCelliD (CC BY-SA 4.0). L'unica API vera è OpenCelliD. I cataloghi CKAN (dati.comune.roma.it, dati.lazio.it, dati.gov.it) hanno API, ma non contengono dataset SRB per Roma.

### Cited Findings
- I dataset SRB pubblicati su dati.gov.it (Arezzo, Messina, ARPA FVG, Sardegna, ARPAT, ARPAV) usano CC BY 4.0 — [API dati.gov.it](https://www.dati.gov.it/opendata/api/3/action/package_search?q=stazioni%20radio%20base&rows=20)
- Arpae Emilia-Romagna: dataset SRB in CSV con licenza Creative Commons Attribution, accessibile anche via API CKAN — [Dati Arpae](https://dati.arpae.it/dataset/campi-elettromagnetici-stazioni-radio-base)
- OpenCelliD: "licensed under CC BY-SA 4.0, including API results, dataset downloads and daily changes". Richiede un'attribuzione esplicita — [OpenCelliD, License and attribution](https://docs.opencellid.org/docs/attribution)
- I cataloghi CKAN di Roma e Lazio rispondono via API (`/api/3/action/package_search`) ma danno 0 risultati per antenne, telefonia ed elettromagnetici — [dati.comune.roma.it API](https://dati.comune.roma.it/catalog/api/3/action/package_search?q=antenne); [dati.lazio.it API](https://dati.lazio.it/api/3/action/package_search?q=elettromagnetici)
- Aggiornamenti: il catasto MIMIT è trimestrale (obbligo per gli operatori, non pubblico) — [MIMIT DD 9/12/2024](https://www.mimit.gov.it/it/normativa/decreti-direttoriali/decreto-direttoriale-9-dicembre-2024-catasto-delle-sorgenti-radiomobili); il report ARPA è annuale — [ARPA Lazio 2024](https://www.arpalazio.it/documents/20124/51651/IMPIANTI_RF_CEM_2024.pdf); gli avvisi comunali escono in continuo — [Roma Capitale](https://www.comune.roma.it/web/it/informazioni-di-servizio.page?tem=impianti_tecnologici)

### Inferences
- In mancanza di una licenza dichiarata, il riuso degli avvisi comunali per un prototipo civico è ragionevole, ma è opportuno citare sempre la fonte e segnalare il tema a Roma Capitale (la sfida è promossa dalla Commissione capitolina competente).

### Gaps
- Non ho verificato la licenza di default di dati.comune.roma.it e dati.lazio.it (in passato IODL 2.0 o CC BY 4.0). Non incide perché i dataset SRB non ci sono.
- Non ho verificato i termini d'uso di SIRA e dei GPKG.

---

## 8. Fonti non ufficiali (DA MARCARE COME NON UFFICIALI)

### Takeaway
OpenCelliD è l'unica fonte non ufficiale con licenza aperta chiara (CC BY-SA 4.0), API e dump. Fornisce posizioni stimate delle celle, non dei tralicci. Mozilla Location Service è stato chiuso nel 2024. beaconDB, il suo successore comunitario, è sperimentale e non ha ancora pubblicato dump. CellMapper ha dati molto dettagliati (bande, settori), ma posizioni stimate e termini d'uso che non ho verificato: usarlo solo come link esterno.

### Cited Findings
- OpenCelliD: "Markers show estimated cell locations, not confirmed tower sites. Multiple cell IDs can belong to the same physical tower". Copre GSM, CDMA, UMTS, LTE e 5G NR, con oltre 55 milioni di celle, ed è gestito da Unwired Labs dal 2017 — [opencellid.org](https://opencellid.org)
- Per ottenere gli ID di cella in un'area serve l'API getInArea con API key. I risultati "describe matching dataset records, not a complete inventory of physical towers". Download e API usano MCC/MNC (l'Italia è MCC 222) — [OpenCelliD, Glossario](https://docs.opencellid.org/docs/help/glossary)
- Mozilla Location Service: a marzo 2024 ne è stato annunciato il ritiro, con archiviazione a luglio 2024 — [Wikipedia, MLS](https://en.wikipedia.org/wiki/Mozilla_Location_Service)
- beaconDB: database "public domain" sperimentale. Per le celle usa come fallback il dump finale di MLS. Promette in futuro dump offuscati sotto pubblico dominio — [beaconDB](https://beacondb.net)
- CellMapper: dati raccolti dagli utenti con l'app Android. Le FAQ ammettono posizioni dei tralicci "way off/in the middle of the water" — [CellMapper FAQ](https://www.cellmapper.net/FAQ)
- Una SRB porta in genere più celle o settori (per esempio 3 settori da 120°). Questo spiega perché le posizioni crowdsourced sono baricentri stimati — [OpenCelliD Community](https://community.opencellid.org/t/difference-between-whats-in-opencellid-and-mozilla-location-service/289) (forum, fonte non autorevole)

### Inferences
- In mappa, le celle di OpenCelliD vanno mostrate come area d'incertezza o cluster, non come "antenna qui". Non vanno incrociate con i siti sensibili per fare affermazioni ("antenna a X metri dalla scuola"), perché l'errore può essere di centinaia di metri.
- OpenCelliD è utile per stimare quali tecnologie (LTE o NR, cioè 4G o 5G) e quali operatori sono presenti in un quartiere, un'informazione che le fonti ufficiali romane non danno.

### Gaps
- Non ho verificato i termini d'uso e la licenza di CellMapper (probabilmente restrittivi, scraping non consentito).
- Non ho verificato copertura e accuratezza di OpenCelliD a Roma (numero di celle LTE e NR).
