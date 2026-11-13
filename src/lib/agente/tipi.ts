import type { AmbitoId } from "@/lib/ambiti";

/**
 * Contratto tra l'interfaccia e l'agente (POST /api/agente).
 * L'instradamento a parole chiave in `instrada.ts` è il fallback della demo:
 * chi lavora sull'agente LLM deve solo restituire una RispostaAgente con questa forma.
 */

export type AmbitoRisposta = AmbitoId | "altro";

/** Un dato estratto dalla richiesta, mostrato come chip modificabile. */
export interface Entita {
  chiave: string;
  etichetta: string;
  /** Parametro dell'URL di destinazione che questo dato imposta (togliendo il chip si toglie il parametro). */
  parametro?: string;
  valore?: string;
}

export interface Opzione {
  valore: string;
  etichetta: string;
}

/** Al massimo una domanda di chiarimento, con risposte rapide. */
export interface Domanda {
  chiave: string;
  testo: string;
  opzioni: Opzione[];
}

export interface Destinazione {
  base: string;
  parametri: Record<string, string>;
  etichetta: string;
}

export interface RichiestaAgente {
  /** Tutto quello che il cittadino ha scritto finora, nell'ordine. */
  messaggi: string[];
  /** Risposte rapide già date (chiave della domanda → valore). */
  risposte?: Record<string, string>;
  /** Ambito scelto a mano con "Cambia". */
  ambitoForzato?: AmbitoRisposta;
}

export interface RispostaAgente {
  ambito: AmbitoRisposta | null;
  messaggio: string;
  entita: Entita[];
  domanda?: Domanda;
  perche?: string;
  fonte?: string;
  destinazione?: Destinazione;
  /** Pagina esterna ufficiale, quando la richiesta è fuori dai quattro ambiti. */
  esterno?: { href: string; etichetta: string };
  /** Avviso utile (es. treni e aeroporti hanno un proprio ufficio). */
  avviso?: string;
}

export function hrefDestinazione(d: Destinazione, escludi: string[] = []): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(d.parametri)) if (!escludi.includes(k) && v) qs.set(k, v);
  const s = qs.toString();
  return s ? `${d.base}?${s}` : d.base;
}
