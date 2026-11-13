import { connection, type NextRequest } from "next/server";
import { AVVERTENZE, featureCollection, leggiBbox, numero, rispostaGeoJSON } from "@/lib/antenne";

// GET /api/antenne/istanze
// Filtri opzionali: municipio=1..15, gestore=Iliad, qualita=originale,corretta,geocodificata, bbox=minLon,minLat,maxLon,maxLat
export async function GET(req: NextRequest) {
  await connection();
  const sp = req.nextUrl.searchParams;
  const municipio = numero(sp.get("municipio"));
  const gestore = sp.get("gestore");
  const qualita = sp.get("qualita")?.split(",").filter(Boolean) ?? null;
  const bbox = leggiBbox(sp.get("bbox"));

  const fc = await featureCollection(
    `SELECT json_build_object('type','FeatureCollection','features', COALESCE(json_agg(json_build_object(
        'type','Feature',
        'id', i.id,
        'geometry', ST_AsGeoJSON(i.geom, 6)::json,
        'properties', json_build_object(
          'gestori', i.gestori,
          'codice_sito', i.codice_sito,
          'nome_sito', i.nome_sito,
          'indirizzo', i.indirizzo,
          'tipo_intervento', i.tipo_intervento,
          'regime', i.regime,
          'data_pubblicazione', i.data_pubblicazione,
          'protocollo', i.protocollo,
          'municipio', i.municipio,
          'municipio_nome', i.municipio_nome,
          'quartiere', i.suddivisione_nome,
          'quartiere_tipo', i.suddivisione_tipo,
          'qualita_posizione', i.qualita,
          'nota_qualita', i.nota_qualita,
          'sito_sensibile_vicino', CASE WHEN i.sensibile_nome IS NULL AND i.sensibile_categoria IS NULL THEN NULL ELSE json_build_object(
            'categoria', i.sensibile_categoria, 'nome', i.sensibile_nome, 'distanza_m', i.sensibile_distanza_m) END,
          'url_avviso', i.url_avviso,
          'fonte', i.fonte_id,
          'ufficiale', i.ufficiale
        )) ORDER BY i.data_pubblicazione DESC NULLS LAST), '[]'::json)) AS fc
     FROM antenne.v_istanze i
     WHERE i.geom IS NOT NULL
       AND ($1::int IS NULL OR i.municipio = $1)
       AND ($2::text IS NULL OR EXISTS (SELECT 1 FROM unnest(i.gestori) g WHERE g ILIKE $2))
       AND ($3::text[] IS NULL OR i.qualita::text = ANY($3))
       AND ($4::float8 IS NULL OR i.geom && ST_MakeEnvelope($4, $5, $6, $7, 4326))`,
    [municipio, gestore, qualita, bbox?.[0] ?? null, bbox?.[1] ?? null, bbox?.[2] ?? null, bbox?.[3] ?? null],
  );

  return rispostaGeoJSON(fc, {
    layer: "istanze_srb",
    descrizione: "Stazioni Radio Base: istanze di installazione/modifica pubblicate da Roma Capitale",
    avvertenze: [AVVERTENZE.istanze, AVVERTENZE.distanze],
    legenda_qualita_posizione: {
      originale: "coordinate pubblicate dal Comune",
      corretta: "coordinate pubblicate con un errore di formato corretto (vedi nota_qualita)",
      geocodificata: "posizione ricavata dall'indirizzo con OpenStreetMap",
    },
  });
}
