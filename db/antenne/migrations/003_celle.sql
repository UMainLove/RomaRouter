-- 003_celle: le antenne in funzione viste dai telefoni. Celle radio (2G/3G/4G/5G) da dataset aperti
-- costruiti con le misure dei telefoni (formato OpenCelliD / Mozilla Location Service), e i siti stimati
-- (celle vicine raggruppate: un traliccio porta piu' celle e spesso piu' operatori).
-- Le posizioni sono STIME (baricentro delle misure), non le coordinate esatte degli impianti: il catasto
-- ufficiale non e' pubblico.
CREATE TABLE IF NOT EXISTS antenne.celle (
  id          bigserial PRIMARY KEY,
  radio       text NOT NULL,           -- GSM, UMTS, LTE, NR
  mcc         int NOT NULL,
  mnc         int NOT NULL,
  area        bigint,
  cella       bigint NOT NULL,
  raggio_m    int,                     -- area stimata di copertura della cella
  campioni    int,
  creata      timestamptz,
  aggiornata  timestamptz,
  fonte       text NOT NULL,
  geom        geometry(Point, 4326) NOT NULL,
  UNIQUE (fonte, radio, mcc, mnc, area, cella)
);
CREATE INDEX IF NOT EXISTS celle_gix ON antenne.celle USING gist (geom);

CREATE TABLE IF NOT EXISTS antenne.siti_stimati (
  id          serial PRIMARY KEY,
  operatori   text[] NOT NULL,
  tecnologie  text[] NOT NULL,         -- 2G, 3G, 4G, 5G
  n_celle     int NOT NULL,
  campioni    int,
  aggiornato  timestamptz,
  precisione_m int,                    -- quanto e' sparsa la stima
  geom        geometry(Point, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS siti_stimati_gix ON antenne.siti_stimati USING gist (geom);

-- Operatori italiani per codice di rete (MCC 222)
CREATE OR REPLACE FUNCTION antenne.operatore_mnc(mnc int) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE mnc
    WHEN 1 THEN 'TIM' WHEN 43 THEN 'TIM' WHEN 48 THEN 'TIM'
    WHEN 6 THEN 'Vodafone' WHEN 10 THEN 'Vodafone'
    WHEN 88 THEN 'WindTre' WHEN 99 THEN 'WindTre' WHEN 37 THEN 'WindTre'
    WHEN 50 THEN 'Iliad'
    WHEN 30 THEN 'RFI (ferrovie)'
    ELSE 'Altro' END
$$;

-- Ricalcola i siti: celle a meno di 60 m l'una dall'altra formano un sito
CREATE OR REPLACE FUNCTION antenne.ricalcola_siti() RETURNS int LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  DELETE FROM antenne.siti_stimati;
  WITH c AS (
    SELECT c.*, ST_ClusterDBSCAN(ST_Transform(c.geom, 3857), eps := 60 * 1.33, minpoints := 1) OVER () AS gruppo
    FROM antenne.celle c
  )
  INSERT INTO antenne.siti_stimati (operatori, tecnologie, n_celle, campioni, aggiornato, precisione_m, geom)
  SELECT array_agg(DISTINCT antenne.operatore_mnc(mnc) ORDER BY antenne.operatore_mnc(mnc)),
         array_agg(DISTINCT CASE radio WHEN 'GSM' THEN '2G' WHEN 'UMTS' THEN '3G' WHEN 'LTE' THEN '4G' WHEN 'NR' THEN '5G' ELSE radio END
                   ORDER BY CASE radio WHEN 'GSM' THEN '2G' WHEN 'UMTS' THEN '3G' WHEN 'LTE' THEN '4G' WHEN 'NR' THEN '5G' ELSE radio END),
         count(*), sum(campioni), max(aggiornata),
         round(ST_MaxDistance(ST_Transform(ST_Collect(geom), 3857), ST_Transform(ST_Centroid(ST_Collect(geom)), 3857)) / 1.33)::int,
         ST_Centroid(ST_Collect(geom))
  FROM c GROUP BY gruppo;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

GRANT SELECT ON antenne.celle, antenne.siti_stimati TO romarouter;
