// Import del dataset "Art Spot" (art-spot-dati/) nel database della sezione artisti (rr_artisti_strada)
// e calcolo delle zone della mappa (artisti.ricalcola_zone()).
// Uso: node --env-file=.env.local scripts/artisti/import.mts
// Si puo' rilanciare: ogni tabella del dataset viene svuotata e riscritta (le prenotazioni e i profili no).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const RADICE = path.resolve(import.meta.dirname, "../..");
const DATI = path.join(RADICE, "art-spot-dati");
const GEOSERVER = "https://geoportale.comune.roma.it/geoserver/ows";

const ROMANI: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15,
};
const numeroMunicipio = (r: unknown) => (typeof r === "string" && ROMANI[r.trim().toUpperCase()]) || null;
const testo = (v: unknown) => (v == null || String(v).trim() === "" ? null : String(v).trim());

interface Feature {
  type: "Feature";
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown>;
}

function leggiGeo(nome: string): Feature[] {
  const f = path.join(DATI, "geo", `${nome}.geojson`);
  if (!existsSync(f)) throw new Error(`Manca ${path.relative(RADICE, f)}`);
  const j = JSON.parse(readFileSync(f, "utf8")) as { features: Feature[] };
  return j.features.filter((x) => x.geometry);
}

// CSV con virgolette doppie (RFC 4180)
function leggiCsv(rel: string): Record<string, string>[] {
  const t = readFileSync(path.join(DATI, rel), "utf8").replace(/^﻿/, "");
  const righe: string[][] = [];
  let riga: string[] = [], campo = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { campo += '"'; i++; } else q = false; } else campo += c;
    } else if (c === '"') q = true;
    else if (c === ",") { riga.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      riga.push(campo); righe.push(riga); riga = []; campo = "";
    } else campo += c;
  }
  if (campo || riga.length) { riga.push(campo); righe.push(riga); }
  const [testa, ...corpo] = righe.filter((r) => r.length > 1);
  return corpo.map((r) => Object.fromEntries(testa.map((h, i) => [h, r[i] ?? ""])));
}

const db = new pg.Client({ connectionString: process.env.DATABASE_URL_ARTISTI });
const log = (m: string) => console.log(`[artisti] ${m}`);

async function fonti() {
  // le fonti si aggiornano soltanto (postazioni e altre tabelle le referenziano)
  const righe = leggiCsv("fonti/INDEX.csv");
  for (const r of righe) {
    const id = r.filename.replace(/\.[a-z0-9]+$/i, "");
    const locale = existsSync(path.join(DATI, "fonti", r.filename)) ? `art-spot-dati/fonti/${r.filename}` : null;
    const ufficiale = /roma capitale|municipio|assemblea|giunta|consiglio|dipartimento|comune di/i.test(r.issuing_body);
    await db.query(
      `INSERT INTO artisti.fonti (id, titolo, ente, url, formato, licenza, ufficiale, note, scaricato_il, data_atto, url_archivio, file_locale)
       VALUES ($1,$2,$3,$4,$5,NULL,$6,NULL,'2026-11-13',$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET titolo=EXCLUDED.titolo, ente=EXCLUDED.ente, url=EXCLUDED.url, formato=EXCLUDED.formato,
         ufficiale=EXCLUDED.ufficiale, data_atto=EXCLUDED.data_atto, url_archivio=EXCLUDED.url_archivio, file_locale=EXCLUDED.file_locale`,
      [id, r.title, r.issuing_body || "—", r.original_url || r.archive_url || "", (r.filename.split(".").pop() || "").toUpperCase(),
       ufficiale, r.date || null, r.archive_url || null, locale],
    );
  }
  await db.query(
    `INSERT INTO artisti.fonti (id, titolo, ente, url, formato, licenza, ufficiale, note, scaricato_il)
     VALUES ('art_spot_2026', 'Dataset Art Spot – regole e luoghi per gli artisti di strada a Roma', 'Team RomaRouter (studio)',
             'art-spot-dati/README.md', 'GeoJSON/CSV', 'ODbL 1.0 per i dati OpenStreetMap; IODL 2.0 per le scuole MIM', false,
             'Raccolta del 13/11/2026: ogni riga ha il proprio stato di verifica e la nota sulla posizione.', '2026-11-13')
     ON CONFLICT (id) DO NOTHING`,
  );
  log(`fonti: ${righe.length} dall'indice`);
}

