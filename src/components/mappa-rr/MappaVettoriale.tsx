"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import "./mappa.css";
import type { Map as MapLibre } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
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
        zoom,
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
        setVista(true);
        pulisci = pronta.current(m, ml);
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

  return (
    <div
      ref={div}
      role="region"
      aria-label={titolo}
      className={`absolute inset-0 z-0 bg-[#F3EEE4] transition-opacity duration-500 ${vista ? "opacity-100" : "opacity-0"}`}
    />
  );
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
  const p = margini(map);
  if ((map as MapLibre & { rrSenzaPannelli?: boolean }).rrSenzaPannelli) conScheda = false;
  const largo = p.left > 0;
  map.flyTo({
    center: [lon, lat],
    zoom: zoom ?? Math.max(map.getZoom(), 16),
    padding: largo ? p : { ...p, bottom: conScheda ? Math.round(window.innerHeight * 0.4) : p.bottom },
    duration: fermo() ? 0 : 900,
    essential: true,
  });
}

/** Inquadra un'area. Il margine dei pannelli e' gia' nella mappa (setPadding): qui solo un po' d'aria in piu'. */
export function inquadra(map: MapLibre, b: [[number, number], [number, number]], conScheda = true) {
  const senza = (map as MapLibre & { rrSenzaPannelli?: boolean }).rrSenzaPannelli;
  const largo = senza || margini(map).left > 0;
  map.setPadding(margini(map));
  map.fitBounds(b, {
    padding: largo ? { top: 30, bottom: 30, left: 30, right: 30 } : { top: 20, left: 20, right: 20, bottom: conScheda ? Math.round(window.innerHeight * 0.4) : 20 },
    duration: fermo() ? 0 : 900,
  });
}
