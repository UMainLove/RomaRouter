"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AMBITI, type AmbitoId } from "@/lib/ambiti";
import type { AmbitoRisposta, Opzione, RichiestaAgente, RispostaAgente } from "@/lib/agente/tipi";
import { Icon } from "../Icon";
import { LogoMark } from "../Logo";
import { Avviso } from "../ui/Varie";
import { btnSecondario } from "../ui/stili";
import { PulsanteVoce } from "./PulsanteVoce";
import { SchedaInstradamento } from "./SchedaInstradamento";
import { useDettatura } from "./useDettatura";

type Voce =
  | { id: number; tipo: "utente"; testo: string }
  | { id: number; tipo: "agente"; risposta: RispostaAgente }
  | { id: number; tipo: "errore"; testo: string };

const ESEMPI = [
  "Ho perso lo zaino ieri sera",
  "Dove gioco a basket vicino a Testaccio? Meglio se gratis",
  "Mettono un'antenna vicino alla scuola di mio figlio?",
  "Voglio suonare a Trastevere sabato",
];

async function chiamaAgente(richiesta: RichiestaAgente): Promise<RispostaAgente> {
  const res = await fetch("/api/agente", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(richiesta),
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export function Conversazione() {
  const iniziale = useSearchParams().get("q")?.trim().slice(0, 500) ?? "";
  const [voci, setVoci] = useState<Voce[]>(() => (iniziale ? [{ id: 0, tipo: "utente", testo: iniziale }] : []));
  const [inAttesa, setInAttesa] = useState(Boolean(iniziale));
  const [testo, setTesto] = useState("");
  const richiesta = useRef<RichiestaAgente>({ messaggi: iniziale ? [iniziale] : [], risposte: {} });
  const contatore = useRef(1);
  const avviata = useRef(false);
  const campo = useRef<HTMLInputElement>(null);
  const fine = useRef<HTMLDivElement>(null);

  const rispondiAgente = useCallback(async () => {
    try {
      const risposta = await chiamaAgente(richiesta.current);
      const id = contatore.current++;
      setVoci((v) => [...v, { id, tipo: "agente", risposta }]);
    } catch {
      const id = contatore.current++;
      setVoci((v) => [...v, { id, tipo: "errore", testo: "Non riesco a rispondere ora. Riprova tra poco." }]);
    } finally {
      setInAttesa(false);
    }
  }, []);

  const invia = useCallback(
    (mostrato: string, aggiorna: (r: RichiestaAgente) => RichiestaAgente) => {
      richiesta.current = aggiorna(richiesta.current);
      const id = contatore.current++;
      setVoci((v) => [...v, { id, tipo: "utente", testo: mostrato }]);
      setInAttesa(true);
      void rispondiAgente();
    },
    [rispondiAgente],
  );

  const inviaTesto = useCallback(
    (t: string) => {
      const pulito = t.trim().slice(0, 500);
      if (!pulito) return;
      setTesto("");
      invia(pulito, (r) => ({ ...r, messaggi: [...r.messaggi, pulito] }));
    },
    [invia],
  );

  const rispondi = (chiave: string, opzione: Opzione) =>
    invia(opzione.etichetta, (r) => ({
      ...r,
      risposte: { ...r.risposte, [chiave]: opzione.valore },
      ambitoForzato: chiave === "ambito" ? (opzione.valore as AmbitoRisposta) : r.ambitoForzato,
    }));

  const cambiaAmbito = (id: AmbitoId) => invia(AMBITI[id].nome, (r) => ({ ...r, ambitoForzato: id }));

  const nuova = () => {
    richiesta.current = { messaggi: [], risposte: {} };
    setVoci([]);
    setTesto("");
    campo.current?.focus();
  };

  const { stato, avvia } = useDettatura(inviaTesto);

  // Prima richiesta arrivata dalla home (?q=…): la risposta arriva in modo asincrono.
  useEffect(() => {
    if (iniziale && !avviata.current) {
      avviata.current = true;
      void rispondiAgente();
    }
  }, [iniziale, rispondiAgente]);

  useEffect(() => {
    fine.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [voci, inAttesa]);

  const ultimaAgente = [...voci].reverse().find((v) => v.tipo === "agente")?.id;

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-4 sm:px-8">
      <div className="flex items-center justify-between gap-3 border-b border-line py-3">
        <h1 className="text-lg font-bold">Chiedi a RomaRouter</h1>
        <button type="button" onClick={nuova} className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] px-3 text-[15px] font-bold text-amaranto hover:bg-velo">
          <Icon name="piu" size={18} strokeWidth={2} />
          Nuova richiesta
        </button>
      </div>

      <div role="log" aria-live="polite" aria-label="Conversazione" className="flex flex-1 flex-col gap-4 py-5">
        {voci.length === 0 && (
          <div className="flex flex-col gap-3 py-6">
            <p className="text-[26px] leading-8 font-bold">Cosa ti serve?</p>
            <p className="text-base text-ink-soft">Scrivi o parla come faresti allo sportello. Ti faccio al massimo una domanda.</p>
            <div className="flex flex-wrap gap-2 pt-2">
              {ESEMPI.map((e) => (
                <button key={e} type="button" onClick={() => inviaTesto(e)} className="inline-flex min-h-11 items-center rounded-full border border-line bg-panel px-3.5 text-left text-[15px] font-semibold hover:bg-bg-sink">
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {voci.map((v) => {
          if (v.tipo === "utente") {
            return (
              <p key={v.id} className="max-w-[86%] self-end rounded-[16px_16px_4px_16px] bg-ink px-4 py-3 text-[17px] leading-6 text-white">
                {v.testo}
              </p>
            );
          }
          if (v.tipo === "errore") {
            return (
              <div key={v.id} className="flex gap-2.5">
                <Avatar />
                <Avviso icona="attenzione">{v.testo}</Avviso>
              </div>
            );
          }
          const r = v.risposta;
          const attiva = v.id === ultimaAgente && !inAttesa;
          return (
            <div key={v.id} className="flex items-start gap-2.5">
              <Avatar />
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <p className="mt-1.5 text-[17px] leading-[25px]">
                  {r.messaggio} {r.domanda && <b>{r.domanda.testo}</b>}
                </p>
                {r.domanda && (
                  <div role="group" aria-label={r.domanda.testo} className="flex flex-wrap gap-1.5">
                    {r.domanda.opzioni.map((o) => (
                      <button
                        key={o.valore}
                        type="button"
                        disabled={!attiva}
                        onClick={() => rispondi(r.domanda!.chiave, o)}
                        className="inline-flex min-h-11 items-center rounded-full border border-line bg-panel px-3.5 text-[15px] font-semibold hover:bg-bg-sink disabled:cursor-default disabled:opacity-60"
                      >
                        {o.etichetta}
                      </button>
                    ))}
                  </div>
                )}
                {!r.domanda && r.ambito && r.ambito !== "altro" && (
                  <SchedaInstradamento
                    risposta={{ ...r, ambito: r.ambito }}
                    onCambia={cambiaAmbito}
                    onAggiungi={() => campo.current?.focus()}
                  />
                )}
                {r.avviso && <Avviso>{r.avviso}</Avviso>}
                {r.esterno && (
                  <a href={r.esterno.href} target="_blank" rel="noopener noreferrer" className={`${btnSecondario} self-start`}>
                    {r.esterno.etichetta}
                    <Icon name="esterno" size={18} />
                  </a>
                )}
              </div>
            </div>
          );
        })}

        {inAttesa && (
          <div className="flex items-center gap-2.5">
            <Avatar />
            <p className="inline-flex items-center gap-2 rounded-card bg-bg-sink px-3.5 py-2.5 text-[15px] font-bold text-ink-soft">
              <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-[2.5px] border-oro border-r-transparent" />
              Capisco la richiesta…
            </p>
          </div>
        )}
        <div ref={fine} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          inviaTesto(testo);
        }}
        className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-bg py-3"
      >
        <label htmlFor="rr-msg" className="sr-only">
          Messaggio per l&apos;agente
        </label>
        <input
          ref={campo}
          id="rr-msg"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          maxLength={500}
          placeholder={voci.length ? "Aggiungi un dettaglio…" : "Scrivi la tua richiesta…"}
          className="h-12 min-w-0 flex-1 rounded-card border-[1.5px] border-campo bg-panel px-3.5 text-base"
        />
        <PulsanteVoce stato={stato} onClick={avvia} />
        <button type="submit" aria-label="Invia" className="flex size-12 shrink-0 items-center justify-center rounded-card bg-amaranto text-white hover:bg-amaranto-scuro">
          <Icon name="freccia" size={20} strokeWidth={2} />
        </button>
      </form>
    </div>
  );
}

function Avatar() {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-panel">
      <LogoMark size={22} />
    </span>
  );
}
