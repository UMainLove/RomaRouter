"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CATEGORIE_OGGETTI, MACRO_AREE, MOTIVI_RIFIUTO } from "@/lib/oggetti/costanti";
import { COSE } from "../oggetti/linguaggio";
import { RegistraOggetto } from "./RegistraOggetto";

/*
 * Area operatori degli oggetti smarriti, in ordine:
 *  1. entri (profili di prova: Forze dell'Ordine, Ufficio, punto H24, guardia, volontario);
 *  2. prendi in consegna l'oggetto che un cittadino ti porta, con il suo codice;
 *  3. segui le richieste dei proprietari: un passo alla volta, il pulsante dice cosa fare ora;
 *  4. controlli un documento (solo Forze dell'Ordine e Ufficio) o registri un oggetto senza codice.
 */

type Sessione = { sub: string; ruolo: string; etichetta?: string } | null;
type Messaggio = { id: number; mittente: string; tipo: string; testo: string };
type Richiesta = {
  id: string; oggettoChiave: string; oggettoCategoria: string; oggettoMacroArea: string | null; oggettoStato: string; oggettoBloccato: boolean;
  dettaglioRiservato: string | null; richiedentePseudonimo: string; punteggio: number; esatto: boolean; stato: string; tentativiFalliti: number;
  messaggi: Messaggio[]; appuntamento: { quando?: string; punto_nome?: string } | null;
  contattoAppuntamento: { canale: string; recapito: string | null } | null;
};
type Punto = { id: string; categoria: string; nome: string; lat: number; lon: number; h24: boolean; fonte?: string };

const PROFILI: [string, string, string][] = [
  ["forze_ordine", "Forze dell'Ordine", "vede tutte le richieste, anche i documenti"],
  ["ufficio", "Ufficio Oggetti Rinvenuti", "Roma Capitale, deposito centrale"],
  ["punto_h24", "Punto amico H24", "attività convenzionata"],
  ["guardia_giurata", "Guardia giurata", "istituto convenzionato"],
  ["volontario", "Volontario", "residente con CIE"],
];
const STATI: Record<string, { n: string; c: string }> = {
  proposto: { n: "Da controllare", c: "#E07A1F" },
  contatto: { n: "In verifica", c: "#1F63D1" },
  verificato: { n: "Verificato", c: "#16955A" },
  appuntamento: { n: "Appuntamento", c: "#7A4FD0" },
  restituito: { n: "Restituito", c: "#5F6B7A" },
  respinto: { n: "Respinto", c: "#D2372F" },
};
const campo = "h-11 w-full min-w-0 rounded-[12px] border-0 bg-bg-sink px-3 text-[15px] font-semibold text-ink placeholder:font-normal placeholder:text-muted focus:ring-2 focus:ring-ink focus:outline-none";
const bottone = "h-11 shrink-0 rounded-[14px] bg-ink px-4 text-[14px] font-bold text-white hover:bg-ink-soft disabled:opacity-50";
const secondario = "h-11 shrink-0 rounded-[14px] bg-bg-sink px-4 text-[14px] font-bold text-ink hover:bg-line disabled:opacity-50";

async function chiama<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const d = await r.json().catch(() => ({ errore: "Il servizio non risponde: riprova tra poco." }));
  if (!r.ok) throw new Error((d as { errore?: string }).errore ?? "Qualcosa non è andato");
  return d as T;
}

