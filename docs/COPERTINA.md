# Copertina della home

Alla prima visita della home compare una copertina a tutto schermo: il Colosseo, poi la lupa che
fa lo slalom tra gli archi, poi la home che si apre a cerchio dal Miliarium.

| Tempo | Cosa succede |
| --- | --- |
| 0–2 s | Colosseo fermo, contatore di caricamento. Prima il poster, poi la scena 3D identica. |
| 2–4 s | La lupa esce da un arco e fa lo slalom tra i pilastri. La camera la segue con una panoramica che parte piano (smootherstep) e uno zoom che la tiene grande. |
| ~3,6 s | La copertina si apre a cerchio dal centro del Miliarium, con il bordo sfumato; intanto le strade della home si disegnano. |

## Comportamento

- Solo sulla home e solo alla prima visita (`localStorage["rr-copertina"]`).
  `/?copertina=1` la mostra sempre (utile per le demo), `/?copertina=0` mai.
- La decide uno script nel `<head>` (`SCRIPT_AVVIO` in `src/components/copertina/costanti.ts`)
  prima del primo disegno: niente lampo della home. Senza JavaScript non compare.
- Si salta con il pulsante «Salta l'introduzione», con Esc, Invio, Tab, rotella, tocco o clic.
- La home è già sotto, completa e accessibile; le sue animazioni restano in pausa finché la
  copertina non si apre (`html[data-copertina]` in `globals.css`).
- Movimento ridotto: solo il poster, che sfuma dopo 1,5 s. Senza WebGL o con risparmio dati:
  solo il poster e la stessa apertura a cerchio.
- Three.js e la scena si scaricano solo quando la copertina parte (`import()` dinamico):
  circa 170 KB di JavaScript compresso più `colosseo.glb` (303 KB, 123 KB con gzip).
- Su dispositivi lenti lo slalom rallenta invece di saltare (al massimo 50 ms per fotogramma).
  Dopo 9 s senza scena o 12 s in tutto la copertina si chiude comunque.

## File

- `src/components/copertina/Copertina.tsx`: tempi, ingressi, uscita, accessibilità.
- `src/components/copertina/scena.ts`: luce, nebbia, materiali (AO solo sulla luce ambiente),
  inquadratura come `background-size: cover` sul poster, zoom dell'inseguimento.
- `public/copertina/colosseo.glb`, `public/copertina/poster.webp`, `public/copertina/CREDITI.md`.
- `scripts/copertina/colosseo.py`: Colosseo, lupa, percorso e camera in Blender.
- `scripts/copertina/copertina.blend`: la scena già pronta, da aprire in Blender 5.3.

## Rigenerare

1. Scena e GLB (Blender 5.3 senza interfaccia, `pip install bpy==5.3.0`):

   ```bash
   RR_CLI=1 python3 scripts/copertina/colosseo.py -- --ao --glb /tmp/colosseo-raw.glb --blend scripts/copertina/copertina.blend
   ```

   Nel Blender con interfaccia si esegue il file e poi `costruisci()` e `costruisci_lupa()`.

2. Compressione (meshopt):

   ```bash
   npx @gltf-transform/cli@4 optimize /tmp/colosseo-raw.glb /tmp/colosseo-opt.glb --compress false --flatten false --join false --simplify false --instance false --palette false --texture-compress false
   npx @gltf-transform/cli@4 meshopt /tmp/colosseo-opt.glb public/copertina/colosseo.glb --level high --quantize-position 16 --quantize-color 8
   ```

3. Poster: è il fotogramma 0 della scena 3D, 2400×1500, WebP qualità 0,8, ricavato dalla stessa
   `scena.ts` in Chrome (`canvas.toDataURL("image/webp", 0.8)` dopo `disegna(0)`). Va rifatto se
   cambiano luce, materiali o camera iniziale, altrimenti il passaggio poster → 3D si vede.

## Parametri principali

- Tempi: `T_FERMA`, `T_DISSOLVENZA` in `costanti.ts`; `T_FINE_SLALOM`, `DURATA` in `colosseo.py`.
- Percorso: `ARCO_USCITA`, `PILASTRO_FINALE`, `V_FUORI`, `V_DENTRO` (la velocità si ricava dai tempi).
- Camera: `CAMERA_POS`, `CAMERA_MIRA`, `SEGUI_*` in `colosseo.py`; `FOV_RIF`, `QUOTA_SCHERMO_LUPA`,
  `ZOOM_MINIMO` in `scena.ts`; `FETTA_INIZIALE`/`FETTA_FINALE` per gli schermi stretti.

La lupa è un segnaposto (vedi `public/copertina/CREDITI.md`): per sostituirla basta un modello
glTF animato con una corsa sul posto, importato al posto della volpe in `importa_volpe()`.
