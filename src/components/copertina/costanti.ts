/*
 * Valori condivisi tra la copertina (bundle della home) e la scena 3D (caricata a parte):
 * qui niente three.js, cosi' la home non lo scarica.
 */

/** File della scena e poster: generati da scripts/copertina (vedi docs/COPERTINA.md). */
export const URL_SCENA = "/copertina/colosseo.glb";
export const PESO_SCENA = 310_000;

/** Fino a qui la camera e' ferma: il primo fotogramma 3D coincide col poster. */
export const T_FERMA = 2;
/** Parte la dissolvenza verso la home (la lupa sta passando l'ultimo pilastro). */
export const T_DISSOLVENZA = 3.6;

/**
 * Sugli schermi piu' stretti del 16:10 si vede una fetta verticale del fotogramma di riferimento,
 * come background-position sul poster: 0 = bordo sinistro, 1 = destro. Durante l'inseguimento
 * la fetta scivola verso la lupa.
 */
export const FETTA_INIZIALE = 0.36;
export const FETTA_FINALE = 0.56;

/** localStorage: la copertina si vede solo alla prima visita (o con ?copertina=1). */
export const CHIAVE_VISTA = "rr-copertina";

/**
 * Eseguito nel <head> prima del primo disegno: decide se mostrare la copertina, cosi' la home
 * non lampeggia prima del poster. Senza JavaScript non parte nulla e resta la home.
 */
export const SCRIPT_AVVIO = `(function(){try{var q=new URLSearchParams(location.search).get("copertina");if(location.pathname!=="/"||q==="0")return;if(q===null&&localStorage.getItem("${CHIAVE_VISTA}"))return;document.documentElement.setAttribute("data-copertina","si");window.__rrCopertina=performance.now()}catch(e){}})()`;
