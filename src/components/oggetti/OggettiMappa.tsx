"use client";

import type { ExpressionSpecification, Map as MapLibre } from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MACRO_AREE } from "@/lib/oggetti/costanti";
import { Cerca, type Luogo } from "../mappa-rr/Cerca";
import { dati, inclina, inquadra, MappaVettoriale, riposa, type ML, viva, vola } from "../mappa-rr/MappaVettoriale";
import { alone, comparsa } from "../mappa-rr/cinema";
import { Azione, Azioni, Fatti, Scheda, Schermo, Strumenti, Tondo } from "../mappa-rr/Schermo";
import { assicuraSpille } from "../mappa-rr/spille";
import { primoTesto } from "../mappa-rr/stile";
import { AMARANTO, SchedaAccesso, SchedaPerso, SchedaSegnalazione, SchedaTrovato, VERDE, type EsitoTrovato, type Sessione, type Zona } from "./Flussi";
import { PUNTI, TIPI_PUNTO, type TipoPunto } from "./linguaggio";

/*
 * Oggetti smarriti. La domanda: «ho perso o trovato qualcosa: cosa faccio e dove vado?».
 *  1. due pulsanti grandi, «Ho trovato» e «Ho perso», ognuno in tre passi;
 *  2. la mappa dei 250 punti dove consegnare o ritirare: la spilla dice il tipo (polizia, ospedale,
 *     soccorso, punti H24, ufficio comunale), il bollino «24h» se e' sempre aperto;
 *  3. chi trova riceve un codice e il punto piu' vicino dove portarlo; chi perde segue la sua segnalazione
 *     passo per passo fino al ritiro. Chi perde e chi trova non si vedono mai.
 */

type Punto = {
  id: string; categoria: TipoPunto | "guardia_giurata" | "volontario"; nome: string; ente: string; indirizzo: string; posizioneEsatta: boolean;
  municipio: string; zonaNome: string; lat: number; lon: number; h24: boolean; orari: string; telefono: string | null; note: string | null;
};
type Sel =
  | { tipo: "punto"; p: Punto }
  | { tipo: "vicino"; lon: number; lat: number; etichetta: string | null }
  | { tipo: "accesso"; motivo: "perso" | "trovato" }
  | { tipo: "trovato" }
  | { tipo: "esito"; e: EsitoTrovato }
  | { tipo: "perso" }
  | { tipo: "segnalazione" }
  | null;

