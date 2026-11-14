import { connection, type NextRequest } from "next/server";
import { MAX_TENTATIVI_OGGETTO, MOTIVI_RIFIUTO, type CanaleRecapito, type MotivoRifiuto } from "@/lib/oggetti/costanti";
import {
  cifra,
  decifraSicuro,
  generaCodiceRitiro,
  generaNumeroMascherato,
  normalizzaCodiceSensibile,
} from "@/lib/oggetti/crypto";
import {
  inviaNotifica,
  limitaRichieste,
  ottieniIp,
  queryOggetti,
  registraAudit,
} from "@/lib/oggetti/db";
import { eForzeOUfficio, eRuoloCustode, leggiSessione } from "@/lib/oggetti/sessione";

const testo = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * POST /api/oggetti/match/[id]/azioni — STEP 5 Verifica, quiz a domande aperte, rifiuto motivato,
 * appuntamento sicuro (solo Punto H24 / Comando / Ufficio) con numero mascherato, e conferma bilaterale.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/oggetti/match/[id]/azioni">) {
  await connection();
  const s = await leggiSessione();
  if (!s) return Response.json({ errore: "Accesso richiesto." }, { status: 401 });

  const ip = ottieniIp(req.headers);
  if (limitaRichieste(`azioni:${ip}:${s.sub}`, 40)) {
    return Response.json({ errore: "Troppi tentativi: riprova più tardi." }, { status: 429 });
  }

  const { id: matchId } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ errore: "Richiesta non valida" }, { status: 400 });
  }

  const { rows: matchRows } = await queryOggetti<{
    id: string;
    oggetto_id: number;
    segnalazione_id: string;
    stato: string;
    custode_id: string | null;
    bloccato: boolean;
    tentativi_falliti: number;
    rif_richiedente: string;
    recapito_canale: CanaleRecapito;
  }>(
    `SELECT m.id::text, m.oggetto_id, m.segnalazione_id::text, m.stato,
            o.custode_id::text, o.bloccato, o.tentativi_falliti,
            sp.rif_richiedente, sp.recapito_canale
     FROM smarriti.match m
     JOIN smarriti.oggetti o ON o.id = m.oggetto_id
     JOIN smarriti.segnalazioni_perso sp ON sp.id = m.segnalazione_id
     WHERE m.id = $1`,
    [matchId],
  );

  const m = matchRows[0];
  if (!m) return Response.json({ errore: "Match non trovato." }, { status: 404 });

  const eCustodeAutorizzato =
    eRuoloCustode(s.ruolo) && (eForzeOUfficio(s.ruolo) || (s.custodeId && s.custodeId === m.custode_id));
  const eRichiedente = m.rif_richiedente === s.sub;

  if (!eCustodeAutorizzato && !eRichiedente) {
    return Response.json({ errore: "Non sei autorizzato ad operare su questa pratica." }, { status: 403 });
  }

  if (m.bloccato) {
    return Response.json(
      { errore: "Oggetto bloccato dopo troppi tentativi falliti: lo sblocco avviene solo allo sportello con documento d'identità." },
      { status: 423 },
    );
  }

  const azione = testo(body.azione, 40);

  // 0. Custode avvia il contatto (unico autorizzato a iniziare)
  if (azione === "avvia_contatto") {
    if (!eCustodeAutorizzato) return Response.json({ errore: "Solo il custode può avviare il contatto." }, { status: 403 });
    if (m.stato !== "proposto") return Response.json({ errore: "Il contatto è già stato avviato o chiuso." }, { status: 409 });

    const saluto =
      testo(body.messaggio, 400) ||
      "Possibile corrispondenza rilevata. Descrivi per primo l'oggetto, il luogo e l'orario in cui ti sei accorto dello smarrimento.";

    await queryOggetti("UPDATE smarriti.match SET stato = 'contatto', aggiornato_il = now() WHERE id = $1", [m.id]);
    await queryOggetti("UPDATE smarriti.oggetti SET stato = 'in_verifica', aggiornato_il = now() WHERE id = $1 AND stato IN ('custodia_temporanea', 'in_deposito', 'consegnato_comando')", [m.oggetto_id]);
    await queryOggetti(
      "INSERT INTO smarriti.messaggi (match_id, mittente, tipo, corpo_cifrato) VALUES ($1, 'custode', 'avviso', $2)",
      [m.id, cifra(saluto)],
    );
    await inviaNotifica({
      destinatarioRif: m.rif_richiedente,
      canale: m.recapito_canale,
      tipo: "messaggio_cifrato",
      testo: `Messaggio criptato dal custode (${s.etichetta}): "${saluto}"`,
      matchId: m.id,
      oggettoId: m.oggetto_id,
    });
    await registraAudit({ attore: s.sub, ruolo: s.ruolo, azione: "avvia_contatto_cifrato", oggettoId: m.oggetto_id, matchId: m.id });
    return Response.json({ ok: true, stato: "contatto" });
  }

  // 1. Richiedente invia la propria descrizione iniziale (oggetto + luogo + ora)
  if (azione === "invia_descrizione") {
    if (!eRichiedente) return Response.json({ errore: "Solo il richiedente può inviare la descrizione iniziale." }, { status: 403 });
    if (m.stato !== "contatto") return Response.json({ errore: "Il custode deve prima aprire il contatto." }, { status: 409 });

    const descrizione = testo(body.testo, 600);
    if (descrizione.length < 10) {
      return Response.json({ errore: "Descrivi l'oggetto, il luogo e l'ora in cui ti sei accorto di non averlo più (almeno 10 caratteri)." }, { status: 400 });
    }
    await queryOggetti(
      "INSERT INTO smarriti.messaggi (match_id, mittente, tipo, corpo_cifrato) VALUES ($1, 'richiedente', 'descrizione', $2)",
      [m.id, cifra(descrizione)],
    );
    await registraAudit({ attore: s.sub, ruolo: s.ruolo, azione: "invia_descrizione_richiedente", oggettoId: m.oggetto_id, matchId: m.id });
    return Response.json({ ok: true });
  }

  // 2. Custode invia domanda aperta di controllo (solo dopo descrizione iniziale)
  if (azione === "invia_domanda") {
    if (!eCustodeAutorizzato) return Response.json({ errore: "Solo il custode può inviare domande di controllo." }, { status: 403 });
    if (m.stato !== "contatto") return Response.json({ errore: "Stato pratica non compatibile con nuove domande." }, { status: 409 });

    const { rows: descRows } = await queryOggetti(
      "SELECT 1 FROM smarriti.messaggi WHERE match_id = $1 AND mittente = 'richiedente' AND tipo = 'descrizione' LIMIT 1",
      [m.id],
    );
    if (!descRows.length) {
      return Response.json({ errore: "Attendi che il richiedente descriva per primo oggetto, luogo e orario prima di avviare il quiz." }, { status: 409 });
    }

    const domanda = testo(body.testo, 400);
    if (domanda.length < 6) {
      return Response.json({ errore: "Scrivi una domanda aperta specifica (contenuto, colore, marca, tessuto o condizioni)." }, { status: 400 });
    }
    await queryOggetti(
      "INSERT INTO smarriti.messaggi (match_id, mittente, tipo, corpo_cifrato) VALUES ($1, 'custode', 'domanda', $2)",
      [m.id, cifra(domanda)],
    );
    await inviaNotifica({
      destinatarioRif: m.rif_richiedente,
      canale: m.recapito_canale,
      tipo: "messaggio_cifrato",
      testo: "Nuova domanda di verifica cifrata dal custode nell'app.",
      matchId: m.id,
      oggettoId: m.oggetto_id,
    });
    await registraAudit({ attore: s.sub, ruolo: s.ruolo, azione: "invia_domanda_aperta", oggettoId: m.oggetto_id, matchId: m.id });
    return Response.json({ ok: true });
  }

  // 3. Richiedente risponde alla domanda aperta
  if (azione === "invia_risposta") {
    if (!eRichiedente) return Response.json({ errore: "Solo il richiedente può rispondere al quiz." }, { status: 403 });
    if (m.stato !== "contatto") return Response.json({ errore: "La verifica non è nella fase domande." }, { status: 409 });

    const { rows: domRows } = await queryOggetti(
      "SELECT 1 FROM smarriti.messaggi WHERE match_id = $1 AND mittente = 'custode' AND tipo = 'domanda' LIMIT 1",
      [m.id],
    );
    if (!domRows.length) {
      return Response.json({ errore: "Il custode non ha ancora inviato domande di controllo." }, { status: 409 });
    }

    const risposta = testo(body.testo, 500);
    if (risposta.length < 2) return Response.json({ errore: "Scrivi una risposta completa." }, { status: 400 });

    await queryOggetti(
      "INSERT INTO smarriti.messaggi (match_id, mittente, tipo, corpo_cifrato) VALUES ($1, 'richiedente', 'risposta', $2)",
      [m.id, cifra(risposta)],
    );
    await registraAudit({ attore: s.sub, ruolo: s.ruolo, azione: "invia_risposta_quiz", oggettoId: m.oggetto_id, matchId: m.id });
    return Response.json({ ok: true });
  }

  // 4. Custode approva verifica (abilita l'appuntamento)
  if (azione === "approva_verifica") {
    if (!eCustodeAutorizzato) return Response.json({ errore: "Solo il custode può approvare la verifica." }, { status: 403 });
    if (m.stato !== "contatto") return Response.json({ errore: "La pratica deve essere in contatto." }, { status: 409 });

    await queryOggetti("UPDATE smarriti.match SET stato = 'verificato', aggiornato_il = now() WHERE id = $1", [m.id]);
    await queryOggetti(
      "INSERT INTO smarriti.messaggi (match_id, mittente, tipo, corpo_cifrato) VALUES ($1, 'sistema', 'avviso', $2)",
      [m.id, cifra("Verifica superata: ora il custode può fissare l'appuntamento via numero mascherato in un Punto H24, Comando o Ufficio.")],
    );
    await registraAudit({ attore: s.sub, ruolo: s.ruolo, azione: "verifica_approvata", oggettoId: m.oggetto_id, matchId: m.id });
    return Response.json({ ok: true, stato: "verificato" });
  }

  // 5. Custode rifiuta con motivo obbligatorio + contatore tentativi -> blocco globale dopo 3 fallimenti
  if (azione === "rifiuta") {
    if (!eCustodeAutorizzato) return Response.json({ errore: "Solo il custode può rifiutare." }, { status: 403 });
    if (!["proposto", "contatto", "verificato"].includes(m.stato)) {
      return Response.json({ errore: "Match non più rifiutabile in questo stato." }, { status: 409 });
    }
    const motivoCodice = testo(body.motivo_codice, 30) as MotivoRifiuto;
    const motivo = testo(body.motivo, 300);
    if (!(motivoCodice in MOTIVI_RIFIUTO) || motivo.length < 5) {
      return Response.json({ errore: "Ogni rifiuto va motivato (seleziona un codice e spiega il motivo in almeno 5 caratteri)." }, { status: 422 });
    }

    await queryOggetti(
      `UPDATE smarriti.match
       SET stato = 'respinto', motivo_codice = $2, motivo = $3, aggiornato_il = now()
       WHERE id = $1`,
      [m.id, motivoCodice, motivo],
    );

    const nuoviTentativi = m.tentativi_falliti + 1;
    const daBloccare = nuoviTentativi >= MAX_TENTATIVI_OGGETTO;
    await queryOggetti(
      `UPDATE smarriti.oggetti
       SET tentativi_falliti = $2,
           bloccato = $3,
           bloccato_motivo = CASE WHEN $3 THEN 'Blocco automatico dopo 3 verifiche respinte: sblocco solo allo sportello con documento.' ELSE bloccato_motivo END,
           aggiornato_il = now()
       WHERE id = $1`,
      [m.oggetto_id, nuoviTentativi, daBloccare],
    );

    await queryOggetti(
      "INSERT INTO smarriti.messaggi (match_id, mittente, tipo, corpo_cifrato) VALUES ($1, 'sistema', 'avviso', $2)",
      [m.id, cifra(`Verifica respinta (${MOTIVI_RIFIUTO[motivoCodice]}): ${motivo}. Per dubbi resta sempre possibile la verifica di persona al Punto Amico H24 o al Comando.`)],
    );

    await registraAudit({
      attore: s.sub,
      ruolo: s.ruolo,
      azione: "verifica_respinta",
      oggettoId: m.oggetto_id,
      matchId: m.id,
      dettagli: { motivoCodice, tentativiFalliti: nuoviTentativi, bloccato: daBloccare },
    });
    return Response.json({ ok: true, stato: "respinto", bloccato: daBloccare, tentativiFalliti: nuoviTentativi });
  }

  // 6. Custode fissa appuntamento (SOLO Punto H24, Comando o Ufficio) con numero mascherato e codice ritiro
  if (azione === "fissa_appuntamento") {
    if (!eCustodeAutorizzato) return Response.json({ errore: "Solo il custode può fissare l'appuntamento." }, { status: 403 });
    if (m.stato !== "verificato") {
      return Response.json({ errore: "Puoi fissare l'appuntamento solo dopo aver completato e approvato la verifica." }, { status: 409 });
    }
    const puntoId = testo(body.punto_id, 40);
    const quandoRaw = testo(body.quando, 40);
    const quando = new Date(quandoRaw);
    if (isNaN(quando.getTime()) || quando.getTime() < Date.now() - 600_000) {
      return Response.json({ errore: "Scegli una data e ora valida per l'appuntamento." }, { status: 400 });
    }

    const { rows: pRows } = await queryOggetti<{ id: string; nome: string; indirizzo: string }>(
      "SELECT id, nome, indirizzo FROM smarriti.punti_consegna WHERE id = $1 AND tipo IN ('punto_h24', 'comando', 'ufficio')",
      [puntoId],
    );
    const punto = pRows[0];
    if (!punto) {
      return Response.json({ errore: "L'appuntamento si può fissare solo presso un Punto Amico H24, un Comando o l'Ufficio." }, { status: 422 });
    }

    const numeroMascherato = generaNumeroMascherato();
    const codiceRitiro = generaCodiceRitiro();

    await queryOggetti(
      `INSERT INTO smarriti.appuntamenti (match_id, punto_id, quando, numero_mascherato, codice_ritiro_cifrato)
       VALUES ($1, $2, $3::timestamptz, $4, $5)
       ON CONFLICT (match_id) DO UPDATE SET punto_id = EXCLUDED.punto_id, quando = EXCLUDED.quando`,
      [m.id, punto.id, quando.toISOString(), numeroMascherato, cifra(codiceRitiro)],
    );
    await queryOggetti("UPDATE smarriti.match SET stato = 'appuntamento', aggiornato_il = now() WHERE id = $1", [m.id]);

    const msgTesto = `Appuntamento fissato presso ${punto.nome} (${punto.indirizzo}). Numero mascherato: ${numeroMascherato}. Mostra il codice di ritiro e un documento valido, poi confermate entrambi la riconsegna.`;
    await queryOggetti(
      "INSERT INTO smarriti.messaggi (match_id, mittente, tipo, corpo_cifrato) VALUES ($1, 'sistema', 'avviso', $2)",
      [m.id, cifra(msgTesto)],
    );
    await inviaNotifica({
      destinatarioRif: m.rif_richiedente,
      canale: m.recapito_canale,
      tipo: "messaggio_cifrato",
      testo: msgTesto,
      matchId: m.id,
      oggettoId: m.oggetto_id,
    });
    await registraAudit({
      attore: s.sub,
      ruolo: s.ruolo,
      azione: "appuntamento_fissato",
      oggettoId: m.oggetto_id,
      matchId: m.id,
      dettagli: { puntoId: punto.id, quando: quando.toISOString() },
    });
    return Response.json({ ok: true, stato: "appuntamento", numeroMascherato });
  }

  // 7. Conferma bilaterale di riconsegna
  if (azione === "conferma_riconsegna") {
    if (m.stato !== "appuntamento") {
      return Response.json({ errore: "Serve prima un appuntamento fissato." }, { status: 409 });
    }

    const { rows: appRows } = await queryOggetti<{
      codice_ritiro_cifrato: string;
      conferma_custode_il: string | null;
      conferma_richiedente_il: string | null;
    }>(
      "SELECT codice_ritiro_cifrato, conferma_custode_il::text, conferma_richiedente_il::text FROM smarriti.appuntamenti WHERE match_id = $1",
      [m.id],
    );
    const app = appRows[0];
    if (!app) return Response.json({ errore: "Appuntamento non trovato." }, { status: 404 });

    let custodeOk = Boolean(app.conferma_custode_il);
    let richiedenteOk = Boolean(app.conferma_richiedente_il);

    if (eCustodeAutorizzato) {
      const codiceInserito = normalizzaCodiceSensibile(testo(body.codice_ritiro, 30));
      const codiceAtteso = normalizzaCodiceSensibile(decifraSicuro(app.codice_ritiro_cifrato) ?? "");
      if (!codiceAtteso || codiceInserito !== codiceAtteso) {
        return Response.json({ errore: "Codice di ritiro errato. Chiedi al proprietario il codice mostrato nella sua app e controlla il documento." }, { status: 403 });
      }
      await queryOggetti("UPDATE smarriti.appuntamenti SET conferma_custode_il = COALESCE(conferma_custode_il, now()) WHERE match_id = $1", [m.id]);
      custodeOk = true;
    } else if (eRichiedente) {
      await queryOggetti("UPDATE smarriti.appuntamenti SET conferma_richiedente_il = COALESCE(conferma_richiedente_il, now()) WHERE match_id = $1", [m.id]);
      richiedenteOk = true;
    }

    const entrambi = custodeOk && richiedenteOk;
    if (entrambi) {
      await queryOggetti("UPDATE smarriti.match SET stato = 'restituito', aggiornato_il = now() WHERE id = $1", [m.id]);
      await queryOggetti("UPDATE smarriti.oggetti SET stato = 'restituito', aggiornato_il = now() WHERE id = $1", [m.oggetto_id]);
      await queryOggetti("UPDATE smarriti.segnalazioni_perso SET stato = 'restituito', chiusa_il = now() WHERE id = $1", [m.segnalazione_id]);
      await queryOggetti(
        "INSERT INTO smarriti.messaggi (match_id, mittente, tipo, corpo_cifrato) VALUES ($1, 'sistema', 'avviso', $2)",
        [m.id, cifra("Riconsegna completata con conferma di entrambi. Pratica chiusa.")],
      );
    }

    await registraAudit({
      attore: s.sub,
      ruolo: s.ruolo,
      azione: entrambi ? "riconsegna_completata_bilaterale" : "conferma_riconsegna_parziale",
      oggettoId: m.oggetto_id,
      matchId: m.id,
      dettagli: { custodeOk, richiedenteOk },
    });

    return Response.json({
      ok: true,
      entrambi,
      custodeOk,
      richiedenteOk,
      messaggio: entrambi
        ? "Riconsegna completata! Entrambe le parti hanno confermato."
        : "Tua conferma registrata: la pratica resta aperta finché non conferma anche l'altra parte.",
    });
  }

  return Response.json({ errore: "Azione non supportata." }, { status: 400 });
}
