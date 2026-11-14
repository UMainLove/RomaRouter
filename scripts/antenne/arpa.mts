// Dati ARPA Lazio: statistiche ufficiali, punti di monitoraggio CEM e report della centralina di via Boncompagni.
import ExcelJS from "exceljs";
import { db, log, registraFonte, scarica, USER_AGENT, sleep } from "./lib.mts";
import { geocodifica, salvaCache } from "./geocode.mts";

const ARPA = "https://www.arpalazio.it/documents/20124";

function valoreCella(v: unknown): string {
  if (v && typeof v === "object") {
    if ("result" in v) return String((v as { result: unknown }).result ?? "");
    if ("richText" in v) return (v as { richText: { text: string }[] }).richText.map((t) => t.text).join("");
  }
  return String(v ?? "");
}

async function leggiXlsx(url: string, nome: string) {
  const { buf, sha256 } = await scarica(url, nome);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as never);
  const righe: string[][] = [];
  // row.values è un array "bucato" (celle vuote = buchi): Array.from li trasforma in stringhe vuote
  wb.worksheets[0].eachRow((row) => righe.push(Array.from(row.values as unknown[], valoreCella).slice(1)));
  return { righe, sha256 };
}

async function salvaStat(indicatore: string, ambito: string, anno: number | null, valore: number, unita: string, fonteId: string, note?: string) {
  await db.query(
    `INSERT INTO antenne.statistiche (indicatore, ambito, anno, valore, unita, fonte_id, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (indicatore, ambito, anno, fonte_id) DO UPDATE SET valore=EXCLUDED.valore, unita=EXCLUDED.unita, note=EXCLUDED.note`,
    [indicatore, ambito, anno, valore, unita, fonteId, note ?? null],
  );
}

// Densità impianti di telefonia mobile per comune
async function densita() {
  const url = `${ARPA}/49537/Densita_impianti_telefonia_mobile.xlsx`;
  const { righe, sha256 } = await leggiXlsx(url, "arpa_densita_srb.xlsx");
  await registraFonte({
    id: "arpa_densita_srb", titolo: "Numero di impianti di telefonia mobile per comune del Lazio", ente: "ARPA Lazio",
    url, formato: "XLSX", licenza: null, ufficiale: true, note: "File non datato e senza licenza dichiarata; pubblicato nella pagina Dati elettromagnetismo.",
  }, { sha256, n_record: righe.length - 1 });
  await db.query("DELETE FROM antenne.statistiche WHERE fonte_id = 'arpa_densita_srb'");
  let provincia = 0, regione = 0;
  for (const [prov, comune, n] of righe.slice(1)) {
    const v = Number(n);
    if (!Number.isFinite(v)) continue;
    regione += v;
    if (prov === "Roma") provincia += v;
    if (prov === "Roma" && comune === "Roma") await salvaStat("impianti_srb", "comune:Roma", null, v, "impianti", "arpa_densita_srb");
  }
  await salvaStat("impianti_srb", "provincia:Roma", null, provincia, "impianti", "arpa_densita_srb", "somma dei comuni della provincia nel file ARPA");
  await salvaStat("impianti_srb", "regione:Lazio", null, regione, "impianti", "arpa_densita_srb", "somma di tutti i comuni nel file ARPA");
  log("arpa", `densità: Roma comune, provincia ${provincia}, Lazio ${regione}`);
}

// Pareri rilasciati e esposti evasi per provincia, 2020-2025
async function pareri() {
  const url = `${ARPA}/154891/Pareri_controlli_cem_2020_2025.xlsx`;
  const { righe, sha256 } = await leggiXlsx(url, "arpa_pareri_esposti.xlsx");
  await registraFonte({
    id: "arpa_pareri_esposti", titolo: "Campi elettromagnetici: pareri rilasciati (alta frequenza) ed esposti evasi, 2020-2025",
    ente: "ARPA Lazio – Dipartimento Pressioni sull'Ambiente", url, formato: "XLSX", licenza: null, ufficiale: true,
    note: "Dati aggregati per provincia, aggiornamento dicembre 2025. Il 2020 dei pareri è marcato con asterisco nella fonte.",
  }, { sha256 });
  await db.query("DELETE FROM antenne.statistiche WHERE fonte_id = 'arpa_pareri_esposti'");
  let indicatore: string | null = null, colRoma = -1, colLazio = -1, n = 0;
  for (const r of righe) {
    const riga = r.join(" | ");
    if (/PARERI RILASCIATI/i.test(riga)) indicatore = "pareri_alta_frequenza";
    else if (/ESPOSTI EVASI/i.test(riga)) indicatore = "esposti_evasi";
    if (r.some((c) => /Anno di riferimento/i.test(c))) {
      colRoma = r.findIndex((c) => c.trim() === "Roma");
      colLazio = r.findIndex((c) => /Totale Lazio/i.test(c));
      continue;
    }
    const anno = r.map((c) => c.match(/^(20\d{2})\*?$/)?.[1]).find(Boolean);
    if (indicatore && anno && colRoma >= 0) {
      const asterisco = r.some((c) => /^20\d{2}\*$/.test(c)) ? "valore marcato con * nella fonte" : undefined;
      await salvaStat(indicatore, "provincia:Roma", Number(anno), Number(r[colRoma]), "numero", "arpa_pareri_esposti", asterisco);
      if (colLazio >= 0) await salvaStat(indicatore, "regione:Lazio", Number(anno), Number(r[colLazio]), "numero", "arpa_pareri_esposti", asterisco);
      n++;
    }
  }
  await db.query("UPDATE antenne.fonti SET n_record = $1 WHERE id = 'arpa_pareri_esposti'", [n]);
  log("arpa", `pareri/esposti: ${n} anni-indicatore per Roma`);
}

