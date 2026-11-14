// Le inquadrature ricorrenti della lastra.
import { PIENO, inquadra, type Esterno, type Interno } from "./Lastra";

/** La lastra a destra, appena girata verso il centro; a sinistra la colonna dei titoli. */
export const VETRINA: Esterno = { cx: 1290, cy: 560, w: 1150, rx: 3, ry: -8, rz: 0, raggio: 22, ombra: 1, opacita: 1 };
/** Fuori campo, sotto, inclinata: da qui entra. */
export const SOTTO: Esterno = { ...VETRINA, cy: 1560, rx: 34, ry: -4 };
export const TUTTO: Esterno = { ...PIENO, rx: 0, ry: 0, rz: 0, opacita: 1 };

export const INTERA: Interno = { fx: 720, fy: 405, z: 1 };

/** Il pannello in basso a sinistra (schede dei flussi) grande, a sinistra dello schermo. */
export const SCHEDA = (z = 1.7, py = 625) => inquadra(226, py, 560, 560, z);
/** I comandi in alto a sinistra (ricerca, pulsanti, filtri), grandi. */
export const COMANDI = (z = 1.65, py = 200) => inquadra(226, py, 560, 470, z);
