-- Estensioni comuni, installate in OGNI database del progetto (incluso da db/init.sql con \ir).
-- Va eseguito connessi al database di destinazione, come superuser.

CREATE EXTENSION IF NOT EXISTS postgis;        -- geometrie: postazioni, impianti, luoghi di ritrovamento
CREATE EXTENSION IF NOT EXISTS postgis_raster; -- dati raster; richiesto da h3_postgis
CREATE EXTENSION IF NOT EXISTS pgrouting;      -- percorsi su grafo stradale / trasporti
CREATE EXTENSION IF NOT EXISTS h3;             -- griglia esagonale per aggregare dati sul territorio
CREATE EXTENSION IF NOT EXISTS h3_postgis;
CREATE EXTENSION IF NOT EXISTS ogr_fdw;        -- leggere GeoJSON/Shapefile/CSV degli open data come tabelle
CREATE EXTENSION IF NOT EXISTS pg_trgm;        -- ricerca testuale "fuzzy" (descrizioni, vie, nomi)
CREATE EXTENSION IF NOT EXISTS unaccent;       -- ricerca senza accenti
CREATE EXTENSION IF NOT EXISTS pgcrypto;       -- gen_random_uuid(), hash
CREATE EXTENSION IF NOT EXISTS citext;         -- email / codici case-insensitive

-- pgvector (ricerca per somiglianza, es. descrizioni di oggetti smarriti): se Smart App Control blocca la DLL (errore 4551)
-- lo script prosegue senza. Vedi docs/SETUP.md.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS vector;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'pgvector presente ma non caricabile: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'pgvector non installato su questo server: vedi docs/SETUP.md';
  END IF;
END $$;

-- Ricerca full-text in italiano senza accenti
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'italian_unaccent') THEN
    CREATE TEXT SEARCH CONFIGURATION italian_unaccent (COPY = italian);
    ALTER TEXT SEARCH CONFIGURATION italian_unaccent
      ALTER MAPPING FOR hword, hword_part, word WITH unaccent, italian_stem;
  END IF;
END $$;

GRANT ALL ON SCHEMA public TO romarouter;
