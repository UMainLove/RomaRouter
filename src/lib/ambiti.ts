import type { IconName } from "@/components/Icon";

export type AmbitoId = "oggetti" | "sport" | "antenne" | "arte";

export type Forma = "cerchio" | "quadrato" | "goccia";

export interface Ambito {
  id: AmbitoId;
  nome: string;
  breve: string;
  descrizione: string;
  href: string;
  icona: IconName;
  /** Forma del segnaposto sulla mappa comune (null: non sta sulla mappa). */
  forma: Forma | null;
  /** Classi Tailwind scritte per intero, così il compilatore le trova. */
  classi: { segno: string; testo: string; tinta: string; bordo: string };
  azioni: { etichetta: string; href: string }[];
}

export const AMBITI: Record<AmbitoId, Ambito> = {
  oggetti: {
    id: "oggetti",
    nome: "Oggetti smarriti",
    breve: "Cerca e ritira",
    descrizione:
      "Cerca tra gli oggetti ritrovati in città per tipo e data, poi prenota il ritiro, anche con delega.",
    href: "/oggetti",
    icona: "chiave",
    forma: null,
    classi: {
      segno: "bg-oggetti",
      testo: "text-oggetti-ink",
      tinta: "bg-oggetti-tint",
      bordo: "border-oggetti",
    },
    azioni: [
      { etichetta: "Cerca un oggetto", href: "/oggetti" },
      { etichetta: "Come funziona il ritiro", href: "/oggetti#ritiro" },
    ],
  },
  sport: {
    id: "sport",
    nome: "Impianti sportivi",
    breve: "Dove fare sport",
    descrizione:
      "Impianti comunali, palestre scolastiche aperte al quartiere e privati, per disciplina e accessibilità.",
    href: "/sport",
    icona: "palla",
    forma: "cerchio",
    classi: {
      segno: "bg-sport",
      testo: "text-sport-ink",
      tinta: "bg-sport-tint",
      bordo: "border-sport",
    },
    azioni: [
      { etichetta: "Trova un impianto", href: "/sport" },
      { etichetta: "Vedi sulla mappa", href: "/mappa?livelli=sport" },
    ],
  },
  antenne: {
    id: "antenne",
    nome: "Antenne",
    breve: "Impianti e misure",
    descrizione:
      "Gli impianti di telefonia con le misure ARPA Lazio e la verifica dei siti sensibili entro 300 m da un indirizzo.",
    href: "/antenne",
    icona: "antenna",
    forma: "quadrato",
    classi: {
      segno: "bg-antenne",
      testo: "text-antenne-ink",
      tinta: "bg-antenne-tint",
      bordo: "border-antenne",
    },
    azioni: [
      { etichetta: "Verifica un indirizzo", href: "/antenne" },
      { etichetta: "Vedi sulla mappa", href: "/mappa?livelli=antenne" },
    ],
  },
  arte: {
    id: "arte",
    nome: "Arte di strada",
    breve: "Postazioni e turni",
    descrizione:
      "Per gli artisti: postazioni, turni e prenotazione. Per chi passeggia: chi si esibisce oggi e dove.",
    href: "/arte",
    icona: "nota",
    forma: "goccia",
    classi: {
      segno: "bg-arte",
      testo: "text-arte-ink",
      tinta: "bg-arte-tint",
      bordo: "border-arte",
    },
    azioni: [
      { etichetta: "Prenota una postazione", href: "/arte" },
      { etichetta: "Vedi sulla mappa", href: "/mappa?livelli=arte" },
    ],
  },
};

export const ORDINE_AMBITI: AmbitoId[] = ["oggetti", "sport", "antenne", "arte"];

/** Ambiti che stanno sulla mappa comune (sfide 1, 2 e 4). */
export const LIVELLI_MAPPA: AmbitoId[] = ["sport", "antenne", "arte"];
