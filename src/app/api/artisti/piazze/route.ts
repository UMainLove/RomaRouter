import { connection } from "next/server";
import { queryArtisti } from "@/lib/artisti";

// GET /api/artisti/piazze — le piazze pedonali di tutta Roma (OpenStreetMap), luoghi buoni per esibirsi.
// Per ognuna le zone che la toccano (z: [{e: esito, v: vale_per}]): la mappa nasconde quelle vietate per l'attivita' scelta.
export async function GET() {
  await connection();
  const { rows } = await queryArtisti<{ fc: unknown }>(
    `SELECT json_build_object('type', 'FeatureCollection', 'features', COALESCE(json_agg(json_build_object(
        'type', 'Feature', 'geometry', ST_AsGeoJSON(p.pt, 5)::json,
        'properties', json_build_object('nome', p.nome, 'mun', p.municipio, 'z', p.zone))), '[]'::json)) AS fc
     FROM (
       SELECT c.nome, c.municipio, ST_PointOnSurface(c.geom) AS pt,
              COALESCE((SELECT json_agg(json_build_object('e', z.esito, 'v', z.vale_per)) FROM artisti.zone z
                        WHERE z.esito IN ('no', 'solo_silenzio', 'solo_postazioni') AND ST_Intersects(z.geom, ST_PointOnSurface(c.geom))), '[]'::json) AS zone
       FROM artisti.contesto c WHERE c.layer = 'piazze_pedonali' AND c.nome IS NOT NULL
     ) p`,
  );
  return Response.json(rows[0].fc, { headers: { "Cache-Control": "public, max-age=3600" } });
}
