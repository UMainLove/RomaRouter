import { connection, type NextRequest } from "next/server";
import { eCategoriaOggetto, eFasciaOraria, eLuogoTipo, eMacroArea } from "@/lib/oggetti/costanti";
import { cifra, generaCodiceConsegna, impronta } from "@/lib/oggetti/crypto";
import {
  calcolaMatchPerOggetto,
  limitaRichieste,
  ottieniIp,
  queryOggetti,
  registraAudit,
} from "@/lib/oggetti/db";
import { eRuoloCustode, leggiSessione } from "@/lib/oggetti/sessione";

const testo = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * POST /api/oggetti/trovato — STEP 2 e STEP 3
 * Chi trova inserisce solo macro-area, fascia oraria e macro-categoria (+ dettaglio riservato cifrato).
 * Nessuna vetrina pubblica (pubblico = false sempre).
 * Documenti, carte o chiavi auto non restano a privati/volontari: vengono smistati alle Forze dell'Ordine.
 */
export async function POST(req: NextRequest) {
  await connection();
  const s = await leggiSessione();
  if (!s) {
    return Response.json({ errore: "Devi autenticarti per segnalare un oggetto trovato." }, { status: 401 });
  }

  const ip = ottieniIp(req.headers);
  if (limitaRichieste(`trovato:${ip}:${s.sub}`, 20)) {
    return Response.json({ errore: "Troppi invii in poco tempo." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ errore: "Richiesta non valida" }, { status: 400 });
  }

  const categoria = testo(body.categoria, 30);
  const macroArea = testo(body.macro_area, 30);
  const fascia = testo(body.fascia, 20);
  const luogoTipo = testo(body.luogo_tipo, 20);
  const dataRitrovamento = testo(body.data_ritrovamento, 20);
  const colore = testo(body.colore, 40) || null;
  const dettaglioRiservato = testo(body.dettaglio_riservato, 400);
  const numeroDocumento = testo(body.numero_documento, 40);
  const chiaveAutoOCarta = body.chiave_auto_o_carta === true;

  if (!eCategoriaOggetto(categoria)) return Response.json({ errore: "Categoria non valida." }, { status: 400 });
  if (!eMacroArea(macroArea)) return Response.json({ errore: "Macro-area non valida." }, { status: 400 });
  if (!eFasciaOraria(fascia)) return Response.json({ errore: "Fascia oraria non valida." }, { status: 400 });
  if (!eLuogoTipo(luogoTipo)) return Response.json({ errore: "Luogo di ritrovamento non valido." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataRitrovamento)) return Response.json({ errore: "Data non valida." }, { status: 400 });
  if (dettaglioRiservato.length < 4) {
    return Response.json({ errore: "Inserisci un dettaglio riservato (andrà cifrato e usato solo per verificare il proprietario)." }, { status: 400 });
  }

  // Verifica se chi segnala è un custode approvato
  let custodeApprovato: { id: string; ruolo: string; pseudonimo: string } | null = null;
  if (eRuoloCustode(s.ruolo) && s.custodeId) {
    const { rows: cRows } = await queryOggetti<{ id: string; ruolo: string; pseudonimo: string }>(
      "SELECT id::text, ruolo, pseudonimo FROM smarriti.custodi WHERE id = $1 AND stato = 'approvato'",
      [s.custodeId],
    );
    custodeApprovato = cRows[0] ?? null;
  }

  const richiedeFFOO = categoria === "documenti" || chiaveAutoOCarta;
  const puoCustodire =
    Boolean(custodeApprovato) &&
    (!richiedeFFOO || custodeApprovato!.ruolo === "forze_ordine" || custodeApprovato!.ruolo === "ufficio");

  const codiceConsegna = puoCustodire ? null : generaCodiceConsegna();
  const chiave = `CT-26-${String(Math.floor(10000 + Math.random() * 89999))}`;
  const stato = !puoCustodire
    ? "da_consegnare"
    : custodeApprovato!.ruolo === "ufficio"
      ? "in_deposito"
      : custodeApprovato!.ruolo === "forze_ordine"
        ? "consegnato_comando"
        : "custodia_temporanea";

  const enteCustode = puoCustodire ? custodeApprovato!.pseudonimo : "In attesa di consegna al punto/comando";
  const docImpronta = categoria === "documenti" && numeroDocumento.length >= 4 ? impronta(numeroDocumento, "doc") : null;

  // Descrizione sintetica interna (mai mostrata nel catalogo pubblico perché pubblico = false)
  const descrizioneInterna = `${categoria} (${macroArea}, ${fascia})`;

  const { rows: inserted } = await queryOggetti<{ id: number }>(
    `INSERT INTO smarriti.oggetti
       (chiave, protocollo, categoria, descrizione, colore, luogo_ritrovamento, data_ritrovamento,
        ente_custode, stato, pubblico, macro_area, fascia, luogo_tipo, custode_id,
        rif_ritrovatore, documento_impronta, codice_consegna_imp, fonte_id)
     VALUES ($1, $1, $2, $3, $4, $5, $6::date, $7, $8, false, $9, $10, $11, $12, $13, $14, $15, 'custodi')
     RETURNING id`,
    [
      chiave,
      categoria,
      descrizioneInterna,
      colore,
      luogoTipo,
      dataRitrovamento,
      enteCustode,
      stato,
      macroArea,
      fascia,
      luogoTipo,
      puoCustodire ? custodeApprovato!.id : null,
      s.sub,
      docImpronta,
      codiceConsegna ? impronta(codiceConsegna, "consegna") : null,
    ],
  );

  const oggettoId = inserted[0].id;
  await queryOggetti(
    "INSERT INTO riservato.dettagli_oggetto (oggetto_id, dettaglio_cifrato) VALUES ($1, $2)",
    [oggettoId, cifra(dettaglioRiservato)],
  );

  const matching = await calcolaMatchPerOggetto(oggettoId);

  const istruzioni: string[] = [];
  if (richiedeFFOO) {
    istruzioni.push("Documenti, carte o chiavi auto non possono essere trattenuti da privati o volontari: consegnali alle Forze dell'Ordine / Comando.");
  }
  if (luogoTipo === "mezzi" || luogoTipo === "taxi") {
    istruzioni.push("Ritrovamento su mezzi pubblici o taxi (INF47985): consegna al conducente/capolinea o al gestore (ATAC / Cotral / cooperativa taxi) che versa all'Ufficio Oggetti Rinvenuti.");
  }
  if (!richiedeFFOO && luogoTipo === "strada" && !puoCustodire) {
    istruzioni.push("Consegna l'oggetto al Punto Amico H24, a una Guardia Giurata in servizio, alle Forze dell'Ordine o all'Ufficio Oggetti Rinvenuti (art. 927 c.c.) mostrando il codice consegna.");
  }
  if (puoCustodire) {
    istruzioni.push("Oggetto preso in custodia protetta (non visibile nella vetrina pubblica). Controlla i papabili match nell'Area operatori.");
  }

  const { rows: punti } = await queryOggetti<{ id: string; nome: string; tipo: string; indirizzo: string; h24: boolean }>(
    `SELECT id, nome, tipo, indirizzo, h24 FROM smarriti.punti_consegna
     WHERE ($1::boolean = false OR tipo IN ('comando', 'ufficio', 'forze_ordine'))
     ORDER BY (macro_area = $2) DESC, h24 DESC, nome`,
    [richiedeFFOO, macroArea],
  );

  await registraAudit({
    attore: s.sub,
    ruolo: s.ruolo,
    azione: "segnalazione_trovato",
    oggettoId,
    dettagli: { chiave, categoria, macroArea, fascia, stato, richiedeFFOO, matchGenerati: matching.creati },
  });

  return Response.json(
    {
      oggettoId,
      chiave,
      stato,
      pubblico: false,
      codiceConsegna,
      richiedeFFOO,
      istruzioni,
      puntiConsigliati: punti,
      matching: { creati: matching.creati, esatto: matching.esatto },
    },
    { status: 201 },
  );
}
