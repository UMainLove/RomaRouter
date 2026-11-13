<!--
MODELLO NON UFFICIALE – Art Spot. Per spettacoli "con particolare impatto sonoro e scenico" (più di 5 artisti, amplificazione
particolarmente potente o scenografie > 1 m²), art. 1 punto 1 DAC 24/2012: servono "spazi pubblici all'uopo individuati dai
Municipi, a cui dovrà essere inoltrata la specifica richiesta, e nulla-osta rilasciato dai competenti Uffici Capitolini".
NON VERIFICATO: modulistica e tempi specifici per l'arte di strada. Riferimento pratico: Municipio V – OSP per eventi:
PEC + marca da bollo 16 €, invio tra 60 e 45 giorni prima (solo parere PL) o tra 75 e 60 giorni (pareri ambientali/Soprintendenza);
acustica secondo DAC 84/2019 art. 30 (fonti/Roma_Mun_V_Ufficio_Eventi_OSP.html). Se è "spettacolo/intrattenimento" può servire
l'autorizzazione di pubblico spettacolo del Dip. Attività Culturali (diritti istruttoria 60 €, bollo, rilascio entro 60 giorni –
https://www.comune.roma.it/web/it/scheda-servizi.page?contentId=INF38948&pagina=3).
Usare il modulo OSP eventi del Municipio quando esiste; questa lettera lo accompagna.
-->

**A (PEC):** {{municipio.pec}}
**Cc:** protocollo.cultura@pec.comune.roma.it
**Oggetto:** Arte di strada ad alto impatto (art. 1 p.1 DAC 24/2012) – richiesta individuazione spazio e nulla-osta – {{luogo_esibizione.nome}} – {{esibizione.data}}

Marca da bollo 16 € n. identificativo {{bollo.identificativo}} (se richiesta dal Municipio)

Spett.le Municipio Roma {{municipio.numero}} – {{municipio.ufficio}}
e p.c. Roma Capitale – Dipartimento Attività Culturali

Il/La sottoscritto/a {{referente.nome}} {{referente.cognome}}, C.F. {{referente.codice_fiscale}}, {{#referente.ente}}in qualità di {{referente.ruolo}} di {{referente.ente}} (C.F./P.IVA {{referente.ente_cf}}), {{/referente.ente}}recapiti {{referente.telefono}} / {{referente.email}}{{#referente.pec}} / PEC {{referente.pec}}{{/referente.pec}},

CHIEDE

l'individuazione/assegnazione di uno spazio pubblico idoneo e il conseguente nulla-osta per uno spettacolo di arte di strada con particolare impatto sonoro e scenico:

- Motivo dell'alto impatto: {{alto_impatto.motivi | join(", ")}} (gruppo > 5 artisti / amplificazione potente / scenografia > 1 m²)
- Luogo richiesto: {{luogo_esibizione.nome}} – {{luogo_esibizione.indirizzo}}; superficie occupata {{alto_impatto.superficie_mq}} m²
- Date e orari: {{esibizione.date | join(", ")}}, {{esibizione.ora_inizio}}–{{esibizione.ora_fine}} (montaggio/smontaggio {{alto_impatto.montaggio}})
- Artisti ({{esibizione.numero_artisti}}): {{esibizione.componenti | join(", ")}} – tutti iscritti al Registro: {{esibizione.tutti_iscritti}}
- Impianto audio: {{alto_impatto.impianto_audio}} (potenza {{alto_impatto.potenza_w}} W)
- Scenografie/strutture: {{alto_impatto.strutture}}
- Pubblico stimato: {{alto_impatto.pubblico_stimato}} persone
- Fuoco/effetti pirici: {{alto_impatto.fuoco}} {{#alto_impatto.fuoco}}(distanza ≥ 5 m dal pubblico, teli ignifughi ed estintore – art. 5){{/alto_impatto.fuoco}}

Allega: documento di identità; planimetria dell'area; scheda tecnica audio; {{#alto_impatto.asseverazione_acustica}}asseverazione/relazione del tecnico competente in acustica;{{/alto_impatto.asseverazione_acustica}} programma; elenco artisti.

Resta in attesa di indicazioni su eventuale canone OSP, parere acustico (DAC 84/2019; L. 447/95; L.R. Lazio 18/2001) e autorizzazioni ulteriori.

{{luogo}}, {{data_invio}}

{{referente.nome}} {{referente.cognome}}
