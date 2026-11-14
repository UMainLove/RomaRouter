# Copertina della home

Alla prima visita della home compare una copertina a tutto schermo: il Colosseo al tramonto, poi la
lupa di bronzo che fa lo slalom tra gli archi, poi la home che si apre a cerchio dal Miliarium.
È un video renderizzato in Blender (realismo da render architettonico), non una scena 3D nel browser.

| Tempo | Cosa succede |
| --- | --- |
| 0–2 s | Colosseo fermo, contatore di caricamento. Il poster è il primo fotogramma del video, quindi il passaggio poster → video non si vede. La lupa è una statua ai piedi della facciata. |
| 2–3,6 s | La lupa galoppa a slalom dentro e fuori dagli archi del piano terra. La camera la segue con una panoramica che parte piano, un carrello in avanti e uno zoom (da 18 a 70 mm). |
| ~3,6 s | La copertina si apre a cerchio dal centro del Miliarium, con il bordo sfumato; intanto le strade della home si disegnano. Il video continua fino a 4,6 s sotto l'apertura. |

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
  energetico) resta il poster per i 2 s della pausa.
- Il video si scarica solo quando la copertina parte: AV1 in WebM (1,1 MB) per chi lo decodifica,
  H.264 in MP4 (2,4 MB) per gli altri. Il contatore segue il buffer del video.
- Il video si aggancia all'orologio della pagina: se arriva prima dei 2 s parte dal punto giusto
  della pausa, se arriva dopo parte subito la corsa. Dopo 9 s senza video o 12 s in tutto la
  copertina si chiude comunque.
- Sugli schermi stretti si vede una fetta del video (`object-position`), che durante la corsa scivola
  da `FETTA_INIZIALE` a `FETTA_FINALE` seguendo la lupa.

## File

- `src/components/copertina/Copertina.tsx`: tempi, ingressi, uscita, accessibilità.
- `src/components/copertina/costanti.ts`: sorgenti del video, tempi, fette per gli schermi stretti.
- `public/copertina/copertina.webm`, `copertina.mp4`, `poster.webp`, `CREDITI.md`.
- `scripts/copertina/copertina_hq.py`: Colosseo ad alta definizione (80 campate, ordini tuscanico,
  ionico e corinzio, attico, rudere con l'anello interno), travertino e sampietrini procedurali,
  cielo HDRI corretto, sole.
- `scripts/copertina/ambiente_hq.py`: strada di sampietrini, marciapiede, cordoli di peperino,
  ringhiera, prato, lecci, cipressi e pini domestici (fogliame istanziato con geometry nodes), foschia,
  camera.
- `scripts/copertina/lupa_hq.py`: la lupa (sezioni per tronco, collo, testa, zampe, coda; orecchie,
  mammelle, criniera a riccioli; remesh a voxel e lisciatura di Taubin; costole), bronzo con patina.
- `scripts/copertina/animazione_hq.py`: pesi sullo scheletro della volpe, corsa (NLA), percorso a
  slalom, camera, impostazioni di render.
- `scripts/copertina/copertina.blend`: la versione leggera di prima; da qui si prendono lo scheletro
  e la corsa della volpe.

## Rigenerare

1. Scena (Blender 5.3 senza interfaccia, `pip install bpy==5.3.0`, circa 2 minuti). L'HDRI si cerca
   in `RR_CARTELLA/hdri` (`the_sky_is_on_fire_4k.hdr` da Poly Haven) e il percorso resta assoluto nel
   .blend, quindi `RR_CARTELLA` deve essere la cartella del computer che fa il render:

   ```bash
   RR_CARTELLA=~/Movies/RomaRouter-copertina python3 scripts/copertina/costruisci_hq.py -- '{"out": "/tmp/copertina_hq.blend"}'
   ```

   I valori predefiniti sono quelli del video: camera a `(U_OVEST + 34, 70, 1)` verso
   `(U_OVEST + 38, 0)`, 18 mm, decentramento 0,2; bagliore del cielo 38° a sinistra della camera,
   sole a 115° e 6° di altezza; foschia 0,0003; lupa dalla campata `k0 + 3`.

2. Render: EEVEE in Blender 5.3 con interfaccia (Cycles su Metal si blocca nel caricamento dei
   kernel), 1920×1080, 64 campioni, motion blur; circa 1,6 s a fotogramma su un M4 Max. I primi 60
   fotogrammi sono tutti uguali: si usa il primo per tutta la pausa (niente tremolio).

3. Video e poster:

   ```bash
   ffmpeg -framerate 30 -i seq/s_%04d.png -c:v libsvtav1 -preset 4 -crf 34 -pix_fmt yuv420p10le -g 60 public/copertina/copertina.webm
   ffmpeg -framerate 30 -i seq/s_%04d.png -c:v libx264 -preset slow -crf 21 -tune film -pix_fmt yuv420p -profile:v high -level 4.1 -g 60 -movflags +faststart public/copertina/copertina.mp4
   ```

   Il poster è il fotogramma 1 in WebP qualità 80.

## Parametri principali

- Tempi: `T_FERMA`, `T_DISSOLVENZA` in `costanti.ts`; `T_FERMA`, `T_FINE`, `T_CORSA` in
  `animazione_hq.py` (devono restare allineati).
- Lupa: `SCALA_LUPA` (spalla a circa 2 m), `VELOCITA`, `CICLO` (falcata) in `animazione_hq.py`;
  forme nelle tabelle `TRONCO`, `COLLO`, `TESTA`, `ANTERIORE`, `POSTERIORE`, `CODA` di `lupa_hq.py`.
- Camera: `anima_camera` (zoom, carrello, gru, anticipo sulla lupa); `FETTA_INIZIALE`/`FETTA_FINALE`
  per gli schermi stretti.
