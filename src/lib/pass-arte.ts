import type { AttivitaArte } from "@/lib/orari-arte";

/* Il Pass dell'artista: tipi e regole in comune tra server (sportello) e mappa (registrazione). */

export interface Pass {
  id: string; numero_pass: string; nome: string | null; cognome: string | null; email: string | null; identita: string | null;
  nome_arte: string; disciplina: string; attivita: AttivitaArte; gruppo_grande: boolean; amplificazione: boolean; cover: boolean;
  fuoco_oltre_due: boolean; posto_assegnato: string | null; delega: boolean; creato_il: string;
}
export interface Regola { testo: string; tono: "ok" | "info" | "attenzione" }
export interface MiaPrenotazione {
  id: string; luogo: string | null; inizio: string; fine: string; gruppo_pl: string | null; preavviso_il: string | null;
  siae_il: string | null; nulla_osta: string | null; lat: number; lon: number;
}
export interface StatoPass { pass: Pass | null; regole?: Regola[]; prenotazioni?: MiaPrenotazione[]; prima_data: string }
export interface Passo { fatto: boolean; testo: string }
export interface EsitoPrenota { id: string; luogo: string; inizio: string; fine: string; gruppo_pl: string | null; passi: Passo[] }

type Risposte = Pick<Pass, "attivita" | "gruppo_grande" | "amplificazione" | "cover" | "fuoco_oltre_due" | "posto_assegnato">;

/** Le regole che valgono per questo artista, scritte per lui. */
export function regoleDelPass(p: Risposte): Regola[] {
  const r: Regola[] = [];
  if (p.gruppo_grande) r.push({ testo: "Tipo 1 (gruppo oltre 5, impianti potenti o scenografie): con nulla osta del Municipio. Lo chiediamo noi.", tono: "attenzione" });
  else r.push({ testo: "Tipo 2: puoi esibirti in tutte le zone verdi della mappa.", tono: "ok" });
  if (p.amplificazione) r.push({ testo: "Con amplificazione: niente palchi dell'Allegato B né parchi.", tono: "attenzione" });
  else if (p.attivita === "musica") r.push({ testo: "Senza amplificazione: anche i palchi ufficiali del centro.", tono: "ok" });
  if (p.cover) r.push({ testo: "Brani di altri: licenza SIAE. Ti mettiamo noi nell'elenco settimanale.", tono: "info" });
  if (p.attivita === "fuoco") r.push({ testo: p.fuoco_oltre_due ? "Fuoco in più di due: estintore e coperta ignifuga, 5 m dal pubblico." : "Fuoco: 5 m dal pubblico (art. 5).", tono: "info" });
  if (p.attivita === "figurativa") r.push({ testo: p.posto_assegnato ? `Ritratti: posto assegnato ${p.posto_assegnato}.` : "Ritratti: serve il posto assegnato dal Comune (DGC 154/2026).", tono: p.posto_assegnato ? "ok" : "attenzione" });
  if (p.attivita === "esoterica") r.push({ testo: "Cartomanzia: solo nelle aree dell'art. 13, dalle 16 alle 24.", tono: "info" });
  r.push({ testo: "Preavviso alla Polizia Locale: lo mandiamo noi. Prenota 3 giorni prima.", tono: "ok" });
  return r;
}
