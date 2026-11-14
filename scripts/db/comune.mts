// Pezzi in comune tra le migrazioni (scripts/db/migrate.mts), l'allineamento automatico (scripts/db/allinea.mts)
// e gli script che esportano le copie del database (scripts/*/esporta.mts).
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type pg from "pg";

export const RADICE = path.resolve(import.meta.dirname, "../..");

/** Applica in ordine i file db/<sezione>/migrations/*.sql non ancora eseguiti. Restituisce i nomi applicati. */
export async function applicaMigrazioni(client: pg.Client, slug: string, log: (s: string) => void = () => {}) {
  const dir = path.join(RADICE, "db", slug, "migrations");
  const files = (await readdir(dir).catch(() => [] as string[])).filter((f) => f.endsWith(".sql")).sort();
  await client.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
    nome text PRIMARY KEY,
    applicata_il timestamptz NOT NULL DEFAULT now()
  )`);
  const { rows } = await client.query<{ nome: string }>("SELECT nome FROM public.schema_migrations");
  const fatte = new Set(rows.map((r) => r.nome));
  const applicate: string[] = [];
  for (const file of files) {
    if (fatte.has(file)) continue;
    const sql = await readFile(path.join(dir, file), "utf8");
    log(`→ ${file}`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO public.schema_migrations (nome) VALUES ($1)", [file]);
      await client.query("COMMIT");
      applicate.push(file);
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(`${file}: ${(err as Error).message}`);
    }
  }
  return applicate;
}

// ---------------------------------------------------------------- copie del database in data/seed
/** Le copie versionate in git: file, sezione e schemi che contengono. */
export const COPIE = [
  { file: "rr_artisti_strada.dump", sezione: "artisti-di-strada", schemi: ["artisti"] },
  { file: "rr_antenne.dump", sezione: "antenne", schemi: ["antenne", "opendata"] },
] as const;

export const fileCopia = (file: string) => path.join(RADICE, "data", "seed", file);

export function impronta(file: string) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

/** Ricorda quale copia c'e' ora nel database (cosi' all'avvio non si ricarica di nuovo). */
export async function segnaCopia(client: pg.Client, file: string, hash: string) {
  await client.query(`CREATE TABLE IF NOT EXISTS public.rr_copie (
    file text PRIMARY KEY, impronta text NOT NULL, caricata_il timestamptz NOT NULL DEFAULT now()
  )`);
  await client.query(
    `INSERT INTO public.rr_copie (file, impronta) VALUES ($1, $2)
     ON CONFLICT (file) DO UPDATE SET impronta = EXCLUDED.impronta, caricata_il = now()`,
    [file, hash],
  );
}

export async function copiaSegnata(client: pg.Client, file: string) {
  const r = await client.query<{ impronta: string }>("SELECT impronta FROM public.rr_copie WHERE file = $1", [file]).catch(() => null);
  return r?.rows[0]?.impronta ?? null;
}

/** Programmi di PostgreSQL (pg_restore, psql, pg_dump): variabile PG_BIN, poi la cartella standard su Windows, poi il PATH. */
export function programmaPg(nome: "pg_restore" | "psql" | "pg_dump") {
  const exe = process.platform === "win32" ? `${nome}.exe` : nome;
  const cartelle = [process.env.PG_BIN, "C:\\Program Files\\PostgreSQL\\17\\bin", "C:\\Program Files\\PostgreSQL\\18\\bin"].filter(Boolean) as string[];
  for (const c of cartelle) if (existsSync(path.join(c, exe))) return path.join(c, exe);
  return exe;
}

/**
 * Scrive la copia di una sezione in data/seed (pg_dump degli schemi). Dentro la copia resta l'elenco delle
 * migrazioni gia' applicate (<schema>.rr_migrazioni): chi la carica riapplica solo quelle piu' nuove.
 * Poi la segna come caricata in questo database, cosi' l'avvio del sito non la ricarica.
 */
export async function scriviCopia(sezione: (typeof COPIE)[number]["sezione"], url: string) {
  const copia = COPIE.find((c) => c.sezione === sezione)!;
  const { default: Pg } = await import("pg");
  const { execFileSync } = await import("node:child_process");
  const { mkdirSync } = await import("node:fs");
  const client = new Pg.Client({ connectionString: url });
  await client.connect();
  try {
    const s = copia.schemi[0];
    await client.query(`CREATE TABLE IF NOT EXISTS ${s}.rr_migrazioni (nome text PRIMARY KEY)`);
    await client.query(`DELETE FROM ${s}.rr_migrazioni`);
    await client.query(`INSERT INTO ${s}.rr_migrazioni SELECT nome FROM public.schema_migrations`);
    const u = new URL(url);
    const file = fileCopia(copia.file);
    mkdirSync(path.dirname(file), { recursive: true });
    execFileSync(
      process.env.PG_DUMP ?? programmaPg("pg_dump"),
      ["-Fc", "--no-owner", "--no-privileges", ...copia.schemi.flatMap((x) => ["-n", x]),
       "-h", u.hostname, "-p", u.port || "5432", "-U", decodeURIComponent(u.username), "-f", file, u.pathname.slice(1)],
      { env: { ...process.env, PGPASSWORD: decodeURIComponent(u.password) }, stdio: "inherit" },
    );
    await segnaCopia(client, copia.file, impronta(file));
    console.log(`seed/${copia.file} aggiornato`);
  } finally {
    await client.end();
  }
}

/** Dopo aver caricato una copia: le migrazioni che la copia non contiene si riapplicano. */
export async function riapplicaDopoCopia(client: pg.Client, sezione: (typeof COPIE)[number]["sezione"]) {
  const copia = COPIE.find((c) => c.sezione === sezione)!;
  const r = await client.query<{ nome: string }>(`SELECT nome FROM ${copia.schemi[0]}.rr_migrazioni`).catch(() => null);
  if (r) await client.query("DELETE FROM public.schema_migrations WHERE NOT (nome = ANY($1))", [r.rows.map((x) => x.nome)]);
  return applicaMigrazioni(client, sezione);
}
