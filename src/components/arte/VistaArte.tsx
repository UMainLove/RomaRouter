"use client";

import { useEffect, useMemo, useState } from "react";
import { POSTAZIONI, TURNI, ZONE, turnoOccupato } from "@/data/esempi";
import { prossimiGiorni } from "@/lib/formato";
import { BarraAgente } from "../agente/BarraAgente";
import { Mappa } from "../mappa/Mappa";
import { puntoPostazione } from "../mappa/punti";
import { Avviso, Etichetta, Fonte } from "../ui/Varie";
import { Conteggio, RigaFiltri, SceltaChip, useFiltri } from "../vista/Filtri";
import { Elenco, Risultato, Vuoto } from "../vista/Risultato";
import { VistaAmbito } from "../vista/VistaAmbito";

const ZONE_ARTE = Object.entries(ZONE).filter(([, z]) => POSTAZIONI.some((p) => p.quartiere === z.nome));

export function VistaArte() {
  const { parametri, imposta, azzera } = useFiltri("/arte");
  const zonaChiave = parametri.get("zona") ?? "";
  const giornoUrl = parametri.get("giorno") ?? "";
  const pubblico = parametri.get("per") === "pubblico";
  const zona = ZONE[zonaChiave] ?? null;
  const [giorni, setGiorni] = useState<ReturnType<typeof prossimiGiorni>>([]);
  const [selezionato, setSelezionato] = useState<string | null>(null);

  // I giorni dipendono dalla data di oggi: si calcolano solo nel browser.
  useEffect(() => {
    const t = setTimeout(() => setGiorni(prossimiGiorni(7)), 0);
    return () => clearTimeout(t);
  }, []);
  const giorno = giorni.find((g) => g.iso === giornoUrl) ?? giorni[0] ?? null;

  const postazioni = useMemo(
    () =>
      POSTAZIONI.filter((p) => !zona || p.quartiere === zona.nome).map((p) => {
        const turni = TURNI.map((orario, i) => ({ orario, occupato: giorno ? turnoOccupato(p.id, giorno.iso, i) : false }));
        return { ...p, liberi: turni.filter((t) => !t.occupato), esibizioni: turni.filter((t) => t.occupato) };
      }),
    [zona, giorno],
  );
  const punti = useMemo(() => postazioni.map(puntoPostazione), [postazioni]);

  return (
    <VistaAmbito
      voceId="arte"
      barra={<BarraAgente voceId="arte" />}
      mappa={<Mappa titolo="Mappa delle postazioni per gli artisti di strada" punti={punti} selezionato={selezionato} onSeleziona={setSelezionato} />}
    >
      <div role="group" aria-label="Cosa vuoi fare" className="grid grid-cols-2 rounded-card bg-bg-sink p-[3px]">
        {[
          { valore: null, etichetta: "Voglio esibirmi" },
          { valore: "pubblico", etichetta: "Chi si esibisce" },
        ].map((o) => {
          const attivo = pubblico === (o.valore === "pubblico");
          return (
            <button
              key={o.etichetta}
              type="button"
              aria-pressed={attivo}
              onClick={() => imposta({ per: o.valore })}
              className={`min-h-11 rounded-[9px] text-[15px] ${attivo ? "bg-panel font-bold text-ink shadow-[0_1px_3px_rgba(37,29,28,.14)]" : "font-semibold text-ink-soft"}`}
            >
              {o.etichetta}
            </button>
          );
        })}
      </div>

      <div role="group" aria-label="Giorno" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {giorni.map((g, i) => {
          const attivo = giorno?.iso === g.iso;
          return (
            <button
              key={g.iso}
              type="button"
              aria-pressed={attivo}
              onClick={() => imposta({ giorno: i === 0 ? null : g.iso })}
              className={`flex min-h-14 min-w-[52px] shrink-0 flex-col items-center justify-center rounded-card border px-2 ${
                attivo ? "border-ink bg-ink text-white" : "border-line bg-panel text-ink hover:border-campo"
              }`}
            >
              <span className="text-xs font-semibold">{i === 0 ? "Oggi" : g.giorno}</span>
              <span className="text-[17px] leading-5 font-bold">{g.numero}</span>
            </button>
          );
        })}
      </div>

      <RigaFiltri attivi={Boolean(zonaChiave)} onAzzera={() => azzera(["zona"])}>
        <SceltaChip
          etichetta="Zona"
          vuoto="Tutte le zone"
          valore={zonaChiave}
          opzioni={ZONE_ARTE.map(([k, z]) => ({ valore: k, etichetta: z.nome }))}
          onChange={(v) => imposta({ zona: v })}
        />
      </RigaFiltri>

      <Conteggio>
        {pubblico
          ? `${postazioni.reduce((n, p) => n + p.esibizioni.length, 0)} esibizioni`
          : postazioni.length === 1
            ? "1 postazione"
            : `${postazioni.length} postazioni`}
        {giorno && (
          <span className="font-normal text-ink-soft">
            {" "}
            · {giorno === giorni[0] ? "oggi" : `${giorno.giorno.toLowerCase()} ${giorno.numero} ${giorno.mese}`}
          </span>
        )}
      </Conteggio>

      {postazioni.length ? (
        <Elenco etichetta="Postazioni">
          {postazioni.map((p) => (
            <Risultato
              key={p.id}
              id={p.id}
              ambito="arte"
              titolo={`Postazione ${p.codice} · ${p.luogo}`}
              sottotitolo={
                pubblico
                  ? p.esibizioni.length
                    ? `Esibizioni: ${p.esibizioni.map((t) => t.orario).join(", ")}`
                    : "Nessuna esibizione prenotata"
                  : `${p.liberi.length} turni liberi su ${TURNI.length}`
              }
              scelto={selezionato === p.id}
              onScegli={(id) => setSelezionato((s) => (s === id ? null : id))}
              etichette={
                <>
                  {p.amplificazione ? <Etichetta>Amplificazione a basso volume</Etichetta> : <Etichetta icona="silenzio">Senza amplificazione</Etichetta>}
                  {p.unesco && <Etichetta icona="scudo">Area UNESCO</Etichetta>}
                </>
              }
              dettagli={
                pubblico ? undefined : (
                  <p className="text-sm text-ink-soft">Turni liberi: {p.liberi.map((t) => t.orario).join(", ") || "nessuno"}</p>
                )
              }
              azione={pubblico ? undefined : { href: `/arte/${p.id}${giorno ? `?giorno=${giorno.iso}` : ""}`, etichetta: "Prenota un turno" }}
            />
          ))}
        </Elenco>
      ) : (
        <Vuoto>Nessuna postazione in questa zona.</Vuoto>
      )}
      <Avviso>Postazioni e regole sono di esempio: quelle vere arrivano con il nuovo regolamento e le mappe dei Municipi.</Avviso>
      <Fonte>postazioni del regolamento per l&apos;arte di strada (dati di esempio)</Fonte>
    </VistaAmbito>
  );
}
