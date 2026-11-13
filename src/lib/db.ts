import "server-only";
import { Pool } from "pg";

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
