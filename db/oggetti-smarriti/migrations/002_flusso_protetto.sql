-- Flusso protetto a tre livelli per la sezione Oggetti Smarriti (sfida 03)
-- Schema riservato separato per i dettagli non pubblici, custodi temporanei abilitati,
-- matching nascosto lato server, messaggi cifrati, appuntamenti con conferma bilaterale,
-- passaggi di consegna e audit log in sola aggiunta.

CREATE SCHEMA IF NOT EXISTS riservato;

ALTER TABLE smarriti.oggetti
  DROP CONSTRAINT IF EXISTS oggetti_stato_check;

ALTER TABLE smarriti.oggetti
  ADD COLUMN IF NOT EXISTS pubblico boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS macro_area text,
  ADD COLUMN IF NOT EXISTS fascia text CHECK (fascia IN ('mattina', 'pomeriggio', 'sera', 'notte')),
  ADD COLUMN IF NOT EXISTS luogo_tipo text CHECK (luogo_tipo IN ('mezzi', 'strada', 'taxi')),
  ADD COLUMN IF NOT EXISTS custode_id uuid,
  ADD COLUMN IF NOT EXISTS rif_ritrovatore text,
  ADD COLUMN IF NOT EXISTS documento_impronta text,
  ADD COLUMN IF NOT EXISTS codice_consegna_imp text,
  ADD COLUMN IF NOT EXISTS bloccato boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS creato_il timestamptz NOT NULL DEFAULT now();

ALTER TABLE smarriti.oggetti
  ADD CONSTRAINT oggetti_stato_check
  CHECK (stato IN (
    'da_consegnare', 'in_deposito', 'custodia_temporanea', 'in_verifica',
    'restituito', 'consegnato_comando', 'al_ritrovatore', 'devoluto'
  ));

