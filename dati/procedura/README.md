# Art Spot – procedura per prenotare uno spot (studio del 13/11/2026)

Materiale NON ufficiale. Art Spot prepara bozze, l'artista firma e invia dai propri recapiti.

| File | Contenuto |
|---|---|
| `workflow.json` | Specifica eseguibile: campi, validazioni, instradamento destinatari, passi, stati e transizioni, timer, matrice di automazione, limiti legali, regime futuro (bozza RC/33675/2025) |
| `01_email_iscrizione_registro.md` | Email di accompagnamento al modulo di iscrizione al Registro |
| `02_richiesta_postazione_allegatoB_ufficio_capitolino.md` | Richiesta postazione Allegato B (art. 8) |
| `03_richiesta_postazione_municipio.md` | Richiesta postazione/orario al Municipio (art. 8) |
| `04_preavviso_polizia_locale.md` | Preavviso al Gruppo PL con protocollo, almeno 3 giorni prima (art. 10) |
| `05_richiesta_spazio_nullaosta_alto_impatto.md` | Spettacoli ad alto impatto (art. 1) |
| `flowchart.mmd` | Diagramma Mermaid del processo |
| `checklist.md` | Checklist per l'artista |

Segnaposto in stile Mustache: `{{campo}}`, sezioni `{{#campo}}…{{/campo}}`, `{{^campo}}` = se assente; `| join(", ")` = unisci lista.
I destinatari si ricavano da `../contacts_municipi.csv` (PEC Municipi e Gruppi PL) e dalle regole `routing` di `workflow.json`.
Fonti scaricate: `../fonti/` (vedi `../fonti/INDEX.csv`, articoli di stampa in `../fonti/stampa/`).
