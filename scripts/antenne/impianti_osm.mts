// Impianti esistenti da OpenStreetMap (tralicci, pali e antenne per le telecomunicazioni) nel Comune di Roma.
// Il catasto ufficiale non e' pubblico: questi sono i soli impianti esistenti con una posizione aperta (ODbL).
//   node --env-file=.env.local scripts/antenne/impianti_osm.mts
import pg from "pg";

const QUERY = `[out:json][timeout:150];
area["boundary"="administrative"]["admin_level"="8"]["name"="Roma"]->.r;
(nwr["man_made"~"^(mast|tower|antenna)$"]["tower:type"~"communication"](area.r);
 nwr["man_made"="antenna"](area.r);
 nwr["man_made"="mast"][!"tower:type"](area.r);
 nwr["communication:mobile_phone"="yes"](area.r););
out tags center;`;
const SERVER = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

type El = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };
let dati: { elements: El[] } | null = null;
for (const s of SERVER) {
  try {
    const r = await fetch(s, { method: "POST", headers: { "User-Agent": "civic-data-ingest/0.1", "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(QUERY), signal: AbortSignal.timeout(200_000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    dati = await r.json();
    break;
  } catch (e) {
    console.warn(`${s}: ${(e as Error).message}`);
  }
}
if (!dati) throw new Error("Overpass non risponde");

const righe = dati.elements
  .map((e) => {
    const t = e.tags ?? {};
    const c = e.center ?? (e.lat != null ? { lat: e.lat, lon: e.lon! } : null);
    if (!c) return null;
    if (/lighting|bell_tower|observation|cooling|water/.test(t["tower:type"] ?? "")) return null;
    const tipo = t.man_made === "antenna" ? "antenna" : t.man_made === "tower" ? "traliccio" : "palo";
    const mobile = t["communication:mobile_phone"] === "yes" || /gsm|umts|lte|5g|mobile/i.test(JSON.stringify(t));
    return {
      osm_id: `${e.type}/${e.id}`, tipo, mobile, operatore: t.operator ?? null, altezza: Number.parseFloat(t.height ?? "") || null,
      nome: t.name ?? null, attributi: t, lon: c.lon, lat: c.lat,
    };
  })
  .filter(Boolean);

const db = new pg.Client({ connectionString: process.env.DATABASE_URL_ANTENNE });
await db.connect();
await db.query("BEGIN");
await db.query("DELETE FROM antenne.impianti_osm");
await db.query(
  `INSERT INTO antenne.impianti_osm (osm_id, tipo, mobile, operatore, altezza_m, nome, attributi, geom)
   SELECT x->>'osm_id', x->>'tipo', (x->>'mobile')::boolean, x->>'operatore', (x->>'altezza')::numeric, x->>'nome', x->'attributi',
          ST_SetSRID(ST_MakePoint((x->>'lon')::float8, (x->>'lat')::float8), 4326)
   FROM jsonb_array_elements($1::jsonb) x
   WHERE EXISTS (SELECT 1 FROM opendata.limite_comunale l WHERE ST_Intersects(l.geom, ST_SetSRID(ST_MakePoint((x->>'lon')::float8, (x->>'lat')::float8), 4326)))`,
  [JSON.stringify(righe)],
);
const { rows } = await db.query<{ n: number; mobile: number }>("SELECT count(*)::int n, count(*) FILTER (WHERE mobile)::int mobile FROM antenne.impianti_osm");
await db.query("COMMIT");
await db.end();
console.log(`impianti OpenStreetMap: ${rows[0].n} (telefonia mobile dichiarata: ${rows[0].mobile})`);
