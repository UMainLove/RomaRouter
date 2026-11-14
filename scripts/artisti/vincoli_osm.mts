// Regole generali dell'art. 2 DAC 24/2012 su tutta Roma, con i dati di OpenStreetMap (ODbL):
//  - suolo senza spazio pedonale (campagna, boschi, cimiteri, aree militari, ferrovie, aeroporti, cave...)
//  - superstrade e autostrade (le loro carreggiate non sono spazio per esibirsi)
//  - beni artistici e culturali (niente musica a ridosso)
//  - edifici e vie della citta' storica, per misurare le vie larghe meno di 5 m (niente musica)
// Poi ricalcola copertura e zone. I file scaricati restano in data/raw/artisti (fuori da git).
//   node --env-file=.env.local scripts/artisti/vincoli_osm.mts [--scarica]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const CARTELLA = path.join(import.meta.dirname, "../../data/raw/artisti");
const SERVER = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
const ROMA = `area["name"="Roma"]["admin_level"="8"]->.r;`;
const STORICA = "41.860,12.430,41.930,12.535"; // citta' storica e dintorni (Mura Aureliane, Trastevere, Prati, Testaccio, San Lorenzo)
const SUOLO = "farmland|farmyard|meadow|orchard|vineyard|forest|quarry|landfill|cemetery|military|railway|construction|greenfield|brownfield|allotments|plant_nursery";

const RICHIESTE: Record<string, string> = {
  suolo: `[out:json][timeout:300];${ROMA}(way["landuse"~"^(${SUOLO})$"](area.r);relation["landuse"~"^(${SUOLO})$"](area.r);way["natural"~"^(wood|scrub|grassland|heath|wetland)$"](area.r);relation["natural"~"^(wood|scrub|grassland|heath|wetland)$"](area.r);way["aeroway"="aerodrome"](area.r);relation["aeroway"="aerodrome"](area.r);way["military"](area.r););out geom qt;`,
  veloci: `[out:json][timeout:180];${ROMA}way["highway"~"^(motorway|trunk|motorway_link|trunk_link)$"](area.r);out geom qt;`,
  beni: `[out:json][timeout:180];${ROMA}(nwr["historic"~"^(monument|archaeological_site|ruins|castle|city_gate|fort|aqueduct|citywalls|triumphal_arch|column|obelisk)$"](area.r);nwr["man_made"="obelisk"](area.r);nwr["tourism"="museum"](area.r);nwr["amenity"="fountain"]["historic"](area.r);nwr["amenity"="fountain"]["wikidata"](area.r););out geom qt;`,
  edifici: `[out:json][timeout:240];way["building"](${STORICA});out geom qt;`,
  vie: `[out:json][timeout:180];way["highway"~"^(residential|living_street|pedestrian|unclassified|tertiary|secondary|primary|service|steps)$"]["name"](${STORICA});out geom qt;`,
};

type Punto = { lat: number; lon: number };
type Elemento = {
  type: "node" | "way" | "relation"; id: number; tags?: Record<string, string>; lat?: number; lon?: number;
  geometry?: Punto[]; members?: { type: string; role: string; geometry?: Punto[] }[];
};

async function scarica(nome: string, forza: boolean): Promise<Elemento[]> {
  const file = path.join(CARTELLA, `osm_${nome}.json`);
  if (!forza && existsSync(file)) return JSON.parse(readFileSync(file, "utf8")).elements;
  for (let tentativo = 0; tentativo < 6; tentativo++) {
    const server = SERVER[tentativo % SERVER.length];
    try {
      const r = await fetch(server, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "RomaRouter-dati/1.0" },
        body: "data=" + encodeURIComponent(RICHIESTE[nome]),
        signal: AbortSignal.timeout(330_000),
      });
      const testo = await r.text();
      if (!r.ok || !testo.startsWith("{")) throw new Error(`${r.status} ${testo.slice(0, 120)}`);
      const j = JSON.parse(testo);
      if (j.remark) console.warn(`  ${nome}: ${j.remark}`);
      mkdirSync(CARTELLA, { recursive: true });
      writeFileSync(file, testo);
      return j.elements;
    } catch (e) {
      console.warn(`  ${nome} da ${new URL(server).host}: ${(e as Error).message}`);
      await new Promise((ok) => setTimeout(ok, 5000 * (tentativo + 1)));
    }
  }
  throw new Error(`impossibile scaricare ${nome}`);
}

