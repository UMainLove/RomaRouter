import type { ExpressionSpecification, Map as MapLibre } from "maplibre-gl";

/*
 * Effetti «da video» comuni a tutte le mappe, sempre misurati (chi chiede meno animazioni non li vede):
 *  - atmosfera: cielo caldo e foschia all'orizzonte quando la camera e' inclinata, luce radente sui palazzi;
 *  - alone: un bagliore morbido sotto i puntini, che da lontano fa brillare la citta' dove ci sono le cose;
 *  - comparsa: le spille scendono al loro posto e si accendono, invece di apparire di colpo.
 */

export const fermo = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const viva = (map: MapLibre) => !(map as MapLibre & { _removed?: boolean })._removed && !!(map as unknown as { style?: unknown }).style;

/** Cielo, foschia e luce: si vedono quando la camera si inclina sui palazzi. */
export function atmosfera(map: MapLibre) {
  try {
    map.setSky({
      "sky-color": "#DCE7EE",
      "horizon-color": "#F4EBDD",
      "fog-color": "#F3EEE4",
      "sky-horizon-blend": 0.7,
      "horizon-fog-blend": 0.75,
      "fog-ground-blend": 0.55,
      "atmosphere-blend": 0,
    });
    map.setLight({ anchor: "viewport", color: "#FFF6E8", intensity: 0.42, position: [1.4, 210, 38] });
  } catch {
    /* stile senza supporto: niente atmosfera */
  }
}

/** Alone morbido sotto i puntini di una sorgente (da lontano), nel colore di ciascun punto. */
export function alone(map: MapLibre, id: string, sorgente: string, colore: ExpressionSpecification | string, prima?: string, maxzoom = 14.6) {
  map.addLayer(
    {
      id,
      type: "circle",
      source: sorgente,
      maxzoom,
      paint: {
        "circle-color": colore as never,
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9.5, 7, 12, 13, 14.6, 20],
        "circle-blur": 1,
        "circle-opacity": ["interpolate", ["linear"], ["zoom"], 9.5, 0.28, 13.5, 0.2, 14.6, 0],
      },
    },
    prima,
  );
}

/** Le spille scendono di qualche pixel e si accendono (paint: niente ricalcolo della disposizione). */
export function comparsa(map: MapLibre, livelli: string[], durata = 650) {
  const presenti = livelli.filter((l) => map.getLayer(l));
  if (!presenti.length || fermo()) return;
  const t0 = performance.now();
  const passo = (t: number) => {
    if (!viva(map)) return;
    const f = Math.min(1, (t - t0) / durata);
    const e = 1 - Math.pow(1 - f, 3);
    for (const l of presenti) {
      if (map.getLayer(l)?.type !== "symbol") continue;
      map.setPaintProperty(l, "icon-opacity", e);
      map.setPaintProperty(l, "icon-translate", [0, -14 * (1 - e)]);
    }
    if (f < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}
