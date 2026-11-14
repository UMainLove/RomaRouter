"use client";

import type { ExpressionSpecification, GeoJSONSource, Map as MapLibre } from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Cerca, type Luogo } from "../mappa-rr/Cerca";
import { inquadra, MappaVettoriale, vola, type ML } from "../mappa-rr/MappaVettoriale";
import { Azione, Azioni, Fatti, Scheda, Schermo, Strumenti, Tondo } from "../mappa-rr/Schermo";
import { primoTesto } from "../mappa-rr/stile";
import { assicuraSpille } from "./spille";
import { ACCESSO, GLIFI_SPORT, NOMI_DISCIPLINA, PRIORITA, SPORT, TIPO, type Accesso, type Gruppo } from "./sport";

/*
 * Sport a Roma. La domanda: «dove posso fare il mio sport vicino a me, e come ci entro?». Tre idee:
 *  1. scegli il tuo sport: la citta' mostra solo i posti per quello sport; il glifo dice lo sport, il colore
 *     come si entra (verde libero e gratis, blu comunale, viola corsi a scuola, grigio club);
 *  2. gioca gratis: un tocco e restano i campetti e le aree fitness libere;
 *  3. il piu' vicino: un indirizzo e partono gli anelli di 500 m, 1 e 2 km; in grande il posto piu' vicino.
 * Ogni scheda e' una schermata sola. Tariffe, lacune e fonti stanno nella Guida.
 */

type Props = {
  id: number; n?: string; t: string; a: Accesso; g: Gruppo[]; d: string[]; m?: number; x: "si" | "no" | "parziale" | "nd"; xf?: string;
  s: number; sp?: Record<string, number>; cop?: boolean; lum?: boolean; ind?: string; ge?: string; tel?: string; web?: string; mail?: string;
  h?: string; no?: string; cl?: string; u: boolean; f: string[]; wp?: string;
};
type FLuogo = { type: "Feature"; id: number; geometry: { type: "Point"; coordinates: [number, number] }; properties: Props };
type Tariffa = { gruppo: string | null; voce: string; euro: number; unita: string; atto: string };
type Sel = { tipo: "luogo"; f: FLuogo } | { tipo: "vicino"; lon: number; lat: number; etichetta: string | null } | null;