const linea = (g: Punto[]) => g.map((p) => [p.lon, p.lat]);
/** Geometria GeoJSON grezza (le aree si sistemano poi in PostGIS con ST_BuildArea / ST_MakeValid). */
function geometria(e: Elemento, area: boolean): unknown | null {
  if (e.type === "node" && e.lat != null) return { type: "Point", coordinates: [e.lon, e.lat] };
  if (e.type === "way" && e.geometry?.length) {
    const c = linea(e.geometry);
    const chiusa = c.length >= 4 && c[0][0] === c[c.length - 1][0] && c[0][1] === c[c.length - 1][1];
    return area && chiusa ? { type: "Polygon", coordinates: [c] } : { type: "LineString", coordinates: c };
  }
  if (e.type === "relation" && e.members?.length) {
    const linee = e.members.filter((m) => m.geometry?.length && m.geometry.length > 1).map((m) => linea(m.geometry!));
    return linee.length ? { type: "MultiLineString", coordinates: linee } : null;
  }
  return null;
}

const forza = process.argv.includes("--scarica");
const dati: Record<string, Elemento[]> = {};
for (const nome of Object.keys(RICHIESTE)) {
  dati[nome] = await scarica(nome, forza);
  console.log(`${nome}: ${dati[nome].length} elementi`);
}

const db = new pg.Client({ connectionString: process.env.DATABASE_URL_ARTISTI });
await db.connect();
async function carica(tabella: string, righe: Record<string, unknown>[], sql: string) {
  await db.query(`DELETE FROM artisti.${tabella}`);
  for (let i = 0; i < righe.length; i += 2000) await db.query(sql, [JSON.stringify(righe.slice(i, i + 2000))]);
  const { rows } = await db.query(`SELECT count(*)::int n FROM artisti.${tabella}`);
  console.log(`  ${tabella}: ${rows[0].n}`);
}
const id = (e: Elemento) => `${e.type[0]}${e.id}`;

// aree: poligoni chiusi direttamente, relazioni ricostruite dai membri (ST_BuildArea)
const AREA = `CASE WHEN x->'g'->>'type' = 'MultiLineString'
                   THEN ST_BuildArea(ST_SetSRID(ST_GeomFromGeoJSON(x->>'g'), 4326))
                   ELSE ST_SetSRID(ST_GeomFromGeoJSON(x->>'g'), 4326) END`;