CREATE TABLE IF NOT EXISTS smarriti.custodi (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rif                 text NOT NULL UNIQUE,
  ruolo               text NOT NULL CHECK (ruolo IN ('volontario', 'guardia_giurata', 'forze_ordine', 'punto_h24', 'ufficio')),
  pseudonimo          text NOT NULL UNIQUE,
  macro_area          text,
  stato               text NOT NULL DEFAULT 'in_attesa' CHECK (stato IN ('in_attesa', 'approvato', 'sospeso')),
  residente_dal       date,
  istituto_vigilanza  text,
  conferma_istituto   boolean NOT NULL DEFAULT false,
  approvato_il        timestamptz,
  creato_il           timestamptz NOT NULL DEFAULT now(),
  CHECK (ruolo <> 'volontario' OR residente_dal IS NOT NULL),
  CHECK (ruolo <> 'guardia_giurata' OR stato <> 'approvato' OR conferma_istituto)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'oggetti_custode_id_fkey'
  ) THEN
    ALTER TABLE smarriti.oggetti
      ADD CONSTRAINT oggetti_custode_id_fkey FOREIGN KEY (custode_id) REFERENCES smarriti.custodi(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS riservato.dettagli_oggetto (
  oggetto_id         bigint PRIMARY KEY REFERENCES smarriti.oggetti(id) ON DELETE CASCADE,
  dettaglio_cifrato  text NOT NULL,
  creato_il          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS smarriti.punti_consegna (
  id          text PRIMARY KEY,
  nome        text NOT NULL,
  tipo        text NOT NULL CHECK (tipo IN ('punto_h24', 'comando', 'ufficio')),
  indirizzo   text NOT NULL,
  macro_area  text,
  h24         boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS smarriti.segnalazioni_perso (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rif_richiedente     text NOT NULL,
  pseudonimo          text NOT NULL UNIQUE,
  categoria           text NOT NULL REFERENCES smarriti.categorie(codice),
  macro_area          text NOT NULL,
  fascia              text NOT NULL CHECK (fascia IN ('mattina', 'pomeriggio', 'sera', 'notte')),
  luogo_tipo          text CHECK (luogo_tipo IN ('mezzi', 'strada', 'taxi')),
  data_smarrimento    date NOT NULL,
  documento_impronta  text,
  denuncia_cifrata    text,
  recapito_canale     text NOT NULL CHECK (recapito_canale IN ('whatsapp', 'sms', 'email')),
  recapito_cifrato    text NOT NULL,
  stato               text NOT NULL DEFAULT 'attiva' CHECK (stato IN ('attiva', 'restituito', 'chiusa')),
  creata_il           timestamptz NOT NULL DEFAULT now(),
  chiusa_il           timestamptz,
  CHECK (categoria <> 'documenti' OR (documento_impronta IS NOT NULL AND denuncia_cifrata IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS segnalazioni_una_attiva_ux
  ON smarriti.segnalazioni_perso (rif_richiedente) WHERE stato = 'attiva';
CREATE INDEX IF NOT EXISTS segnalazioni_match_ix
  ON smarriti.segnalazioni_perso (categoria, macro_area) WHERE stato = 'attiva';
CREATE INDEX IF NOT EXISTS segnalazioni_documento_ix
  ON smarriti.segnalazioni_perso (documento_impronta) WHERE documento_impronta IS NOT NULL AND stato = 'attiva';

CREATE INDEX IF NOT EXISTS oggetti_custode_ix ON smarriti.oggetti (custode_id);
CREATE INDEX IF NOT EXISTS oggetti_documento_ix ON smarriti.oggetti (documento_impronta) WHERE documento_impronta IS NOT NULL;
CREATE INDEX IF NOT EXISTS oggetti_match_ix ON smarriti.oggetti (categoria, macro_area, data_ritrovamento) WHERE NOT bloccato;

CREATE TABLE IF NOT EXISTS smarriti.match (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oggetto_id       bigint NOT NULL REFERENCES smarriti.oggetti(id),
  segnalazione_id  uuid NOT NULL REFERENCES smarriti.segnalazioni_perso(id),
  punteggio        smallint NOT NULL,
  esatto           boolean NOT NULL DEFAULT false,
  stato            text NOT NULL DEFAULT 'proposto'
                   CHECK (stato IN ('proposto', 'contatto', 'verificato', 'appuntamento', 'restituito', 'respinto', 'scartato')),
  motivo_codice    text CHECK (motivo_codice IN ('risposte_errate', 'descrizione_diversa', 'sospetto', 'altro')),
  motivo           text,
  creato_il        timestamptz NOT NULL DEFAULT now(),
  aggiornato_il    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (oggetto_id, segnalazione_id),
  CHECK (stato <> 'respinto' OR (motivo_codice IS NOT NULL AND motivo IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS match_segnalazione_ix ON smarriti.match (segnalazione_id);

CREATE TABLE IF NOT EXISTS smarriti.messaggi (
  id             bigserial PRIMARY KEY,
  match_id       uuid NOT NULL REFERENCES smarriti.match(id) ON DELETE CASCADE,
  mittente       text NOT NULL CHECK (mittente IN ('custode', 'richiedente', 'sistema')),
  tipo           text NOT NULL DEFAULT 'testo' CHECK (tipo IN ('testo', 'descrizione', 'domanda', 'risposta', 'avviso')),
  corpo_cifrato  text NOT NULL,
  creato_il      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messaggi_match_ix ON smarriti.messaggi (match_id, id);

CREATE TABLE IF NOT EXISTS smarriti.appuntamenti (
  match_id                uuid PRIMARY KEY REFERENCES smarriti.match(id),
  punto_id                text NOT NULL REFERENCES smarriti.punti_consegna(id),
  quando                  timestamptz NOT NULL,
  numero_mascherato       text NOT NULL,
  codice_ritiro_cifrato   text NOT NULL,
  conferma_custode_il     timestamptz,
  conferma_richiedente_il timestamptz,
  creato_il               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS smarriti.passaggi_consegna (
  id             bigserial PRIMARY KEY,
  oggetto_id     bigint NOT NULL REFERENCES smarriti.oggetti(id),
  da_custode_id  uuid REFERENCES smarriti.custodi(id),
  a_custode_id   uuid REFERENCES smarriti.custodi(id),
  motivo         text NOT NULL,
  creato_il      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS smarriti.audit (
  id          bigserial PRIMARY KEY,
  quando      timestamptz NOT NULL DEFAULT now(),
  attore      text NOT NULL,
  ruolo       text NOT NULL,
  azione      text NOT NULL,
  oggetto_id  bigint,
  match_id    uuid,
  dettagli    jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS audit_quando_ix ON smarriti.audit (quando DESC);

CREATE OR REPLACE FUNCTION smarriti.audit_solo_aggiunta() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Il registro delle azioni è in sola aggiunta';
END $$;

DROP TRIGGER IF EXISTS audit_solo_aggiunta ON smarriti.audit;
CREATE TRIGGER audit_solo_aggiunta
  BEFORE UPDATE OR DELETE ON smarriti.audit
  FOR EACH ROW EXECUTE FUNCTION smarriti.audit_solo_aggiunta();

ALTER TABLE smarriti.richieste_restituzione
  ADD COLUMN IF NOT EXISTS chi_ritira text CHECK (chi_ritira IN ('persona', 'delega', 'consolato')),
  ADD COLUMN IF NOT EXISTS quando timestamptz;

-- Dati iniziali di riferimento e catalogo di esempio
INSERT INTO smarriti.fonti (id, titolo, ente, url, formato, ufficiale, note) VALUES
  ('inf39645', 'Elenco degli oggetti rinvenuti', 'Roma Capitale', 'https://www.comune.roma.it/web/it/informazione-di-servizio.page?contentId=INF39645', 'PDF', true, 'Elenco già pubblico: nel catalogo compaiono solo gli stessi dati. Mai usarlo per le domande di controllo.'),
  ('custodi', 'Ritrovamenti registrati dai custodi temporanei', 'RomaRouter', '/oggetti', 'app', false, 'Mai pubblicati: servono solo al matching lato server.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO smarriti.categorie (codice, nome) VALUES
  ('borse', 'Borse e zaini'),
  ('portafogli', 'Portafogli'),
  ('documenti', 'Documenti'),
  ('elettronica', 'Telefoni ed elettronica'),
  ('chiavi', 'Chiavi'),
  ('occhiali', 'Occhiali'),
  ('valigie', 'Valigie'),
  ('abbigliamento', 'Abbigliamento'),
  ('ombrelli', 'Ombrelli'),
  ('altro', 'Altros')
ON CONFLICT (codice) DO NOTHING;

UPDATE smarriti.categorie SET nome = 'Altro' WHERE codice = 'altro';

INSERT INTO smarriti.punti_consegna (id, nome, tipo, indirizzo, macro_area, h24) VALUES
  ('ufficio-or', 'Ufficio Oggetti Rinvenuti', 'ufficio', 'Circonvallazione Ostiense 191', 'ostiense', false),
  ('pl-centro', 'Comando Polizia Locale, Gruppo Centro (esempio)', 'comando', 'Via della Consolazione 4', 'centro', true),
  ('cc-aventino', 'Stazione Carabinieri (esempio)', 'comando', 'Viale Aventino 39', 'aventino', true),
  ('h24-testaccio', 'Punto Amico H24, hotel convenzionato (esempio)', 'punto_h24', 'Via Marmorata 90', 'testaccio', true),
  ('h24-trastevere', 'Punto Amico H24, bar tabacchi convenzionato (esempio)', 'punto_h24', 'Viale di Trastevere 112', 'trastevere', true),
  ('h24-ostiense', 'Punto Amico H24, reception convenzionata (esempio)', 'punto_h24', 'Via Ostiense 131', 'ostiense', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO smarriti.custodi (id, rif, ruolo, pseudonimo, macro_area, stato, residente_dal, istituto_vigilanza, conferma_istituto, approvato_il) VALUES
  ('ccb36c3c-ba6d-4754-9de9-79075e8a64b2', 'demo:ufficio', 'ufficio', 'Ufficio Oggetti Rinvenuti', 'ostiense', 'approvato', NULL, NULL, false, now()),
  ('39986216-98a7-4324-bd72-186e960e236a', 'demo:volontario', 'volontario', 'Custode V-07', 'trastevere', 'approvato', '2009-03-01', NULL, false, now()),
  ('a6fdd997-cd25-4623-bfd8-1107dfdcad31', 'demo:guardia', 'guardia_giurata', 'Custode G-12', 'ostiense', 'approvato', NULL, 'Istituto di vigilanza (esempio)', true, now()),
  ('c62c4e10-928d-43f3-88e3-170a324fe37f', 'demo:forze-ordine', 'forze_ordine', 'Polizia Locale P-03', 'aventino', 'approvato', NULL, NULL, false, now()),
  ('fe1ac860-8646-4b19-8723-e82f01a869e8', 'demo:punto-h24', 'punto_h24', 'Punto H24 H-21', 'testaccio', 'approvato', NULL, NULL, false, now()),
  ('c81fefd8-fb41-4705-96fd-012d81a22540', 'demo:volontario-in-attesa', 'volontario', 'Custode V-19', 'prati', 'in_attesa', '2021-06-01', NULL, false, NULL)
ON CONFLICT (rif) DO NOTHING;

INSERT INTO smarriti.oggetti (chiave, protocollo, categoria, descrizione, colore, luogo_ritrovamento, data_ritrovamento, ente_custode, stato, pubblico, macro_area, fascia, luogo_tipo, custode_id, fonte_id) VALUES
  ('OR-26-04640', 'OR-26-04640', 'borse', 'Borsa a tracolla marrone', 'marrone', 'Taxi', '2026-11-05', 'Ufficio Oggetti Rinvenuti', 'in_deposito', true, 'aventino', 'notte', 'taxi', 'ccb36c3c-ba6d-4754-9de9-79075e8a64b2', 'inf39645'),
  ('OR-26-04655', 'OR-26-04655', 'abbigliamento', 'Giacca a vento verde', 'verde', 'In strada', '2026-11-06', 'Ufficio Oggetti Rinvenuti', 'in_deposito', true, 'testaccio', 'sera', 'strada', 'ccb36c3c-ba6d-4754-9de9-79075e8a64b2', 'inf39645'),
  ('OR-26-04688', 'OR-26-04688', 'ombrelli', 'Ombrello pieghevole blu', 'blu', 'Mezzo pubblico', '2026-11-08', 'Ufficio Oggetti Rinvenuti', 'in_deposito', true, 'ostiense', 'pomeriggio', 'mezzi', 'ccb36c3c-ba6d-4754-9de9-79075e8a64b2', 'inf39645'),
  ('OR-26-04755', 'OR-26-04755', 'documenti', 'Documento d''identità', NULL, 'In strada', '2026-11-11', 'Ufficio Oggetti Rinvenuti', 'in_deposito', true, 'aventino', 'sera', 'strada', 'ccb36c3c-ba6d-4754-9de9-79075e8a64b2', 'inf39645'),
  ('OR-26-04760', 'OR-26-04760', 'borse', 'Zainetto nero da bambino', 'nero', 'Mezzo pubblico', '2026-11-13', 'Ufficio Oggetti Rinvenuti', 'in_verifica', true, 'ostiense', 'mattina', 'mezzi', 'ccb36c3c-ba6d-4754-9de9-79075e8a64b2', 'inf39645'),
  ('OR-26-04797', 'OR-26-04797', 'borse', 'Zaino nero con logo sportivo', 'nero', 'In strada', '2026-11-12', 'Ufficio Oggetti Rinvenuti', 'in_deposito', true, 'testaccio', 'pomeriggio', 'strada', 'ccb36c3c-ba6d-4754-9de9-79075e8a64b2', 'inf39645'),
  ('OR-26-04812', 'OR-26-04812', 'borse', 'Zaino nero con tasca frontale', 'nero', 'Mezzo pubblico', '2026-11-12', 'Ufficio Oggetti Rinvenuti', 'in_deposito', true, 'trastevere', 'mattina', 'mezzi', 'ccb36c3c-ba6d-4754-9de9-79075e8a64b2', 'inf39645'),
  ('CT-26-00013', 'CT-26-00013', 'elettronica', 'Auricolari bianchi nella custodia', 'bianco', 'In strada', '2026-11-11', 'Custode V-07', 'custodia_temporanea', false, 'trastevere', 'pomeriggio', 'strada', '39986216-98a7-4324-bd72-186e960e236a', 'custodi'),
  ('CT-26-00011', 'CT-26-00011', 'elettronica', 'Smartphone con cover rossa', 'rosso', 'In strada', '2026-11-13', 'Custode V-07', 'custodia_temporanea', false, 'trastevere', 'sera', 'strada', '39986216-98a7-4324-bd72-186e960e236a', 'custodi'),
  ('CT-26-00015', 'CT-26-00015', 'valigie', 'Trolley da cabina', 'blu', 'In strada', '2026-11-13', 'Custode G-12', 'custodia_temporanea', false, 'ostiense', 'pomeriggio', 'strada', 'a6fdd997-cd25-4623-bfd8-1107dfdcad31', 'custodi'),
  ('CT-26-00014', 'CT-26-00014', 'occhiali', 'Occhiali da sole', 'nero', 'In strada', '2026-11-13', 'Custode G-12', 'custodia_temporanea', false, 'ostiense', 'pomeriggio', 'strada', 'a6fdd997-cd25-4623-bfd8-1107dfdcad31', 'custodi'),
  ('CT-26-00012', 'CT-26-00012', 'chiavi', 'Mazzo di tre chiavi con portachiavi', NULL, 'In strada', '2026-11-12', 'Punto H24 H-21', 'custodia_temporanea', false, 'testaccio', 'mattina', 'strada', 'fe1ac860-8646-4b19-8723-e82f01a869e8', 'custodi')
ON CONFLICT (chiave) DO NOTHING;

GRANT USAGE ON SCHEMA riservato TO romarouter;
GRANT ALL ON ALL TABLES IN SCHEMA riservato TO romarouter;
GRANT ALL ON ALL TABLES IN SCHEMA smarriti TO romarouter;
GRANT ALL ON ALL SEQUENCES IN SCHEMA smarriti TO romarouter;
