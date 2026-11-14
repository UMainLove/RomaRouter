"use client";

import { useId, useState, type ReactNode } from "react";

/*
 * I filtri delle sezioni a tendina, solo su telefono e tablet (sotto lg): all'apertura sono chiusi e una
 * riga dice cosa e' attivo, cosi' la mappa resta libera; la freccia li apre e li richiude.
 * Su desktop la riga non c'e' e i filtri restano sempre aperti, come prima.
 */
export function Tendina({ riassunto, etichetta, children }: { riassunto: ReactNode; etichetta: string; children: ReactNode }) {
  const [aperta, setAperta] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        aria-expanded={aperta}
        aria-controls={id}
        onClick={() => setAperta((v) => !v)}
        className="flex min-h-11 w-full items-center gap-2 rounded-[14px] py-1 pr-1 pl-2.5 text-left transition hover:bg-bg-sink lg:hidden"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 text-[14px] leading-5 font-bold text-ink">
          <span className="sr-only">{etichetta}: </span>
          {riassunto}
        </span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-sink text-ink" aria-hidden="true">
          <svg viewBox="0 0 20 20" className={`size-4 transition-transform duration-200 ${aperta ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 8 5 5 5-5" />
          </svg>
        </span>
      </button>
      <div id={id} className={aperta ? "max-lg:mt-1" : "max-lg:hidden"}>
        {children}
      </div>
    </>
  );
}

/** Testo del riassunto: le parti attive separate da un punto; se non sta in una riga finisce con i puntini. */
export function Riassunto({ parti, icona }: { parti: (string | null | false | undefined)[]; icona?: ReactNode }) {
  const testo = parti.filter(Boolean).join(" · ");
  return (
    <>
      {icona}
      <span className="min-w-0 truncate">{testo}</span>
    </>
  );
}
