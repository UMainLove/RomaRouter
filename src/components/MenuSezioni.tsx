"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { VOCI, type Voce } from "@/lib/ambiti";
import { TesseraVoce } from "./ui/Varie";

/*
 * Telefono e tablet (sotto lg): le cinque voci stanno in un menu verticale, aperto da un cerchio con il
 * burger accanto a «Operatori». Il cerchio prende il colore della sezione in cui sei, così resta chiaro
 * dove ti trovi anche senza la riga delle sezioni. Su desktop non c'è: la testata mostra le voci in riga.
 */
function vocePer(percorso: string) {
  return VOCI.find((v) => percorso === v.href || percorso.startsWith(v.href + "/")) ?? null;
}

export function MenuSezioni() {
  const percorso = usePathname();
  return <Menu attiva={vocePer(percorso)} chiave={percorso} />;
}

/** Senza sezione attiva: fallback mentre il percorso non è noto (rotte dinamiche). */
export function MenuSezioniStatico() {
  return <Menu attiva={null} chiave="" />;
}

function Menu({ attiva, chiave }: { attiva: Voce | null; chiave: string }) {
  const [aperto, setAperto] = useState(false);
  const [percorso, setPercorso] = useState(chiave);
  const id = useId();
  const bottone = useRef<HTMLButtonElement>(null);
  const pannello = useRef<HTMLDivElement>(null);

  // cambiando pagina il menu si chiude
  if (percorso !== chiave) {
    setPercorso(chiave);
    setAperto(false);
  }

  useEffect(() => {
    if (!aperto) return;
    const tasto = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAperto(false);
      bottone.current?.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", tasto);
    // da tastiera si parte dalla sezione in cui sei (o dalla prima)
    const voci = pannello.current;
    (voci?.querySelector<HTMLElement>("[aria-current=page]") ?? voci?.querySelector<HTMLElement>("a"))?.focus({ preventScroll: true });
    return () => document.removeEventListener("keydown", tasto);
  }, [aperto]);

  const colore = attiva ? (attiva.id === "altro" ? "var(--color-ink)" : `var(--color-${attiva.id})`) : null;
  const stile: CSSProperties | undefined = colore ? { background: colore, color: "#fff" } : undefined;

  return (
    <div className="-ml-1 lg:hidden">
      <button
        ref={bottone}
        type="button"
        aria-expanded={aperto}
        aria-controls={id}
        aria-label={aperto ? "Chiudi il menu delle sezioni" : attiva ? `Sezioni (sei in ${attiva.nome})` : "Sezioni"}
        onClick={() => setAperto((v) => !v)}
        className={`flex size-11 items-center justify-center rounded-full transition ${colore ? "shadow-[0_2px_8px_rgba(37,29,28,.18)]" : "bg-bg-sink text-ink hover:bg-line"}`}
        style={stile}
      >
        <svg viewBox="0 0 24 24" className="size-[20px]" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
          {aperto ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {aperto && (
        <>
          {/* velo sulla pagina sotto la testata: toccandolo il menu si chiude */}
          <div className="absolute inset-x-0 top-full h-dvh bg-ink/25 backdrop-blur-[2px]" aria-hidden="true" onClick={() => setAperto(false)} />
          <div
            ref={pannello}
            id={id}
            className="absolute inset-x-0 top-full rounded-b-[24px] border-b border-line bg-panel px-3 pt-2 pb-4 shadow-[0_18px_40px_rgba(37,29,28,.22)]"
          >
            <nav aria-label="Ambiti">
              <ul className="flex flex-col gap-1">
                {VOCI.map((v) => {
                  const qui = attiva?.id === v.id;
                  return (
                    <li key={v.id}>
                      <Link
                        href={v.href}
                        aria-current={qui ? "page" : undefined}
                        onClick={() => setAperto(false)}
                        className={`flex min-h-16 items-center gap-3 rounded-[18px] px-2.5 py-2 ${qui ? "bg-bg-sink" : "hover:bg-bg-sink"}`}
                      >
                        <TesseraVoce id={v.id} size={40} />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-[17px] leading-6 font-bold text-ink">{v.nome}</span>
                          <span className="truncate text-[13.5px] leading-5 text-ink-soft">{v.breve}</span>
                        </span>
                        {qui && <span className="shrink-0 rounded-full bg-panel px-2.5 py-1 text-[12px] font-bold text-ink-soft ring-1 ring-line">Sei qui</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
