// Siti sensibili (art. 4 DAC 78/2024) e aree vincolate.
// L'Allegato A ufficiale della delibera non è pubblicato in formato vettoriale:
// usiamo i layer ufficiali GeoRoma e integriamo con OpenStreetMap (marcato come non ufficiale).
import { db, log, registraFonte, scarica, pulisci, aggiornaConteggioFonte } from "./lib.mts";
import { leggiLayer, GEOSERVER, type Feature } from "./wfs.mts";
import { BBOX_ROMA } from "./coord.mts";

const NOTA_LICENZA = "Licenza non dichiarata sul layer; AgID (Det. 183/2023) indica CC BY 4.0 come licenza di riferimento per i dati PA.";

interface Sito {
  chiave: string;
  categoria: string;
  nome: string | null;
  indirizzo: string | null;
  dettagli: Record<string, unknown>;
  geometria: unknown;
}

async function inserisciSiti(siti: Sito[], fonteId: string, ufficiale: boolean) {
  for (const s of siti) {
    await db.query(
      `INSERT INTO antenne.siti_sensibili (chiave, categoria, nome, indirizzo, dettagli, geom, ufficiale, fonte_id)
       VALUES ($1,$2,$3,$4,$5, ST_MakeValid(ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON($6), 4326))), $7, $8)
       ON CONFLICT (chiave) DO UPDATE SET categoria=EXCLUDED.categoria, nome=EXCLUDED.nome, indirizzo=EXCLUDED.indirizzo,
         dettagli=EXCLUDED.dettagli, geom=EXCLUDED.geom, ufficiale=EXCLUDED.ufficiale, fonte_id=EXCLUDED.fonte_id`,
      [s.chiave, s.categoria, s.nome, s.indirizzo, JSON.stringify(s.dettagli), JSON.stringify(s.geometria), ufficiale, fonteId],
    );
  }
}

const testo = (v: unknown) => {
  const t = pulisci(v == null ? "" : String(v));
  return t && t !== "null" ? t : null;
};
const chiaveFeature = (layer: string, f: Feature, i: number) => `${layer}:${f.id ?? i}`;

interface LayerUfficiale {
  layer: string;
  fonteId: string;
  titolo: string;
  mappa: (f: Feature) => Omit<Sito, "chiave" | "geometria"> | null;
}

const LAYER_UFFICIALI: LayerUfficiale[] = [
  {
    layer: "DIPAMB:Ospedali", fonteId: "georoma_ospedali", titolo: "Ospedali (Dipartimento Tutela Ambientale)",
    mappa: (f) => {
      const p = f.properties;
      const civico = testo(p.OSP_NUMCIV);
      return {
        categoria: "ospedale", nome: testo(p.DESCRIZION),
        indirizzo: [testo(p.INDIRIZZO), civico].filter(Boolean).join(" ") || null,
        dettagli: { posti_letto: p.OSP_NLETTI ?? null },
      };
    },
  },
  {
    layer: "DIPPC:241_ServiziSanitarieAssistenziali", fonteId: "georoma_servizi_sanitari", titolo: "Servizi sanitari e assistenziali (Protezione Civile)",
    mappa: (f) => {
      const p = f.properties;
      const tipologia = testo(p.tipologia) ?? "";
      const categoria = /ospedal/i.test(tipologia) ? "ospedale"
        : /rsa|riposo|anzian|residenz/i.test(tipologia) ? "rsa"
        : /casa di cura|clinic/i.test(tipologia) ? "casa_di_cura" : "sanitario_assistenziale";
      // Volutamente NON importiamo nomi, telefoni e cellulari dei referenti (dati personali)
      return {
        categoria, nome: testo(p.denominaz), indirizzo: testo(p.indirizzo),
        dettagli: { tipologia, proprieta: testo(p.proprieta), asl: testo(p["asl/"]), pronto_soccorso: testo(p.pronto_so) },
      };
    },
  },
  {
    layer: "DIPSCU:mv_portale_nidi_capitolini", fonteId: "georoma_nidi", titolo: "Nidi capitolini (Dipartimento Scuola)",
    mappa: (f) => ({
      categoria: "asilo_nido", nome: testo(f.properties.denominazione), indirizzo: testo(f.properties.indirizzo),
      dettagli: { tipo_servizio: testo(f.properties.tipo_servizio), ricettivita: f.properties.ricettivita ?? null, codice_mesis: f.properties.codice_mesis ?? null },
    }),
  },
  {
    layer: "DIPSCU:mv_portale_infanzia_capitolina", fonteId: "georoma_infanzia", titolo: "Scuole dell'infanzia capitoline (Dipartimento Scuola)",
    mappa: (f) => ({
      categoria: "scuola_infanzia", nome: testo(f.properties.denominazione), indirizzo: testo(f.properties.indirizzo),
      dettagli: { tipo_servizio: testo(f.properties.tipo_servizio), ricettivita: f.properties.ricettivita ?? null },
    }),
  },
  {
    layer: "DIPSCU:mv_portale_rete_statale", fonteId: "georoma_scuole_statali", titolo: "Rete scolastica statale (Dipartimento Scuola)",
    mappa: (f) => {
      const tipo = testo(f.properties.tipo_servizio) ?? "";
      return {
        categoria: /infanzia/i.test(tipo) ? "scuola_infanzia" : "scuola",
        nome: testo(f.properties.denominazione), indirizzo: testo(f.properties.indirizzo),
        dettagli: { tipo_servizio: tipo, codice_meccanografico: testo(f.properties.meccanografico), istituto: testo(f.properties.denominazione_istituto_comprensivo) },
      };
    },
  },
];

