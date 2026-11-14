"use client";

import type { GeoJSONSource, Map as MapLibre, MapGeoJSONFeature } from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { orologio, type AttivitaArte } from "@/lib/orari-arte";
import type { VerificaLuogo } from "@/lib/artisti";
import { Cerca, type Luogo } from "../mappa-rr/Cerca";
import { caricaIcone, GLIFI, righe, spilla } from "../mappa-rr/icone";
import { inquadra, MappaVettoriale, vola, type ML } from "../mappa-rr/MappaVettoriale";
import { Azione, Azioni, Fatti, Scheda, Schermo, Strumenti, Tondo } from "../mappa-rr/Schermo";
import { primoTesto } from "../mappa-rr/stile";

/*
 * Arte di strada. Tre idee:
 *  1. la citta' si colora per la tua arte: scegli cosa fai e la mappa mostra dove puoi (zone per attivita');
 *  2. gli artisti sono in mappa: un avatar per disciplina, chi e' in scena adesso pulsa (Adesso / Oggi / Domani);
 *  3. i palchi: ogni postazione dice se e' libera ora; la scheda ha i turni di oggi e si prenota da li'.
 * Ogni scheda e' una schermata sola. Regole, contatti e fonti stanno nella Guida.
 */

type Modo = "esibirmi" | "guardare";
type Quando = "adesso" | "oggi" | "domani";
type Risultato = VerificaLuogo & { luogo: { etichetta: string } | null };
type Esib = { nome_arte: string; disciplina: string; descrizione: string | null; link: string | null; inizio: string; fine: string; luogo: string | null; postazione: string | null; pk: string | null; attivita: AttivitaArte; stato: string; demo: boolean };
type FEsib = { type: "Feature"; geometry: { type: "Point"; coordinates: [number, number] }; properties: Esib };
type Palco = { chiave: string; nome: string; tipo: string; regole: string | null; posizione_stimata: boolean; localizzazioni: number | null };
type FPalco = { type: "Feature"; geometry: { type: "Point"; coordinates: [number, number] }; properties: Palco };
type FZona = { type: "Feature"; geometry: unknown; properties: { e: string; u: boolean; v: string[]; n: string } };

