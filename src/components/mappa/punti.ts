import { ANTENNE, IMPIANTI, POSTAZIONI, TIPI_IMPIANTO } from "@/data/esempi";
import type { AmbitoId } from "@/lib/ambiti";
import type { Punto } from "@/lib/geo";

export interface PuntoMappa extends Punto {
  id: string;
  ambito: AmbitoId;
  nome: string;
  dettaglio: string;
  href: string;
}

/** Punti delle tre sfide sulla mappa comune (dati di esempio). */
export function puntiMappa(): PuntoMappa[] {
  return [
    ...IMPIANTI.map((i) => ({
      id: i.id,
      ambito: "sport" as const,
      nome: i.nome,
      dettaglio: `${TIPI_IMPIANTO[i.tipo]} · ${i.discipline.join(", ")}`,
      href: `/sport/${i.id}`,
      lat: i.lat,
      lon: i.lon,
    })),
    ...ANTENNE.map((a) => ({
      id: a.id,
      ambito: "antenne" as const,
      nome: `Impianto ${a.codice}`,
      dettaglio: `${a.gestore} · ${a.tecnologie.join(", ")} · ${a.stato === "attiva" ? "attivo" : "autorizzato"}`,
      href: `/antenne?lat=${a.lat}&lon=${a.lon}`,
      lat: a.lat,
      lon: a.lon,
    })),
    ...POSTAZIONI.map((p) => ({
      id: p.id,
      ambito: "arte" as const,
      nome: `Postazione ${p.codice}`,
      dettaglio: `${p.luogo} · Municipio ${p.municipio}`,
      href: `/arte/${p.id}`,
      lat: p.lat,
      lon: p.lon,
    })),
  ];
}
