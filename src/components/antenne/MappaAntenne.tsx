"use client";

import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MLMap, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./mappa.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Tipi dei dati restituiti dalle API /api/antenne/*
// ---------------------------------------------------------------------------
type FC = GeoJSON.FeatureCollection<GeoJSON.Geometry, Record<string, unknown>>;

interface Istanza {
  gestori: string[];
  codice_sito: string | null;
  nome_sito: string | null;
  indirizzo: string | null;
  tipo_intervento: string | null;
  regime: string | null;
  data_pubblicazione: string | null;
  protocollo: string | null;
  municipio: number | null;
  municipio_nome: string | null;
  quartiere: string | null;
  quartiere_tipo: string | null;
  qualita_posizione: "originale" | "corretta" | "geocodificata";
  nota_qualita: string | null;
  sito_sensibile_vicino: { categoria: string; nome: string | null; distanza_m: number } | null;
  url_avviso: string | null;
}

interface Contesto {
  punto: { lat: number; lon: number };
  raggio_m: number;
  municipio: { numero: number; nome: string } | null;
  quartiere: { nome: string; tipo: string } | null;
  zona_urbanistica: { codice: string; nome: string } | null;
  dentro_roma: boolean;
  aree_vincolate: { tipo: string; nome: string | null }[];
  istanze_srb_nel_raggio: { id: number; gestori: string[]; indirizzo: string | null; tipo_intervento: string | null; distanza_m: number; qualita_posizione: string }[];
  siti_sensibili_piu_vicini: { categoria: string; nome: string | null; indirizzo: string | null; ufficiale: boolean; distanza_m: number }[];
}

interface Centralina {
  nome: string;
  descrizione: string | null;
  attivo_dal: string | null;
  ultimo_dato: string | null;
  report: { periodo_inizio: string; periodo_fine: string; url: string }[];
}

type Selezione =
  | { tipo: "istanza"; id: number; dati: Istanza; lngLat: [number, number] }
  | { tipo: "centralina"; dati: Centralina }
  | { tipo: "contesto"; dati: Contesto | null; etichetta: string | null; caricamento: boolean; errore?: string }
  | null;

// ---------------------------------------------------------------------------
// Categorie e colori
// ---------------------------------------------------------------------------
export const CATEGORIE: Record<string, { etichetta: string; gruppo: Gruppo }> = {
  asilo_nido: { etichetta: "Asilo nido", gruppo: "istruzione" },
  scuola_infanzia: { etichetta: "Scuola dell'infanzia", gruppo: "istruzione" },
  scuola: { etichetta: "Scuola", gruppo: "istruzione" },
  ospedale: { etichetta: "Ospedale o casa di cura", gruppo: "salute" },
  casa_di_cura: { etichetta: "Casa di cura", gruppo: "salute" },
  rsa: { etichetta: "RSA o residenza per anziani", gruppo: "salute" },
  sanitario_assistenziale: { etichetta: "Struttura sanitaria o assistenziale", gruppo: "salute" },
  parco_giochi: { etichetta: "Parco giochi", gruppo: "gioco" },
  carcere: { etichetta: "Istituto penitenziario", gruppo: "carcere" },
};
type Gruppo = "istruzione" | "salute" | "gioco" | "carcere";
const GRUPPI: { id: Gruppo; etichetta: string; colore: string }[] = [
  { id: "istruzione", etichetta: "Scuole e asili", colore: "#2563eb" },
  { id: "salute", etichetta: "Ospedali e RSA", colore: "#0d9488" },
  { id: "gioco", etichetta: "Parchi giochi", colore: "#65a30d" },
  { id: "carcere", etichetta: "Carceri", colore: "#64748b" },
];
const COLORE_ANTENNA = "#c8006a";
const COLORE_CENTRALINA = "#6d2ae0";

const RAGGIO_M = 500;
const CENTRO_ROMA: [number, number] = [12.4964, 41.9028];

const formatoData = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }) : null;
const metri = (m: number) => (m >= 1000 ? `${(m / 1000).toLocaleString("it-IT", { maximumFractionDigits: 1 })} km` : `${Math.round(m)} m`);

/** Poligono circolare (approssimato) di raggio r metri intorno a un punto. */
function cerchio([lon, lat]: [number, number], r: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const punti: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI;
    punti.push([lon + (r / (111_320 * Math.cos((lat * Math.PI) / 180))) * Math.cos(a), lat + (r / 110_540) * Math.sin(a)]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [punti] } };
}

