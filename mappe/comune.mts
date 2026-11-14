// Modifiche comuni a tutte le mappe di RomaRouter, applicate alla copia di mappe/base durante la build.
// Ogni sostituzione dichiara quante volte deve trovare il testo: se la base cambia, la build si ferma.

export interface Patch {
  /** File relativo alla radice della base (es. "mappa-quartieri.template.html"). */
  file: string;
  cerca: string | RegExp;
  sostituisci: string;
  /** Occorrenze attese (default 1). "almeno" = una o più. Con RegExp usare il flag g. */
  volte?: number | "almeno";
  motivo: string;
}

export interface Sezione {
  slug: string;
  /** Titolo della pagina e del tab, es. "Antenne di telefonia mobile". */
  titolo: string;
  /** HTML del titolo in testata; lo <span> prende il colore del brand. */
  titoloHtml: string;
  sottotitolo: string;
  descrizione: string;
  /** File CSS e JS della sezione (relativi alla sua cartella), iniettati nel bundle. */
  css?: string;
  js?: string;
  /** Icone SVG da rendere disponibili al JS come RR_ICONE[chiave] (percorsi relativi alla radice del repo). */
  icone?: Record<string, string>;
  patch?: Patch[];
}

const T = "mappa-quartieri.template.html";
const A3D = "vista-3d/vista-3d.js";

