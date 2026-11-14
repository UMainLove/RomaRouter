<!--
MODELLO NON UFFICIALE – Art Spot.
Base giuridica: art. 4, 6 e 8 della DAC 24/2012 (fonti/DAC_24_2012_Regolamento_arte_di_strada_con_AllegatoB.pdf):
"La richiesta va comunque presentata al competente Ufficio dell'Amministrazione Capitolina per i siti di cui all'allegato B
[...] che rilasceranno ricevuta con l'indicazione della postazione e dell'orario assegnato".
NON VERIFICATO: il regolamento non nomina l'ufficio capitolino competente. Si usa l'Ufficio arti di strada del
Dipartimento Attività Culturali (PEC protocollo.cultura@pec.comune.roma.it, fonte UFF215869) in attesa di conferma telefonica
(06 67102356). In pratica (Buskers in Rome 2025) per l'Allegato B gli artisti si rivolgono alla Polizia Locale Gruppo I:
mandare SEMPRE anche il preavviso 04 alla Polizia Locale.
Inviare dalla PEC dell'artista (o email + modulo firmato + documento).
-->

**A (PEC):** protocollo.cultura@pec.comune.roma.it
**Cc:** artistidistrada.cultura@comune.roma.it
**Oggetto:** Arte di strada – richiesta postazione Allegato B DAC 24/2012 – {{postazione.nome}} (scheda {{postazione.scheda}}, postazione {{postazione.numero}}) – {{esibizione.data}}

Spett.le Roma Capitale – Dipartimento Attività Culturali
Ufficio attività connessa all'esercizio di arti figurative, di strada, circensi e di spettacolo viaggiante

Il/La sottoscritto/a {{artista.nome}} {{artista.cognome}}, C.F. {{artista.codice_fiscale}}, iscritto/a al Registro degli artisti di strada {{#registro.estremi}}({{registro.estremi}}){{/registro.estremi}}{{^registro.estremi}}(richiesta di iscrizione inviata il {{registro.data_invio}}){{/registro.estremi}}, recapiti: tel. {{artista.telefono}}, e-mail {{artista.email}}{{#artista.pec}}, PEC {{artista.pec}}{{/artista.pec}},

ai sensi degli artt. 4, 6 e 8 del Regolamento per l'Arte di Strada (DAC n. 24/2012),

CHIEDE

l'assegnazione della seguente postazione dell'Allegato B, con rilascio di ricevuta indicante postazione e orario assegnati:

- Sito / scheda: {{postazione.nome}} – scheda n. {{postazione.scheda}}, postazione n. {{postazione.numero}} (raggio scenico {{postazione.raggio_m}} m)
- Data: {{esibizione.data}}
- Fascia oraria: {{esibizione.fascia}} ({{esibizione.ora_inizio}}–{{esibizione.ora_fine}}, max 2 ore per fascia)
- Figura artistica: {{esibizione.figura}}
- Modalità: {{esibizione.modalita}} (a cerchio / a passaggio / posteggiatore)
- Numero artisti: {{esibizione.numero_artisti}}{{#esibizione.componenti}} – componenti: {{esibizione.componenti | join(", ")}}{{/esibizione.componenti}}
- Strumenti / attrezzature: {{esibizione.attrezzatura}}

DICHIARA

- di non utilizzare attrezzature foniche, amplificatori, diffusori né strumenti alimentati a corrente o a batteria (art. 4 DAC 24/2012);
- di non occupare suolo pubblico con strutture e di restare entro lo spazio scenico della scheda;
- di rispettare la turnazione indicata nella scheda e, in presenza di altri artisti, le durate dell'art. 6 (45 min a cerchio, 1 h 30 a passeggio, 15 min posteggiatori);
- {{#esibizione.fuoco}}di mantenere almeno 5 m di distanza dal pubblico{{#esibizione.piu_di_2_con_fuoco}} e di disporre di teli ignifughi ed estintore{{/esibizione.piu_di_2_con_fuoco}} (art. 5);{{/esibizione.fuoco}}
- di provvedere alla pulizia dello spazio (art. 9).

Allega copia del documento di identità.

{{luogo}}, {{data_invio}}

{{artista.nome}} {{artista.cognome}}