const fmt = (n: number) => n.toLocaleString("it-IT", { useGrouping: "always" } as Intl.NumberFormatOptions);
const metri = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`);
const aPiedi = (lat: number, lon: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;
function distanza(a: [number, number], b: [number, number]) {
  const k = Math.PI / 180, x = (b[0] - a[0]) * k * Math.cos(((a[1] + b[1]) / 2) * k), y = (b[1] - a[1]) * k;
  return Math.sqrt(x * x + y * y) * 6371000;
}
/** La zona (tra quelle del servizio) piu' vicina a un punto: si propone gia' scelta nei moduli. */
function zonaVicina(lon: number, lat: number): Zona {
  let migliore: Zona = "centro", d = Infinity;
  for (const [k, z] of Object.entries(MACRO_AREE) as [Zona, (typeof MACRO_AREE)[Zona]][]) {
    if (k === "altro") continue;
    const dd = distanza([lon, lat], [z.lon, z.lat]);
    if (dd < d) [migliore, d] = [k, dd];
  }
  return migliore;
}
const ROMANI_MUN = (m: string) => (m && m !== "Roma" ? `Municipio ${m}` : "Roma");

function caricaPunti(): Promise<Punto[]> {
  return fetch("/api/oggetti/punti")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d: { punti: Punto[] }) => (d.punti?.length ? d.punti : Promise.reject(new Error("vuoto"))))
    .catch(() => fetch("/dati/oggetti/punti.json").then((r) => r.json()).then((d: { punti: Punto[] }) => d.punti));
}

export function OggettiMappa({ guida }: { guida: { id: string; nome: string; contenuto: ReactNode }[] }) {
  const [punti, setPunti] = useState<Punto[]>([]);
  const [tipi, setTipi] = useState<Record<TipoPunto, boolean>>({ forze_ordine: true, ufficio: true, ospedale_h24: true, misericordia: true, affiliato_h24: true });
  const [soloH24, setSoloH24] = useState(false);
  const [sel, setSel] = useState<Sel>(null);
  const [sessione, setSessione] = useState<Sessione>(null);
  const [segnalazione, setSegnalazione] = useState(false);
  const [riferimento, setRiferimento] = useState<{ lon: number; lat: number } | null>(null);
  const [categoriaIniziale, setCategoriaIniziale] = useState<string | null>(null);
  const [zonaIniziale, setZonaIniziale] = useState<Zona>("centro");
  const [errore, setErrore] = useState<string | null>(null);
  const [guidaAperta, setGuidaAperta] = useState(false);
  // conta le mappe nate: con Next 16 una pagina nascosta e poi riaperta ricrea la mappa
  const [pronto, setPronto] = useState(0);
  const m = useRef<{ map: MapLibre; ml: ML } | null>(null);
  const tutti = useRef<Punto[]>([]);
  useEffect(() => {
    tutti.current = punti;
  });

  // solo i punti con posizione vera e di tipo pubblico (niente privati affiliati sulla mappa)
  const pubblici = useMemo(() => punti.filter((p) => p.posizioneEsatta && p.categoria in PUNTI) as (Punto & { categoria: TipoPunto })[], [punti]);
  const visibili = useMemo(() => pubblici.filter((p) => tipi[p.categoria] && (!soloH24 || p.h24)), [pubblici, tipi, soloH24]);
  const conti = useMemo(() => {
    const c: Record<TipoPunto, number> = { forze_ordine: 0, ufficio: 0, ospedale_h24: 0, misericordia: 0, affiliato_h24: 0 };
    pubblici.forEach((p) => c[p.categoria]++);
    return c;
  }, [pubblici]);

  // sessione e segnalazione attiva
  useEffect(() => {
    let vivo = true;
    (async () => {
      let entrato = false, attiva = false;
      try {
        const s = (await fetch("/api/oggetti/sessione").then((r) => r.json())) as { sessione: Sessione };
        if (!vivo) return;
        setSessione(s.sessione);
        entrato = !!s.sessione && ["cittadino", "turista"].includes(s.sessione.ruolo);
        if (entrato) {
          const p = (await fetch("/api/oggetti/perso").then((r) => r.json())) as { segnalazione: { stato: string } | null };
          attiva = !!p.segnalazione && p.segnalazione.stato !== "chiusa";
          if (vivo) setSegnalazione(attiva);
        }
      } catch {
        /* senza database: si vedono solo i punti */
      }
      // dall'assistente della home: /oggetti?categoria=borse apre «Ho perso» gia' compilato
      const cat = new URLSearchParams(window.location.search).get("categoria");
      if (vivo && cat) {
        setCategoriaIniziale(cat);
        setSel(attiva ? { tipo: "segnalazione" } : entrato ? { tipo: "perso" } : { tipo: "accesso", motivo: "perso" });
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  // ------------------------------------------------------------------ vicino a un indirizzo
  const togliAnelli = useCallback(() => dati(m.current?.map, "rr-anelli", { type: "FeatureCollection", features: [] }), []);
  const vicino = useCallback((lon: number, lat: number, etichetta: string | null, volaLi: boolean) => {
    const k = m.current;
    if (!k) return;
    setRiferimento({ lon, lat });
    if (volaLi || !window.matchMedia("(min-width: 1024px)").matches) inquadra(k.map, [[lon - 0.012, lat - 0.009], [lon + 0.012, lat + 0.009]]);
    setSel({ tipo: "vicino", lon, lat, etichetta });
    const k2 = 180 / Math.PI / 6371000;
    const cerchio = (r: number) => Array.from({ length: 73 }, (_, i) => {
      const t = (i / 72) * 2 * Math.PI;
      return [lon + (r * Math.cos(t) * k2) / Math.cos((lat * Math.PI) / 180), lat + r * Math.sin(t) * k2];
    });
    dati(k.map, "rr-anelli", {
      type: "FeatureCollection",
      features: [500, 1000].flatMap((r, i) => [
        { type: "Feature", properties: { i }, geometry: { type: "Polygon", coordinates: [cerchio(r)] } },
        { type: "Feature", properties: { i, etichetta: r < 1000 ? `${r} m` : "1 km" }, geometry: { type: "Point", coordinates: [lon, lat + r / 111320] } },
      ]),
    });
  }, []);

  const apriPunto = useCallback(
    (p: Punto, volaLi: boolean) => {
      togliAnelli();
      setSel({ tipo: "punto", p });
      if (volaLi && m.current) vola(m.current.map, p.lat, p.lon, Math.min(Math.max(m.current.map.getZoom(), 14.5), 16));
    },
    [togliAnelli],
  );

  // ------------------------------------------------------------------ mappa
  const pronta = useCallback(
    (map: MapLibre, ml: ML) => {
      const sotto = primoTesto(map);
      const vuoto = { type: "FeatureCollection" as const, features: [] };
      ["rr-punti", "rr-anelli"].forEach((s) => map.addSource(s, { type: "geojson", data: vuoto }));
      const colore = ["match", ["get", "t"], ...TIPI_PUNTO.flatMap((t) => [t, PUNTI[t].c]), "#5F6B7A"] as unknown as ExpressionSpecification;
      map.addLayer({ id: "rr-anelli-f", type: "fill", source: "rr-anelli", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": "#251D1C", "fill-opacity": ["match", ["get", "i"], 0, 0.07, 0.035] } }, sotto);
      map.addLayer({ id: "rr-anelli-l", type: "line", source: "rr-anelli", filter: ["==", ["geometry-type"], "Polygon"], paint: { "line-color": "#251D1C", "line-width": 1.4, "line-opacity": 0.55, "line-dasharray": [3, 3] } }, sotto);
      alone(map, "rr-punti-alone", "rr-punti", colore);
      map.addLayer({
        id: "rr-punti-c",
        type: "circle",
        source: "rr-punti",
        maxzoom: 15,
        layout: { "circle-sort-key": ["get", "o"] },
        paint: { "circle-color": colore, "circle-radius": ["interpolate", ["linear"], ["zoom"], 9.5, 2, 12, 3, 14, 4], "circle-opacity": 0.7, "circle-stroke-color": "#fff", "circle-stroke-width": 1 },
      });
      const spille = {
        "icon-image": ["concat", "pin-", ["get", "t"], "-", ["get", "t"], "-", ["get", "b"]] as ExpressionSpecification,
        "icon-anchor": "bottom" as const,
        "symbol-sort-key": ["get", "o"] as ExpressionSpecification,
      };
      map.addLayer({
        id: "rr-punti",
        type: "symbol",
        source: "rr-punti",
        layout: {
          ...spille,
          "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.72, 12, 0.82, 14, 0.94, 16, 1.04],
          "icon-allow-overlap": ["step", ["zoom"], false, 14, true],
          "icon-padding": ["interpolate", ["linear"], ["zoom"], 10, 5, 14, 2],
          "text-field": ["step", ["zoom"], "", 15.2, ["get", "nome"]],
          "text-font": ["Noto Sans Bold"],
          "text-size": 11.5,
          "text-offset": [0, 0.35],
          "text-anchor": "top",
          "text-max-width": 10,
          "text-optional": true,
        },
        paint: { "text-color": "#251D1C", "text-halo-color": "#fff", "text-halo-width": 1.6 },
      });
      map.addLayer({ id: "rr-punti-sel", type: "symbol", source: "rr-punti", filter: ["==", ["get", "id"], ""], layout: { ...spille, "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 1, 14, 1.15, 18, 1.25], "icon-allow-overlap": true, "icon-ignore-placement": true } });
      map.addLayer({
        id: "rr-anelli-t",
        type: "symbol",
        source: "rr-anelli",
        filter: ["==", ["geometry-type"], "Point"],
        layout: { "text-field": ["get", "etichetta"], "text-font": ["Noto Sans Bold"], "text-size": 11, "text-allow-overlap": true },
        paint: { "text-color": "#251D1C", "text-halo-color": "#F3EFE7", "text-halo-width": 2 },
      });

      caricaPunti()
        .then(setPunti)
        .catch(() => setErrore("I punti di consegna non si sono caricati. Riprova tra poco."));

      map.on("click", (e) => {
        const box: [[number, number], [number, number]] = [[e.point.x - 7, e.point.y - 7], [e.point.x + 7, e.point.y + 7]];
        const f = map.queryRenderedFeatures(e.point, { layers: ["rr-punti-sel", "rr-punti"] })[0] ?? map.queryRenderedFeatures(box, { layers: ["rr-punti", "rr-punti-c"] })[0];
        if (f) {
          const p = tutti.current.find((x) => x.id === String(f.properties.id));
          if (p) {
            inclina(map, p.lon, p.lat);
            return void apriPunto(p, false);
          }
        }
        vicino(e.lngLat.lng, e.lngLat.lat, null, false);
      });
      ["rr-punti", "rr-punti-c"].forEach((l) => {
        map.on("mouseenter", l, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", l, () => (map.getCanvas().style.cursor = ""));
      });
      m.current = { map, ml };
      setPronto((n) => n + 1);
    },
    [apriPunto, vicino],
  );

  useEffect(() => {
    const k = m.current;
    if (!k || !pronto || !viva(k.map)) return;
    const RANGO: Record<TipoPunto, number> = { ufficio: 0, forze_ordine: 1, ospedale_h24: 2, misericordia: 3, affiliato_h24: 4 };
    const features = visibili.map((p) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [p.lon, p.lat] },
      properties: { id: p.id, t: p.categoria, b: p.h24 ? "24h" : "0", o: RANGO[p.categoria] - (p.h24 ? 0.5 : 0), nome: p.nome.replace(/\s+—\s+.*$/, "") },
    }));
    const colori = Object.fromEntries(TIPI_PUNTO.map((t) => [t, PUNTI[t].c]));
    const glifi = Object.fromEntries(TIPI_PUNTO.map((t) => [t, PUNTI[t].g]));
    let vivo = true;
    assicuraSpille(k.map, features.map((f) => `pin-${f.properties.t}-${f.properties.t}-${f.properties.b}`), colori, glifi).then(() => {
      if (!vivo) return;
      dati(k.map, "rr-punti", { type: "FeatureCollection", features });
      comparsa(k.map, ["rr-punti"]);
    });
    return () => {
      vivo = false;
    };
  }, [visibili, pronto]);

  useEffect(() => {
    const k = m.current;
    if (viva(k?.map) && k.map.getLayer("rr-punti-sel")) k.map.setFilter("rr-punti-sel", ["==", ["get", "id"], sel?.tipo === "punto" ? sel.p.id : ""]);
  }, [sel, pronto]);

  function trovami() {
    navigator.geolocation?.getCurrentPosition(
      (p) => vicino(p.coords.longitude, p.coords.latitude, "La tua posizione", true),
      () => setErrore("Non riesco a sapere dove sei: controlla il permesso di posizione"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }
  const chiudi = () => {
    setSel(null);
    togliAnelli();
    riposa(m.current?.map);
  };
  const citt = sessione && ["cittadino", "turista"].includes(sessione.ruolo);
  // i due percorsi: prima si entra (se serve), poi i tre passi
  const inizia = (motivo: "perso" | "trovato") => {
    togliAnelli();
    const k = m.current;
    setZonaIniziale(riferimento ? zonaVicina(riferimento.lon, riferimento.lat) : k && viva(k.map) ? zonaVicina(k.map.getCenter().lng, k.map.getCenter().lat) : "centro");
    if (motivo === "perso" && segnalazione) return setSel({ tipo: "segnalazione" });
    setSel(citt ? { tipo: motivo } : { tipo: "accesso", motivo });
  };

  // ------------------------------------------------------------------ barra
  const barra = (
    <div className="flex flex-col gap-2">
      <Cerca
        endpoint="/api/oggetti/indirizzo"
        etichetta="Cerca un indirizzo"
        segnaposto="Dove sei? Il punto di consegna più vicino"
        onScelto={(l: Luogo) => vicino(l.lon, l.lat, l.etichetta, true)}
        coda={<Strumenti onGuida={() => setGuidaAperta(true)} onTrovami={trovami} />}
      />
      <div className={`rounded-[20px] bg-panel/88 backdrop-blur-xl backdrop-saturate-150 p-1.5 shadow-[0_2px_6px_rgba(37,29,28,.08),0_12px_34px_rgba(37,29,28,.16)] ring-1 ring-white/60 ${sel ? "max-lg:hidden" : ""}`}>
        <div className="grid grid-cols-2 gap-1.5">
          <Grande colore={VERDE} glifo={`<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z"/><path d="m9.4 10.2 1.9 1.9 3.4-3.6"/>`} titolo="Ho trovato" sotto="qualcosa per strada" onClick={() => inizia("trovato")} />
          {segnalazione ? (
            <Grande colore={AMARANTO} glifo={`<path d="M12 3a6 6 0 0 1 6 6c0 4.5 2 5.5 2 7H4c0-1.5 2-2.5 2-7a6 6 0 0 1 6-6ZM10 20a2 2 0 0 0 4 0"/>`} titolo="Ho perso" sotto="segui la tua segnalazione" onClick={() => setSel({ tipo: "segnalazione" })} punto />
          ) : (
            <Grande colore={AMARANTO} glifo={`<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/>`} titolo="Ho perso" sotto="un oggetto o un documento" onClick={() => inizia("perso")} />
          )}
        </div>
        <div role="group" aria-label="Tipi di punto di consegna (tocca per nascondere)" className="mt-1.5 flex flex-wrap items-center gap-1">
          {TIPI_PUNTO.filter((t) => t !== "ufficio").map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tipi[t]}
              onClick={() => setTipi((x) => ({ ...x, [t]: !x[t] }))}
              title={`${PUNTI[t].n}: ${fmt(conti[t])}`}
              className={`flex h-8 items-center gap-1 rounded-full px-2 text-[12px] font-bold transition ${tipi[t] ? "bg-bg-sink text-ink" : "text-muted line-through decoration-1 opacity-60 hover:opacity-90"}`}
            >
              <span className="size-2.5 rounded-full ring-2 ring-white" style={{ background: PUNTI[t].c }} aria-hidden="true" />
              {PUNTI[t].breve}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={soloH24}
            onClick={() => setSoloH24((v) => !v)}
            className={`ml-auto flex h-8 items-center rounded-full px-2.5 text-[12px] font-extrabold transition ${soloH24 ? "bg-ink text-white" : "bg-bg-sink text-ink-soft hover:text-ink"}`}
          >
            24h
          </button>
        </div>
      </div>
    </div>
  );

  // ------------------------------------------------------------------ schede
  let scheda: ReactNode;
  if (errore) {
    scheda = (
      <Scheda icona={<Tondo colore="#8A807E" glifo={PUNTI.ufficio.g} />} titolo="Qualcosa non va" onChiudi={() => setErrore(null)}>
        <p className="text-[15px] text-ink-soft">{errore}</p>
      </Scheda>
    );
  } else if (sel?.tipo === "punto") {
    scheda = <SchedaPunto p={sel.p} rif={riferimento} onChiudi={chiudi} />;
  } else if (sel?.tipo === "vicino") {
    scheda = <SchedaVicino {...sel} punti={visibili} onChiudi={chiudi} onPunto={(p) => apriPunto(p, true)} />;
  } else if (sel?.tipo === "accesso") {
    scheda = (
      <SchedaAccesso
        motivo={sel.motivo}
        onChiudi={chiudi}
        onEntrato={(s) => {
          setSessione(s);
          setSel({ tipo: sel.motivo });
        }}
      />
    );
  } else if (sel?.tipo === "trovato") {
    scheda = <SchedaTrovato zonaIniziale={zonaIniziale} onChiudi={chiudi} onEsito={(e) => setSel({ tipo: "esito", e })} />;
  } else if (sel?.tipo === "esito") {
    scheda = <SchedaEsito e={sel.e} punti={pubblici} rif={riferimento} onChiudi={chiudi} onPunto={(p) => apriPunto(p, true)} />;
  } else if (sel?.tipo === "perso") {
    scheda = (
      <SchedaPerso
        zonaIniziale={zonaIniziale}
        categoriaIniziale={categoriaIniziale}
        onChiudi={chiudi}
        onCreata={() => {
          setSegnalazione(true);
          setSel({ tipo: "segnalazione" });
        }}
      />
    );
  } else if (sel?.tipo === "segnalazione") {
    scheda = (
      <SchedaSegnalazione
        onChiudi={chiudi}
        onNuova={() => {
          setSegnalazione(false);
          setSel({ tipo: "perso" });
        }}
      />
    );
  } else {
    scheda = <Panoramica totale={pubblici.length} h24={pubblici.filter((p) => p.h24).length} />;
  }

  return (
    <Schermo
      mappa={<MappaVettoriale centro={[41.893, 12.49]} zoom={11.3} titolo="Mappa dei punti dove consegnare o ritirare oggetti smarriti a Roma" onPronta={pronta} />}
      barra={barra}
      scheda={scheda}
      guida={{ titolo: "Oggetti smarriti a Roma", schede: guida }}
      guidaAperta={guidaAperta}
      onGuida={setGuidaAperta}
    />
  );
}