// ---------------------------------------------------------------------------
export function MappaAntenne() {
  const contenitore = useRef<HTMLDivElement>(null);
  const mappa = useRef<MLMap | null>(null);
  const [pronta, setPronta] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [dati, setDati] = useState<{ istanze: FC; sensibili: FC; vincoli: FC; centraline: FC } | null>(null);
  const [visibili, setVisibili] = useState({ istanze: true, vincoli: true, centraline: true, istruzione: true, salute: true, gioco: false, carcere: true });
  const [gestore, setGestore] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [selezione, setSelezione] = useState<Selezione>(null);

  // --- Caricamento dati ------------------------------------------------------
  useEffect(() => {
    const leggi = (u: string) => fetch(u).then((r) => { if (!r.ok) throw new Error(`${u}: HTTP ${r.status}`); return r.json() as Promise<FC>; });
    Promise.all([
      leggi("/api/antenne/istanze"),
      leggi("/api/antenne/siti-sensibili"),
      leggi("/api/antenne/aree-vincolate"),
      leggi("/api/antenne/monitoraggio"),
    ])
      .then(([istanze, sensibili, vincoli, centraline]) => {
        // gruppo per colorare e filtrare i siti sensibili
        for (const f of sensibili.features) f.properties.gruppo = CATEGORIE[String(f.properties.categoria)]?.gruppo ?? "salute";
        setDati({ istanze, sensibili, vincoli, centraline });
      })
      .catch((e: Error) => setErrore(e.message));
  }, []);

  const gestori = useMemo(() => {
    const conta = new Map<string, number>();
    for (const f of dati?.istanze.features ?? []) for (const g of (f.properties.gestori as string[]) ?? []) conta.set(g, (conta.get(g) ?? 0) + 1);
    return [...conta.entries()].sort((a, b) => b[1] - a[1]);
  }, [dati]);

  const conteggi = useMemo(() => {
    const c: Record<string, number> = { istanze: dati?.istanze.features.length ?? 0, centraline: dati?.centraline.features.length ?? 0, vincoli: dati?.vincoli.features.length ?? 0 };
    for (const f of dati?.sensibili.features ?? []) c[String(f.properties.gruppo)] = (c[String(f.properties.gruppo)] ?? 0) + 1;
    return c;
  }, [dati]);

  // --- Contesto di un punto ---------------------------------------------------
  const mostraContesto = useCallback(async (lngLat: [number, number], etichetta: string | null = null, vola = false) => {
    const m = mappa.current;
    if (!m) return;
    (m.getSource("raggio") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: [cerchio(lngLat, RAGGIO_M)] });
    (m.getSource("punto") as GeoJSONSource | undefined)?.setData({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: lngLat } });
    if (vola) m.flyTo({ center: lngLat, zoom: Math.max(m.getZoom(), 15), essential: true });
    setSelezione({ tipo: "contesto", dati: null, etichetta, caricamento: true });
    try {
      const r = await fetch(`/api/antenne/contesto?lat=${lngLat[1]}&lon=${lngLat[0]}&raggio=${RAGGIO_M}`);
      if (!r.ok) throw new Error((await r.json()).errore ?? `HTTP ${r.status}`);
      setSelezione({ tipo: "contesto", dati: (await r.json()) as Contesto, etichetta, caricamento: false });
    } catch (e) {
      setSelezione({ tipo: "contesto", dati: null, etichetta, caricamento: false, errore: (e as Error).message });
    }
  }, []);

  const selezionaIstanza = useCallback((id: number) => {
    const f = dati?.istanze.features.find((x) => x.id === id);
    const m = mappa.current;
    if (!f || !m || f.geometry.type !== "Point") return;
    const lngLat = f.geometry.coordinates as [number, number];
    m.flyTo({ center: lngLat, zoom: Math.max(m.getZoom(), 15.5), essential: true });
    setSelezione({ tipo: "istanza", id, dati: f.properties as unknown as Istanza, lngLat });
  }, [dati]);

  // --- Inizializzazione mappa -------------------------------------------------
  useEffect(() => {
    if (!contenitore.current || !dati || mappa.current) return;
    // Il worker di MapLibre è servito dalla nostra rotta (Turbopack non pubblica il file .mjs separato)
    maplibregl.setWorkerUrl("/api/antenne/maplibre-worker");
    const scuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const m = new maplibregl.Map({
      container: contenitore.current,
      style: `https://tiles.openfreemap.org/styles/${scuro ? "dark" : "positron"}`,
      center: CENTRO_ROMA,
      zoom: 10.3,
      minZoom: 9,
      maxBounds: [[11.9, 41.45], [13.1, 42.3]],
      attributionControl: { compact: true, customAttribution: "Dati: Roma Capitale – GeoRoma, ARPA Lazio, © OpenStreetMap contributors (ODbL)" },
    });
    mappa.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    m.on("load", () => {
      m.addSource("vincoli", { type: "geojson", data: dati.vincoli });
      m.addSource("sensibili", { type: "geojson", data: dati.sensibili });
      m.addSource("istanze", { type: "geojson", data: dati.istanze, promoteId: "id" });
      m.addSource("centraline", { type: "geojson", data: dati.centraline });
      m.addSource("raggio", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addSource("punto", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

      const coloreVincolo: maplibregl.ExpressionSpecification = ["match", ["get", "tipo"], "sito_unesco", "#d97706", "#16a34a"];
      m.addLayer({ id: "vincoli-fill", type: "fill", source: "vincoli", paint: { "fill-color": coloreVincolo, "fill-opacity": 0.1 } });
      m.addLayer({ id: "vincoli-line", type: "line", source: "vincoli", paint: { "line-color": coloreVincolo, "line-width": 1.2, "line-dasharray": [2, 2] } });

      m.addLayer({ id: "raggio-fill", type: "fill", source: "raggio", paint: { "fill-color": COLORE_CENTRALINA, "fill-opacity": 0.08 } });
      m.addLayer({ id: "raggio-line", type: "line", source: "raggio", paint: { "line-color": COLORE_CENTRALINA, "line-width": 2, "line-dasharray": [1.5, 1.5] } });

      m.addLayer({
        id: "sensibili", type: "circle", source: "sensibili",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2, 14, 4.5, 17, 7],
          "circle-color": ["match", ["get", "gruppo"], ...GRUPPI.flatMap((g) => [g.id, g.colore]), "#888"] as unknown as maplibregl.ExpressionSpecification,
          "circle-opacity": ["case", ["get", "ufficiale"], 0.9, 0.55],
          "circle-stroke-color": scuro ? "#0d0b1f" : "#ffffff",
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 10, 0.3, 15, 1.2],
        },
      });

      m.addLayer({
        id: "istanze-alone", type: "circle", source: "istanze",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 7, 15, 14],
          "circle-color": COLORE_ANTENNA,
          "circle-opacity": ["case", ["boolean", ["feature-state", "selezionata"], false], 0.35, 0.12],
        },
      });
      m.addLayer({
        id: "istanze", type: "circle", source: "istanze",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3.5, 15, 7.5],
          "circle-color": ["case", ["==", ["get", "qualita_posizione"], "geocodificata"], scuro ? "#17142e" : "#ffffff", COLORE_ANTENNA],
          "circle-stroke-color": COLORE_ANTENNA,
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 10, 1.2, 15, 2.5],
        },
      });

      m.addLayer({
        id: "centraline", type: "circle", source: "centraline",
        paint: { "circle-radius": 9, "circle-color": COLORE_CENTRALINA, "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 },
      });
      m.addLayer({
        id: "punto", type: "circle", source: "punto",
        paint: { "circle-radius": 6, "circle-color": "#ffffff", "circle-stroke-color": COLORE_CENTRALINA, "circle-stroke-width": 3 },
      });

      for (const id of ["istanze", "centraline", "sensibili"]) {
        m.on("mouseenter", id, () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", id, () => (m.getCanvas().style.cursor = ""));
      }

      const popup = new maplibregl.Popup({ closeButton: false, offset: 8, className: "popup-sensibile" });
      m.on("mousemove", "sensibili", (e) => {
        const p = e.features?.[0]?.properties;
        if (!p) return;
        const cat = CATEGORIE[String(p.categoria)]?.etichetta ?? p.categoria;
        popup.setLngLat(e.lngLat).setHTML(
          `<strong>${String(p.nome ?? cat).replace(/</g, "&lt;")}</strong><br><span>${cat}${p.ufficiale ? "" : " · fonte OpenStreetMap"}</span>`,
        ).addTo(m);
      });
      m.on("mouseleave", "sensibili", () => popup.remove());

      m.on("click", (e: MapMouseEvent) => {
        const [hit] = m.queryRenderedFeatures(e.point, { layers: ["istanze", "centraline"].filter((l) => m.getLayer(l)) });
        // MapLibre serializza array e oggetti delle proprietà: rileggiamo la feature originale dai dati
        if (hit?.layer.id === "istanze") {
          const f = dati.istanze.features.find((x) => x.id === hit.id);
          if (f) setSelezione({ tipo: "istanza", id: Number(hit.id), dati: f.properties as unknown as Istanza, lngLat: (hit.geometry as GeoJSON.Point).coordinates as [number, number] });
          return;
        }
        if (hit?.layer.id === "centraline") {
          const f = dati.centraline.features.find((x) => x.properties.nome === hit.properties.nome);
          if (f) setSelezione({ tipo: "centralina", dati: f.properties as unknown as Centralina });
          return;
        }
        void mostraContesto([e.lngLat.lng, e.lngLat.lat]);
      });
      setPronta(true);
    });
    return () => { m.remove(); mappa.current = null; };
  }, [dati, mostraContesto]);

  // --- Evidenzia l'istanza selezionata ---------------------------------------
  const selezionataPrima = useRef<number | null>(null);
  useEffect(() => {
    const m = mappa.current;
    if (!m || !pronta) return;
    if (selezionataPrima.current != null) m.setFeatureState({ source: "istanze", id: selezionataPrima.current }, { selezionata: false });
    const id = selezione?.tipo === "istanza" ? selezione.id : null;
    if (id != null) m.setFeatureState({ source: "istanze", id }, { selezionata: true });
    selezionataPrima.current = id;
  }, [selezione, pronta]);

  // --- Visibilità e filtri ----------------------------------------------------
  useEffect(() => {
    const m = mappa.current;
    if (!m || !pronta) return;
    const vis = (v: boolean) => (v ? "visible" : "none");
    m.setLayoutProperty("istanze", "visibility", vis(visibili.istanze));
    m.setLayoutProperty("istanze-alone", "visibility", vis(visibili.istanze));
    m.setLayoutProperty("vincoli-fill", "visibility", vis(visibili.vincoli));
    m.setLayoutProperty("vincoli-line", "visibility", vis(visibili.vincoli));
    m.setLayoutProperty("centraline", "visibility", vis(visibili.centraline));
    const gruppiAttivi = GRUPPI.filter((g) => visibili[g.id]).map((g) => g.id);
    m.setFilter("sensibili", ["all",
      ["in", ["get", "gruppo"], ["literal", gruppiAttivi]],
      ...(municipio ? [["==", ["get", "municipio"], Number(municipio)]] : []),
    ] as unknown as maplibregl.FilterSpecification);
    const filtroIstanze = ["all",
      ...(gestore ? [["in", gestore, ["get", "gestori"]]] : []),
      ...(municipio ? [["==", ["get", "municipio"], Number(municipio)]] : []),
    ] as maplibregl.FilterSpecification;
    m.setFilter("istanze", filtroIstanze);
    m.setFilter("istanze-alone", filtroIstanze);
  }, [visibili, gestore, municipio, pronta]);

  const istanzeVisibili = useMemo(
    () => (dati?.istanze.features ?? []).filter((f) =>
      (!gestore || ((f.properties.gestori as string[]) ?? []).includes(gestore)) && (!municipio || f.properties.municipio === Number(municipio))).length,
    [dati, gestore, municipio],
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="relative h-[70vh] min-h-[28rem] overflow-hidden rounded-3xl border border-line bg-surface-2 shadow-sm lg:h-auto lg:min-h-[44rem]">
        <RicercaIndirizzo onScelta={(r) => void mostraContesto([r.lon, r.lat], r.etichetta, true)} />
        {/* MapLibre impone position:relative al suo contenitore: l'involucro assoluto gli dà le dimensioni */}
        <div className="absolute inset-0">
          <div
            ref={contenitore}
            role="region"
            aria-label="Mappa interattiva delle antenne di telefonia mobile a Roma. Clicca un punto per vedere il contesto."
            className="h-full w-full"
          />
        </div>
        {!pronta && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/70 backdrop-blur-sm">
            <p className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-muted">
              {errore ? `Dati non disponibili: ${errore}` : "Caricamento della mappa…"}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={() => navigator.geolocation?.getCurrentPosition(
            (pos) => void mostraContesto([pos.coords.longitude, pos.coords.latitude], "La tua posizione", true),
            () => setSelezione({ tipo: "contesto", dati: null, etichetta: null, caricamento: false, errore: "Posizione non disponibile: controlla i permessi del browser." }),
          )}
          className="absolute bottom-10 right-3 z-10 flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-md transition hover:border-accent-2"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4 text-accent-2" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <circle cx="10" cy="10" r="3" /><path d="M10 1v3M10 16v3M1 10h3M16 10h3" strokeLinecap="round" />
          </svg>
          Vicino a me
        </button>
      </div>

      <aside className="flex flex-col gap-4" aria-label="Livelli, filtri e dettagli">
        <Pannello>
          {selezione ? (
            <Dettaglio selezione={selezione} onChiudi={() => setSelezione(null)} onIstanza={selezionaIstanza} />
          ) : (
            <Benvenuto />
          )}
        </Pannello>

        <Pannello>
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Livelli</h2>
          <ul className="mt-3 grid gap-1.5">
            <Interruttore attivo={visibili.istanze} onCambia={(v) => setVisibili((s) => ({ ...s, istanze: v }))} colore={COLORE_ANTENNA}
              etichetta="Antenne (istanze ufficiali)" n={conteggi.istanze} />
            {GRUPPI.map((g) => (
              <Interruttore key={g.id} attivo={visibili[g.id]} onCambia={(v) => setVisibili((s) => ({ ...s, [g.id]: v }))} colore={g.colore}
                etichetta={g.etichetta} n={conteggi[g.id] ?? 0} piccolo />
            ))}
            <Interruttore attivo={visibili.vincoli} onCambia={(v) => setVisibili((s) => ({ ...s, vincoli: v }))} colore="#d97706"
              etichetta="Aree vincolate (UNESCO, protette)" n={conteggi.vincoli} quadrato />
            <Interruttore attivo={visibili.centraline} onCambia={(v) => setVisibili((s) => ({ ...s, centraline: v }))} colore={COLORE_CENTRALINA}
              etichetta="Centraline ARPA" n={conteggi.centraline} />
          </ul>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs font-semibold text-muted">
              Operatore
              <select value={gestore} onChange={(e) => setGestore(e.target.value)} className="h-10 rounded-xl border border-line bg-background px-2 text-sm text-ink">
                <option value="">Tutti</option>
                {gestori.map(([g, n]) => <option key={g} value={g}>{g} ({n})</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted">
              Municipio
              <select value={municipio} onChange={(e) => setMunicipio(e.target.value)} className="h-10 rounded-xl border border-line bg-background px-2 text-sm text-ink">
                <option value="">Tutti</option>
                {["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"].map((r, i) => (
                  <option key={r} value={i + 1}>{r}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-3 text-xs text-muted" aria-live="polite">
            {istanzeVisibili} antenne in mappa con questi filtri.
          </p>
          <div className="mt-3 flex items-center gap-4 border-t border-line pt-3 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: COLORE_ANTENNA }} />coordinate del Comune</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 bg-surface" style={{ borderColor: COLORE_ANTENNA }} />da indirizzo</span>
          </div>
        </Pannello>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sottocomponenti
// ---------------------------------------------------------------------------
function Pannello({ children }: { children: React.ReactNode }) {
  return <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">{children}</section>;
}

function Interruttore({ attivo, onCambia, colore, etichetta, n, piccolo, quadrato }: {
  attivo: boolean; onCambia: (v: boolean) => void; colore: string; etichetta: string; n: number; piccolo?: boolean; quadrato?: boolean;
}) {
  return (
    <li>
      <label className={`flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-surface-2 ${piccolo ? "pl-5" : ""}`}>
        <input type="checkbox" checked={attivo} onChange={(e) => onCambia(e.target.checked)} className="peer sr-only" />
        <span aria-hidden="true" className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${attivo ? "bg-accent-2" : "bg-line"} peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-focus`}>
          <span className={`h-4 w-4 rounded-full bg-white shadow transition ${attivo ? "translate-x-4" : ""}`} />
        </span>
        <span className={`h-3 w-3 shrink-0 ${quadrato ? "rounded-sm" : "rounded-full"}`} style={{ background: colore }} aria-hidden="true" />
        <span className={`flex-1 ${piccolo ? "text-sm" : "text-sm font-semibold"} text-ink`}>{etichetta}</span>
        <span className="font-mono text-xs text-muted">{n.toLocaleString("it-IT")}</span>
      </label>
    </li>
  );
}

function Benvenuto() {
  return (
    <div>
      <h2 className="text-lg font-bold text-ink">Esplora la mappa</h2>
      <ul className="mt-3 grid gap-2.5 text-sm text-muted">
        <li className="flex gap-2"><Numero n={1} />Cerca il tuo indirizzo o premi «Vicino a me».</li>
        <li className="flex gap-2"><Numero n={2} />Clicca un punto qualsiasi: vedi le antenne entro {RAGGIO_M} m, i siti sensibili vicini e il quartiere.</li>
        <li className="flex gap-2"><Numero n={3} />Clicca un&apos;antenna per sapere chi l&apos;ha chiesta, quando e cosa puoi fare.</li>
      </ul>
    </div>
  );
}

function Numero({ n }: { n: number }) {
  return <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">{n}</span>;
}

function Chiudi({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Chiudi dettaglio" className="rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-ink">
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" /></svg>
    </button>
  );
}

function Etichetta({ children, tono = "neutro" }: { children: React.ReactNode; tono?: "neutro" | "accento" | "avviso" }) {
  const c = { neutro: "bg-surface-2 text-muted", accento: "bg-accent/10 text-accent", avviso: "bg-amber-500/15 text-amber-700 dark:text-amber-300" }[tono];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${c}`}>{children}</span>;
}

function Riga({ nome, children }: { nome: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-muted">{nome}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

const QUALITA: Record<string, { testo: string; tono: "neutro" | "accento" | "avviso" }> = {
  originale: { testo: "Coordinate pubblicate dal Comune", tono: "neutro" },
  corretta: { testo: "Coordinate del Comune corrette", tono: "avviso" },
  geocodificata: { testo: "Posizione ricavata dall'indirizzo", tono: "avviso" },
};

function Dettaglio({ selezione, onChiudi, onIstanza }: { selezione: NonNullable<Selezione>; onChiudi: () => void; onIstanza: (id: number) => void }) {
  if (selezione.tipo === "istanza") {
    const d = selezione.dati;
    const q = QUALITA[d.qualita_posizione];
    return (
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {d.tipo_intervento && <Etichetta tono="accento">{d.tipo_intervento}</Etichetta>}
            {d.regime?.startsWith("SCIA") && <Etichetta>bassa potenza (SCIA)</Etichetta>}
          </div>
          <Chiudi onClick={onChiudi} />
        </div>
        <h2 className="mt-2 text-xl font-bold leading-snug text-ink">{d.gestori?.length ? d.gestori.join(" · ") : "Operatore non indicato"}</h2>
        <p className="text-sm text-muted">{d.indirizzo ?? "Indirizzo non indicato"}</p>
        <dl className="mt-3 divide-y divide-line border-y border-line">
          {d.quartiere && <Riga nome="Quartiere">{d.quartiere} <span className="text-muted">({d.quartiere_tipo})</span></Riga>}
          {d.municipio_nome && <Riga nome="Municipio">{d.municipio_nome}</Riga>}
          {d.codice_sito && <Riga nome="Codice sito">{d.codice_sito}</Riga>}
          {d.data_pubblicazione && <Riga nome="Pubblicato">{formatoData(d.data_pubblicazione)}</Riga>}
          {d.protocollo && <Riga nome="Protocollo"><span className="font-mono text-xs">{d.protocollo}</span></Riga>}
          {d.sito_sensibile_vicino && (
            <Riga nome="Sito sensibile più vicino">
              {d.sito_sensibile_vicino.nome ?? CATEGORIE[d.sito_sensibile_vicino.categoria]?.etichetta} a <strong>{metri(d.sito_sensibile_vicino.distanza_m)}</strong>
              <span className="block text-xs text-muted">{CATEGORIE[d.sito_sensibile_vicino.categoria]?.etichetta}</span>
            </Riga>
          )}
        </dl>
        <div className="mt-3">
          <Etichetta tono={q.tono}>{q.testo}</Etichetta>
          {d.nota_qualita && <p className="mt-1.5 text-xs leading-relaxed text-muted">{d.nota_qualita}</p>}
        </div>
        <div className="mt-4 rounded-2xl bg-surface-2 p-4 text-sm leading-relaxed text-muted">
          <p className="font-semibold text-ink">Cosa puoi fare</p>
          <p className="mt-1">Entro 20 giorni dalla pubblicazione dell&apos;avviso puoi inviare osservazioni al Municipio. Se vivi o lavori vicino all&apos;impianto puoi chiedere una misura ad ARPA Lazio (vedi più sotto).</p>
          <p className="mt-2 text-xs">Un&apos;istanza non prova che l&apos;impianto sia attivo.</p>
        </div>
        {d.url_avviso && (
          <a href={d.url_avviso} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
            Leggi l&apos;avviso ufficiale di Roma Capitale
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M7 13L13 7M8 7h5v5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        )}
      </div>
    );
  }

  if (selezione.tipo === "centralina") {
    const d = selezione.dati;
    return (
      <div>
        <div className="flex items-start justify-between gap-2">
          <Etichetta tono="accento">Monitoraggio continuo CEM</Etichetta>
          <Chiudi onClick={onChiudi} />
        </div>
        <h2 className="mt-2 text-xl font-bold leading-snug text-ink">{d.nome}</h2>
        {d.descrizione && <p className="mt-1 text-sm leading-relaxed text-muted">{d.descrizione}</p>}
        <p className="mt-3 text-sm text-ink">
          {d.report?.length ? `${d.report.length} report mensili pubblicati, l'ultimo fino al ${formatoData(d.ultimo_dato)}.` : "Nessun report pubblicato online."}
        </p>
        {d.report?.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {d.report.map((r) => (
              <li key={r.url}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold text-muted transition hover:border-accent hover:text-accent">
                  {new Date(r.periodo_inizio).toLocaleDateString("it-IT", { month: "short", year: "2-digit" })}
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs leading-relaxed text-muted">I report ARPA mostrano i valori solo come grafici: per questo non riportiamo un numero in V/m.</p>
      </div>
    );
  }

  // Contesto di un punto
  const { dati: c, caricamento, errore, etichetta } = selezione;
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <Etichetta tono="accento">Entro {RAGGIO_M} m da qui</Etichetta>
        <Chiudi onClick={onChiudi} />
      </div>
      {caricamento && <p className="mt-3 text-sm text-muted">Analisi del punto in corso…</p>}
      {errore && <p className="mt-3 text-sm text-rose-600">{errore}</p>}
      {c && !c.dentro_roma && <p className="mt-3 text-sm text-muted">Questo punto è fuori dal territorio di Roma Capitale.</p>}
      {c && c.dentro_roma && (
        <>
          <h2 className="mt-2 text-xl font-bold leading-snug text-ink">{etichetta ?? c.quartiere?.nome ?? "Punto selezionato"}</h2>
          <p className="text-sm text-muted">{[c.quartiere && `${c.quartiere.tipo} ${c.quartiere.nome}`, c.municipio?.nome].filter(Boolean).join(" · ")}</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Cifra valore={c.istanze_srb_nel_raggio.length} etichetta={c.istanze_srb_nel_raggio.length === 1 ? "antenna nel raggio" : "antenne nel raggio"} />
            <Cifra valore={c.siti_sensibili_piu_vicini[0] ? metri(c.siti_sensibili_piu_vicini[0].distanza_m) : "—"} etichetta="al sito sensibile più vicino" />
          </div>

          {c.aree_vincolate.length > 0 && (
            <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              Area vincolata: {c.aree_vincolate.map((a) => a.nome ?? a.tipo).join(", ")}.
            </p>
          )}

          {c.istanze_srb_nel_raggio.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-bold text-ink">Antenne vicine</h3>
              <ul className="mt-1.5 grid gap-1">
                {c.istanze_srb_nel_raggio.slice(0, 6).map((i) => (
                  <li key={i.id}>
                    <button type="button" onClick={() => onIstanza(i.id)} className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-left text-sm transition hover:bg-surface-2">
                      <span className="min-w-0"><span className="font-semibold text-ink">{i.gestori.join(" · ") || "Operatore n.d."}</span><span className="block truncate text-xs text-muted">{i.indirizzo}</span></span>
                      <span className="shrink-0 font-mono text-xs text-muted">{metri(i.distanza_m)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3 className="mt-4 text-sm font-bold text-ink">Siti sensibili più vicini</h3>
          <ul className="mt-1.5 grid gap-1 text-sm">
            {c.siti_sensibili_piu_vicini.map((s, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-2 py-1">
                <span className="min-w-0"><span className="text-ink">{s.nome ?? CATEGORIE[s.categoria]?.etichetta}</span><span className="block text-xs text-muted">{CATEGORIE[s.categoria]?.etichetta}{s.ufficiale ? "" : " · OpenStreetMap"}</span></span>
                <span className="shrink-0 font-mono text-xs text-muted">{metri(s.distanza_m)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Le distanze sono indicative: il regolamento di Roma vieta le antenne sopra i siti sensibili ma non fissa distanze minime. L&apos;esposizione reale si conosce solo con una misura ARPA.
          </p>
        </>
      )}
    </div>
  );
}

function Cifra({ valore, etichetta }: { valore: string | number; etichetta: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <p className="text-2xl font-bold text-ink">{valore}</p>
      <p className="text-xs text-muted">{etichetta}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ricerca indirizzo (stradario ufficiale di Roma Capitale)
// ---------------------------------------------------------------------------
interface Suggerimento { etichetta: string; municipio: number | null; lat: number; lon: number; precisione: string }

function RicercaIndirizzo({ onScelta }: { onScelta: (r: Suggerimento) => void }) {
  const [testo, setTesto] = useState("");
  const [trovati, setTrovati] = useState<{ per: string; risultati: Suggerimento[] } | null>(null);
  const [inCorso, setInCorso] = useState<string | null>(null);
  const [aperto, setAperto] = useState(false);
  const [attivo, setAttivo] = useState(-1);

  const cercabile = testo.trim().length >= 3;
  // I risultati valgono solo per il testo per cui sono stati cercati (niente setState sincroni nell'effect)
  const risultati = cercabile && trovati?.per === testo ? trovati.risultati : [];
  const stato: "" | "cerco" | "vuoto" = !cercabile ? "" : inCorso === testo ? "cerco" : trovati?.per === testo && !risultati.length ? "vuoto" : "";

  useEffect(() => {
    if (testo.trim().length < 3) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setInCorso(testo);
      fetch(`/api/antenne/indirizzo?q=${encodeURIComponent(testo)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((j: { risultati: Suggerimento[] }) => { setTrovati({ per: testo, risultati: j.risultati ?? [] }); setAttivo(-1); })
        .catch(() => {})
        .finally(() => setInCorso((c) => (c === testo ? null : c)));
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [testo]);

  const scegli = (r: Suggerimento) => { onScelta(r); setTesto(r.etichetta); setAperto(false); };

  return (
    <div className="absolute left-3 right-14 top-3 z-10 sm:right-auto sm:w-[26rem]">
      <label htmlFor="cerca-indirizzo" className="sr-only">Cerca un indirizzo di Roma</label>
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 shadow-lg shadow-black/5">
        <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="M14 14l4 4" strokeLinecap="round" /></svg>
        <input
          id="cerca-indirizzo"
          role="combobox"
          aria-expanded={aperto && risultati.length > 0}
          aria-controls="suggerimenti-indirizzo"
          aria-autocomplete="list"
          autoComplete="off"
          value={testo}
          placeholder="Cerca un indirizzo, es. via Salaria 292"
          onChange={(e) => { setTesto(e.target.value); setAperto(true); }}
          onFocus={() => setAperto(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setAttivo((a) => Math.min(a + 1, risultati.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setAttivo((a) => Math.max(a - 1, 0)); }
            if (e.key === "Enter" && risultati.length) { e.preventDefault(); scegli(risultati[Math.max(attivo, 0)]); }
            if (e.key === "Escape") setAperto(false);
          }}
          className="h-12 w-full bg-transparent text-base text-ink placeholder:text-muted/80 focus:outline-none"
        />
        {stato === "cerco" && <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-accent-2" aria-hidden="true" />}
      </div>
      {aperto && (risultati.length > 0 || stato === "vuoto") && (
        <ul id="suggerimenti-indirizzo" role="listbox" className="mt-1.5 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
          {stato === "vuoto" && <li className="px-4 py-3 text-sm text-muted">Nessun indirizzo trovato nello stradario di Roma.</li>}
          {risultati.map((r, i) => (
            <li key={r.etichetta} role="option" aria-selected={i === attivo}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); scegli(r); }}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition ${i === attivo ? "bg-surface-2" : "hover:bg-surface-2"}`}>
                <span className="font-semibold capitalize text-ink">{r.etichetta.toLowerCase()}</span>
                {r.municipio && <span className="shrink-0 text-xs text-muted">Mun. {["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"][r.municipio - 1]}</span>}
              </button>
            </li>
          ))}
          <li className="border-t border-line px-4 py-1.5 text-[11px] text-muted">Stradario ufficiale di Roma Capitale</li>
        </ul>
      )}
    </div>
  );
}
