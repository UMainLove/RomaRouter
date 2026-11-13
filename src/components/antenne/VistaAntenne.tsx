"use client";

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
import { BarraAgente } from "../agente/BarraAgente";
import { Icon, type IconName } from "../Icon";
import { Mappa } from "../mappa/Mappa";
import type { SegnoExtra } from "../mappa/MappaSchematica";
import { puntoAntenna } from "../mappa/punti";
import { Avviso, Etichetta, Fonte } from "../ui/Varie";
import { btnSecondario } from "../ui/stili";
import { useFiltri } from "../vista/Filtri";
import { Elenco, Risultato } from "../vista/Risultato";
import { VistaAmbito } from "../vista/VistaAmbito";

const RAGGIO = 300;
const VICINO = 900;
const ICONE_SITO: Record<TipoSito, IconName> = { scuola: "scuola", nido: "scuola", area_giochi: "altalena", ospedale: "ospedale" };
const virgola = (n: number) => n.toString().replace(".", ",");

type Luogo = Punto & { etichetta: string };

/** Geocodifica di esempio: indirizzi noti e zone. Con i dati veri: lo stradario della mappa dei quartieri. */
function geocodifica(testo: string): Luogo | null {
  const t = normalizza(testo);
  if (!t) return null;
  for (const [chiave, ind] of Object.entries(INDIRIZZI_ESEMPIO)) if (t.includes(chiave) || chiave.includes(t)) return ind;
  for (const [chiave, z] of Object.entries(ZONE)) if (t.includes(chiave)) return { etichetta: z.nome, lat: z.lat, lon: z.lon };
  return null;
}

