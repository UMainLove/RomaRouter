import { connection } from "next/server";
import { assicuraDettagliDemo, decifraSicuro, queryOggetti } from "@/lib/oggetti/db";
import { eForzeOUfficio, eRuoloCustode, leggiSessione } from "@/lib/oggetti/sessione";

/**
 * GET /api/oggetti/match
 * Inbox match pseudonima per custodi abilitati e operatori (Livello 3).
 * Ogni candidato è mostrato con pseudonimo, mai con identità o recapito reale del richiedente.
 */
export async function GET() {
  await connection();
  const s = await leggiSessione();
  if (!s || !eRuoloCustode(s.ruolo)) {
    return Response.json({ errore: "Accesso riservato ai custodi abilitati e agli operatori." }, { status: 403 });
  }
  await assicuraDettagliDemo();

  const vediTutti = eForzeOUfficio(s.ruolo);
  const { rows: matches } = await queryOggetti<{
    id: string;
    oggetto_id: number;
    oggetto_chiave: string;
    oggetto_categoria: string;
    oggetto_descrizione: string;
    oggetto_macro_area: string | null;
    oggetto_fascia: string | null;
    oggetto_stato: string;
    oggetto_bloccato: boolean;
    tentativi_falliti: number;
    dettaglio_cifrato: string | null;
    segnalazione_id: string;
    rif_richiedente: string;
    richiedente_pseudonimo: string;
    segnalazione_area: string;
    segnalazione_fascia: string;
    segnalazione_data: string;
    punteggio: number;
    esatto: boolean;
    stato: string;
    motivo_codice: string | null;
    motivo: string | null;
    aggiornato_il: string;
  }>(
    `SELECT m.id::text, o.id AS oggetto_id, o.chiave AS oggetto_chiave,
            o.categoria AS oggetto_categoria, o.descrizione AS oggetto_descrizione,
            o.macro_area AS oggetto_macro_area, o.fascia AS oggetto_fascia,
            o.stato AS oggetto_stato, o.bloccato AS oggetto_bloccato, o.tentativi_falliti,
            d.dettaglio_cifrato,
            sp.id::text AS segnalazione_id, sp.rif_richiedente, sp.pseudonimo AS richiedente_pseudonimo,
            sp.macro_area AS segnalazione_area, sp.fascia AS segnalazione_fascia,
            sp.data_smarrimento::text AS segnalazione_data,
            m.punteggio, m.esatto, m.stato, m.motivo_codice, m.motivo, m.aggiornato_il::text
     FROM smarriti.match m
     JOIN smarriti.oggetti o ON o.id = m.oggetto_id
     LEFT JOIN riservato.dettagli_oggetto d ON d.oggetto_id = o.id
     JOIN smarriti.segnalazioni_perso sp ON sp.id = m.segnalazione_id
     WHERE ($1::boolean = true OR o.custode_id = $2::uuid)
     ORDER BY m.esatto DESC, m.punteggio DESC, m.aggiornato_il DESC
     LIMIT 80`,
    [vediTutti, s.custodeId ?? "00000000-0000-0000-0000-000000000000"],
  );

  const arricchiti = await Promise.all(
    matches.map(async (m) => {
      const [{ rows: msgs }, { rows: appRows }, { rows: mlRows }] = await Promise.all([
        queryOggetti<{
          id: number;
          mittente: string;
          tipo: string;
          corpo_cifrato: string;
          creato_il: string;
        }>("SELECT id, mittente, tipo, corpo_cifrato, creato_il::text FROM smarriti.messaggi WHERE match_id = $1 ORDER BY id ASC", [m.id]),
        queryOggetti<{
          punto_id: string;
          punto_nome: string;
          punto_indirizzo: string;
          quando: string;
          numero_mascherato: string;
          conferma_custode_il: string | null;
          conferma_richiedente_il: string | null;
        }>(
          `SELECT a.punto_id, p.nome AS punto_nome, p.indirizzo AS punto_indirizzo,
                  a.quando::text, a.numero_mascherato,
                  a.conferma_custode_il::text, a.conferma_richiedente_il::text
           FROM smarriti.appuntamenti a
           JOIN smarriti.punti_consegna p ON p.id = a.punto_id
           WHERE a.match_id = $1`,
          [m.id],
        ),
        queryOggetti<{
          provenienza: string | null;
          tipo_recapito: string | null;
          canale: string;
          recapito_cifrato: string;
          nome_struttura: string | null;
          usato_il: string;
        }>(
          `SELECT provenienza, tipo_recapito, canale, recapito_cifrato, nome_struttura, usato_il::text
           FROM smarriti.magic_link
           WHERE rif_utente = $1 AND usato_il IS NOT NULL
           ORDER BY usato_il DESC
           LIMIT 1`,
          [m.rif_richiedente],
        ),
      ]);

      // il recapito si vede solo dopo che il proprietario ha superato la verifica
      const ml = ["verificato", "appuntamento", "restituito"].includes(String(m.stato)) ? mlRows[0] : undefined;
      const contattoAppuntamento = ml
        ? {
            provenienza: ml.provenienza,
            tipoRecapito: ml.tipo_recapito,
            canale: ml.canale,
            recapito: decifraSicuro(ml.recapito_cifrato),
            nomeStruttura: ml.nome_struttura,
            cliccatoIl: ml.usato_il,
          }
        : null;

      return {
        id: m.id,
        oggettoId: m.oggetto_id,
        oggettoChiave: m.oggetto_chiave,
        oggettoCategoria: m.oggetto_categoria,
        oggettoDescrizione: m.oggetto_descrizione,
        oggettoMacroArea: m.oggetto_macro_area,
        oggettoFascia: m.oggetto_fascia,
        oggettoStato: m.oggetto_stato,
        oggettoBloccato: m.oggetto_bloccato,
        tentativiFalliti: m.tentativi_falliti,
        dettaglioRiservato: decifraSicuro(m.dettaglio_cifrato),
        richiedentePseudonimo: m.richiedente_pseudonimo,
        segnalazioneArea: m.segnalazione_area,
        segnalazioneFascia: m.segnalazione_fascia,
        segnalazioneData: m.segnalazione_data,
        punteggio: m.punteggio,
        esatto: m.esatto,
        stato: m.stato,
        motivoCodice: m.motivo_codice,
        motivo: m.motivo,
        aggiornatoIl: m.aggiornato_il,
        messaggi: msgs.map((msg) => ({
          id: msg.id,
          mittente: msg.mittente,
          tipo: msg.tipo,
          testo: decifraSicuro(msg.corpo_cifrato) ?? "Messaggio cifrato",
          creatoIl: msg.creato_il,
        })),
        appuntamento: appRows[0] ?? null,
        contattoAppuntamento,
      };
    }),
  );

  return Response.json({ match: arricchiti }, { headers: { "Cache-Control": "no-store" } });
}
