"use client";

import { useMemo, useState } from "react";
import {
  CATEGORIE_OGGETTI,
  LUOGHI_RITROVAMENTO,
  OGGETTI,
  UFFICIO_OGGETTI,
  ZONE,
  type CategoriaOggetto,
  type LuogoRitrovamento,
} from "@/data/esempi";
import { normalizza } from "@/lib/geo";
import { formattaData } from "@/lib/formato";
import { BarraAgente } from "../agente/BarraAgente";
import { Icon } from "../Icon";
import { Mappa } from "../mappa/Mappa";
import { PUNTO_UFFICIO, type PuntoMappa } from "../mappa/punti";
import { Etichetta, NotaPrivacy } from "../ui/Varie";
import { ChipRimovibile, Conteggio, RigaFiltri, SceltaChip, useFiltri } from "../vista/Filtri";
import { Elenco, Risultato, Vuoto } from "../vista/Risultato";
import { VistaAmbito } from "../vista/VistaAmbito";
import { ICONE_CATEGORIA } from "./icone";

const CHIAVI = ["q", "categoria", "luogo", "colore", "dal", "zona"];
const COLORI = Array.from(new Set(OGGETTI.map((o) => o.colore).filter((c): c is string => Boolean(c)))).sort();
const maiuscola = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const PASSI = [
  { titolo: "Trova l'oggetto", testo: "Nel catalogo c'è solo la descrizione, mai dati personali." },
  { titolo: "Dimostra che è tuo", testo: "Descrivi un dettaglio che non è pubblicato, per esempio cosa c'era dentro." },
  { titolo: "Scegli chi ritira", testo: "Di persona con un documento, con una delega firmata o tramite ambasciata o consolato." },
  { titolo: "Prenota l'appuntamento", testo: "Porta il documento e la ricevuta dei diritti di custodia: [IMPORTO]." },
];