// Siti SRB 2024 dal report annuale (valori letti nel PDF ufficiale, Figura 5)
async function reportAnnuale() {
  const url = `${ARPA}/51651/IMPIANTI_RF_CEM_2024.pdf`;
  const { sha256 } = await scarica(url, "arpa_impianti_rf_cem_2024.pdf");
  await registraFonte({
    id: "arpa_report_rf_cem_2024", titolo: "Impianti RF CEM – anno 2024 (report annuale)", ente: "ARPA Lazio su dati ISPRA – Annuario dati ambientali",
    url, formato: "PDF", licenza: null, ufficiale: true,
    note: "Valori trascritti dalla Figura 5 del report (novembre 2025) e verificati sul testo estratto dal PDF.",
  }, { sha256, n_record: 4 });
  await db.query("DELETE FROM antenne.statistiche WHERE fonte_id = 'arpa_report_rf_cem_2024'");
  await salvaStat("siti_srb", "provincia:Roma", 2024, 3678, "siti", "arpa_report_rf_cem_2024");
  await salvaStat("siti_srb", "regione:Lazio", 2024, 4973, "siti", "arpa_report_rf_cem_2024");
  await salvaStat("siti_rtv", "provincia:Roma", 2024, 116, "siti", "arpa_report_rf_cem_2024", "impianti radio-televisivi");
  await salvaStat("siti_rtv", "regione:Lazio", 2024, 322, "siti", "arpa_report_rf_cem_2024", "impianti radio-televisivi");
  log("arpa", "report 2024: siti SRB e RTV registrati");
}

// Centraline di monitoraggio continuo CEM a Roma
async function monitoraggio() {
  const pagina = "https://www.arpalazio.it/ambiente/elettromagnetismo/dati-elettromagnetismo";
  await registraFonte({
    id: "arpa_monitoraggio_cem", titolo: "Monitoraggio continuo CEM – centraline di Roma", ente: "ARPA Lazio",
    url: pagina, formato: "PDF mensili", licenza: null, ufficiale: true,
    note: "I report mensili mostrano i valori solo in grafici (immagini): il valore numerico non è estraibile e resta NULL. Serie pubblicata: ago 2021 – giu 2022.",
  });
  const punti = [
    { id: "arpa_boncompagni", nome: "Centralina ARPA Lazio – via Boncompagni 101", indirizzo: "via Boncompagni 101",
      descrizione: "Stazione pilota sul lastrico solare della sede ARPA Lazio; segue l'esposizione dovuta alla telefonia mobile (4G/5G).", attivo: "2021-08-01" },
    { id: "arpa_torvergata", nome: "Centralina ARPA Lazio – Università di Tor Vergata", indirizzo: "via del Politecnico 1",
      descrizione: "Seconda centralina presso il Dipartimento di Ingegneria Elettronica (accordo ARPA Lazio – CNIT). Dati non pubblicati online.", attivo: null },
  ];
  for (const p of punti) {
    const g = await geocodifica(p.indirizzo);
    if (!g) { log("arpa", `ATTENZIONE: ${p.indirizzo} non geocodificato`); continue; }
    await db.query(
      `INSERT INTO antenne.punti_monitoraggio (id, nome, gestore, descrizione, attivo_dal, geom, fonte_id)
       VALUES ($1,$2,'ARPA Lazio',$3,$4, ST_SetSRID(ST_MakePoint($5,$6),4326), 'arpa_monitoraggio_cem')
       ON CONFLICT (id) DO UPDATE SET nome=EXCLUDED.nome, descrizione=EXCLUDED.descrizione, attivo_dal=EXCLUDED.attivo_dal, geom=EXCLUDED.geom`,
      [p.id, p.nome, p.descrizione, p.attivo, g.lon, g.lat],
    );
  }
  await salvaCache();

  // Report mensili di via Boncompagni: verifichiamo quali esistono davvero
  let trovati = 0, ultimo: string | null = null;
  for (let d = new Date(Date.UTC(2021, 7, 1)); d <= new Date(Date.UTC(2023, 11, 1)); d.setUTCMonth(d.getUTCMonth() + 1)) {
    const ym = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const url = `${ARPA}/154891/Monitoraggio+CEM+Boncompagni+${ym}.pdf`;
    const res = await fetch(url, { method: "HEAD", headers: { "User-Agent": USER_AGENT } }).catch(() => null);
    await sleep(250);
    if (!res?.ok) continue;
    const inizio = `${ym.slice(0, 4)}-${ym.slice(4)}-01`;
    const fine = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    await db.query(
      `INSERT INTO antenne.misure_cem (punto_id, periodo_inizio, periodo_fine, campo_e_vm, metodo, url_report, note)
       VALUES ('arpa_boncompagni', $1, $2, NULL, 'campo elettrico medio giornaliero, settimanale e orario (grafici)', $3,
               'Valori disponibili solo come grafico nel report PDF')
       ON CONFLICT (punto_id, periodo_inizio) DO UPDATE SET url_report = EXCLUDED.url_report`,
      [inizio, fine, url],
    );
    trovati++; ultimo = fine;
  }
  await db.query("UPDATE antenne.punti_monitoraggio SET ultimo_dato = $1 WHERE id = 'arpa_boncompagni'", [ultimo]);
  await db.query("UPDATE antenne.fonti SET n_record = $1 WHERE id = 'arpa_monitoraggio_cem'", [trovati]);
  log("arpa", `report mensili Boncompagni trovati: ${trovati} (ultimo periodo fino al ${ultimo})`);
}

export async function importaArpa() {
  await densita();
  await pareri();
  await reportAnnuale();
  await monitoraggio();
}
