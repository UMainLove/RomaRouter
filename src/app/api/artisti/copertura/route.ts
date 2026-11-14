import { connection } from "next/server";
import { queryArtisti } from "@/lib/artisti";

// GET /api/artisti/copertura — tutta Roma per l'arte di strada: il confine del Comune, le zone con spazio
// pubblico adatto (strade e piazze) e i parchi. Il resto del Comune non e' adatto. Forme fuse e semplificate
// (~45 m) per la mappa; la verifica di un punto usa gli esagoni esatti (artisti.copertura).
export async function GET() {
  await connection();
  const { rows } = await queryArtisti<{ fc: unknown }>(
    `WITH f AS (
       SELECT 'roma' AS classe, ST_SimplifyPreserveTopology(ST_Union(geom), 0.0005) AS geom FROM artisti.municipi
       UNION ALL
       SELECT classe, ST_SimplifyPreserveTopology(geom, 0.0005) FROM artisti.copertura_fusa WHERE classe <> 'non_adatta'
     )
     SELECT json_build_object('type', 'FeatureCollection', 'features', json_agg(json_build_object(
       'type', 'Feature', 'geometry', ST_AsGeoJSON(geom, 5)::json, 'properties', json_build_object('classe', classe)))) AS fc
     FROM f`,
  );
  return Response.json(rows[0].fc, { headers: { "Cache-Control": "public, max-age=86400" } });
}
