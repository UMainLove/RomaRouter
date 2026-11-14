import "server-only";
import { querySezione } from "@/lib/db";
import { fasciaArt6 } from "@/lib/orari-arte";

/**
 * Sezione "Artisti di strada" (database rr_artisti_strada, dataset Art Spot).
 * Il cuore e' verificaLuogo(): dato un punto e un tipo di esibizione dice se ci si puo' esibire,
 * perche', a quali condizioni, cosa fare prima (preavviso alla Polizia Locale) e chi si esibisce li'.
 * Regola d'oro: una regola "da verificare" (solo stampa) non diventa mai un "no" certo.
 */

export function queryArtisti<T extends object = Record<string, unknown>>(sql: string, params?: unknown[]) {
  return querySezione<T>("artisti-di-strada", sql, params);
}

export const ATTIVITA = {
  musica: { nome: "Musica o canto", nota: "esibizioni sonore, anche acustiche" },
  silenziosa: { nome: "Esibizione silenziosa", nota: "statue viventi, mimi, giocoleria senza suono" },
  fuoco: { nome: "Spettacolo col fuoco", nota: "mangiafuoco e giocolieri col fuoco" },
  figurativa: { nome: "Ritratti e caricature", nota: "pittori, ritrattisti e caricaturisti con posto assegnato" },
  esoterica: { nome: "Cartomanzia", nota: "cartomanti e attività esoteriche" },
} as const;
export type Attivita = keyof typeof ATTIVITA;
export const eAttivita = (v: unknown): v is Attivita => typeof v === "string" && v in ATTIVITA;

export type CodiceEsito = "si" | "si_condizioni" | "solo_postazioni" | "solo_area_dedicata" | "solo_silenzio" | "probabilmente_no" | "no" | "non_adatto";

export const ESITI: Record<CodiceEsito, { titolo: string; tono: "ok" | "attenzione" | "errore" }> = {
  si: { titolo: "Sì, puoi esibirti qui", tono: "ok" },
  si_condizioni: { titolo: "Sì, con alcune condizioni", tono: "attenzione" },
  solo_postazioni: { titolo: "Solo nelle postazioni numerate", tono: "attenzione" },
  solo_area_dedicata: { titolo: "Solo nelle aree dedicate", tono: "attenzione" },
  solo_silenzio: { titolo: "Qui solo esibizioni silenziose", tono: "attenzione" },
  probabilmente_no: { titolo: "Probabilmente no: verifica prima", tono: "errore" },
  no: { titolo: "No, qui non puoi esibirti", tono: "errore" },
  non_adatto: { titolo: "Qui non c'è spazio adatto", tono: "errore" },
};

interface Zona {
  id: number; esito: string; categoria: string; nome: string; motivo: string; condizione: string | null;
  vale_per: string[]; riferimento: string | null; fonte_url: string | null; verifica: string; ufficiale: boolean;
  approssimata: boolean; priorita: number;
}

export interface Motivo {
  testo: string; luogo: string; riferimento: string | null; fonte_url: string | null; ufficiale: boolean; verifica: string; approssimata: boolean;
}

// fasce orarie in comune con la mappa (lib/orari-arte.ts)
export { fasciaArt6 };

function scuolaInAttivita(quando: Date) {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", weekday: "short", month: "numeric", hour: "numeric", hourCycle: "h23" }).formatToParts(quando);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  const ora = Number(v("hour")), mese = Number(v("month"));
  return !["Sat", "Sun"].includes(v("weekday")) && mese !== 7 && mese !== 8 && ora >= 8 && ora < 17;
}

