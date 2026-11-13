// Applica in ordine i file db/<sezione>/migrations/*.sql non ancora eseguiti sul database della sezione.
// Uso: npm run db:migrate -- antenne        (legge DATABASE_URL_ANTENNE da .env.local)
//      npm run db:migrate -- tutte          (tutte le sezioni)
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { SEZIONI } from "../../src/lib/sezioni.ts";

const radice = path.resolve(import.meta.dirname, "../../db");
const arg = process.argv[2];
const scelte = arg === "tutte" ? [...SEZIONI] : SEZIONI.filter((s) => s.slug === arg);
if (!scelte.length) {
  console.error(`Uso: npm run db:migrate -- <sezione|tutte>\nSezioni: ${SEZIONI.map((s) => s.slug).join(", ")}`);
  process.exit(1);
}

for (const sezione of scelte) {
  const dir = path.join(radice, sezione.slug, "migrations");
  const connectionString = process.env[sezione.envVar];
  if (!connectionString) throw new Error(`${sezione.envVar} non impostata in .env.local`);
  const files = (await readdir(dir).catch(() => [] as string[])).filter((f) => f.endsWith(".sql")).sort();
  console.log(`# ${sezione.slug} → ${sezione.database}`);

  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
      nome text PRIMARY KEY,
      applicata_il timestamptz NOT NULL DEFAULT now()
    )`);
    const { rows } = await client.query<{ nome: string }>("SELECT nome FROM public.schema_migrations");
    const fatte = new Set(rows.map((r) => r.nome));
    let applicate = 0;
    for (const file of files) {
      if (fatte.has(file)) continue;
      const sql = await readFile(path.join(dir, file), "utf8");
      process.stdout.write(`→ ${file} ... `);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO public.schema_migrations (nome) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log("ok");
        applicate++;
      } catch (err) {
        await client.query("ROLLBACK");
        console.log("ERRORE");
        throw err;
      }
    }
    console.log(applicate ? `${applicate} migrazioni applicate.` : "Database già aggiornato.");
  } finally {
    await client.end();
  }
}
