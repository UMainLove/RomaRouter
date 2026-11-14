"use client";

import type { ExpressionSpecification, Map as MapLibre } from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Cerca, type Luogo } from "../mappa-rr/Cerca";
import { caricaIcone, GLIFI, punto, spilla } from "../mappa-rr/icone";
import { dati, inclina, inquadra, MappaVettoriale, riposa, type ML, viva, vola } from "../mappa-rr/MappaVettoriale";
import { alone, comparsa } from "../mappa-rr/cinema";
import { Azione, Azioni, Fatti, Scheda, Schermo, Strumenti, Tondo } from "../mappa-rr/Schermo";
import { primoTesto } from "../mappa-rr/stile";
import { Riassunto, Tendina } from "../mappa-rr/Tendina";

/*
 * Antenne. Tre idee:
 *  1. il simbolo dice il tipo: la forma e' la taglia (traliccio = stazione radio base, cerchio piccolo = piccola
 *     antenna a bassa potenza), il colore l'intervento (nuova, potenziamento, modifica), l'anello scuro un sito
 *     condiviso da piu' operatori. I bottoni in alto sono la legenda e il filtro;
 *  2. il radar di casa: un indirizzo e partono gli anelli di 100, 250 e 500 m; in grande la distanza della piu' vicina;
 *  3. la linea del tempo: le richieste mese per mese, si sceglie l'anno.
 */

type Tipo = "nuova" | "potenziamento" | "modifica";
type Taglia = "macro" | "piccola";
type Props = {
  gestori: string[]; indirizzo: string | null; tipo_intervento: string | null; regime: string | null; data_pubblicazione: string | null;
  municipio_nome: string | null; quartiere: string | null; qualita_posizione: string; nota_qualita: string | null;
  sito_sensibile_vicino: { categoria: string; nome: string | null; distanza_m: number } | null; url_avviso: string | null;
};
type Istanza = { id: number; geometry: { coordinates: [number, number] }; properties: Props };
type Contesto = {
  municipio: { numero: number; nome: string } | null; quartiere: { nome: string; tipo: string } | null;
  aree_vincolate: { tipo: string; nome: string }[];
  siti_sensibili_piu_vicini: { categoria: string; nome: string | null; indirizzo: string | null; distanza_m: number }[];
};
type Impianto = { osm: string; tipo: "traliccio" | "palo" | "antenna"; mobile: boolean; operatore: string | null; altezza_m: number | null; nome: string | null };
type FImpianto = { geometry: { coordinates: [number, number] }; properties: Impianto };
type Sito = { id: number; o: string; t: string; n: number; p: number | null; a: string | null };
type FSito = { type: "Feature"; geometry: { type: "Point"; coordinates: [number, number] }; properties: Sito };
type Sel = { tipo: "antenna"; a: Istanza } | { tipo: "impianto"; f: FImpianto } | { tipo: "sito"; f: FSito } | { tipo: "radar"; lon: number; lat: number; etichetta: string | null; c: Contesto | null } | null;

const COL: Record<Tipo, string> = { nuova: "#E4572E", potenziamento: "#E89B1A", modifica: "#3366CC" };
const NOME: Record<Tipo, string> = { nuova: "Nuova antenna", potenziamento: "Potenziamento", modifica: "Modifica di un impianto" };
const PLURALE: Record<Tipo, string> = { nuova: "Nuove", potenziamento: "Potenziate", modifica: "Modificate" };
const TAGLIA: Record<Taglia, string> = { macro: "Stazione radio base", piccola: "Piccola antenna" };
const CONDIVISO = "#251D1C";
const ESISTENTE = "#3F4A5C";
const IN_FUNZIONE = "#0F7C80";
/* le fonti nella «ⓘ» della mappa su telefono, dove la nota del riquadro in basso non c'e' (CC BY-SA chiede nome e licenza) */
const FONTI =
  'In funzione: celle © <a href="https://opencellid.org" target="_blank" rel="noopener">OpenCelliD</a> (<a href="https://creativecommons.org/licenses/by-sa/4.0/deed.it" target="_blank" rel="noopener">CC BY-SA 4.0</a>) e impianti © OpenStreetMap · richieste: Roma Capitale';
const ANELLI = [100, 250, 500];
const CATEGORIE: Record<string, string> = {
  scuola: "Scuola", asilo_nido: "Asilo nido", ospedale: "Ospedale", casa_di_cura: "Casa di cura", rsa: "RSA",
  parco_giochi: "Parco giochi", universita: "Università", clinica: "Clinica",
};
const ARPA = "https://www.arpalazio.it/en/servizi/faq";

/** Dati della sezione: l'API legge il database; se il database non c'e' (progetto appena scaricato) si usano le copie in public/dati/antenne. */
function caricaDati<T>(api: string, copia: string): Promise<T> {
  return fetch(api)
    .then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(new Error(String(r.status)))))
    .then((d) => ((d as { features?: unknown[] }).features?.length ? d : Promise.reject(new Error("vuoto"))))
    .catch(() => fetch(copia).then((r) => r.json() as Promise<T>));
}

