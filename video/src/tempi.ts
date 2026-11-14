/*
 * La scaletta del film (vedi video/PRODUZIONE.md). Tempi in secondi assoluti; la musica e' a 120 BPM,
 * una battuta = 2 s. Se i due video degli artisti arrivano con durate diverse si cambiano solo
 * SLOT_A e SLOT_B: tutto quello che viene dopo scorre (cue B e C comprese).
 */
export const FPS = 30;
export const W = 1920;
export const H = 1080;
export const f = (secondi: number) => Math.round(secondi * FPS);

/** Video artisti, parte 1 (l'inizio, con il loro audio): 480 fotogrammi. */
export const SLOT_A = 16;
/** Video artisti, parte 2 («La donna è mobile»): 73 fotogrammi. */
export const SLOT_B = 73 / 30;
/** Dopo «La donna è mobile» l'ultimo fotogramma resta fermo mentre la strada blu lo attraversa. */
export const FERMO_B = 0.6;

const LUPA = 6.867;
const RIVELA = 5.75;
const OGGETTI = 16;
const SPORT = 48;
const ARTE_CARTELLO = 80;
const SLOT_A_INIZIO = 84;
const ARTE = SLOT_A_INIZIO + SLOT_A; // 100
const ARTE_DURATA = 36;
const SLOT_B_INIZIO = ARTE + ARTE_DURATA; // 136
const ANTENNE = SLOT_B_INIZIO + SLOT_B + FERMO_B; // 139,03
const ANTENNE_DURATA = 30;
const FINALE = ANTENNE + ANTENNE_DURATA; // 169
const FINALE_DURATA = 19;

export const T = {
  lupa: 0,
  lupaFine: LUPA,
  rivela: RIVELA,
  home: RIVELA,
  oggetti: OGGETTI,
  sport: SPORT,
  arteCartello: ARTE_CARTELLO,
  slotA: SLOT_A_INIZIO,
  arte: ARTE,
  arteDurata: ARTE_DURATA,
  slotB: SLOT_B_INIZIO,
  antenne: ANTENNE,
  antenneDurata: ANTENNE_DURATA,
  finale: FINALE,
  finaleDurata: FINALE_DURATA,
  fine: FINALE + FINALE_DURATA,
};

/** Dove partono le tre cue (secondi assoluti). */
export const CUE = { a: 0, b: ARTE, c: ANTENNE };

export const DURATA = f(T.fine);
