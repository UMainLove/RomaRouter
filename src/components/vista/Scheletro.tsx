import { VistaAmbito } from "./VistaAmbito";
import type { VoceId } from "@/lib/ambiti";

/** Guscio statico della vista, mostrato finché i filtri dell'URL non sono letti nel browser. */
export function Scheletro({ voceId }: { voceId: VoceId }) {
  return (
    <VistaAmbito
      voceId={voceId}
      barra={<div aria-hidden="true" className="h-[54px] rounded-full border-[1.5px] border-campo bg-panel" />}
      mappa={<div aria-hidden="true" className="absolute inset-0 bg-mappa" />}
    >
      <p className="text-[15px] text-ink-soft">Carico…</p>
    </VistaAmbito>
  );
}
