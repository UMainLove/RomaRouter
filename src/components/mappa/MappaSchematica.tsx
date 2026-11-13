"use client";

import { TEVERE, ZONE } from "@/data/esempi";
import { AMBITI } from "@/lib/ambiti";
import type { Punto } from "@/lib/geo";
import { Icon, type IconName } from "../Icon";
import type { PuntoMappa } from "./punti";

// Anteprima schematica della mappa comune, usata finché il fork non è in public/quartieri.
// Riquadro fisso sulla zona della demo, proiezione equirettangolare corretta per la latitudine.
const BOX = { latMin: 41.863, latMax: 41.8955, lonMin: 12.456, lonMax: 12.499 };
const KX = Math.cos((((BOX.latMin + BOX.latMax) / 2) * Math.PI) / 180);
const W = 1000;
const H = Math.round((W * (BOX.latMax - BOX.latMin)) / ((BOX.lonMax - BOX.lonMin) * KX));

function proietta(p: Punto) {
  return {
    x: ((p.lon - BOX.lonMin) / (BOX.lonMax - BOX.lonMin)) * W,
    y: ((BOX.latMax - p.lat) / (BOX.latMax - BOX.latMin)) * H,
  };
}

/** Segni senza scheda: siti sensibili (icona) e punti di misura ARPA (valore). */
export interface SegnoExtra extends Punto {
  id: string;
  etichetta: string;
  icona?: IconName;
  valore?: string;
}

export function MappaSchematica({
  punti,
  selezionato,
  onSeleziona,
  centro,
  raggioMetri,
  extra = [],
}: {
  punti: PuntoMappa[];
  selezionato: string | null;
  onSeleziona: (id: string) => void;
  centro?: Punto | null;
  raggioMetri?: number;
  extra?: SegnoExtra[];
}) {
  const fiume = TEVERE.map(proietta)
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  // metri → unità del riquadro (1° di latitudine ≈ 111.320 m)
  const raggio = centro && raggioMetri ? (raggioMetri / 111320 / (BOX.latMax - BOX.latMin)) * H : 0;
  const c = centro ? proietta(centro) : null;

  return (
    <div className="relative mx-auto w-full max-w-[680px] overflow-hidden rounded-panel border border-line bg-[#ebe6dc]" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 size-full">
        <defs>
          <pattern id="rr-isolati" width="60" height="50" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
            <rect x="5" y="5" width="50" height="40" rx="7" fill="#e3dccf" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="#ebe6dc" />
        <rect width={W} height={H} fill="url(#rr-isolati)" />
        <path d={fiume} fill="none" stroke="#b7d1e4" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" />
        {Object.values(ZONE).map((z) => {
          const p = proietta(z);
          return (
            <text key={z.nome} x={p.x} y={p.y - 26} textAnchor="middle" fontSize="22" fontWeight="700" letterSpacing="3" fill="#5f5654">
              {z.nome.toUpperCase()}
            </text>
          );
        })}
        {c && raggio > 0 && (
          <circle cx={c.x} cy={c.y} r={raggio} fill="rgba(37,29,28,.05)" stroke="#251d1c" strokeWidth="3" strokeDasharray="12 10" />
        )}
      </svg>

      {extra.map((s) => {
        const { x, y } = proietta(s);
        return s.valore ? (
          <span
            key={s.id}
            title={s.etichetta}
            className="absolute flex -translate-x-[7px] -translate-y-1/2 items-center gap-1"
            style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}
          >
            <span aria-hidden="true" className="size-3.5 rounded-full border-[3px] border-antenne-ink bg-panel" />
            <span className="rounded-[6px] bg-panel px-1.5 text-[12px] font-bold text-antenne-ink">{s.valore}</span>
          </span>
        ) : (
          <span
            key={s.id}
            title={s.etichetta}
            className="absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ink bg-panel text-ink"
            style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}
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
        const dim = sel ? "size-10" : "size-[30px]";
        const forma =
          a.forma === "cerchio" ? "rounded-full" : a.forma === "quadrato" ? "rounded-[7px]" : "rounded-[50%_50%_50%_4px] -rotate-45";
        return (
          <button
            key={`${p.ambito}-${p.id}`}
            type="button"
            onClick={() => onSeleziona(p.id)}
            aria-label={`${a.nome}: ${p.nome}`}
            aria-pressed={sel}
            className="absolute -translate-x-1/2 -translate-y-1/2 p-1"
            style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}
          >
            <span
              className={`flex items-center justify-center border-2 border-white text-white shadow-[0_1px_4px_rgba(37,29,28,.35)] ${dim} ${forma} ${a.classi.segno} ${
                sel ? "ring-[6px] ring-black/10" : ""
              }`}
            >
              <span className={a.forma === "goccia" ? "rotate-45" : ""}>
                <Icon name={a.icona} size={sel ? 19 : 15} strokeWidth={2.1} />
              </span>
            </span>
          </button>
        );
      })}

      {c && (
        <span aria-hidden="true" className="absolute -translate-x-1/2 -translate-y-full text-ink" style={{ left: `${(c.x / W) * 100}%`, top: `${(c.y / H) * 100}%` }}>
          <svg width="30" height="30" viewBox="0 0 24 24">
            <path d="M12 22s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 15.8 12 22 12 22z" fill="#251d1c" stroke="#fff" strokeWidth="1.6" />
            <circle cx="12" cy="10.5" r="2.6" fill="#fff" />
          </svg>
        </span>
      )}

      <p className="absolute bottom-2 left-2 rounded-[8px] bg-panel/90 px-2 py-1 text-[12px] text-muted">
        Anteprima schematica · dati di esempio
      </p>
    </div>
  );
}
