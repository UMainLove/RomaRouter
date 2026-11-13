import Link from "next/link";
import { IconaSezione } from "@/components/IconaSezione";
import { SEZIONI } from "@/lib/sezioni";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Alone decorativo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-48 left-1/2 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-accent/15 via-accent-2/15 to-transparent blur-3xl"
      />

      <header className="relative mx-auto w-full max-w-6xl px-5 pt-8 sm:px-8">
        <p className="text-sm font-semibold tracking-wide text-muted">
          Urbe Hub <span aria-hidden="true">·</span> Agentic Hack Rome
        </p>
      </header>

      <main id="contenuto" className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pb-16 pt-10 sm:px-8 sm:pt-16">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
          Servizi per chi vive Roma
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-6xl">
          Roma, <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">più semplice</span>.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          Quattro servizi, ognuno con i suoi dati. Scegli da dove partire.
        </p>

        <nav aria-label="Sezioni del sito" className="mt-12">
          <ul className="grid gap-5 sm:grid-cols-2">
            {SEZIONI.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/${s.slug}`}
                  className="group relative flex h-full flex-col rounded-3xl border border-line bg-surface p-7 shadow-[0_1px_0_rgba(22,19,59,0.04),0_12px_32px_-12px_rgba(22,19,59,0.18)] transition duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_1px_0_rgba(22,19,59,0.04),0_24px_48px_-16px_rgba(109,42,224,0.35)] sm:p-8"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 text-white shadow-lg shadow-accent-2/25">
                      <IconaSezione sezione={s.slug} className="h-7 w-7" />
                    </span>
                    <span className="font-mono text-sm text-muted">{s.numero}</span>
                  </div>
                  <p className="mt-6 text-sm font-semibold text-accent">{s.sottotitolo}</p>
                  <h2 className="mt-1 text-2xl font-bold leading-tight text-ink sm:text-[1.7rem]">{s.titolo}</h2>
                  <p className="mt-3 flex-1 text-base leading-relaxed text-muted">{s.descrizione}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-ink">
                    Apri la sezione
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                    >
                      <path d="M4 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>

      <footer className="relative border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-6 text-sm text-muted sm:flex-row sm:justify-between sm:px-8">
          <p>Prototipo per l&apos;Agentic Hack Rome. Dati da fonti pubbliche, citate in ogni sezione.</p>
          <p>Sfide approvate dalla Commissione Statuto e Innovazione Tecnologica di Roma Capitale.</p>
        </div>
      </footer>
    </div>
  );
}