const tipoDi = (t: string | null): Tipo => (t === "installazione" ? "nuova" : t === "incremento limiti emissivi" ? "potenziamento" : "modifica");
const tagliaDi = (p: Props): Taglia => (/bassa potenza|ridotte dimensioni/i.test(p.regime ?? "") ? "piccola" : "macro");
const metri = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`);
const maiuscola = (s: string) =>
  s !== s.toUpperCase()
    ? s
    : s.toLowerCase().replace(/(^|[\s'(-])(\p{L})(\p{L}*)/gu, (m, sep: string, a: string, b: string) =>
        /^(di|del|della|dei|delle|degli|dello|da|de|e|in|al|alla|ai|alle)$/.test(a + b) && sep ? sep + a + b : sep + a.toUpperCase() + b);
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

export function AntenneMappa({ guida }: { guida: { id: string; nome: string; contenuto: ReactNode }[] }) {
  const [istanze, setIstanze] = useState<Istanza[]>([]);
  const [impianti, setImpianti] = useState<FImpianto[]>([]);
  const [esistenti, setEsistenti] = useState(true);
  const [siti, setSiti] = useState<FSito[]>([]);
  const [tipi, setTipi] = useState<Record<Tipo, boolean>>({ nuova: true, potenziamento: true, modifica: true });
  const [anno, setAnno] = useState<string | null>(null);
  const [operatore, setOperatore] = useState<string>("");
  const [sensibili, setSensibili] = useState(false);
  const [sel, setSel] = useState<Sel>(null);
  const [carica, setCarica] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [guidaAperta, setGuidaAperta] = useState(false);
  // conta le mappe nate: con Next 16 una pagina nascosta e poi riaperta ricrea la mappa
  const [pronto, setPronto] = useState(0);
  const m = useRef<{ map: MapLibre; ml: ML; sens?: () => void } | null>(null);
  const flag = useRef({ sensibili });
  useEffect(() => {
    flag.current = { sensibili };
  });

  const conteggi = useMemo(() => {
    const c: Record<Tipo, number> = { nuova: 0, potenziamento: 0, modifica: 0 };
    istanze.forEach((a) => c[tipoDi(a.properties.tipo_intervento)]++);
    return c;
  }, [istanze]);
  const operatori = useMemo(() => {
    const o: Record<string, number> = {};
    istanze.forEach((a) => a.properties.gestori.forEach((g) => (o[g] = (o[g] ?? 0) + 1)));
    siti.forEach((f) => f.properties.o.split("|").forEach((g) => g && g !== "Altro" && (o[g] = (o[g] ?? 0) + 1)));
    return Object.entries(o).sort((a, b) => b[1] - a[1]);
  }, [istanze, siti]);

  // ------------------------------------------------------------------ 2. il radar
  const radar = useCallback(async (lon: number, lat: number, etichetta: string | null, volaLi: boolean) => {
    const k = m.current;
    if (!k) return;
    if (volaLi || !window.matchMedia("(min-width: 1024px)").matches) inquadra(k.map, [[lon - 0.0075, lat - 0.0055], [lon + 0.0075, lat + 0.0055]]);
    setSel({ tipo: "radar", lon, lat, etichetta, c: null });
    const disegna = (f: number) =>
      dati(k.map, "rr-radar", {
        type: "FeatureCollection",
        features: ANELLI.flatMap((r, i) => {
          const rr = r * Math.min(1, f * (1 + i * 0.12));
          return [
            { type: "Feature" as const, properties: { r, i }, geometry: { type: "Polygon" as const, coordinates: [cerchio(lon, lat, rr)] } },
            { type: "Feature" as const, properties: { r, i, etichetta: `${r} m` }, geometry: { type: "Point" as const, coordinates: [lon, lat + rr / 111320] } },
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
    setCarica(true);
    try {
      const r = await fetch(`/api/antenne/contesto?lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}&raggio=500`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.errore ?? "Ricerca non riuscita");
      setSel((s) => (s?.tipo === "radar" && s.lon === lon && s.lat === lat ? { ...s, c: d } : s));
    } catch (e) {
      setErrore((e as Error).message);
    } finally {
      setCarica(false);
    }
  }, []);

  const togliRadar = useCallback(() => {
    dati(m.current?.map, "rr-radar", { type: "FeatureCollection", features: [] });
  }, []);

  const apriAntenna = useCallback(
    (a: Istanza, volaLi: boolean) => {
      togliRadar();
      setSel({ tipo: "antenna", a });
      if (volaLi && m.current) vola(m.current.map, a.geometry.coordinates[1], a.geometry.coordinates[0], 17);
    },
    [togliRadar],
  );

  // ------------------------------------------------------------------ mappa
  const pronta = useCallback(
    (map: MapLibre, ml: ML) => {
      const sotto = primoTesto(map);
      const icone: Record<string, { svg: string; w: number; h: number }> = {
        sensibile: punto("#7A4FD0", 9),
        "osm-traliccio": spilla(ESISTENTE, GLIFI.traliccio, 24),
        "osm-palo": spilla(ESISTENTE, GLIFI.traliccio, 22),
        "osm-antenna": spilla(ESISTENTE, GLIFI.cella, 20),
        sito: spilla(IN_FUNZIONE, GLIFI.cella, 22),
      };
      (Object.keys(COL) as Tipo[]).forEach((t) => {
        icone[`ant-macro-${t}`] = spilla(COL[t], GLIFI.traliccio, 32);
        icone[`ant-piccola-${t}`] = spilla(COL[t], GLIFI.cella, 22);
        icone[`ant-macro-${t}-c`] = spilla(COL[t], GLIFI.traliccio, 32, CONDIVISO);
        icone[`ant-piccola-${t}-c`] = spilla(COL[t], GLIFI.cella, 22, CONDIVISO);
      });
      caricaIcone(map, icone);
      const vuoto = { type: "FeatureCollection" as const, features: [] };
      ["rr-ant", "rr-radar", "rr-sens", "rr-osm"].forEach((s) => map.addSource(s, { type: "geojson", data: vuoto }));
      // antenne in funzione (siti stimati dalle misure dei telefoni): tutte visibili, una per una.
      // Da lontano un punto (migliaia di punti restano leggeri sulla GPU), da vicino l'icona.
      map.addSource("rr-siti", { type: "geojson", data: vuoto });
      // le antenne in funzione brillano da lontano: si vede subito dove la citta' e' piu' coperta
      alone(map, "rr-siti-alone", "rr-siti", IN_FUNZIONE);
      map.addLayer({
        id: "rr-siti-c",
        type: "circle",
        source: "rr-siti",
        maxzoom: 14.5,
        paint: {
          "circle-color": IN_FUNZIONE,
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.75, 14, 0.95],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 9.5, 1.6, 11, 2.4, 13, 3.6, 14.5, 5],
          "circle-stroke-color": "#fff",
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 10, 0.3, 14, 1],
        },
      });
      map.addLayer({
        id: "rr-siti",
        type: "symbol",
        source: "rr-siti",
        minzoom: 14.5,
        layout: {
          "icon-image": "sito",
          "icon-size": ["interpolate", ["linear"], ["zoom"], 12, 0.6, 15, 0.85, 17, 1],
          "icon-allow-overlap": true,
          "text-field": ["step", ["zoom"], "", 16.5, ["get", "o"]],
          "text-font": ["Noto Sans Bold"],
          "text-size": 11,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: { "text-color": IN_FUNZIONE, "text-halo-color": "#fff", "text-halo-width": 1.6 },
      });

      // impianti esistenti (OpenStreetMap): sotto le richieste, grigio ardesia
      map.addLayer({
        id: "rr-osm",
        type: "symbol",
        source: "rr-osm",
        layout: {
          "icon-image": ["concat", "osm-", ["get", "tipo"]],
          "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 13, 0.75, 16, 1],
          "icon-allow-overlap": true,
          "text-field": ["step", ["zoom"], "", 16, ["coalesce", ["get", "operatore"], ""]],
          "text-font": ["Noto Sans Bold"],
          "text-size": 11,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: { "text-color": ESISTENTE, "text-halo-color": "#fff", "text-halo-width": 1.6, "icon-opacity": 0.92 },
      });

      map.addLayer({ id: "rr-radar-f", type: "fill", source: "rr-radar", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": "#251D1C", "fill-opacity": ["match", ["get", "i"], 0, 0.07, 1, 0.045, 0.03] } }, sotto);
      map.addLayer({ id: "rr-radar-l", type: "line", source: "rr-radar", filter: ["==", ["geometry-type"], "Polygon"], paint: { "line-color": "#251D1C", "line-width": 1.4, "line-opacity": 0.55, "line-dasharray": [3, 3] } }, sotto);
      map.addLayer({
        id: "rr-sens",
        type: "symbol",
        source: "rr-sens",
        minzoom: 14,
        layout: { "icon-image": "sensibile", "icon-allow-overlap": true, "text-field": ["step", ["zoom"], "", 16.5, ["get", "nome"]], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-offset": [0, 1], "text-anchor": "top", "text-optional": true },
        paint: { "text-color": "#5B3BA8", "text-halo-color": "#fff", "text-halo-width": 1.4 },
      });
      map.addLayer({
        id: "rr-ant",
        type: "symbol",
        source: "rr-ant",
        layout: {
          "icon-image": ["concat", "ant-", ["get", "g"], "-", ["get", "t"], ["case", ["get", "c"], "-c", ""]],
          "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.55, 13, 0.85, 16, 1.15],
          "icon-allow-overlap": true,
          "symbol-sort-key": ["match", ["get", "t"], "nuova", 0, "potenziamento", 1, 2],
          "text-field": ["step", ["zoom"], "", 15.5, ["get", "op"]],
          "text-font": ["Noto Sans Bold"],
          "text-size": 11.5,
          "text-offset": [0, 1.5],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: { "text-color": "#251D1C", "text-halo-color": "#fff", "text-halo-width": 1.6 },
      });
      map.addLayer({ id: "rr-ant-sel", type: "circle", source: "rr-ant", filter: ["==", ["get", "id"], -1], paint: { "circle-radius": 22, "circle-opacity": 0, "circle-stroke-color": "#251D1C", "circle-stroke-width": 3 } }, "rr-ant");
      map.addLayer({
        id: "rr-radar-t",
        type: "symbol",
        source: "rr-radar",
        filter: ["==", ["geometry-type"], "Point"],
        layout: { "text-field": ["get", "etichetta"], "text-font": ["Noto Sans Bold"], "text-size": 11, "text-allow-overlap": true },
        paint: { "text-color": "#251D1C", "text-halo-color": "#F3EFE7", "text-halo-width": 2 },
      });

      caricaDati<{ features: Istanza[] }>("/api/antenne/istanze", "/dati/antenne/richieste.json")
        .then((fc) => setIstanze(fc.features))
        .catch(() => setErrore("Le antenne non si sono caricate. Riprova tra poco."));
      caricaDati<{ features: FSito[] }>("/api/antenne/siti", "/dati/antenne/in-funzione.json")
        .then((fc) => setSiti(fc.features))
        .catch(() => {});
      caricaDati<{ features: FImpianto[] }>("/api/antenne/impianti", "/dati/antenne/impianti-osm.json")
        .then((fc) => {
          setImpianti(fc.features);
          dati(map, "rr-osm", fc as never);
        })
        .catch(() => {});

      // scuole e ospedali: solo da vicino e solo se chiesti
      let ultimo = "";
      const sens = () => {
        if (!flag.current.sensibili || map.getZoom() < 14) return;
        const b = map.getBounds().toArray().flat().map((x) => x.toFixed(3)).join(",");
        if (b === ultimo) return;
        ultimo = b;
        fetch(`/api/antenne/siti-sensibili?bbox=${b}`)
          .then((r) => r.json())
          .then((fc: { features: { type: "Feature"; geometry: { type: string }; properties: { nome: string | null; categoria: string } }[] }) => {
            if (b !== ultimo) return;
            const features = fc.features.filter((f) => f.geometry.type === "Point").map((f) => ({ ...f, properties: { nome: f.properties.nome ?? CATEGORIE[f.properties.categoria] ?? "" } }));
            dati(map, "rr-sens", { type: "FeatureCollection", features } as never);
          })
          .catch(() => {});
      };
      map.on("moveend", sens);
      m.current = {
        map,
        ml,
        sens: () => {
          ultimo = "";
          sens();
        },
      };

      map.on("click", (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ["rr-ant"] })[0];
        // i punti piccoli si toccano con un po' di margine
        const vicino: [[number, number], [number, number]] = [[e.point.x - 6, e.point.y - 6], [e.point.x + 6, e.point.y + 6]];
        const st = f ? null : map.queryRenderedFeatures(e.point, { layers: ["rr-siti"] })[0] ?? map.queryRenderedFeatures(vicino, { layers: ["rr-siti-c"] })[0];
        if (st) {
          const coord = (st.geometry as unknown as { coordinates: [number, number] }).coordinates;
          inclina(map, coord[0], coord[1]);
          return void setSel({ tipo: "sito", f: { type: "Feature", geometry: { type: "Point", coordinates: coord }, properties: st.properties as unknown as Sito } });
        }
        const o = f ? null : map.queryRenderedFeatures(e.point, { layers: ["rr-osm"] })[0];
        if (o) {
          const coord = (o.geometry as unknown as { coordinates: [number, number] }).coordinates;
          inclina(map, coord[0], coord[1]);
          return void setSel({ tipo: "impianto", f: { geometry: { coordinates: coord }, properties: o.properties as unknown as Impianto } });
        }
        if (f) {
          const [x, y] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates;
          inclina(map, x, y);
        }
        if (f) return void setSel({ tipo: "antenna", a: { id: Number(f.properties.id), geometry: { coordinates: (f.geometry as unknown as { coordinates: [number, number] }).coordinates }, properties: JSON.parse(String(f.properties.json)) } });
        radar(e.lngLat.lng, e.lngLat.lat, null, false);
      });
      ["rr-ant", "rr-osm", "rr-siti", "rr-siti-c"].forEach((l) => {
        map.on("mouseenter", l, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", l, () => (map.getCanvas().style.cursor = ""));
      });
      setPronto((n) => n + 1);
    },
    [radar],
  );

  // 1. i simboli (forma, colore, anello) dai dati
  useEffect(() => {
    const k = m.current;
    if (!k || !pronto || !viva(k.map)) return;
    const features = istanze.map((a) => {
      const p = a.properties;
      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: a.geometry.coordinates },
        properties: {
          id: a.id, t: tipoDi(p.tipo_intervento), g: tagliaDi(p), c: p.gestori.length > 1, anno: (p.data_pubblicazione ?? "").slice(0, 4) || "nd",
          ops: p.gestori.join("|"), op: p.gestori.join(" · "), json: JSON.stringify(p),
        },
      };
    });
    dati(k.map, "rr-ant", { type: "FeatureCollection", features });
    comparsa(k.map, ["rr-ant"]);
  }, [istanze, pronto]);

  // filtri: tipo, anno, operatore (sulla GPU, senza ricaricare)
  useEffect(() => {
    const k = m.current;
    if (!k || !pronto || !viva(k.map)) return;
    const f: ExpressionSpecification = [
      "all",
      ["in", ["get", "t"], ["literal", (Object.keys(tipi) as Tipo[]).filter((t) => tipi[t])]],
      anno ? ["==", ["get", "anno"], anno] : true,
      operatore ? ["in", operatore, ["get", "ops"]] : true,
    ];
    k.map.setFilter("rr-ant", f);
    k.map.setFilter("rr-osm", operatore ? ["==", ["coalesce", ["get", "operatore"], ""], operatore] : null);
  }, [tipi, anno, operatore, pronto]);

  useEffect(() => {
    const k = m.current;
    if (!k || !pronto || !viva(k.map)) return;
    ["rr-osm", "rr-siti", "rr-siti-c"].forEach((l) => k.map.setLayoutProperty(l, "visibility", esistenti ? "visible" : "none"));
  }, [esistenti, pronto]);

  // antenne in funzione: i grappoli si rifanno sui siti dell'operatore scelto
  useEffect(() => {
    const k = m.current;
    if (!k || !pronto || !viva(k.map)) return;
    const features = operatore ? siti.filter((f) => f.properties.o.split("|").includes(operatore)) : siti;
    dati(k.map, "rr-siti", { type: "FeatureCollection", features } as never);
  }, [siti, operatore, pronto]);

  useEffect(() => {
    const k = m.current;
    if (!k || !pronto || !viva(k.map)) return;
    if (sensibili) k.sens?.();
    else dati(k.map, "rr-sens", { type: "FeatureCollection", features: [] });
  }, [sensibili, pronto]);

  useEffect(() => {
    const k = m.current;
    if (viva(k?.map) && k.map.getLayer("rr-ant-sel")) k.map.setFilter("rr-ant-sel", ["==", ["get", "id"], sel?.tipo === "antenna" ? sel.a.id : -1]);
  }, [sel, pronto]);

  // "Mappa" nell'elenco della Guida: si torna sulla mappa sull'antenna
  useEffect(() => {
    function apri(e: Event) {
      const d = (e as CustomEvent<{ sezione: string; id: number | string }>).detail;
      if (d?.sezione !== "antenne") return;
      const a = istanze.find((x) => String(x.id) === String(d.id));
      if (a) {
        setGuidaAperta(false);
        apriAntenna(a, true);
      }
    }
    window.addEventListener("rr:apri-su-mappa", apri);
    return () => window.removeEventListener("rr:apri-su-mappa", apri);
  }, [istanze, apriAntenna]);

  function trovami() {
    navigator.geolocation?.getCurrentPosition(
      (p) => radar(p.coords.longitude, p.coords.latitude, "La tua posizione", true),
      () => setErrore("Non riesco a sapere dove sei: controlla il permesso di posizione"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }
  const chiudi = () => {
    setSel(null);
    togliRadar();
    riposa(m.current?.map);
  };

  // ------------------------------------------------------------------ barra
  const barra = (
    <div className="flex flex-col gap-2">
      <Cerca
        endpoint="/api/antenne/indirizzo"
        etichetta="Cerca un indirizzo"
        segnaposto="Il tuo indirizzo: che antenne hai vicino?"
        carica={carica}
        onScelto={(l: Luogo) => radar(l.lon, l.lat, l.etichetta, true)}
        coda={<Strumenti onGuida={() => setGuidaAperta(true)} onTrovami={trovami} />}
      />
      <div className={`rounded-[20px] bg-panel/88 backdrop-blur-xl backdrop-saturate-150 p-1.5 shadow-[0_2px_6px_rgba(37,29,28,.08),0_12px_34px_rgba(37,29,28,.16)] ring-1 ring-white/60 ${sel ? "max-lg:hidden" : ""}`}>
        <Tendina
          etichetta="Filtri delle antenne"
          riassunto={
            <Riassunto
              icona={
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="size-[15px]" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: GLIFI.traliccio }} />
                </span>
              }
              parti={[
                (Object.keys(COL) as Tipo[]).every((t) => tipi[t]) && esistenti
                  ? "Tutte le antenne"
                  : [...(Object.keys(COL) as Tipo[]).filter((t) => tipi[t]).map((t) => PLURALE[t]), ...(esistenti ? ["In funzione"] : [])].join(", ") || "Nessun tipo",
                operatore || "Tutti gli operatori",
                sensibili && "Scuole e ospedali",
              ]}
            />
          }
        >
        <div role="group" aria-label="Tipi di antenne (tocca per nascondere)" className="grid grid-cols-4 gap-1">
          {(Object.keys(COL) as Tipo[]).map((t) => {
            const on = tipi[t];
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => setTipi((x) => ({ ...x, [t]: !x[t] }))}
                className={`grid grid-cols-[auto_1fr] items-center gap-x-1.5 gap-y-0.5 rounded-[12px] px-2 py-1.5 text-left transition ${on ? "" : "opacity-45 grayscale hover:opacity-70"}`}
                style={on ? { background: `${COL[t]}12` } : undefined}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full" style={{ background: COL[t], boxShadow: on ? `0 3px 10px ${COL[t]}55` : undefined }}>
                  <svg viewBox="0 0 24 24" className="size-[14px]" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: GLIFI.traliccio }} />
                </span>
                <span className="contents">
                  <span className="block text-[16px] leading-5 font-extrabold text-ink tabular-nums">{conteggi[t]}</span>
                  <span className="col-span-2 block text-[11px] leading-tight font-bold text-muted sm:text-[11.5px]">{PLURALE[t]}</span>
                </span>
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={esistenti}
            onClick={() => setEsistenti((v) => !v)}
            className={`grid grid-cols-[auto_1fr] items-center gap-x-1.5 gap-y-0.5 rounded-[12px] px-2 py-1.5 text-left transition ${esistenti ? "" : "opacity-45 grayscale hover:opacity-70"}`}
            style={esistenti ? { background: `${IN_FUNZIONE}12` } : undefined}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full" style={{ background: IN_FUNZIONE }}>
              <svg viewBox="0 0 24 24" className="size-[14px]" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: GLIFI.cella }} />
            </span>
            <span className="contents">
              <span className="block text-[16px] leading-5 font-extrabold text-ink tabular-nums">{(siti.length + impianti.length).toLocaleString("it-IT", { useGrouping: "always" } as Intl.NumberFormatOptions)}</span>
              <span className="col-span-2 block text-[11px] leading-tight font-bold text-muted sm:text-[11.5px]">In funzione</span>
            </span>
          </button>
        </div>
        <div className="mt-1.5 flex gap-1.5">
          <label className="relative flex h-9 min-w-0 flex-1 items-center rounded-[12px] bg-bg-sink pr-2 pl-3 text-[13px] font-bold text-ink">
            <span className="sr-only">Operatore</span>
            <select value={operatore} onChange={(e) => setOperatore(e.target.value)} className="h-full w-full min-w-0 appearance-none bg-transparent pr-5 outline-none">
              <option value="">Tutti gli operatori</option>
              {operatori.map(([o, n]) => (
                <option key={o} value={o}>
                  {o} ({n})
                </option>
              ))}
            </select>
            <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-2.5 size-3.5 text-muted" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden="true">
              <path d="m5 8 5 5 5-5" />
            </svg>
          </label>
          <button
            type="button"
            aria-pressed={sensibili}
            onClick={() => setSensibili((v) => !v)}
            className={`flex h-9 shrink-0 items-center gap-1.5 rounded-[12px] px-3 text-[13px] font-bold transition ${sensibili ? "bg-[#5B3BA8] text-white" : "bg-bg-sink text-ink-soft hover:text-ink"}`}
          >
            <span className={`size-2.5 rounded-full ${sensibili ? "bg-white" : "bg-[#7A4FD0]"}`} aria-hidden="true" />
            Scuole e ospedali
          </button>
        </div>
        </Tendina>
      </div>
    </div>
  );

  // ------------------------------------------------------------------ schede
  let scheda: ReactNode;
  if (errore) {
    scheda = (
      <Scheda icona={<Tondo colore="#8A807E" glifo={GLIFI.cella} />} titolo="Qualcosa non va" onChiudi={() => setErrore(null)}>
        <p className="text-[15px] text-ink-soft">{errore}</p>
      </Scheda>
    );
  } else if (sel?.tipo === "antenna") {
    scheda = <SchedaAntenna a={sel.a} onChiudi={chiudi} onRadar={() => radar(sel.a.geometry.coordinates[0], sel.a.geometry.coordinates[1], sel.a.properties.indirizzo, true)} />;
  } else if (sel?.tipo === "sito") {
    scheda = <SchedaSito f={sel.f} onChiudi={chiudi} onRadar={() => radar(sel.f.geometry.coordinates[0], sel.f.geometry.coordinates[1], null, true)} onGuida={() => setGuidaAperta(true)} />;
  } else if (sel?.tipo === "impianto") {
    scheda = <SchedaImpianto f={sel.f} onChiudi={chiudi} onRadar={() => radar(sel.f.geometry.coordinates[0], sel.f.geometry.coordinates[1], sel.f.properties.nome, true)} />;
  } else if (sel?.tipo === "radar") {
    scheda = <SchedaRadar {...sel} istanze={istanze} impianti={impianti} siti={siti} onChiudi={chiudi} onAntenna={(a) => apriAntenna(a, true)} onGuida={() => setGuidaAperta(true)} />;
  } else {
    scheda = <Panoramica istanze={istanze} esistenti={impianti.length + siti.length} anno={anno} onAnno={setAnno} conteggi={conteggi} />;
  }

  return (
    <Schermo
      mappa={<MappaVettoriale centro={[41.893, 12.4829]} zoom={11.6} titolo="Mappa delle antenne di telefonia mobile a Roma" fonti={FONTI} onPronta={pronta} />}
      barra={barra}
      scheda={scheda}
      guida={{ titolo: "Antenne a Roma", schede: guida }}
      guidaAperta={guidaAperta}
      onGuida={setGuidaAperta}
    />
  );
}

// ==================================================================== schede
function SchedaAntenna({ a, onChiudi, onRadar }: { a: Istanza; onChiudi: () => void; onRadar: () => void }) {
  const p = a.properties;
  const t = tipoDi(p.tipo_intervento), g = tagliaDi(p);
  const s = p.sito_sensibile_vicino;
  const scia = /SCIA/i.test(p.regime ?? ""), aut = /autorizzazione/i.test(p.regime ?? "");
  return (
    <Scheda icona={<Tondo colore={COL[t]} glifo={g === "macro" ? GLIFI.traliccio : GLIFI.cella} />} sopra={`${TAGLIA[g]}${p.quartiere ? ` · ${p.quartiere}` : ""}`} titolo={p.indirizzo ?? "Indirizzo non indicato"} onChiudi={onChiudi}>
      <div className="rounded-[16px] px-3.5 py-3" style={{ background: `${COL[t]}16` }}>
        <p className="text-[19px] leading-6 font-extrabold tracking-[-.01em]" style={{ color: COL[t] }}>
          {p.tipo_intervento === "adeguamento" ? "Adeguamento di un impianto" : NOME[t]}
        </p>
        <p className="mt-0.5 truncate text-[13px] font-semibold text-ink-soft">
          {p.gestori.join(" + ")}
          {p.gestori.length > 1 ? " · sito condiviso" : ""}
        </p>
      </div>
      <div className="mt-2.5">
        <Fatti
          voci={[
            { l: "Pubblicata", v: p.data_pubblicazione ? new Date(p.data_pubblicazione).toLocaleDateString("it-IT", { day: "numeric", month: "short" }) : "—", nota: p.data_pubblicazione?.slice(0, 4) ?? "senza data" },
            { l: "Procedura", v: scia ? "SCIA" : aut ? "Autorizz." : "—", nota: scia ? "bassa potenza" : aut ? "da approvare" : "non indicata" },
            s ? { l: CATEGORIE[s.categoria] ?? "Sito sensibile", v: metri(s.distanza_m), nota: s.nome ?? "il più vicino" } : { l: "Sito sensibile", v: "—", nota: "nessuno vicino" },
          ]}
        />
      </div>
      <Azioni>
        {p.url_avviso ? (
          <Azione primaria href={p.url_avviso}>
            Avviso ufficiale
          </Azione>
        ) : null}
        <Azione onClick={onRadar}>Cosa c&apos;è intorno</Azione>
      </Azioni>
    </Scheda>
  );
}

function SchedaSito({ f, onChiudi, onRadar, onGuida }: { f: FSito; onChiudi: () => void; onRadar: () => void; onGuida: () => void }) {
  const p = f.properties;
  const operatori = p.o.split("|").filter((x) => x && x !== "Altro");
  const tecnologie = p.t.split(" ").filter(Boolean);
  return (
    <Scheda icona={<Tondo colore={IN_FUNZIONE} glifo={GLIFI.cella} />} sopra="Antenna in funzione · rilevata dai telefoni" titolo={operatori.join(" + ") || "Operatore non riconosciuto"} onChiudi={onChiudi}>
      <div className="rounded-[16px] px-3.5 py-3" style={{ background: `${IN_FUNZIONE}12` }}>
        <p className="text-[19px] leading-6 font-extrabold tracking-[-.01em]" style={{ color: IN_FUNZIONE }}>
          {tecnologie.join(" · ") || "Rete mobile"}
        </p>
        <p className="mt-0.5 truncate text-[13px] font-semibold text-ink-soft">
          {operatori.length > 1 ? "Sito condiviso · " : ""}posizione stimata{p.p ? ` (±${Math.max(30, p.p)} m)` : ""} · OpenCelliD
        </p>
      </div>
      <div className="mt-2.5">
        <Fatti
          voci={[
            { l: "Operatori", v: String(Math.max(1, operatori.length)), nota: operatori.length > 1 ? "sullo stesso sito" : (operatori[0] ?? "—") },
            { l: "Celle radio", v: String(p.n), nota: "trasmettitori" },
            { l: "Rilevata", v: p.a ? new Date(`${p.a}-01`).toLocaleDateString("it-IT", { month: "short", year: "numeric" }) : "—", nota: "ultima misura" },
          ]}
        />
      </div>
      <Azioni>
        <Azione primaria onClick={onRadar}>
          Cosa c&apos;è intorno
        </Azione>
        <Azione onClick={onGuida}>Da dove viene</Azione>
      </Azioni>
    </Scheda>
  );
}

function SchedaImpianto({ f, onChiudi, onRadar }: { f: FImpianto; onChiudi: () => void; onRadar: () => void }) {
  const p = f.properties;
  const tipo = p.tipo === "traliccio" ? "Traliccio" : p.tipo === "palo" ? "Palo" : "Antenna";
  return (
    <Scheda icona={<Tondo colore={ESISTENTE} glifo={p.tipo === "antenna" ? GLIFI.cella : GLIFI.traliccio} />} sopra="Impianto esistente · OpenStreetMap" titolo={p.nome ?? `${tipo} per telecomunicazioni`} onChiudi={onChiudi}>
      <div className="rounded-[16px] px-3.5 py-3" style={{ background: `${ESISTENTE}12` }}>
        <p className="text-[19px] leading-6 font-extrabold tracking-[-.01em]" style={{ color: ESISTENTE }}>
          {p.mobile ? "Telefonia mobile" : "Telecomunicazioni"}
        </p>
        <p className="mt-0.5 truncate text-[13px] font-semibold text-ink-soft">{p.operatore ?? "Operatore non indicato"} · censito su OpenStreetMap</p>
      </div>
      <div className="mt-2.5">
        <Fatti
          voci={[
            { l: "Tipo", v: tipo, nota: "struttura" },
            { l: "Altezza", v: p.altezza_m ? `${Math.round(Number(p.altezza_m))} m` : "—", nota: p.altezza_m ? "dichiarata" : "non indicata" },
            { l: "Cellulari", v: p.mobile ? "Sì" : "—", nota: p.mobile ? "dichiarato" : "non indicato" },
          ]}
        />
      </div>
      <Azioni>
        <Azione primaria href={`https://www.openstreetmap.org/${p.osm}`}>
          Su OpenStreetMap
        </Azione>
        <Azione onClick={onRadar}>Cosa c&apos;è intorno</Azione>
      </Azioni>
    </Scheda>
  );
}

