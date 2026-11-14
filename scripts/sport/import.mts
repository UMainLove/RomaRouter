// Dove fare sport a Roma: importa e unisce le fonti (docs/SPORT.md).
//  1. Municipi (GeoRoma)
//  2. Roma Capitale, GeoServer: impianti sportivi (270), centri sportivi municipali (310), impianti capitolini (89),
//     piscine comunali (16), aree fitness libere (94), piscine dell'estate over 70 (17)
//  3. Classificazione 2025 degli impianti capitolini (PDF, codici SIS e classi A/B/C)
//  4. OpenStreetMap: centri sportivi, campi (con la disciplina), palestre, piscine, piste; parchi e scuole per capire
//     se un campo e' libero
//  5. Unione: i campi diventano gli "spazi" del loro luogo; quelli sparsi diventano campi liberi o club
// I file scaricati restano in data/raw/sport (fuori da git).
//   node --env-file=.env.local scripts/sport/import.mts [--scarica]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const CARTELLA = path.join(import.meta.dirname, "../../data/raw/sport");
const GEOSERVER = "https://geoportale.comune.roma.it/geoserver/ows";
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
const ROMA = `area["name"="Roma"]["admin_level"="8"]->.r;`;
const forza = process.argv.includes("--scarica");
const log = (s: string) => console.log(s);
mkdirSync(CARTELLA, { recursive: true });

type Feature = { type: "Feature"; geometry: { type: string; coordinates: unknown } | null; properties: Record<string, unknown> };

async function scaricaFile(nome: string, url: string, init?: RequestInit): Promise<string> {
  const file = path.join(CARTELLA, nome);
  if (!forza && existsSync(file)) return file;
  let ultimo = "";
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { ...init, headers: { "User-Agent": "RomaRouter-dati/1.0", ...(init?.headers ?? {}) }, signal: AbortSignal.timeout(300_000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      writeFileSync(file, Buffer.from(await r.arrayBuffer()));
      return file;
    } catch (e) {
      ultimo = (e as Error).message;
      await new Promise((ok) => setTimeout(ok, 4000 * (i + 1)));
    }
  }
  throw new Error(`${nome}: ${ultimo}`);
}

async function wfs(layer: string): Promise<Feature[]> {
  const u = new URL(GEOSERVER);
  for (const [k, v] of Object.entries({ service: "WFS", version: "1.0.0", request: "GetFeature", typeName: layer, outputFormat: "application/json", srsName: "EPSG:4326" })) u.searchParams.set(k, v);
  const file = await scaricaFile(`wfs_${layer.replace(/\W/g, "_")}.json`, u.toString());
  return (JSON.parse(readFileSync(file, "utf8")) as { features: Feature[] }).features;
}

type Elemento = { type: "node" | "way" | "relation"; id: number; tags?: Record<string, string>; lat?: number; lon?: number; geometry?: { lat: number; lon: number }[]; members?: { role: string; geometry?: { lat: number; lon: number }[] }[] };
async function overpass(nome: string, q: string, minimo = 1): Promise<Elemento[]> {
  const file = path.join(CARTELLA, `osm_${nome}.json`);
  if (forza || !existsSync(file)) {
    let ok = false;
    for (let i = 0; i < 6 && !ok; i++) {
      const server = OVERPASS[i % OVERPASS.length];
      try {
        const r = await fetch(server, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "RomaRouter-dati/1.0" }, body: "data=" + encodeURIComponent(q), signal: AbortSignal.timeout(330_000) });
        const t = await r.text();
        if (!r.ok || !t.startsWith("{")) throw new Error(`${r.status} ${t.slice(0, 100)}`);
        // risposte tronche (server sovraccarico): si riprova
        const j = JSON.parse(t) as { elements: unknown[]; remark?: string };
        if (j.elements.length < minimo || /error|timed out|runtime/i.test(j.remark ?? "")) throw new Error(`solo ${j.elements.length} elementi`);
        writeFileSync(file, t);
        ok = true;
      } catch (e) {
        log(`  ${nome} da ${new URL(server).host}: ${(e as Error).message}`);
        await new Promise((r) => setTimeout(r, 5000 * (i + 1)));
      }
    }
    if (!ok) throw new Error(`impossibile scaricare ${nome}`);
  }
  return (JSON.parse(readFileSync(file, "utf8")) as { elements: Elemento[] }).elements;
}

/** Geometria GeoJSON dall'elemento OSM: punto, poligono (way chiusa) o linee (relazioni, si ricostruiscono in PostGIS). */
function geometria(e: Elemento): unknown | null {
  if (e.type === "node" && e.lat != null) return { type: "Point", coordinates: [e.lon, e.lat] };
  const c = (g: { lat: number; lon: number }[]) => g.map((p) => [p.lon, p.lat]);
  if (e.type === "way" && e.geometry && e.geometry.length >= 2) {
    const g = c(e.geometry);
    const chiusa = g.length >= 4 && g[0][0] === g[g.length - 1][0] && g[0][1] === g[g.length - 1][1];
    return chiusa ? { type: "Polygon", coordinates: [g] } : { type: "LineString", coordinates: g };
  }
  if (e.type === "relation" && e.members) {
    const linee = e.members.filter((m) => m.geometry && m.geometry.length > 1 && m.role !== "inner").map((m) => c(m.geometry!));
    return linee.length ? { type: "MultiLineString", coordinates: linee } : null;
  }
  return null;
}

const db = new pg.Client({ connectionString: process.env.DATABASE_URL_SPORT });
await db.connect();
const q = (sql: string, p?: unknown[]) => db.query(sql, p);
const json = (x: unknown) => JSON.stringify(x);

