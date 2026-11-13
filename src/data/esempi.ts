/*
 * DATI DI ESEMPIO per la demo dell'interfaccia.
 * Nomi, codici, orari, posizioni e misure sono segnaposto: vanno sostituiti con i dataset delle sfide
 * (Postgres/PostGIS, schema `opendata`) e con i servizi della mappa (public/quartieri/servizi/servizi.json).
 * Nessun dato personale: gli oggetti hanno solo una descrizione pubblica.
 */
import type { Punto } from "@/lib/geo";

/* ---------- Zone e indirizzi (geocodifica di esempio) ---------- */

export const ZONE: Record<string, Punto & { nome: string; municipio: string }> = {
  testaccio: { nome: "Testaccio", municipio: "I", lat: 41.8769, lon: 12.4757 },
  trastevere: { nome: "Trastevere", municipio: "I", lat: 41.8894, lon: 12.4703 },
  ostiense: { nome: "Ostiense", municipio: "VIII", lat: 41.8705, lon: 12.4795 },
  aventino: { nome: "Aventino", municipio: "I", lat: 41.8834, lon: 12.4813 },
};

export const INDIRIZZI_ESEMPIO: Record<string, Punto & { etichetta: string }> = {
  "piazza testaccio": { etichetta: "Piazza Testaccio", lat: 41.8769, lon: 12.4757 },
  "via marmorata": { etichetta: "Via Marmorata", lat: 41.8792, lon: 12.4789 },
  "piazza di santa maria in trastevere": { etichetta: "Piazza di Santa Maria in Trastevere", lat: 41.8894, lon: 12.4703 },
  "viale aventino": { etichetta: "Viale Aventino", lat: 41.8807, lon: 12.4884 },
};

/* ---------- Sfida 4 · Impianti sportivi ---------- */

export type TipoImpianto = "comunale" | "scolastica" | "privato" | "libero";

export const TIPI_IMPIANTO: Record<TipoImpianto, string> = {
  comunale: "Comunale in concessione",
  scolastica: "Palestra scolastica aperta al quartiere",
  privato: "Privato",
  libero: "Area libera all'aperto",
};

export interface Impianto extends Punto {
  id: string;
  nome: string;
  tipo: TipoImpianto;
  discipline: string[];
  municipio: string;
  quartiere: string;
  accessibile: boolean | null;
  gratuito: boolean;
  orari: string | null;
  fonte: string;
  aggiornato: string;
}

