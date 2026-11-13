# Art Spot – layer GeoJSON/CSV (versione verificata 14/11/2026)
Base: studio 13/11/2026. Modifiche di questa versione:
- `divieti.*` (= `../bans.csv`): 28 righe. Atti ufficiali del Municipio I letti dall'archivio delibere di Roma Capitale (Giunta 17/2023, 63/2023, 40/2024, 59/2024, 34/2025, 47/2025, 56/2025, 6/2026, 8/2026, 22/2026, 41/2026; Consiglio 32/2018, 22/2024). Scadenze aggiornate al 31/12/2027 (Giunta 41/2026), tranne Fori Imperiali (31/12/2026). Aggiunte le 4 "vie limitrofe" di San Calisto. Piazza di Pietra: limite di 30 minuti (non divieto). Campi `act`, `valid_to`, `source_url` (PDF ufficiale), `data_verifica`.
- `postazioni_allegatoB.*`: schede rilette (17 aree/18 schede/28 postazioni); nuovo campo `in_ztl_tridente_osm` e `note_2026`. Le coordinate restano stimate (±10–30 m).
- `polizia_locale.*`: PEC e indirizzi da IPA (14/11/2026); aggiunti Gruppo I Prati e Gruppo VIII Tintoretto.
- `arti_figurative_aree_2026.*` (NUOVO): 117 aree e 252 postazioni dall'All.2 dell'avviso Zètema A00132 (DGC 154/2026). 110 geocodificate per AREA (non per postazione); `arti_figurative_aree_2026_TUTTE.csv` contiene tutte e 117, con lo stato della geocodifica.
- `arti_figurative_aree_2018.*`: marcato STORICO (concessioni prorogate al 28/02/2027).
- Gli altri layer di contesto OSM/open data sono invariati e non normativi.
`verification_status` inizia con VERIFICATO / PARZIALE / NESSUN ATTO / STORICO.
