// Geocoding degli indirizzi romani.
// 1) Fonte principale: numeri civici UFFICIALI di Roma Capitale (GeoRoma, layer DIPCUL:GeoromaCiviciLocator,
//    ~559.000 civici con toponimo e stato "UFFICIALE"), interrogati via WFS con un filtro CQL.
// 2) Riserva: OpenStreetMap Nominatim (max 1 richiesta ogni 1,5 s, con attesa crescente se risponde 429).
// I risultati finiscono in una cache su disco, così rilanciare l'import non ripete le richieste.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { RAW_DIR, USER_AGENT, sleep } from "./lib.mts";
import { BBOX_ROMA } from "./coord.mts";
import { GEOSERVER } from "./wfs.mts";

export interface Geocodifica {
  lat: number;
  lon: number;
  precisione: "civico" | "strada" | "area";
  etichetta: string;
  fonte: "georoma_civici" | "nominatim";
}

const CACHE_FILE = path.join(RAW_DIR, "geocode-cache.json");
let cache: Record<string, Geocodifica | null> | null = null;

async function caricaCache() {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(CACHE_FILE, "utf8"));
  } catch {
    cache = {};
  }
  return cache!;
}

export async function salvaCache() {
  if (!cache) return;
  await mkdir(RAW_DIR, { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 1));
}

// ---------------------------------------------------------------------------
// Scomposizione dell'indirizzo
// ---------------------------------------------------------------------------
const TIPI: [RegExp, string][] = [
  [/^(?:v\.\s*le|viale)\b/i, "VIALE"],
  [/^(?:p\.\s*zz?a|p\.\s*za|piazza)\b/i, "PIAZZA"],
  [/^(?:p\.\s*le|piazzale)\b/i, "PIAZZALE"],
  [/^(?:l\.\s*go|largo)\b/i, "LARGO"],
  [/^(?:c\.\s*so|corso)\b/i, "CORSO"],
  [/^lungotevere\b/i, "LUNGOTEVERE"],
  [/^lungomare\b/i, "LUNGOMARE"],
  [/^circonvallazione\b/i, "CIRCONVALLAZIONE"],
  [/^vicolo\b/i, "VICOLO"],
  [/^strada\b/i, "STRADA"],
  [/^salita\b/i, "SALITA"],
  [/^clivo\b/i, "CLIVO"],
  [/^borgo\b/i, "BORGO"],
  [/^(?:loc\.|località)/i, "LOCALITA"],
  [/^via\b/i, "VIA"],
];
const PAROLE_VUOTE = new Set(["DEL", "DELLA", "DELLE", "DEI", "DEGLI", "DELL", "DI", "DA", "DE", "LA", "LE", "IL", "LO", "GLI", "SAN", "SANTA", "SANT", "E"]);

export interface IndirizzoScomposto {
  tipo: string | null;
  nome: string;
  parole: string[];
  civico: number | null;
}

