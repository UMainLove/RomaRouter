import "server-only";

// Ricerca indirizzi sullo stradario ufficiale di Roma Capitale (GeoRoma, ~559.000 numeri civici).
const GEOSERVER = "https://geoportale.comune.roma.it/geoserver/ows";

const TIPI: [RegExp, string][] = [
  [/^(?:v\.?\s*le|viale)\b\.?/i, "VIALE"],
  [/^(?:p\.?\s*zz?a|piazza)\b\.?/i, "PIAZZA"],
  [/^(?:p\.?\s*le|piazzale)\b\.?/i, "PIAZZALE"],
  [/^(?:l\.?\s*go|largo)\b\.?/i, "LARGO"],
  [/^(?:c\.?\s*so|corso)\b\.?/i, "CORSO"],
  [/^lungotevere\b/i, "LUNGOTEVERE"],
  [/^circonvallazione\b/i, "CIRCONVALLAZIONE"],
  [/^vicolo\b/i, "VICOLO"],
  [/^via\b/i, "VIA"],
];
const VUOTE = new Set(["DEL", "DELLA", "DELLE", "DEI", "DEGLI", "DELL", "DI", "DA", "DE", "LA", "LE", "IL", "LO", "GLI", "E"]);

export interface RisultatoIndirizzo {
  etichetta: string;
  municipio: number | null;
  lat: number;
  lon: number;
  precisione: "civico" | "strada";
}

export async function cercaIndirizzo(testo: string): Promise<RisultatoIndirizzo[]> {
  let s = testo.trim().replace(/,?\s*roma\s*$/i, "");
  let tipo: string | null = null;
  for (const [re, t] of TIPI) if (re.test(s)) { tipo = t; s = s.replace(re, "").trim(); break; }
  const m = s.match(/^(.*?)(?:[\s,]+(\d{1,4})\s*[a-z]?)?\s*$/i);
  const civico = m?.[2] ? Number(m[2]) : null;
  const parole = (m?.[1] ?? s)
    .toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9 ]+/g, " ").split(/\s+/)
    .filter((p) => p.length >= 2 && !VUOTE.has(p))
    .slice(0, 5);
  if (!parole.length) return [];

  const q = (v: string) => v.replace(/'/g, "''");
  const filtro = [
    ...parole.map((p) => `TOPONIMO ILIKE '%${q(p)}%'`),
    ...(tipo ? [`TOPONIMO ILIKE '${tipo} %'`] : []),
    ...(civico != null ? [`NUMERO_CIVICO = ${civico}`] : []),
  ].join(" AND ");

  const u = new URL(GEOSERVER);
  for (const [k, v] of Object.entries({
    service: "WFS", version: "1.1.0", request: "GetFeature", typeName: "DIPCUL:GeoromaCiviciLocator",
    outputFormat: "application/json", srsName: "urn:ogc:def:crs:OGC:1.3:CRS84",
    maxFeatures: civico != null ? "40" : "400", CQL_FILTER: filtro,
  })) u.searchParams.set(k, v);

  const res = await fetch(u, { signal: AbortSignal.timeout(15_000), headers: { "User-Agent": "civic-data-ingest/0.1" } });
  if (!res.ok) throw new Error(`Stradario non disponibile (HTTP ${res.status})`);
  const json = (await res.json()) as {
    features?: { geometry: { coordinates: number[] }; properties: { TOPONIMO?: string; NUMERO_CIVICO?: number; LETTERA?: string; MUNICIPIO?: number } }[];
  };

  // Un risultato per via (e per civico se richiesto); senza civico: punto centrale tra i civici della via
  const perVia = new Map<string, { punti: number[][]; municipio: number | null; civico: string | null }>();
  for (const f of json.features ?? []) {
    const p = f.properties;
    const via = p.TOPONIMO ?? "";
    const chiave = civico != null ? `${via} ${p.NUMERO_CIVICO}${p.LETTERA ?? ""}` : via;
    const voce = perVia.get(chiave) ?? { punti: [], municipio: p.MUNICIPIO ?? null, civico: civico != null ? `${p.NUMERO_CIVICO}${p.LETTERA ?? ""}` : null };
    voce.punti.push(f.geometry.coordinates);
    perVia.set(chiave, voce);
  }
  return [...perVia.entries()]
    .map(([chiave, v]) => {
      const cx = v.punti.reduce((a, p) => a + p[0], 0) / v.punti.length;
      const cy = v.punti.reduce((a, p) => a + p[1], 0) / v.punti.length;
      const [lon, lat] = v.punti.reduce((b, p) => ((p[0] - cx) ** 2 + (p[1] - cy) ** 2 < (b[0] - cx) ** 2 + (b[1] - cy) ** 2 ? p : b));
      return { etichetta: chiave, municipio: v.municipio, lat, lon, precisione: (civico != null ? "civico" : "strada") as "civico" | "strada" };
    })
    .sort((a, b) => a.etichetta.length - b.etichetta.length)
    .slice(0, 6);
}