const ANELLI = [500, 1000, 2000];
/** Il colore di un campo visto dall'alto: terra rossa, erba, cemento blu, tartan, acqua... */
const COLORE_CAMPO = [
  "match", ["get", "d"],
  "tennis", ["case", ["in", ["coalesce", ["get", "f"], ""], ["literal", ["clay", "ground", "dirt", "compacted", "unpaved"]]], "#D2703A", ["==", ["coalesce", ["get", "f"], ""], "grass"], "#5DA34F", "#3C7DC4"],
  "padel", "#2C8FB5",
  ["calcio", "calcetto", "calcio_a_7", "rugby", "hockey", "baseball", "golf"], ["case", ["in", ["coalesce", ["get", "f"], ""], ["literal", ["ground", "dirt", "sand", "compacted", "unpaved"]]], "#B59A62", "#3E9E5B"],
  "basket", ["case", ["in", ["coalesce", ["get", "f"], ""], ["literal", ["grass", "artificial_turf"]]], "#3E9E5B", "#E0913C"],
  ["pallavolo", "pallamano"], "#E2B23F",
  "beach_volley", "#E6CB8C",
  ["nuoto", "acquagym", "pallanuoto"], "#2FB0E6",
  ["atletica", "corsa"], "#C4553F",
  "bocce", "#CDB38A",
  "skate", "#9AA4AE",
  "equitazione", "#BFA06A",
  "multi", "#7F8FA3",
  "#9B8CC9",
];
const ROMANI = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];
const ACCESSI = Object.keys(ACCESSO) as Accesso[];
const fmt = (n: number) => n.toLocaleString("it-IT", { useGrouping: "always" } as Intl.NumberFormatOptions);
const metri = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`);
const aPiedi = (lat: number, lon: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;
function distanza(a: [number, number], b: [number, number]) {
  const k = Math.PI / 180, x = (b[0] - a[0]) * k * Math.cos(((a[1] + b[1]) / 2) * k), y = (b[1] - a[1]) * k;
  return Math.sqrt(x * x + y * y) * 6371000;
}
function cerchio(lon: number, lat: number, r: number, n = 72) {
  const k = 180 / Math.PI / 6371000;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = (i / n) * 2 * Math.PI;
    return [lon + (r * Math.cos(t) * k) / Math.cos((lat * Math.PI) / 180), lat + r * Math.sin(t) * k];
  });
}

/** Dati: l'API legge il database; senza database si usano le copie in public/dati/sport. */
function caricaDati<T>(api: string, copia: string, pieno: (d: T) => boolean): Promise<T> {
  return fetch(api)
    .then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(new Error(String(r.status)))))
    .then((d) => (pieno(d) ? d : Promise.reject(new Error("vuoto"))))
    .catch(() => fetch(copia).then((r) => r.json() as Promise<T>));
}

/** Il glifo del luogo: lo sport scelto, altrimenti il suo sport principale. */
function glifoDi(p: Props, gruppo: Gruppo | "tutti"): Gruppo {
  if (gruppo !== "tutti") return gruppo;
  if (p.a === "libero" && p.d?.length === 1 && p.d[0] === "fitness") return "fitness" as Gruppo;
  return PRIORITA.find((g) => p.g?.includes(g)) ?? (p.a === "scuola" || p.t === "palestra" ? "palestra" : "altro");
}

/** Il nome: quello vero, altrimenti si dice cosa c'e' («3 campi da tennis»). */
export function nomeLuogo(p: Props) {
  if (p.n) return p.n;
  const conti = Object.entries(p.sp ?? {}).sort((a, b) => b[1] - a[1]);
  if (conti.length) {
    const [d, n] = conti[0];
    const [uno, molti] = NOMI_DISCIPLINA[d] ?? ["campo", "campi"];
    const testo = n > 1 ? `${n} ${molti}` : uno.charAt(0).toUpperCase() + uno.slice(1);
    return conti.length > 1 ? `${testo.charAt(0).toUpperCase() + testo.slice(1)} e altro` : testo.charAt(0).toUpperCase() + testo.slice(1);
  }
  return TIPO[p.t] ?? "Luogo per lo sport";
}

export function SportMappa({ guida }: { guida: { id: string; nome: string; contenuto: ReactNode }[] }) {
  const [luoghi, setLuoghi] = useState<FLuogo[]>([]);
  const [tariffe, setTariffe] = useState<Tariffa[]>([]);
  const [gruppo, setGruppo] = useState<Gruppo | "tutti">("tutti");
  const [accessi, setAccessi] = useState<Record<Accesso, boolean>>({ libero: true, comunale: true, scuola: true, club: true });
  const [accessibili, setAccessibili] = useState(false);
  const [sel, setSel] = useState<Sel>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [guidaAperta, setGuidaAperta] = useState(false);
  const [pronto, setPronto] = useState(false);
  const m = useRef<{ map: MapLibre; ml: ML } | null>(null);

  // ------------------------------------------------------------------ dati derivati
  const perSport = useMemo(() => luoghi.filter((f) => gruppo === "tutti" || f.properties.g?.includes(gruppo)), [luoghi, gruppo]);
  const visibili = useMemo(
    () => perSport.filter((f) => accessi[f.properties.a] && (!accessibili || f.properties.x === "si" || f.properties.x === "parziale")),
    [perSport, accessi, accessibili],
  );
  const conteggiSport = useMemo(() => {
    const c: Record<string, number> = { tutti: 0 };
    luoghi.forEach((f) => {
      if (!accessi[f.properties.a]) return;
      c.tutti++;
      f.properties.g?.forEach((g) => (c[g] = (c[g] ?? 0) + 1));
    });
    return c;
  }, [luoghi, accessi]);
  const conteggiAccesso = useMemo(() => {
    const c: Record<Accesso, number> = { libero: 0, comunale: 0, scuola: 0, club: 0 };
    perSport.forEach((f) => c[f.properties.a]++);
    return c;
  }, [perSport]);

  // ------------------------------------------------------------------ il piu' vicino (anelli)
  const togliAnelli = useCallback(() => {
    (m.current?.map.getSource("rr-anelli") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: [] });
  }, []);
  const vicino = useCallback((lon: number, lat: number, etichetta: string | null, volaLi: boolean) => {
    const k = m.current;
    if (!k) return;
    if (volaLi || !window.matchMedia("(min-width: 1024px)").matches) inquadra(k.map, [[lon - 0.0068, lat - 0.0051], [lon + 0.0068, lat + 0.0051]]);
    setSel({ tipo: "vicino", lon, lat, etichetta });
    const src = k.map.getSource("rr-anelli") as GeoJSONSource;
    const disegna = (f: number) =>
      src.setData({
        type: "FeatureCollection",
        features: ANELLI.flatMap((r, i) => {
          const rr = r * Math.min(1, f * (1 + i * 0.12));
          return [
            { type: "Feature" as const, properties: { i }, geometry: { type: "Polygon" as const, coordinates: [cerchio(lon, lat, rr)] } },
            { type: "Feature" as const, properties: { i, etichetta: r < 1000 ? `${r} m` : `${r / 1000} km` }, geometry: { type: "Point" as const, coordinates: [lon, lat + rr / 111320] } },
          ];
        }),
      });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) disegna(1);
    else {
      const t0 = performance.now();
      const giro = (t: number) => {
        const f = Math.min(1, (t - t0) / 750);
        disegna(1 - Math.pow(1 - f, 3));
        if (f < 1) requestAnimationFrame(giro);
      };
      requestAnimationFrame(giro);
    }
  }, []);

  const apri = useCallback(
    (f: FLuogo, volaLi: boolean) => {
      togliAnelli();
      setSel({ tipo: "luogo", f });
      if (volaLi && m.current) vola(m.current.map, f.geometry.coordinates[1], f.geometry.coordinates[0], Math.min(Math.max(m.current.map.getZoom(), 14.5), 16));
    },
    [togliAnelli],
  );

  // ------------------------------------------------------------------ mappa
  const tutti = useRef<FLuogo[]>([]);
  useEffect(() => {
    tutti.current = luoghi;
  });
  const pronta = useCallback(
    (map: MapLibre, ml: ML) => {
      const sotto = primoTesto(map);
      const vuoto = { type: "FeatureCollection" as const, features: [] };
      ["rr-luoghi", "rr-anelli"].forEach((s) => map.addSource(s, { type: "geojson", data: vuoto }));
      const colore = ["match", ["get", "a"], "libero", ACCESSO.libero.c, "comunale", ACCESSO.comunale.c, "scuola", ACCESSO.scuola.c, ACCESSO.club.c] as never;
      map.addLayer({ id: "rr-anelli-f", type: "fill", source: "rr-anelli", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": "#251D1C", "fill-opacity": ["match", ["get", "i"], 0, 0.07, 1, 0.045, 0.03] } }, sotto);
      map.addLayer({ id: "rr-anelli-l", type: "line", source: "rr-anelli", filter: ["==", ["geometry-type"], "Polygon"], paint: { "line-color": "#251D1C", "line-width": 1.4, "line-opacity": 0.55, "line-dasharray": [3, 3] } }, sotto);
      // da vicino: il perimetro degli impianti (tinta leggera del colore dell'accesso) e i campi veri,
      // colorati come il loro fondo, con il bordo bianco e una seconda riga dentro che ricorda le linee del campo
      map.addSource("rr-campi", { type: "geojson", data: vuoto });
      map.addLayer({ id: "rr-aree-f", type: "fill", source: "rr-campi", minzoom: 13.5, filter: ["==", ["get", "k"], "a"], paint: { "fill-color": colore, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13.5, 0, 14.5, 0.09, 17, 0.07] } }, sotto);
      map.addLayer({ id: "rr-aree-l", type: "line", source: "rr-campi", minzoom: 13.5, filter: ["==", ["get", "k"], "a"], paint: { "line-color": colore, "line-width": ["interpolate", ["linear"], ["zoom"], 13.5, 0.8, 17, 2], "line-opacity": ["interpolate", ["linear"], ["zoom"], 13.5, 0, 14.5, 0.55], "line-dasharray": [2.5, 1.5] } }, sotto);
      map.addLayer({ id: "rr-campi-f", type: "fill", source: "rr-campi", minzoom: 13.8, filter: ["==", ["get", "k"], "c"], paint: { "fill-color": COLORE_CAMPO as never, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13.8, 0, 14.8, 0.82, 17, 0.9] } }, sotto);
      map.addLayer({ id: "rr-campi-l", type: "line", source: "rr-campi", minzoom: 13.8, filter: ["==", ["get", "k"], "c"], paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 14, 0.6, 16, 1.6, 18, 3], "line-opacity": ["interpolate", ["linear"], ["zoom"], 13.8, 0, 14.8, 0.95] } }, sotto);
      map.addLayer({ id: "rr-campi-segni", type: "line", source: "rr-campi", minzoom: 16, filter: ["==", ["get", "k"], "c"], paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 16, 0.6, 18, 1.4], "line-offset": ["interpolate", ["linear"], ["zoom"], 16, -2, 18, -6], "line-opacity": 0.6 } }, sotto);
      // i campi si scaricano solo quando servono (da vicino)
      let campi = false;
      const caricaCampi = () => {
        if (campi || map.getZoom() < 13.3) return;
        campi = true;
        caricaDati<{ type: "FeatureCollection"; features: unknown[] }>("/api/sport/campi", "/dati/sport/campi.json", (d) => !!d.features?.length)
          .then((fc) => (map.getSource("rr-campi") as GeoJSONSource).setData(fc as never))
          .catch(() => (campi = false));
      };
      map.on("moveend", caricaCampi);
      caricaCampi();

      // tutti i luoghi come puntini (si vede subito dove sono, anche a migliaia), e sopra le spille:
      // da lontano solo quelle che non si sovrappongono (prima comunali e gratis, poi le piu' grandi),
      // da vicino tutte. La spilla scelta si ingrandisce.
      map.addLayer({
        id: "rr-luoghi-c",
        type: "circle",
        source: "rr-luoghi",
        maxzoom: 15,
        layout: { "circle-sort-key": ["get", "o"] },
        paint: {
          "circle-color": colore,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 9.5, 1.8, 12, 2.8, 14, 3.6],
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.75, 14.5, 0.55],
          "circle-stroke-color": "#fff",
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 13, 1],
        },
      });
      const spille = {
        "icon-image": ["concat", "pin-", ["get", "k"], "-", ["get", "a"], "-", ["get", "b"]] as ExpressionSpecification,
        "icon-anchor": "bottom" as const,
        "symbol-sort-key": ["get", "o"] as ExpressionSpecification,
      };
      map.addLayer({
        id: "rr-luoghi",
        type: "symbol",
        source: "rr-luoghi",
        layout: {
          ...spille,
          "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.7, 12, 0.8, 14, 0.92, 16, 1.02, 18, 1.1],
          "icon-allow-overlap": ["step", ["zoom"], false, 14.8, true],
          "icon-padding": ["interpolate", ["linear"], ["zoom"], 10, 6, 14, 2],
          "text-field": ["step", ["zoom"], "", 15.4, ["get", "nome"]],
          "text-font": ["Noto Sans Bold"],
          "text-size": 11.5,
          "text-offset": [0, 0.35],
          "text-anchor": "top",
          "text-max-width": 9,
          "text-optional": true,
        },
        paint: { "text-color": "#251D1C", "text-halo-color": "#fff", "text-halo-width": 1.6 },
      });
      // l'onda sotto la spilla scelta (animata) e la spilla sotto il mouse, un po' piu' grande
      map.addLayer({ id: "rr-alone", type: "circle", source: "rr-luoghi", filter: ["==", ["get", "id"], -1], paint: { "circle-color": colore, "circle-radius": 8, "circle-opacity": 0.4, "circle-stroke-color": colore, "circle-stroke-width": 1.5, "circle-stroke-opacity": 0.6 } }, "rr-luoghi");
      map.addLayer({
        id: "rr-luoghi-su",
        type: "symbol",
        source: "rr-luoghi",
        filter: ["==", ["get", "id"], -1],
        layout: { ...spille, "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.92, 14, 1.06, 18, 1.2], "icon-allow-overlap": true, "icon-ignore-placement": true },
      });
      map.addLayer({
        id: "rr-luoghi-sel",
        type: "symbol",
        source: "rr-luoghi",
        filter: ["==", ["get", "id"], -1],
        layout: { ...spille, "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 1, 14, 1.15, 18, 1.25], "icon-allow-overlap": true, "icon-ignore-placement": true },
      });
      map.addLayer({
        id: "rr-anelli-t",
        type: "symbol",
        source: "rr-anelli",
        filter: ["==", ["geometry-type"], "Point"],
        layout: { "text-field": ["get", "etichetta"], "text-font": ["Noto Sans Bold"], "text-size": 11, "text-allow-overlap": true },
        paint: { "text-color": "#251D1C", "text-halo-color": "#F3EFE7", "text-halo-width": 2 },
      });

      caricaDati<{ features: FLuogo[] }>("/api/sport/luoghi", "/dati/sport/luoghi.json", (d) => !!d.features?.length)
        .then((fc) => setLuoghi(fc.features))
        .catch(() => setErrore("I luoghi dello sport non si sono caricati. Riprova tra poco."));
      caricaDati<{ tariffe: Tariffa[] }>("/api/sport/tariffe", "/dati/sport/tariffe.json", (d) => !!d.tariffe?.length)
        .then((d) => setTariffe(d.tariffe))
        .catch(() => {});

      map.on("click", (e) => {
        const box: [[number, number], [number, number]] = [[e.point.x - 7, e.point.y - 7], [e.point.x + 7, e.point.y + 7]];
        const f =
          map.queryRenderedFeatures(e.point, { layers: ["rr-luoghi-sel", "rr-luoghi-su", "rr-luoghi"] })[0] ??
          map.queryRenderedFeatures(box, { layers: ["rr-luoghi", "rr-luoghi-c"] })[0];
        const campo = f ? null : map.queryRenderedFeatures(e.point, { layers: ["rr-campi-f", "rr-aree-f"] })[0];
        if (campo) {
          const l = tutti.current.find((x) => x.id === Number(campo.properties.l));
          if (l) return void apri(l, false);
        }
        if (f) {
          const l = tutti.current.find((x) => x.id === Number(f.properties.id));
          if (l) {
            if (!window.matchMedia("(min-width: 1024px)").matches) map.easeTo({ center: l.geometry.coordinates, duration: 450 });
            return void apri(l, false);
          }
        }
        vicino(e.lngLat.lng, e.lngLat.lat, null, false);
      });
      let sopra: number | null = null;
      map.on("mousemove", "rr-luoghi", (e) => {
        const id = Number(e.features?.[0]?.properties.id ?? -1);
        if (id === sopra) return;
        sopra = id;
        map.setFilter("rr-luoghi-su", ["==", ["get", "id"], id]);
      });
      map.on("mouseleave", "rr-luoghi", () => {
        sopra = null;
        map.setFilter("rr-luoghi-su", ["==", ["get", "id"], -1]);
      });
      ["rr-luoghi", "rr-luoghi-c", "rr-campi-f"].forEach((l) => {
        map.on("mouseenter", l, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", l, () => (map.getCanvas().style.cursor = ""));
      });
      m.current = { map, ml };
      if (process.env.NODE_ENV !== "production") (window as unknown as { __rrSport?: MapLibre }).__rrSport = map;
      setPronto(true);
    },
    [apri, vicino],
  );

  // i simboli: lo sport scelto decide il glifo, i filtri cosa si vede
  useEffect(() => {
    const k = m.current;
    if (!k || !pronto) return;
    const RANGO: Record<Accesso, number> = { comunale: 0, libero: 1, scuola: 2, club: 3 };
    const features = visibili.map((f) => {
      const p = f.properties;
      const kk = glifoDi(p, gruppo);
      const b = p.s >= 2 ? Math.min(p.s, 10) : 0;
      return { ...f, properties: { id: f.id, a: p.a, k: kk, b, o: RANGO[p.a] * 1000 - Math.min(p.s, 999) - (p.n ? 0.5 : 0), nome: nomeLuogo(p) } };
    });
    const colori = Object.fromEntries(ACCESSI.map((a) => [a, ACCESSO[a].c]));
    let vivo = true;
    assicuraSpille(k.map, features.map((x) => `pin-${x.properties.k}-${x.properties.a}-${x.properties.b}`), colori).then(() => {
      if (vivo) (k.map.getSource("rr-luoghi") as GeoJSONSource).setData({ type: "FeatureCollection", features } as never);
    });
    return () => {
      vivo = false;
    };
  }, [visibili, gruppo, pronto]);

  useEffect(() => {
    const k = m.current;
    if (!k?.map.getLayer("rr-luoghi-sel")) return;
    const id = sel?.tipo === "luogo" ? sel.f.id : -1;
    k.map.setFilter("rr-luoghi-sel", ["==", ["get", "id"], id]);
    k.map.setFilter("rr-alone", ["==", ["get", "id"], id]);
    if (id < 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const t0 = performance.now();
    const onda = (t: number) => {
      const f = ((t - t0) % 1600) / 1600;
      k.map.setPaintProperty("rr-alone", "circle-radius", 6 + f * 26);
      k.map.setPaintProperty("rr-alone", "circle-opacity", 0.38 * (1 - f));
      k.map.setPaintProperty("rr-alone", "circle-stroke-opacity", 0.7 * (1 - f));
      raf = requestAnimationFrame(onda);
    };
    raf = requestAnimationFrame(onda);
    return () => cancelAnimationFrame(raf);
  }, [sel]);

  // "Mappa" nell'elenco della Guida: si torna sulla mappa sul luogo
  useEffect(() => {
    function vai(e: Event) {
      const d = (e as CustomEvent<{ sezione: string; id: number | string }>).detail;
      if (d?.sezione !== "sport") return;
      const f = luoghi.find((x) => String(x.id) === String(d.id));
      if (f) {
        setGuidaAperta(false);
        apri(f, true);
      }
    }
    window.addEventListener("rr:apri-su-mappa", vai);
    return () => window.removeEventListener("rr:apri-su-mappa", vai);
  }, [luoghi, apri]);

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
  };
  const soloGratis = ACCESSI.every((a) => accessi[a] === (a === "libero"));

  // ------------------------------------------------------------------ barra
  const barra = (
    <div className="flex flex-col gap-2">
      <Cerca
        endpoint="/api/sport/indirizzo"
        etichetta="Cerca un indirizzo"
        segnaposto="Dove sei? Trova lo sport vicino a te"
        onScelto={(l: Luogo) => vicino(l.lon, l.lat, l.etichetta, true)}
        coda={<Strumenti onGuida={() => setGuidaAperta(true)} onTrovami={trovami} />}
      />
      <div className={`rounded-[20px] bg-panel p-1.5 shadow-[0_2px_6px_rgba(37,29,28,.08),0_10px_30px_rgba(37,29,28,.12)] ring-1 ring-black/5 ${sel ? "max-lg:hidden" : ""}`}>
        <div role="group" aria-label="Che sport vuoi fare" className="grid grid-cols-5 gap-1">
          {SPORT.map((s) => {
            const on = gruppo === s.k;
            return (
              <button
                key={s.k}
                type="button"
                aria-pressed={on}
                onClick={() => setGruppo(s.k)}
                className={`flex flex-col items-center gap-0.5 rounded-[12px] py-1 transition ${on ? "bg-ink text-white" : "text-ink hover:bg-bg-sink"}`}
              >
                <span className={`flex size-7 items-center justify-center rounded-full ${on ? "bg-white/15" : "bg-bg-sink"}`}>
                  <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke={on ? "#fff" : "#4A403D"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: GLIFI_SPORT[s.k] }} />
                </span>
                <span className="text-[11px] leading-tight font-bold">{s.n}</span>
                <span className={`text-[10.5px] leading-none font-semibold tabular-nums ${on ? "text-white/75" : "text-muted"}`}>{luoghi.length ? fmt(conteggiSport[s.k] ?? 0) : "…"}</span>
              </button>
            );
          })}
        </div>
        <div role="group" aria-label="Come si entra (tocca per nascondere)" className="mt-1.5 flex flex-wrap items-center gap-1">
          <button
            type="button"
            aria-pressed={soloGratis}
            onClick={() => setAccessi(soloGratis ? { libero: true, comunale: true, scuola: true, club: true } : { libero: true, comunale: false, scuola: false, club: false })}
            className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-[12.5px] font-extrabold transition ${soloGratis ? "text-white" : "bg-[#16955A14] text-[#0F7A47] hover:bg-[#16955A24]"}`}
            style={soloGratis ? { background: ACCESSO.libero.c } : undefined}
          >
            <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 10.5 8 14.5 16 6" />
            </svg>
            Gioca gratis
          </button>
          {ACCESSI.filter((a) => a !== "libero").map((a) => {
            const on = accessi[a];
            return (
              <button
                key={a}
                type="button"
                aria-pressed={on}
                onClick={() => setAccessi((x) => ({ ...x, [a]: !x[a] }))}
                title={`${ACCESSO[a].n}: ${fmt(conteggiAccesso[a])} luoghi`}
                className={`flex h-8 items-center gap-1 rounded-full px-2 text-[12px] font-bold transition ${on ? "bg-bg-sink text-ink" : "text-muted line-through decoration-1 opacity-60 hover:opacity-90"}`}
              >
                <span className="size-2.5 rounded-full ring-2 ring-white" style={{ background: ACCESSO[a].c }} aria-hidden="true" />
                {ACCESSO[a].breve}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={accessibili}
            onClick={() => setAccessibili((v) => !v)}
            aria-label="Solo accessibili in carrozzina"
            className={`ml-auto flex size-8 items-center justify-center rounded-full text-[12px] font-bold transition ${accessibili ? "bg-[#1F63D1] text-white" : "bg-bg-sink text-ink-soft hover:text-ink"}`}
            title="Solo i luoghi segnalati come accessibili in carrozzina"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="4.5" r="1.8" />
              <path d="M11 7.5v6h5l2.5 5M11 10.5h5M8.2 11.4A5.5 5.5 0 1 0 15 18.6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  // ------------------------------------------------------------------ schede
  let scheda: ReactNode;
  if (errore) {
    scheda = (
      <Scheda icona={<Tondo colore="#8A807E" glifo={GLIFI_SPORT.altro} />} titolo="Qualcosa non va" onChiudi={() => setErrore(null)}>
        <p className="text-[15px] text-ink-soft">{errore}</p>
      </Scheda>
    );
  } else if (sel?.tipo === "luogo") {
    scheda = <SchedaLuogo f={sel.f} gruppo={gruppo} tariffe={tariffe} onChiudi={chiudi} onVicino={() => vicino(sel.f.geometry.coordinates[0], sel.f.geometry.coordinates[1], nomeLuogo(sel.f.properties), true)} />;
  } else if (sel?.tipo === "vicino") {
    scheda = <SchedaVicino {...sel} luoghi={visibili} gruppo={gruppo} onChiudi={chiudi} onLuogo={(f) => apri(f, true)} />;
  } else {
    scheda = <Panoramica luoghi={perSport} gruppo={gruppo} accessibili={accessibili} />;
  }

  return (
    <Schermo
      mappa={<MappaVettoriale centro={[41.888, 12.49]} zoom={11.4} titolo="Mappa dei luoghi dove fare sport a Roma" onPronta={pronta} />}
      barra={barra}
      scheda={scheda}
      guida={{ titolo: "Sport a Roma", schede: guida }}
      guidaAperta={guidaAperta}
      onGuida={setGuidaAperta}
    />
  );
}

// ==================================================================== schede
const ACCESSIBILE: Record<Props["x"], { v: string; tono?: "ok" | "no" }> = {
  si: { v: "Sì", tono: "ok" },
  parziale: { v: "In parte" },
  no: { v: "No", tono: "no" },
  nd: { v: "Non si sa" },
};

function riassuntoSpazi(p: Props) {
  const conti = Object.entries(p.sp ?? {}).sort((a, b) => b[1] - a[1]);
  if (!conti.length) return { v: p.d.length ? `${p.d.length} sport` : "—", nota: p.d.length ? p.d.map((d) => NOMI_DISCIPLINA[d]?.[0] ?? d).slice(0, 2).join(", ") : "non indicati" };
  const tot = p.s || conti.reduce((s, [, n]) => s + n, 0);
  return { v: `${tot} ${tot === 1 ? "spazio" : "spazi"}`, nota: conti.slice(0, 2).map(([d, n]) => `${n} ${(NOMI_DISCIPLINA[d]?.[0] ?? d).replace(/^campo da |^campo /, "")}`).join(" · ") };
}

function SchedaLuogo({ f, gruppo, tariffe, onChiudi, onVicino }: { f: FLuogo; gruppo: Gruppo | "tutti"; tariffe: Tariffa[]; onChiudi: () => void; onVicino: () => void }) {
  const p = f.properties;
  const a = ACCESSO[p.a];
  const g = glifoDi(p, gruppo);
  const [lon, lat] = f.geometry.coordinates;
  // per un impianto comunale: la tariffa massima dello sport scelto (o di quello principale)
  const tariffa = p.a === "comunale" ? tariffe.filter((t) => t.gruppo === g).sort((x, y) => (x.unita === "ora" ? -1 : 0) - (y.unita === "ora" ? -1 : 0))[0] : undefined;
  const riga =
    p.a === "comunale"
      ? tariffa
        ? `${tariffa.voce}: al massimo ${tariffa.euro} € ${tariffa.unita === "ora" ? "l'ora" : tariffa.unita === "mese" ? "al mese" : tariffa.unita === "anno" ? "l'anno" : `a ${tariffa.unita}`}`
        : "Tariffe massime fissate dal Comune (vedi Guida)"
      : p.a === "libero"
        ? "Si entra liberamente, senza pagare"
        : p.a === "scuola"
          ? "Corsi nella palestra della scuola, gestiti da un'associazione"
          : p.ge ?? (p.n ? "Club, palestra o impianto privato: si paga" : "Gestione non nota: spesso è un club o un campo privato");
  const spazi = riassuntoSpazi(p);
  const extra = p.h ? `Orari: ${p.h}` : (p.no ?? (p.a === "comunale" && p.ge ? `Gestito da ${p.ge}` : undefined));
  return (
    <Scheda icona={<Tondo colore={a.c} glifo={GLIFI_SPORT[g]} />} sopra={`${TIPO[p.t] ?? "Sport"}${p.m ? ` · Municipio ${ROMANI[p.m]}` : ""}${p.cl ? ` · classe ${p.cl}` : ""}`} titolo={nomeLuogo(p)} onChiudi={onChiudi}>
      <div className="rounded-[16px] px-3.5 py-2.5" style={{ background: `${a.c}16` }}>
        <p className="text-[19px] leading-6 font-extrabold tracking-[-.01em]" style={{ color: a.c }}>
          {a.n}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-ink-soft">{riga}</p>
      </div>
      <div className="mt-2.5">
        <Fatti
          voci={[
            { l: "Campi", v: spazi.v, nota: spazi.nota },
            { l: p.cop ? "Coperto" : "All'aperto", v: p.cop ? "Coperto" : p.cop === false ? "Aperto" : "—", nota: p.lum ? "con luci la sera" : p.lum === false ? "senza luci" : "luci: non si sa" },
            { l: "Accessibile", v: ACCESSIBILE[p.x].v, tono: ACCESSIBILE[p.x].tono, nota: p.x === "nd" ? "nessuna fonte" : (p.xf ?? "") },
          ]}
        />
      </div>
      {(extra || p.ind) && <p className="mt-2 line-clamp-1 text-[12.5px] text-muted">{extra ?? p.ind}</p>}
      <Azioni>
        <Azione primaria href={aPiedi(lat, lon)}>
          Portami lì
        </Azione>
        {p.tel ? (
          <Azione href={`tel:${p.tel.split("·")[0].replace(/[^\d+]/g, "")}`}>Chiama</Azione>
        ) : p.web ? (
          <Azione href={p.web.startsWith("http") ? p.web : `https://${p.web}`}>Sito</Azione>
        ) : (
          <Azione onClick={onVicino}>Cosa c&apos;è intorno</Azione>
        )}
      </Azioni>
    </Scheda>
  );
}

function SchedaVicino({ lon, lat, etichetta, luoghi, gruppo, onChiudi, onLuogo }: { lon: number; lat: number; etichetta: string | null; luoghi: FLuogo[]; gruppo: Gruppo | "tutti"; onChiudi: () => void; onLuogo: (f: FLuogo) => void }) {
  const vicini = useMemo(
    () => luoghi.map((f) => ({ f, d: distanza([lon, lat], f.geometry.coordinates) })).filter((x) => x.d <= 2000).sort((a, b) => a.d - b.d),
    [luoghi, lon, lat],
  );
  const primo = vicini[0];
  const gratis = vicini.find((x) => x.f.properties.a === "libero");
  const sport = SPORT.find((s) => s.k === gruppo)!;
  const glifo = GLIFI_SPORT[gruppo];
  return (
    <Scheda icona={<Tondo colore="#251D1C" glifo={glifo} />} sopra={gruppo === "tutti" ? "Sport vicino a te" : `${sport.n} vicino a te`} titolo={etichetta ?? "Punto scelto sulla mappa"} onChiudi={onChiudi}>
      <div className="rounded-[16px] bg-bg-sink px-3.5 py-2.5">
        {primo ? (
          <>
            <p className="text-[12px] font-bold text-muted">Il più vicino</p>
            <p className="text-[19px] leading-6 font-extrabold tracking-[-.01em] text-ink">
              {metri(primo.d)} · <span style={{ color: ACCESSO[primo.f.properties.a].c }}>{ACCESSO[primo.f.properties.a].breve.toLowerCase()}</span>
            </p>
            <p className="truncate text-[13px] text-ink-soft">{nomeLuogo(primo.f.properties)}</p>
          </>
        ) : (
          <p className="text-[15px] font-bold text-ink">Niente entro 2 km con i filtri scelti. Prova «Tutti» o allarga i filtri.</p>
        )}
      </div>
      <div className="mt-2.5">
        <Fatti
          voci={ANELLI.map((r) => ({ l: `Entro ${r < 1000 ? `${r} m` : `${r / 1000} km`}`, v: fmt(vicini.filter((x) => x.d <= r).length), nota: `di cui ${vicini.filter((x) => x.d <= r && x.f.properties.a === "libero").length} gratis` }))}
        />
      </div>
      <Azioni>
        {primo && <Azione primaria onClick={() => onLuogo(primo.f)}>Apri il più vicino</Azione>}
        {gratis && gratis !== primo ? <Azione onClick={() => onLuogo(gratis.f)}>Gratis a {metri(gratis.d)}</Azione> : primo ? <Azione href={aPiedi(primo.f.geometry.coordinates[1], primo.f.geometry.coordinates[0])}>Portami lì</Azione> : null}
      </Azioni>
    </Scheda>
  );
}

function Panoramica({ luoghi, gruppo, accessibili }: { luoghi: FLuogo[]; gruppo: Gruppo | "tutti"; accessibili: boolean }) {
  const sport = SPORT.find((s) => s.k === gruppo)!;
  const spazi = gruppo === "tutti" ? luoghi.reduce((s, f) => s + f.properties.s, 0) : 0;
  const gratis = luoghi.filter((f) => f.properties.a === "libero").length;
  const acc = luoghi.filter((f) => f.properties.x === "si" || f.properties.x === "parziale").length;
  return (
    <div className="pointer-events-auto rounded-[20px] bg-panel/95 px-4 py-3 shadow-[0_6px_24px_rgba(37,29,28,.16)] ring-1 ring-black/5 backdrop-blur">
      <p className="text-[14px] font-bold text-ink">{gruppo === "tutti" ? "Dove fare sport a Roma" : `${sport.n} a Roma`}: tocca un posto o cerca il tuo indirizzo</p>
      {luoghi.length > 0 && (
        <p className="mt-0.5 text-[12.5px] text-ink-soft">
          <b className="text-ink tabular-nums">{fmt(luoghi.length)}</b> luoghi{spazi ? <>, <b className="text-ink tabular-nums">{fmt(spazi)}</b> campi e spazi</> : null}, <b className="tabular-nums" style={{ color: ACCESSO.libero.c }}>{fmt(gratis)}</b> gratis
          {accessibili ? "" : <> · accessibilità nota per {fmt(acc)}</>}
        </p>
      )}
      <ul className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[12.5px] font-semibold text-ink-soft">
        {ACCESSI.map((a) => (
          <li key={a} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3 rounded-full ring-2 ring-white" style={{ background: ACCESSO[a].c }} />
            {ACCESSO[a].n}
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[12px] text-muted">Dati di Roma Capitale e OpenStreetMap. Prezzi, lacune e fonti nella Guida.</p>
    </div>
  );
}
