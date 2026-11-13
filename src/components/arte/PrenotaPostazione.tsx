"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { TURNI, turnoOccupato, type Postazione } from "@/data/esempi";
import { prossimiGiorni } from "@/lib/formato";
import { Icon } from "../Icon";
import { Etichetta, NotaPrivacy } from "../ui/Varie";
import { btnPrimario } from "../ui/stili";

export function PrenotaPostazione({ postazione }: { postazione: Postazione }) {
  const giornoRichiesto = useSearchParams().get("giorno");
  const [giorni, setGiorni] = useState<ReturnType<typeof prossimiGiorni>>([]);
  const [giorno, setGiorno] = useState<string | null>(null);
  const [turno, setTurno] = useState<number | null>(null);
  const [confermata, setConfermata] = useState(false);

  // I giorni dipendono dalla data di oggi: si calcolano solo nel browser.
  useEffect(() => {
    const t = setTimeout(() => {
      const prossimi = prossimiGiorni(7);
      setGiorni(prossimi);
      setGiorno(prossimi.some((g) => g.iso === giornoRichiesto) ? giornoRichiesto : (prossimi[0]?.iso ?? null));
    }, 0);
    return () => clearTimeout(t);
  }, [giornoRichiesto]);

  const g = giorni.find((x) => x.iso === giorno);

  if (confermata && g && turno !== null) {
    return (
      <div className="flex flex-col gap-3 rounded-panel border border-line bg-panel p-5">
        <p className="flex items-center gap-2 text-lg font-bold text-ok">
          <Icon name="spunta" size={22} strokeWidth={2.4} />
          Turno prenotato
        </p>
        <p className="text-base">
          Postazione {postazione.codice}, {g.giorno} {g.numero} {g.mese}, {TURNI[turno]}.
        </p>
        <NotaPrivacy>Prototipo: la prenotazione non è stata salvata.</NotaPrivacy>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="flex items-center gap-2 self-start rounded-full bg-ok-tint px-3 py-1 text-sm font-bold text-ok">
        <Icon name="spunta" size={16} strokeWidth={2.4} />
        Sei nel Registro dell&apos;Arte di Strada (demo)
      </p>

      <ul aria-label="Regole della postazione" className="flex flex-col gap-2 text-[15px] text-ink-soft">
        <li className="flex items-center gap-2.5">
          <Icon name="orologio" size={18} className="text-arte-ink" />
          Turni da 2 ore, uno al giorno
        </li>
        <li className="flex items-center gap-2.5">
          <Icon name="silenzio" size={18} className="text-arte-ink" />
          {postazione.amplificazione ? "Amplificazione consentita a basso volume" : "Senza amplificazione"}
        </li>
        {postazione.unesco && (
          <li className="flex items-center gap-2.5">
            <Icon name="scudo" size={18} className="text-arte-ink" />
            Area UNESCO: valgono le regole del Centro Storico
          </li>
        )}
      </ul>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-lg font-bold">Quando?</legend>
        <div role="radiogroup" aria-label="Giorno" className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {giorni.map((d) => (
            <button
              key={d.iso}
              type="button"
              role="radio"
              aria-checked={giorno === d.iso}
              onClick={() => {
                setGiorno(d.iso);
                setTurno(null);
              }}
              className={`flex min-h-[60px] flex-col items-center justify-center rounded-card ${
                giorno === d.iso ? "border-2 border-amaranto bg-velo text-amaranto" : "border-[1.5px] border-line bg-panel"
              }`}
            >
              <span className="text-xs font-bold uppercase">{d.giorno}</span>
              <span className="text-lg font-bold">{d.numero}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {giorno && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-2 text-lg font-bold">Turno</legend>
          {TURNI.map((t, i) => {
            const occupato = turnoOccupato(postazione.id, giorno, i);
            const scelto = turno === i;
            return (
              <label
                key={t}
                className={`flex min-h-[52px] items-center gap-3 rounded-card px-3.5 ${
                  occupato
                    ? "border-[1.5px] border-line-soft bg-bg-sink text-muted"
                    : scelto
                      ? "border-2 border-amaranto bg-velo"
                      : "border-[1.5px] border-line bg-panel"
                }`}
              >
                <input
                  type="radio"
                  name="turno"
                  disabled={occupato}
                  checked={scelto}
                  onChange={() => setTurno(i)}
                  className="size-5 shrink-0 accent-amaranto"
                />
                <span className="flex-1 text-base font-bold">{t}</span>
                {occupato ? <Etichetta>Occupato</Etichetta> : scelto ? <Etichetta tono="ok">Scelto</Etichetta> : <span className="text-sm font-semibold text-ok">Libero</span>}
              </label>
            );
          })}
        </fieldset>
      )}

      <button type="button" disabled={!g || turno === null} onClick={() => setConfermata(true)} className={btnPrimario}>
        {g && turno !== null ? `Prenota ${g.giorno.toLowerCase()} ${g.numero}, ${TURNI[turno]}` : "Scegli giorno e turno"}
      </button>
    </div>
  );
}
