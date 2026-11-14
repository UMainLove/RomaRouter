import { connection, type NextRequest } from "next/server";
import {
  MACRO_AREE,
  SOGLIA_ANNI_VOLONTARIO,
  eCategoriaOggetto,
  eFasciaOraria,
  eLuogoTipo,
  eMacroArea,
} from "@/lib/oggetti/costanti";
import { cifra, decifraSicuro, generaPseudonimo, impronta } from "@/lib/oggetti/crypto";
import { assicuraDettagliDemo, calcolaMatchPerOggetto, queryOggetti, registraAudit } from "@/lib/oggetti/db";
import { eForzeOUfficio, eRuoloCustode, leggiSessione } from "@/lib/oggetti/sessione";

const testo = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * GET /api/oggetti/custodia — Livello 3 (Operatori, Custodi abilitati e Ufficio)
 * Catalogo completo (pubblico + custodia riservata), catena di custodia (passaggi_consegna),
 * elenco custodi e richieste Guardie Giurate / Volontari, e Audit Log in sola aggiunta.
 */
export async function GET(req: NextRequest) {
  await connection();
  const s = await leggiSessione();
  if (!s || !eRuoloCustode(s.ruolo)) {
    return Response.json({ errore: "Accesso riservato a custodi abilitati e operatori." }, { status: 403 });
  }
  await assicuraDettagliDemo();

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const categoria = sp.get("categoria")?.trim() ?? "";
  const luogo = sp.get("luogo")?.trim() ?? "";
  const colore = sp.get("colore")?.trim() ?? "";
  const coloreNorm = colore.replace(/^color(?:e)?\s+/i, "").trim();
  const stato = sp.get("stato")?.trim() ?? "";
  const zona = sp.get("zona")?.trim() ?? "";
  const visibilitaRaw = sp.get("visibilita")?.trim() ?? "";
  const visibilita = visibilitaRaw === "pubblico" || visibilitaRaw === "riservato" ? visibilitaRaw : "";
  const vediTutti = eForzeOUfficio(s.ruolo) || s.ruolo === "punto_h24";

  const { rows: oggettiRows } = await queryOggetti<{
    id: number;
    chiave: string;
    categoria: string;
    descrizione: string;
    colore: string | null;
    marca: string | null;
    luogo_ritrovamento: string | null;
    data_ritrovamento: string | null;
    ente_custode: string;
    stato: string;
    pubblico: boolean;
    macro_area: string | null;
    fascia: string | null;
    luogo_tipo: string | null;
    custode_id: string | null;
    bloccato: boolean;
    bloccato_motivo: string | null;
    tentativi_falliti: number;
    dettaglio_cifrato: string | null;
  }>(
    `SELECT o.id, o.chiave, o.categoria, o.descrizione, o.colore, o.marca, o.luogo_ritrovamento,
            o.data_ritrovamento::text, o.ente_custode, o.stato, o.pubblico, o.macro_area, o.fascia,
            o.luogo_tipo, o.custode_id::text, o.bloccato, o.bloccato_motivo, o.tentativi_falliti,
            d.dettaglio_cifrato
     FROM smarriti.oggetti o
     LEFT JOIN riservato.dettagli_oggetto d ON d.oggetto_id = o.id
     WHERE ($1::boolean = true OR o.custode_id = $2::uuid OR o.pubblico = true)
       AND ($3::text = '' OR o.categoria = $3)
       AND ($4::text = '' OR o.stato = $4)
       AND ($5::text = '' OR o.macro_area = $5)
       AND (
         $6::text = ''
         OR unaccent(o.chiave || ' ' || o.descrizione || ' ' || coalesce(o.colore, '') || ' ' || coalesce(o.ente_custode, '')) ILIKE '%' || unaccent($6) || '%'
       )
       AND (
         $7::text = ''
         OR ($7 = 'pubblico' AND o.pubblico = true)
         OR ($7 = 'riservato' AND o.pubblico = false)
       )
       AND ($8::text = '' OR o.luogo_tipo = $8)
       AND (
         $9::text = ''
         OR unaccent(coalesce(o.colore, '') || ' ' || o.descrizione) ILIKE '%' || unaccent($9) || '%'
       )
     ORDER BY o.data_ritrovamento DESC NULLS LAST, o.id DESC
     LIMIT 100`,
    [vediTutti, s.custodeId ?? "00000000-0000-0000-0000-000000000000", categoria, stato, zona, q, visibilita, luogo, coloreNorm],
  );

  const oggetti = oggettiRows.map((o) => ({
    id: o.id,
    chiave: o.chiave,
    categoria: o.categoria,
    descrizione: o.descrizione,
    colore: o.colore,
    marca: o.marca,
    luogoRitrovamento: o.luogo_ritrovamento,
    dataRitrovamento: o.data_ritrovamento,
    enteCustode: o.ente_custode,
    stato: o.stato,
    pubblico: o.pubblico,
    macroArea: o.macro_area,
    fascia: o.fascia,
    luogoTipo: o.luogo_tipo,
    custodeId: o.custode_id,
    bloccato: o.bloccato,
    bloccatoMotivo: o.bloccato_motivo,
    tentativiFalliti: o.tentativi_falliti,
    dettaglioRiservato: o.custode_id === s.custodeId || eForzeOUfficio(s.ruolo) ? decifraSicuro(o.dettaglio_cifrato) : null,
  }));

  const [{ rows: custodi }, { rows: passaggi }, { rows: punti }, { rows: audit }] = await Promise.all([
    queryOggetti<{
      id: string;
      ruolo: string;
      pseudonimo: string;
      macro_area: string | null;
      stato: string;
      residente_dal: string | null;
      istituto_vigilanza: string | null;
      conferma_istituto: boolean;
      matricola: string | null;
      decreto_prefettizio: string | null;
      ha_foto_badge: boolean;
      approvato_il: string | null;
      municipio: string | null;
      tipo_soggetto: string | null;
      ragione_sociale: string | null;
      partita_iva: string | null;
      indirizzo_sede: string | null;
      impegno_accettato: boolean;
      impegno_testo: string | null;
    }>(
      `SELECT id::text, ruolo, pseudonimo, macro_area, stato, residente_dal::text,
              istituto_vigilanza, conferma_istituto, matricola, decreto_prefettizio,
              (foto_badge_cifrata IS NOT NULL) AS ha_foto_badge, approvato_il::text,
              municipio, tipo_soggetto, ragione_sociale, partita_iva, indirizzo_sede,
              impegno_accettato, impegno_testo
       FROM smarriti.custodi
       ORDER BY (stato = 'in_attesa') DESC, ruolo, pseudonimo`,
    ),
    queryOggetti<{
      id: number;
      oggetto_chiave: string;
      da_nome: string | null;
      a_nome: string | null;
      motivo: string;
      creato_il: string;
    }>(
      `SELECT p.id, o.chiave AS oggetto_chiave, da.pseudonimo AS da_nome, a.pseudonimo AS a_nome,
              p.motivo, p.creato_il::text
       FROM smarriti.passaggi_consegna p
       JOIN smarriti.oggetti o ON o.id = p.oggetto_id
       LEFT JOIN smarriti.custodi da ON da.id = p.da_custode_id
       LEFT JOIN smarriti.custodi a ON a.id = p.a_custode_id
       ORDER BY p.id DESC
       LIMIT 30`,
    ),
    queryOggetti<{ id: string; nome: string; tipo: string; indirizzo: string; macro_area: string | null; h24: boolean }>(
      "SELECT id, nome, tipo, indirizzo, macro_area, h24 FROM smarriti.punti_consegna ORDER BY tipo, nome",
    ),
    queryOggetti<{
      id: number;
      quando: string;
      attore: string;
      ruolo: string;
      azione: string;
      oggetto_id: number | null;
      dettagli: Record<string, unknown>;
    }>(
      `SELECT id, quando::text, attore, ruolo, azione, oggetto_id, dettagli
       FROM smarriti.audit
       ORDER BY id DESC
       LIMIT 30`,
    ),
  ]);

  let richiestePubbliche: {
    id: string;
    oggettoId: number;
    oggettoChiave: string;
    oggettoDescrizione: string;
    stato: string;
    chiRitira: string | null;
    quando: string | null;
    elementiProva: string | null;
    creataIl: string;
  }[] = [];

  if (eForzeOUfficio(s.ruolo)) {
    const { rows: reqRows } = await queryOggetti<{
      id: string;
      oggetto_id: number;
      oggetto_chiave: string;
      oggetto_descrizione: string;
      stato: string;
      chi_ritira: string | null;
      quando: string | null;
      elementi_prova: string | null;
      creata_il: string;
    }>(
      `SELECT r.id::text, r.oggetto_id, o.chiave AS oggetto_chiave, o.descrizione AS oggetto_descrizione,
              r.stato, r.chi_ritira, r.quando::text, r.elementi_prova, r.creata_il::text
       FROM smarriti.richieste_restituzione r
       JOIN smarriti.oggetti o ON o.id = r.oggetto_id
       WHERE o.pubblico = true
       ORDER BY (r.stato IN ('inviata', 'in_verifica', 'appuntamento')) DESC, r.creata_il DESC
       LIMIT 40`,
    );
    richiestePubbliche = reqRows.map((r) => ({
      id: r.id,
      oggettoId: r.oggetto_id,
      oggettoChiave: r.oggetto_chiave,
      oggettoDescrizione: r.oggetto_descrizione,
      stato: r.stato,
      chiRitira: r.chi_ritira,
      quando: r.quando,
      elementiProva: r.elementi_prova ? (decifraSicuro(r.elementi_prova) ?? "Dettaglio cifrato allo sportello") : null,
      creataIl: r.creata_il,
    }));
  }

  await registraAudit({
    attore: s.sub,
    ruolo: s.ruolo,
    azione: "ricerca_catalogo_livello_3",
    dettagli: {
      q: q || null,
      categoria: categoria || null,
      stato: stato || null,
      zona: zona || null,
      visibilita: visibilita || null,
      risultati: oggetti.length,
    },
  });

  return Response.json(
    { oggetti, custodi, passaggi, puntiConsegna: punti, richiestePubbliche, audit },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  await connection();
  const s = await leggiSessione();
  if (!s) return Response.json({ errore: "Accesso richiesto." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ errore: "Richiesta non valida" }, { status: 400 });
  }

  const azione = testo(body.azione, 40);

  // 1. Richiesta di collaborazione e abilitazione al Comune / Municipio (Privati cittadini e Aziende)
  if (azione === "richiedi_abilitazione") {
    const ruolo = testo(body.ruolo, 30);
    const macroArea = testo(body.macro_area, 30);
    const municipio = testo(body.municipio, 80);
    const impegnoAccettato = body.impegno_accettato === true;
    const impegnoTesto = testo(body.impegno_testo, 600);
    if (!eMacroArea(macroArea)) return Response.json({ errore: "Zona non valida." }, { status: 400 });
    if (!municipio || municipio.length < 3) {
      return Response.json({ errore: "Seleziona il Comune o Municipio destinatario della richiesta." }, { status: 400 });
    }
    if (!impegnoAccettato || impegnoTesto.length < 10) {
      return Response.json(
        { errore: "Devi accettare l'impegno formale e descrivere in almeno 10 caratteri il tuo contributo al Comune / Municipio." },
        { status: 422 },
      );
    }

    if (ruolo === "guardia_giurata") {
      const matricola = testo(body.matricola, 40);
      const decreto = testo(body.decreto_prefettizio, 60);
      const istituto = testo(body.istituto_vigilanza, 100);
      const fotoBadge = testo(body.foto_badge, 400);
      if (matricola.length < 3 || decreto.length < 4 || istituto.length < 3 || fotoBadge.length < 4) {
        return Response.json(
          { errore: "Servono numero identificativo (matricola), decreto prefettizio, istituto di vigilanza e foto badge." },
          { status: 400 },
        );
      }
      const pseudonimo = generaPseudonimo("Custode G");
      const { rows } = await queryOggetti<{ id: string }>(
        `INSERT INTO smarriti.custodi
           (rif, ruolo, pseudonimo, macro_area, stato, istituto_vigilanza, conferma_istituto,
            matricola, decreto_prefettizio, foto_badge_cifrata,
            municipio, tipo_soggetto, ragione_sociale, impegno_accettato, impegno_testo)
         VALUES ($1, 'guardia_giurata', $2, $3, 'in_attesa', $4, false, $5, $6, $7, $8, 'azienda', $4, true, $9)
         ON CONFLICT (rif) DO UPDATE
           SET ruolo = 'guardia_giurata', macro_area = EXCLUDED.macro_area, stato = 'in_attesa',
               istituto_vigilanza = EXCLUDED.istituto_vigilanza, conferma_istituto = false,
               matricola = EXCLUDED.matricola, decreto_prefettizio = EXCLUDED.decreto_prefettizio,
               foto_badge_cifrata = EXCLUDED.foto_badge_cifrata,
               municipio = EXCLUDED.municipio, tipo_soggetto = 'azienda',
               ragione_sociale = EXCLUDED.ragione_sociale,
               impegno_accettato = true, impegno_testo = EXCLUDED.impegno_testo
         RETURNING id::text`,
        [
          `richiesta:${s.sub}:${Date.now()}`,
          pseudonimo,
          macroArea,
          istituto,
          matricola,
          decreto,
          cifra(fotoBadge),
          municipio,
          impegnoTesto,
        ],
      );
      await registraAudit({
        attore: s.sub,
        ruolo: s.ruolo,
        azione: "richiesta_collaborazione_comune",
        dettagli: { custodeId: rows[0].id, tipoSoggetto: "azienda", ruolo, istituto, municipio, macroArea },
      });
      return Response.json({
        ok: true,
        custodeId: rows[0].id,
        pseudonimo,
        messaggio: `Richiesta inviata a ${municipio}: la foto badge è salvata cifrata e verrà cancellata dopo la verifica. Serve la conferma dell'istituto di vigilanza e l'approvazione del Comune.`,
      });
    }

    if (ruolo === "punto_h24") {
      const ragioneSociale = testo(body.ragione_sociale, 120);
      const partitaIva = testo(body.partita_iva, 30).replace(/\s+/g, "");
      const indirizzoSede = testo(body.indirizzo_sede, 160);
      if (ragioneSociale.length < 3 || partitaIva.length < 8 || indirizzoSede.length < 6) {
        return Response.json(
          { errore: "Per le aziende e attività convenzionate servono ragione sociale, Partita IVA e indirizzo della sede operativa." },
          { status: 400 },
        );
      }
      const pseudonimo = generaPseudonimo("Partner H24");
      const { rows } = await queryOggetti<{ id: string }>(
        `INSERT INTO smarriti.custodi
           (rif, ruolo, pseudonimo, macro_area, stato,
            municipio, tipo_soggetto, ragione_sociale, partita_iva, indirizzo_sede,
            impegno_accettato, impegno_testo)
         VALUES ($1, 'punto_h24', $2, $3, 'in_attesa', $4, 'azienda', $5, $6, $7, true, $8)
         RETURNING id::text`,
        [`richiesta:${s.sub}:${Date.now()}`, pseudonimo, macroArea, municipio, ragioneSociale, partitaIva, indirizzoSede, impegnoTesto],
      );
      await registraAudit({
        attore: s.sub,
        ruolo: s.ruolo,
        azione: "richiesta_collaborazione_comune",
        dettagli: { custodeId: rows[0].id, tipoSoggetto: "azienda", ruolo, ragioneSociale, municipio, macroArea },
      });
      return Response.json({
        ok: true,
        custodeId: rows[0].id,
        pseudonimo,
        messaggio: `Richiesta di collaborazione aziendale inviata a ${municipio}. Dopo l'approvazione comunale la sede sarà attiva come Punto convenzionato.`,
      });
    }

    if (ruolo === "volontario") {
      const residenteDal = testo(body.residente_dal, 20);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(residenteDal)) {
        return Response.json({ errore: "Inserisci la data di inizio residenza nella zona." }, { status: 400 });
      }
      const anni = (Date.now() - new Date(residenteDal).getTime()) / (365.25 * 86_400_000);
      if (anni < SOGLIA_ANNI_VOLONTARIO) {
        return Response.json(
          { errore: `Per fare il volontario custode serve residenza nella zona da almeno ${SOGLIA_ANNI_VOLONTARIO} anni (soglia di configurazione demo).` },
          { status: 422 },
        );
      }
      const pseudonimo = generaPseudonimo("Custode V");
      const { rows } = await queryOggetti<{ id: string }>(
        `INSERT INTO smarriti.custodi
           (rif, ruolo, pseudonimo, macro_area, stato, residente_dal,
            municipio, tipo_soggetto, impegno_accettato, impegno_testo)
         VALUES ($1, 'volontario', $2, $3, 'in_attesa', $4::date, $5, 'privato', true, $6)
         RETURNING id::text`,
        [`richiesta:${s.sub}:${Date.now()}`, pseudonimo, macroArea, residenteDal, municipio, impegnoTesto],
      );
      await registraAudit({
        attore: s.sub,
        ruolo: s.ruolo,
        azione: "richiesta_collaborazione_comune",
        dettagli: { custodeId: rows[0].id, tipoSoggetto: "privato", ruolo, municipio, macroArea },
      });
      return Response.json({
        ok: true,
        custodeId: rows[0].id,
        pseudonimo,
        messaggio: `Richiesta di collaborazione cittadino inviata a ${municipio} per la valutazione.`,
      });
    }

    return Response.json({ errore: "Tipo di abilitazione non valido." }, { status: 400 });
  }

  // Da qui in poi serve essere un custode/operatore
  if (!eRuoloCustode(s.ruolo)) {
    return Response.json({ errore: "Operazione riservata a custodi e operatori." }, { status: 403 });
  }

  // 2. Presa in consegna tramite codice consegna (Punto H24 / Comando / Ufficio / Guardia)
  if (azione === "prendi_in_consegna") {
    const codice = testo(body.codice_consegna, 40);
    if (codice.length < 5) return Response.json({ errore: "Inserisci il codice consegna mostrato dal ritrovatore." }, { status: 400 });

    const { rows: oggRows } = await queryOggetti<{ id: number; chiave: string; categoria: string; stato: string }>(
      "SELECT id, chiave, categoria, stato FROM smarriti.oggetti WHERE codice_consegna_imp = $1 AND stato = 'da_consegnare' LIMIT 1",
      [impronta(codice, "consegna")],
    );
    const ogg = oggRows[0];
    if (!ogg) return Response.json({ errore: "Codice consegna non trovato o già utilizzato." }, { status: 404 });

    if (ogg.categoria === "documenti" && !eForzeOUfficio(s.ruolo)) {
      return Response.json({ errore: "I documenti possono essere presi in consegna solo da Forze dell'Ordine o Ufficio." }, { status: 403 });
    }

    const nuovoStato =
      s.ruolo === "ufficio" ? "in_deposito" : s.ruolo === "forze_ordine" ? "consegnato_comando" : "custodia_temporanea";

    await queryOggetti(
      `UPDATE smarriti.oggetti
       SET stato = $2, custode_id = $3, ente_custode = $4, codice_consegna_imp = NULL, aggiornato_il = now()
       WHERE id = $1`,
      [ogg.id, nuovoStato, s.custodeId ?? null, s.etichetta],
    );
    await queryOggetti(
      "INSERT INTO smarriti.passaggi_consegna (oggetto_id, da_custode_id, a_custode_id, motivo) VALUES ($1, NULL, $2, $3)",
      [ogg.id, s.custodeId ?? null, `Presa in consegna da ritrovatore presso ${s.etichetta}`],
    );
    await registraAudit({ attore: s.sub, ruolo: s.ruolo, azione: "presa_in_consegna", oggettoId: ogg.id, dettagli: { chiave: ogg.chiave, nuovoStato } });
    return Response.json({ ok: true, chiave: ogg.chiave, stato: nuovoStato });
  }

  // 3. Passaggio di consegna (Volontario con dubbi / Guardia a fine turno -> Comando o Ufficio)
  if (azione === "passaggio_consegna") {
    const oggettoId = Number(body.oggetto_id);
    const aCustodeId = testo(body.a_custode_id, 60);
    const motivo = testo(body.motivo, 300);
    if (!oggettoId || !aCustodeId || motivo.length < 4) {
      return Response.json({ errore: "Seleziona l'oggetto, il destinatario (Comando/Ufficio) e indica il motivo del passaggio." }, { status: 400 });
    }

    const { rows: destRows } = await queryOggetti<{ id: string; ruolo: string; pseudonimo: string }>(
      "SELECT id::text, ruolo, pseudonimo FROM smarriti.custodi WHERE id = $1 AND stato = 'approvato' AND ruolo IN ('forze_ordine', 'ufficio')",
      [aCustodeId],
    );
    const dest = destRows[0];
    if (!dest) return Response.json({ errore: "Destinatario non valido: consegna ammessa solo verso Forze dell'Ordine o Ufficio." }, { status: 400 });

    const { rows: oggRows } = await queryOggetti<{ id: number; custode_id: string | null }>(
      "SELECT id, custode_id::text FROM smarriti.oggetti WHERE id = $1",
      [oggettoId],
    );
    const ogg = oggRows[0];
    if (!ogg) return Response.json({ errore: "Oggetto non trovato." }, { status: 404 });
    if (!eForzeOUfficio(s.ruolo) && ogg.custode_id !== s.custodeId) {
      return Response.json({ errore: "Puoi trasferire solo gli oggetti attualmente sotto la tua custodia." }, { status: 403 });
    }

    const nuovoStato = dest.ruolo === "ufficio" ? "in_deposito" : "consegnato_comando";
    await queryOggetti(
      "UPDATE smarriti.oggetti SET custode_id = $2, ente_custode = $3, stato = $4, aggiornato_il = now() WHERE id = $1",
      [ogg.id, dest.id, dest.pseudonimo, nuovoStato],
    );
    await queryOggetti(
      "INSERT INTO smarriti.passaggi_consegna (oggetto_id, da_custode_id, a_custode_id, motivo) VALUES ($1, $2, $3, $4)",
      [ogg.id, ogg.custode_id, dest.id, motivo],
    );
    await registraAudit({
      attore: s.sub,
      ruolo: s.ruolo,
      azione: "passaggio_di_consegna",
      oggettoId: ogg.id,
      dettagli: { da: ogg.custode_id, a: dest.id, motivo },
    });
    return Response.json({ ok: true, nuovoStato, destinatario: dest.pseudonimo });
  }

  // 4. Conferma istituto di vigilanza + approvazione Comune (e cancellazione foto badge)
  if (azione === "conferma_istituto" || azione === "approva_custode") {
    if (!eForzeOUfficio(s.ruolo)) return Response.json({ errore: "Solo Ufficio o Forze dell'Ordine possono verificare e approvare i custodi." }, { status: 403 });
    const custodeId = testo(body.custode_id, 60);
    if (!custodeId) return Response.json({ errore: "Custode non specificato." }, { status: 400 });

    if (azione === "conferma_istituto") {
      await queryOggetti("UPDATE smarriti.custodi SET conferma_istituto = true WHERE id = $1 AND ruolo = 'guardia_giurata'", [custodeId]);
      await registraAudit({ attore: s.sub, ruolo: s.ruolo, azione: "conferma_istituto_vigilanza", dettagli: { custodeId } });
      return Response.json({ ok: true });
    }

    const { rows: cRows } = await queryOggetti<{
      ruolo: string;
      conferma_istituto: boolean;
      pseudonimo: string;
      macro_area: string | null;
      municipio: string | null;
      ragione_sociale: string | null;
      indirizzo_sede: string | null;
    }>(
      `SELECT ruolo, conferma_istituto, pseudonimo, macro_area, municipio, ragione_sociale, indirizzo_sede
       FROM smarriti.custodi WHERE id = $1`,
      [custodeId],
    );
    const target = cRows[0];
    if (!target) return Response.json({ errore: "Custode non trovato." }, { status: 404 });
    if (target.ruolo === "guardia_giurata" && !target.conferma_istituto) {
      return Response.json({ errore: "Serve prima la conferma dell'istituto di vigilanza per approvare la guardia giurata." }, { status: 422 });
    }

    // Cancella foto_badge_cifrata dopo la verifica
    await queryOggetti(
      `UPDATE smarriti.custodi
       SET stato = 'approvato', approvato_il = now(), verificato_il = now(), foto_badge_cifrata = NULL
       WHERE id = $1`,
      [custodeId],
    );

    if (target.ruolo === "punto_h24" && target.indirizzo_sede) {
      const areaChiave = eMacroArea(target.macro_area) ? target.macro_area : "ostiense";
      const zonaInfo = MACRO_AREE[areaChiave];
      await queryOggetti(
        `INSERT INTO smarriti.punti_consegna (id, nome, tipo, indirizzo, macro_area, h24, lat, lon, orari, municipio, ente, note, verificato_comune)
         VALUES ($1, $2, 'punto_h24', $3, $4, true, $5, $6, 'Aperto H24 · Punto di raccolta convenzionato', $7, $8, 'Azienda abilitata tramite richiesta al Comune/Municipio.', true)
         ON CONFLICT (id) DO UPDATE
           SET nome = EXCLUDED.nome,
               indirizzo = EXCLUDED.indirizzo,
               macro_area = EXCLUDED.macro_area,
               h24 = true,
               lat = COALESCE(smarriti.punti_consegna.lat, EXCLUDED.lat),
               lon = COALESCE(smarriti.punti_consegna.lon, EXCLUDED.lon),
               municipio = COALESCE(EXCLUDED.municipio, smarriti.punti_consegna.municipio),
               ente = EXCLUDED.ente,
               verificato_comune = true`,
        [
          `h24-${custodeId.slice(0, 8)}`,
          target.ragione_sociale || target.pseudonimo,
          target.indirizzo_sede,
          areaChiave,
          zonaInfo.lat,
          zonaInfo.lon,
          target.municipio || `Municipio ${zonaInfo.municipio}`,
          target.ragione_sociale || "Azienda convenzionata H24",
        ],
      );
    }

    await registraAudit({
      attore: s.sub,
      ruolo: s.ruolo,
      azione: "custode_approvato_foto_cancellata",
      dettagli: { custodeId, ruolo: target.ruolo, municipio: target.municipio },
    });
    return Response.json({ ok: true, messaggio: "Custode approvato. Eventuale foto badge cancellata dopo la verifica." });
  }

  // 5. Sblocco oggetto bloccato (solo allo sportello Ufficio / FF.OO. dopo controllo documento)
  if (azione === "sblocca_oggetto") {
    if (!eForzeOUfficio(s.ruolo)) {
      return Response.json({ errore: "Lo sblocco avviene solo allo sportello dell'Ufficio o Comando dopo controllo del documento d'identità." }, { status: 403 });
    }
    const oggettoId = Number(body.oggetto_id);
    const notaSportello = testo(body.nota, 200) || "Documento verificato allo sportello";
    if (!oggettoId) return Response.json({ errore: "Oggetto non valido." }, { status: 400 });

    await queryOggetti(
      `UPDATE smarriti.oggetti
       SET bloccato = false, tentativi_falliti = 0, bloccato_motivo = NULL, sbloccato_il = now(), sbloccato_da = $2, aggiornato_il = now()
       WHERE id = $1`,
      [oggettoId, s.sub],
    );
    await registraAudit({ attore: s.sub, ruolo: s.ruolo, azione: "sblocco_oggetto_sportello", oggettoId, dettagli: { notaSportello } });
    return Response.json({ ok: true });
  }

  // 6. Registrazione nuovo oggetto da /operatori (Ufficio / Custode)
  if (azione === "registra_oggetto") {
    const categoria = testo(body.categoria, 30);
    const descrizione = testo(body.descrizione, 240);
    const dettaglioVerifica = testo(body.verifica, 400);
    const colore = testo(body.colore, 40) || null;
    const marca = testo(body.marca, 60) || null;
    const luogo = testo(body.luogo, 20);
    const macroArea = testo(body.macro_area, 30);
    const fascia = testo(body.fascia, 20);
    const dataRitrovamento = testo(body.data, 20);
    const pubblico = body.pubblico === true && eForzeOUfficio(s.ruolo);

    if (!eCategoriaOggetto(categoria) || descrizione.length < 4 || !eLuogoTipo(luogo) || !eMacroArea(macroArea) || !eFasciaOraria(fascia) || !/^\d{4}-\d{2}-\d{2}$/.test(dataRitrovamento)) {
      return Response.json({ errore: "Compila correttamente categoria, descrizione, zona, fascia oraria, luogo e data." }, { status: 400 });
    }

    const prefisso = pubblico ? "OR-26" : "CT-26";
    const chiave = `${prefisso}-${String(Math.floor(10000 + Math.random() * 89999))}`;
    const statoOgg = pubblico ? "in_deposito" : s.ruolo === "ufficio" ? "in_deposito" : "custodia_temporanea";

    const { rows: ins } = await queryOggetti<{ id: number }>(
      `INSERT INTO smarriti.oggetti
         (chiave, protocollo, categoria, descrizione, colore, marca, luogo_ritrovamento,
          data_ritrovamento, ente_custode, stato, pubblico, macro_area, fascia, luogo_tipo,
          custode_id, rif_ritrovatore, fonte_id)
       VALUES ($1, $1, $2, $3, $4, $5, $6, $7::date, $8, $9, $10, $11, $12, $6, $13, $14, $15)
       RETURNING id`,
      [
        chiave,
        categoria,
        descrizione,
        colore,
        marca,
        luogo,
        dataRitrovamento,
        s.etichetta,
        statoOgg,
        pubblico,
        macroArea,
        fascia,
        s.custodeId ?? null,
        s.sub,
        pubblico ? "inf39645" : "custodi",
      ],
    );
    const oggettoId = ins[0].id;
    if (dettaglioVerifica) {
      await queryOggetti("INSERT INTO riservato.dettagli_oggetto (oggetto_id, dettaglio_cifrato) VALUES ($1, $2)", [oggettoId, cifra(dettaglioVerifica)]);
    }
    const matching = await calcolaMatchPerOggetto(oggettoId);
    await registraAudit({
      attore: s.sub,
      ruolo: s.ruolo,
      azione: "registra_oggetto_operatore",
      oggettoId,
      dettagli: { chiave, pubblico, categoria, macroArea, matchGenerati: matching.creati },
    });
    return Response.json({ ok: true, id: oggettoId, chiave, pubblico, matching }, { status: 201 });
  }

  // 7. Gestione appuntamento allo sportello su oggetto pubblico Livello 1 (Ufficio / FF.OO.)
  if (azione === "gestisci_richiesta_pubblica") {
    if (!eForzeOUfficio(s.ruolo)) {
      return Response.json({ errore: "Solo Ufficio o Forze dell'Ordine possono chiudere le richieste allo sportello." }, { status: 403 });
    }
    const richiestaId = testo(body.richiesta_id, 60);
    const esitoRichiesta = testo(body.esito, 20);
    if (!richiestaId || !["restituito", "respinta"].includes(esitoRichiesta)) {
      return Response.json({ errore: "Specifica richiesta ed esito valido (restituito o respinta)." }, { status: 400 });
    }

    const { rows: reqRows } = await queryOggetti<{ id: string; oggetto_id: number }>(
      "SELECT id::text, oggetto_id FROM smarriti.richieste_restituzione WHERE id = $1 LIMIT 1",
      [richiestaId],
    );
    const r = reqRows[0];
    if (!r) return Response.json({ errore: "Richiesta pubblica non trovata." }, { status: 404 });

    await queryOggetti("UPDATE smarriti.richieste_restituzione SET stato = $2 WHERE id = $1", [r.id, esitoRichiesta]);
    if (esitoRichiesta === "restituito") {
      await queryOggetti("UPDATE smarriti.oggetti SET stato = 'restituito', aggiornato_il = now() WHERE id = $1", [r.oggetto_id]);
    }
    await registraAudit({
      attore: s.sub,
      ruolo: s.ruolo,
      azione: esitoRichiesta === "restituito" ? "ritiro_pubblico_completato" : "ritiro_pubblico_respinto",
      oggettoId: r.oggetto_id,
      dettagli: { richiestaId: r.id, esito: esitoRichiesta },
    });
    return Response.json({ ok: true, esito: esitoRichiesta });
  }

  // 8. Pubblicazione o ritiro dal Catalogo Pubblico INF39645 (solo Ufficio, mai documenti o oggetti bloccati)
  if (azione === "pubblica_catalogo") {
    if (s.ruolo !== "ufficio") {
      return Response.json({ errore: "Solo l'Ufficio Oggetti Rinvenuti può pubblicare o ritirare dal Catalogo Pubblico INF39645." }, { status: 403 });
    }
    const oggettoId = Number(body.oggetto_id);
    const pubblico = body.pubblico === true;
    if (!oggettoId) return Response.json({ errore: "Oggetto non valido." }, { status: 400 });

    const { rows: oggRows } = await queryOggetti<{
      id: number;
      chiave: string;
      categoria: string;
      stato: string;
      bloccato: boolean;
    }>("SELECT id, chiave, categoria, stato, bloccato FROM smarriti.oggetti WHERE id = $1", [oggettoId]);
    const ogg = oggRows[0];
    if (!ogg) return Response.json({ errore: "Oggetto non trovato." }, { status: 404 });
    if (pubblico && ogg.categoria === "documenti") {
      return Response.json({ errore: "I documenti non possono mai essere pubblicati nel catalogo pubblico." }, { status: 422 });
    }
    if (ogg.bloccato || ogg.stato === "restituito") {
      return Response.json({ errore: "Oggetto bloccato o già restituito: non pubblicabile." }, { status: 409 });
    }
    if (pubblico && ogg.stato !== "in_deposito") {
      return Response.json({ errore: "Solo gli oggetti in deposito presso l'Ufficio possono entrare nell'elenco pubblico INF39645." }, { status: 409 });
    }

    await queryOggetti(
      `UPDATE smarriti.oggetti
       SET pubblico = $2, fonte_id = $3, aggiornato_il = now()
       WHERE id = $1`,
      [ogg.id, pubblico, pubblico ? "inf39645" : "custodi"],
    );
    await registraAudit({
      attore: s.sub,
      ruolo: s.ruolo,
      azione: pubblico ? "pubblicato_catalogo_pubblico" : "ritirato_catalogo_pubblico",
      oggettoId: ogg.id,
      dettagli: { chiave: ogg.chiave, pubblico },
    });
    return Response.json({ ok: true, pubblico });
  }

  return Response.json({ errore: "Azione non riconosciuta." }, { status: 400 });
}
