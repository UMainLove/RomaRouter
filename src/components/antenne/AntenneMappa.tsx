"use client";

import type * as Leaflet from "leaflet";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CercaIndirizzo, type Luogo } from "../mappa-leggera/CercaIndirizzo";
import { inquadra, MappaLeaflet, volaA, type LeafletNS } from "../mappa-leggera/MappaLeaflet";
import { SchermoMappa } from "../mappa-leggera/SchermoMappa";

/*
 * /antenne: "che antenne ci sono vicino a casa mia?". La mappa mostra solo le richieste di antenne
 * pubblicate da Roma Capitale (due colori: nuova antenna, modifica di un impianto). Un indirizzo o un
 * tocco sulla mappa disegna il cerchio di 500 m e il pannello dice cosa c'e' dentro; un tocco su
 * un'antenna ne mostra la scheda. Scuole, ospedali e aree protette solo se chiesti, e solo da vicino.
 */

const COLORI = { nuova: "#C2410C", modifica: "#2A6FD6", sensibile: "#7A4FD0", vincolo: "#0F9466" };
const RAGGIO = 500;

type Props = {
  gestori: string[]; indirizzo: string | null; tipo_intervento: string | null; regime: string | null; data_pubblicazione: string | null;
  municipio_nome: string | null; quartiere: string | null; qualita_posizione: string; nota_qualita: string | null;
  sito_sensibile_vicino: { categoria: string; nome: string | null; distanza_m: number } | null; url_avviso: string | null;
};
type Istanza = { id: number; geometry: { coordinates: [number, number] }; properties: Props };
type Contesto = {
  punto: { lat: number; lon: number }; municipio: { numero: number; nome: string } | null; quartiere: { nome: string; tipo: string } | null;
  aree_vincolate: { tipo: string; nome: string }[];
  istanze_srb_nel_raggio: { id: number; gestori: string[]; indirizzo: string | null; tipo_intervento: string | null; data_pubblicazione: string | null; distanza_m: number }[];
  siti_sensibili_piu_vicini: { categoria: string; nome: string | null; indirizzo: string | null; distanza_m: number }[];
};
type Selezione = { tipo: "antenna"; a: Istanza } | { tipo: "zona"; c: Contesto; etichetta: string | null } | null;

