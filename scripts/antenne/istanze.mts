// Istanze di installazione/modifica delle Stazioni Radio Base pubblicate da Roma Capitale.
// Fonti: tabella "SRB Anno 2025" (Dip. Urbanistica), elenchi PDF del Municipio X, avvisi "Informazioni di servizio".
import * as cheerio from "cheerio";
import { extractText, getDocumentProxy } from "unpdf";
import {
  db, log, registraFonte, scarica, scaricaTesto, pulisci, sleep, estraiOperatori, normalizzaTipoIntervento,
  estraiIndirizzo, aggiornaConteggioFonte,
} from "./lib.mts";
import { interpreta, scegli, distanzaM, dentroRoma } from "./coord.mts";
import { geocodifica, salvaCache } from "./geocode.mts";

const BASE = "https://www.comune.roma.it";

interface Grezzo {
  fonteId: string;
  url: string;
  data: string | null;          // YYYY-MM-DD
  protocollo: string | null;
  municipioFonte: string | null;
  codiceSito: string | null;
  nomeSito: string | null;
  indirizzo: string | null;
  catasto: string | null;
  gestori: string[];
  tipo: string | null;
  regime: string | null;
  latTesto: string | null;
  lonTesto: string | null;
}

// ---------------------------------------------------------------------------
// Utilità
// ---------------------------------------------------------------------------
const MESI: Record<string, string> = {
  gen: "01", feb: "02", mar: "03", apr: "04", mag: "05", giu: "06", lug: "07", ago: "08", set: "09", ott: "10", nov: "11", dic: "12",
};

function dataItaliana(testo: string): string | null {
  const m = testo.match(/\b(\d{1,2})\s+(gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic)[a-z]*\.?\s+(20\d{2})\b/i);
  if (m) return `${m[3]}-${MESI[m[2].toLowerCase()]}-${m[1].padStart(2, "0")}`;
  const n = testo.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (n) return `${n[3]}-${n[2].padStart(2, "0")}-${n[1].padStart(2, "0")}`;
  return null;
}

/** Protocollo in forma canonica PREFISSO/ANNO/NUMERO, così le stesse istanze da fonti diverse coincidono. */
export function normalizzaProtocollo(testo: string | null): string | null {
  if (!testo) return null;
  const m = testo.toUpperCase().match(/\b([A-Z]{2})\s*[\/ ]\s*(\d+)\s*\/\s*(\d+)\b/);
  if (!m) return null;
  const [, pre, a, b] = m;
  const [anno, num] = /^20\d{2}$/.test(a) ? [a, b] : /^20\d{2}$/.test(b) ? [b, a] : [null, null];
  return anno ? `${pre}/${anno}/${Number(num)}` : null;
}

const RE_CODICE_SITO = /\b(?:IT-RM-?\d{3,}|\d?[A-Z]{1,4}\d{3,}[A-Z0-9_]*|RM\d{3,}[A-Z0-9_]*)\b/;

