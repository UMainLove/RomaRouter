"use client";

import { useEffect, useId, useRef, useState } from "react";
import { TEVERE, ZONE } from "@/data/esempi";
import { AMBITI } from "@/lib/ambiti";
import type { Punto } from "@/lib/geo";
import { Icon, type IconName } from "../Icon";
import { CLASSI_FORMA } from "../ui/Varie";
import type { PuntoMappa } from "./punti";

/*
 * Anteprima schematica: riempie il contenitore e inquadra la zona della demo (o il cerchio
 * attorno a un punto). Si usa finché la build della mappa dei quartieri non è in public/quartieri.
 * Proiezione equirettangolare corretta per la latitudine: va bene su pochi chilometri.
 */
const AREA = { latMin: 41.863, latMax: 41.8955, lonMin: 12.456, lonMax: 12.499 };
const KX = Math.cos((((AREA.latMin + AREA.latMax) / 2) * Math.PI) / 180);
const M_GRADO = 111320;

/** Segni senza scheda: siti sensibili (icona) e misure ARPA (valore). */
export interface SegnoExtra extends Punto {
  id: string;
  etichetta: string;
  icona?: IconName;
  valore?: string;
}

export interface PropsMappa {
  punti: PuntoMappa[];
  selezionato: string | null;
  onSeleziona: (id: string) => void;
  /** Punto di riferimento (indirizzo, zona) con il suo cerchio. */
  centro?: Punto | null;
  raggioMetri?: number;
  extra?: SegnoExtra[];
}

function riquadro(centro: Punto | null | undefined, raggio: number | undefined) {
  if (!centro || !raggio) return AREA;
  const dLat = (raggio * (raggio < 800 ? 2.4 : 1.3)) / M_GRADO;
  const dLon = dLat / KX;
  return { latMin: centro.lat - dLat, latMax: centro.lat + dLat, lonMin: centro.lon - dLon, lonMax: centro.lon + dLon };
}

