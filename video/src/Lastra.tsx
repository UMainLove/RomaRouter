/*
 * La lastra: il sito vero ripreso fotogramma per fotogramma (video/riprese), sospeso sul fondo.
 * Due camere: quella esterna decide dove sta la lastra e come e' inclinata (cx, cy, larghezza,
 * rotazioni, angoli), quella interna stringe dentro la pagina (punto a fuoco in punti CSS 1440×810 e zoom).
 * Il cursore e gli anelli dei clic vengono dai file .json delle riprese.
 */
import React from "react";
import { Img, useCurrentFrame } from "remotion";
import { arrivo, tra } from "./anima";

export const PW = 1440;
export const PH = 810;

export type Evento = { f: number; tipo: string; nome?: string; x?: number; y?: number; testo?: string };
export type Ripresa = { nome: string; fotogrammi: number; cursore: number[][]; eventi: Evento[] };

/** Un pezzo della ripresa: dal fotogramma `da` al fotogramma `a` (escluso), a velocita' v. */
export type Pezzo = { da: number; a: number; v?: number };

export type Esterno = { cx: number; cy: number; w: number; rx?: number; ry?: number; rz?: number; raggio?: number; ombra?: number; opacita?: number };
export type Interno = { fx: number; fy: number; z: number };

export const segno = (r: Ripresa, nome: string) => {
  const e = r.eventi.find((x) => x.tipo === "segno" && x.nome === nome);
  if (!e) throw new Error(`segno ${nome} mancante in ${r.nome}`);
  return e.f;
};

export function durataPezzi(pezzi: Pezzo[]) {
  return pezzi.reduce((s, p) => s + (p.a - p.da) / (p.v ?? 1), 0);
}

/** Fotogramma della ripresa al fotogramma t della scena. */
export function sorgente(t: number, pezzi: Pezzo[], totale: number) {
  let resto = Math.max(0, t);
  for (const p of pezzi) {
    const v = p.v ?? 1;
    const lungo = (p.a - p.da) / v;
    if (resto < lungo) return Math.min(totale - 1, Math.floor(p.da + resto * v));
    resto -= lungo;
  }
  const ultimo = pezzi[pezzi.length - 1];
  return Math.min(totale - 1, ultimo.a - 1);
}

/** Pieno schermo, senza angoli. */
export const PIENO: Esterno = { cx: 960, cy: 540, w: 1920, raggio: 0, ombra: 0 };

/**
 * Punto a fuoco tale che il punto (px, py) della pagina finisca in (sx, sy) dello schermo,
 * con la lastra a pieno schermo e zoom z.
 */
export function inquadra(px: number, py: number, sx: number, sy: number, z: number, esterno: Esterno = PIENO): Interno {
  const scala = esterno.w / PW;
  return { fx: px - (sx - esterno.cx) / (z * scala), fy: py - (sy - esterno.cy) / (z * scala), z };
}

const pad = (n: number) => String(n).padStart(5, "0");
/** video/riprese/fotogrammi.mjs (preview "fotogrammi"): i fotogrammi non passano dal bundle. */
export const FOTOGRAMMI = "http://127.0.0.1:3399";

function Cursore({ x, y, giu, z }: { x: number; y: number; giu: boolean; z: number }) {
  const s = (giu ? 0.86 : 1) / Math.sqrt(Math.max(1, z));
  return (
    <svg
      width={26}
      height={32}
      viewBox="0 0 26 32"
      style={{ position: "absolute", left: x - 3, top: y - 2, transform: `scale(${s})`, transformOrigin: "3px 2px", filter: "drop-shadow(0 3px 5px rgba(0,0,0,.28))", overflow: "visible" }}
    >
      <path d="M3 2 L3 25.5 L9.2 19.8 L13.4 29.2 L17.6 27.4 L13.5 18.2 L21.8 18.2 Z" fill="#fff" stroke="#1d1716" strokeWidth={1.7} strokeLinejoin="round" />
    </svg>
  );
}

