/*
 * I file che il film usa da video/public. I due video degli artisti arrivano a parte: quando ci sono,
 * si mette qui il percorso (es. "sorgenti/artisti-1.mp4") e si rifa' il render.
 */
export const VIDEO_ARTISTI_1: string | null = "sorgenti/artisti-1.mp4";
export const VIDEO_ARTISTI_2: string | null = "sorgenti/artisti-2.mp4";
/** secondi da saltare all'inizio di ciascun video (se servisse tagliare la testa) */
export const INIZIO_ARTISTI_1 = 0;
export const INIZIO_ARTISTI_2 = 0;

export const LUPA = "sorgenti/copertina.mp4";

/** Musica ed effetti (video/musica). false finche' non sono pronti. */
export const MUSICA = process.env.REMOTION_SENZA_MUSICA ? false : true;
export const CUE_A = "musica/cue-a.wav";
export const CUE_B = "musica/cue-b.wav";
export const CUE_C = "musica/cue-c.wav";
export const SFX = { clic: "musica/clic.wav", fruscio: "musica/fruscio.wav", tasti: "musica/tasti.wav" };
