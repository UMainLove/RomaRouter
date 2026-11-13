-- 002_art_spot: dataset "Art Spot" (art-spot-dati/, 13/11/2026) e zone della mappa degli artisti.
-- Ogni riga conserva fonte, stato di verifica e nota sulla posizione del dataset originale:
-- il tool non deve mai presentare come vigente una regola "da verificare".

-- ---------------------------------------------------------------------------
-- Fonti: registro con stato di verifica
-- ---------------------------------------------------------------------------
ALTER TABLE artisti.fonti ADD COLUMN IF NOT EXISTS data_atto text;
ALTER TABLE artisti.fonti ADD COLUMN IF NOT EXISTS url_archivio text;
ALTER TABLE artisti.fonti ADD COLUMN IF NOT EXISTS file_locale text;   -- copia in art-spot-dati/fonti/

-- ---------------------------------------------------------------------------
-- Postazioni e aree dove l'esibizione e' prevista (Allegato B, Municipio X, esoterici, arti figurative)
-- ---------------------------------------------------------------------------
ALTER TABLE artisti.postazioni ADD COLUMN IF NOT EXISTS chiave text;             -- id del dataset, es. postazioni_allegatoB-0001
ALTER TABLE artisti.postazioni ADD COLUMN IF NOT EXISTS tipo text;               -- postazione_allegatoB | area_consentita | area_esoterici | arti_figurative_area
ALTER TABLE artisti.postazioni ADD COLUMN IF NOT EXISTS scheda text;             -- scheda dell'Allegato B
ALTER TABLE artisti.postazioni ADD COLUMN IF NOT EXISTS raggio_m numeric;
ALTER TABLE artisti.postazioni ADD COLUMN IF NOT EXISTS localizzazioni integer;  -- arti figurative: posti nell'area
ALTER TABLE artisti.postazioni ADD COLUMN IF NOT EXISTS regole_testo text;
ALTER TABLE artisti.postazioni ADD COLUMN IF NOT EXISTS fasce_testo text;
ALTER TABLE artisti.postazioni ADD COLUMN IF NOT EXISTS fonte_testo text;
ALTER TABLE artisti.postazioni ADD COLUMN IF NOT EXISTS fonte_url text;
ALTER TABLE artisti.postazioni ADD COLUMN IF NOT EXISTS verifica text;           -- verification_status del dataset
ALTER TABLE artisti.postazioni ADD COLUMN IF NOT EXISTS nota_posizione text;     -- coord_note: dice se la posizione e' stimata
ALTER TABLE artisti.postazioni ADD COLUMN IF NOT EXISTS posizione_stimata boolean NOT NULL DEFAULT true;
ALTER TABLE artisti.postazioni ADD COLUMN IF NOT EXISTS attributi jsonb NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX IF NOT EXISTS postazioni_chiave_ux ON artisti.postazioni (chiave);
CREATE INDEX IF NOT EXISTS postazioni_tipo_ix ON artisti.postazioni (tipo);