// ---------------------------------------------------------------- 1. Municipi
const ROMANI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];
{
  const mun = await wfs("DIPPC:municipi");
  await q("DELETE FROM sport.municipi");
  for (const f of mun) {
    const n = Number(f.properties.municipio);
    if (!(n >= 1 && n <= 15) || !f.geometry) continue;
    await q(
      `INSERT INTO sport.municipi (numero, numero_romano, geom)
       VALUES ($1, $2, ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))), 3)))
       ON CONFLICT (numero) DO UPDATE SET geom = EXCLUDED.geom`,
      [n, ROMANI[n - 1], json(f.geometry)],
    );
  }
  log(`municipi: ${mun.length}`);
}

// ---------------------------------------------------------------- 2. fonti di Roma Capitale
const [servizi, punti, fitness, piscine] = await Promise.all([
  wfs("DIPPC:243_ServiziSportivi"),
  wfs("DIPAU:punti_servizi_7792"),
  wfs("DIPAMB:aree_fitness"),
  wfs("GABSIN:piscine"),
]);
log(`Roma Capitale: impianti ${servizi.length}, punti servizi ${punti.length}, aree fitness ${fitness.length}, piscine estate ${piscine.length}`);

// ---------------------------------------------------------------- 3. classificazione 2025 (PDF)
const CLASSI = [
  ["A", "https://www.comune.roma.it/web-resources/cms/documents/QA2025011677902_ALLEGATO_1__Impianti_Classe_A_approvata.pdf"],
  ["B", "https://www.comune.roma.it/web-resources/cms/documents/QA2025011677903_ALLEGATO_2__Impianti_Classe_B_approvata.pdf"],
  ["C", "https://www.comune.roma.it/web-resources/cms/documents/QA2025011677904_ALLEGATO_3__Impianti_Classe_C_approvata.pdf"],
];
const classificati: { classe: string; sis: string; indirizzo: string; nome: string | null }[] = [];
for (const [classe, url] of CLASSI) {
  try {
    const pdf = await scaricaFile(`classe_${classe}.pdf`, url);
    const testo = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8" });
    for (const riga of testo.split(/\r?\n/)) {
      const m = riga.match(/^\s*\d+\s+(\d{1,2})\s+(\d{1,3})\s+(.+?)\s*([ABC])?\s*$/);
      if (!m || !/[a-z]/i.test(m[3])) continue;
      const [ind, nome] = m[3].split(/\s{3,}/);
      classificati.push({ classe, sis: `${Number(m[1])}-${Number(m[2])}`, indirizzo: ind.trim(), nome: nome?.trim() || null });
    }
  } catch (e) {
    log(`  classificazione ${classe} saltata: ${(e as Error).message.slice(0, 120)} (serve pdftotext)`);
  }
}
log(`classificazione 2025: ${classificati.length} impianti`);

// ---------------------------------------------------------------- 4. OpenStreetMap
const LUOGHI_OSM = "sports_centre|stadium|sports_hall|fitness_centre|track|golf_course|horse_riding|ice_rink|pitch|fitness_station";
// una richiesta alla volta: i server Overpass rifiutano le richieste in parallelo
const osmSport = await overpass("sport", `[out:json][timeout:300];${ROMA}nwr["leisure"~"^(${LUOGHI_OSM})$"](area.r);out geom qt;`, 3000);
const osmPiscine = await overpass("piscine", `[out:json][timeout:200];${ROMA}(nwr["leisure"="swimming_pool"]["name"](area.r);nwr["leisure"="swimming_pool"]["access"~"^(yes|public|customers|permissive)$"](area.r);nwr["leisure"="water_park"](area.r););out geom qt;`);
const osmParchi = await overpass("parchi", `[out:json][timeout:300];${ROMA}(way["leisure"="park"](area.r);relation["leisure"="park"](area.r););out geom qt;`, 300);
const osmScuole = await overpass("scuole", `[out:json][timeout:300];${ROMA}(way["amenity"~"^(school|university|college)$"](area.r);relation["amenity"~"^(school|university|college)$"](area.r););out geom qt;`, 500);
const osmContesto = [...osmParchi, ...osmScuole];
log(`OpenStreetMap: ${osmSport.length} sportivi, ${osmPiscine.length} piscine, ${osmContesto.length} parchi e scuole`);

await q(`DROP TABLE IF EXISTS sport.stg_osm, sport.stg_contesto`);
await q(`CREATE UNLOGGED TABLE sport.stg_osm (id text PRIMARY KEY, leisure text, tags jsonb, geom geometry, area geometry, centro geometry(Point, 4326))`);
await q(`CREATE UNLOGGED TABLE sport.stg_contesto (id text PRIMARY KEY, tipo text, geom geometry)`);
const AREA = `CASE WHEN x->'g'->>'type' = 'MultiLineString' THEN ST_BuildArea(ST_SetSRID(ST_GeomFromGeoJSON(x->>'g'), 4326))
                   ELSE ST_SetSRID(ST_GeomFromGeoJSON(x->>'g'), 4326) END`;
async function carica(tabella: string, righe: Record<string, unknown>[], sql: string) {
  for (let i = 0; i < righe.length; i += 2000) await q(sql, [json(righe.slice(i, i + 2000))]);
  return (await q(`SELECT count(*)::int n FROM sport.${tabella}`)).rows[0].n as number;
}
const osm = [...osmSport, ...osmPiscine].map((e) => ({ id: `${e.type}/${e.id}`, leisure: e.tags?.leisure ?? "", tags: e.tags ?? {}, g: geometria(e) })).filter((r) => r.g);
await carica(
  "stg_osm",
  osm,
  `INSERT INTO sport.stg_osm (id, leisure, tags, geom)
   SELECT x->>'id', x->>'leisure', x->'tags', ST_MakeValid(${AREA}) FROM jsonb_array_elements($1::jsonb) x
   WHERE ${AREA} IS NOT NULL ON CONFLICT (id) DO NOTHING`,
);
await q(`UPDATE sport.stg_osm SET area = CASE WHEN GeometryType(geom) LIKE '%POLYGON%' THEN ST_Multi(ST_CollectionExtract(geom, 3)) END,
                                  centro = CASE WHEN GeometryType(geom) = 'POINT' THEN geom ELSE ST_PointOnSurface(geom) END`);