export function VistaAntenne() {
  const { parametri, imposta } = useFiltri("/antenne");
  const indirizzo = parametri.get("indirizzo") ?? "";
  const lat = Number(parametri.get("lat"));
  const lon = Number(parametri.get("lon"));
  // La posizione del browser vale finché l'URL non cambia (nuovo indirizzo dall'agente o dall'elenco).
  const firma = `${indirizzo}|${parametri.get("lat") ?? ""}|${parametri.get("lon") ?? ""}`;
  const [posizione, setPosizione] = useState<{ luogo: Luogo; firma: string } | null>(null);
  const [errorePosizione, setErrorePosizione] = useState<string | null>(null);
  const [selezionato, setSelezionato] = useState<string | null>(null);

  const punto = useMemo<Luogo | null>(() => {
    if (posizione && posizione.firma === firma) return posizione.luogo;
    if (lat && lon) return { lat, lon, etichetta: "Punto scelto sulla mappa" };
    return indirizzo ? geocodifica(indirizzo) : null;
  }, [posizione, firma, lat, lon, indirizzo]);
  const nonTrovato = Boolean(indirizzo && !punto);

  const risultato = useMemo(() => {
    if (!punto) return null;
    const siti = SITI_SENSIBILI.map((s) => ({ ...s, d: distanzaMetri(punto, s) })).sort((a, b) => a.d - b.d);
    const misure = MISURE_ARPA.map((m) => ({ ...m, d: distanzaMetri(punto, m) })).sort((a, b) => a.d - b.d);
    const antenne = ANTENNE.map((a) => ({ ...a, d: distanzaMetri(punto, a) })).sort((a, b) => a.d - b.d);
    const entro = siti.filter((s) => s.d <= RAGGIO);
    const conta = (tipi: TipoSito[]) => entro.filter((s) => tipi.includes(s.tipo)).length;
    return {
      scuole: conta(["scuola", "nido"]),
      giochi: conta(["area_giochi"]),
      ospedali: conta(["ospedale"]),
      sitiEntro: entro,
      sitiVicini: siti.filter((s) => s.d <= VICINO),
      antenne: antenne.filter((a) => a.d <= VICINO),
      antenneEntro: antenne.filter((a) => a.d <= RAGGIO).length,
      misura: misure[0] ?? null,
      misureVicine: misure.filter((m) => m.d <= VICINO),
    };
  }, [punto]);

  const punti = useMemo(() => (risultato ? risultato.antenne : ANTENNE).map(puntoAntenna), [risultato]);
  const extra = useMemo<SegnoExtra[]>(() => {
    const siti = risultato ? risultato.sitiVicini : SITI_SENSIBILI;
    const misure = risultato ? risultato.misureVicine : MISURE_ARPA;
    return [
      ...siti.map((s) => ({ id: s.id, lat: s.lat, lon: s.lon, etichetta: s.nome, icona: ICONE_SITO[s.tipo] })),
      ...misure.map((m) => ({ id: m.id, lat: m.lat, lon: m.lon, etichetta: `Misura ARPA del ${formattaData(m.data)}`, valore: `${virgola(m.valore)} V/m` })),
    ];
  }, [risultato]);

  const usaPosizione = () => {
    if (!navigator.geolocation) {
      setErrorePosizione("Il browser non permette di usare la posizione.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setErrorePosizione(null);
        setPosizione({ luogo: { lat: p.coords.latitude, lon: p.coords.longitude, etichetta: "La tua posizione" }, firma });
      },
      () => setErrorePosizione("Posizione non disponibile: scrivi un indirizzo nella barra."),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  const elencoAntenne = risultato ? risultato.antenne : ANTENNE.map((a) => ({ ...a, d: null as number | null }));

  return (
    <VistaAmbito
      voceId="antenne"
      barra={<BarraAgente voceId="antenne" />}
      mappa={
        <Mappa
          titolo={punto ? `Mappa: antenne e siti sensibili entro ${RAGGIO} m da ${punto.etichetta}` : "Mappa degli impianti di telefonia"}
          punti={punti}
          selezionato={selezionato}
          onSeleziona={setSelezionato}
          centro={punto}
          raggioMetri={punto ? RAGGIO : undefined}
          extra={extra}
        />
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={usaPosizione} className={`${btnSecondario} min-h-11 rounded-full px-4 text-[15px]`}>
          <Icon name="posizione" size={18} strokeWidth={2} />
          Usa la mia posizione
        </button>
        {(punto || indirizzo) && (
          <button
            type="button"
            onClick={() => {
              setPosizione(null);
              imposta({ indirizzo: null, lat: null, lon: null });
            }}
            className="min-h-11 px-2 text-sm font-bold text-ink-soft underline-offset-2 hover:underline"
          >
            Togli il punto
          </button>
        )}
      </div>
      {errorePosizione && <Avviso icona="attenzione">{errorePosizione}</Avviso>}
      {nonTrovato && (
        <Avviso icona="attenzione">
          Non trovo «{indirizzo}» nei dati di esempio. Prova con Piazza Testaccio, Via Marmorata o Viale Aventino.
        </Avviso>
      )}

      {punto && risultato ? (
        <section aria-labelledby="t-verifica" className="flex flex-col gap-3">
          <h2 id="t-verifica" className="text-lg leading-6 font-bold">
            Entro {RAGGIO} m da {punto.etichetta}
          </h2>
          <dl className="grid grid-cols-3 gap-2">
            {[
              { n: risultato.scuole, e: risultato.scuole === 1 ? "scuola o nido" : "scuole e nidi" },
              { n: risultato.giochi, e: risultato.giochi === 1 ? "area giochi" : "aree giochi" },
              { n: risultato.ospedali, e: risultato.ospedali === 1 ? "ospedale" : "ospedali" },
            ].map((x) => (
              <div key={x.e} className="flex flex-col-reverse rounded-card border border-line bg-panel px-3 py-2.5">
                <dt className="text-[13px] leading-[17px] text-ink-soft">{x.e}</dt>
                <dd className="text-[22px] leading-[26px] font-bold">{x.n}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[15px] text-ink-soft">
            Impianti di telefonia entro {RAGGIO} m: <b className="text-ink">{risultato.antenneEntro}</b>
          </p>
          {risultato.sitiEntro.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm text-ink-soft">
              {risultato.sitiEntro.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <Icon name={ICONE_SITO[s.tipo]} size={16} />
                  {s.nome} · {TIPI_SITO[s.tipo].singolare} · {formattaDistanza(s.d)}
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
                <b className="text-xl">{virgola(risultato.misura.valore)} V/m</b>
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
            Verifica informativa: non sostituisce l&apos;istruttoria del Comune. Il regolamento del 2015 è stato in parte annullato nel 2021 ed è
            in revisione.
          </Avviso>
          <button type="button" onClick={() => window.print()} className={`${btnSecondario} self-start`}>
            <Icon name="scarica" size={18} />
            Stampa il report
          </button>
        </section>
      ) : (
        !nonTrovato && (
          <p className="text-[15px] leading-[22px] text-ink-soft">
            Scrivi un indirizzo nella barra: mostro antenne, misure ARPA e siti sensibili (scuole, nidi, aree giochi, ospedali) entro {RAGGIO} m.
          </p>
        )
      )}

      <h2 className="pt-1 text-base font-bold">{risultato ? `Impianti entro ${formattaDistanza(VICINO)}` : "Impianti di telefonia"}</h2>
      <Elenco etichetta="Impianti di telefonia">
        {elencoAntenne.map((a) => (
          <Risultato
            key={a.id}
            id={a.id}
            ambito="antenne"
            titolo={`Impianto ${a.codice}`}
            sottotitolo={
              <>
                {a.gestore} · {a.tecnologie.join(", ")}
                {a.d !== null && ` · ${formattaDistanza(a.d)}`}
              </>
            }
            scelto={selezionato === a.id}
            onScegli={(id) => setSelezionato((s) => (s === id ? null : id))}
            etichette={a.stato === "attiva" ? <Etichetta>Attivo</Etichetta> : <Etichetta tono="attenzione">Autorizzato, non ancora attivo</Etichetta>}
            azione={{ href: `/antenne?lat=${a.lat}&lon=${a.lon}`, etichetta: "Verifica attorno a questo impianto" }}
          />
        ))}
      </Elenco>
      <Fonte>impianti di telefonia e misure ARPA Lazio, siti sensibili dai servizi della mappa (dati di esempio)</Fonte>
    </VistaAmbito>
  );
}
