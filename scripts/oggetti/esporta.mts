// Copia dei punti di consegna letta dalla mappa quando il database non c'e': public/dati/oggetti/punti.json
// (i dati vengono dalle migrazioni di db/oggetti-smarriti, che si applicano da sole all'avvio del sito).
// Uso: npm run oggetti:esporta   (con il sito avviato; ESPORTA_BASE_URL per un altro indirizzo)
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.env.ESPORTA_BASE_URL ?? "http://localhost:3000";
const r = await fetch(`${base}/api/oggetti/punti`);
if (!r.ok) throw new Error(`/api/oggetti/punti: HTTP ${r.status} (il sito e' avviato su ${base}?)`);
const { punti } = (await r.json()) as { punti: { posizioneEsatta: boolean; categoria: string }[] };
// sulla mappa pubblica solo i punti con posizione vera (niente privati affiliati)
const pubblici = punti.filter((p) => p.posizioneEsatta && !["volontario", "guardia_giurata"].includes(p.categoria));
const dir = path.resolve(import.meta.dirname, "../../public/dati/oggetti");
await mkdir(dir, { recursive: true });
await writeFile(path.join(dir, "punti.json"), JSON.stringify({ punti: pubblici }));
console.log(`public/dati/oggetti/punti.json: ${pubblici.length} punti`);
