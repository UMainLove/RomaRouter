# Art Spot – layer GeoJSON/CSV (studio 13/11/2026)
Ogni file `*.geojson` (EPSG:4326) ha un gemello `*.csv` (lat/lon del punto rappresentativo + WKT per linee/poligoni).
Campi comuni: `id, layer, municipio (I–XV, confini delibera 150/2026 da urbe-hub, assegnato con point-in-polygon), name, type, rules, time_slots, source, source_url, verification_status, coord_note`.
Campi extra: Allegato B `scheda, radius_m, area`; divieti `act, valid_to`; arti figurative `localizzazioni, codice_area, municipio_elenco_2018`; OSM `osm_id, wikidata`; PL `indirizzo, pec`.
`verification_status`: "ufficiale" = da atto ufficiale scaricato; "da verificare" = solo stampa/fonti non ufficiali; "dato OSM (non normativo)" = contesto.
`coord_note`: dice SEMPRE se la posizione è stimata (Allegato B: centroide + scostamento a vista dalla planimetria, ±10–30 m; geocodifiche Nominatim).
`_tutti_i_layer.geojson` = tutti i layer insieme. Licenze: dati OSM © OpenStreetMap contributors (ODbL); scuole IODL 2.0.
Limiti: luoghi_culto solo centro storico (bbox 41.86–41.93 / 12.44–12.52); nightlife = bar/pub/discoteche OSM (incompleto); arti figurative = elenco 2018 (65 aree, 63 geocodificate: mancano 3.f Espero e 4.g Via Tiburtina Shopping Center); l'elenco 2026 da 254 postazioni non è stato scaricato.
