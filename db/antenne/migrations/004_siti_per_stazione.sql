-- 004_siti_per_stazione: i siti si ricostruiscono per stazione radio, non per semplice vicinanza.
-- Con decine di migliaia di celle il raggruppamento per distanza incatenava interi quartieri in un sito.
--  1. 4G: ogni stazione (eNodeB = cella / 256) di un operatore e' un sito di quell'operatore;
--  2. 3G e 2G: si aggiungono al sito 4G dello stesso operatore entro 150 m; quelle rimaste sole formano
--     siti propri se sono almeno 2 celle vicine (entro 100 m);
--  3. siti di operatori diversi a meno di 35 m sono lo stesso sito (condiviso).
-- Celle senza misure dal 2018 escluse (probabilmente dismesse). Posizioni sempre stimate.
CREATE OR REPLACE FUNCTION antenne.ricalcola_siti() RETURNS int LANGUAGE plpgsql AS $$
DECLARE totale int;
BEGIN
  DELETE FROM antenne.siti_stimati;

  CREATE TEMP TABLE _cel ON COMMIT DROP AS
  SELECT c.id, c.radio, c.mnc, c.cella, c.campioni, c.aggiornata, c.geom, antenne.operatore_mnc(c.mnc) AS op,
         CASE c.radio WHEN 'GSM' THEN '2G' WHEN 'UMTS' THEN '3G' WHEN 'LTE' THEN '4G' WHEN 'NR' THEN '5G' ELSE c.radio END AS tec
  FROM antenne.celle c
  WHERE antenne.operatore_mnc(c.mnc) NOT IN ('Altro', 'RFI (ferrovie)') AND c.aggiornata >= '2018-01-01';

  -- 1. stazioni 4G (e 5G) per operatore. Se le celle di una stazione sono sparse (misure sbagliate),
  --    si tiene il gruppo piu' coerente: celle entro 250 m, quello con piu' misure.
  CREATE TEMP TABLE _sito ON COMMIT DROP AS
  WITH g AS (
    SELECT c.*, c.cella / 256 AS enb,
           ST_ClusterDBSCAN(ST_Transform(c.geom, 3857), eps := 250 * 1.34, minpoints := 1) OVER (PARTITION BY c.op, c.mnc, c.cella / 256) AS sub
    FROM _cel c WHERE c.radio IN ('LTE', 'NR')
  ), s AS (
    SELECT op, mnc, enb, sub, min(tec) AS tec, count(*)::int AS n, coalesce(sum(campioni), 0)::int AS campioni, max(aggiornata) AS agg,
           ST_Centroid(ST_Collect(geom)) AS geom, ST_Collect(geom) AS punti,
           row_number() OVER (PARTITION BY op, mnc, enb ORDER BY coalesce(sum(campioni), 0) DESC, count(*) DESC) AS rk
    FROM g GROUP BY op, mnc, enb, sub
  )
  SELECT op, ARRAY[tec] AS tec, n, campioni, agg, geom, punti FROM s WHERE rk = 1;
  CREATE INDEX ON _sito USING gist (geom);

  -- 2a. 3G e 2G vicine a una stazione 4G dello stesso operatore
  CREATE TEMP TABLE _assegnate ON COMMIT DROP AS
  SELECT DISTINCT ON (l.id) l.id, s.ctid AS sito, l.tec, l.campioni, l.aggiornata
  FROM _cel l
  JOIN _sito s ON s.op = l.op AND ST_DWithin(s.geom::geography, l.geom::geography, 150)
  WHERE l.radio IN ('GSM', 'UMTS')
  ORDER BY l.id, s.geom <-> l.geom;
  UPDATE _sito s SET tec = ARRAY(SELECT DISTINCT x FROM unnest(s.tec || a.tecs) x ORDER BY 1), n = s.n + a.n, campioni = s.campioni + a.campioni, agg = greatest(s.agg, a.agg)
  FROM (SELECT sito, array_agg(DISTINCT tec) tecs, count(*)::int n, coalesce(sum(campioni), 0)::int campioni, max(aggiornata) agg FROM _assegnate GROUP BY sito) a
  WHERE s.ctid = a.sito;

  -- 2b. 3G e 2G rimaste sole: siti propri se almeno 2 celle entro 100 m
  INSERT INTO _sito (op, tec, n, campioni, agg, geom, punti)
  SELECT op, array_agg(DISTINCT tec ORDER BY tec), count(*)::int, sum(campioni)::int, max(aggiornata), ST_Centroid(ST_Collect(geom)), ST_Collect(geom)
  FROM (
    SELECT l.*, ST_ClusterDBSCAN(ST_Transform(l.geom, 3857), eps := 100 * 1.34, minpoints := 2) OVER (PARTITION BY l.op) AS g
    FROM _cel l WHERE l.radio IN ('GSM', 'UMTS') AND l.id NOT IN (SELECT id FROM _assegnate)
  ) x
  WHERE g IS NOT NULL
  GROUP BY op, g;

  -- 3. un sito fisico puo' avere piu' operatori
  INSERT INTO antenne.siti_stimati (operatori, tecnologie, n_celle, campioni, aggiornato, precisione_m, geom)
  SELECT array_agg(DISTINCT op ORDER BY op),
         ARRAY(SELECT DISTINCT x FROM unnest(string_to_array(string_agg(tec_txt, ','), ',')) x ORDER BY 1),
         sum(n)::int, sum(campioni)::int, max(agg),
         round(ST_MaxDistance(ST_Transform(ST_Collect(punti), 3857), ST_Transform(ST_Centroid(ST_Collect(geom)), 3857)) / 1.34)::int,
         ST_Centroid(ST_Collect(geom))
  FROM (
    SELECT s.*, array_to_string(s.tec, ',') AS tec_txt, ST_ClusterDBSCAN(ST_Transform(s.geom, 3857), eps := 35 * 1.34, minpoints := 1) OVER () AS g
    FROM _sito s
  ) y
  GROUP BY g;
  GET DIAGNOSTICS totale = ROW_COUNT;
  RETURN totale;
END $$;
