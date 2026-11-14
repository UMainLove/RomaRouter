// Lettura dei layer WFS del GeoServer di Roma Capitale (GeoRoma) in GeoJSON.
import { scarica } from "./lib.mts";

export const GEOSERVER = "https://geoportale.comune.roma.it/geoserver/ows";

export interface Feature {
  type: "Feature";
  id?: string | number;
  geometry: { type: string; coordinates: unknown } | null;
  properties: Record<string, unknown>;
}

export function urlWfs(layer: string) {
  const u = new URL(GEOSERVER);
  u.searchParams.set("service", "WFS");
  u.searchParams.set("version", "1.1.0");
  u.searchParams.set("request", "GetFeature");
  u.searchParams.set("typeName", layer);
  u.searchParams.set("outputFormat", "application/json");
  // CRS84 = WGS84 con ordine assi lon/lat, quello che serve a GeoJSON e PostGIS
  u.searchParams.set("srsName", "urn:ogc:def:crs:OGC:1.3:CRS84");
  return u.toString();
}

export async function leggiLayer(layer: string): Promise<{ features: Feature[]; sha256: string; url: string }> {
  const url = urlWfs(layer);
  const { buf, sha256 } = await scarica(url, `wfs_${layer.replace(/[^a-z0-9]+/gi, "_")}.geojson`);
  const json = JSON.parse(buf.toString("utf8")) as { features?: Feature[] };
  if (!Array.isArray(json.features)) throw new Error(`Risposta WFS senza features per ${layer}`);
  return { features: json.features.filter((f) => f.geometry), sha256, url };
}
