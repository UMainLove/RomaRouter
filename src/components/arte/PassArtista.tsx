"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { fasceDelGiorno, type AttivitaArte } from "@/lib/orari-arte";
import { regoleDelPass, type EsitoPrenota, type MiaPrenotazione, type Pass, type Regola, type StatoPass } from "@/lib/pass-arte";
import { Azione, Azioni, Scheda, Tondo } from "../mappa-rr/Schermo";
import { ATT, att } from "./attivita";

/*
 * Il Pass dell'artista: ti registri una volta e poi prenoti con un tocco («Ci sarò»).
 * Preavviso alla Polizia Locale, elenco SIAE e nulla osta li manda lo sportello, tutti insieme, ogni sera.
 */

const giornoBreve = (d: Date) => ({
  dow: d.toLocaleDateString("it-IT", { weekday: "short", timeZone: "Europe/Rome" }).replace(".", ""),
  n: d.toLocaleDateString("it-IT", { day: "numeric", timeZone: "Europe/Rome" }),
  mese: d.toLocaleDateString("it-IT", { month: "short", timeZone: "Europe/Rome" }),
});
const quandoIt = (s: string) => new Date(s).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Rome" });
const oraIt = (s: string | Date) => new Date(s).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
const breve = (s: string) => s.replace(/ – scheda.*$/, "").replace(/\s*\(\d+ postazion[ei]\)$/, "");