async function municipi() {
  const u = new URL(GEOSERVER);
  for (const [k, v] of Object.entries({
    service: "WFS", version: "1.1.0", request: "GetFeature", typeName: "DIPPC:municipi",
    outputFormat: "application/json", srsName: "urn:ogc:def:crs:OGC:1.3:CRS84",
  })) u.searchParams.set(k, v);
  const res = await fetch(u, { headers: { "User-Agent": "civic-data-ingest/0.1" }, signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`GeoRoma municipi: HTTP ${res.status}`);
  const { features } = (await res.json()) as { features: Feature[] };
  const romani = Object.keys(ROMANI);
  await db.query("DELETE FROM artisti.municipi");
  for (const f of features) {
    const n = Number(f.properties.municipio);
    if (!(n >= 1 && n <= 15)) continue;
    await db.query(
      `INSERT INTO artisti.municipi (numero, numero_romano, geom)
       VALUES ($1, $2, ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))), 3)))`,
      [n, romani[n - 1], JSON.stringify(f.geometry)],
    );
  }
  log(`municipi: ${features.length} (GeoRoma)`);
}

const SQL_GEOM = "ST_MakeValid(ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON($GEO), 4326)))";
const geomSql = (n: number) => SQL_GEOM.replace("$GEO", `$${n}`);
const stimata = (nota: unknown) => /stimat|geocodific|approssimat|nominatim|centroide/i.test(String(nota ?? ""));

async function postazioni() {
  await db.query("DELETE FROM artisti.fasce_orarie WHERE postazione_id IN (SELECT id FROM artisti.postazioni WHERE chiave IS NOT NULL)");
  await db.query("DELETE FROM artisti.postazioni WHERE chiave IS NOT NULL AND id NOT IN (SELECT postazione_id FROM artisti.prenotazioni WHERE postazione_id IS NOT NULL)");
  let n = 0;
  const importate: string[] = [];
  // arti figurative: l'elenco ufficiale 2026 (DGC 154/2026, scripts/artisti/arti_figurative_geo.mts) sostituisce quello del 2018
  const figurative = existsSync(path.join(DATI, "geo/arti_figurative_2026.geojson")) ? "arti_figurative_2026" : "arti_figurative_aree_2018";
  for (const layer of ["postazioni_allegatoB", "aree_consentite_munX", "esoterici", figurative]) {
    for (const f of leggiGeo(layer)) {
      const p = f.properties;
      const { rows } = await db.query<{ id: number }>(
        `INSERT INTO artisti.postazioni (chiave, codice, nome, municipio, indirizzo, descrizione, geom, amplificazione, attiva, fonte_id,
           tipo, scheda, raggio_m, localizzazioni, regole_testo, fasce_testo, fonte_testo, fonte_url, verifica, nota_posizione, posizione_stimata, attributi)
         VALUES ($1, $2, $3, $4, NULL, NULL, ST_PointOnSurface(${geomSql(5)}), $6, true, 'art_spot_2026',
           $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         ON CONFLICT (chiave) DO UPDATE SET nome=EXCLUDED.nome, municipio=EXCLUDED.municipio, geom=EXCLUDED.geom, tipo=EXCLUDED.tipo,
           scheda=EXCLUDED.scheda, raggio_m=EXCLUDED.raggio_m, localizzazioni=EXCLUDED.localizzazioni, regole_testo=EXCLUDED.regole_testo,
           fasce_testo=EXCLUDED.fasce_testo, fonte_testo=EXCLUDED.fonte_testo, fonte_url=EXCLUDED.fonte_url, verifica=EXCLUDED.verifica,
           nota_posizione=EXCLUDED.nota_posizione, posizione_stimata=EXCLUDED.posizione_stimata, attributi=EXCLUDED.attributi, attiva=true, aggiornato_il=now()
         RETURNING id`,
        [
          // codice e' UNIQUE: solo il codice d'area delle arti figurative (es. "1.a") e' univoco
          p.id, testo(p.codice_area), testo(p.name), numeroMunicipio(p.municipio), JSON.stringify(f.geometry),
          p.type === "postazione_allegatoB" ? false : null,
          testo(p.type), testo(p.scheda), p.radius_m != null && p.radius_m !== "" ? Number(p.radius_m) : null,
          p.localizzazioni != null && p.localizzazioni !== "" ? Number(p.localizzazioni) : null,
          testo(p.rules), testo(p.time_slots), testo(p.source), testo(p.source_url), testo(p.verification_status),
          testo(p.coord_note), stimata(p.coord_note) || stimata(p.verification_status),
          JSON.stringify({ area: p.area ?? null, municipio_elenco_2018: p.municipio_elenco_2018 ?? null }),
        ],
      );
      n++;
      importate.push(String(p.id));
      // Fasce orarie strutturate (art. 6 DAC 24/2012): servono per controllare le prenotazioni
      const fasce = p.type === "area_esoterici"
        ? [["01-01", "12-31", "16:00", "20:00"], ["01-01", "12-31", "20:00", "24:00"]]
        : p.type === "arti_figurative_area"
          ? [["01-01", "12-31", "08:00", "24:00"]]
          : [["10-01", "05-31", "10:00", "13:00"], ["10-01", "05-31", "16:00", "20:00"], ["06-01", "09-30", "10:00", "13:00"], ["06-01", "09-30", "16:00", "22:00"]];
      for (const [da, a, ini, fine] of fasce) {
        await db.query(
          `INSERT INTO artisti.fasce_orarie (postazione_id, giorni, ora_inizio, ora_fine, durata_max_min, periodo_da, periodo_a, riferimento)
           VALUES ($1, '{1,2,3,4,5,6,7}', $2, $3, $4, $5, $6, $7)`,
          [rows[0].id, ini, fine === "24:00" ? "23:59" : fine, p.type === "arti_figurative_area" ? null : 120, da, a,
           p.type === "arti_figurative_area" ? "DAC 304/2025" : p.type === "area_esoterici" ? "DAC 24/2012, art. 6 (esoterici)" : "DAC 24/2012, art. 6"],
        );
      }
    }
  }
  // quelle non piu' negli elenchi (es. arti figurative 2018) restano solo se legate a esibizioni, ma spente
  const spente = await db.query("UPDATE artisti.postazioni SET attiva = false WHERE chiave IS NOT NULL AND NOT (chiave = ANY($1)) AND attiva", [importate]);
  log(`postazioni e aree: ${n} (${figurative}; spente ${spente.rowCount} non piu' in elenco)`);
}

// Metri per lato della fascia attorno alle vie vietate (strada + marciapiedi); le altre usano il default
// di artisti.ricalcola_zone(). Via dei Fori Imperiali e' larga con l'area pedonale.
const LARGHEZZE: [RegExp, number][] = [[/fori imperiali/i, 40]];
async function divieti() {
  await db.query("DELETE FROM artisti.divieti");
  const feats = leggiGeo("divieti");
  // atti ufficiali trovati nel registro di Roma Capitale (novembre 2026): sostituiscono le fonti di stampa
  const agg = new Map(leggiCsv("tabelle/divieti_aggiornamenti_2026-11.csv").map((r) => [r.id, r]));
  for (const f of feats) {
    const a = agg.get(String(f.properties.id));
    if (a) Object.assign(f.properties, { act: a.act, valid_to: a.valid_to || null, verification_status: a.verification_status, source_url: a.source_url, source: a.act, salva_allegato_b: a.salva_allegato_b === "true", nota_atto: a.note || null });
    const p = f.properties, ver = String(p.verification_status ?? "");
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(p.valid_to ?? ""));
    if (iso) p.valid_to = `fino al ${iso[3]}/${iso[2]}/${iso[1]}`;
    await db.query(
      `INSERT INTO artisti.divieti (chiave, municipio, nome, tipo, regole_testo, fasce_testo, atto, valido_fino, fonte_testo, fonte_url,
         verifica, ufficiale, vigente, nota_posizione, larghezza_m, salva_allegato_b, geom)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$16,$17, ${geomSql(15)})`,
      [p.id, numeroMunicipio(p.municipio), testo(p.name), testo(p.type), testo(p.rules), testo(p.time_slots), testo(p.act),
       testo(p.valid_to), testo(p.source), testo(p.source_url), ver, /^ufficiale/i.test(ver), p.type !== "divieto_richiesto" && !/NON in vigore/i.test(ver),
       testo(p.coord_note), JSON.stringify(f.geometry), LARGHEZZE.find(([re]) => re.test(testo(p.name) ?? ""))?.[1] ?? null, p.salva_allegato_b === true],
    );
  }
  log(`divieti: ${feats.length} (${agg.size} aggiornati con gli atti ufficiali)`);
}

