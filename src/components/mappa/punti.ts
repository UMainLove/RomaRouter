import { ANTENNE, IMPIANTI, POSTAZIONI, TIPI_IMPIANTO, UFFICIO_OGGETTI } from "@/data/esempi";
import type { AmbitoId } from "@/lib/ambiti";
import type { Punto } from "@/lib/geo";

export interface PuntoMappa extends Punto {
  id: string;
  ambito: AmbitoId;
  nome: string;
  dettaglio: string;
  href: string;
  /** Al posto dell'icona, un numero (es. oggetti trovati in una zona). */
  conteggio?: number;
}

export function puntoImpianto(i: (typeof IMPIANTI)[number]): PuntoMappa {
  return {
    id: i.id,
    ambito: "sport",
    nome: i.nome,
    dettaglio: `${TIPI_IMPIANTO[i.tipo]} · ${i.discipline.join(", ")}`,
    href: `/sport/${i.id}`,
    lat: i.lat,
    lon: i.lon,
  };
}

export function puntoAntenna(a: (typeof ANTENNE)[number]): PuntoMappa {
  return {
    id: a.id,
    ambito: "antenne",
    nome: `Impianto ${a.codice}`,
    dettaglio: `${a.gestore} · ${a.tecnologie.join(", ")} · ${a.stato === "attiva" ? "attivo" : "autorizzato"}`,
    href: `/antenne?lat=${a.lat}&lon=${a.lon}`,
    lat: a.lat,
    lon: a.lon,
  };
}

export function puntoPostazione(p: (typeof POSTAZIONI)[number]): PuntoMappa {
  return {
    id: p.id,
    ambito: "arte",
    nome: `Postazione ${p.codice}`,
    dettaglio: `${p.luogo} · Municipio ${p.municipio}`,
    href: `/arte/${p.id}`,
    lat: p.lat,
    lon: p.lon,
  };
}

export const PUNTO_UFFICIO: PuntoMappa = {
  id: "ufficio-oggetti",
  ambito: "oggetti",
  nome: UFFICIO_OGGETTI.nome,
  dettaglio: `${UFFICIO_OGGETTI.indirizzo} · posizione indicativa`,
  href: "/oggetti",
  lat: UFFICIO_OGGETTI.lat,
  lon: UFFICIO_OGGETTI.lon,
};

/** Tutti i punti dei quattro ambiti (dati di esempio): la mappa di "Non è tra questi?". */
export function puntiMappa(): PuntoMappa[] {
  return [PUNTO_UFFICIO, ...IMPIANTI.map(puntoImpianto), ...ANTENNE.map(puntoAntenna), ...POSTAZIONI.map(puntoPostazione)];
}
