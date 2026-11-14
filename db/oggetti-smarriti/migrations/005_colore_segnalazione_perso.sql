-- Colore opzionale sulla segnalazione protetta "Ho perso" per migliorare il matching lato server
ALTER TABLE smarriti.segnalazioni_perso
  ADD COLUMN IF NOT EXISTS colore text;
