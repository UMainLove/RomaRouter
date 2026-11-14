# Copertina della home

Alla prima visita della home compare una copertina a tutto schermo: il Colosseo al tramonto, poi la
lupa di bronzo che fa lo slalom tra gli archi e salta sul capitello dove la aspettano Romolo e Remo,
poi la home che si apre a cerchio dal Miliarium. È un video renderizzato in Blender (realismo da
render architettonico), non una scena 3D nel browser.

| Tempo | Cosa succede |
| --- | --- |
| 0–0,75 s | Colosseo fermo, contatore di caricamento. Il poster è il primo fotogramma del video, quindi il passaggio poster → video non si vede. La lupa è una statua ai piedi della facciata; in fondo alla strada, davanti alla rottura del muro esterno, c'è un capitello corinzio con sopra Romolo e Remo in bronzo; all'orizzonte, ai lati del Colosseo, una fascia di alberi. |
| 0,75–3,76 s | La lupa galoppa a slalom attorno a tre pilastri del piano terra, poi esce dall'ultimo arco verso la camera e rallenta. La camera la segue con una panoramica che parte piano, un carrello in avanti e uno zoom (da 18 a 88 mm). |
| 3,76–4,67 s | Il balzo verso lo spettatore: la lupa si impenna, vola sul capitello e in aria si gira di fianco. La camera sale all'altezza della statua e allarga l'inquadratura (pan out, da 88 a 62 mm). |
| 4,67–5,25 s | Appoggia prima le zampe anteriori, poi le posteriori, e si ferma nella posa della Lupa Capitolina sopra i gemelli: di profilo verso destra, testa girata verso di noi, coda giù. |
| ~5,75 s | La copertina si apre a cerchio dal centro del Miliarium, con il bordo sfumato; intanto le strade della home si disegnano. Il video continua fino a 6,9 s sotto l'apertura (spinta lentissima della camera). |

## Comportamento

- Solo sulla home e solo alla prima visita (`localStorage["rr-copertina"]`).
  `/?copertina=1` la mostra sempre (utile per le demo), `/?copertina=0` mai.
- La decide uno script nel `<head>` (`SCRIPT_AVVIO` in `src/components/copertina/costanti.ts`)
  prima del primo disegno: niente lampo della home. Senza JavaScript non compare.
- Si salta con il pulsante «Salta l'introduzione», con Esc, Invio, Tab, rotella, tocco o clic.
- La home è già sotto, completa e accessibile; le sue animazioni restano in pausa finché la
  copertina non si apre (`html[data-copertina]` in `globals.css`).
- Movimento ridotto: solo il poster, che sfuma dopo 1,5 s. Con risparmio dati: solo il poster e la
  stessa apertura a cerchio. Se il browser nega la riproduzione automatica (es. iPhone in risparmio
  energetico) resta il poster per la pausa più mezzo secondo.
- Il video si scarica solo quando la copertina parte: AV1 in WebM (1,6 MB) per chi lo decodifica,
  H.264 in MP4 (3,2 MB) per gli altri. Il contatore segue il buffer del video.
- Il video si aggancia all'orologio della pagina: se arriva prima di `T_FERMA` parte dal punto giusto
  della pausa, se arriva dopo parte subito la corsa. Dopo 9 s senza video o 12 s in tutto la
  copertina si chiude comunque.
- Sugli schermi stretti si vede una fetta del video (`object-position`): `FETTA_INIZIALE` per il
  poster e la pausa, poi a ogni fotogramma la posizione della tabella `FETTE` (secondo del video →
  posizione), che segue la lupa e nella posa tiene i gemelli e la testa.

## File

- `src/components/copertina/Copertina.tsx`: tempi, ingressi, uscita, accessibilità.
- `src/components/copertina/costanti.ts`: sorgenti del video, tempi, fette per gli schermi stretti.
- `public/copertina/copertina.webm`, `copertina.mp4`, `poster.webp`, `CREDITI.md`.
- `scripts/copertina/copertina_hq.py`: Colosseo ad alta definizione (80 campate, ordini tuscanico,
  ionico e corinzio, attico, rudere con l'anello interno), travertino e sampietrini procedurali,
  cielo HDRI corretto, sole.
- `scripts/copertina/ambiente_hq.py`: strada di sampietrini, marciapiede, cordoli di peperino,
  ringhiera, prato, lecci, cipressi e pini domestici (fogliame istanziato con geometry nodes), la
  fascia di alberi all'orizzonte (`alberi_orizzonte`: chiome lontane senza fogliame istanziato, in un
  solo oggetto che non fa ombra), foschia, camera.
