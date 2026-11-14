"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CANALI_RECAPITO,
  LINK_EMERGENZA_TELEFONO,
  PROVENIENZE_UTENTE,
  TIPI_RECAPITO_ML,
  type CanaleRecapito,
  type ProvenienzaUtente,
  type TipoRecapitoMl,
} from "@/lib/oggetti/costanti";
import { Icon } from "../Icon";
import { btnPrimario, btnSecondario, campo } from "../ui/stili";
import { Avviso, Etichetta, NotaPrivacy } from "../ui/Varie";

export interface SessioneClient {
  sub: string;
  ruolo: string;
  metodo: string;
  etichetta: string;
  custodeId?: string;
  postazioneId?: string;
  badgeEnte?: string;
  mfaVerificato?: boolean;
  scadeIl: string;
}

export interface NotificaClient {
  id: number;
  canale: string;
  tipo: string;
  testo: string;
  matchId: string | null;
  oggettoId: number | null;
  creataIl: string;
}

export interface ContattoMagicLinkClient {
  provenienza: string | null;
  tipoRecapito: string | null;
  canale: string;
  recapito: string | null;
  nomeStruttura: string | null;
  cliccatoIl: string | null;
  scadeIl: string;
}

const OPZIONI_RECAPITO_PER_PROVENIENZA: Record<
  ProvenienzaUtente,
  Array<{ id: TipoRecapitoMl; titolo: string; nota: string }>
> = {
  italiano: [
    { id: "sms", titolo: "SMS", nota: "Messaggio diretto sul tuo numero italiano" },
    { id: "email", titolo: "Email", nota: "Link monouso sulla tua casella di posta" },
    { id: "telefono", titolo: "Numero di telefono", nota: "Recapito telefonico su cui essere richiamato" },
    { id: "struttura", titolo: "Struttura in cui alloggia", nota: "Reception hotel / B&B (protetto da PIN)" },
  ],
  straniero_ue: [
    { id: "sms", titolo: "SMS", nota: "Funziona anche in roaming UE senza costi extra" },
    { id: "email", titolo: "Email", nota: "Comodo da Wi-Fi o altro dispositivo" },
    { id: "telefono", titolo: "Numero di telefono", nota: "Recapito internazionale UE per fissare appuntamento" },
    { id: "struttura", titolo: "Struttura in cui alloggia", nota: "Hotel / B&B a Roma (protetto da tuo PIN)" },
  ],
  straniero_extra_ue: [
    { id: "struttura", titolo: "Struttura in cui alloggia", nota: "Consigliato se la SIM extra UE è senza roaming (protetto da PIN)" },
    { id: "email", titolo: "Email", nota: "Accessibile da Wi-Fi di hotel o locali" },
    { id: "sms", titolo: "SMS", nota: "Invia su numero internazionale abilitato al roaming" },
    { id: "telefono", titolo: "Numero di telefono", nota: "Recapito telefonico di riferimento a Roma" },
  ],
};

const PROFILI_CITTADINO = [
  { id: "cittadino_spid", titolo: "Entra con SPID (demo)", nota: "Cittadino autenticato" },
  { id: "cittadino_cie", titolo: "Entra con CIE (demo)", nota: "Cittadino con Carta d'Identità Elettronica" },
];

const PROFILI_OPERATORI = [
  { id: "volontario", titolo: "Volontario CIE (V-07)", nota: "Trastevere · custodia oggetti comuni" },
  { id: "guardia_giurata", titolo: "Guardia Giurata (G-12)", nota: "Ostiense · approvata da istituto e Comune" },
  { id: "punto_h24", titolo: "Punto Amico H24 (H-21)", nota: "Testaccio · riceve consegne e assiste emergenze" },
  { id: "forze_ordine", titolo: "Polizia Locale (P-03)", nota: "Aventino · semaforo documenti e comandi" },
  { id: "ufficio", titolo: "Ufficio Oggetti Rinvenuti", nota: "Sportello MFA · approva custodi, sblocca, Audit" },
];

