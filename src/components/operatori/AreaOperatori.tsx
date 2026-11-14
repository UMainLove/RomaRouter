"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  CATEGORIE_OGGETTI,
  LUOGHI_TIPO,
  MACRO_AREE,
  MOTIVI_RIFIUTO,
  PROVENIENZE_UTENTE,
  RUOLI_CUSTODE,
  STATI_OGGETTO_ETICHETTE,
  TIPI_RECAPITO_ML,
  type CategoriaOggetto,
  type MacroArea,
  type MotivoRifiuto,
  type ProvenienzaUtente,
  type RuoloCustode,
  type TipoRecapitoMl,
} from "@/lib/oggetti/costanti";
import { formattaData } from "@/lib/formato";
import { Icon } from "../Icon";
import { AccessoOggetti, type SessioneClient } from "../oggetti/AccessoOggetti";
import { PillolaColore } from "../oggetti/PillolaColore";
import { btnPrimario, btnSecondario, campo } from "../ui/stili";
import { Avviso, Etichetta, NotaPrivacy } from "../ui/Varie";
import { SceltaChip } from "../vista/Filtri";
import { RegistraOggetto } from "./RegistraOggetto";

interface MatchCustode {
  id: string;
  oggettoId: number;
  oggettoChiave: string;
  oggettoCategoria: CategoriaOggetto;
  oggettoDescrizione: string;
  oggettoMacroArea: MacroArea | null;
  oggettoFascia: string | null;
  oggettoStato: string;
  oggettoBloccato: boolean;
  tentativiFalliti: number;
  dettaglioRiservato: string | null;
  richiedentePseudonimo: string;
  segnalazioneArea: MacroArea;
  segnalazioneFascia: string;
  segnalazioneData: string;
  punteggio: number;
  esatto: boolean;
  stato: string;
  motivoCodice: string | null;
  motivo: string | null;
  messaggi: { id: number; mittente: string; tipo: string; testo: string; creatoIl: string }[];
  appuntamento: {
    punto_id: string;
    punto_nome: string;
    punto_indirizzo: string;
    quando: string;
    numero_mascherato: string;
    conferma_custode_il: string | null;
    conferma_richiedente_il: string | null;
  } | null;
  contattoAppuntamento?: {
    provenienza: string | null;
    tipoRecapito: string | null;
    canale: string;
    recapito: string | null;
    nomeStruttura: string | null;
    cliccatoIl: string;
  } | null;
}

interface OggettoLivello3 {
  id: number;
  chiave: string;
  categoria: CategoriaOggetto;
  descrizione: string;
  dataRitrovamento: string | null;
  enteCustode: string;
  stato: string;
  pubblico: boolean;
  macroArea: MacroArea | null;
  custodeId: string | null;
  bloccato: boolean;
  bloccatoMotivo: string | null;
  tentativiFalliti: number;
  dettaglioRiservato: string | null;
}

interface CustodeRecord {
  id: string;
  ruolo: RuoloCustode;
  pseudonimo: string;
  macro_area: string | null;
  stato: string;
  residente_dal: string | null;
  istituto_vigilanza: string | null;
  conferma_istituto: boolean;
  matricola: string | null;
  decreto_prefettizio: string | null;
  ha_foto_badge: boolean;
  municipio: string | null;
  tipo_soggetto: string | null;
  ragione_sociale: string | null;
  partita_iva: string | null;
  indirizzo_sede: string | null;
  impegno_accettato: boolean;
  impegno_testo: string | null;
}

interface PassaggioRecord {
  id: number;
  oggetto_chiave: string;
  da_nome: string | null;
  a_nome: string | null;
  motivo: string;
  creato_il: string;
}

interface PuntoConsegna {
  id: string;
  nome: string;
  tipo: string;
  indirizzo: string;
  h24: boolean;
}

interface RichiestaPubblicaRecord {
  id: string;
  oggettoId: number;
  oggettoChiave: string;
  oggettoDescrizione: string;
  stato: string;
  chiRitira: string | null;
  quando: string | null;
  elementiProva: string | null;
  creataIl: string;
}

interface AuditRecord {
  id: number;
  quando: string;
  attore: string;
  ruolo: string;
  azione: string;
  oggetto_id: number | null;
  dettagli: Record<string, unknown>;
}

type SchedaOp = "inbox" | "catalogo" | "documenti" | "custodi";

