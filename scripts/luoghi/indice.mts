// Indice dei luoghi di Roma per la ricerca istantanea delle mappe (public/dati/luoghi-roma.json).
// Dentro: le 14.908 vie dello stradario (public/mappe/_comune/strade), rioni e quartieri (rr_antenne,
// opendata.suddivisioni_toponomastiche), monumenti, piazze e stazioni (rr_artisti_strada, artisti.contesto).
// Il browser lo scarica una volta e cerca mentre scrivi, senza aspettare nessun server.
//   node --env-file=.env.local scripts/luoghi/indice.mts
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const RADICE = path.join(import.meta.dirname, "../..");
const STRADE = path.join(RADICE, "public/mappe/_comune/strade");
type Riga = [string, number, number, string, number, number?]; // nome, lon, lat, tipo (v via, z zona, l luogo), municipio, lunghezza (m, vie)

const righe: Riga[] = [];

// 1. vie: punto sul tratto piu' lungo, municipio dal file
const vie = new Map<string, { lon: number; lat: number; lung: number; mun: number; max: number }>();
for (const f of readdirSync(STRADE).filter((x) => /^m\d+\.json$/.test(x))) {
  const mun = Number(f.match(/\d+/)![0]);
  const j = JSON.parse(readFileSync(path.join(STRADE, f), "utf8")) as { quartieri: Record<string, [string, number, number[][][]][]> };
  for (const elenco of Object.values(j.quartieri)) {
    for (const [nome, lung, tratti] of elenco) {
      const lungo = tratti.reduce((a, b) => (b.length > a.length ? b : a), tratti[0]);
      const p = lungo[Math.floor(lungo.length / 2)];
      const v = vie.get(nome);
      if (!v) vie.set(nome, { lon: p[0], lat: p[1], lung, mun, max: lung });
      else {
        v.lung += lung;
        if (lung > v.max) Object.assign(v, { lon: p[0], lat: p[1], mun, max: lung });
      }
    }
  }
}
for (const [nome, v] of vie) righe.push([nome, +v.lon.toFixed(5), +v.lat.toFixed(5), "v", v.mun, Math.round(v.lung)]);

// 2. rioni, quartieri, suburbi
const ant = new pg.Client({ connectionString: process.env.DATABASE_URL_ANTENNE });
await ant.connect();
const zone = await ant.query<{ nome: string; tipo: string; lon: number; lat: number; mun: number | null }>(
  `SELECT s.nome, s.tipologia AS tipo, ST_X(ST_PointOnSurface(s.geom)) lon, ST_Y(ST_PointOnSurface(s.geom)) lat,
          (SELECT m.numero FROM opendata.municipi m WHERE ST_Intersects(m.geom, ST_PointOnSurface(s.geom)) LIMIT 1) AS mun
   FROM opendata.suddivisioni_toponomastiche s`,
);
await ant.end();
for (const z of zone.rows) righe.push([`${z.nome}`, +z.lon.toFixed(5), +z.lat.toFixed(5), "z", z.mun ?? 0]);

// 3. monumenti, piazze pedonali, stazioni (nomi propri: "Colosseo", "Pantheon", "Fontana di Trevi")
const art = new pg.Client({ connectionString: process.env.DATABASE_URL_ARTISTI });
await art.connect();
const luoghi = await art.query<{ nome: string; lon: number; lat: number; mun: number | null }>(
  `SELECT DISTINCT ON (lower(c.nome)) c.nome, ST_X(ST_PointOnSurface(c.geom)) lon, ST_Y(ST_PointOnSurface(c.geom)) lat, c.municipio AS mun
   FROM artisti.contesto c
   WHERE c.layer IN ('attrazioni', 'piazze_pedonali', 'stazioni', 'venue_cultura') AND c.nome IS NOT NULL AND length(c.nome) > 3
   ORDER BY lower(c.nome), c.layer`,
);
await art.end();
const giaVie = new Set([...vie.keys()].map((n) => n.toLowerCase()));
for (const l of luoghi.rows) if (!giaVie.has(l.nome.toLowerCase())) righe.push([l.nome, +l.lon.toFixed(5), +l.lat.toFixed(5), "l", l.mun ?? 0]);

mkdirSync(path.join(RADICE, "public/dati"), { recursive: true });
const out = path.join(RADICE, "public/dati/luoghi-roma.json");
writeFileSync(out, JSON.stringify({ v: 1, generato: new Date().toISOString().slice(0, 10), fonti: "Stradario Roma Capitale; suddivisioni toponomastiche; OpenStreetMap (ODbL)", righe }));
console.log(`luoghi: ${righe.length} (vie ${vie.size}, zone ${zone.rowCount}, luoghi ${righe.length - vie.size - (zone.rowCount ?? 0)}) → ${path.relative(RADICE, out)}`);