export function AccessoOggetti({
  mostraProfiliOperatore = false,
  refreshKey = 0,
  onCambioSessione,
  onCambioContattoMagicLink,
}: {
  mostraProfiliOperatore?: boolean;
  refreshKey?: number;
  onCambioSessione?: (s: SessioneClient | null) => void;
  onCambioContattoMagicLink?: (c: ContattoMagicLinkClient | null) => void;
}) {
  const [sessione, setSessione] = useState<SessioneClient | null>(null);
  const [notifiche, setNotifiche] = useState<NotificaClient[]>([]);
  const [contattoMagicLink, setContattoMagicLink] = useState<ContattoMagicLinkClient | null>(null);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [modo, setModo] = useState<"spid" | "turista" | "emergenza">("spid");

  const onCambioSessioneRef = useRef(onCambioSessione);
  const onCambioContattoRef = useRef(onCambioContattoMagicLink);
  useEffect(() => {
    onCambioSessioneRef.current = onCambioSessione;
    onCambioContattoRef.current = onCambioContattoMagicLink;
  });

  // Magic link monouso (1 ora)
  const [provenienza, setProvenienza] = useState<ProvenienzaUtente>("italiano");
  const [tipoRecapito, setTipoRecapito] = useState<TipoRecapitoMl>("sms");
  const [canaleStruttura, setCanaleStruttura] = useState<"email" | "sms" | "telefono">("email");
  const [nomeStruttura, setNomeStruttura] = useState("");
  const [recapito, setRecapito] = useState("");
  const [pin, setPin] = useState("");
  const [magicGenerato, setMagicGenerato] = useState<{
    token: string;
    magicUrl: string;
    richiedePin: boolean;
    scadeIl: string;
  } | null>(null);
  const [pinRichiestoToken, setPinRichiestoToken] = useState<string | null>(null);
  const [tokenVerifica, setTokenVerifica] = useState("");
  const [pinVerifica, setPinVerifica] = useState("");
  const [esitoClickMl, setEsitoClickMl] = useState<string | null>(null);

  // Modalità emergenza operatore
  const [contattoAlt, setContattoAlt] = useState("");
  const [canaleAlt, setCanaleAlt] = useState<CanaleRecapito>("email");

  const ricarica = useCallback(async () => {
    try {
      const r = await fetch("/api/oggetti/sessione", { cache: "no-store" });
      const d = (await r.json()) as {
        sessione: SessioneClient | null;
        notifiche: NotificaClient[];
        contattoMagicLink?: ContattoMagicLinkClient | null;
      };
      setSessione(d.sessione);
      setNotifiche(d.notifiche ?? []);
      const ml = d.contattoMagicLink ?? null;
      setContattoMagicLink(ml);
      onCambioSessioneRef.current?.(d.sessione);
      onCambioContattoRef.current?.(ml);
    } catch {
      setErrore("Impossibile verificare la sessione.");
    } finally {
      setCaricamento(false);
    }
  }, []);

  const attivaMagicLink = useCallback(
    async (token: string, pinInserito: string) => {
      setErrore(null);
      setEsitoClickMl(null);
      const r = await fetch("/api/oggetti/sessione", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ azione: "verifica_magic_link", token, pin: pinInserito }),
      });
      const d = (await r.json()) as {
        errore?: string;
        richiedePin?: boolean;
        contattiInviati?: number;
      };
      if (!r.ok) {
        if (d.richiedePin) {
          setModo("turista");
          setTokenVerifica(token);
          setPinRichiestoToken(token);
        }
        setErrore(d.errore ?? "Verifica Magic Link fallita");
        return false;
      }
      setMagicGenerato(null);
      setPinRichiestoToken(null);
      setTokenVerifica("");
      setPinVerifica("");
      const inviati = d.contattiInviati ?? 0;
      setEsitoClickMl(
        inviati > 0
          ? `Magic Link attivato: il tuo contatto per fissare l'appuntamento è stato inviato a ${inviati} ritrovatore/custode compatibile.`
          : "Magic Link attivato (valido 1 ora): appena un ritrovatore registra o abbina un oggetto compatibile, riceve il tuo contatto per fissare l'appuntamento.",
      );
      await ricarica();
      return true;
    },
    [ricarica],
  );

  useEffect(() => {
    let attivo = true;
    (async () => {
      const url = new URL(window.location.href);
      const mlToken = url.searchParams.get("ml")?.trim() ?? "";

      if (mlToken) {
        url.searchParams.delete("ml");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
        const ok = await attivaMagicLink(mlToken, "");
        if (!ok && attivo) {
          await ricarica();
        }
        if (attivo) setCaricamento(false);
        return;
      }

      await ricarica();
    })();
    return () => {
      attivo = false;
    };
  }, [attivaMagicLink, ricarica]);

  useEffect(() => {
    if (refreshKey <= 0) return;
    let attivo = true;
    (async () => {
      try {
        const r = await fetch("/api/oggetti/sessione", { cache: "no-store" });
        const d = (await r.json()) as {
          sessione: SessioneClient | null;
          notifiche: NotificaClient[];
          contattoMagicLink?: ContattoMagicLinkClient | null;
        };
        if (!attivo) return;
        setSessione(d.sessione);
        setNotifiche(d.notifiche ?? []);
        const ml = d.contattoMagicLink ?? null;
        setContattoMagicLink(ml);
        onCambioSessioneRef.current?.(d.sessione);
        onCambioContattoRef.current?.(ml);
      } catch {
        // Mantiene stato corrente se il refresh fallisce
      }
    })();
    return () => {
      attivo = false;
    };
  }, [refreshKey]);

  const accediDemo = async (profilo: string) => {
    setErrore(null);
    setEsitoClickMl(null);
    setPinRichiestoToken(null);
    const r = await fetch("/api/oggetti/sessione", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ azione: "accedi_demo", profilo }),
    });
    const d = await r.json();
    if (!r.ok) {
      setErrore(d.errore ?? "Errore accesso");
      return;
    }
    await ricarica();
  };

  const esci = async () => {
    await fetch("/api/oggetti/sessione", { method: "DELETE" });
    setMagicGenerato(null);
    setPinRichiestoToken(null);
    setEsitoClickMl(null);
    await ricarica();
  };

  const cambiaTipoRecapito = (nuovo: TipoRecapitoMl) => {
    setErrore(null);
    const prevTelefono = tipoRecapito === "sms" || tipoRecapito === "telefono";
    const nextTelefono = nuovo === "sms" || nuovo === "telefono";
    if (!(prevTelefono && nextTelefono) && nuovo !== tipoRecapito) {
      setRecapito("");
    }
    setTipoRecapito(nuovo);
  };

  const cambiaProvenienza = (nuova: ProvenienzaUtente) => {
    setProvenienza(nuova);
    const suggerito = OPZIONI_RECAPITO_PER_PROVENIENZA[nuova][0].id;
    cambiaTipoRecapito(suggerito);
  };

  const generaMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrore(null);
    setEsitoClickMl(null);
    const canaleEffettivo = tipoRecapito === "struttura" ? canaleStruttura : tipoRecapito;
    const r = await fetch("/api/oggetti/sessione", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        azione: "crea_magic_link",
        provenienza,
        tipo_recapito: tipoRecapito,
        canale: canaleEffettivo,
        recapito,
        nome_struttura: tipoRecapito === "struttura" ? nomeStruttura : undefined,
        pin: tipoRecapito === "struttura" ? pin : undefined,
      }),
    });
    const d = (await r.json()) as {
      errore?: string;
      tokenDemo?: string;
      magicUrl?: string;
      richiedePin?: boolean;
      scadeIl?: string;
    };
    if (!r.ok || !d.tokenDemo) {
      setErrore(d.errore ?? "Errore creazione Magic Link");
      return;
    }
    setMagicGenerato({
      token: d.tokenDemo,
      magicUrl: d.magicUrl ?? `/oggetti?ml=${encodeURIComponent(d.tokenDemo)}`,
      richiedePin: Boolean(d.richiedePin),
      scadeIl: d.scadeIl ?? new Date(Date.now() + 3_600_000).toISOString(),
    });
    setTokenVerifica(d.tokenDemo);
  };

  const usaMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    await attivaMagicLink(tokenVerifica, pinVerifica);
  };

  const apriEmergenza = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrore(null);
    const r = await fetch("/api/oggetti/sessione", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ azione: "emergenza_operatore", canale: canaleAlt, contatto_alternativo: contattoAlt }),
    });
    const d = await r.json();
    if (!r.ok) {
      setErrore(d.errore ?? "Errore assistenza emergenza");
      return;
    }
    setContattoAlt("");
    await ricarica();
  };

  const eOperatore = sessione && ["guardia_giurata", "forze_ordine", "punto_h24", "ufficio"].includes(sessione.ruolo);

  if (caricamento) {
    return <p className="text-sm text-ink-soft">Verifica sessione…</p>;
  }

  return (
    <section aria-label="Accesso demo" className="flex flex-col gap-3 rounded-panel border border-line bg-panel p-4">
      {sessione ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 self-start rounded-full bg-ok-tint px-3 py-1 text-sm font-bold text-ok">
            <Icon name="spunta" size={16} strokeWidth={2.4} />
            {mostraProfiliOperatore
              ? `${sessione.etichetta} (${sessione.metodo === "operatore_ente" ? "MFA + Postazione" : sessione.metodo.toUpperCase()})`
              : `Sei in Oggetti Smarriti (demo) · ${sessione.etichetta}`}
          </p>
          <button type="button" onClick={esci} className="text-sm font-bold text-amaranto hover:underline">
            Esci / cambia utente
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon name="scudo" size={20} className="text-oggetti-ink" />
            <h2 className="text-base font-bold">STEP 1 · Accesso demo</h2>
          </div>
          <Etichetta tono="ok" icona="spunta">
            Modalità demo
          </Etichetta>
        </div>
      )}

      {sessione && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>Ruolo: {sessione.ruolo}</span>
          {sessione.postazioneId && <span>Postazione: {sessione.postazioneId}</span>}
          {sessione.badgeEnte && <span>Badge ente: {sessione.badgeEnte}</span>}
          <span>Scadenza sessione: {new Date(sessione.scadeIl).toLocaleString("it-IT")}</span>
        </div>
      )}

      {sessione && contattoMagicLink && (
        <div className="rounded-card border border-ok/40 bg-ok-tint p-3 text-xs text-ink">
          <p className="font-bold text-ok">Contatto condiviso al clic del Magic Link per fissare appuntamento</p>
          <p className="mt-1">
            {contattoMagicLink.provenienza && contattoMagicLink.provenienza in PROVENIENZE_UTENTE
              ? PROVENIENZE_UTENTE[contattoMagicLink.provenienza as ProvenienzaUtente]
              : "Richiedente"}{" "}
            ·{" "}
            {contattoMagicLink.tipoRecapito && contattoMagicLink.tipoRecapito in TIPI_RECAPITO_ML
              ? TIPI_RECAPITO_ML[contattoMagicLink.tipoRecapito as TipoRecapitoMl]
              : contattoMagicLink.canale}
            {contattoMagicLink.nomeStruttura ? ` (${contattoMagicLink.nomeStruttura})` : ""}
            {contattoMagicLink.recapito ? ` · ${contattoMagicLink.recapito}` : ""}
          </p>
        </div>
      )}

      {esitoClickMl && <Avviso icona="spunta">{esitoClickMl}</Avviso>}

      {sessione && notifiche.length > 0 && (
        <div className="flex flex-col gap-2 rounded-card bg-bg-sink p-3">
          <p className="text-xs font-bold uppercase tracking-[0.05em] text-muted">
            Ultime notifiche cifrate ricevute ({notifiche.length})
          </p>
          <ul className="flex flex-col gap-1.5">
            {notifiche.slice(0, 5).map((n) => (
              <li key={n.id} className="rounded-card border border-line bg-panel px-3 py-2 text-sm">
                <span className="font-bold uppercase text-oggetti-ink">{n.canale}</span> · {n.testo}
              </li>
            ))}
          </ul>
        </div>
      )}

      {errore && <Avviso icona="attenzione">{errore}</Avviso>}

      {pinRichiestoToken && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void attivaMagicLink(pinRichiestoToken, pinVerifica);
          }}
          className="flex flex-col gap-2.5 rounded-card border border-oggetti bg-panel p-3.5"
        >
          <p className="text-xs font-bold text-oggetti-ink">
            Sblocca il Magic Link della struttura ricettiva con il tuo PIN personale
          </p>
          <input
            required
            className={campo}
            value={pinVerifica}
            onChange={(e) => setPinVerifica(e.target.value)}
            placeholder="Inserisci il PIN personale impostato alla creazione"
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={btnPrimario}>
              Sblocca e attiva Magic Link
              <Icon name="freccia" size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                setPinRichiestoToken(null);
                setErrore(null);
              }}
              className={btnSecondario}
            >
              Annulla
            </button>
          </div>
        </form>
      )}

      {(!sessione || mostraProfiliOperatore) && (
        <div className="flex flex-col gap-3">
          {!mostraProfiliOperatore && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink-soft">
                Accedi con SPID/CIE oppure genera un Magic Link monouso (scadenza 1 ora) per inviare il tuo contatto a chi ritrova l&apos;oggetto.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => accediDemo("cittadino_spid")}
                  className={btnPrimario}
                >
                  Entra in demo (SPID)
                  <Icon name="freccia" size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => accediDemo("cittadino_cie")}
                  className={btnSecondario}
                >
                  Entra in demo (CIE)
                </button>
                <button
                  type="button"
                  onClick={() => setModo((m) => (m === "turista" ? "spid" : "turista"))}
                  className={`min-h-10 rounded-full border px-3.5 text-sm font-bold ${modo === "turista" ? "border-ink bg-ink text-white" : "border-line bg-bg-sink text-ink"}`}
                >
                  Magic Link monouso (1 ora)
                </button>
                <button
                  type="button"
                  onClick={() => setModo((m) => (m === "emergenza" ? "spid" : "emergenza"))}
                  className={`min-h-10 rounded-full border px-3.5 text-sm font-bold ${modo === "emergenza" ? "border-ink bg-ink text-white" : "border-line bg-bg-sink text-ink"}`}
                >
                  Ho perso il telefono
                </button>
              </div>
            </div>
          )}

          {mostraProfiliOperatore && (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setModo("spid")}
                  className={`min-h-10 rounded-full border px-3.5 text-sm font-bold ${modo === "spid" ? "border-ink bg-ink text-white" : "border-line bg-bg-sink text-ink"}`}
                >
                  SPID / CIE / Ruoli demo
                </button>
                <button
                  type="button"
                  onClick={() => setModo("turista")}
                  className={`min-h-10 rounded-full border px-3.5 text-sm font-bold ${modo === "turista" ? "border-ink bg-ink text-white" : "border-line bg-bg-sink text-ink"}`}
                >
                  Magic Link monouso (1 ora)
                </button>
                <button
                  type="button"
                  onClick={() => setModo("emergenza")}
                  className={`min-h-10 rounded-full border px-3.5 text-sm font-bold ${modo === "emergenza" ? "border-ink bg-ink text-white" : "border-line bg-bg-sink text-ink"}`}
                >
                  Ho perso proprio il telefono
                </button>
              </div>

              {modo === "spid" && (
                <div className="flex flex-col gap-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {PROFILI_CITTADINO.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => accediDemo(p.id)}
                        className="flex flex-col items-start gap-0.5 rounded-card border border-line bg-bg-sink p-3 text-left hover:border-amaranto"
                      >
                        <span className="text-sm font-bold text-ink">{p.titolo}</span>
                        <span className="text-xs text-ink-soft">{p.nota}</span>
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {PROFILI_OPERATORI.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => accediDemo(p.id)}
                        className="flex flex-col items-start gap-0.5 rounded-card border border-line bg-panel p-3 text-left hover:border-oggetti"
                      >
                        <span className="text-sm font-bold text-oggetti-ink">{p.titolo}</span>
                        <span className="text-xs text-ink-soft">{p.nota}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {modo === "turista" && (
            <div className="flex flex-col gap-3 rounded-card bg-bg-sink p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-ink">Magic Link monouso</p>
                <span className="rounded-full bg-oggetti-tint px-2.5 py-0.5 text-xs font-bold text-oggetti-ink">
                  Scadenza fissa: 1 ora
                </span>
              </div>

              <form onSubmit={generaMagicLink} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-ink">1. Provenienza</span>
                  <div className="grid gap-1.5 sm:grid-cols-3">
                    {(Object.entries(PROVENIENZE_UTENTE) as [ProvenienzaUtente, string][]).map(([id, titolo]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => cambiaProvenienza(id)}
                        className={`min-h-10 rounded-card border px-3 py-2 text-left text-xs font-bold transition ${
                          provenienza === id
                            ? "border-oggetti bg-oggetti-tint text-oggetti-ink"
                            : "border-line bg-panel text-ink hover:border-ink/40"
                        }`}
                      >
                        {titolo}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-ink">
                    2. Tipo di recapito su cui ricevere il Magic Link ({PROVENIENZE_UTENTE[provenienza]})
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {OPZIONI_RECAPITO_PER_PROVENIENZA[provenienza].map((opz) => (
                      <button
                        key={opz.id}
                        type="button"
                        onClick={() => cambiaTipoRecapito(opz.id)}
                        className={`flex flex-col items-start rounded-card border px-3 py-2 text-left transition ${
                          tipoRecapito === opz.id
                            ? "border-oggetti bg-oggetti-tint text-oggetti-ink"
                            : "border-line bg-panel text-ink hover:border-ink/40"
                        }`}
                      >
                        <span className="text-xs font-bold">{opz.titolo}</span>
                        <span className="text-[11px] text-ink-soft">{opz.nota}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {tipoRecapito === "struttura" ? (
                  <div className="flex flex-col gap-2.5 rounded-card border border-line bg-panel p-3">
                    <label className="flex flex-col gap-1 text-xs font-bold">
                      Nome della struttura in cui alloggi
                      <input
                        required
                        className={campo}
                        value={nomeStruttura}
                        onChange={(e) => setNomeStruttura(e.target.value)}
                        placeholder="es. Hotel Artemide Roma o B&B Trastevere"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-bold">
                      Canale della reception / struttura
                      <select
                        className={campo}
                        value={canaleStruttura}
                        onChange={(e) => {
                          const next = e.target.value as "email" | "sms" | "telefono";
                          if ((next === "email") !== (canaleStruttura === "email")) {
                            setRecapito("");
                          }
                          setCanaleStruttura(next);
                        }}
                      >
                        <option value="email">Email struttura</option>
                        <option value="sms">SMS struttura</option>
                        <option value="telefono">Numero di telefono struttura</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-bold">
                      Recapito della struttura
                      <input
                        required
                        type={canaleStruttura === "email" ? "email" : "tel"}
                        className={campo}
                        value={recapito}
                        onChange={(e) => setRecapito(e.target.value)}
                        placeholder={
                          canaleStruttura === "email" ? "es. reception@hotelroma.it" : "es. +39 06 12345678"
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-bold">
                      PIN personale (min. 4 cifre/caratteri)
                      <input
                        required
                        minLength={4}
                        className={campo}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="es. 4829"
                      />
                      <span className="text-[11px] font-normal text-ink-soft">
                        Protegge il link se arriva alla reception dell&apos;hotel: senza il tuo PIN nessuno può aprirlo al posto tuo.
                      </span>
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col gap-1 text-xs font-bold">
                    {tipoRecapito === "sms"
                      ? "Numero di cellulare per SMS"
                      : tipoRecapito === "email"
                        ? "Indirizzo email"
                        : "Numero di telefono di riferimento"}
                    <input
                      required
                      type={tipoRecapito === "email" ? "email" : "tel"}
                      className={campo}
                      value={recapito}
                      onChange={(e) => setRecapito(e.target.value)}
                      placeholder={
                        tipoRecapito === "email"
                          ? "es. nome@esempio.com"
                          : provenienza === "italiano"
                            ? "es. +39 333 1234567"
                            : "es. +44 7700 900123"
                      }
                    />
                  </label>
                )}

                <p className="text-xs text-ink-soft">
                  Validità: <strong>1 ora</strong> dalla creazione. Quando clicchi il Magic Link, chi ha ritrovato l&apos;oggetto riceve questo recapito per fissare l&apos;appuntamento.
                </p>

                <button type="submit" className={btnSecondario}>
                  Genera Magic Link monouso (scade tra 1 ora)
                </button>
              </form>

              {magicGenerato && (
                <div className="flex flex-col gap-2.5 rounded-card border border-ok bg-panel p-3 text-sm">
                  <p className="font-bold text-ok">
                    Magic Link pronto (valido fino alle{" "}
                    {new Date(magicGenerato.scadeIl).toLocaleTimeString("it-IT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    ):
                  </p>
                  {magicGenerato.richiedePin && (
                    <label className="flex flex-col gap-1 text-xs font-bold">
                      Conferma il PIN per aprire il link della struttura
                      <input
                        className={campo}
                        value={pinVerifica}
                        onChange={(e) => setPinVerifica(e.target.value)}
                        placeholder="Inserisci il PIN personale impostato sopra"
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => attivaMagicLink(magicGenerato.token, pinVerifica)}
                    className={btnPrimario}
                  >
                    Clicca qui per attivare il Magic Link e inviare il contatto
                    <Icon name="freccia" size={18} />
                  </button>
                  <a
                    href={magicGenerato.magicUrl}
                    onClick={(e) => {
                      e.preventDefault();
                      void attivaMagicLink(magicGenerato.token, pinVerifica);
                    }}
                    className="break-all text-xs font-semibold text-amaranto underline"
                  >
                    {magicGenerato.magicUrl}
                  </a>
                </div>
              )}

              <details className="rounded-card border border-line bg-panel p-3">
                <summary className="cursor-pointer list-none text-xs font-bold text-ink-soft hover:text-ink">
                  Hai già ricevuto un codice Magic Link? Incollalo manualmente ▾
                </summary>
                <p className="mt-2 text-[11px] text-ink-soft">
                  In questa demo locale non partono SMS o email reali: puoi cliccare il link generato sopra oppure incollare qui il token ricevuto.
                </p>
                <form onSubmit={usaMagicLink} className="mt-2 flex flex-col gap-2">
                  <input
                    className={campo}
                    value={tokenVerifica}
                    onChange={(e) => setTokenVerifica(e.target.value)}
                    placeholder="Incolla il token del Magic Link ricevuto"
                  />
                  <input
                    className={campo}
                    value={pinVerifica}
                    onChange={(e) => setPinVerifica(e.target.value)}
                    placeholder="PIN personale (solo se recapito presso struttura)"
                  />
                  <button type="submit" className={btnPrimario}>
                    Apri sessione con token
                  </button>
                </form>
              </details>
            </div>
          )}

          {modo === "emergenza" && (
            <div className="flex flex-col gap-3 rounded-card bg-bg-sink p-3.5">
              <p className="text-sm text-ink-soft">
                Se hai perso proprio lo smartphone, entra in un Punto Amico H24 (hotel, bar/tabacchi convenzionato), rivolgiti a una Guardia Giurata o alle Forze Locali.
              </p>
              <ul className="flex flex-col gap-1.5">
                {LINK_EMERGENZA_TELEFONO.map((l) => (
                  <li key={l.nome} className="rounded-card border border-line bg-panel p-2.5 text-sm">
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-bold text-amaranto hover:underline">
                      {l.nome}
                    </a>
                    <p className="text-xs text-ink-soft">{l.nota}</p>
                  </li>
                ))}
              </ul>
              {eOperatore ? (
                <form onSubmit={apriEmergenza} className="grid gap-2 sm:grid-cols-3">
                  <select className={campo} value={canaleAlt} onChange={(e) => setCanaleAlt(e.target.value as CanaleRecapito)}>
                    {Object.entries(CANALI_RECAPITO).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    className={campo}
                    value={contattoAlt}
                    onChange={(e) => setContattoAlt(e.target.value)}
                    placeholder="Contatto alternativo verificato"
                  />
                  <button type="submit" className={btnPrimario}>
                    Avvia assistenza dal vivo
                  </button>
                </form>
              ) : (
                <NotaPrivacy>
                  Per aprire la segnalazione assistita dalla postazione di un operatore, accedi prima come Punto H24, Guardia o Polizia Locale nell&apos;Area operatori.
                </NotaPrivacy>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