export function AreaOperatori() {
  const [sessione, setSessione] = useState<SessioneClient | null>(null);
  const [scheda, setScheda] = useState<SchedaOp>("inbox");
  const [errore, setErrore] = useState<string | null>(null);
  const [esito, setEsito] = useState<string | null>(null);

  // Dati livello 3
  const [matches, setMatches] = useState<MatchCustode[]>([]);
  const [oggetti, setOggetti] = useState<OggettoLivello3[]>([]);
  const [custodi, setCustodi] = useState<CustodeRecord[]>([]);
  const [passaggi, setPassaggi] = useState<PassaggioRecord[]>([]);
  const [punti, setPunti] = useState<PuntoConsegna[]>([]);
  const [richiestePubbliche, setRichiestePubbliche] = useState<RichiestaPubblicaRecord[]>([]);
  const [audit, setAudit] = useState<AuditRecord[]>([]);

  // Filtri Livello 3
  const [qCat3, setQCat3] = useState("");
  const [categoriaCat3, setCategoriaCat3] = useState("");
  const [luogoCat3, setLuogoCat3] = useState("");
  const [coloreCat3, setColoreCat3] = useState("");
  const [statoCat3, setStatoCat3] = useState("");
  const [zonaCat3, setZonaCat3] = useState("");
  const [visibilitaCat3, setVisibilitaCat3] = useState<"" | "pubblico" | "riservato">("");

  // Stato azioni chat / verifica
  const [domande, setDomande] = useState<Record<string, string>>({});
  const [rifiutoCodice, setRifiutoCodice] = useState<Record<string, MotivoRifiuto>>({});
  const [rifiutoTesto, setRifiutoTesto] = useState<Record<string, string>>({});
  const [appPunto, setAppPunto] = useState<Record<string, string>>({});
  const [appQuando, setAppQuando] = useState<Record<string, string>>({});
  const [codiceRitiroInput, setCodiceRitiroInput] = useState<Record<string, string>>({});

  // Presa in consegna & passaggio di consegna
  const [codiceConsegnaInput, setCodiceConsegnaInput] = useState("");
  const [destPassaggio, setDestPassaggio] = useState<Record<number, string>>({});
  const [motivoPassaggio, setMotivoPassaggio] = useState<Record<number, string>>({});

  // Semaforo documenti FF.OO.
  const [docNumero, setDocNumero] = useState("");
  const [docTipo, setDocTipo] = useState("Carta d'identità");
  const [docArea, setDocArea] = useState<MacroArea>("centro");
  const [docEsito, setDocEsito] = useState<{ semaforo: string; messaggio: string } | null>(null);


  const eCustode =
    sessione && ["volontario", "guardia_giurata", "forze_ordine", "punto_h24", "ufficio"].includes(sessione.ruolo);
  const eForzeOUfficio = sessione && ["forze_ordine", "ufficio"].includes(sessione.ruolo);

  const ricarica = useCallback(async () => {
    if (!eCustode) return;
    const qs = new URLSearchParams();
    if (qCat3) qs.set("q", qCat3);
    if (categoriaCat3) qs.set("categoria", categoriaCat3);
    if (luogoCat3) qs.set("luogo", luogoCat3);
    if (coloreCat3.trim()) qs.set("colore", coloreCat3.trim());
    if (statoCat3) qs.set("stato", statoCat3);
    if (zonaCat3) qs.set("zona", zonaCat3);
    if (visibilitaCat3) qs.set("visibilita", visibilitaCat3);

    const [rMatch, rCust] = await Promise.all([
      fetch("/api/oggetti/match", { cache: "no-store" }),
      fetch(`/api/oggetti/custodia?${qs.toString()}`, { cache: "no-store" }),
    ]);
    if (rMatch.ok) {
      const dm = await rMatch.json();
      setMatches(dm.match ?? []);
    }
    if (rCust.ok) {
      const dc = await rCust.json();
      setOggetti(dc.oggetti ?? []);
      setCustodi(dc.custodi ?? []);
      setPassaggi(dc.passaggi ?? []);
      setPunti(dc.puntiConsegna ?? []);
      setRichiestePubbliche(dc.richiestePubbliche ?? []);
      setAudit(dc.audit ?? []);
    }
  }, [eCustode, qCat3, categoriaCat3, luogoCat3, coloreCat3, statoCat3, zonaCat3, visibilitaCat3]);

  useEffect(() => {
    if (!eCustode) return;
    let attivo = true;
    const qs = new URLSearchParams();
    if (qCat3) qs.set("q", qCat3);
    if (categoriaCat3) qs.set("categoria", categoriaCat3);
    if (luogoCat3) qs.set("luogo", luogoCat3);
    if (coloreCat3.trim()) qs.set("colore", coloreCat3.trim());
    if (statoCat3) qs.set("stato", statoCat3);
    if (zonaCat3) qs.set("zona", zonaCat3);
    if (visibilitaCat3) qs.set("visibilita", visibilitaCat3);
    (async () => {
      const [rMatch, rCust] = await Promise.all([
        fetch("/api/oggetti/match", { cache: "no-store" }),
        fetch(`/api/oggetti/custodia?${qs.toString()}`, { cache: "no-store" }),
      ]);
      if (!attivo) return;
      if (rMatch.ok) {
        const dm = await rMatch.json();
        setMatches(dm.match ?? []);
      }
      if (rCust.ok) {
        const dc = await rCust.json();
        setOggetti(dc.oggetti ?? []);
        setCustodi(dc.custodi ?? []);
        setPassaggi(dc.passaggi ?? []);
        setPunti(dc.puntiConsegna ?? []);
        setRichiestePubbliche(dc.richiestePubbliche ?? []);
        setAudit(dc.audit ?? []);
      }
    })();
    return () => {
      attivo = false;
    };
  }, [eCustode, qCat3, categoriaCat3, luogoCat3, coloreCat3, statoCat3, zonaCat3, visibilitaCat3]);

  const eseguiAzioneMatch = async (matchId: string, payload: Record<string, unknown>) => {
    setErrore(null);
    setEsito(null);
    const r = await fetch(`/api/oggetti/match/${matchId}/azioni`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!r.ok) {
      setErrore(d.errore ?? "Operazione non riuscita");
      return;
    }
    setEsito(d.messaggio ?? `Pratica aggiornata (${d.stato ?? "ok"}).`);
    setDomande((prev) => ({ ...prev, [matchId]: "" }));
    await ricarica();
  };

  const eseguiAzioneCustodia = async (payload: Record<string, unknown>) => {
    setErrore(null);
    setEsito(null);
    const r = await fetch("/api/oggetti/custodia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!r.ok) {
      setErrore(d.errore ?? "Operazione non riuscita");
      return;
    }
    setEsito(d.messaggio ?? "Operazione registrata su PostgreSQL e nell'Audit Log.");
    setCodiceConsegnaInput("");
    await ricarica();
  };

  const verificaSemaforo = async (registra: boolean) => {
    setErrore(null);
    setDocEsito(null);
    const r = await fetch("/api/oggetti/documenti/semaforo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numero_documento: docNumero,
        tipo_documento: docTipo,
        macro_area: docArea,
        registra,
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      setErrore(d.errore ?? "Errore controllo semaforo");
      return;
    }
    setDocEsito({ semaforo: d.semaforo, messaggio: d.messaggio });
    await ricarica();
  };

  const destinatariPassaggio = custodi.filter(
    (c) => c.stato === "approvato" && (c.ruolo === "forze_ordine" || c.ruolo === "ufficio"),
  );

  return (
    <div className="flex flex-col gap-6">
      <AccessoOggetti mostraProfiliOperatore onCambioSessione={setSessione} />

      {errore && <Avviso icona="attenzione">{errore}</Avviso>}
      {esito && (
        <p role="status" className="flex items-center gap-2 rounded-card bg-ok-tint px-4 py-3 text-sm font-bold text-ok">
          <Icon name="spunta" size={18} strokeWidth={2.4} />
          <span>{esito}</span>
        </p>
      )}

      {!eCustode ? (
        <div className="flex flex-col gap-4">
          <NotaPrivacy>
            Seleziona qui sopra un profilo operatore/custode (es. <b>Volontario CIE</b>, <b>Punto Amico H24</b>, <b>Polizia Locale</b> o <b>Ufficio Oggetti Rinvenuti</b>) per aprire il Catalogo Livello 3 e l&apos;inbox match.
          </NotaPrivacy>

          <section className="flex flex-col gap-3 rounded-panel border border-line bg-panel p-5">
            <h2 className="text-lg font-bold">Collaborazioni con Comune e Municipi</h2>
            <p className="text-sm text-ink-soft">
              La candidatura a custode volontario o attività convenzionata non si compila qui dentro: va inviata tramite la richiesta formale separata rivolta al Comune o Municipio competente, riservata a <b>privati cittadini</b> e <b>aziende</b> che si impegnano a collaborare.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/operatori/richiesta-abilitazione" className={btnPrimario}>
                <Icon name="scudo" size={16} /> Richiesta al Comune / Municipio (Privati e Aziende)
              </Link>
            </div>
          </section>
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Strumenti operatori Livello 3" className="flex flex-wrap gap-2">
            {[
              { id: "inbox" as const, label: `1. Inbox Match (${matches.length})` },
              { id: "catalogo" as const, label: `2. Catalogo Livello 3 & Passaggi (${oggetti.length})` },
              { id: "documenti" as const, label: "3. Semaforo Documenti & Registra" },
              { id: "custodi" as const, label: `4. Custodi, Guardie & Audit (${audit.length})` },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={scheda === t.id}
                onClick={() => setScheda(t.id)}
                className={`min-h-11 rounded-full border px-4 text-sm font-bold ${
                  scheda === t.id ? "border-ink bg-ink text-white" : "border-line bg-panel text-ink hover:border-campo"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {scheda === "inbox" && (
            <section className="flex flex-col gap-4">
              <NotaPrivacy>
                <b>STEP 4 e 5 · Verifica protetta:</b> vedi solo candidati pseudonimi. Il richiedente descrive per primo oggetto, luogo e ora; poi puoi inviare domande aperte (mai prese dall&apos;elenco pubblico INF39645) oppure motivare un rifiuto.
              </NotaPrivacy>

              {matches.length === 0 ? (
                <p className="rounded-panel border border-dashed border-line bg-panel p-5 text-sm text-ink-soft">
                  Nessun match attivo per i tuoi oggetti in custodia. Registra una segnalazione &ldquo;Ho perso&rdquo; nella pagina <b>Oggetti</b> con stessa macro-area e categoria per vedere comparire qui il candidato pseudonimo!
                </p>
              ) : (
                matches.map((m) => {
                  const haDescrizione = m.messaggi.some((msg) => msg.mittente === "richiedente" && msg.tipo === "descrizione");
                  return (
                    <article key={m.id} className="flex flex-col gap-3 rounded-panel border border-line bg-panel p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold uppercase text-muted">
                            {m.oggettoChiave} · {CATEGORIE_OGGETTI[m.oggettoCategoria] ?? m.oggettoCategoria} ·{" "}
                            {m.oggettoMacroArea ? MACRO_AREE[m.oggettoMacroArea]?.nome : ""}
                          </p>
                          <h3 className="text-base font-bold">
                            {m.richiedentePseudonimo} · compatibilità {m.punteggio}% {m.esatto ? "(MATCH ESATTO DOCUMENTO)" : ""}
                          </h3>
                          <p className="text-xs text-ink-soft">
                            Segnalazione persa del {formattaData(m.segnalazioneData, false)} ({m.segnalazioneFascia}) · tentativi falliti sull&apos;oggetto:{" "}
                            {m.tentativiFalliti}/3
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Etichetta tono={m.stato === "restituito" ? "ok" : m.stato === "respinto" ? "neutro" : "attenzione"}>
                            {m.stato}
                          </Etichetta>
                          {m.oggettoBloccato && (
                            <Etichetta tono="attenzione" icona="lucchetto">
                              Oggetto bloccato (solo sportello)
                            </Etichetta>
                          )}
                        </div>
                      </div>

                      {m.dettaglioRiservato && (
                        <div className="rounded-card bg-bg-sink p-3 text-sm">
                          <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-muted">
                            <Icon name="lucchetto" size={14} />
                            Dettaglio riservato custode (decifrato solo per te)
                          </p>
                          <p className="mt-1 text-ink">{m.dettaglioRiservato}</p>
                        </div>
                      )}

                      {m.contattoAppuntamento && m.contattoAppuntamento.recapito && (
                        <div className="rounded-card border border-ok/40 bg-ok-tint p-3 text-sm">
                          <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-ok">
                            <Icon name="spunta" size={14} />
                            Contatto Magic Link per fissare l&apos;appuntamento
                          </p>
                          <p className="mt-1 text-ink">
                            <b>
                              {m.contattoAppuntamento.provenienza && m.contattoAppuntamento.provenienza in PROVENIENZE_UTENTE
                                ? PROVENIENZE_UTENTE[m.contattoAppuntamento.provenienza as ProvenienzaUtente]
                                : "Richiedente"}
                            </b>{" "}
                            ·{" "}
                            {m.contattoAppuntamento.tipoRecapito && m.contattoAppuntamento.tipoRecapito in TIPI_RECAPITO_ML
                              ? TIPI_RECAPITO_ML[m.contattoAppuntamento.tipoRecapito as TipoRecapitoMl]
                              : m.contattoAppuntamento.canale}
                            {m.contattoAppuntamento.nomeStruttura ? ` (${m.contattoAppuntamento.nomeStruttura})` : ""}:{" "}
                            <b>{m.contattoAppuntamento.recapito}</b>
                          </p>
                        </div>
                      )}

                      {m.messaggi.length > 0 && (
                        <ul className="flex flex-col gap-2">
                          {m.messaggi.map((msg) => (
                            <li
                              key={msg.id}
                              className={`rounded-card px-3 py-2 text-sm ${
                                msg.mittente === "custode"
                                  ? "ml-6 bg-oggetti-tint text-ink"
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
                      )}

                      {!m.oggettoBloccato && m.stato === "proposto" && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void eseguiAzioneMatch(m.id, { azione: "avvia_contatto" })}
                            className={btnPrimario}
                          >
                            Avvia contatto cifrato con {m.richiedentePseudonimo}
                          </button>
                        </div>
                      )}

                      {!m.oggettoBloccato && m.stato === "contatto" && (
                        <div className="flex flex-col gap-3 rounded-card border border-line p-3">
                          {!haDescrizione ? (
                            <p className="text-sm text-attenzione">
                              In attesa che il richiedente invii per primo descrizione dell&apos;oggetto, luogo e ora in cui si è accorto dello smarrimento.
                            </p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <label className="text-xs font-bold">Invia domanda aperta di controllo (no scelte multiple)</label>
                              <div className="flex flex-wrap gap-2">
                                <input
                                  className={`${campo} flex-1`}
                                  value={domande[m.id] ?? ""}
                                  onChange={(e) => setDomande((p) => ({ ...p, [m.id]: e.target.value }))}
                                  placeholder="Es. Cosa c'era dentro la tasca anteriore o che adesivo ha?"
                                />
                                <button
                                  type="button"
                                  onClick={() => void eseguiAzioneMatch(m.id, { azione: "invia_domanda", testo: domande[m.id] ?? "" })}
                                  className={btnSecondario}
                                >
                                  Invia domanda
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void eseguiAzioneMatch(m.id, { azione: "approva_verifica" })}
                                  className={btnPrimario}
                                >
                                  Approva proprietà
                                </button>
                              </div>
                            </div>
                          )}

                          <details className="pt-1">
                            <summary className="cursor-pointer text-xs font-bold text-amaranto">Rifiuta con motivo obbligatorio</summary>
                            <div className="mt-2 grid gap-2 sm:grid-cols-3">
                              <select
                                className={campo}
                                value={rifiutoCodice[m.id] ?? "risposte_errate"}
                                onChange={(e) => setRifiutoCodice((p) => ({ ...p, [m.id]: e.target.value as MotivoRifiuto }))}
                              >
                                {Object.entries(MOTIVI_RIFIUTO).map(([k, v]) => (
                                  <option key={k} value={k}>
                                    {v}
                                  </option>
                                ))}
                              </select>
                              <input
                                className={campo}
                                value={rifiutoTesto[m.id] ?? ""}
                                onChange={(e) => setRifiutoTesto((p) => ({ ...p, [m.id]: e.target.value }))}
                                placeholder="Spiega il motivo del rifiuto"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  void eseguiAzioneMatch(m.id, {
                                    azione: "rifiuta",
                                    motivo_codice: rifiutoCodice[m.id] ?? "risposte_errate",
                                    motivo: rifiutoTesto[m.id] ?? "",
                                  })
                                }
                                className={btnSecondario}
                              >
                                Registra rifiuto motivato
                              </button>
                            </div>
                          </details>
                        </div>
                      )}

                      {!m.oggettoBloccato && m.stato === "verificato" && (
                        <div className="grid gap-2 rounded-card bg-ok-tint p-3 sm:grid-cols-3">
                          <select
                            className={campo}
                            value={appPunto[m.id] ?? punti[0]?.id ?? ""}
                            onChange={(e) => setAppPunto((p) => ({ ...p, [m.id]: e.target.value }))}
                          >
                            {punti.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nome} ({p.tipo})
                              </option>
                            ))}
                          </select>
                          <input
                            type="datetime-local"
                            className={campo}
                            value={appQuando[m.id] ?? ""}
                            onChange={(e) => setAppQuando((p) => ({ ...p, [m.id]: e.target.value }))}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              void eseguiAzioneMatch(m.id, {
                                azione: "fissa_appuntamento",
                                punto_id: appPunto[m.id] ?? punti[0]?.id,
                                quando: appQuando[m.id] || new Date(Date.now() + 3_600_000).toISOString(),
                              })
                            }
                            className={btnPrimario}
                          >
                            Fissa appuntamento (numero mascherato)
                          </button>
                        </div>
                      )}

                      {m.appuntamento && (
                        <div className="flex flex-col gap-2 rounded-card bg-bg-sink p-3 text-sm">
                          <p>
                            <b>Appuntamento:</b> {m.appuntamento.punto_nome} · {new Date(m.appuntamento.quando).toLocaleString("it-IT")}
                          </p>
                          <p>Numero mascherato: {m.appuntamento.numero_mascherato}</p>
                          <p className="text-xs text-muted">
                            Conferma bilaterale: custode {m.appuntamento.conferma_custode_il ? "✓" : "in attesa"} · proprietario{" "}
                            {m.appuntamento.conferma_richiedente_il ? "✓" : "in attesa"}
                          </p>
                          {m.stato === "appuntamento" && !m.appuntamento.conferma_custode_il && (
                            <div className="flex flex-wrap gap-2">
                              <input
                                className={`${campo} max-w-[240px]`}
                                value={codiceRitiroInput[m.id] ?? ""}
                                onChange={(e) => setCodiceRitiroInput((p) => ({ ...p, [m.id]: e.target.value }))}
                                placeholder="Codice ritiro (es. RIT-123456)"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  void eseguiAzioneMatch(m.id, {
                                    azione: "conferma_riconsegna",
                                    codice_ritiro: codiceRitiroInput[m.id] ?? "",
                                  })
                                }
                                className={btnPrimario}
                              >
                                Conferma riconsegna (parte custode)
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </section>
          )}

          {scheda === "catalogo" && (
            <section className="flex flex-col gap-5">
              <div className="flex flex-wrap items-end gap-2 rounded-panel border border-line bg-panel p-4">
                <label className="flex flex-1 flex-col gap-1 text-xs font-bold">
                  Prendi in consegna un oggetto dal ritrovatore (inserisci codice consegna)
                  <input
                    className={campo}
                    value={codiceConsegnaInput}
                    onChange={(e) => setCodiceConsegnaInput(e.target.value)}
                    placeholder="es. CNS-ABC-123"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void eseguiAzioneCustodia({ azione: "prendi_in_consegna", codice_consegna: codiceConsegnaInput })}
                  className={btnPrimario}
                >
                  Registra presa in consegna
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["", "Tutti gli oggetti"],
                    ["pubblico", "Registro INF39645 (solo backend)"],
                    ["riservato", "Solo custodia riservata"],
                  ] as const
                ).map(([val, lab]) => (
                  <button
                    key={val || "tutti"}
                    type="button"
                    onClick={() => setVisibilitaCat3(val)}
                    className={`min-h-10 rounded-pill border px-3.5 text-xs font-bold ${
                      visibilitaCat3 === val ? "border-ink bg-ink text-white" : "border-campo bg-panel text-ink hover:bg-bg-sink"
                    }`}
                  >
                    {lab}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-start gap-2">
                <SceltaChip
                  etichetta="Tipologia oggetto"
                  vuoto="Seleziona tipologia oggetto"
                  valore={categoriaCat3}
                  opzioni={Object.entries(CATEGORIE_OGGETTI).map(([k, v]) => ({ valore: k, etichetta: v }))}
                  onChange={setCategoriaCat3}
                />
                <SceltaChip
                  etichetta="Dove è stato trovato"
                  vuoto="Ovunque"
                  valore={luogoCat3}
                  opzioni={Object.entries(LUOGHI_TIPO).map(([k, v]) => ({ valore: k, etichetta: v }))}
                  onChange={setLuogoCat3}
                />
                <PillolaColore valore={coloreCat3} onChange={setColoreCat3} onInvio={() => void ricarica()} />
              </div>

              <div className="grid gap-2 sm:grid-cols-4">
                <input
                  className={campo}
                  value={qCat3}
                  onChange={(e) => setQCat3(e.target.value)}
                  placeholder="Cerca chiave, custodia…"
                />
                <select className={campo} value={statoCat3} onChange={(e) => setStatoCat3(e.target.value)}>
                  <option value="">Tutti gli stati</option>
                  {Object.entries(STATI_OGGETTO_ETICHETTE).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select className={campo} value={zonaCat3} onChange={(e) => setZonaCat3(e.target.value)}>
                  <option value="">Tutte le macro-aree</option>
                  {Object.entries(MACRO_AREE).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.nome}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => void ricarica()} className={btnSecondario}>
                  Aggiorna catalogo
                </button>
              </div>

              {eForzeOUfficio && richiestePubbliche.length > 0 && (
                <div className="rounded-panel border border-line bg-bg-sink p-4">
                  <h3 className="mb-2 text-sm font-bold">Pratiche pregresse da Catalogo Pubblico INF39645</h3>
                  <ul className="flex flex-col gap-2 text-xs">
                    {richiestePubbliche.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-card bg-panel px-3 py-2">
                        <div>
                          <p className="font-bold">
                            {r.oggettoChiave} · {r.oggettoDescrizione} ({r.stato})
                          </p>
                          <p className="text-ink-soft">
                            Ritiro: {r.chiRitira ?? "persona"}
                            {r.quando ? ` · ${new Date(r.quando).toLocaleString("it-IT")}` : ""}
                            {r.elementiProva ? ` · Prova cifrata: ${r.elementiProva}` : ""}
                          </p>
                        </div>
                        {r.stato === "appuntamento" && (
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                void eseguiAzioneCustodia({
                                  azione: "gestisci_richiesta_pubblica",
                                  richiesta_id: r.id,
                                  esito: "restituito",
                                })
                              }
                              className="min-h-9 rounded-card bg-ink px-2.5 font-bold text-white"
                            >
                              Restituito allo sportello
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void eseguiAzioneCustodia({
                                  azione: "gestisci_richiesta_pubblica",
                                  richiesta_id: r.id,
                                  esito: "respinta",
                                })
                              }
                              className="min-h-9 rounded-card border border-campo px-2.5 font-bold"
                            >
                              Respingi
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                {oggetti.map((o) => (
                  <div key={o.id} className="flex flex-col gap-2 rounded-panel border border-line bg-panel p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold">
                          {o.chiave} · {o.descrizione}
                        </p>
                        <p className="text-xs text-ink-soft">
                          {CATEGORIE_OGGETTI[o.categoria] ?? o.categoria} ·{" "}
                          {o.macroArea ? MACRO_AREE[o.macroArea]?.nome : "Roma"} · custode: <b>{o.enteCustode}</b> ·{" "}
                          {o.pubblico ? "Livello 1 INF39645" : "Riservato (no vetrina)"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Etichetta tono={o.stato === "restituito" ? "ok" : "attenzione"}>
                          {STATI_OGGETTO_ETICHETTE[o.stato] ?? o.stato}
                        </Etichetta>
                        {o.bloccato && <Etichetta icona="lucchetto">Bloccato</Etichetta>}
                      </div>
                    </div>

                    {o.dettaglioRiservato && (
                      <p className="rounded-card bg-bg-sink px-3 py-2 text-xs text-ink">
                        <b>Dettaglio cifrato:</b> {o.dettaglioRiservato}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {!o.pubblico && o.stato !== "restituito" && destinatariPassaggio.length > 0 && (
                        <>
                          <select
                            className="h-10 rounded-card border border-campo bg-panel px-2.5 text-xs"
                            value={destPassaggio[o.id] ?? destinatariPassaggio[0].id}
                            onChange={(e) => setDestPassaggio((p) => ({ ...p, [o.id]: e.target.value }))}
                          >
                            {destinatariPassaggio.map((d) => (
                              <option key={d.id} value={d.id}>
                                Passa a: {d.pseudonimo}
                              </option>
                            ))}
                          </select>
                          <input
                            className="h-10 rounded-card border border-campo bg-panel px-2.5 text-xs"
                            value={motivoPassaggio[o.id] ?? ""}
                            onChange={(e) => setMotivoPassaggio((p) => ({ ...p, [o.id]: e.target.value }))}
                            placeholder="Motivo (fine turno / dubbi volontario)"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              void eseguiAzioneCustodia({
                                azione: "passaggio_consegna",
                                oggetto_id: o.id,
                                a_custode_id: destPassaggio[o.id] ?? destinatariPassaggio[0].id,
                                motivo: motivoPassaggio[o.id] ?? "Passaggio di consegna a fine turno / verifica comando",
                              })
                            }
                            className="min-h-10 rounded-card border border-campo px-3 text-xs font-bold hover:bg-bg-sink"
                          >
                            Passaggio di consegna
                          </button>
                        </>
                      )}

                      {sessione?.ruolo === "ufficio" &&
                        o.categoria !== "documenti" &&
                        !o.bloccato &&
                        o.stato === "in_deposito" && (
                          <button
                            type="button"
                            onClick={() =>
                              void eseguiAzioneCustodia({
                                azione: "pubblica_catalogo",
                                oggetto_id: o.id,
                                pubblico: !o.pubblico,
                              })
                            }
                            className="min-h-10 rounded-card border border-campo px-3 text-xs font-bold hover:bg-bg-sink"
                          >
                            {o.pubblico ? "Rimuovi da registro INF39645" : "Marca registro INF39645"}
                          </button>
                        )}

                      {o.bloccato && eForzeOUfficio && (
                        <button
                          type="button"
                          onClick={() =>
                            void eseguiAzioneCustodia({
                              azione: "sblocca_oggetto",
                              oggetto_id: o.id,
                              nota: "Documento identità verificato allo sportello",
                            })
                          }
                          className="min-h-10 rounded-card bg-amaranto px-3 text-xs font-bold text-white"
                        >
                          Sblocca allo sportello (dopo documento)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {passaggi.length > 0 && (
                <div className="rounded-panel border border-line bg-panel p-4">
                  <h3 className="mb-2 text-base font-bold">Catena di custodia (ultimi passaggi di consegna)</h3>
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {passaggi.map((p) => (
                      <li key={p.id} className="rounded-card bg-bg-sink px-3 py-2">
                        <b>{p.oggetto_chiave}</b>: {p.da_nome ?? "Ritrovatore"} → {p.a_nome ?? "Comando/Ufficio"} ({p.motivo})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {scheda === "documenti" && (
            <section className="flex flex-col gap-6">
              <div className="flex flex-col gap-3 rounded-panel border border-line bg-panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold">Semaforo Documenti (Forze dell&apos;Ordine / Ufficio)</h2>
                    <p className="text-sm text-ink-soft">
                      Confronto esatto sull&apos;impronta HMAC-SHA256 del numero documento senza salvare dati personali in chiaro.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDocNumero("CA482910AA")}
                    className="text-xs font-bold text-amaranto hover:underline"
                  >
                    Simula scansione OCR documento trovato
                  </button>
                </div>

                {!eForzeOUfficio ? (
                  <Avviso icona="lucchetto">
                    Funzione attiva solo per i profili <b>Polizia Locale / Forze dell&apos;Ordine</b> o <b>Ufficio Oggetti Rinvenuti</b>. Cambia ruolo nel pannello in alto per provarla.
                  </Avviso>
                ) : (
                  <>
                    <div className="grid gap-2.5 sm:grid-cols-3">
                      <input
                        className={campo}
                        value={docNumero}
                        onChange={(e) => setDocNumero(e.target.value)}
                        placeholder="Numero documento (es. CA482910AA)"
                      />
                      <input
                        className={campo}
                        value={docTipo}
                        onChange={(e) => setDocTipo(e.target.value)}
                        placeholder="Tipo documento"
                      />
                      <select className={campo} value={docArea} onChange={(e) => setDocArea(e.target.value as MacroArea)}>
                        {Object.entries(MACRO_AREE).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void verificaSemaforo(false)} className={btnSecondario}>
                        Controlla solo semaforo
                      </button>
                      <button type="button" onClick={() => void verificaSemaforo(true)} className={btnPrimario}>
                        Verifica e registra documento trovato
                      </button>
                    </div>
                    {docEsito && (
                      <div
                        className={`rounded-card p-3 text-sm font-bold ${
                          docEsito.semaforo === "verde" ? "bg-ok-tint text-ok" : "bg-bg-sink text-ink"
                        }`}
                      >
                        {docEsito.messaggio}
                      </div>
                    )}
                  </>
                )}
              </div>

              <RegistraOggetto puoPubblicareINF={Boolean(eForzeOUfficio)} onRegistrato={() => void ricarica()} />
            </section>
          )}

          {scheda === "custodi" && (
            <section className="flex flex-col gap-5">
              <div className="flex flex-col gap-2.5 rounded-panel border border-line bg-panel p-4">
                <h2 className="text-lg font-bold">Elenco custodi e collaborazioni Comune / Municipi</h2>
                <p className="text-xs text-ink-soft">
                  Riepilogo di privati cittadini, aziende convenzionate e istituti di vigilanza che hanno inviato richiesta formale con impegno verso il Comune o Municipio.
                </p>
                {custodi.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-bg-sink p-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-bold">
                        {c.pseudonimo} · {RUOLI_CUSTODE[c.ruolo]} ({c.macro_area ?? "Roma"})
                        {c.tipo_soggetto && (
                          <span className="ml-2 rounded-full bg-panel px-2 py-0.5 text-[11px] font-bold uppercase text-muted border border-line">
                            {c.tipo_soggetto === "azienda" ? "Azienda" : "Privato"}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-ink-soft">
                        Stato: <b>{c.stato}</b>
                        {c.municipio ? ` · Ente: ${c.municipio}` : ""}
                        {c.ragione_sociale ? ` · ${c.ragione_sociale}` : ""}
                        {c.partita_iva ? ` (P.IVA ${c.partita_iva})` : ""}
                        {c.indirizzo_sede ? ` · Sede: ${c.indirizzo_sede}` : ""}
                        {c.residente_dal ? ` · residente dal ${c.residente_dal}` : ""}
                        {c.istituto_vigilanza ? ` · ${c.istituto_vigilanza} (conferma istituto: ${c.conferma_istituto ? "sì" : "no"})` : ""}
                        {c.matricola ? ` · matricola ${c.matricola}` : ""}
                        {c.decreto_prefettizio ? ` · decreto ${c.decreto_prefettizio}` : ""}
                        {c.ruolo === "guardia_giurata"
                          ? c.ha_foto_badge
                            ? " · foto badge cifrata presente"
                            : " · foto badge rimossa"
                          : ""}
                      </p>
                      {c.impegno_testo && (
                        <p className="text-xs text-ink">
                          <b>Impegno:</b> {c.impegno_testo}
                        </p>
                      )}
                    </div>
                    {eForzeOUfficio && c.stato !== "approvato" && (
                      <div className="flex flex-wrap gap-2">
                        {c.ruolo === "guardia_giurata" && !c.conferma_istituto && (
                          <button
                            type="button"
                            onClick={() => void eseguiAzioneCustodia({ azione: "conferma_istituto", custode_id: c.id })}
                            className={btnSecondario}
                          >
                            Simula conferma istituto
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void eseguiAzioneCustodia({ azione: "approva_custode", custode_id: c.id })}
                          className={btnPrimario}
                        >
                          {c.ruolo === "guardia_giurata" ? "Approva e cancella foto badge" : "Approva collaborazione"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 rounded-panel border border-line bg-panel p-4">
                <h2 className="text-lg font-bold">Audit Log in sola aggiunta (smarriti.audit)</h2>
                <ul className="flex flex-col gap-1.5 text-xs">
                  {audit.map((a) => (
                    <li key={a.id} className="rounded-card bg-bg-sink px-3 py-2">
                      <span className="font-bold text-oggetti-ink">{a.azione}</span> · attore {a.attore} ({a.ruolo}) ·{" "}
                      {new Date(a.quando).toLocaleString("it-IT")}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