/** PNG trasparente 1×1: sostituisce il logo Urbe Hub (il marker del build deve restare). */
export const PNG_VUOTO = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function patchComuni(s: Sezione): Patch[] {
  return [
    // --- Testa del documento -------------------------------------------------------------
    {
      file: T, cerca: "<title>Quartieri di Roma 2026</title>",
      sostituisci: `<title>${esc(s.titolo)} · RomaRouter</title>`,
      motivo: "titolo della sezione",
    },
    {
      file: T, cerca: /<meta name="description" content="[^"]*">/g,
      sostituisci: `<meta name="description" content="${esc(s.descrizione)}">`,
      motivo: "descrizione della sezione",
    },
    {
      file: T, cerca: /^<meta (?:property="og:|name="twitter:)[^\n]*\n/gm, sostituisci: "", volte: "almeno",
      motivo: "anteprime social di romaquartieri.it e del marchio Urbe Hub",
    },
    {
      file: T, cerca: /^<link rel="canonical"[^\n]*\n/gm, sostituisci: "",
      motivo: "indirizzo canonico del sito originale",
    },
    {
      file: T, cerca: '<meta name="viewport" content="width=device-width, initial-scale=1">',
      sostituisci:
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
        "<script>\n" +
        "  // RomaRouter: ?incorporata=1 quando la mappa sta in un iframe dentro una pagina del sito\n" +
        "  // (la pagina ha gia' titolo e numeri: qui si nascondono testata e cifre della striscia).\n" +
        '  if (/[?&]incorporata=1\\b/.test(location.search)) document.documentElement.classList.add("rr-incorporata");\n' +
        "</script>",
      motivo: "modalità incorporata",
    },

    // --- Testata e marchio -----------------------------------------------------------------
    {
      file: T,
      cerca: "<h1>Quartieri di Roma <span>2026</span></h1>\n      <p>La nuova geografia amministrativa della citt&agrave;</p>",
      sostituisci: `<h1>${s.titoloHtml}</h1>\n      <p>${esc(s.sottotitolo)}</p>`,
      motivo: "titolo della sezione in testata",
    },
    {
      file: T,
      cerca:
        '<div class="donor">\n    <span>un progetto di</span>\n    <a href="https://hub.urbe.build/"><img src="<<URBE_LOGO>>" alt="Urbe Hub"></a>\n  </div>',
      sostituisci:
        '<div class="donor rr-donor">\n    <span>RomaRouter · mappa di base</span>\n' +
        '    <a href="https://github.com/urbe-hub/quartieri-roma-2026" target="_blank" rel="noopener">Quartieri di Roma 2026</a>\n' +
        '    <span hidden data-rr-logo="<<URBE_LOGO>>"></span>\n  </div>',
      motivo: "nome e logo di Urbe Hub non coperti dalla licenza MIT",
    },
    {
      file: T,
      cerca:
        ' o scrivi a <a href="mailto:hello@urbe.build?subject=Segnalazione%20mappa%20quartieri">hello@urbe.build</a>',
      sostituisci: "", motivo: "contatto del progetto originale",
    },
    {
      file: T, cerca: '<div class="ab-foot">Un progetto di Urbe Hub con i dati aperti di Roma Capitale.</div>',
      sostituisci:
        '<div class="ab-foot">RomaRouter, sulla base della mappa «Quartieri di Roma 2026» (licenza MIT), con i dati aperti di Roma Capitale.</div>',
      motivo: "piede del pannello informazioni",
    },
    {
      file: T,
      cerca:
        'se manca una via, <a href="mailto:hello@urbe.build?subject=Segnalazione%20mappa%20quartieri">segnalacela</a>.',
      sostituisci: "se manca una via, prova con un nome simile o col municipio.",
      motivo: "contatto del progetto originale",
    },
    {
      file: T,
      cerca: '<div class="tc-donor" id="tour-donor" hidden><span>un progetto di</span><img alt="Urbe Hub"></div>',
      sostituisci: '<div class="tc-donor" id="tour-donor" hidden><span>RomaRouter · mappa di base Quartieri di Roma 2026</span><img alt="" hidden></div>',
      motivo: "firma dell'ultimo passo della guida",
    },
    {
      file: T, cerca: /Una mappa di Urbe Hub con i dati aperti di Roma Capitale\./g, volte: 2,
      sostituisci: "Basata sulla mappa Quartieri di Roma 2026, con i dati aperti di Roma Capitale.",
      motivo: "testi della guida",
    },

    // --- Stradario e 3D condivisi tra le mappe in public/mappe/_comune/ ---------------------
    {
      file: T,
      cerca: 'function conVersione(url, gruppo) { return VERSIONI[gruppo] ? url + "?v=" + VERSIONI[gruppo] : url; }',
      sostituisci:
        "// RomaRouter: stradario e 3D sono uguali per tutte le mappe e stanno una volta sola in ../_comune/\n" +
        '  var RR_CONDIVISI = { strade: "../_comune/", "3d": "../_comune/" };\n' +
        '  function conVersione(url, gruppo) { url = (RR_CONDIVISI[gruppo] || "") + url; return VERSIONI[gruppo] ? url + "?v=" + VERSIONI[gruppo] : url; }',
      motivo: "file condivisi tra le sezioni",
    },
    {
      file: T, cerca: 'href="3d/LICENSE-maplibre-gl.txt"', sostituisci: 'href="../_comune/3d/LICENSE-maplibre-gl.txt"',
      motivo: "licenza MapLibre nella cartella condivisa",
    },

    // --- Aggancio della 3D: quando e' pronta passa la mappa MapLibre alla sezione -------------
    {
      file: A3D,
      cerca: 'S.pronta = true; S.el.setAttribute("data-stato", "pronta");',
      sostituisci:
        'S.pronta = true; S.el.setAttribute("data-stato", "pronta");\n' +
        "    // RomaRouter: la sezione puo' aggiungere i suoi livelli alla 3D (evento ripetuto a ogni arrivo)\n" +
        '    try { window.dispatchEvent(new CustomEvent("rr:mappa3d", { detail: S.map })); } catch (e) {}',
      motivo: "livelli delle sezioni anche in 3D",
    },
  ];
}

/** CSS comune a tutte le sezioni (iniettato dopo quello della vista 3D). */
export const CSS_COMUNE = `
/* ---------- RomaRouter: comune a tutte le mappe ---------- */
#topbar .rr-donor { display: flex; align-items: baseline; gap: 6px; font-size: 12px; color: var(--muted); white-space: nowrap; }
#topbar .rr-donor a { color: var(--ink-soft); font-weight: 700; text-decoration: none; border-bottom: 1px solid var(--line); }
#topbar .rr-donor a:hover { color: var(--amaranto); border-color: var(--amaranto); }
@media (max-width: 720px) { #topbar .rr-donor { display: none; } }
/* Incorporata: la pagina che la ospita ha gia' titolo e numeri */
html.rr-incorporata #topbar, html.rr-incorporata #amaranto-rule, html.rr-incorporata #overview-stats { display: none !important; }
html.rr-incorporata #overview { justify-content: flex-end; }
`;
