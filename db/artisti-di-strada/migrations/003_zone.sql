-- 003_zone: la mappa degli artisti divisa in poligoni.
-- artisti.ricalcola_zone() ricostruisce artisti.zone da divieti, postazioni, contesto e municipi.
-- Si richiama dopo ogni import (scripts/artisti/import.mts). Le distanze dei "pressi" che il
-- regolamento non quantifica sono stime dichiarate (approssimata = true).
--
-- Attivita' usate in vale_per: musica (esibizioni sonore), silenziosa, fuoco, figurativa, esoterica.

CREATE OR REPLACE FUNCTION artisti.buffer_m(g geometry, metri double precision)
RETURNS geometry LANGUAGE sql IMMUTABLE AS $$
  SELECT ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Buffer(g::geography, metri)::geometry), 3))
$$;

CREATE OR REPLACE FUNCTION artisti.ricalcola_zone()
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  DELETE FROM artisti.zone;

  -- 1. Divieti delle delibere e della stampa. Le vie (linee) diventano fasce: 25 m per i divieti
  --    totali (viali larghi come Fori Imperiali e via del Corso), 10 m per i divieti di suono (vicoli).
  INSERT INTO artisti.zone (esito, categoria, nome, motivo, condizione, vale_per, riferimento, fonte_url, verifica, ufficiale, approssimata, priorita, origine, geom)
  SELECT
    CASE d.tipo WHEN 'divieto_tutte_esibizioni' THEN 'no' WHEN 'divieto_suono' THEN 'solo_silenzio' ELSE 'info' END,
    CASE WHEN d.tipo = 'divieto_richiesto' THEN 'richiesta' ELSE 'divieto' END,
    d.nome,
    CASE d.tipo
      WHEN 'divieto_tutte_esibizioni' THEN 'Qui è vietata qualsiasi esibizione di arte di strada, anche silenziosa.'
      WHEN 'divieto_suono' THEN 'Luogo non idoneo alle esibizioni musicali o rumorose: sono ammesse solo esibizioni silenziose.'
      ELSE 'Il Municipio ha chiesto di vietare le esibizioni qui, ma il divieto non è in vigore.'
    END,
    NULLIF(concat_ws(' · ', NULLIF(d.fasce_testo, ''), CASE WHEN d.valido_fino IS NOT NULL AND d.valido_fino <> '' THEN 'valido ' || d.valido_fino END), ''),
    CASE d.tipo WHEN 'divieto_suono' THEN ARRAY['musica', 'fuoco'] ELSE '{}' END,
    d.atto, d.fonte_url, d.verifica, d.ufficiale,
    GeometryType(d.geom) NOT LIKE '%POLYGON%' OR d.verifica ILIKE '%stimat%' OR d.nota_posizione ILIKE '%potrebbe%',
    CASE d.tipo WHEN 'divieto_tutte_esibizioni' THEN 100 WHEN 'divieto_suono' THEN 80 ELSE 10 END,
    'divieti:' || d.chiave,
    CASE WHEN GeometryType(d.geom) LIKE '%POLYGON%'
         THEN ST_Multi(ST_CollectionExtract(ST_MakeValid(d.geom), 3))
         ELSE artisti.buffer_m(d.geom, CASE d.tipo WHEN 'divieto_tutte_esibizioni' THEN 25 ELSE 10 END) END
  FROM artisti.divieti d;

  -- 2. Municipio X (ex XIII): solo nelle 12 aree consentite (art. 4 DAC 24/2012)
  INSERT INTO artisti.zone (esito, categoria, nome, motivo, condizione, vale_per, riferimento, fonte_url, verifica, ufficiale, approssimata, priorita, origine, geom)
  SELECT 'no', 'municipio_x', 'Municipio X fuori dalle aree consentite',
    'Nel Municipio X (ex XIII: Ostia, Acilia, Infernetto…) ci si può esibire solo nelle 12 aree consentite dal regolamento.',
    NULL, '{}', 'DAC 24/2012, art. 4', NULL, 'ufficiale', true, true, 90, 'municipi:10',
    ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Difference(m.geom, COALESCE(
      (SELECT ST_Union(artisti.buffer_m(p.geom, 80)) FROM artisti.postazioni p WHERE p.tipo = 'area_consentita'),
      'GEOMETRYCOLLECTION EMPTY'::geometry))), 3))
  FROM artisti.municipi m WHERE m.numero = 10;

  INSERT INTO artisti.zone (esito, categoria, nome, motivo, condizione, vale_per, riferimento, fonte_url, verifica, ufficiale, approssimata, priorita, origine, geom)
  SELECT 'area_dedicata', 'area_consentita', p.nome,
    'Una delle 12 aree del Municipio X dove il regolamento consente le esibizioni.',
    p.fasce_testo, '{}', 'DAC 24/2012, art. 4', p.fonte_url, p.verifica, true, true, 30,
    'postazioni:' || p.chiave, artisti.buffer_m(p.geom, 80)
  FROM artisti.postazioni p WHERE p.tipo = 'area_consentita';

  -- 3. Siti dell'Allegato B: ci si esibisce solo nelle postazioni numerate (raggio indicato in scheda).
  --    Il sito = inviluppo delle postazioni della scheda + 60 m, per coprire tutta la piazza (es. Navona).
  INSERT INTO artisti.zone (esito, categoria, nome, motivo, condizione, vale_per, riferimento, fonte_url, verifica, ufficiale, approssimata, priorita, origine, geom)
  SELECT 'solo_postazioni', 'allegato_b',
    regexp_replace(min(p.nome), '\s*[–-]\s*scheda.*$', ''),
    'Sito dell''Allegato B: ci si esibisce solo nelle postazioni numerate, senza amplificazione né strumenti elettrici o a batteria, al massimo 2 ore per fascia oraria.',
    min(p.fasce_testo), '{}', 'DAC 24/2012, art. 4 e Allegato B, scheda ' || p.scheda, min(p.fonte_url),
    min(p.verifica), true, true, 70, 'postazioni:allegatoB-scheda-' || p.scheda,
    artisti.buffer_m(ST_ConvexHull(ST_Collect(p.geom)), 60)
  FROM artisti.postazioni p WHERE p.tipo = 'postazione_allegatoB'
  GROUP BY p.scheda;

  -- 4. Art. 2 e Allegato A: i "pressi" di luoghi di culto, scuole, ospedali e monumenti
  INSERT INTO artisti.zone (esito, categoria, nome, motivo, condizione, vale_per, riferimento, fonte_url, verifica, ufficiale, approssimata, priorita, origine, geom)
  SELECT 'condizioni', 'culto', COALESCE(c.nome, 'Luogo di culto'),
    'Vicino a un luogo di culto: niente esibizioni sonore mentre è aperto, e comunque entro 10 m dal sagrato.',
    'durante l''apertura del luogo di culto', ARRAY['musica', 'fuoco'], 'DAC 24/2012, art. 2', NULL,
    'regola ufficiale; luogo da OpenStreetMap (solo centro storico)', true, true, 40, 'contesto:' || c.chiave, artisti.buffer_m(c.geom, 15)
  FROM artisti.contesto c WHERE c.layer = 'luoghi_culto';

  INSERT INTO artisti.zone (esito, categoria, nome, motivo, condizione, vale_per, riferimento, fonte_url, verifica, ufficiale, approssimata, priorita, origine, geom)
  SELECT 'condizioni', 'scuola', COALESCE(c.nome, 'Scuola'),
    'Vicino a una scuola: niente esibizioni sonore in orario di lezione.',
    'in orario di lezione', ARRAY['musica', 'fuoco'], 'DAC 24/2012, art. 2', NULL,
    'regola ufficiale; distanza stimata (il regolamento dice «presso»)', true, true, 45, 'contesto:' || c.chiave, artisti.buffer_m(c.geom, 30)
  FROM artisti.contesto c WHERE c.layer = 'scuole';

  INSERT INTO artisti.zone (esito, categoria, nome, motivo, condizione, vale_per, riferimento, fonte_url, verifica, ufficiale, approssimata, priorita, origine, geom)
  SELECT 'condizioni', 'ospedale', COALESCE(c.nome, 'Ospedale'),
    'Vicino a un ospedale: niente esibizioni sonore.',
    'sempre', ARRAY['musica', 'fuoco'], 'DAC 24/2012, art. 2', NULL,
    'regola ufficiale; distanza stimata (il regolamento dice «presso»)', true, true, 50, 'contesto:' || c.chiave, artisti.buffer_m(c.geom, 50)
  FROM artisti.contesto c WHERE c.layer = 'ospedali';

  INSERT INTO artisti.zone (esito, categoria, nome, motivo, condizione, vale_per, riferimento, fonte_url, verifica, ufficiale, approssimata, priorita, origine, geom)
  SELECT 'condizioni', 'monumento', COALESCE(c.nome, 'Monumento'),
    'Vicino a un monumento: restare ad almeno 10 metri.',
    'a meno di 10 m dal monumento', '{}', 'DAC 24/2012, Allegato A', NULL,
    'regola ufficiale; monumento da OpenStreetMap', true, true, 35, 'contesto:' || c.chiave, artisti.buffer_m(c.geom, 10)
  FROM artisti.contesto c WHERE c.layer = 'attrazioni' AND c.tipo IN ('storico_monument', 'storico_memorial', 'storico_fountain', 'artwork');

  -- 5. Aree dedicate: cartomanti ed esoterici (art. 13), arti figurative (avviso, DAC 304/2025)
  INSERT INTO artisti.zone (esito, categoria, nome, motivo, condizione, vale_per, riferimento, fonte_url, verifica, ufficiale, approssimata, priorita, origine, geom)
  SELECT 'area_dedicata', 'esoterici', p.nome,
    'Area dove il regolamento ammette cartomanti e attività esoteriche.',
    COALESCE(p.fasce_testo, '16–20 e 20–24'), ARRAY['esoterica'], 'DAC 24/2012, art. 13', p.fonte_url, p.verifica, true, true, 30,
    'postazioni:' || p.chiave, artisti.buffer_m(p.geom, 25)
  FROM artisti.postazioni p WHERE p.tipo = 'area_esoterici';

  INSERT INTO artisti.zone (esito, categoria, nome, motivo, condizione, vale_per, riferimento, fonte_url, verifica, ufficiale, approssimata, priorita, origine, geom)
  SELECT 'area_dedicata', 'arti_figurative', p.nome,
    'Area per pittori, ritrattisti e caricaturisti: i posti si assegnano con l''avviso pubblico delle arti figurative.',
    'solo con assegnazione del posto', ARRAY['figurativa'], 'DAC 304/2025 (elenco aree 2018)', p.fonte_url, p.verifica, true, true, 30,
    'postazioni:' || p.chiave, artisti.buffer_m(p.geom, 20)
  FROM artisti.postazioni p WHERE p.tipo = 'arti_figurative_area';

  SELECT count(*) INTO n FROM artisti.zone;
  RETURN n;
END $$;

-- Tutte le zone che toccano un punto, dalla piu' restrittiva
CREATE OR REPLACE FUNCTION artisti.zone_nel_punto(lon double precision, lat double precision)
RETURNS SETOF artisti.zone LANGUAGE sql STABLE AS $$
  SELECT z.* FROM artisti.zone z
  WHERE ST_Intersects(z.geom, ST_SetSRID(ST_MakePoint(lon, lat), 4326))
  ORDER BY z.priorita DESC, z.ufficiale DESC
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA artisti TO romarouter;
