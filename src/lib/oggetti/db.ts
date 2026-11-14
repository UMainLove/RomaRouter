import "server-only";
import { querySezione } from "@/lib/db";
import { cifra, decifraSicuro } from "./crypto";
import {
  MACRO_AREE,
  PROVENIENZE_UTENTE,
  TESTI_NOTIFICA,
  TIPI_RECAPITO_ML,
  eCategoriaOggetto,
  eLuogoTipo,
  eMacroArea,
  eProvenienzaUtente,
  eTipoRecapitoMl,
  type CanaleRecapito,
  type CategoriaPuntoRiconsegna,
  type PuntoRiconsegnaPubblico,
} from "./costanti";

export function queryOggetti<T extends object = Record<string, unknown>>(sql: string, params?: unknown[]) {
  return querySezione<T>("oggetti-smarriti", sql, params);
}

// Limitatore di frequenza in memoria per IP + sessione (con pulizia automatica).
const finestre = new Map<string, number[]>();

export function limitaRichieste(chiave: string, max: number, finestraMs = 3_600_000): boolean {
  const ora = Date.now();
  const recenti = (finestre.get(chiave) ?? []).filter((t) => ora - t < finestraMs);
  if (recenti.length >= max) return true;
  recenti.push(ora);
  finestre.set(chiave, recenti);
  if (finestre.size > 5000) finestre.clear();
  return false;
}

export async function registraAudit(ingresso: {
  attore: string;
  ruolo: string;
  azione: string;
  oggettoId?: number | null;
  matchId?: string | null;
  dettagli?: Record<string, unknown>;
}) {
  await queryOggetti(
    `INSERT INTO smarriti.audit (attore, ruolo, azione, oggetto_id, match_id, dettagli)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      ingresso.attore,
      ingresso.ruolo,
      ingresso.azione,
      ingresso.oggettoId ?? null,
      ingresso.matchId ?? null,
      JSON.stringify(ingresso.dettagli ?? {}),
    ],
  );
}

export async function inviaNotifica(ingresso: {
  destinatarioRif: string;
  canale: CanaleRecapito;
  tipo: "conferma_perso" | "messaggio_cifrato" | "semaforo_documento" | "passaggio_comando" | "contatto_appuntamento";
  testo: string;
  matchId?: string | null;
  oggettoId?: number | null;
}) {
  await queryOggetti(
    `INSERT INTO smarriti.notifiche (destinatario_rif, canale, tipo, testo_cifrato, match_id, oggetto_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      ingresso.destinatarioRif,
      ingresso.canale,
      ingresso.tipo,
      cifra(ingresso.testo),
      ingresso.matchId ?? null,
      ingresso.oggettoId ?? null,
    ],
  );
}

export interface ContattoMagicLink {
  canale: CanaleRecapito;
  tipoRecapito: string | null;
  recapito: string;
  nomeStruttura: string | null;
  provenienza: string | null;
}

function formattaContattoAppuntamento(chiave: string, c: ContattoMagicLink): string {
  const prov = eProvenienzaUtente(c.provenienza) ? PROVENIENZE_UTENTE[c.provenienza] : "Richiedente";
  const tipoLab = eTipoRecapitoMl(c.tipoRecapito) ? TIPI_RECAPITO_ML[c.tipoRecapito] : c.canale.toUpperCase();
  const struttura = c.nomeStruttura ? ` (${c.nomeStruttura})` : "";
  return `Magic Link cliccato (${prov}) per oggetto ${chiave}. Contatto per fissare appuntamento [${tipoLab}${struttura}]: ${c.recapito}`;
}

