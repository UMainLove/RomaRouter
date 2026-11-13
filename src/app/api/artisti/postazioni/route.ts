import { connection } from "next/server";
import { queryArtisti } from "@/lib/artisti";

// GET /api/artisti/postazioni — postazioni dell'Allegato B, aree del Municipio X, aree per esoterici
// e aree delle arti figurative (punti), con regole, fasce e affidabilita' della posizione.
export async function GET() {
  await connection();
  const { rows } = await queryArtisti<{ fc: unknown }>(
    `SELECT json_build_object('type', 'FeatureCollection', 'features', COALESCE(json_agg(json_build_object(
        'type', 'Feature', 'id', p.id,
        'geometry', ST_AsGeoJSON(p.geom, 6)::json,
        'properties', json_build_object('nome', p.nome, 'tipo', p.tipo, 'municipio', p.municipio, 'scheda', p.scheda,
          'raggio_m', p.raggio_m, 'localizzazioni', p.localizzazioni, 'regole', p.regole_testo, 'fasce', p.fasce_testo,
          'fonte', p.fonte_testo, 'fonte_url', p.fonte_url, 'verifica', p.verifica, 'posizione_stimata', p.posizione_stimata,
          'nota_posizione', p.nota_posizione)
      ) ORDER BY p.tipo, p.nome), '[]'::json)) AS fc
     FROM artisti.postazioni p WHERE p.attiva`,
  );
  return Response.json(rows[0].fc, { headers: { "Cache-Control": "public, max-age=300" } });
}
