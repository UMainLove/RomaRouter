// Import completo del layer antenne nel database.
// Uso: npm run antenne:import                → tutti i passi
//      npm run antenne:import -- istanze     → solo alcuni passi (territorio, sensibili, istanze, arpa, normativa)
import { db, log } from "./lib.mts";
import { importaTerritorio } from "./territorio.mts";
import { importaSensibili } from "./sensibili.mts";
import { importaIstanze } from "./istanze.mts";
import { importaArpa } from "./arpa.mts";
import { importaNormativa } from "./normativa.mts";

// L'ordine conta: i confini servono per assegnare municipio e quartiere agli altri dati
const PASSI: [string, () => Promise<void>][] = [
  ["normativa", importaNormativa],
  ["territorio", importaTerritorio],
  ["sensibili", importaSensibili],
  ["istanze", importaIstanze],
  ["arpa", importaArpa],
];

const richiesti = process.argv.slice(2);
const daFare = richiesti.length ? PASSI.filter(([n]) => richiesti.includes(n)) : PASSI;
if (richiesti.length && daFare.length !== richiesti.length) {
  console.error(`Passi validi: ${PASSI.map(([n]) => n).join(", ")}`);
  process.exit(1);
}

if (!process.env.DATABASE_URL_ANTENNE) {
  console.error("DATABASE_URL_ANTENNE non impostata: copia .env.example in .env.local");
  process.exit(1);
}
await db.connect();
const inizio = Date.now();
try {
  for (const [nome, fn] of daFare) {
    const t = Date.now();
    log(nome, "inizio");
    await fn();
    log(nome, `fatto in ${((Date.now() - t) / 1000).toFixed(1)} s`);
  }
  log("fine", `import completato in ${((Date.now() - inizio) / 1000).toFixed(0)} s`);
} finally {
  await db.end();
}
