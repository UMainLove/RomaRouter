-- 010_vincoli_art2: le regole generali dell'art. 2 DAC 24/2012 disegnate su tutta Roma.
-- Prima la mappa mostrava in rosso solo i divieti deliberati dai Municipi (pochi) e in verde ogni esagono
-- attraversato da una via, anche in aperta campagna o lungo una superstrada. Ora:
--  * niente musica (emissioni sonore) nelle vie larghe meno di 5 m, a ridosso di ospedali, luoghi di culto
--    (sempre entro 10 m dal sagrato) e beni artistici e culturali; vicino alle scuole solo fuori orario;
--  * non adatto (nessuno spazio pedonale): campagna, boschi, cimiteri, aree militari, ferrovie, aeroporti,
--    cave, discariche, cantieri e le carreggiate delle superstrade (art. 2: non ostacolare la circolazione).
-- Dati da OpenStreetMap (ODbL), scaricati da scripts/artisti/vincoli_osm.mts.

CREATE TABLE IF NOT EXISTS artisti.osm_suolo (     -- suolo senza spazio pedonale
  id    text PRIMARY KEY,
  tipo  text NOT NULL,       -- farmland, cemetery, military, railway, aerodrome, wood, ...
  nome  text,
  geom  geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS osm_suolo_gix ON artisti.osm_suolo USING gist (geom);

CREATE TABLE IF NOT EXISTS artisti.osm_veloci (    -- autostrade e superstrade (motorway, trunk)
  id    text PRIMARY KEY,
  nome  text,
  geom  geometry(LineString, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS osm_veloci_gix ON artisti.osm_veloci USING gist (geom);

CREATE TABLE IF NOT EXISTS artisti.osm_beni (      -- beni artistici e culturali (monumenti, rovine, porte, mura, fontane storiche, musei)
  id    text PRIMARY KEY,
  tipo  text NOT NULL,
  nome  text,
  geom  geometry(Geometry, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS osm_beni_gix ON artisti.osm_beni USING gist (geom);

CREATE TABLE IF NOT EXISTS artisti.osm_edifici (   -- edifici della citta' storica, per misurare le vie
  id    text PRIMARY KEY,
  geom  geometry(Polygon, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS osm_edifici_gix ON artisti.osm_edifici USING gist (geom);

CREATE TABLE IF NOT EXISTS artisti.osm_vie (       -- vie con nome della citta' storica
  id         text PRIMARY KEY,
  nome       text NOT NULL,
  tipo       text NOT NULL,
  larghezza  real,           -- tag width di OpenStreetMap, se c'e'
  geom       geometry(LineString, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS osm_vie_gix ON artisti.osm_vie USING gist (geom);

CREATE TABLE IF NOT EXISTS artisti.vie_strette (
  id          text PRIMARY KEY,
  nome        text NOT NULL,
  larghezza_m real NOT NULL,     -- da facciata a facciata (mediana lungo la via)
  misurata    boolean NOT NULL,  -- true: dagli edifici; false: dal tag width
  geom        geometry(LineString, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS vie_strette_gix ON artisti.vie_strette USING gist (geom);

-- Larghezza delle vie: ogni 8 m si guarda a destra e a sinistra fino al primo edificio (al massimo 15 m per
-- parte). Larghezza = somma delle due distanze; vale la mediana dei punti in cui ci sono edifici da tutti e due
-- i lati (scartati i punti sotto archi e passaggi coperti). Sotto i 5 m la via e' un vicolo per l'art. 2.
CREATE OR REPLACE FUNCTION artisti.misura_vie() RETURNS int LANGUAGE plpgsql AS $$
DECLARE totale int;
BEGIN
  DELETE FROM artisti.vie_strette;
  WITH campioni AS (
    SELECT v.id, v.nome, (ST_DumpPoints(ST_LineInterpolatePoints(v.geom, LEAST(1.0, 8.0 / GREATEST(ST_Length(v.geom::geography), 8.0)), true))).geom AS p,
           v.geom
    FROM artisti.osm_vie v WHERE v.larghezza IS NULL
  ),
  direzioni AS (
    SELECT c.id, c.nome, c.p,
           ST_Azimuth(ST_LineInterpolatePoint(c.geom, GREATEST(0, ST_LineLocatePoint(c.geom, c.p) - 0.02))::geography,
                      ST_LineInterpolatePoint(c.geom, LEAST(1, ST_LineLocatePoint(c.geom, c.p) + 0.02))::geography) AS az
    FROM campioni c
  ),
  lati AS (
    SELECT d.id, d.nome, d.p, s.lato,
           ST_SetSRID(ST_MakeLine(d.p, ST_Project(d.p::geography, 15, d.az + s.lato * pi() / 2)::geometry), 4326) AS raggio
    FROM direzioni d CROSS JOIN (VALUES (1), (-1)) s(lato)
    WHERE d.az IS NOT NULL
  ),
  distanze AS (
    SELECT l.id, l.nome, l.p, l.lato,
           (SELECT min(ST_Distance(l.p::geography, ST_Intersection(e.geom, l.raggio)::geography))
            FROM artisti.osm_edifici e WHERE e.geom && l.raggio AND ST_Intersects(e.geom, l.raggio)) AS d
    FROM lati l
  ),
  punti AS (
    SELECT id, nome, p, sum(d) AS larghezza, count(d) FILTER (WHERE d > 0.05) AS lati FROM distanze GROUP BY id, nome, p
  ),
  vie AS (
    SELECT id, min(nome) AS nome, percentile_cont(0.5) WITHIN GROUP (ORDER BY larghezza) FILTER (WHERE lati = 2) AS larghezza,
           count(*) FILTER (WHERE lati = 2) AS chiusi, count(*) AS tutti
    FROM punti GROUP BY id
  )
  INSERT INTO artisti.vie_strette (id, nome, larghezza_m, misurata, geom)
  SELECT v.id, v.nome, round(v.larghezza::numeric, 1), true, o.geom
  FROM vie v JOIN artisti.osm_vie o ON o.id = v.id
  WHERE v.larghezza < 5 AND v.chiusi >= LEAST(3, v.tutti) AND v.chiusi * 3 >= v.tutti;  -- edifici da tutti e due i lati per almeno un terzo della via

  INSERT INTO artisti.vie_strette (id, nome, larghezza_m, misurata, geom)
  SELECT id, nome, larghezza, false, geom FROM artisti.osm_vie WHERE larghezza IS NOT NULL AND larghezza < 5
  ON CONFLICT (id) DO NOTHING;
  SELECT count(*) INTO totale FROM artisti.vie_strette;
  RETURN totale;
END $$;

-- Le zone dell'art. 2 (da rifare dopo artisti.ricalcola_zone(), che le cancella).
CREATE OR REPLACE FUNCTION artisti.ricalcola_vincoli_art2() RETURNS int LANGUAGE plpgsql AS $$
DECLARE totale int;
BEGIN
  DELETE FROM artisti.zone WHERE origine LIKE 'art2:%';

  -- ospedali e luoghi di culto: niente musica, non solo "attenzione"
  UPDATE artisti.zone SET esito = 'solo_silenzio', priorita = 75,
    motivo = 'Vicino agli ospedali non si fanno spettacoli con emissioni sonore: qui solo esibizioni silenziose.',
    condizione = NULL, riferimento = 'DAC 24/2012, art. 2'
  WHERE categoria = 'ospedale';
  UPDATE artisti.zone SET esito = 'solo_silenzio', priorita = 75,
    motivo = 'A ridosso dei luoghi di culto, durante l''apertura e comunque entro 10 m dal sagrato, niente spettacoli con emissioni sonore.',
    condizione = NULL, riferimento = 'DAC 24/2012, art. 2'
  WHERE categoria = 'culto';
  UPDATE artisti.zone SET
    motivo = 'Vicino alle scuole niente spettacoli con emissioni sonore mentre sono in attività (giorni feriali, di giorno).',
    condizione = 'durante l''orario scolastico', riferimento = 'DAC 24/2012, art. 2'
  WHERE categoria = 'scuola';

  -- vie larghe meno di 5 m
  INSERT INTO artisti.zone (esito, categoria, nome, motivo, condizione, vale_per, riferimento, fonte_url, verifica, ufficiale, approssimata, priorita, origine, geom)
  SELECT 'solo_silenzio', 'via_stretta', v.nome,
    format('Via larga circa %s m: sotto i 5 m non si fanno spettacoli con emissioni sonore.', replace(v.larghezza_m::text, '.', ',')),
    NULL, ARRAY['musica', 'fuoco'], 'DAC 24/2012, art. 2', NULL,
    CASE WHEN v.misurata THEN 'larghezza stimata dagli edifici di OpenStreetMap' ELSE 'larghezza da OpenStreetMap (tag width)' END,
    true, true, 70, 'art2:via:' || v.id,
    artisti.buffer_m(v.geom, GREATEST(v.larghezza_m / 2 + 1, 2.5))
  FROM artisti.vie_strette v;

  -- beni artistici e culturali: l'area del bene (se piccola) piu' 10 m, o 15 m attorno al punto
  INSERT INTO artisti.zone (esito, categoria, nome, motivo, condizione, vale_per, riferimento, fonte_url, verifica, ufficiale, approssimata, priorita, origine, geom)
  SELECT 'solo_silenzio', 'bene_culturale', coalesce(b.nome, 'Bene storico'),
    'A ridosso dei beni artistici e culturali non si fanno spettacoli con emissioni sonore.',
    NULL, ARRAY['musica', 'fuoco'], 'DAC 24/2012, art. 2', NULL, 'bene da OpenStreetMap (historic, museo, fontana storica)',
    true, true, 72, 'art2:bene:' || b.id,
    CASE WHEN GeometryType(b.geom) LIKE '%POLYGON%' THEN artisti.buffer_m(b.geom, 10)
         WHEN GeometryType(b.geom) LIKE '%LINE%' THEN artisti.buffer_m(b.geom, 8)
         ELSE artisti.buffer_m(b.geom, 15) END
  FROM artisti.osm_beni b
  WHERE GeometryType(b.geom) NOT LIKE '%POLYGON%' OR ST_Area(b.geom::geography) < 200000;

  SELECT count(*) INTO totale FROM artisti.zone WHERE origine LIKE 'art2:%';
  RETURN totale;
END $$;

-- Copertura: lo spazio pedonale. Ordine: piazza > suolo senza spazio pedonale > parco (anche se ci passano viali) > natura > vie > niente.
-- Le vie lungo le superstrade non contano (si toglie la lunghezza delle carreggiate veloci nell'esagono).
CREATE OR REPLACE FUNCTION artisti.ricalcola_copertura() RETURNS int LANGUAGE plpgsql AS $$
DECLARE totale int;
BEGIN
  DELETE FROM artisti.copertura;
  WITH roma AS (SELECT ST_Union(geom) AS g FROM artisti.municipi),
  celle AS (
    SELECT c AS cella, h3_cell_to_boundary_geometry(c) AS geom, h3_cell_to_geometry(c) AS centro
    FROM roma, h3_polygon_to_cells(roma.g, 10) c
  ),
  strade AS (
    SELECT ce.cella, round(sum(ST_Length(ST_Intersection(s.geom, ce.geom)::geography)))::int AS metri
    FROM celle ce JOIN artisti.strade s ON NOT s.veloce AND s.geom && ce.geom AND ST_Intersects(s.geom, ce.geom)
    GROUP BY ce.cella
  ),
  veloci AS (
    SELECT ce.cella, round(sum(ST_Length(ST_Intersection(v.geom, ce.geom)::geography)))::int AS metri
    FROM celle ce JOIN artisti.osm_veloci v ON v.geom && ce.geom AND ST_Intersects(v.geom, ce.geom)
    GROUP BY ce.cella
  ),
  piazze AS (
    SELECT DISTINCT ce.cella FROM celle ce JOIN artisti.contesto p ON p.layer = 'piazze_pedonali' AND p.geom && ce.geom AND ST_Intersects(p.geom, ce.geom)
  ),
  chiuso AS (       -- campagna coltivata, cimiteri, aree militari, ferrovie, aeroporti, cave, discariche, cantieri
    SELECT DISTINCT ce.cella FROM celle ce JOIN artisti.osm_suolo s
      ON s.tipo NOT IN ('wood', 'forest', 'scrub', 'grassland', 'heath', 'wetland', 'meadow')
     AND s.geom && ce.centro AND ST_Intersects(s.geom, ce.centro)
  ),
  natura AS (       -- boschi, prati e macchia fuori dai parchi
    SELECT DISTINCT ce.cella FROM celle ce JOIN artisti.osm_suolo s
      ON s.tipo IN ('wood', 'forest', 'scrub', 'grassland', 'heath', 'wetland', 'meadow')
     AND s.geom && ce.centro AND ST_Intersects(s.geom, ce.centro)
  ),
  parchi AS (
    SELECT DISTINCT ce.cella FROM celle ce JOIN artisti.parchi p ON p.geom && ce.geom AND ST_Intersects(p.geom, ce.centro)
  )
  INSERT INTO artisti.copertura (cella, classe, metri_strada, geom)
  SELECT ce.cella,
         CASE WHEN pz.cella IS NOT NULL THEN 'adatta'
              WHEN ch.cella IS NOT NULL THEN 'non_adatta'
              WHEN pa.cella IS NOT NULL THEN 'parco'
              WHEN na.cella IS NOT NULL AND coalesce(st.metri, 0) - coalesce(ve.metri, 0) < 120 THEN 'non_adatta'
              WHEN coalesce(st.metri, 0) - coalesce(ve.metri, 0) >= 60 THEN 'adatta'
              ELSE 'non_adatta' END,
         greatest(coalesce(st.metri, 0) - coalesce(ve.metri, 0), 0), ce.geom
  FROM celle ce
  LEFT JOIN strade st ON st.cella = ce.cella
  LEFT JOIN veloci ve ON ve.cella = ce.cella
  LEFT JOIN piazze pz ON pz.cella = ce.cella
  LEFT JOIN chiuso ch ON ch.cella = ce.cella
  LEFT JOIN natura na ON na.cella = ce.cella
  LEFT JOIN parchi pa ON pa.cella = ce.cella;
  GET DIAGNOSTICS totale = ROW_COUNT;

  DELETE FROM artisti.copertura_fusa;
  INSERT INTO artisti.copertura_fusa (classe, geom)
  SELECT classe, ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SimplifyPreserveTopology(ST_Union(geom), 0.00003)), 3))
  FROM artisti.copertura GROUP BY classe;
  RETURN totale;
END $$;

GRANT ALL ON ALL TABLES IN SCHEMA artisti TO romarouter;