export function scomponi(indirizzo: string): IndirizzoScomposto | null {
  let s = indirizzo
    .replace(/^.*?\bc\/o\s+[^,]*?(?=\b(?:via|viale|piazza|largo)\b)/i, "") // "C/O CENTRALE TELECOM via Claudio" → "via Claudio"
    .replace(/\bsnc\b|\bs\.n\.c\.?/gi, "")
    .replace(/\bciv(?:ico)?\.?\s*(?=\d)/gi, "")      // "civ 52" → "52"
    .replace(/\s+/g, " ")
    .trim();
  let tipo: string | null = null;
  for (const [re, t] of TIPI) {
    if (re.test(s)) { tipo = t; s = s.replace(re, "").trim(); break; }
  }
  const m = s.match(/^(.*?)(?:[\s,]+(?:n\.?\s*°?\s*)?(\d{1,4})\s*[a-z]?(?:\s*[\/-].*)?)?\s*$/i);
  if (!m) return null;
  const nome = m[1].replace(/[,.]+$/, "").trim().toUpperCase();
  const civico = m[2] ? Number(m[2]) : null;
  const parole = nome
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // toglie gli accenti (RAVÀ → RAVA)
    .replace(/[^A-Z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((p) => p.length >= 3 && !PAROLE_VUOTE.has(p) && !/^[A-Z]$/.test(p));
  if (!parole.length) return null;
  return { tipo, nome, parole, civico };
}

// ---------------------------------------------------------------------------
// 1) Numeri civici ufficiali GeoRoma
// ---------------------------------------------------------------------------
interface Civico { toponimo: string; civico: number | null; lon: number; lat: number }

async function wfsCivici(cql: string, max: number): Promise<Civico[]> {
  const u = new URL(GEOSERVER);
  u.searchParams.set("service", "WFS");
  u.searchParams.set("version", "1.1.0");
  u.searchParams.set("request", "GetFeature");
  u.searchParams.set("typeName", "DIPCUL:GeoromaCiviciLocator");
  u.searchParams.set("outputFormat", "application/json");
  u.searchParams.set("srsName", "urn:ogc:def:crs:OGC:1.3:CRS84");
  u.searchParams.set("maxFeatures", String(max));
  u.searchParams.set("CQL_FILTER", cql);
  await sleep(250); // cortesia verso il server del Comune
  const res = await fetch(u, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`GeoRoma civici HTTP ${res.status}`);
  const json = (await res.json()) as { features?: { geometry: { coordinates: number[] }; properties: Record<string, unknown> }[] };
  return (json.features ?? []).map((f) => ({
    toponimo: String(f.properties.TOPONIMO ?? ""),
    civico: f.properties.NUMERO_CIVICO == null ? null : Number(f.properties.NUMERO_CIVICO),
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));
}

const q = (s: string) => s.replace(/'/g, "''");

async function geocodificaUfficiale(ind: IndirizzoScomposto, vicino?: { lat: number; lon: number }): Promise<Geocodifica | null> {
  const filtroNome = [
    ...ind.parole.map((p) => `TOPONIMO ILIKE '%${q(p)}%'`),
    ...(ind.tipo ? [`TOPONIMO ILIKE '${ind.tipo} %'`] : []),
  ].join(" AND ");

  // Più vie possono corrispondere (es. "via Taramelli" → VIA ANTONIO TARAMELLI e VIA TORQUATO TARAMELLI).
  // Se abbiamo un punto di riferimento (le coordinate pubblicate) vince la via più vicina;
  // altrimenti il nome identico a quello cercato, poi il più corto.
  const migliore = (civici: Civico[]) => {
    const atteso = `${ind.tipo ?? ""} ${ind.nome}`.trim();
    const nomi = [...new Set(civici.map((c) => c.toponimo))];
    if (vicino && nomi.length > 1) {
      const dist = (n: string) => Math.min(...civici.filter((c) => c.toponimo === n).map((c) => (c.lat - vicino.lat) ** 2 + (c.lon - vicino.lon) ** 2));
      return nomi.sort((a, b) => dist(a) - dist(b))[0];
    }
    return nomi.sort((a, b) => Number(b === atteso) - Number(a === atteso) || a.length - b.length)[0];
  };

  if (ind.civico != null) {
    const trovati = await wfsCivici(`${filtroNome} AND NUMERO_CIVICO = ${ind.civico}`, 50);
    if (trovati.length) {
      const nome = migliore(trovati);
      const c = trovati.find((t) => t.toponimo === nome)!;
      return { lat: c.lat, lon: c.lon, precisione: "civico", etichetta: `${nome} ${ind.civico}`, fonte: "georoma_civici" };
    }
  }
  // Senza civico (o civico non trovato): baricentro dei civici della strada
  const strada = await wfsCivici(filtroNome, 2000);
  if (!strada.length) return null;
  const nome = migliore(strada);
  const punti = strada.filter((s) => s.toponimo === nome);
  // Punto reale più vicino al baricentro (una via curva può avere il baricentro fuori strada)
  const cx = punti.reduce((a, p) => a + p.lon, 0) / punti.length;
  const cy = punti.reduce((a, p) => a + p.lat, 0) / punti.length;
  const c = punti.reduce((best, p) => ((p.lon - cx) ** 2 + (p.lat - cy) ** 2 < (best.lon - cx) ** 2 + (best.lat - cy) ** 2 ? p : best));
  return { lat: c.lat, lon: c.lon, precisione: "strada", etichetta: `${nome} (punto centrale della via)`, fonte: "georoma_civici" };
}

// ---------------------------------------------------------------------------
// 2) Riserva: OpenStreetMap Nominatim
// ---------------------------------------------------------------------------
let ultimaRichiesta = 0;
let intervallo = 1500;
let nominatimBloccato = false;

async function geocodificaNominatim(testo: string): Promise<Geocodifica | null> {
  if (nominatimBloccato) return null;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${testo}, Roma`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "it");
  url.searchParams.set("viewbox", `${BBOX_ROMA.lonMin},${BBOX_ROMA.latMax},${BBOX_ROMA.lonMax},${BBOX_ROMA.latMin}`);
  url.searchParams.set("bounded", "1");
  let res: Response | null = null;
  for (let tentativo = 0; tentativo < 3; tentativo++) {
    const attesa = intervallo - (Date.now() - ultimaRichiesta);
    if (attesa > 0) await sleep(attesa);
    ultimaRichiesta = Date.now();
    res = await fetch(url, { headers: { "User-Agent": USER_AGENT, "Accept-Language": "it" }, signal: AbortSignal.timeout(30_000) });
    if (res.status !== 429 && res.status !== 503) break;
    intervallo = Math.min(intervallo * 2, 20_000);
    await sleep(intervallo);
  }
  if (res?.status === 429) {
    nominatimBloccato = true; // rispettiamo il blocco: niente altre richieste in questo import
    console.warn("  Nominatim ha superato la quota (429): riserva disattivata per questo import");
    return null;
  }
  if (!res?.ok) throw new Error(`Nominatim HTTP ${res?.status}`);
  const [hit] = (await res.json()) as { lat: string; lon: string; category: string; type: string; addresstype?: string; display_name: string }[];
  if (!hit) return null;
  const tipo = hit.addresstype ?? hit.type;
  const precisione = ["house", "building", "place"].includes(tipo) || hit.category === "building" ? "civico"
    : hit.category === "highway" || tipo === "road" ? "strada" : "area";
  return { lat: Number(hit.lat), lon: Number(hit.lon), precisione, etichetta: hit.display_name, fonte: "nominatim" };
}

// ---------------------------------------------------------------------------
/** Geocodifica un indirizzo dentro Roma: prima i civici ufficiali del Comune, poi OpenStreetMap. */
export async function geocodifica(indirizzo: string, vicino?: { lat: number; lon: number }): Promise<Geocodifica | null> {
  const c = await caricaCache();
  const ind = scomponi(indirizzo);
  const suffisso = vicino ? `|@${vicino.lat.toFixed(2)},${vicino.lon.toFixed(2)}` : "";
  const chiave = (ind ? `v3|${ind.tipo ?? ""}|${ind.parole.join(" ")}|${ind.civico ?? ""}` : `v3|grezzo|${indirizzo.trim().toUpperCase()}`) + suffisso;
  if (chiave in c) return c[chiave];

  let out: Geocodifica | null = null;
  try {
    if (ind) out = await geocodificaUfficiale(ind, vicino);
    // Parole in più dopo il nome della via (es. "VIA OSTIENSE LIBETTA", "Via del Serafico Cellnex"):
    // riprova togliendo l'ultima parola, ma solo come posizione della strada
    if (!out && ind && ind.parole.length >= 2) {
      const ridotto = { ...ind, parole: ind.parole.slice(0, -1), nome: ind.parole.slice(0, -1).join(" "), civico: ind.civico };
      const r = await geocodificaUfficiale(ridotto, vicino);
      if (r) out = { ...r, etichetta: `${r.etichetta} (ignorata la parola "${ind.parole.at(-1)}")` };
    }
    if (!out) out = await geocodificaNominatim(indirizzo.replace(/\bsnc\b/gi, "").trim());
  } catch (err) {
    console.warn(`  geocoding fallito per "${indirizzo}": ${(err as Error).message}`);
    return null; // errori di rete: non in cache, si riprova al prossimo import
  }
  if (out || !nominatimBloccato) c[chiave] = out; // non salviamo "non trovato" se la riserva era bloccata
  return out;
}
