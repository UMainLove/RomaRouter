// Rigenera i dati elaborati versionati in git (vedi data/README.md):
//   data/seed/rr_antenne.dump   → pg_dump degli schemi antenne + opendata
//   data/geojson/*.geojson      → i layer GeoJSON, letti dalle API della sezione (server Next avviato)
// Uso: npm run antenne:esporta            (con `npm run dev` attivo su http://localhost:3000)
//      ESPORTA_BASE_URL=http://localhost:3001 npm run antenne:esporta
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { scriviCopia } from "../db/comune.mts";

const radice = path.resolve(import.meta.dirname, "../../data");
const base = process.env.ESPORTA_BASE_URL ?? "http://localhost:3000";
const url = process.env.DATABASE_URL_ANTENNE;
if (!url) throw new Error("DATABASE_URL_ANTENNE non impostata in .env.local");

// 1) Copia del database (schemi antenne + opendata; password passata via variabile d'ambiente)
await scriviCopia("antenne", url);

// 2) GeoJSON dei layer (stessi dati delle API, senza il blocco metadata che cambia a ogni richiesta)
const LAYER: [string, string][] = [
  ["/api/antenne/istanze", "antenne_istanze_srb.geojson"],
  ["/api/antenne/siti-sensibili", "antenne_siti_sensibili.geojson"],
  ["/api/antenne/aree-vincolate", "antenne_aree_vincolate.geojson"],
  ["/api/antenne/monitoraggio", "antenne_monitoraggio.geojson"],
  ["/api/antenne/siti", "antenne_in_funzione.geojson"],
  ["/api/antenne/impianti", "antenne_impianti_osm.geojson"],
];
// Copie lette dalla mappa quando il database non c'e' (progetto appena scaricato): public/dati/antenne
const PER_LA_MAPPA: Record<string, string> = {
  "antenne_istanze_srb.geojson": "richieste.json",
  "antenne_in_funzione.geojson": "in-funzione.json",
  "antenne_impianti_osm.geojson": "impianti-osm.json",
};
const pubblico = path.resolve(import.meta.dirname, "../../public/dati/antenne");
await mkdir(pubblico, { recursive: true });
await mkdir(path.join(radice, "geojson"), { recursive: true });
for (const [api, file] of LAYER) {
  const res = await fetch(base + api);
  if (!res.ok) throw new Error(`${api}: HTTP ${res.status} (il server Next è avviato su ${base}?)`);
  const { type, features } = (await res.json()) as { type: string; features: unknown[] };
  const name = file.replace(/^antenne_|\.geojson$/g, "");
  await writeFile(path.join(radice, "geojson", file), JSON.stringify({ type, name, features }) + "\n");
  if (PER_LA_MAPPA[file]) await writeFile(path.join(pubblico, PER_LA_MAPPA[file]), JSON.stringify({ type, features }));
  console.log(`geojson/${file}: ${features.length} elementi`);
}
