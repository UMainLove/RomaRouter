"use client";

import { useState } from "react";
import type { VerificaLuogo } from "@/lib/artisti";

/*
 * Il verdetto di un punto per l'arte di strada (pannello della mappa di /arte): per l'artista se puo'
 * esibirsi, perche', a quali condizioni e cosa fare prima; per il cittadino chi si esibisce li'.
 */
export type Modo = "artista" | "cittadino";
export type Risultato = VerificaLuogo & { luogo: { etichetta: string } | null };

export const ATTIVITA = [
  ["musica", "Musica o canto"],
  ["silenziosa", "Esibizione silenziosa"],
  ["fuoco", "Spettacolo col fuoco"],
  ["figurativa", "Ritratti e caricature"],
  ["esoterica", "Cartomanzia"],
] as const;
export type Attivita = (typeof ATTIVITA)[number][0];

const TIPI: Record<string, string> = {
  postazione_allegatoB: "Postazione ufficiale (Allegato B)",
  area_consentita: "Area consentita del Municipio X",
  area_esoterici: "Area per cartomanti",
  arti_figurative_area: "Area arti figurative",
};
const TONI = {
  ok: "bg-ok-tint text-ok",
  attenzione: "bg-attenzione-tint text-attenzione",
  errore: "bg-errore-tint text-errore",
};
const SEGNI = { ok: "✓", attenzione: "!", errore: "✕" };
const metri = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`);
const quando = (d: string) =>
  new Date(d).toLocaleString("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

export function Verdetto({
  v,
  modo,
  onVai,
  onAnnunciato,
}: {
  v: Risultato;
  modo: Modo;
  onVai: (p: { lat: number; lon: number; etichetta: string }) => void;
  onAnnunciato: () => void;
}) {
  const tono = v.esito.tono;
  const titolo =
    modo === "artista"
      ? v.esito.titolo
      : v.esito.codice === "no"
        ? "Qui le esibizioni sono vietate"
        : v.esito.codice === "probabilmente_no"
          ? "Qui le esibizioni sono probabilmente vietate"
          : "Qui gli artisti possono esibirsi";
  const puoAnnunciare = modo === "artista" && !["no", "probabilmente_no", "solo_area_dedicata", "solo_silenzio"].includes(v.esito.codice);

  return (
    <section aria-labelledby="verdetto-titolo" className="flex flex-col gap-3.5">
      <div role="status" className={`flex items-center gap-3 rounded-[12px] px-3.5 py-3 ${TONI[tono]}`}>
        <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-current text-[15px] font-black">
          <span className="text-white">{SEGNI[tono]}</span>
        </span>
        <span className="min-w-0">
          <span className="block text-[17px] leading-6 font-bold">{titolo}</span>
          <span id="verdetto-titolo" className="block truncate text-[13px] font-semibold opacity-80">
            {v.luogo?.etichetta ?? "Punto scelto sulla mappa"}
            {v.municipio ? ` · Mun. ${v.municipio.numero_romano}` : ""}
            {modo === "artista" ? ` · ${v.attivita.nome.toLowerCase()}` : ""}
          </span>
        </span>
      </div>

      {modo === "cittadino" && (
        <Blocco titolo="Chi si esibisce qui (prossimi 7 giorni, entro 500 m)">
          {v.esibizioni.length ? (
            <ul className="flex flex-col gap-2">
              {v.esibizioni.map((e) => (
                <li key={e.id} className="rounded-card border border-line bg-panel px-3 py-2.5">
                  <p className="font-bold text-ink">{e.nome_arte}</p>
                  <p className="text-sm text-ink-soft">
                    {e.disciplina} · {quando(e.inizio)} · {metri(e.distanza_m)}
                    {e.postazione ? ` · ${e.postazione}` : e.luogo ? ` · ${e.luogo}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[15px] text-ink-soft">
              Nessuna esibizione annunciata qui. Gli artisti si trovano più spesso nelle postazioni ufficiali qui sotto.
            </p>
          )}
          {v.esibizioni.some((e) => e.demo) && (
            <p className="mt-1.5 text-[12px] text-muted">Esibizioni di esempio per provare il servizio: quelle vere le annunciano gli artisti da qui.</p>
          )}
        </Blocco>
      )}

      {v.motivi.length > 0 && (
        <Blocco titolo="Perché">
          <Motivi lista={v.motivi} />
        </Blocco>
      )}
      {modo === "artista" && v.condizioni.length > 0 && (
        <Blocco titolo="Condizioni in questo punto">
          <Motivi lista={v.condizioni.slice(0, 6)} />
        </Blocco>
      )}
      {modo === "artista" && v.orario && (
        <p className="rounded-card bg-bg-sink px-3.5 py-2.5 text-[15px] text-ink-soft">
          Adesso sei <b className="text-ink">{v.orario.dentro ? "dentro" : "fuori"}</b> dalla fascia oraria: {v.orario.testo}
          {v.orario.stagione ? ` (${v.orario.stagione})` : ""}. Al massimo 2 ore per fascia.
        </p>
      )}

      {v.postazioni_vicine.length > 0 && (
        <Blocco titolo={modo === "artista" ? "Postazioni e aree vicine" : "Dove trovare artisti qui vicino"}>
          <ul className="flex flex-col">
            {v.postazioni_vicine.slice(0, 5).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onVai({ lat: p.lat, lon: p.lon, etichetta: p.nome })}
                  className="grid min-h-11 w-full grid-cols-[1fr_auto] items-center gap-3 rounded-[9px] px-2 py-1.5 text-left hover:bg-bg-sink"
                >
                  <span>
                    <span className="block text-[15px] font-semibold text-ink">{p.nome}</span>
                    <span className="block text-[13px] text-muted">
                      {TIPI[p.tipo] ?? p.tipo}
                      {p.posizione_stimata ? " · posizione stimata" : ""}
                    </span>
                  </span>
                  <span className="text-sm font-bold whitespace-nowrap text-ink-soft">{metri(p.distanza_m)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Blocco>
      )}

      {modo === "artista" && v.cosa_fare.length > 0 && (
        <Blocco titolo="Prima di esibirti">
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] text-ink">
            {v.cosa_fare.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          {v.contatti_polizia_locale?.pec_pl && <Preavviso v={v} />}
        </Blocco>
      )}

      {puoAnnunciare && <Annuncia v={v} onFatto={onAnnunciato} />}

      <ul className="flex flex-col gap-1 border-t border-line pt-3 text-[13px] leading-5 text-muted">
        {v.avvertenze.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    </section>
  );
}

