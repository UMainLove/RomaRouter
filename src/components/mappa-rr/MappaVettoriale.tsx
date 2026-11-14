"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import "./mappa.css";
import type { GeoJSONSource, Map as MapLibre } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { atmosfera } from "./cinema";
import { stileRoma } from "./stile";

export type ML = typeof import("maplibre-gl");

/*
 * Mappa vettoriale delle sezioni: MapLibre (GPU) con il fondo di stile.ts. Il motore si scarica dopo la
 * pagina; finche' non c'e' si vede la carta del fondo, non un riquadro vuoto.
 */
export function MappaVettoriale({
  centro,
  zoom,
  titolo,
  onPronta,
  conPannelli = true,
}: {
  centro: [number, number]; // [lat, lon]
  zoom: number;
  titolo: string;
  onPronta: (map: MapLibre, ml: ML) => void | (() => void);
  /** false: mappa dentro un riquadro della pagina, senza pannelli sopra (niente margini) */
  conPannelli?: boolean;
}) {
  const div = useRef<HTMLDivElement>(null);
  const pronta = useRef(onPronta);
  const [vista, setVista] = useState(false);
  useEffect(() => {
    pronta.current = onPronta;
  });

  useEffect(() => {
    let vivo = true;
    let map: MapLibre | null = null;
    let pulisci: void | (() => void);
    let ro: ResizeObserver | null = null;
    Promise.all([import("maplibre-gl"), stileRoma()]).then(([ml, stile]) => {
      if (!vivo || !div.current) return;
      ml.setWorkerUrl("/vendor/maplibre-worker");
      map = new ml.Map({
        container: div.current,
        style: stile,
        center: [centro[1], centro[0]],
        // entrata da film: si parte un po' piu' lontano e ruotati, poi la camera arriva (vedi load)
        zoom: fermo() || !conPannelli ? zoom : zoom - 1.25,
        bearing: fermo() || !conPannelli ? 0 : -14,
        maxPitch: 60,
        minZoom: 9.5,
        maxZoom: 19,
        maxBounds: [
          [11.95, 41.5],
          [13.05, 42.25],
        ],
        attributionControl: { compact: true, customAttribution: "OpenFreeMap" },
        dragRotate: false,
        pitchWithRotate: false,
        fadeDuration: 150,
      });
      map.touchZoomRotate.disableRotation();
      (map as MapLibre & { rrSenzaPannelli?: boolean }).rrSenzaPannelli = !conPannelli;
      map.setPadding(margini(map));
      const m = map;
      ro = new ResizeObserver(() => {
        m.resize();
        m.setPadding(margini(m));
      });
      ro.observe(div.current);
      // un livello o un'icona rifiutati dalla mappa non devono passare in silenzio
      m.on("error", (e) => console.warn("Mappa:", e.error?.message ?? e));
      m.once("load", () => {
        if (!vivo) return;
        atmosfera(m);
        setVista(true);
        pulisci = pronta.current(m, ml);
        if (!fermo() && conPannelli) m.easeTo({ zoom, bearing: 0, duration: 2600, easing: (t) => 1 - Math.pow(1 - t, 3) });
      });
    });
    return () => {
      vivo = false;
      ro?.disconnect();
      if (typeof pulisci === "function") pulisci();
      map?.remove();
    };
    // la mappa nasce una volta sola
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // la mappa sta dentro un contenitore che occupa tutto lo spazio: MapLibre mette position: relative sul suo
  // elemento (CSS fuori dai livelli di Tailwind, quindi vince sempre) e senza contenitore la mappa resterebbe alta 0
  return (
    <div className={`absolute inset-0 z-0 bg-[#F3EEE4] transition-opacity duration-500 ${vista ? "opacity-100" : "opacity-0"}`}>
      <div ref={div} role="region" aria-label={titolo} className="h-full w-full" />
    </div>
  );
}

/**
 * La mappa c'e' ancora? Cambiando pagina la mappa viene chiusa, ma dati, icone e animazioni possono arrivare
 * dopo: scriverli su una mappa chiusa fa crollare la pagina («Cannot read properties of undefined»).
 */
export function viva(map?: MapLibre | null): map is MapLibre {
  return !!map && !(map as MapLibre & { _removed?: boolean })._removed && !!(map as unknown as { style?: unknown }).style;
}

/** Aggiorna una sorgente GeoJSON solo se la mappa e la sorgente esistono ancora. */
export function dati(map: MapLibre | null | undefined, id: string, data: unknown) {
  if (!viva(map)) return;
  (map.getSource(id) as GeoJSONSource | undefined)?.setData(data as never);
}

/** Spazio occupato dai pannelli: il "centro" della mappa e' quello della parte libera. */
type Margini = { top: number; bottom: number; left: number; right: number };
export function margini(map?: MapLibre): Margini {
  if (typeof window === "undefined" || (map as (MapLibre & { rrSenzaPannelli?: boolean }) | undefined)?.rrSenzaPannelli) return { top: 0, bottom: 0, left: 0, right: 0 };
  const largo = window.matchMedia("(min-width: 1024px)").matches;
  return largo ? { top: 20, bottom: 20, left: 452, right: 20 } : { top: 90, bottom: 40, left: 0, right: 0 };
}

const fermo = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Porta un punto al centro della parte libera; sul telefono lascia posto alla scheda in basso. */
export function vola(map: MapLibre, lat: number, lon: number, zoom?: number, conScheda = true) {
  if (!viva(map)) return;
  const p = margini(map);
  if ((map as MapLibre & { rrSenzaPannelli?: boolean }).rrSenzaPannelli) conScheda = false;
  const largo = p.left > 0;
  const z = zoom ?? Math.max(map.getZoom(), 16);
  const vicino = z >= 15 && !(map as MapLibre & { rrSenzaPannelli?: boolean }).rrSenzaPannelli;
  map.flyTo({
    center: [lon, lat],
    zoom: z,
    // da vicino la camera si inclina sui palazzi in rilievo, con un filo di rotazione: si vede la citta' in 3D
    pitch: vicino ? 52 : 0,
    bearing: vicino ? -14 : 0,
    padding: largo ? p : { ...p, bottom: conScheda ? Math.round(window.innerHeight * 0.4) : p.bottom },
    duration: fermo() ? 0 : 1500,
    curve: 1.35,
    essential: true,
  });
}

/**
 * Toccando un simbolo: da vicino la camera si inclina dolcemente su di lui (stesso zoom, niente salti);
 * da lontano resta ferma, sul telefono lo porta solo sopra la scheda.
 */
export function inclina(map: MapLibre, lon: number, lat: number) {
  if (!viva(map)) return;
  const telefono = !window.matchMedia("(min-width: 1024px)").matches;
  const p = margini(map);
  const padding = telefono ? { ...p, bottom: Math.round(window.innerHeight * 0.4) } : p;
  if (map.getZoom() >= 14.5) map.easeTo({ center: [lon, lat], pitch: 50, bearing: -12, padding, duration: fermo() ? 0 : 1300, easing: (t) => 1 - Math.pow(1 - t, 3) });
  else if (telefono) map.easeTo({ center: [lon, lat], padding, duration: fermo() ? 0 : 450 });
}

/** Chiudendo una scheda la camera torna dritta, dall'alto. */
export function riposa(map?: MapLibre | null) {
  if (!viva(map) || (map.getPitch() < 1 && Math.abs(map.getBearing()) < 1)) return;
  map.easeTo({ pitch: 0, bearing: 0, duration: fermo() ? 0 : 900 });
}

/** Inquadra un'area. Il margine dei pannelli e' gia' nella mappa (setPadding): qui solo un po' d'aria in piu'. */
export function inquadra(map: MapLibre, b: [[number, number], [number, number]], conScheda = true) {
  if (!viva(map)) return;
  const senza = (map as MapLibre & { rrSenzaPannelli?: boolean }).rrSenzaPannelli;
  const largo = senza || margini(map).left > 0;
  map.setPadding(margini(map));
  const padding = largo ? { top: 30, bottom: 30, left: 30, right: 30 } : { top: 20, left: 20, right: 20, bottom: conScheda ? Math.round(window.innerHeight * 0.4) : 20 };
  const camera = map.cameraForBounds(b, { padding, bearing: 0 });
  if (!camera) return;
  map.easeTo({ ...camera, pitch: 0, bearing: 0, duration: fermo() ? 0 : 1100, easing: (t) => 1 - Math.pow(1 - t, 3) });
}
