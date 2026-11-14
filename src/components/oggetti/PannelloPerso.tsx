"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CANALI_RECAPITO,
  CATEGORIE_OGGETTI,
  FASCE_ORARIE,
  LUOGHI_TIPO,
  MACRO_AREE,
  type CanaleRecapito,
  type CategoriaOggetto,
  type FasciaOraria,
  type LuogoTipo,
  type MacroArea,
} from "@/lib/oggetti/costanti";
import { formattaData } from "@/lib/formato";
import { Icon } from "../Icon";
import { btnPrimario, btnSecondario, campo } from "../ui/stili";
import { Avviso, Etichetta } from "../ui/Varie";
import { SceltaChip } from "../vista/Filtri";
import type { ContattoMagicLinkClient, SessioneClient } from "./AccessoOggetti";
import { PillolaColore } from "./PillolaColore";

interface StatoPerso {
  segnalazione: {
    id: string;
    pseudonimo: string;
    categoria: CategoriaOggetto;
    macro_area: MacroArea;
    fascia: FasciaOraria;
    luogo_tipo: LuogoTipo | null;
    colore: string | null;
    data_smarrimento: string;
    recapito_canale: CanaleRecapito;
    stato: string;
    creata_il: string;
  } | null;
  statoMatch: {
    messaggio: string;
    totaleCandidati: number;
    esattoDocumento: boolean;
    semaforoDocumento: "verde" | "grigio" | null;
    rifiuti: { codice: string | null; motivo: string | null }[];
  } | null;
  conversazioni: {
    matchId: string;
    stato: string;
    esatto: boolean;
    custodePseudonimo: string;
    custodeRuolo: string;
    oggettoBloccato: boolean;
    messaggi: { id: number; mittente: string; tipo: string; testo: string; creatoIl: string }[];
    appuntamento: {
      puntoNome: string;
      puntoIndirizzo: string;
      puntoTipo: string;
      quando: string;
      numeroMascherato: string;
      codiceRitiro: string | null;
      confermaCustodeIl: string | null;
      confermaRichiedenteIl: string | null;
    } | null;
  }[];
}