-- ---------------------------------------------------------------------------
-- Divieti (delibere del Municipio I e notizie di stampa da verificare)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS artisti.divieti (
  id            bigserial PRIMARY KEY,
  chiave        text NOT NULL UNIQUE,
  municipio     smallint CHECK (municipio BETWEEN 1 AND 15),
  nome          text NOT NULL,
  tipo          text NOT NULL,                      -- divieto_tutte_esibizioni | divieto_suono | divieto_richiesto
  regole_testo  text,
  fasce_testo   text,
  atto          text,
  valido_fino   text,
  fonte_testo   text,
  fonte_url     text,
  verifica      text NOT NULL,
  -- in_vigore: atto ufficiale scaricato. false = solo stampa o richiesta (si mostra, ma come "da verificare")
  ufficiale     boolean NOT NULL,
  vigente       boolean NOT NULL,
  nota_posizione text,
  geom          geometry(Geometry, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS divieti_geom_gix ON artisti.divieti USING gist (geom);

-- ---------------------------------------------------------------------------
-- Luoghi di contesto: dove c'e' pubblico (piazze, attrazioni, stazioni...) e dove l'art. 2 limita
-- il suono (luoghi di culto, scuole, ospedali). Non sono regole: aiutano a scegliere e a capire.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS artisti.contesto (
  id            bigserial PRIMARY KEY,
  chiave        text NOT NULL UNIQUE,
  layer         text NOT NULL,                      -- piazze_pedonali, attrazioni, scuole, luoghi_culto, ...
  tipo          text,
  nome          text,
  municipio     smallint CHECK (municipio BETWEEN 1 AND 15),
  regole_testo  text,
  fasce_testo   text,
  verifica      text,
  fonte_testo   text,
  fonte_url     text,
  attributi     jsonb NOT NULL DEFAULT '{}',
  geom          geometry(Geometry, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS contesto_geom_gix ON artisti.contesto USING gist (geom);
CREATE INDEX IF NOT EXISTS contesto_layer_ix ON artisti.contesto (layer);

-- ---------------------------------------------------------------------------
-- Contatti: PEC del Municipio e Gruppo di Polizia Locale per il preavviso (art. 10 DAC 24/2012)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS artisti.contatti (
  id               bigserial PRIMARY KEY,
  municipio        smallint CHECK (municipio BETWEEN 1 AND 15),   -- NULL = valido per tutta la citta'
  pec_municipio    text,
  ufficio_cultura  text,
  gruppo_pl        text,
  indirizzo_pl     text,
  pec_pl           text,
  telefono_pl      text,
  fonte            text,
  verifica         text,
  note             text,
  geom             geometry(Point, 4326)
);

-- Confronto con altre citta' (studio)
CREATE TABLE IF NOT EXISTS artisti.benchmark (
  citta     text PRIMARY KEY,
  atto      text,
  regole    text,
  fonte_url text
);

-- Fasce orarie stagionali (art. 6: 1/10–31/5 e 1/6–30/9), periodo come MM-GG
ALTER TABLE artisti.fasce_orarie ADD COLUMN IF NOT EXISTS periodo_da text;   -- es. '10-01'
ALTER TABLE artisti.fasce_orarie ADD COLUMN IF NOT EXISTS periodo_a text;    -- es. '05-31'
ALTER TABLE artisti.fasce_orarie ADD COLUMN IF NOT EXISTS riferimento text;

-- Regole generali: riferimento all'articolo e stato di verifica
ALTER TABLE artisti.regole ADD COLUMN IF NOT EXISTS verifica text;
ALTER TABLE artisti.regole ADD COLUMN IF NOT EXISTS chiave text;
CREATE UNIQUE INDEX IF NOT EXISTS regole_chiave_ux ON artisti.regole (chiave);

-- ---------------------------------------------------------------------------
-- Confini dei Municipi (copia della sezione: ogni sezione ha il suo database)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS artisti.municipi (
  numero        smallint PRIMARY KEY,
  numero_romano text NOT NULL,
  geom          geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS municipi_geom_gix ON artisti.municipi USING gist (geom);

-- ---------------------------------------------------------------------------
-- ZONE: la mappa divisa in poligoni, calcolati dai dati sopra (artisti.ricalcola_zone()).
-- esito: no | solo_silenzio | solo_postazioni | condizioni | area_dedicata | info
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS artisti.zone (
  id            bigserial PRIMARY KEY,
  esito         text NOT NULL CHECK (esito IN ('no', 'solo_silenzio', 'solo_postazioni', 'condizioni', 'area_dedicata', 'info')),
  categoria     text NOT NULL,          -- es. divieto, municipio_x, allegato_b, culto, scuola, ospedale, monumento, esoterici, arti_figurative, richiesta
  nome          text NOT NULL,
  motivo        text NOT NULL,          -- spiegazione per il cittadino
  condizione    text,                   -- quando vale (es. "durante l'orario di lezione")
  vale_per      text[] NOT NULL DEFAULT '{}',   -- attivita' a cui si applica; vuoto = tutte
  riferimento   text,                   -- articolo o atto
  fonte_url     text,
  verifica      text NOT NULL,
  ufficiale     boolean NOT NULL,
  approssimata  boolean NOT NULL DEFAULT false,  -- confine ricavato (buffer, perimetro stimato)
  priorita      smallint NOT NULL,      -- piu' alto = piu' restrittivo
  origine       text NOT NULL,          -- tabella e chiave della riga da cui nasce
  geom          geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS zone_geom_gix ON artisti.zone USING gist (geom);
CREATE INDEX IF NOT EXISTS zone_esito_ix ON artisti.zone (esito);

-- ---------------------------------------------------------------------------
-- Profili pubblici degli artisti e calendario delle esibizioni (per i cittadini: "chi si esibisce qui")
-- Solo dati che l'artista sceglie di rendere pubblici; l'identita' resta fuori (SPID/CIE, rif_artista).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS artisti.profili (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rif_artista   text NOT NULL UNIQUE,   -- identificativo opaco
  nome_arte     text NOT NULL,
  disciplina    text NOT NULL,          -- musica, statua vivente, giocoleria, fuoco, ritratti, madonnaro, cartomanzia...
  descrizione   text,
  link          text,
  pubblico      boolean NOT NULL DEFAULT true,
  creato_il     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE artisti.prenotazioni ALTER COLUMN postazione_id DROP NOT NULL;
ALTER TABLE artisti.prenotazioni ADD COLUMN IF NOT EXISTS profilo_id uuid REFERENCES artisti.profili(id);
ALTER TABLE artisti.prenotazioni ADD COLUMN IF NOT EXISTS luogo text;                -- descrizione libera del punto
ALTER TABLE artisti.prenotazioni ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);  -- dove, se non e' una postazione
ALTER TABLE artisti.prenotazioni ADD COLUMN IF NOT EXISTS attivita text;
ALTER TABLE artisti.prenotazioni ADD COLUMN IF NOT EXISTS preavviso_pl_inviato boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS prenotazioni_geom_gix ON artisti.prenotazioni USING gist (geom);

-- Esibizioni visibili ai cittadini: solo profili pubblici e prenotazioni non annullate
CREATE OR REPLACE VIEW artisti.v_esibizioni AS
SELECT p.id, p.inizio, p.fine, p.stato, p.attivita, p.luogo,
       COALESCE(p.geom, s.geom) AS geom,
       s.nome AS postazione, s.chiave AS postazione_chiave,
       pr.nome_arte, pr.disciplina, pr.descrizione, pr.link
FROM artisti.prenotazioni p
JOIN artisti.profili pr ON pr.id = p.profilo_id AND pr.pubblico
LEFT JOIN artisti.postazioni s ON s.id = p.postazione_id
WHERE p.stato <> 'annullata';

GRANT USAGE ON SCHEMA artisti TO romarouter;
GRANT ALL ON ALL TABLES IN SCHEMA artisti TO romarouter;
GRANT ALL ON ALL SEQUENCES IN SCHEMA artisti TO romarouter;
