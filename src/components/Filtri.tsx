// Filtri come semplice <form method="get">: funzionano anche senza JavaScript e l'URL si può condividere.

export function BarraFiltri({ children, azzera }: { children: React.ReactNode; azzera: string }) {
  return (
    <form method="get" role="search" className="flex flex-wrap items-end gap-3 rounded-panel border border-line bg-surface p-4 sm:p-5">
      {children}
      <div className="flex w-full gap-2 sm:w-auto">
        <button
          type="submit"
          className="h-11 flex-1 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-5 font-semibold text-white shadow-md shadow-accent-2/20 transition hover:opacity-90 sm:flex-none"
        >
          Cerca
        </button>
        <a
          href={azzera}
          className="flex h-11 items-center rounded-xl border border-line px-4 font-semibold text-muted transition hover:text-ink"
        >
          Azzera
        </a>
      </div>
    </form>
  );
}

const campo =
  "h-11 w-full rounded-xl border border-line bg-background px-3 text-base text-ink placeholder:text-muted/70 focus:border-accent-2";

export function CampoTesto({ nome, etichetta, valore, segnaposto }: { nome: string; etichetta: string; valore?: string; segnaposto?: string }) {
  return (
    <label className="grid min-w-[14rem] flex-[2] gap-1 text-sm font-semibold text-muted">
      {etichetta}
      <input type="search" name={nome} defaultValue={valore} placeholder={segnaposto} className={campo} />
    </label>
  );
}

export function CampoScelta({
  nome, etichetta, valore, opzioni, tutte = "Tutti",
}: {
  nome: string; etichetta: string; valore?: string; opzioni: { valore: string; testo: string }[]; tutte?: string;
}) {
  return (
    <label className="grid min-w-[10rem] flex-1 gap-1 text-sm font-semibold text-muted">
      {etichetta}
      <select name={nome} defaultValue={valore ?? ""} className={campo}>
        <option value="">{tutte}</option>
        {opzioni.map((o) => (
          <option key={o.valore} value={o.valore}>
            {o.testo}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Conteggio({ n, singolare, plurale, limite }: { n: number; singolare: string; plurale: string; limite?: number }) {
  return (
    <p className="text-sm font-semibold text-muted" aria-live="polite">
      {n.toLocaleString("it-IT")} {n === 1 ? singolare : plurale}
      {limite && n >= limite ? ` (mostrati i primi ${limite.toLocaleString("it-IT")}: affina la ricerca)` : ""}
    </p>
  );
}

export function Vuoto({ filtrato, cosa }: { filtrato: boolean; cosa: string }) {
  return (
    <div className="rounded-panel border border-dashed border-line bg-surface px-6 py-12 text-center">
      <p className="text-lg font-bold text-ink">{filtrato ? `Nessun risultato per questi filtri` : `Ancora nessun ${cosa} nel database`}</p>
      <p className="mx-auto mt-2 max-w-md text-muted">
        {filtrato
          ? "Prova a togliere qualche filtro o a usare parole diverse."
          : "La sezione è collegata al suo database: i dati compariranno qui appena verranno caricati."}
      </p>
    </div>
  );
}

export function Badge({ children, tono = "neutro" }: { children: React.ReactNode; tono?: "neutro" | "positivo" | "negativo" | "accento" }) {
  const stili = {
    neutro: "bg-surface-2 text-muted",
    positivo: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    negativo: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
    accento: "bg-accent/10 text-accent",
  }[tono];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${stili}`}>{children}</span>;
}

export const MUNICIPI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"].map((r, i) => ({
  valore: String(i + 1),
  testo: `Municipio ${r}`,
}));

export function nomeMunicipio(n: number | null) {
  return n ? MUNICIPI[n - 1]?.testo ?? null : null;
}

/** Primo valore testuale di un parametro di ricerca, ripulito. */
export function parametro(v: string | string[] | undefined): string | undefined {
  const s = (Array.isArray(v) ? v[0] : v)?.trim();
  return s ? s.slice(0, 200) : undefined;
}
