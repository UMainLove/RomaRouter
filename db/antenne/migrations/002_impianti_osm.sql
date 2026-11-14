-- 002_impianti_osm: impianti esistenti (tralicci, pali, antenne) censiti dai volontari di OpenStreetMap.
-- Il catasto ufficiale degli impianti (circa 3.538 a Roma secondo ARPA Lazio) non e' pubblico: questi sono
-- i soli impianti esistenti con una posizione aperta. Separati dalle richieste del Comune (istanze_srb).
CREATE TABLE IF NOT EXISTS antenne.impianti_osm (
  osm_id      text PRIMARY KEY,           -- es. node/123456
  tipo        text NOT NULL,              -- traliccio, palo, antenna
  mobile      boolean NOT NULL,           -- telefonia mobile dichiarata (communication:mobile_phone)
  operatore   text,
  altezza_m   numeric,
  nome        text,
  attributi   jsonb NOT NULL DEFAULT '{}',
  geom        geometry(Point, 4326) NOT NULL,
  aggiornato_il timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS impianti_osm_gix ON antenne.impianti_osm USING gist (geom);
GRANT SELECT ON antenne.impianti_osm TO romarouter;