/** Giorno (aaaa-mm-gg) e ora di Roma → istante ISO, qualunque sia il fuso del telefono. */
function romaISO(giorno: string, h: number, min = 0) {
  const g = new Date(`${giorno}T${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00Z`);
  const hr = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", hourCycle: "h23" }).format(g));
  const diff = (((hr - h) % 24) + 24) % 24;
  return new Date(g.getTime() - diff * 3_600_000).toISOString();
}
const piu = (giorno: string, n: number) => new Date(Date.parse(`${giorno}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export function usePass() {
  const [stato, setStato] = useState<StatoPass | null>(null);
  const ricarica = useCallback(
    () =>
      fetch("/api/artisti/pass")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: StatoPass | null) => setStato(d))
        .catch(() => setStato(null)),
    [],
  );
  useEffect(() => {
    ricarica();
  }, [ricarica]);
  return { stato, setStato, ricarica };
}

/** Il bottone del Pass nella barra: «Crea il Pass» oppure il numero del tuo Pass. */
export function PassBottone({ pass, onClick }: { pass: Pass | null | undefined; onClick: () => void }) {
  const a = pass ? att(pass.attivita) : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-auto flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-ink px-2.5 text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(37,29,28,.25)] hover:bg-ink-soft"
    >
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <circle cx="9" cy="11" r="2" />
        <path d="M6.5 16c.6-1.4 1.5-2 2.5-2s1.9.6 2.5 2M14 10h4M14 13h3" />
      </svg>
      {pass ? <span className="tabular-nums">{pass.numero_pass}</span> : "Crea il Pass"}
      {a && <span className="size-2 rounded-full" style={{ background: a.c }} aria-hidden="true" />}
    </button>
  );
}

// ==================================================================== registrazione in 3 passi
type Bozza = {
  nome: string; cognome: string; email: string; identita: "prova" | "spid";
  nome_arte: string; attivita: AttivitaArte; gruppo_grande: boolean; amplificazione: boolean; cover: boolean; fuoco_oltre_due: boolean;
  posto_assegnato: string; delega: boolean;
};

const campo = "h-11 w-full min-w-0 rounded-[12px] border-0 bg-bg-sink px-3 text-[15px] font-semibold text-ink placeholder:font-normal placeholder:text-muted focus:ring-2 focus:ring-ink focus:outline-none";

function Domanda({ testo, si, onCambia }: { testo: string; si: boolean; onCambia: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-[12px] bg-bg-sink py-1 pr-1 pl-3">
      <p className="min-w-0 flex-1 text-[13px] leading-tight font-semibold text-ink">{testo}</p>
      <div role="group" aria-label={testo} className="grid shrink-0 grid-cols-2 rounded-[10px] bg-panel p-0.5">
        {[false, true].map((v) => (
          <button
            key={String(v)}
            type="button"
            aria-pressed={si === v}
            onClick={() => onCambia(v)}
            className={`h-7 w-10 rounded-[8px] text-[12.5px] font-bold transition ${si === v ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
          >
            {v ? "Sì" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

const TONO_REGOLA: Record<Regola["tono"], string> = { ok: "bg-ok", info: "bg-[#1E7FD8]", attenzione: "bg-attenzione" };

export function SchedaRegistrazione({ attivita, onChiudi, onCreato }: { attivita: AttivitaArte; onChiudi: () => void; onCreato: (s: StatoPass) => void }) {
  const [passo, setPasso] = useState(1);
  const [b, setB] = useState<Bozza>({
    nome: "", cognome: "", email: "", identita: "prova", nome_arte: "", attivita,
    gruppo_grande: false, amplificazione: false, cover: false, fuoco_oltre_due: false, posto_assegnato: "", delega: false,
  });
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const metti = <K extends keyof Bozza>(k: K, v: Bozza[K]) => setB((x) => ({ ...x, [k]: v }));
  const a = att(b.attivita);
  const regole = regoleDelPass({ ...b, posto_assegnato: b.posto_assegnato || null });

  function avanti() {
    setErrore(null);
    if (passo === 1 && (b.nome.trim().length < 2 || b.cognome.trim().length < 2)) return setErrore("Scrivi nome e cognome (con SPID arrivano da soli).");
    if (passo === 2 && b.nome_arte.trim().length < 2) return setErrore("Scegli il tuo nome d'arte: è quello che vedono i cittadini.");
    setPasso(passo + 1);
  }
  async function crea() {
    if (!b.delega) return setErrore("Serve la delega: è quella che ci permette di fare tutto noi.");
    setInvio(true);
    setErrore(null);
    try {
      const r = await fetch("/api/artisti/pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...b, disciplina: undefined }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.errore ?? "Registrazione non riuscita");
      onCreato(d as StatoPass);
    } catch (e) {
      setErrore((e as Error).message === "Failed to fetch" ? "Lo sportello non risponde: riprova tra poco." : (e as Error).message);
    } finally {
      setInvio(false);
    }
  }

  const titoli = ["Chi sei", "Cosa fai", "Firma e fatto"];
  return (
    <Scheda icona={<Tondo colore={a.c} glifo={a.g} />} sopra={`Pass artista · ${passo} di 3`} titolo={titoli[passo - 1]} onChiudi={onChiudi}>
      <div className="mb-2.5 grid grid-cols-3 gap-1" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`h-1 rounded-full ${i <= passo ? "bg-ink" : "bg-line"}`} />
        ))}
      </div>

      {passo === 1 && (
        <div className="grid grid-cols-2 gap-2">
          <p className="col-span-2 text-[13px] leading-snug text-ink-soft">
            Ti registri <b className="text-ink">una volta sola</b>. Poi preavviso alla Polizia Locale, SIAE e nulla osta li mandiamo noi.
          </p>
          <button
            type="button"
            onClick={() => setB((x) => ({ ...x, identita: "spid", nome: x.nome || "Giulia", cognome: x.cognome || "Prova", email: x.email || "giulia.prova@example.com" }))}
            className={`col-span-2 flex h-11 items-center justify-center gap-2 rounded-[14px] text-[14px] font-bold ${b.identita === "spid" ? "bg-ok-tint text-ok" : "bg-[#0066CC] text-white hover:bg-[#0057AD]"}`}
          >
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {b.identita === "spid" ? <path d="m5 12 5 5 9-10" /> : <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>}
            </svg>
            {b.identita === "spid" ? "Identità verificata (prova)" : "Entra con SPID o CIE · prova"}
          </button>
          <label>
            <span className="sr-only">Nome</span>
            <input value={b.nome} onChange={(e) => metti("nome", e.target.value)} maxLength={60} placeholder="Nome" autoComplete="given-name" className={campo} />
          </label>
          <label>
            <span className="sr-only">Cognome</span>
            <input value={b.cognome} onChange={(e) => metti("cognome", e.target.value)} maxLength={60} placeholder="Cognome" autoComplete="family-name" className={campo} />
          </label>
          <label className="col-span-2">
            <span className="sr-only">Email (facoltativa)</span>
            <input value={b.email} onChange={(e) => metti("email", e.target.value)} type="email" maxLength={120} placeholder="Email per le conferme (facoltativa)" autoComplete="email" className={campo} />
          </label>
        </div>
      )}

      {passo === 2 && (
        <div className="grid gap-1.5">
          <label>
            <span className="sr-only">Nome d&apos;arte</span>
            <input value={b.nome_arte} onChange={(e) => metti("nome_arte", e.target.value)} maxLength={60} placeholder="Nome d'arte (pubblico)" className={campo} />
          </label>
          <div role="group" aria-label="Cosa fai" className="grid grid-cols-5 gap-1">
            {ATT.map((x) => {
              const on = b.attivita === x.k;
              return (
                <button
                  key={x.k}
                  type="button"
                  aria-pressed={on}
                  onClick={() => metti("attivita", x.k)}
                  className={`flex flex-col items-center gap-0.5 rounded-[12px] py-1 text-[11px] font-bold ${on ? "text-ink" : "text-muted hover:bg-bg-sink"}`}
                  style={on ? { background: `${x.c}14` } : undefined}
                >
                  <span className="flex size-7 items-center justify-center rounded-full" style={{ background: on ? x.c : "#ECE7DF" }}>
                    <svg viewBox="0 0 24 24" className="size-[15px]" fill="none" stroke={on ? "#fff" : "#6F6560"} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: x.g }} />
                  </span>
                  {x.n}
                </button>
              );
            })}
          </div>
          <Domanda testo="Più di 5 persone, impianti potenti o scenografie oltre 1 m²?" si={b.gruppo_grande} onCambia={(v) => metti("gruppo_grande", v)} />
          {(b.attivita === "musica" || b.attivita === "silenziosa") && (
            <Domanda testo="Usi amplificazione o strumenti elettrici?" si={b.amplificazione} onCambia={(v) => metti("amplificazione", v)} />
          )}
          {b.attivita === "musica" && <Domanda testo="Suoni anche brani di altri (cover)?" si={b.cover} onCambia={(v) => metti("cover", v)} />}
          {b.attivita === "fuoco" && <Domanda testo="Siete più di due col fuoco?" si={b.fuoco_oltre_due} onCambia={(v) => metti("fuoco_oltre_due", v)} />}
          {b.attivita === "figurativa" && (
            <label>
              <span className="sr-only">Posto assegnato</span>
              <input value={b.posto_assegnato} onChange={(e) => metti("posto_assegnato", e.target.value)} maxLength={30} placeholder="Numero del posto assegnato (es. Navona 12)" className={campo} />
            </label>
          )}
        </div>
      )}

      {passo === 3 && (
        <div className="grid gap-2">
          <ul className="grid gap-1">
            {regole.slice(0, 4).map((r) => (
              <li key={r.testo} className="flex items-start gap-2 text-[12.5px] leading-snug text-ink-soft">
                <span className={`mt-[5px] size-2 shrink-0 rounded-full ${TONO_REGOLA[r.tono]}`} aria-hidden="true" />
                <span className="line-clamp-2">{r.testo}</span>
              </li>
            ))}
          </ul>
          <label className={`flex cursor-pointer items-start gap-2.5 rounded-[14px] p-2.5 ${b.delega ? "bg-ok-tint" : "bg-bg-sink"}`}>
            <input type="checkbox" checked={b.delega} onChange={(e) => metti("delega", e.target.checked)} className="mt-0.5 size-[18px] shrink-0 accent-[#12905F]" />
            <span className="text-[12.5px] leading-snug text-ink">
              <b>Delego lo sportello</b> a mandare per me il preavviso alla Polizia Locale (art. 10 DAC 24/2012), l&apos;elenco SIAE e le richieste di nulla osta, e accetto le regole del Regolamento.
            </span>
          </label>
        </div>
      )}

      <p className={`mt-1.5 min-h-[18px] text-[12.5px] ${errore ? "font-semibold text-errore" : "text-muted"}`} role={errore ? "alert" : undefined}>
        {errore ?? (passo === 3 ? "Demo: nessuna comunicazione parte davvero." : "")}
      </p>
      <div className="mt-1 flex gap-2">
        {passo > 1 && (
          <button type="button" onClick={() => setPasso(passo - 1)} className="h-11 rounded-[14px] bg-bg-sink px-4 text-[14px] font-bold text-ink hover:bg-line">
            Indietro
          </button>
        )}
        <button
          type="button"
          disabled={invio}
          onClick={passo < 3 ? avanti : crea}
          className="h-11 flex-1 rounded-[14px] bg-ink text-[14px] font-bold text-white hover:bg-ink-soft disabled:opacity-60"
        >
          {passo < 3 ? "Avanti" : invio ? "Creo il Pass…" : "Crea il mio Pass"}
        </button>
      </div>
    </Scheda>
  );
}

