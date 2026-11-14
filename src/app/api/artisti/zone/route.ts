import { connection, type NextRequest } from "next/server";
import { queryArtisti } from "@/lib/artisti";

// GET /api/artisti/zone?bbox=minLon,minLat,maxLon,maxLat[&esiti=no,solo_silenzio]
// Le zone della mappa degli artisti (poligoni). Senza bbox: tutte tranne le "condizioni"
// (migliaia di piccoli cerchi attorno a scuole e chiese), che si chiedono per riquadro.
// leggero=1: solo esito e ufficialita', geometrie piu' semplici (la mappa della pagina /arte).
export async function GET(req: NextRequest) {
  await connection();
  const sp = req.nextUrl.searchParams;
  const bbox = sp.get("bbox")?.split(",").map(Number);
  const okBbox = bbox?.length === 4 && bbox.every(Number.isFinite);
  const esiti = sp.get("esiti")?.split(",").filter(Boolean) ?? null;
  const leggero = sp.get("leggero") === "1";
  const { rows } = await queryArtisti<{ fc: unknown }>(
    `SELECT json_build_object('type', 'FeatureCollection', 'features', COALESCE(json_agg(json_build_object(
        'type', 'Feature', 'id', z.id,
        'geometry', ST_AsGeoJSON(ST_SimplifyPreserveTopology(z.geom, CASE WHEN $6::boolean THEN 0.00005 ELSE 0.00002 END), CASE WHEN $6::boolean THEN 5 ELSE 6 END)::json,
        'properties', CASE WHEN $6::boolean THEN json_build_object('e', z.esito, 'u', z.ufficiale) ELSE json_build_object('esito', z.esito, 'categoria', z.categoria, 'nome', z.nome, 'motivo', z.motivo,
          'condizione', z.condizione, 'vale_per', z.vale_per, 'riferimento', z.riferimento, 'fonte_url', z.fonte_url,
          'verifica', z.verifica, 'ufficiale', z.ufficiale, 'approssimata', z.approssimata, 'priorita', z.priorita) END
      ) ORDER BY z.priorita), '[]'::json)) AS fc
     FROM artisti.zone z
     WHERE ($1::text[] IS NULL OR z.esito = ANY($1))
       AND (CASE WHEN $2::float8 IS NULL THEN z.esito <> 'condizioni'
                 ELSE z.geom && ST_MakeEnvelope($2, $3, $4, $5, 4326) END)`,
    [esiti, okBbox ? bbox![0] : null, okBbox ? bbox![1] : null, okBbox ? bbox![2] : null, okBbox ? bbox![3] : null, leggero],
  );
  return Response.json(rows[0].fc, { headers: { "Cache-Control": "public, max-age=300" } });
}
