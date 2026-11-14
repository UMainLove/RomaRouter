-- 002_luoghi: dove fare sport a Roma (docs/SPORT.md).
-- Un LUOGO (centro sportivo, piscina, campetto in un parco, area fitness, palestra di una scuola con i corsi)
-- ha piu' SPAZI (campo da tennis in terra, piscina coperta...), come il censimento nazionale degli impianti.
-- Ogni luogo dice come ci si entra (accesso) e da quali fonti arriva ogni informazione.

CREATE TABLE IF NOT EXISTS sport.municipi (
  numero         smallint PRIMARY KEY,
  numero_romano  text NOT NULL,
  nome           text,
  geom           geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS municipi_gix ON sport.municipi USING gist (geom);

-- gruppi per i tasselli della mappa (calcio, tennis, padel, nuoto, basket, volley, palestra, corsa, altro)
ALTER TABLE sport.discipline ADD COLUMN IF NOT EXISTS gruppo text;
ALTER TABLE sport.discipline ADD COLUMN IF NOT EXISTS ordine smallint;

CREATE TABLE IF NOT EXISTS sport.luoghi (
  id             bigserial PRIMARY KEY,
  chiave         text NOT NULL UNIQUE,           -- es. 'roma:243.9', 'csm:7-12', 'osm:way/123', 'osm-campi:45'
  nome           text,
  tipo           text NOT NULL,                  -- centro, piscina, campi, area_fitness, playground, palestra, scuola, stadio, pista, maneggio, golf
  accesso        text NOT NULL CHECK (accesso IN ('libero', 'comunale', 'scuola', 'club')),
  -- libero: gratis all'aperto; comunale: impianto pubblico a tariffa massima; scuola: centro sportivo municipale
  -- (corsi nelle palestre delle scuole); club: club, palestra o impianto privato (o gestione non nota)
  municipio      smallint,
  indirizzo      text,
  gestore        text,                           -- concessionario o associazione
  telefono       text,
  email          text,
  sito           text,
  orari          text,
  accessibile    text NOT NULL DEFAULT 'nd' CHECK (accessibile IN ('si', 'no', 'parziale', 'nd')),
  accessibile_fonte text,
  classe         text,                           -- classificazione impianti capitolini 2025: A, B, C
  sis            text,                           -- codice SIS degli impianti capitolini (municipio-numero)
  coperto        boolean,
  illuminato     boolean,
  discipline     text[] NOT NULL DEFAULT '{}',   -- codici sport.discipline (calcolate dagli spazi e dalle fonti)
  gruppi         text[] NOT NULL DEFAULT '{}',   -- gruppi per i filtri
  n_spazi        int NOT NULL DEFAULT 0,
  ufficiale      boolean NOT NULL,               -- c'e' almeno una fonte di Roma Capitale
  fonti          text[] NOT NULL DEFAULT '{}',   -- es. {roma_servizi_sportivi, osm, roma_classificazione_2025}
  note           text,
  wikidata       text,
  wikipedia      text,
  geom           geometry(Point, 4326) NOT NULL,
  area           geometry(MultiPolygon, 4326),
  aggiornato_il  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS luoghi_gix ON sport.luoghi USING gist (geom);
CREATE INDEX IF NOT EXISTS luoghi_area_gix ON sport.luoghi USING gist (area);
CREATE INDEX IF NOT EXISTS luoghi_gruppi_ix ON sport.luoghi USING gin (gruppi);

CREATE TABLE IF NOT EXISTS sport.spazi (
  id           bigserial PRIMARY KEY,
  luogo_id     bigint NOT NULL REFERENCES sport.luoghi(id) ON DELETE CASCADE,
  chiave       text UNIQUE,                      -- es. 'osm:way/456'
  disciplina   text NOT NULL REFERENCES sport.discipline(codice),
  fondo        text,                             -- erba, sintetico, terra, cemento, parquet...
  coperto      boolean,
  illuminato   boolean,
  fonte        text NOT NULL,
  geom         geometry(Geometry, 4326)
);
CREATE INDEX IF NOT EXISTS spazi_luogo_ix ON sport.spazi (luogo_id);

-- tariffe massime degli impianti capitolini (D.D. QA/530 del 28/08/2026) e dei centri sportivi municipali
CREATE TABLE IF NOT EXISTS sport.tariffe (
  id          serial PRIMARY KEY,
  ambito      text NOT NULL,       -- 'impianti_capitolini' o 'centri_municipali'
  gruppo      text,                -- gruppo della disciplina (calcio, tennis...) o null se vale per tutti
  voce        text NOT NULL,       -- es. 'Calcio a 5, campo sintetico, 1 ora'
  euro        numeric(8, 2) NOT NULL,
  unita       text NOT NULL,       -- 'ora', 'mese', 'anno', 'ingresso'
  atto        text NOT NULL,
  fonte_url   text
);

INSERT INTO sport.discipline (codice, nome, gruppo, ordine) VALUES
  ('calcio', 'Calcio', 'calcio', 1), ('calcetto', 'Calcetto (calcio a 5)', 'calcio', 2), ('calcio_a_7', 'Calcio a 7/8', 'calcio', 3),
  ('tennis', 'Tennis', 'tennis', 10), ('padel', 'Padel', 'padel', 20),
  ('nuoto', 'Nuoto', 'nuoto', 30), ('acquagym', 'Acquagym e fitness in acqua', 'nuoto', 31), ('pallanuoto', 'Pallanuoto', 'nuoto', 32),
  ('basket', 'Basket', 'basket', 40), ('pallavolo', 'Pallavolo', 'volley', 50), ('beach_volley', 'Beach volley', 'volley', 51),
  ('fitness', 'Fitness e sala pesi', 'palestra', 60), ('ginnastica', 'Ginnastica', 'palestra', 61), ('danza', 'Danza', 'palestra', 62),
  ('arti_marziali', 'Arti marziali e lotta', 'palestra', 63), ('yoga', 'Yoga e pilates', 'palestra', 64), ('pugilato', 'Pugilato', 'palestra', 65),
  ('atletica', 'Atletica leggera', 'corsa', 70), ('corsa', 'Corsa', 'corsa', 71),
  ('rugby', 'Rugby', 'altro', 80), ('baseball', 'Baseball e softball', 'altro', 81), ('hockey', 'Hockey', 'altro', 82),
  ('equitazione', 'Equitazione', 'altro', 83), ('golf', 'Golf', 'altro', 84), ('skate', 'Skate e pattinaggio', 'altro', 85),
  ('arrampicata', 'Arrampicata', 'altro', 86), ('bocce', 'Bocce', 'altro', 87), ('ping_pong', 'Tennis tavolo', 'altro', 88),
  ('pallamano', 'Pallamano', 'altro', 89), ('scherma', 'Scherma', 'altro', 90), ('ciclismo', 'Ciclismo', 'altro', 91),
  ('canottaggio', 'Canottaggio e canoa', 'altro', 92), ('tiro', 'Tiro a segno e con l''arco', 'altro', 93),
  ('ghiaccio', 'Pattinaggio su ghiaccio', 'altro', 94), ('multi', 'Campo polivalente', 'altro', 99)
ON CONFLICT (codice) DO UPDATE SET nome = EXCLUDED.nome, gruppo = EXCLUDED.gruppo, ordine = EXCLUDED.ordine;

GRANT ALL ON ALL TABLES IN SCHEMA sport TO romarouter;
GRANT ALL ON ALL SEQUENCES IN SCHEMA sport TO romarouter;
