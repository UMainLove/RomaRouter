-- Completamento del flusso protetto: badge guardie giurate (cancellazione foto dopo verifica),
-- contatore tentativi falliti e sblocco allo sportello, Magic Link monouso a scadenza,
-- registro notifiche cifrate e postazione operatori.

ALTER TABLE smarriti.custodi
  ADD COLUMN IF NOT EXISTS matricola text,
  ADD COLUMN IF NOT EXISTS decreto_prefettizio text,
  ADD COLUMN IF NOT EXISTS foto_badge_cifrata text,
  ADD COLUMN IF NOT EXISTS postazione_id text,
  ADD COLUMN IF NOT EXISTS verificato_il timestamptz;

ALTER TABLE smarriti.oggetti
  ADD COLUMN IF NOT EXISTS tentativi_falliti integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bloccato_motivo text,
  ADD COLUMN IF NOT EXISTS sbloccato_il timestamptz,
  ADD COLUMN IF NOT EXISTS sbloccato_da text;

CREATE TABLE IF NOT EXISTS smarriti.notifiche (
  id                bigserial PRIMARY KEY,
  destinatario_rif  text NOT NULL,
  canale            text NOT NULL CHECK (canale IN ('whatsapp', 'sms', 'email')),
  tipo              text NOT NULL CHECK (tipo IN ('conferma_perso', 'messaggio_cifrato', 'semaforo_documento', 'passaggio_comando')),
  testo_cifrato     text NOT NULL,
  match_id          uuid REFERENCES smarriti.match(id) ON DELETE SET NULL,
  oggetto_id        bigint REFERENCES smarriti.oggetti(id) ON DELETE SET NULL,
  creata_il         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifiche_dest_ix ON smarriti.notifiche (destinatario_rif, id DESC);

CREATE TABLE IF NOT EXISTS smarriti.magic_link (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_imp         text NOT NULL UNIQUE,
  pin_imp           text,
  tipo              text NOT NULL CHECK (tipo IN ('personale', 'struttura')),
  rif_utente        text NOT NULL,
  canale            text NOT NULL CHECK (canale IN ('whatsapp', 'sms', 'email')),
  recapito_cifrato  text NOT NULL,
  scade_il          timestamptz NOT NULL,
  usato_il          timestamptz,
  creato_il         timestamptz NOT NULL DEFAULT now(),
  CHECK (tipo <> 'struttura' OR pin_imp IS NOT NULL)
);

-- Assicura i permessi anche sulle nuove tabelle
GRANT ALL ON ALL TABLES IN SCHEMA smarriti TO romarouter;
GRANT ALL ON ALL SEQUENCES IN SCHEMA smarriti TO romarouter;
GRANT ALL ON ALL TABLES IN SCHEMA riservato TO romarouter;