// ==================================================================== pezzi
function Grande({ colore, glifo, titolo, sotto, onClick, punto }: { colore: string; glifo: string; titolo: string; sotto: string; onClick: () => void; punto?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="group flex items-center gap-2.5 rounded-[16px] px-2.5 py-2 text-left transition hover:brightness-95" style={{ background: `${colore}14` }}>
      <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full shadow-[0_3px_10px_rgba(0,0,0,.18)]" style={{ background: colore }}>
        <svg viewBox="0 0 24 24" className="size-[20px]" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: glifo }} />
        {punto && <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-[#F2C230] ring-2 ring-white" aria-hidden="true" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[15px] leading-5 font-extrabold" style={{ color: colore }}>
          {titolo}
        </span>
        <span className="block truncate text-[11.5px] font-semibold text-ink-soft">{sotto}</span>
      </span>
    </button>
  );
}

function SchedaPunto({ p, rif, onChiudi }: { p: Punto & { categoria: string }; rif: { lon: number; lat: number } | null; onChiudi: () => void }) {
  const t = PUNTI[p.categoria as TipoPunto] ?? PUNTI.forze_ordine;
  const documenti = p.categoria === "forze_ordine" || p.categoria === "ufficio";
  const d = rif ? distanza([rif.lon, rif.lat], [p.lon, p.lat]) : null;
  return (
    <Scheda icona={<Tondo colore={t.c} glifo={t.g} />} sopra={`${t.n} · ${ROMANI_MUN(p.municipio)}`} titolo={p.nome.replace(/\s+—\s+.*$/, "")} onChiudi={onChiudi}>
      <div className="rounded-[16px] px-3.5 py-2.5" style={{ background: `${t.c}14` }}>
        <p className="text-[19px] leading-6 font-extrabold" style={{ color: p.h24 ? "#16955A" : t.c }}>
          {p.h24 ? "Aperto 24 ore su 24" : "Con orari"}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-ink-soft">{p.h24 ? p.indirizzo : p.orari || p.indirizzo}</p>
      </div>
      <div className="mt-2.5">
        <Fatti
          voci={[
            { l: "Accetta", v: documenti ? "Tutto" : "Oggetti", nota: documenti ? "anche documenti" : "non documenti", tono: documenti ? "ok" : undefined },
            { l: "Distanza", v: d != null ? metri(d) : "—", nota: d != null ? "dal punto scelto" : "cerca un indirizzo" },
            { l: "Telefono", v: p.telefono ? "Sì" : "—", nota: p.telefono ?? "non indicato" },
          ]}
        />
      </div>
      {!p.h24 && p.indirizzo && <p className="mt-2 truncate text-[12.5px] text-muted">{p.indirizzo}</p>}
      <Azioni>
        <Azione primaria href={aPiedi(p.lat, p.lon)}>
          Portami lì
        </Azione>
        {p.telefono ? <Azione href={`tel:${p.telefono.replace(/[^\d+]/g, "")}`}>Chiama</Azione> : <Azione onClick={onChiudi}>Chiudi</Azione>}
      </Azioni>
    </Scheda>
  );
}

