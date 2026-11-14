/*
 * Ricerca istantanea dei luoghi di Roma (vie, rioni e quartieri, monumenti, piazze, stazioni) sull'indice
 * public/dati/luoghi-roma.json (scripts/luoghi/indice.mts). Si scarica una volta, poi cerca a ogni lettera
 * senza aspettare nessun server. Non conta l'ordine delle parole, ne' accenti, ne' abbreviazioni.
 */
export type Luogo = { etichetta: string; municipio?: number | string | null; lat: number; lon: number; tipo?: "via" | "zona" | "luogo"; civico?: string | null };
type Voce = { nome: string; lon: number; lat: number; tipo: "via" | "zona" | "luogo"; mun: number; peso: number; norm: string; parole: string[] };

const ABBREVIAZIONI: [RegExp, string][] = [
  [/\b(santa|santo|sant|san|ss?)\b\.?/g, "s"],
  [/\bp\.?\s?(zz?a|za)\b\.?/g, "piazza"],
  [/\bpiazzale\b/g, "piazzale"],
  [/\bv\.?\s?le\b\.?/g, "viale"],
  [/\bl\.?\s?go\b\.?/g, "largo"],
  [/\bc\.?\s?so\b\.?/g, "corso"],
  [/\blgt\b\.?/g, "lungotevere"],
  [/\bc\.?\s?ne\b\.?/g, "circonvallazione"],
  [/\bv\.\s/g, "via "],
];
export function normalizza(s: string) {
  let t = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’`]/g, " ");
  for (const [re, x] of ABBREVIAZIONI) t = t.replace(re, x);
  return t.replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}
const GENERICHE = new Set(["via", "viale", "piazza", "piazzale", "largo", "vicolo", "corso", "lungotevere", "circonvallazione", "di", "del", "della", "dei", "delle", "degli", "de", "d", "la", "il", "lo", "le", "e"]);

let indice: Promise<Voce[]> | null = null;
export function caricaLuoghi() {
  indice ??= fetch("/dati/luoghi-roma.json")
    .then((r) => r.json())
    .then((j: { righe: [string, number, number, string, number, number?][] }) =>
      j.righe.map(([nome, lon, lat, t, mun, lung]) => {
        const norm = normalizza(nome);
        // le vie lunghe (le piu' note) vengono prima a parita' di testo
        return { nome, lon, lat, mun, peso: lung ? Math.log10(lung + 10) * 6 : 0, tipo: t === "v" ? ("via" as const) : t === "z" ? ("zona" as const) : ("luogo" as const), norm, parole: norm.split(" ") };
      }),
    )
    .catch((e) => {
      indice = null;
      throw e;
    });
  return indice;
}

/** Cerca: tutte le parole scritte devono essere l'inizio di una parola del nome. Un numero e' il civico. */
export function cerca(voci: Voce[], testo: string, quanti = 7): Luogo[] {
  const q = normalizza(testo);
  if (q.length < 2) return [];
  const pezzi = q.split(" ");
  const civico = pezzi.length > 1 && /^\d+[a-z]?$/.test(pezzi[pezzi.length - 1]) ? pezzi.pop()! : null;
  const qn = pezzi.join(" ");
  if (!qn) return [];
  const significative = pezzi.filter((p) => !GENERICHE.has(p));
  const risultati: { v: Voce; punti: number }[] = [];
  for (const v of voci) {
    let ok = true;
    for (const p of pezzi) {
      if (!v.parole.some((w) => w.startsWith(p))) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    let punti = 0;
    if (v.norm === qn) punti += 200;
    else if (v.norm.startsWith(qn)) punti += 120;
    // la prima parola che conta (es. "ostiense" in "via ostiense") vale di piu' se e' esatta
    if (significative.length && v.parole.includes(significative[0])) punti += 40;
    if (v.tipo === "luogo") punti += civico ? -50 : 35;
    if (v.tipo === "zona") punti += civico ? -50 : 45;
    if (civico && v.tipo === "via") punti += 30;
    punti += v.peso - v.norm.length / 6;
    risultati.push({ v, punti });
  }
  risultati.sort((a, b) => b.punti - a.punti);
  const visti = new Set<string>();
  const out: Luogo[] = [];
  for (const { v } of risultati) {
    const k = v.norm + v.tipo;
    if (visti.has(k)) continue;
    visti.add(k);
    out.push({ etichetta: civico && v.tipo === "via" ? `${v.nome} ${civico}` : v.nome, municipio: v.mun || null, lat: v.lat, lon: v.lon, tipo: v.tipo, civico: v.tipo === "via" ? civico : null });
    if (out.length >= quanti) break;
  }
  return out;
}
