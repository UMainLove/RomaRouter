"use client";

import type { Map as MapLibre } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import { AMBITI, ORDINE_AMBITI, type AmbitoId } from "@/lib/ambiti";
import { caricaIcone, GLIFI, segno } from "../mappa-rr/icone";
import { dati, MappaVettoriale, viva } from "../mappa-rr/MappaVettoriale";
import { primoTesto } from "../mappa-rr/stile";
import type { PropsMappa } from "./MappaSchematica";

/*
 * La mappa di ogni ambito: il fondo "Roma" di RomaRouter (MapLibre + OpenFreeMap Liberty ricolorato, vedi
 * components/mappa-rr) con i punti gia' filtrati dell'ambito. Ogni punto ha colore, forma e icona del suo
 * ambito (mai il colore da solo); il punto scelto ha l'anello; centro e raggio disegnano il cerchio.
 * Stesse props di prima: le viste non cambiano. (Prima era un iframe con la mappa dei quartieri.)
 */
const GLIFO: Record<AmbitoId, string> = { oggetti: GLIFI.chiave, sport: GLIFI.palla, antenne: GLIFI.traliccio, arte: GLIFI.nota };
const RISERVA: Record<AmbitoId, string> = { oggetti: "#a8327e", sport: "#12a06e", antenne: "#2a6fd6", arte: "#d4691a" };
const vuoto = { type: "FeatureCollection" as const, features: [] };

function cerchio(lon: number, lat: number, r: number, n = 72) {
  const k = 180 / Math.PI / 6371000;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = (i / n) * 2 * Math.PI;
    return [lon + (r * Math.cos(t) * k) / Math.cos((lat * Math.PI) / 180), lat + r * Math.sin(t) * k];
  });
}