async function importaUfficiali() {
  for (const L of LAYER_UFFICIALI) {
    const { features, sha256 } = await leggiLayer(L.layer);
    await registraFonte({
      id: L.fonteId, titolo: L.titolo, ente: "Roma Capitale – GeoRoma", url: `${GEOSERVER} (WFS ${L.layer})`,
      formato: "WFS GeoJSON", licenza: null, ufficiale: true, note: NOTA_LICENZA,
    }, { sha256, n_record: features.length });
    await db.query("DELETE FROM antenne.siti_sensibili WHERE fonte_id = $1", [L.fonteId]);
    const siti: Sito[] = [];
    features.forEach((f, i) => {
      const m = L.mappa(f);
      if (m) siti.push({ ...m, chiave: chiaveFeature(L.layer, f, i), geometria: f.geometry });
    });
    await inserisciSiti(siti, L.fonteId, true);
    log("sensibili", `${L.layer}: ${siti.length}`);
  }
  // Gli ospedali compaiono in due layer: tieni quello del Dip. Ambiente, rimuovi i doppioni entro 150 m
  const { rowCount } = await db.query(
    `DELETE FROM antenne.siti_sensibili b USING antenne.siti_sensibili a
     WHERE b.fonte_id = 'georoma_servizi_sanitari' AND a.fonte_id = 'georoma_ospedali'
       AND b.categoria = 'ospedale' AND ST_DWithin(a.geom::geography, b.geom::geography, 150)`,
  );
  log("sensibili", `ospedali doppi rimossi: ${rowCount}`);
}

// ---------------------------------------------------------------------------
// OpenStreetMap (non ufficiale, ODbL): copre ciò che i layer comunali non hanno
// ---------------------------------------------------------------------------
const OSM_CATEGORIE: [(t: Record<string, string>) => boolean, string][] = [
  [(t) => t.amenity === "prison", "carcere"],
  [(t) => t.amenity === "nursing_home" || /nursing_home|assisted_living/.test(t.social_facility ?? ""), "rsa"],
  [(t) => t.amenity === "hospital" || t.healthcare === "hospital", "ospedale"],
  [(t) => t.amenity === "kindergarten", "scuola_infanzia"],
  [(t) => t.amenity === "school", "scuola"],
  [(t) => t.leisure === "playground", "parco_giochi"],
];

