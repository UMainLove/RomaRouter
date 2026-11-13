-- RomaRouter: database locale di sviluppo
-- Da eseguire UNA volta come superuser "postgres":
--   psql -U postgres -h localhost -v app_password='scegli-una-password' -f db/init.sql
-- Poi metti la stessa password in DATABASE_URL dentro .env.local

\set ON_ERROR_STOP on

-- Ruolo applicativo (l'app Next.js si collega con questo, non con postgres)
SELECT format('CREATE ROLE romarouter LOGIN PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'romarouter') \gexec

-- Database del progetto
SELECT 'CREATE DATABASE romarouter OWNER romarouter ENCODING ''UTF8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'romarouter') \gexec

\connect romarouter

-- Estensioni
CREATE EXTENSION IF NOT EXISTS postgis;      -- geometrie: municipi, quartieri, sedi, POI
CREATE EXTENSION IF NOT EXISTS postgis_raster; -- dati raster (ortofoto, mappe di calore); richiesto da h3_postgis
CREATE EXTENSION IF NOT EXISTS pgrouting;    -- percorsi su grafo stradale / trasporti
CREATE EXTENSION IF NOT EXISTS h3;           -- griglia esagonale per aggregare dati sul territorio
CREATE EXTENSION IF NOT EXISTS h3_postgis;
CREATE EXTENSION IF NOT EXISTS ogr_fdw;      -- leggere GeoJSON/Shapefile/CSV degli open data come tabelle
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- ricerca testuale "fuzzy" (vie, nomi uffici, servizi)
CREATE EXTENSION IF NOT EXISTS unaccent;     -- ricerca senza accenti
CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- gen_random_uuid(), hash
CREATE EXTENSION IF NOT EXISTS citext;       -- email / codici case-insensitive

-- pgvector (embedding per il chatbot / RAG): richiede l'estensione installata sul server.
-- Su Windows con Smart App Control attivo la DLL compilata in locale viene bloccata
-- (errore 4551): in quel caso lo script prosegue senza pgvector. Vedi docs/SETUP.md.
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

-- Configurazione full-text in italiano senza accenti
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'italian_unaccent') THEN
    CREATE TEXT SEARCH CONFIGURATION italian_unaccent (COPY = italian);
    ALTER TEXT SEARCH CONFIGURATION italian_unaccent
      ALTER MAPPING FOR hword, hword_part, word WITH unaccent, italian_stem;
  END IF;
END $$;

-- Schemi per organizzare i dati
CREATE SCHEMA IF NOT EXISTS opendata AUTHORIZATION romarouter;  -- dataset importati (Roma Capitale, ISTAT, ...)
CREATE SCHEMA IF NOT EXISTS chatbot  AUTHORIZATION romarouter;  -- conversazioni, documenti, embedding
CREATE SCHEMA IF NOT EXISTS pagamenti AUTHORIZATION romarouter; -- posizioni debitorie / esiti pagoPA

GRANT ALL ON SCHEMA public TO romarouter;
ALTER DATABASE romarouter SET search_path = public, opendata, chatbot, pagamenti;
