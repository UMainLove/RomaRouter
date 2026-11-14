"use client";

import { useId, useState } from "react";
import { Icon } from "../Icon";

const COLORI_SUGGERITI = [
  "beige",
  "color sabbia",
  "color lilla",
  "color verde smeraldo",
  "nero",
  "blu",
  "marrone",
  "rosso",
  "grigio",
  "bianco",
  "argento",
];

/**
 * Pillola di inserimento colore libero (rounded-full, coerente con SceltaChip)
 * dotata di pulsante punto interrogativo (?) che consiglia di verificare su Google
 * l'esatta corrispondenza cromatica dell'oggetto smarrito.
 */
export function PillolaColore({
  valore,
  onChange,
  onInvio,
  extraColori = [],
  etichetta = "Colore dell'oggetto smarrito",
}: {
  valore: string;
  onChange: (valore: string) => void;
  onInvio?: () => void;
  extraColori?: string[];
  etichetta?: string;
}) {
  const [aiutoAperto, setAiutoAperto] = useState(false);
  const listId = useId();
  const helpId = useId();
  const attivo = Boolean(valore.trim());

  const opzioni = Array.from(new Set([...COLORI_SUGGERITI, ...extraColori.filter(Boolean)]));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={`relative inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border pr-2 pl-4 text-[15px] transition-colors ${
            attivo
              ? "border-ink bg-bg-sink font-bold text-ink"
              : "border-line bg-panel font-semibold text-ink-soft hover:border-campo hover:text-ink"
          }`}
        >
          <span className="sr-only">{etichetta}</span>
          <input
            type="text"
            list={listId}
            value={valore}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && onInvio) {
                e.preventDefault();
                onInvio();
              }
            }}
            placeholder="Colore (beige, color sabbia, lilla, verde smeraldo)"
            className="w-64 max-w-[66vw] bg-transparent text-[15px] text-ink outline-none placeholder:font-normal placeholder:text-muted sm:w-80"
          />
          {attivo && (
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Cancella colore"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-panel hover:text-ink"
            >
              <Icon name="chiudi" size={14} strokeWidth={2.4} />
            </button>
          )}
          <button
            type="button"
            aria-expanded={aiutoAperto}
            aria-controls={helpId}
            aria-label="Consiglio: verifica il colore su Google"
            title="Vai su Google a verificare che il colore digitato corrisponda realmente al colore dell'oggetto smarrito"
            onClick={(e) => {
              e.preventDefault();
              setAiutoAperto((aperto) => !aperto);
            }}
            className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
              aiutoAperto
                ? "border-ink bg-ink text-white"
                : "border-campo bg-bg-sink text-ink hover:border-ink hover:bg-panel"
            }`}
          >
            ?
          </button>
          <datalist id={listId}>
            {opzioni.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
      </div>

      {aiutoAperto && (
        <div
          id={helpId}
          role="note"
          className="rounded-card border border-line bg-bg-sink px-3.5 py-2.5 text-xs leading-5 text-ink-soft"
        >
          <b className="text-ink">Consiglio sul colore:</b> ti consigliamo di andare su{" "}
          <a
            href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
              valore.trim() ? `colore ${valore.trim()}` : "nomi colori sfumature esempi",
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-amaranto underline underline-offset-2 hover:text-amaranto-scuro"
          >
            Google a verificare che il colore digitato corrisponda realmente al colore dell&apos;oggetto smarrito
          </a>{" "}
          (es. <em>beige</em> vs <em>color sabbia</em>, <em>color lilla</em>, <em>color verde smeraldo</em>).
        </div>
      )}
    </div>
  );
}