async function inviaContattoMagicLinkConEsito(
  matchId: string,
  oggettoId: number,
  chiave: string,
  rifRichiedente: string,
  contattoOverride?: ContattoMagicLink,
): Promise<{ inviati: number; contatto: ContattoMagicLink | null }> {
  let contatto = contattoOverride;
  if (!contatto) {
    const { rows: mlRows } = await queryOggetti<{
      canale: CanaleRecapito;
      tipo_recapito: string | null;
      recapito_cifrato: string;
      nome_struttura: string | null;
      provenienza: string | null;
    }>(
      `SELECT canale, tipo_recapito, recapito_cifrato, nome_struttura, provenienza
       FROM smarriti.magic_link
       WHERE rif_utente = $1 AND usato_il IS NOT NULL
       ORDER BY usato_il DESC
       LIMIT 1`,
      [rifRichiedente],
    );
    const ml = mlRows[0];
    if (!ml) return { inviati: 0, contatto: null };
    const recapito = decifraSicuro(ml.recapito_cifrato);
    if (!recapito) return { inviati: 0, contatto: null };
    contatto = {
      canale: ml.canale,
      tipoRecapito: ml.tipo_recapito,
      recapito,
      nomeStruttura: ml.nome_struttura,
      provenienza: ml.provenienza,
    };
  }

  const { rows: destRows } = await queryOggetti<{
    rif_ritrovatore: string | null;
    custode_rif: string | null;
  }>(
    `SELECT o.rif_ritrovatore, c.rif AS custode_rif
     FROM smarriti.oggetti o
     LEFT JOIN smarriti.custodi c ON c.id = o.custode_id
     WHERE o.id = $1`,
    [oggettoId],
  );
  const d = destRows[0];
  if (!d) return { inviati: 0, contatto: null };

  const destinatari = new Set<string>();
  if (d.rif_ritrovatore) destinatari.add(d.rif_ritrovatore);
  if (d.custode_rif) destinatari.add(d.custode_rif);
  if (destinatari.size === 0) destinatari.add("demo:ufficio");

  const testoNotifica = formattaContattoAppuntamento(chiave, contatto);
  let inviati = 0;
  for (const dest of destinatari) {
    if (!contattoOverride) {
      const { rowCount: giaInviata } = await queryOggetti(
        `SELECT 1 FROM smarriti.notifiche
         WHERE destinatario_rif = $1 AND match_id = $2 AND tipo = 'contatto_appuntamento'
         LIMIT 1`,
        [dest, matchId],
      );
      if (giaInviata) continue;
    }
    await inviaNotifica({
      destinatarioRif: dest,
      canale: contatto.canale,
      tipo: "contatto_appuntamento",
      testo: testoNotifica,
      matchId,
      oggettoId,
    });
    inviati++;
  }
  return { inviati, contatto: inviati > 0 ? contatto : null };
}

export async function inviaContattoMagicLinkPerMatch(
  matchId: string,
  oggettoId: number,
  chiave: string,
  rifRichiedente: string,
  contattoOverride?: ContattoMagicLink,
): Promise<number> {
  const { inviati } = await inviaContattoMagicLinkConEsito(matchId, oggettoId, chiave, rifRichiedente, contattoOverride);
  return inviati;
}

export async function inviaContattoMagicLinkAiRitrovatori(
  rifUtente: string,
  contatto: ContattoMagicLink,
): Promise<number> {
  const { rows: matchRows } = await queryOggetti<{
    match_id: string;
    oggetto_id: number;
    chiave: string;
  }>(
    `SELECT m.id::text AS match_id, o.id AS oggetto_id, o.chiave
     FROM smarriti.match m
     JOIN smarriti.segnalazioni_perso sp ON sp.id = m.segnalazione_id
     JOIN smarriti.oggetti o ON o.id = m.oggetto_id
     WHERE sp.rif_richiedente = $1
       AND m.stato NOT IN ('respinto', 'scartato', 'restituito')`,
    [rifUtente],
  );

  let totale = 0;
  for (const m of matchRows) {
    totale += await inviaContattoMagicLinkPerMatch(m.match_id, m.oggetto_id, m.chiave, rifUtente, contatto);
  }
  return totale;
}

