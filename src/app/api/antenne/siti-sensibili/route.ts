import { connection, type NextRequest } from "next/server";
import { AVVERTENZE, featureCollection, leggiBbox, numero, rispostaGeoJSON } from "@/lib/antenne";

// GET /api/antenne/siti-sensibili
// Filtri opzionali: categoria=scuola,asilo_nido,... | ufficiale=true|false | municipio=1..15 | bbox=minLon,minLat,maxLon,maxLat
export async function GET(req: NextRequest) {
  await connection();
  const sp = req.nextUrl.searchParams;
  const categorie = sp.get("categoria")?.split(",").filter(Boolean) ?? null;
  const uff = sp.get("ufficiale");
  const ufficiale = uff === "true" ? true : uff === "false" ? false : null;
  const municipio = numero(sp.get("municipio"));
  const bbox = leggiBbox(sp.get("bbox"));

  const fc = await featureCollection(
    `SELECT json_build_object('type','FeatureCollection','features', COALESCE(json_agg(json_build_object(
        'type','Feature',
        'id', s.id,
        'geometry', ST_AsGeoJSON(s.geom, 6)::json,
        'properties', json_build_object(
          'categoria', s.categoria, 'nome', s.nome, 'indirizzo', s.indirizzo, 'municipio', s.municipio,
          'dettagli', s.dettagli, 'ufficiale', s.ufficiale, 'fonte', s.fonte_id)
      )), '[]'::json)) AS fc
     FROM antenne.siti_sensibili s
     WHERE ($1::text[] IS NULL OR s.categoria = ANY($1))
       AND ($2::boolean IS NULL OR s.ufficiale = $2)
       AND ($3::int IS NULL OR s.municipio = $3)
       AND ($4::float8 IS NULL OR s.geom && ST_MakeEnvelope($4, $5, $6, $7, 4326))`,
    [categorie, ufficiale, municipio, bbox?.[0] ?? null, bbox?.[1] ?? null, bbox?.[2] ?? null, bbox?.[3] ?? null],
  );

  return rispostaGeoJSON(fc, {
    layer: "siti_sensibili",
    descrizione: "Siti dove il regolamento di Roma (art. 4 DAC 78/2024) vieta l'installazione di antenne",
    avvertenze: [AVVERTENZE.sensibili, AVVERTENZE.distanze],
  });
}