export async function verificaLuogo(lat: number, lon: number, attivita: Attivita, quando?: Date) {
  const P = "ST_SetSRID(ST_MakePoint($1, $2), 4326)";
  const [zone, municipio, postazioni, esibizioni, contatti, pubblico, copertura] = await Promise.all([
    queryArtisti<Zona>("SELECT id, esito, categoria, nome, motivo, condizione, vale_per, riferimento, fonte_url, verifica, ufficiale, approssimata, priorita FROM artisti.zone_nel_punto($1, $2)", [lon, lat]),
    queryArtisti<{ numero: number; numero_romano: string }>(`SELECT numero, numero_romano FROM artisti.municipi WHERE ST_Intersects(geom, ${P}) LIMIT 1`, [lon, lat]),
    queryArtisti<{ id: number; nome: string; tipo: string; raggio_m: number | null; fasce_testo: string | null; regole_testo: string | null; verifica: string | null; posizione_stimata: boolean; distanza_m: number; lat: number; lon: number }>(
      `SELECT id, nome, tipo, raggio_m, fasce_testo, regole_testo, verifica, posizione_stimata,
              round(ST_Distance(geom::geography, ${P}::geography))::int AS distanza_m, ST_Y(geom) AS lat, ST_X(geom) AS lon
       FROM artisti.postazioni WHERE attiva AND ST_DWithin(geom::geography, ${P}::geography, 600)
       ORDER BY geom <-> ${P} LIMIT 8`, [lon, lat]),
    queryArtisti<{ id: string; inizio: string; fine: string; nome_arte: string; disciplina: string; descrizione: string | null; link: string | null; luogo: string | null; postazione: string | null; demo: boolean; distanza_m: number }>(
      `SELECT id, inizio, fine, nome_arte, disciplina, descrizione, link, luogo, postazione, demo,
              round(ST_Distance(geom::geography, ${P}::geography))::int AS distanza_m
       FROM artisti.v_esibizioni
       WHERE geom IS NOT NULL AND fine > now() AND inizio < now() + interval '7 days' AND ST_DWithin(geom::geography, ${P}::geography, 500)
       ORDER BY inizio LIMIT 20`, [lon, lat]),
    queryArtisti<{ gruppo_pl: string | null; indirizzo_pl: string | null; pec_pl: string | null; telefono_pl: string | null; pec_municipio: string | null; verifica: string | null }>(
      `SELECT c.gruppo_pl, c.indirizzo_pl, c.pec_pl, c.telefono_pl, c.pec_municipio, c.verifica
       FROM artisti.contatti c JOIN artisti.municipi m ON m.numero = c.municipio
       WHERE ST_Intersects(m.geom, ${P}) ORDER BY c.geom <-> ${P} NULLS LAST LIMIT 1`, [lon, lat]),
    queryArtisti<{ layer: string; n: number }>(
      `SELECT layer, count(*)::int AS n FROM artisti.contesto
       WHERE layer IN ('attrazioni', 'piazze_pedonali', 'stazioni', 'nightlife', 'venue_cultura') AND ST_DWithin(geom::geography, ${P}::geography, 300)
       GROUP BY layer`, [lon, lat]),
    // tutta Roma coperta: in questo esagono c'e' spazio pubblico (strade, piazze), e' un parco o niente?
    queryArtisti<{ classe: string }>(`SELECT classe FROM artisti.copertura WHERE cella = h3_lat_lng_to_cell(${P}, 10)`, [lon, lat]).catch(() => ({ rows: [] as { classe: string }[] })),
  ]);
  const classe = copertura.rows[0]?.classe ?? "adatta";

  const tocca = (z: Zona) => z.vale_per.length === 0 || z.vale_per.includes(attivita);
  // scuole: niente musica solo mentre sono in attivita' (art. 2), cioe' giorni feriali 8-17 da settembre a giugno
  const scuolaAperta = scuolaInAttivita(quando ?? new Date());
  const pertinenti = zone.rows
    .filter(tocca)
    .map((z) => (z.categoria === "scuola" && z.esito === "condizioni" && scuolaAperta ? { ...z, esito: "solo_silenzio" } : z));
  const motivo = (z: Zona): Motivo => ({
    testo: z.motivo + (z.condizione ? ` (${z.condizione})` : ""), luogo: z.nome, riferimento: z.riferimento, fonte_url: z.fonte_url,
    ufficiale: z.ufficiale, verifica: z.verifica, approssimata: z.approssimata,
  });

  const di = (esito: string, ufficiale?: boolean) => pertinenti.filter((z) => z.esito === esito && (ufficiale === undefined || z.ufficiale === ufficiale));
  const motivi: Motivo[] = [];
  const condizioni: Motivo[] = [];
  let codice: CodiceEsito = "si";

  // Attivita' che il regolamento ammette solo in aree dedicate
  const dedicate = di("area_dedicata").filter((z) => z.vale_per.includes(attivita));
  if ((attivita === "esoterica" || attivita === "figurativa") && dedicate.length === 0) {
    codice = "solo_area_dedicata";
    motivi.push({
      testo: attivita === "esoterica"
        ? "Cartomanti e attività esoteriche sono ammessi solo nelle aree indicate dall'art. 13 del regolamento (Corsia Agonale, Tor Millina, Pincio, Augusto Imperatore, Campo de' Fiori, Calcarari, Castel S. Angelo, Trilussa)."
        : "Ritrattisti e caricaturisti lavorano solo nei posti assegnati con l'avviso pubblico delle arti figurative (DAC 304/2025).",
      luogo: "Roma", riferimento: attivita === "esoterica" ? "DAC 24/2012, art. 13" : "DAC 304/2025", fonte_url: null, ufficiale: true, verifica: "ufficiale", approssimata: false,
    });
  }

  if (di("no", true).length) {
    codice = "no";
    di("no", true).forEach((z) => motivi.push(motivo(z)));
  } else if (di("no", false).length) {
    codice = "probabilmente_no";
    di("no", false).forEach((z) => motivi.push(motivo(z)));
  } else if (di("solo_silenzio").length) {
    codice = "solo_silenzio";
    di("solo_silenzio").forEach((z) => motivi.push(motivo(z)));
  } else if (codice === "si" && di("solo_postazioni").length) {
    codice = "solo_postazioni";
    di("solo_postazioni").forEach((z) => motivi.push(motivo(z)));
  }
  // Nessuno spazio pubblico qui (campagna, ferrovia, autostrada, fiume): si dice, anche senza divieti
  if (classe === "non_adatta" && (codice === "si" || codice === "solo_area_dedicata") && !di("area_dedicata").length) {
    codice = "non_adatto";
    motivi.unshift({
      testo: "Qui non ci sono strade percorribili a piedi né piazze: campagna, ferrovia, autostrada o fiume. Cerca una via o una piazza vicina.",
      luogo: "Questa zona", riferimento: "DAC 24/2012, art. 2 (spazi pubblici)", fonte_url: null, ufficiale: true, verifica: "ufficiale; zona da stradario di Roma Capitale", approssimata: true,
    });
  }
  if (classe === "parco") {
    condizioni.push({
      testo: "Nel parco: solo su viali pavimentati o brecciati, a basso impatto sonoro e senza amplificazione.",
      luogo: "Parco", riferimento: "DAC 24/2012, Allegato A", fonte_url: null, ufficiale: true, verifica: "ufficiale", approssimata: true,
    });
  }
  // Regole in conflitto (es. divieto da stampa dentro un sito dell'Allegato B): si mostrano anche le altre
  if (codice === "probabilmente_no" || codice === "no") di("solo_postazioni").forEach((z) => motivi.push(motivo(z)));

  di("condizioni").forEach((z) => condizioni.push(motivo(z)));
  if (codice === "si" && condizioni.length) codice = "si_condizioni";
  if (codice === "non_adatto") condizioni.length = 0;
  di("info").forEach((z) => condizioni.push(motivo(z)));
  // aree consentite per tutte le attivita' (Municipio X): buona notizia da mostrare
  di("area_dedicata").filter((z) => z.vale_per.length === 0).forEach((z) => condizioni.push(motivo(z)));
  if (dedicate.length && (codice === "si" || codice === "solo_area_dedicata")) {
    codice = "si";
    dedicate.forEach((z) => condizioni.push(motivo(z)));
  }

  const orario = quando ? fasciaArt6(quando, attivita) : null;
  const pl = contatti.rows[0] ?? null;
  const cosaFare = [
    pl?.pec_pl
      ? `Almeno 3 giorni prima, manda una comunicazione protocollata al ${pl.gruppo_pl ?? "Gruppo di Polizia Locale"} (PEC ${pl.pec_pl}) con luogo, giorno e orario (art. 10).`
      : "Almeno 3 giorni prima, manda una comunicazione protocollata al Gruppo di Polizia Locale del Municipio (art. 10).",
    "Al massimo 2 ore per fascia oraria e una postazione per sito, occupando al massimo 1 m² e lasciando 2 m di marciapiede liberi.",
    "Non paghi l'occupazione di suolo pubblico (esenzione COSAP, art. 8).",
    ...(attivita === "musica" ? ["Se suoni brani tutelati, serve la licenza SIAE anche «a cappello»; i brani tuoi sono esclusi."] : []),
    ...(attivita === "fuoco" ? ["Resta ad almeno 5 m dal pubblico; con più di 2 artisti servono coperta ignifuga ed estintore (art. 5)."] : []),
  ];

  return {
    punto: { lat, lon },
    municipio: municipio.rows[0] ?? null,
    attivita: { codice: attivita, ...ATTIVITA[attivita] },
    esito: { codice, ...ESITI[codice] },
    motivi,
    condizioni,
    orario,
    postazioni_vicine: postazioni.rows,
    esibizioni: esibizioni.rows,
    pubblico: Object.fromEntries(pubblico.rows.map((r) => [r.layer, r.n])),
    contatti_polizia_locale: pl,
    cosa_fare: codice === "no" ? [] : cosaFare,
    avvertenze: [
      "Le zone vicino a scuole, ospedali, luoghi di culto e monumenti hanno confini stimati: il regolamento dice «presso» senza fissare una distanza.",
      "Il regolamento è del 2012 (DAC 24/2012) con le parti annullate dal TAR nel 2013; i divieti del Municipio I cambiano spesso. Nel dubbio chiedi al Municipio.",
    ],
  };
}

export type VerificaLuogo = Awaited<ReturnType<typeof verificaLuogo>>;
