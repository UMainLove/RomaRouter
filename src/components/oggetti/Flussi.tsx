"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MACRO_AREE } from "@/lib/oggetti/costanti";
import { Azione, Azioni, Scheda, Tondo } from "../mappa-rr/Schermo";
import { CANALI, COLORI, COSE, FASCE, LUOGHI } from "./linguaggio";

/*
 * I due percorsi dei cittadini, in tre passi ciascuno, e la scheda della propria segnalazione.
 * Ogni passo e' una schermata sola: si sceglie toccando, si scrive il meno possibile.
 */

export const AMARANTO = "#8E2453";
export const VERDE = "#16955A";
const G_TROVATO = `<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z"/><path d="m9.4 10.2 1.9 1.9 3.4-3.6"/>`;
const G_PERSO = `<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/>`;
const G_CHIAVE = `<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>`;

export type Sessione = { sub: string; ruolo: string; etichetta?: string; metodo?: string } | null;
export type Zona = keyof typeof MACRO_AREE;

const campo = "h-11 w-full min-w-0 rounded-[12px] border-0 bg-bg-sink px-3 text-[15px] font-semibold text-ink placeholder:font-normal placeholder:text-muted focus:ring-2 focus:ring-ink focus:outline-none";
const ZONE = (Object.keys(MACRO_AREE) as Zona[]).filter((z) => z !== "altro");
const oggiRoma = (giorniFa = 0) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date(Date.now() - giorniFa * 86_400_000));

async function chiama<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const d = await r.json().catch(() => ({ errore: "Il servizio non risponde: riprova tra poco." }));
  if (!r.ok) throw new Error((d as { errore?: string }).errore ?? "Qualcosa non è andato");
  return d as T;
}

// ==================================================================== mattoncini
function Passi({ passo, di }: { passo: number; di: number }) {
  return (
    <div className="mb-2.5 grid gap-1" style={{ gridTemplateColumns: `repeat(${di}, 1fr)` }} aria-hidden="true">
      {Array.from({ length: di }, (_, i) => (
        <span key={i} className={`h-1 rounded-full ${i < passo ? "bg-ink" : "bg-line"}`} />
      ))}
    </div>
  );
}

