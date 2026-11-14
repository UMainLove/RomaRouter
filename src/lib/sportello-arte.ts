import "server-only";
import { cookies } from "next/headers";
import { eAttivita, fasciaArt6, queryArtisti, verificaLuogo, type Attivita } from "@/lib/artisti";
import type { EsitoPrenota, MiaPrenotazione, Pass, Passo } from "@/lib/pass-arte";
export { regoleDelPass } from "@/lib/pass-arte";

/*
 * Sportello unico dell'arte di strada.
 *  - Pass dell'artista: una registrazione sola (identita', cosa fa, tre risposte si'/no, delega).
 *  - Prenotazione con un tocco: tutte le regole si controllano qui (art. 6 orari, art. 10 preavviso di 3 giorni,
 *    zone e postazioni, niente amplificazione nell'Allegato B, turni gia' presi).
 *  - Ogni sera lo sportello manda UNA comunicazione per Gruppo di Polizia Locale con tutte le esibizioni del suo
 *    territorio, l'elenco SIAE e le richieste di nulla osta ai Municipi (tipo 1).
 * DEMO: niente PEC vere. Le comunicazioni si scrivono complete (anche come file .eml) e restano in artisti.invii.
 */

export const COOKIE_PASS = "rr_pass";
const ROMA = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(d);
const oraIt = (d: Date) => d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
const giornoIt = (d: Date) => d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Rome" });
const VIETATI = new Set(["no", "probabilmente_no", "solo_area_dedicata", "solo_silenzio", "non_adatto"]);
const ATTIVITA_NOME: Record<Attivita, string> = { musica: "musica", silenziosa: "esibizione silenziosa", fuoco: "spettacolo col fuoco", figurativa: "ritratti", esoterica: "cartomanzia" };

const CAMPI_PASS = `id, numero_pass, nome, cognome, email, identita, nome_arte, disciplina, attivita, gruppo_grande, amplificazione, cover,
  fuoco_oltre_due, posto_assegnato, delega, creato_il`;

export async function passCorrente(): Promise<Pass | null> {
  const token = (await cookies()).get(COOKIE_PASS)?.value;
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { rows } = await queryArtisti<Pass>(`SELECT ${CAMPI_PASS} FROM artisti.profili WHERE token = $1`, [token]);
  return rows[0] ?? null;
}

const testo = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function creaPass(b: Record<string, unknown>): Promise<{ pass: Pass; token: string } | { errore: string }> {
  const nome = testo(b.nome, 60), cognome = testo(b.cognome, 60), email = testo(b.email, 120);
  const nomeArte = testo(b.nome_arte, 60), attivita = b.attivita;
  if (nome.length < 2 || cognome.length < 2) return { errore: "Servono nome e cognome (con SPID arrivano da soli)" };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { errore: "Email non valida" };
  if (nomeArte.length < 2) return { errore: "Scegli il tuo nome d'arte" };
  if (!eAttivita(attivita)) return { errore: "Scegli cosa fai" };
  if (b.delega !== true) return { errore: "Serve la delega: senza, il preavviso alla Polizia Locale dovresti mandarlo tu" };
  const disciplina = testo(b.disciplina, 60) || ATTIVITA_NOME[attivita];
  const { rows } = await queryArtisti<Pass & { token: string }>(
    `INSERT INTO artisti.profili (rif_artista, token, numero_pass, nome, cognome, email, identita, nome_arte, disciplina, attivita,
       gruppo_grande, amplificazione, cover, fuoco_oltre_due, posto_assegnato, delega, delega_il, pubblico)
     SELECT 'pass:' || t, t, 'RR-' || to_char(now(), 'YY') || '-' || lpad(nextval('artisti.pass_seq')::text, 5, '0'),
            $1, $2, NULLIF($3, ''), $4, $5, $6, $7, $8, $9, $10, $11, NULLIF($12, ''), true, now(), true
     FROM (SELECT gen_random_uuid() AS t) g
     RETURNING ${CAMPI_PASS}, token::text`,
    [nome, cognome, email, b.identita === "spid" || b.identita === "cie" ? b.identita : "prova", nomeArte, disciplina, attivita,
     b.gruppo_grande === true, b.amplificazione === true, b.cover === true, b.fuoco_oltre_due === true, testo(b.posto_assegnato, 30)],
  );
  const { token, ...pass } = rows[0];
  return { pass, token };
}

