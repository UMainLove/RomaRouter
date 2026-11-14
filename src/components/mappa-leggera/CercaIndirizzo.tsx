"use client";

import { useEffect, useId, useRef, useState } from "react";

/* Ricerca di un indirizzo di Roma con i suggerimenti dello stradario ufficiale (GeoRoma). */
export type Luogo = { etichetta: string; municipio?: string | null; lat: number; lon: number };

export function CercaIndirizzo({
  endpoint,
  etichetta,
  segnaposto,
  onScelto,
  carica = false,
}: {
  /** es. /api/artisti/indirizzo: risponde { risultati: Luogo[] } */
  endpoint: string;
  etichetta: string;
  segnaposto: string;
  onScelto: (l: Luogo) => void;
  carica?: boolean;
}) {
  const id = useId();
  const [testo, setTesto] = useState("");
  const [suggeriti, setSuggeriti] = useState<Luogo[]>([]);
  const [evidenziato, setEvidenziato] = useState(-1);
  const [aperto, setAperto] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const scelto = useRef<string | null>(null);

  useEffect(() => {
    const q = testo.trim();
    if (q.length < 3 || scelto.current === testo) return;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`${endpoint}?q=${encodeURIComponent(q)}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((d: { risultati: Luogo[] }) => {
          setSuggeriti(d.risultati.slice(0, 6));
          setEvidenziato(-1);
          setAperto(d.risultati.length > 0);
        })
        .catch(() => {});
    }, 220);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [testo, endpoint]);

  function scegli(l: Luogo) {
    scelto.current = l.etichetta;
    setTesto(l.etichetta);
    setAperto(false);
    setErrore(null);
    onScelto(l);
  }
  async function invia(e: React.FormEvent) {
    e.preventDefault();
    if (evidenziato >= 0 && suggeriti[evidenziato]) return scegli(suggeriti[evidenziato]);
    const q = testo.trim();
    if (q.length < 3) return setErrore("Scrivi un indirizzo di Roma");
    try {
      const d: { risultati: Luogo[] } = await fetch(`${endpoint}?q=${encodeURIComponent(q)}`).then((r) => r.json());
      if (d.risultati[0]) scegli(d.risultati[0]);
      else setErrore("Indirizzo non trovato a Roma");
    } catch {
      setErrore("Ricerca non riuscita, riprova");
    }
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
      <div className="flex items-center gap-1.5 rounded-[10px] bg-bg-sink pl-3 focus-within:ring-2 focus-within:ring-ink">
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
          role="combobox"
          aria-expanded={aperto}
          aria-controls={`${id}-lista`}
          aria-autocomplete="list"
          aria-activedescendant={evidenziato >= 0 ? `${id}-${evidenziato}` : undefined}
          placeholder={segnaposto}
          value={testo}
          onChange={(e) => {
            scelto.current = null;
            setErrore(null);
            setTesto(e.target.value);
          }}
          onKeyDown={tasti}
          onBlur={() => setTimeout(() => setAperto(false), 150)}
          onFocus={() => suggeriti.length > 0 && scelto.current !== testo && setAperto(true)}
          className="min-h-11 w-full min-w-0 bg-transparent text-[16px] text-ink outline-none placeholder:text-muted"
        />
        {carica && <span className="mr-3 size-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-ink" role="status" aria-label="Verifico" />}
      </div>
      {errore && (
        <p role="alert" className="mt-1.5 px-1 text-sm font-semibold text-errore">
          {errore}
        </p>
      )}
      {aperto && suggeriti.length > 0 && (
        <ul id={`${id}-lista`} role="listbox" className="absolute inset-x-0 top-full z-10 mt-1.5 overflow-hidden rounded-[12px] border border-line bg-panel shadow-[0_10px_28px_rgba(37,29,28,.18)]">
          {suggeriti.map((s, i) => (
            <li
              key={`${s.etichetta}-${i}`}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === evidenziato}
              onMouseDown={(e) => {
                e.preventDefault();
                scegli(s);
              }}
              className={`cursor-pointer px-3.5 py-2.5 text-[15px] ${i === evidenziato ? "bg-bg-sink" : "hover:bg-bg-sink"}`}
            >
              <span className="font-semibold text-ink">{s.etichetta}</span>
              {s.municipio && <span className="ml-1.5 text-sm text-muted">Mun. {s.municipio}</span>}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