const nuova = (t: string | null) => t === "installazione";
const CATEGORIE: Record<string, string> = {
  scuola: "Scuola", asilo_nido: "Asilo nido", ospedale: "Ospedale", casa_di_cura: "Casa di cura", rsa: "RSA",
  parco_giochi: "Parco giochi", universita: "Università", clinica: "Clinica",
};
const dataIt = (d: string | null) => (d ? new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" }) : "—");

export function AntenneMappa({ info }: { info: ReactNode }) {
  const [totale, setTotale] = useState<number | null>(null);
  const [sel, setSel] = useState<Selezione>(null);
  const [carica, setCarica] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [vista, setVista] = useState<"risultato" | "info">("risultato");
  const [aperto, setAperto] = useState(false);
  const [sensibili, setSensibili] = useState(false);
  const [vincoli, setVincoli] = useState(false);

  const k = useRef<{
    map: Leaflet.Map; L: LeafletNS; istanze: Istanza[]; punti: Map<number, Leaflet.CircleMarker>; cerchio: Leaflet.Circle | null;
    sens: Leaflet.LayerGroup; vinc: Leaflet.LayerGroup; vincCaricati: boolean;
  } | null>(null);
  const flag = useRef({ sensibili, vincoli });
  useEffect(() => {
    flag.current = { sensibili, vincoli };
  });

  const evidenzia = useCallback((id: number | null) => {
    const m = k.current;
    if (!m) return;
    m.punti.forEach((c, i) => c.setStyle(i === id ? { radius: 10, weight: 3, color: "#251d1c" } : { radius: 6, weight: 1.5, color: "#fff" }));
    if (id != null) m.punti.get(id)?.bringToFront();
  }, []);

  const apriAntenna = useCallback(
    (a: Istanza, vola: boolean) => {
      const m = k.current;
      m?.cerchio?.remove();
      if (m) m.cerchio = null;
      evidenzia(a.id);
      setErrore(null);
      setVista("risultato");
      setSel({ tipo: "antenna", a });
      if (vola && m) volaA(m.map, m.L, [a.geometry.coordinates[1], a.geometry.coordinates[0]], Math.max(m.map.getZoom(), 16));
    },
    [evidenzia],
  );

  const intorno = useCallback(
    async (lat: number, lon: number, etichetta: string | null, vola: boolean) => {
      const m = k.current;
      if (m) {
        m.cerchio?.remove();
        m.cerchio = m.L.circle([lat, lon], { radius: RAGGIO, color: "#251d1c", weight: 1.5, dashArray: "5 5", fillOpacity: 0.04, interactive: false }).addTo(m.map);
        if (vola) inquadra(m.map, m.cerchio.getBounds());
      }
      evidenzia(null);
      setCarica(true);
      setErrore(null);
      setVista("risultato");
      try {
        const r = await fetch(`/api/antenne/contesto?lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}&raggio=${RAGGIO}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.errore ?? "Ricerca non riuscita");
        setSel({ tipo: "zona", c: d as Contesto, etichetta });
      } catch (e) {
        setErrore((e as Error).message);
      } finally {
        setCarica(false);
      }
    },
    [evidenzia],
  );

  const pronta = useCallback(
    (map: Leaflet.Map, L: LeafletNS) => {
      const gruppo = L.layerGroup().addTo(map);
      const sens = L.layerGroup().addTo(map);
      const vinc = L.layerGroup().addTo(map);
      k.current = { map, L, istanze: [], punti: new Map(), cerchio: null, sens, vinc, vincCaricati: false };
      fetch("/api/antenne/istanze")
        .then((r) => r.json())
        .then((fc: { features: Istanza[] }) => {
          const m = k.current!;
          m.istanze = fc.features;
          setTotale(fc.features.length);
          fc.features.forEach((a) => {
            const [lon, lat] = a.geometry.coordinates;
            const c = L.circleMarker([lat, lon], {
              radius: 6, color: "#fff", weight: 1.5, fillColor: nuova(a.properties.tipo_intervento) ? COLORI.nuova : COLORI.modifica, fillOpacity: 0.95,
            }).addTo(gruppo);
            c.bindTooltip(`${esc(a.properties.indirizzo ?? "Antenna")}<br><span style="color:#5f5654">${esc(a.properties.gestori.join(", "))}</span>`, { direction: "top", offset: [0, -6], className: "rr-etichetta-mappa" });
            c.on("click", (e) => {
              L.DomEvent.stopPropagation(e);
              apriAntenna(a, false);
            });
            m.punti.set(a.id, c);
          });
        })
        .catch(() => setErrore("Le antenne non si sono caricate. Riprova tra poco."));

      // scuole e ospedali: solo da vicino e solo se chiesti
      let ultimo = "";
      const disegnaSensibili = () => {
        if (!flag.current.sensibili || map.getZoom() < 14) {
          sens.clearLayers();
          ultimo = "";
          return;
        }
        const b = map.getBounds().pad(0.2);
        const chiave = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((x) => x.toFixed(3)).join(",");
        if (chiave === ultimo) return;
        ultimo = chiave;
        fetch(`/api/antenne/siti-sensibili?bbox=${chiave}`)
          .then((r) => r.json())
          .then((fc: { features: { geometry: { type: string; coordinates: [number, number] }; properties: { categoria: string; nome: string | null } }[] }) => {
            if (chiave !== ultimo) return;
            sens.clearLayers();
            fc.features.forEach((f) => {
              if (f.geometry.type !== "Point") return;
              const [lon, lat] = f.geometry.coordinates;
              L.circleMarker([lat, lon], { radius: 3.5, color: COLORI.sensibile, weight: 1, fillColor: COLORI.sensibile, fillOpacity: 0.55 })
                .bindTooltip(`${esc(CATEGORIE[f.properties.categoria] ?? f.properties.categoria)}${f.properties.nome ? `: ${esc(f.properties.nome)}` : ""}`, { className: "rr-etichetta-mappa" })
                .addTo(sens);
            });
          })
          .catch(() => {});
      };
      map.on("moveend", disegnaSensibili);
      (map as Leaflet.Map & { _rrSensibili?: () => void })._rrSensibili = disegnaSensibili;
      map.on("click", (e) => intorno(e.latlng.lat, e.latlng.lng, null, false));
    },
    [apriAntenna, intorno],
  );

  // "Mappa" nell'elenco (VediSuMappa): si torna alla mappa sull'antenna
  useEffect(() => {
    function apri(e: Event) {
      const d = (e as CustomEvent<{ sezione: string; id: number | string }>).detail;
      if (d?.sezione !== "antenne") return;
      const a = k.current?.istanze.find((x) => String(x.id) === String(d.id));
      if (a) apriAntenna(a, true);
    }
    window.addEventListener("rr:apri-su-mappa", apri);
    return () => window.removeEventListener("rr:apri-su-mappa", apri);
  }, [apriAntenna]);

  // accendere e spegnere i livelli facoltativi
  useEffect(() => {
    const m = k.current;
    if (!m) return;
    (m.map as Leaflet.Map & { _rrSensibili?: () => void })._rrSensibili?.();
  }, [sensibili]);
  useEffect(() => {
    const m = k.current;
    if (!m) return;
    if (!vincoli) return void m.vinc.clearLayers();
    fetch("/api/antenne/aree-vincolate")
      .then((r) => r.json())
      .then((fc) => {
        if (!flag.current.vincoli) return;
        m.vinc.clearLayers();
        m.L.geoJSON(fc, { style: { color: COLORI.vincolo, weight: 1.2, fillColor: COLORI.vincolo, fillOpacity: 0.1, interactive: false } }).addTo(m.vinc);
      })
      .catch(() => {});
  }, [vincoli]);

  const testa = (
    <div className="flex flex-col gap-2">
      <CercaIndirizzo
        endpoint="/api/antenne/indirizzo"
        etichetta="Cerca un indirizzo"
        segnaposto="Il tuo indirizzo, es. Via Ostiense 131"
        carica={carica}
        onScelto={(l: Luogo) => intorno(l.lat, l.lon, l.etichetta, true)}
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-0.5 text-[12px] font-semibold text-ink-soft">
        <Voce colore={COLORI.nuova} testo="Nuova antenna" />
        <Voce colore={COLORI.modifica} testo="Modifica di un impianto" />
      </div>
      <div className="flex gap-1.5">
        <Interruttore attivo={sensibili} onClick={() => setSensibili((v) => !v)} colore={COLORI.sensibile}>
          Scuole e ospedali
        </Interruttore>
        <Interruttore attivo={vincoli} onClick={() => setVincoli((v) => !v)} colore={COLORI.vincolo}>
          Aree protette
        </Interruttore>
      </div>
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
  } else if (sel?.tipo === "antenna") {
    pannello = <SchedaAntenna a={sel.a} onInfo={() => setVista("info")} />;
  } else if (sel?.tipo === "zona") {
    pannello = (
      <SchedaZona
        c={sel.c}
        etichetta={sel.etichetta}
        onAntenna={(id) => {
          const a = k.current?.istanze.find((x) => x.id === id);
          if (a) apriAntenna(a, true);
        }}
        onInfo={() => setVista("info")}
      />
    );
  } else {
    pannello = (
      <div className="flex flex-col gap-2">
        <p className="text-[15px] leading-snug font-semibold text-ink">Scrivi il tuo indirizzo o tocca la mappa: ti dico che antenne ci sono entro {RAGGIO} m.</p>
        <p className="text-[13px] text-muted">
          In mappa {totale == null ? "le" : `le ${totale}`} richieste di antenne pubblicate da Roma Capitale. Non è il catasto completo degli impianti (circa 3.500 a Roma), che non è pubblico.
        </p>
        <BottoneInfo onClick={() => setVista("info")} />
      </div>
    );
  }

  return (
    <SchermoMappa
      mappa={<MappaLeaflet centro={[41.893, 12.4829]} zoom={12} titolo="Mappa delle antenne di telefonia mobile a Roma" onPronta={pronta} />}
      testa={testa}
      pannello={pannello}
      chiave={vista + (sel?.tipo === "antenna" ? `a${sel.a.id}` : sel?.tipo === "zona" ? `${sel.c.punto.lat},${sel.c.punto.lon}` : errore ?? "")}
      foglioAperto={aperto}
      onFoglio={setAperto}
      etichettaPannello={vista === "info" ? "Elenco, limiti, regole e fonti" : "Dettagli"}
    />
  );
}

function SchedaAntenna({ a, onInfo }: { a: Istanza; onInfo: () => void }) {
  const p = a.properties;
  const n = nuova(p.tipo_intervento);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-[12px] bg-bg-sink px-3.5 py-3">
        <span aria-hidden="true" className="size-4 shrink-0 rounded-full border-2 border-white" style={{ background: n ? COLORI.nuova : COLORI.modifica }} />
        <span className="min-w-0">
          <span className="block text-[17px] leading-6 font-bold text-ink">{p.indirizzo ?? "Indirizzo non indicato"}</span>
          <span className="block truncate text-[13px] font-semibold text-ink-soft">
            {n ? "Nuova antenna" : `Modifica di un impianto (${p.tipo_intervento ?? "—"})`} · {p.gestori.join(", ")}
          </span>
        </span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[14px]">
        <dt className="text-muted">Pubblicata</dt>
        <dd className="font-semibold text-ink">{dataIt(p.data_pubblicazione)}</dd>
        <dt className="text-muted">Procedura</dt>
        <dd className="text-ink">{p.regime ?? "—"}</dd>
        <dt className="text-muted">Zona</dt>
        <dd className="text-ink">{[p.quartiere, p.municipio_nome].filter(Boolean).join(" · ") || "—"}</dd>
        {p.sito_sensibile_vicino && (
          <>
            <dt className="text-muted">Sito sensibile</dt>
            <dd className="text-ink">
              {CATEGORIE[p.sito_sensibile_vicino.categoria] ?? p.sito_sensibile_vicino.categoria}
              {p.sito_sensibile_vicino.nome ? ` ${p.sito_sensibile_vicino.nome}` : ""} a {p.sito_sensibile_vicino.distanza_m} m
            </dd>
          </>
        )}
      </dl>
      {p.qualita_posizione !== "originale" && (
        <p className="text-[13px] text-muted">Posizione {p.qualita_posizione === "corretta" ? "corretta da noi" : "ricavata dall'indirizzo"}: {p.nota_qualita}</p>
      )}
      {p.url_avviso && (
        <a href={p.url_avviso} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-ink px-4 text-[14px] font-bold text-white">
          Avviso ufficiale sul sito del Comune ↗
        </a>
      )}
      <p className="text-[13px] text-muted">Una richiesta pubblicata non prova che l&apos;antenna sia già attiva. I limiti di legge: 15 V/m nelle case (valore di attenzione).</p>
      <BottoneInfo onClick={onInfo} />
    </div>
  );
}

function SchedaZona({ c, etichetta, onAntenna, onInfo }: { c: Contesto; etichetta: string | null; onAntenna: (id: number) => void; onInfo: () => void }) {
  const n = c.istanze_srb_nel_raggio.length;
  return (
    <div className="flex flex-col gap-3.5">
      <div className="rounded-[12px] bg-antenne-tint px-3.5 py-3 text-antenne-ink">
        <span className="block text-[17px] leading-6 font-bold">
          {n === 0 ? `Nessuna richiesta di antenna entro ${RAGGIO} m` : n === 1 ? `1 richiesta di antenna entro ${RAGGIO} m` : `${n} richieste di antenne entro ${RAGGIO} m`}
        </span>
        <span className="block truncate text-[13px] font-semibold opacity-80">
          {etichetta ?? "Punto scelto sulla mappa"}
          {c.quartiere ? ` · ${c.quartiere.nome}` : ""}
          {c.municipio ? ` · ${c.municipio.nome}` : ""}
        </span>
      </div>
      {n > 0 && (
        <ul className="flex flex-col">
          {c.istanze_srb_nel_raggio.slice(0, 8).map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => onAntenna(i.id)}
                className="grid min-h-11 w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[9px] px-2 py-1.5 text-left hover:bg-bg-sink"
              >
                <span aria-hidden="true" className="size-3 rounded-full" style={{ background: nuova(i.tipo_intervento) ? COLORI.nuova : COLORI.modifica }} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold text-ink">{i.indirizzo ?? "Senza indirizzo"}</span>
                  <span className="block truncate text-[13px] text-muted">
                    {i.gestori.join(", ")} · {dataIt(i.data_pubblicazione)}
                  </span>
                </span>
                <span className="text-sm font-bold text-ink-soft">{Math.round(i.distanza_m)} m</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {c.siti_sensibili_piu_vicini.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs font-bold tracking-wide text-muted uppercase">Siti sensibili più vicini</h3>
          <ul className="flex flex-col gap-1 text-[14px] text-ink">
            {c.siti_sensibili_piu_vicini.slice(0, 3).map((s, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="truncate">
                  {CATEGORIE[s.categoria] ?? s.categoria}
                  {s.nome ? ` ${s.nome}` : ""}
                </span>
                <span className="shrink-0 font-semibold text-ink-soft">{Math.round(s.distanza_m)} m</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {c.aree_vincolate.length > 0 && <p className="text-[14px] text-ink">Dentro: {c.aree_vincolate.map((a) => a.nome).join(", ")}.</p>}
      <p className="text-[13px] text-muted">
        Il regolamento di Roma non fissa distanze minime dai siti sensibili. Per una misura a casa tua puoi chiedere ad ARPA Lazio: trovi come in «Limiti e misure».
      </p>
      <BottoneInfo onClick={onInfo} />
    </div>
  );
}

function Voce({ colore, testo }: { colore: string; testo: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: colore }} />
      {testo}
    </span>
  );
}

function Interruttore({ attivo, onClick, colore, children }: { attivo: boolean; onClick: () => void; colore: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={attivo}
      onClick={onClick}
      className={`flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold ${attivo ? "border-ink bg-ink text-white" : "border-line bg-panel text-ink-soft hover:border-campo"}`}
    >
      <span aria-hidden="true" className="size-2 rounded-full" style={{ background: attivo ? "#fff" : colore }} />
      {children}
    </button>
  );
}

function BottoneInfo({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-1 min-h-11 w-full rounded-[10px] border border-line text-[14px] font-bold text-ink-soft hover:bg-bg-sink hover:text-ink">
      Elenco, limiti, regole e fonti
    </button>
  );
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