- `scripts/copertina/lupa_hq.py`: la lupa, misurata sulla foto della Lupa Capitolina di profilo
  (sezioni per tronco, collo, testa con bocca aperta e denti, zampe, coda; orecchie, mammelle a goccia,
  criniera a ciocche, treccia dietro la spalla, cresta sul dorso, costole, scapola e anca; remesh a
  voxel e lisciatura di Taubin), bronzo con patina e velo di cera.
- `scripts/copertina/capitello_hq.py`: capitello corinzio su un rocchio scanalato (due giri di foglie
  d'acanto, volute, abaco a lati concavi con il fiore), marmo consumato.
- `scripts/copertina/gemelli_hq.py`: Romolo e Remo in bronzo, uno in ginocchio e uno seduto, con la
  bocca alle mammelle della posa finale.
- `scripts/copertina/animazione_hq.py`: lo scheletro della volpe adattato alla Lupa, pesi, corsa (NLA),
  percorso a slalom, balzo (parabola del baricentro, pose dello scheletro in un'azione `Balzo`), posa
  finale, camera con profondità di campo, luce da museo sulla statua (light linking: illumina solo il
  bronzo), impostazioni di render.
- `scripts/copertina/copertina.blend`: la versione leggera di prima; da qui si prendono lo scheletro
  e la corsa della volpe.

## Rigenerare

1. Scena (Blender 5.3 senza interfaccia, `pip install bpy==5.3.0`, circa 20 secondi). L'HDRI si cerca
   in `RR_CARTELLA/hdri` (`the_sky_is_on_fire_4k.hdr` da Poly Haven) e il percorso resta assoluto nel
   .blend, quindi `RR_CARTELLA` deve essere la cartella del computer che fa il render:

   ```bash
   RR_CARTELLA=~/Movies/RomaRouter-copertina python3 scripts/copertina/costruisci_hq.py -- '{"out": "/tmp/copertina_hq.blend"}'
   ```

   I valori predefiniti sono quelli del video: camera a `(U_OVEST + 34, 70, 1)` verso
   `(U_OVEST + 38, 0)`, 18 mm, decentramento 0,2; bagliore del cielo 38° a sinistra della camera,
   sole a 115° e 6° di altezza; foschia 0,0003; lupa dalla campata `k0 + 2,5`, capitello al centro
   della campata `k0 + 7` a 10,5 m dalla facciata. Lo script stampa i tempi del video (`INFO_BUILD`,
   `tempi`): `T_DISSOLVENZA` va riportato in `costanti.ts`.

2. Render: EEVEE in Blender 5.3 con interfaccia (Cycles su Metal si blocca nel caricamento dei
   kernel), 1920×1080, 64 campioni, motion blur, profondità di campo; circa 2 s a fotogramma su un
   M4 Max (206 fotogrammi). I primi 23 fotogrammi sono tutti uguali: si usa il primo per tutta la
   pausa (niente tremolio).

3. Video e poster:

   ```bash
   ffmpeg -framerate 30 -i seq/s_%04d.png -c:v libsvtav1 -preset 4 -crf 34 -pix_fmt yuv420p10le -g 60 public/copertina/copertina.webm
   ffmpeg -framerate 30 -i seq/s_%04d.png -c:v libx264 -preset slow -crf 23 -tune film -pix_fmt yuv420p -profile:v high -level 4.1 -g 60 -movflags +faststart public/copertina/copertina.mp4
   ```

   Il poster è il fotogramma 1 in WebP qualità 80.

## Parametri principali

- Tempi: `T_FERMA`, `T_DISSOLVENZA` in `costanti.ts`; in `animazione_hq.py` `T_FERMA`, `VELOCITA`,
  `FRENATA`, `SALTO`, `G_SALTO`, `CULMINE`, `T_POSA`, `T_TENUTA`, `T_GUARDA` (da questi `moto_lupa`
  calcola stacco, atterraggio e posa; `T_FERMA` deve restare uguale nei due file).
- Lupa: `SCALA_LUPA` (spalla a circa 2 m), `CICLO` (falcata), `POSE` (rotazioni delle ossa nel balzo
  e nella posa) in `animazione_hq.py`; forme nelle tabelle `TRONCO`, `COLLO`, `TESTA`, `ANTERIORE`,
  `POSTERIORE`, `CODA` di `lupa_hq.py`.
- Camera: `anima_camera` (posizione allo stacco, zoom in tre tempi, decentramento, fuoco),
  `inquadratura_finale` (distanza, angolo, altezza); `FETTA_INIZIALE` e `FETTE` per gli schermi stretti.