function SchedaVicino({ lon, lat, etichetta, punti, onChiudi, onPunto }: { lon: number; lat: number; etichetta: string | null; punti: Punto[]; onChiudi: () => void; onPunto: (p: Punto) => void }) {
  const vicini = useMemo(() => punti.map((p) => ({ p, d: distanza([lon, lat], [p.lon, p.lat]) })).sort((a, b) => a.d - b.d), [punti, lon, lat]);
  const primo = vicini[0];
  const h24 = vicini.find((x) => x.p.h24);
  const polizia = vicini.find((x) => x.p.categoria === "forze_ordine");
  return (
    <Scheda icona={<Tondo colore="#251D1C" glifo={PUNTI.forze_ordine.g} />} sopra="Dove consegnare vicino a te" titolo={etichetta ?? "Punto scelto sulla mappa"} onChiudi={onChiudi}>
      <div className="rounded-[16px] bg-bg-sink px-3.5 py-2.5">
        {primo ? (
          <>
            <p className="text-[12px] font-bold text-muted">Il più vicino</p>
            <p className="text-[19px] leading-6 font-extrabold text-ink">{metri(primo.d)}</p>
            <p className="truncate text-[13px] text-ink-soft">{primo.p.nome.replace(/\s+—\s+.*$/, "")}</p>
          </>
        ) : (
          <p className="text-[15px] font-bold text-ink">Nessun punto con i filtri scelti.</p>
        )}
      </div>
      <div className="mt-2.5">
        <Fatti
          voci={[
            { l: "Entro 1 km", v: String(vicini.filter((x) => x.d <= 1000).length), nota: "punti" },
            { l: "Aperto 24h", v: h24 ? metri(h24.d) : "—", nota: h24 ? "il più vicino" : "nessuno" },
            { l: "Polizia", v: polizia ? metri(polizia.d) : "—", nota: "per i documenti" },
          ]}
        />
      </div>
      <Azioni>
        {primo && <Azione primaria onClick={() => onPunto(primo.p)}>Apri il più vicino</Azione>}
        {h24 && h24 !== primo ? <Azione onClick={() => onPunto(h24.p)}>Aperto 24h</Azione> : primo ? <Azione href={aPiedi(primo.p.lat, primo.p.lon)}>Portami lì</Azione> : null}
      </Azioni>
    </Scheda>
  );
}

