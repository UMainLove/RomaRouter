// Mappa della sezione "Arte di strada".
// Base: Quartieri di Roma 2026 (quartieri, municipi, ricerca vie, 2D/3D).
// Sopra: le zone (dove ci si puo' esibire, dove no, a quali condizioni), le postazioni ufficiali e le
// esibizioni in programma, dal database rr_artisti_strada via /api/artisti/* (mappe/artisti-di-strada/artisti.js).
import type { Sezione } from "../comune.mts";

const T = "mappa-quartieri.template.html";

const sezione: Sezione = {
  slug: "artisti-di-strada",
  titolo: "Arte di strada",
  titoloHtml: "Arte <span>di strada</span>",
  sottotitolo: "Dove esibirsi, dove no, e dove trovare gli artisti",
  descrizione:
    "Mappa dell'arte di strada a Roma: dove gli artisti possono esibirsi, i divieti, le postazioni ufficiali e dove trovare gli artisti in città.",
  css: "artisti.css",
  js: "artisti.js",
  icone: {
    artista: "docs/mappa/icone/arte-strada.svg",
  },
  patch: [
    {
      file: T,
      cerca: 'var attiva = !location.hash.replace(/^#/, "") && !ridotto && !/[?&]intro=no\\b/.test(location.search);',
      sostituisci: "var attiva = false; // RomaRouter, arte di strada: si va dritti alla mappa, senza intro animata",
      motivo: "niente intro animata",
    },
    {
      file: T,
      cerca: "if (arrivatoConDeepLink || tourVisto() || presentazioneAttivaDaHash() ||",
      sostituisci: "if (true || arrivatoConDeepLink || tourVisto() || presentazioneAttivaDaHash() || // RomaRouter: niente guida automatica\n          ",
      motivo: "niente guida automatica",
    },
    {
      file: "vista-3d/aggancio.js",
      cerca: "else if (!leggiHash() && !/[?&]vista=2d\\b/.test(location.search)) {",
      sostituisci: "else if (false) { // RomaRouter, arte di strada: si apre in 2D (zone e verifica); la 3D resta dal tasto",
      motivo: "apertura in 2D",
    },
  ],
};

export default sezione;
