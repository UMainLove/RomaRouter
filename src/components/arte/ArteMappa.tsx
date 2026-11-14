"use client";

import type * as Leaflet from "leaflet";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CercaIndirizzo, type Luogo } from "../mappa-leggera/CercaIndirizzo";
import { MappaLeaflet, volaA, type LeafletNS } from "../mappa-leggera/MappaLeaflet";
import { SchermoMappa } from "../mappa-leggera/SchermoMappa";
import { ATTIVITA, Verdetto, type Attivita, type Modo, type Risultato } from "./Verdetto";

/*
 * /arte: una mappa e una domanda. L'artista tocca un punto (o scrive un indirizzo) e sa se puo' esibirsi;
 * il cittadino vede chi si esibisce e dove. Tre colori soli: rosso vietato, arancio limitato, verde aree
 * dedicate; i puntini viola sono le postazioni ufficiali. Le zone "con condizioni" (scuole, chiese...)
 * compaiono solo da vicino. Niente popup: il verdetto sta nel pannello.
 */

const COLORI = { no: "#C62828", limitato: "#E07B1F", dedicata: "#0F9466", condizioni: "#B8912F", postazione: "#6A3FC8", esibizione: "#C2185B" };
const coloreZona = (e: string) =>
  e === "no" ? COLORI.no : e === "solo_silenzio" || e === "solo_postazioni" ? COLORI.limitato : e === "area_dedicata" ? COLORI.dedicata : e === "condizioni" ? COLORI.condizioni : null;

type Esibizione = { type: "Feature"; geometry: { coordinates: [number, number] }; properties: { nome_arte: string; disciplina: string; inizio: string; luogo: string | null; postazione: string | null } };
type Postazione = { type: "Feature"; geometry: { coordinates: [number, number] }; properties: { nome: string; tipo: string } };