export function MappaSchematica({ punti, selezionato, onSeleziona, centro, raggioMetri, extra = [] }: PropsMappa) {
  const contenitore = useRef<HTMLDivElement>(null);
  const idMotivo = `rr-isolati-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [{ w, h }, setDim] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = contenitore.current;
    if (!el) return;
    const osserva = new ResizeObserver(([v]) => setDim({ w: v.contentRect.width, h: v.contentRect.height }));
    osserva.observe(el);
    return () => osserva.disconnect();
  }, []);

  const r = riquadro(centro, raggioMetri);
  const margine = Math.max(28, Math.min(64, Math.min(w, h) * 0.09));
  const scala = w && h ? Math.min((w - 2 * margine) / ((r.lonMax - r.lonMin) * KX), (h - 2 * margine) / (r.latMax - r.latMin)) : 0;
  const lon0 = (r.lonMin + r.lonMax) / 2;
  const lat0 = (r.latMin + r.latMax) / 2;
  const proietta = (p: Punto) => ({ x: w / 2 + (p.lon - lon0) * KX * scala, y: h / 2 - (p.lat - lat0) * scala });
  const metri = (m: number) => (m / M_GRADO) * scala;

  const fiume = TEVERE.map(proietta)
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const c = centro ? proietta(centro) : null;
  const scelto = punti.find((p) => p.id === selezionato);

  return (
    <div ref={contenitore} className="absolute inset-0 overflow-hidden bg-mappa">
      {scala > 0 && (
        <>
          <svg width={w} height={h} aria-hidden="true" className="absolute inset-0">
            <defs>
              <pattern id={idMotivo} width="60" height="50" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
                <rect x="5" y="5" width="50" height="40" rx="7" fill="#e3dccf" />
              </pattern>
            </defs>
            <rect width={w} height={h} fill={`url(#${idMotivo})`} />
            <path d={fiume} fill="none" stroke="#b7d1e4" strokeWidth={Math.max(8, Math.min(36, metri(70)))} strokeLinecap="round" strokeLinejoin="round" />
            {Object.values(ZONE).map((z) => {
              const p = proietta(z);
              if (centro && Math.abs(z.lat - centro.lat) < 0.0006 && Math.abs(z.lon - centro.lon) < 0.0008) return null;
              return (
                <text key={z.nome} x={p.x} y={p.y - 22} textAnchor="middle" fontSize="13" fontWeight="700" letterSpacing="2.5" fill="#5f5654">
                  {z.nome.toUpperCase()}
                </text>
              );
            })}
            {c && raggioMetri && (
              <circle cx={c.x} cy={c.y} r={metri(raggioMetri)} fill="rgba(37,29,28,.06)" stroke="#251d1c" strokeWidth="2.5" strokeDasharray="10 8" />
            )}
          </svg>

          {extra.map((s) => {
            const { x, y } = proietta(s);
            return s.valore ? (
              <span key={s.id} title={s.etichetta} className="absolute flex -translate-x-[7px] -translate-y-1/2 items-center gap-1" style={{ left: x, top: y }}>
                <span aria-hidden="true" className="size-3.5 rounded-full border-[3px] border-antenne-ink bg-panel" />
                <span className="rounded-[6px] bg-panel px-1.5 text-[12px] font-bold text-antenne-ink shadow-[0_1px_3px_rgba(37,29,28,.2)]">{s.valore}</span>
                <span className="sr-only">{s.etichetta}</span>
              </span>
            ) : (
              <span
                key={s.id}
                title={s.etichetta}
                className="absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ink bg-panel text-ink"
                style={{ left: x, top: y }}
              >
                {s.icona && <Icon name={s.icona} size={15} strokeWidth={2} />}
                <span className="sr-only">{s.etichetta}</span>
              </span>
            );
          })}

          {punti.map((p) => {
            const { x, y } = proietta(p);
            const a = AMBITI[p.ambito];
            const sel = p.id === selezionato;
            const forma = CLASSI_FORMA[a.forma];
            const lato = p.conteggio !== undefined ? (sel ? 44 : 36) : sel ? 40 : 30;
            return (
              <button
                key={`${p.ambito}-${p.id}`}
                type="button"
                onClick={() => onSeleziona(p.id)}
                aria-label={`${a.nome}: ${p.nome}`}
                aria-pressed={sel}
                className={`absolute -translate-x-1/2 -translate-y-1/2 p-1 ${sel ? "z-10" : ""}`}
                style={{ left: x, top: y }}
              >
                <span
                  className={`flex items-center justify-center border-2 border-white text-white shadow-[0_1px_4px_rgba(37,29,28,.35)] ${forma.esterno} ${a.classi.segno} ${
                    sel ? "ring-[6px] ring-black/10" : ""
                  }`}
                  style={{ width: lato, height: lato }}
                >
                  <span className={forma.interno}>
                    {p.conteggio !== undefined ? (
                      <b className="text-[15px] leading-none">{p.conteggio}</b>
                    ) : (
                      <Icon name={a.icona} size={sel ? 19 : 15} strokeWidth={2.1} />
                    )}
                  </span>
                </span>
              </button>
            );
          })}

          {scelto && (() => {
            const { x, y } = proietta(scelto);
            return (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute z-20 max-w-[220px] -translate-x-1/2 truncate rounded-[8px] bg-ink px-2.5 py-1 text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(37,29,28,.3)]"
                style={{ left: x, top: y + 28 }}
              >
                {scelto.nome}
              </span>
            );
          })()}

          {c && (
            <span aria-hidden="true" className="absolute z-10 -translate-x-1/2 -translate-y-full text-ink" style={{ left: c.x, top: c.y }}>
              <svg width="30" height="30" viewBox="0 0 24 24">
                <path d="M12 22s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 15.8 12 22 12 22z" fill="#251d1c" stroke="#fff" strokeWidth="1.6" />
                <circle cx="12" cy="10.5" r="2.6" fill="#fff" />
              </svg>
            </span>
          )}
        </>
      )}

      <p className="absolute bottom-2 left-2 rounded-[8px] bg-panel/90 px-2 py-1 text-[12px] text-muted">Anteprima schematica · dati di esempio</p>
    </div>
  );
}
