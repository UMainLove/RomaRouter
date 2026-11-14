import { connection, type NextRequest } from "next/server";
import {
  CANALI_RECAPITO,
  TESTI_NOTIFICA,
  eCategoriaOggetto,
  eFasciaOraria,
  eLuogoTipo,
  eMacroArea,
  type CanaleRecapito,
} from "@/lib/oggetti/costanti";
import { cifra, decifraSicuro, generaPseudonimo, impronta } from "@/lib/oggetti/crypto";
import {
  calcolaMatchPerSegnalazione,
  inviaNotifica,
  limitaRichieste,
  ottieniIp,
  queryOggetti,
  registraAudit,
} from "@/lib/oggetti/db";
import { leggiSessione } from "@/lib/oggetti/sessione";

const testo = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * GET /api/oggetti/perso — Livello 2 ("Cerca il mio oggetto")
 * Il cittadino autenticato NON vede mai la lista degli oggetti trovati dai custodi:
 * vede solo la propria segnalazione, lo stato sintetico del matching, il semaforo per i documenti
 * e gli eventuali thread cifrati già aperti dal custode.
 */
export async function GET() {
  await connection();
  const s = await leggiSessione();
  if (!s) {
    return Response.json({ errore: "Accesso richiesto (SPID/CIE, Magic Link o operatore dal vivo)." }, { status: 401 });
  }

  const { rows: segs } = await queryOggetti<{
    id: string;
    pseudonimo: string;
    categoria: string;
    macro_area: string;
    fascia: string;
    luogo_tipo: string | null;
    colore: string | null;
    data_smarrimento: string;
    recapito_canale: string;
    stato: string;
    creata_il: string;
  }>(
    `SELECT id::text, pseudonimo, categoria, macro_area, fascia, luogo_tipo, colore,
            data_smarrimento::text, recapito_canale, stato, creata_il::text
     FROM smarriti.segnalazioni_perso
     WHERE rif_richiedente = $1
     ORDER BY creata_il DESC
     LIMIT 10`,
    [s.sub],
  );

  const attiva = segs.find((r) => r.stato === "attiva") ?? segs[0] ?? null;
  if (!attiva) {
    return Response.json({ segnalazione: null, storico: [], statoMatch: null, conversazioni: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const { rows: matches } = await queryOggetti<{
    id: string;
    stato: string;
    esatto: boolean;
    motivo_codice: string | null;
    motivo: string | null;
    custode_pseudonimo: string;
    custode_ruolo: string;
    oggetto_bloccato: boolean;
    aggiornato_il: string;
  }>(
    `SELECT m.id::text, m.stato, m.esatto, m.motivo_codice, m.motivo,
            coalesce(c.pseudonimo, o.ente_custode) AS custode_pseudonimo,
            coalesce(c.ruolo, 'ufficio') AS custode_ruolo,
            o.bloccato AS oggetto_bloccato,
            m.aggiornato_il::text
     FROM smarriti.match m
     JOIN smarriti.oggetti o ON o.id = m.oggetto_id
     LEFT JOIN smarriti.custodi c ON c.id = o.custode_id
     WHERE m.segnalazione_id = $1
     ORDER BY m.esatto DESC, m.aggiornato_il DESC`,
    [attiva.id],
  );

  // Stato sintetico: se esistono solo 'proposto', il cittadino vede che c'è un possibile match in esame
  // ma nessun dettaglio finché il custode non apre il contatto cifrato.
  const attivi = matches.filter((m) => !["respinto", "scartato"].includes(m.stato));
  const aperti = matches.filter((m) => ["contatto", "verificato", "appuntamento", "restituito"].includes(m.stato));
  const respinti = matches.filter((m) => m.stato === "respinto");

  const statoSintetico =
    attiva.stato === "restituito"
      ? "Oggetto restituito: confermato da te e dal custode."
      : aperti.length > 0
        ? "Il custode ti ha scritto: rispondi qui sotto per farti riconoscere."
        : attivi.length > 0
          ? "C’è un oggetto simile al tuo. Il custode lo sta controllando e ti scriverà qui."
          : attiva.categoria === "documenti"
            ? "Il tuo documento non è ancora arrivato. Lo confrontiamo da soli con ogni nuovo documento consegnato."
            : "Nessun oggetto simile per ora. Lo confrontiamo da soli con ogni nuovo oggetto consegnato.";

  const conversazioni = await Promise.all(
    aperti.map(async (m) => {
      const { rows: msgs } = await queryOggetti<{
        id: number;
        mittente: string;
        tipo: string;
        corpo_cifrato: string;
        creato_il: string;
      }>("SELECT id, mittente, tipo, corpo_cifrato, creato_il::text FROM smarriti.messaggi WHERE match_id = $1 ORDER BY id ASC", [m.id]);

      const { rows: appRows } = await queryOggetti<{
        punto_nome: string;
        punto_indirizzo: string;
        punto_tipo: string;
        quando: string;
        numero_mascherato: string;
        codice_ritiro_cifrato: string;
        conferma_custode_il: string | null;
        conferma_richiedente_il: string | null;
      }>(
        `SELECT p.nome AS punto_nome, p.indirizzo AS punto_indirizzo, p.tipo AS punto_tipo,
                a.quando::text, a.numero_mascherato, a.codice_ritiro_cifrato,
                a.conferma_custode_il::text, a.conferma_richiedente_il::text
         FROM smarriti.appuntamenti a
         JOIN smarriti.punti_consegna p ON p.id = a.punto_id
         WHERE a.match_id = $1`,
        [m.id],
      );

      const app = appRows[0]
        ? {
            puntoNome: appRows[0].punto_nome,
            puntoIndirizzo: appRows[0].punto_indirizzo,
            puntoTipo: appRows[0].punto_tipo,
            quando: appRows[0].quando,
            numeroMascherato: appRows[0].numero_mascherato,
            codiceRitiro: decifraSicuro(appRows[0].codice_ritiro_cifrato),
            confermaCustodeIl: appRows[0].conferma_custode_il,
            confermaRichiedenteIl: appRows[0].conferma_richiedente_il,
          }
        : null;

      return {
        matchId: m.id,
        stato: m.stato,
        esatto: m.esatto,
        custodePseudonimo: m.custode_pseudonimo,
        custodeRuolo: m.custode_ruolo,
        oggettoBloccato: m.oggetto_bloccato,
        messaggi: msgs.map((msg) => ({
          id: msg.id,
          mittente: msg.mittente,
          tipo: msg.tipo,
          testo: decifraSicuro(msg.corpo_cifrato) ?? "Messaggio cifrato",
          creatoIl: msg.creato_il,
        })),
        appuntamento: app,
      };
    }),
  );

  return Response.json(
    {
      segnalazione: attiva,
      storico: segs,
      statoMatch: {
        messaggio: statoSintetico,
        totaleCandidati: attivi.length,
        esattoDocumento: attivi.some((m) => m.esatto),
        semaforoDocumento:
          attiva.categoria === "documenti" ? (attivi.some((m) => m.esatto) ? "verde" : "grigio") : null,
        rifiuti: respinti.map((r) => ({ codice: r.motivo_codice, motivo: r.motivo })),
      },
      conversazioni,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  await connection();
  const s = await leggiSessione();
  if (!s) {
    return Response.json({ errore: "Devi autenticarti prima di aprire una segnalazione Ho perso." }, { status: 401 });
  }

  const ip = ottieniIp(req.headers);
  if (limitaRichieste(`perso:${ip}:${s.sub}`, 8)) {
    return Response.json({ errore: "Troppe richieste in poco tempo." }, { status: 429 });
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
  const luogoTipoRaw = testo(body.luogo_tipo, 20);
  const coloreRaw = testo(body.colore, 60);
  const colore = coloreRaw || null;
  const dataSmarrimento = testo(body.data_smarrimento, 20);
  const canale = testo(body.recapito_canale, 20) as CanaleRecapito;
  const recapito = testo(body.recapito, 120);
  const numeroDocumento = testo(body.numero_documento, 40);
  const numeroDenuncia = testo(body.numero_denuncia, 60);

  if (!eCategoriaOggetto(categoria)) return Response.json({ errore: "Categoria non valida." }, { status: 400 });
  if (!eMacroArea(macroArea)) return Response.json({ errore: "Zona / macro-area non valida." }, { status: 400 });
  if (!eFasciaOraria(fascia)) return Response.json({ errore: "Fascia oraria non valida." }, { status: 400 });
  const luogoTipo = luogoTipoRaw ? (eLuogoTipo(luogoTipoRaw) ? luogoTipoRaw : null) : null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataSmarrimento)) return Response.json({ errore: "Data non valida." }, { status: 400 });
  if (!(canale in CANALI_RECAPITO) || recapito.length < 5) {
    return Response.json({ errore: "Inserisci canale (WhatsApp, SMS o Email) e recapito valido." }, { status: 400 });
  }

  let docImpronta: string | null = null;
  let denunciaCifrata: string | null = null;
  if (categoria === "documenti") {
    if (numeroDocumento.length < 4 || numeroDenuncia.length < 4) {
      return Response.json(
        { errore: "Per i documenti è obbligatorio indicare numero documento e numero della denuncia alle Forze dell'Ordine." },
        { status: 422 },
      );
    }
    docImpronta = impronta(numeroDocumento, "doc");
    denunciaCifrata = cifra(numeroDenuncia);
  }

  const esistente = await queryOggetti(
    "SELECT id FROM smarriti.segnalazioni_perso WHERE rif_richiedente = $1 AND stato = 'attiva' LIMIT 1",
    [s.sub],
  );
  if (esistente.rowCount) {
    return Response.json(
      { errore: "Hai già una segnalazione Ho perso attiva. Chiudila prima di aprirne un'altra." },
      { status: 409 },
    );
  }

  const pseudonimo = generaPseudonimo("Richiedente");
  const { rows } = await queryOggetti<{ id: string }>(
    `INSERT INTO smarriti.segnalazioni_perso
       (rif_richiedente, pseudonimo, categoria, macro_area, fascia, luogo_tipo, colore, data_smarrimento,
        documento_impronta, denuncia_cifrata, recapito_canale, recapito_cifrato)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9, $10, $11, $12)
     RETURNING id::text`,
    [
      s.sub,
      pseudonimo,
      categoria,
      macroArea,
      fascia,
      luogoTipo,
      colore,
      dataSmarrimento,
      docImpronta,
      denunciaCifrata,
      canale,
      cifra(recapito),
    ],
  );

  const id = rows[0].id;
  await inviaNotifica({
    destinatarioRif: s.sub,
    canale,
    tipo: "conferma_perso",
    testo: TESTI_NOTIFICA.confermaPerso,
  });

  const matching = await calcolaMatchPerSegnalazione(id);
  await registraAudit({
    attore: s.sub,
    ruolo: s.ruolo,
    azione: "segnalazione_perso",
    dettagli: { segnalazioneId: id, categoria, macroArea, fascia, matchGenerati: matching.creati, esatto: matching.esatto },
  });

  return Response.json({ id, pseudonimo, matching, messaggioConferma: TESTI_NOTIFICA.confermaPerso }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  await connection();
  const s = await leggiSessione();
  if (!s) return Response.json({ errore: "Accesso richiesto" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ errore: "Richiesta non valida" }, { status: 400 });
  }

  const azione = testo(body.azione, 30);
  const id = testo(body.id, 60);

  if (azione === "chiudi" && id) {
    const res = await queryOggetti(
      `UPDATE smarriti.segnalazioni_perso
       SET stato = 'chiusa', chiusa_il = now()
       WHERE id = $1 AND rif_richiedente = $2 AND stato = 'attiva'
       RETURNING id`,
      [id, s.sub],
    );
    if (!res.rowCount) return Response.json({ errore: "Segnalazione attiva non trovata." }, { status: 404 });
    await registraAudit({ attore: s.sub, ruolo: s.ruolo, azione: "segnalazione_perso_chiusa", dettagli: { segnalazioneId: id } });
    return Response.json({ ok: true });
  }

  return Response.json({ errore: "Azione non valida" }, { status: 400 });
}
