import { connection, type NextRequest } from "next/server";
import { eAttivita, fasciaArt6, queryArtisti, verificaLuogo } from "@/lib/artisti";

// GET /api/artisti/esibizioni[?giorni=7] — per i cittadini: chi si esibisce, dove e quando
// (solo profili pubblici e prenotazioni non annullate, vedi artisti.v_esibizioni).
export async function GET(req: NextRequest) {
  await connection();
  const giorni = Math.min(Math.max(Number(req.nextUrl.searchParams.get("giorni")) || 7, 1), 31);
  const { rows } = await queryArtisti<{ fc: unknown }>(
    `SELECT json_build_object('type', 'FeatureCollection', 'features', COALESCE(json_agg(json_build_object(
        'type', 'Feature', 'id', e.id,
        'geometry', ST_AsGeoJSON(e.geom, 6)::json,
        'properties', json_build_object('nome_arte', e.nome_arte, 'disciplina', e.disciplina, 'descrizione', e.descrizione,
          'link', e.link, 'inizio', e.inizio, 'fine', e.fine, 'luogo', e.luogo, 'postazione', e.postazione, 'attivita', e.attivita, 'stato', e.stato)
      ) ORDER BY e.inizio), '[]'::json)) AS fc
     FROM artisti.v_esibizioni e
     WHERE e.geom IS NOT NULL AND e.fine > now() AND e.inizio < now() + make_interval(days => $1)`,
    [giorni],
  );
  return Response.json(rows[0].fc, { headers: { "Cache-Control": "no-store" } });
}

// POST /api/artisti/esibizioni — un artista annuncia dove e quando si esibira' (lo vedono i cittadini).
// Si accetta solo dove la verifica non dice "no", dentro le fasce dell'art. 6 e per al massimo 2 ore.
// Niente identita': nome d'arte e disciplina sono pubblici per scelta dell'artista. Senza SPID l'annuncio
// resta "richiesta" (non verificato dal Comune) e lo dice anche la mappa.
const VIETATI = new Set(["no", "probabilmente_no", "solo_area_dedicata", "solo_silenzio"]);
const testo = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: NextRequest) {
  await connection();
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return Response.json({ errore: "Richiesta non valida" }, { status: 400 });
  }
  const lat = Number(b.lat), lon = Number(b.lon);
  const attivita = b.attivita;
  const nome = testo(b.nome_arte, 60), disciplina = testo(b.disciplina, 60) || "arte di strada";
  const descrizione = testo(b.descrizione, 280) || null, luogo = testo(b.luogo, 160) || null;
  const link = testo(b.link, 300);
  const inizio = new Date(String(b.inizio)), durata = Number(b.durata_min);
  if (!(lat > 41.5 && lat < 42.2 && lon > 12.1 && lon < 13)) return Response.json({ errore: "Serve un punto di Roma" }, { status: 400 });
  if (!eAttivita(attivita)) return Response.json({ errore: "Attività non valida" }, { status: 400 });
  if (nome.length < 2) return Response.json({ errore: "Scrivi il tuo nome d'arte" }, { status: 400 });
  if (link && !/^https:\/\/[^\s<>"]+$/i.test(link)) return Response.json({ errore: "Il link deve iniziare con https://" }, { status: 400 });
  if (isNaN(inizio.getTime()) || !(durata >= 15 && durata <= 120)) return Response.json({ errore: "Indica inizio e durata (da 15 minuti a 2 ore)" }, { status: 400 });
  const fine = new Date(inizio.getTime() + durata * 60_000);
  const ora = Date.now();
  if (inizio.getTime() < ora - 5 * 60_000 || inizio.getTime() > ora + 31 * 86_400_000) return Response.json({ errore: "La data deve essere nei prossimi 31 giorni" }, { status: 400 });
  if (!fasciaArt6(inizio, attivita).dentro || !fasciaArt6(new Date(fine.getTime() - 60_000), attivita).dentro) {
    return Response.json({ errore: `Fuori dalle fasce orarie dell'art. 6: ${fasciaArt6(inizio, attivita).testo}` }, { status: 422 });
  }
  const v = await verificaLuogo(lat, lon, attivita, inizio);
  if (VIETATI.has(v.esito.codice)) return Response.json({ errore: `Qui non puoi annunciare l'esibizione: ${v.esito.titolo.toLowerCase()}.`, esito: v.esito }, { status: 422 });
  // dove valgono solo le postazioni numerate, l'annuncio va fatto su una postazione (entro 20 m)
  const postazione = v.postazioni_vicine.find((p) => p.distanza_m <= 20);
  if (v.esito.codice === "solo_postazioni" && !postazione) {
    return Response.json({ errore: "Qui ci si esibisce solo nelle postazioni numerate: scegli una postazione sulla mappa.", esito: v.esito }, { status: 422 });
  }

  const { rows } = await queryArtisti<{ id: string }>(
    `WITH p AS (
       INSERT INTO artisti.profili (rif_artista, nome_arte, disciplina, descrizione, link)
       VALUES ('anonimo:' || gen_random_uuid(), $1, $2, $3, $4) RETURNING id)
     INSERT INTO artisti.prenotazioni (profilo_id, postazione_id, inizio, fine, rif_artista, stato, luogo, geom, attivita)
     SELECT p.id, $11, $5, $6, 'anonimo', 'richiesta', $7, ST_SetSRID(ST_MakePoint($8, $9), 4326), $10 FROM p
     RETURNING id`,
    [nome, disciplina, descrizione, link || null, inizio, fine, luogo, lon, lat, attivita, postazione?.id ?? null],
  );
  return Response.json({ id: rows[0].id, esito: v.esito, inizio, fine }, { status: 201 });
}
