// Interpretazione delle coordinate pubblicate dal Comune (formati misti, errori di battitura).
// Ogni interpretazione è dichiarata: 'originale' se il testo è valido così com'è,
// 'corretta' se abbiamo applicato una correzione deterministica e documentata.

export type Metodo = "originale" | "corretta";
export interface Candidato {
  valore: number;
  metodo: Metodo;
  nota: string | null;
}

// Riquadro che contiene tutto il territorio di Roma Capitale (controllo di plausibilità)
export const BBOX_ROMA = { latMin: 41.6, latMax: 42.12, lonMin: 12.2, lonMax: 12.88 };

export function dentroRoma(lat: number, lon: number): boolean {
  return lat >= BBOX_ROMA.latMin && lat <= BBOX_ROMA.latMax && lon >= BBOX_ROMA.lonMin && lon <= BBOX_ROMA.lonMax;
}

/** Distanza in metri tra due punti (formula dell'emisenoverso). */
export function distanzaM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function normalizza(testo: string): string {
  return testo
    .replace(/&deg;|º|˚/g, "°")
    .replace(/[″“”]|''/g, '"')
    .replace(/[′’‘`´]/g, "'")
    .replace(/\b(lat(itudine)?|long?(itudine)?|lng)\b\.?\s*:?/gi, " ")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Restituisce le interpretazioni possibili di una coordinata (lat o lon) scritta come testo.
 * Esempi gestiti: 41.735933 N · 41°44' 14.92" N · 41°734438 N · 41° 74 69.21" · 41°86'61.11''N
 */
export function interpreta(testo: string | null | undefined): Candidato[] {
  if (!testo) return [];
  const t = normalizza(testo);
  if (!/\d/.test(t)) return [];
  const sud = /\b[SW]\b|\bO\b|ovest|sud/i.test(t) ? -1 : 1; // Roma è N/E, ma gestiamo il segno per sicurezza

  // 1) Decimale puro: 41.735933
  const dec = t.match(/^\D*?(\d{1,3}\.\d{3,})\D*$/);
  if (dec) return [{ valore: sud * Number(dec[1]), metodo: "originale", nota: null }];

  // 2) Simbolo dei gradi usato come separatore decimale: 41°734438
  const gradiDec = t.match(/^\D*?(\d{1,3})\s*°\s*(\d{4,})\D*$/);
  if (gradiDec) {
    return [{
      valore: sud * Number(`${gradiDec[1]}.${gradiDec[2]}`),
      metodo: "corretta",
      nota: `"${testo.trim()}" letto come decimale: il simbolo ° era usato come virgola`,
    }];
  }

  const numeri = [...t.matchAll(/\d+(?:\.\d+)?/g)].map((m) => m[0]);
  if (numeri.length < 2 || numeri.length > 3) return [];
  const [gS, mS, sS = "0"] = numeri;
  const g = Number(gS), m = Number(mS), s = Number(sS);

  // 3) Gradi e minuti decimali: 41° 54.123'
  if (numeri.length === 2 && mS.includes(".")) {
    if (m < 60) return [{ valore: sud * (g + m / 60), metodo: "originale", nota: null }];
  }

  // 4) Gradi, minuti, secondi validi. Negli elenchi di Roma capita però che un decimale sia
  //    "travestito" da DMS (12°52'12.2" = 12.52122): teniamo anche quella lettura come alternativa,
  //    che vince solo se l'indirizzo geocodificato la conferma.
  if (m < 60 && s < 60) {
    const cifreAlt = `${mS}${sS.replace(".", "")}`;
    return [
      { valore: sud * (g + m / 60 + s / 3600), metodo: "originale", nota: null },
      { valore: sud * Number(`${g}.${cifreAlt}`), metodo: "corretta", nota: `"${testo.trim()}" letto come decimale ${g}.${cifreAlt} (gradi/minuti/secondi usati come separatori)` },
    ];
  }

  // 5) DMS non valido (minuti o secondi >= 60): due correzioni possibili, scelte poi con il geocoding
  const cifre = `${mS}${sS.replace(".", "")}`;
  const candidati: Candidato[] = [
    {
      valore: sud * Number(`${g}.${cifre}`),
      metodo: "corretta",
      nota: `"${testo.trim()}" non valido (minuti/secondi ≥ 60): letto come decimale ${g}.${cifre}`,
    },
    {
      valore: sud * (g + m / 60 + s / 3600),
      metodo: "corretta",
      nota: `"${testo.trim()}" non valido (minuti/secondi ≥ 60): calcolato con riporto aritmetico`,
    },
  ];
  return candidati;
}

export interface Scelta {
  lat: number;
  lon: number;
  metodo: Metodo;
  nota: string | null;
}

/**
 * Sceglie la coppia lat/lon più plausibile tra i candidati:
 * deve cadere nel territorio di Roma; se c'è un punto geocodificato dall'indirizzo,
 * vince il candidato più vicino. Gestisce anche lat/lon invertite.
 */
export function scegli(latC: Candidato[], lonC: Candidato[], riferimento?: { lat: number; lon: number }): Scelta | null {
  const coppie: Scelta[] = [];
  for (const a of latC) {
    for (const b of lonC) {
      const note = [a.nota, b.nota].filter(Boolean) as string[];
      const metodo: Metodo = a.metodo === "originale" && b.metodo === "originale" ? "originale" : "corretta";
      if (dentroRoma(a.valore, b.valore)) coppie.push({ lat: a.valore, lon: b.valore, metodo, nota: note.join("; ") || null });
      else if (dentroRoma(b.valore, a.valore)) {
        coppie.push({ lat: b.valore, lon: a.valore, metodo: "corretta", nota: [...note, "latitudine e longitudine erano invertite"].join("; ") });
      }
    }
  }
  if (coppie.length === 0) return null;
  if (riferimento) {
    coppie.sort((x, y) => distanzaM(x.lat, x.lon, riferimento.lat, riferimento.lon) - distanzaM(y.lat, y.lon, riferimento.lat, riferimento.lon));
    return coppie[0];
  }
  // Senza riferimento: preferisci l'interpretazione originale, poi la prima correzione
  return coppie.find((c) => c.metodo === "originale") ?? coppie[0];
}
