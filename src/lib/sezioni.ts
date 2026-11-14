// Le quattro sezioni del sito. Ognuna è un tool indipendente con il proprio database:
// i dati di una sezione non compaiono mai nelle altre.

export const SEZIONI = [
  {
    slug: "artisti-di-strada",
    numero: "01",
    titolo: "Artisti di strada",
    sottotitolo: "Dove esibirsi e come prenotare",
    descrizione: "Una mappa delle postazioni con regole, fasce orarie e prenotazioni.",
    database: "rr_artisti_strada",
    envVar: "DATABASE_URL_ARTISTI",
  },
  {
    slug: "antenne",
    numero: "02",
    titolo: "Antenne di telefonia mobile",
    sottotitolo: "Conoscere gli impianti sul territorio",
    descrizione: "Una mappa con impianti, misure e informazioni sul contesto.",
    database: "rr_antenne",
    envVar: "DATABASE_URL_ANTENNE",
  },
  {
    slug: "oggetti-smarriti",
    numero: "03",
    titolo: "Oggetti smarriti",
    sottotitolo: "Segnalazione protetta, consegna e restituzione",
    descrizione: "Catalogo consultabile esclusivamente dal backend operatori, con flusso protetto per inserimento e restituzione.",
    database: "rr_oggetti_smarriti",
    envVar: "DATABASE_URL_SMARRITI",
  },
  {
    slug: "impianti-sportivi",
    numero: "04",
    titolo: "Impianti sportivi",
    sottotitolo: "Sapere dove praticare sport",
    descrizione: "Una mappa filtrabile per disciplina, Municipio e accessibilità.",
    database: "rr_impianti_sportivi",
    envVar: "DATABASE_URL_SPORT",
  },
] as const;

export type Sezione = (typeof SEZIONI)[number]["slug"];

export function trovaSezione(slug: string) {
  return SEZIONI.find((s) => s.slug === slug);
}