const CONTESTO = [
  "piazze_pedonali", "attrazioni", "stazioni", "mercati", "parchi", "nightlife", "venue_cultura", "venue_eventi",
  "scuole", "ospedali", "luoghi_culto", "uffici", "zone_contesto",
];
async function contesto() {
  await db.query("DELETE FROM artisti.contesto");
  let n = 0;
  for (const layer of CONTESTO) {
    const feats = leggiGeo(layer);
    // insert a blocchi: migliaia di righe
    for (let i = 0; i < feats.length; i += 500) {
      const blocco = feats.slice(i, i + 500).map((f) => {
        const p = f.properties;
        const extra = Object.fromEntries(Object.entries(p).filter(([k]) =>
          !["id", "layer", "municipio", "name", "type", "rules", "time_slots", "source", "source_url", "verification_status", "coord_note"].includes(k)));
        return {
          chiave: p.id, layer, tipo: testo(p.type), nome: testo(p.name), municipio: numeroMunicipio(p.municipio),
          regole: testo(p.rules), fasce: testo(p.time_slots), verifica: testo(p.verification_status), fonte: testo(p.source),
          url: testo(p.source_url), attributi: { ...extra, coord_note: p.coord_note ?? null }, geom: f.geometry,
        };
      });
      await db.query(
        `INSERT INTO artisti.contesto (chiave, layer, tipo, nome, municipio, regole_testo, fasce_testo, verifica, fonte_testo, fonte_url, attributi, geom)
         SELECT x->>'chiave', x->>'layer', x->>'tipo', x->>'nome', (x->>'municipio')::smallint, x->>'regole', x->>'fasce', x->>'verifica',
                x->>'fonte', x->>'url', x->'attributi', ST_MakeValid(ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON(x->>'geom'), 4326)))
         FROM jsonb_array_elements($1::jsonb) x`,
        [JSON.stringify(blocco.map((b) => ({ ...b, geom: JSON.stringify(b.geom) })))],
      );
      n += blocco.length;
    }
  }
  log(`luoghi di contesto: ${n}`);

  // Luoghi di culto di tutto il Comune (OpenStreetMap, scripts/artisti/culto_osm.mts): Art Spot copre solo
  // il centro storico. Si aggiungono quelli a piu' di 25 m da uno gia' presente.
  const osm = path.join(DATI, "geo/luoghi_culto_roma_osm.geojson");
  if (existsSync(osm)) {
    const feats = (JSON.parse(readFileSync(osm, "utf8")) as { features: { geometry: unknown; properties: Record<string, string | null> }[] }).features;
    const r = await db.query(
      `INSERT INTO artisti.contesto (chiave, layer, tipo, nome, municipio, verifica, fonte_testo, fonte_url, attributi, geom)
       SELECT x->>'id', 'luoghi_culto', x->>'type', x->>'name', m.numero, x->>'verification_status', 'OpenStreetMap', x->>'source_url',
              jsonb_build_object('denominazione', x->>'denominazione', 'origine', 'osm_tutta_roma'), g.geom
       FROM jsonb_array_elements($1::jsonb) x
       CROSS JOIN LATERAL (SELECT ST_SetSRID(ST_GeomFromGeoJSON(x->>'geom'), 4326) AS geom) g
       LEFT JOIN artisti.municipi m ON ST_Intersects(m.geom, g.geom)
       WHERE NOT EXISTS (SELECT 1 FROM artisti.contesto c WHERE c.layer = 'luoghi_culto' AND ST_DWithin(c.geom::geography, g.geom::geography, 25))
       ON CONFLICT DO NOTHING`,
      [JSON.stringify(feats.map((f) => ({ ...f.properties, geom: JSON.stringify(f.geometry) })))],
    );
    log(`luoghi di culto da OSM (tutta Roma): +${r.rowCount}`);
  }
}

