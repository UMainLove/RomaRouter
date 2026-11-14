// Copie della sezione sport versionate in git, cosi' chi fa `git pull` non deve rifare l'import:
//   data/seed/rr_impianti_sportivi.dump → pg_dump dello schema sport (si carica da solo all'avvio del sito)
//   public/dati/sport/*.json            → letti dalla mappa quando il database non c'e'
// Uso: npm run sport:esporta   (con il sito avviato; ESPORTA_BASE_URL per un altro indirizzo)
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { scriviCopia } from "../db/comune.mts";

const url = process.env.DATABASE_URL_SPORT;
if (!url) throw new Error("DATABASE_URL_SPORT non impostata in .env.local");
await scriviCopia("impianti-sportivi", url);

const base = process.env.ESPORTA_BASE_URL ?? "http://localhost:3000";
const pubblico = path.resolve(import.meta.dirname, "../../public/dati/sport");
await mkdir(pubblico, { recursive: true });
for (const [file, api] of [["luoghi.json", "/api/sport/luoghi"], ["campi.json", "/api/sport/campi"], ["tariffe.json", "/api/sport/tariffe"]] as const) {
  const r = await fetch(base + api);
  if (!r.ok) throw new Error(`${api}: HTTP ${r.status} (il sito e' avviato su ${base}?)`);
  const testo = await r.text();
  await writeFile(path.join(pubblico, file), testo);
  console.log(`public/dati/sport/${file}: ${(testo.length / 1024).toFixed(0)} KB`);
}
