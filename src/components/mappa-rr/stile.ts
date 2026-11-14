import type { StyleSpecification } from "maplibre-gl";

/*
 * "Roma": il fondo delle mappe di RomaRouter. Base OpenFreeMap Liberty (vettoriale, dati OpenStreetMap,
 * senza chiavi): la piu' ricca delle mappe aperte, con parchi, fiumi, ferrovie, metro ed edifici in 3D.
 * La ricoloriamo coi toni della citta': travertino, tufo, Tevere, pini; strade calde, edifici chiari.
 * Spente le icone dei negozi e i segnali stradali: i dati delle sezioni restano i protagonisti.
 */
const BASE = "https://tiles.openfreemap.org/styles/liberty";

export const ROMA = {
  fondo: "#F3EEE4", // travertino
  residenziale: "#EEE6D8",
  verde: "#D2E1BE",
  prato: "#DAE6C8",
  bosco: "#C6D8AE",
  bordoVerde: "#B9CE9D",
  acqua: "#A6C9D8", // Tevere
  testoAcqua: "#3F7590",
  ospedale: "#F3E1DE",
  scuola: "#F2EAD3",
  edificio: "#E4DACA",
  bordoEdificio: "#D3C6B2",
  edificio3d: "#E8DECF",
  autostrada: "#F2CF98",
  primaria: "#F9E4BC",
  secondaria: "#FFF4DE",
  strada: "#FFFFFF",
  pedonale: "#FBF7EF",
  bordoStrada: "#DED0BA",
  ferrovia: "#B9AE9F",
  testo: "#5C524E",
  testoForte: "#2B2321",
};

let cache: Promise<StyleSpecification> | null = null;

export function stileRoma(): Promise<StyleSpecification> {
  cache ??= fetch(BASE)
    .then((r) => r.json() as Promise<StyleSpecification>)
    .then(ricolora)
    .catch((e) => {
      cache = null;
      throw e;
    });
  return cache;
}

type Livello = StyleSpecification["layers"][number] & { paint?: Record<string, unknown>; layout?: Record<string, unknown> };

function strada(id: string) {
  if (/motorway/.test(id)) return ROMA.autostrada;
  if (/trunk_primary/.test(id)) return ROMA.primaria;
  if (/secondary_tertiary/.test(id)) return ROMA.secondaria;
  if (/path_pedestrian/.test(id)) return ROMA.pedonale;
  return ROMA.strada;
}

function ricolora(s: StyleSpecification): StyleSpecification {
  for (const l of s.layers as Livello[]) {
    const id = l.id;
    l.paint ??= {};
    l.layout ??= {};
    const p = l.paint, lay = l.layout;
    const nascondi = () => (lay.visibility = "none");

    if (l.type === "background") p["background-color"] = ROMA.fondo;
    else if (id === "natural_earth") p["raster-opacity"] = 0.22;
    else if (id === "park") p["fill-color"] = ROMA.verde;
    else if (id === "park_outline") {
      p["line-color"] = ROMA.bordoVerde;
      p["line-opacity"] = 0.6;
    } else if (id === "landuse_residential") p["fill-color"] = ROMA.residenziale;
    else if (id === "landcover_wood") p["fill-color"] = ROMA.bosco;
    else if (id === "landcover_grass" || id === "landuse_pitch" || id === "landuse_cemetery") p["fill-color"] = ROMA.prato;
    else if (id === "landuse_hospital") p["fill-color"] = ROMA.ospedale;
    else if (id === "landuse_school") p["fill-color"] = ROMA.scuola;
    else if (id === "water") p["fill-color"] = ROMA.acqua;
    else if (/^waterway/.test(id) && l.type === "line") p["line-color"] = ROMA.acqua;
    else if (id === "building") {
      p["fill-color"] = ROMA.edificio;
      p["fill-outline-color"] = ROMA.bordoEdificio;
    } else if (id === "building-3d") {
      p["fill-extrusion-color"] = ROMA.edificio3d;
      p["fill-extrusion-opacity"] = ["interpolate", ["linear"], ["zoom"], 14.6, 0, 15.6, 0.88];
      p["fill-extrusion-vertical-gradient"] = true;
    } else if (/one_way_arrow|shield|poi_r7|poi_r20/.test(id)) nascondi();
    else if (l.type === "line" && /rail/.test(id)) p["line-color"] = ROMA.ferrovia;
    else if (l.type === "line" && /casing/.test(id)) p["line-color"] = ROMA.bordoStrada;
    else if (l.type === "line" && /^(road|bridge|tunnel)_/.test(id)) {
      p["line-color"] = strada(id);
      if (id.startsWith("tunnel_")) p["line-opacity"] = 0.6;
    } else if (l.type === "line" && /boundary/.test(id)) p["line-opacity"] = 0.3;
    else if (l.type === "symbol") {
      // nomi in italiano (OpenFreeMap a volte da' quelli inglesi: "Rome")
      if (JSON.stringify(lay["text-field"] ?? "").includes("name")) lay["text-field"] = ["coalesce", ["get", "name:it"], ["get", "name"], ["get", "name:latin"]];
      p["text-color"] = /water/.test(id) ? ROMA.testoAcqua : /label_(city|town|state|country)/.test(id) ? ROMA.testoForte : ROMA.testo;
      p["text-halo-color"] = ROMA.fondo;
      p["text-halo-width"] = 1.4;
      if (id === "poi_transit") {
        // solo metro e treni: le fermate dell'autobus sono migliaia e coprono tutto
        (l as { filter?: unknown }).filter = ["match", ["get", "class"], ["rail"], true, false];
        p["text-color"] = "#2E5A80";
        l.minzoom = Math.max(l.minzoom ?? 0, 13);
      }
      if (id === "poi_r1") {
        // solo i luoghi piu' importanti (monumenti, musei, chiese), discreti e da vicino
        p["icon-opacity"] = 0.7;
        p["text-opacity"] = 0.85;
        l.minzoom = Math.max(l.minzoom ?? 0, 16);
      }
    }
  }
  return s;
}

/** Il primo livello di etichette del fondo: i dati delle sezioni vanno sotto, cosi' i nomi restano leggibili. */
export function primoTesto(map: { getStyle: () => StyleSpecification }) {
  return map.getStyle().layers.find((l) => l.type === "symbol" && (l as Livello).layout?.visibility !== "none")?.id;
}
