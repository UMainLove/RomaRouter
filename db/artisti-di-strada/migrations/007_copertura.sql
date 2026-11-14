-- 007_copertura: tutta Roma coperta. Il Comune diviso in esagoni H3 (risoluzione 10, ~0,015 km²), ognuno
-- classificato: c'e' spazio pubblico dove esibirsi (strade percorribili a piedi, piazze), e' un parco
-- (Allegato A: solo sentieri pavimentati, niente amplificazione) oppure non e' adatto (campi, ferrovie,
-- aeroporto, autostrade, fiume). Divieti e postazioni si disegnano sopra (artisti.zone).
CREATE TABLE IF NOT EXISTS artisti.strade (
  id      serial PRIMARY KEY,
  nome    text NOT NULL,
  mun     smallint,
  veloce  boolean NOT NULL DEFAULT false,   -- autostrade, GRA, tangenziali: non sono spazio pedonale
  geom    geometry(MultiLineString, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS strade_gix ON artisti.strade USING gist (geom);

CREATE TABLE IF NOT EXISTS artisti.copertura (
  cella        h3index PRIMARY KEY,
  classe       text NOT NULL CHECK (classe IN ('adatta', 'parco', 'non_adatta')),
  metri_strada int NOT NULL DEFAULT 0,
  geom         geometry(Polygon, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS copertura_gix ON artisti.copertura USING gist (geom);

CREATE TABLE IF NOT EXISTS artisti.copertura_fusa (
  classe text PRIMARY KEY,
  geom   geometry(MultiPolygon, 4326) NOT NULL
);

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
    SELECT DISTINCT ce.cella FROM celle ce JOIN artisti.contesto p ON p.layer = 'parchi' AND p.geom && ce.geom
      AND ST_Intersects(p.geom, ST_Centroid(ce.geom))
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

  -- forme fuse per la mappa: poche e pulite invece di 80.000 esagoni
  DELETE FROM artisti.copertura_fusa;
  INSERT INTO artisti.copertura_fusa (classe, geom)
  SELECT classe, ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SimplifyPreserveTopology(ST_Union(geom), 0.00003)), 3))
  FROM artisti.copertura GROUP BY classe;
  RETURN totale;
END $$;

GRANT SELECT ON artisti.strade, artisti.copertura, artisti.copertura_fusa TO romarouter;
