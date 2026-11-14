-- 008_parchi: i parchi veri (poligoni OpenStreetMap, art-spot-dati/geo/parchi_roma_osm.geojson) per la
-- copertura: dentro un parco ci si esibisce solo sui viali pavimentati e senza amplificazione (Allegato A).
CREATE TABLE IF NOT EXISTS artisti.parchi (
  id    text PRIMARY KEY,
  nome  text,
  geom  geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS parchi_gix ON artisti.parchi USING gist (geom);
GRANT SELECT ON artisti.parchi TO romarouter;

CREATE OR REPLACE FUNCTION artisti.ricalcola_copertura() RETURNS int LANGUAGE plpgsql AS $$
DECLARE totale int;
BEGIN
  DELETE FROM artisti.copertura;
  WITH roma AS (SELECT ST_Union(geom) AS g FROM artisti.municipi),
  celle AS (
    SELECT c AS cella, h3_cell_to_boundary_geometry(c) AS geom
    FROM roma, h3_polygon_to_cells(roma.g, 10) c
  ),
  strade AS (
    SELECT ce.cella, round(sum(ST_Length(ST_Intersection(s.geom, ce.geom)::geography)))::int AS metri
    FROM celle ce JOIN artisti.strade s ON NOT s.veloce AND s.geom && ce.geom AND ST_Intersects(s.geom, ce.geom)
    GROUP BY ce.cella
  ),
  piazze AS (
    SELECT DISTINCT ce.cella FROM celle ce JOIN artisti.contesto p ON p.layer = 'piazze_pedonali' AND p.geom && ce.geom AND ST_Intersects(p.geom, ce.geom)
  ),
  parchi AS (
    SELECT DISTINCT ce.cella FROM celle ce JOIN artisti.parchi p ON p.geom && ce.geom AND ST_Intersects(p.geom, ST_Centroid(ce.geom))
  )
  INSERT INTO artisti.copertura (cella, classe, metri_strada, geom)
  SELECT ce.cella,
         CASE WHEN pz.cella IS NOT NULL OR coalesce(st.metri, 0) >= 60 THEN 'adatta'
              WHEN pa.cella IS NOT NULL THEN 'parco'
              ELSE 'non_adatta' END,
         coalesce(st.metri, 0), ce.geom
  FROM celle ce
  LEFT JOIN strade st ON st.cella = ce.cella
  LEFT JOIN piazze pz ON pz.cella = ce.cella
  LEFT JOIN parchi pa ON pa.cella = ce.cella;
  GET DIAGNOSTICS totale = ROW_COUNT;

  DELETE FROM artisti.copertura_fusa;
  INSERT INTO artisti.copertura_fusa (classe, geom)
  SELECT classe, ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SimplifyPreserveTopology(ST_Union(geom), 0.00003)), 3))
  FROM artisti.copertura GROUP BY classe;
  RETURN totale;
END $$;
