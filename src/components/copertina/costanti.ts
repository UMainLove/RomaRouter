/*
 * Valori della copertina della home e dello script nel <head>.
 */

/**
 * Il video della copertina: render di Blender (scripts/copertina, vedi docs/COPERTINA.md), 1920x1080,
 * 30 fotogrammi al secondo, 4,6 s. AV1 per chi lo decodifica, H.264 per tutti gli altri; il browser
 * prende la prima sorgente che sa riprodurre. Il poster e' il primo fotogramma.
 */
export const VIDEO = [
  { src: "/copertina/copertina.webm", tipo: 'video/webm; codecs="av01.0.08M.10"' },
  { src: "/copertina/copertina.mp4", tipo: 'video/mp4; codecs="avc1.640029"' },
] as const;

/** Fino a qui il video e' fermo sul poster (la lupa e' una statua ai piedi del Colosseo). */
export const T_FERMA = 2;
/** Parte l'apertura verso la home (la lupa sta passando sotto gli archi). */
export const T_DISSOLVENZA = 3.6;

/**
 * Sugli schermi piu' stretti del 16:9 si vede una fetta verticale del video, come
 * object-position: 0 = bordo sinistro, 1 = destro. Durante l'inseguimento la fetta segue la lupa.
 */
export const FETTA_INIZIALE = 0.3;
export const FETTA_FINALE = 0.4;

/** localStorage: la copertina si vede solo alla prima visita (o con ?copertina=1). */
export const CHIAVE_VISTA = "rr-copertina";

/**
 * Eseguito nel <head> prima del primo disegno: decide se mostrare la copertina, cosi' la home
 * non lampeggia prima del poster. Senza JavaScript non parte nulla e resta la home.
 */
export const SCRIPT_AVVIO = `(function(){try{var q=new URLSearchParams(location.search).get("copertina");if(location.pathname!=="/"||q==="0")return;if(q===null&&localStorage.getItem("${CHIAVE_VISTA}"))return;document.documentElement.setAttribute("data-copertina","si");window.__rrCopertina=performance.now()}catch(e){}})()`;
