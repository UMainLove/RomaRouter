// Celle radio di Roma da un file in formato OpenCelliD / Mozilla Location Service
// (radio,mcc,net,area,cell,unit,lon,lat,range,samples,changeable,created,updated,averageSignal).
// Tiene solo MCC 222 dentro il confine comunale, poi raggruppa le celle in siti stimati.
//   node --env-file=.env.local scripts/antenne/celle.mts data/raw/antenne/celle/roma_celle.csv "OpenCelliD (CC BY-SA 4.0)"
import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import pg from "pg";

const file = process.argv[2] ?? "data/raw/antenne/celle/roma_celle.csv";
const fonte = process.argv[3] ?? "OpenCelliD (CC BY-SA 4.0)";
if (!existsSync(file)) throw new Error(`Manca ${file}`);

const BBOX = { o: 12.23, s: 41.65, e: 12.86, n: 42.14 };
const data = (v: string) => {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 1e8 ? new Date(n * 1000).toISOString() : new Date(v).toISOString();
};

const stream = file.endsWith(".gz") ? createReadStream(file).pipe(createGunzip()) : createReadStream(file);
const righe = createInterface({ input: stream, crlfDelay: Infinity });
let testa: string[] | null = null;
const celle: Record<string, unknown>[] = [];
for await (const r of righe) {
  if (!r.trim()) continue;
  const v = r.split(",");
  if (!testa) {
    if (/^radio/i.test(r)) {
      testa = v.map((x) => x.trim().toLowerCase());
      continue;
    }
    testa = ["radio", "mcc", "net", "area", "cell", "unit", "lon", "lat", "range", "samples", "changeable", "created", "updated", "averagesignal"];
  }
  const o = Object.fromEntries(testa.map((h, i) => [h, v[i]]));
  const lon = Number(o.lon), lat = Number(o.lat);
  if (Number(o.mcc) !== 222 || !(lon > BBOX.o && lon < BBOX.e && lat > BBOX.s && lat < BBOX.n)) continue;
  celle.push({
    radio: String(o.radio).toUpperCase(), mcc: 222, mnc: Number(o.net ?? o.mnc), area: Number(o.area) || null, cella: Number(o.cell),
    raggio: Number(o.range) || null, campioni: Number(o.samples) || null, creata: data(o.created), aggiornata: data(o.updated), lon, lat,
  });
}

const db = new pg.Client({ connectionString: process.env.DATABASE_URL_ANTENNE });
await db.connect();
await db.query("BEGIN");
await db.query("DELETE FROM antenne.celle WHERE fonte = $1", [fonte]);
let n = 0;
for (let i = 0; i < celle.length; i += 5000) {
  const r = await db.query(
    `INSERT INTO antenne.celle (radio, mcc, mnc, area, cella, raggio_m, campioni, creata, aggiornata, fonte, geom)
     SELECT x->>'radio', 222, (x->>'mnc')::int, (x->>'area')::bigint, (x->>'cella')::bigint, (x->>'raggio')::int, (x->>'campioni')::int,
            (x->>'creata')::timestamptz, (x->>'aggiornata')::timestamptz, $2, g.geom
     FROM jsonb_array_elements($1::jsonb) x
     CROSS JOIN LATERAL (SELECT ST_SetSRID(ST_MakePoint((x->>'lon')::float8, (x->>'lat')::float8), 4326) AS geom) g
     WHERE EXISTS (SELECT 1 FROM opendata.limite_comunale l WHERE ST_Intersects(l.geom, g.geom))
     ON CONFLICT DO NOTHING`,
    [JSON.stringify(celle.slice(i, i + 5000)), fonte],
  );
  n += r.rowCount ?? 0;
}
const siti = await db.query<{ n: number }>("SELECT antenne.ricalcola_siti() AS n");
await db.query(
  `INSERT INTO antenne.fonti (id, titolo, ente, url, formato, licenza, ufficiale, note, scaricato_il, n_record)
   VALUES ('opencellid', 'Celle radio rilevate dai telefoni (OpenCelliD)', 'OpenCelliD / Unwired Labs (dati crowdsourced)',
           'https://opencellid.org https://archive.org/details/cell_towers.csv', 'CSV', 'CC BY-SA 4.0', false,
           $1, now(), $2)
   ON CONFLICT (id) DO UPDATE SET note = EXCLUDED.note, scaricato_il = now(), n_record = EXCLUDED.n_record`,
  [`${fonte}. Posizioni stimate dalle misure dei telefoni, raggruppate in ${siti.rows[0].n} siti; escluse le celle senza misure dal 2018.`, n],
);
const per = await db.query<{ radio: string; n: number }>("SELECT radio, count(*)::int n FROM antenne.celle GROUP BY 1 ORDER BY 2 DESC");
const op = await db.query<{ o: string; n: number }>("SELECT antenne.operatore_mnc(mnc) o, count(*)::int n FROM antenne.celle GROUP BY 1 ORDER BY 2 DESC");
await db.query("COMMIT");
await db.end();
console.log(`celle nel Comune di Roma: ${n} (lette nel riquadro: ${celle.length}) · siti stimati: ${siti.rows[0].n}`);
console.log("per tecnologia:", per.rows.map((r) => `${r.radio} ${r.n}`).join(", "));
console.log("per operatore:", op.rows.map((r) => `${r.o} ${r.n}`).join(", "));
