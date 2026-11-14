import type { AttivitaArte } from "@/lib/orari-arte";
import { GLIFI } from "../mappa-rr/icone";

/** Le cinque arti: nome, glifo, colore e verbo ("dove puoi suonare"). */
export const ATT: { k: AttivitaArte; n: string; g: string; c: string; verbo: string }[] = [
  { k: "musica", n: "Musica", g: GLIFI.chitarra, c: "#C2185B", verbo: "suonare" },
  { k: "silenziosa", n: "Silenziosa", g: GLIFI.maschera, c: "#7B4FD0", verbo: "esibirti" },
  { k: "fuoco", n: "Fuoco", g: GLIFI.fuoco, c: "#E4572E", verbo: "fare il fuoco" },
  { k: "figurativa", n: "Ritratti", g: GLIFI.pennello, c: "#1E7FD8", verbo: "fare ritratti" },
  { k: "esoterica", n: "Tarocchi", g: GLIFI.stella, c: "#795548", verbo: "leggere le carte" },
];
export const att = (k: string) => ATT.find((a) => a.k === k) ?? ATT[0];