async function importaOsm() {
  const b = `${BBOX_ROMA.latMin},${BBOX_ROMA.lonMin},${BBOX_ROMA.latMax},${BBOX_ROMA.lonMax}`;
  const query = `[out:json][timeout:240];
(
  nwr["leisure"="playground"](${b});
  nwr["amenity"="prison"](${b});
  nwr["amenity"="nursing_home"](${b});
  nwr["social_facility"~"nursing_home|assisted_living"](${b});
  nwr["amenity"="kindergarten"](${b});
  nwr["amenity"="school"](${b});
  nwr["amenity"="hospital"](${b});
  nwr["healthcare"="hospital"](${b});
);
out center tags;`;
  const url = "https://overpass-api.de/api/interpreter";
  const { buf, sha256 } = await scarica(url, "osm_siti_sensibili.json", {
    method: "POST",
    body: new URLSearchParams({ data: query }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const json = JSON.parse(buf.toString("utf8")) as {
    elements: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[];
  };
  await registraFonte({
    id: "osm_siti_sensibili", titolo: "Siti sensibili da OpenStreetMap (parchi giochi, carceri, RSA, scuole, ospedali)",
    ente: "OpenStreetMap contributors", url: `${url} (Overpass API)`, formato: "Overpass JSON", licenza: "ODbL 1.0",
    ufficiale: false,
    note: "Integrazione non ufficiale dei siti dell'art. 4 DAC 78/2024 non coperti dai layer comunali. Attribuzione obbligatoria: © OpenStreetMap contributors.",
  }, { sha256 });

  await db.query("DELETE FROM antenne.siti_sensibili WHERE fonte_id = 'osm_siti_sensibili'");
  const siti: Sito[] = [];
  for (const el of json.elements) {
    const t = el.tags ?? {};
    const pos = el.center ?? (el.lat != null ? { lat: el.lat, lon: el.lon! } : null);
    if (!pos) continue;
    const cat = OSM_CATEGORIE.find(([test]) => test(t))?.[1];
    if (!cat) continue;
    const indirizzo = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" ") || null;
    siti.push({
      chiave: `osm:${el.type}/${el.id}`, categoria: cat, nome: t.name ?? null, indirizzo,
      dettagli: { osm: `https://www.openstreetmap.org/${el.type}/${el.id}`, operator: t.operator ?? null, "isced:level": t["isced:level"] ?? null },
      geometria: { type: "Point", coordinates: [pos.lon, pos.lat] },
    });
  }
  await inserisciSiti(siti, "osm_siti_sensibili", false);

  // Solo dentro il Comune di Roma
  const fuori = await db.query(
    `DELETE FROM antenne.siti_sensibili s USING opendata.limite_comunale l
     WHERE s.fonte_id = 'osm_siti_sensibili' AND NOT ST_Intersects(l.geom, s.geom)`,
  );
  // Doppioni: un sito OSM entro 75 m da un sito ufficiale dello stesso gruppo è lo stesso luogo
  const doppi = await db.query(
    `DELETE FROM antenne.siti_sensibili o USING antenne.siti_sensibili u
     WHERE o.fonte_id = 'osm_siti_sensibili' AND u.ufficiale
       AND (CASE WHEN o.categoria IN ('scuola','scuola_infanzia','asilo_nido') THEN 'istruzione' ELSE o.categoria END)
         = (CASE WHEN u.categoria IN ('scuola','scuola_infanzia','asilo_nido') THEN 'istruzione' ELSE u.categoria END)
       AND ST_DWithin(o.geom::geography, u.geom::geography, 75)`,
  );
  const { rows } = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM antenne.siti_sensibili WHERE fonte_id = 'osm_siti_sensibili'");
  await aggiornaConteggioFonte("osm_siti_sensibili", rows[0].n);
  log("sensibili", `OSM: ${siti.length} letti, ${fuori.rowCount} fuori Comune, ${doppi.rowCount} doppioni degli ufficiali, ${rows[0].n} tenuti`);
}

// ---------------------------------------------------------------------------
// Aree vincolate (contesto: il regolamento esclude aree con vincoli e a tutela integrale)
// ---------------------------------------------------------------------------
async function importaVincoli() {
  const LAYERS = [
    { layer: "SOVR:SitoUnescoPoly", fonteId: "georoma_unesco", titolo: "Sito UNESCO – Centro storico di Roma", tipo: "sito_unesco",
      nome: (f: Feature) => testo(f.properties.denom), ente: "Roma Capitale – GeoRoma (Sovrintendenza)" },
    { layer: "DIPPC:235_AreeProtette", fonteId: "georoma_aree_protette", titolo: "Aree naturali protette (EUAP)", tipo: "area_protetta",
      nome: (f: Feature) => testo(f.properties.nome_gazz_), ente: "Roma Capitale – GeoRoma (Protezione Civile)" },
  ];
  for (const L of LAYERS) {
    const { features, sha256 } = await leggiLayer(L.layer);
    await registraFonte({
      id: L.fonteId, titolo: L.titolo, ente: L.ente, url: `${GEOSERVER} (WFS ${L.layer})`, formato: "WFS GeoJSON",
      licenza: null, ufficiale: true, note: NOTA_LICENZA,
    }, { sha256, n_record: features.length });
    await db.query("DELETE FROM antenne.aree_vincolate WHERE fonte_id = $1", [L.fonteId]);
    for (const [i, f] of features.entries()) {
      const p = f.properties;
      await db.query(
        `INSERT INTO antenne.aree_vincolate (chiave, tipo, nome, dettagli, geom, fonte_id)
         VALUES ($1,$2,$3,$4, ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON($5),4326))),3)), $6)`,
        [chiaveFeature(L.layer, f, i), L.tipo, L.nome(f),
         JSON.stringify({ codice: p.codiceap ?? p.cod_unesco ?? null, tipo_area: p.tipo ?? null }),
         JSON.stringify(f.geometry), L.fonteId],
      );
    }
    log("vincoli", `${L.layer}: ${features.length}`);
  }
}

export async function importaSensibili() {
  await importaUfficiali();
  await importaOsm();
  await importaVincoli();
  // Municipio di appartenenza
  await db.query(
    `UPDATE antenne.siti_sensibili s SET municipio = m.numero
     FROM opendata.municipi m WHERE ST_Intersects(m.geom, ST_PointOnSurface(s.geom))`,
  );
}
