-- 001_antenne (database rr_antenne): dati per la sfida "Antenne di telefonia mobile"
-- Geometrie sempre in EPSG:4326 (WGS84). Le distanze si calcolano su geography (metri).
-- Ogni riga punta alla sua fonte (antenne.fonti) e dichiara se il dato è ufficiale.

CREATE SCHEMA IF NOT EXISTS antenne;
CREATE SCHEMA IF NOT EXISTS opendata;  -- confini amministrativi usati dal layer antenne

-- ---------------------------------------------------------------------------
-- Registro delle fonti: da dove arriva ogni dato, con licenza e impronta del file
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS antenne.fonti (
  id              text PRIMARY KEY,                 -- es. 'roma_pau_srb_2025'
  titolo          text NOT NULL,
  ente            text NOT NULL,                    -- Roma Capitale, ARPA Lazio, OpenStreetMap...
  url             text NOT NULL,
  formato         text NOT NULL,                    -- HTML, PDF, XLSX, WFS GeoJSON, Overpass JSON
  licenza         text,                             -- NULL = non dichiarata dalla fonte
  ufficiale       boolean NOT NULL,
  note            text,
  scaricato_il    timestamptz,
  sha256          text,                             -- impronta del file scaricato
  n_record        integer
);

-- ---------------------------------------------------------------------------
-- Territorio (confini ufficiali Roma Capitale, GeoServer GeoRoma)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS opendata.municipi (
  numero        smallint PRIMARY KEY,              -- 1..15
  numero_romano text NOT NULL,
  nome          text NOT NULL,                     -- "Municipio I"
  geom          geometry(MultiPolygon, 4326) NOT NULL,
  fonte_id      text NOT NULL REFERENCES antenne.fonti(id)
);
CREATE INDEX IF NOT EXISTS municipi_geom_gix ON opendata.municipi USING gist (geom);

-- Rioni, quartieri, suburbi e zone dell'Agro (suddivisione toponomastica)
CREATE TABLE IF NOT EXISTS opendata.suddivisioni_toponomastiche (
  codice      text PRIMARY KEY,                    -- es. 'ZAR44'
  tipologia   text NOT NULL,                       -- Rione, Quartiere, Suburbio, Zona
  nome        text NOT NULL,
  geom        geometry(MultiPolygon, 4326) NOT NULL,
  fonte_id    text NOT NULL REFERENCES antenne.fonti(id)
);
CREATE INDEX IF NOT EXISTS suddivisioni_geom_gix ON opendata.suddivisioni_toponomastiche USING gist (geom);

CREATE TABLE IF NOT EXISTS opendata.zone_urbanistiche (
  codice      text PRIMARY KEY,
  nome        text,
  municipio   smallint,
  geom        geometry(MultiPolygon, 4326) NOT NULL,
  fonte_id    text NOT NULL REFERENCES antenne.fonti(id)
);
CREATE INDEX IF NOT EXISTS zone_urb_geom_gix ON opendata.zone_urbanistiche USING gist (geom);

CREATE TABLE IF NOT EXISTS opendata.limite_comunale (
  id          smallint PRIMARY KEY DEFAULT 1,
  geom        geometry(MultiPolygon, 4326) NOT NULL,
  fonte_id    text NOT NULL REFERENCES antenne.fonti(id)
);
CREATE INDEX IF NOT EXISTS limite_comunale_geom_gix ON opendata.limite_comunale USING gist (geom);

