# Oggetti smarriti

La sezione nasce dal lavoro del branch `feat/oggetti-smarriti-catalogo-protetto` (catalogo protetto, punti di
riconsegna, area operatori), unito in `main` il 14/11/2026. La parte dati e le API sono quelle del branch.
L'interfaccia è stata rifatta come le altre sezioni: una mappa a tutto schermo, schede di una schermata,
Guida a parte.

## Per i cittadini (`/oggetti`)

- **Mappa**: 246 punti dove consegnare o ritirare. Le spille sono a goccia, con il colore e il disegno del tipo:
  - Polizia e Carabinieri: scudo blu;
  - Ufficio Oggetti Rinvenuti;
  - pronto soccorso H24: croce rossa;
  - Misericordie e Croce Rossa: cuore arancio;
  - punti amici H24: orologio verde.

  Il bollino «24h» segna i punti sempre aperti. Cercando un indirizzo partono gli anelli di 500 m e 1 km; la
  scheda mostra il punto più vicino, quello aperto 24 ore e la Polizia più vicina, che serve per i documenti.
- **Ho trovato**, 3 passi: che cosa, dove e quando, un dettaglio segreto. Si riceve il codice di consegna
  (CNS-…) e il punto più vicino adatto: documenti, carte e chiavi d'auto vanno solo alle Forze dell'Ordine.
- **Ho perso**, 3 passi: che cosa (per i documenti numero e denuncia), dove e quando con il colore, come
  avvisarti. Poi la scheda «La mia segnalazione» segue i passi: segnalata, trovato un simile, verifica, ritiro.
  Chi ha perso risponde alle domande del custode e mostra il codice di ritiro (RIT-…).
- **Accesso**: SPID o CIE, qui simulati, oppure un link valido un'ora per i turisti, che nella demo non viene
  spedito. Ogni accesso di prova ha la sua identità.

## Per gli operatori (`/operatori`)

1. Si entra con un profilo di prova: Forze dell'Ordine, Ufficio, punto H24, guardia giurata, volontario.
2. **Prendi in consegna**: il codice CNS del cittadino.
3. **Richieste dei proprietari**: una per riga, con il pulsante del passo da fare: apri il contatto, fai una
   domanda, approva o rifiuta, fissa l'appuntamento, conferma la restituzione con il codice RIT.
4. **Controlla un documento** (solo Forze dell'Ordine e Ufficio): il numero diventa verde se qualcuno l'ha
   denunciato, e con «Prendilo in consegna» parte subito l'abbinamento.
5. **Registra un oggetto** arrivato senza codice.

## Correzioni fatte all'unione

- Chi trova non riceve più il recapito di chi ha perso. Gli operatori lo vedono solo dopo la verifica.
- I cittadini di prova non condividono più la stessa identità, prima avevano tutti una segnalazione sola.
- Senza `OGGETTI_SEGRETO` in sviluppo si usa un segreto ricavato dall'installazione, invece di un errore 500.
  In produzione resta obbligatorio.
- Il registro delle attività non scrive più una riga a ogni lettera digitata nelle ricerche degli operatori.
- Gli appuntamenti si possono fissare anche nelle caserme e nelle sedi di soccorso, e i documenti trovati
  vanno anche ai presidi di Polizia e Carabinieri. Prima erano ammessi solo 25 punti.
- Tolte le parti che non servivano o non funzionavano:
  - catalogo pubblico e pagina di ritiro, che ora rimanda a `/oggetti`;
  - candidatura a custode: chi veniva approvato non poteva entrare;
  - API `catalogo` e `ritiro-pubblico`;
  - l'elenco di 250 punti e i pannelli doppi.
- L'assistente della home apre «Ho perso» già compilato (`/oggetti?categoria=…`).

## Dati e prove

- I dati (punti, categorie, oggetti di prova) nascono dalle migrazioni `db/oggetti-smarriti/migrations`, che si
  applicano da sole all'avvio del sito.
- Senza database la mappa legge `public/dati/oggetti/punti.json` (`npm run oggetti:esporta` con il sito avviato).
- I punti di Polizia, ospedali e soccorso vengono da OpenStreetMap (ODbL). Alcuni punti amici H24 sono di
  esempio e lo dicono nel nome.
- Prova completa della restituzione fatta il 14/11/2026, con tre sessioni separate (chi trova, chi perde,
  operatore): codice di consegna, abbinamento, contatto, descrizione, domanda e risposta, approvazione,
  appuntamento, codice di ritiro, restituito.
