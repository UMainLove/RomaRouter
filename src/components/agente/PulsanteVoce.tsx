"use client";

import { Icon } from "../Icon";
import type { StatoDettatura } from "./useDettatura";

export function PulsanteVoce({ stato, onClick, size = 48 }: { stato: StatoDettatura; onClick: () => void; size?: number }) {
  const ascolto = stato === "ascolto";
  const etichetta =
    stato === "non-disponibile"
      ? "Dettatura non disponibile in questo browser"
      : ascolto
        ? "Ferma la dettatura"
        : "Parla con l'agente";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={stato === "non-disponibile"}
      aria-label={etichetta}
      title={etichetta}
      aria-pressed={ascolto}
      className={`flex shrink-0 items-center justify-center rounded-full border-[1.5px] disabled:cursor-not-allowed disabled:opacity-50 ${
        ascolto ? "border-amaranto bg-amaranto text-white" : "border-campo bg-panel text-ink hover:bg-bg-sink"
      }`}
      style={{ width: size, height: size }}
    >
      {ascolto ? <Icon name="stop" size={20} /> : <Icon name="microfono" size={21} />}
    </button>
  );
}
