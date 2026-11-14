/*
 * Le spille della mappa dello sport. A goccia, con la punta sul punto esatto: il colore dice come si entra,
 * il glifo dice lo sport, il bollino in alto quanti campi ci sono. Ombra morbida, bordo bianco, una luce
 * in alto che le fa sembrare in rilievo. Disegnate in SVG e rasterizzate al doppio della risoluzione.
 */
import type { Map as MapLibre } from "maplibre-gl";

/** Glifi a tratto (0..24), piu' pieni e leggibili anche piccoli. */
export const GLIFI_PIN: Record<string, string> = {
  calcio: `<circle cx="12" cy="12" r="9"/><path d="m12 7.6 4.2 3-1.6 4.9H9.4L7.8 10.6Z" fill="#fff"/><path d="M12 3v4.6M16.2 10.6l4.4-1.4M14.6 15.5l2.7 3.8M9.4 15.5l-2.7 3.8M7.8 10.6 3.4 9.2"/>`,
  tennis: `<circle cx="12" cy="12" r="9"/><path d="M5.2 5.6c3.9 3.2 3.9 9.6 0 12.8M18.8 5.6c-3.9 3.2-3.9 9.6 0 12.8"/>`,
  padel: `<rect x="5.5" y="2.8" width="11" height="12.5" rx="5.5" transform="rotate(35 11 9)"/><path d="m8.2 15.6-4 4.6"/><circle cx="18.6" cy="17.6" r="2.4" fill="#fff"/>`,
  nuoto: `<circle cx="16.5" cy="6" r="2.2" fill="#fff"/><path d="m4.5 13 5-4 3.4 2.8 3.4-2.2"/><path d="M2.5 17c1.6 1.3 3.2 1.3 4.8 0s3.2-1.3 4.8 0 3.2 1.3 4.8 0 3.2-1.3 4.8 0"/>`,
  basket: `<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5.6 5.6c2.8 3.6 2.8 9.2 0 12.8M18.4 5.6c-2.8 3.6-2.8 9.2 0 12.8"/>`,
  volley: `<circle cx="12" cy="12" r="9"/><path d="M12 3c-1.8 4.2.4 7.6 5 9.2M12 12c-4.4.6-7.4 3.2-8 6.4M12 12c2.6 3.2 3 6.6 1.7 9M7.6 4.1c3.3 1.6 4.7 4.6 4.4 7.9"/>`,
  palestra: `<path d="M8.2 12h7.6"/><rect x="4.6" y="7" width="3.6" height="10" rx="1.2" fill="#fff"/><rect x="15.8" y="7" width="3.6" height="10" rx="1.2" fill="#fff"/><path d="M3 10v4M21 10v4"/>`,
  corsa: `<circle cx="15" cy="4.6" r="2.1" fill="#fff"/><path d="m7.6 21 3.2-6.2 3.3 2.7 1.1 3.5M10.8 14.8l1.8-6-3.9 1.2-2.2 3.2M12.6 8.8l3.2 2.8 3.8-.6"/>`,
  altro: `<circle cx="12" cy="14" r="6.2"/><path d="m12 10.6 1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3Z" fill="#fff" stroke="none"/><path d="M8.6 3h6.8l-2 4.9h-2.8Z"/>`,
  fitness: `<path d="M8.6 8.6a3.4 3.4 0 1 1 6.8 0"/><path d="M7.2 10.4h9.6l1.4 7.4a3 3 0 0 1-2.9 3.6H8.7a3 3 0 0 1-2.9-3.6Z" fill="#fff" fill-opacity=".22"/>`,
};

const PR = 2;
const W = 40, H = 50;

/** SVG di una spilla: goccia colorata, glifo bianco, bollino col numero di campi (n >= 2). */
export function svgSpilla(colore: string, glifo: string, n = 0) {
  const bollino =
    n >= 2
      ? `<g><circle cx="${W - 8}" cy="9" r="8" fill="#fff" stroke="${colore}" stroke-width="1.6"/>
         <text x="${W - 8}" y="12.4" text-anchor="middle" font-family="Montserrat, 'Noto Sans', Arial, sans-serif" font-size="${n > 9 ? 8.5 : 10}" font-weight="800" fill="${colore}">${n > 9 ? "9+" : n}</text></g>`
      : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * PR}" height="${H * PR}">
    <defs>
      <filter id="s" x="-40%" y="-30%" width="180%" height="170%"><feDropShadow dx="0" dy="2.2" stdDeviation="2" flood-color="#1b1412" flood-opacity=".38"/></filter>
      <linearGradient id="l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
    </defs>
    <ellipse cx="20" cy="47" rx="5.5" ry="1.8" fill="#1b1412" opacity=".18"/>
    <g filter="url(#s)">
      <path d="M20 46.5c-1.2 0-2-.8-2.6-1.8L12 36.6A16 16 0 1 1 28 36.6l-5.4 8.1c-.6 1-1.4 1.8-2.6 1.8Z" fill="${colore}" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>
    </g>
    <path d="M20 44.2c-.5 0-.9-.4-1.2-.9L13.4 35.2A14.6 14.6 0 1 1 26.6 35.2l-5.4 8.1c-.3.5-.7.9-1.2.9Z" fill="url(#b)"/>
    <path d="M20 5.4a13 13 0 0 0-13 13c0 1.3.2 2.6.6 3.8A16 16 0 0 1 33 15.6 13 13 0 0 0 20 5.4Z" fill="url(#l)"/>
    <g transform="translate(9.2 9.6) scale(.9)" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${glifo}</g>
    ${bollino}
  </svg>`;
}

/** Prepara le spille che servono (nomi «pin-<glifo>-<accesso>-<n>») prima di mostrarle: niente spille vuote. */
export function assicuraSpille(map: MapLibre, nomi: Iterable<string>, colori: Record<string, string>) {
  return Promise.all(
    [...new Set(nomi)].map(
      (nome) =>
        new Promise<void>((ok) => {
          const m = nome.match(/^pin-(\w+)-(\w+)-(\d+)$/);
          if (!m || (map as MapLibre & { _removed?: boolean })._removed || map.hasImage(nome)) return ok();
          const img = new Image(W * PR, H * PR);
          img.onload = () => {
            if ((map as MapLibre & { _removed?: boolean })._removed || !(map as unknown as { style?: unknown }).style) return ok();
            if (!map.hasImage(nome)) map.addImage(nome, img, { pixelRatio: PR });
            ok();
          };
          img.onerror = () => ok();
          img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgSpilla(colori[m[2]] ?? "#5F6B7A", GLIFI_PIN[m[1]] ?? GLIFI_PIN.altro, Number(m[3])));
        }),
    ),
  );
}
