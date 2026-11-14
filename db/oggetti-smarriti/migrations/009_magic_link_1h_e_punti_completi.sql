-- 009_magic_link_1h_e_punti_completi.sql
-- 1) Estende magic_link, notifiche e segnalazioni_perso con provenienza (italiano / straniero UE / extra UE),
--    tipo_recapito (sms / email / telefono / struttura), nome_struttura e canale 'telefono'.
-- 2) Aggiunge presidi rappresentativi approvati per Guardie Giurate, Privati affiliati, Punti H24 e Misericordie H24
--    in tutte le principali aree di Roma (senza alterare i presidi reali esistenti).

ALTER TABLE smarriti.magic_link
  DROP CONSTRAINT IF EXISTS magic_link_canale_check;
ALTER TABLE smarriti.magic_link
  ADD CONSTRAINT magic_link_canale_check
  CHECK (canale IN ('whatsapp', 'sms', 'email', 'telefono'));

ALTER TABLE smarriti.magic_link
  ADD COLUMN IF NOT EXISTS provenienza text CHECK (provenienza IN ('italiano', 'straniero_ue', 'straniero_extra_ue')),
  ADD COLUMN IF NOT EXISTS tipo_recapito text CHECK (tipo_recapito IN ('sms', 'email', 'telefono', 'struttura')),
  ADD COLUMN IF NOT EXISTS nome_struttura text;

ALTER TABLE smarriti.notifiche
  DROP CONSTRAINT IF EXISTS notifiche_canale_check;
ALTER TABLE smarriti.notifiche
  ADD CONSTRAINT notifiche_canale_check
  CHECK (canale IN ('whatsapp', 'sms', 'email', 'telefono'));

ALTER TABLE smarriti.notifiche
  DROP CONSTRAINT IF EXISTS notifiche_tipo_check;
ALTER TABLE smarriti.notifiche
  ADD CONSTRAINT notifiche_tipo_check
  CHECK (tipo IN ('conferma_perso', 'messaggio_cifrato', 'semaforo_documento', 'passaggio_comando', 'contatto_appuntamento'));

ALTER TABLE smarriti.segnalazioni_perso
  DROP CONSTRAINT IF EXISTS segnalazioni_perso_recapito_canale_check;
ALTER TABLE smarriti.segnalazioni_perso
  ADD CONSTRAINT segnalazioni_perso_recapito_canale_check
  CHECK (recapito_canale IN ('whatsapp', 'sms', 'email', 'telefono'));

-- Misericordie / CRI operative H24 (integrazione esempi presidi H24 sul territorio)
INSERT INTO smarriti.punti_consegna
  (id, nome, tipo, indirizzo, macro_area, h24, lat, lon, orari, telefono, municipio, ente, note, verificato_comune)
