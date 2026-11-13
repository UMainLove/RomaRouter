"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AMBITI, ORDINE_AMBITI } from "@/lib/ambiti";
import { BarraAgente } from "../agente/BarraAgente";
import { Icon } from "../Icon";
import { Mappa } from "../mappa/Mappa";
import { puntiMappa } from "../mappa/punti";
import { CampioneForma, TesseraAmbito } from "../ui/Varie";
import { VistaAmbito } from "./VistaAmbito";

/** "Non è tra questi?": l'assistente generale e la mappa con i punti di tutti gli ambiti. */
export function VistaAltro() {
  const punti = useMemo(() => puntiMappa(), []);
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const scelto = punti.find((p) => p.id === selezionato) ?? null;

  return (
    <VistaAmbito
      voceId="altro"
      barra={<BarraAgente voceId="altro" fuoco />}
      mappa={<Mappa titolo="Mappa di tutti gli ambiti" punti={punti} selezionato={selezionato} onSeleziona={setSelezionato} />}
    >
      {scelto && (
        <article aria-live="polite" className="flex items-start gap-3 rounded-panel border border-ink bg-panel p-3.5">
          <TesseraAmbito id={scelto.ambito} size={40} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className={`text-xs font-bold tracking-[0.06em] uppercase ${AMBITI[scelto.ambito].classi.testo}`}>{AMBITI[scelto.ambito].nome}</p>
            <h2 className="text-base leading-[22px] font-bold">{scelto.nome}</h2>
            <p className="text-sm leading-5 text-ink-soft">{scelto.dettaglio}</p>
            <Link href={scelto.href} className="inline-flex min-h-11 items-center gap-1 self-start text-[15px] font-bold text-amaranto">
              Apri
              <Icon name="avanti" size={16} strokeWidth={2} />
            </Link>
          </div>
          <button type="button" onClick={() => setSelezionato(null)} aria-label="Chiudi la scheda" className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-bg-sink hover:text-ink">
            <Icon name="chiudi" size={16} strokeWidth={2.2} />
          </button>
        </article>
      )}

      <section aria-labelledby="t-ambiti" className="flex flex-col gap-2">
        <h2 id="t-ambiti" className="text-sm font-bold text-muted">
          Oppure scegli un ambito
        </h2>
        <ul className="flex flex-col gap-2">
          {ORDINE_AMBITI.map((id) => (
            <li key={id}>
              <Link href={AMBITI[id].href} className="flex items-center gap-3 rounded-panel border border-line bg-panel p-3 hover:border-campo">
                <TesseraAmbito id={id} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] leading-5 font-bold">{AMBITI[id].nome}</span>
                  <span className="block text-sm leading-5 text-ink-soft">{AMBITI[id].breve}</span>
                </span>
                <CampioneForma id={id} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-sm leading-5 text-ink-soft">
        Per anagrafe, tributi, mobilità e segnalazioni l&apos;assistente ti indica la pagina ufficiale del portale di Roma Capitale.
      </p>
    </VistaAmbito>
  );
}