function Blocco({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-bold tracking-wide text-muted uppercase">{titolo}</h3>
      {children}
    </div>
  );
}

function Motivi({ lista }: { lista: Risultato["motivi"] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {lista.map((m, i) => (
        <li key={`${m.luogo}-${i}`} className="text-[15px] leading-snug text-ink">
          {m.testo}
          {!m.ufficiale && <span className="ml-1.5 rounded-full bg-attenzione-tint px-2 py-px text-[11px] font-bold text-attenzione uppercase">da verificare</span>}
          {m.approssimata && <span className="ml-1.5 rounded-full bg-bg-sink px-2 py-px text-[11px] font-bold text-ink-soft uppercase">confine stimato</span>}
          <span className="mt-0.5 block text-[13px] text-muted">
            {m.luogo}
            {m.riferimento ? ` · ${m.riferimento}` : ""}
            {m.fonte_url && (
              <>
                {" · "}
                <a href={m.fonte_url} target="_blank" rel="noopener noreferrer" className="underline">
                  fonte
                </a>
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

// Il preavviso dell'art. 10 alla Polizia Locale, gia' scritto: l'artista lo copia o lo apre nella sua posta
function Preavviso({ v }: { v: Risultato }) {
  const pl = v.contatti_polizia_locale!;
  const [copiato, setCopiato] = useState(false);
  const oggetto = `Comunicazione esibizione arte di strada – art. 10 DAC 24/2012`;
  const corpo = [
    `Al ${pl.gruppo_pl ?? "Gruppo di Polizia Locale"},`,
    "",
    `il/la sottoscritto/a [nome e cognome], nato/a a [luogo] il [data], comunica ai sensi dell'art. 10 del Regolamento per l'arte di strada (DAC 24/2012) che si esibirà come artista di strada (${v.attivita.nome.toLowerCase()}):`,
    `- luogo: ${v.luogo?.etichetta ?? `${v.punto.lat.toFixed(5)}, ${v.punto.lon.toFixed(5)}`}${v.municipio ? ` (Municipio ${v.municipio.numero_romano})` : ""}`,
    "- giorno: [gg/mm/aaaa]",
    `- orario: [dalle … alle …] (fasce consentite: ${v.orario?.testo ?? "art. 6"}, massimo 2 ore per fascia)`,
    "",
    "Occuperà al massimo 1 m², lasciando 2 m di marciapiede liberi, nel rispetto delle norme del regolamento.",
    "",
    "Distinti saluti,",
    "[nome e cognome, recapito]",
  ].join("\n");
  return (
    <div className="mt-3 rounded-card border border-line bg-panel p-3">
      <p className="text-[15px] font-bold text-ink">Preavviso alla Polizia Locale, già scritto</p>
      <p className="text-sm text-ink-soft">
        Da mandare almeno 3 giorni prima, dalla tua PEC, a <span className="font-semibold break-all text-ink">{pl.pec_pl}</span>
        {pl.telefono_pl ? ` (tel. ${pl.telefono_pl})` : ""}. Completa i campi tra parentesi quadre.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(`${oggetto}\n\n${corpo}`).then(() => setCopiato(true))}
          className="min-h-11 rounded-full border border-line px-4 text-sm font-bold text-ink hover:bg-bg-sink"
        >
          {copiato ? "Copiato" : "Copia il testo"}
        </button>
        <a
          href={`mailto:${pl.pec_pl}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`}
          className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-bold text-ink hover:bg-bg-sink"
        >
          Apri nella posta
        </a>
      </div>
      {pl.verifica && !/verificata/i.test(pl.verifica) && <p className="mt-2 text-[13px] text-muted">Indirizzo da verificare: {pl.verifica}</p>}
    </div>
  );
}

// L'artista annuncia l'esibizione: i cittadini la vedono sulla mappa e cercando lo stesso indirizzo
function Annuncia({ v, onFatto }: { v: Risultato; onFatto: () => void }) {
  const [aperto, setAperto] = useState(false);
  const [stato, setStato] = useState<{ ok: boolean; testo: string } | null>(null);
  const [invio, setInvio] = useState(false);
  async function invia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const giorno = String(f.get("giorno")), ora = String(f.get("ora"));
    setInvio(true);
    setStato(null);
    try {
      const r = await fetch("/api/artisti/esibizioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: v.punto.lat,
          lon: v.punto.lon,
          luogo: v.luogo?.etichetta ?? null,
          attivita: v.attivita.codice,
          nome_arte: f.get("nome"),
          disciplina: f.get("disciplina"),
          descrizione: f.get("descrizione"),
          link: f.get("link"),
          inizio: new Date(`${giorno}T${ora}`).toISOString(),
          durata_min: Number(f.get("durata")),
          sito_web: f.get("sito_web"),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.errore ?? "Annuncio non riuscito");
      setStato({ ok: true, testo: "Fatto: la tua esibizione è sulla mappa. Ricordati il preavviso alla Polizia Locale." });
      onFatto();
    } catch (err) {
      setStato({ ok: false, testo: (err as Error).message });
    } finally {
      setInvio(false);
    }
  }
  if (!aperto) {
    return (
      <button type="button" onClick={() => setAperto(true)} className="min-h-12 rounded-card border border-ink px-4 text-[15px] font-bold text-ink hover:bg-bg-sink">
        Annuncia la tua esibizione qui
      </button>
    );
  }
  const campo = "min-h-11 w-full rounded-[9px] border border-line bg-panel px-3 text-[16px] text-ink";
  return (
    <form onSubmit={invia} className="flex flex-col gap-2.5 rounded-card border border-line bg-panel p-3.5">
      <p className="text-[15px] font-bold text-ink">Annuncia la tua esibizione</p>
      <p className="text-sm text-ink-soft">
        Nome d&apos;arte e disciplina saranno visibili a tutti. Non serve il tuo nome vero. L&apos;annuncio resta «non verificato» finché non arriva l&apos;accesso con SPID.
      </p>
      {/* campo trappola contro i bot: le persone non lo vedono */}
      <input name="sito_web" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      <label className="text-sm font-semibold text-ink">
        Nome d&apos;arte
        <input name="nome" required minLength={2} maxLength={60} className={campo} />
      </label>
      <label className="text-sm font-semibold text-ink">
        Disciplina
        <input name="disciplina" maxLength={60} placeholder="Es. chitarra e voce, statua vivente" className={campo} />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-sm font-semibold text-ink">
          Giorno
          <input name="giorno" type="date" required className={campo} />
        </label>
        <label className="text-sm font-semibold text-ink">
          Ora
          <input name="ora" type="time" required step={900} className={campo} />
        </label>
        <label className="text-sm font-semibold text-ink">
          Durata
          <select name="durata" defaultValue="120" className={campo}>
            {(
              [
                [30, "30 min"],
                [60, "1 ora"],
                [90, "1 ora e ½"],
                [120, "2 ore"],
              ] as const
            ).map(([m, t]) => (
              <option key={m} value={m}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="text-sm font-semibold text-ink">
        Due righe su di te (facoltativo)
        <textarea name="descrizione" maxLength={280} rows={2} className={`${campo} py-2`} />
      </label>
      <label className="text-sm font-semibold text-ink">
        Link (facoltativo)
        <input name="link" type="url" pattern="https://.*" placeholder="https://" className={campo} />
      </label>
      <button type="submit" disabled={invio} className="min-h-12 rounded-card bg-ink px-4 text-[15px] font-bold text-white disabled:opacity-60">
        {invio ? "Invio…" : "Pubblica l'annuncio"}
      </button>
      {stato && (
        <p role={stato.ok ? "status" : "alert"} className={`text-[15px] ${stato.ok ? "text-[#0C5E31]" : "text-[#8C1D16]"}`}>
          {stato.testo}
        </p>
      )}
    </form>
  );
}