-- ---------------------------------------------------------------------------
-- Istanze di installazione/modifica delle Stazioni Radio Base (unica fonte
-- ufficiale con posizione del singolo impianto). NB: un'istanza non prova che
-- l'impianto sia attivo; non è il catasto completo (ARPA: 3.538 impianti a Roma).
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE antenne.qualita_coordinata AS ENUM (
    'originale',          -- coordinate pubblicate dal Comune, lette senza correzioni
    'corretta',           -- coordinate pubblicate ma con errore di formato corretto in modo deterministico
    'geocodificata',      -- posizione ricavata dall'indirizzo (OpenStreetMap/Nominatim)
    'assente'             -- nessuna posizione affidabile
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS antenne.istanze_srb (
  id                  bigserial PRIMARY KEY,
  chiave              text NOT NULL UNIQUE,         -- deduplica: fonte + protocollo/indirizzo
  fonte_id            text NOT NULL REFERENCES antenne.fonti(id),
  url_avviso          text,                         -- pagina o PDF del Comune
  data_pubblicazione  date,
  protocollo          text,
  municipio_fonte     text,                         -- municipio dichiarato dalla fonte
  codice_sito         text,                         -- codice impianto dell'operatore
  nome_sito           text,
  indirizzo           text,
  catasto             text,                         -- foglio / particella, se presenti
  gestori             text[] NOT NULL DEFAULT '{}', -- operatori e tower company
  tipo_intervento     text,                         -- installazione, modifica, adeguamento...
  regime              text,                         -- es. SCIA bassa potenza, istanza art. 44
  lat_testo           text,                         -- coordinate così come pubblicate
  lon_testo           text,
  qualita             antenne.qualita_coordinata NOT NULL,
  nota_qualita        text,
  geom                geometry(Point, 4326),
  scarto_geocoding_m  double precision,             -- distanza tra coordinate pubblicate e indirizzo geocodificato
  municipio           smallint REFERENCES opendata.municipi(numero),
  suddivisione        text REFERENCES opendata.suddivisioni_toponomastiche(codice),
  ufficiale           boolean NOT NULL DEFAULT true,
  importato_il        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS istanze_srb_geom_gix ON antenne.istanze_srb USING gist (geom);
CREATE INDEX IF NOT EXISTS istanze_srb_municipio_ix ON antenne.istanze_srb (municipio);

-- ---------------------------------------------------------------------------
-- Siti sensibili (art. 4 DAC 78/2024: ospedali, case di cura, RSA, asili nido,
-- scuole, parchi gioco, carceri...). L'Allegato A ufficiale non è pubblicato in
-- formato vettoriale: qui usiamo i layer ufficiali GeoRoma + integrazione OSM.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS antenne.siti_sensibili (
  id            bigserial PRIMARY KEY,
  chiave        text NOT NULL UNIQUE,
  categoria     text NOT NULL,                     -- ospedale, sanitario_assistenziale, asilo_nido, scuola_infanzia, scuola, parco, parco_giochi, carcere, rsa
  nome          text,
  indirizzo     text,
  dettagli      jsonb NOT NULL DEFAULT '{}',
  geom          geometry(Geometry, 4326) NOT NULL, -- punto o poligono
  ufficiale     boolean NOT NULL,
  fonte_id      text NOT NULL REFERENCES antenne.fonti(id),
  municipio     smallint REFERENCES opendata.municipi(numero)
);
CREATE INDEX IF NOT EXISTS siti_sensibili_geom_gix ON antenne.siti_sensibili USING gist (geom);
CREATE INDEX IF NOT EXISTS siti_sensibili_geog_gix ON antenne.siti_sensibili USING gist ((geom::geography));
CREATE INDEX IF NOT EXISTS siti_sensibili_cat_ix ON antenne.siti_sensibili (categoria);

-- Aree dove il regolamento vieta o limita le installazioni (vincoli)
CREATE TABLE IF NOT EXISTS antenne.aree_vincolate (
  id          bigserial PRIMARY KEY,
  chiave      text NOT NULL UNIQUE,
  tipo        text NOT NULL,                       -- sito_unesco, area_protetta
  nome        text,
  dettagli    jsonb NOT NULL DEFAULT '{}',
  geom        geometry(MultiPolygon, 4326) NOT NULL,
  fonte_id    text NOT NULL REFERENCES antenne.fonti(id)
);
CREATE INDEX IF NOT EXISTS aree_vincolate_geom_gix ON antenne.aree_vincolate USING gist (geom);

-- ---------------------------------------------------------------------------
-- Misure e punti di monitoraggio CEM
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS antenne.punti_monitoraggio (
  id          text PRIMARY KEY,
  nome        text NOT NULL,
  gestore     text NOT NULL,                       -- ARPA Lazio
  descrizione text,
  attivo_dal  date,
  ultimo_dato date,
  geom        geometry(Point, 4326) NOT NULL,
  fonte_id    text NOT NULL REFERENCES antenne.fonti(id)
);

CREATE TABLE IF NOT EXISTS antenne.misure_cem (
  id            bigserial PRIMARY KEY,
  punto_id      text NOT NULL REFERENCES antenne.punti_monitoraggio(id),
  periodo_inizio date NOT NULL,
  periodo_fine   date NOT NULL,
  campo_e_vm    numeric,                           -- campo elettrico in V/m (NULL se il report è solo grafico)
  metodo        text,                              -- es. media 24 h, media mensile
  url_report    text NOT NULL,
  note          text,
  UNIQUE (punto_id, periodo_inizio)
);

-- ---------------------------------------------------------------------------
-- Statistiche ufficiali aggregate (ARPA Lazio / ISPRA)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS antenne.statistiche (
  id            bigserial PRIMARY KEY,
  indicatore    text NOT NULL,                     -- impianti_srb, siti_srb, pareri_alta_frequenza, esposti_evasi
  ambito        text NOT NULL,                     -- comune:Roma, provincia:Roma, regione:Lazio
  anno          smallint,
  valore        numeric NOT NULL,
  unita         text,
  fonte_id      text NOT NULL REFERENCES antenne.fonti(id),
  note          text,
  UNIQUE (indicatore, ambito, anno, fonte_id)
);

-- ---------------------------------------------------------------------------
-- Riferimenti normativi da mostrare ai cittadini
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS antenne.limiti_normativi (
  id            text PRIMARY KEY,
  grandezza     text NOT NULL,                     -- campo elettrico
  valore        numeric NOT NULL,
  unita         text NOT NULL,
  ambito        text NOT NULL,                     -- dove/come si applica
  stato         text NOT NULL,                     -- vigente, vigente_provvisorio, storico
  riferimento   text NOT NULL,
  url           text,
  spiegazione   text NOT NULL
);

CREATE TABLE IF NOT EXISTS antenne.riferimenti_normativi (
  id            text PRIMARY KEY,
  livello       text NOT NULL,                     -- nazionale, regionale, comunale
  titolo        text NOT NULL,
  sintesi       text NOT NULL,
  url           text
);

-- ---------------------------------------------------------------------------
-- Viste pronte per la mappa e per il pannello di contesto
-- ---------------------------------------------------------------------------

-- Istanze con municipio, quartiere e sito sensibile più vicino
CREATE OR REPLACE VIEW antenne.v_istanze AS
SELECT
  i.*,
  m.nome            AS municipio_nome,
  s.nome            AS suddivisione_nome,
  s.tipologia       AS suddivisione_tipo,
  vicino.categoria  AS sensibile_categoria,
  vicino.nome       AS sensibile_nome,
  vicino.distanza_m AS sensibile_distanza_m
FROM antenne.istanze_srb i
LEFT JOIN opendata.municipi m ON m.numero = i.municipio
LEFT JOIN opendata.suddivisioni_toponomastiche s ON s.codice = i.suddivisione
LEFT JOIN LATERAL (
  SELECT ss.categoria, ss.nome,
         round(ST_Distance(ss.geom::geography, i.geom::geography)::numeric, 0) AS distanza_m
  FROM antenne.siti_sensibili ss
  WHERE i.geom IS NOT NULL
  ORDER BY ss.geom <-> i.geom
  LIMIT 1
) vicino ON true;

-- Riepilogo per municipio (per il pannello di contesto)
CREATE OR REPLACE VIEW antenne.v_riepilogo_municipi AS
SELECT
  m.numero, m.numero_romano, m.nome,
  count(DISTINCT i.id) FILTER (WHERE i.geom IS NOT NULL)                         AS istanze_in_mappa,
  count(DISTINCT i.id) FILTER (WHERE i.tipo_intervento ILIKE '%install%')         AS istanze_nuove_installazioni,
  (SELECT count(*) FROM antenne.siti_sensibili ss WHERE ss.municipio = m.numero)  AS siti_sensibili,
  round((ST_Area(m.geom::geography) / 1e6)::numeric, 1)                          AS area_kmq
FROM opendata.municipi m
LEFT JOIN antenne.istanze_srb i ON i.municipio = m.numero
GROUP BY m.numero, m.numero_romano, m.nome, m.geom;

-- Permessi: il ruolo applicativo legge e scrive
GRANT USAGE ON SCHEMA antenne TO romarouter;
GRANT ALL ON ALL TABLES IN SCHEMA antenne TO romarouter;
GRANT ALL ON ALL SEQUENCES IN SCHEMA antenne TO romarouter;