/** Prima data che rispetta il preavviso di 3 giorni (art. 10). */
export function primaDataUtile(ora = new Date()) {
  return ROMA(new Date(ora.getTime() + 3 * 86_400_000));
}

export async function prenota(pass: Pass, b: Record<string, unknown>): Promise<EsitoPrenota | { errore: string; suggerimento?: { inizio: string } }> {
  const lat = Number(b.lat), lon = Number(b.lon);
  const luogo = testo(b.luogo, 160) || "Punto scelto sulla mappa";
  const inizio = new Date(String(b.inizio)), durata = Number(b.durata_min);
  const attivita = pass.attivita;
  if (!(lat > 41.5 && lat < 42.2 && lon > 12.1 && lon < 13)) return { errore: "Serve un punto di Roma" };
  if (isNaN(inizio.getTime()) || !(durata >= 30 && durata <= 120)) return { errore: "Scegli giorno, ora e durata (da 30 minuti a 2 ore)" };
  const fine = new Date(inizio.getTime() + durata * 60_000);
  if (ROMA(inizio) < primaDataUtile()) return { errore: `Il preavviso alla Polizia Locale va mandato 3 giorni prima: la prima data utile è ${giornoIt(new Date(Date.now() + 3 * 86_400_000))}.` };
  if (inizio.getTime() > Date.now() + 31 * 86_400_000) return { errore: "Si prenota al massimo un mese prima" };
  if (!fasciaArt6(inizio, attivita).dentro || !fasciaArt6(new Date(fine.getTime() - 60_000), attivita).dentro) {
    return { errore: `Fuori orario: si può ${fasciaArt6(inizio, attivita).testo} (art. 6).` };
  }
  if (attivita === "figurativa" && !pass.posto_assegnato) return { errore: "Per i ritratti serve il posto assegnato dal Comune: aggiungilo al tuo Pass." };

  const v = await verificaLuogo(lat, lon, attivita, inizio);
  if (VIETATI.has(v.esito.codice)) return { errore: `Qui no: ${v.esito.titolo.toLowerCase()}.` };
  const postazione = v.postazioni_vicine.find((p) => p.distanza_m <= 20);
  if (v.esito.codice === "solo_postazioni" && !postazione) return { errore: "Qui solo sui palchi numerati: tocca un palco sulla mappa." };
  if (pass.amplificazione && (v.esito.codice === "solo_postazioni" || postazione?.tipo === "postazione_allegatoB")) {
    return { errore: "Sui palchi dell'Allegato B non si usa amplificazione (art. 4): scegli una zona verde fuori dai palchi." };
  }
  if (pass.amplificazione && v.condizioni.some((c) => c.luogo === "Parco")) return { errore: "Nei parchi niente amplificazione (Allegato A)." };

  // turni: stesso palco, o entro 30 m, nello stesso orario
  const conflitto = await queryArtisti<{ nome_arte: string; inizio: string; fine: string; mio: boolean }>(
    `SELECT pr.nome_arte, p.inizio, p.fine, p.profilo_id = $6 AS mio
     FROM artisti.prenotazioni p JOIN artisti.profili pr ON pr.id = p.profilo_id
     WHERE p.stato <> 'annullata' AND p.inizio < $2 AND p.fine > $1
       AND (p.profilo_id = $6 OR ($5::bigint IS NOT NULL AND p.postazione_id = $5)
            OR ST_DWithin(p.geom::geography, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, 30))
     ORDER BY p.fine DESC LIMIT 1`,
    [inizio, fine, lon, lat, postazione?.id ?? null, pass.id],
  );
  if (conflitto.rows[0]) {
    const c = conflitto.rows[0];
    if (c.mio) return { errore: `Hai già un'esibizione dalle ${oraIt(new Date(c.inizio))} alle ${oraIt(new Date(c.fine))}.` };
    const dopo = new Date(c.fine);
    const ok = fasciaArt6(dopo, attivita).dentro && fasciaArt6(new Date(dopo.getTime() + durata * 60_000 - 60_000), attivita).dentro;
    return {
      errore: `Qui c'è già ${c.nome_arte} dalle ${oraIt(new Date(c.inizio))} alle ${oraIt(dopo)}.`,
      ...(ok ? { suggerimento: { inizio: dopo.toISOString() } } : {}),
    };
  }

  const pl = v.contatti_polizia_locale;
  const { rows } = await queryArtisti<{ id: string }>(
    `INSERT INTO artisti.prenotazioni (profilo_id, postazione_id, inizio, fine, rif_artista, stato, luogo, geom, attivita,
       municipio, gruppo_pl, pec_pl, nulla_osta, creata_dal_pass)
     VALUES ($1, $2, $3, $4, $5, 'confermata', $6, ST_SetSRID(ST_MakePoint($7, $8), 4326), $9, $10, $11, $12, $13, true)
     RETURNING id`,
    [pass.id, postazione?.id ?? null, inizio, fine, `pass:${pass.numero_pass}`, postazione ? postazione.nome : luogo, lon, lat, attivita,
     v.municipio?.numero ?? null, pl?.gruppo_pl ?? null, pl?.pec_pl ?? null, pass.gruppo_grande ? "richiesto" : null],
  );
  const passi: Passo[] = [
    { fatto: true, testo: `Turno bloccato: ${giornoIt(inizio)}, ${oraIt(inizio)}–${oraIt(fine)}` },
    { fatto: true, testo: "Sei sulla mappa: i cittadini ti vedono" },
    { fatto: false, testo: `Preavviso alla Polizia Locale${pl?.gruppo_pl ? ` (${pl.gruppo_pl})` : ""}: parte stasera alle 20 con quello degli altri artisti` },
  ];
  if (pass.cover) passi.push({ fatto: false, testo: "SIAE: sei nell'elenco settimanale per la licenza" });
  if (pass.gruppo_grande) passi.push({ fatto: false, testo: `Nulla osta: lo chiediamo al Municipio ${v.municipio?.numero_romano ?? ""}` });
  return { id: rows[0].id, luogo: postazione ? postazione.nome : luogo, inizio: inizio.toISOString(), fine: fine.toISOString(), gruppo_pl: pl?.gruppo_pl ?? null, passi };
}

