"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ANTENNE,
  INDIRIZZI_ESEMPIO,
  MISURE_ARPA,
  SITI_SENSIBILI,
  TIPI_SITO,
  VALORE_ATTENZIONE_V_M,
  ZONE,
  type TipoSito,
} from "@/data/esempi";
import { distanzaMetri, formattaDistanza, normalizza, type Punto } from "@/lib/geo";
import { formattaData } from "@/lib/formato";
import { Icon, type IconName } from "../Icon";
import { MappaSchematica } from "../mappa/MappaSchematica";
import type { PuntoMappa } from "../mappa/punti";
import { Avviso, Fonte } from "../ui/Varie";
import { btnPrimario, btnSecondario } from "../ui/stili";

const RAGGIO = 300;
const ICONE_SITO: Record<TipoSito, IconName> = { scuola: "scuola", nido: "scuola", area_giochi: "altalena", ospedale: "ospedale" };

function geocodifica(testo: string): (Punto & { etichetta: string }) | null {
  const t = normalizza(testo);
  if (!t) return null;
  for (const [chiave, ind] of Object.entries(INDIRIZZI_ESEMPIO)) if (t.includes(chiave) || chiave.includes(t)) return ind;
  for (const [chiave, z] of Object.entries(ZONE)) if (t.includes(chiave)) return { etichetta: z.nome, lat: z.lat, lon: z.lon };
  return null;
}

