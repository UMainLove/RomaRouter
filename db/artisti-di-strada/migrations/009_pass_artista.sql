-- 009_pass_artista: lo sportello unico dell'arte di strada.
-- L'artista si registra una volta (il Pass: identita', cosa fa, tre risposte si'/no, delega) e poi prenota
-- con un tocco. Ogni sera lo sportello manda UNA comunicazione per Gruppo di Polizia Locale con tutte le
-- esibizioni del suo territorio (art. 10 DAC 24/2012: "fino a sistema informatico di prenotazione"),
-- l'elenco SIAE di chi suona brani di altri e le richieste di nulla osta (tipo 1) ai Municipi.
-- DEMO: le comunicazioni non partono davvero, si scrivono complete (anche come file .eml) e restano qui.

CREATE SEQUENCE IF NOT EXISTS artisti.pass_seq START 1001;

ALTER TABLE artisti.profili ADD COLUMN IF NOT EXISTS token uuid UNIQUE;
ALTER TABLE artisti.profili ADD COLUMN IF NOT EXISTS numero_pass text UNIQUE;
ALTER TABLE artisti.profili ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE artisti.profili ADD COLUMN IF NOT EXISTS cognome text;
ALTER TABLE artisti.profili ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE artisti.profili ADD COLUMN IF NOT EXISTS identita text;            -- spid, cie, prova (demo)
ALTER TABLE artisti.profili ADD COLUMN IF NOT EXISTS attivita text;            -- musica, silenziosa, fuoco, figurativa, esoterica
ALTER TABLE artisti.profili ADD COLUMN IF NOT EXISTS gruppo_grande boolean NOT NULL DEFAULT false;  -- >5 persone, impianti potenti o scenografie >1 m2: tipo 1
ALTER TABLE artisti.profili ADD COLUMN IF NOT EXISTS amplificazione boolean NOT NULL DEFAULT false; -- amplificazione o strumenti elettrici/a batteria
ALTER TABLE artisti.profili ADD COLUMN IF NOT EXISTS cover boolean NOT NULL DEFAULT false;          -- brani di altri: SIAE
ALTER TABLE artisti.profili ADD COLUMN IF NOT EXISTS fuoco_oltre_due boolean NOT NULL DEFAULT false; -- estintore e coperta ignifuga
ALTER TABLE artisti.profili ADD COLUMN IF NOT EXISTS posto_assegnato text;     -- arti figurative (DGC 154/2026)
ALTER TABLE artisti.profili ADD COLUMN IF NOT EXISTS delega boolean NOT NULL DEFAULT false;
ALTER TABLE artisti.profili ADD COLUMN IF NOT EXISTS delega_il timestamptz;

CREATE TABLE IF NOT EXISTS artisti.invii (
  id            bigserial PRIMARY KEY,
  tipo          text NOT NULL CHECK (tipo IN ('pec_pl', 'siae', 'nulla_osta')),
  destinatario  text NOT NULL,          -- es. "Gruppo I Centro Storico"
  indirizzo     text,                   -- PEC o email del destinatario
  municipio     smallint,
  oggetto       text NOT NULL,
  corpo         text NOT NULL,
  allegato_csv  text,
  n_esibizioni  int NOT NULL DEFAULT 0,
  stato         text NOT NULL DEFAULT 'inviato_demo' CHECK (stato IN ('pronto', 'inviato_demo', 'inviato')),
  creato_il     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE artisti.prenotazioni ADD COLUMN IF NOT EXISTS municipio smallint;
ALTER TABLE artisti.prenotazioni ADD COLUMN IF NOT EXISTS gruppo_pl text;
ALTER TABLE artisti.prenotazioni ADD COLUMN IF NOT EXISTS pec_pl text;
ALTER TABLE artisti.prenotazioni ADD COLUMN IF NOT EXISTS invio_pl_id bigint REFERENCES artisti.invii(id);
ALTER TABLE artisti.prenotazioni ADD COLUMN IF NOT EXISTS invio_siae_id bigint REFERENCES artisti.invii(id);
ALTER TABLE artisti.prenotazioni ADD COLUMN IF NOT EXISTS nulla_osta text CHECK (nulla_osta IN ('richiesto', 'inviato')); -- solo tipo 1
ALTER TABLE artisti.prenotazioni ADD COLUMN IF NOT EXISTS invio_nulla_osta_id bigint REFERENCES artisti.invii(id);
ALTER TABLE artisti.prenotazioni ADD COLUMN IF NOT EXISTS creata_dal_pass boolean NOT NULL DEFAULT false;

GRANT ALL ON ALL TABLES IN SCHEMA artisti TO romarouter;
GRANT ALL ON ALL SEQUENCES IN SCHEMA artisti TO romarouter;
