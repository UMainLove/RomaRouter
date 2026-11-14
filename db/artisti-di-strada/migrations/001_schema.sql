-- Database rr_artisti_strada — sfida 01 "Artisti di strada: dove esibirsi e come prenotare"
-- Mappa delle postazioni con regole, fasce orarie e prenotazioni. Geometrie in EPSG:4326.

CREATE SCHEMA IF NOT EXISTS artisti;

-- Da dove arriva ogni dato (regolamento, delibere, elenchi dei Municipi, connettore PA Web...)
CREATE TABLE IF NOT EXISTS artisti.fonti (
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

-- Postazioni dove è consentito esibirsi
CREATE TABLE IF NOT EXISTS artisti.postazioni (
  id                  bigserial PRIMARY KEY,
  codice              text UNIQUE,                       -- codice ufficiale della postazione, se esiste
  nome                text NOT NULL,
  municipio           smallint CHECK (municipio BETWEEN 1 AND 15),
  indirizzo           text,
  descrizione         text,
  geom                geometry(Point, 4326),
  capienza_artisti    smallint,                          -- artisti contemporanei ammessi
  amplificazione      boolean,                           -- strumenti amplificati consentiti?
  attiva              boolean NOT NULL DEFAULT true,
  fonte_id            text REFERENCES artisti.fonti(id),
  aggiornato_il       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS postazioni_geom_gix ON artisti.postazioni USING gist (geom);

-- Regole (generali o specifiche di una postazione): divieti, distanze, rumore, durata...
CREATE TABLE IF NOT EXISTS artisti.regole (
  id              bigserial PRIMARY KEY,
  postazione_id   bigint REFERENCES artisti.postazioni(id) ON DELETE CASCADE,  -- NULL = regola valida ovunque
  categoria       text NOT NULL,                     -- es. orari, rumore, strumenti, divieti, permessi
  testo           text NOT NULL,
  riferimento     text,                              -- articolo del regolamento
  url             text
);

-- Fasce orarie prenotabili per postazione
CREATE TABLE IF NOT EXISTS artisti.fasce_orarie (
  id              bigserial PRIMARY KEY,
  postazione_id   bigint NOT NULL REFERENCES artisti.postazioni(id) ON DELETE CASCADE,
  giorni          smallint[] NOT NULL,               -- 1 = lunedì … 7 = domenica
  ora_inizio      time NOT NULL,
  ora_fine        time NOT NULL,
  durata_max_min  smallint,
  CHECK (ora_fine > ora_inizio)
);

-- Prenotazioni. Dati personali minimi: niente nomi o documenti qui;
-- l'identità dell'artista andrà gestita con SPID/CIE e un riferimento opaco.
CREATE TABLE IF NOT EXISTS artisti.prenotazioni (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  postazione_id   bigint NOT NULL REFERENCES artisti.postazioni(id),
  inizio          timestamptz NOT NULL,
  fine            timestamptz NOT NULL,
  rif_artista     text NOT NULL,                     -- identificativo opaco (es. hash), non il nome
  stato           text NOT NULL DEFAULT 'confermata' CHECK (stato IN ('richiesta', 'confermata', 'annullata')),
  creata_il       timestamptz NOT NULL DEFAULT now(),
  CHECK (fine > inizio)
);
CREATE INDEX IF NOT EXISTS prenotazioni_postazione_ix ON artisti.prenotazioni (postazione_id, inizio);

GRANT USAGE ON SCHEMA artisti TO romarouter;
GRANT ALL ON ALL TABLES IN SCHEMA artisti TO romarouter;
GRANT ALL ON ALL SEQUENCES IN SCHEMA artisti TO romarouter;
