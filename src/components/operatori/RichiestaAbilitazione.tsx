"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { AccessoOggetti, type SessioneClient } from "@/components/oggetti/AccessoOggetti";
import { btnPrimario, btnSecondario, campo } from "@/components/ui/stili";
import { Avviso, NotaPrivacy } from "@/components/ui/Varie";
import { MACRO_AREE, MUNICIPI_ROMA, type MacroArea } from "@/lib/oggetti/costanti";

type ProfiloRichiesta = "volontario" | "punto_h24" | "guardia_giurata";

export function RichiestaAbilitazione() {
  const [sessione, setSessione] = useState<SessioneClient | null>(null);
  const [profilo, setProfilo] = useState<ProfiloRichiesta>("volontario");
  const [municipio, setMunicipio] = useState<string>(MUNICIPI_ROMA[0]);
  const [area, setArea] = useState<MacroArea>("ostiense");

  // Privato residente
  const [residenteDal, setResidenteDal] = useState("2015-01-10");

  // Azienda / attività convenzionata (Punto H24)
  const [ragioneSociale, setRagioneSociale] = useState("");
  const [partitaIva, setPartitaIva] = useState("");
  const [indirizzoSede, setIndirizzoSede] = useState("");

  // Azienda di vigilanza / Guardia Giurata
  const [istituto, setIstituto] = useState("");
  const [matricola, setMatricola] = useState("");
  const [decreto, setDecreto] = useState("");
  const [fotoBadge, setFotoBadge] = useState("badge-gpg-esempio.jpg");

  // Impegno verso il Comune / Municipio
  const [impegnoTesto, setImpegnoTesto] = useState("");
  const [impegnoAccettato, setImpegnoAccettato] = useState(false);

  const [invioInCorso, setInvioInCorso] = useState(false);
  const [esito, setEsito] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);

  const inviaRichiesta = async (e: React.FormEvent) => {
    e.preventDefault();
    setEsito(null);
    setInvioInCorso(true);
    try {
      const r = await fetch("/api/oggetti/custodia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          azione: "richiedi_abilitazione",
          ruolo: profilo,
          macro_area: area,
          municipio,
          impegno_accettato: impegnoAccettato,
          impegno_testo: impegnoTesto,
          residente_dal: residenteDal,
          ragione_sociale: ragioneSociale,
          partita_iva: partitaIva,
          indirizzo_sede: indirizzoSede,
          istituto_vigilanza: istituto,
          matricola,
          decreto_prefettizio: decreto,
          foto_badge: fotoBadge,
        }),
      });
      const d = (await r.json()) as { messaggio?: string; pseudonimo?: string; errore?: string };
      if (!r.ok) {
        setEsito({ tipo: "errore", testo: d.errore ?? "Impossibile inviare la richiesta al Comune / Municipio." });
        return;
      }
      setEsito({
        tipo: "ok",
        testo: `${d.messaggio ?? "Richiesta inviata."} Pseudonimo assegnato: ${d.pseudonimo ?? "in verifica"}.`,
      });
      setImpegnoTesto("");
      setImpegnoAccettato(false);
    } catch {
      setEsito({ tipo: "errore", testo: "Errore di rete durante l'invio della richiesta." });
    } finally {
      setInvioInCorso(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/operatori" className={btnSecondario}>
          <Icon name="indietro" size={16} /> Torna ad Area operatori
        </Link>
        <NotaPrivacy>
          Procedura separata per privati cittadini e aziende che si impegnano formalmente a collaborare con il Comune o il Municipio competente.
        </NotaPrivacy>
      </div>

      <AccessoOggetti onCambioSessione={setSessione} />

      {esito && (
        <Avviso icona={esito.tipo === "ok" ? "spunta" : "attenzione"}>
          {esito.testo}
        </Avviso>
      )}

      {!sessione ? (
        <section className="rounded-panel border border-line bg-panel p-6">
          <h2 className="text-lg font-bold">Identificazione richiesta prima dell&apos;invio</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Per trasmettere una domanda formale al Comune o Municipio accedi qui sopra con SPID o CIE (anche come referente aziendale).
          </p>
        </section>
      ) : (
        <form onSubmit={inviaRichiesta} className="flex flex-col gap-5 rounded-panel border border-line bg-panel p-6">
          <div>
            <h2 className="text-xl font-bold">Domanda di adesione e impegno verso il Comune / Municipio</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Ogni richiesta viene protocollata nell&apos;Audit Log e valutata dall&apos;Ufficio Oggetti Rinvenuti del Comune o del Municipio selezionato prima dell&apos;abilitazione.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => setProfilo("volontario")}
              className={`rounded-card border p-4 text-left transition-colors ${
                profilo === "volontario" ? "border-ink bg-panel ring-1 ring-ink" : "border-line bg-bg-sink hover:border-campo"
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-muted">Privato cittadino</p>
              <p className="mt-1 font-bold text-ink">Volontario residente (CIE)</p>
              <p className="mt-1 text-xs text-ink-soft">
                Supporto civico di prossimità per la presa in carico temporanea di oggetti comuni nel quartiere.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setProfilo("punto_h24")}
              className={`rounded-card border p-4 text-left transition-colors ${
                profilo === "punto_h24" ? "border-ink bg-panel ring-1 ring-ink" : "border-line bg-bg-sink hover:border-campo"
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-muted">Azienda / Attività locale</p>
              <p className="mt-1 font-bold text-ink">Punto convenzionato (Hotel / Esercizio)</p>
              <p className="mt-1 text-xs text-ink-soft">
                Attività commerciali, strutture ricettive o portinerie disponibili come punto sicuro di consegna e prima assistenza.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setProfilo("guardia_giurata")}
              className={`rounded-card border p-4 text-left transition-colors ${
                profilo === "guardia_giurata" ? "border-ink bg-panel ring-1 ring-ink" : "border-line bg-bg-sink hover:border-campo"
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-muted">Azienda di vigilanza</p>
              <p className="mt-1 font-bold text-ink">Guardia Giurata / Istituto</p>
              <p className="mt-1 text-xs text-ink-soft">
                Personale con decreto prefettizio e matricola, previa doppia conferma dell&apos;istituto e del Comune.
              </p>
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold uppercase text-muted" htmlFor="req-municipio">
                Comune o Municipio destinatario
              </label>
              <select
                id="req-municipio"
                className={`${campo} mt-1`}
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
              >
                {MUNICIPI_ROMA.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-muted" htmlFor="req-area">
                Macro-area operativa
              </label>
              <select
                id="req-area"
                className={`${campo} mt-1`}
                value={area}
                onChange={(e) => setArea(e.target.value as MacroArea)}
              >
                {Object.entries(MACRO_AREE).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {profilo === "volontario" && (
            <div className="rounded-card border border-line bg-bg-sink p-4">
              <h3 className="text-sm font-bold">Requisiti privato residente (CIE)</h3>
              <p className="mt-1 text-xs text-ink-soft">
                È richiesta residenza documentata nell&apos;area di riferimento per garantire affidabilità territoriale e reperibilità.
              </p>
              <div className="mt-3 max-w-xs">
                <label className="text-xs font-bold uppercase text-muted" htmlFor="req-residente">
                  Residente nella zona dal
                </label>
                <input
                  id="req-residente"
                  type="date"
                  className={`${campo} mt-1`}
                  value={residenteDal}
                  onChange={(e) => setResidenteDal(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {profilo === "punto_h24" && (
            <div className="grid gap-3 rounded-card border border-line bg-bg-sink p-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <h3 className="text-sm font-bold">Dati azienda / attività partner</h3>
                <p className="mt-1 text-xs text-ink-soft">
                  Una volta approvata dal Comune o Municipio, la sede verrà attivata come punto di consegna tracciato.
                </p>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted" htmlFor="req-ragione">
                  Ragione sociale / Nome attività
                </label>
                <input
                  id="req-ragione"
                  className={`${campo} mt-1`}
                  value={ragioneSociale}
                  onChange={(e) => setRagioneSociale(e.target.value)}
                  placeholder="Es. Hotel Ostiense S.r.l. / Bar Stazione"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted" htmlFor="req-piva">
                  Partita IVA
                </label>
                <input
                  id="req-piva"
                  className={`${campo} mt-1`}
                  value={partitaIva}
                  onChange={(e) => setPartitaIva(e.target.value)}
                  placeholder="Es. IT12345678901"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold uppercase text-muted" htmlFor="req-indirizzo">
                  Indirizzo sede operativa di consegna e custodia
                </label>
                <input
                  id="req-indirizzo"
                  className={`${campo} mt-1`}
                  value={indirizzoSede}
                  onChange={(e) => setIndirizzoSede(e.target.value)}
                  placeholder="Es. Via Ostiense 142, Roma (reception H24)"
                  required
                />
              </div>
            </div>
          )}

          {profilo === "guardia_giurata" && (
            <div className="grid gap-3 rounded-card border border-line bg-bg-sink p-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <h3 className="text-sm font-bold">Credenziali istituto di vigilanza e Guardia Giurata</h3>
                <p className="mt-1 text-xs text-ink-soft">
                  Il file badge viene cifrato in transito e cancellato automaticamente subito dopo l&apos;approvazione comunale.
                </p>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted" htmlFor="req-istituto">
                  Istituto di vigilanza / Società
                </label>
                <input
                  id="req-istituto"
                  className={`${campo} mt-1`}
                  value={istituto}
                  onChange={(e) => setIstituto(e.target.value)}
                  placeholder="Es. Vigilanza Roma Sud S.r.l."
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted" htmlFor="req-matricola">
                  Numero identificativo / matricola
                </label>
                <input
                  id="req-matricola"
                  className={`${campo} mt-1`}
                  value={matricola}
                  onChange={(e) => setMatricola(e.target.value)}
                  placeholder="Es. GPG-4419"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted" htmlFor="req-decreto">
                  Decreto prefettizio
                </label>
                <input
                  id="req-decreto"
                  className={`${campo} mt-1`}
                  value={decreto}
                  onChange={(e) => setDecreto(e.target.value)}
                  placeholder="Es. Pref. RM 2024/8891"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted" htmlFor="req-badge">
                  Riferimento foto badge (cifrata fino a verifica)
                </label>
                <input
                  id="req-badge"
                  className={`${campo} mt-1`}
                  value={fotoBadge}
                  onChange={(e) => setFotoBadge(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-card border border-line bg-bg-sink p-4">
            <label className="text-xs font-bold uppercase text-muted" htmlFor="req-impegno">
              Modalità di contributo e disponibilità verso il Comune / Municipio
            </label>
            <textarea
              id="req-impegno"
              rows={3}
              className={`${campo} h-auto min-h-24 py-2.5`}
              value={impegnoTesto}
              onChange={(e) => setImpegnoTesto(e.target.value)}
              placeholder="Descrivi come ti impegni a contribuire (es. custodia temporanea in reception H24, segnalazione immediata agli uffici comunali, consegna protetta nei giorni feriali...)"
              required
            />
            <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-5 text-ink">
              <input
                type="checkbox"
                checked={impegnoAccettato}
                onChange={(e) => setImpegnoAccettato(e.target.checked)}
                className="mt-1 size-4 accent-amaranto"
                required
              />
              <span>
                Dichiaro l&apos;impegno formale verso <strong>{municipio}</strong> a custodire con diligenza gli oggetti affidati,
                non trattenere né divulgare beni o dati personali dei cittadini e consegnare i documenti sensibili esclusivamente a Ufficio o Forze dell&apos;Ordine con tracciamento su Audit Log.
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              La richiesta resta nello stato &ldquo;in attesa&rdquo; finché il Comune / Municipio non completa le verifiche.
            </p>
            <button type="submit" disabled={invioInCorso} className={btnPrimario}>
              <Icon name="scudo" size={16} />
              {invioInCorso ? "Invio in corso..." : "Invia richiesta al Comune / Municipio"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
