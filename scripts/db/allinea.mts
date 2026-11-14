// Allinea da solo il database locale a quello del repository: parte prima di `npm run dev` e `npm start`.
//  1. applica le migrazioni che mancano (tutte le sezioni);
//  2. se la copia in data/seed (artisti, antenne) e' cambiata dopo un `git pull`, la ricarica: tutto in una
//     transazione sola, quindi se qualcosa va storto il database resta com'era.
// Non blocca mai l'avvio: senza database o senza PostgreSQL scrive una riga e il sito parte lo stesso
// (le mappe usano le copie in public/dati). Per saltarlo: RR_NO_ALLINEA=1.
//   node scripts/db/allinea.mts            (lo lanciano predev e prestart)
//   node scripts/db/allinea.mts --segna    (segna le copie come gia' caricate, senza ricaricarle)
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { SEZIONI } from "../../src/lib/sezioni.ts";
import { applicaMigrazioni, COPIE, copiaSegnata, fileCopia, impronta, programmaPg, RADICE, riapplicaDopoCopia, segnaCopia } from "./comune.mts";

const dire = (s: string) => console.log(`[database] ${s}`);
if (process.env.RR_NO_ALLINEA === "1") process.exit(0);
try {
  process.loadEnvFile(path.join(RADICE, ".env.local"));
} catch {
  /* senza .env.local non c'e' database: niente da fare */
}
const soloSegna = process.argv.includes("--segna");

/** pg_restore della copia → psql in una transazione sola, dopo aver tolto gli schemi vecchi. */
function ricarica(url: string, file: string, schemi: readonly string[]) {
  const u = new URL(url);
  const env = { ...process.env, PGPASSWORD: decodeURIComponent(u.password) };
  const conn = ["-h", u.hostname, "-p", u.port || "5432", "-U", decodeURIComponent(u.username), "-d", u.pathname.slice(1)];
  return new Promise<void>((ok, ko) => {
    const restore = spawn(programmaPg("pg_restore"), ["--no-owner", "--no-privileges", "-f", "-", file], { env });
    const psql = spawn(
      programmaPg("psql"),
      ["-X", "-q", "-1", "-v", "ON_ERROR_STOP=1", ...conn, ...schemi.map((s) => ["-c", `DROP SCHEMA IF EXISTS ${s} CASCADE`]).flat(), "-f", "-"],
      { env, stdio: ["pipe", "ignore", "pipe"] },
    );
    let errori = "";
    psql.stderr.on("data", (d) => (errori += d));
    restore.stderr.on("data", (d) => (errori += d));
    restore.on("error", ko);
    psql.on("error", ko);
    restore.stdout.pipe(psql.stdin);
    psql.on("close", (codice) => (codice === 0 ? ok() : ko(new Error(errori.trim().split("\n").slice(-2).join(" ") || `psql uscito con ${codice}`))));
  });
}

for (const sezione of SEZIONI) {
  const url = process.env[sezione.envVar];
  if (!url) continue;
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 3000 });
  try {
    await client.connect();
  } catch {
    dire(`${sezione.database} non raggiungibile: il sito parte lo stesso (le mappe usano le copie statiche).`);
    continue;
  }
  try {
    const applicate = await applicaMigrazioni(client, sezione.slug);
    if (applicate.length) dire(`${sezione.database}: applicate ${applicate.join(", ")}`);

    const copia = COPIE.find((c) => c.sezione === sezione.slug);
    const file = copia && fileCopia(copia.file);
    if (copia && file && existsSync(file)) {
      const hash = impronta(file);
      if ((await copiaSegnata(client, copia.file)) !== hash) {
        if (soloSegna) {
          await segnaCopia(client, copia.file, hash);
          dire(`${sezione.database}: copia ${copia.file} segnata come caricata`);
        } else {
          dire(`${sezione.database}: nel repository c'è una copia più nuova, la carico (una volta sola, può volerci un minuto)…`);
          const t = Date.now();
          await ricarica(url, file, copia.schemi);
          // le migrazioni piu' nuove della copia (se ce ne sono) si riapplicano sopra
          const sopra = await riapplicaDopoCopia(client, copia.sezione);
          if (sopra.length) dire(`${sezione.database}: riapplicate ${sopra.join(", ")}`);
          await segnaCopia(client, copia.file, hash);
          dire(`${sezione.database}: aggiornato in ${Math.round((Date.now() - t) / 1000)} s`);
        }
      }
    }
  } catch (e) {
    dire(`${sezione.database}: non aggiornato (${(e as Error).message.slice(0, 200)}). Il sito parte lo stesso.`);
  } finally {
    await client.end().catch(() => {});
  }
}