const DETTAGLI_DEMO: Record<string, string> = {
  "CT-26-00013": "Custodia bianca con piccolo graffio sul retro e iniziali M.R. incise all'interno del coperchio.",
  "CT-26-00011": "Cover rossa in silicone con adesivo di un gatto sul retro; sfondo schermata di blocco con Tram 8.",
  "CT-26-00015": "Trolley blu rigido a 4 ruote con lucchetto TSA a combinazione e targhetta verde sul manico superiore.",
  "CT-26-00014": "Occhiali da sole montatura nera tartarugata dentro astuccio rigido grigio senza scritta.",
  "CT-26-00012": "Tre chiavi (una blindata, due piccole) con portachiavi in metallo a forma di Colosseo.",
};

let dettagliInizializzati = false;
export async function assicuraDettagliDemo() {
  if (dettagliInizializzati) return;
  try {
    const { rows } = await queryOggetti<{ id: number; chiave: string }>(
      `SELECT o.id, o.chiave
       FROM smarriti.oggetti o
       LEFT JOIN riservato.dettagli_oggetto d ON d.oggetto_id = o.id
       WHERE o.chiave = ANY($1::text[]) AND d.oggetto_id IS NULL`,
      [Object.keys(DETTAGLI_DEMO)],
    );
    for (const r of rows) {
      const testo = DETTAGLI_DEMO[r.chiave];
      if (!testo) continue;
      await queryOggetti(
        `INSERT INTO riservato.dettagli_oggetto (oggetto_id, dettaglio_cifrato)
         VALUES ($1, $2) ON CONFLICT (oggetto_id) DO NOTHING`,
        [r.id, cifra(testo)],
      );
    }
    dettagliInizializzati = true;
  } catch {
    // Non blocca se il DB non è pronto durante il build
  }
}

/**
 * Matching nascosto lato server: confronta una nuova segnalazione "Ho perso" con gli oggetti non bloccati
 * (esclusi quelli già restituiti) e genera candidate match SOLO lato server per il custode.
 * Per i documenti con impronta HMAC: match esatto (punteggio 100, esatto = true).
 */
const normalizzaColore = (raw: string | null | undefined) =>
  (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^color(?:e)?\s+/i, "")
    .trim();

const coloreCompatibile = (a: string | null | undefined, b: string | null | undefined) => {
  const ca = normalizzaColore(a);
  const cb = normalizzaColore(b);
  return Boolean(ca && cb && (ca === cb || ca.includes(cb) || cb.includes(ca)));
};

