// Applica in ordine i file db/<sezione>/migrations/*.sql non ancora eseguiti sul database della sezione.
// Uso: npm run db:migrate -- antenne        (legge DATABASE_URL_ANTENNE da .env.local)
//      npm run db:migrate -- tutte          (tutte le sezioni)
import pg from "pg";
import { SEZIONI } from "../../src/lib/sezioni.ts";
import { applicaMigrazioni } from "./comune.mts";

const arg = process.argv[2];
const scelte = arg === "tutte" ? [...SEZIONI] : SEZIONI.filter((s) => s.slug === arg);
if (!scelte.length) {
  console.error(`Uso: npm run db:migrate -- <sezione|tutte>\nSezioni: ${SEZIONI.map((s) => s.slug).join(", ")}`);
  process.exit(1);
}

for (const sezione of scelte) {
  const connectionString = process.env[sezione.envVar];
  if (!connectionString) throw new Error(`${sezione.envVar} non impostata in .env.local`);
  console.log(`# ${sezione.slug} → ${sezione.database}`);
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const applicate = await applicaMigrazioni(client, sezione.slug, (x) => console.log(x));
    console.log(applicate.length ? `${applicate.length} migrazioni applicate.` : "Database già aggiornato.");
  } finally {
    await client.end();
  }
}
