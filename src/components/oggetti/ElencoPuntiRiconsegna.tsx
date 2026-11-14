"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "../Icon";
import { Avviso, Etichetta, Fonte } from "../ui/Varie";
import { btnSecondario } from "../ui/stili";
import { Conteggio, InterruttoreChip, RigaFiltri, SceltaChip } from "../vista/Filtri";
import { Elenco, Risultato, Vuoto } from "../vista/Risultato";
import { formattaDistanza, type Punto } from "@/lib/geo";
import {
  CATEGORIE_PUNTI_RICONSEGNA,
  MACRO_AREE,
  type CategoriaPuntoRiconsegna,
  type PuntoRiconsegnaPubblico,
} from "@/lib/oggetti/costanti";

export type PuntoRiconsegnaConDistanza = PuntoRiconsegnaPubblico & {
  distanza: number;
};

export interface CentroPosizione extends Punto {
  etichetta: string;
  esatto: boolean;
  precisioneMetri?: number;
}

interface RisultatoStradario {
  etichetta: string;
  municipio: number | null;
  lat: number;
  lon: number;
  precisione: "civico" | "strada";
}

const ICONE_CATEGORIA: Record<CategoriaPuntoRiconsegna, IconName> = {
  ufficio: "casa",
  forze_ordine: "scudo",
  ospedale_h24: "ospedale",
  misericordia: "persone",
  affiliato_h24: "orologio",
  guardia_giurata: "lucchetto",
  volontario: "utente",
};

const ETICHETTA_BREVE: Record<CategoriaPuntoRiconsegna, string> = {
  ufficio: "Ufficio comunale",
  forze_ordine: "Caserma / Forze dell'Ordine",
  ospedale_h24: "Ospedale H24",
  misericordia: "Misericordia / CRI",
  affiliato_h24: "Punto affiliato H24",
  guardia_giurata: "Guardia Giurata",
  volontario: "Privato affiliato",
};

const baseChip = "relative inline-flex min-h-11 items-center gap-1.5 rounded-full border text-[15px] transition-colors";
const CHIP_ATTIVO = "border-ink bg-bg-sink font-bold text-ink";
const CHIP_SPENTO = "border-line bg-panel font-semibold text-ink-soft hover:border-campo hover:text-ink";

/**
 * Pillola compatta chiusa ("Tutte le tipologie"): si apre solo al clic mostrando
 * le righe complete ben contenute entro i bordi del pannello.
 */
