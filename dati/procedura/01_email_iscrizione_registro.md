<!--
MODELLO NON UFFICIALE – preparato da Art Spot sulla base della scheda servizio di Roma Capitale
(https://www.comune.roma.it/web/it/scheda-servizi.page?contentId=INF39339&pagina=3) e del modulo ufficiale
(https://www.comune.roma.it/web-resources/cms/documents/MODULO_ARTISTI_DI_STRADA.pdf).
Il documento che conta è il MODULO UFFICIALE compilato e FIRMATO dall'artista. Questa email lo accompagna soltanto.
Va inviata dall'indirizzo email (o PEC) dell'artista, non da Art Spot.
-->

**A:** artistidistrada.cultura@comune.roma.it
**Cc (facoltativo):** {{artista.email}}
**Oggetto:** Richiesta annotazione nel Registro degli artisti di strada – {{artista.cognome}} {{artista.nome}}

Spett.le Roma Capitale
Dipartimento Attività Culturali
Ufficio attività connessa all'esercizio di arti figurative, di strada, circensi e di spettacolo viaggiante
Piazza di Campitelli 7 – 00186 Roma

Il/La sottoscritto/a {{artista.nome}} {{artista.cognome}}, nato/a a {{artista.luogo_nascita}} ({{artista.provincia_nascita}}) il {{artista.data_nascita}}, cittadinanza {{artista.cittadinanza}}, residente a {{artista.comune_residenza}} in {{artista.indirizzo}} n. {{artista.civico}}, CAP {{artista.cap}}, C.F. {{artista.codice_fiscale}}, tel. {{artista.telefono}}, e-mail {{artista.email}}{{#artista.pec}}, PEC {{artista.pec}}{{/artista.pec}},

visto il Regolamento per l'Arte di Strada approvato con Deliberazione dell'Assemblea Capitolina n. 24 del 12 aprile 2012,

CHIEDE

l'annotazione nel Registro degli artisti di strada per la/le seguente/i figura/e artistica/che: {{artista.figure_artistiche | join(", ")}}.

A tal fine allega:
1. modulo "Registro degli artisti di strada" compilato in ogni sua parte e firmato ({{allegati.modulo_firmato_nomefile}});
2. copia leggibile di un documento di identità in corso di validità ({{allegati.documento_tipo}} n. {{allegati.documento_numero}}, scadenza {{allegati.documento_scadenza}}) ({{allegati.documento_nomefile}});
{{#allegati.permesso_soggiorno}}3. copia del titolo di soggiorno ({{allegati.permesso_soggiorno_nomefile}}) – allegato in via cautelativa, non richiesto dalla modulistica vigente;{{/allegati.permesso_soggiorno}}

Dichiara di aver preso visione dell'informativa sul trattamento dei dati personali allegata al modulo.

Chiede cortesemente conferma di ricezione e comunicazione dell'avvenuta annotazione al presente indirizzo.

{{luogo}}, {{data_invio}}

{{artista.nome}} {{artista.cognome}}
(firma autografa sul modulo allegato{{#firma_digitale}} / documento firmato digitalmente{{/firma_digitale}})
