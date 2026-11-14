import type { IconName } from "@/components/Icon";

export type AmbitoId = "oggetti" | "sport" | "antenne" | "arte";

/** Le cinque voci della home: i quattro ambiti e "Non è tra questi?". */
export type VoceId = AmbitoId | "altro";

/** Forma del segnaposto sulla mappa: colore, forma e icona insieme, mai il colore da solo. */
export type Forma = "rombo" | "cerchio" | "quadrato" | "goccia";

export interface Voce {
  id: VoceId;
  nome: string;
  /** Etichetta corta per il selettore in testata. */
  corto: string;
  breve: string;
  href: string;
  icona: IconName;
  /** Esempio dentro la barra di ricerca. */
  segnaposto: string;
  /** Richieste d'esempio sotto la barra (devono funzionare anche col router a parole chiave). */
  esempi: string[];
}

export interface Ambito extends Voce {
  id: AmbitoId;
  forma: Forma;
  /** Classi Tailwind scritte per intero, così il compilatore le trova. */
  classi: { segno: string; testo: string; tinta: string; bordo: string };
}

export const AMBITI: Record<AmbitoId, Ambito> = {
  oggetti: {
    id: "oggetti",
    nome: "Oggetti smarriti",
    corto: "Oggetti",
    breve: "Segnala uno smarrimento o consegna un oggetto ritrovato",
    href: "/oggetti",
    icona: "chiave",
    forma: "rombo",
    segnaposto: "Es. zaino nero perso sul tram ieri",
    esempi: ["Ho perso lo zaino sul tram 8 ieri sera", "Chiavi perse sull'autobus"],
    classi: { segno: "bg-oggetti", testo: "text-oggetti-ink", tinta: "bg-oggetti-tint", bordo: "border-oggetti" },
  },
  sport: {
    id: "sport",
    nome: "Impianti sportivi",
    corto: "Sport",
    breve: "Campi e palestre per disciplina, prezzo e accessibilità",
    href: "/sport",
    icona: "palla",
    forma: "cerchio",
    segnaposto: "Es. basket gratis vicino a Testaccio",
    esempi: ["Basket gratis vicino a Testaccio", "Piscina accessibile a Ostiense"],
    classi: { segno: "bg-sport", testo: "text-sport-ink", tinta: "bg-sport-tint", bordo: "border-sport" },
  },
  antenne: {
    id: "antenne",
    nome: "Antenne",
    corto: "Antenne",
    breve: "Impianti, misure ARPA e siti sensibili entro 300 m",
    href: "/antenne",
    icona: "antenna",
    forma: "quadrato",
    segnaposto: "Es. Piazza Testaccio, vicino alla scuola",
    esempi: ["Antenne vicino a Piazza Testaccio", "C'è un'antenna 5G in Via Marmorata?"],
    classi: { segno: "bg-antenne", testo: "text-antenne-ink", tinta: "bg-antenne-tint", bordo: "border-antenne" },
  },
  arte: {
    id: "arte",
    nome: "Artisti di strada",
    corto: "Artisti",
    breve: "Postazioni e turni per esibirsi, e chi si esibisce oggi",
    href: "/arte",
    icona: "nota",
    forma: "goccia",
    segnaposto: "Es. voglio suonare a Trastevere sabato",
    esempi: ["Voglio suonare a Trastevere sabato", "Chi si esibisce stasera a Testaccio?"],
    classi: { segno: "bg-arte", testo: "text-arte-ink", tinta: "bg-arte-tint", bordo: "border-arte" },
  },
};

/** "Non è tra questi?": l'assistente generale, che porta a un ambito o al portale del Comune. */
export const ALTRO: Voce = {
  id: "altro",
  nome: "Non è tra questi?",
  corto: "Altro",
  breve: "Scrivi cosa ti serve: ti porto al servizio giusto",
  href: "/altro",
  icona: "cerca",
  segnaposto: "Scrivi cosa ti serve…",
  esempi: ["Ho lasciato il telefono in taxi", "Come rinnovo la carta d'identità?"],
};

export const ORDINE_AMBITI: AmbitoId[] = ["oggetti", "sport", "antenne", "arte"];

export const VOCI: Voce[] = [...ORDINE_AMBITI.map((id) => AMBITI[id]), ALTRO];

export function voce(id: VoceId): Voce {
  return id === "altro" ? ALTRO : AMBITI[id];
}

export function eAmbito(valore: unknown): valore is AmbitoId {
  return typeof valore === "string" && (ORDINE_AMBITI as string[]).includes(valore);
}
