// Limiti di legge e quadro normativo da spiegare ai cittadini.
// Ogni voce cita la norma; i testi sono scritti per un pubblico non tecnico.
import { db, log, registraFonte } from "./lib.mts";

const LIMITI = [
  {
    id: "limite_esposizione_3mhz_3ghz", valore: 20, ambito: "Frequenze 3 MHz – 3 GHz (dove lavora la telefonia mobile 2G-5G sotto i 3 GHz)",
    stato: "vigente", riferimento: "DPCM 8 luglio 2003, Allegato B, Tabella 1",
    url: "https://www.bosettiegatti.eu/info/norme/statali/2003_dpcm0807.htm",
    spiegazione: "È il valore massimo che non può mai essere superato, in nessun luogo e in nessun momento. Serve a proteggere dagli effetti acuti accertati.",
  },
  {
    id: "limite_esposizione_3ghz_300ghz", valore: 40, ambito: "Frequenze 3 GHz – 300 GHz (es. 5G sopra i 3 GHz)",
    stato: "vigente", riferimento: "DPCM 8 luglio 2003, Allegato B, Tabella 1",
    url: "https://www.bosettiegatti.eu/info/norme/statali/2003_dpcm0807.htm",
    spiegazione: "Limite di esposizione per le frequenze più alte.",
  },
  {
    id: "valore_attenzione", valore: 15, ambito: "All'interno di edifici dove si sta almeno 4 ore al giorno e loro pertinenze esterne (balconi, terrazzi, cortili); misura a 1,5 m dal pavimento come media sulle 24 ore",
    stato: "vigente_provvisorio", riferimento: "Legge 30 dicembre 2023 n. 214, art. 10 c. 2; DL 179/2012 art. 14 c. 8",
    url: "https://www.reteambiente.it/normativa/52056/legge-30-dicembre-2023-n-214",
    spiegazione: "Misura di cautela per le esposizioni prolungate. Fino ad aprile 2024 era 6 V/m; la legge sulla concorrenza 2022 l'ha portato in via provvisoria e cautelativa a 15 V/m.",
  },
  {
    id: "obiettivo_qualita", valore: 15, ambito: "Aree all'aperto intensamente frequentate; media sulle 24 ore",
    stato: "vigente_provvisorio", riferimento: "Legge 30 dicembre 2023 n. 214, art. 10 c. 2",
    url: "https://www.reteambiente.it/normativa/52056/legge-30-dicembre-2023-n-214",
    spiegazione: "Valore da rispettare nella progettazione dei nuovi impianti per minimizzare l'esposizione. Anch'esso portato da 6 a 15 V/m nel 2024.",
  },
  {
    id: "valore_attenzione_storico", valore: 6, ambito: "Stessi ambiti del valore di attenzione",
    stato: "storico", riferimento: "DPCM 8 luglio 2003, Allegato B, Tabelle 2 e 3 (in vigore fino ad aprile 2024)",
    url: "https://www.bosettiegatti.eu/info/norme/statali/2003_dpcm0807.htm",
    spiegazione: "Il vecchio valore italiano, tra i più bassi d'Europa. Utile per confrontare misure precedenti al 2024.",
  },
];