export function Lastra({
  ripresa,
  pezzi,
  esterno,
  interno,
  colore = "#251D1C",
  cursore = true,
  t0 = 0,
}: {
  ripresa: Ripresa;
  pezzi: Pezzo[];
  /** fotogramma della scena → cornice */
  esterno: (t: number) => Esterno;
  /** fotogramma della scena → camera dentro la pagina */
  interno?: (t: number) => Interno;
  colore?: string;
  cursore?: boolean;
  /** la ripresa parte a questo fotogramma della scena */
  t0?: number;
}) {
  const frame = useCurrentFrame();
  const t = frame - t0;
  const src = sorgente(t, pezzi, ripresa.fotogrammi);
  const e = esterno(frame);
  const i0 = interno ? interno(frame) : { fx: PW / 2, fy: PH / 2, z: 1 };
  const z = Math.max(1, i0.z);
  // la camera interna non esce mai dalla pagina
  const fx = Math.min(PW - PW / 2 / z, Math.max(PW / 2 / z, i0.fx));
  const fy = Math.min(PH - PH / 2 / z, Math.max(PH / 2 / z, i0.fy));
  const scala = e.w / PW;
  const h = e.w * (PH / PW);
  const ombra = e.ombra ?? 1;

  const [cx, cy, giu, vis] = ripresa.cursore[src] ?? [0, 0, 0, 0];
  const anelli = ripresa.eventi.filter((ev) => ev.tipo === "clic" && src - ev.f >= 0 && src - ev.f < 16);

  return (
    <div
      style={{
        position: "absolute",
        left: e.cx - e.w / 2,
        top: e.cy - h / 2,
        width: e.w,
        height: h,
        borderRadius: e.raggio ?? 22,
        overflow: "hidden",
        opacity: e.opacita ?? 1,
        transform: `perspective(2600px) rotateX(${e.rx ?? 0}deg) rotateY(${e.ry ?? 0}deg) rotateZ(${e.rz ?? 0}deg)`,
        boxShadow:
          ombra > 0
            ? `0 ${60 * ombra}px ${140 * ombra}px -${30 * ombra}px rgba(58,36,20,${0.38 * ombra}), 0 ${18 * ombra}px ${44 * ombra}px -${14 * ombra}px rgba(58,36,20,${0.3 * ombra}), 0 0 0 1px rgba(37,29,28,${0.07 * ombra})`
            : undefined,
        backgroundColor: "#faf9f7",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: PW,
          height: PH,
          transformOrigin: "0 0",
          transform: `scale(${scala}) translate(${PW / 2}px, ${PH / 2}px) scale(${z}) translate(${-fx}px, ${-fy}px)`,
        }}
      >
        <Img src={`${FOTOGRAMMI}/${ripresa.nome}/${pad(src)}.jpg`} style={{ position: "absolute", width: PW, height: PH }} />
        {cursore &&
          anelli.map((a) => {
            const p = tra(src - a.f, 0, 15, arrivo);
            return (
              <div
                key={a.f}
                style={{
                  position: "absolute",
                  left: (a.x ?? 0) - 6 - 26 * p,
                  top: (a.y ?? 0) - 6 - 26 * p,
                  width: 12 + 52 * p,
                  height: 12 + 52 * p,
                  borderRadius: "50%",
                  border: `${3 - 1.5 * p}px solid ${colore}`,
                  opacity: 0.85 * (1 - p),
                  background: `${colore}${Math.round(40 * (1 - p)).toString(16).padStart(2, "0")}`,
                }}
              />
            );
          })}
        {cursore && vis ? <Cursore x={cx} y={cy} giu={!!giu} z={z} /> : null}
      </div>
    </div>
  );
}

/** Fotogramma della scena in cui si vede il fotogramma `src` della ripresa (null se e' tagliato). */
export function inScena(src: number, pezzi: Pezzo[]): number | null {
  let acc = 0;
  for (const p of pezzi) {
    const v = p.v ?? 1;
    if (src >= p.da && src < p.a) return Math.round(acc + (src - p.da) / v);
    acc += (p.a - p.da) / v;
  }
  return null;
}

/** I tempi dei suoni della ripresa: clic del cursore e tasti, in fotogrammi della scena. */
export function suoniRipresa(r: Ripresa, pezzi: Pezzo[], t0: number, ritmo = 1) {
  const out: Array<{ f: number; tipo: "clic" | "tasti" }> = [];
  for (const e of r.eventi) {
    if (e.tipo === "clic") {
      const q = inScena(e.f, pezzi);
      if (q !== null) out.push({ f: t0 + q, tipo: "clic" });
    } else if (e.tipo === "scrivi" && e.testo) {
      for (let i = 0; i < e.testo.length; i++) {
        const q = inScena(e.f + i * ritmo, pezzi);
        if (q !== null && e.testo[i] !== " ") out.push({ f: t0 + q, tipo: "tasti" });
      }
    }
  }
  return out;
}
