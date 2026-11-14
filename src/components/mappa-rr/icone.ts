import type { Map as MapLibre } from "maplibre-gl";

/*
 * Icone delle mappe: SVG disegnati qui, rasterizzati al doppio della risoluzione e messi nello stile
 * (map.addImage). Cosi' i simboli sono livelli della GPU, veloci anche a centinaia.
 */
const PR = 2;

export function caricaIcone(map: MapLibre, icone: Record<string, { svg: string; w: number; h: number }>) {
  return Promise.all(
    Object.entries(icone).map(
      ([nome, { svg, w, h }]) =>
        new Promise<void>((ok) => {
          if (map.hasImage(nome)) return ok();
          const img = new Image(w * PR, h * PR);
          img.onload = () => {
            if (!map.hasImage(nome)) map.addImage(nome, img, { pixelRatio: PR });
            ok();
          };
          img.onerror = () => ok();
          img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.replace("<svg ", `<svg width="${w * PR}" height="${h * PR}" `));
        }),
    ),
  );
}

/** Spilla tonda con ombra, bordo bianco e un glifo al centro (glifo in coordinate 0..24). */
export function spilla(colore: string, glifo: string, d = 34, anello?: string) {
  const r = d / 2;
  return {
    w: d + 6,
    h: d + 8,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${d + 6} ${d + 8}">
      <defs><filter id="o" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.6" flood-color="#251d1c" flood-opacity=".35"/></filter></defs>
      <g filter="url(#o)"><circle cx="${r + 3}" cy="${r + 3}" r="${r}" fill="${colore}" stroke="${anello ?? "#fff"}" stroke-width="${anello ? 3 : 2.2}"/></g>
      <g transform="translate(${r + 3 - 12 * (d / 40)} ${r + 3 - 12 * (d / 40)}) scale(${d / 40})" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${glifo}</g>
    </svg>`,
  };
}

/** Pallino piccolo con bordo bianco (per i livelli secondari). */
export function punto(colore: string, d = 12) {
  return {
    w: d + 4,
    h: d + 4,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${d + 4} ${d + 4}"><circle cx="${d / 2 + 2}" cy="${d / 2 + 2}" r="${d / 2}" fill="${colore}" stroke="#fff" stroke-width="2"/></svg>`,
  };
}