await q(`UPDATE sport.stg_osm SET area = NULL WHERE area IS NOT NULL AND ST_IsEmpty(area)`);
const nContesto = await carica(
  "stg_contesto",
  osmContesto.map((e) => ({ id: `${e.type}/${e.id}`, tipo: e.tags?.leisure === "park" ? "parco" : "scuola", g: geometria(e) })).filter((r) => r.g),
  `INSERT INTO sport.stg_contesto (id, tipo, geom)
   SELECT x->>'id', x->>'tipo', ST_CollectionExtract(ST_MakeValid(${AREA}), 3) FROM jsonb_array_elements($1::jsonb) x
   WHERE ${AREA} IS NOT NULL ON CONFLICT (id) DO NOTHING`,
);
await q(`DELETE FROM sport.stg_contesto WHERE geom IS NULL OR ST_IsEmpty(geom)`);
await q(`CREATE INDEX ON sport.stg_osm USING gist (centro); CREATE INDEX ON sport.stg_osm USING gist (area); CREATE INDEX ON sport.stg_contesto USING gist (geom)`);
log(`  caricati: ${osm.length} elementi sportivi, ${nContesto} parchi e scuole`);

// ---------------------------------------------------------------- 5. unione
await q("BEGIN");
await q("DELETE FROM sport.spazi");
await q("DELETE FROM sport.luoghi");
await q("ALTER SEQUENCE sport.luoghi_id_seq RESTART");
await q(`INSERT INTO sport.fonti (id, titolo, ente, url, formato, licenza, ufficiale, note, scaricato_il, n_record) VALUES
  ('roma_servizi_sportivi', 'Servizi sportivi (DIPPC:243_ServiziSportivi)', 'Roma Capitale', '${GEOSERVER}', 'WFS', 'non dichiarata', true, 'impianti con concessionario e contatti; date di concessione in parte vecchie', now(), ${servizi.length}),
  ('roma_punti_servizi', 'Punti servizi: Sport (DIPAU:punti_servizi_7792)', 'Roma Capitale', '${GEOSERVER}', 'WFS', 'non dichiarata', true, 'centri sportivi municipali, impianti capitolini, piscine comunali', now(), ${punti.length}),
  ('roma_aree_fitness', 'Aree fitness (DIPAMB:aree_fitness)', 'Roma Capitale', '${GEOSERVER}', 'WFS', 'non dichiarata', true, 'aree sportive libere nei parchi', now(), ${fitness.length}),
  ('roma_piscine_estate', 'Piscine estate over 70 (GABSIN:piscine)', 'Roma Capitale', '${GEOSERVER}', 'WFS', 'non dichiarata', true, 'ingresso gratuito agli over 70 d''estate', now(), ${piscine.length}),
  ('roma_classificazione_2025', 'Classificazione impianti sportivi capitolini (D.D. QA/682 del 18/11/2025)', 'Roma Capitale', 'https://www.comune.roma.it/web/it/scheda-servizi.page?contentId=INF1440132&pagina=7', 'PDF', 'atto pubblico', true, 'classi A, B, C con codice SIS', now(), ${classificati.length}),
  ('roma_tariffe_2026', 'Tariffe massime impianti sportivi 2026/2027 (D.D. QA/530 del 28/08/2026)', 'Roma Capitale', 'https://www.comune.roma.it/web/it/scheda-servizi.page?contentId=INF1440132&pagina=5', 'PDF', 'atto pubblico', true, NULL, now(), NULL),
  ('osm', 'OpenStreetMap: impianti e campi sportivi', 'OpenStreetMap contributors', 'https://www.openstreetmap.org', 'Overpass', 'ODbL', false, 'campi con disciplina, fondo e illuminazione; club e palestre private', now(), ${osm.length})
  ON CONFLICT (id) DO UPDATE SET scaricato_il = EXCLUDED.scaricato_il, n_record = EXCLUDED.n_record, note = EXCLUDED.note`);

