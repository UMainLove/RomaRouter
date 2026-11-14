"use client";

import { useState } from "react";
import {
  CATEGORIE_OGGETTI,
  FASCE_ORARIE,
  LUOGHI_TIPO,
  MACRO_AREE,
  PROVENIENZE_UTENTE,
  TIPI_RECAPITO_ML,
  type CategoriaOggetto,
  type FasciaOraria,
  type LuogoTipo,
  type MacroArea,
  type ProvenienzaUtente,
  type TipoRecapitoMl,
} from "@/lib/oggetti/costanti";
import { Icon } from "../Icon";
import { btnPrimario, campo } from "../ui/stili";
import { Avviso } from "../ui/Varie";
import type { SessioneClient } from "./AccessoOggetti";

interface ContattoRicevuto {
  canale: string;
  tipoRecapito: string | null;
  recapito: string;
  nomeStruttura: string | null;
  provenienza: string | null;
}

interface EsitoTrovato {
  chiave: string;
  stato: string;
  codiceConsegna: string | null;
  richiedeFFOO: boolean;
  istruzioni: string[];
  puntiConsigliati: { id: string; nome: string; tipo: string; indirizzo: string; h24: boolean }[];
  matching: { creati: number; esatto: boolean };
  contattiAppuntamento?: ContattoRicevuto[];
}