// ==================================================================== il Pass
function StatoTurno({ p }: { p: MiaPrenotazione }) {
  const inviato = !!p.preavviso_il;
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${inviato ? "bg-ok-tint text-ok" : "bg-attenzione-tint text-attenzione"}`}>
      {inviato ? "Preavviso inviato" : "Parte stasera"}
    </span>
  );
}

export function SchedaPass({ stato, onChiudi, onEsci, onAnnulla, onTurno }: { stato: StatoPass; onChiudi: () => void; onEsci: () => void; onAnnulla: (id: string) => void; onTurno: (p: MiaPrenotazione) => void }) {
  const p = stato.pass!;
  const a = att(p.attivita);
  const turni = stato.prenotazioni ?? [];
  const etichette = [
    p.gruppo_grande ? "Tipo 1" : "Tipo 2",
    p.amplificazione ? "Amplificato" : p.attivita === "musica" ? "Acustico" : null,
    p.cover ? "SIAE" : null,
    p.identita === "spid" ? "SPID (prova)" : "Identità di prova",
  ].filter(Boolean) as string[];
  return (
    <Scheda icona={<Tondo colore={a.c} glifo={a.g} />} sopra="Il mio Pass artista" titolo={p.nome_arte} onChiudi={onChiudi}>
      <div className="relative overflow-hidden rounded-[18px] px-3.5 py-3 text-white" style={{ background: `linear-gradient(135deg, ${a.c} 0%, #251D1C 115%)` }}>
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute -top-3 -right-3 size-24 opacity-15" fill="none" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: a.g }} />
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold tracking-[.12em] uppercase opacity-80">Roma · arte di strada</p>
            <p className="truncate text-[22px] leading-7 font-extrabold tracking-[-.01em] tabular-nums">{p.numero_pass}</p>
            <p className="truncate text-[12.5px] opacity-85">{[p.nome, p.cognome].filter(Boolean).join(" ")} · {a.n.toLowerCase()}</p>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-[11px] font-bold">
            <svg viewBox="0 0 20 20" className="size-3" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m4 10 4 4 8-8" />
            </svg>
            Delega attiva
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {etichette.map((t) => (
            <span key={t} className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">
              {t}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-2.5 mb-1 text-[11px] font-bold tracking-[.08em] text-muted uppercase">Le prossime esibizioni</p>
      {turni.length ? (
        <ul className="grid gap-1">
          {turni.slice(0, 3).map((t) => (
            <li key={t.id} className="flex items-center gap-2 rounded-[12px] bg-bg-sink py-1.5 pr-1.5 pl-2.5">
              <button type="button" onClick={() => onTurno(t)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[13px] font-bold text-ink">
                  {quandoIt(t.inizio)} · {oraIt(t.inizio)}–{oraIt(t.fine)}
                </span>
                <span className="block truncate text-[11.5px] text-muted">{breve(t.luogo ?? "Punto sulla mappa")}</span>
              </button>
              <StatoTurno p={t} />
              {!t.preavviso_il && (
                <button type="button" onClick={() => onAnnulla(t.id)} aria-label="Annulla questa esibizione" title="Annulla" className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-line hover:text-ink">
                  <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
                    <path d="M5 5l10 10M15 5 5 15" />
                  </svg>
                </button>
              )}
            </li>
          ))}
          {turni.length > 3 && <li className="text-center text-[11.5px] font-semibold text-muted">e altre {turni.length - 3}</li>}
        </ul>
      ) : (
        <p className="rounded-[12px] bg-bg-sink px-3 py-2.5 text-[13px] text-ink-soft">
          Nessuna esibizione. Tocca una zona <b className="text-ok">verde</b> o un palco e premi <b className="text-ink">Ci sarò</b>.
        </p>
      )}
      <Azioni>
        <Azione primaria onClick={onChiudi}>Scegli un posto</Azione>
        <Azione onClick={onEsci}>Esci dal Pass</Azione>
      </Azioni>
    </Scheda>
  );
}

// ==================================================================== Ci sarò
function Pillola({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-w-0 flex-col items-center justify-center rounded-[10px] py-1 leading-tight font-bold transition disabled:opacity-30 ${on ? "bg-ink text-white shadow-[0_2px_8px_rgba(37,29,28,.25)]" : "bg-bg-sink text-ink hover:bg-line"}`}
    >
      {children}
    </button>
  );
}

export function SchedaCiSaro({ stato, lon, lat, luogo, onChiudi, onPass, onFatto }: { stato: StatoPass; lon: number; lat: number; luogo: string; onChiudi: () => void; onPass: () => void; onFatto: () => void }) {
  const p = stato.pass!;
  const a = att(p.attivita);
  const giorni = Array.from({ length: 7 }, (_, i) => piu(stato.prima_data, i));
  const [giorno, setGiorno] = useState(giorni[0]);
  const [durata, setDurata] = useState(60);
  const fasce = fasceDelGiorno(new Date(`${giorno}T12:00:00Z`), p.attivita);
  const ore = fasce.flatMap(([da, a2]) => Array.from({ length: a2 - da }, (_, i) => da + i)).filter((h) => fasce.some(([da, a2]) => h >= da && h + durata / 60 <= a2));
  const [ora, setOra] = useState<number | null>(null);
  const oraScelta = ora !== null && ore.includes(ora) ? ora : ore.includes(17) ? 17 : (ore[0] ?? null);
  const [errore, setErrore] = useState<{ errore: string; suggerimento?: { inizio: string } } | null>(null);
  const [invio, setInvio] = useState(false);
  const [esito, setEsito] = useState<EsitoPrenota | null>(null);

  async function prenota(inizio?: string) {
    if (oraScelta === null && !inizio) return;
    setInvio(true);
    setErrore(null);
    try {
      const r = await fetch("/api/artisti/prenota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon, luogo, inizio: inizio ?? romaISO(giorno, oraScelta!), durata_min: durata }),
      });
      const d = await r.json();
      if (!r.ok) return setErrore(d);
      setEsito(d as EsitoPrenota);
      onFatto();
    } catch {
      setErrore({ errore: "Lo sportello non risponde: riprova tra poco." });
    } finally {
      setInvio(false);
    }
  }

  if (esito) {
    return (
      <Scheda icona={<Tondo colore="#12905F" glifo={a.g} />} sopra={`Ci sarò · ${p.numero_pass}`} titolo={breve(esito.luogo)} onChiudi={onChiudi}>
        <div className="rounded-[16px] bg-ok-tint px-3.5 py-2.5">
          <p className="text-[19px] leading-6 font-extrabold text-ok">Prenotato. Al resto pensiamo noi.</p>
        </div>
        <ol className="mt-2.5 grid gap-0">
          {esito.passi.map((s, i) => (
            <li key={s.testo} className="relative flex gap-2.5 pb-2 last:pb-0">
              {i < esito.passi.length - 1 && <span className="absolute top-5 bottom-0 left-[9px] w-0.5 bg-line" aria-hidden="true" />}
              <span className={`relative z-[1] flex size-5 shrink-0 items-center justify-center rounded-full ${s.fatto ? "bg-ok text-white" : "bg-panel text-attenzione ring-2 ring-attenzione"}`} aria-hidden="true">
                <svg viewBox="0 0 20 20" className="size-3" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                  {s.fatto ? <path d="m4.5 10 3.5 3.5 7-7" /> : <path d="M10 5.5V10l3 2" />}
                </svg>
              </span>
              <span className={`text-[13px] leading-snug ${s.fatto ? "text-ink" : "text-ink-soft"}`}>
                <span className="sr-only">{s.fatto ? "Fatto: " : "Da fare: "}</span>
                {s.testo}
              </span>
            </li>
          ))}
        </ol>
        <Azioni>
          <Azione primaria onClick={onChiudi}>Fatto</Azione>
          <Azione onClick={onPass}>Il mio Pass</Azione>
        </Azioni>
      </Scheda>
    );
  }

  const fine = oraScelta !== null ? `${String(oraScelta + Math.floor(durata / 60)).padStart(2, "0")}:${durata % 60 ? "30" : "00"}` : "";
  return (
    <Scheda icona={<Tondo colore={a.c} glifo={a.g} />} sopra={`Ci sarò · ${p.nome_arte}`} titolo={breve(luogo)} onChiudi={onChiudi}>
      <div role="group" aria-label="Giorno" className="grid grid-cols-7 gap-1">
        {giorni.map((g) => {
          const d = giornoBreve(new Date(`${g}T12:00:00Z`));
          return (
            <Pillola key={g} on={g === giorno} onClick={() => setGiorno(g)}>
              <span className="text-[10.5px] uppercase opacity-70">{d.dow}</span>
              <span className="text-[16px] tabular-nums">{d.n}</span>
            </Pillola>
          );
        })}
      </div>
      <div role="group" aria-label="Ora di inizio" className="mt-1.5 grid grid-cols-8 gap-1">
        {ore.map((h) => (
          <Pillola key={h} on={h === oraScelta} onClick={() => setOra(h)}>
            <span className="py-1 text-[13px] tabular-nums">{h}</span>
          </Pillola>
        ))}
      </div>
      <div role="group" aria-label="Durata" className="mt-1.5 grid grid-cols-4 gap-1">
        {[30, 60, 90, 120].map((m) => (
          <Pillola key={m} on={m === durata} onClick={() => setDurata(m)}>
            <span className="py-1 text-[12.5px]">{m < 60 ? "30 min" : m === 60 ? "1 ora" : m === 90 ? "1 h 30" : "2 ore"}</span>
          </Pillola>
        ))}
      </div>
      <div className={`mt-2 flex min-h-[36px] items-center gap-2 rounded-[12px] px-2.5 py-1.5 text-[12.5px] leading-snug ${errore ? "bg-errore-tint font-semibold text-errore" : "bg-bg-sink text-ink-soft"}`} role={errore ? "alert" : undefined}>
        <span className="min-w-0 flex-1">
          {errore ? errore.errore : `Preavviso, SIAE e nulla osta: li mandiamo noi. Prima data utile ${giornoBreve(new Date(`${giorni[0]}T12:00:00Z`)).dow} ${giornoBreve(new Date(`${giorni[0]}T12:00:00Z`)).n} (3 giorni).`}
        </span>
        {errore?.suggerimento && (
          <button type="button" onClick={() => prenota(errore.suggerimento!.inizio)} className="shrink-0 rounded-full bg-ink px-2.5 py-1 text-[12px] font-bold text-white">
            Dalle {oraIt(errore.suggerimento.inizio)}
          </button>
        )}
      </div>
      <button
        type="button"
        disabled={invio || oraScelta === null}
        onClick={() => prenota()}
        className="mt-2 h-11 w-full rounded-[14px] text-[14px] font-bold text-white disabled:opacity-60"
        style={{ background: a.c }}
      >
        {invio ? "Controllo le regole…" : oraScelta === null ? "Nessun orario libero" : `Ci sarò · ${giornoBreve(new Date(`${giorno}T12:00:00Z`)).dow} ${giornoBreve(new Date(`${giorno}T12:00:00Z`)).n}, ${oraScelta}:00–${fine}`}
      </button>
    </Scheda>
  );
}
