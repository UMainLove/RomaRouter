import "server-only";
import { querySezione } from "@/lib/db";

/** Query sul database della sezione antenne (rr_antenne). */
export function queryAntenne<T extends object = Record<string, unknown>>(sql: string, params?: unknown[]) {
  return querySezione<T>("antenne", sql, params);
}

/** Avvertenze mostrate insieme ai dati: la trasparenza sui limiti è parte del servizio. */
export const AVVERTENZE = {
  istanze:
    "Istanze di installazione o modifica pubblicate da Roma Capitale: non provano che l'impianto sia attivo e non sono il catasto completo (ARPA Lazio conta circa 3.538 impianti nel Comune di Roma).",
  sensibili:
    "Siti sensibili dell'art. 4 DAC 78/2024 ricostruiti da layer ufficiali GeoRoma; quelli marcati 'ufficiale: false' vengono da OpenStreetMap. L'elenco ufficiale (Allegato A) non è pubblicato in formato vettoriale.",
  distanze:
    "Le distanze sono solo informative: il regolamento di Roma non fissa distanze minime dai siti sensibili.",
} as const;

export const ATTRIBUZIONI = [
  "Roma Capitale – GeoRoma e Dipartimenti (dati pubblici)",
  "ARPA Lazio",
  "© OpenStreetMap contributors (ODbL) per i dati marcati come non ufficiali e per il geocoding",
];

/** Esegue una query che restituisce un'unica colonna `fc` già in formato GeoJSON FeatureCollection. */
export async function featureCollection(sql: string, params: unknown[] = []) {
  const { rows } = await queryAntenne<{ fc: GeoJSON }>(sql, params);
  return rows[0]?.fc ?? { type: "FeatureCollection", features: [] };
}

type GeoJSON = { type: "FeatureCollection"; features: unknown[] };

export function rispostaGeoJSON(fc: GeoJSON, meta: Record<string, unknown>) {
  return Response.json(
    { ...fc, metadata: { attribuzioni: ATTRIBUZIONI, generato_il: new Date().toISOString(), ...meta } },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}

/** Legge un parametro numerico opzionale, restituendo null se assente o non valido. */
export function numero(v: string | null): number | null {
  if (v == null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** bbox=minLon,minLat,maxLon,maxLat (standard GeoJSON/Leaflet/MapLibre) */
export function leggiBbox(v: string | null): [number, number, number, number] | null {
  if (!v) return null;
  const p = v.split(",").map(Number);
  return p.length === 4 && p.every(Number.isFinite) ? (p as [number, number, number, number]) : null;
}