function SchedaEsito({ e, punti, rif, onChiudi, onPunto }: { e: EsitoTrovato; punti: Punto[]; rif: { lon: number; lat: number } | null; onChiudi: () => void; onPunto: (p: Punto) => void }) {
  const da: [number, number] = rif ? [rif.lon, rif.lat] : [MACRO_AREE[e.zona].lon, MACRO_AREE[e.zona].lat];
  const adatti = punti.filter((p) => (e.richiedeFFOO ? p.categoria === "forze_ordine" || p.categoria === "ufficio" : true));
  const primo = adatti.map((p) => ({ p, d: distanza(da, [p.lon, p.lat]) })).sort((a, b) => a.d - b.d)[0];
  return (
    <Scheda icona={<Tondo colore={VERDE} glifo={`<path d="m5 12.5 4.5 4.5L19 7.5"/>`} />} sopra={`Ho trovato · ${e.chiave}`} titolo="Grazie! Ora portalo qui" onChiudi={onChiudi}>
      <div className="rounded-[16px] bg-ok-tint px-3.5 py-2.5 text-center">
        <p className="text-[12px] font-bold text-ok">Il tuo codice di consegna</p>
        <p className="text-[26px] leading-8 font-extrabold tracking-[.08em] text-ink tabular-nums">{e.codiceConsegna ?? "—"}</p>
        <p className="text-[12px] text-ink-soft">Mostralo quando consegni l&apos;oggetto</p>
      </div>
      {primo && (
        <button type="button" onClick={() => onPunto(primo.p)} className="mt-2 flex w-full items-center gap-2.5 rounded-[14px] bg-bg-sink px-3 py-2 text-left hover:bg-line">
          <span className="size-3 shrink-0 rounded-full ring-2 ring-white" style={{ background: PUNTI[primo.p.categoria as TipoPunto]?.c }} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-bold text-ink">{primo.p.nome.replace(/\s+—\s+.*$/, "")}</span>
            <span className="block truncate text-[12px] text-muted">
              {metri(primo.d)} · {primo.p.h24 ? "aperto 24h" : primo.p.orari || primo.p.indirizzo}
            </span>
          </span>
        </button>
      )}
      <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-muted">
        {e.richiedeFFOO ? "Documenti, carte e chiavi d'auto vanno alle Forze dell'Ordine. " : ""}
        {e.matching.creati > 0 ? "C'è già una segnalazione simile: il proprietario verrà verificato." : "Se il proprietario lo cerca, lo verifichiamo noi senza mostrarvi i dati."}
      </p>
      <Azioni>
        {primo ? <Azione primaria href={aPiedi(primo.p.lat, primo.p.lon)}>Portami lì</Azione> : null}
        <Azione onClick={onChiudi}>Fatto</Azione>
      </Azioni>
    </Scheda>
  );
}

function Panoramica({ totale, h24 }: { totale: number; h24: number }) {
  return (
    <div className="pointer-events-auto rounded-[20px] bg-panel/95 px-4 py-3 shadow-[0_6px_24px_rgba(37,29,28,.16)] ring-1 ring-black/5 backdrop-blur">
      <p className="text-[14px] font-bold text-ink">Hai perso o trovato qualcosa a Roma? Tocca uno dei due pulsanti</p>
      {totale > 0 && (
        <p className="mt-0.5 text-[12.5px] text-ink-soft">
          <b className="text-ink tabular-nums">{fmt(totale)}</b> punti dove consegnare o ritirare, <b className="tabular-nums text-ok">{fmt(h24)}</b> aperti 24 ore su 24
        </p>
      )}
      <ul className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[12.5px] font-semibold text-ink-soft">
        {TIPI_PUNTO.map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3 rounded-full ring-2 ring-white" style={{ background: PUNTI[t].c }} />
            {PUNTI[t].n}
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[12px] text-muted">Telefono perso, regole e fonti nella Guida.</p>
    </div>
  );
}
