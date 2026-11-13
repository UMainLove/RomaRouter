"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { POSTAZIONI, ZONE } from "@/data/esempi";
import { Icon } from "../Icon";
import { Etichetta, TesseraAmbito } from "../ui/Varie";
import { btnSecondario } from "../ui/stili";

export function ElencoPostazioni() {
  const parametri = useSearchParams();
  const zonaChiave = parametri.get("zona") ?? "";
  const giorno = parametri.get("giorno") ?? "";
  const zona = ZONE[zonaChiave] ?? null;
  const postazioni = POSTAZIONI.filter((p) => !zona || p.quartiere === zona.nome);
  const suffisso = giorno ? `?giorno=${giorno}` : "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base font-bold" aria-live="polite">
          {postazioni.length === 1 ? "1 postazione" : `${postazioni.length} postazioni`}
          {zona && <span className="font-normal text-ink-soft"> a {zona.nome}</span>}
          {zona && (
            <>
              {" · "}
              <Link href="/arte" className="font-bold">
                tutte
              </Link>
            </>
          )}
        </p>
        <Link href={`/mappa?livelli=arte${zonaChiave ? `&zona=${zonaChiave}` : ""}`} className={btnSecondario}>
          <Icon name="mappa" size={18} />
          Chi si esibisce oggi, sulla mappa
        </Link>
      </div>
      <ol className="grid gap-3 md:grid-cols-2">
        {postazioni.map((p) => (
          <li key={p.id}>
            <Link href={`/arte/${p.id}${suffisso}`} className="flex h-full gap-3.5 rounded-panel border border-line bg-panel p-4 hover:border-campo">
              <TesseraAmbito id="arte" size={44} />
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-[17px] leading-6 font-bold">Postazione {p.codice}</span>
                <span className="text-sm leading-5 text-ink-soft">
                  {p.luogo} · Municipio {p.municipio}
                </span>
                <span className="flex flex-wrap gap-1.5 pt-0.5">
                  <Etichetta icona="orologio">Turni da 2 ore</Etichetta>
                  {p.amplificazione ? <Etichetta>Amplificazione a basso volume</Etichetta> : <Etichetta icona="silenzio">Senza amplificazione</Etichetta>}
                  {p.unesco && <Etichetta icona="scudo">Area UNESCO</Etichetta>}
                </span>
              </span>
              <Icon name="avanti" size={18} className="mt-1 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