const COL = { no: "#D32F2F", limitato: "#EF7D00", palchi: "#6D3FD0", dedicata: "#12905F", cond: "#C9A227", libero: "#12905F", occupato: "#C2185B", chiuso: "#8A807E" };
const ATT: { k: AttivitaArte; n: string; g: string; c: string; verbo: string }[] = [
  { k: "musica", n: "Musica", g: GLIFI.chitarra, c: "#C2185B", verbo: "suonare" },
  { k: "silenziosa", n: "Silenziosa", g: GLIFI.maschera, c: "#7B4FD0", verbo: "esibirti" },
  { k: "fuoco", n: "Fuoco", g: GLIFI.fuoco, c: "#E4572E", verbo: "fare il fuoco" },
  { k: "figurativa", n: "Ritratti", g: GLIFI.pennello, c: "#1E7FD8", verbo: "fare ritratti" },
  { k: "esoterica", n: "Tarocchi", g: GLIFI.stella, c: "#795548", verbo: "leggere le carte" },
];
const att = (k: string) => ATT.find((a) => a.k === k) ?? ATT[0];
const PALCHI_PER: Record<AttivitaArte, string[]> = {
  musica: ["postazione_allegatoB", "area_consentita"],
  silenziosa: ["postazione_allegatoB", "area_consentita"],
  fuoco: ["area_consentita"],
  figurativa: ["arti_figurative_area"],
  esoterica: ["area_esoterici"],
};
const TIPO_PALCO: Record<string, string> = {
  postazione_allegatoB: "Palco ufficiale · Allegato B",
  area_consentita: "Area per artisti · Municipio X",
  area_esoterici: "Area per cartomanti",
  arti_figurative_area: "Area per ritratti e caricature",
};
const PRIMA = new Date(0);
const ROMA = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(d);
const ora = (d: string | Date) => new Date(d).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
const metri = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`);
const aPiedi = (lat: number, lon: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;
const breve = (s: string) => s.replace(/ – scheda.*$/, "").replace(/\s*\(\d+ postazion[ei]\)$/, "");
function distanza(a: [number, number], b: [number, number]) {
  const k = Math.PI / 180, x = (b[0] - a[0]) * k * Math.cos(((a[1] + b[1]) / 2) * k), y = (b[1] - a[1]) * k;
  return Math.sqrt(x * x + y * y) * 6371000;
}

type Sel =
  | { tipo: "verdetto"; v: Risultato }
  | { tipo: "palco"; f: FPalco }
  | { tipo: "artista"; f: FEsib }
  | { tipo: "vicino"; lon: number; lat: number; etichetta: string | null }
  | { tipo: "annuncio"; lon: number; lat: number; luogo: string; fatto?: boolean }
  | null;

export function ArteMappa({ guida }: { guida: { id: string; nome: string; contenuto: ReactNode }[] }) {
  const [modo, setModo] = useState<Modo>("esibirmi");
  const [attivita, setAttivita] = useState<AttivitaArte>("musica");
  const [quando, setQuando] = useState<Quando>("oggi");
  const [sel, setSel] = useState<Sel>(null);
  const [carica, setCarica] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [guidaAperta, setGuidaAperta] = useState(false);
  const [esib, setEsib] = useState<FEsib[]>([]);
  const [palchi, setPalchi] = useState<FPalco[]>([]);
  const [zone, setZone] = useState<FZona[] | null>(null);
  const [pronto, setPronto] = useState(false);
  // l'ora si legge solo nel browser (la pagina si prepara sul server senza orologio)
  const [oraVera, setOraVera] = useState<Date | null>(null);
  const adesso = oraVera ?? PRIMA;
  const m = useRef<{ map: MapLibre; ml: ML } | null>(null);
  const condGrezze = useRef<FZona[]>([]);
  const stato = useRef({ modo, attivita });
  useEffect(() => {
    stato.current = { modo, attivita };
  });
  // l'orologio della mappa avanza da solo (palchi liberi o occupati, chi e' in scena)
  useEffect(() => {
    const subito = setTimeout(() => setOraVera(new Date()), 0);
    const t = setInterval(() => setOraVera(new Date()), 60_000);
    return () => {
      clearTimeout(subito);
      clearInterval(t);
    };
  }, []);

  const clock = orologio(adesso, attivita);

  // ------------------------------------------------------------------ dati derivati
  const oggi = ROMA(adesso), domani = ROMA(new Date(adesso.getTime() + 86_400_000));
  const inScena = useCallback((p: Esib) => new Date(p.inizio) <= adesso && adesso < new Date(p.fine), [adesso]);
  const visibili = useMemo(
    () =>
      esib.filter((f) => {
        const p = f.properties;
        if (quando === "adesso") return inScena(p);
        if (quando === "domani") return ROMA(new Date(p.inizio)) === domani;
        return ROMA(new Date(p.inizio)) === oggi && new Date(p.fine) > adesso;
      }),
    [esib, quando, oggi, domani, adesso, inScena],
  );
  const conteggi = useMemo(
    () => ({
      adesso: esib.filter((f) => inScena(f.properties)).length,
      oggi: esib.filter((f) => ROMA(new Date(f.properties.inizio)) === oggi && new Date(f.properties.fine) > adesso).length,
      domani: esib.filter((f) => ROMA(new Date(f.properties.inizio)) === domani).length,
    }),
    [esib, oggi, domani, adesso, inScena],
  );
  const statoPalco = useCallback(
    (f: FPalco) => {
      const qui = esib.filter((e) => e.properties.pk === f.properties.chiave);
      const ora = qui.find((e) => inScena(e.properties));
      if (ora) return { s: "occupato" as const, chi: ora, oggi: qui };
      return { s: clock.aperto ? ("libero" as const) : ("chiuso" as const), chi: null, oggi: qui };
    },
    [esib, inScena, clock.aperto],
  );

  // ------------------------------------------------------------------ verifica di un punto
  const verifica = useCallback(async (lat: number, lon: number, etichetta: string | null, a?: AttivitaArte) => {
    setCarica(true);
    setErrore(null);
    try {
      const r = await fetch(`/api/artisti/verifica?lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}&attivita=${a ?? stato.current.attivita}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.errore ?? "Verifica non riuscita");
      const v = d as Risultato;
      if (etichetta) v.luogo = { etichetta };
      setSel({ tipo: "verdetto", v });
    } catch (e) {
      setErrore((e as Error).message);
    } finally {
      setCarica(false);
    }
  }, []);

  const segnaPunto = useCallback((lon: number | null, lat?: number) => {
    const src = m.current?.map.getSource("rr-punto") as GeoJSONSource | undefined;
    src?.setData({ type: "FeatureCollection", features: lon == null ? [] : [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [lon, lat!] } }] });
  }, []);

  const tocca = useCallback(
    (lon: number, lat: number, etichetta: string | null, volaLi: boolean) => {
      segnaPunto(lon, lat);
      // sul telefono il punto toccato non deve finire sotto la scheda
      if (m.current && (volaLi || !window.matchMedia("(min-width: 1024px)").matches)) vola(m.current.map, lat, lon, volaLi ? 17 : m.current.map.getZoom());
      if (stato.current.modo === "guardare") setSel({ tipo: "vicino", lon, lat, etichetta });
      else verifica(lat, lon, etichetta);
    },
    [segnaPunto, verifica],
  );

  // ------------------------------------------------------------------ mappa
  const pronta = useCallback(
    (map: MapLibre, ml: ML) => {
      m.current = { map, ml };
      const sotto = primoTesto(map);
      const icone: Record<string, { svg: string; w: number; h: number }> = {
        "palco-libero": spilla(COL.libero, GLIFI.palco, 26),
        "palco-occupato": spilla(COL.occupato, GLIFI.palco, 26),
        "palco-chiuso": spilla(COL.chiuso, GLIFI.palco, 26),
        "righe-no": righe(COL.no),
      };
      ATT.forEach((a) => (icone[`art-${a.k}`] = spilla(a.c, a.g, 34)));
      caricaIcone(map, icone);

      const vuoto = { type: "FeatureCollection" as const, features: [] };
      ["rr-zone", "rr-cond", "rr-palchi", "rr-artisti", "rr-punto", "rr-sel"].forEach((s) => map.addSource(s, { type: "geojson", data: vuoto }));
      // velo: per ritratti e tarocchi la citta' si spegne e si accendono solo le aree dedicate
      map.addSource("rr-velo", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[11.9, 41.4], [13.1, 41.4], [13.1, 42.3], [11.9, 42.3], [11.9, 41.4]]] } } });
      map.addLayer({ id: "rr-velo", type: "fill", source: "rr-velo", paint: { "fill-color": "#2B2321", "fill-opacity": 0 } }, sotto);

      const colore = ["match", ["get", "s"], "no", COL.no, "limitato", COL.limitato, "palchi", COL.palchi, "dedicata", COL.dedicata, COL.cond];
      map.addLayer({ id: "rr-cond", type: "fill", source: "rr-cond", minzoom: 15, paint: { "fill-color": COL.cond, "fill-opacity": 0.1 } }, sotto);
      map.addLayer({ id: "rr-cond-l", type: "line", source: "rr-cond", minzoom: 15, paint: { "line-color": COL.cond, "line-width": 1, "line-opacity": 0.6 } }, sotto);
      map.addLayer({ id: "rr-zone", type: "fill", source: "rr-zone", paint: { "fill-color": colore as never, "fill-opacity": 0.17 } }, sotto);
      map.addLayer({ id: "rr-zone-righe", type: "fill", source: "rr-zone", filter: ["==", ["get", "s"], "no"], paint: { "fill-pattern": "righe-no" } }, sotto);
      map.addLayer({ id: "rr-zone-l", type: "line", source: "rr-zone", paint: { "line-color": colore as never, "line-width": ["interpolate", ["linear"], ["zoom"], 12, 1, 17, 2.4], "line-opacity": 0.9 } }, sotto);
      map.addLayer({ id: "rr-zone-dubbio", type: "line", source: "rr-zone", filter: ["==", ["get", "u"], false], paint: { "line-color": "#fff", "line-width": 1.6, "line-dasharray": [2, 2] } }, sotto);

      map.addLayer({
        id: "rr-palchi",
        type: "symbol",
        source: "rr-palchi",
        layout: {
          "icon-image": ["concat", "palco-", ["get", "s"]],
          "icon-size": ["interpolate", ["linear"], ["zoom"], 11, 0.55, 14, 0.8, 17, 1],
          "icon-allow-overlap": true,
          "text-field": ["step", ["zoom"], "", 16.5, ["get", "breve"]],
          "text-font": ["Noto Sans Bold"],
          "text-size": 11.5,
          "text-offset": [0, 1.6],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: { "text-color": "#3E3634", "text-halo-color": "#fff", "text-halo-width": 1.6 },
      });
      map.addLayer({ id: "rr-sel", type: "circle", source: "rr-sel", paint: { "circle-radius": 23, "circle-color": "#fff", "circle-opacity": 0.55, "circle-stroke-color": "#251D1C", "circle-stroke-width": 3 } });
      map.addLayer({ id: "rr-onda", type: "circle", source: "rr-artisti", filter: ["==", ["get", "ora"], true], paint: { "circle-color": ["get", "c"], "circle-radius": 16, "circle-opacity": 0.3 } });
      map.addLayer({
        id: "rr-artisti",
        type: "symbol",
        source: "rr-artisti",
        layout: {
          "icon-image": ["concat", "art-", ["get", "attivita"]],
          "icon-size": ["interpolate", ["linear"], ["zoom"], 11, 0.6, 14, 0.85, 17, 1.05],
          "icon-allow-overlap": true,
          "symbol-sort-key": ["case", ["get", "ora"], 0, 1],
          "text-field": ["step", ["zoom"], "", 15, ["format", ["get", "nome_arte"], {}, "\n", {}, ["get", "quando"], { "font-scale": 0.85 }]],
          "text-font": ["Noto Sans Bold"],
          "text-size": 12.5,
          "text-offset": [0, 1.7],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: { "text-color": "#251D1C", "text-halo-color": "#fff", "text-halo-width": 1.8 },
      });
      map.addLayer({ id: "rr-punto", type: "circle", source: "rr-punto", paint: { "circle-radius": 8, "circle-color": "#251D1C", "circle-stroke-color": "#fff", "circle-stroke-width": 3 } });

      // onda animata per chi e' in scena (solo se il movimento e' permesso)
      let raf = 0;
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const giro = (t: number) => {
          const f = (t % 2000) / 2000;
          if (map.getLayer("rr-onda")) {
            map.setPaintProperty("rr-onda", "circle-radius", 14 + f * 22);
            map.setPaintProperty("rr-onda", "circle-opacity", 0.38 * (1 - f));
          }
          raf = requestAnimationFrame(giro);
        };
        raf = requestAnimationFrame(giro);
      }

      fetch("/api/artisti/zone?leggero=1").then((r) => r.json()).then((fc: { features: FZona[] }) => setZone(fc.features)).catch(() => setErrore("Le zone non si sono caricate"));
      fetch("/api/artisti/postazioni").then((r) => r.json()).then((fc: { features: FPalco[] }) => setPalchi(fc.features)).catch(() => {});
      fetch("/api/artisti/esibizioni?giorni=2").then((r) => r.json()).then((fc: { features: FEsib[] }) => setEsib(fc.features)).catch(() => {});

      // scuole, chiese, ospedali, monumenti: solo da vicino
      let ultimo = "";
      const cond = () => {
        if (map.getZoom() < 15) return;
        const b = map.getBounds();
        const k = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((x) => x.toFixed(3)).join(",");
        if (k === ultimo) return;
        ultimo = k;
        fetch(`/api/artisti/zone?leggero=1&esiti=condizioni&bbox=${k}`)
          .then((r) => r.json())
          .then((fc: { features: FZona[] }) => {
            if (k !== ultimo) return;
            condGrezze.current = fc.features;
            const a = stato.current.attivita;
            const features = fc.features.filter((f) => f.properties.v.length === 0 || f.properties.v.includes(a));
            (map.getSource("rr-cond") as GeoJSONSource).setData({ type: "FeatureCollection", features } as never);
          })
          .catch(() => {});
      };
      map.on("moveend", cond);

      const cliccabili = ["rr-artisti", "rr-palchi"];
      map.on("click", (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: cliccabili })[0] as MapGeoJSONFeature | undefined;
        if (f) {
          segnaPunto(null);
          if (!window.matchMedia("(min-width: 1024px)").matches) {
            const [x, y] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates;
            vola(map, y, x, map.getZoom());
          }
          const g = { type: "Feature" as const, geometry: f.geometry as FEsib["geometry"], properties: f.properties };
          if (f.layer.id === "rr-artisti") setSel({ tipo: "artista", f: g as unknown as FEsib });
          else setSel({ tipo: "palco", f: g as unknown as FPalco });
          return;
        }
        tocca(e.lngLat.lng, e.lngLat.lat, null, false);
      });
      cliccabili.forEach((l) => {
        map.on("mouseenter", l, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", l, () => (map.getCanvas().style.cursor = ""));
      });
      setPronto(true);
      return () => cancelAnimationFrame(raf);
    },
    [segnaPunto, tocca],
  );

  // 1. la citta' si colora per l'attivita' scelta
  useEffect(() => {
    const k = m.current;
    if (!k || !pronto || !zone) return;
    const dedicate = attivita === "figurativa" || attivita === "esoterica";
    const features = zone
      .map((f) => {
        const { e, v } = f.properties;
        const vale = v.length === 0 || v.includes(attivita);
        let s: string | null = null;
        if (e === "area_dedicata" && (v.length === 0 ? !dedicate : v.includes(attivita))) s = "dedicata";
        else if (!dedicate && vale && e === "no") s = "no";
        else if (!dedicate && vale && e === "solo_silenzio") s = "limitato";
        else if (!dedicate && e === "solo_postazioni") s = attivita === "fuoco" ? "no" : "palchi";
        return s ? { ...f, properties: { ...f.properties, s } } : null;
      })
      .filter(Boolean);
    (k.map.getSource("rr-zone") as GeoJSONSource).setData({ type: "FeatureCollection", features } as never);
    const cond = condGrezze.current.filter((f) => f.properties.v.length === 0 || f.properties.v.includes(attivita));
    (k.map.getSource("rr-cond") as GeoJSONSource).setData({ type: "FeatureCollection", features: cond } as never);
    const guarda = modo === "guardare";
    k.map.setPaintProperty("rr-velo", "fill-opacity", dedicate && !guarda ? 0.2 : 0);
    k.map.setPaintProperty("rr-zone", "fill-opacity", guarda ? 0.05 : ["match", ["get", "s"], "no", 0.16, "dedicata", 0.3, 0.17]);
    k.map.setPaintProperty("rr-zone-righe", "fill-opacity", guarda ? 0 : 1);
    k.map.setPaintProperty("rr-zone-l", "line-opacity", guarda ? 0.22 : 0.9);
    k.map.setPaintProperty("rr-zone-dubbio", "line-opacity", guarda ? 0 : 1);
    ["rr-cond", "rr-cond-l"].forEach((l) => k.map.setLayoutProperty(l, "visibility", guarda ? "none" : "visible"));
  }, [zone, attivita, modo, pronto]);

  // 2 e 3. palchi (liberi, occupati, chiusi) e artisti
  useEffect(() => {
    const k = m.current;
    if (!k || !pronto) return;
    const tipi = PALCHI_PER[attivita];
    const fp = palchi
      .filter((f) => modo === "guardare" || tipi.includes(f.properties.tipo))
      .map((f) => ({ ...f, properties: { ...f.properties, s: statoPalco(f).s, breve: breve(f.properties.nome) } }));
    (k.map.getSource("rr-palchi") as GeoJSONSource).setData({ type: "FeatureCollection", features: fp } as never);
    const restantiOggi = esib.filter((f) => ROMA(new Date(f.properties.inizio)) === oggi && new Date(f.properties.fine) > adesso);
    const perChiSuona = restantiOggi.length ? restantiOggi : esib.filter((f) => ROMA(new Date(f.properties.inizio)) === domani);
    const fa = (modo === "guardare" ? visibili : perChiSuona).map((f) => {
      const p = f.properties;
      const vivo = inScena(p);
      const altroGiorno = ROMA(new Date(p.inizio)) !== oggi;
      return { ...f, properties: { ...p, ora: vivo, c: att(p.attivita).c, quando: vivo ? `in scena fino alle ${ora(p.fine)}` : `${altroGiorno ? "domani " : ""}${ora(p.inizio)}` } };
    });
    (k.map.getSource("rr-artisti") as GeoJSONSource).setData({ type: "FeatureCollection", features: fa } as never);
    k.map.setLayoutProperty("rr-palchi", "icon-size", modo === "guardare" ? ["interpolate", ["linear"], ["zoom"], 11, 0.4, 16, 0.65] : ["interpolate", ["linear"], ["zoom"], 11, 0.55, 14, 0.8, 17, 1]);
  }, [palchi, esib, visibili, modo, attivita, statoPalco, inScena, pronto, oggi, domani, adesso]);

  // l'anello sul simbolo scelto (palco o artista)
  useEffect(() => {
    const src = m.current?.map.getSource("rr-sel") as GeoJSONSource | undefined;
    const c = sel?.tipo === "palco" || sel?.tipo === "artista" ? sel.f.geometry.coordinates : null;
    src?.setData({ type: "FeatureCollection", features: c ? [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: c } }] : [] });
  }, [sel, pronto]);

  // ------------------------------------------------------------------ comandi
  function cambiaAttivita(a: AttivitaArte) {
    setAttivita(a);
    if (sel?.tipo === "verdetto") verifica(sel.v.punto.lat, sel.v.punto.lon, sel.v.luogo?.etichetta ?? null, a);
    else if (sel?.tipo === "palco") setSel(null);
  }
  function cambiaModo(md: Modo) {
    setModo(md);
    setSel(null);
    segnaPunto(null);
  }
  function trovami() {
    navigator.geolocation?.getCurrentPosition(
      (p) => tocca(p.coords.longitude, p.coords.latitude, "La tua posizione", true),
      () => setErrore("Non riesco a sapere dove sei: controlla il permesso di posizione"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }
  function apriPalcoVicino(lat: number, lon: number) {
    const f = palchi
      .filter((x) => PALCHI_PER[attivita].includes(x.properties.tipo))
      .sort((a, b) => distanza([lon, lat], a.geometry.coordinates) - distanza([lon, lat], b.geometry.coordinates))[0];
    if (!f || !m.current) return;
    vola(m.current.map, f.geometry.coordinates[1], f.geometry.coordinates[0], 17);
    segnaPunto(null);
    setSel({ tipo: "palco", f });
  }
  const chiudi = () => {
    setSel(null);
    segnaPunto(null);
  };

  // ------------------------------------------------------------------ barra
  const barra = (
    <div className="flex flex-col gap-2">
      <Cerca
        endpoint="/api/artisti/indirizzo"
        etichetta="Cerca un indirizzo"
        segnaposto={modo === "esibirmi" ? "Dove vuoi esibirti?" : "Dove vuoi vedere artisti?"}
        carica={carica}
        onScelto={(l: Luogo) => tocca(l.lon, l.lat, l.etichetta, true)}
        coda={<Strumenti onGuida={() => setGuidaAperta(true)} onTrovami={trovami} />}
      />
      <div className={`rounded-[20px] bg-panel p-1.5 shadow-[0_2px_6px_rgba(37,29,28,.08),0_10px_30px_rgba(37,29,28,.12)] ring-1 ring-black/5 ${sel ? "max-lg:hidden" : ""}`}>
        <div role="group" aria-label="Cosa vuoi fare" className="grid grid-cols-2 rounded-[14px] bg-bg-sink p-[3px]">
          {(
            [
              ["esibirmi", "Mi esibisco"],
              ["guardare", "Voglio guardare"],
            ] as const
          ).map(([v, t]) => (
            <button
              key={v}
              type="button"
              aria-pressed={modo === v}
              onClick={() => cambiaModo(v)}
              className={`h-9 rounded-[11px] text-[14px] font-bold transition ${modo === v ? "bg-panel text-ink shadow-[0_1px_4px_rgba(37,29,28,.16)]" : "text-ink-soft hover:text-ink"}`}
            >
              {t}
            </button>
          ))}
        </div>
        {modo === "esibirmi" ? (
          <div role="group" aria-label="Cosa fai" className="mt-1.5 grid grid-cols-5 gap-1">
            {ATT.map((a) => {
              const on = attivita === a.k;
              return (
                <button
                  key={a.k}
                  type="button"
                  aria-pressed={on}
                  onClick={() => cambiaAttivita(a.k)}
                  className={`flex flex-col items-center gap-1 rounded-[12px] py-1.5 text-[11.5px] font-bold transition ${on ? "text-ink" : "text-muted hover:bg-bg-sink hover:text-ink"}`}
                  style={on ? { background: `${a.c}14` } : undefined}
                >
                  <span className="flex size-8 items-center justify-center rounded-full transition" style={{ background: on ? a.c : "#ECE7DF", boxShadow: on ? `0 3px 10px ${a.c}55` : undefined }}>
                    <svg viewBox="0 0 24 24" className="size-[17px]" fill="none" stroke={on ? "#fff" : "#6F6560"} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: a.g }} />
                  </span>
                  {a.n}
                </button>
              );
            })}
          </div>
        ) : (
          <div role="group" aria-label="Quando" className="mt-1.5 grid grid-cols-3 gap-1">
            {(
              [
                ["adesso", "in scena ora"],
                ["oggi", "oggi"],
                ["domani", "domani"],
              ] as const
            ).map(([v, t]) => {
              const on = quando === v;
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setQuando(v)}
                  className={`flex flex-col items-center rounded-[12px] py-1.5 transition ${on ? "bg-[#C2185B14]" : "hover:bg-bg-sink"}`}
                >
                  <span className={`text-[20px] leading-6 font-extrabold tabular-nums ${on ? "text-[#C2185B]" : "text-ink"}`}>{conteggi[v]}</span>
                  <span className={`flex items-center gap-1 text-[11.5px] font-bold ${on ? "text-ink" : "text-muted"}`}>
                    {v === "adesso" && <span className="size-1.5 rounded-full bg-[#C2185B]" aria-hidden="true" />}
                    {t}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {modo === "esibirmi" && (
          <p className={`mt-1 flex items-center gap-2 rounded-[12px] px-2.5 py-1.5 text-[12.5px] font-bold ${clock.aperto ? "bg-ok-tint text-ok" : "bg-attenzione-tint text-attenzione"}`}>
            <span className={`size-2 rounded-full ${clock.aperto ? "bg-ok" : "bg-attenzione"}`} aria-hidden="true" />
            {clock.testo}
            <span className="ml-auto font-semibold opacity-75">max 2 ore</span>
          </p>
        )}
      </div>
    </div>
  );

  // ------------------------------------------------------------------ schede
  let scheda: ReactNode = null;
  if (errore) {
    scheda = (
      <Scheda icona={<Tondo colore={COL.chiuso} glifo={GLIFI.stella} />} titolo="Qualcosa non va" onChiudi={() => setErrore(null)}>
        <p className="text-[15px] text-ink-soft">{errore}</p>
      </Scheda>
    );
  } else if (sel?.tipo === "verdetto") {
    scheda = (
      <SchedaVerdetto
        v={sel.v}
        attivita={attivita}
        clock={clock}
        onChiudi={chiudi}
        onAnnuncia={() => setSel({ tipo: "annuncio", lon: sel.v.punto.lon, lat: sel.v.punto.lat, luogo: sel.v.luogo?.etichetta ?? "Punto scelto sulla mappa" })}
        onPalco={() => apriPalcoVicino(sel.v.punto.lat, sel.v.punto.lon)}
        onGuida={() => setGuidaAperta(true)}
      />
    );
  } else if (sel?.tipo === "palco") {
    scheda = (
      <SchedaPalco
        f={sel.f}
        info={statoPalco(sel.f)}
        clock={clock}
        adesso={adesso}
        onChiudi={chiudi}
        onPrenota={() => setSel({ tipo: "annuncio", lon: sel.f.geometry.coordinates[0], lat: sel.f.geometry.coordinates[1], luogo: sel.f.properties.nome })}
        onArtista={(f) => setSel({ tipo: "artista", f })}
      />
    );
  } else if (sel?.tipo === "artista") {
    scheda = (
      <SchedaArtista
        f={sel.f}
        vivo={inScena(sel.f.properties)}
        onChiudi={chiudi}
        onVicino={() => setSel({ tipo: "vicino", lon: sel.f.geometry.coordinates[0], lat: sel.f.geometry.coordinates[1], etichetta: breve(sel.f.properties.postazione ?? sel.f.properties.luogo ?? "") || null })}
      />
    );
  } else if (sel?.tipo === "vicino") {
    scheda = (
      <SchedaVicino
        lon={sel.lon}
        lat={sel.lat}
        etichetta={sel.etichetta}
        esib={esib}
        inScena={inScena}
        oggi={oggi}
        adesso={adesso}
        onChiudi={chiudi}
        onArtista={(f) => setSel({ tipo: "artista", f })}
        onInquadra={(b) => m.current && inquadra(m.current.map, b)}
      />
    );
  } else if (sel?.tipo === "annuncio") {
    scheda = (
      <SchedaAnnuncio
        {...sel}
        attivita={attivita}
        onChiudi={chiudi}
        onFatto={() => {
          fetch("/api/artisti/esibizioni?giorni=2").then((r) => r.json()).then((fc: { features: FEsib[] }) => setEsib(fc.features)).catch(() => {});
          setSel({ ...sel, fatto: true });
        }}
      />
    );
  }

  return (
    <Schermo
      mappa={<MappaVettoriale centro={[41.8986, 12.4768]} zoom={14.6} titolo="Mappa dell'arte di strada a Roma" onPronta={pronta} />}
      barra={barra}
      scheda={scheda ?? <Legenda modo={modo} attivita={attivita} />}
      guida={{ titolo: "Arte di strada a Roma", schede: guida }}
      guidaAperta={guidaAperta}
      onGuida={setGuidaAperta}
    />
  );
}

// ==================================================================== barra e legenda
function Legenda({ modo, attivita }: { modo: Modo; attivita: AttivitaArte }) {
  const dedicate = attivita === "figurativa" || attivita === "esoterica";
  const voci =
    modo === "guardare"
      ? ATT.map((a) => ({ c: a.c, t: a.n, tondo: true }))
      : dedicate
        ? [
            { c: COL.dedicata, t: "Le tue aree" },
            { c: COL.libero, t: "Posto libero", tondo: true },
            { c: COL.occupato, t: "Occupato ora", tondo: true },
          ]
        : [
            { c: COL.no, t: "Vietato" },
            { c: COL.limitato, t: "Solo silenzio" },
            { c: COL.palchi, t: "Solo sui palchi" },
            { c: COL.libero, t: "Palco libero", tondo: true },
            { c: COL.occupato, t: "Occupato", tondo: true },
            { c: COL.chiuso, t: "Chiuso ora", tondo: true },
          ];
  return (
    <div className="pointer-events-auto rounded-[20px] bg-panel/95 px-4 py-3 shadow-[0_6px_24px_rgba(37,29,28,.16)] ring-1 ring-black/5 backdrop-blur">
      <p className="text-[14px] font-bold text-ink">{modo === "guardare" ? "Tocca un artista o un punto della mappa" : "Tocca un punto: ti dico se puoi esibirti lì"}</p>
      {modo === "guardare" && <p className="mt-0.5 text-[12px] text-muted">Chi è in scena adesso ha l&apos;onda intorno.</p>}
      <ul className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[12.5px] font-semibold text-ink-soft">
        {voci.map((x) => (
          <li key={x.t} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={x.tondo ? "size-3 rounded-full ring-2 ring-white" : "h-3 w-4 rounded-[4px] border-2"} style={x.tondo ? { background: x.c } : { borderColor: x.c, background: `${x.c}33` }} />
            {x.t}
          </li>
        ))}
      </ul>
      {modo === "esibirmi" && !dedicate && <p className="mt-1.5 text-[12px] text-muted">Dove non c&apos;è colore valgono le regole generali: si può, con orari e preavviso.</p>}
    </div>
  );
}

// ==================================================================== schede
const TITOLI: Record<string, (verbo: string) => string> = {
  si: (v) => `Sì, puoi ${v} qui`,
  si_condizioni: () => "Sì, con una condizione",
  solo_postazioni: () => "Solo sui palchi numerati",
  solo_area_dedicata: () => "Solo nelle aree dedicate",
  solo_silenzio: () => "Qui solo esibizioni silenziose",
  probabilmente_no: () => "Meglio di no: divieto da verificare",
  no: () => "No, qui è vietato",
};
const TONO: Record<string, { bg: string; fg: string }> = {
  ok: { bg: "bg-ok-tint", fg: "text-ok" },
  attenzione: { bg: "bg-attenzione-tint", fg: "text-attenzione" },
  errore: { bg: "bg-errore-tint", fg: "text-errore" },
};

function preavviso(v: Risultato) {
  const pl = v.contatti_polizia_locale;
  if (!pl?.pec_pl) return null;
  const oggetto = "Comunicazione esibizione arte di strada – art. 10 DAC 24/2012";
  const corpo = [
    `Al ${pl.gruppo_pl ?? "Gruppo di Polizia Locale"},`,
    "",
    `il/la sottoscritto/a [nome e cognome] comunica, ai sensi dell'art. 10 del Regolamento per l'arte di strada (DAC 24/2012), che si esibirà (${v.attivita.nome.toLowerCase()}):`,
    `- luogo: ${v.luogo?.etichetta ?? `${v.punto.lat.toFixed(5)}, ${v.punto.lon.toFixed(5)}`}${v.municipio ? ` (Municipio ${v.municipio.numero_romano})` : ""}`,
    "- giorno: [gg/mm/aaaa]",
    `- orario: [dalle … alle …] (fasce: ${v.orario?.testo ?? "art. 6"}, massimo 2 ore)`,
    "",
    "Occuperà al massimo 1 m² lasciando 2 m di marciapiede liberi.",
    "",
    "[nome e cognome, recapito]",
  ].join("\n");
  return `mailto:${pl.pec_pl}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`;
}

function SchedaVerdetto({ v, attivita, clock, onChiudi, onAnnuncia, onPalco, onGuida }: { v: Risultato; attivita: AttivitaArte; clock: ReturnType<typeof orologio>; onChiudi: () => void; onAnnuncia: () => void; onPalco: () => void; onGuida: () => void }) {
  const a = att(attivita);
  const t = TONO[v.esito.tono];
  const motivo = v.motivi[0] ?? (v.esito.codice === "si_condizioni" ? v.condizioni[0] : null);
  // il palco piu' vicino adatto a quello che fai (non l'area dei cartomanti per chi suona)
  const palco = v.postazioni_vicine.find((p) => PALCHI_PER[attivita].includes(p.tipo));
  const consentito = ["si", "si_condizioni"].includes(v.esito.codice) || (v.esito.codice === "solo_postazioni" && !!palco && palco.distanza_m <= 20);
  const mail = preavviso(v);
  return (
    <Scheda icona={<Tondo colore={a.c} glifo={a.g} />} sopra={`${v.municipio ? `Municipio ${v.municipio.numero_romano} · ` : ""}${a.n}`} titolo={titoloLuogo(v.luogo?.etichetta)} onChiudi={onChiudi}>
      <div className={`rounded-[16px] px-3.5 py-3 ${t.bg}`}>
        <p className={`text-[19px] leading-6 font-extrabold tracking-[-.01em] ${t.fg}`}>{TITOLI[v.esito.codice]?.(a.verbo) ?? v.esito.titolo}</p>
        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink-soft">
          {motivo ? motivo.testo.replace(/\s*\([^()]*\)\s*$/, "") : "Valgono le regole generali del regolamento di Roma."}
          {motivo && !motivo.ufficiale && <span className="font-bold text-attenzione"> · da verificare</span>}
        </p>
      </div>
      <div className="mt-2.5">
        <Fatti
          voci={[
            { l: "Orario", v: clock.aperto ? `fino ${clock.ora}` : `dalle ${clock.ora}`, tono: clock.aperto ? "ok" : "no", nota: clock.aperto ? "si può adesso" : "adesso no" },
            { l: "Durata", v: "2 ore", nota: "per fascia" },
            palco ? { l: "Palco vicino", v: metri(palco.distanza_m), nota: breve(palco.nome) } : { l: "Preavviso", v: "3 giorni", nota: "alla Polizia Locale" },
          ]}
        />
      </div>
      <Azioni>
        {consentito ? (
          <Azione primaria onClick={onAnnuncia}>Annuncia qui</Azione>
        ) : palco ? (
          <Azione primaria onClick={onPalco}>Vai al palco</Azione>
        ) : (
          <Azione primaria onClick={onGuida}>Dove si può</Azione>
        )}
        {mail ? <Azione href={mail}>Preavviso PEC</Azione> : <Azione onClick={onGuida}>Le regole</Azione>}
      </Azioni>
    </Scheda>
  );
}
const titoloLuogo = (s?: string | null) => {
  if (!s) return "Punto scelto sulla mappa";
  if (s !== s.toUpperCase()) return s;
  // "PIAZZA DI S. MARIA" -> "Piazza di S. Maria": parole brevi minuscole, il resto con l'iniziale maiuscola
  return s.toLowerCase().replace(/(^|[\s'(-])(\p{L})(\p{L}*)/gu, (m, sep: string, a: string, b: string) =>
    /^(di|del|della|dei|delle|degli|dello|da|de|e|in|al|alla|ai|alle)$/.test(a + b) && sep ? sep + a + b : sep + a.toUpperCase() + b);
};

function SchedaPalco({ f, info, clock, adesso, onChiudi, onPrenota, onArtista }: { f: FPalco; info: { s: "libero" | "occupato" | "chiuso"; chi: FEsib | null; oggi: FEsib[] }; clock: ReturnType<typeof orologio>; adesso: Date; onChiudi: () => void; onPrenota: () => void; onArtista: (f: FEsib) => void }) {
  const p = f.properties;
  const colore = info.s === "libero" ? COL.libero : info.s === "occupato" ? COL.occupato : COL.chiuso;
  const oggiRoma = ROMA(adesso);
  const turni = info.oggi.filter((e) => ROMA(new Date(e.properties.inizio)) === oggiRoma).sort((a, b) => a.properties.inizio.localeCompare(b.properties.inizio));
  const [lon, lat] = f.geometry.coordinates;
  return (
    <Scheda icona={<Tondo colore={colore} glifo={GLIFI.palco} />} sopra={TIPO_PALCO[p.tipo] ?? "Postazione"} titolo={breve(p.nome)} onChiudi={onChiudi}>
      <div className="rounded-[16px] bg-bg-sink px-3.5 py-3">
        <p className="text-[19px] leading-6 font-extrabold tracking-[-.01em]" style={{ color: colore }}>
          {info.chi ? `Occupato fino alle ${ora(info.chi.properties.fine)}` : info.s === "libero" ? "Libero adesso" : clock.testo.replace("Ora no: r", "R")}
        </p>
        {info.chi ? (
          <button type="button" onClick={() => onArtista(info.chi!)} className="mt-0.5 max-w-full truncate text-left text-[13px] font-semibold text-ink-soft underline decoration-line underline-offset-2">
            In scena: {info.chi.properties.nome_arte} · {info.chi.properties.disciplina}
          </button>
        ) : (
          <p className="mt-0.5 truncate text-[13px] text-ink-soft">
            {p.tipo === "postazione_allegatoB" ? "Senza amplificazione, al massimo 2 ore." : p.tipo === "arti_figurative_area" ? "Solo con il posto assegnato dal Comune." : "Al massimo 2 ore per fascia."}
          </p>
        )}
        <Turni turni={turni} adesso={adesso} />
      </div>
      <Azioni>
        <Azione primaria onClick={onPrenota}>Prenota un turno</Azione>
        <Azione href={aPiedi(lat, lon)}>Portami lì</Azione>
      </Azioni>
    </Scheda>
  );
}

/** I turni di oggi su una riga: 10 → 22, i blocchi occupati, la pausa 13–16, la lancetta di adesso. */
function Turni({ turni, adesso }: { turni: FEsib[]; adesso: Date }) {
  const DA = 10, A = 22, span = A - DA;
  const pos = (d: Date) => {
    const [h, mi] = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome", hourCycle: "h23" }).split(":").map(Number);
    return Math.min(100, Math.max(0, ((h + mi / 60 - DA) / span) * 100));
  };
  const now = pos(adesso);
  return (
    <div className="mt-2.5" role="img" aria-label={`Turni di oggi: ${turni.length ? turni.map((t) => `${t.properties.nome_arte} ${ora(t.properties.inizio)}–${ora(t.properties.fine)}`).join(", ") : "nessuno"}`}>
      <div className="relative h-5 overflow-hidden rounded-full bg-panel ring-1 ring-line">
        <div className="absolute inset-y-0 bg-[repeating-linear-gradient(135deg,#E6E0D6_0_4px,transparent_4px_8px)]" style={{ left: `${((13 - DA) / span) * 100}%`, width: `${(3 / span) * 100}%` }} />
        {turni.map((t) => (
          <div
            key={t.properties.inizio + t.properties.nome_arte}
            className="absolute inset-y-[3px] rounded-full"
            title={`${t.properties.nome_arte} ${ora(t.properties.inizio)}–${ora(t.properties.fine)}`}
            style={{ left: `${pos(new Date(t.properties.inizio))}%`, width: `${Math.max(2, pos(new Date(t.properties.fine)) - pos(new Date(t.properties.inizio)))}%`, background: att(t.properties.attivita).c }}
          />
        ))}
        {now > 0 && now < 100 && <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${now}%` }} />}
      </div>
      <div className="mt-1 flex justify-between text-[10.5px] font-semibold text-muted tabular-nums">
        {[10, 13, 16, 19, 22].map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
    </div>
  );
}

function SchedaArtista({ f, vivo, onChiudi, onVicino }: { f: FEsib; vivo: boolean; onChiudi: () => void; onVicino: () => void }) {
  const p = f.properties;
  const a = att(p.attivita);
  const [lon, lat] = f.geometry.coordinates;
  const giorno = ROMA(new Date(p.inizio)) === ROMA(new Date()) ? "Oggi" : "Domani";
  return (
    <Scheda icona={<Tondo colore={a.c} glifo={a.g} grande />} sopra={p.disciplina} titolo={p.nome_arte} onChiudi={onChiudi}>
      <div className="rounded-[16px] bg-bg-sink px-3.5 py-3">
        <p className="flex items-center gap-2 text-[19px] leading-6 font-extrabold tracking-[-.01em]" style={{ color: vivo ? COL.occupato : "#251D1C" }}>
          {vivo && (
            <span className="relative flex size-2.5" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#C2185B] opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2.5 rounded-full bg-[#C2185B]" />
            </span>
          )}
          {vivo ? `In scena fino alle ${ora(p.fine)}` : `${giorno} alle ${ora(p.inizio)}`}
        </p>
        <p className="mt-0.5 truncate text-[13px] font-semibold text-ink-soft">{breve(p.postazione ?? p.luogo ?? "")}</p>
        {p.descrizione && <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-ink-soft">{p.descrizione}</p>}
        {p.demo && <p className="mt-1 text-[11px] text-muted">Esibizione di esempio</p>}
      </div>
      <Azioni>
        <Azione primaria href={aPiedi(lat, lon)}>Portami lì</Azione>
        <Azione onClick={onVicino}>Chi c&apos;è vicino</Azione>
      </Azioni>
    </Scheda>
  );
}

function SchedaVicino({ lon, lat, etichetta, esib, inScena, oggi, adesso, onChiudi, onArtista, onInquadra }: { lon: number; lat: number; etichetta: string | null; esib: FEsib[]; inScena: (p: Esib) => boolean; oggi: string; adesso: Date; onChiudi: () => void; onArtista: (f: FEsib) => void; onInquadra: (b: [[number, number], [number, number]]) => void }) {
  const vicini = esib
    .filter((f) => ROMA(new Date(f.properties.inizio)) === oggi && new Date(f.properties.fine) > adesso)
    .map((f) => ({ f, d: distanza([lon, lat], f.geometry.coordinates) }))
    .filter((x) => x.d <= 800)
    .sort((a, b) => Number(inScena(b.f.properties)) - Number(inScena(a.f.properties)) || a.f.properties.inizio.localeCompare(b.f.properties.inizio));
  const inOnda = vicini.filter((x) => inScena(x.f.properties)).length;
  return (
    <Scheda icona={<Tondo colore={COL.occupato} glifo={GLIFI.maschera} />} sopra="Qui intorno, oggi" titolo={titoloLuogo(etichetta)} onChiudi={onChiudi}>
      <div className="rounded-[16px] bg-bg-sink px-3.5 py-3">
        <p className="text-[19px] leading-6 font-extrabold tracking-[-.01em] text-ink">
          {vicini.length === 0 ? "Nessun artista qui oggi" : `${vicini.length} ${vicini.length === 1 ? "artista" : "artisti"} entro 800 m`}
        </p>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          {inOnda ? `${inOnda} in scena adesso` : vicini.length ? `Il primo comincia alle ${ora(vicini[0].f.properties.inizio)}` : "Prova Piazza Navona, Trastevere o il Pantheon."}
        </p>
      </div>
      {vicini.length > 0 && (
        <ul className="mt-2 flex flex-col">
          {vicini.slice(0, 3).map(({ f, d }) => {
            const a = att(f.properties.attivita), vivo = inScena(f.properties);
            return (
              <li key={f.properties.nome_arte + f.properties.inizio}>
                <button type="button" onClick={() => onArtista(f)} className="grid h-11 w-full grid-cols-[auto_1fr_auto] items-center gap-2.5 rounded-[12px] px-1.5 text-left hover:bg-bg-sink">
                  <span className="flex size-7 items-center justify-center rounded-full" style={{ background: a.c }}>
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: a.g }} />
                  </span>
                  <span className="min-w-0 truncate text-[14px] font-bold text-ink">
                    {f.properties.nome_arte} <span className="font-semibold text-muted">· {vivo ? "ora" : ora(f.properties.inizio)}</span>
                  </span>
                  <span className="text-[13px] font-bold text-ink-soft tabular-nums">{metri(d)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {vicini.length > 3 && (
        <Azioni>
          <Azione
            onClick={() => {
              const xs = vicini.map((x) => x.f.geometry.coordinates);
              onInquadra([
                [Math.min(...xs.map((c) => c[0])), Math.min(...xs.map((c) => c[1]))],
                [Math.max(...xs.map((c) => c[0])), Math.max(...xs.map((c) => c[1]))],
              ]);
            }}
          >
            Mostrali tutti ({vicini.length})
          </Azione>
        </Azioni>
      )}
    </Scheda>
  );
}

function SchedaAnnuncio({ lon, lat, luogo, fatto, attivita, onChiudi, onFatto }: { lon: number; lat: number; luogo: string; fatto?: boolean; attivita: AttivitaArte; onChiudi: () => void; onFatto: () => void }) {
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const a = att(attivita);
  const oggi = ROMA(new Date());
  async function invia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setInvio(true);
    setErrore(null);
    try {
      const r = await fetch("/api/artisti/esibizioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat, lon, luogo, attivita,
          nome_arte: f.get("nome"),
          disciplina: f.get("disciplina") || a.n.toLowerCase(),
          inizio: new Date(`${f.get("giorno")}T${f.get("ora")}`).toISOString(),
          durata_min: Number(f.get("durata")),
          sito_web: f.get("sito_web"),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.errore ?? "Annuncio non riuscito");
      onFatto();
    } catch (err) {
      setErrore((err as Error).message);
    } finally {
      setInvio(false);
    }
  }
  if (fatto) {
    return (
      <Scheda icona={<Tondo colore={COL.libero} glifo={a.g} />} sopra="Annuncio pubblicato" titolo={breve(luogo)} onChiudi={onChiudi}>
        <div className="rounded-[16px] bg-ok-tint px-3.5 py-3">
          <p className="text-[19px] leading-6 font-extrabold text-ok">Sei sulla mappa</p>
          <p className="mt-0.5 text-[13px] text-ink-soft">Chi guarda la mappa ti vede. Ricordati il preavviso alla Polizia Locale 3 giorni prima.</p>
        </div>
        <Azioni>
          <Azione primaria onClick={onChiudi}>Fatto</Azione>
        </Azioni>
      </Scheda>
    );
  }
  const campo = "h-11 w-full min-w-0 rounded-[12px] border-0 bg-bg-sink px-3 text-[15px] font-semibold text-ink placeholder:font-normal placeholder:text-muted focus:ring-2 focus:ring-ink focus:outline-none";
  return (
    <Scheda icona={<Tondo colore={a.c} glifo={a.g} />} sopra="Annuncia la tua esibizione" titolo={breve(luogo)} onChiudi={onChiudi}>
      <form onSubmit={invia} className="relative grid grid-cols-6 gap-2">
        <input name="sito_web" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] size-0 opacity-0" />
        <label className="col-span-3">
          <span className="sr-only">Nome d&apos;arte</span>
          <input name="nome" required minLength={2} maxLength={60} placeholder="Nome d'arte" className={campo} />
        </label>
        <label className="col-span-3">
          <span className="sr-only">Disciplina</span>
          <input name="disciplina" maxLength={60} placeholder={a.k === "musica" ? "es. chitarra e voce" : `es. ${a.n.toLowerCase()}`} className={campo} />
        </label>
        <label className="col-span-2">
          <span className="sr-only">Giorno</span>
          <input name="giorno" type="date" required defaultValue={oggi} min={oggi} className={campo} />
        </label>
        <label className="col-span-2">
          <span className="sr-only">Ora</span>
          <input name="ora" type="time" required step={900} defaultValue="17:00" className={campo} />
        </label>
        <label className="col-span-2">
          <span className="sr-only">Durata</span>
          <select name="durata" defaultValue="90" className={campo}>
            <option value="30">30 min</option>
            <option value="60">1 ora</option>
            <option value="90">1 h 30</option>
            <option value="120">2 ore</option>
          </select>
        </label>
        <p className={`col-span-6 text-[12.5px] ${errore ? "font-semibold text-errore" : "text-muted"}`} role={errore ? "alert" : undefined}>
          {errore ?? "Nome d'arte e disciplina saranno visibili a tutti. Luogo e orario li controlliamo noi."}
        </p>
        <button type="submit" disabled={invio} className="col-span-6 h-11 rounded-[14px] bg-ink text-[14px] font-bold text-white disabled:opacity-60">
          {invio ? "Invio…" : "Pubblica l'annuncio"}
        </button>
      </form>
    </Scheda>
  );
}