/** Trama a righe per le zone vietate (fill-pattern). */
export function righe(colore: string) {
  return {
    w: 10,
    h: 10,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="${colore}" fill-opacity=".14"/><path d="M-2 12 12 -2M-2 2 2 -2M8 12 12 8" stroke="${colore}" stroke-opacity=".55" stroke-width="1.6"/></svg>`,
  };
}

// Glifi (coordinate 0..24, tratto bianco)
export const GLIFI = {
  chitarra: `<path d="M14.5 9.5 20 4"/><path d="m18 2 4 4"/><path d="M10.6 11.4a4 4 0 0 0-5.7 0c-2 2-2.6 5.4-.4 7.6s5.6 1.6 7.6-.4a4 4 0 0 0 0-5.7"/><circle cx="9" cy="15" r="1.4" fill="#fff"/>`,
  maschera: `<path d="M4 6c2.5 1 5.3 1.4 8 1.4S17.5 7 20 6c.4 6-2.6 12-8 12S3.6 12 4 6Z"/><path d="M8.5 11.5c.7-.6 1.6-.6 2.3 0M13.2 11.5c.7-.6 1.6-.6 2.3 0M9.5 15c1.6 1 3.4 1 5 0"/>`,
  fuoco: `<path d="M12 21c3.9 0 6.5-2.6 6.5-6.2 0-3.2-2.3-5.3-3.6-7.6-.6 1.6-1.6 2.6-2.6 3.1.2-3-1.1-5.6-3.3-7.3.2 3.6-3.5 5.9-3.5 10.6C5.5 18.1 8.4 21 12 21Z"/>`,
  pennello: `<path d="M19.5 3.5c-2.7.6-7.8 5.3-9.9 8.4l2.5 2.5c3.1-2.1 7.8-7.2 8.4-9.9"/><path d="M9.4 12.2c-2.2 0-3.6 1.6-3.6 3.6 0 1.7-1 2.6-2.3 3 1 .9 2.6 1.7 4.3 1.7 2.6 0 4.2-1.7 4.2-4"/>`,
  stella: `<path d="m12 3 2.4 5.6 6 .5-4.6 4 1.4 5.9L12 15.9 6.8 19l1.4-5.9-4.6-4 6-.5Z"/>`,
  palco: `<path d="M3 18h18"/><path d="M5 18V9l7-4 7 4v9"/><path d="M9 18v-4h6v4"/>`,
  traliccio: `<path d="M12 3v18"/><path d="M8 21 12 7l4 14"/><path d="M9 15h6"/><path d="M5.5 6.5a8 8 0 0 0 0 7M18.5 6.5a8 8 0 0 1 0 7"/>`,
  cella: `<circle cx="12" cy="12" r="2.2" fill="#fff"/><path d="M8 8a5.6 5.6 0 0 0 0 8M16 8a5.6 5.6 0 0 1 0 8"/>`,
  scuola: `<path d="m3 9 9-4 9 4-9 4Z"/><path d="M7 11v4c3 2 7 2 10 0v-4"/>`,
  chiave: `<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.7-8.7M16 7l2.5 2.5M14 9l2 2"/>`,
  palla: `<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.3 4 5.2 4 8.5s-1.4 6.2-4 8.5M12 3.5C9.4 5.8 8 8.7 8 12s1.4 6.2 4 8.5"/>`,
  nota: `<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>`,
};

/** Segnaposto con forma propria (rombo, cerchio, quadrato, goccia): colore, forma e icona insieme. */
export function segno(colore: string, glifo: string, forma: "rombo" | "cerchio" | "quadrato" | "goccia", d = 30, anello?: string) {
  const c = d / 2 + 4;
  const bordo = `fill="${colore}" stroke="${anello ?? "#fff"}" stroke-width="${anello ? 3 : 2.2}"`;
  const sagoma =
    forma === "rombo"
      ? `<rect x="${c - d * 0.36}" y="${c - d * 0.36}" width="${d * 0.72}" height="${d * 0.72}" rx="${d * 0.12}" transform="rotate(45 ${c} ${c})" ${bordo}/>`
      : forma === "quadrato"
        ? `<rect x="${c - d / 2 + 1}" y="${c - d / 2 + 1}" width="${d - 2}" height="${d - 2}" rx="${d * 0.22}" ${bordo}/>`
        : forma === "goccia"
          ? `<path d="M${c} ${c + d / 2 + 4} L${c - d * 0.36} ${c + d * 0.34} A${d / 2} ${d / 2} 0 1 1 ${c + d * 0.36} ${c + d * 0.34} Z" ${bordo}/>`
          : `<circle cx="${c}" cy="${c}" r="${d / 2}" ${bordo}/>`;
  const g = d * 0.55;
  return {
    w: d + 8,
    h: d + 10,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${d + 8} ${d + 10}">
      <defs><filter id="o" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.6" flood-color="#251d1c" flood-opacity=".35"/></filter></defs>
      <g filter="url(#o)">${sagoma}</g>
      <g transform="translate(${c - g / 2} ${c - g / 2}) scale(${g / 24})" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${glifo}</g>
    </svg>`,
  };
}

/** Spilla a goccia con avatar: cerchio colorato col glifo bianco, bordo bianco, punta verso il luogo. */
export function avatar(colore: string, glifo: string, d = 36, vivo = false) {
  const w = d + 10, h = d + 18, c = w / 2, r = d / 2;
  return {
    w,
    h,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
      <defs><filter id="o" x="-40%" y="-30%" width="180%" height="170%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#251d1c" flood-opacity=".35"/></filter></defs>
      <g filter="url(#o)">
        <path d="M${c} ${h - 3} L${c - 7} ${r * 2 - 2} A${r} ${r} 0 1 1 ${c + 7} ${r * 2 - 2} Z" fill="#fff"/>
        <circle cx="${c}" cy="${r + 3}" r="${r - 2.5}" fill="${colore}"/>
        ${vivo ? `<circle cx="${c + r - 4}" cy="${8}" r="5" fill="#E53935" stroke="#fff" stroke-width="2"/>` : ""}
      </g>
      <g transform="translate(${c - r * 0.55} ${r + 3 - r * 0.55}) scale(${(r * 1.1) / 24})" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${glifo}</g>
    </svg>`,
  };
}

/** Palco: riquadro arrotondato col microfono (libero, occupato, chiuso). */
export function palco(colore: string, d = 28) {
  const w = d + 6;
  return {
    w,
    h: w,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${w}">
      <defs><filter id="o" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#251d1c" flood-opacity=".3"/></filter></defs>
      <g filter="url(#o)"><rect x="3" y="3" width="${d}" height="${d}" rx="${d * 0.3}" fill="${colore}" stroke="#fff" stroke-width="2.4"/></g>
      <g transform="translate(${w / 2 - d * 0.29} ${w / 2 - d * 0.29}) scale(${(d * 0.58) / 24})" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/>
      </g>
    </svg>`,
  };
}

/** Piazza consigliata: pallino verde con il centro bianco. */
export function piazza(colore: string) {
  return {
    w: 16,
    h: 16,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.2" fill="${colore}" stroke="#fff" stroke-width="2"/><circle cx="8" cy="8" r="2.2" fill="#fff"/></svg>`,
  };
}
