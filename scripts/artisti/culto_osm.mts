// Luoghi di culto di tutto il Comune di Roma da OpenStreetMap (Art Spot li ha solo per il centro storico).
// Scrive art-spot-dati/geo/luoghi_culto_roma_osm.geojson; scripts/artisti/import.mts lo usa se c'e'.
//   node scripts/artisti/culto_osm.mts
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const QUERY = `[out:json][timeout:180];
area["boundary"="administrative"]["admin_level"="8"]["name"="Roma"]->.roma;
nwr["amenity"="place_of_worship"](area.roma);
out center tags;`;

const res = await fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  headers: { "User-Agent": "civic-data-ingest/0.1", "Content-Type": "application/x-www-form-urlencoded" },
  body: "data=" + encodeURIComponent(QUERY),
  signal: AbortSignal.timeout(240_000),
});
if (!res.ok) throw new Error(`Overpass: HTTP ${res.status}`);
const dati = (await res.json()) as { elements: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] };

const features = dati.elements
  .map((e) => {
    const c = e.center ?? (e.lat != null ? { lat: e.lat, lon: e.lon! } : null);
    if (!c) return null;
    const t = e.tags ?? {};
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [Number(c.lon.toFixed(6)), Number(c.lat.toFixed(6))] },
      properties: {
        id: `osm:${e.type}/${e.id}`,
        name: t.name ?? null,
        type: t.religion ?? "place_of_worship",
        denominazione: t.denomination ?? null,
        source: "OpenStreetMap",
        source_url: `https://www.openstreetmap.org/${e.type}/${e.id}`,
        verification_status: "OpenStreetMap (ODbL)",
      },
    };
  })
  .filter(Boolean);

const file = join(import.meta.dirname, "../../art-spot-dati/geo/luoghi_culto_roma_osm.geojson");
writeFileSync(file, JSON.stringify({ type: "FeatureCollection", name: "luoghi_culto_roma_osm", generato: new Date().toISOString(), licenza: "ODbL, © OpenStreetMap contributors", features }));
console.log(`luoghi di culto: ${features.length} → ${file}`);
