# RomaRouter · film di lancio

1920×1080, 30 fps, **3:08** (188 s). Voce fuori campo registrata a parte da Dino; la musica è un
letto che le lascia spazio. Montato in Remotion (`video/src`), sito ripreso fotogramma per fotogramma
con Playwright (`video/riprese`).

## 1. Critica prima di girare

**Produttore.** Il rischio numero uno è che sembri una registrazione dello schermo: mouse che vaga,
pagine che caricano, scroll. Quindi niente di tutto questo: ogni inquadratura ha un soggetto e un
movimento di camera deciso. Il rischio numero due è voler far vedere tutto: 4 sezioni × 6 funzioni
non stanno in 3 minuti. Regola: **una sezione = un momento eroe + tre momenti**, una frase per
momento. Il terzo rischio è la voce: Dino parla sopra, quindi i testi a schermo sono titoli di 3–6
parole che non fanno concorrenza al parlato, e ogni momento dura almeno 4 secondi (il tempo di una
frase detta con calma).

**Art director.** Il video della lupa è un render fotorealistico caldo, il sito è chiaro e piatto: se
li attacchi uno dopo l'altro stridono. Il ponte è quello che il sito fa già: la copertina si apre a
cerchio dal centro del Colosseo e sotto c'è la home. Da lì il filo conduttore è la metafora del sito,
**le strade**: ogni capitolo si apre percorrendo la sua strada colorata (viola, verde, arancio, blu),
e il finale le riaccende tutte e quattro verso Roma. Il sito non sta in una cornice di browser finta
con i pulsanti del sistema operativo: è una lastra con angoli morbidi e un'ombra lunga, sospesa su un
fondo color travertino, che entra inclinata in 3D e si appoggia. Poi la camera entra nei dettagli.
Niente effetti gratuiti (glitch, lens flare, rotazioni a vuoto): movimenti con inerzia, molle morbide,
tagli sul battito.

**Copy.** Lo stesso tono della home: minimale, caldo, un po' giocoso, mai pubblicitario. Niente
superlativi, niente "rivoluzionario". Frasi che fanno venire voglia di toccare.

**Montatore.** Musica a 120 BPM: una battuta dura 2 secondi. Capitoli, momenti e titoli cadono sulle
battute; i passaggi tra un momento e l'altro sul quarto che precede (anticipo di 0,5 s), così l'occhio
arriva prima dell'orecchio.

**Direttore della fotografia (riprese del sito).** Pagina a 1440×810 punti con densità 2: ogni
fotogramma è 2880×1620, quindi possiamo stringere fino a 1,5× restando nitidi a 1080p. Orologio della
pagina finto: tra un fotogramma e l'altro passano esattamente 33,3 ms, anche se il computer ci mette un
secondo a disegnarlo. Risultato: voli della mappa, schede e animazioni perfettamente fluidi, zero
scatti, zero caricamenti visibili. Tutto è il sito vero con i dati veri: nessun mockup.

**Musicista.** Elettronica cinematografica calda, non epica da trailer. Tre brani (cue) separati
perché in mezzo ci sono i due video degli artisti con il loro audio: la musica si ferma lì. Sotto la
voce niente melodie piene nelle frequenze del parlato (1–4 kHz scavati); la melodia vera esce solo
dove la voce respira (cartelli dei capitoli, finale).

**Sound design.** Fruscii sulle transizioni a strada, un "tic" morbido a ogni clic del cursore, un
colpo basso sui cartelli dei capitoli. Tutto dentro le cue, sincronizzato ai tempi qui sotto.

## 2. Scaletta (tempi assoluti, secondi)

| Da | A | Scena | Musica |
| --- | --- | --- | --- |
| 0,00 | 6,87 | **La lupa.** Il video della copertina, intero. A 5,75 si apre a cerchio dal Colosseo. | Cue A, tempo libero: bordone, galoppo, colpo di bronzo all'atterraggio (4,67) e alla posa (5,25), risucchio verso il 6,00 |
| 5,75 | 16,00 | **Home.** Le quattro strade corrono verso il Colosseo. "Tutte le strade portano a Roma." → "Adesso sai anche quale prendere." → logo. La camera scivola sulla strada viola. | Cue A: il tema parte a 6,00 |
| 16,00 | 48,00 | **01 Oggetti smarriti** | Cue A |
| 48,00 | 80,00 | **02 Impianti sportivi** | Cue A, più energia |
| 80,00 | 84,00 | **03 Artisti di strada**, cartello | Cue A chiude: accordo tenuto che si spegne a 84,00 |
| 84,00 | 99,00 | **[VIDEO ARTISTI · parte 1]**, 15 s, audio suo | silenzio |
| 99,00 | 135,00 | **Artisti: come funziona** | Cue B |
| 135,00 | 139,00 | **[VIDEO ARTISTI · parte 2]**, la ragazza che canta, 4 s | silenzio (stacco netto) |
| 139,00 | 169,00 | **04 Antenne** | Cue C |
| 169,00 | 188,00 | **Finale.** Le quattro strade si riaccendono, logo a 177,00, chiusura. | Cue C: crescendo, colpo sul logo, coda |

Se i due video degli artisti arrivano con durate diverse, cambiano solo le costanti `SLOT_A` e
`SLOT_B` in `video/src/tempi.ts`: tutto quello che viene dopo scorre, cue B e C comprese.

### Dentro i capitoli (ogni capitolo: cartello di 2 s, poi momenti da 4–8 s)

