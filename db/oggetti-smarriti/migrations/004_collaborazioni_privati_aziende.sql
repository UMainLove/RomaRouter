-- Collaborazioni su richiesta a parte al Comune / Municipio:
-- distingue privati residenti e aziende/attività convenzionate che si impegnano a contribuire.

ALTER TABLE smarriti.custodi
  ADD COLUMN IF NOT EXISTS municipio text,
  ADD COLUMN IF NOT EXISTS tipo_soggetto text CHECK (tipo_soggetto IN ('privato', 'azienda')),
  ADD COLUMN IF NOT EXISTS ragione_sociale text,
  ADD COLUMN IF NOT EXISTS partita_iva text,
  ADD COLUMN IF NOT EXISTS indirizzo_sede text,
  ADD COLUMN IF NOT EXISTS impegno_accettato boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS impegno_testo text;

UPDATE smarriti.custodi
SET tipo_soggetto = CASE
      WHEN ruolo = 'volontario' THEN 'privato'
      ELSE 'azienda'
    END,
    municipio = COALESCE(municipio, 'Roma Capitale')
WHERE tipo_soggetto IS NULL AND ruolo IN ('volontario', 'guardia_giurata', 'punto_h24');