function SchedaRadar({ lon, lat, etichetta, c, istanze, impianti, siti, onChiudi, onAntenna, onGuida }: { lon: number; lat: number; etichetta: string | null; c: Contesto | null; istanze: Istanza[]; impianti: FImpianto[]; siti: FSito[]; onChiudi: () => void; onAntenna: (a: Istanza) => void; onGuida: () => void }) {
  const vicine = istanze.map((a) => ({ a, d: distanza([lon, lat], a.geometry.coordinates) })).sort((x, y) => x.d - y.d);
  // in funzione: impianti OSM e siti stimati insieme
  const esist = [
    ...impianti.map((f) => ({ f: { properties: { operatore: f.properties.operatore } }, d: distanza([lon, lat], f.geometry.coordinates) })),
    ...siti.map((f) => ({ f: { properties: { operatore: f.properties.o.split("|").filter((x) => x !== "Altro").join(", ") || null } }, d: distanza([lon, lat], f.geometry.coordinates) })),
  ].sort((x, y) => x.d - y.d);
  const prima = vicine[0];
  const primoEsist = esist[0];
  const esistPiuVicino = !!primoEsist && (!prima || primoEsist.d < prima.d);
  const per = ANELLI.map((r) => vicine.filter((x) => x.d <= r).length + esist.filter((x) => x.d <= r).length);
  const perE = ANELLI.map((r) => esist.filter((x) => x.d <= r).length);
  const t = prima ? tipoDi(prima.a.properties.tipo_intervento) : "modifica";
  const s = c?.siti_sensibili_piu_vicini[0];
  return (
    <Scheda icona={<Tondo colore="#251D1C" glifo={GLIFI.cella} />} sopra={c?.quartiere ? `${c.quartiere.nome}${c.municipio ? ` · ${c.municipio.nome}` : ""}` : "Raggio di 500 m"} titolo={etichetta ? maiuscola(etichetta) : "Punto scelto sulla mappa"} onChiudi={onChiudi}>
      <div className="flex items-center gap-3 rounded-[16px] bg-bg-sink px-3.5 py-3">
        <p className="shrink-0 text-[34px] leading-none font-extrabold tracking-[-.03em] tabular-nums" style={{ color: esistPiuVicino ? IN_FUNZIONE : prima && prima.d <= 500 ? COL[t] : "#251D1C" }}>
          {esistPiuVicino ? metri(primoEsist.d) : prima ? metri(prima.d) : "—"}
        </p>
        {esistPiuVicino ? (
          <span className="min-w-0">
            <span className="block text-[13px] font-bold text-ink">l&apos;antenna in funzione più vicina</span>
            <span className="block truncate text-[12.5px] font-semibold text-ink-soft">
              {primoEsist.f.properties.operatore ?? "operatore non indicato"} · in funzione{prima ? ` · richiesta a ${metri(prima.d)}` : ""}
            </span>
          </span>
        ) : (
          <button type="button" disabled={!prima} onClick={() => prima && onAntenna(prima.a)} className="min-w-0 text-left">
            <span className="block text-[13px] font-bold text-ink">l&apos;antenna più vicina</span>
            <span className="block truncate text-[12.5px] font-semibold text-ink-soft underline decoration-line underline-offset-2">{prima ? `${prima.a.properties.indirizzo ?? ""} · ${prima.a.properties.gestori.join(", ")}` : ""}</span>
          </button>
        )}
      </div>
      <div className="mt-2.5">
        <Fatti voci={ANELLI.map((r, i) => ({ l: `Entro ${r} m`, v: String(per[i]), nota: perE[i] ? `${perE[i]} in funzione` : per[i] === 1 ? "richiesta" : "richieste" }))} />
      </div>
      <p className="mt-2.5 truncate text-[13px] text-ink-soft">
        {s ? (
          <>
            <b className="text-ink">{CATEGORIE[s.categoria] ?? "Sito sensibile"}</b> {s.nome ?? ""} a {metri(s.distanza_m)}
          </>
        ) : c ? (
          "Nessun sito sensibile vicino"
        ) : (
          "Cerco scuole e ospedali vicini…"
        )}
        {c?.aree_vincolate[0] ? ` · ${c.aree_vincolate[0].nome}` : ""}
      </p>
      <Azioni>
        <Azione primaria href={ARPA}>
          Chiedi una misura
        </Azione>
        <Azione onClick={onGuida}>Limiti di legge</Azione>
      </Azioni>
    </Scheda>
  );
}

