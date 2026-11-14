-- Database rr_impianti_sportivi — sfida 04 "Impianti sportivi: sapere dove praticare sport"
-- Mappa filtrabile per disciplina, Municipio e accessibilità. Geometrie in EPSG:4326.

CREATE SCHEMA IF NOT EXISTS sport;

CREATE TABLE IF NOT EXISTS sport.fonti (
  id            text PRIMARY KEY,
  titolo        text NOT NULL,
  ente          text NOT NULL,
  url           text NOT NULL,
  formato       text NOT NULL,
  licenza       text,
  ufficiale     boolean NOT NULL,
  note          text,
  scaricato_il  timestamptz,
  n_record      integer
);

-- Elenco controllato delle discipline, per filtri coerenti (calcio, nuoto, tennis...)
CREATE TABLE IF NOT EXISTS sport.discipline (
  codice  text PRIMARY KEY,                 -- es. 'calcio', 'nuoto'
  nome    text NOT NULL
);

CREATE TABLE IF NOT EXISTS sport.impianti (
  id                    bigserial PRIMARY KEY,
  chiave                text NOT NULL UNIQUE,       -- per la deduplica tra fonti (es. 'georoma:piscine.12', 'osm:way/123')
  nome                  text NOT NULL,
  tipo                  text,                       -- es. centro sportivo, piscina, palestra, campo all'aperto, area fitness
  gestione              text,                       -- comunale, municipale, in concessione, privato
  gestore               text,
  municipio             smallint CHECK (municipio BETWEEN 1 AND 15),
  indirizzo             text,
  geom                  geometry(Geometry, 4326),   -- punto o poligono
  -- Accessibilità: NULL = informazione non disponibile (da distinguere da "no")
  accessibile_disabili  boolean,
  accessibilita_note    text,
  contatti_pubblici     jsonb NOT NULL DEFAULT '{}', -- telefono/sito della struttura, mai di persone fisiche
  ufficiale             boolean NOT NULL,
  fonte_id              text REFERENCES sport.fonti(id),
  aggiornato_il         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS impianti_geom_gix ON sport.impianti USING gist (geom);
CREATE INDEX IF NOT EXISTS impianti_municipio_ix ON sport.impianti (municipio);

CREATE TABLE IF NOT EXISTS sport.impianti_discipline (
  impianto_id  bigint NOT NULL REFERENCES sport.impianti(id) ON DELETE CASCADE,
  disciplina   text   NOT NULL REFERENCES sport.discipline(codice),
  PRIMARY KEY (impianto_id, disciplina)
);
CREATE INDEX IF NOT EXISTS impianti_discipline_disc_ix ON sport.impianti_discipline (disciplina);

GRANT USAGE ON SCHEMA sport TO romarouter;
GRANT ALL ON ALL TABLES IN SCHEMA sport TO romarouter;
GRANT ALL ON ALL SEQUENCES IN SCHEMA sport TO romarouter;