export async function prenotazioniDelPass(passId: string) {
  const { rows } = await queryArtisti<MiaPrenotazione>(
    `SELECT p.id, p.luogo, p.inizio, p.fine, p.gruppo_pl, ip.creato_il AS preavviso_il, isi.creato_il AS siae_il, p.nulla_osta,
            ST_Y(p.geom) AS lat, ST_X(p.geom) AS lon
     FROM artisti.prenotazioni p
     LEFT JOIN artisti.invii ip ON ip.id = p.invio_pl_id
     LEFT JOIN artisti.invii isi ON isi.id = p.invio_siae_id
     WHERE p.profilo_id = $1 AND p.stato <> 'annullata' AND p.fine > now()
     ORDER BY p.inizio LIMIT 20`,
    [passId],
  );
  return rows;
}

export async function annullaPrenotazione(passId: string, id: string) {
  const r = await queryArtisti(`UPDATE artisti.prenotazioni SET stato = 'annullata' WHERE id = $1 AND profilo_id = $2 AND invio_pl_id IS NULL`, [id, passId]);
  return (r.rowCount ?? 0) > 0;
}

// ===================================================================== sportello (lato operatori)

/** Gruppo di Polizia Locale per le prenotazioni che non l'hanno (es. esibizioni dimostrative). */
async function completaGruppi() {
  await queryArtisti(
    `UPDATE artisti.prenotazioni p
     SET municipio = x.municipio, gruppo_pl = x.gruppo_pl, pec_pl = x.pec_pl
     FROM (
       SELECT p2.id, c.municipio, c.gruppo_pl, c.pec_pl
       FROM artisti.prenotazioni p2
       CROSS JOIN LATERAL (
         SELECT c.municipio, c.gruppo_pl, c.pec_pl FROM artisti.contatti c
         JOIN artisti.municipi m ON m.numero = c.municipio AND ST_Intersects(m.geom, p2.geom)
         ORDER BY c.geom <-> p2.geom NULLS LAST LIMIT 1
       ) c
       WHERE p2.gruppo_pl IS NULL AND p2.geom IS NOT NULL
     ) x
     WHERE p.id = x.id`,
  );
}