async function contatti() {
  await db.query("DELETE FROM artisti.contatti");
  const righe = leggiCsv("tabelle/contacts_municipi.csv");
  for (const r of righe) {
    const lat = Number(r.lat_pl), lon = Number(r.lon_pl);
    await db.query(
      `INSERT INTO artisti.contatti (municipio, pec_municipio, ufficio_cultura, gruppo_pl, indirizzo_pl, pec_pl, telefono_pl, fonte, verifica, note, geom)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, CASE WHEN $11::float8 IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint($12, $11), 4326) END)`,
      [numeroMunicipio(r.municipio), testo(r.pec_municipio), testo(r.ufficio_cultura_municipio), testo(r.gruppo_polizia_locale),
       testo(r.indirizzo_pl), testo(r.pec_pl), testo(r.telefono_pl), testo(r.fonte_pl), testo(r.stato_verifica), testo(r.note),
       Number.isFinite(lat) && lat ? lat : null, Number.isFinite(lon) && lon ? lon : null],
    );
  }
  log(`contatti dei Municipi e della Polizia Locale: ${righe.length}`);
}

async function regoleEBenchmark() {
  await db.query("DELETE FROM artisti.regole WHERE chiave IS NOT NULL");
  const regole = leggiCsv("tabelle/regole_generali.csv");
  for (const r of regole) {
    await db.query(
      `INSERT INTO artisti.regole (postazione_id, categoria, testo, riferimento, url, verifica, chiave)
       VALUES (NULL, $1, $2, $3, NULL, $4, $5)`,
      [r.tema, r.regola, r.riferimento, r.stato_verifica, `${r.riferimento}|${r.tema}`],
    );
  }
  // testo vigente dopo la sentenza del TAR Lazio 5494/2013 e atti del 2024-2026 (art-spot-dati/RICERCA_FONTI_2026-11.md)
  const agg = leggiCsv("tabelle/regole_aggiornamenti_2026-11.csv");
  for (const r of agg) {
    await db.query(
      `INSERT INTO artisti.regole (postazione_id, categoria, testo, riferimento, url, verifica, chiave)
       VALUES (NULL, $1, $2, $3, $4, $5, $6)
       ON CONFLICT (chiave) DO UPDATE SET testo = EXCLUDED.testo, url = EXCLUDED.url, verifica = EXCLUDED.verifica`,
      [r.tema, r.regola, r.riferimento, r.url || null, r.stato_verifica, `${r.riferimento}|${r.tema}`],
    );
  }
  await db.query("DELETE FROM artisti.benchmark");
  const bench = leggiCsv("tabelle/benchmark_citta.csv");
  for (const r of bench) {
    await db.query("INSERT INTO artisti.benchmark (citta, atto, regole, fonte_url) VALUES ($1,$2,$3,$4)", [r.citta, r.atto, r.regole_principali, r.fonte]);
  }
  log(`regole generali: ${regole.length} (${agg.length} aggiornate o aggiunte) · confronto con altre città: ${bench.length}`);
}

if (!process.env.DATABASE_URL_ARTISTI) {
  console.error("DATABASE_URL_ARTISTI non impostata: copia .env.example in .env.local");
  process.exit(1);
}
if (!existsSync(DATI)) {
  console.error("Manca la cartella art-spot-dati/ (dataset Art Spot)");
  process.exit(1);
}
await db.connect();
try {
  await db.query("BEGIN");
  await fonti();
  await municipi();
  await postazioni();
  await divieti();
  await contesto();
  await contatti();
  await regoleEBenchmark();
  const { rows } = await db.query<{ n: number }>("SELECT artisti.ricalcola_zone() AS n");
  log(`zone calcolate: ${rows[0].n}`);
  // regole generali dell'art. 2 (vie strette, ospedali, chiese, beni culturali): dati di scripts/artisti/vincoli_osm.mts
  const art2 = await db.query<{ n: number }>("SELECT artisti.ricalcola_vincoli_art2() AS n");
  log(`zone art. 2: ${art2.rows[0].n}`);
  await db.query("COMMIT");
  log("import completato");
} catch (err) {
  await db.query("ROLLBACK");
  throw err;
} finally {
  await db.end();
}