export function VistaOggetti() {
  const { parametri, imposta, azzera } = useFiltri("/oggetti");
  const q = parametri.get("q") ?? "";
  const categoria = (parametri.get("categoria") ?? "") as CategoriaOggetto | "";
  const luogo = (parametri.get("luogo") ?? "") as LuogoRitrovamento | "";
  const colore = parametri.get("colore") ?? "";
  const dal = parametri.get("dal") ?? "";
  const zona = parametri.get("zona") ?? "";
  const [selezionato, setSelezionato] = useState<string | null>(null);

  // Tutti i filtri tranne la zona: la mappa conta per zona, l'elenco filtra anche per zona.
  const senzaZona = useMemo(() => {
    const parole = normalizza(q).split(" ").filter(Boolean);
    return OGGETTI.filter((o) => !categoria || o.categoria === categoria)
      .filter((o) => !luogo || o.luogo === luogo)
      .filter((o) => !colore || o.colore === colore)
      .filter((o) => !dal || o.data >= dal)
      .filter((o) => parole.every((p) => normalizza(`${o.descrizione} ${CATEGORIE_OGGETTI[o.categoria]}`).includes(p)))
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [q, categoria, luogo, colore, dal]);
  const risultati = useMemo(() => senzaZona.filter((o) => !zona || o.zona === zona), [senzaZona, zona]);

  // Sulla mappa: l'ufficio dove si ritira e, per zona, quanti oggetti corrispondono (mai il punto esatto).
  const punti = useMemo<PuntoMappa[]>(() => {
    const perZona = new Map<string, number>();
    for (const o of senzaZona) perZona.set(o.zona, (perZona.get(o.zona) ?? 0) + 1);
    return [
      PUNTO_UFFICIO,
      ...[...perZona].map(([k, n]) => ({
        id: `zona-${k}`,
        ambito: "oggetti" as const,
        nome: `${n === 1 ? "1 oggetto trovato" : `${n} oggetti trovati`} a ${ZONE[k]?.nome ?? k}`,
        dettaglio: "Tocca per vedere solo questa zona",
        href: `/oggetti?zona=${k}`,
        lat: ZONE[k]?.lat ?? 0,
        lon: ZONE[k]?.lon ?? 0,
        conteggio: n,
      })),
    ];
  }, [senzaZona]);

  const suMappa = (id: string) => {
    if (id.startsWith("zona-")) {
      const k = id.slice(5);
      imposta({ zona: zona === k ? null : k });
      setSelezionato(zona === k ? null : id);
    } else {
      setSelezionato(id);
      document.getElementById("ufficio-oggetti")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  };

  const filtriAttivi = CHIAVI.some((k) => parametri.has(k));

  return (
    <VistaAmbito
      voceId="oggetti"
      barra={<BarraAgente voceId="oggetti" />}
      mappa={
        <Mappa
          titolo="Mappa degli oggetti ritrovati per zona e dell'ufficio dove ritirarli"
          punti={punti}
          selezionato={zona ? `zona-${zona}` : selezionato}
          onSeleziona={suMappa}
        />
      }
    >
      <RigaFiltri attivi={filtriAttivi} onAzzera={() => azzera(CHIAVI)}>
        {q && (
          <ChipRimovibile onRimuovi={() => imposta({ q: null })} etichettaRimuovi={`Togli la ricerca: ${q}`}>
            «{q}»
          </ChipRimovibile>
        )}
        <SceltaChip
          etichetta="Tipo di oggetto"
          vuoto="Tutti i tipi"
          valore={categoria}
          opzioni={(Object.keys(CATEGORIE_OGGETTI) as CategoriaOggetto[]).map((c) => ({ valore: c, etichetta: CATEGORIE_OGGETTI[c] }))}
          onChange={(v) => imposta({ categoria: v })}
        />
        <SceltaChip
          etichetta="Dove è stato trovato"
          vuoto="Ovunque"
          valore={luogo}
          opzioni={(Object.keys(LUOGHI_RITROVAMENTO) as LuogoRitrovamento[]).map((l) => ({ valore: l, etichetta: LUOGHI_RITROVAMENTO[l] }))}
          onChange={(v) => imposta({ luogo: v })}
        />
        <SceltaChip
          etichetta="Colore"
          vuoto="Ogni colore"
          valore={colore}
          opzioni={COLORI.map((c) => ({ valore: c, etichetta: maiuscola(c) }))}
          onChange={(v) => imposta({ colore: v })}
        />
        <SceltaChip
          etichetta="Zona"
          vuoto="Tutte le zone"
          valore={zona}
          opzioni={Object.entries(ZONE).map(([k, z]) => ({ valore: k, etichetta: z.nome }))}
          onChange={(v) => imposta({ zona: v })}
        />
        {dal && (
          <ChipRimovibile onRimuovi={() => imposta({ dal: null })} etichettaRimuovi="Togli il filtro sulla data">
            Dal {formattaData(dal, false)}
          </ChipRimovibile>
        )}
      </RigaFiltri>

      <Conteggio>{risultati.length === 1 ? "1 oggetto" : `${risultati.length} oggetti`}</Conteggio>

      {risultati.length ? (
        <Elenco etichetta="Oggetti ritrovati">
          {risultati.map((o) => (
            <Risultato
              key={o.codice}
              id={o.codice}
              ambito="oggetti"
              icona={ICONE_CATEGORIA[o.categoria]}
              titolo={o.descrizione}
              sottotitolo={`Trovato il ${formattaData(o.data, false)} · ${LUOGHI_RITROVAMENTO[o.luogo].toLowerCase()} · ${ZONE[o.zona]?.nome ?? ""}`}
              scelto={selezionato === o.codice}
              onScegli={(id) => setSelezionato((s) => (s === id ? null : id))}
              etichette={
                o.stato === "custodia" ? (
                  <Etichetta tono="ok" icona="spunta">
                    In custodia
                  </Etichetta>
                ) : (
                  <Etichetta tono="attenzione" icona="orologio">
                    Ritiro in corso
                  </Etichetta>
                )
              }
              dettagli={<p className="text-sm text-ink-soft">Codice {o.codice} · {CATEGORIE_OGGETTI[o.categoria]}</p>}
              azione={o.stato === "custodia" ? { href: `/oggetti/${o.codice}/ritiro`, etichetta: "È mio: richiedi il ritiro" } : undefined}
            />
          ))}
        </Elenco>
      ) : (
        <Vuoto>Nessun oggetto con questi filtri. Gli oggetti arrivano all&apos;ufficio anche dopo qualche giorno: riprova più avanti.</Vuoto>
      )}

      <section
        id="ufficio-oggetti"
        aria-labelledby="t-ufficio"
        className={`flex flex-col gap-3 rounded-panel border bg-panel p-4 ${selezionato === PUNTO_UFFICIO.id ? "border-ink" : "border-line"}`}
      >
        <div className="flex gap-3">
          <Icon name="segnaposto" size={22} className="mt-0.5 shrink-0 text-oggetti-ink" />
          <div>
            <h2 id="t-ufficio" className="text-base font-bold">
              {UFFICIO_OGGETTI.nome}
            </h2>
            <p className="text-[15px] text-ink-soft">{UFFICIO_OGGETTI.indirizzo}</p>
            <p className="mt-1 text-[13px] text-muted">{UFFICIO_OGGETTI.nota}</p>
          </div>
        </div>
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-[15px] font-bold">
            Come funziona il ritiro
            <Icon name="giu" size={16} strokeWidth={2.2} className="transition-transform group-open:rotate-180" />
          </summary>
          <ol className="flex flex-col gap-3 pt-1">
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
        </details>
      </section>
      <NotaPrivacy>Nel catalogo nessun dato personale: per i documenti compare solo il tipo, mai nomi o numeri. Sulla mappa solo i conteggi per zona.</NotaPrivacy>
    </VistaAmbito>
  );
}
