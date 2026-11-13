// Mappa della sezione "Antenne di telefonia mobile".
// Base: Quartieri di Roma 2026 (quartieri, municipi, ricerca vie, 2D/3D).
// Sopra: le richieste di antenne, i siti sensibili, le aree vincolate e le centraline ARPA,
// letti dal database rr_antenne attraverso /api/antenne/* (vedi mappe/antenne/antenne.js).
import type { Sezione } from "../comune.mts";

const T = "mappa-quartieri.template.html";

const sezione: Sezione = {
  slug: "antenne",
  titolo: "Antenne di telefonia mobile",
  titoloHtml: "Antenne <span>di Roma</span>",
  sottotitolo: "Richieste di impianti, siti sensibili e aree vincolate",
  descrizione:
    "Mappa delle antenne di telefonia mobile a Roma: le richieste di installazione e modifica pubblicate da Roma Capitale, i siti sensibili e le aree vincolate, con la ricerca delle vie.",
  css: "antenne.css",
  js: "antenne.js",
  icone: {
    antenna: "docs/mappa/icone/antenna.svg",
    centralina: "docs/mappa/icone/misura-arpa.svg",
  },
  patch: [
    {
      file: T,
      cerca: 'var attiva = !location.hash.replace(/^#/, "") && !ridotto && !/[?&]intro=no\\b/.test(location.search);',
      sostituisci: "var attiva = false; // RomaRouter, antenne: si va dritti alla mappa, senza intro animata",
      motivo: "niente intro animata",
    },
    {
      file: T,
      cerca: "if (arrivatoConDeepLink || tourVisto() || presentazioneAttivaDaHash() ||",
      sostituisci: "if (true || arrivatoConDeepLink || tourVisto() || presentazioneAttivaDaHash() || // RomaRouter: niente guida automatica\n          ",
      motivo: "niente guida automatica (racconta la geografia, non le antenne)",
    },
    {
      file: "vista-3d/aggancio.js",
      cerca: "else if (!leggiHash() && !/[?&]vista=2d\\b/.test(location.search)) {",
      sostituisci: "else if (false) { // RomaRouter, antenne: si apre in 2D (ricerca e livelli completi); la 3D resta dal tasto",
      motivo: "apertura in 2D",
    },
  ],
};

export default sezione;