export function PannelloTrovato({
  sessione,
  onRegistrato,
}: {
  sessione: SessioneClient | null;
  onRegistrato?: () => void;
}) {
  const [categoria, setCategoria] = useState<CategoriaOggetto>("borse");
  const [macroArea, setMacroArea] = useState<MacroArea>("trastevere");
  const [fascia, setFascia] = useState<FasciaOraria>("pomeriggio");
  const [luogoTipo, setLuogoTipo] = useState<LuogoTipo>("strada");
  const [dataRitrovamento, setDataRitrovamento] = useState(() => new Date().toISOString().slice(0, 10));
  const [colore, setColore] = useState("");
  const [chiaveAutoOCarta, setChiaveAutoOCarta] = useState(false);
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [dettaglioRiservato, setDettaglioRiservato] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [risultato, setRisultato] = useState<EsitoTrovato | null>(null);

  if (!sessione) {
    return null;
  }

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrore(null);
    setRisultato(null);
    const r = await fetch("/api/oggetti/trovato", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoria,
        macro_area: macroArea,
        fascia,
        luogo_tipo: luogoTipo,
        data_ritrovamento: dataRitrovamento,
        colore,
        chiave_auto_o_carta: chiaveAutoOCarta,
        numero_documento: numeroDocumento,
        dettaglio_riservato: dettaglioRiservato,
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      setErrore(d.errore ?? "Errore invio segnalazione");
      return;
    }
    setRisultato(d);
    setDettaglioRiservato("");
    setNumeroDocumento("");
    onRegistrato?.();
  };

  return (
    <div className="flex flex-col gap-4">
      {errore && <Avviso icona="attenzione">{errore}</Avviso>}

      {risultato && (
        <section className="flex flex-col gap-3 rounded-panel border border-ok bg-panel p-4">
          <p className="flex items-center gap-2 text-base font-bold text-ok">
            <Icon name="spunta" size={20} strokeWidth={2.4} />
            Ritrovamento registrato in modalità protetta ({risultato.chiave})
          </p>
          {risultato.contattiAppuntamento && risultato.contattiAppuntamento.length > 0 && (
            <div className="flex flex-col gap-1.5 rounded-card border border-ok/40 bg-ok-tint p-3 text-sm">
              <p className="text-xs font-bold uppercase text-ok">
                Contatto Magic Link ricevuto per fissare l&apos;appuntamento
              </p>
              {risultato.contattiAppuntamento.map((c, idx) => (
                <p key={idx} className="text-ink">
                  <b>
                    {c.provenienza && c.provenienza in PROVENIENZE_UTENTE
                      ? PROVENIENZE_UTENTE[c.provenienza as ProvenienzaUtente]
                      : "Richiedente"}
                  </b>{" "}
                  ·{" "}
                  {c.tipoRecapito && c.tipoRecapito in TIPI_RECAPITO_ML
                    ? TIPI_RECAPITO_ML[c.tipoRecapito as TipoRecapitoMl]
                    : c.canale}
                  {c.nomeStruttura ? ` (${c.nomeStruttura})` : ""}: <b>{c.recapito}</b>
                </p>
              ))}
            </div>
          )}
          {risultato.codiceConsegna && (
            <div className="rounded-card bg-attenzione-tint p-3">
              <p className="text-xs font-bold uppercase text-attenzione">Codice consegna da mostrare al Punto H24 / Comando</p>
              <p className="mt-1 text-lg font-bold text-ink">{risultato.codiceConsegna}</p>
            </div>
          )}
          <ul className="flex flex-col gap-1.5 text-sm text-ink">
            {risultato.istruzioni.map((ist) => (
              <li key={ist} className="flex items-start gap-2">
                <Icon name="info" size={16} className="mt-0.5 shrink-0 text-oggetti-ink" />
                <span>{ist}</span>
              </li>
            ))}
          </ul>
          {risultato.codiceConsegna && risultato.puntiConsigliati.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-bold uppercase text-muted">Dove consegnarlo ora</p>
              {risultato.puntiConsigliati.slice(0, 3).map((p) => (
                <p key={p.id} className="rounded-card bg-bg-sink px-3 py-2 text-sm">
                  <b>{p.nome}</b> · {p.indirizzo} {p.h24 ? "· H24" : ""}
                </p>
              ))}
            </div>
          )}
        </section>
      )}

      <form onSubmit={invia} className="flex flex-col gap-3 rounded-panel border border-line bg-panel p-4">
        <div>
          <h3 className="text-base font-bold">STEP 2 · Apri segnalazione &ldquo;Ho trovato&rdquo; (inserimento minimo protetto)</h3>
          <p className="text-xs text-ink-soft">
            Solo macro-area, fascia oraria e macro-categoria per il matching server-side. Nessun dettaglio visibile pubblicamente.
          </p>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-bold">
            Macro-categoria
            <select className={campo} value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaOggetto)}>
              {Object.entries(CATEGORIE_OGGETTI).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
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
            Dove
            <select className={campo} value={luogoTipo} onChange={(e) => setLuogoTipo(e.target.value as LuogoTipo)}>
              {Object.entries(LUOGHI_TIPO).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold">
            Data ritrovamento
            <input type="date" required className={campo} value={dataRitrovamento} onChange={(e) => setDataRitrovamento(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold">
            Colore principale (opzionale)
            <input className={campo} value={colore} onChange={(e) => setColore(e.target.value)} placeholder="es. beige, color sabbia, lilla, verde smeraldo" />
          </label>
        </div>

        {(categoria === "chiavi" || categoria === "portafogli" || categoria === "documenti") && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={chiaveAutoOCarta}
              onChange={(e) => setChiaveAutoOCarta(e.target.checked)}
              className="size-4 accent-amaranto"
            />
            <span>Contiene documenti, carte di pagamento o chiavi auto (smistamento diretto alle Forze dell&apos;Ordine)</span>
          </label>
        )}

        {categoria === "documenti" && (
          <div className="flex flex-col gap-1.5 rounded-card bg-attenzione-tint p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold">Numero documento (solo impronta HMAC per semaforo FF.OO.)</span>
              <button
                type="button"
                onClick={() => setNumeroDocumento("CA482910AA")}
                className="text-xs font-bold text-amaranto hover:underline"
              >
                Simula OCR documento
              </button>
            </div>
            <input
              className={campo}
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)}
              placeholder="es. CA482910AA"
            />
          </div>
        )}

        <label className="flex flex-col gap-1 text-xs font-bold">
          Dettaglio riservato per il custode (cifrato AES-256-GCM, mai pubblico)
          <textarea
            required
            rows={2}
            className="rounded-card border-[1.5px] border-campo bg-panel p-2.5 text-sm font-normal"
            value={dettaglioRiservato}
            onChange={(e) => setDettaglioRiservato(e.target.value)}
            placeholder="es. marca, contenuto interno, adesivo o segno riconoscibile per le domande di controllo"
          />
        </label>

        <button type="submit" className={btnPrimario}>
          Registra ritrovamento protetto
          <Icon name="freccia" size={18} />
        </button>
      </form>
    </div>
  );
}
