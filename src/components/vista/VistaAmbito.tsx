import type { ReactNode } from "react";
import { voce, type VoceId } from "@/lib/ambiti";
import { TesseraVoce } from "../ui/Varie";

/*
 * Impaginazione comune delle cinque viste: a sinistra intestazione, barra con l'agente e pannello
 * con filtri ed elenco; a destra la mappa a tutta altezza. Su telefono: barra, mappa, pannello.
 * Riempie lo spazio sotto la testata: la pagina non scorre, scorre solo l'elenco.
 */
export function VistaAmbito({
  voceId,
  barra,
  mappa,
  children,
}: {
  voceId: VoceId;
  barra: ReactNode;
  mappa: ReactNode;
  children: ReactNode;
}) {
  const v = voce(voceId);
  return (
    <main className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)_minmax(0,42%)] overflow-hidden lg:grid-cols-[minmax(380px,460px)_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)]">
      <div className="flex flex-col gap-4 px-4 pt-5 pb-4 sm:px-6 lg:col-start-1 lg:row-start-1 lg:border-r lg:border-line lg:bg-panel">
        <div className="flex items-center gap-3">
          <TesseraVoce id={voceId} size={44} />
          <div className="min-w-0">
            <h1 className="text-[22px] leading-7 font-bold tracking-[-0.01em]">{v.nome}</h1>
            <p className="text-sm leading-5 text-ink-soft">{v.breve}</p>
          </div>
        </div>
        {barra}
      </div>

      <div className="relative min-h-0 border-y border-line lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-0">
        {mappa}
      </div>

      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-4 pt-4 pb-6 *:shrink-0 sm:px-6 lg:col-start-1 lg:row-start-2 lg:border-r lg:border-line lg:bg-panel lg:pt-1">
        {children}
      </div>
    </main>
  );
}
