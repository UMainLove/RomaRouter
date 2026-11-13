"use client";

import { useRef } from "react";
import { Icon } from "../Icon";
import { PulsanteVoce } from "./PulsanteVoce";
import { useDettatura } from "./useDettatura";

// Campo grande della home: invia a /chiedi?q=… (funziona anche senza JavaScript).
export function CampoRichiesta() {
  const form = useRef<HTMLFormElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const { stato, avvia } = useDettatura((testo) => {
    if (area.current) area.current.value = testo;
    form.current?.requestSubmit();
  });

  return (
    <form
      ref={form}
      action="/chiedi"
      className="flex flex-col gap-2.5 rounded-[18px] border-[1.5px] border-campo bg-panel py-4 pr-4 pl-5 shadow-[0_10px_28px_rgba(37,29,28,.08)]"
    >
      <label htmlFor="rr-q" className="text-sm font-bold text-ink-soft">
        La tua richiesta
      </label>
      <textarea
        ref={area}
        id="rr-q"
        name="q"
        rows={2}
        required
        maxLength={500}
        placeholder="Es. «Ho perso lo zaino sul tram 8 ieri sera»"
        className="resize-none bg-transparent text-xl leading-[30px] text-ink outline-none sm:text-[22px]"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            form.current?.requestSubmit();
          }
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-muted">
          <Icon name="scudo" size={18} className="text-ok" />
          Nessun dato personale salvato · ogni risposta cita la fonte
        </p>
        <div className="flex gap-2.5">
          <PulsanteVoce stato={stato} onClick={avvia} size={52} />
          <button
            type="submit"
            className="inline-flex h-[52px] items-center gap-2.5 rounded-[14px] bg-amaranto px-5 text-lg font-bold text-white hover:bg-amaranto-scuro"
          >
            Chiedi
            <Icon name="freccia" size={20} strokeWidth={2} />
          </button>
        </div>
      </div>
    </form>
  );
}
