import { connection, type NextRequest } from "next/server";
import {
  CANALI_RECAPITO,
  MAGIC_LINK_SCADENZA_MS,
  PROVENIENZE_UTENTE,
  eProvenienzaUtente,
  eTipoRecapitoMl,
  type CanaleRecapito,
  type ProvenienzaUtente,
  type TipoRecapitoMl,
} from "@/lib/oggetti/costanti";
import { cifra, decifraSicuro, generaTokenCasuale, impronta } from "@/lib/oggetti/crypto";
import {
  inviaContattoMagicLinkAiRitrovatori,
  limitaRichieste,
  ottieniIp,
  queryOggetti,
  registraAudit,
} from "@/lib/oggetti/db";
import {
  PROFILI_DEMO,
  cancellaSessione,
  impostaSessione,
  leggiSessione,
  puoOperareEmergenza,
  type SessioneOggetti,
} from "@/lib/oggetti/sessione";

const testo = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function GET() {
  await connection();
  const sessione = await leggiSessione();
  if (!sessione) {
    return Response.json({ sessione: null, notifiche: [], contattoMagicLink: null }, { headers: { "Cache-Control": "no-store" } });
  }

  const { rows: notifRows } = await queryOggetti<{
    id: number;
    canale: string;
    tipo: string;
    testo_cifrato: string;
    match_id: string | null;
    oggetto_id: number | null;
    creata_il: string;
  }>(
    `SELECT id, canale, tipo, testo_cifrato, match_id::text, oggetto_id, creata_il::text
     FROM smarriti.notifiche
     WHERE destinatario_rif = $1
     ORDER BY id DESC
     LIMIT 20`,
    [sessione.sub],
  );

  const notifiche = notifRows.map((n) => ({
    id: n.id,
    canale: n.canale,
    tipo: n.tipo,
    testo: decifraSicuro(n.testo_cifrato) ?? "Messaggio cifrato",
    matchId: n.match_id,
    oggettoId: n.oggetto_id,
    creataIl: n.creata_il,
  }));

  let contattoMagicLink: {
    provenienza: string | null;
    tipoRecapito: string | null;
    canale: string;
    recapito: string | null;
    nomeStruttura: string | null;
    cliccatoIl: string | null;
    scadeIl: string;
  } | null = null;

  if (sessione.metodo === "magic_link") {
    const { rows: mlRows } = await queryOggetti<{
      provenienza: string | null;
      tipo_recapito: string | null;
      canale: string;
      recapito_cifrato: string;
      nome_struttura: string | null;
      usato_il: string | null;
      scade_il: string;
    }>(
      `SELECT provenienza, tipo_recapito, canale, recapito_cifrato, nome_struttura, usato_il::text, scade_il::text
       FROM smarriti.magic_link
       WHERE rif_utente = $1 AND usato_il IS NOT NULL
       ORDER BY usato_il DESC
       LIMIT 1`,
      [sessione.sub],
    );
    const ml = mlRows[0];
    if (ml) {
      contattoMagicLink = {
        provenienza: ml.provenienza,
        tipoRecapito: ml.tipo_recapito,
        canale: ml.canale,
        recapito: decifraSicuro(ml.recapito_cifrato),
        nomeStruttura: ml.nome_struttura,
        cliccatoIl: ml.usato_il,
        scadeIl: ml.scade_il,
      };
    }
  }

  return Response.json({ sessione, notifiche, contattoMagicLink }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  await connection();
  const ip = ottieniIp(req.headers);
  if (limitaRichieste(`sessione:${ip}`, 40)) {
    return Response.json({ errore: "Troppi tentativi di accesso: riprova più tardi." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ errore: "Richiesta non valida" }, { status: 400 });
  }

  const azione = testo(body.azione, 40);

  if (azione === "accedi_demo") {
    const profiloId = testo(body.profilo, 40);
    const profilo = PROFILI_DEMO[profiloId];
    if (!profilo) return Response.json({ errore: "Profilo demo non valido" }, { status: 400 });

    const s: SessioneOggetti = {
      ...profilo,
      sub: profilo.ruolo === "cittadino" ? `${profilo.sub}:${crypto.randomUUID().slice(0, 12)}` : profilo.sub,
      scadeIl: new Date(Date.now() + 12 * 3_600_000).toISOString(),
    };
    await impostaSessione(s);
    await registraAudit({
      attore: s.sub,
      ruolo: s.ruolo,
      azione: "accesso_demo",
      dettagli: { metodo: s.metodo, postazione: s.postazioneId ?? null, mfa: Boolean(s.mfaVerificato) },
    });
    return Response.json({ sessione: s });
  }

  if (azione === "crea_magic_link") {
    const provenienzaRaw = testo(body.provenienza, 30);
    const provenienza: ProvenienzaUtente = eProvenienzaUtente(provenienzaRaw) ? provenienzaRaw : "italiano";

    const tipoRecapitoRaw = testo(body.tipo_recapito, 30);
    const tipoFallback: TipoRecapitoMl = testo(body.tipo, 20) === "struttura" ? "struttura" : "email";
    const tipoRecapito: TipoRecapitoMl = eTipoRecapitoMl(tipoRecapitoRaw) ? tipoRecapitoRaw : tipoFallback;

    const tipo: "personale" | "struttura" = tipoRecapito === "struttura" ? "struttura" : "personale";
    const canaleInput = testo(body.canale, 20) as CanaleRecapito;
    const canale: CanaleRecapito =
      tipoRecapito === "sms"
        ? "sms"
        : tipoRecapito === "email"
          ? "email"
          : tipoRecapito === "telefono"
            ? "telefono"
            : canaleInput in CANALI_RECAPITO
              ? canaleInput
              : "email";

    const recapito = testo(body.recapito, 120);
    const nomeStruttura = tipo === "struttura" ? testo(body.nome_struttura, 120) || null : null;
    const pin = testo(body.pin, 16);

    if (tipo === "struttura" && (!nomeStruttura || nomeStruttura.length < 2)) {
      return Response.json({ errore: "Indica il nome della struttura ricettiva in cui alloggi." }, { status: 400 });
    }
    if (canale === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recapito)) {
        return Response.json({ errore: "Inserisci un indirizzo email valido." }, { status: 400 });
      }
    } else if (canale === "sms" || canale === "telefono") {
      const cifre = recapito.replace(/\D/g, "");
      if (cifre.length < 6) {
        return Response.json({ errore: "Inserisci un numero di telefono valido (almeno 6 cifre)." }, { status: 400 });
      }
    } else if (recapito.length < 5) {
      return Response.json({ errore: "Inserisci un recapito valido." }, { status: 400 });
    }
    if (tipo === "struttura" && pin.length < 4) {
      return Response.json({ errore: "Per la struttura ricettiva imposta un PIN personale di almeno 4 caratteri." }, { status: 400 });
    }

    // Scadenza fissata a 1 ora
    const scadeIl = new Date(Date.now() + MAGIC_LINK_SCADENZA_MS);

    const token = generaTokenCasuale();
    const rifUtente = `turista:${impronta(`${canale}:${recapito.toLowerCase()}`, "token").slice(0, 16)}`;

    await queryOggetti(
      `INSERT INTO smarriti.magic_link
         (token_imp, pin_imp, tipo, rif_utente, canale, recapito_cifrato, scade_il, provenienza, tipo_recapito, nome_struttura)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        impronta(token, "token"),
        tipo === "struttura" ? impronta(pin, "pin") : null,
        tipo,
        rifUtente,
        canale,
        cifra(recapito),
        scadeIl.toISOString(),
        provenienza,
        tipoRecapito,
        nomeStruttura,
      ],
    );

    await registraAudit({
      attore: rifUtente,
      ruolo: "turista",
      azione: "magic_link_creato",
      dettagli: { tipo, tipoRecapito, provenienza, canale, scadeIl: scadeIl.toISOString() },
    });

    return Response.json({
      tokenDemo: token,
      magicUrl: `/oggetti?ml=${encodeURIComponent(token)}`,
      tipo,
      tipoRecapito,
      provenienza,
      canale,
      richiedePin: tipo === "struttura",
      scadeIl: scadeIl.toISOString(),
      nota: "Demo locale: clicca il Magic Link monouso (valido 1 ora) qui sotto per attivare la sessione e inviare il contatto a chi ritrova l'oggetto.",
    });
  }

  if (azione === "verifica_magic_link") {
    const token = testo(body.token, 120);
    const pin = testo(body.pin, 16);
    if (!token) return Response.json({ errore: "Inserisci il token del Magic Link." }, { status: 400 });

    const { rows } = await queryOggetti<{
      id: string;
      pin_imp: string | null;
      tipo: "personale" | "struttura";
      rif_utente: string;
      canale: CanaleRecapito;
      recapito_cifrato: string;
      provenienza: string | null;
      tipo_recapito: string | null;
      nome_struttura: string | null;
      scade_il: string;
      usato_il: string | null;
    }>(
      `SELECT id::text, pin_imp, tipo, rif_utente, canale, recapito_cifrato,
              provenienza, tipo_recapito, nome_struttura, scade_il::text, usato_il::text
       FROM smarriti.magic_link WHERE token_imp = $1`,
      [impronta(token, "token")],
    );

    const ml = rows[0];
    if (!ml) return Response.json({ errore: "Magic Link non trovato." }, { status: 404 });
    if (ml.usato_il) return Response.json({ errore: "Questo Magic Link monouso è già stato usato." }, { status: 410 });
    if (Date.now() > new Date(ml.scade_il).getTime()) {
      return Response.json({ errore: "Magic Link scaduto (validità di 1 ora superata)." }, { status: 410 });
    }
    if (ml.tipo === "struttura") {
      if (!pin || impronta(pin, "pin") !== ml.pin_imp) {
        return Response.json(
          { errore: "Inserisci il PIN personale corretto per sbloccare il Magic Link della struttura.", richiedePin: true },
          { status: 403 },
        );
      }
    }

    await queryOggetti("UPDATE smarriti.magic_link SET usato_il = now() WHERE id = $1", [ml.id]);

    const recapito = decifraSicuro(ml.recapito_cifrato) ?? "";
    const contattiInviati = recapito
      ? await inviaContattoMagicLinkAiRitrovatori(ml.rif_utente, {
          canale: ml.canale,
          tipoRecapito: ml.tipo_recapito,
          recapito,
          nomeStruttura: ml.nome_struttura,
          provenienza: ml.provenienza,
        })
      : 0;

    const provLabel = eProvenienzaUtente(ml.provenienza) ? PROVENIENZE_UTENTE[ml.provenienza] : "Richiedente";
    const s: SessioneOggetti = {
      sub: ml.rif_utente,
      ruolo: "turista",
      metodo: "magic_link",
      etichetta:
        ml.tipo === "struttura"
          ? `${provLabel} · Magic Link struttura (1h)`
          : `${provLabel} · Magic Link monouso (1h)`,
      scadeIl: ml.scade_il,
    };
    await impostaSessione(s);
    await registraAudit({
      attore: s.sub,
      ruolo: s.ruolo,
      azione: "magic_link_usato",
      dettagli: {
        tipo: ml.tipo,
        tipoRecapito: ml.tipo_recapito,
        provenienza: ml.provenienza,
        canale: ml.canale,
        contattiInviati,
      },
    });
    return Response.json({
      sessione: s,
      contattiInviati,
      contatto: {
        canale: ml.canale,
        tipoRecapito: ml.tipo_recapito,
        provenienza: ml.provenienza,
        nomeStruttura: ml.nome_struttura,
        scadeIl: ml.scade_il,
      },
    });
  }

  if (azione === "emergenza_operatore") {
    const corrente = await leggiSessione();
    if (!corrente || !puoOperareEmergenza(corrente.ruolo)) {
      return Response.json(
        { errore: "Solo un operatore autenticato (Punto H24, Guardia Giurata, FF.OO. o Ufficio) può aprire una sessione assistita." },
        { status: 403 },
      );
    }
    const contatto = testo(body.contatto_alternativo, 120);
    const canale = testo(body.canale, 20) as CanaleRecapito;
    if (contatto.length < 5 || !(canale in CANALI_RECAPITO)) {
      return Response.json({ errore: "Indica un contatto alternativo verificato (es. email o numero della reception/familiare)." }, { status: 400 });
    }

    const rifAssistito = `emergenza:${impronta(`${canale}:${contatto}`, "token").slice(0, 16)}`;
    const s: SessioneOggetti = {
      sub: rifAssistito,
      ruolo: "cittadino",
      metodo: "operatore_emergenza",
      etichetta: `Assistito da ${corrente.etichetta}`,
      postazioneId: corrente.postazioneId,
      scadeIl: new Date(Date.now() + 6 * 3_600_000).toISOString(),
    };
    await registraAudit({
      attore: corrente.sub,
      ruolo: corrente.ruolo,
      azione: "assistenza_emergenza_telefono",
      dettagli: { assistito: rifAssistito, canale, postazione: corrente.postazioneId ?? null },
    });
    await impostaSessione(s);
    return Response.json({ sessione: s, operatorePrecedente: corrente.etichetta });
  }

  return Response.json({ errore: "Azione non riconosciuta" }, { status: 400 });
}

export async function DELETE() {
  await connection();
  const s = await leggiSessione();
  if (s) {
    await registraAudit({ attore: s.sub, ruolo: s.ruolo, azione: "uscita_sessione" });
  }
  await cancellaSessione();
  return Response.json({ ok: true });
}
