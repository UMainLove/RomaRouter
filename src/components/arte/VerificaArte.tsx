"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { VerificaLuogo } from "@/lib/artisti";

/*
 * Arte di strada: un indirizzo, una risposta. L'artista scrive dove vuole esibirsi e sa se puo', perche'
 * e a quali condizioni; il cittadino scrive lo stesso indirizzo e vede chi si esibira' li' e dove
 * trovare artisti vicino. La mappa accanto (iframe, mappe/artisti-di-strada) si sposta sul punto e, se
 * si tocca la mappa, il verdetto arriva anche qui (eventi rr:alla-mappa / rr:dalla-mappa di MappaSezione).
 */

type Modo = "artista" | "cittadino";
type Suggerimento = { etichetta: string; municipio: string | null; lat: number; lon: number };
type Risultato = VerificaLuogo & { luogo: { etichetta: string } | null };

const ATTIVITA = [
  ["musica", "Musica o canto"],
  ["silenziosa", "Esibizione silenziosa (statue viventi, mimi…)"],
  ["fuoco", "Spettacolo col fuoco"],
  ["figurativa", "Ritratti e caricature"],
  ["esoterica", "Cartomanzia"],
] as const;
type Attivita = (typeof ATTIVITA)[number][0];

const TIPI: Record<string, string> = {
  postazione_allegatoB: "Postazione ufficiale (Allegato B)",
  area_consentita: "Area consentita del Municipio X",
  area_esoterici: "Area per cartomanti",
  arti_figurative_area: "Area arti figurative",
};
const TONI = {
  ok: "border-[#0C7A3E]/30 bg-[#E6F4EC] text-[#0C5E31]",
  attenzione: "border-[#B87200]/30 bg-[#FFF4DD] text-[#6E4200]",
  errore: "border-[#B3261E]/30 bg-[#FBE9E7] text-[#8C1D16]",
};
const SEGNI = { ok: "✓", attenzione: "!", errore: "✕" };
const metri = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`);
const quando = (d: string) =>
  new Date(d).toLocaleString("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
const allaMappa = (dati: Record<string, unknown>) =>
  window.dispatchEvent(new CustomEvent("rr:alla-mappa", { detail: { sezione: "artisti-di-strada", dati } }));

export function VerificaArte() {
  const [modo, setModo] = useState<Modo>("artista");
  const [attivita, setAttivita] = useState<Attivita>("musica");
  const [testo, setTesto] = useState("");
  const [suggeriti, setSuggeriti] = useState<Suggerimento[]>([]);
  const [evidenziato, setEvidenziato] = useState(-1);
  const [aperto, setAperto] = useState(false);
  const [risultato, setRisultato] = useState<Risultato | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [carica, setCarica] = useState(false);
  const scelto = useRef<Suggerimento | null>(null);
  const ultimo = useRef<{ lat: number; lon: number } | null>(null);
  const idLista = useId();
  const esito = useRef<HTMLDivElement>(null);

  // suggerimenti dallo stradario ufficiale (con un attimo di pausa mentre si scrive)
  useEffect(() => {
    const q = testo.trim();
    if (q.length < 3 || scelto.current?.etichetta === testo) return;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/artisti/indirizzo?q=${encodeURIComponent(q)}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((d: { risultati: Suggerimento[] }) => {
          setSuggeriti(d.risultati.slice(0, 6));
          setEvidenziato(-1);
          setAperto(d.risultati.length > 0);
        })
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [testo]);

  const verifica = useCallback(
    async (dove: { lat: number; lon: number; etichetta?: string } | { indirizzo: string }, opz: { muoviMappa: boolean; att?: Attivita; m?: Modo }) => {
      const att = opz.att ?? attivita;
      const q = new URLSearchParams({ attivita: att });
      if ("indirizzo" in dove) q.set("indirizzo", dove.indirizzo);
      else {
        q.set("lat", dove.lat.toFixed(6));
        q.set("lon", dove.lon.toFixed(6));
      }
      setCarica(true);
      setErrore(null);
      try {
        const r = await fetch(`/api/artisti/verifica?${q}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.errore ?? "Verifica non riuscita");
        const v = d as Risultato;
        if (!v.luogo && "etichetta" in dove && dove.etichetta) v.luogo = { etichetta: dove.etichetta };
        ultimo.current = { lat: v.punto.lat, lon: v.punto.lon };
        setRisultato(v);
        if (opz.muoviMappa) {
          allaMappa({ tipo: "rr:verifica", lat: v.punto.lat, lon: v.punto.lon, attivita: att, modo: opz.m ?? modo, etichetta: v.luogo?.etichetta ?? null });
        }
        requestAnimationFrame(() => esito.current?.focus({ preventScroll: false }));
      } catch (e) {
        setRisultato(null);
        setErrore((e as Error).message);
      } finally {
        setCarica(false);
      }
    },
    [attivita, modo],
  );

  // un punto toccato sulla mappa: il verdetto arriva anche qui (se non e' quello appena chiesto da qui)
  useEffect(() => {
    function dallaMappa(e: Event) {
      const d = (e as CustomEvent<{ sezione: string; dati: { tipo: string; lat: number; lon: number } }>).detail;
      if (d?.sezione !== "artisti-di-strada" || d.dati.tipo !== "rr:verdetto") return;
      const u = ultimo.current;
      if (u && Math.abs(u.lat - d.dati.lat) < 1e-5 && Math.abs(u.lon - d.dati.lon) < 1e-5) return;
      scelto.current = null;
      setTesto("");
      verifica({ lat: d.dati.lat, lon: d.dati.lon, etichetta: "Punto scelto sulla mappa" }, { muoviMappa: false });
    }
    window.addEventListener("rr:dalla-mappa", dallaMappa);
    return () => window.removeEventListener("rr:dalla-mappa", dallaMappa);
  }, [verifica]);

  function scegli(s: Suggerimento) {
    scelto.current = s;
    setTesto(s.etichetta);
    setAperto(false);
    verifica({ lat: s.lat, lon: s.lon, etichetta: s.etichetta }, { muoviMappa: true });
  }
  function invia(e: React.FormEvent) {
    e.preventDefault();
    setAperto(false);
    if (evidenziato >= 0 && suggeriti[evidenziato]) return scegli(suggeriti[evidenziato]);
    const s = scelto.current;
    if (s && s.etichetta === testo) return verifica({ lat: s.lat, lon: s.lon, etichetta: s.etichetta }, { muoviMappa: true });
    if (testo.trim().length < 3) return setErrore("Scrivi un indirizzo di Roma, per esempio «Piazza Navona».");
    verifica({ indirizzo: testo.trim() }, { muoviMappa: true });
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
  // cambiare modo o attivita' rifa' la verifica dello stesso punto
  function cambia(m: Modo, a: Attivita) {
    setModo(m);
    setAttivita(a);
    if (risultato) {
      verifica({ lat: risultato.punto.lat, lon: risultato.punto.lon, etichetta: risultato.luogo?.etichetta }, { muoviMappa: true, att: a, m });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Chi sei" className="grid grid-cols-2 rounded-card bg-bg-sink p-[3px]">
        {(
          [
            ["artista", "Sono un artista"],
            ["cittadino", "Voglio vedere artisti"],
          ] as const
        ).map(([v, t]) => (
          <button
            key={v}
            type="button"
            aria-pressed={modo === v}
            onClick={() => cambia(v, attivita)}
            className={`min-h-11 rounded-[9px] text-[15px] ${modo === v ? "bg-panel font-bold text-ink shadow-[0_1px_3px_rgba(37,29,28,.14)]" : "font-semibold text-ink-soft"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={invia} className="flex flex-col gap-3" role="search" aria-label="Verifica un indirizzo">
        <div className="relative">
          <label htmlFor={`${idLista}-in`} className="mb-1 block text-sm font-bold text-ink">
            {modo === "artista" ? "Dove vuoi esibirti?" : "Dove sei, o dove vuoi andare?"}
          </label>
          <div className="flex gap-2">
            <input
              id={`${idLista}-in`}
              type="text"
              inputMode="search"
              autoComplete="off"
              role="combobox"
              aria-expanded={aperto}
              aria-controls={`${idLista}-lista`}
              aria-autocomplete="list"
              aria-activedescendant={evidenziato >= 0 ? `${idLista}-${evidenziato}` : undefined}
              placeholder="Es. Piazza Navona, Via del Pigneto 100"
              value={testo}
              onChange={(e) => {
                scelto.current = null;
                setTesto(e.target.value);
              }}
              onKeyDown={tasti}
              onBlur={() => setTimeout(() => setAperto(false), 150)}
              onFocus={() => suggeriti.length && !scelto.current && setAperto(true)}
              className="min-h-12 w-full min-w-0 rounded-card border border-line bg-panel px-3.5 text-[16px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
            />
            <button type="submit" disabled={carica} className="min-h-12 shrink-0 rounded-card bg-ink px-4 text-[15px] font-bold text-white disabled:opacity-60">
              {carica ? "…" : "Verifica"}
            </button>
          </div>
          {aperto && suggeriti.length > 0 && (
            <ul
              id={`${idLista}-lista`}
              role="listbox"
              className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-card border border-line bg-panel shadow-[0_8px_24px_rgba(37,29,28,.16)]"
            >
              {suggeriti.map((s, i) => (
                <li
                  key={`${s.etichetta}-${i}`}
                  id={`${idLista}-${i}`}
                  role="option"
                  aria-selected={i === evidenziato}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    scegli(s);
                  }}
                  className={`cursor-pointer px-3.5 py-2.5 text-[15px] ${i === evidenziato ? "bg-bg-sink" : ""}`}
                >
                  <span className="font-semibold text-ink">{s.etichetta}</span>
                  {s.municipio && <span className="ml-1.5 text-sm text-muted">Municipio {s.municipio}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        {modo === "artista" && (
          <label className="flex flex-col gap-1 text-sm font-bold text-ink">
            Cosa fai
            <select
              value={attivita}
              onChange={(e) => cambia(modo, e.target.value as Attivita)}
              className="min-h-12 rounded-card border border-line bg-panel px-3 text-[16px] font-semibold text-ink"
            >
              {ATTIVITA.map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        )}
        <p className="text-sm text-ink-soft">Oppure tocca un punto sulla mappa.</p>
      </form>

      {errore && (
        <p role="alert" className="rounded-card border border-[#B3261E]/30 bg-[#FBE9E7] px-3.5 py-3 text-[15px] text-[#8C1D16]">
          {errore}
        </p>
      )}

      {risultato && <Verdetto v={risultato} modo={modo} rif={esito} onVai={(p) => verifica(p, { muoviMappa: true })} />}
    </div>
  );
}

function Verdetto({
  v,
  modo,
  rif,
  onVai,
}: {
  v: Risultato;
  modo: Modo;
  rif: React.RefObject<HTMLDivElement | null>;
  onVai: (p: { lat: number; lon: number; etichetta: string }) => void;
}) {
  const tono = v.esito.tono;
  const titolo =
    modo === "artista"
      ? v.esito.titolo
      : v.esito.codice === "no"
        ? "Qui le esibizioni sono vietate"
        : v.esito.codice === "probabilmente_no"
          ? "Qui le esibizioni sono probabilmente vietate"
          : "Qui gli artisti possono esibirsi";
  const puoAnnunciare = modo === "artista" && !["no", "probabilmente_no", "solo_area_dedicata", "solo_silenzio"].includes(v.esito.codice);

  return (
    <section aria-labelledby="verdetto-titolo" className="flex flex-col gap-3.5">
      <div>
        <p className="text-xs font-bold tracking-wide text-muted uppercase">
          {v.municipio ? `Municipio ${v.municipio.numero_romano}` : "Roma"}
          {modo === "artista" ? ` · ${v.attivita.nome}` : ""}
        </p>
        <h2 id="verdetto-titolo" className="text-lg leading-6 font-bold text-ink">
          {v.luogo?.etichetta ?? "Punto scelto"}
        </h2>
      </div>

      <div ref={rif} tabIndex={-1} role="status" className={`flex items-start gap-3 rounded-card border px-3.5 py-3 outline-none ${TONI[tono]}`}>
        <span aria-hidden="true" className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-current/15 text-sm font-black">
          {SEGNI[tono]}
        </span>
        <span className="text-[17px] leading-6 font-bold">{titolo}</span>
      </div>

      {modo === "cittadino" && (
        <Blocco titolo="Chi si esibisce qui (prossimi 7 giorni, entro 500 m)">
          {v.esibizioni.length ? (
            <ul className="flex flex-col gap-2">
              {v.esibizioni.map((e) => (
                <li key={e.id} className="rounded-card border border-line bg-panel px-3 py-2.5">
                  <p className="font-bold text-ink">{e.nome_arte}</p>
                  <p className="text-sm text-ink-soft">
                    {e.disciplina} · {quando(e.inizio)} · {metri(e.distanza_m)}
                    {e.postazione ? ` · ${e.postazione}` : e.luogo ? ` · ${e.luogo}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[15px] text-ink-soft">
              Nessuna esibizione annunciata qui. Gli artisti si trovano più spesso nelle postazioni ufficiali qui sotto.
            </p>
          )}
        </Blocco>
      )}

      {v.motivi.length > 0 && (
        <Blocco titolo="Perché">
          <Motivi lista={v.motivi} />
        </Blocco>
      )}
      {modo === "artista" && v.condizioni.length > 0 && (
        <Blocco titolo="Condizioni in questo punto">
          <Motivi lista={v.condizioni.slice(0, 6)} />
        </Blocco>
      )}
      {modo === "artista" && v.orario && (
        <p className="rounded-card bg-bg-sink px-3.5 py-2.5 text-[15px] text-ink-soft">
          Adesso sei <b className="text-ink">{v.orario.dentro ? "dentro" : "fuori"}</b> dalla fascia oraria: {v.orario.testo}
          {v.orario.stagione ? ` (${v.orario.stagione})` : ""}. Al massimo 2 ore per fascia.
        </p>
      )}

      {v.postazioni_vicine.length > 0 && (
        <Blocco titolo={modo === "artista" ? "Postazioni e aree vicine" : "Dove trovare artisti qui vicino"}>
          <ul className="flex flex-col">
            {v.postazioni_vicine.slice(0, 5).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onVai({ lat: p.lat, lon: p.lon, etichetta: p.nome })}
                  className="grid min-h-11 w-full grid-cols-[1fr_auto] items-center gap-3 rounded-[9px] px-2 py-1.5 text-left hover:bg-bg-sink"
                >
                  <span>
                    <span className="block text-[15px] font-semibold text-ink">{p.nome}</span>
                    <span className="block text-[13px] text-muted">
                      {TIPI[p.tipo] ?? p.tipo}
                      {p.posizione_stimata ? " · posizione stimata" : ""}
                    </span>
                  </span>
                  <span className="text-sm font-bold whitespace-nowrap text-ink-soft">{metri(p.distanza_m)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Blocco>
      )}

      {modo === "artista" && v.cosa_fare.length > 0 && (
        <Blocco titolo="Prima di esibirti">
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] text-ink">
            {v.cosa_fare.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          {v.contatti_polizia_locale?.pec_pl && <Preavviso v={v} />}
        </Blocco>
      )}

      {puoAnnunciare && <Annuncia v={v} />}

      <ul className="flex flex-col gap-1 border-t border-line pt-3 text-[13px] leading-5 text-muted">
        {v.avvertenze.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    </section>
  );
}

function Blocco({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-bold tracking-wide text-muted uppercase">{titolo}</h3>
      {children}
    </div>
  );
}

function Motivi({ lista }: { lista: Risultato["motivi"] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {lista.map((m, i) => (
        <li key={`${m.luogo}-${i}`} className="text-[15px] leading-snug text-ink">
          {m.testo}
          {!m.ufficiale && <span className="ml-1.5 rounded-full bg-[#FFF4DD] px-2 py-px text-[11px] font-bold text-[#7A4A00] uppercase">da verificare</span>}
          {m.approssimata && <span className="ml-1.5 rounded-full bg-bg-sink px-2 py-px text-[11px] font-bold text-ink-soft uppercase">confine stimato</span>}
          <span className="mt-0.5 block text-[13px] text-muted">
            {m.luogo}
            {m.riferimento ? ` · ${m.riferimento}` : ""}
            {m.fonte_url && (
              <>
                {" · "}
                <a href={m.fonte_url} target="_blank" rel="noopener noreferrer" className="underline">
                  fonte
                </a>
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

// Il preavviso dell'art. 10 alla Polizia Locale, gia' scritto: l'artista lo copia o lo apre nella sua posta
function Preavviso({ v }: { v: Risultato }) {
  const pl = v.contatti_polizia_locale!;
  const [copiato, setCopiato] = useState(false);
  const oggetto = `Comunicazione esibizione arte di strada – art. 10 DAC 24/2012`;
  const corpo = [
    `Al ${pl.gruppo_pl ?? "Gruppo di Polizia Locale"},`,
    "",
    `il/la sottoscritto/a [nome e cognome], nato/a a [luogo] il [data], comunica ai sensi dell'art. 10 del Regolamento per l'arte di strada (DAC 24/2012) che si esibirà come artista di strada (${v.attivita.nome.toLowerCase()}):`,
    `- luogo: ${v.luogo?.etichetta ?? `${v.punto.lat.toFixed(5)}, ${v.punto.lon.toFixed(5)}`}${v.municipio ? ` (Municipio ${v.municipio.numero_romano})` : ""}`,
    "- giorno: [gg/mm/aaaa]",
    `- orario: [dalle … alle …] (fasce consentite: ${v.orario?.testo ?? "art. 6"}, massimo 2 ore per fascia)`,
    "",
    "Occuperà al massimo 1 m², lasciando 2 m di marciapiede liberi, nel rispetto delle norme del regolamento.",
    "",
    "Distinti saluti,",
    "[nome e cognome, recapito]",
  ].join("\n");
  return (
    <div className="mt-3 rounded-card border border-line bg-panel p-3">
      <p className="text-[15px] font-bold text-ink">Preavviso alla Polizia Locale, già scritto</p>
      <p className="text-sm text-ink-soft">
        Da mandare almeno 3 giorni prima, dalla tua PEC, a <span className="font-semibold break-all text-ink">{pl.pec_pl}</span>
        {pl.telefono_pl ? ` (tel. ${pl.telefono_pl})` : ""}. Completa i campi tra parentesi quadre.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(`${oggetto}\n\n${corpo}`).then(() => setCopiato(true))}
          className="min-h-11 rounded-full border border-line px-4 text-sm font-bold text-ink hover:bg-bg-sink"
        >
          {copiato ? "Copiato" : "Copia il testo"}
        </button>
        <a
          href={`mailto:${pl.pec_pl}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`}
          className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-bold text-ink hover:bg-bg-sink"
        >
          Apri nella posta
        </a>
      </div>
      {pl.verifica && !/verificata/i.test(pl.verifica) && <p className="mt-2 text-[13px] text-muted">Indirizzo da verificare: {pl.verifica}</p>}
    </div>
  );
}

// L'artista annuncia l'esibizione: i cittadini la vedono sulla mappa e cercando lo stesso indirizzo
function Annuncia({ v }: { v: Risultato }) {
  const [aperto, setAperto] = useState(false);
  const [stato, setStato] = useState<{ ok: boolean; testo: string } | null>(null);
  const [invio, setInvio] = useState(false);
  async function invia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const giorno = String(f.get("giorno")), ora = String(f.get("ora"));
    setInvio(true);
    setStato(null);
    try {
      const r = await fetch("/api/artisti/esibizioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: v.punto.lat,
          lon: v.punto.lon,
          luogo: v.luogo?.etichetta ?? null,
          attivita: v.attivita.codice,
          nome_arte: f.get("nome"),
          disciplina: f.get("disciplina"),
          descrizione: f.get("descrizione"),
          link: f.get("link"),
          inizio: new Date(`${giorno}T${ora}`).toISOString(),
          durata_min: Number(f.get("durata")),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.errore ?? "Annuncio non riuscito");
      setStato({ ok: true, testo: "Fatto: la tua esibizione è sulla mappa. Ricordati il preavviso alla Polizia Locale." });
      allaMappa({ tipo: "rr:esibizioni-aggiorna" });
    } catch (err) {
      setStato({ ok: false, testo: (err as Error).message });
    } finally {
      setInvio(false);
    }
  }
  if (!aperto) {
    return (
      <button type="button" onClick={() => setAperto(true)} className="min-h-12 rounded-card border border-ink px-4 text-[15px] font-bold text-ink hover:bg-bg-sink">
        Annuncia la tua esibizione qui
      </button>
    );
  }
  const campo = "min-h-11 w-full rounded-[9px] border border-line bg-panel px-3 text-[16px] text-ink";
  return (
    <form onSubmit={invia} className="flex flex-col gap-2.5 rounded-card border border-line bg-panel p-3.5">
      <p className="text-[15px] font-bold text-ink">Annuncia la tua esibizione</p>
      <p className="text-sm text-ink-soft">
        Nome d&apos;arte e disciplina saranno visibili a tutti. Non serve il tuo nome vero. L&apos;annuncio resta «non verificato» finché non arriva l&apos;accesso con SPID.
      </p>
      <label className="text-sm font-semibold text-ink">
        Nome d&apos;arte
        <input name="nome" required minLength={2} maxLength={60} className={campo} />
      </label>
      <label className="text-sm font-semibold text-ink">
        Disciplina
        <input name="disciplina" maxLength={60} placeholder="Es. chitarra e voce, statua vivente" className={campo} />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-sm font-semibold text-ink">
          Giorno
          <input name="giorno" type="date" required className={campo} />
        </label>
        <label className="text-sm font-semibold text-ink">
          Ora
          <input name="ora" type="time" required step={900} className={campo} />
        </label>
        <label className="text-sm font-semibold text-ink">
          Durata
          <select name="durata" defaultValue="120" className={campo}>
            {(
              [
                [30, "30 min"],
                [60, "1 ora"],
                [90, "1 ora e ½"],
                [120, "2 ore"],
              ] as const
            ).map(([m, t]) => (
              <option key={m} value={m}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="text-sm font-semibold text-ink">
        Due righe su di te (facoltativo)
        <textarea name="descrizione" maxLength={280} rows={2} className={`${campo} py-2`} />
      </label>
      <label className="text-sm font-semibold text-ink">
        Link (facoltativo)
        <input name="link" type="url" pattern="https://.*" placeholder="https://" className={campo} />
      </label>
      <button type="submit" disabled={invio} className="min-h-12 rounded-card bg-ink px-4 text-[15px] font-bold text-white disabled:opacity-60">
        {invio ? "Invio…" : "Pubblica l'annuncio"}
      </button>
      {stato && (
        <p role={stato.ok ? "status" : "alert"} className={`text-[15px] ${stato.ok ? "text-[#0C5E31]" : "text-[#8C1D16]"}`}>
          {stato.testo}
        </p>
      )}
    </form>
  );
}