function Riquadro({ n, titolo, sotto, children }: { n: number; titolo: string; sotto?: string; children: ReactNode }) {
  return (
    <section className="rounded-[22px] bg-panel p-4 shadow-[0_2px_6px_rgba(37,29,28,.06),0_10px_30px_rgba(37,29,28,.08)] ring-1 ring-black/5 sm:p-5">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-[14px] font-extrabold text-white">{n}</span>
        <div>
          <h2 className="text-[18px] leading-6 font-bold text-ink">{titolo}</h2>
          {sotto && <p className="text-[13.5px] text-ink-soft">{sotto}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function AreaOperatori() {
  const [sessione, setSessione] = useState<Sessione>(null);
  const [caricato, setCaricato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    chiama<{ sessione: Sessione }>("/api/oggetti/sessione")
      .then((d) => setSessione(d.sessione))
      .catch(() => {})
      .finally(() => setCaricato(true));
  }, []);

  async function entra(profilo: string) {
    setErrore(null);
    try {
      const d = await chiama<{ sessione: Sessione }>("/api/oggetti/sessione", { method: "POST", body: JSON.stringify({ azione: "accedi_demo", profilo }) });
      setSessione(d.sessione);
    } catch (e) {
      setErrore((e as Error).message);
    }
  }
  async function esci() {
    await fetch("/api/oggetti/sessione", { method: "DELETE" }).catch(() => {});
    setSessione(null);
  }

  const operatore = sessione && !["cittadino", "turista"].includes(sessione.ruolo);
  if (!caricato) return <p className="text-muted">Un attimo…</p>;
  if (!operatore) {
    return (
      <Riquadro n={1} titolo="Entra come operatore" sotto="Versione dimostrativa: scegli un profilo di prova. Nella versione vera si entra con SPID o CIE e badge.">
        <div className="grid gap-2 sm:grid-cols-2">
          {PROFILI.map(([id, n, d]) => (
            <button key={id} type="button" onClick={() => entra(id)} className="flex flex-col items-start rounded-[16px] bg-bg-sink px-4 py-3 text-left hover:bg-line">
              <span className="text-[15px] font-bold text-ink">{n}</span>
              <span className="text-[13px] text-ink-soft">{d}</span>
            </button>
          ))}
        </div>
        {errore && <p className="mt-2 text-[14px] font-semibold text-errore" role="alert">{errore}</p>}
      </Riquadro>
    );
  }

  const forze = sessione.ruolo === "forze_ordine" || sessione.ruolo === "ufficio";
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3 rounded-[18px] bg-ok-tint px-4 py-3">
        <span className="size-2.5 rounded-full bg-ok" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-[15px] font-semibold text-ink">
          Sei dentro come <b>{PROFILI.find((p) => p.at(0) === sessione.ruolo)?.[1] ?? sessione.etichetta ?? sessione.ruolo}</b> (prova)
        </p>
        <button type="button" onClick={esci} className="h-9 rounded-full bg-panel px-4 text-[13px] font-bold text-ink hover:bg-bg-sink">
          Esci
        </button>
      </div>
      <PresaInConsegna />
      <Richieste forze={forze} />
      {forze && <Documento />}
      <Riquadro n={forze ? 5 : 4} titolo="Registra un oggetto arrivato senza codice" sotto="Per chi lo consegna di persona senza essere passato dal sito.">
        <RegistraOggetto />
      </Riquadro>
    </div>
  );
}

function PresaInConsegna() {
  const [codice, setCodice] = useState("");
  const [esito, setEsito] = useState<{ ok: boolean; testo: string } | null>(null);
  async function prendi() {
    setEsito(null);
    try {
      const d = await chiama<{ chiave: string }>("/api/oggetti/custodia", { method: "POST", body: JSON.stringify({ azione: "prendi_in_consegna", codice_consegna: codice }) });
      setEsito({ ok: true, testo: `Preso in consegna: ${d.chiave}. Se qualcuno lo cerca, comparirà qui sotto.` });
      setCodice("");
    } catch (e) {
      setEsito({ ok: false, testo: (e as Error).message });
    }
  }
  return (
    <Riquadro n={2} titolo="Prendi in consegna" sotto="Il cittadino ti mostra il codice che il sito gli ha dato quando ha segnalato l'oggetto.">
      <div className="flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Codice di consegna</span>
          <input value={codice} onChange={(e) => setCodice(e.target.value.toUpperCase())} placeholder="CNS-XXX-XXX" className={`${campo} tracking-wider uppercase`} />
        </label>
        <button type="button" disabled={codice.length < 5} onClick={prendi} className={bottone}>
          Prendi
        </button>
      </div>
      {esito && (
        <p className={`mt-2 text-[14px] font-semibold ${esito.ok ? "text-ok" : "text-errore"}`} role={esito.ok ? "status" : "alert"}>
          {esito.testo}
        </p>
      )}
    </Riquadro>
  );
}

function Richieste({ forze }: { forze: boolean }) {
  const [elenco, setElenco] = useState<Richiesta[] | null>(null);
  const [punti, setPunti] = useState<Punto[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const carica = useCallback(() => {
    chiama<{ match: Richiesta[] }>("/api/oggetti/match")
      .then((d) => setElenco(d.match))
      .catch((e: Error) => setErrore(e.message));
  }, []);
  useEffect(() => {
    carica();
    fetch("/api/oggetti/punti")
      .then((r) => r.json())
      .then((d: { punti: Punto[] }) => setPunti(d.punti.filter((p) => p.fonte !== "custode_approvato" && ["forze_ordine", "ufficio", "affiliato_h24", "misericordia"].includes(p.categoria))))
      .catch(() => {});
  }, [carica]);

  const aperte = (elenco ?? []).filter((r) => r.stato !== "restituito" && r.stato !== "respinto");
  const chiuse = (elenco ?? []).filter((r) => r.stato === "restituito" || r.stato === "respinto");
  return (
    <Riquadro n={3} titolo="Richieste dei proprietari" sotto={forze ? "Tutte le richieste di Roma. Il pulsante dice cosa fare adesso." : "Le richieste sugli oggetti che custodisci. Il pulsante dice cosa fare adesso."}>
      {errore && <p className="text-[14px] font-semibold text-errore" role="alert">{errore}</p>}
      {!elenco ? (
        <p className="text-muted">Carico…</p>
      ) : !aperte.length ? (
        <p className="rounded-[14px] bg-bg-sink px-4 py-3 text-[14px] text-ink-soft">Nessuna richiesta aperta. Quando qualcuno segnala un oggetto simile a uno che custodisci, compare qui.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {aperte.map((r) => (
            <RigaRichiesta key={r.id} r={r} punti={punti} onCambio={carica} />
          ))}
        </ul>
      )}
      {chiuse.length > 0 && <p className="mt-3 text-[13px] text-muted">{chiuse.length} richieste chiuse (restituite o respinte).</p>}
    </Riquadro>
  );
}

const quandoIt = (s: string) => new Date(s).toLocaleString("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

function RigaRichiesta({ r, punti, onCambio }: { r: Richiesta; punti: Punto[]; onCambio: () => void }) {
  const [testo, setTesto] = useState("");
  const [motivo, setMotivo] = useState("risposte_errate");
  const [punto, setPunto] = useState("");
  const [quando, setQuando] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const cosa = COSE.find((c) => c.k === r.oggettoCategoria);
  const stato = STATI[r.stato] ?? STATI.proposto;
  const ha = (mittente: string, tipo: string) => r.messaggi.some((m) => m.mittente === mittente && m.tipo === tipo);
  const descrizione = r.messaggi.find((m) => m.mittente === "richiedente" && m.tipo === "descrizione");
  const risposta = [...r.messaggi].reverse().find((m) => m.mittente === "richiedente" && m.tipo === "risposta");
  const domanda = [...r.messaggi].reverse().find((m) => m.mittente === "custode" && m.tipo === "domanda");
  // i punti adatti per l'appuntamento, i piu' vicini alla zona dell'oggetto
  const zona = r.oggettoMacroArea && r.oggettoMacroArea in MACRO_AREE ? MACRO_AREE[r.oggettoMacroArea as keyof typeof MACRO_AREE] : MACRO_AREE.centro;
  const vicini = [...punti].sort((a, b) => Math.hypot(a.lat - zona.lat, a.lon - zona.lon) - Math.hypot(b.lat - zona.lat, b.lon - zona.lon)).slice(0, 8);

  async function azione(nome: string, extra: Record<string, unknown> = {}) {
    setInvio(true);
    setErrore(null);
    try {
      await chiama(`/api/oggetti/match/${r.id}/azioni`, { method: "POST", body: JSON.stringify({ azione: nome, ...extra }) });
      setTesto("");
      onCambio();
    } catch (e) {
      setErrore((e as Error).message);
    } finally {
      setInvio(false);
    }
  }

  let passo: ReactNode;
  if (r.oggettoBloccato) passo = <p className="text-[14px] font-semibold text-errore">Bloccato dopo {r.tentativiFalliti} tentativi falliti: si sblocca solo allo sportello.</p>;
  else if (r.stato === "proposto")
    passo = (
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 text-[14px] text-ink-soft">Somiglia a un oggetto che custodisci ({r.punteggio}% di somiglianza{r.esatto ? ", documento identico" : ""}). Apri il contatto: il proprietario dovrà descriverlo.</p>
        <button type="button" disabled={invio} onClick={() => azione("avvia_contatto")} className={bottone}>
          Apri il contatto
        </button>
      </div>
    );
  else if (r.stato === "contatto" && !descrizione) passo = <p className="text-[14px] text-ink-soft">Aspettiamo che il proprietario descriva l&apos;oggetto.</p>;
  else if (r.stato === "contatto" && !domanda)
    passo = (
      <div className="grid gap-2">
        <p className="text-[14px] text-ink">
          <b>Descrizione del proprietario:</b> {descrizione?.testo}
        </p>
        <p className="text-[13px] text-muted">Il dettaglio segreto di chi l&apos;ha trovato: «{r.dettaglioRiservato ?? "—"}». Fai una domanda che solo il vero proprietario sa.</p>
        <div className="flex gap-2">
          <input value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Es. che cosa c'è disegnato sul quaderno?" className={campo} />
          <button type="button" disabled={invio || testo.length < 5} onClick={() => azione("invia_domanda", { testo })} className={bottone}>
            Chiedi
          </button>
        </div>
      </div>
    );
  else if (r.stato === "contatto" && !risposta) passo = <p className="text-[14px] text-ink-soft">Domanda inviata: «{domanda?.testo}». Aspettiamo la risposta.</p>;
  else if (r.stato === "contatto")
    passo = (
      <div className="grid gap-2">
        <p className="text-[14px] text-ink">
          <b>Risposta:</b> {risposta?.testo} <span className="text-muted">· dettaglio segreto: «{r.dettaglioRiservato ?? "—"}»</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={invio} onClick={() => azione("approva_verifica")} className={bottone}>
            È lui, approva
          </button>
          <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className={`${campo} w-auto flex-1`} aria-label="Motivo del rifiuto">
            {Object.entries(MOTIVI_RIFIUTO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button type="button" disabled={invio} onClick={() => azione("rifiuta", { motivo_codice: motivo, motivo: MOTIVI_RIFIUTO[motivo as keyof typeof MOTIVI_RIFIUTO] })} className={secondario}>
            Rifiuta
          </button>
        </div>
      </div>
    );
  else if (r.stato === "verificato")
    passo = (
      <div className="grid gap-2">
        <p className="text-[14px] text-ink-soft">
          Verificato. {r.contattoAppuntamento?.recapito ? `Recapito del proprietario: ${r.contattoAppuntamento.recapito}. ` : ""}Fissa dove e quando ritira.
        </p>
        <div className="flex flex-wrap gap-2">
          <select value={punto} onChange={(e) => setPunto(e.target.value)} className={`${campo} w-auto min-w-[220px] flex-1`} aria-label="Punto di ritiro">
            <option value="">Scegli il punto di ritiro…</option>
            {vicini.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome.replace(/\s+—\s+.*$/, "")}
                {p.h24 ? " · 24h" : ""}
              </option>
            ))}
          </select>
          <input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} className={`${campo} w-auto`} aria-label="Data e ora" />
          <button type="button" disabled={invio || !punto || !quando} onClick={() => azione("fissa_appuntamento", { punto_id: punto, quando: new Date(quando).toISOString() })} className={bottone}>
            Fissa
          </button>
        </div>
      </div>
    );
  else if (r.stato === "appuntamento")
    passo = (
      <div className="grid gap-2">
        <p className="text-[14px] text-ink-soft">
          Appuntamento {r.appuntamento?.quando ? quandoIt(r.appuntamento.quando) : ""} {r.appuntamento?.punto_nome ? `· ${r.appuntamento.punto_nome}` : ""}. Al ritiro chiedi il codice e un documento.
        </p>
        <div className="flex gap-2">
          <input value={testo} onChange={(e) => setTesto(e.target.value.toUpperCase())} placeholder="Codice di ritiro (RIT-…)" className={`${campo} tracking-wider uppercase`} />
          <button type="button" disabled={invio || testo.length < 4} onClick={() => azione("conferma_riconsegna", { codice_ritiro: testo })} className={bottone}>
            Restituito
          </button>
        </div>
      </div>
    );

  return (
    <li className="rounded-[18px] border border-line p-3.5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full" style={{ background: stato.c }}>
          <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: cosa?.g ?? "" }} />
        </span>
        <p className="min-w-0 flex-1 text-[15px] font-bold text-ink">
          {CATEGORIE_OGGETTI[r.oggettoCategoria as keyof typeof CATEGORIE_OGGETTI] ?? r.oggettoCategoria} · {r.oggettoChiave}
          <span className="block text-[12.5px] font-semibold text-muted">
            cercato da {r.richiedentePseudonimo}
            {r.oggettoMacroArea && r.oggettoMacroArea in MACRO_AREE ? ` · ${MACRO_AREE[r.oggettoMacroArea as keyof typeof MACRO_AREE].nome}` : ""}
          </span>
        </p>
        <span className="rounded-full px-2.5 py-1 text-[12px] font-bold text-white" style={{ background: stato.c }}>
          {stato.n}
        </span>
      </div>
      {passo}
      {errore && <p className="mt-2 text-[13.5px] font-semibold text-errore" role="alert">{errore}</p>}
      {ha("sistema", "avviso") && r.stato === "restituito" && <p className="mt-2 text-[13px] text-muted">Pratica chiusa.</p>}
    </li>
  );
}