function PillolaTipologia({
  valore,
  onChange,
}: {
  valore: string;
  onChange: (v: string) => void;
}) {
  const [aperto, setAperto] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aperto) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setAperto(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAperto(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [aperto]);

  const attivo = Boolean(valore) && valore in ETICHETTA_BREVE;
  const testoChiuso = attivo ? ETICHETTA_BREVE[valore as CategoriaPuntoRiconsegna] : "Tutte le tipologie";

  return (
    <div ref={wrapRef} className={`relative ${aperto ? "w-full" : "w-fit max-w-full"}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aperto}
        onClick={() => setAperto((o) => !o)}
        className={`${baseChip} max-w-full px-3.5 ${attivo ? CHIP_ATTIVO : CHIP_SPENTO}`}
      >
        <span className="truncate">{testoChiuso}</span>
        <Icon name="giu" size={16} strokeWidth={2.2} className={`shrink-0 transition-transform ${aperto ? "rotate-180" : ""}`} />
      </button>

      {aperto && (
        <ul
          role="listbox"
          aria-label="Tipologia di punto di consegna"
          className="mt-2 flex w-full max-w-full flex-col gap-1 rounded-panel border border-ink bg-panel p-2 shadow-[0_10px_28px_rgba(37,29,28,.14)]"
        >
          <li>
            <button
              type="button"
              role="option"
              aria-selected={!valore}
              onClick={() => {
                onChange("");
                setAperto(false);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-card px-3 py-2 text-left text-sm whitespace-normal ${
                !valore ? "bg-bg-sink font-bold text-ink" : "text-ink-soft hover:bg-bg-sink hover:text-ink"
              }`}
            >
              <span>Tutte le tipologie</span>
              {!valore && <Icon name="spunta" size={16} strokeWidth={2.3} className="shrink-0 text-oggetti-ink" />}
            </button>
          </li>
          {(Object.entries(CATEGORIE_PUNTI_RICONSEGNA) as [CategoriaPuntoRiconsegna, string][]).map(([k, label]) => {
            const scelto = valore === k;
            return (
              <li key={k}>
                <button
                  type="button"
                  role="option"
                  aria-selected={scelto}
                  onClick={() => {
                    onChange(k);
                    setAperto(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-card px-3 py-2 text-left text-sm leading-snug whitespace-normal ${
                    scelto ? "bg-bg-sink font-bold text-ink" : "text-ink-soft hover:bg-bg-sink hover:text-ink"
                  }`}
                >
                  <span className="flex min-w-0 items-start gap-2">
                    <Icon name={ICONE_CATEGORIA[k]} size={16} className="mt-0.5 shrink-0 text-oggetti-ink" />
                    <span className="min-w-0 break-words">{label}</span>
                  </span>
                  {scelto && <Icon name="spunta" size={16} strokeWidth={2.3} className="shrink-0 text-oggetti-ink" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ElencoPuntiRiconsegna({
  punti,
  totaleComplessivo,
  conteggiCategoria,
  conteggioMisericordieH24 = 0,
  caricamento,
  erroreCaricamento,
  selezionato,
  onSeleziona,
  categoria,
  zona,
  soloH24,
  testoFiltro,
  onCategoria,
  onZona,
  onSoloH24,
  onTestoFiltro,
  onAzzeraFiltri,
  centro,
  haPosizioneEsatta,
  errorePosizione,
  onUsaPosizione,
  onScegliIndirizzoEsatto,
  onTogliPosizione,
}: {
  punti: PuntoRiconsegnaConDistanza[];
  totaleComplessivo: number;
  conteggiCategoria?: Partial<Record<CategoriaPuntoRiconsegna, number>>;
  conteggioMisericordieH24?: number;
  caricamento: boolean;
  erroreCaricamento: string | null;
  selezionato: string | null;
  onSeleziona: (id: string) => void;
  categoria: string;
  zona: string;
  soloH24: boolean;
  testoFiltro: string;
  onCategoria: (v: string) => void;
  onZona: (v: string) => void;
  onSoloH24: () => void;
  onTestoFiltro: (v: string) => void;
  onAzzeraFiltri: () => void;
  centro: CentroPosizione;
  haPosizioneEsatta: boolean;
  errorePosizione: string | null;
  onUsaPosizione: () => void;
  onScegliIndirizzoEsatto: (scelta: RisultatoStradario) => void;
  onTogliPosizione: () => void;
}) {
  const [viaQuery, setViaQuery] = useState("");
  const [risultatiVia, setRisultatiVia] = useState<RisultatoStradario[]>([]);
  const [caricamentoVia, setCaricamentoVia] = useState(false);

  useEffect(() => {
    const q = viaQuery.trim();
    if (q.length < 3) return;
    const timer = setTimeout(async () => {
      setCaricamentoVia(true);
      try {
        const res = await fetch(`/api/artisti/indirizzo?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const d = (await res.json()) as { risultati?: RisultatoStradario[] };
        setRisultatiVia(Array.isArray(d.risultati) ? d.risultati.slice(0, 5) : []);
      } catch {
        setRisultatiVia([]);
      } finally {
        setCaricamentoVia(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [viaQuery]);

  const filtriAttivi = Boolean(categoria || zona || soloH24 || testoFiltro.trim());
  const conteggioH24 = punti.filter((p) => p.h24).length;

  const riepilogoCategorie: Array<{
    id: CategoriaPuntoRiconsegna | "";
    etichetta: string;
    conteggio: number;
  }> = [
    { id: "", etichetta: "Tutti i luoghi", conteggio: totaleComplessivo },
    { id: "forze_ordine", etichetta: "Caserme & Forze dell'Ordine", conteggio: conteggiCategoria?.forze_ordine ?? 0 },
    {
      id: "misericordia",
      etichetta:
        conteggioMisericordieH24 > 0
          ? `Misericordie / CRI (${conteggioMisericordieH24} H24)`
          : "Misericordie / CRI",
      conteggio: conteggiCategoria?.misericordia ?? 0,
    },
    { id: "ospedale_h24", etichetta: "Ospedali H24", conteggio: conteggiCategoria?.ospedale_h24 ?? 0 },
    { id: "guardia_giurata", etichetta: "Guardie Giurate", conteggio: conteggiCategoria?.guardia_giurata ?? 0 },
    { id: "volontario", etichetta: "Privati affiliati", conteggio: conteggiCategoria?.volontario ?? 0 },
    { id: "affiliato_h24", etichetta: "Punti affiliati H24", conteggio: conteggiCategoria?.affiliato_h24 ?? 0 },
    { id: "ufficio", etichetta: "Ufficio Roma Capitale", conteggio: conteggiCategoria?.ufficio ?? 0 },
  ];

  return (
    <section
      id="punti-riconsegna"
      aria-labelledby="t-punti-riconsegna"
      className="flex flex-col gap-3 rounded-panel border border-line bg-panel p-4"
    >
      <div>
        <h2 id="t-punti-riconsegna" className="text-base leading-[22px] font-bold">
          Tutti i luoghi e partner del servizio su Roma
        </h2>
        <p className="mt-0.5 text-sm text-ink-soft">
          Mappa ed elenco completo: caserme e Forze dell&apos;Ordine, Misericordie e sedi CRI (anche aperte 24h), Ospedali H24,
          Guardie Giurate, punti H24 e privati affiliati che collaborano al servizio.
        </p>
      </div>

      {totaleComplessivo > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Filtro rapido per categoria di luogo">
          {riepilogoCategorie
            .filter((item) => item.id === "" || item.conteggio > 0)
            .map((item) => {
              const attivo = categoria === item.id;
              return (
                <button
                  key={item.id || "tutti"}
                  type="button"
                  onClick={() => onCategoria(attivo && item.id !== "" ? "" : item.id)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition ${
                    attivo
                      ? "border-oggetti bg-oggetti-tint text-oggetti-ink"
                      : "border-line bg-bg-sink text-ink-soft hover:border-ink/40 hover:text-ink"
                  }`}
                >
                  <span>{item.etichetta}</span>
                  <span className="rounded-full bg-panel px-1.5 py-0.5 text-[11px] text-ink">{item.conteggio}</span>
                </button>
              );
            })}
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-card border border-line bg-bg-sink p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onUsaPosizione} className={`${btnSecondario} min-h-11 rounded-full px-4 text-[15px]`}>
            <Icon name="posizione" size={18} strokeWidth={2} />
            Usa la mia posizione esatta
          </button>
          {haPosizioneEsatta ? (
            <button
              type="button"
              onClick={onTogliPosizione}
              className="min-h-11 px-2 text-sm font-bold text-ink-soft underline-offset-2 hover:underline"
            >
              Reimposta ({centro.etichetta})
            </button>
          ) : (
            <span className="text-xs text-ink-soft">
              Distanza attuale calcolata da <b>{centro.etichetta}</b>: usa il GPS o indica la tua via esatta qui sotto.
            </span>
          )}
        </div>

        <div className="relative">
          <label className="relative flex min-h-11 items-center rounded-full border border-line bg-panel px-3.5 text-sm focus-within:border-ink">
            <span className="sr-only">Inserisci la tua via o numero civico esatto a Roma</span>
            <Icon name="segnaposto" size={16} className="mr-2 shrink-0 text-oggetti-ink" />
            <input
              type="search"
              value={viaQuery}
              onChange={(e) => {
                const next = e.target.value;
                setViaQuery(next);
                if (next.trim().length < 3) setRisultatiVia([]);
              }}
              placeholder="Indirizzo esatto di partenza (es. Via del Corso 10, Ostia, EUR)..."
              className="w-full bg-transparent py-2 text-sm text-ink placeholder:text-muted outline-none"
            />
          </label>
          {caricamentoVia && <p className="mt-1 px-2 text-xs text-muted">Ricerca sullo stradario di Roma Capitale…</p>}
          {risultatiVia.length > 0 && (
            <ul className="mt-1.5 flex flex-col gap-1 rounded-card border border-line bg-panel p-1.5">
              {risultatiVia.map((r) => (
                <li key={`${r.etichetta}-${r.lat}-${r.lon}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onScegliIndirizzoEsatto(r);
                      setViaQuery("");
                      setRisultatiVia([]);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-card px-2.5 py-2 text-left text-xs text-ink hover:bg-bg-sink"
                  >
                    <span className="font-semibold">{r.etichetta}</span>
                    {r.municipio && <span className="shrink-0 text-muted">Mun. {r.municipio}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {errorePosizione && <Avviso icona="attenzione">{errorePosizione}</Avviso>}

      <RigaFiltri attivi={filtriAttivi} onAzzera={onAzzeraFiltri}>
        <PillolaTipologia valore={categoria} onChange={onCategoria} />
        <SceltaChip
          etichetta="Zona di Roma"
          vuoto="Tutte le zone di Roma"
          valore={zona}
          opzioni={Object.entries(MACRO_AREE).map(([valore, z]) => ({ valore, etichetta: z.nome }))}
          onChange={onZona}
        />
        <InterruttoreChip attivo={soloH24} onClick={onSoloH24} icona="orologio">
          Solo aperti H24
        </InterruttoreChip>
        <label className="relative inline-flex min-h-11 min-w-[200px] flex-1 items-center rounded-full border border-line bg-panel px-3.5 text-sm focus-within:border-ink">
          <span className="sr-only">Filtra per parola chiave nell&apos;elenco</span>
          <Icon name="cerca" size={16} className="mr-2 shrink-0 text-muted" />
          <input
            type="search"
            value={testoFiltro}
            onChange={(e) => onTestoFiltro(e.target.value)}
            placeholder="Filtra per nome, caserma, misericordia, ospedale, guardia, affiliato..."
            className="w-full bg-transparent py-2 text-sm text-ink placeholder:text-muted outline-none"
          />
        </label>
      </RigaFiltri>

      {erroreCaricamento ? (
        <Avviso icona="attenzione">{erroreCaricamento}</Avviso>
      ) : caricamento ? (
        <p className="text-sm text-ink-soft">Caricamento di tutti i punti di consegna reali dal database...</p>
      ) : (
        <>
          <Conteggio>
            {punti.length === 1 ? "1 luogo di consegna" : `${punti.length} luoghi visibili`}
            {punti.length !== totaleComplessivo && <span className="font-normal text-ink-soft"> su {totaleComplessivo} totali</span>}
            {conteggioH24 > 0 && <span className="font-normal text-ink-soft"> · {conteggioH24} attivi H24</span>}
            <span className="font-normal text-ink-soft">
              {" "}
              · ordinati dal più vicino ({haPosizioneEsatta ? centro.etichetta : `da ${centro.etichetta}`})
            </span>
          </Conteggio>

          {punti.length > 0 ? (
            <Elenco etichetta="Luoghi di riconsegna oggetti smarriti a Roma">
              {punti.map((p) => {
                const munEtichetta =
                  p.municipio.startsWith("Municipio") || p.municipio.startsWith("Roma")
                    ? p.municipio
                    : `Municipio ${p.municipio}`;
                const camminoHref = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}&travelmode=walking`;
                const distTesto = formattaDistanza(p.distanza);
                const labelDistanza = haPosizioneEsatta
                  ? p.posizioneEsatta
                    ? `${distTesto} dalla posizione esatta`
                    : `~${distTesto} (area ${p.zonaNome}) dalla posizione esatta`
                  : `${distTesto} da ${centro.etichetta}`;

                return (
                  <Risultato
                    key={p.id}
                    id={p.id}
                    ambito="oggetti"
                    icona={ICONE_CATEGORIA[p.categoria]}
                    titolo={p.nome}
                    sottotitolo={
                      <>
                        {p.indirizzo}
                        <span className="block font-bold text-oggetti-ink">Distanza: {labelDistanza}</span>
                      </>
                    }
                    scelto={selezionato === p.id}
                    onScegli={onSeleziona}
                    etichette={
                      <>
                        <Etichetta icona="posizione">{distTesto}</Etichetta>
                        <Etichetta icona={ICONE_CATEGORIA[p.categoria]}>{ETICHETTA_BREVE[p.categoria]}</Etichetta>
                        {p.h24 && <Etichetta icona="orologio">Aperto H24</Etichetta>}
                        <Etichetta>{munEtichetta}</Etichetta>
                        {!p.posizioneEsatta && <Etichetta icona="lucchetto">Area pubblica · privacy</Etichetta>}
                      </>
                    }
                    dettagli={
                      <div className="flex flex-col gap-2 text-sm text-ink-soft">
                        <p>
                          <b className="text-ink">Ente / Gestore:</b> {p.ente}
                        </p>
                        <p>
                          <b className="text-ink">Distanza calcolata:</b> {labelDistanza}
                        </p>
                        <p>
                          <b className="text-ink">Orari:</b> {p.orari}
                        </p>
                        {p.telefono && (
                          <p>
                            <b className="text-ink">Telefono:</b>{" "}
                            <a href={`tel:${p.telefono.replace(/\s+/g, "")}`} className="font-bold text-oggetti-ink underline-offset-2 hover:underline">
                              {p.telefono}
                            </a>
                          </p>
                        )}
                        {p.note && <p>{p.note}</p>}

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {p.posizioneEsatta ? (
                            <a
                              href={camminoHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-11 items-center gap-2 rounded-card bg-amaranto px-4 text-[15px] font-bold text-white hover:bg-amaranto-scuro"
                            >
                              Indicazioni a piedi
                              <Icon name="esterno" size={16} strokeWidth={2} />
                            </a>
                          ) : (
                            <span className="rounded-card border border-line bg-bg-sink px-3 py-2 text-xs text-ink-soft">
                              Posizione approssimata alla zona: l&apos;indirizzo privato dell&apos;affiliato resta sempre riservato.
                            </span>
                          )}
                        </div>
                      </div>
                    }
                  />
                );
              })}
            </Elenco>
          ) : (
            <Vuoto>Nessun punto di consegna corrisponde ai filtri selezionati.</Vuoto>
          )}
        </>
      )}

      <Fonte>
        tutti i 15 Municipi: caserme e Forze dell&apos;Ordine, Misericordie/CRI (anche H24), Pronto Soccorso e Ospedali H24, Guardie Giurate e privati affiliati approvati su PostgreSQL
      </Fonte>
    </section>
  );
}