export const IMPIANTI: Impianto[] = [
  {
    id: "playground-lungotevere-testaccio",
    nome: "Playground Lungotevere Testaccio",
    tipo: "libero",
    discipline: ["Basket 3x3"],
    municipio: "I",
    quartiere: "Testaccio",
    accessibile: true,
    gratuito: true,
    orari: "Sempre aperto, illuminato la sera",
    fonte: "OpenStreetMap, verificato dal Municipio",
    aggiornato: "2026-11-03",
    lat: 41.8783,
    lon: 12.4712,
  },
  {
    id: "centro-sportivo-testaccio",
    nome: "Centro Sportivo Testaccio",
    tipo: "comunale",
    discipline: ["Basket", "Calcio a 5", "Tennis", "Pallavolo"],
    municipio: "I",
    quartiere: "Testaccio",
    accessibile: true,
    gratuito: false,
    orari: null,
    fonte: "Censimento impianti di Roma Capitale, aggiornato dal gestore",
    aggiornato: "2026-11-10",
    lat: 41.8751,
    lon: 12.4769,
  },
  {
    id: "palestra-scolastica-via-marmorata",
    nome: "Palestra scolastica Via Marmorata",
    tipo: "scolastica",
    discipline: ["Basket", "Pallavolo"],
    municipio: "I",
    quartiere: "Testaccio",
    accessibile: null,
    gratuito: false,
    orari: "Sera dei feriali, su prenotazione",
    fonte: "Anagrafe dell'edilizia scolastica",
    aggiornato: "2026-10-28",
    lat: 41.8797,
    lon: 12.4792,
  },
  {
    id: "campetto-trastevere",
    nome: "Campetto Trastevere",
    tipo: "libero",
    discipline: ["Calcio", "Basket"],
    municipio: "I",
    quartiere: "Trastevere",
    accessibile: false,
    gratuito: true,
    orari: "Dalle 8 al tramonto",
    fonte: "OpenStreetMap",
    aggiornato: "2026-09-30",
    lat: 41.8866,
    lon: 12.4687,
  },
  {
    id: "palestra-comunale-aventino",
    nome: "Palestra comunale Aventino",
    tipo: "comunale",
    discipline: ["Pallavolo", "Ginnastica"],
    municipio: "I",
    quartiere: "Aventino",
    accessibile: true,
    gratuito: false,
    orari: null,
    fonte: "Censimento impianti di Roma Capitale",
    aggiornato: "2026-10-12",
    lat: 41.8826,
    lon: 12.4836,
  },
  {
    id: "campi-via-ostiense",
    nome: "Campi di Via Ostiense",
    tipo: "privato",
    discipline: ["Calcio a 5", "Padel"],
    municipio: "VIII",
    quartiere: "Ostiense",
    accessibile: true,
    gratuito: false,
    orari: null,
    fonte: "Scheda del gestore",
    aggiornato: "2026-11-01",
    lat: 41.8699,
    lon: 12.4819,
  },
  {
    id: "piscina-ostiense",
    nome: "Piscina Ostiense",
    tipo: "privato",
    discipline: ["Nuoto"],
    municipio: "VIII",
    quartiere: "Ostiense",
    accessibile: true,
    gratuito: false,
    orari: null,
    fonte: "Scheda del gestore",
    aggiornato: "2026-10-20",
    lat: 41.8664,
    lon: 12.4781,
  },
];

export const DISCIPLINE = Array.from(new Set(IMPIANTI.flatMap((i) => i.discipline))).sort((a, b) =>
  a.localeCompare(b, "it"),
);

/* ---------- Sfida 1 · Arte di strada ---------- */

export interface Postazione extends Punto {
  id: string;
  codice: string;
  luogo: string;
  quartiere: string;
  municipio: string;
  amplificazione: boolean;
  unesco: boolean;
}

export const POSTAZIONI: Postazione[] = [
  {
    id: "t-03",
    codice: "T-03",
    luogo: "Piazza di Santa Maria in Trastevere",
    quartiere: "Trastevere",
    municipio: "I",
    amplificazione: false,
    unesco: true,
    lat: 41.8893,
    lon: 12.4705,
  },
  {
    id: "t-01",
    codice: "T-01",
    luogo: "Piazza Trilussa",
    quartiere: "Trastevere",
    municipio: "I",
    amplificazione: false,
    unesco: true,
    lat: 41.8913,
    lon: 12.4697,
  },
  {
    id: "x-02",
    codice: "X-02",
    luogo: "Piazza Testaccio",
    quartiere: "Testaccio",
    municipio: "I",
    amplificazione: true,
    unesco: false,
    lat: 41.8771,
    lon: 12.4752,
  },
  {
    id: "o-01",
    codice: "O-01",
    luogo: "Via del Porto Fluviale",
    quartiere: "Ostiense",
    municipio: "VIII",
    amplificazione: true,
    unesco: false,
    lat: 41.8716,
    lon: 12.4789,
  },
];

export const TURNI = ["10:00–12:00", "12:00–14:00", "14:00–16:00", "16:00–18:00", "18:00–20:00"];

