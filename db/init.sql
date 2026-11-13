-- RomaRouter: database locali di sviluppo
-- Da eseguire come superuser "postgres", dalla cartella del progetto:
--   psql -U postgres -h localhost -v app_password='scegli-una-password' -f db/init.sql
-- Poi metti la stessa password nelle variabili DATABASE_URL* di .env.local (vedi .env.example).
-- Si può rilanciare: salta ciò che esiste già.
--
-- Struttura: un database separato per ogni sezione del sito, così ogni tool resta indipendente
-- (la mappa delle antenne non vede i dati degli artisti di strada, e così via).
--   rr_antenne            → /antenne             (antenne di telefonia mobile)
--   rr_artisti_strada     → /artisti-di-strada   (postazioni, regole, prenotazioni)
--   rr_impianti_sportivi  → /impianti-sportivi   (mappa per disciplina, municipio, accessibilità)
--   rr_oggetti_smarriti   → /oggetti-smarriti    (catalogo ricercabile, inserimento, restituzione)
--   romarouter            → database generale (controllo /api/health); le sezioni non lo usano

\set ON_ERROR_STOP on

-- Ruolo applicativo (l'app Next.js si collega con questo, non con postgres)
SELECT format('CREATE ROLE romarouter LOGIN PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'romarouter') \gexec

-- Database
SELECT format('CREATE DATABASE %I OWNER romarouter ENCODING ''UTF8'' TEMPLATE template0', d)
FROM unnest(ARRAY['romarouter', 'rr_antenne', 'rr_artisti_strada', 'rr_impianti_sportivi', 'rr_oggetti_smarriti']) AS d
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = d) \gexec

-- ---------------------------------------------------------------------------
-- Database generale
-- ---------------------------------------------------------------------------
\connect romarouter
\ir _estensioni.sql

-- ---------------------------------------------------------------------------
-- Un database per sezione (gli schemi li creano le migrazioni in db/<sezione>/migrations)
-- ---------------------------------------------------------------------------
\connect rr_antenne
\ir _estensioni.sql

\connect rr_artisti_strada
\ir _estensioni.sql

\connect rr_impianti_sportivi
\ir _estensioni.sql

\connect rr_oggetti_smarriti
\ir _estensioni.sql
