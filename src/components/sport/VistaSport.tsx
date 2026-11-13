"use client";

import { useMemo, useState } from "react";
import { DISCIPLINE, IMPIANTI, TIPI_IMPIANTO, ZONE } from "@/data/esempi";
import { distanzaMetri, formattaDistanza } from "@/lib/geo";
import { BarraAgente } from "../agente/BarraAgente";
import { Mappa } from "../mappa/Mappa";
import { puntoImpianto } from "../mappa/punti";
import { Etichetta, Fonte } from "../ui/Varie";
import { Conteggio, InterruttoreChip, RigaFiltri, SceltaChip, useFiltri } from "../vista/Filtri";
import { Elenco, Risultato, Vuoto } from "../vista/Risultato";
import { VistaAmbito } from "../vista/VistaAmbito";

const RAGGIO = 1500;
const CHIAVI = ["disciplina", "zona", "gratuito", "accessibile"];

export function VistaSport() {
  const { parametri, imposta, azzera } = useFiltri("/sport");
  const disciplina = parametri.get("disciplina") ?? "";
  const zonaChiave = parametri.get("zona") ?? "";
  const gratuito = parametri.get("gratuito") === "1";
  const accessibile = parametri.get("accessibile") === "1";
  const zona = ZONE[zonaChiave] ?? null;
  const [selezionato, setSelezionato] = useState<string | null>(parametri.get("sel"));

  const risultati = useMemo(
    () =>
      IMPIANTI.filter((i) => !disciplina || i.discipline.some((d) => d.toLowerCase().startsWith(disciplina.toLowerCase())))
        .filter((i) => !accessibile || i.accessibile === true)
        .map((i) => ({ ...i, distanza: zona ? distanzaMetri(zona, i) : null }))
        .filter((i) => i.distanza === null || i.distanza <= RAGGIO)
        .sort((a, b) => (gratuito ? Number(b.gratuito) - Number(a.gratuito) : 0) || (a.distanza ?? 0) - (b.distanza ?? 0)),
    [disciplina, accessibile, zona, gratuito],
  );
  const punti = useMemo(() => risultati.map(puntoImpianto), [risultati]);
  const scegli = (id: string) => setSelezionato((s) => (s === id ? null : id));

  return (
    <VistaAmbito
      voceId="sport"
      barra={<BarraAgente voceId="sport" />}
      mappa={
        <Mappa
          titolo="Mappa degli impianti sportivi"
          punti={punti}
          selezionato={selezionato}
          onSeleziona={setSelezionato}
          centro={zona}
          raggioMetri={zona ? RAGGIO : undefined}
        />
      }
    >
      <RigaFiltri attivi={CHIAVI.some((k) => parametri.has(k))} onAzzera={() => azzera(CHIAVI)}>
        <SceltaChip
          etichetta="Disciplina"
          vuoto="Tutte le discipline"
          valore={disciplina}
          opzioni={DISCIPLINE.map((d) => ({ valore: d, etichetta: d }))}
          onChange={(v) => imposta({ disciplina: v })}
        />
        <SceltaChip
          etichetta="Zona"
          vuoto="Tutte le zone"
          valore={zonaChiave}
          opzioni={Object.entries(ZONE).map(([k, z]) => ({ valore: k, etichetta: `Vicino a ${z.nome}` }))}
          onChange={(v) => imposta({ zona: v })}
        />
        <InterruttoreChip attivo={gratuito} icona="euro" onClick={() => imposta({ gratuito: gratuito ? null : "1" })}>
          Gratis prima
        </InterruttoreChip>
        <InterruttoreChip attivo={accessibile} icona="accessibile" onClick={() => imposta({ accessibile: accessibile ? null : "1" })}>
          Accessibile
        </InterruttoreChip>
      </RigaFiltri>

      <Conteggio>
        {risultati.length === 1 ? "1 impianto" : `${risultati.length} impianti`}
        {zona && <span className="font-normal text-ink-soft"> entro {formattaDistanza(RAGGIO)} da {zona.nome}</span>}
      </Conteggio>

      {risultati.length ? (
        <Elenco etichetta="Impianti">
          {risultati.map((i) => (
            <Risultato
              key={i.id}
              id={i.id}
              ambito="sport"
              titolo={i.nome}
              sottotitolo={
                <>
                  {TIPI_IMPIANTO[i.tipo]}
                  {i.distanza !== null && ` · ${formattaDistanza(i.distanza)}`}
                </>
              }
              scelto={selezionato === i.id}
              onScegli={scegli}
              etichette={
                <>
                  {i.gratuito ? <Etichetta tono="ok" icona="spunta">Ingresso libero</Etichetta> : <Etichetta>A pagamento</Etichetta>}
                  {i.accessibile === true && <Etichetta icona="accessibile">Accessibile</Etichetta>}
                </>
              }
              dettagli={
                <p className="text-sm leading-5 text-ink-soft">
                  {i.discipline.join(" · ")}
                  {i.orari && <> · {i.orari}</>}
                </p>
              }
              azione={{ href: `/sport/${i.id}`, etichetta: "Apri la scheda" }}
            />
          ))}
        </Elenco>
      ) : (
        <Vuoto>Nessun impianto con questi filtri. Prova ad allargare la zona o a togliere un filtro.</Vuoto>
      )}
      <Fonte>censimento degli impianti di Roma Capitale, anagrafe dell&apos;edilizia scolastica, OpenStreetMap (dati di esempio)</Fonte>
    </VistaAmbito>
  );
}
