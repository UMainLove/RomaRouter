"use client";

import { useEffect, useId, useRef, useState } from "react";
import { caricaLuoghi, cerca, type Luogo } from "./luoghi";

export type { Luogo };

/*
 * Ricerca di un luogo di Roma. I suggerimenti arrivano a ogni lettera da un indice locale (luoghi.ts):
 * vie, rioni e quartieri, monumenti, piazze, stazioni. Se scrivi anche il civico, alla scelta la posizione
 * esatta si chiede allo stradario ufficiale (endpoint), con un tempo massimo: se non risponde vale la via.
 */
const GLIFO = {
  via: <path d="M5 21 9 3M19 21 15 3M12 6v2M12 11v2M12 16v2" />,
  zona: <path d="M4 7l5-3 6 3 5-3v13l-5 3-6-3-5 3ZM9 4v13M15 7v13" />,
  luogo: <path d="M12 21s-6.5-5.4-6.5-11a6.5 6.5 0 0 1 13 0c0 5.6-6.5 11-6.5 11Z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />,
};
const ROMANI = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];

export function Cerca({
  endpoint,
  etichetta,
  segnaposto,
  onScelto,
  carica = false,
  coda,
}: {
  /** stradario ufficiale per il civico esatto (es. /api/artisti/indirizzo) */
  endpoint: string;
  etichetta: string;
  segnaposto: string;
  onScelto: (l: Luogo) => void;
  carica?: boolean;
  /** Bottoni in fondo alla barra (es. posizione e Guida) */
  coda?: React.ReactNode;
}) {
  const id = useId();
  const [testo, setTesto] = useState("");
  const [suggeriti, setSuggeriti] = useState<Luogo[]>([]);
  const [evidenziato, setEvidenziato] = useState(0);
  const [aperto, setAperto] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [cercoCivico, setCercoCivico] = useState(false);
  const voci = useRef<Awaited<ReturnType<typeof caricaLuoghi>> | null>(null);

  // l'indice si scarica quando la pagina e' ferma: alla prima lettera e' gia' pronto
  useEffect(() => {
    const t = setTimeout(() => {
      caricaLuoghi().then((v) => (voci.current = v)).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  function aggiorna(t: string) {
    setTesto(t);
    setErrore(null);
    const calcola = (v: NonNullable<typeof voci.current>) => {
      const r = cerca(v, t);
      setSuggeriti(r);
      setEvidenziato(0);
      setAperto(r.length > 0);
    };
    if (voci.current) calcola(voci.current);
    else
      caricaLuoghi()
        .then((v) => {
          voci.current = v;
          calcola(v);
        })
        .catch(() => setErrore("Ricerca non disponibile, riprova"));
  }

  async function scegli(l: Luogo) {
    setTesto(l.etichetta);
    setAperto(false);
    setErrore(null);
    if (l.civico) {
      // civico: posizione esatta dallo stradario ufficiale, al massimo 4 secondi
      setCercoCivico(true);
      try {
        const r = await fetch(`${endpoint}?q=${encodeURIComponent(l.etichetta)}`, { signal: AbortSignal.timeout(4000) });
        const d: { risultati: Luogo[] } = await r.json();
        const esatto = d.risultati.find((x) => /\d/.test(x.etichetta));
        if (esatto) return onScelto({ ...l, lat: esatto.lat, lon: esatto.lon });
      } catch {
        /* resta la via */
      } finally {
        setCercoCivico(false);
      }
    }
    onScelto(l);
  }
  function invia(e: React.FormEvent) {
    e.preventDefault();
    const s = suggeriti[evidenziato] ?? suggeriti[0];
    if (s) return void scegli(s);
    if (testo.trim().length < 2) return setErrore("Scrivi una via, una piazza o un quartiere di Roma");
    setErrore("Non trovo questo luogo a Roma");
  }
  function tasti(e: React.KeyboardEvent) {
    if (!aperto || !suggeriti.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setEvidenziato((i) => (i + 1) % suggeriti.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setEvidenziato((i) => (i <= 0 ? suggeriti.length - 1 : i - 1));
    } else if (e.key === "Escape") setAperto(false);
  }

  return (
    <form onSubmit={invia} role="search" aria-label={etichetta} className="relative">
      <label htmlFor={`${id}-in`} className="sr-only">
        {etichetta}
      </label>
      <div className="flex h-[52px] items-center gap-2 rounded-[18px] bg-panel pr-1.5 pl-4 shadow-[0_2px_6px_rgba(37,29,28,.08),0_10px_30px_rgba(37,29,28,.12)] ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-ink">
        <svg viewBox="0 0 20 20" className="size-[18px] shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="m13 13 4 4" strokeLinecap="round" />
        </svg>
        <input
          id={`${id}-in`}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={aperto}
          aria-controls={`${id}-lista`}
          aria-autocomplete="list"
          aria-activedescendant={aperto ? `${id}-${evidenziato}` : undefined}
          placeholder={segnaposto}
          value={testo}
          onChange={(e) => aggiorna(e.target.value)}
          onKeyDown={tasti}
          onFocus={() => {
            caricaLuoghi().then((v) => (voci.current = v)).catch(() => {});
            if (suggeriti.length) setAperto(true);
          }}
          onBlur={() => setTimeout(() => setAperto(false), 150)}
          className="h-full w-full min-w-0 bg-transparent text-[16px] font-medium text-ink outline-none placeholder:font-normal placeholder:text-muted"
        />
        {testo && (
          <button
            type="button"
            aria-label="Cancella"
            onClick={() => {
              setTesto("");
              setSuggeriti([]);
              setAperto(false);
            }}
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-bg-sink hover:text-ink"
          >
            <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
              <path d="M5 5l10 10M15 5 5 15" />
            </svg>
          </button>
        )}
        {(carica || cercoCivico) && <span className="mr-1 size-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-ink" role="status" aria-label="Cerco" />}
        {coda}
      </div>
      {errore && (
        <p role="alert" className="mt-2 inline-block rounded-full bg-panel px-3 py-1.5 text-sm font-semibold text-errore shadow-sm">
          {errore}
        </p>
      )}
      {aperto && suggeriti.length > 0 && (
        <ul id={`${id}-lista`} role="listbox" className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-[18px] bg-panel py-1.5 shadow-[0_14px_36px_rgba(37,29,28,.2)] ring-1 ring-black/5">
          {suggeriti.map((s, i) => (
            <li
              key={`${s.etichetta}-${s.tipo}-${i}`}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === evidenziato}
              onMouseDown={(e) => {
                e.preventDefault();
                scegli(s);
              }}
              onMouseEnter={() => setEvidenziato(i)}
              className={`flex cursor-pointer items-center gap-3 px-3.5 py-2 ${i === evidenziato ? "bg-bg-sink" : ""}`}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-sink text-ink-soft">
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {GLIFO[s.tipo ?? "via"]}
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[15px] text-ink">
                  <Evidenzia testo={s.etichetta} cerca={testo} />
                </span>
                <span className="block text-[12px] text-muted">
                  {s.tipo === "zona" ? "Rione o quartiere" : s.tipo === "luogo" ? "Luogo" : s.civico ? "Indirizzo" : "Via"}
                  {s.municipio ? ` · Municipio ${ROMANI[Number(s.municipio)] ?? s.municipio}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

/** Le lettere scritte in grassetto dentro il suggerimento */
function Evidenzia({ testo, cerca: q }: { testo: string; cerca: string }) {
  const parole = q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((p) => p.length > 1 && !/^\d+$/.test(p));
  if (!parole.length) return <>{testo}</>;
  const re = new RegExp(`(?<![\\p{L}])(${parole.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "giu");
  const pezzi = testo.split(re);
  return (
    <>
      {pezzi.map((p, i) =>
        i % 2 === 1 ? (
          <b key={i} className="font-extrabold">
            {p}
          </b>
        ) : (
          <span key={i} className="font-medium text-ink-soft">
            {p}
          </span>
        ),
      )}
    </>
  );
}
