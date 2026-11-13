import type { ReactNode } from "react";
import { voce, type VoceId } from "@/lib/ambiti";
import { TesseraVoce } from "../ui/Varie";

/*
 * Impaginazione comune delle cinque viste: a sinistra intestazione, barra con l'agente e pannello
 * con filtri ed elenco; a destra la mappa a tutta altezza. Su telefono: barra, mappa, pannello.
 * L'altezza su desktop toglie quella della testata (h-16, vedi Header).
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
    <main className="grid flex-1 grid-cols-1 lg:h-[calc(100dvh-4rem)] lg:flex-none lg:grid-cols-[minmax(380px,460px)_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)]">
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

      <div className="relative h-[48vh] min-h-[300px] border-y border-line lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-auto lg:min-h-0 lg:border-0">
        {mappa}
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4 pb-10 *:shrink-0 sm:px-6 lg:col-start-1 lg:row-start-2 lg:overflow-y-auto lg:border-r lg:border-line lg:bg-panel lg:pt-1">
        {children}
      </div>
    </main>
  );
}