export function ArteMappa({ info }: { info: ReactNode }) {
  const [modo, setModo] = useState<Modo>("artista");
  const [attivita, setAttivita] = useState<Attivita>("musica");
  const [risultato, setRisultato] = useState<Risultato | null>(null);
  const [carica, setCarica] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [vista, setVista] = useState<"risultato" | "info">("risultato");
  const [aperto, setAperto] = useState(false);
  const [nEsibizioni, setNEsibizioni] = useState<number | null>(null);

  const m = useRef<{ map: Leaflet.Map; L: LeafletNS; punto: Leaflet.CircleMarker | null; esib: Leaflet.LayerGroup; esibizioni: Esibizione[] } | null>(null);
  const stato = useRef({ modo, attivita });
  useEffect(() => {
    stato.current = { modo, attivita };
  });

  const verifica = useCallback(async (lat: number, lon: number, etichetta: string | null, opz?: { att?: Attivita; vola?: boolean }) => {
    const att = opz?.att ?? stato.current.attivita;
    const k = m.current;
    if (k) {
      k.punto?.remove();
      k.punto = k.L.circleMarker([lat, lon], { radius: 8, color: "#fff", weight: 3, fillColor: "#251d1c", fillOpacity: 1, interactive: false }).addTo(k.map);
      if (opz?.vola) volaA(k.map, k.L, [lat, lon], Math.max(k.map.getZoom(), 17));
    }
    setCarica(true);
    setErrore(null);
    setVista("risultato");
    try {
      const r = await fetch(`/api/artisti/verifica?lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}&attivita=${att}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.errore ?? "Verifica non riuscita");
      const v = d as Risultato;
      if (etichetta) v.luogo = { etichetta };
      setRisultato(v);
    } catch (e) {
      setErrore((e as Error).message);
    } finally {
      setCarica(false);
    }
  }, []);

  const disegnaEsibizioni = useCallback(() => {
    const k = m.current;
    if (!k) return;
    k.esib.clearLayers();
    // le esibizioni servono a chi guarda: per chi si esibisce resterebbero solo puntini in piu'
    const pubblico = stato.current.modo === "cittadino";
    if (!pubblico) return;
    k.esibizioni.forEach((f) => {
      const [lon, lat] = f.geometry.coordinates;
      const p = f.properties;
      const c = k.L.circleMarker([lat, lon], {
        radius: 8, color: "#fff", weight: 2, fillColor: COLORI.esibizione, fillOpacity: 1,
      }).addTo(k.esib);
      const ora = new Date(p.inizio).toLocaleString("it-IT", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
      c.bindTooltip(`<b>${esc(p.nome_arte)}</b><br>${esc(p.disciplina)} · ${ora}`, { direction: "top", offset: [0, -8], permanent: k.map.getZoom() >= 17, className: "rr-etichetta-mappa" });
      c.on("click", (e) => {
        k.L.DomEvent.stopPropagation(e);
        verifica(lat, lon, p.postazione ?? p.luogo ?? p.nome_arte);
      });
    });
  }, [verifica]);

  const caricaEsibizioni = useCallback(async () => {
    const k = m.current;
    if (!k) return;
    try {
      const fc: { features: Esibizione[] } = await fetch("/api/artisti/esibizioni").then((r) => r.json());
      k.esibizioni = fc.features;
      setNEsibizioni(fc.features.length);
      disegnaEsibizioni();
    } catch {
      /* resta la mappa senza esibizioni */
    }
  }, [disegnaEsibizioni]);

  const pronta = useCallback(
    (map: Leaflet.Map, L: LeafletNS) => {
      const zone = L.layerGroup().addTo(map);
      const condizioni = L.layerGroup().addTo(map);
      const postazioni = L.layerGroup().addTo(map);
      const esib = L.layerGroup().addTo(map);
      m.current = { map, L, punto: null, esib, esibizioni: [] };
      const stile = (f?: { properties: { e: string; u: boolean } }) => {
        const c = coloreZona(f?.properties.e ?? "") ?? "#999";
        const cond = f?.properties.e === "condizioni";
        return { color: c, weight: cond ? 0.8 : 1.5, opacity: 0.9, fillColor: c, fillOpacity: cond ? 0.1 : f?.properties.e === "no" ? 0.26 : 0.2, dashArray: f?.properties.u === false ? "5 4" : undefined, interactive: false };
      };

      fetch("/api/artisti/zone?leggero=1")
        .then((r) => r.json())
        .then((fc) => {
          L.geoJSON(fc, { filter: (f) => coloreZona(f.properties.e) !== null, style: stile as never }).addTo(zone);
        })
        .catch(() => {});

      let posti: Postazione[] = [];
      const disegnaPostazioni = () => {
        postazioni.clearLayers();
        const z = map.getZoom();
        posti.forEach((f) => {
          const allegato = f.properties.tipo === "postazione_allegatoB";
          if (allegato && z < 15) return;
          const [lon, lat] = f.geometry.coordinates;
          const c = L.circleMarker([lat, lon], {
            radius: allegato ? 5 : 6, color: "#fff", weight: 1.5, fillColor: allegato ? COLORI.postazione : COLORI.dedicata, fillOpacity: 1,
          }).addTo(postazioni);
          c.bindTooltip(esc(f.properties.nome), { direction: "top", offset: [0, -6], className: "rr-etichetta-mappa" });
          c.on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            verifica(lat, lon, f.properties.nome);
          });
        });
      };
      fetch("/api/artisti/postazioni")
        .then((r) => r.json())
        .then((fc: { features: Postazione[] }) => {
          posti = fc.features;
          disegnaPostazioni();
        })
        .catch(() => {});

      // scuole, chiese, ospedali e monumenti: solo da vicino (sono migliaia di cerchi piccoli)
      let ultimo = "";
      const disegnaCondizioni = () => {
        if (map.getZoom() < 16) {
          condizioni.clearLayers();
          ultimo = "";
          return;
        }
        const b = map.getBounds().pad(0.3);
        const chiave = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((x) => x.toFixed(3)).join(",");
        if (chiave === ultimo) return;
        ultimo = chiave;
        fetch(`/api/artisti/zone?leggero=1&esiti=condizioni&bbox=${chiave}`)
          .then((r) => r.json())
          .then((fc) => {
            if (chiave !== ultimo) return;
            condizioni.clearLayers();
            L.geoJSON(fc, { style: stile as never }).addTo(condizioni);
          })
          .catch(() => {});
      };
      map.on("zoomend", () => {
        disegnaPostazioni();
        disegnaEsibizioni();
      });
      map.on("moveend", disegnaCondizioni);
      map.on("click", (e) => verifica(e.latlng.lat, e.latlng.lng, null));
      caricaEsibizioni();
    },
    [verifica, caricaEsibizioni, disegnaEsibizioni],
  );

  // cambiare modo o attivita' rifa' il verdetto dello stesso punto
  useEffect(() => {
    disegnaEsibizioni();
  }, [modo, disegnaEsibizioni]);
  function cambiaAttivita(a: Attivita) {
    setAttivita(a);
    if (risultato) verifica(risultato.punto.lat, risultato.punto.lon, risultato.luogo?.etichetta ?? null, { att: a });
  }

  const testa = (
    <div className="flex flex-col gap-2">
      <CercaIndirizzo
        endpoint="/api/artisti/indirizzo"
        etichetta="Cerca un indirizzo"
        segnaposto={modo === "artista" ? "Dove vuoi esibirti?" : "Dove vuoi vedere artisti?"}
        carica={carica}
        onScelto={(l: Luogo) => verifica(l.lat, l.lon, l.etichetta, { vola: true })}
      />
      <div className="flex gap-2">
        <div role="group" aria-label="Chi sei" className="grid flex-1 grid-cols-2 rounded-[10px] bg-bg-sink p-[3px]">
          {(
            [
              ["artista", "Artista"],
              ["cittadino", "Pubblico"],
            ] as const
          ).map(([v, t]) => (
            <button
              key={v}
              type="button"
              aria-pressed={modo === v}
              onClick={() => setModo(v)}
              className={`min-h-9 rounded-[8px] text-[14px] ${modo === v ? "bg-panel font-bold text-ink shadow-[0_1px_3px_rgba(37,29,28,.14)]" : "font-semibold text-ink-soft"}`}
            >
              {t}
            </button>
          ))}
        </div>
        {modo === "artista" && (
          <label className="flex-1">
            <span className="sr-only">Cosa fai</span>
            <select
              value={attivita}
              onChange={(e) => cambiaAttivita(e.target.value as Attivita)}
              className="h-full min-h-9 w-full rounded-[10px] border-0 bg-bg-sink px-2.5 text-[14px] font-semibold text-ink"
            >
              {ATTIVITA.map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <ul className="-mx-0.5 flex gap-x-3 overflow-x-auto px-0.5 text-[12px] font-semibold whitespace-nowrap text-ink-soft [scrollbar-width:none]" aria-label="Legenda">
        <Voce colore={COLORI.no} testo="Vietato" />
        <Voce colore={COLORI.limitato} testo="Limitato" />
        <Voce colore={COLORI.dedicata} testo="Aree dedicate" />
        <Voce colore={COLORI.postazione} testo="Postazioni" tondo />
        {modo === "cittadino" && <Voce colore={COLORI.esibizione} testo="Esibizioni" tondo />}
      </ul>
    </div>
  );

  let pannello: ReactNode;
  if (vista === "info") {
    pannello = (
      <div className="flex flex-col gap-4">
        <button type="button" onClick={() => setVista("risultato")} className="self-start text-sm font-bold text-ink-soft hover:text-ink">
          ‹ Torna alla mappa
        </button>
        {info}
      </div>
    );
  } else if (errore) {
    pannello = <p role="alert" className="rounded-[12px] bg-errore-tint px-3.5 py-3 text-[15px] font-semibold text-errore">{errore}</p>;
  } else if (risultato) {
    pannello = (
      <>
        <Verdetto
          v={risultato}
          modo={modo}
          onVai={(p) => verifica(p.lat, p.lon, p.etichetta, { vola: true })}
          onAnnunciato={caricaEsibizioni}
        />
        <BottoneInfo onClick={() => setVista("info")} />
      </>
    );
  } else {
    pannello = (
      <div className="flex flex-col gap-2">
        <p className="text-[15px] leading-snug font-semibold text-ink">
          {modo === "artista" ? "Tocca un punto della mappa: ti dico se puoi esibirti lì." : "Tocca un punto: ti dico chi si esibisce lì e dove trovare artisti."}
        </p>
        <p className="text-[13px] text-muted">
          Fuori dalle zone colorate valgono le regole generali (10–13 e 16–20, 2 ore al massimo, preavviso alla Polizia Locale).
          {nEsibizioni ? ` ${nEsibizioni} esibizioni annunciate nei prossimi giorni.` : ""}
        </p>
        <BottoneInfo onClick={() => setVista("info")} />
      </div>
    );
  }

  return (
    <SchermoMappa
      mappa={<MappaLeaflet centro={[41.8986, 12.4768]} zoom={15} titolo="Mappa dell'arte di strada a Roma" onPronta={pronta} />}
      testa={testa}
      pannello={pannello}
      chiave={vista + (risultato ? `${risultato.punto.lat},${risultato.punto.lon},${risultato.attivita.codice}` : errore ?? "")}
      foglioAperto={aperto}
      onFoglio={setAperto}
      etichettaPannello={vista === "info" ? "Regole, contatti e fonti" : "Verdetto"}
    />
  );
}

function Voce({ colore, testo, tondo }: { colore: string; testo: string; tondo?: boolean }) {
  return (
    <li className="flex items-center gap-1.5">
      <span aria-hidden="true" className={tondo ? "size-2.5 rounded-full" : "h-2.5 w-3.5 rounded-[3px] border-[1.5px]"} style={tondo ? { background: colore } : { borderColor: colore, background: `${colore}40` }} />
      {testo}
    </li>
  );
}

function BottoneInfo({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-3 min-h-11 w-full rounded-[10px] border border-line text-[14px] font-bold text-ink-soft hover:bg-bg-sink hover:text-ink">
      Regole, contatti della Polizia Locale e fonti
    </button>
  );
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