**01 Oggetti smarriti — "Roma restituisce quasi tutto"**
1. La mappa entra in 3D: tutti i posti dove si consegna un oggetto (polizia, ospedali, stazioni,
   punti amici, aperti 24h). *"Ogni posto dove riportarlo."*
2. **Eroe:** "Ho trovato" → cosa → dove → il punto più vicino e il codice di consegna.
   *"Hai trovato qualcosa? Tre tocchi."*
3. "Ho perso" → cosa → "Avvisami se lo trovano". *"Hai perso qualcosa? Ti avvisiamo noi."*
4. Il dettaglio segreto. *"Solo chi l'ha perso sa il dettaglio segreto."*

**02 Impianti sportivi — "C'è un campo che ti aspetta"**
1. La città piena di campi, spille che compaiono. *"Ogni campo di Roma."*
2. Filtro per sport: calcio, padel, nuoto. *"Scegli lo sport."*
3. "Gioca gratis". *"Anche dove si entra senza pagare."*
4. **Eroe:** scrivi un indirizzo → la camera vola e si inclina sui campi disegnati in 3D → scheda.
   *"Scrivi dove sei. Il campo è lì."*

**03 Artisti di strada — "La città è un palcoscenico"** (scena centrale, la più lunga)
1. "Mi esibisco" → "Musica": la mappa si colora di zone. *"Dove posso suonare?"*
2. **Eroe:** tocco su una piazza → il verdetto ("Sì, con una condizione" / "No, qui è vietato").
   *"La risposta, prima di aprire la custodia."*
3. I palchi: prenota un turno. *"Il tuo turno sul palco."*
4. Il Pass Artista. *"Un pass, tutta la città."*
5. "Voglio guardare": chi è in scena adesso, con l'onda intorno. *"Chi suona adesso, vicino a te."*

**04 Antenne — "Che cosa c'è sopra i tetti"**
1. La città dall'alto, le antenne che si accendono. *"Ogni antenna. Ogni richiesta."*
2. **Eroe:** un indirizzo → le antenne intorno → tocco → l'onda radio, operatore, tecnologia.
   *"Che cosa c'è sopra casa tua."*
3. Cosa c'è intorno: scuole, ospedali, i limiti di legge. *"E quanto è vicina alla scuola."*

**Finale**
Si torna alla home dall'alto: le quattro strade si riaccendono insieme verso il Colosseo.
*"Quattro strade."* → *"Una città."* → logo RomaRouter → *"Tutte le strade portano a Roma."*

## 3. Linguaggio visivo

- Fondo: travertino caldo `#F3EDE3`, grana leggerissima, vignettatura morbida; nei capitoli un alone
  del colore del capitolo.
- Colori dei capitoli = colori del sito: oggetti `--color-oggetti`, sport `--color-sport`, arte
  `--color-arte`, antenne `--color-antenne`; porpora e oro del logo per home e finale.
- Caratteri: Montserrat (quello del sito) per i titoli, Titillium Web per il marchio.
- Titoli: parola per parola, salgono da una maschera (2 fotogrammi di sfasamento), escono sfocando.
- Cursore disegnato (non quello di sistema), traiettorie curve, clic con anello nel colore del
  capitolo.
- Etichette: linea sottile + pillola che indica il punto della pagina di cui parla la voce.

## 4. Consegne

- `video/out/romarouter.mp4`: master H.264 1080p con musica.
- `video/out/romarouter-senza-musica.mp4`: per il mix con la voce.
- `video/public/musica/cue-a.wav`, `cue-b.wav`, `cue-c.wav`: musica separata, 48 kHz.
- Sul sito: `public/video/romarouter.mp4` (H.264 1080p, moov in testa) con il fotogramma
  `romarouter.jpg`, caricato solo quando si preme «Guarda il video».

## 5. Rifare il film

Da `video/`:

1. `npm install` e `npm run prepara` (copia il video della lupa).
2. Musica: `cd musica && python genera.py` (numpy e scipy; il risultato è identico ogni volta).
3. Riprese del sito (solo se il sito è cambiato): build di produzione del sito (`npx next build` nella
   radice), preview **riprese** (`video/riprese/server.mjs`, porta 3100), poi `npm run riprese`
   (o `npm run riprese -- sport` per una sola). I fotogrammi finiscono in `riprese-dati/` (non nel
   repository: si rigenerano), i tempi e il cursore in `riprese-dati/<nome>.json`.
4. Preview **fotogrammi** (`video/riprese/fotogrammi.mjs`, porta 3399): serve i fotogrammi al montaggio
   senza copiarli nel bundle di Remotion.
5. `npm run render` → `out/romarouter-master.mp4` (H.264 CRF 16, audio 320k). `npm run studio` per
   guardarlo e ritoccarlo.
6. `npm run web` → `public/video/romarouter.mp4` del sito (leggero, parte subito) e, per il mix con
   la voce, `out/romarouter-senza-audio.mp4` e `out/romarouter-musica.wav` (musica ed effetti).

### Quando arrivano i due video degli artisti

1. Copiarli in `video/public/sorgenti/` (es. `artisti-1.mp4`, `artisti-2.mp4`).
2. In `src/sorgenti.ts` mettere i percorsi in `VIDEO_ARTISTI_1` e `VIDEO_ARTISTI_2` (ed eventualmente
   da che secondo partono).
3. In `src/tempi.ts` mettere le durate vere in `SLOT_A` e `SLOT_B`: tutto quello che viene dopo
   scorre, musica compresa.
4. `npm run render` e `npm run web`.