export async function calcolaMatchPerSegnalazione(segnalazioneId: string) {
  const { rows: segRows } = await queryOggetti<{
    id: string;
    rif_richiedente: string;
    categoria: string;
    macro_area: string;
    fascia: string;
    luogo_tipo: string | null;
    colore: string | null;
    data_smarrimento: string;
    documento_impronta: string | null;
    recapito_canale: CanaleRecapito;
  }>(
    `SELECT id, rif_richiedente, categoria, macro_area, fascia, luogo_tipo, colore,
            data_smarrimento::text, documento_impronta, recapito_canale
     FROM smarriti.segnalazioni_perso WHERE id = $1 AND stato = 'attiva'`,
    [segnalazioneId],
  );
  const seg = segRows[0];
  if (!seg) return { creati: 0, esatto: false };

  // 1. Documento: match esatto tramite impronta HMAC
  if (seg.categoria === "documenti" && seg.documento_impronta) {
    const { rows: docs } = await queryOggetti<{ id: number; chiave: string }>(
      `SELECT id, chiave FROM smarriti.oggetti
       WHERE NOT bloccato
         AND stato NOT IN ('restituito', 'al_ritrovatore', 'devoluto')
         AND documento_impronta = $1`,
      [seg.documento_impronta],
    );
    let creati = 0;
    for (const d of docs) {
      const res = await queryOggetti<{ id: string }>(
        `INSERT INTO smarriti.match (oggetto_id, segnalazione_id, punteggio, esatto, stato)
         VALUES ($1, $2, 100, true, 'proposto')
         ON CONFLICT (oggetto_id, segnalazione_id) DO NOTHING RETURNING id::text`,
        [d.id, seg.id],
      );
      if (res.rowCount) {
        creati++;
        await inviaNotifica({
          destinatarioRif: seg.rif_richiedente,
          canale: seg.recapito_canale,
          tipo: "semaforo_documento",
          testo: "Semaforo verde: il tuo documento risulta già registrato presso le Forze dell'Ordine/Ufficio. Attendi il messaggio cifrato per fissare il ritiro.",
          matchId: res.rows[0].id,
          oggettoId: d.id,
        });
        await inviaContattoMagicLinkPerMatch(res.rows[0].id, d.id, d.chiave, seg.rif_richiedente);
      }
    }
    return { creati, esatto: creati > 0 };
  }

  // 2. Oggetti comuni: confronto per categoria + macro_area + finestra +/- 4 giorni (+ eventuale colore)
  const { rows: cand } = await queryOggetti<{
    id: number;
    chiave: string;
    fascia: string | null;
    luogo_tipo: string | null;
    colore: string | null;
    data_ritrovamento: string | null;
    pubblico: boolean;
  }>(
    `SELECT id, chiave, fascia, luogo_tipo, colore, data_ritrovamento::text, pubblico
     FROM smarriti.oggetti
     WHERE NOT bloccato
       AND NOT pubblico
       AND stato NOT IN ('restituito', 'al_ritrovatore', 'devoluto')
       AND categoria = $1
       AND macro_area = $2
       AND (data_ritrovamento IS NULL OR abs(data_ritrovamento - $3::date) <= 4)`,
    [seg.categoria, seg.macro_area, seg.data_smarrimento],
  );

  let creati = 0;
  for (const o of cand) {
    let punteggio = 45;
    if (o.fascia && o.fascia === seg.fascia) punteggio += 25;
    if (o.luogo_tipo && seg.luogo_tipo && o.luogo_tipo === seg.luogo_tipo) punteggio += 20;
    if (o.data_ritrovamento === seg.data_smarrimento) punteggio += 10;
    if (coloreCompatibile(seg.colore, o.colore)) punteggio += 15;
    const res = await queryOggetti<{ id: string }>(
      `INSERT INTO smarriti.match (oggetto_id, segnalazione_id, punteggio, esatto, stato)
       VALUES ($1, $2, $3, false, 'proposto')
       ON CONFLICT (oggetto_id, segnalazione_id) DO NOTHING RETURNING id::text`,
      [o.id, seg.id, Math.min(100, punteggio)],
    );
    if (res.rowCount) {
      creati++;
      await inviaContattoMagicLinkPerMatch(res.rows[0].id, o.id, o.chiave, seg.rif_richiedente);
    }
  }
  return { creati, esatto: false };
}

