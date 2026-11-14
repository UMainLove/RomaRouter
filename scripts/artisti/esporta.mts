// Copia del database dell'arte di strada versionata in git, cosi' chi fa `git pull` non deve rifare gli import:
//   data/seed/rr_artisti_strada.dump → pg_dump dello schema artisti (zone, postazioni, divieti, esibizioni demo...)
// Uso: npm run artisti:esporta   (con il sito avviato; ESPORTA_BASE_URL=http://localhost:3007 per un altro indirizzo)
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { scriviCopia } from "../db/comune.mts";

const url = process.env.DATABASE_URL_ARTISTI;
if (!url) throw new Error("DATABASE_URL_ARTISTI non impostata in .env.local");
await scriviCopia("artisti-di-strada", url);

// Copie lette dalla mappa quando il database non c'e' (progetto appena scaricato): public/dati/artisti.
// Servono le API avviate (npm run dev o start): ESPORTA_BASE_URL, predefinito http://localhost:3000
const base = process.env.ESPORTA_BASE_URL ?? "http://localhost:3000";
const pubblico = path.resolve(import.meta.dirname, "../../public/dati/artisti");
await mkdir(pubblico, { recursive: true });
const COPIE: [string, string][] = [
  ["/api/artisti/copertura", "copertura.json"],
  ["/api/artisti/zone?leggero=1&fuse=1", "zone.json"],
  ["/api/artisti/postazioni", "postazioni.json"],
  ["/api/artisti/piazze", "piazze.json"],
  ["/api/artisti/esibizioni?giorni=31", "esibizioni.json"],
];
for (const [api, file] of COPIE) {
  const res = await fetch(base + api);
  if (!res.ok) throw new Error(`${api}: HTTP ${res.status} (il server Next e' avviato su ${base}?)`);
  const { type, features } = (await res.json()) as { type: string; features: unknown[] };
  await writeFile(path.join(pubblico, file), JSON.stringify({ type, features }));
  console.log(`public/dati/artisti/${file}: ${features.length} elementi`);
}
