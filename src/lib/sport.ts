import "server-only";
import { querySezione } from "@/lib/db";

/** Sezione "Impianti sportivi" (database rr_impianti_sportivi, schema sport): vedi docs/SPORT.md. */
export function querySport<T extends object = Record<string, unknown>>(sql: string, params?: unknown[]) {
  return querySezione<T>("impianti-sportivi", sql, params);
}

/** Tutti i luoghi in GeoJSON leggero (proprieta' corte): li legge la mappa, una volta sola. */
export async function luoghiGeoJSON() {
  const { rows } = await querySport<{ fc: unknown }>(
    `SELECT json_build_object('type', 'FeatureCollection', 'features', coalesce(json_agg(json_build_object(
        'type', 'Feature', 'id', l.id,
        'geometry', json_build_object('type', 'Point', 'coordinates', json_build_array(round(ST_X(l.geom)::numeric, 6), round(ST_Y(l.geom)::numeric, 6))),
        'properties', json_strip_nulls(json_build_object(
          'id', l.id, 'n', l.nome, 't', l.tipo, 'a', l.accesso, 'g', l.gruppi, 'd', l.discipline, 'm', l.municipio, 'x', l.accessibile,
          'xf', l.accessibile_fonte, 's', l.n_spazi, 'sp', sp.conti, 'cop', l.coperto, 'lum', l.illuminato, 'ind', l.indirizzo, 'ge', l.gestore,
          'tel', l.telefono, 'web', l.sito, 'mail', l.email, 'h', l.orari, 'no', l.note, 'cl', l.classe, 'u', l.ufficiale, 'f', l.fonti, 'wp', l.wikipedia
        ))
      ) ORDER BY l.id), '[]'::json)) AS fc
     FROM sport.luoghi l
     LEFT JOIN LATERAL (
       SELECT json_object_agg(disciplina, n) AS conti FROM (
         SELECT disciplina, count(DISTINCT split_part(chiave, ':', 2))::int AS n FROM sport.spazi WHERE luogo_id = l.id GROUP BY disciplina
       ) x
     ) sp ON true`,
  );
  return rows[0].fc;
}

export async function tariffe() {
  const { rows } = await querySport<{ ambito: string; gruppo: string | null; voce: string; euro: string; unita: string; atto: string; fonte_url: string | null }>(
    "SELECT ambito, gruppo, voce, euro, unita, atto, fonte_url FROM sport.tariffe ORDER BY id",
  );
  return rows.map((r) => ({ ...r, euro: Number(r.euro) }));
}

// ------------------------------------------------------------------ Guida (con o senza database)
export interface DatiGuida {
  tariffe: { gruppo: string | null; voce: string; euro: number; unita: string; atto: string }[];
  municipi: { m: number; tot: number; libero: number; comunale: number; scuola: number; club: number; accessibili: number }[];
  totali: { luoghi: number; spazi: number; accessibilita_nota: number; con_orari: number; ufficiali: number };
  fonti: { titolo: string; ente: string; url: string; licenza: string | null; ufficiale: boolean; n_record: number | null }[];
}

type LuogoMin = { properties: { a: string; m?: number; x: string; s: number; h?: string; u: boolean } };
function riassumi(luoghi: LuogoMin[]): Pick<DatiGuida, "municipi" | "totali"> {
  const per = new Map<number, DatiGuida["municipi"][number]>();
  for (const { properties: p } of luoghi) {
    if (!p.m) continue;
    const r = per.get(p.m) ?? { m: p.m, tot: 0, libero: 0, comunale: 0, scuola: 0, club: 0, accessibili: 0 };
    r.tot++;
    r[p.a as "libero"]++;
    if (p.x === "si" || p.x === "parziale") r.accessibili++;
    per.set(p.m, r);
  }
  return {
    municipi: [...per.values()].sort((a, b) => a.m - b.m),
    totali: {
      luoghi: luoghi.length, spazi: luoghi.reduce((s, l) => s + (l.properties.s ?? 0), 0),
      accessibilita_nota: luoghi.filter((l) => l.properties.x !== "nd").length, con_orari: luoghi.filter((l) => l.properties.h).length,
      ufficiali: luoghi.filter((l) => l.properties.u).length,
    },
  };
}

const FONTI_STATICHE: DatiGuida["fonti"] = [
  { titolo: "Servizi sportivi, centri sportivi municipali, aree fitness, piscine (GeoServer)", ente: "Roma Capitale", url: "https://geoportale.comune.roma.it/geoserver/ows", licenza: "non dichiarata", ufficiale: true, n_record: null },
  { titolo: "Classificazione impianti sportivi capitolini (D.D. QA/682 del 18/11/2025)", ente: "Roma Capitale", url: "https://www.comune.roma.it/web/it/scheda-servizi.page?contentId=INF1440132&pagina=7", licenza: "atto pubblico", ufficiale: true, n_record: 165 },
  { titolo: "Tariffe massime 2026/2027 (D.D. QA/530 del 28/08/2026)", ente: "Roma Capitale", url: "https://www.comune.roma.it/web/it/scheda-servizi.page?contentId=INF1440132&pagina=5", licenza: "atto pubblico", ufficiale: true, n_record: null },
  { titolo: "Impianti e campi sportivi", ente: "OpenStreetMap contributors", url: "https://www.openstreetmap.org/copyright", licenza: "ODbL", ufficiale: false, n_record: null },
];

/** Dati per la Guida: dal database; se non c'e', dalle copie statiche in public/dati/sport. */
export async function datiGuida(): Promise<DatiGuida> {
  try {
    const [fc, t, f] = await Promise.all([
      luoghiGeoJSON() as Promise<{ features: LuogoMin[] }>,
      tariffe(),
      querySport<DatiGuida["fonti"][number]>("SELECT titolo, ente, url, licenza, ufficiale, n_record FROM sport.fonti ORDER BY ufficiale DESC, titolo"),
    ]);
    if (!fc.features.length) throw new Error("vuoto");
    return { tariffe: t, fonti: f.rows, ...riassumi(fc.features) };
  } catch {
    const { readFile } = await import("node:fs/promises");
    const path = await import("node:path");
    const leggi = async <T,>(file: string, vuoto: T) =>
      readFile(path.join(process.cwd(), "public", "dati", "sport", file), "utf8").then((s) => JSON.parse(s) as T).catch(() => vuoto);
    const [fc, t] = await Promise.all([leggi<{ features: LuogoMin[] }>("luoghi.json", { features: [] }), leggi<{ tariffe: DatiGuida["tariffe"] }>("tariffe.json", { tariffe: [] })]);
    return { tariffe: t.tariffe, fonti: FONTI_STATICHE, ...riassumi(fc.features) };
  }
}

