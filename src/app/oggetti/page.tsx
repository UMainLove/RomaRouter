import type { Metadata } from "next";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { CatalogoOggetti } from "@/components/oggetti/CatalogoOggetti";
import { IntestazionePagina, NotaPrivacy } from "@/components/ui/Varie";
import { contenitore } from "@/components/ui/stili";
import { UFFICIO_OGGETTI } from "@/data/esempi";

export const metadata: Metadata = { title: "Oggetti smarriti" };

const PASSI = [
  { titolo: "Trova l'oggetto", testo: "Cerca per tipo, data e luogo. Nel catalogo c'è solo la descrizione, mai dati personali." },
  { titolo: "Dimostra che è tuo", testo: "Descrivi un dettaglio che non è pubblicato, per esempio cosa c'era dentro." },
  { titolo: "Scegli chi ritira", testo: "Di persona con un documento, con una delega firmata o tramite ambasciata o consolato." },
  { titolo: "Prenota l'appuntamento", testo: "Porta il documento e la ricevuta dei diritti di custodia: [IMPORTO]." },
];

export default function PaginaOggetti() {
  return (
    <main className={`${contenitore} flex flex-col gap-6 py-8`}>
      <IntestazionePagina ambito="oggetti" titolo="Oggetti smarriti" sottotitolo="Il catalogo degli oggetti consegnati all'Ufficio Oggetti Rinvenuti" />
      <div className="flex flex-wrap items-start gap-6">
        <div className="min-w-0 flex-[999_1_560px]">
          <Suspense fallback={<p className="text-ink-soft">Carico il catalogo…</p>}>
            <CatalogoOggetti />
          </Suspense>
        </div>
        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <NotaPrivacy>Nel catalogo nessun dato personale: per i documenti compare solo il tipo, mai nomi o numeri.</NotaPrivacy>
          <section className="flex gap-3 rounded-panel border border-line bg-panel p-4">
            <Icon name="segnaposto" size={22} className="mt-0.5 shrink-0 text-oggetti-ink" />
            <div>
              <h2 className="text-base font-bold">{UFFICIO_OGGETTI.nome}</h2>
              <p className="text-[15px] text-ink-soft">{UFFICIO_OGGETTI.indirizzo}</p>
              <p className="mt-1 text-[13px] text-muted">{UFFICIO_OGGETTI.nota}</p>
            </div>
          </section>
          <section id="ritiro" aria-labelledby="t-ritiro" className="flex flex-col gap-3 rounded-panel border border-line bg-panel p-4">
            <h2 id="t-ritiro" className="text-lg font-bold">
              Come funziona il ritiro
            </h2>
            <ol className="flex flex-col gap-3">
              {PASSI.map((p, i) => (
                <li key={p.titolo} className="flex gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-oggetti-tint text-sm font-bold text-oggetti-ink">{i + 1}</span>
                  <span>
                    <b className="block text-[15px]">{p.titolo}</b>
                    <span className="text-sm leading-5 text-ink-soft">{p.testo}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </main>
  );
}
