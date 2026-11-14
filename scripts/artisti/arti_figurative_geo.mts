// Posizione delle 117 aree per le arti figurative 2026 (DGC 154/2026, art-spot-dati/tabelle/arti_figurative_2026.csv).
// L'elenco ufficiale ha solo i nomi dei luoghi: qui si cercano nello stradario ufficiale di Roma Capitale
// (via l'API locale /api/artisti/indirizzo, serve il sito avviato) e, per parchi e stazioni che lo stradario non
// conosce, in OpenStreetMap (Nominatim, 1 richiesta al secondo). Ogni punto dice da dove viene.
// Scrive art-spot-dati/geo/arti_figurative_2026.geojson, che scripts/artisti/import.mts usa al posto dell'elenco 2018.
//   node scripts/artisti/arti_figurative_geo.mts [http://localhost:3007]
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3007";
const DATI = path.join(import.meta.dirname, "../../art-spot-dati");
const ROMANI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];

function csv(testo: string) {
  const righe: string[][] = [];
  let r: string[] = [], c = "", q = false;
  for (let i = 0; i < testo.length; i++) {
    const ch = testo[i];
    if (q) {
      if (ch === '"' && testo[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { r.push(c); c = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && testo[i + 1] === "\n") i++; r.push(c); righe.push(r); r = []; c = ""; }
    else c += ch;
  }
  if (c || r.length) { r.push(c); righe.push(r); }
  const [testa, ...corpo] = righe.filter((x) => x.some(Boolean));
  return corpo.map((x) => Object.fromEntries(testa.map((h, i) => [h, x[i] ?? ""])));
}

const pulisci = (s: string) => s.replace(/\([^)]*\)/g, " ").replace(/\barea pedonale\b/gi, " ").replace(/\s+/g, " ").trim();
const attesa = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function stradario(q: string, municipio: string) {
  const r = await fetch(`${BASE}/api/artisti/indirizzo?q=${encodeURIComponent(q)}`).then((x) => x.json()) as { risultati: { etichetta: string; municipio: number | string | null; lat: number; lon: number }[] };
  return r.risultati.find((x) => !x.municipio || String(x.municipio) === municipio) ?? null;
}
let ultimaNominatim = 0;
async function nominatim(q: string) {
  const ora = Date.now();
  if (ora - ultimaNominatim < 1100) await attesa(1100 - (ora - ultimaNominatim));
  ultimaNominatim = Date.now();
  const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=it&viewbox=12.23,42.14,12.86,41.65&bounded=1&q=${encodeURIComponent(q + ", Roma")}`;
  const r = await fetch(u, { headers: { "User-Agent": "civic-data-ingest/0.1" } }).then((x) => x.json()) as { lat: string; lon: string; display_name: string }[];
  return r[0] ? { etichetta: r[0].display_name.split(",").slice(0, 2).join(","), lat: Number(r[0].lat), lon: Number(r[0].lon) } : null;
}

const righe = csv(readFileSync(path.join(DATI, "tabelle/arti_figurative_2026.csv"), "utf8"));
const features: unknown[] = [];
const mancanti: string[] = [];
for (const r of righe) {
  const mun = String(ROMANI.indexOf(r.municipio) + 1);
  const primo = pulisci((r.indirizzo || "").split(";")[0] ?? "");
  const luogo = pulisci(r.luogo);
  // dai nomi composti ("Parco di Via X", "Via A angolo Via B", "C.ne Ostiense") si ricavano anche le vie
  const vie = [luogo, primo].flatMap((t) =>
    [...t
      .replace(/\bC\.ne\b/g, "Circonvallazione")
      .replace(/\bang\.\s*/gi, "angolo ")
      .matchAll(/\b(?:Via|Viale|Piazza|Piazzale|Largo|Circonvallazione|Lungomare|Lungotevere)\s+[^,;()]+?(?=\s+(?:angolo|e|in corrispondenza)\s|\s+-\s|\s*[,;]|$)/gi)]
      .map((m) => m[0].trim()));
  const prove = [...new Set([primo, luogo, ...vie, luogo.replace(/^(?:Parco|Giardino|Area interna)\s+(?:di\s+)?/i, "")].filter((x) => x.length > 2))];
  // lo stradario scrive i santi abbreviati ("PIAZZA DI S. MARIA") e a volte aggiunge "dei"
  for (const x of [...prove]) {
    const santi = x.replace(/\b(?:Sant[oa]?|San)\s+/gi, "S. ");
    if (santi !== x) prove.push(santi);
    const dei = x.replace(/^(Piazza|Largo|Via)\s+Caduti\b/i, "$1 dei Caduti");
    if (dei !== x) prove.push(dei);
  }
  let trovato: { etichetta: string; lat: number; lon: number } | null = null;
  let origine = "";
  for (const p of prove) {
    trovato = await stradario(p, mun).catch(() => null);
    if (trovato) { origine = "stradario Roma Capitale"; break; }
  }
  if (!trovato) {
    for (const p of prove) {
      trovato = await nominatim(p).catch(() => null);
      if (trovato) { origine = "OpenStreetMap (Nominatim)"; break; }
    }
  }
  if (!trovato) { mancanti.push(`${r.id} ${r.luogo}`); continue; }
  features.push({
    type: "Feature",
    geometry: { type: "Point", coordinates: [Number(trovato.lon.toFixed(6)), Number(trovato.lat.toFixed(6))] },
    properties: {
      id: r.id, municipio: r.municipio, name: `${r.luogo} (${r.n_postazioni} ${r.n_postazioni === "1" ? "postazione" : "postazioni"})`,
      type: "arti_figurative_area", codice_area: r.id.replace(/^AF26-/, ""), localizzazioni: Number(r.n_postazioni) || null,
      rules: "Ritratti, caricature e pittura solo con il posto assegnato tramite avviso pubblico (DAC 304/2025, elenco DGC 154/2026).",
      luogo: r.luogo, indirizzo: r.indirizzo || null, n_postazioni: Number(r.n_postazioni) || null,
      note: r.note || null, source: "DGC 154/2026, Allegato A", source_url: r.fonte_url,
      verification_status: "ufficiale (elenco); posizione stimata dal nome del luogo",
      coord_note: `posizione dal nome «${trovato.etichetta}» (${origine}): l'atto ha solo il nome del luogo e la planimetria`,
    },
  });
  process.stdout.write(".");
}
writeFileSync(path.join(DATI, "geo/arti_figurative_2026.geojson"), JSON.stringify({ type: "FeatureCollection", name: "arti_figurative_2026", features }));
console.log(`\naree con posizione: ${features.length}/${righe.length}`);
if (mancanti.length) console.log("senza posizione:", mancanti.join(" · "));
