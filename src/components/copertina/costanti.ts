/*
 * Valori della copertina della home e dello script nel <head>.
 */

/**
 * Il video della copertina: render di Blender (scripts/copertina, vedi docs/COPERTINA.md), 1920x1080,
 * 30 fotogrammi al secondo, 6,9 s. AV1 per chi lo decodifica, H.264 per tutti gli altri; il browser
 * prende la prima sorgente che sa riprodurre. Il poster e' il primo fotogramma.
 */
export const VIDEO = [
  { src: "/copertina/copertina.webm", tipo: 'video/webm; codecs="av01.0.08M.10"' },
  { src: "/copertina/copertina.mp4", tipo: 'video/mp4; codecs="avc1.640029"' },
] as const;

/** Fino a qui il video e' fermo sul poster (la lupa e' una statua ai piedi del Colosseo). */
export const T_FERMA = 0.75;
/**
 * Parte l'apertura verso la home: mezzo secondo dopo che la lupa, saltata sul capitello, si e' fermata
 * nella posa della Lupa Capitolina sopra Romolo e Remo (i tempi vengono da scripts/copertina/costruisci_hq.py).
 */
export const T_DISSOLVENZA = 5.75;

/**
 * Sugli schermi piu' stretti del 16:9 si vede una fetta verticale del video, come
 * object-position: 0 = bordo sinistro, 1 = destro. FETTA_INIZIALE vale per il poster e la pausa;
 * poi la fetta segue la lupa: coppie [secondo del video, posizione], interpolate. Sul telefono
 * nella posa finale tiene i gemelli e la testa girata verso di noi.
 */
export const FETTA_INIZIALE = 0.3;
export const FETTE: ReadonlyArray<readonly [number, number]> = [
  [0.75, 0.3],
  [1.4, 0.4],
  [2, 0.47],
  [2.6, 0.43],
  [3.8, 0.41],
  [4.25, 0.41],
  [4.7, 0.53],
  [5.3, 0.58],
];

/** Posizione della fetta al secondo t del video. */
export function fettaAl(t: number): number {
  if (t <= FETTE[0][0]) return FETTA_INIZIALE;
  for (let i = 1; i < FETTE.length; i++) {
    const [t1, x1] = FETTE[i];
    if (t <= t1) {
      const [t0, x0] = FETTE[i - 1];
      return x0 + ((x1 - x0) * (t - t0)) / (t1 - t0);
    }
  }
  return FETTE[FETTE.length - 1][1];
}

/** localStorage: la copertina si vede solo alla prima visita (o con ?copertina=1). */
export const CHIAVE_VISTA = "rr-copertina";

/**
 * Eseguito nel <head> prima del primo disegno: decide se mostrare la copertina, cosi' la home
 * non lampeggia prima del poster. Senza JavaScript non parte nulla e resta la home.
 */
export const SCRIPT_AVVIO = `(function(){try{var q=new URLSearchParams(location.search).get("copertina");if(location.pathname!=="/"||q==="0")return;if(q===null&&localStorage.getItem("${CHIAVE_VISTA}"))return;document.documentElement.setAttribute("data-copertina","si");window.__rrCopertina=performance.now()}catch(e){}})()`;
