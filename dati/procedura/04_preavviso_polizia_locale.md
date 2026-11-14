<!--
MODELLO NON UFFICIALE – Art Spot.
Base: art. 10 DAC 24/2012: "la comunicazione da parte dell'artista di strada della volontà di utilizzo della postazione,
dovrà essere inviata al Gruppo della Polizia di Roma Capitale competente per territorio con protocollo di ricezione
[...] con almeno tre giorni di anticipo rispetto all'esibizione. Pari comunicazione dovrà essere inviata anche per le altre
strade e piazze con le stesse modalità".
- Destinatario: PEC del Gruppo PL competente (contacts_municipi.csv). Gruppo I Centro: protocollo.polizialocale.01trevi@pec.comune.roma.it
  (fonti/Roma_PL_Gruppo_I_Centro_contatti_UFF20018.html).
- Il regolamento NON prevede un modulo ufficiale: contenuto minimo = chi, dove (postazione), quando (data e ora), cosa.
- Serve il NUMERO DI PROTOCOLLO in risposta: conservarlo e portarlo con sé durante l'esibizione.
- Secondo testimonianze di artisti (Buskers in Rome, 2018) la ricevuta riporta "La presente comunicazione non costituisce titolo
  autorizzativo"; nel 2025 il Gruppo I non avrebbe accettato comunicazioni per il Centro Storico se non per l'Allegato B (non verificato su atti).
- Inviare dalla PEC dell'artista (domicilio digitale, art. 65 c.1 lett. c-bis CAD) oppure email con copia documento firmata (lett. c).
-->

**A (PEC):** {{pl.pec}}
**Oggetto:** Comunicazione preventiva esibizione arte di strada (art. 10 DAC 24/2012) – {{luogo_esibizione.nome}} – {{esibizione.data}} {{esibizione.ora_inizio}}

Spett.le Polizia Locale di Roma Capitale
Gruppo {{pl.gruppo}} – {{pl.indirizzo}}

Il/La sottoscritto/a {{artista.nome}} {{artista.cognome}}, nato/a a {{artista.luogo_nascita}} il {{artista.data_nascita}}, C.F. {{artista.codice_fiscale}}, iscritto/a al Registro degli artisti di strada di Roma Capitale {{#registro.estremi}}({{registro.estremi}}){{/registro.estremi}}, tel. {{artista.telefono}}, e-mail {{artista.email}}{{#artista.pec}}, PEC {{artista.pec}}{{/artista.pec}},

COMUNICA

ai sensi dell'art. 10 del Regolamento per l'Arte di Strada (DAC n. 24/2012), con almeno tre giorni di anticipo, la volontà di utilizzare la seguente postazione:

- Luogo / postazione: {{luogo_esibizione.nome}}{{#postazione.scheda}} – Allegato B, scheda {{postazione.scheda}}, postazione {{postazione.numero}}{{/postazione.scheda}}, Municipio {{municipio.numero}}
- Data: {{esibizione.data}}
- Orario: dalle {{esibizione.ora_inizio}} alle {{esibizione.ora_fine}}
- Figura artistica / modalità: {{esibizione.figura}} – {{esibizione.modalita}}
- Numero artisti: {{esibizione.numero_artisti}}{{#esibizione.componenti}} ({{esibizione.componenti | join(", ")}}){{/esibizione.componenti}}
- Strumenti e attrezzatura: {{esibizione.attrezzatura}}{{#esibizione.amplificazione}}; amplificazione: {{esibizione.amplificazione_descrizione}}{{/esibizione.amplificazione}}
{{#ricevuta.estremi}}- Ricevuta di assegnazione: {{ricevuta.ente}}, prot. {{ricevuta.estremi}} del {{ricevuta.data}}{{/ricevuta.estremi}}

Chiede il rilascio del numero di protocollo di ricezione.

Allega copia del documento di identità{{#ricevuta.file}} e copia della ricevuta di assegnazione{{/ricevuta.file}}.

{{luogo}}, {{data_invio}}

{{artista.nome}} {{artista.cognome}}