function Documento() {
  const [numero, setNumero] = useState("");
  const [esito, setEsito] = useState<{ semaforo?: string; messaggio?: string; errore?: string } | null>(null);
  async function controlla(registra = false) {
    setEsito(null);
    try {
      const d = await chiama<{ semaforo: string; messaggio?: string; oggettoRegistrato?: { chiave: string } | null }>("/api/oggetti/documenti/semaforo", {
        method: "POST",
        body: JSON.stringify({ numero_documento: numero, registra }),
      });
      setEsito(d.oggettoRegistrato ? { semaforo: "registrato", messaggio: `Registrato come ${d.oggettoRegistrato.chiave}: il proprietario comparirà tra le richieste.` } : d);
    } catch (e) {
      setEsito({ errore: (e as Error).message });
    }
  }
  const verde = esito?.semaforo === "verde";
  return (
    <Riquadro n={4} titolo="Controlla un documento" sotto="Scrivi il numero: ti diciamo se qualcuno l'ha denunciato smarrito. Il numero non viene salvato.">
      <div className="flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Numero del documento</span>
          <input value={numero} onChange={(e) => setNumero(e.target.value.toUpperCase())} placeholder="Numero del documento" className={`${campo} uppercase`} />
        </label>
        <button type="button" disabled={numero.length < 4} onClick={() => controlla()} className={bottone}>
          Controlla
        </button>
        {verde && (
          <button type="button" onClick={() => controlla(true)} className={secondario}>
            Prendilo in consegna
          </button>
        )}
      </div>
      {esito && (
        <p className={`mt-2 flex items-center gap-2 text-[14px] font-semibold ${esito.errore ? "text-errore" : verde ? "text-ok" : "text-ink-soft"}`} role="status">
          {!esito.errore && <span className={`size-3 rounded-full ${verde ? "bg-ok" : "bg-[#9AA0A6]"}`} aria-hidden="true" />}
          {esito.errore ?? (verde ? "Verde: il proprietario lo sta cercando. Prendilo in consegna: la richiesta compare qui sopra." : esito.semaforo === "registrato" ? esito.messaggio : "Grigio: nessuno lo cerca per ora.")}
        </p>
      )}
    </Riquadro>
  );
}

