import { connection } from "next/server";
import { featureCollection, rispostaGeoJSON } from "@/lib/antenne";

// GET /api/antenne/monitoraggio — centraline ARPA Lazio con l'elenco dei report disponibili
export async function GET() {
  await connection();
  const fc = await featureCollection(
    `SELECT json_build_object('type','FeatureCollection','features', COALESCE(json_agg(json_build_object(
        'type','Feature',
        'id', p.id,
        'geometry', ST_AsGeoJSON(p.geom, 6)::json,
        'properties', json_build_object(
          'nome', p.nome, 'gestore', p.gestore, 'descrizione', p.descrizione,
          'attivo_dal', p.attivo_dal, 'ultimo_dato', p.ultimo_dato,
          'report', (SELECT COALESCE(json_agg(json_build_object(
              'periodo_inizio', m.periodo_inizio, 'periodo_fine', m.periodo_fine,
              'campo_e_vm', m.campo_e_vm, 'url', m.url_report) ORDER BY m.periodo_inizio), '[]'::json)
            FROM antenne.misure_cem m WHERE m.punto_id = p.id),
          'limiti_vm', json_build_object('valore_attenzione', 15, 'limite_esposizione', 20),
          'fonte', p.fonte_id)
      )), '[]'::json)) AS fc
     FROM antenne.punti_monitoraggio p`,
  );
  return rispostaGeoJSON(fc, {
    layer: "monitoraggio_cem",
    descrizione: "Centraline di monitoraggio continuo dei campi elettromagnetici a Roma",
    avvertenze: ["I report ARPA pubblicati mostrano i valori solo in grafici; le misure puntuali non sono pubblicate."],
  });
}
