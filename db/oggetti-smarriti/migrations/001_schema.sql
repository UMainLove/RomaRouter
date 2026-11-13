-- Database rr_oggetti_smarriti — sfida 03 "Oggetti smarriti: trovare un oggetto senza scorrere i PDF"
-- Catalogo ricercabile + flusso di inserimento e restituzione.
-- Codice civile artt. 927-931: deposito presso il Comune, pubblicazione, dopo un anno l'oggetto
-- spetta a chi l'ha trovato. Privacy: niente dati personali nelle descrizioni pubbliche.

CREATE SCHEMA IF NOT EXISTS smarriti;

CREATE TABLE IF NOT EXISTS smarriti.fonti (
  id            text PRIMARY KEY,
  titolo        text NOT NULL,
  ente          text NOT NULL,              -- Roma Capitale, ATAC, Aeroporti di Roma...
  url           text NOT NULL,
  formato       text NOT NULL,              -- tipicamente PDF
  licenza       text,
  ufficiale     boolean NOT NULL,
  note          text,
  scaricato_il  timestamptz,
  n_record      integer
);

-- Categorie per filtri e ricerca (chiavi, telefoni, borse, documenti, bici...)
CREATE TABLE IF NOT EXISTS smarriti.categorie (
  codice  text PRIMARY KEY,
  nome    text NOT NULL
);

-- Oggetti rinvenuti e depositati
CREATE TABLE IF NOT EXISTS smarriti.oggetti (
  id                    bigserial PRIMARY KEY,
  chiave                text NOT NULL UNIQUE,      -- es. ente + numero di verbale/protocollo
  protocollo            text,
  categoria             text REFERENCES smarriti.categorie(codice),
  descrizione           text NOT NULL,             -- testo pubblico, già ripulito da dati personali
  colore                text,
  marca                 text,
  luogo_ritrovamento    text,
  municipio             smallint CHECK (municipio BETWEEN 1 AND 15),
  geom                  geometry(Point, 4326),     -- se il luogo è geolocalizzabile
  data_ritrovamento     date,
  data_deposito         date,
  ente_custode          text NOT NULL,             -- chi lo custodisce: Ufficio oggetti rinvenuti, ATAC, ADR...
  stato                 text NOT NULL DEFAULT 'in_deposito'
                        CHECK (stato IN ('in_deposito', 'restituito', 'al_ritrovatore', 'devoluto')),
  scadenza_giacenza     date,                      -- di norma un anno dalla pubblicazione (art. 929 c.c.)
  ricerca               tsvector GENERATED ALWAYS AS (
                          to_tsvector('italian_unaccent',
                            coalesce(descrizione, '') || ' ' || coalesce(marca, '') || ' ' ||
                            coalesce(colore, '') || ' ' || coalesce(luogo_ritrovamento, ''))) STORED,
  fonte_id              text REFERENCES smarriti.fonti(id),
  aggiornato_il         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oggetti_ricerca_gix ON smarriti.oggetti USING gin (ricerca);
CREATE INDEX IF NOT EXISTS oggetti_descr_trgm_gix ON smarriti.oggetti USING gin (descrizione gin_trgm_ops);
CREATE INDEX IF NOT EXISTS oggetti_geom_gix ON smarriti.oggetti USING gist (geom);
CREATE INDEX IF NOT EXISTS oggetti_stato_data_ix ON smarriti.oggetti (stato, data_ritrovamento DESC);

-- Richieste di restituzione. I dati identificativi del richiedente NON stanno qui:
-- verifica dell'identità con SPID/CIE e riferimento opaco.
CREATE TABLE IF NOT EXISTS smarriti.richieste_restituzione (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oggetto_id      bigint NOT NULL REFERENCES smarriti.oggetti(id),
  rif_richiedente text NOT NULL,                   -- identificativo opaco
  elementi_prova  text,                            -- dettagli che solo il proprietario conosce (non pubblici)
  stato           text NOT NULL DEFAULT 'inviata'
                  CHECK (stato IN ('inviata', 'in_verifica', 'appuntamento', 'restituito', 'respinta')),
  creata_il       timestamptz NOT NULL DEFAULT now()
);

GRANT USAGE ON SCHEMA smarriti TO romarouter;
GRANT ALL ON ALL TABLES IN SCHEMA smarriti TO romarouter;
GRANT ALL ON ALL SEQUENCES IN SCHEMA smarriti TO romarouter;
