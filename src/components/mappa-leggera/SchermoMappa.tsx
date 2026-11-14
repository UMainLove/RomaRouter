"use client";

import { useEffect, useRef, type ReactNode } from "react";

/*
 * Pagina "a tutta mappa": la mappa occupa lo schermo sotto la testata, i comandi le stanno sopra.
 *  - computer: una colonna stretta a sinistra che galleggia sulla mappa (ricerca in alto, sotto il
 *    risultato, che c'e' solo quando serve);
 *  - telefono: ricerca in alto, risultato in un foglio in basso. Il foglio basso mostra la prima riga
 *    (il verdetto), con un tocco sulla maniglia si apre.
 * Il contenuto del foglio si scrive una volta sola (niente doppioni tra telefono e computer).
 */
export function SchermoMappa({
  mappa,
  testa,
  pannello,
  foglioAperto,
  onFoglio,
  etichettaPannello,
  chiave,
}: {
  mappa: ReactNode;
  testa: ReactNode;
  pannello: ReactNode | null;
  foglioAperto: boolean;
  onFoglio: (aperto: boolean) => void;
  etichettaPannello: string;
  /** Cambia quando cambia il contenuto (es. un nuovo verdetto): il foglio torna in cima. */
  chiave?: string;
}) {
  const corpo = useRef<HTMLDivElement>(null);
  // un risultato nuovo riparte dall'inizio
  useEffect(() => {
    corpo.current?.scrollTo({ top: 0 });
  }, [chiave]);

  return (
    <main className="relative isolate h-[calc(100svh-7.1rem)] min-h-[460px] overflow-hidden sm:h-[calc(100svh-7.25rem)] lg:h-[calc(100dvh-4rem)]">
      {mappa}
      <div className="pointer-events-none absolute inset-0 z-[500] flex flex-col justify-between gap-2 p-3 lg:right-auto lg:w-[416px] lg:justify-start lg:p-4">
        <div className="pointer-events-auto rounded-[14px] border border-line bg-panel/95 p-2.5 shadow-[0_6px_20px_rgba(37,29,28,.14)] backdrop-blur">
          {testa}
        </div>
        {pannello && (
          <section
            aria-label={etichettaPannello}
            className={`pointer-events-auto -mx-3 -mb-3 flex min-h-0 flex-col rounded-t-[18px] border-t border-line bg-panel shadow-[0_-6px_24px_rgba(37,29,28,.16)] transition-[max-height] duration-300 lg:m-0 lg:max-h-none lg:flex-initial lg:rounded-[14px] lg:border lg:shadow-[0_6px_20px_rgba(37,29,28,.14)] lg:transition-none ${
              foglioAperto ? "max-h-[72%]" : "max-h-[148px]"
            }`}
          >
            <button
              type="button"
              onClick={() => onFoglio(!foglioAperto)}
              aria-expanded={foglioAperto}
              className="flex min-h-7 w-full shrink-0 items-center justify-center pt-2 lg:hidden"
            >
              <span className="h-1.5 w-10 rounded-full bg-line" aria-hidden="true" />
              <span className="sr-only">{foglioAperto ? "Riduci" : "Apri i dettagli"}</span>
            </button>
            <div
              ref={corpo}
              className={`min-h-0 flex-1 overscroll-contain px-4 pt-1 pb-4 lg:overflow-y-auto lg:pt-4 ${foglioAperto ? "overflow-y-auto" : "overflow-hidden"}`}
              onClick={(e) => {
                // telefono: toccare il foglio chiuso lo apre (ma non ruba i clic su link e bottoni)
                if (!foglioAperto && !(e.target as HTMLElement).closest("a,button,input,select,textarea,label")) onFoglio(true);
              }}
            >
              {pannello}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