/** Matching inverso: quando viene registrato un nuovo oggetto/documento, confronta con le segnalazioni attive. */
export async function calcolaMatchPerOggetto(oggettoId: number) {
  const { rows: oggRows } = await queryOggetti<{
    id: number;
    chiave: string;
    categoria: string | null;
    macro_area: string | null;
    fascia: string | null;
    luogo_tipo: string | null;
    colore: string | null;
    data_ritrovamento: string | null;
    documento_impronta: string | null;
    pubblico: boolean;
    bloccato: boolean;
  }>(
    `SELECT id, chiave, categoria, macro_area, fascia, luogo_tipo, colore, data_ritrovamento::text, documento_impronta, pubblico, bloccato
     FROM smarriti.oggetti WHERE id = $1`,
    [oggettoId],
  );
  const ogg = oggRows[0];
  if (!ogg || ogg.bloccato) return { creati: 0, esatto: false, contattiAppuntamento: [] as ContattoMagicLink[] };

  if (ogg.categoria === "documenti" && ogg.documento_impronta) {
    const { rows: segs } = await queryOggetti<{
      id: string;
      rif_richiedente: string;
      recapito_canale: CanaleRecapito;
    }>(
      `SELECT id, rif_richiedente, recapito_canale
       FROM smarriti.segnalazioni_perso
       WHERE stato = 'attiva' AND documento_impronta = $1`,
      [ogg.documento_impronta],
    );
    let creati = 0;
    const contattiAppuntamento: ContattoMagicLink[] = [];
    for (const s of segs) {
      const res = await queryOggetti<{ id: string }>(
        `INSERT INTO smarriti.match (oggetto_id, segnalazione_id, punteggio, esatto, stato)
         VALUES ($1, $2, 100, true, 'proposto')
         ON CONFLICT (oggetto_id, segnalazione_id) DO NOTHING RETURNING id::text`,
        [ogg.id, s.id],
      );
      if (res.rowCount) {
        creati++;
        await inviaNotifica({
          destinatarioRif: s.rif_richiedente,
          canale: s.recapito_canale,
          tipo: "semaforo_documento",
          testo: `Semaforo verde: il documento da te denunciato è stato ritrovato! ${TESTI_NOTIFICA.confermaPerso}`,
          matchId: res.rows[0].id,
          oggettoId: ogg.id,
        });
        const esitoMl = await inviaContattoMagicLinkConEsito(res.rows[0].id, ogg.id, ogg.chiave, s.rif_richiedente);
        if (esitoMl.contatto) contattiAppuntamento.push(esitoMl.contatto);
      }
    }
    return { creati, esatto: creati > 0, contattiAppuntamento };
  }

  if (ogg.pubblico || !ogg.categoria || !ogg.macro_area) {
    return { creati: 0, esatto: false, contattiAppuntamento: [] as ContattoMagicLink[] };
  }

  const { rows: segs } = await queryOggetti<{
    id: string;
    rif_richiedente: string;
    fascia: string;
    luogo_tipo: string | null;
    colore: string | null;
    data_smarrimento: string;
  }>(
    `SELECT id, rif_richiedente, fascia, luogo_tipo, colore, data_smarrimento::text
     FROM smarriti.segnalazioni_perso
     WHERE stato = 'attiva' AND categoria = $1 AND macro_area = $2
       AND ($3::date IS NULL OR abs(data_smarrimento - $3::date) <= 4)`,
    [ogg.categoria, ogg.macro_area, ogg.data_ritrovamento],
  );
  let creati = 0;
  const contattiAppuntamento: ContattoMagicLink[] = [];
  for (const s of segs) {
    let punteggio = 45;
    if (ogg.fascia && ogg.fascia === s.fascia) punteggio += 25;
    if (ogg.luogo_tipo && s.luogo_tipo && ogg.luogo_tipo === s.luogo_tipo) punteggio += 20;
    if (ogg.data_ritrovamento === s.data_smarrimento) punteggio += 10;
    if (coloreCompatibile(s.colore, ogg.colore)) punteggio += 15;
    const res = await queryOggetti<{ id: string }>(
      `INSERT INTO smarriti.match (oggetto_id, segnalazione_id, punteggio, esatto, stato)
       VALUES ($1, $2, $3, false, 'proposto')
       ON CONFLICT (oggetto_id, segnalazione_id) DO NOTHING RETURNING id::text`,
      [ogg.id, s.id, Math.min(100, punteggio)],
    );
    if (res.rowCount) {
      creati++;
      const esitoMl = await inviaContattoMagicLinkConEsito(res.rows[0].id, ogg.id, ogg.chiave, s.rif_richiedente);
      if (esitoMl.contatto) contattiAppuntamento.push(esitoMl.contatto);
    }
  }
  return { creati, esatto: false, contattiAppuntamento };
}

export function ottieniIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "locale";
}

export interface OggettoPubblicoRecord {
  chiave: string;
  categoria: string;
  descrizione: string;
  colore: string | null;
  data_ritrovamento: string;
  luogo_tipo: string | null;
  macro_area: string | null;
  stato: string;
  ente_custode: string;
}

export interface PuntoConsegnaRecord {
  id: string;
  nome: string;
  tipo: string;
  indirizzo: string;
  macro_area: string | null;
  h24: boolean;
}

export interface FiltriCatalogoPubblico {
  q?: string;
  categoria?: string;
  luogo?: string;
  colore?: string;
  dal?: string;
  zona?: string;
}