/** Occupazione dei turni, deterministica: in produzione arriva dalle prenotazioni. */
export function turnoOccupato(postazione: string, giorno: string, turno: number): boolean {
  let h = 0;
  for (const c of `${postazione}|${giorno}|${turno}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 5 === 0;
}

/* ---------- Sfida 2 · Antenne ---------- */

export interface Antenna extends Punto {
  id: string;
  codice: string;
  gestore: string;
  tecnologie: string[];
  stato: "attiva" | "autorizzata";
}

export const ANTENNE: Antenna[] = [
  { id: "srb-1012", codice: "SRB-1012", gestore: "Gestore A", tecnologie: ["4G", "5G"], stato: "attiva", lat: 41.8786, lon: 12.4777 },
  { id: "srb-1040", codice: "SRB-1040", gestore: "Gestore B", tecnologie: ["4G"], stato: "attiva", lat: 41.8758, lon: 12.4731 },
  { id: "srb-1077", codice: "SRB-1077", gestore: "Gestore C", tecnologie: ["5G"], stato: "autorizzata", lat: 41.8818, lon: 12.4826 },
  { id: "srb-0954", codice: "SRB-0954", gestore: "Gestore A", tecnologie: ["4G", "5G"], stato: "attiva", lat: 41.8884, lon: 12.4682 },
  { id: "srb-1103", codice: "SRB-1103", gestore: "Gestore B", tecnologie: ["5G"], stato: "attiva", lat: 41.8701, lon: 12.4805 },
];

export interface Misura extends Punto {
  id: string;
  valore: number;
  data: string;
}

export const MISURE_ARPA: Misura[] = [
  { id: "m-201", valore: 0.9, data: "2026-10-14", lat: 41.8777, lon: 12.4771 },
  { id: "m-202", valore: 1.4, data: "2026-09-22", lat: 41.8752, lon: 12.4722 },
  { id: "m-203", valore: 0.6, data: "2026-10-02", lat: 41.8889, lon: 12.4691 },
  { id: "m-204", valore: 2.1, data: "2026-08-30", lat: 41.8709, lon: 12.4797 },
];

/** Valore di attenzione e obiettivo di qualità (L. 214/2023, art. 10). */
export const VALORE_ATTENZIONE_V_M = 15;

export type TipoSito = "scuola" | "nido" | "area_giochi" | "ospedale";

export const TIPI_SITO: Record<TipoSito, { singolare: string; plurale: string }> = {
  scuola: { singolare: "scuola", plurale: "scuole" },
  nido: { singolare: "nido", plurale: "nidi" },
  area_giochi: { singolare: "area giochi", plurale: "aree giochi" },
  ospedale: { singolare: "ospedale", plurale: "ospedali" },
};

export interface SitoSensibile extends Punto {
  id: string;
  nome: string;
  tipo: TipoSito;
}

export const SITI_SENSIBILI: SitoSensibile[] = [
  { id: "s-1", nome: "Scuola primaria (esempio)", tipo: "scuola", lat: 41.8781, lon: 12.4741 },
  { id: "s-2", nome: "Nido comunale (esempio)", tipo: "nido", lat: 41.8758, lon: 12.4778 },
  { id: "s-3", nome: "Area giochi (esempio)", tipo: "area_giochi", lat: 41.8754, lon: 12.4749 },
  { id: "s-4", nome: "Scuola media (esempio)", tipo: "scuola", lat: 41.8812, lon: 12.4801 },
  { id: "s-5", nome: "Scuola dell'infanzia (esempio)", tipo: "scuola", lat: 41.8879, lon: 12.4712 },
  { id: "s-6", nome: "Area giochi (esempio)", tipo: "area_giochi", lat: 41.8901, lon: 12.4688 },
  { id: "s-7", nome: "Presidio sanitario (esempio)", tipo: "ospedale", lat: 41.8695, lon: 12.4831 },
];

/* ---------- Sfida 3 · Oggetti smarriti ---------- */

export type CategoriaOggetto = "borse" | "documenti" | "elettronica" | "chiavi" | "abbigliamento" | "ombrelli";

export const CATEGORIE_OGGETTI: Record<CategoriaOggetto, string> = {
  borse: "Borse, zaini e portafogli",
  documenti: "Documenti",
  elettronica: "Telefoni ed elettronica",
  chiavi: "Chiavi",
  abbigliamento: "Abbigliamento",
  ombrelli: "Ombrelli",
};

export type LuogoRitrovamento = "mezzi" | "strada" | "taxi";

export const LUOGHI_RITROVAMENTO: Record<LuogoRitrovamento, string> = {
  mezzi: "Mezzo pubblico",
  strada: "In strada",
  taxi: "Taxi",
};

export interface Oggetto {
  codice: string;
  categoria: CategoriaOggetto;
  descrizione: string;
  colore: string | null;
  data: string;
  luogo: LuogoRitrovamento;
  stato: "custodia" | "ritiro";
}

export const OGGETTI: Oggetto[] = [
  { codice: "OR-26-04812", categoria: "borse", descrizione: "Zaino nero con tasca frontale", colore: "nero", data: "2026-11-12", luogo: "mezzi", stato: "custodia" },
  { codice: "OR-26-04797", categoria: "borse", descrizione: "Zaino nero con logo sportivo", colore: "nero", data: "2026-11-12", luogo: "strada", stato: "custodia" },
  { codice: "OR-26-04760", categoria: "borse", descrizione: "Zainetto nero da bambino", colore: "nero", data: "2026-11-13", luogo: "mezzi", stato: "ritiro" },
  { codice: "OR-26-04755", categoria: "documenti", descrizione: "Documento d'identità", colore: null, data: "2026-11-11", luogo: "strada", stato: "custodia" },
  { codice: "OR-26-04731", categoria: "elettronica", descrizione: "Smartphone con cover rossa", colore: "rosso", data: "2026-11-10", luogo: "taxi", stato: "custodia" },
  { codice: "OR-26-04702", categoria: "chiavi", descrizione: "Mazzo di tre chiavi con portachiavi a forma di gatto", colore: null, data: "2026-11-09", luogo: "mezzi", stato: "custodia" },
  { codice: "OR-26-04688", categoria: "ombrelli", descrizione: "Ombrello pieghevole blu", colore: "blu", data: "2026-11-08", luogo: "mezzi", stato: "custodia" },
  { codice: "OR-26-04655", categoria: "abbigliamento", descrizione: "Giacca a vento verde", colore: "verde", data: "2026-11-06", luogo: "strada", stato: "custodia" },
  { codice: "OR-26-04640", categoria: "borse", descrizione: "Borsa a tracolla marrone", colore: "marrone", data: "2026-11-05", luogo: "taxi", stato: "custodia" },
  { codice: "OR-26-04612", categoria: "elettronica", descrizione: "Auricolari bianchi nella custodia", colore: "bianco", data: "2026-11-04", luogo: "mezzi", stato: "custodia" },
];

export const UFFICIO_OGGETTI = {
  nome: "Ufficio Oggetti Rinvenuti",
  indirizzo: "Circonvallazione Ostiense 191",
  nota: "Indirizzo e orari da verificare con il Comune prima della demo.",
};

/* ---------- Fiume, per le anteprime schematiche della mappa ---------- */

/** Tracciato approssimato del Tevere nella zona della demo (solo per l'anteprima schematica). */
export const TEVERE: Punto[] = [
  { lat: 41.8952, lon: 12.4686 },
  { lat: 41.8925, lon: 12.4706 },
  { lat: 41.8908, lon: 12.4752 },
  { lat: 41.8889, lon: 12.4791 },
  { lat: 41.8852, lon: 12.4777 },
  { lat: 41.8817, lon: 12.4749 },
  { lat: 41.8785, lon: 12.4699 },
  { lat: 41.8760, lon: 12.4672 },
  { lat: 41.8722, lon: 12.4683 },
  { lat: 41.8676, lon: 12.4712 },
  { lat: 41.8630, lon: 12.4728 },
];
