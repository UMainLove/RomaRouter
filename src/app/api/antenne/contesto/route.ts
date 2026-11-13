import { connection, type NextRequest } from "next/server";
import { AVVERTENZE, ATTRIBUZIONI, numero, queryAntenne as query } from "@/lib/antenne";

// GET /api/antenne/contesto?lat=41.89&lon=12.49&raggio=500
// Pensato per il clic sulla mappa: "cosa c'è intorno a questo punto?"
export async function GET(req: NextRequest) {
  await connection();
  const sp = req.nextUrl.searchParams;
  const lat = numero(sp.get("lat"));
  const lon = numero(sp.get("lon"));
  const raggio = Math.min(Math.max(numero(sp.get("raggio")) ?? 500, 50), 3000);
  if (lat == null || lon == null || lat < 41.5 || lat > 42.2 || lon < 12.1 || lon > 13) {
    return Response.json({ errore: "Parametri lat e lon obbligatori, dentro l'area di Roma" }, { status: 400 });
  }
  const p = [lon, lat, raggio];
  const PUNTO = "ST_SetSRID(ST_MakePoint($1, $2), 4326)";

  const [territorio, istanze, sensibili, vincoli] = await Promise.all([
    query(
      `SELECT
         (SELECT json_build_object('numero', m.numero, 'nome', m.nome) FROM opendata.municipi m WHERE ST_Intersects(m.geom, ${PUNTO})) AS municipio,
         (SELECT json_build_object('nome', s.nome, 'tipo', s.tipologia) FROM opendata.suddivisioni_toponomastiche s WHERE ST_Intersects(s.geom, ${PUNTO})) AS quartiere,
         (SELECT json_build_object('codice', z.codice, 'nome', z.nome) FROM opendata.zone_urbanistiche z WHERE ST_Intersects(z.geom, ${PUNTO}) LIMIT 1) AS zona_urbanistica,
         EXISTS (SELECT 1 FROM opendata.limite_comunale l WHERE ST_Intersects(l.geom, ${PUNTO})) AS dentro_roma
       WHERE $3::int IS NOT NULL`,
      p,
    ),
    query(
      `SELECT i.id, i.gestori, i.indirizzo, i.tipo_intervento, i.data_pubblicazione, i.qualita AS qualita_posizione, i.url_avviso,
              round(ST_Distance(i.geom::geography, ${PUNTO}::geography)) AS distanza_m
       FROM antenne.istanze_srb i
       WHERE i.geom IS NOT NULL AND ST_DWithin(i.geom::geography, ${PUNTO}::geography, $3)
       ORDER BY distanza_m LIMIT 50`,
      p,
    ),
    query(
      `SELECT s.categoria, s.nome, s.indirizzo, s.ufficiale,
              round(ST_Distance(s.geom::geography, ${PUNTO}::geography)) AS distanza_m
       FROM antenne.siti_sensibili s
       WHERE $3::int IS NOT NULL
       ORDER BY s.geom <-> ${PUNTO} LIMIT 5`,
      p,
    ),
    query(
      `SELECT a.tipo, a.nome FROM antenne.aree_vincolate a WHERE ST_Intersects(a.geom, ${PUNTO}) AND $3::int IS NOT NULL`,
      p,
    ),
  ]);

  return Response.json({
    punto: { lat, lon },
    raggio_m: raggio,
    ...territorio.rows[0],
    aree_vincolate: vincoli.rows,
    istanze_srb_nel_raggio: istanze.rows,
    siti_sensibili_piu_vicini: sensibili.rows,
    limiti_vm: { valore_attenzione_e_obiettivo_qualita: 15, limite_esposizione: 20 },
    avvertenze: [AVVERTENZE.istanze, AVVERTENZE.distanze],
    attribuzioni: ATTRIBUZIONI,
  });
}
