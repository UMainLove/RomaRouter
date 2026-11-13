export interface Punto {
  lat: number;
  lon: number;
}

/** Distanza in metri tra due punti (formula dell'emisenoverso). */
export function distanzaMetri(a: Punto, b: Punto): number {
  const R = 6371000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formattaDistanza(metri: number): string {
  if (metri < 1000) return `${Math.round(metri / 10) * 10} m`;
  return `${(metri / 1000).toFixed(1).replace(".", ",")} km`;
}

/** Normalizza un testo per i confronti: minuscolo, senza accenti, spazi singoli. */
export function normalizza(testo: string): string {
  return testo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
