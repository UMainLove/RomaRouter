// I colori e i caratteri del sito (src/app/globals.css), piu' il fondo del film.
export const C = {
  fondo: "#F3EDE3",
  fondoScuro: "#E8DFD0",
  ink: "#251D1C",
  inkSoft: "#3E3634",
  muted: "#5F5654",
  amaranto: "#8E001C",
  porpora: "#B0183A",
  porporaScuro: "#6E0016",
  oro: "#C9A24A",
  oroChiaro: "#F1D58A",
  oggetti: "#A8327E",
  oggettiInk: "#86245F",
  sport: "#12A06E",
  sportInk: "#0A6B49",
  arte: "#D4691A",
  arteInk: "#9A4A10",
  antenne: "#2A6FD6",
  antenneInk: "#1F55A8",
};

export type Ambito = "oggetti" | "sport" | "arte" | "antenne";

export const AMBITI: Record<Ambito, { n: string; nome: string; invito: string; colore: string; ink: string }> = {
  oggetti: { n: "01", nome: "Oggetti smarriti", invito: "Roma restituisce quasi tutto", colore: C.oggetti, ink: C.oggettiInk },
  sport: { n: "02", nome: "Impianti sportivi", invito: "C'è un campo che ti aspetta", colore: C.sport, ink: C.sportInk },
  arte: { n: "03", nome: "Artisti di strada", invito: "La città è un palcoscenico", colore: C.arte, ink: C.arteInk },
  antenne: { n: "04", nome: "Antenne", invito: "Che cosa c'è sopra i tetti", colore: C.antenne, ink: C.antenneInk },
};

export const FONT = "Montserrat, system-ui, sans-serif";
export const FONT_MARCHIO = "'Titillium Web', Montserrat, sans-serif";