const titolo = (s: unknown) => {
  const t = String(s ?? "").trim().replace(/\s+/g, " ");
  if (!t) return null;
  return t === t.toUpperCase() || t === t.toLowerCase()
    ? t.toLowerCase().replace(/(^|[\s'(."-])(\p{L})/gu, (m, a: string, b: string) => a + b.toUpperCase()).replace(/\b(Di|Del|Della|Dei|Delle|Degli|Dello|Da|E|In|Al|Alla|Ai|Alle|A)\b/g, (x) => x.toLowerCase()).replace(/^(\p{L})/u, (x) => x.toUpperCase()).replace(/\b(Asd|Ssd|Srl|Coni|Uisp|Csm|Ss|Sd|Aps)\b/gi, (x) => x.toUpperCase())
    : t;
};
const pulito = (s: unknown) => {
  const t = String(s ?? "").replace(/<[^>]+>/g, " ").trim();
  return t && t !== "null" ? t : null;
};

// 5a. impianti sportivi di Roma Capitale (non quelli segnati come non attivi)
const TIPO_ROMA: Record<string, { tipo: string; d: string[] }> = {
  "Impianto sportivo all'aperto": { tipo: "centro", d: [] },
  "Impianto sportivo coperto": { tipo: "palestra", d: [] },
  Piscina: { tipo: "piscina", d: ["nuoto"] },
  "Sport equestri, maneggi": { tipo: "maneggio", d: ["equitazione"] },
};
const righeRoma = servizi
  .filter((f) => f.geometry && f.properties.attivo !== "NO")
  .map((f) => {
    const p = f.properties;
    const t = Object.entries(TIPO_ROMA).find(([k]) => String(p.tipologia ?? "").startsWith(k.slice(0, 12)))?.[1] ?? (/acque/i.test(String(p.tipologia)) ? { tipo: "centro", d: ["canottaggio"] } : { tipo: "centro", d: [] });
    return {
      chiave: `roma:243.${p.id_pec}`, nome: titolo(p.nome) ?? titolo(p.concessio), tipo: t.tipo, d: t.d, mun: Number(p.mun) || null,
      indirizzo: pulito(p.indirizzo), gestore: titolo(p.concessio), telefono: [p.tel1, p.tel2].map(pulito).filter(Boolean).join(" · ") || null,
      email: pulito(p.email1), sis: pulito(p.codesis), g: f.geometry,
    };
  });
await q(
  `INSERT INTO sport.luoghi (chiave, nome, tipo, accesso, municipio, indirizzo, gestore, telefono, email, sis, discipline, ufficiale, fonti, geom)
   SELECT x->>'chiave', x->>'nome', x->>'tipo', 'comunale', (x->>'mun')::smallint, x->>'indirizzo', x->>'gestore', x->>'telefono', x->>'email', x->>'sis',
          ARRAY(SELECT jsonb_array_elements_text(x->'d')), true, '{roma_servizi_sportivi}', ST_SetSRID(ST_GeomFromGeoJSON(x->>'g'), 4326)
   FROM jsonb_array_elements($1::jsonb) x ON CONFLICT (chiave) DO NOTHING`,
  [json(righeRoma)],
);

// 5b. classificazione 2025: classe per codice SIS
for (const c of classificati) {
  await q(`UPDATE sport.luoghi SET classe = $1, fonti = array_append(fonti, 'roma_classificazione_2025'), nome = coalesce(nome, $3) WHERE sis = $2 AND classe IS NULL`, [c.classe, c.sis, c.nome]);
}
const senzaPosto = (await q(`SELECT count(*)::int n FROM unnest($1::text[]) s WHERE NOT EXISTS (SELECT 1 FROM sport.luoghi l WHERE l.sis = s)`, [classificati.map((c) => c.sis)])).rows[0].n;

// 5c. punti servizi: impianti capitolini e piscine comunali (se non ci sono gia'), centri sportivi municipali
const righePunti = punti
  .filter((f) => f.geometry && f.properties.fam === "Sport")
  .map((f, i) => ({ chiave: `roma:servizi.${f.properties.strato === "Centri Sportivi Municipali" ? "csm" : "imp"}.${i}`, nome: titolo(f.properties.nome), strato: f.properties.strato, g: f.geometry }));
await q(
  `INSERT INTO sport.luoghi (chiave, nome, tipo, accesso, discipline, ufficiale, fonti, note, geom)
   SELECT x->>'chiave', x->>'nome',
          CASE x->>'strato' WHEN 'Piscine Comunali' THEN 'piscina' WHEN 'Centri Sportivi Municipali' THEN 'scuola' ELSE 'centro' END,
          CASE x->>'strato' WHEN 'Centri Sportivi Municipali' THEN 'scuola' ELSE 'comunale' END,
          CASE x->>'strato' WHEN 'Piscine Comunali' THEN '{nuoto}'::text[] ELSE '{}'::text[] END,
          true, '{roma_punti_servizi}',
          CASE x->>'strato' WHEN 'Centri Sportivi Municipali' THEN 'Centro sportivo municipale: corsi nella palestra della scuola, gestiti da un''associazione.' END,
          ST_SetSRID(ST_GeomFromGeoJSON(x->>'g'), 4326)
   FROM jsonb_array_elements($1::jsonb) x
   WHERE x->>'strato' = 'Centri Sportivi Municipali'
      OR NOT EXISTS (SELECT 1 FROM sport.luoghi l WHERE l.accesso = 'comunale'
                     AND ST_DWithin(l.geom::geography, ST_SetSRID(ST_GeomFromGeoJSON(x->>'g'), 4326)::geography, 150))
   ON CONFLICT (chiave) DO NOTHING`,
  [json(righePunti)],
);
await q(
  `UPDATE sport.luoghi l SET fonti = array_append(l.fonti, 'roma_punti_servizi')
   WHERE l.chiave LIKE 'roma:243.%' AND EXISTS (SELECT 1 FROM jsonb_array_elements($1::jsonb) x WHERE x->>'strato' <> 'Centri Sportivi Municipali'
     AND ST_DWithin(l.geom::geography, ST_SetSRID(ST_GeomFromGeoJSON(x->>'g'), 4326)::geography, 150))`,
  [json(righePunti)],
);

// 5d. aree fitness libere: le attrezzature dicono le discipline
const DA_TESTO: [RegExp, string][] = [
  [/basket|pallacanestro/i, "basket"], [/pallavolo|volley/i, "pallavolo"], [/skate|pattinaggio|roller/i, "skate"],
  [/soccer|calcetto|calcio/i, "calcetto"], [/ping|tennis\s*tavolo/i, "ping_pong"], [/fitness|attrezzi|calisthenics|street\s*workout/i, "fitness"],
  [/\btennis\b(?!\s*tavolo)/i, "tennis"], [/bocce/i, "bocce"], [/atletica|corsa|percorso/i, "corsa"], [/padel/i, "padel"], [/arrampic|boulder/i, "arrampicata"],
];
const disciplineDa = (s: string) => [...new Set(DA_TESTO.filter(([re]) => re.test(s)).map(([, d]) => d))];
await q(
  `INSERT INTO sport.luoghi (chiave, nome, tipo, accesso, discipline, ufficiale, fonti, note, geom)
   SELECT x->>'chiave', x->>'nome', 'area_fitness', 'libero', ARRAY(SELECT jsonb_array_elements_text(x->'d')), true, '{roma_aree_fitness}', x->>'desc',
          ST_SetSRID(ST_GeomFromGeoJSON(x->>'g'), 4326)
   FROM jsonb_array_elements($1::jsonb) x ON CONFLICT (chiave) DO NOTHING`,
  [json(fitness.filter((f) => f.geometry).map((f, i) => ({ chiave: `roma:fitness.${i}`, nome: titolo(f.properties.nome), desc: pulito(f.properties.descrizione), d: disciplineDa(String(f.properties.descrizione ?? "")), g: f.geometry })))],
);

// 5e. OpenStreetMap: i "contenitori" (centri sportivi, stadi, golf, maneggi, palestre, piscine con nome) e i campi.
//     Un contenitore OSM vicino a un luogo ufficiale lo arricchisce (area, nome, sito, accessibilita');
//     altrimenti diventa un luogo nuovo. Ogni campo va nel luogo che lo contiene, o nel piu' vicino entro 70 m.
await q(`CREATE TEMP TABLE contenitori AS
  SELECT o.* FROM sport.stg_osm o
  WHERE o.leisure IN ('sports_centre', 'stadium', 'golf_course', 'horse_riding', 'fitness_centre', 'water_park', 'ice_rink')
     OR (o.leisure IN ('swimming_pool', 'sports_hall', 'track') AND o.tags ? 'name'
         AND NOT EXISTS (SELECT 1 FROM sport.stg_osm p WHERE p.leisure IN ('sports_centre', 'stadium') AND p.area IS NOT NULL AND ST_Within(o.centro, p.area)))`);
// contenitori dentro un altro contenitore (es. palestra dentro un centro): restano solo quelli esterni
await q(`DELETE FROM contenitori c WHERE EXISTS (SELECT 1 FROM contenitori p WHERE p.id <> c.id AND p.area IS NOT NULL
          AND ST_Within(c.centro, p.area) AND (c.area IS NULL OR ST_Area(p.area) > ST_Area(c.area)))`);
// abbinamento ai luoghi ufficiali (comunali): dentro l'area, o entro 120 m
await q(`CREATE TEMP TABLE abbinati AS
  SELECT DISTINCT ON (c.id) c.id AS osm, l.id AS luogo
  FROM contenitori c JOIN sport.luoghi l ON l.accesso = 'comunale'
   AND ((c.area IS NOT NULL AND ST_Intersects(c.area, l.geom)) OR ST_DWithin(c.centro::geography, l.geom::geography, 120))
  ORDER BY c.id, ST_Distance(c.centro::geography, l.geom::geography)`);
await q(`UPDATE sport.luoghi l SET
    area = coalesce(l.area, c.area), nome = coalesce(l.nome, c.tags->>'name'),
    sito = coalesce(l.sito, c.tags->>'website', c.tags->>'contact:website'),
    telefono = coalesce(l.telefono, c.tags->>'phone', c.tags->>'contact:phone'),
    orari = coalesce(l.orari, c.tags->>'opening_hours'),
    wikidata = coalesce(l.wikidata, c.tags->>'wikidata'), wikipedia = coalesce(l.wikipedia, c.tags->>'wikipedia'),
    accessibile = CASE c.tags->>'wheelchair' WHEN 'yes' THEN 'si' WHEN 'no' THEN 'no' WHEN 'limited' THEN 'parziale' ELSE l.accessibile END,
    accessibile_fonte = CASE WHEN c.tags ? 'wheelchair' THEN 'OpenStreetMap' ELSE l.accessibile_fonte END,
    fonti = CASE WHEN 'osm' = ANY(l.fonti) THEN l.fonti ELSE array_append(l.fonti, 'osm') END
  FROM (SELECT DISTINCT ON (a.luogo) a.luogo, c.* FROM abbinati a JOIN contenitori c ON c.id = a.osm ORDER BY a.luogo, ST_Area(coalesce(c.area, ST_Buffer(c.centro, 0.00001))) DESC) c
  WHERE l.id = c.luogo`);
await q(`INSERT INTO sport.luoghi (chiave, nome, tipo, accesso, indirizzo, telefono, sito, orari, accessibile, accessibile_fonte, wikidata, wikipedia, ufficiale, fonti, geom, area)
  SELECT 'osm:' || c.id, c.tags->>'name',
    CASE c.leisure WHEN 'sports_centre' THEN 'centro' WHEN 'stadium' THEN 'stadio' WHEN 'golf_course' THEN 'golf' WHEN 'horse_riding' THEN 'maneggio'
         WHEN 'fitness_centre' THEN 'palestra' WHEN 'sports_hall' THEN 'palestra' WHEN 'track' THEN 'pista' WHEN 'ice_rink' THEN 'centro' ELSE 'piscina' END,
    CASE WHEN c.tags->>'access' IN ('yes', 'public', 'permissive') AND coalesce(c.tags->>'fee', 'no') = 'no' AND c.leisure NOT IN ('fitness_centre', 'swimming_pool', 'water_park') THEN 'libero' ELSE 'club' END,
    NULLIF(concat_ws(', ', c.tags->>'addr:street', c.tags->>'addr:housenumber'), ''),
    coalesce(c.tags->>'phone', c.tags->>'contact:phone'), coalesce(c.tags->>'website', c.tags->>'contact:website'), c.tags->>'opening_hours',
    CASE c.tags->>'wheelchair' WHEN 'yes' THEN 'si' WHEN 'no' THEN 'no' WHEN 'limited' THEN 'parziale' ELSE 'nd' END,
    CASE WHEN c.tags ? 'wheelchair' THEN 'OpenStreetMap' END, c.tags->>'wikidata', c.tags->>'wikipedia',
    false, '{osm}', c.centro, c.area
  FROM contenitori c WHERE NOT EXISTS (SELECT 1 FROM abbinati a WHERE a.osm = c.id)
  ON CONFLICT (chiave) DO NOTHING`);

// 5f. i campi e gli altri spazi: discipline dai tag sport
await q(`CREATE TEMP TABLE sport_osm (osm text PRIMARY KEY, codice text)`);
const SPORT: Record<string, string> = {
  soccer: "calcio", football: "calcio", futsal: "calcetto", "5-a-side": "calcetto", tennis: "tennis", padel: "padel", paddle_tennis: "padel",
  basketball: "basket", volleyball: "pallavolo", beachvolleyball: "beach_volley", swimming: "nuoto", water_polo: "pallanuoto", aqua_fitness: "acquagym",
  fitness: "fitness", gym: "fitness", crossfit: "fitness", calisthenics: "fitness", gymnastics: "ginnastica", dance: "danza", yoga: "yoga", pilates: "yoga",
  martial_arts: "arti_marziali", karate: "arti_marziali", judo: "arti_marziali", taekwondo: "arti_marziali", aikido: "arti_marziali", wrestling: "arti_marziali", boxing: "pugilato",
  athletics: "atletica", running: "corsa", rugby: "rugby", rugby_union: "rugby", rugby_league: "rugby", american_football: "rugby", baseball: "baseball", softball: "baseball",
  field_hockey: "hockey", hockey: "hockey", roller_hockey: "hockey", ice_hockey: "ghiaccio", ice_skating: "ghiaccio", equestrian: "equitazione", horse_racing: "equitazione",
  golf: "golf", skateboard: "skate", roller_skating: "skate", skating: "skate", inline_skates: "skate", climbing: "arrampicata", boules: "bocce", bowls: "bocce", petanque: "bocce",
  table_tennis: "ping_pong", handball: "pallamano", fencing: "scherma", cycling: "ciclismo", bmx: "ciclismo", rowing: "canottaggio", canoe: "canottaggio", shooting: "tiro", archery: "tiro",
  multi: "multi",
};
await q(`INSERT INTO sport_osm SELECT x->>0, x->>1 FROM jsonb_array_elements($1::jsonb) x`, [json(Object.entries(SPORT))]);
await q(`CREATE TEMP TABLE spazi_osm AS
  SELECT o.id, o.leisure, o.tags, o.centro, o.geom, s.codice
  FROM sport.stg_osm o
  CROSS JOIN LATERAL (
    SELECT DISTINCT coalesce(so.codice,
      CASE WHEN o.leisure IN ('swimming_pool', 'water_park') THEN 'nuoto' WHEN o.leisure IN ('fitness_centre', 'fitness_station') THEN 'fitness'
           WHEN o.leisure = 'track' THEN 'atletica' WHEN o.leisure = 'golf_course' THEN 'golf' WHEN o.leisure = 'horse_riding' THEN 'equitazione'
           WHEN o.leisure = 'ice_rink' THEN 'ghiaccio' END) AS codice
    FROM (SELECT trim(v) AS v FROM unnest(string_to_array(coalesce(o.tags->>'sport', ''), ';')) v
          UNION ALL SELECT NULL WHERE coalesce(o.tags->>'sport', '') = '') t
    LEFT JOIN sport_osm so ON so.osm = t.v
  ) s
  WHERE s.codice IS NOT NULL AND coalesce(o.tags->>'access', '') NOT IN ('private', 'no')
    AND o.leisure IN ('pitch', 'track', 'fitness_station', 'sports_hall', 'swimming_pool', 'sports_centre', 'stadium', 'fitness_centre', 'golf_course', 'horse_riding', 'ice_rink', 'water_park')`);
await q(`CREATE INDEX ON spazi_osm USING gist (centro)`);
// a quale luogo va ogni spazio: quello che lo contiene (area), altrimenti il piu' vicino entro 70 m
await q(`CREATE TEMP TABLE assegnati AS
  SELECT DISTINCT ON (s.id) s.id, l.id AS luogo
  FROM spazi_osm s JOIN sport.luoghi l
    ON (l.area IS NOT NULL AND ST_Within(s.centro, l.area)) OR (l.chiave = 'osm:' || s.id) OR ST_DWithin(s.centro::geography, l.geom::geography, 70)
  ORDER BY s.id, (l.area IS NOT NULL AND ST_Within(s.centro, l.area)) DESC, (l.chiave = 'osm:' || s.id) DESC, ST_Distance(s.centro::geography, l.geom::geography)`);
// i campi rimasti soli: grappoli entro 50 m = un luogo nuovo (campi liberi nei parchi, club, campetti)
await q(`CREATE TEMP TABLE soli AS
  SELECT s.*, ST_ClusterDBSCAN(ST_Transform(s.centro, 32633), 50, 1) OVER () AS grappolo
  FROM spazi_osm s WHERE NOT EXISTS (SELECT 1 FROM assegnati a WHERE a.id = s.id)
    AND NOT EXISTS (SELECT 1 FROM sport.stg_contesto c WHERE c.tipo = 'scuola' AND ST_Within(s.centro, c.geom))`);
await q(`INSERT INTO sport.luoghi (chiave, nome, tipo, accesso, ufficiale, fonti, geom, note)
  SELECT 'osm-campi:' || min(s.id), NULL,
    CASE WHEN bool_and(s.leisure = 'fitness_station') THEN 'area_fitness' ELSE 'campi' END,
    CASE WHEN bool_or(s.tags->>'access' IN ('customers', 'members') OR s.tags->>'fee' = 'yes') THEN 'club'
         WHEN bool_or(EXISTS (SELECT 1 FROM sport.stg_contesto c WHERE c.tipo = 'parco' AND ST_Within(s.centro, c.geom)))
           OR bool_or(s.tags->>'access' IN ('yes', 'public', 'permissive')) OR bool_and(s.leisure = 'fitness_station') THEN 'libero'
         ELSE 'club' END,
    false, '{osm}', ST_Centroid(ST_Collect(s.centro)),
    CASE WHEN bool_or(EXISTS (SELECT 1 FROM sport.stg_contesto c WHERE c.tipo = 'parco' AND ST_Within(s.centro, c.geom))) THEN 'In un parco' END
  FROM soli s GROUP BY s.grappolo`);
await q(`INSERT INTO assegnati SELECT s.id, l.id FROM soli s
  JOIN (SELECT grappolo, 'osm-campi:' || min(id) AS chiave FROM soli GROUP BY grappolo) g ON g.grappolo = s.grappolo
  JOIN sport.luoghi l ON l.chiave = g.chiave`);
await q(`INSERT INTO sport.spazi (luogo_id, chiave, disciplina, fondo, coperto, illuminato, fonte, geom)
  SELECT a.luogo, 'osm:' || s.id || ':' || s.codice, s.codice, s.tags->>'surface',
         CASE WHEN s.tags->>'covered' = 'yes' OR s.tags->>'indoor' = 'yes' OR s.leisure = 'sports_hall' THEN true WHEN s.tags->>'covered' = 'no' THEN false END,
         CASE s.tags->>'lit' WHEN 'yes' THEN true WHEN 'no' THEN false END, 'osm', s.geom
  FROM spazi_osm s JOIN assegnati a ON a.id = s.id
  WHERE s.leisure NOT IN ('sports_centre', 'stadium') OR s.tags ? 'sport'
  ON CONFLICT (chiave) DO NOTHING`);
// accessibilita' segnata sui campi (wheelchair): vale per il luogo se il luogo non ne ha una
await q(`UPDATE sport.luoghi l SET accessibile = x.v, accessibile_fonte = 'OpenStreetMap'
  FROM (SELECT a.luogo, CASE WHEN bool_or(s.tags->>'wheelchair' = 'yes') AND NOT bool_or(s.tags->>'wheelchair' = 'no') THEN 'si'
                             WHEN bool_or(s.tags->>'wheelchair' = 'no') AND NOT bool_or(s.tags->>'wheelchair' = 'yes') THEN 'no'
                             WHEN bool_or(s.tags ? 'wheelchair') THEN 'parziale' END AS v
        FROM spazi_osm s JOIN assegnati a ON a.id = s.id GROUP BY a.luogo) x
  WHERE l.id = x.luogo AND l.accessibile = 'nd' AND x.v IS NOT NULL`);

// 5g. piscine dell'estate over 70: orari sul luogo piu' vicino, o un luogo nuovo
for (const f of piscine.filter((x) => x.geometry)) {
  const p = f.properties;
  const nota = `Estate (${pulito(p.giorni_ap7) ?? "giugno-agosto"}): ingresso gratuito per gli over 70, ${pulito(p.orario_70) ?? "orari al numero verde 800 957 774"}.`;
  const sito = String(p.sito_web ?? "").match(/href=([^\s>]+)/)?.[1] ?? null;
  const r = await q(
    `UPDATE sport.luoghi SET note = concat_ws(' ', note, $2::text), sito = coalesce(sito, $3), fonti = array_append(fonti, 'roma_piscine_estate'), ufficiale = true
     WHERE id = (SELECT id FROM sport.luoghi WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography, 250)
                 ORDER BY ('nuoto' = ANY(discipline)) DESC, geom <-> ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) LIMIT 1)`,
    [json(f.geometry), nota, sito],
  );
  if (!r.rowCount) {
    await q(
      `INSERT INTO sport.luoghi (chiave, nome, tipo, accesso, indirizzo, telefono, email, sito, discipline, note, ufficiale, fonti, geom)
       VALUES ($1, $2, 'piscina', 'club', $3, $4, $5, $6, '{nuoto}', $7, true, '{roma_piscine_estate}', ST_SetSRID(ST_GeomFromGeoJSON($8), 4326)) ON CONFLICT (chiave) DO NOTHING`,
      [`roma:piscine.${titolo(p.nome)}`, titolo(p.nome), pulito(p.indirizzo), pulito(p.telefono), pulito(p.email), sito, nota, json(f.geometry)],
    );
  }
}

// 5h. riepiloghi: discipline, gruppi, numero di spazi, coperto, illuminato, Municipio, nomi
await q(`UPDATE sport.luoghi l SET
    discipline = ARRAY(SELECT DISTINCT d FROM unnest(l.discipline || coalesce(s.d, '{}')) d ORDER BY d),
    n_spazi = coalesce(s.n, 0), coperto = s.coperto, illuminato = s.illuminato
  FROM (SELECT luogo_id, array_agg(DISTINCT disciplina) d, count(DISTINCT split_part(chiave, ':', 2))::int n,
               bool_or(coperto) coperto, bool_or(illuminato) illuminato
        FROM sport.spazi GROUP BY luogo_id) s
  WHERE s.luogo_id = l.id`);
await q(`UPDATE sport.luoghi l SET gruppi = ARRAY(SELECT DISTINCT d.gruppo FROM sport.discipline d WHERE d.codice = ANY(l.discipline) ORDER BY 1)`);
await q(`UPDATE sport.luoghi l SET municipio = m.numero FROM sport.municipi m WHERE ST_Intersects(m.geom, l.geom) AND (l.municipio IS NULL OR l.municipio <> m.numero)`);
await q(`DELETE FROM sport.luoghi l WHERE NOT EXISTS (SELECT 1 FROM sport.municipi m WHERE ST_Intersects(m.geom, l.geom))`);
// luoghi OSM senza nessuno sport riconosciuto (es. centri vuoti): via, non rispondono alla domanda
await q(`DELETE FROM sport.luoghi WHERE NOT ufficiale AND cardinality(discipline) = 0`);
await q("COMMIT");
await q(`DROP TABLE IF EXISTS sport.stg_osm, sport.stg_contesto`);

// ---------------------------------------------------------------- 6. tariffe massime 2026/27 (atto: D.D. QA/530 del 28/08/2026)
const ATTO = "D.D. QA/530 del 28/08/2026 (tariffe massime 2026/2027)";
const URL_T = "https://www.comune.roma.it/web/it/scheda-servizi.page?contentId=INF1440132&pagina=5";
const TARIFFE: [string, string | null, string, number, string][] = [
  ["impianti_capitolini", "calcio", "Calcetto, campo senza luci", 71, "ora"], ["impianti_capitolini", "calcio", "Calcetto, campo con luci", 79, "ora"],
  ["impianti_capitolini", "calcio", "Calciotto, campo senza luci", 107, "ora"], ["impianti_capitolini", "calcio", "Calciotto, campo con luci", 117, "ora"],
  ["impianti_capitolini", "calcio", "Calcio a 11, campo senza luci (2 ore)", 242, "turno"], ["impianti_capitolini", "calcio", "Calcio a 11, campo con luci (2 ore)", 309, "turno"],
  ["impianti_capitolini", "tennis", "Tennis in 2, sintetico senza luci", 10, "ora"], ["impianti_capitolini", "tennis", "Tennis in 2, terra o erba sintetica senza luci", 12, "ora"],
  ["impianti_capitolini", "tennis", "Tennis in 2, sintetico con luci", 12, "ora"], ["impianti_capitolini", "tennis", "Tennis in 2, terra o erba sintetica con luci", 17, "ora"],
  ["impianti_capitolini", "tennis", "Tennis in 4, sintetico senza luci", 14, "ora"], ["impianti_capitolini", "tennis", "Tennis in 4, terra o erba sintetica senza luci", 22, "ora"],
  ["impianti_capitolini", "tennis", "Tennis in 4, sintetico con luci", 21, "ora"], ["impianti_capitolini", "tennis", "Tennis in 4, terra o erba sintetica con luci", 26, "ora"],
  ["impianti_capitolini", "palestra", "Palestra polivalente coperta, affitto", 64, "ora"], ["impianti_capitolini", "palestra", "Palestra con tribuna, affitto", 122, "ora"],
  ["impianti_capitolini", "altro", "Equitazione, lezione", 23, "ora"], ["impianti_capitolini", "altro", "Pattinaggio su ghiaccio con pattini", 9, "turno"],
  ["impianti_capitolini", "nuoto", "Piscina, ingresso adulti e bambini (3 ore)", 6, "ingresso"], ["impianti_capitolini", "nuoto", "Piscina, intera giornata", 9, "ingresso"],
  ["impianti_capitolini", "nuoto", "Corso di nuoto bisettimanale", 64, "mese"], ["impianti_capitolini", "nuoto", "Nuoto libero, 10 ingressi", 69, "mese"],
  ["impianti_capitolini", "nuoto", "Nuoto libero bisettimanale", 63, "mese"], ["impianti_capitolini", "nuoto", "Acquagym, aquabike (bisettimanale)", 64, "mese"],
  ["impianti_capitolini", "calcio", "Scuola calcio o rugby (bisettimanale)", 412, "anno"], ["impianti_capitolini", "tennis", "Corso di tennis di gruppo (bisettimanale)", 65, "mese"],
  ["impianti_capitolini", "palestra", "Sala pesi e cardio", 42, "mese"], ["impianti_capitolini", "palestra", "Arti marziali (bisettimanale)", 50, "mese"],
  ["impianti_capitolini", "basket", "Basket, pallavolo, atletica, ginnastica (corso bisettimanale)", 45, "mese"],
  ["impianti_capitolini", "volley", "Basket, pallavolo, atletica, ginnastica (corso bisettimanale)", 45, "mese"],
  ["impianti_capitolini", "corsa", "Basket, pallavolo, atletica, ginnastica (corso bisettimanale)", 45, "mese"],
  ["impianti_capitolini", null, "Iscrizione ai corsi (con assicurazione)", 39, "anno"],
];
await q("DELETE FROM sport.tariffe");
for (const [ambito, gruppo, voce, euro, unita] of TARIFFE) {
  await q(`INSERT INTO sport.tariffe (ambito, gruppo, voce, euro, unita, atto, fonte_url) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [ambito, gruppo, voce, euro, unita, ATTO, URL_T]);
}

const tot = await q(`SELECT accesso, count(*)::int n, sum(n_spazi)::int spazi FROM sport.luoghi GROUP BY 1 ORDER BY 2 DESC`);
const gr = await q(`SELECT g, count(*)::int n FROM sport.luoghi, unnest(gruppi) g GROUP BY 1 ORDER BY 2 DESC`);
const acc = await q(`SELECT accessibile, count(*)::int n FROM sport.luoghi GROUP BY 1`);
log(`luoghi: ${tot.rows.map((r) => `${r.accesso} ${r.n} (${r.spazi} spazi)`).join(" · ")}`);
log(`per sport: ${gr.rows.map((r) => `${r.g} ${r.n}`).join(" · ")}`);
log(`accessibilita': ${acc.rows.map((r) => `${r.accessibile} ${r.n}`).join(" · ")} · classificati senza posizione: ${senzaPosto}`);
await db.end();
