"use client";

import type { Sezione } from "@/lib/sezioni";

/** Pulsante che porta alla mappa della sezione e vi apre un elemento (gestito da MappaSezione). */
export function VediSuMappa({ sezione, id, etichetta }: { sezione: Sezione; id: number | string; etichetta: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("rr:apri-su-mappa", { detail: { sezione, id } }))}
      className="font-semibold text-accent hover:underline"
      aria-label={`Mostra sulla mappa: ${etichetta}`}
    >
      Mappa
    </button>
  );
}