/**
 * Legge dal backend PostgreSQL (rr_oggetti_smarriti) il solo Catalogo Pubblico Livello 1 (INF39645):
 * oggetti con pubblico = true e mai dettagli riservati, custodi privati o oggetti in custodia temporanea.
 */
export async function caricaCatalogoPubblico(filtri: FiltriCatalogoPubblico = {}) {
  await assicuraDettagliDemo();

  const q = (filtri.q ?? "").trim();
  const categoria = (filtri.categoria ?? "").trim();
  const luogo = (filtri.luogo ?? "").trim();
  const colore = (filtri.colore ?? "").trim().replace(/^(?:colore?|tinta)\s+/i, "").trim();
  const dal = (filtri.dal ?? "").trim();
  const zona = (filtri.zona ?? "").trim();

  const catValida = eCategoriaOggetto(categoria) ? categoria : null;
  const luogoValido = eLuogoTipo(luogo) ? luogo : null;
  const zonaValida = eMacroArea(zona) ? zona : null;
  const dalValido = /^\d{4}-\d{2}-\d{2}$/.test(dal) ? dal : null;

  const [{ rows }, { rows: punti }, { rows: coloriRows }] = await Promise.all([
    queryOggetti<OggettoPubblicoRecord>(
      `SELECT chiave, categoria, descrizione, colore, data_ritrovamento::text,
              luogo_tipo, macro_area, stato, ente_custode
       FROM smarriti.oggetti
       WHERE pubblico = true
         AND stato IN ('in_deposito', 'in_verifica')
         AND ($1::text IS NULL OR categoria = $1)
         AND ($2::text IS NULL OR luogo_tipo = $2)
         AND (
           $3::text IS NULL
           OR unaccent(coalesce(colore, '') || ' ' || descrizione) ILIKE '%' || unaccent($3) || '%'
         )
         AND ($4::date IS NULL OR data_ritrovamento >= $4::date)
         AND (
           $5::text = ''
           OR ricerca @@ plainto_tsquery('italian_unaccent', $5)
           OR unaccent(descrizione || ' ' || coalesce(colore, '') || ' ' || coalesce(marca, '')) ILIKE '%' || unaccent($5) || '%'
         )
       ORDER BY data_ritrovamento DESC, chiave DESC
       LIMIT 100`,
      [catValida, luogoValido, colore || null, dalValido, q],
    ),
    queryOggetti<PuntoConsegnaRecord>(
      "SELECT id, nome, tipo, indirizzo, macro_area, h24 FROM smarriti.punti_consegna ORDER BY tipo, nome",
    ),
    queryOggetti<{ colore: string }>(
      `SELECT DISTINCT lower(colore) AS colore
       FROM smarriti.oggetti
       WHERE pubblico = true AND colore IS NOT NULL AND colore <> ''
       ORDER BY 1`,
    ),
  ]);

  const conteggiZona: Record<string, number> = {};
  for (const r of rows) {
    if (r.macro_area) conteggiZona[r.macro_area] = (conteggiZona[r.macro_area] ?? 0) + 1;
  }

  return {
    oggetti: zonaValida ? rows.filter((r) => r.macro_area === zonaValida) : rows,
    conteggiZona,
    colori: coloriRows.map((c) => c.colore),
    puntiConsegna: punti,
  };
}

function offsetDeterministico(seed: string): { dLat: number; dLon: number } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  const angolo = ((Math.abs(h) % 360) * Math.PI) / 180;
  // ~90-140 m di scostamento attorno al centro zona: evita sovrapposizioni e protegge l'indirizzo privato.
  return {
    dLat: Number((Math.sin(angolo) * 0.0011).toFixed(5)),
    dLon: Number((Math.cos(angolo) * 0.0013).toFixed(5)),
  };
}

