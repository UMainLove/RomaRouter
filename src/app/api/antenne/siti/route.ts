import { connection } from "next/server";
import { queryAntenne } from "@/lib/antenne";

// GET /api/antenne/siti — antenne in funzione viste dai telefoni: siti stimati raggruppando le celle radio
// (dataset aperti in formato OpenCelliD). Posizioni stimate, non le coordinate esatte degli impianti.
// Proprieta' corte per tenere leggero il file: o operatori, t tecnologie, n celle, p precisione (m), a ultimo aggiornamento.
export async function GET() {
  await connection();
  const { rows } = await queryAntenne<{ fc: unknown }>(
    `SELECT json_build_object('type', 'FeatureCollection', 'features', COALESCE(json_agg(json_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(s.geom, 5)::json,
        'properties', json_build_object('id', s.id, 'o', array_to_string(s.operatori, '|'), 't', array_to_string(s.tecnologie, ' '),
          'n', s.n_celle, 'p', s.precisione_m, 'a', to_char(s.aggiornato, 'YYYY-MM'))
      )), '[]'::json)) AS fc
     FROM antenne.siti_stimati s`,
  );
  return Response.json(rows[0].fc, { headers: { "Cache-Control": "public, max-age=3600" } });
}
