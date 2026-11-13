import Link from "next/link";
import { IconaSezione } from "@/components/IconaSezione";
import { trovaSezione, type Sezione } from "@/lib/sezioni";

/** Guscio comune delle pagine di sezione: intestazione, ritorno alla home, contenuto. */
export function PaginaSezione({ sezione, children }: { sezione: Sezione; children: React.ReactNode }) {
  const s = trovaSezione(sezione)!;
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto w-full max-w-6xl px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full text-sm font-semibold text-muted transition hover:text-ink"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="h-4 w-4">
              <path d="M16 10H4M9 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Tutte le sezioni
          </Link>
        </div>
      </header>

      <main id="contenuto" className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 pt-10 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 text-white shadow-lg shadow-accent-2/25">
            <IconaSezione sezione={s.slug} className="h-8 w-8" />
          </span>
          <div>
            <p className="text-sm font-semibold text-accent">
              <span className="font-mono text-muted">{s.numero}</span> · {s.sottotitolo}
            </p>
            <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">{s.titolo}</h1>
            <p className="mt-2 max-w-2xl text-lg text-muted">{s.descrizione}</p>
          </div>
        </div>
        <div className="mt-10">{children}</div>
      </main>
    </div>
  );
}

export function Riquadro({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-6 sm:p-7">
      <h2 className="text-lg font-bold text-ink">{titolo}</h2>
      <div className="mt-3 text-base leading-relaxed text-muted">{children}</div>
    </section>
  );
}