function Pillole<T extends string>({ voci, valore, onScegli, etichetta }: { voci: [T, string][]; valore: T | null; onScegli: (v: T) => void; etichetta: string }) {
  return (
    <div role="group" aria-label={etichetta} className="flex flex-wrap gap-1">
      {voci.map(([k, n]) => (
        <button
          key={k}
          type="button"
          aria-pressed={valore === k}
          onClick={() => onScegli(k)}
          className={`h-8 rounded-full px-3 text-[12.5px] font-bold transition ${valore === k ? "bg-ink text-white" : "bg-bg-sink text-ink hover:bg-line"}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function Cose({ valore, onScegli, colore }: { valore: string | null; onScegli: (k: string) => void; colore: string }) {
  return (
    <div role="group" aria-label="Che cosa" className="grid grid-cols-5 gap-1">
      {COSE.map((c) => {
        const on = valore === c.k;
        return (
          <button
            key={c.k}
            type="button"
            aria-pressed={on}
            onClick={() => onScegli(c.k)}
            className={`flex flex-col items-center gap-0.5 rounded-[12px] py-1.5 text-[10.5px] leading-tight font-bold transition ${on ? "text-ink" : "text-muted hover:bg-bg-sink"}`}
            style={on ? { background: `${colore}16` } : undefined}
          >
            <span className="flex size-8 items-center justify-center rounded-full" style={{ background: on ? colore : "#ECE7DF" }}>
              <svg viewBox="0 0 24 24" className="size-[17px]" fill="none" stroke={on ? "#fff" : "#6F6560"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: c.g }} />
            </span>
            {c.n}
          </button>
        );
      })}
    </div>
  );
}

function Colori({ valore, onScegli }: { valore: string | null; onScegli: (c: string | null) => void }) {
  return (
    <div role="group" aria-label="Colore (facoltativo)" className="flex flex-wrap items-center gap-1.5">
      {COLORI.map(([n, hex]) => (
        <button
          key={n}
          type="button"
          aria-pressed={valore === n}
          aria-label={n}
          title={n}
          onClick={() => onScegli(valore === n ? null : n)}
          className={`size-7 rounded-full ring-offset-2 transition ${valore === n ? "ring-2 ring-ink" : "ring-1 ring-black/10 hover:scale-110"}`}
          style={{ background: hex }}
        />
      ))}
    </div>
  );
}

function Piede({ errore, nota, indietro, avanti, testo, invio, colore }: { errore: string | null; nota?: ReactNode; indietro?: () => void; avanti: () => void; testo: string; invio?: boolean; colore: string }) {
  return (
    <>
      <p className={`mt-1.5 min-h-[18px] text-[12.5px] leading-snug ${errore ? "font-semibold text-errore" : "text-muted"}`} role={errore ? "alert" : undefined}>
        {errore ?? nota ?? ""}
      </p>
      <div className="mt-1 flex gap-2">
        {indietro && (
          <button type="button" onClick={indietro} className="h-11 rounded-[14px] bg-bg-sink px-4 text-[14px] font-bold text-ink hover:bg-line">
            Indietro
          </button>
        )}
        <button type="button" disabled={invio} onClick={avanti} className="h-11 flex-1 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-60" style={{ background: colore }}>
          {invio ? "Un attimo…" : testo}
        </button>
      </div>
    </>
  );
}

// ==================================================================== accesso
/** Per proteggere chi perde e chi trova, si entra prima: SPID o CIE (qui di prova), oppure un link per i turisti. */
export function SchedaAccesso({ motivo, onEntrato, onChiudi }: { motivo: "perso" | "trovato"; onEntrato: (s: Sessione) => void; onChiudi: () => void }) {
  const [turista, setTurista] = useState(false);
  const [canale, setCanale] = useState<"email" | "sms">("email");
  const [recapito, setRecapito] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const colore = motivo === "perso" ? AMARANTO : VERDE;

  async function entra(profilo: string) {
    setInvio(true);
    setErrore(null);
    try {
      const d = await chiama<{ sessione: Sessione }>("/api/oggetti/sessione", { method: "POST", body: JSON.stringify({ azione: "accedi_demo", profilo }) });
      onEntrato(d.sessione);
    } catch (e) {
      setErrore((e as Error).message);
    } finally {
      setInvio(false);
    }
  }
  async function link() {
    setInvio(true);
    setErrore(null);
    try {
      const ml = await chiama<{ tokenDemo: string }>("/api/oggetti/sessione", {
        method: "POST",
        body: JSON.stringify({ azione: "crea_magic_link", tipo_recapito: canale, recapito, provenienza: "straniero_ue" }),
      });
      // versione dimostrativa: il link non si spedisce, si apre subito
      const d = await chiama<{ sessione: Sessione }>("/api/oggetti/sessione", { method: "POST", body: JSON.stringify({ azione: "verifica_magic_link", token: ml.tokenDemo }) });
      onEntrato(d.sessione);
    } catch (e) {
      setErrore((e as Error).message);
    } finally {
      setInvio(false);
    }
  }

  return (
    <Scheda icona={<Tondo colore={colore} glifo={G_CHIAVE} />} sopra={motivo === "perso" ? "Ho perso qualcosa" : "Ho trovato qualcosa"} titolo="Prima entra, in un tocco" onChiudi={onChiudi}>
      <p className="text-[13px] leading-snug text-ink-soft">
        Chi perde e chi trova non si vedono mai: i dati restano cifrati e il contatto passa solo dopo la verifica.
      </p>
      {!turista ? (
        <div className="mt-2.5 grid gap-2">
          <button type="button" disabled={invio} onClick={() => entra("cittadino_spid")} className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[#0066CC] text-[14px] font-bold text-white hover:bg-[#0057AD] disabled:opacity-60">
            Entra con SPID <span className="font-semibold opacity-75">· prova</span>
          </button>
          <button type="button" disabled={invio} onClick={() => entra("cittadino_cie")} className="h-11 rounded-[14px] bg-bg-sink text-[14px] font-bold text-ink hover:bg-line disabled:opacity-60">
            Entra con la Carta d&apos;identità <span className="font-semibold text-muted">· prova</span>
          </button>
          <button type="button" onClick={() => setTurista(true)} className="h-9 text-[13px] font-bold text-ink-soft underline decoration-line underline-offset-4 hover:text-ink">
            Sono un turista o non ho SPID
          </button>
        </div>
      ) : (
        <div className="mt-2.5 grid gap-2">
          <Pillole etichetta="Come ti scriviamo" voci={[["email", "Email"], ["sms", "SMS"]]} valore={canale} onScegli={setCanale} />
          <label>
            <span className="sr-only">{canale === "email" ? "Email" : "Numero di telefono"}</span>
            <input value={recapito} onChange={(e) => setRecapito(e.target.value)} type={canale === "email" ? "email" : "tel"} placeholder={canale === "email" ? "nome@esempio.com" : "+39 333 000 0000"} className={campo} />
          </label>
          <button type="button" disabled={invio || recapito.length < 5} onClick={link} className="h-11 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-50" style={{ background: colore }}>
            {invio ? "Un attimo…" : "Mandami il link (vale 1 ora)"}
          </button>
        </div>
      )}
      <p className={`mt-1.5 min-h-[18px] text-[12px] ${errore ? "font-semibold text-errore" : "text-muted"}`} role={errore ? "alert" : undefined}>
        {errore ?? (turista ? "Versione dimostrativa: il link non viene spedito, ti facciamo entrare subito." : "Versione dimostrativa: SPID e CIE sono simulati.")}
      </p>
    </Scheda>
  );
}

// ==================================================================== ho trovato
export type EsitoTrovato = { chiave: string; codiceConsegna: string | null; richiedeFFOO: boolean; istruzioni: string[]; zona: Zona; matching: { creati: number } };

export function SchedaTrovato({ zonaIniziale, onEsito, onChiudi }: { zonaIniziale: Zona; onEsito: (e: EsitoTrovato) => void; onChiudi: () => void }) {
  const [passo, setPasso] = useState(1);
  const [cosa, setCosa] = useState<string | null>(null);
  const [sensibile, setSensibile] = useState(false);
  const [numeroDoc, setNumeroDoc] = useState("");
  const [zona, setZona] = useState<Zona>(zonaIniziale);
  const [luogo, setLuogo] = useState<string | null>("strada");
  const [fascia, setFascia] = useState<string | null>(null);
  const [giorniFa, setGiorniFa] = useState<string>("0");
  const [dettaglio, setDettaglio] = useState("");
  const [colore, setColore] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  function avanti() {
    setErrore(null);
    if (passo === 1 && !cosa) return setErrore("Tocca che cosa hai trovato.");
    if (passo === 2 && (!fascia || !luogo)) return setErrore("Dicci dove e in che momento della giornata.");
    if (passo < 3) return setPasso(passo + 1);
    if (dettaglio.trim().length < 4) return setErrore("Scrivi un dettaglio che solo il proprietario può sapere.");
    invia();
  }
  async function invia() {
    setInvio(true);
    try {
      const d = await chiama<EsitoTrovato>("/api/oggetti/trovato", {
        method: "POST",
        body: JSON.stringify({
          categoria: cosa, macro_area: zona, fascia, luogo_tipo: luogo, data_ritrovamento: oggiRoma(Number(giorniFa)), colore,
          dettaglio_riservato: dettaglio, numero_documento: numeroDoc || undefined, chiave_auto_o_carta: sensibile || cosa === "documenti",
        }),
      });
      onEsito({ ...d, zona });
    } catch (e) {
      setErrore((e as Error).message);
    } finally {
      setInvio(false);
    }
  }

  const titoli = ["Che cosa hai trovato?", "Dove e quando?", "Il dettaglio segreto"];
  return (
    <Scheda icona={<Tondo colore={VERDE} glifo={G_TROVATO} />} sopra={`Ho trovato · ${passo} di 3`} titolo={titoli[passo - 1]} onChiudi={onChiudi}>
      <Passi passo={passo} di={3} />
      {passo === 1 && (
        <div className="grid gap-2">
          <Cose valore={cosa} onScegli={setCosa} colore={VERDE} />
          {cosa && cosa !== "documenti" && ["portafogli", "chiavi", "borse"].includes(cosa) && (
            <label className="flex items-center gap-2 rounded-[12px] bg-bg-sink px-3 py-2 text-[13px] font-semibold text-ink">
              <input type="checkbox" checked={sensibile} onChange={(e) => setSensibile(e.target.checked)} className="size-4 accent-[#16955A]" />
              Dentro ci sono documenti, carte di pagamento o chiavi d&apos;auto
            </label>
          )}
          {cosa === "documenti" && (
            <label>
              <span className="sr-only">Numero del documento (facoltativo)</span>
              <input value={numeroDoc} onChange={(e) => setNumeroDoc(e.target.value)} placeholder="Numero del documento (facoltativo)" className={campo} />
            </label>
          )}
        </div>
      )}
      {passo === 2 && <DoveQuando zona={zona} setZona={setZona} luogo={luogo} setLuogo={setLuogo} fascia={fascia} setFascia={setFascia} giorniFa={giorniFa} setGiorniFa={setGiorniFa} />}
      {passo === 3 && (
        <div className="grid gap-2">
          <label>
            <span className="sr-only">Dettaglio segreto</span>
            <textarea
              value={dettaglio}
              onChange={(e) => setDettaglio(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="Es. dentro c'è una foto di un cane, un portachiavi a forma di stella…"
              className="w-full resize-none rounded-[12px] border-0 bg-bg-sink px-3 py-2.5 text-[15px] text-ink placeholder:text-muted focus:ring-2 focus:ring-ink focus:outline-none"
            />
          </label>
          <p className="text-[12px] font-bold text-muted">Colore (facoltativo)</p>
          <Colori valore={colore} onScegli={setColore} />
        </div>
      )}
      <Piede
        errore={errore}
        nota={passo === 3 ? "Il dettaglio resta cifrato: serve solo a riconoscere il vero proprietario." : undefined}
        indietro={passo > 1 ? () => setPasso(passo - 1) : undefined}
        avanti={avanti}
        testo={passo < 3 ? "Avanti" : "Dammi il codice di consegna"}
        invio={invio}
        colore={VERDE}
      />
    </Scheda>
  );
}

function DoveQuando({ zona, setZona, luogo, setLuogo, fascia, setFascia, giorniFa, setGiorniFa }: {
  zona: Zona; setZona: (z: Zona) => void; luogo: string | null; setLuogo: (v: string) => void; fascia: string | null; setFascia: (v: string) => void; giorniFa: string; setGiorniFa: (v: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <label className="relative">
        <span className="sr-only">Zona di Roma</span>
        <select value={zona} onChange={(e) => setZona(e.target.value as Zona)} className={`${campo} appearance-none pr-8`}>
          {ZONE.map((z) => (
            <option key={z} value={z}>
              {MACRO_AREE[z].nome}
            </option>
          ))}
          <option value="altro">Altra zona di Roma</option>
        </select>
        <svg viewBox="0 0 20 20" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden="true">
          <path d="m5 8 5 5 5-5" />
        </svg>
      </label>
      <Pillole etichetta="Dove" voci={LUOGHI} valore={luogo} onScegli={setLuogo} />
      <Pillole etichetta="Quando" voci={[["0", "Oggi"], ["1", "Ieri"], ["2", "Due giorni fa"], ["4", "Qualche giorno fa"]]} valore={giorniFa} onScegli={setGiorniFa} />
      <Pillole etichetta="Momento della giornata" voci={FASCE} valore={fascia} onScegli={setFascia} />
    </div>
  );
}

// ==================================================================== ho perso
export function SchedaPerso({ zonaIniziale, categoriaIniziale, onCreata, onChiudi }: { zonaIniziale: Zona; categoriaIniziale: string | null; onCreata: () => void; onChiudi: () => void }) {
  const [passo, setPasso] = useState(1);
  const [cosa, setCosa] = useState<string | null>(categoriaIniziale);
  const [numeroDoc, setNumeroDoc] = useState("");
  const [denuncia, setDenuncia] = useState("");
  const [zona, setZona] = useState<Zona>(zonaIniziale);
  const [luogo, setLuogo] = useState<string | null>(null);
  const [fascia, setFascia] = useState<string | null>(null);
  const [giorniFa, setGiorniFa] = useState<string>("0");
  const [colore, setColore] = useState<string | null>(null);
  const [canale, setCanale] = useState<string | null>("whatsapp");
  const [recapito, setRecapito] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  function avanti() {
    setErrore(null);
    if (passo === 1 && !cosa) return setErrore("Tocca che cosa hai perso.");
    if (passo === 1 && cosa === "documenti" && (numeroDoc.trim().length < 4 || denuncia.trim().length < 4)) return setErrore("Per i documenti servono il numero del documento e quello della denuncia.");
    if (passo === 2 && !fascia) return setErrore("In che momento della giornata te ne sei accorto?");
    if (passo < 3) return setPasso(passo + 1);
    if (recapito.trim().length < 5) return setErrore("Lasciaci un recapito per avvisarti.");
    invia();
  }
  async function invia() {
    setInvio(true);
    try {
      await chiama("/api/oggetti/perso", {
        method: "POST",
        body: JSON.stringify({
          categoria: cosa, macro_area: zona, fascia, luogo_tipo: luogo ?? undefined, colore, data_smarrimento: oggiRoma(Number(giorniFa)),
          recapito_canale: canale, recapito, numero_documento: numeroDoc || undefined, numero_denuncia: denuncia || undefined,
        }),
      });
      onCreata();
    } catch (e) {
      setErrore((e as Error).message);
    } finally {
      setInvio(false);
    }
  }

  const titoli = ["Che cosa hai perso?", "Dove e quando?", "Come ti avvisiamo?"];
  return (
    <Scheda icona={<Tondo colore={AMARANTO} glifo={G_PERSO} />} sopra={`Ho perso · ${passo} di 3`} titolo={titoli[passo - 1]} onChiudi={onChiudi}>
      <Passi passo={passo} di={3} />
      {passo === 1 && (
        <div className="grid gap-2">
          <Cose valore={cosa} onScegli={setCosa} colore={AMARANTO} />
          {cosa === "documenti" && (
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="sr-only">Numero del documento</span>
                <input value={numeroDoc} onChange={(e) => setNumeroDoc(e.target.value)} placeholder="N. documento" className={campo} />
              </label>
              <label>
                <span className="sr-only">Numero della denuncia</span>
                <input value={denuncia} onChange={(e) => setDenuncia(e.target.value)} placeholder="N. denuncia" className={campo} />
              </label>
            </div>
          )}
        </div>
      )}
      {passo === 2 && (
        <div className="grid gap-2">
          <DoveQuando zona={zona} setZona={setZona} luogo={luogo} setLuogo={setLuogo} fascia={fascia} setFascia={setFascia} giorniFa={giorniFa} setGiorniFa={setGiorniFa} />
          <Colori valore={colore} onScegli={setColore} />
        </div>
      )}
      {passo === 3 && (
        <div className="grid gap-2">
          <Pillole etichetta="Canale" voci={CANALI} valore={canale} onScegli={setCanale} />
          <label>
            <span className="sr-only">Recapito</span>
            <input value={recapito} onChange={(e) => setRecapito(e.target.value)} type={canale === "email" ? "email" : "tel"} placeholder={canale === "email" ? "nome@esempio.com" : "+39 333 000 0000"} className={campo} />
          </label>
        </div>
      )}
      <Piede
        errore={errore}
        nota={passo === 3 ? "Il recapito resta cifrato: chi trova l'oggetto non lo vede mai." : passo === 1 && cosa === "documenti" ? "I numeri restano cifrati: servono a riconoscere subito il documento." : undefined}
        indietro={passo > 1 ? () => setPasso(passo - 1) : undefined}
        avanti={avanti}
        testo={passo < 3 ? "Avanti" : "Avvisami se lo trovano"}
        invio={invio}
        colore={AMARANTO}
      />
    </Scheda>
  );
}

// ==================================================================== la mia segnalazione
type Conversazione = {
  matchId: string; stato: string; custodePseudonimo: string; oggettoBloccato: boolean;
  messaggi: { id: number; mittente: string; tipo: string; testo: string; creatoIl: string }[];
  appuntamento: { puntoNome: string; puntoIndirizzo: string; quando: string; numeroMascherato: string; codiceRitiro: string | null; confermaRichiedenteIl: string | null } | null;
};
type StatoPerso = {
  segnalazione: { id: string; pseudonimo: string; categoria: string; stato: string } | null;
  statoMatch: { messaggio: string; totaleCandidati: number; semaforoDocumento: "verde" | "grigio" | null } | null;
  conversazioni: Conversazione[];
};

const quandoIt = (s: string) => new Date(s).toLocaleString("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

export function SchedaSegnalazione({ onChiudi, onNuova }: { onChiudi: () => void; onNuova: () => void }) {
  const [d, setD] = useState<StatoPerso | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [testo, setTesto] = useState("");
  const [invio, setInvio] = useState(false);
  const carica = () =>
    chiama<StatoPerso>("/api/oggetti/perso")
      .then(setD)
      .catch((e: Error) => setErrore(e.message));
  useEffect(() => {
    carica();
    const t = setInterval(carica, 20_000);
    return () => clearInterval(t);
  }, []);

  const s = d?.segnalazione;
  const conv = d?.conversazioni.find((c) => c.stato !== "respinto") ?? d?.conversazioni[0];
  const cosa = COSE.find((c) => c.k === s?.categoria);
  const mia = (tipo: string) => conv?.messaggi.some((m) => m.mittente === "richiedente" && m.tipo === tipo);
  const domanda = [...(conv?.messaggi ?? [])].reverse().find((m) => m.mittente === "custode" && m.tipo === "domanda");
  // cosa tocca fare adesso al proprietario
  const tocca: "descrizione" | "risposta" | "ritiro" | null =
    conv?.stato === "contatto" && !mia("descrizione") ? "descrizione" : conv?.stato === "contatto" && domanda && !mia("risposta") ? "risposta" : conv?.stato === "appuntamento" && !conv.appuntamento?.confermaRichiedenteIl ? "ritiro" : null;

  async function azione(nome: string, extra: Record<string, unknown> = {}) {
    if (!conv) return;
    setInvio(true);
    setErrore(null);
    try {
      await chiama(`/api/oggetti/match/${conv.matchId}/azioni`, { method: "POST", body: JSON.stringify({ azione: nome, ...extra }) });
      setTesto("");
      await carica();
    } catch (e) {
      setErrore((e as Error).message);
    } finally {
      setInvio(false);
    }
  }
  async function chiudiSegnalazione() {
    if (!s) return;
    await chiama("/api/oggetti/perso", { method: "PATCH", body: JSON.stringify({ azione: "chiudi", id: s.id }) }).catch(() => {});
    onNuova();
  }

  const passi = [
    { n: "Segnalata", fatto: !!s },
    { n: "Trovato un simile", fatto: (d?.statoMatch?.totaleCandidati ?? 0) > 0 || !!conv },
    { n: "Verifica", fatto: ["verificato", "appuntamento", "restituito"].includes(conv?.stato ?? "") },
    { n: "Ritiro", fatto: s?.stato === "restituito" || conv?.stato === "restituito" },
  ];
  const attuale = passi.findIndex((p) => !p.fatto);

  if (d && !s) {
    return (
      <Scheda icona={<Tondo colore={AMARANTO} glifo={G_PERSO} />} sopra="La mia segnalazione" titolo="Nessuna segnalazione attiva" onChiudi={onChiudi}>
        <p className="text-[14px] text-ink-soft">Non hai segnalazioni aperte.</p>
        <Azioni>
          <Azione primaria onClick={onNuova}>Segnala cosa hai perso</Azione>
        </Azioni>
      </Scheda>
    );
  }
  return (
    <Scheda icona={<Tondo colore={AMARANTO} glifo={cosa?.g ?? G_PERSO} />} sopra={s ? `La mia segnalazione · ${s.pseudonimo}` : "La mia segnalazione"} titolo={cosa?.n ?? "…"} onChiudi={onChiudi}>
      <ol className="grid grid-cols-4 gap-1" aria-label="A che punto siamo">
        {passi.map((p, i) => (
          <li key={p.n} className="flex flex-col items-center gap-1 text-center">
            <span className={`flex size-6 items-center justify-center rounded-full text-[11px] font-extrabold ${p.fatto ? "bg-ok text-white" : i === attuale ? "bg-panel text-[#8E2453] ring-2 ring-[#8E2453]" : "bg-bg-sink text-muted"}`}>
              {p.fatto ? "✓" : i + 1}
            </span>
            <span className={`text-[10.5px] leading-tight font-bold ${p.fatto || i === attuale ? "text-ink" : "text-muted"}`}>{p.n}</span>
          </li>
        ))}
      </ol>

      <div className="mt-2.5 rounded-[14px] bg-bg-sink px-3 py-2.5">
        {tocca === "ritiro" && conv?.appuntamento ? (
          <>
            <p className="text-[12px] font-bold text-muted">Appuntamento per il ritiro</p>
            <p className="text-[15px] font-extrabold text-ink">{quandoIt(conv.appuntamento.quando)}</p>
            <p className="truncate text-[12.5px] text-ink-soft">{conv.appuntamento.puntoNome}</p>
            <p className="mt-1 text-[12px] text-muted">
              Mostra il codice <b className="text-[16px] tracking-wider text-ink tabular-nums">{conv.appuntamento.codiceRitiro ?? "—"}</b> e un documento
            </p>
          </>
        ) : tocca === "descrizione" || tocca === "risposta" ? (
          <>
            <p className="text-[12px] font-bold text-muted">{tocca === "descrizione" ? "Il custode ha un oggetto simile: descrivilo" : `Domanda del custode: ${domanda?.testo ?? ""}`}</p>
            <textarea
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={tocca === "descrizione" ? "Com'è fatto, cosa c'era dentro, quando te ne sei accorto…" : "La tua risposta"}
              className="mt-1 w-full resize-none rounded-[10px] border-0 bg-panel px-2.5 py-2 text-[14px] text-ink placeholder:text-muted focus:ring-2 focus:ring-ink focus:outline-none"
            />
          </>
        ) : (
          <p className="text-[13px] leading-snug text-ink-soft">
            {d?.statoMatch?.semaforoDocumento === "verde" ? "Il tuo documento è stato ritrovato. " : ""}
            {d?.statoMatch?.messaggio ?? "Carico…"}
          </p>
        )}
      </div>
      <p className={`mt-1 min-h-[16px] text-[12px] ${errore ? "font-semibold text-errore" : "text-muted"}`} role={errore ? "alert" : undefined}>
        {errore ?? "Si aggiorna da sola. Ti avvisiamo anche sul recapito che hai lasciato."}
      </p>
      <Azioni>
        {tocca === "descrizione" || tocca === "risposta" ? (
          <Azione primaria onClick={() => !invio && azione(tocca === "descrizione" ? "invia_descrizione" : "invia_risposta", { testo })}>
            {invio ? "Invio…" : "Invia"}
          </Azione>
        ) : tocca === "ritiro" ? (
          <Azione primaria onClick={() => !invio && azione("conferma_riconsegna")}>
            Ho ritirato l&apos;oggetto
          </Azione>
        ) : (
          <Azione primaria onClick={onChiudi}>Va bene</Azione>
        )}
        <Azione onClick={chiudiSegnalazione}>{s?.stato === "restituito" ? "Nuova segnalazione" : "Non mi serve più"}</Azione>
      </Azioni>
    </Scheda>
  );
}
