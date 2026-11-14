import "server-only";
import { querySport } from "@/lib/sport";

/** I campi disegnati (forme vere da OpenStreetMap) e i perimetri degli impianti: la mappa li mostra da vicino. */
export async function campiGeoJSON() {
  const { rows } = await querySport<{ fc: unknown }>(
    `WITH campi AS (
       SELECT DISTINCT ON (split_part(s.chiave, ':', 2)) s.luogo_id, s.disciplina, s.fondo, s.geom, l.accesso
       FROM sport.spazi s JOIN sport.luoghi l ON l.id = s.luogo_id
       JOIN sport.discipline d ON d.codice = s.disciplina
       WHERE GeometryType(s.geom) IN ('POLYGON', 'MULTIPOLYGON')
       ORDER BY split_part(s.chiave, ':', 2), d.ordine
     )
     SELECT json_build_object('type', 'FeatureCollection', 'features', coalesce(json_agg(f), '[]'::json)) AS fc FROM (
       SELECT json_build_object('type', 'Feature', 'geometry', ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.000004), 5)::json,
              'properties', json_strip_nulls(json_build_object('k', 'c', 'l', luogo_id, 'd', disciplina, 'f', fondo, 'a', accesso))) AS f
       FROM campi
       UNION ALL
       SELECT json_build_object('type', 'Feature', 'geometry', ST_AsGeoJSON(ST_SimplifyPreserveTopology(area, 0.00001), 5)::json,
              'properties', json_build_object('k', 'a', 'l', id, 'a', accesso))
       FROM sport.luoghi WHERE area IS NOT NULL
     ) x`,
  );
  return rows[0].fc;
}