const ROMANI_N: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15,
};
function municipioDaTesto(t: string): string | null {
  const m = t.match(/Municipio\s+(?:Roma\s+)?[“"]?([IVX]{1,4})\b/i);
  return m && ROMANI_N[m[1].toUpperCase()] ? m[1].toUpperCase() : null;
}

async function testoPdf(buf: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return text as string;
}

// ---------------------------------------------------------------------------
// Fonte 1: tabella HTML "Stazioni Radio Base – Anno 2025"
// ---------------------------------------------------------------------------
async function daTabella2025(): Promise<Grezzo[]> {
  const url = `${BASE}/web/it/bando-concorso.page?contentId=BEC1313463`;
  const { testo, sha256 } = await scaricaTesto(url, "roma_pau_srb_2025.html");
  const $ = cheerio.load(testo);
  const out: Grezzo[] = [];
  // Struttura reale: 4 celle per riga → protocollo | società | ubicazione (paragrafi: indirizzo, Lat, Long) | tipo intervento
  $("table tr").each((_, tr) => {
    const celle = $(tr).children("td,th").toArray();
    if (celle.length < 4) return;
    const testoCella = (i: number) => pulisci($(celle[i]).text());
    const protocollo = testoCella(0);
    if (!/\d/.test(protocollo) || /protocollo/i.test(protocollo)) return; // intestazioni
    const societa = testoCella(1);
    // Paragrafi della cella "ubicazione"; se non ci sono <p> si divide il testo su Lat/Long
    // Il testo può avere "Lat"/"Long" attaccati ai numeri (Long12°51'…) o coordinate senza etichetta
    const tutto = testoCella(2);
    // L'etichetta deve essere seguita da spazio, punto, ":" , cifra o "°" (così "via Latina" non viene scambiata per "Lat")
    const latTesto = tutto.match(/\bLat(?=[\s.:\d°])\.?\s*:?\s*([^A-Za-z]*?\d[^A-Za-z]*?N?)(?=\s*Long|\s*$)/i)?.[1]
      ?? tutto.match(/(\d{2}\s*°[^NE]*?N)/)?.[1] ?? null;
    const lonTesto = tutto.match(/\bLong?(?=[\s.:\d°])\.?\s*:?\s*([^A-Za-z]*?\d[^A-Za-z]*?E?)(?=\s*$|\s*Lat)/i)?.[1]
      ?? tutto.match(/N\W*\s*(\d{2}\s*°[^E]*?E)/)?.[1] ?? null;
    const indirizzo = tutto
      .replace(/\b(?:Lat|Long?)(?=[\s.:\d°])[\s\S]*$/i, "") // tutto da "Lat"/"Long" in poi
      .replace(/\s*\d{2}\s*°[\s\S]*$/, "")             // coordinate senza etichetta
      .trim() || null;
    const gestori = estraiOperatori(societa);
    out.push({
      fonteId: "roma_pau_srb_2025", url, data: null,
      protocollo, municipioFonte: null, codiceSito: null, nomeSito: null,
      indirizzo, catasto: null, gestori: gestori.length ? gestori : [societa],
      tipo: normalizzaTipoIntervento(celle.slice(3).map((c) => $(c).text()).join(" ")), regime: null, latTesto, lonTesto,
    });
  });
  await registraFonte({
    id: "roma_pau_srb_2025", titolo: "Installazione, adeguamento e modifiche Stazioni Radio Base – Anno 2025",
    ente: "Roma Capitale – Dipartimento Programmazione e Attuazione Urbanistica", url, formato: "Tabella HTML",
    licenza: null, ufficiale: true,
    note: "Istanze, non catasto: non prova l'attivazione dell'impianto. Coordinate non dichiarate (WGS84 dedotto), con errori di formato.",
  }, { sha256, n_record: out.length });
  log("istanze", `tabella SRB 2025: ${out.length} righe`);
  return out;
}

// ---------------------------------------------------------------------------
// Fonte 2: elenchi PDF del Municipio X (art. 7.1 DAC 78/2024)
// ---------------------------------------------------------------------------
const PDF_MUNICIPI = [
  { id: "roma_mun10_srb_2025", municipio: "X", titolo: "Municipio X – Elenco interventi SRB aggiornato al 31/01/2025",
    url: `${BASE}/web-resources/cms/documents/Elenco_Stazione_Radio_Base_Anno_20242025__aggiornato_al_31.01.2025.pdf`, data: "2025-01-31" },
  // L'elenco 2024 (Elenco_SRB_Anno_2024_aggiornato_al_17102024.pdf) risponde 404 dal 13/11/2026:
  // aggiungere qui gli elenchi PDF degli altri Municipi appena se ne trova l'URL.
];

const RE_PROT_PDF = /\b[A-Z]{2}\s*\/\s*20\d{2}\s*\/\s*\d+\b/g;
const INTESTAZIONI_PDF = /^(Municipio Roma|Direzione Tecnica|Roma Capitale|Lungomare Paolo Toscanelli|Pec:|www\.comune|Antenne telefonia|Elenco Interventi|Informativa resa|dell.Assemblea Capitolina|Per conoscere|STAZIONE LOCALIZZAZIONE|Municipio Roma .X.)/i;

export function analizzaPdfMunicipio(testo: string, base: Omit<Grezzo, "protocollo" | "codiceSito" | "nomeSito" | "indirizzo" | "catasto" | "gestori" | "tipo" | "latTesto" | "lonTesto" | "regime">): Grezzo[] {
  const righe = testo.split(/\n/).map((r) => r.trim()).filter((r) => r && !INTESTAZIONI_PDF.test(r));
  const corpo = righe.join("\n");
  const out: Grezzo[] = [];
  let inizio = 0;
  for (const m of corpo.matchAll(RE_PROT_PDF)) {
    const blocco = corpo.slice(inizio, m.index);
    inizio = m.index! + m[0].length;
    const latM = blocco.match(/Lat\.?\s*:?\s*([^\n]*?\d[^\n]*)/i);
    const lonM = blocco.match(/Long?\.?\s*:?\s*([^\n]*?\d[^\n]*)/i);
    if (!latM && !/foglio|via|piazza/i.test(blocco)) continue;
    const linee = blocco.split("\n").map((l) => l.trim()).filter(Boolean);
    // Codice e nome sito: prime righe fino alla chiusura della parentesi
    const testa = linee.slice(0, 4).join(" ");
    const sito = testa.match(/^([A-Z0-9_\-]+)\s*\(([^)]+)\)/);
    // Indirizzo: dalla prima riga che inizia con un toponimo o "c/o" fino alla riga "Foglio"
    const iFoglio = linee.findIndex((l) => /^fo(glio|-)/i.test(l) || /\bFo-$/.test(l));
    const iInd = linee.findIndex((l, i) => (iFoglio < 0 || i < iFoglio) && /^(c\/o|via|viale|v\.le|piazza|p\.zza|largo|l\.go|lungomare|lungotevere|strada|corso|località|loc\.|circonvallazione|vicolo|piazzale)\b/i.test(l));
    const indirizzo = iInd >= 0 ? linee.slice(iInd, iFoglio > iInd ? iFoglio : iInd + 1).join(" ") : null;
    const catasto = linee.find((l) => /^foglio/i.test(l)) ?? null;
    // Gestori e tipologia: dopo la riga "Long."
    const iLon = linee.findIndex((l) => /^long?\.?/i.test(l));
    const coda = linee.slice(iLon >= 0 ? iLon + 1 : 0).join(" ");
    const iTipo = coda.search(/INSTALLAZIONE|ADEGUAMENTO|MODIFICA|INCREMENTO|TRASLOCO|RICONFIGURAZ/i);
    const gestoriTesto = iTipo >= 0 ? coda.slice(0, iTipo) : coda;
    out.push({
      ...base,
      protocollo: m[0].replace(/\s+/g, ""),
      codiceSito: sito?.[1] ?? null,
      nomeSito: sito ? pulisci(sito[2]).replace(/-\s+/g, "") : null,
      indirizzo: indirizzo ? pulisci(indirizzo.replace(/^c\/o\s+[^v]*?(?=via|viale|piazza)/i, "").replace(/\s+Fo-?\s*$/i, "")) : null,
      catasto,
      gestori: estraiOperatori(gestoriTesto),
      tipo: normalizzaTipoIntervento(iTipo >= 0 ? coda.slice(iTipo) : blocco),
      regime: null,
      latTesto: latM ? latM[1] : null,
      lonTesto: lonM ? lonM[1] : null,
    });
  }
  return out;
}

async function daPdfMunicipi(): Promise<Grezzo[]> {
  const tutti: Grezzo[] = [];
  for (const p of PDF_MUNICIPI) {
    try {
      const { buf, sha256 } = await scarica(p.url, `${p.id}.pdf`);
      const recs = analizzaPdfMunicipio(await testoPdf(buf), { fonteId: p.id, url: p.url, data: p.data, municipioFonte: p.municipio });
      await registraFonte({
        id: p.id, titolo: p.titolo, ente: "Roma Capitale – Municipio X, Direzione Tecnica", url: p.url, formato: "PDF",
        licenza: null, ufficiale: true, note: "Informativa ai sensi dell'art. 7.1 DAC 78/2024. Coordinate in formati misti (DMS/decimali) con errori.",
      }, { sha256, n_record: recs.length });
      log("istanze", `${p.id}: ${recs.length} interventi`);
      tutti.push(...recs);
    } catch (err) {
      log("istanze", `ATTENZIONE ${p.id} non importato: ${(err as Error).message}`);
    }
  }
  return tutti;
}

// ---------------------------------------------------------------------------
// Fonte 3: avvisi "Informazioni di servizio" – tema impianti tecnologici
// ---------------------------------------------------------------------------
async function daAvvisi(): Promise<Grezzo[]> {
  const elenco = `${BASE}/web/it/informazioni-di-servizio.page?tem=impianti_tecnologici`;
  const ids = new Map<string, string>(); // id -> titolo
  for (let pagina = 1; pagina <= 20; pagina++) {
    const url = pagina === 1 ? elenco : `${BASE}/web/it/informazioni-di-servizio.page?pagina=${pagina}&tem=impianti_tecnologici`;
    const { testo } = await scaricaTesto(url, `avvisi_elenco_p${pagina}.html`);
    const $ = cheerio.load(testo);
    let nuovi = 0;
    $("a[href*='informazione-di-servizio.page?contentId=IDS']").each((_, a) => {
      const id = ($(a).attr("href") ?? "").match(/contentId=(IDS\d+)/)?.[1];
      const titolo = pulisci($(a).text());
      if (id && titolo && !ids.has(id)) { ids.set(id, titolo); nuovi++; }
    });
    if (nuovi === 0) break;
    await sleep(400);
  }
  log("istanze", `avvisi trovati nell'elenco: ${ids.size}`);

  const out: Grezzo[] = [];
  for (const [id, titoloElenco] of ids) {
    const url = `${BASE}/web/it/informazione-di-servizio.page?contentId=${id}`;
    let html: string;
    try {
      html = (await scaricaTesto(url, `avviso_${id}.html`)).testo;
    } catch (err) {
      log("istanze", `avviso ${id} non scaricato: ${(err as Error).message}`);
      continue;
    }
    await sleep(400);
    const $ = cheerio.load(html);
    $("script,style,nav,header,footer").remove();
    const titolo = pulisci($("h1").first().text()) || titoloElenco;
    let corpo = pulisci($("main").text() || $("body").text());
    const iTitolo = corpo.indexOf(titolo.slice(0, 30));
    if (iTitolo > 0) corpo = corpo.slice(iTitolo);
    const iFine = corpo.search(/\bCondividi\b/);
    if (iFine > 0) corpo = corpo.slice(0, iFine);
    if (!/radio\s*base|\bSRB\b/i.test(titolo + corpo)) continue;

    const allegati = $("a[href$='.pdf'], a[href$='.PDF']").map((_, a) => $(a).attr("href")!).get()
      .map((h) => (h.startsWith("http") ? h : `${BASE}${h}`));
    const data = dataItaliana(corpo);
    const municipioFonte = municipioDaTesto(corpo);
    const regime = /S\.?\s*C\.?\s*I\.?\s*A\.?/.test(corpo) ? "SCIA – impianto di bassa potenza e ridotte dimensioni" : "richiesta di autorizzazione";
    const tipo = normalizzaTipoIntervento(titolo + " " + corpo);
    const protocollo = corpo.match(/prot(?:ocollo|\.)?\s*(?:n\.?\s*)?([A-Z]{2}\s*[\/ ]\s*\d{1,6}(?:\s*\/\s*\d+)?)(?:\s+del\s+(\d{1,2}\/\d{1,2}\/(20\d{2})))?/i);
    let protTesto = protocollo?.[1] ?? null;
    if (protTesto && !/\/.*\//.test(protTesto) && protocollo?.[3]) protTesto = `${protTesto.replace(/\s+/g, "/")}/${protocollo[3]}`;

    // Pagine che raccolgono più richieste: "Società X - Via Y" ripetuto
    const multiple = [...corpo.matchAll(/Societ[àa]\s+(.+?)\s*[-–]\s*((?:via|viale|piazza|largo|piazzale|lungotevere|circonvallazione|strada|vicolo|corso)\s[^-–]+?)(?=\s*(?:Richiesta|Stazione|$))/gi)];
    const voci = /^richieste\b|stazioni radio base/i.test(titolo) && multiple.length > 1
      ? multiple.map((m) => ({ gestoriTesto: m[1], indirizzo: pulisci(m[2]), indice: m.index }))
      : [{ gestoriTesto: titolo + " " + corpo, indirizzo: estraiIndirizzo(titolo) ?? estraiIndirizzo(corpo), indice: 0 }];

    // Le coordinate a volte stanno nel PDF allegato
    let latTesto: string | null = null, lonTesto: string | null = null;
    if (voci.length === 1 && allegati.length) {
      try {
        const { buf } = await scarica(allegati[0], `avviso_${id}.pdf`);
        const t = await testoPdf(buf);
        latTesto = t.match(/Lat(?:itudine)?\.?\s*:?\s*([^\n]*?\d[^\n]*)/i)?.[1] ?? null;
        lonTesto = t.match(/Long(?:itudine)?\.?\s*:?\s*([^\n]*?\d[^\n]*)/i)?.[1] ?? null;
        await sleep(400);
      } catch { /* allegato non leggibile: si usa l'indirizzo */ }
    }

    for (const v of voci) {
      const codice = titolo.match(RE_CODICE_SITO)?.[0] ?? corpo.match(RE_CODICE_SITO)?.[0] ?? null;
      out.push({
        fonteId: "roma_avvisi_srb", url, data, protocollo: voci.length === 1 ? protTesto : null,
        municipioFonte, codiceSito: voci.length === 1 ? codice : null, nomeSito: voci.length === 1 ? titolo : null,
        indirizzo: v.indirizzo, catasto: null, gestori: estraiOperatori(v.gestoriTesto), tipo, regime,
        latTesto, lonTesto,
      });
    }
  }
  await registraFonte({
    id: "roma_avvisi_srb", titolo: "Avvisi Stazioni Radio Base – Informazioni di servizio (impianti tecnologici)",
    ente: "Roma Capitale – Municipi e Dipartimento Urbanistica", url: elenco, formato: "Pagine HTML + PDF allegati",
    licenza: null, ufficiale: true,
    note: "Avvisi di pubblicità delle istanze (art. 7.1 DAC 78/2024 e regime precedente DAC 26/2015). Quasi sempre senza coordinate: posizione ricavata dall'indirizzo.",
  }, { n_record: out.length });
  log("istanze", `avvisi SRB analizzati: ${out.length} voci`);
  return out;
}

// ---------------------------------------------------------------------------
// Unione, posizionamento e scrittura
// ---------------------------------------------------------------------------
function chiaveDi(g: Grezzo): string {
  const p = normalizzaProtocollo(g.protocollo);
  if (p) return `prot:${p}`;
  const ind = (g.indirizzo ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `${g.fonteId}:${ind || g.url}:${g.gestori.join("+")}`;
}

function unisci(a: Grezzo, b: Grezzo): Grezzo {
  const conCoord = a.latTesto ? a : b.latTesto ? b : a;
  return {
    ...a,
    data: a.data ?? b.data,
    municipioFonte: a.municipioFonte ?? b.municipioFonte,
    codiceSito: a.codiceSito ?? b.codiceSito,
    nomeSito: a.nomeSito ?? b.nomeSito,
    indirizzo: a.indirizzo ?? b.indirizzo,
    catasto: a.catasto ?? b.catasto,
    gestori: [...new Set([...a.gestori, ...b.gestori])],
    tipo: a.tipo ?? b.tipo,
    regime: a.regime ?? b.regime,
    latTesto: conCoord.latTesto,
    lonTesto: conCoord.lonTesto,
  };
}

export async function importaIstanze() {
  const grezzi = [...(await daTabella2025()), ...(await daPdfMunicipi()), ...(await daAvvisi())];

  const perChiave = new Map<string, Grezzo>();
  for (const g of grezzi) {
    const k = chiaveDi(g);
    perChiave.set(k, perChiave.has(k) ? unisci(perChiave.get(k)!, g) : g);
  }
  log("istanze", `${grezzi.length} voci grezze → ${perChiave.size} istanze dopo la deduplica per protocollo`);

  await db.query("DELETE FROM antenne.istanze_srb");
  const conteggi: Record<string, number> = {};
  for (const [chiave, g] of perChiave) {
    const latC = interpreta(g.latTesto), lonC = interpreta(g.lonTesto);
    // Prima stima dalle coordinate pubblicate: serve a scegliere tra vie omonime durante il geocoding
    const stima = scegli(latC, lonC);
    const geo = g.indirizzo ? await geocodifica(g.indirizzo, stima ?? undefined) : null;
    const rif = geo && dentroRoma(geo.lat, geo.lon) ? geo : null;
    const scelta = scegli(latC, lonC, rif ?? undefined);

    let qualita: "originale" | "corretta" | "geocodificata" | "assente" = "assente";
    let lat: number | null = null, lon: number | null = null, scarto: number | null = null;
    const note: string[] = [];
    const scartoScelta = scelta && rif ? Math.round(distanzaM(scelta.lat, scelta.lon, rif.lat, rif.lon)) : null;
    // Coordinate incoerenti con il civico ufficiale dello stesso indirizzo (> 3 km): vince il civico
    const incoerente = scartoScelta != null && scartoScelta > 3000 && rif?.precisione === "civico";
    if (scelta && !incoerente) {
      ({ lat, lon } = scelta);
      qualita = scelta.metodo;
      if (scelta.nota) note.push(scelta.nota);
      if (rif) {
        scarto = scartoScelta;
        if (scarto! > 1500 && rif.precisione === "civico") note.push(`attenzione: le coordinate pubblicate distano ${scarto} m dal civico ufficiale`);
      }
    } else if (rif && incoerente) {
      lat = rif.lat; lon = rif.lon; qualita = "geocodificata"; scarto = scartoScelta;
      note.push(`coordinate pubblicate ("${g.latTesto} / ${g.lonTesto}") a ${(scartoScelta! / 1000).toFixed(1)} km dall'indirizzo: usato il civico ufficiale ${rif.etichetta}`);
    } else if (rif) {
      lat = rif.lat; lon = rif.lon; qualita = "geocodificata";
      const da = rif.fonte === "georoma_civici" ? "dallo stradario ufficiale di Roma Capitale" : "da OpenStreetMap";
      const prec = rif.precisione === "civico" ? "numero civico" : rif.precisione === "strada" ? "punto centrale della via, civico non indicato o non trovato" : "area";
      note.push(`posizione ricavata dall'indirizzo ${da} (${prec}: ${rif.etichetta})`);
      if (g.latTesto) note.push(`coordinate pubblicate non interpretabili: "${g.latTesto} / ${g.lonTesto}"`);
    } else {
      note.push(g.indirizzo ? `indirizzo "${g.indirizzo}" non trovato` : "nessun indirizzo né coordinate nella fonte");
    }
    conteggi[qualita] = (conteggi[qualita] ?? 0) + 1;

    await db.query(
      `INSERT INTO antenne.istanze_srb (chiave, fonte_id, url_avviso, data_pubblicazione, protocollo, municipio_fonte, codice_sito,
         nome_sito, indirizzo, catasto, gestori, tipo_intervento, regime, lat_testo, lon_testo, qualita, nota_qualita, geom, scarto_geocoding_m)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
         CASE WHEN $18::float8 IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint($19::float8, $18::float8), 4326) END, $20)`,
      [chiave, g.fonteId, g.url, g.data, normalizzaProtocollo(g.protocollo) ?? g.protocollo, g.municipioFonte, g.codiceSito,
       g.nomeSito, g.indirizzo, g.catasto, g.gestori, g.tipo, g.regime, g.latTesto, g.lonTesto, qualita,
       note.join("; ") || null, lat, lon, scarto],
    );
  }
  await salvaCache();

  // Controllo finale sul confine comunale esatto + assegnazione municipio e quartiere
  const fuori = await db.query(
    `UPDATE antenne.istanze_srb i SET geom = NULL, qualita = 'assente',
       nota_qualita = concat_ws('; ', nota_qualita, 'posizione fuori dal territorio di Roma Capitale: scartata')
     FROM opendata.limite_comunale l WHERE i.geom IS NOT NULL AND NOT ST_Intersects(l.geom, i.geom)`,
  );
  await db.query(
    `UPDATE antenne.istanze_srb i SET municipio = m.numero FROM opendata.municipi m WHERE ST_Intersects(m.geom, i.geom)`,
  );
  await db.query(
    `UPDATE antenne.istanze_srb i SET suddivisione = s.codice FROM opendata.suddivisioni_toponomastiche s WHERE ST_Intersects(s.geom, i.geom)`,
  );
  for (const id of ["roma_pau_srb_2025", "roma_avvisi_srb", ...PDF_MUNICIPI.map((p) => p.id)]) {
    const { rows } = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM antenne.istanze_srb WHERE fonte_id = $1", [id]);
    await aggiornaConteggioFonte(id, rows[0].n);
  }
  log("istanze", `qualità posizione: ${JSON.stringify(conteggi)}; scartate fuori Comune: ${fuori.rowCount}`);
}
