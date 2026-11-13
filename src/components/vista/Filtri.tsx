"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, type ReactNode } from "react";
import { Icon, type IconName } from "../Icon";

/**
 * I filtri di ogni ambito stanno nell'URL: l'agente li scrive (barra di ricerca),
 * i controlli qui sotto li cambiano, elenco e mappa li leggono.
 */
export function useFiltri(base: string) {
  const parametri = useSearchParams();
  const router = useRouter();
  const imposta = useCallback(
    (modifiche: Record<string, string | null>) => {
      const qs = new URLSearchParams(parametri.toString());
      for (const [k, v] of Object.entries(modifiche)) {
        if (v) qs.set(k, v);
        else qs.delete(k);
      }
      const s = qs.toString();
      router.replace(s ? `${base}?${s}` : base, { scroll: false });
    },
    [parametri, router, base],
  );
  const azzera = useCallback((chiavi: string[]) => imposta(Object.fromEntries(chiavi.map((k) => [k, null]))), [imposta]);
  return { parametri, imposta, azzera };
}

const baseChip = "relative inline-flex min-h-11 items-center gap-1.5 rounded-full border text-[15px] transition-colors";
const ATTIVO = "border-ink bg-bg-sink font-bold text-ink";
const SPENTO = "border-line bg-panel font-semibold text-ink-soft hover:border-campo hover:text-ink";

/** Menu a tendina vestito da chip: pieno quando ha un valore. */
export function SceltaChip({
  etichetta,
  valore,
  vuoto,
  opzioni,
  onChange,
}: {
  etichetta: string;
  valore: string;
  vuoto: string;
  opzioni: { valore: string; etichetta: string }[];
  onChange: (v: string) => void;
}) {
  const attivo = Boolean(valore);
  return (
    <label className={`${baseChip} ${attivo ? ATTIVO : SPENTO}`}>
      <span className="sr-only">{etichetta}</span>
      <select
        value={valore}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 cursor-pointer appearance-none rounded-full bg-transparent py-0 pr-9 pl-3.5 outline-none"
      >
        <option value="">{vuoto}</option>
        {opzioni.map((o) => (
          <option key={o.valore} value={o.valore}>
            {o.etichetta}
          </option>
        ))}
      </select>
      <Icon name="giu" size={16} strokeWidth={2.2} className="pointer-events-none absolute right-3" />
    </label>
  );
}

/** Interruttore vestito da chip (aria-pressed). */
export function InterruttoreChip({
  attivo,
  onClick,
  icona,
  children,
}: {
  attivo: boolean;
  onClick: () => void;
  icona?: IconName;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={attivo}
      onClick={onClick}
      className={`${baseChip} px-3.5 ${attivo ? ATTIVO : SPENTO}`}
    >
      {attivo ? <Icon name="spunta" size={16} strokeWidth={2.4} /> : icona && <Icon name={icona} size={16} strokeWidth={2} />}
      {children}
    </button>
  );
}

/** Filtro testuale messo dall'agente (es. «zaino»): si toglie con la ×. */
export function ChipRimovibile({ children, onRimuovi, etichettaRimuovi }: { children: ReactNode; onRimuovi: () => void; etichettaRimuovi: string }) {
  return (
    <button
      type="button"
      onClick={onRimuovi}
      aria-label={etichettaRimuovi}
      className={`${baseChip} ${ATTIVO} pr-2.5 pl-3.5`}
    >
      {children}
      <Icon name="chiudi" size={16} strokeWidth={2.2} />
    </button>
  );
}

export function RigaFiltri({ children, onAzzera, attivi }: { children: ReactNode; onAzzera: () => void; attivi: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Filtri" className="flex flex-wrap gap-2">
        {children}
      </div>
      {attivi && (
        <button type="button" onClick={onAzzera} className="self-start text-sm font-bold text-ink-soft underline-offset-2 hover:underline">
          Togli tutti i filtri
        </button>
      )}
    </div>
  );
}

/** Conteggio dei risultati, annunciato agli screen reader quando cambia. */
export function Conteggio({ children }: { children: ReactNode }) {
  return (
    <p className="text-[15px] font-bold" aria-live="polite">
      {children}
    </p>
  );
}
