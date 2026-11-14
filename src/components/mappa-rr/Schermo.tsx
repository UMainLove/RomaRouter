"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/*
 * Schermo a tutta mappa delle sezioni.
 *  - in alto: ricerca e filtri (galleggiano sulla mappa);
 *  - la scheda: una schermata sola, mai da scorrere. Su computer in basso a sinistra, su telefono
 *    in basso a tutta larghezza, staccata dai bordi;
 *  - nella barra di ricerca: "dove sono io" e la Guida (regole, elenchi, fonti), che e' una pagina a parte.
 */
export function Schermo({
  mappa,
  barra,
  scheda,
  guida,
  guidaAperta,
  onGuida,
}: {
  mappa: ReactNode;
  barra: ReactNode;
  scheda: ReactNode | null;
  guida: { titolo: string; schede: { id: string; nome: string; contenuto: ReactNode }[] };
  guidaAperta: boolean;
  onGuida: (aperta: boolean) => void;
}) {
  return (
    <main className="relative isolate min-h-0 flex-1 overflow-hidden bg-[#F3EEE4]">
      {mappa}

      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-col gap-2 lg:right-auto lg:left-4 lg:top-4 lg:w-[420px]">
        <div className="pointer-events-auto">{barra}</div>
      </div>

      <div
        className={`absolute inset-x-2 bottom-2 z-20 transition-all duration-300 ease-out lg:inset-x-auto lg:bottom-4 lg:left-4 lg:w-[420px] ${
          scheda ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
        }`}
      >
        {scheda}
      </div>

      {guidaAperta && <Guida {...guida} onChiudi={() => onGuida(false)} />}
    </main>
  );
}

/** Dentro la barra di ricerca: "dove sono io" e la Guida. */
export function Strumenti({ onGuida, onTrovami }: { onGuida: () => void; onTrovami: () => void }) {
  const c = "flex size-10 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-bg-sink hover:text-ink";
  return (
    <>
      <button type="button" onClick={onTrovami} aria-label="Usa la mia posizione" title="Usa la mia posizione" className={c}>
        <svg viewBox="0 0 24 24" className="size-[19px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      </button>
      <span className="h-6 w-px bg-line" aria-hidden="true" />
      <button type="button" onClick={onGuida} aria-label="Guida: regole, elenco e fonti" title="Guida: regole, elenco e fonti" className={`${c} gap-1.5 px-2.5 sm:w-auto`}>
        <svg viewBox="0 0 24 24" className="size-[19px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5Z" />
          <path d="M4 21.5V5.5M8 7h8M8 11h6" />
        </svg>
        <span className="hidden text-[13.5px] font-bold sm:inline">Guida</span>
      </button>
    </>
  );
}

/** La scheda: intestazione con icona, una risposta grande, poco altro. Mai piu' alta dello schermo utile. */
export function Scheda({
  icona,
  titolo,
  sopra,
  onChiudi,
  children,
}: {
  icona: ReactNode;
  titolo: string;
  sopra?: string;
  onChiudi: () => void;
  children: ReactNode;
}) {
  const id = useId();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [titolo]);
  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby={id}
      onKeyDown={(e) => e.key === "Escape" && onChiudi()}
      className="max-h-[min(62svh,440px)] overflow-hidden rounded-[22px] bg-panel p-4 shadow-[0_10px_40px_rgba(37,29,28,.22)] ring-1 ring-black/5 outline-none"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0">{icona}</div>
        <div className="min-w-0 flex-1 pt-0.5">
          {sopra && <p className="truncate text-[11px] font-bold tracking-[.08em] text-muted uppercase">{sopra}</p>}
          <h2 id={id} className="truncate text-[17px] leading-6 font-bold text-ink">
            {titolo}
          </h2>
        </div>
        <button
          type="button"
          onClick={onChiudi}
          aria-label="Chiudi"
          className="-mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-bg-sink hover:text-ink"
        >
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
            <path d="M5 5l10 10M15 5 5 15" />
          </svg>
        </button>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Tre fatti in fila: etichetta piccola, valore grande. */
export function Fatti({ voci }: { voci: { l: string; v: string; nota?: string; tono?: "ok" | "no" }[] }) {
  return (
    <dl className="grid grid-cols-3 gap-2">
      {voci.map((x) => (
        <div key={x.l} className="min-w-0 rounded-[14px] bg-bg-sink px-2.5 py-2">
          <dt className="truncate text-[11px] font-semibold text-muted">{x.l}</dt>
          <dd className={`truncate text-[15px] leading-5 font-bold ${x.tono === "ok" ? "text-ok" : x.tono === "no" ? "text-errore" : "text-ink"}`}>{x.v}</dd>
          {x.nota && <dd className="truncate text-[11px] text-muted">{x.nota}</dd>}
        </div>
      ))}
    </dl>
  );
}

export function Azioni({ children }: { children: ReactNode }) {
  return <div className="mt-3 flex gap-2 *:min-w-0 *:flex-1">{children}</div>;
}

export function Azione({ onClick, href, children, primaria }: { onClick?: () => void; href?: string; children: ReactNode; primaria?: boolean }) {
  const c = `flex h-11 items-center justify-center gap-1.5 truncate rounded-[14px] px-3 text-[14px] font-bold ${
    primaria ? "bg-ink text-white hover:bg-ink-soft" : "bg-bg-sink text-ink hover:bg-line"
  }`;
  if (href)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={c}>
        {children}
      </a>
    );
  return (
    <button type="button" onClick={onClick} className={c}>
      {children}
    </button>
  );
}

/** Icona tonda della scheda (stesso disegno dei simboli in mappa). */
export function Tondo({ colore, glifo, grande }: { colore: string; glifo: string; grande?: boolean }) {
  return (
    <span className={`flex items-center justify-center rounded-full ${grande ? "size-12" : "size-11"}`} style={{ background: colore }}>
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: glifo }} />
    </span>
  );
}

function Guida({ titolo, schede, onChiudi }: { titolo: string; schede: { id: string; nome: string; contenuto: ReactNode }[]; onChiudi: () => void }) {
  const [attiva, setAttiva] = useState(schede[0]?.id);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div className="absolute inset-0 z-40 flex justify-end bg-ink/25 backdrop-blur-[2px]" onClick={onChiudi}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={titolo}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && onChiudi()}
        className="flex h-full w-full flex-col bg-bg outline-none lg:w-[600px] lg:shadow-[-10px_0_40px_rgba(37,29,28,.2)]"
      >
        <div className="flex items-center gap-3 border-b border-line bg-panel px-5 pt-4 pb-0">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold tracking-[.08em] text-muted uppercase">Guida</p>
            <h2 className="text-xl font-bold text-ink">{titolo}</h2>
            <div role="tablist" className="rr-scorri -mx-1 mt-3 flex gap-1 overflow-x-auto">
              {schede.map((s) => (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={attiva === s.id}
                  onClick={() => setAttiva(s.id)}
                  className={`shrink-0 border-b-[3px] px-3 pb-2.5 text-[15px] font-bold ${attiva === s.id ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}
                >
                  {s.nome}
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={onChiudi} aria-label="Chiudi la guida" className="-mt-8 flex size-10 items-center justify-center rounded-full bg-bg-sink text-ink hover:bg-line">
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
              <path d="M5 5l10 10M15 5 5 15" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {schede.map((s) => (
            <div key={s.id} role="tabpanel" hidden={attiva !== s.id}>
              {s.contenuto}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