export function PannelloPerso({
  sessione,
  contattoMagicLink = null,
  onRegistrata,
}: {
  sessione: SessioneClient | null;
  contattoMagicLink?: ContattoMagicLinkClient | null;
  onRegistrata?: () => void;
}) {
  const [dati, setDati] = useState<StatoPerso | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [esito, setEsito] = useState<string | null>(null);

  // Form segnalazione Ho perso
  const [categoria, setCategoria] = useState<CategoriaOggetto | "">("");
  const [macroArea, setMacroArea] = useState<MacroArea>("trastevere");
  const [fascia, setFascia] = useState<FasciaOraria>("sera");
  const [luogoTipo, setLuogoTipo] = useState<LuogoTipo | "">("");
  const [colore, setColore] = useState("");
  const [dataSmarrimento, setDataSmarrimento] = useState(() => new Date().toISOString().slice(0, 10));
  const [canaleScelto, setCanaleScelto] = useState<CanaleRecapito | null>(null);
  const [recapitoScelto, setRecapitoScelto] = useState<string | null>(null);
  const canalePredefinito: CanaleRecapito =
    contattoMagicLink?.canale && contattoMagicLink.canale in CANALI_RECAPITO
      ? (contattoMagicLink.canale as CanaleRecapito)
      : "whatsapp";
  const canale = canaleScelto ?? canalePredefinito;
  const recapito = recapitoScelto ?? contattoMagicLink?.recapito ?? "";
  const [numDoc, setNumDoc] = useState("");
  const [numDenuncia, setNumDenuncia] = useState("");

  // Risposte nei thread
  const [testiChat, setTestiChat] = useState<Record<string, string>>({});

  const ricarica = useCallback(async () => {
    if (!sessione) return;
    const r = await fetch("/api/oggetti/perso", { cache: "no-store" });
    if (r.ok) setDati(await r.json());
  }, [sessione]);

  useEffect(() => {
    if (!sessione) return;
    let attivo = true;
    (async () => {
      const r = await fetch("/api/oggetti/perso", { cache: "no-store" });
      if (r.ok && attivo) setDati(await r.json());
    })();
    return () => {
      attivo = false;
    };
  }, [sessione]);

  const inviaSegnalazione = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrore(null);
    setEsito(null);
    if (!sessione) {
      setErrore("Accedi prima qui sopra (SPID, CIE o Magic Link) per inviare la segnalazione protetta.");
      return;
    }
    if (!categoria) {
      setErrore("Seleziona prima la tipologia dell'oggetto smarrito.");
      return;
    }
    const r = await fetch("/api/oggetti/perso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoria,
        macro_area: macroArea,
        fascia,
        luogo_tipo: luogoTipo,
        colore,
        data_smarrimento: dataSmarrimento,
        recapito_canale: canale,
        recapito,
        numero_documento: numDoc,
        numero_denuncia: numDenuncia,
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      setErrore(d.errore ?? "Errore invio segnalazione.");
      return;
    }
    setEsito(d.messaggioConferma);
    await ricarica();
    onRegistrata?.();
  };

  const chiudiAttiva = async (id: string) => {
    setErrore(null);
    const r = await fetch("/api/oggetti/perso", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ azione: "chiudi", id }),
    });
    if (r.ok) await ricarica();
  };

  const azioneMatch = async (matchId: string, azione: string, testo?: string) => {
    setErrore(null);
    setEsito(null);
    const r = await fetch(`/api/oggetti/match/${matchId}/azioni`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ azione, testo }),
    });
    const d = await r.json();
    if (!r.ok) {
      setErrore(d.errore ?? "Operazione non riuscita");
      return;
    }
    setTestiChat((t) => ({ ...t, [matchId]: "" }));
    if (d.messaggio) setEsito(d.messaggio);
    await ricarica();
  };

  const attiva = dati?.segnalazione && dati.segnalazione.stato === "attiva" ? dati.segnalazione : null;

  if (!sessione) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {errore && <Avviso icona="attenzione">{errore}</Avviso>}
      {esito && (
        <p role="status" className="flex items-start gap-2 rounded-card bg-ok-tint px-3.5 py-3 text-sm font-bold text-ok">
          <Icon name="spunta" size={18} strokeWidth={2.4} className="mt-0.5 shrink-0" />
          <span>{esito}</span>
        </p>
      )}

      {dati?.segnalazione && (
        <section className="flex flex-col gap-3 rounded-panel border border-line bg-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.05em] text-muted">
                Livello 2 · Stato ricerca personale ({dati.segnalazione.pseudonimo})
              </p>
              <h3 className="text-base font-bold">
                {CATEGORIE_OGGETTI[dati.segnalazione.categoria]} · {MACRO_AREE[dati.segnalazione.macro_area]?.nome ?? dati.segnalazione.macro_area}
              </h3>
              <p className="text-xs text-ink-soft">
                Smarrimento del {formattaData(dati.segnalazione.data_smarrimento, false)} ({FASCE_ORARIE[dati.segnalazione.fascia]})
                {dati.segnalazione.colore ? ` · colore: ${dati.segnalazione.colore}` : ""} · stato:{" "}
                <b>{dati.segnalazione.stato}</b>
              </p>
            </div>
            {attiva && (
              <button type="button" onClick={() => chiudiAttiva(attiva.id)} className={btnSecondario}>
                Chiudi segnalazione
              </button>
            )}
          </div>

          {dati.statoMatch && (
            <div className="flex flex-col gap-2 rounded-card bg-bg-sink p-3">
              <div className="flex flex-wrap items-center gap-2">
                {dati.statoMatch.semaforoDocumento === "verde" && (
                  <Etichetta tono="ok" icona="spunta">
                    Semaforo verde · documento abbinato
                  </Etichetta>
                )}
                {dati.statoMatch.semaforoDocumento === "grigio" && (
                  <Etichetta icona="orologio">Semaforo grigio · in attesa di riscontro</Etichetta>
                )}
              </div>
              <p className="text-sm text-ink">{dati.statoMatch.messaggio}</p>
              {dati.statoMatch.rifiuti.map((rif, idx) => (
                <p key={idx} className="text-xs text-attenzione">
                  Verifica respinta ({rif.codice}): {rif.motivo}. In caso di dubbi puoi chiedere verifica di persona al Punto H24 o Comando.
                </p>
              ))}
            </div>
          )}

          {dati.conversazioni.map((c) => {
            const haDescrizione = c.messaggi.some((m) => m.mittente === "richiedente" && m.tipo === "descrizione");
            const haDomanda = c.messaggi.some((m) => m.mittente === "custode" && m.tipo === "domanda");
            return (
              <div key={c.matchId} className="flex flex-col gap-3 rounded-card border border-line p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-oggetti-ink">
                    Canale cifrato con {c.custodePseudonimo}
                  </span>
                  <Etichetta tono={c.stato === "restituito" ? "ok" : "attenzione"}>{c.stato}</Etichetta>
                </div>

                {c.oggettoBloccato && (
                  <Avviso icona="lucchetto">
                    Oggetto bloccato dopo troppi tentativi falliti: lo sblocco avviene solo allo sportello con documento d&apos;identità.
                  </Avviso>
                )}

                <ul className="flex flex-col gap-2">
                  {c.messaggi.map((msg) => (
                    <li
                      key={msg.id}
                      className={`rounded-card px-3 py-2 text-sm ${
                        msg.mittente === "richiedente"
                          ? "ml-6 bg-velo text-ink"
                          : msg.mittente === "sistema"
                            ? "bg-bg-sink text-ink-soft"
                            : "mr-6 border border-line bg-panel text-ink"
                      }`}
                    >
                      <span className="block text-[11px] font-bold uppercase text-muted">
                        {msg.mittente} · {msg.tipo}
                      </span>
                      {msg.testo}
                    </li>
                  ))}
                </ul>

                {c.stato === "contatto" && !c.oggettoBloccato && (
                  <div className="flex flex-col gap-2">
                    <textarea
                      rows={2}
                      className="rounded-card border-[1.5px] border-campo bg-panel p-2.5 text-sm"
                      value={testiChat[c.matchId] ?? ""}
                      onChange={(e) => setTestiChat((t) => ({ ...t, [c.matchId]: e.target.value }))}
                      placeholder={
                        !haDescrizione
                          ? "Passo 1: descrivi per primo l'oggetto, il luogo e l'ora in cui ti sei accorto dello smarrimento"
                          : haDomanda
                            ? "Rispondi alla domanda di controllo del custode"
                            : "Attendi le domande di controllo del custode o aggiungi dettagli"
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      {!haDescrizione && (
                        <button
                          type="button"
                          onClick={() => azioneMatch(c.matchId, "invia_descrizione", testiChat[c.matchId] ?? "")}
                          className={btnPrimario}
                        >
                          Invia descrizione iniziale
                        </button>
                      )}
                      {haDescrizione && haDomanda && (
                        <button
                          type="button"
                          onClick={() => azioneMatch(c.matchId, "invia_risposta", testiChat[c.matchId] ?? "")}
                          className={btnPrimario}
                        >
                          Invia risposta cifrata
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {c.appuntamento && (
                  <div className="flex flex-col gap-2 rounded-card bg-ok-tint p-3 text-sm">
                    <p className="font-bold text-ok">Appuntamento sicuro confermato</p>
                    <p>
                      <b>{c.appuntamento.puntoNome}</b> · {c.appuntamento.puntoIndirizzo}
                    </p>
                    <p>Quando: {new Date(c.appuntamento.quando).toLocaleString("it-IT")}</p>
                    <p>Contatto vocale: {c.appuntamento.numeroMascherato}</p>
                    {c.appuntamento.codiceRitiro && (
                      <p className="rounded-card bg-panel px-3 py-2 font-bold text-ink">
                        Codice di ritiro da mostrare al custode: {c.appuntamento.codiceRitiro}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-xs text-ink-soft">
                        Conferme: custode {c.appuntamento.confermaCustodeIl ? "✓" : "in attesa"} · proprietario{" "}
                        {c.appuntamento.confermaRichiedenteIl ? "✓" : "in attesa"}
                      </span>
                      {!c.appuntamento.confermaRichiedenteIl && c.stato === "appuntamento" && (
                        <button
                          type="button"
                          onClick={() => azioneMatch(c.matchId, "conferma_riconsegna")}
                          className={btnPrimario}
                        >
                          Confermo di aver riavuto l&apos;oggetto
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {!attiva && (
        <form onSubmit={inviaSegnalazione} className="flex flex-col gap-3 rounded-panel border border-line bg-panel p-4">
          <div>
            <h3 className="text-base font-bold">STEP 2 · Apri segnalazione &ldquo;Ho perso&rdquo;</h3>
            <p className="text-xs text-ink-soft">
              Regola di sicurezza: puoi tenere attiva una sola segnalazione alla volta. Nessun catalogo pubblico: il matching avviene in privato lato server.
            </p>
          </div>

          <div className="flex flex-wrap items-start gap-2">
            <SceltaChip
              etichetta="Tipologia dell'oggetto smarrito"
              vuoto="Seleziona tipologia oggetto"
              valore={categoria}
              opzioni={Object.entries(CATEGORIE_OGGETTI).map(([k, v]) => ({ valore: k, etichetta: v }))}
              onChange={(v) => setCategoria(v as CategoriaOggetto | "")}
            />
            <SceltaChip
              etichetta="Dove hai perso l'oggetto"
              vuoto="Ovunque"
              valore={luogoTipo}
              opzioni={Object.entries(LUOGHI_TIPO).map(([k, v]) => ({ valore: k, etichetta: v }))}
              onChange={(v) => setLuogoTipo(v as LuogoTipo | "")}
            />
            <PillolaColore valore={colore} onChange={setColore} />
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-bold">
              Macro-area
              <select className={campo} value={macroArea} onChange={(e) => setMacroArea(e.target.value as MacroArea)}>
                {Object.entries(MACRO_AREE).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold">
              Fascia oraria
              <select className={campo} value={fascia} onChange={(e) => setFascia(e.target.value as FasciaOraria)}>
                {Object.entries(FASCE_ORARIE).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold">
              Data smarrimento
              <input type="date" required className={campo} value={dataSmarrimento} onChange={(e) => setDataSmarrimento(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold">
              Canale notifica
              <select className={campo} value={canale} onChange={(e) => setCanaleScelto(e.target.value as CanaleRecapito)}>
                {Object.entries(CANALI_RECAPITO).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs font-bold">
            Numero di telefono / SMS / WhatsApp o Email (cifrato lato server)
            <input
              required
              className={campo}
              value={recapito}
              onChange={(e) => setRecapitoScelto(e.target.value)}
              placeholder="es. +39 333 1234567 o nome@email.it"
            />
          </label>

          {categoria === "documenti" ? (
            <div className="flex flex-col gap-2 rounded-card border border-attenzione bg-attenzione-tint p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-ink">
                  Denuncia obbligatoria per documenti (salvata solo come impronta cifrata HMAC)
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNumDoc("CA482910AA");
                    setNumDenuncia("CC-RM-2026-88412");
                  }}
                  className="text-xs font-bold text-amaranto hover:underline"
                >
                  Simula lettura OCR da denuncia
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  required
                  className={campo}
                  value={numDoc}
                  onChange={(e) => setNumDoc(e.target.value)}
                  placeholder="Numero documento (es. CA482910AA)"
                />
                <input
                  required
                  className={campo}
                  value={numDenuncia}
                  onChange={(e) => setNumDenuncia(e.target.value)}
                  placeholder="Protocollo denuncia FF.OO."
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">
              Per gli oggetti comuni non serve alcuna denuncia: il server confronta tipologia, colore, macro-area e fascia oraria.
            </p>
          )}

          <button type="submit" className={btnPrimario}>
            Registra segnalazione
            <Icon name="freccia" size={18} />
          </button>
        </form>
      )}
    </div>
  );
}