export interface Coda {
  pl: { gruppo_pl: string; pec_pl: string | null; municipio: number | null; n: number; dal: string; al: string; tardive: number }[];
  siae: { nome_arte: string; numero_pass: string | null; n: number }[];
  nulla_osta: { municipio: number | null; n: number }[];
  invii: { id: number; tipo: string; destinatario: string; indirizzo: string | null; oggetto: string; corpo: string; n_esibizioni: number; stato: string; creato_il: string }[];
  totali: { pass: number; prenotazioni_pass: number; in_coda: number; inviate: number };
}

export async function coda(): Promise<Coda> {
  await completaGruppi();
  const [pl, siae, no, invii, tot] = await Promise.all([
    queryArtisti<Coda["pl"][number]>(
      `SELECT gruppo_pl, min(pec_pl) AS pec_pl, min(municipio)::int AS municipio, count(*)::int AS n,
              min(inizio) AS dal, max(inizio) AS al,
              count(*) FILTER (WHERE inizio < now() + interval '3 days')::int AS tardive
       FROM artisti.prenotazioni
       WHERE invio_pl_id IS NULL AND stato <> 'annullata' AND fine > now() AND gruppo_pl IS NOT NULL
       GROUP BY gruppo_pl ORDER BY count(*) DESC`,
    ),
    queryArtisti<Coda["siae"][number]>(
      `SELECT pr.nome_arte, pr.numero_pass, count(*)::int AS n
       FROM artisti.prenotazioni p JOIN artisti.profili pr ON pr.id = p.profilo_id
       WHERE pr.cover AND p.invio_siae_id IS NULL AND p.stato <> 'annullata' AND p.fine > now()
       GROUP BY 1, 2 ORDER BY 3 DESC`,
    ),
    queryArtisti<Coda["nulla_osta"][number]>(
      `SELECT municipio, count(*)::int AS n FROM artisti.prenotazioni
       WHERE nulla_osta = 'richiesto' AND stato <> 'annullata' AND fine > now() GROUP BY 1 ORDER BY 1`,
    ),
    queryArtisti<Coda["invii"][number]>(
      `SELECT id, tipo, destinatario, indirizzo, oggetto, corpo, n_esibizioni, stato, creato_il FROM artisti.invii ORDER BY date_trunc('minute', creato_il) DESC, id LIMIT 40`,
    ),
    queryArtisti<Coda["totali"]>(
      `SELECT (SELECT count(*)::int FROM artisti.profili WHERE token IS NOT NULL) AS pass,
              (SELECT count(*)::int FROM artisti.prenotazioni WHERE creata_dal_pass AND stato <> 'annullata') AS prenotazioni_pass,
              (SELECT count(*)::int FROM artisti.prenotazioni WHERE invio_pl_id IS NULL AND stato <> 'annullata' AND fine > now()) AS in_coda,
              (SELECT count(*)::int FROM artisti.invii) AS inviate`,
    ),
  ]);
  return { pl: pl.rows, siae: siae.rows, nulla_osta: no.rows, invii: invii.rows, totali: tot.rows[0] };
}

type RigaLotto = { id: string; inizio: string; fine: string; luogo: string | null; attivita: string | null; nome_arte: string; disciplina: string;
  nome: string | null; cognome: string | null; numero_pass: string | null; amplificazione: boolean | null; gruppo_grande: boolean | null; demo: boolean };

