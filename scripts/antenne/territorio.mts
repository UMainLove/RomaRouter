// Confini ufficiali di Roma Capitale dal GeoServer GeoRoma:
// limite comunale, 15 Municipi, suddivisione toponomastica (rioni/quartieri/suburbi/zone), zone urbanistiche.
import { db, log, registraFonte } from "./lib.mts";
import { leggiLayer, GEOSERVER } from "./wfs.mts";

const NOTA_LICENZA = "Licenza non dichiarata sul layer; AgID (Det. 183/2023) indica CC BY 4.0 come licenza di riferimento per i dati PA.";

const ROMANI = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];

// Geometria GeoJSON -> MultiPolygon valido in EPSG:4326
const GEOM_SQL = "ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON($GEOM), 4326))), 3))";
const geomSql = (n: number) => GEOM_SQL.replace("$GEOM", `$${n}`);

export async function importaTerritorio() {
  // Limite comunale
  {
    const layer = "DIPPC:210_RomaCapitale_Limiti";
    const { features, sha256 } = await leggiLayer(layer);
    await registraFonte({
      id: "georoma_limite_comunale", titolo: "Limite amministrativo di Roma Capitale", ente: "Roma Capitale – GeoRoma",
      url: `${GEOSERVER} (WFS ${layer})`, formato: "WFS GeoJSON", licenza: null, ufficiale: true, note: NOTA_LICENZA,
    }, { sha256, n_record: features.length });
    await db.query("DELETE FROM opendata.limite_comunale");
    await db.query(
      `INSERT INTO opendata.limite_comunale (id, geom, fonte_id)
       SELECT 1, ST_Multi(ST_Union(g)), 'georoma_limite_comunale'
       FROM (SELECT ${GEOM_SQL.replace("$GEOM", "x")} AS g FROM unnest($1::text[]) AS x) s`,
      [features.map((f) => JSON.stringify(f.geometry))],
    );
    log("territorio", `limite comunale: ${features.length} poligono/i`);
  }

  // Municipi
  {
    const layer = "DIPPC:municipi";
    const { features, sha256 } = await leggiLayer(layer);
    await registraFonte({
      id: "georoma_municipi", titolo: "Municipi di Roma Capitale", ente: "Roma Capitale – GeoRoma",
      url: `${GEOSERVER} (WFS ${layer})`, formato: "WFS GeoJSON", licenza: null, ufficiale: true, note: NOTA_LICENZA,
    }, { sha256, n_record: features.length });
    for (const f of features) {
      const n = Number(f.properties.municipio);
      if (!(n >= 1 && n <= 15)) continue;
      await db.query(
        `INSERT INTO opendata.municipi (numero, numero_romano, nome, geom, fonte_id)
         VALUES ($1, $2, $3, ${geomSql(4)}, 'georoma_municipi')
         ON CONFLICT (numero) DO UPDATE SET numero_romano=EXCLUDED.numero_romano, nome=EXCLUDED.nome, geom=EXCLUDED.geom`,
        [n, ROMANI[n], `Municipio ${ROMANI[n]}`, JSON.stringify(f.geometry)],
      );
    }
    log("territorio", `municipi: ${features.length}`);
  }

  // Suddivisione toponomastica: è l'unità più vicina ai "quartieri" che i cittadini conoscono
  {
    const layer = "DIPSER:SuddivisioniToponomastica";
    const { features, sha256 } = await leggiLayer(layer);
    await registraFonte({
      id: "georoma_suddivisioni", titolo: "Suddivisione toponomastica (rioni, quartieri, suburbi, zone)", ente: "Roma Capitale – GeoRoma",
      url: `${GEOSERVER} (WFS ${layer})`, formato: "WFS GeoJSON", licenza: null, ufficiale: true, note: NOTA_LICENZA,
    }, { sha256, n_record: features.length });
    for (const f of features) {
      const p = f.properties;
      await db.query(
        `INSERT INTO opendata.suddivisioni_toponomastiche (codice, tipologia, nome, geom, fonte_id)
         VALUES ($1, $2, $3, ${geomSql(4)}, 'georoma_suddivisioni')
         ON CONFLICT (codice) DO UPDATE SET tipologia=EXCLUDED.tipologia, nome=EXCLUDED.nome, geom=EXCLUDED.geom`,
        [String(p.CODICE_NOME), String(p.TIPOLOGIA), String(p.DESCRIZIONE), JSON.stringify(f.geometry)],
      );
    }
    log("territorio", `suddivisioni toponomastiche: ${features.length}`);
  }

  // Zone urbanistiche (il layer DIPDIT:ZoneUrbanistiche risponde con errore: uso quello della Protezione Civile)
  {
    const layer = "DIPPC:rc_zone_urbanistiche";
    const { features, sha256 } = await leggiLayer(layer);
    await registraFonte({
      id: "georoma_zone_urbanistiche", titolo: "Zone urbanistiche di Roma Capitale", ente: "Roma Capitale – GeoRoma (Protezione Civile)",
      url: `${GEOSERVER} (WFS ${layer})`, formato: "WFS GeoJSON", licenza: null, ufficiale: true,
      note: `${NOTA_LICENZA} Il layer DIPDIT:ZoneUrbanistiche restituiva un errore del server il 13/11/2026.`,
    }, { sha256, n_record: features.length });
    for (const f of features) {
      const p = f.properties;
      await db.query(
        `INSERT INTO opendata.zone_urbanistiche (codice, nome, geom, fonte_id)
         VALUES ($1, $2, ${geomSql(3)}, 'georoma_zone_urbanistiche')
         ON CONFLICT (codice) DO UPDATE SET nome=EXCLUDED.nome, geom=EXCLUDED.geom`,
        [String(p.code_zu ?? p.zone_urbanistiche), String(p.denominazione ?? ""), JSON.stringify(f.geometry)],
      );
    }
    // Municipio della zona = quello che contiene il suo punto interno
    await db.query(
      `UPDATE opendata.zone_urbanistiche z SET municipio = m.numero
       FROM opendata.municipi m WHERE ST_Contains(m.geom, ST_PointOnSurface(z.geom))`,
    );
    log("territorio", `zone urbanistiche: ${features.length}`);
  }
}
