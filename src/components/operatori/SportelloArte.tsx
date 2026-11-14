"use client";

import { useCallback, useEffect, useState } from "react";

/*
 * Sportello unico dell'arte di strada (lato operatori, DEMO).
 * Gli artisti col Pass prenotano sulla mappa; qui si vede cosa parte stasera e con un tasto si genera il lotto:
 * una comunicazione per Gruppo di Polizia Locale (art. 10), l'elenco SIAE, le richieste di nulla osta ai Municipi.
 * Le comunicazioni sono complete (testo, elenco CSV, file .eml) ma non partono: manca il collegamento alla PEC.
 */

type Coda = {
  pl: { gruppo_pl: string; pec_pl: string | null; municipio: number | null; n: number; dal: string; al: string; tardive: number }[];
  siae: { nome_arte: string; numero_pass: string | null; n: number }[];
  nulla_osta: { municipio: number | null; n: number }[];
  invii: { id: number | string; tipo: "pec_pl" | "siae" | "nulla_osta"; destinatario: string; indirizzo: string | null; oggetto: string; corpo: string; n_esibizioni: number; stato: string; creato_il: string }[];
  totali: { pass: number; prenotazioni_pass: number; in_coda: number; inviate: number };
};

const ROMANI = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];
const giorno = (s: string) => new Date(s).toLocaleDateString("it-IT", { day: "numeric", month: "short", timeZone: "Europe/Rome" });
const quando = (s: string) => new Date(s).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
const TIPO: Record<Coda["invii"][number]["tipo"], { t: string; c: string }> = {
  pec_pl: { t: "Polizia Locale", c: "bg-[#E8EEF9] text-[#1F4E9C]" },
  siae: { t: "SIAE", c: "bg-[#F6E8F0] text-[#A0185A]" },
  nulla_osta: { t: "Nulla osta", c: "bg-[#FFF1DC] text-[#9A5B00]" },
};

function Numero({ n, l, nota }: { n: number | string; l: string; nota?: string }) {
  return (
    <div className="rounded-panel border border-line bg-panel px-4 py-3">
      <p className="text-[30px] leading-9 font-extrabold tracking-[-.02em] text-ink tabular-nums">{n}</p>
      <p className="text-[14px] font-bold text-ink">{l}</p>
      {nota && <p className="text-[12.5px] text-muted">{nota}</p>}
    </div>
  );
}