const csvCampo = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Il lotto della sera: una comunicazione per Gruppo di Polizia Locale, l'elenco SIAE, i nulla osta. */
export async function inviaLotto() {
  await completaGruppi();
  const creati: number[] = [];
  const firma = "Sportello arte di strada – RomaRouter (DEMO: comunicazione generata, non inviata)";

  // 1. Polizia Locale, art. 10
  const gruppi = await queryArtisti<{ gruppo_pl: string; pec_pl: string | null; municipio: number | null }>(
    `SELECT gruppo_pl, min(pec_pl) pec_pl, min(municipio)::int municipio FROM artisti.prenotazioni
     WHERE invio_pl_id IS NULL AND stato <> 'annullata' AND fine > now() AND gruppo_pl IS NOT NULL GROUP BY gruppo_pl`,
  );
  for (const g of gruppi.rows) {
    const { rows } = await queryArtisti<RigaLotto>(
      `SELECT p.id, p.inizio, p.fine, p.luogo, p.attivita, pr.nome_arte, pr.disciplina, pr.nome, pr.cognome, pr.numero_pass,
              pr.amplificazione, pr.gruppo_grande, pr.rif_artista LIKE 'demo:%' AS demo
       FROM artisti.prenotazioni p JOIN artisti.profili pr ON pr.id = p.profilo_id
       WHERE p.invio_pl_id IS NULL AND p.stato <> 'annullata' AND p.fine > now() AND p.gruppo_pl = $1
       ORDER BY p.inizio`,
      [g.gruppo_pl],
    );
    if (!rows.length) continue;
    const dal = new Date(rows[0].inizio), al = new Date(rows[rows.length - 1].inizio);
    const artisti = new Set(rows.map((r) => r.nome_arte)).size;
    const elenco = rows.map((r) => {
      const i = new Date(r.inizio), f = new Date(r.fine);
      const chi = r.demo ? "artista dimostrativo" : [r.nome, r.cognome].filter(Boolean).join(" ") || "—";
      const note = [r.gruppo_grande ? "tipo 1, nulla osta richiesto" : "", r.amplificazione ? "con amplificazione" : "", i.getTime() < Date.now() + 3 * 86_400_000 ? "comunicazione tardiva" : ""].filter(Boolean).join("; ");
      return `- ${giornoIt(i)} ${oraIt(i)}–${oraIt(f)} · ${r.luogo ?? "—"} · ${r.nome_arte} (${r.disciplina}) · ${chi}${r.numero_pass ? ` · Pass ${r.numero_pass}` : ""}${note ? ` · ${note}` : ""}`;
    });
    const csv = ["data;inizio;fine;luogo;nome_arte;disciplina;artista;pass;note"]
      .concat(rows.map((r) => [ROMA(new Date(r.inizio)), oraIt(new Date(r.inizio)), oraIt(new Date(r.fine)), r.luogo, r.nome_arte, r.disciplina,
        r.demo ? "artista dimostrativo" : [r.nome, r.cognome].filter(Boolean).join(" "), r.numero_pass ?? "", r.gruppo_grande ? "tipo 1" : ""].map(csvCampo).join(";")))
      .join("\n");
    const oggetto = `Arte di strada – comunicazioni art. 10 DAC 24/2012 – ${g.gruppo_pl} – ${rows.length} esibizioni dal ${giornoIt(dal)} al ${giornoIt(al)}`;
    const corpo = [
      `Al Comando del ${g.gruppo_pl} della Polizia Locale di Roma Capitale,`,
      "",
      `ai sensi dell'art. 10 del Regolamento per l'arte di strada (Deliberazione dell'Assemblea Capitolina n. 24/2012) si trasmettono le comunicazioni delle esibizioni programmate nel territorio di competenza, raccolte dallo sportello RomaRouter su delega degli artisti, che si sono identificati e hanno accettato le regole del Regolamento.`,
      "",
      `Riepilogo: ${rows.length} esibizioni di ${artisti} artisti, dal ${giornoIt(dal)} al ${giornoIt(al)}. Ogni luogo e orario è stato verificato rispetto alle fasce dell'art. 6, ai divieti dei Municipi e alle postazioni dell'Allegato B.`,
      "",
      "Elenco:",
      ...elenco,
      "",
      "In allegato lo stesso elenco in formato CSV.",
      "",
      "Cordiali saluti,",
      firma,
    ].join("\n");
    const inv = await queryArtisti<{ id: number }>(
      `INSERT INTO artisti.invii (tipo, destinatario, indirizzo, municipio, oggetto, corpo, allegato_csv, n_esibizioni)
       VALUES ('pec_pl', $1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [g.gruppo_pl, g.pec_pl, g.municipio, oggetto, corpo, csv, rows.length],
    );
    await queryArtisti(`UPDATE artisti.prenotazioni SET invio_pl_id = $1, preavviso_pl_inviato = true WHERE id = ANY($2::uuid[])`, [inv.rows[0].id, rows.map((r) => r.id)]);
    creati.push(inv.rows[0].id);
  }

  // 2. SIAE: chi suona brani di altri
  const siae = await queryArtisti<{ id: string; nome_arte: string; nome: string | null; cognome: string | null; numero_pass: string | null; inizio: string; luogo: string | null }>(
    `SELECT p.id, pr.nome_arte, pr.nome, pr.cognome, pr.numero_pass, p.inizio, p.luogo
     FROM artisti.prenotazioni p JOIN artisti.profili pr ON pr.id = p.profilo_id
     WHERE pr.cover AND p.invio_siae_id IS NULL AND p.stato <> 'annullata' AND p.fine > now() ORDER BY pr.nome_arte, p.inizio`,
  );
  if (siae.rows.length) {
    const corpo = [
      "Alla SIAE – Sede di Roma,",
      "",
      "si trasmette l'elenco degli artisti di strada che eseguono anche brani tutelati, con le date delle esibizioni programmate, per la verifica o il rilascio della licenza forfettaria per musica dal vivo in strada.",
      "",
      ...siae.rows.map((r) => `- ${r.nome_arte} (${[r.nome, r.cognome].filter(Boolean).join(" ")}${r.numero_pass ? `, Pass ${r.numero_pass}` : ""}) · ${giornoIt(new Date(r.inizio))} · ${r.luogo ?? "—"}`),
      "",
      firma,
    ].join("\n");
    const inv = await queryArtisti<{ id: number }>(
      `INSERT INTO artisti.invii (tipo, destinatario, indirizzo, oggetto, corpo, n_esibizioni)
       VALUES ('siae', 'SIAE – Sede di Roma', NULL, $1, $2, $3) RETURNING id`,
      [`Arte di strada – elenco settimanale artisti con brani tutelati (${siae.rows.length} esibizioni)`, corpo, siae.rows.length],
    );
    await queryArtisti(`UPDATE artisti.prenotazioni SET invio_siae_id = $1 WHERE id = ANY($2::uuid[])`, [inv.rows[0].id, siae.rows.map((r) => r.id)]);
    creati.push(inv.rows[0].id);
  }

  // 3. Nulla osta (tipo 1) ai Municipi
  const no = await queryArtisti<{ municipio: number | null; pec: string | null; romano: string | null; righe: { id: string; nome_arte: string; inizio: string; luogo: string | null }[] }>(
    `SELECT p.municipio, (SELECT c.pec_municipio FROM artisti.contatti c WHERE c.municipio = p.municipio LIMIT 1) AS pec,
            (SELECT m.numero_romano FROM artisti.municipi m WHERE m.numero = p.municipio) AS romano,
            json_agg(json_build_object('id', p.id, 'nome_arte', pr.nome_arte, 'inizio', p.inizio, 'luogo', p.luogo) ORDER BY p.inizio) AS righe
     FROM artisti.prenotazioni p JOIN artisti.profili pr ON pr.id = p.profilo_id
     WHERE p.nulla_osta = 'richiesto' AND p.stato <> 'annullata' AND p.fine > now() GROUP BY p.municipio`,
  );
  for (const m of no.rows) {
    const corpo = [
      `Al Municipio ${m.romano ?? m.municipio ?? ""} – Ufficio Cultura,`,
      "",
      "si chiede il nulla osta per i seguenti spettacoli di arte di strada di tipo 1 (gruppi oltre cinque artisti, impianti di amplificazione potenti o scenografie oltre 1 m², art. 1 DAC 24/2012):",
      "",
      ...m.righe.map((r) => `- ${r.nome_arte} · ${giornoIt(new Date(r.inizio))} ${oraIt(new Date(r.inizio))} · ${r.luogo ?? "—"}`),
      "",
      firma,
    ].join("\n");
    const inv = await queryArtisti<{ id: number }>(
      `INSERT INTO artisti.invii (tipo, destinatario, indirizzo, municipio, oggetto, corpo, n_esibizioni)
       VALUES ('nulla_osta', $1, $2, $3, $4, $5, $6) RETURNING id`,
      [`Municipio ${m.romano ?? m.municipio ?? "?"} – Ufficio Cultura`, m.pec, m.municipio, `Arte di strada – richiesta di nulla osta per spettacoli di tipo 1 (${m.righe.length})`, corpo, m.righe.length],
    );
    await queryArtisti(`UPDATE artisti.prenotazioni SET nulla_osta = 'inviato', invio_nulla_osta_id = $1 WHERE id = ANY($2::uuid[])`, [inv.rows[0].id, m.righe.map((r) => r.id)]);
    creati.push(inv.rows[0].id);
  }
  return creati;
}

/** La comunicazione come vero file email (.eml), con l'elenco CSV allegato: pronto per la PEC vera. */
export async function emlInvio(id: number) {
  const { rows } = await queryArtisti<{ id: number; indirizzo: string | null; destinatario: string; oggetto: string; corpo: string; allegato_csv: string | null; creato_il: string }>(
    `SELECT id, indirizzo, destinatario, oggetto, corpo, allegato_csv, creato_il FROM artisti.invii WHERE id = $1`,
    [id],
  );
  const i = rows[0];
  if (!i) return null;
  // oggetto in parole codificate da al massimo 75 caratteri (RFC 2047), spezzando sui caratteri e non sui byte
  const parole = (s: string) => {
    const pezzi: string[] = [];
    let p = "";
    for (const ch of s) {
      if (Buffer.byteLength(p + ch, "utf8") > 42) {
        pezzi.push(p);
        p = "";
      }
      p += ch;
    }
    if (p) pezzi.push(p);
    return pezzi.map((x) => `=?UTF-8?B?${Buffer.from(x, "utf8").toString("base64")}?=`).join("\r\n ");
  };
  const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64").replace(/.{76}/g, "$&\r\n");
  const confine = `rr-${i.id}-${Date.now().toString(36)}`;
  const parti = [
    `From: "Sportello arte di strada - RomaRouter (DEMO)" <sportello-arte@romarouter.example>`,
    `To: "${i.destinatario}" <${i.indirizzo ?? "indirizzo-da-indicare@example.invalid"}>`,
    `Subject: ${parole("[DEMO] " + i.oggetto)}`,
    "X-RomaRouter: DEMO - comunicazione generata, non inviata",
    `Date: ${new Date(i.creato_il).toUTCString()}`,
    `Message-ID: <invio-${i.id}@romarouter.example>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${confine}"`,
    "",
    `--${confine}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64(i.corpo),
  ];
  if (i.allegato_csv) {
    parti.push(
      `--${confine}`,
      `Content-Type: text/csv; charset=utf-8; name="esibizioni-${i.id}.csv"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="esibizioni-${i.id}.csv"`,
      "",
      b64("﻿" + i.allegato_csv),
    );
  }
  parti.push(`--${confine}--`, "");
  return { nome: `comunicazione-${i.id}.eml`, testo: parti.join("\r\n") };
}

/** DEMO: rimette tutto in coda (cancella le comunicazioni generate) per rifare la prova da capo. */
export async function azzeraDemo() {
  await queryArtisti(
    `UPDATE artisti.prenotazioni SET invio_pl_id = NULL, invio_siae_id = NULL, preavviso_pl_inviato = false,
       invio_nulla_osta_id = NULL, nulla_osta = CASE WHEN nulla_osta IS NULL THEN NULL ELSE 'richiesto' END
     WHERE invio_pl_id IS NOT NULL OR invio_siae_id IS NOT NULL OR invio_nulla_osta_id IS NOT NULL`,
  );
  await queryArtisti(`DELETE FROM artisti.invii`);
}