export function Mappa({ titolo, punti, selezionato, onSeleziona, centro, raggioMetri, extra = [] }: PropsMappa & { titolo: string }) {
  const m = useRef<MapLibre | null>(null);
  // conta le mappe nate: con Next 16 una pagina nascosta e poi riaperta ricrea la mappa
  const [pronta, setPronta] = useState(0);
  const seleziona = useRef(onSeleziona);
  const inquadrato = useRef("");
  useEffect(() => {
    seleziona.current = onSeleziona;
  });

  const onPronta = useCallback((map: MapLibre) => {
    m.current = map;
    const radice = getComputedStyle(document.documentElement);
    const icone: Record<string, { svg: string; w: number; h: number }> = {};
    ORDINE_AMBITI.forEach((id) => {
      const colore = radice.getPropertyValue(`--color-${id}`).trim() || RISERVA[id];
      const forma = AMBITI[id].forma;
      icone[`pt-${id}`] = segno(colore, GLIFO[id], forma, 30);
      icone[`pt-${id}-sel`] = segno(colore, GLIFO[id], forma, 36, "#251D1C");
      icone[`pt-${id}-n`] = segno(colore, "", forma, 30);
      icone[`pt-${id}-n-sel`] = segno(colore, "", forma, 36, "#251D1C");
    });
    caricaIcone(map, icone);
    const sotto = primoTesto(map);
    ["rr-centro", "rr-extra", "rr-punti"].forEach((s) => map.addSource(s, { type: "geojson", data: vuoto }));
    map.addLayer({ id: "rr-centro-f", type: "fill", source: "rr-centro", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": "#251D1C", "fill-opacity": 0.05 } }, sotto);
    map.addLayer({ id: "rr-centro-l", type: "line", source: "rr-centro", filter: ["==", ["geometry-type"], "Polygon"], paint: { "line-color": "#251D1C", "line-width": 1.5, "line-dasharray": [3, 3], "line-opacity": 0.6 } }, sotto);
    map.addLayer({ id: "rr-centro-p", type: "circle", source: "rr-centro", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 7, "circle-color": "#251D1C", "circle-stroke-color": "#fff", "circle-stroke-width": 3 } });
    map.addLayer({
      id: "rr-extra",
      type: "circle",
      source: "rr-extra",
      paint: { "circle-radius": 5, "circle-color": "#5B3BA8", "circle-stroke-color": "#fff", "circle-stroke-width": 2 },
    });
    map.addLayer({
      id: "rr-extra-t",
      type: "symbol",
      source: "rr-extra",
      minzoom: 14,
      layout: { "text-field": ["get", "testo"], "text-font": ["Noto Sans Bold"], "text-size": 11, "text-offset": [0, 1.1], "text-anchor": "top", "text-optional": true },
      paint: { "text-color": "#5B3BA8", "text-halo-color": "#fff", "text-halo-width": 1.5 },
    });
    map.addLayer({
      id: "rr-punti",
      type: "symbol",
      source: "rr-punti",
      layout: {
        "icon-image": ["concat", "pt-", ["get", "ambito"], ["case", ["has", "conteggio"], "-n", ""], ["case", ["get", "sel"], "-sel", ""]],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.7, 14, 0.9, 17, 1.05],
        "icon-allow-overlap": true,
        "symbol-sort-key": ["case", ["get", "sel"], 0, 1],
        "text-field": ["step", ["zoom"], "", 15.5, ["case", ["has", "conteggio"], "", ["get", "nome"]]],
        "text-font": ["Noto Sans Bold"],
        "text-size": 11.5,
        "text-offset": [0, 1.6],
        "text-anchor": "top",
        "text-optional": true,
      },
      paint: { "text-color": "#251D1C", "text-halo-color": "#ffffff", "text-halo-width": 1.6 },
    });
    // il numero dentro il segno (es. oggetti trovati in una zona)
    map.addLayer({
      id: "rr-punti-n",
      type: "symbol",
      source: "rr-punti",
      filter: ["has", "conteggio"],
      layout: {
        "text-field": ["to-string", ["get", "conteggio"]],
        "text-font": ["Noto Sans Bold"],
        "text-size": 12.5,
        "text-offset": [0, -0.15],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: { "text-color": "#ffffff" },
    });
    map.on("click", "rr-punti", (e) => {
      const id = e.features?.[0]?.properties?.id;
      if (typeof id === "string") seleziona.current(id);
    });
    map.on("mouseenter", "rr-punti", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "rr-punti", () => (map.getCanvas().style.cursor = ""));
    setPronta((n) => n + 1);
  }, []);

  // punti, scelta, cerchio e segni extra
  useEffect(() => {
    const map = m.current;
    if (!map || !pronta || !viva(map)) return;
    dati(map, "rr-punti", {
      type: "FeatureCollection",
      features: punti.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lon, p.lat] },
        properties: { id: p.id, ambito: p.ambito, nome: p.nome, sel: p.id === selezionato, ...(p.conteggio != null ? { conteggio: p.conteggio } : {}) },
      })),
    });
    dati(map, "rr-extra", {
      type: "FeatureCollection",
      features: extra.map((x) => ({ type: "Feature", geometry: { type: "Point", coordinates: [x.lon, x.lat] }, properties: { testo: x.valore ?? x.etichetta } })),
    });
    dati(map, "rr-centro", 
      centro
        ? {
            type: "FeatureCollection",
            features: [
              ...(raggioMetri ? [{ type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [cerchio(centro.lon, centro.lat, raggioMetri)] } }] : []),
              { type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: [centro.lon, centro.lat] } },
            ],
          }
        : vuoto,
    );
    // inquadra quando cambiano i punti o il cerchio (non quando si sceglie un punto)
    const chiave = `${punti.map((p) => p.id).join(",")}|${centro?.lat},${centro?.lon},${raggioMetri}`;
    if (chiave === inquadrato.current) return;
    inquadrato.current = chiave;
    const coords: [number, number][] = centro && raggioMetri ? (cerchio(centro.lon, centro.lat, raggioMetri, 16) as [number, number][]) : punti.map((p) => [p.lon, p.lat]);
    if (!coords.length) return;
    const lons = coords.map((c) => c[0]), lats = coords.map((c) => c[1]);
    const fermo = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (coords.length === 1) map.easeTo({ center: coords[0], zoom: 15, duration: fermo ? 0 : 700 });
    else map.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: 48, maxZoom: 16, duration: fermo ? 0 : 700 });
  }, [pronta, punti, extra, selezionato, centro, raggioMetri]);

  // il punto scelto dall'elenco si porta in vista
  useEffect(() => {
    const map = m.current;
    const p = punti.find((x) => x.id === selezionato);
    if (!map || !pronta || !viva(map) || !p) return;
    if (!map.getBounds().contains([p.lon, p.lat])) map.easeTo({ center: [p.lon, p.lat], duration: 600 });
  }, [selezionato, punti, pronta]);

  return (
    <section aria-label={titolo} className="relative size-full min-h-[inherit] overflow-hidden bg-[#F3EEE4]">
      <MappaVettoriale centro={[41.8986, 12.4768]} zoom={12.5} titolo={titolo} onPronta={onPronta} conPannelli={false} />
    </section>
  );
}