export function VerificaAntenne() {
  const parametri = useSearchParams();
  const router = useRouter();
  const iniziale = parametri.get("indirizzo") ?? "";
  const lat = Number(parametri.get("lat"));
  const lon = Number(parametri.get("lon"));
  const [testo, setTesto] = useState(iniziale);
  const [scheda, setScheda] = useState<"verifica" | "impianti">("verifica");
  const [errore, setErrore] = useState<string | null>(null);
  const [posizione, setPosizione] = useState<(Punto & { etichetta: string }) | null>(null);

  const punto = useMemo(() => {
    if (posizione) return posizione;
    if (lat && lon) return { lat, lon, etichetta: "Punto scelto sulla mappa" };
    return iniziale ? geocodifica(iniziale) : null;
  }, [posizione, lat, lon, iniziale]);

  const verifica = () => {
    const trovato = geocodifica(testo);
    if (!trovato) {
      setErrore("Non trovo questo indirizzo nei dati di esempio. Prova con Piazza Testaccio o Via Marmorata.");
      return;
    }
    setErrore(null);
    setPosizione(null);
    router.replace(`/antenne?indirizzo=${encodeURIComponent(trovato.etichetta)}`, { scroll: false });
  };

  const usaPosizione = () => {
    if (!navigator.geolocation) {
      setErrore("Il browser non permette di usare la posizione.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setErrore(null);
        setPosizione({ lat: p.coords.latitude, lon: p.coords.longitude, etichetta: "La tua posizione" });
      },
      () => setErrore("Posizione non disponibile: scrivi un indirizzo."),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  const risultato = useMemo(() => {
    if (!punto) return null;
    const siti = SITI_SENSIBILI.map((s) => ({ ...s, d: distanzaMetri(punto, s) })).filter((s) => s.d <= RAGGIO);
    const antenne = ANTENNE.map((a) => ({ ...a, d: distanzaMetri(punto, a) }));
    const misure = MISURE_ARPA.map((m) => ({ ...m, d: distanzaMetri(punto, m) })).sort((a, b) => a.d - b.d);
    const conta = (tipi: TipoSito[]) => siti.filter((s) => tipi.includes(s.tipo)).length;
    return {
      scuole: conta(["scuola", "nido"]),
      giochi: conta(["area_giochi"]),
      ospedali: conta(["ospedale"]),
      siti,
      antenneVicine: antenne.filter((a) => a.d <= RAGGIO),
      antenneMappa: antenne.filter((a) => a.d <= 900),
      misura: misure[0] ?? null,
      misureMappa: misure.filter((m) => m.d <= 900),
    };
  }, [punto]);

  const puntiMappa: PuntoMappa[] =
    risultato?.antenneMappa.map((a) => ({
      id: a.id,
      ambito: "antenne",
      nome: `Impianto ${a.codice}`,
      dettaglio: `${a.gestore} · ${a.tecnologie.join(", ")}`,
      href: "/antenne",
      lat: a.lat,
      lon: a.lon,
    })) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Sezioni antenne" className="grid max-w-md grid-cols-2 rounded-card bg-bg-sink p-[3px]">
        {(["verifica", "impianti"] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={scheda === s}
            onClick={() => setScheda(s)}
            className={`min-h-11 rounded-[9px] text-[15px] ${scheda === s ? "bg-panel font-bold text-ink shadow-[0_1px_3px_rgba(37,29,28,.14)]" : "font-semibold text-ink-soft"}`}
          >
            {s === "verifica" ? "Verifica entro 300 m" : "Impianti e misure"}
          </button>
        ))}
      </div>

      {scheda === "impianti" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-panel border border-line bg-panel p-4">
            <h2 className="mb-2 text-lg font-bold">Impianti di telefonia</h2>
            <ul className="flex flex-col">
              {ANTENNE.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 border-b border-line-soft py-2.5 text-[15px] last:border-0">
                  <span>
                    <b>{a.codice}</b> · {a.gestore} · {a.tecnologie.join(", ")}
                  </span>
                  <span className="text-sm text-muted">{a.stato === "attiva" ? "attivo" : "autorizzato"}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-panel border border-line bg-panel p-4">
            <h2 className="mb-2 text-lg font-bold">Misure ARPA Lazio</h2>
            <ul className="flex flex-col">
              {MISURE_ARPA.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 border-b border-line-soft py-2.5 text-[15px] last:border-0">
                  <span>{formattaData(m.data)}</span>
                  <b className="text-antenne-ink">{m.valore.toString().replace(".", ",")} V/m</b>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[13px] text-muted">Valore di attenzione: {VALORE_ATTENZIONE_V_M} V/m (L. 214/2023).</p>
          </section>
          <Fonte>impianti di telefonia e misure ARPA Lazio (dati di esempio)</Fonte>
        </div>
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifica();
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <label htmlFor="an-ind" className="flex min-w-0 flex-[1_1_280px] flex-col gap-1.5 text-sm font-bold">
              Indirizzo da verificare
              <span className="relative">
                <Icon name="segnaposto" size={20} className="pointer-events-none absolute top-3.5 left-3 text-muted" />
                <input
                  id="an-ind"
                  value={testo}
                  onChange={(e) => setTesto(e.target.value)}
                  placeholder="Es. Piazza Testaccio"
                  className="h-12 w-full rounded-card border-[1.5px] border-campo bg-panel pr-3 pl-10 text-base font-normal"
                />
              </span>
            </label>
            <button type="button" onClick={usaPosizione} aria-label="Usa la mia posizione" className="flex size-12 items-center justify-center rounded-card border-[1.5px] border-campo bg-panel hover:bg-bg-sink">
              <Icon name="posizione" size={20} strokeWidth={2} />
            </button>
            <button type="submit" className={btnPrimario}>
              Verifica
            </button>
          </form>
          {errore && <Avviso icona="attenzione">{errore}</Avviso>}

          {punto && risultato ? (
            <div className="flex flex-wrap items-start gap-5">
              <div className="min-w-0 flex-[999_1_420px]">
                <MappaSchematica
                  punti={puntiMappa}
                  selezionato={null}
                  onSeleziona={() => {}}
                  centro={punto}
                  raggioMetri={RAGGIO}
                  extra={[
                    ...SITI_SENSIBILI.filter((s) => distanzaMetri(punto, s) <= 900).map((s) => ({
                      id: s.id,
                      lat: s.lat,
                      lon: s.lon,
                      etichetta: s.nome,
                      icona: ICONE_SITO[s.tipo],
                    })),
                    ...risultato.misureMappa.map((m) => ({
                      id: m.id,
                      lat: m.lat,
                      lon: m.lon,
                      etichetta: `Misura ARPA del ${formattaData(m.data)}`,
                      valore: `${m.valore.toString().replace(".", ",")} V/m`,
                    })),
                  ]}
                />
              </div>
              <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3">
                <h2 className="text-lg font-bold">
                  Entro {RAGGIO} m da {punto.etichetta}
                </h2>
                <dl className="grid grid-cols-3 gap-2">
                  {[
                    { n: risultato.scuole, e: "scuole e nidi" },
                    { n: risultato.giochi, e: risultato.giochi === 1 ? "area giochi" : "aree giochi" },
                    { n: risultato.ospedali, e: risultato.ospedali === 1 ? "ospedale" : "ospedali" },
                  ].map((x) => (
                    <div key={x.e} className="rounded-card border border-line bg-panel px-3 py-2.5">
                      <dt className="sr-only">{x.e}</dt>
                      <dd>
                        <b className="block text-[22px] leading-[26px]">{x.n}</b>
                        <span className="block text-[13px] leading-[17px] text-ink-soft">{x.e}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="text-[15px] text-ink-soft">
                  Impianti esistenti entro {RAGGIO} m: <b className="text-ink">{risultato.antenneVicine.length}</b>
                </p>
                {risultato.siti.length > 0 && (
                  <ul className="flex flex-col gap-1 text-sm text-ink-soft">
                    {risultato.siti.map((s) => (
                      <li key={s.id} className="flex items-center gap-2">
                        <Icon name={ICONE_SITO[s.tipo]} size={16} />
                        {s.nome} · {formattaDistanza(s.d)} · {TIPI_SITO[s.tipo].singolare}
                      </li>
                    ))}
                  </ul>
                )}
                {risultato.misura && (
                  <section aria-labelledby="t-arpa" className="flex flex-col gap-2 rounded-card border border-line bg-panel p-3.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 id="t-arpa" className="text-sm font-bold">
                        Misura ARPA più vicina
                      </h3>
                      <b className="text-xl">{risultato.misura.valore.toString().replace(".", ",")} V/m</b>
                    </div>
                    <div aria-hidden="true" className="relative h-2.5 rounded-full bg-antenne-tint">
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-antenne"
                        style={{ width: `${Math.min(100, (risultato.misura.valore / VALORE_ATTENZIONE_V_M) * 100)}%` }}
                      />
                      <span className="absolute -top-1 right-0 h-[18px] w-0.5 bg-ink" />
                    </div>
                    <p className="text-[13px] leading-[18px] text-ink-soft">
                      Valore di attenzione {VALORE_ATTENZIONE_V_M} V/m (L. 214/2023) · misura del {formattaData(risultato.misura.data)}, a{" "}
                      {formattaDistanza(risultato.misura.d)}
                    </p>
                  </section>
                )}
                <Avviso>
                  Verifica informativa: non sostituisce l&apos;istruttoria del Comune. Il regolamento del 2015 è stato in parte annullato nel
                  2021 ed è in revisione.
                </Avviso>
                <button type="button" onClick={() => window.print()} className={btnSecondario}>
                  <Icon name="scarica" size={18} />
                  Stampa il report
                </button>
                <Fonte>siti sensibili dai servizi della mappa, impianti e misure ARPA Lazio (dati di esempio)</Fonte>
              </div>
            </div>
          ) : (
            <p className="rounded-panel border border-line bg-panel p-5 text-ink-soft">
              Scrivi un indirizzo: mostro antenne, misure ARPA e siti sensibili (scuole, nidi, aree giochi, ospedali) entro {RAGGIO} m.
            </p>
          )}
        </>
      )}
    </div>
  );
}
