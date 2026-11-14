"use client";

import "leaflet/dist/leaflet.css";
import "./mappa.css";
import type * as Leaflet from "leaflet";
import { useEffect, useRef } from "react";

/*
 * Mappa leggera delle sezioni (arte di strada, antenne): Leaflet nella pagina, senza iframe e senza la
 * mappa completa dei quartieri. Fondo OpenStreetMap in grigio chiaro perche' i dati della sezione si
 * leggano subito. Leaflet si carica solo nel browser, dopo il resto della pagina.
 */
export type LeafletNS = typeof Leaflet;

/** Spazio coperto dai pannelli (SchermoMappa): a sinistra su computer, in basso su telefono. */
function margini(map: Leaflet.Map): { tl: [number, number]; br: [number, number] } {
  const largo = map.getSize().x >= 900 && window.matchMedia("(min-width: 1024px)").matches;
  return largo ? { tl: [450, 30], br: [40, 30] } : { tl: [20, 150], br: [20, 170] };
}

/** Porta un punto al centro della parte di mappa che si vede davvero (non sotto il pannello). */
export function volaA(map: Leaflet.Map, L: LeafletNS, punto: [number, number], zoom: number) {
  const { tl, br } = margini(map);
  const z = Math.min(zoom, map.getMaxZoom());
  const p = map.project(L.latLng(punto), z);
  const centro = map.unproject(p.subtract(L.point((tl[0] - br[0]) / 2, (tl[1] - br[1]) / 2)), z);
  map.flyTo(centro, z, { duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.6 });
}

/** Inquadra un'area lasciando libero lo spazio dei pannelli. */
export function inquadra(map: Leaflet.Map, b: Leaflet.LatLngBounds) {
  const { tl, br } = margini(map);
  map.flyToBounds(b, { paddingTopLeft: tl, paddingBottomRight: br, duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.6 });
}

export function MappaLeaflet({
  centro,
  zoom,
  titolo,
  onPronta,
}: {
  centro: [number, number];
  zoom: number;
  titolo: string;
  onPronta: (map: Leaflet.Map, L: LeafletNS) => void | (() => void);
}) {
  const div = useRef<HTMLDivElement>(null);
  const pronta = useRef(onPronta);
  useEffect(() => {
    pronta.current = onPronta;
  });

  useEffect(() => {
    let vivo = true;
    let mappa: Leaflet.Map | null = null;
    let pulisci: void | (() => void);
    let osservatore: ResizeObserver | null = null;
    import("leaflet").then((mod) => {
      const L = ((mod as unknown as { default?: LeafletNS }).default ?? mod) as LeafletNS;
      if (!vivo || !div.current) return;
      mappa = L.map(div.current, {
        zoomControl: false,
        preferCanvas: true,
        minZoom: 10,
        maxZoom: 19,
        maxBounds: [
          [41.55, 12.1],
          [42.2, 12.95],
        ],
        maxBoundsViscosity: 0.8,
      }).setView(centro, zoom);
      // il centro iniziale cade nella parte di mappa libera dai pannelli
      const { tl, br } = margini(mappa);
      mappa.panBy([-(tl[0] - br[0]) / 2, -(tl[1] - br[1]) / 2], { animate: false });
      L.control.zoom({ position: "bottomright", zoomInTitle: "Avvicina", zoomOutTitle: "Allontana" }).addTo(mappa);
      mappa.attributionControl.setPrefix(false);
      // OpenStreetMap senza chiavi, reso grigio e chiaro dal CSS (mappa.css): i colori restano ai dati
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        className: "rr-fondo",
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mappa);
      // il riquadro cambia misura (telefono ruotato, barra del browser, caratteri caricati): si ridisegna
      const m = mappa;
      osservatore = new ResizeObserver(() => m.invalidateSize({ pan: false }));
      osservatore.observe(div.current);
      pulisci = pronta.current(mappa, L);
    });
    return () => {
      vivo = false;
      osservatore?.disconnect();
      if (typeof pulisci === "function") pulisci();
      mappa?.remove();
    };
    // la mappa nasce una volta sola: centro e zoom iniziali non la ricreano
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={div} role="region" aria-label={titolo} className="absolute inset-0 z-0 bg-[#f2f1ee]" />;
}
