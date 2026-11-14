import { connection, type NextRequest } from "next/server";
import { eMacroArea } from "@/lib/oggetti/costanti";
import { cifra, impronta } from "@/lib/oggetti/crypto";
import { calcolaMatchPerOggetto, queryOggetti, registraAudit } from "@/lib/oggetti/db";
import { eForzeOUfficio, leggiSessione } from "@/lib/oggetti/sessione";

const testo = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * POST /api/oggetti/documenti/semaforo — STEP 4 Documenti
 * Le Forze dell'Ordine / Ufficio inquadrano (o inseriscono) il numero del documento trovato.
 * Il server confronta SOLO l'impronta HMAC-SHA256 con le denunce attive:
 * - VERDE: denuncia attiva trovata -> match esatto automatico e notifica cifrata al proprietario.
 * - GRIGIO: nessuna denuncia al momento -> opzione per registrare il documento così da abbinarlo automaticamente appena arriva la denuncia.
 */
export async function POST(req: NextRequest) {
  await connection();
  const s = await leggiSessione();
  if (!s || !eForzeOUfficio(s.ruolo)) {
    return Response.json({ errore: "Funzione riservata a Forze dell'Ordine e Ufficio Oggetti Rinvenuti." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ errore: "Richiesta non valida" }, { status: 400 });
  }

  const numeroDocumento = testo(body.numero_documento, 40);
  const registraSeTrovato = body.registra === true;
  const macroAreaRaw = testo(body.macro_area, 30);
  const macroArea = eMacroArea(macroAreaRaw) ? macroAreaRaw : "centro";
  const tipoDocumento = testo(body.tipo_documento, 80) || "Documento d'identità";

  if (numeroDocumento.length < 4) {
    return Response.json({ errore: "Inserisci o acquisisci almeno 4 caratteri del numero documento." }, { status: 400 });
  }

  const imp = impronta(numeroDocumento, "doc");
  const { rows: segRows } = await queryOggetti<{
    id: string;
    pseudonimo: string;
    macro_area: string;
    data_smarrimento: string;
  }>(
    `SELECT id::text, pseudonimo, macro_area, data_smarrimento::text
     FROM smarriti.segnalazioni_perso
     WHERE stato = 'attiva' AND categoria = 'documenti' AND documento_impronta = $1
     LIMIT 1`,
    [imp],
  );

  const denuncia = segRows[0] ?? null;
  let oggettoRegistrato: { id: number; chiave: string } | null = null;
  let matching: { creati: number; esatto: boolean } | null = null;

  if (registraSeTrovato) {
    const chiave = `DOC-26-${String(Math.floor(10000 + Math.random() * 89999))}`;
    const oggi = new Date().toISOString().slice(0, 10);
    const { rows: ins } = await queryOggetti<{ id: number }>(
      `INSERT INTO smarriti.oggetti
         (chiave, protocollo, categoria, descrizione, luogo_ritrovamento, data_ritrovamento,
          ente_custode, stato, pubblico, macro_area, fascia, luogo_tipo, custode_id,
          rif_ritrovatore, documento_impronta, fonte_id)
       VALUES ($1, $1, 'documenti', $2, 'strada', $3::date, $4, $5, false, $6, 'mattina', 'strada', $7, $8, $9, 'custodi')
       RETURNING id`,
      [
        chiave,
        `${tipoDocumento} (verifica tramite impronta HMAC)`,
        oggi,
        s.etichetta,
        s.ruolo === "ufficio" ? "in_deposito" : "consegnato_comando",
        macroArea,
        s.custodeId ?? null,
        s.sub,
        imp,
      ],
    );
    const oggettoId = ins[0].id;
    await queryOggetti(
      "INSERT INTO riservato.dettagli_oggetto (oggetto_id, dettaglio_cifrato) VALUES ($1, $2)",
      [oggettoId, cifra(`${tipoDocumento} acquisito da ${s.etichetta}`)],
    );
    oggettoRegistrato = { id: oggettoId, chiave };
    matching = await calcolaMatchPerOggetto(oggettoId);
  }

  await registraAudit({
    attore: s.sub,
    ruolo: s.ruolo,
    azione: "semaforo_documento",
    oggettoId: oggettoRegistrato?.id ?? null,
    dettagli: { semaforo: denuncia ? "verde" : "grigio", registrato: Boolean(oggettoRegistrato) },
  });

  return Response.json({
    semaforo: denuncia ? "verde" : "grigio",
    denunciaTrovata: denuncia,
    oggettoRegistrato,
    matching,
    messaggio: denuncia
      ? `Semaforo VERDE: denuncia attiva rilevata (${denuncia.pseudonimo}, smarrito il ${denuncia.data_smarrimento}).`
      : "Semaforo GRIGIO: nessuna denuncia attiva collegata al momento.",
  });
}
