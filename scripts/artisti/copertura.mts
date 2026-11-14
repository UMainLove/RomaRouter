// Copertura di tutta Roma per l'arte di strada: carica le vie dello stradario (public/mappe/_comune/strade,
// geometrie di tutte le 14.908 vie) e classifica gli esagoni H3 del Comune (artisti.ricalcola_copertura).
//   node --env-file=.env.local scripts/artisti/copertura.mts
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const STRADE = path.join(import.meta.dirname, "../../public/mappe/_comune/strade");
const VELOCI = /^(autostrada|grande raccordo|tangenziale|raccordo|via di grande comunicazione)/i;

type Tratti = number[][][];
const vie: { nome: string; mun: number; veloce: boolean; tratti: Tratti }[] = [];
for (const f of readdirSync(STRADE).filter((x) => /^m\d+\.json$/.test(x))) {
  const mun = Number(f.match(/\d+/)![0]);
  const j = JSON.parse(readFileSync(path.join(STRADE, f), "utf8")) as { quartieri: Record<string, [string, number, Tratti][]> };
  for (const elenco of Object.values(j.quartieri)) for (const [nome, , tratti] of elenco) vie.push({ nome, mun, veloce: VELOCI.test(nome), tratti });
}

const db = new pg.Client({ connectionString: process.env.DATABASE_URL_ARTISTI });
await db.connect();
await db.query("BEGIN");
await db.query("DELETE FROM artisti.strade");
for (let i = 0; i < vie.length; i += 1500) {
  const blocco = vie.slice(i, i + 1500).map((v) => ({ nome: v.nome, mun: v.mun, veloce: v.veloce, geom: JSON.stringify({ type: "MultiLineString", coordinates: v.tratti }) }));
  await db.query(
    `INSERT INTO artisti.strade (nome, mun, veloce, geom)
     SELECT x->>'nome', (x->>'mun')::smallint, (x->>'veloce')::boolean, ST_SetSRID(ST_GeomFromGeoJSON(x->>'geom'), 4326)
     FROM jsonb_array_elements($1::jsonb) x`,
    [JSON.stringify(blocco)],
  );
}
// parchi veri (poligoni OpenStreetMap): dentro si puo' solo sui viali, senza amplificazione
const fileParchi = path.join(import.meta.dirname, "../../art-spot-dati/geo/parchi_roma_osm.geojson");
const parchi = (JSON.parse(readFileSync(fileParchi, "utf8")) as { features: { properties: { id: string; nome: string | null }; geometry: unknown }[] }).features;
await db.query("DELETE FROM artisti.parchi");
await db.query(
  `INSERT INTO artisti.parchi (id, nome, geom)
   SELECT x->>'id', x->>'nome', ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(x->>'geom'), 4326)), 3))
   FROM jsonb_array_elements($1::jsonb) x ON CONFLICT (id) DO NOTHING`,
  [JSON.stringify(parchi.map((f) => ({ ...f.properties, geom: JSON.stringify(f.geometry) })))],
);
const t0 = Date.now();
const { rows } = await db.query<{ n: number }>("SELECT artisti.ricalcola_copertura() AS n");
const per = await db.query<{ classe: string; n: number; km2: number }>(
  "SELECT classe, count(*)::int n, round(sum(ST_Area(geom::geography)) / 1e6)::int km2 FROM artisti.copertura GROUP BY 1 ORDER BY 2 DESC",
);
await db.query("COMMIT");
await db.end();
console.log(`vie caricate: ${vie.length} · esagoni: ${rows[0].n} in ${Math.round((Date.now() - t0) / 1000)} s`);
console.log(per.rows.map((r) => `${r.classe} ${r.n} (${r.km2} km²)`).join(" · "));
