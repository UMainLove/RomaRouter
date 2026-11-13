import { connection } from "next/server";
import { featureCollection, rispostaGeoJSON } from "@/lib/antenne";

// GET /api/antenne/aree-vincolate — sito UNESCO e aree naturali protette (poligoni semplificati per la mappa)
export async function GET() {
  await connection();
  const fc = await featureCollection(
    `SELECT json_build_object('type','FeatureCollection','features', COALESCE(json_agg(json_build_object(
        'type','Feature',
        'id', a.id,
        'geometry', ST_AsGeoJSON(ST_SimplifyPreserveTopology(a.geom, 0.00005), 6)::json,
        'properties', json_build_object('tipo', a.tipo, 'nome', a.nome, 'dettagli', a.dettagli, 'fonte', a.fonte_id)
      )), '[]'::json)) AS fc
     FROM antenne.aree_vincolate a`,
  );
  return rispostaGeoJSON(fc, {
    layer: "aree_vincolate",
    descrizione: "Contesto: aree con vincoli (sito UNESCO, aree protette). Il regolamento esclude le installazioni nelle aree vincolate e a tutela integrale.",
  });
}
