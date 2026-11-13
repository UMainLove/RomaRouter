"use client";

import Link from "next/link";
import { useState } from "react";
import { AMBITI, ORDINE_AMBITI, type AmbitoId } from "@/lib/ambiti";
import { hrefDestinazione, type RispostaAgente } from "@/lib/agente/tipi";
import { Icon } from "../Icon";
import { TesseraAmbito } from "../ui/Varie";
import { btnPrimario, etichettaMaiuscola } from "../ui/stili";

// La scheda "Ti porto a…": ambito, dati capiti (chip modificabili), perché e fonte, destinazione.
export function SchedaInstradamento({
  risposta,
  onCambia,
  onAggiungi,
}: {
  risposta: RispostaAgente & { ambito: AmbitoId };
  onCambia: (id: AmbitoId) => void;
  onAggiungi: () => void;
}) {
  const ambito = AMBITI[risposta.ambito];
  const [rimossi, setRimossi] = useState<string[]>([]);
  const [scegli, setScegli] = useState(false);
  const entita = risposta.entita.filter((e) => !e.parametro || !rimossi.includes(e.parametro));
  const href = risposta.destinazione ? hrefDestinazione(risposta.destinazione, rimossi) : null;

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-panel">
      <div className={`flex items-center gap-3 py-2.5 pr-2.5 pl-3.5 ${ambito.classi.tinta}`}>
        <TesseraAmbito id={ambito.id} size={36} />
        <div className="min-w-0 flex-1">
          <p className={`${etichettaMaiuscola} ${ambito.classi.testo}`}>Ti porto a</p>
          <p className="text-lg leading-6 font-bold">{ambito.nome}</p>
        </div>
        <button
          type="button"
          onClick={() => setScegli((s) => !s)}
          aria-expanded={scegli}
          className="min-h-11 shrink-0 rounded-[10px] border-[1.5px] border-campo bg-panel px-3.5 text-[15px] font-semibold hover:bg-bg-sink"
        >
          Cambia
        </button>
      </div>

      {scegli && (
        <div className="flex flex-wrap gap-1.5 border-b border-line-soft px-3.5 py-3" role="group" aria-label="Scegli un altro ambito">
          {ORDINE_AMBITI.filter((id) => id !== ambito.id).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setScegli(false);
                onCambia(id);
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-panel px-3.5 text-[15px] font-semibold hover:bg-bg-sink"
            >
              <TesseraAmbito id={id} size={24} />
              {AMBITI[id].nome}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2.5 px-3.5 pt-3 pb-3.5">
        <p className={etichettaMaiuscola}>Ho capito</p>
        <ul className="flex flex-wrap gap-1.5">
          {entita.map((e) =>
            e.parametro ? (
              <li key={e.chiave}>
                <button
                  type="button"
                  aria-label={`Togli: ${e.etichetta}`}
                  onClick={() => setRimossi((r) => [...r, e.parametro!])}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-bg py-0 pr-2.5 pl-3.5 text-[15px] font-semibold hover:bg-bg-sink"
                >
                  {e.etichetta}
                  <Icon name="chiudi" size={16} strokeWidth={2.2} className="text-muted" />
                </button>
              </li>
            ) : (
              <li
                key={e.chiave}
                className="inline-flex min-h-11 items-center rounded-full border border-line bg-bg px-3.5 text-[15px] font-semibold"
              >
                {e.etichetta}
              </li>
            ),
          )}
          <li>
            <button
              type="button"
              onClick={onAggiungi}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-campo bg-panel px-3.5 text-[15px] font-semibold text-ink-soft hover:bg-bg-sink"
            >
              <Icon name="piu" size={16} strokeWidth={2.2} />
              Aggiungi
            </button>
          </li>
        </ul>
        {(risposta.perche || risposta.fonte) && (
          <p className="flex gap-2 text-sm leading-5 text-ink-soft">
            <Icon name="info" size={18} className="mt-px shrink-0 text-muted" />
            <span>
              {risposta.perche && <>Perché qui: {risposta.perche} </>}
              {risposta.fonte && <span className="text-muted">Fonte: {risposta.fonte}.</span>}
            </span>
          </p>
        )}
        {href && risposta.destinazione && (
          <Link href={href} className={`${btnPrimario} w-full`}>
            {risposta.destinazione.etichetta}
            <Icon name="freccia" size={18} strokeWidth={2} />
          </Link>
        )}
      </div>
    </div>
  );
}
