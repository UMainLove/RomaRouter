"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AMBITI, eAmbito, voce, type AmbitoId, type VoceId } from "@/lib/ambiti";
import { hrefDestinazione, type AmbitoRisposta, type Opzione, type RichiestaAgente, type RispostaAgente } from "@/lib/agente/tipi";
import { Icon } from "../Icon";
import { LogoMark } from "../Logo";
import { Avviso, TesseraAmbito } from "../ui/Varie";
import { btnPrimario, btnSecondario } from "../ui/stili";
import { PulsanteVoce } from "./PulsanteVoce";
import { SchedaInstradamento } from "./SchedaInstradamento";
import { useDettatura } from "./useDettatura";

/** Parametro con cui un'altra pagina passa una richiesta da far partire subito (es. /oggetti?richiesta=…). */
export const PARAM_RICHIESTA = "richiesta";

async function chiamaAgente(richiesta: RichiestaAgente): Promise<RispostaAgente> {
  const res = await fetch("/api/agente", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(richiesta),
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

function hrefAmbito(id: AmbitoId, r: RispostaAgente, testo: string) {
  if (r.destinazione && !r.domanda) return hrefDestinazione(r.destinazione);
  return `${AMBITI[id].href}?${PARAM_RICHIESTA}=${encodeURIComponent(testo)}`;
}

/**
 * La barra di ricerca di ogni vista: si scrive o si parla come allo sportello.
 * Nella vista di un ambito l'agente applica i filtri all'URL (elenco e mappa si aggiornano);
 * se la richiesta è per un altro ambito propone di andarci. In "Non è tra questi?" mostra
 * la scheda "Ti porto a…" oppure la pagina ufficiale del Comune.
 */
export function BarraAgente({ voceId, fuoco = false }: { voceId: VoceId; fuoco?: boolean }) {
  const v = voce(voceId);
  const router = useRouter();
  const percorso = usePathname();
  const parametri = useSearchParams();
  const iniziale = parametri.get(PARAM_RICHIESTA)?.trim().slice(0, 500) ?? "";

  const [testo, setTesto] = useState(iniziale);
  const [inAttesa, setInAttesa] = useState(Boolean(iniziale));
  // L'ultima risposta, con il testo della richiesta che l'ha prodotta (serve al link verso un altro ambito).
  const [esito, setEsito] = useState<{ risposta: RispostaAgente; testo: string } | null>(null);
  const risposta = esito?.risposta ?? null;
  const [errore, setErrore] = useState(false);
  const richiesta = useRef<RichiestaAgente>({ messaggi: [], risposte: {} });
  const campo = useRef<HTMLInputElement>(null);
  const avviata = useRef(false);

  const chiama = useCallback(
    async (r: RichiestaAgente) => {
      richiesta.current = r;
      try {
        const risp = await chiamaAgente({ ...r, ambitoCorrente: voceId === "altro" ? undefined : voceId });
        setEsito({ risposta: risp, testo: r.messaggi.join(" ") });
        setErrore(false);
        // Nella vista dell'ambito giusto i filtri vanno subito su elenco e mappa.
        if (voceId !== "altro" && risp.ambito === voceId && risp.destinazione && !risp.domanda) {
          router.replace(hrefDestinazione({ ...risp.destinazione, base: percorso }), { scroll: false });
        }
      } catch {
        setErrore(true);
      } finally {
        setInAttesa(false);
      }
    },
    [voceId, router, percorso],
  );

  const invia = (r: RichiestaAgente) => {
    setInAttesa(true);
    void chiama(r);
  };

  const inviaTesto = (t: string) => {
    const pulito = t.trim().slice(0, 500);
    if (!pulito) return;
    setTesto(pulito);
    // Se l'agente aveva fatto una domanda, il testo è la risposta; altrimenti è una nuova ricerca.
    const prima = richiesta.current;
    invia(risposta?.domanda ? { ...prima, messaggi: [...prima.messaggi, pulito] } : { messaggi: [pulito], risposte: {} });
  };

  const rispondi = (chiave: string, o: Opzione) => {
    if (chiave === "ambito" && eAmbito(o.valore) && voceId !== "altro" && o.valore !== voceId) {
      router.push(`${AMBITI[o.valore].href}?${PARAM_RICHIESTA}=${encodeURIComponent(richiesta.current.messaggi.join(" "))}`);
      return;
    }
    const r = richiesta.current;
    invia({
      ...r,
      risposte: { ...r.risposte, [chiave]: o.valore },
      ambitoForzato: chiave === "ambito" ? (o.valore as AmbitoRisposta) : r.ambitoForzato,
    });
  };

  const cambiaAmbito = (id: AmbitoId) => invia({ ...richiesta.current, ambitoForzato: id });

  const nuova = () => {
    richiesta.current = { messaggi: [], risposte: {} };
    setEsito(null);
    setErrore(false);
    setTesto("");
    campo.current?.focus();
  };

  const { stato, avvia } = useDettatura((t) => inviaTesto(t));

  // Richiesta arrivata da un'altra pagina (?richiesta=…): parte una volta sola.
  useEffect(() => {
    if (!iniziale || avviata.current) return;
    avviata.current = true;
    void chiama({ messaggi: [iniziale], risposte: {} });
  }, [iniziale, chiama]);

  useEffect(() => {
    if (fuoco && !iniziale) campo.current?.focus();
  }, [fuoco, iniziale]);

  return (
    <div className="flex flex-col gap-3">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          inviaTesto(testo);
        }}
        className="flex items-center gap-1.5 rounded-full border-[1.5px] border-campo bg-panel py-1 pr-1 pl-4 shadow-[0_6px_20px_rgba(37,29,28,.08)] focus-within:border-ink"
      >
        <Icon name="cerca" size={20} className="shrink-0 text-muted" />
        <label htmlFor={`barra-${voceId}`} className="sr-only">
          {voceId === "altro" ? "Cosa ti serve?" : `Cerca in ${v.nome}`}
        </label>
        <input
          ref={campo}
          id={`barra-${voceId}`}
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          maxLength={500}
          autoComplete="off"
          placeholder={v.segnaposto}
          className="h-11 min-w-0 flex-1 bg-transparent text-base text-ink outline-none"
        />
        {testo && (
          <button type="button" onClick={nuova} aria-label="Cancella la ricerca" className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-bg-sink hover:text-ink">
            <Icon name="chiudi" size={18} strokeWidth={2.2} />
          </button>
        )}
        <PulsanteVoce stato={stato} onClick={avvia} size={44} />
        <button type="submit" aria-label="Chiedi" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-amaranto text-white hover:bg-amaranto-scuro">
          <Icon name="freccia" size={20} strokeWidth={2} />
        </button>
      </form>

      <div aria-live="polite" className="flex flex-col gap-3 empty:hidden">
        {inAttesa ? (
          <Bolla>
            <span className="inline-flex items-center gap-2 font-bold text-ink-soft">
              <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-[2.5px] border-oro border-r-transparent" />
              Capisco la richiesta…
            </span>
          </Bolla>
        ) : errore ? (
          <Avviso icona="attenzione">Non riesco a rispondere ora. Riprova tra poco.</Avviso>
        ) : risposta ? (
          <RispostaBarra
            voceId={voceId}
            risposta={risposta}
            testo={esito?.testo ?? ""}
            onRispondi={rispondi}
            onCambia={cambiaAmbito}
            onAggiungi={() => campo.current?.focus()}
            onChiudi={() => setEsito(null)}
          />
        ) : null}
      </div>

      {!risposta && !inAttesa && !errore && (
        <ul aria-label="Esempi" className="flex flex-wrap gap-1.5">
          {v.esempi.map((e) => (
            <li key={e}>
              <button
                type="button"
                onClick={() => inviaTesto(e)}
                className="inline-flex min-h-9 items-center rounded-full bg-bg-sink px-3 text-left text-sm font-semibold text-ink-soft hover:bg-line-soft hover:text-ink"
              >
                {e}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Bolla({ children, onChiudi }: { children: ReactNode; onChiudi?: () => void }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-panel">
        <LogoMark size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 pt-1 text-[15px] leading-[22px]">{children}</div>
      {onChiudi && (
        <button type="button" onClick={onChiudi} aria-label="Chiudi la risposta" className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-bg-sink hover:text-ink">
          <Icon name="chiudi" size={16} strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}

function RispostaBarra({
  voceId,
  risposta: r,
  testo,
  onRispondi,
  onCambia,
  onAggiungi,
  onChiudi,
}: {
  voceId: VoceId;
  risposta: RispostaAgente;
  testo: string;
  onRispondi: (chiave: string, o: Opzione) => void;
  onCambia: (id: AmbitoId) => void;
  onAggiungi: () => void;
  onChiudi: () => void;
}) {
  // Domanda di chiarimento, con risposte rapide.
  if (r.domanda) {
    return (
      <Bolla onChiudi={onChiudi}>
        <p>
          {r.messaggio} <b>{r.domanda.testo}</b>
        </p>
        <div role="group" aria-label={r.domanda.testo} className="flex flex-wrap gap-1.5">
          {r.domanda.opzioni.map((o) => (
            <button
              key={o.valore}
              type="button"
              onClick={() => onRispondi(r.domanda!.chiave, o)}
              className="inline-flex min-h-11 items-center rounded-full border border-line bg-panel px-3.5 text-[15px] font-semibold hover:border-campo"
            >
              {o.etichetta}
            </button>
          ))}
        </div>
      </Bolla>
    );
  }

  // Richiesta per questo ambito: i filtri sono già applicati, qui basta dire cosa si è capito.
  if (voceId !== "altro" && r.ambito === voceId) {
    return (
      <Bolla onChiudi={onChiudi}>
        <p>
          {r.entita.length ? (
            <>
              <b>Ho capito:</b> {r.entita.map((e) => e.etichetta.replace(" · ", ", ")).join(" · ")}. Ho messo i filtri qui sotto.
            </>
          ) : (
            "Ecco cosa ho trovato."
          )}
        </p>
        {r.avviso && <Avviso>{r.avviso}</Avviso>}
      </Bolla>
    );
  }

  // Richiesta per un altro ambito.
  if (eAmbito(r.ambito)) {
    const a = AMBITI[r.ambito];
    if (voceId === "altro") {
      return (
        <div className="flex flex-col gap-3">
          <SchedaInstradamento risposta={{ ...r, ambito: r.ambito }} onCambia={onCambia} onAggiungi={onAggiungi} />
          {r.avviso && <Avviso>{r.avviso}</Avviso>}
        </div>
      );
    }
    return (
      <Bolla onChiudi={onChiudi}>
        <p>
          Questa richiesta sembra per <b>{a.nome}</b>.{r.perche && <span className="text-ink-soft"> {r.perche}</span>}
        </p>
        <Link href={hrefAmbito(a.id, r, testo)} className={`${btnPrimario} self-start`}>
          <TesseraAmbito id={a.id} size={24} />
          Vai a {a.nome}
        </Link>
      </Bolla>
    );
  }

  // Fuori dai quattro ambiti: pagina ufficiale.
  return (
    <Bolla onChiudi={onChiudi}>
      <p>{r.messaggio}</p>
      {r.esterno && (
        <a href={r.esterno.href} target="_blank" rel="noopener noreferrer" className={`${btnSecondario} self-start`}>
          {r.esterno.etichetta}
          <Icon name="esterno" size={18} />
        </a>
      )}
    </Bolla>
  );
}