export function SportelloArte() {
  const [c, setC] = useState<Coda | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [lavoro, setLavoro] = useState<"invio" | "azzera" | null>(null);
  const [aperto, setAperto] = useState<string | null>(null);
  const [appena, setAppena] = useState<string[]>([]);

  const chiedi = useCallback(async (metodo: "GET" | "POST" | "DELETE" = "GET") => {
    const url = metodo === "POST" ? "/api/operatori/arte/invia" : "/api/operatori/arte";
    const r = await fetch(url, { method: metodo, cache: "no-store" });
    if (!r.ok) throw new Error("Lo sportello non risponde: serve il database dell'arte di strada.");
    return (await r.json()) as Coda & { creati?: (number | string)[] };
  }, []);

  useEffect(() => {
    chiedi()
      .then(setC)
      .catch((e: Error) => setErrore(e.message));
  }, [chiedi]);

  async function esegui(tipo: "invio" | "azzera") {
    setLavoro(tipo);
    setErrore(null);
    try {
      const d = await chiedi(tipo === "invio" ? "POST" : "DELETE");
      setC(d);
      setAppena((d.creati ?? []).map(String));
      setAperto(d.creati?.length ? String(d.creati[0]) : null);
    } catch (e) {
      setErrore((e as Error).message);
    } finally {
      setLavoro(null);
    }
  }

  if (errore && !c) return <p className="rounded-panel border border-line bg-panel p-5 text-ink-soft">{errore}</p>;
  if (!c) return <p className="text-muted">Carico la coda di stasera…</p>;

  const daInviare = c.pl.length + (c.siae.length ? 1 : 0) + c.nulla_osta.length;
  const esibizioni = c.pl.reduce((s, g) => s + g.n, 0);
  const tardive = c.pl.reduce((s, g) => s + g.tardive, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Numero n={c.totali.pass} l="Pass artista" nota="registrati una volta sola" />
        <Numero n={c.totali.prenotazioni_pass} l="Prenotazioni col Pass" nota="«Ci sarò» sulla mappa" />
        <Numero n={c.totali.in_coda} l="Esibizioni in coda" nota="da comunicare stasera" />
        <Numero n={c.totali.inviate} l="Comunicazioni generate" nota="invece di una PEC a testa" />
      </div>

      {/* il lotto della sera */}
      <section aria-labelledby="lotto" className="overflow-hidden rounded-panel bg-ink text-white">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold tracking-[.1em] uppercase opacity-70">Stasera alle 20:00 · in automatico</p>
            <h2 id="lotto" className="text-[22px] leading-7 font-extrabold">
              {daInviare ? `${daInviare} comunicazioni al posto di ${esibizioni + c.siae.reduce((s, x) => s + x.n, 0)} PEC separate` : "Nessuna comunicazione da mandare"}
            </h2>
            <p className="mt-1 text-[14px] opacity-80">
              {daInviare
                ? `${c.pl.length} ai Gruppi di Polizia Locale (art. 10)${c.siae.length ? ", 1 alla SIAE" : ""}${c.nulla_osta.length ? `, ${c.nulla_osta.length} ai Municipi per i nulla osta` : ""}.`
                : "Tutte le esibizioni prenotate sono già state comunicate."}
              {tardive > 0 && ` ${tardive} esibizioni dimostrative sono a meno di 3 giorni: segnalate come tardive.`}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
            <button
              type="button"
              disabled={!daInviare || lavoro !== null}
              onClick={() => esegui("invio")}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-card bg-white px-5 text-base font-bold text-ink hover:bg-bg-sink disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" />
              </svg>
              {lavoro === "invio" ? "Preparo le comunicazioni…" : "Invia il lotto ora (demo)"}
            </button>
            <button
              type="button"
              disabled={lavoro !== null || !c.invii.length}
              onClick={() => esegui("azzera")}
              className="min-h-10 rounded-card px-4 text-[14px] font-bold text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              {lavoro === "azzera" ? "Rimetto in coda…" : "Ricomincia la demo"}
            </button>
          </div>
        </div>
        {errore && <p className="bg-errore px-5 py-2 text-[14px] font-semibold">{errore}</p>}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* coda per Gruppo di Polizia Locale */}
        <section aria-labelledby="gruppi" className="flex flex-col gap-3">
          <h2 id="gruppi" className="text-xl font-bold text-ink">
            In coda per Gruppo di Polizia Locale
          </h2>
          {c.pl.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {c.pl.map((g) => (
                <li key={g.gruppo_pl} className="flex items-start gap-3 rounded-panel border border-line bg-panel p-3.5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#E8EEF9] text-[13px] font-extrabold text-[#1F4E9C]">
                    {g.municipio ? ROMANI[g.municipio] : "–"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold text-ink">{g.gruppo_pl}</p>
                    <p className="truncate text-[12.5px] text-muted">{g.pec_pl ?? "PEC da indicare"}</p>
                    <p className="mt-1 text-[13px] text-ink-soft">
                      dal {giorno(g.dal)} al {giorno(g.al)}
                      {g.tardive > 0 && <span className="ml-1.5 rounded-full bg-attenzione-tint px-1.5 py-0.5 text-[11px] font-bold text-attenzione">{g.tardive} tardive</span>}
                    </p>
                  </div>
                  <span className="shrink-0 text-right">
                    <span className="block text-[22px] leading-6 font-extrabold text-ink tabular-nums">{g.n}</span>
                    <span className="text-[11px] text-muted">{g.n === 1 ? "esibizione" : "esibizioni"}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-panel border border-dashed border-line p-5 text-[15px] text-ink-soft">
              Coda vuota. Le nuove prenotazioni col Pass arrivano qui da sole.
            </p>
          )}
        </section>

        <div className="flex flex-col gap-6">
          <section aria-labelledby="siae" className="rounded-panel border border-line bg-panel p-4">
            <h2 id="siae" className="text-[17px] font-bold text-ink">
              Elenco SIAE
            </h2>
            <p className="text-[13px] text-muted">Chi suona brani di altri: una sola comunicazione per tutti.</p>
            {c.siae.length ? (
              <ul className="mt-2 divide-y divide-line">
                {c.siae.map((s) => (
                  <li key={s.nome_arte + s.numero_pass} className="flex items-center justify-between gap-2 py-1.5 text-[14px]">
                    <span className="min-w-0 truncate font-semibold text-ink">{s.nome_arte}</span>
                    <span className="shrink-0 text-muted tabular-nums">
                      {s.numero_pass ?? ""} · {s.n}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[14px] text-ink-soft">Nessuno in coda.</p>
            )}
          </section>
          <section aria-labelledby="nullaosta" className="rounded-panel border border-line bg-panel p-4">
            <h2 id="nullaosta" className="text-[17px] font-bold text-ink">
              Nulla osta (tipo 1)
            </h2>
            <p className="text-[13px] text-muted">Gruppi oltre 5, impianti potenti, scenografie: la richiesta va al Municipio.</p>
            {c.nulla_osta.length ? (
              <ul className="mt-2 divide-y divide-line">
                {c.nulla_osta.map((n) => (
                  <li key={String(n.municipio)} className="flex justify-between py-1.5 text-[14px]">
                    <span className="font-semibold text-ink">Municipio {n.municipio ? ROMANI[n.municipio] : "?"}</span>
                    <span className="text-muted tabular-nums">{n.n}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[14px] text-ink-soft">Nessuna richiesta.</p>
            )}
          </section>
        </div>
      </div>

      {/* storico */}
      <section aria-labelledby="storico" className="flex flex-col gap-3">
        <div>
          <h2 id="storico" className="text-xl font-bold text-ink">
            Comunicazioni generate
          </h2>
          <p className="text-[14px] text-muted">Testo pronto per la PEC, elenco CSV allegato. Il file .eml si apre con qualunque programma di posta.</p>
        </div>
        {c.invii.length ? (
          <ul className="flex flex-col gap-2">
            {c.invii.map((i) => {
              const id = String(i.id);
              const t = TIPO[i.tipo];
              const su = aperto === id;
              return (
                <li key={id} className={`rounded-panel border bg-panel ${appena.includes(id) ? "border-ok" : "border-line"}`}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3.5">
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold ${t.c}`}>{t.t}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-ink">{i.destinatario}</p>
                      <p className="truncate text-[12.5px] text-muted">
                        {i.indirizzo ?? "indirizzo da indicare"} · {i.n_esibizioni} {i.n_esibizioni === 1 ? "esibizione" : "esibizioni"} · {quando(i.creato_il)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-bg-sink px-2.5 py-1 text-[12px] font-bold text-ink-soft">Generata · non inviata (demo)</span>
                    <button type="button" onClick={() => setAperto(su ? null : id)} aria-expanded={su} className="min-h-10 shrink-0 rounded-[10px] px-3 text-[14px] font-bold text-ink hover:bg-bg-sink">
                      {su ? "Chiudi" : "Vedi testo"}
                    </button>
                    <a href={`/api/operatori/arte/invii/${id}`} download className="inline-flex min-h-10 shrink-0 items-center rounded-[10px] bg-ink px-3 text-[14px] font-bold text-white hover:bg-ink-soft">
                      Scarica .eml
                    </a>
                  </div>
                  {su && (
                    <div className="border-t border-line px-3.5 pt-3 pb-4">
                      <p className="text-[13px] font-bold text-ink">Oggetto: {i.oggetto}</p>
                      <pre className="mt-2 max-h-80 overflow-auto rounded-[12px] bg-bg-sink p-3 font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-ink-soft">{i.corpo}</pre>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-panel border border-dashed border-line p-5 text-[15px] text-ink-soft">Ancora nessuna. Premi «Invia il lotto ora» per vedere cosa parte stasera.</p>
        )}
      </section>
    </div>
  );
}