/** Quando non c'e' niente di scelto: legenda (forma e colore) e linea del tempo delle richieste. */
function Panoramica({ istanze, esistenti, anno, onAnno, conteggi }: { istanze: Istanza[]; esistenti: number; anno: string | null; onAnno: (a: string | null) => void; conteggi: Record<Tipo, number> }) {
  const mesi = useMemo(() => {
    const c = new Map<string, number>();
    istanze.forEach((a) => {
      const d = a.properties.data_pubblicazione?.slice(0, 7);
      if (d) c.set(d, (c.get(d) ?? 0) + 1);
    });
    const tutti = [...c.keys()].sort();
    if (!tutti.length) return [];
    const out: { m: string; n: number }[] = [];
    let [a, mm] = tutti[0].split("-").map(Number);
    const [a1, m1] = tutti[tutti.length - 1].split("-").map(Number);
    while (a < a1 || (a === a1 && mm <= m1)) {
      const k = `${a}-${String(mm).padStart(2, "0")}`;
      out.push({ m: k, n: c.get(k) ?? 0 });
      if (mm === 12) {
        a++;
        mm = 1;
      } else mm++;
    }
    return out;
  }, [istanze]);
  const max = Math.max(1, ...mesi.map((x) => x.n));
  const anni = [...new Set(mesi.map((x) => x.m.slice(0, 4)))];
  const senzaData = istanze.filter((a) => !a.properties.data_pubblicazione).length;
  return (
    <div className="pointer-events-auto rounded-[20px] bg-panel/95 px-4 py-3.5 shadow-[0_6px_24px_rgba(37,29,28,.16)] ring-1 ring-black/5 backdrop-blur">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[14px] font-bold text-ink">
          {esistenti ? esistenti.toLocaleString("it-IT", { useGrouping: "always" } as Intl.NumberFormatOptions) : "…"} antenne in funzione <span className="font-semibold text-muted">· {istanze.length || "…"} richieste</span>
        </p>
        <p className="shrink-0 text-[12px] text-muted max-lg:hidden">tocca: radar 500 m</p>
      </div>
      <ul className="rr-scorri mt-2 flex gap-x-3.5 overflow-x-auto text-[12.5px] font-semibold whitespace-nowrap text-ink-soft">
        <li className="flex items-center gap-1.5">
          <Mini glifo={GLIFI.traliccio} grande /> Stazione radio base
        </li>
        <li className="flex items-center gap-1.5">
          <Mini glifo={GLIFI.cella} /> Piccola antenna
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded-full border-[2.5px] border-ink bg-[#3366CC]" aria-hidden="true" /> Condivisa
        </li>
      </ul>
      {mesi.length > 0 && (
        <div className="mt-3">
          <div className="flex h-8 items-end gap-[2px] lg:h-10" role="img" aria-label="Richieste pubblicate mese per mese">
            {mesi.map((x) => (
              <div
                key={x.m}
                title={`${new Date(`${x.m}-01`).toLocaleDateString("it-IT", { month: "long", year: "numeric" })}: ${x.n}`}
                className="min-w-0 flex-1 rounded-t-[2px] transition-colors"
                style={{ height: `${x.n ? Math.max(8, (x.n / max) * 100) : 3}%`, background: !anno || x.m.startsWith(anno) ? "#251D1C" : "#DAD3C8" }}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {[null, ...anni].map((x) => (
              <button
                key={x ?? "tutte"}
                type="button"
                aria-pressed={anno === x}
                onClick={() => onAnno(x)}
                className={`h-8 rounded-full px-3 text-[12.5px] font-bold ${anno === x ? "bg-ink text-white" : "bg-bg-sink text-ink-soft hover:text-ink"}`}
              >
                {x ?? "Tutte"}
                <span className="ml-1 font-semibold opacity-70 tabular-nums">{x ? istanze.filter((i) => i.properties.data_pubblicazione?.startsWith(x)).length : istanze.length}</span>
              </button>
            ))}
            {senzaData > 0 && <span className="text-[11.5px] text-muted">+{senzaData} senza data</span>}
          </div>
        </div>
      )}
      <p className="mt-2 text-[11px] leading-snug text-muted max-lg:hidden">
        In funzione: celle rilevate dai telefoni © OpenCelliD (CC BY-SA 4.0) e impianti © OpenStreetMap. Richieste: Roma Capitale.
      </p>
      <p className="sr-only">
        {(Object.keys(COL) as Tipo[]).map((t) => `${PLURALE[t]}: ${conteggi[t]}`).join(", ")}
      </p>
    </div>
  );
}

function Mini({ glifo, grande }: { glifo: string; grande?: boolean }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-[#6F6560] ${grande ? "size-5" : "size-3.5"}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" className={grande ? "size-3.5" : "size-2.5"} fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: glifo }} />
    </span>
  );
}