function mappaCategoriaPunto(tipoDb: string): CategoriaPuntoRiconsegna {
  if (tipoDb === "ufficio") return "ufficio";
  if (tipoDb === "comando" || tipoDb === "forze_ordine") return "forze_ordine";
  if (tipoDb === "ospedale_h24") return "ospedale_h24";
  if (tipoDb === "misericordia") return "misericordia";
  if (tipoDb === "guardia_giurata") return "guardia_giurata";
  return "affiliato_h24";
}

function coordinateZona(macroArea: string | null) {
  return eMacroArea(macroArea) ? MACRO_AREE[macroArea] : MACRO_AREE.altro;
}

/**
 * Elenco pubblico dei punti dove consegnare un oggetto ritrovato a Roma:
 * - Ufficio Oggetti Rinvenuti, Forze dell'Ordine, Ospedali H24, Misericordie/CRI e Punti H24 (smarriti.punti_consegna)
 * - Aziende/H24, Guardie Giurate e Privati Volontari già accettati dal Comune/Municipio (smarriti.custodi approvati)
 * Privacy garantita: per i volontari privati non vengono mai esposti indirizzi di abitazione o dati anagrafici.
 */
export async function caricaPuntiRiconsegnaPubblici(): Promise<PuntoRiconsegnaPubblico[]> {
  const [{ rows: puntiDb }, { rows: custodiApprovati }] = await Promise.all([
    queryOggetti<{
      id: string;
      nome: string;
      tipo: string;
      indirizzo: string;
      macro_area: string | null;
      h24: boolean;
      lat: number | null;
      lon: number | null;
      orari: string | null;
      telefono: string | null;
      municipio: string | null;
      ente: string | null;
      note: string | null;
      verificato_comune: boolean;
    }>(
      `SELECT id, nome, tipo, indirizzo, macro_area, h24, lat, lon, orari, telefono, municipio, ente, note, verificato_comune
       FROM smarriti.punti_consegna
       ORDER BY
         CASE tipo
           WHEN 'ufficio' THEN 1
           WHEN 'comando' THEN 2
           WHEN 'forze_ordine' THEN 2
           WHEN 'ospedale_h24' THEN 3
           WHEN 'misericordia' THEN 4
           WHEN 'guardia_giurata' THEN 5
           ELSE 6
         END,
         h24 DESC,
         nome`,
    ),
    queryOggetti<{
      id: string;
      ruolo: string;
      pseudonimo: string;
      macro_area: string | null;
      municipio: string | null;
      tipo_soggetto: string | null;
      ragione_sociale: string | null;
      indirizzo_sede: string | null;
      istituto_vigilanza: string | null;
      approvato_il: string | null;
    }>(
      `SELECT id, ruolo, pseudonimo, macro_area, municipio, tipo_soggetto, ragione_sociale,
              indirizzo_sede, istituto_vigilanza, approvato_il::text
       FROM smarriti.custodi
       WHERE stato = 'approvato'
         AND ruolo IN ('volontario', 'guardia_giurata', 'punto_h24')
       ORDER BY
         CASE ruolo WHEN 'punto_h24' THEN 1 WHEN 'guardia_giurata' THEN 2 ELSE 3 END,
         approvato_il DESC NULLS LAST,
         pseudonimo`,
    ),
  ]);

  const idEsistenti = new Set(puntiDb.map((p) => p.id));
  const risultato: PuntoRiconsegnaPubblico[] = puntiDb.map((p) => {
    const zona = coordinateZona(p.macro_area);
    return {
      id: p.id,
      categoria: mappaCategoriaPunto(p.tipo),
      nome: p.nome,
      ente: p.ente || "Comune di Roma / Ente convenzionato",
      indirizzo: p.indirizzo,
      posizioneEsatta: true,
      municipio: p.municipio || zona.municipio,
      macroArea: p.macro_area,
      zonaNome: zona.nome,
      lat: p.lat ?? zona.lat,
      lon: p.lon ?? zona.lon,
      h24: p.h24,
      orari: p.orari || (p.h24 ? "Aperto H24" : "Orari di sportello"),
      telefono: p.telefono,
      note: p.note,
      fonte: "punti_consegna",
      verificatoComune: p.verificato_comune,
    };
  });

  for (const c of custodiApprovati) {
    // Evita duplicati se il punto_h24 è già stato sincronizzato in punti_consegna
    if (c.ruolo === "punto_h24" && idEsistenti.has(`h24-${c.id.slice(0, 8)}`)) {
      continue;
    }

    const zona = coordinateZona(c.macro_area);
    const offset = offsetDeterministico(c.id);
    const dataAppr = c.approvato_il ? c.approvato_il.slice(0, 10) : null;
    const municipioEtichetta = c.municipio || `Municipio ${zona.municipio}`;

    if (c.ruolo === "volontario") {
      risultato.push({
        id: `custode-${c.id.slice(0, 8)}`,
        categoria: "volontario",
        nome: `${c.pseudonimo} · Privato affiliato approvato`,
        ente: `${municipioEtichetta} (collaboratore verificato)`,
        indirizzo: `Area ${zona.nome} · luogo pubblico concordato in sicurezza (indirizzo privato schermato)`,
        posizioneEsatta: false,
        municipio: municipioEtichetta,
        macroArea: c.macro_area,
        zonaNome: zona.nome,
        lat: Number((zona.lat + offset.dLat).toFixed(5)),
        lon: Number((zona.lon + offset.dLon).toFixed(5)),
        h24: false,
        orari: "Su disponibilità tramite consegna protetta in area pubblica di zona",
        telefono: null,
        note: `Privato affiliato approvato dal Comune/Municipio${dataAppr ? ` il ${dataAppr}` : ""} che collabora al funzionamento del servizio senza esporre dati personali.`,
        fonte: "custode_approvato",
        verificatoComune: true,
      });
    } else if (c.ruolo === "guardia_giurata") {
      const nomeIstituto = c.istituto_vigilanza || c.ragione_sociale || "Istituto di vigilanza convenzionato";
      risultato.push({
        id: `custode-${c.id.slice(0, 8)}`,
        categoria: "guardia_giurata",
        nome: `${nomeIstituto} (${c.pseudonimo})`,
        ente: `Guardia Giurata abilitata · ${municipioEtichetta}`,
        indirizzo: c.indirizzo_sede || `Presidio di vigilanza attivo in area ${zona.nome}`,
        posizioneEsatta: Boolean(c.indirizzo_sede),
        municipio: municipioEtichetta,
        macroArea: c.macro_area,
        zonaNome: zona.nome,
        lat: Number((zona.lat + offset.dLat).toFixed(5)),
        lon: Number((zona.lon + offset.dLon).toFixed(5)),
        h24: true,
        orari: "Turni operativi H24 tramite centrale dell'istituto",
        telefono: null,
        note: `Guardia giurata confermata dall'istituto e approvata dal Comune${dataAppr ? ` il ${dataAppr}` : ""}.`,
        fonte: "custode_approvato",
        verificatoComune: true,
      });
    } else if (c.ruolo === "punto_h24") {
      risultato.push({
        id: `custode-${c.id.slice(0, 8)}`,
        categoria: "affiliato_h24",
        nome: c.ragione_sociale || `Attività affiliata ${c.pseudonimo}`,
        ente: `Azienda / Punto H24 approvato · ${municipioEtichetta}`,
        indirizzo: c.indirizzo_sede || `Area ${zona.nome}`,
        posizioneEsatta: Boolean(c.indirizzo_sede),
        municipio: municipioEtichetta,
        macroArea: c.macro_area,
        zonaNome: zona.nome,
        lat: Number((zona.lat + offset.dLat).toFixed(5)),
        lon: Number((zona.lon + offset.dLon).toFixed(5)),
        h24: true,
        orari: "Aperto H24 · Punto di raccolta convenzionato",
        telefono: null,
        note: `Azienda approvata tramite richiesta al Comune/Municipio${dataAppr ? ` il ${dataAppr}` : ""}.`,
        fonte: "custode_approvato",
        verificatoComune: true,
      });
    }
  }

  return risultato;
}

export { cifra, decifraSicuro };

