import { connection } from "next/server";
import { queryAntenne } from "@/lib/antenne";

// GET /api/antenne/impianti — impianti esistenti censiti da OpenStreetMap (tralicci, pali, antenne).
// Il catasto ufficiale degli impianti non e' pubblico: questi sono gli unici esistenti con una posizione aperta.
export async function GET() {
  await connection();
  const { rows } = await queryAntenne<{ fc: unknown }>(
    `SELECT json_build_object('type', 'FeatureCollection', 'features', COALESCE(json_agg(json_build_object(
        'type', 'Feature', 'id', i.osm_id,
        'geometry', ST_AsGeoJSON(i.geom, 6)::json,
        'properties', json_build_object('osm', i.osm_id, 'tipo', i.tipo, 'mobile', i.mobile, 'operatore', i.operatore, 'altezza_m', i.altezza_m, 'nome', i.nome)
      )), '[]'::json)) AS fc
     FROM antenne.impianti_osm i`,
  );
  return Response.json(rows[0].fc, { headers: { "Cache-Control": "public, max-age=3600" } });
}
