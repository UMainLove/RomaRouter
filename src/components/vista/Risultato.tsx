"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { AMBITI, type AmbitoId } from "@/lib/ambiti";
import { Icon, type IconName } from "../Icon";
import { TesseraAmbito } from "../ui/Varie";

/**
 * Una riga dell'elenco, legata al segnaposto sulla mappa: toccarla lo evidenzia,
 * toccare il segnaposto la apre qui (e la porta in vista). I dettagli e l'azione
 * compaiono solo quando è scelta, così l'elenco resta leggero.
 */
export function Risultato({
  id,
  ambito,
  titolo,
  sottotitolo,
  icona,
  scelto,
  onScegli,
  etichette,
  dettagli,
  azione,
}: {
  id: string;
  ambito: AmbitoId;
  titolo: string;
  sottotitolo: ReactNode;
  icona?: IconName;
  scelto: boolean;
  onScegli: (id: string) => void;
  etichette?: ReactNode;
  dettagli?: ReactNode;
  azione?: { href: string; etichetta: string };
}) {
  const riga = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (scelto) riga.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [scelto]);

  return (
    <li ref={riga} className={`rounded-panel border bg-panel transition-colors ${scelto ? "border-ink shadow-[0_8px_24px_rgba(37,29,28,.10)]" : "border-line hover:border-campo"}`}>
      <button type="button" aria-expanded={scelto} onClick={() => onScegli(id)} className="flex w-full items-start gap-3 p-3.5 text-left">
        {icona ? (
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-card ${AMBITI[ambito].classi.tinta} ${AMBITI[ambito].classi.testo}`}>
            <Icon name={icona} size={22} strokeWidth={1.8} />
          </span>
        ) : (
          <TesseraAmbito id={ambito} size={40} />
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-base leading-[22px] font-bold">{titolo}</span>
          <span className="text-sm leading-5 text-ink-soft">{sottotitolo}</span>
          {etichette && <span className="flex flex-wrap gap-1.5 pt-0.5">{etichette}</span>}
        </span>
        <Icon name="giu" size={18} className={`mt-1 shrink-0 text-muted transition-transform ${scelto ? "rotate-180" : ""}`} />
      </button>
      {scelto && (dettagli || azione) && (
        <div className="flex flex-col gap-3 border-t border-line-soft px-3.5 pt-3 pb-3.5">
          {dettagli}
          {azione && (
            <Link
              href={azione.href}
              className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-card bg-amaranto px-4 text-[15px] font-bold text-white hover:bg-amaranto-scuro"
            >
              {azione.etichetta}
              <Icon name="freccia" size={18} strokeWidth={2} />
            </Link>
          )}
        </div>
      )}
    </li>
  );
}

export function Elenco({ children, etichetta }: { children: ReactNode; etichetta: string }) {
  return (
    <ol aria-label={etichetta} className="flex flex-col gap-2.5">
      {children}
    </ol>
  );
}

export function Vuoto({ children }: { children: ReactNode }) {
  return <p className="rounded-panel border border-dashed border-line bg-panel p-4 text-[15px] text-ink-soft">{children}</p>;
}