await carica(
  "osm_suolo",
  dati.suolo.map((e) => ({
    id: id(e), nome: e.tags?.name ?? null, g: geometria(e, true),
    tipo: e.tags?.aeroway === "aerodrome" ? "aerodrome" : e.tags?.landuse ?? e.tags?.natural ?? (e.tags?.military ? "military" : "altro"),
  })).filter((r) => r.g),
  `INSERT INTO artisti.osm_suolo (id, tipo, nome, geom)
   SELECT x->>'id', x->>'tipo', x->>'nome', ST_Multi(ST_CollectionExtract(ST_MakeValid(a), 3))
   FROM jsonb_array_elements($1::jsonb) x, LATERAL (SELECT ${AREA} AS a) q
   WHERE a IS NOT NULL AND GeometryType(a) LIKE '%POLYGON%' AND NOT ST_IsEmpty(ST_CollectionExtract(ST_MakeValid(a), 3))
   ON CONFLICT (id) DO NOTHING`,
);
await carica(
  "osm_veloci",
  dati.veloci.filter((e) => e.geometry?.length).map((e) => ({ id: id(e), nome: e.tags?.name ?? e.tags?.ref ?? null, g: { type: "LineString", coordinates: linea(e.geometry!) } })),
  `INSERT INTO artisti.osm_veloci (id, nome, geom)
   SELECT x->>'id', x->>'nome', ST_SetSRID(ST_GeomFromGeoJSON(x->>'g'), 4326) FROM jsonb_array_elements($1::jsonb) x ON CONFLICT (id) DO NOTHING`,
);
await carica(
  "osm_beni",
  dati.beni.map((e) => {
    const t = e.tags ?? {};
    const lineare = t.historic === "citywalls" || t.historic === "aqueduct";
    return { id: id(e), nome: t.name ?? null, tipo: t.historic ?? (t.tourism === "museum" ? "museo" : t.amenity === "fountain" ? "fontana" : t.man_made ?? "bene"), g: geometria(e, !lineare), lineare };
  }).filter((r) => r.g),
  `INSERT INTO artisti.osm_beni (id, tipo, nome, geom)
   SELECT x->>'id', x->>'tipo', x->>'nome',
          CASE WHEN (x->>'lineare')::boolean THEN ST_SetSRID(ST_GeomFromGeoJSON(x->>'g'), 4326)
               ELSE coalesce(NULLIF(ST_CollectionExtract(ST_MakeValid(a), 3), 'GEOMETRYCOLLECTION EMPTY'::geometry), a) END
   FROM jsonb_array_elements($1::jsonb) x, LATERAL (SELECT ${AREA} AS a) q
   WHERE a IS NOT NULL AND NOT ST_IsEmpty(a) ON CONFLICT (id) DO NOTHING`,
);
await carica(
  "osm_edifici",
  dati.edifici.filter((e) => e.geometry && e.geometry.length >= 4).map((e) => ({ id: id(e), g: geometria(e, true) })),
  `INSERT INTO artisti.osm_edifici (id, geom)
   SELECT x->>'id', (ST_Dump(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(x->>'g'), 4326)), 3))).geom
   FROM jsonb_array_elements($1::jsonb) x WHERE x->'g'->>'type' = 'Polygon' ON CONFLICT (id) DO NOTHING`,
);
await carica(
  "osm_vie",
  dati.vie.filter((e) => e.geometry && e.geometry.length >= 2).map((e) => {
    const w = Number(String(e.tags?.width ?? "").replace(",", ".").replace(/\s*m$/, ""));
    return { id: id(e), nome: e.tags!.name, tipo: e.tags!.highway, larghezza: Number.isFinite(w) && w > 0 ? w : null, g: { type: "LineString", coordinates: linea(e.geometry!) } };
  }),
  `INSERT INTO artisti.osm_vie (id, nome, tipo, larghezza, geom)
   SELECT x->>'id', x->>'nome', x->>'tipo', (x->>'larghezza')::real, ST_SetSRID(ST_GeomFromGeoJSON(x->>'g'), 4326)
   FROM jsonb_array_elements($1::jsonb) x ON CONFLICT (id) DO NOTHING`,
);

let t = Date.now();
const strette = await db.query<{ n: number }>("SELECT artisti.misura_vie() AS n");
console.log(`vie sotto i 5 m: ${strette.rows[0].n} (${Math.round((Date.now() - t) / 1000)} s)`);
t = Date.now();
const art2 = await db.query<{ n: number }>("SELECT artisti.ricalcola_vincoli_art2() AS n");
console.log(`zone art. 2: ${art2.rows[0].n} (${Math.round((Date.now() - t) / 1000)} s)`);
t = Date.now();
await db.query("SELECT artisti.ricalcola_copertura()");
const per = await db.query<{ classe: string; n: number; km2: number }>(
  "SELECT classe, count(*)::int n, round(sum(ST_Area(geom::geography)) / 1e6)::int km2 FROM artisti.copertura GROUP BY 1 ORDER BY 2 DESC",
);
console.log(`copertura (${Math.round((Date.now() - t) / 1000)} s): ` + per.rows.map((r) => `${r.classe} ${r.n} (${r.km2} km²)`).join(" · "));
await db.end();
