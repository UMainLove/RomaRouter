import { Suspense } from "react";
import { connection } from "next/server";
import { querySezione } from "@/lib/db";
import { trovaSezione, type Sezione } from "@/lib/sezioni";

export interface TabellaMonitorata {
  tabella: string; // nome qualificato, es. "sport.impianti" (fisso, mai input utente)
  etichetta: string;
}

/** Conta i record delle tabelle principali di una sezione, letti dal SUO database a ogni richiesta. */
async function Conteggi({ sezione, tabelle }: { sezione: Sezione; tabelle: TabellaMonitorata[] }) {
  await connection(); // dati sempre aggiornati: niente prerender in fase di build
  let righe: { etichetta: string; n: number }[];
  try {
    const sql = tabelle
      .map((t, i) => `SELECT ${i} AS i, count(*)::int AS n FROM ${t.tabella}`)
      .join(" UNION ALL ");
    const { rows } = await querySezione<{ i: number; n: number }>(sezione, sql);
    righe = tabelle.map((t, i) => ({ etichetta: t.etichetta, n: rows.find((r) => r.i === i)?.n ?? 0 }));
  } catch {
    return (
      <p className="text-base text-muted">
        Database non raggiungibile. Controlla <code className="font-mono text-sm">{trovaSezione(sezione)?.envVar}</code> in{" "}
        <code className="font-mono text-sm">.env.local</code>.
      </p>
    );
  }
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {righe.map((r) => (
        <div key={r.etichetta} className="rounded-2xl bg-surface-2 px-4 py-3">
          <dt className="text-sm text-muted">{r.etichetta}</dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums text-ink">{r.n.toLocaleString("it-IT")}</dd>
        </div>
      ))}
    </dl>
  );
}

export function StatoDati({ sezione, tabelle }: { sezione: Sezione; tabelle: TabellaMonitorata[] }) {
  const s = trovaSezione(sezione)!;
  return (
    <section className="rounded-3xl border border-line bg-surface p-6 sm:p-7" aria-labelledby={`stato-${sezione}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`stato-${sezione}`} className="text-lg font-bold text-ink">
          Stato dei dati
        </h2>
        <p className="font-mono text-xs text-muted">database: {s.database}</p>
      </div>
      <div className="mt-4">
        <Suspense fallback={<p className="text-base text-muted">Lettura del database…</p>}>
          <Conteggi sezione={sezione} tabelle={tabelle} />
        </Suspense>
      </div>
    </section>
  );
}