VALUES
  (
    'mis-h24-termini',
    'Presidio Misericordia / Soccorso H24 — Termini (esempio)',
    'misericordia',
    'Piazza dei Cinquecento 51, 00185 Roma',
    'termini',
    true,
    41.90165,
    12.50085,
    'Presidio operativo H24 (esempio rete Misericordie)',
    '06 0606',
    'I',
    'Misericordia / Volontariato H24',
    'Presidio dimostrativo aperto 24h su 24 nell''area Stazione Termini per consegna e prima assistenza.',
    true
  ),
  (
    'mis-h24-prati',
    'Presidio Misericordia / CRI H24 — Prati / San Pietro (esempio)',
    'misericordia',
    'Via Crescenzio 42, 00193 Roma',
    'prati',
    true,
    41.90562,
    12.46312,
    'Presidio operativo H24 (esempio rete Misericordie/CRI)',
    '06 0606',
    'I',
    'Misericordia / CRI H24',
    'Presidio dimostrativo aperto 24h su 24 nell''area Prati / Borgo.',
    true
  ),
  (
    'h24-termini-hotel',
    'Punto Amico H24 — Hotel convenzionato Termini (esempio)',
    'punto_h24',
    'Via Cavour 85, 00184 Roma',
    'termini',
    true,
    41.89812,
    12.49794,
    'Reception attiva H24 (esempio partner convenzionato)',
    NULL,
    'I',
    'Struttura ricettiva convenzionata H24',
    'Reception alberghiera convenzionata aperta 24h per custodia temporanea e appuntamenti in sicurezza.',
    true
  ),
  (
    'h24-prati-edicola',
    'Punto Amico H24 — Portineria convenzionata Prati (esempio)',
    'punto_h24',
    'Via Cola di Rienzo 140, 00192 Roma',
    'prati',
    true,
    41.90892,
    12.46584,
    'Attivo H24 (esempio partner convenzionato)',
    NULL,
    'I',
    'Esercizio convenzionato H24',
    'Punto affiliato H24 abilitato alla ricezione di oggetti smarriti nel quadrante Prati.',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- Guardie Giurate e Privati affiliati approvati dal Comune / Municipio nelle principali aree di Roma
INSERT INTO smarriti.custodi
  (rif, ruolo, pseudonimo, macro_area, stato, residente_dal, istituto_vigilanza, conferma_istituto,
   municipio, tipo_soggetto, ragione_sociale, indirizzo_sede, impegno_accettato, impegno_testo, approvato_il)
VALUES
  (
    'demo:guardia-termini',
    'guardia_giurata',
    'Custode G-14',
    'termini',
    'approvato',
    NULL,
    'Istituto Vigilanza Urbe H24 (esempio)',
    true,
    'Municipio I · Centro Storico',
    'azienda',
    'Istituto Vigilanza Urbe H24 (esempio)',
    'Piazza della Repubblica 22, 00185 Roma',
    true,
    'Pattugliamento H24 area Termini/Repubblica con presa in carico e passaggio alle Forze dell''Ordine.',
    now()
  ),
  (
    'demo:guardia-centro',
    'guardia_giurata',
    'Custode G-18',
    'centro',
    'approvato',
    NULL,
    'Corpo Vigili Giurati Centro Storico (esempio)',
    true,
    'Municipio I · Centro Storico',
    'azienda',
    'Corpo Vigili Giurati Centro Storico (esempio)',
    'Via del Corso 184, 00186 Roma',
    true,
    'Servizio di vigilanza H24 nel Centro Storico abilitato al ritiro e custodia protetta.',
    now()
  ),
  (
    'demo:guardia-eur',
    'guardia_giurata',
    'Custode G-23',
    'eur',
    'approvato',
    NULL,
    'Vigilanza Roma Sud GPG H24 (esempio)',
    true,
    'Municipio IX · EUR',
    'azienda',
    'Vigilanza Roma Sud GPG H24 (esempio)',
    'Viale Europa 190, 00144 Roma',
    true,
    'Presidio H24 nel quadrante EUR convenzionato con Roma Capitale.',
    now()
  ),
  (
    'demo:affiliato-centro',
    'volontario',
    'Affiliato P-09',
    'centro',
    'approvato',
    '2012-05-14',
    NULL,
    false,
    'Municipio I · Centro Storico',
    'privato',
    NULL,
    NULL,
    true,
    'Privato affiliato residente dal 2012 che collabora alla custodia protetta nel Centro Storico.',
    now()
  ),
  (
    'demo:affiliato-termini',
    'volontario',
    'Affiliato P-11',
    'termini',
    'approvato',
    '2014-09-01',
    NULL,
    false,
    'Municipio I · Centro Storico',
    'privato',
    NULL,
    NULL,
    true,
    'Privato affiliato residente in zona Esquilino/Termini abilitato alla collaborazione civica.',
    now()
  ),
  (
    'demo:affiliato-prati',
    'volontario',
    'Affiliato P-15',
    'prati',
    'approvato',
    '2011-02-20',
    NULL,
    false,
    'Municipio I · Centro Storico',
    'privato',
    NULL,
    NULL,
    true,
    'Privato affiliato residente a Prati abilitato alla collaborazione con il Comune.',
    now()
  ),
  (
    'demo:affiliato-sangiovanni',
    'volontario',
    'Affiliato P-22',
    'san_giovanni',
    'approvato',
    '2016-04-10',
    NULL,
    false,
    'Municipio VII · Appio / Tuscolano',
    'privato',
    NULL,
    NULL,
    true,
    'Privato affiliato residente a San Giovanni collaboratore del servizio.',
    now()
  ),
  (
    'demo:affiliato-eur',
    'volontario',
    'Affiliato P-28',
    'eur',
    'approvato',
    '2013-11-05',
    NULL,
    false,
    'Municipio IX · EUR',
    'privato',
    NULL,
    NULL,
    true,
    'Privato affiliato residente all''EUR approvato dal Municipio IX.',
    now()
  )
ON CONFLICT (rif) DO NOTHING;
