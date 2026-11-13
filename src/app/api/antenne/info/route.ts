import { connection } from "next/server";
import { AVVERTENZE, ATTRIBUZIONI, queryAntenne as query } from "@/lib/antenne";

// GET /api/antenne/info — tutto il contesto testuale: limiti, norme, procedure, statistiche, fonti, riepilogo municipi
export async function GET() {
  await connection();
  const [limiti, riferimenti, statistiche, fonti, municipi, qualita] = await Promise.all([
    query("SELECT id, valore, unita, ambito, stato, riferimento, url, spiegazione FROM antenne.limiti_normativi ORDER BY stato, valore DESC"),
    query("SELECT id, livello, titolo, sintesi, url FROM antenne.riferimenti_normativi ORDER BY CASE livello WHEN 'nazionale' THEN 1 WHEN 'regionale' THEN 2 ELSE 3 END, id"),
    query("SELECT indicatore, ambito, anno, valore, unita, fonte_id AS fonte, note FROM antenne.statistiche ORDER BY indicatore, ambito, anno NULLS FIRST"),
    query("SELECT id, titolo, ente, url, formato, licenza, ufficiale, note, scaricato_il, n_record FROM antenne.fonti ORDER BY ufficiale DESC, id"),
    query("SELECT * FROM antenne.v_riepilogo_municipi ORDER BY numero"),
    query("SELECT qualita, count(*)::int AS n FROM antenne.istanze_srb GROUP BY qualita ORDER BY qualita"),
  ]);
  return Response.json({
    limiti: limiti.rows,
    riferimenti_normativi: riferimenti.rows,
    statistiche: statistiche.rows,
    riepilogo_municipi: municipi.rows,
    qualita_posizioni_istanze: qualita.rows,
    fonti: fonti.rows,
    avvertenze: Object.values(AVVERTENZE),
    attribuzioni: ATTRIBUZIONI,
  });
}
