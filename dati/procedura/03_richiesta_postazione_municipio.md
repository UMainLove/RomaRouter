<!--
MODELLO NON UFFICIALE – Art Spot.
Base: art. 8 DAC 24/2012 – per i luoghi NON in Allegato B la richiesta va ai "competenti Uffici Municipali"
che rilasciano "ricevuta con l'indicazione della postazione e dell'orario assegnato".
Destinatario: PEC protocollo del Municipio (contacts_municipi.csv). Per il Municipio I l'ufficio indicato in rubrica è
"Ufficio Sport, Cultura e Promozione Turistica – servizio Occupazione Suolo Pubblico Cultura", Via Petroselli 50,
municipio01.cultura@comune.roma.it, tel. 06 69601454 (fonti/Roma_Mun_I_rubrica_Ufficio_Cultura_OSP.html).
Per gli altri Municipi l'ufficio cultura è DA CHIEDERE. Verificare prima che il luogo non sia vietato (bans.csv).
Municipio X: solo le 12 aree dell'art. 4 DAC 24/2012.
-->

**A (PEC):** {{municipio.pec}}
**Cc:** {{municipio.email_cultura}}
**Oggetto:** Arte di strada – richiesta assegnazione postazione e orario (art. 8 DAC 24/2012) – {{luogo_esibizione.nome}} – {{esibizione.data}}

Spett.le Municipio Roma {{municipio.numero}}
{{municipio.ufficio}}

Il/La sottoscritto/a {{artista.nome}} {{artista.cognome}}, C.F. {{artista.codice_fiscale}}, iscritto/a al Registro degli artisti di strada di Roma Capitale {{#registro.estremi}}({{registro.estremi}}){{/registro.estremi}}, recapiti: tel. {{artista.telefono}}, e-mail {{artista.email}}{{#artista.pec}}, PEC {{artista.pec}}{{/artista.pec}},

CHIEDE

ai sensi dell'art. 8 del Regolamento per l'Arte di Strada (DAC n. 24/2012), il rilascio di ricevuta con l'indicazione della postazione e dell'orario assegnati per la seguente esibizione:

- Luogo: {{luogo_esibizione.nome}}, {{luogo_esibizione.indirizzo}} (coordinate {{luogo_esibizione.lat}}, {{luogo_esibizione.lon}}) – Municipio {{municipio.numero}}
- Posizione proposta: {{luogo_esibizione.descrizione_posizione}} (marciapiede con passaggio libero ≥ 2 m; ≥ 10 m da monumenti; non su sagrati)
- Data: {{esibizione.data}}
- Orario: {{esibizione.ora_inizio}}–{{esibizione.ora_fine}} (fascia {{esibizione.fascia}}; max 2 ore per fascia, un solo luogo per sito – art. 4 e 6)
- Figura artistica e modalità: {{esibizione.figura}} – {{esibizione.modalita}}
- Numero artisti: {{esibizione.numero_artisti}}{{#esibizione.componenti}} ({{esibizione.componenti | join(", ")}}){{/esibizione.componenti}}
- Attrezzatura (max 1 m² per artista): {{esibizione.attrezzatura}}
- Emissioni sonore: {{esibizione.emissioni_sonore}}{{#esibizione.amplificazione}}; amplificazione: {{esibizione.amplificazione_descrizione}}{{/esibizione.amplificazione}}

DICHIARA di rispettare gli artt. 2, 4, 5, 6, 7 e 9 e l'Allegato A del Regolamento, in particolare: niente suono vicino a luoghi di culto aperti (e mai entro 10 m dal sagrato), a scuole in orario di lezione, a ospedali e a beni artistici, né in vie larghe meno di 5 m.

Comunica che invierà il preavviso al Gruppo di Polizia Locale {{pl.gruppo}} con almeno tre giorni di anticipo (art. 10).

Allega copia del documento di identità.

{{luogo}}, {{data_invio}}

{{artista.nome}} {{artista.cognome}}
