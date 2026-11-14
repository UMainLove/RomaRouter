import "server-only";
import { Pool } from "pg";
import { trovaSezione, type Sezione } from "@/lib/sezioni";

// Un solo pool per processo: in sviluppo l'hot reload ricarica i moduli,
// quindi lo teniamo su globalThis per non aprire connessioni a ogni modifica.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL non impostata: copia .env.example in .env.local");
  }
  return new Pool({ connectionString, max: 10 });
}

export function getPool(): Pool {
  if (!globalForDb.pgPool) globalForDb.pgPool = createPool();
  return globalForDb.pgPool;
}

export async function query<T extends object = Record<string, unknown>>(
  text: string,
  params?: unknown[],
) {
  return getPool().query<T>(text, params);
}

// ---------------------------------------------------------------------------
// Un database per sezione (vedi src/lib/sezioni.ts e db/init.sql).
// Ogni sezione legge solo il proprio database: le mappe e i dati non si mescolano.
// ---------------------------------------------------------------------------
const globalPerSezione = globalThis as unknown as { pgPoolSezioni?: Map<Sezione, Pool> };

export function getPoolSezione(sezione: Sezione): Pool {
  globalPerSezione.pgPoolSezioni ??= new Map();
  let pool = globalPerSezione.pgPoolSezioni.get(sezione);
  if (!pool) {
    const def = trovaSezione(sezione);
    const connectionString = def ? process.env[def.envVar] : undefined;
    if (!def || !connectionString) {
      throw new Error(`${def?.envVar ?? sezione} non impostata: copia .env.example in .env.local`);
    }
    pool = new Pool({ connectionString, max: 5 });
    globalPerSezione.pgPoolSezioni.set(sezione, pool);
  }
  return pool;
}

export async function querySezione<T extends object = Record<string, unknown>>(
  sezione: Sezione,
  text: string,
  params?: unknown[],
) {
  return getPoolSezione(sezione).query<T>(text, params);
}