const RIFERIMENTI = [
  { id: "l_36_2001", livello: "nazionale", titolo: "Legge quadro 22 febbraio 2001 n. 36",
    sintesi: "Legge quadro sulla protezione dalle esposizioni a campi elettromagnetici. Affida i controlli alle ARPA (art. 14), prevede il catasto nazionale delle sorgenti (art. 7) e consente ai Comuni di adottare un regolamento per la localizzazione degli impianti (art. 8 c. 6).",
    url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2001-02-22;36" },
  { id: "dpcm_2003", livello: "nazionale", titolo: "DPCM 8 luglio 2003",
    sintesi: "Fissa limiti di esposizione (20 V/m tra 3 MHz e 3 GHz), valori di attenzione e obiettivi di qualità per gli impianti tra 100 kHz e 300 GHz.",
    url: "https://www.bosettiegatti.eu/info/norme/statali/2003_dpcm0807.htm" },
  { id: "dl_179_2012", livello: "nazionale", titolo: "DL 18 ottobre 2012 n. 179, art. 14",
    sintesi: "Stabilisce come si verificano i valori: a 1,5 m dal piano di calpestio, come media sulle 24 ore, negli ambienti abitativi con permanenza di almeno 4 ore al giorno e nelle pertinenze esterne.",
    url: "https://www.agid.gov.it/sites/agid/files/2024-05/dl-18-ottobre-2012-n.179_0.pdf" },
  { id: "l_214_2023", livello: "nazionale", titolo: "Legge 30 dicembre 2023 n. 214, art. 10",
    sintesi: "Legge annuale sulla concorrenza 2022: in assenza del nuovo decreto entro 120 giorni, porta in via provvisoria e cautelativa valore di attenzione e obiettivo di qualità da 6 a 15 V/m (in vigore da fine aprile 2024). Il limite di esposizione resta 20 V/m.",
    url: "https://www.reteambiente.it/normativa/52056/legge-30-dicembre-2023-n-214" },
  { id: "cce_art44_45", livello: "nazionale", titolo: "Codice delle comunicazioni elettroniche (D.Lgs. 259/2003 come sostituito dal D.Lgs. 207/2021 e modificato dal D.Lgs. 48/2024), artt. 44-45",
    sintesi: "Procedura per i nuovi impianti: istanza al Comune (SUAP) con parere tecnico ARPA; silenzio-assenso dopo 90 giorni. Procedure semplificate per modifiche e piccoli impianti; per impianti fino a 10 W e 0,5 m² basta una comunicazione con autocertificazione.",
    url: "https://www.bosettiegatti.eu/info/norme/statali/2003_0259.htm" },
  { id: "dd_mimit_2024_catasto", livello: "nazionale", titolo: "Decreto direttoriale MIMIT 9 dicembre 2024 – Catasto delle sorgenti radiomobili",
    sintesi: "Gli operatori comunicano ogni trimestre al Ministero i dati dei loro siti. Il catasto non è consultabile pubblicamente.",
    url: "https://www.mimit.gov.it/it/normativa/decreti-direttoriali/decreto-direttoriale-9-dicembre-2024-catasto-delle-sorgenti-radiomobili" },
  { id: "rr_lazio_1_2001", livello: "regionale", titolo: "Regolamento regionale Lazio 21 febbraio 2001 n. 1",
    sintesi: "Regolamento regionale sugli impianti radioelettrici (precedente alla legge quadro attuata). Il nuovo catasto regionale ARPA Lazio (piattaforma NirWeb/NirGis) è operativo per gli operatori da aprile 2026 ma non è pubblico.",
    url: "https://www.regione.lazio.it/regolamenti-regionali-testo-coordinato/regolamento-regionale-21-febbraio-2001-n-1/14052021" },
  { id: "dac_78_2024", livello: "comunale", titolo: "Deliberazione Assemblea Capitolina n. 78 del 27/09/2024 – Regolamento antenne di Roma",
    sintesi: "Regolamento per la localizzazione, l'installazione e la modifica degli impianti di telefonia mobile. Vieta l'installazione su ospedali, case di cura, RSA, asili nido, scuole, oratori, parchi gioco e carceri (art. 4, siti elencati nell'Allegato A) e nelle aree vincolate. Non fissa distanze minime. Sostituisce la DAC 26/2015.",
    url: "https://www.comune.roma.it/web-resources/cms/documents/Deliberazione_Assemblea_Capitolina_n._782024.pdf" },
  { id: "roma_procedura", livello: "comunale", titolo: "Come funziona una richiesta di antenna a Roma",
    sintesi: "Dall'8 novembre 2024 le istanze si presentano alla Direzione SUAP del Dipartimento Sviluppo Economico. Il Municipio pubblica l'istanza sul proprio sito entro 15 giorni; entro 20 giorni dalla pubblicazione può presentare osservazioni o opposizioni e proporre siti alternativi. I cittadini possono inviare osservazioni al Municipio e consultare la documentazione presso SUAP, Dipartimento Urbanistica o Municipio.",
    url: "https://www.comune.roma.it/web/it/informazione-di-servizio.page?contentId=IDS1282807" },
  { id: "arpa_richiesta_misura", livello: "regionale", titolo: "Come chiedere una misura ad ARPA Lazio",
    sintesi: "La richiesta di sopralluogo si invia via PEC ad ARPA Lazio (direzione.centrale@arpalazio.legalmailpa.it), Sezione provinciale di Roma. Può farla il proprietario o l'affittuario dell'immobile o un suo rappresentante (es. amministratore di condominio). Il verbale è rilasciato sul posto; eventuali superamenti vengono segnalati per la riduzione a conformità.",
    url: "https://www.arpalazio.it/en/servizi/faq" },
];

export async function importaNormativa() {
  await registraFonte({
    id: "normativa_cem", titolo: "Quadro normativo CEM (testi di legge citati)", ente: "Normativa nazionale, regionale e comunale",
    url: "https://www.normattiva.it", formato: "Sintesi redazionale con riferimenti", licenza: "CC BY 4.0 (sintesi del progetto)",
    ufficiale: true, note: "Sintesi scritte dal team a partire dai testi ufficiali; ogni voce rimanda alla fonte.",
  }, { n_record: LIMITI.length + RIFERIMENTI.length });
  for (const l of LIMITI) {
    await db.query(
      `INSERT INTO antenne.limiti_normativi (id, grandezza, valore, unita, ambito, stato, riferimento, url, spiegazione)
       VALUES ($1,'campo elettrico',$2,'V/m',$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET valore=EXCLUDED.valore, ambito=EXCLUDED.ambito, stato=EXCLUDED.stato,
         riferimento=EXCLUDED.riferimento, url=EXCLUDED.url, spiegazione=EXCLUDED.spiegazione`,
      [l.id, l.valore, l.ambito, l.stato, l.riferimento, l.url, l.spiegazione],
    );
  }
  for (const r of RIFERIMENTI) {
    await db.query(
      `INSERT INTO antenne.riferimenti_normativi (id, livello, titolo, sintesi, url) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET livello=EXCLUDED.livello, titolo=EXCLUDED.titolo, sintesi=EXCLUDED.sintesi, url=EXCLUDED.url`,
      [r.id, r.livello, r.titolo, r.sintesi, r.url],
    );
  }
  log("normativa", `${LIMITI.length} limiti, ${RIFERIMENTI.length} riferimenti`);
}
