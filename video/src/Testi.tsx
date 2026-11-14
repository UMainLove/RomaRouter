/*
 * Titoli cinetici: parola per parola salgono da una maschera, escono sfocando.
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import { arrivo, tra, uscita } from "./anima";
import { C, FONT } from "./stile";

type Allinea = "left" | "center" | "right";

export function Titolo({
  testo,
  da,
  a,
  x,
  y,
  larghezza = 760,
  allinea = "left",
  size = 76,
  colore = C.ink,
  peso = 800,
  sfasamento = 2,
  accento,
}: {
  testo: string;
  /** fotogramma di entrata e di uscita (locali alla scena) */
  da: number;
  a: number;
  x: number;
  y: number;
  larghezza?: number;
  allinea?: Allinea;
  size?: number;
  colore?: string;
  peso?: number;
  sfasamento?: number;
  /** parole (esatte) da colorare */
  accento?: { parole: string[]; colore: string };
}) {
  const frame = useCurrentFrame();
  if (frame < da - 1 || frame > a + 2) return null;
  const righe = testo.split("\n");
  const fuori = tra(frame, a - 12, a, uscita);
  let k = 0;
  const left = allinea === "left" ? x : allinea === "center" ? x - larghezza / 2 : x - larghezza;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top: y,
        width: larghezza,
        textAlign: allinea,
        fontFamily: FONT,
        fontWeight: peso,
        fontSize: size,
        lineHeight: 1.06,
        letterSpacing: "-0.035em",
        color: colore,
        opacity: 1 - fuori,
        filter: fuori > 0 ? `blur(${fuori * 10}px)` : undefined,
        transform: `translateY(${-fuori * 14}px)`,
      }}
    >
      {righe.map((riga, ri) => (
        <div key={ri} style={{ display: "block" }}>
          {riga.split(" ").map((parola, pi) => {
            const p = tra(frame, da + k * sfasamento, da + k * sfasamento + 20, arrivo);
            k++;
            const acc = accento?.parole.includes(parola.replace(/[.,!?…]/g, ""));
            return (
              <span key={pi} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: "0.12em", marginBottom: "-0.12em" }}>
                <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 108}%)`, color: acc ? accento?.colore : undefined }}>
                  {parola}
                  {pi < riga.split(" ").length - 1 ? " " : ""}
                </span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Riga piccola sopra un titolo, in maiuscoletto spaziato con una lineetta. */
export function Occhiello({ testo, da, a, x, y, colore, allinea = "left" }: { testo: string; da: number; a: number; x: number; y: number; colore: string; allinea?: Allinea }) {
  const frame = useCurrentFrame();
  if (frame < da - 1 || frame > a + 2) return null;
  const p = tra(frame, da, da + 18, arrivo);
  const fuori = tra(frame, a - 10, a, uscita);
  return (
    <div
      style={{
        position: "absolute",
        left: allinea === "left" ? x : x - 600,
        top: y,
        width: allinea === "left" ? 900 : 1200,
        display: "flex",
        justifyContent: allinea === "left" ? "flex-start" : "center",
        alignItems: "center",
        gap: 16,
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 22,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: colore,
        opacity: p * (1 - fuori),
      }}
    >
      <span style={{ width: 44 * p, height: 3, borderRadius: 2, background: colore }} />
      <span style={{ transform: `translateX(${(1 - p) * -18}px)` }}>{testo}</span>
    </div>
  );
}

/** Numero che sale fino al valore, con i separatori italiani. */
export function Contatore({
  valore,
  da,
  a,
  durata = 36,
  x,
  y,
  size = 120,
  colore = C.ink,
  etichetta,
  coloreEtichetta = C.muted,
}: {
  valore: number;
  da: number;
  a: number;
  durata?: number;
  x: number;
  y: number;
  size?: number;
  colore?: string;
  etichetta: string;
  coloreEtichetta?: string;
}) {
  const frame = useCurrentFrame();
  if (frame < da - 1 || frame > a + 2) return null;
  const p = tra(frame, da, da + durata, arrivo);
  const entra = tra(frame, da, da + 16, arrivo);
  const fuori = tra(frame, a - 12, a, uscita);
  const n = Math.round(valore * p);
  return (
    <div style={{ position: "absolute", left: x, top: y, fontFamily: FONT, opacity: entra * (1 - fuori), transform: `translateY(${(1 - entra) * 30}px)`, filter: fuori > 0 ? `blur(${fuori * 8}px)` : undefined }}>
      <div style={{ fontSize: size, fontWeight: 800, letterSpacing: "-0.045em", color: colore, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}</div>
      <div style={{ fontSize: size * 0.24, fontWeight: 600, color: coloreEtichetta, marginTop: size * 0.08, letterSpacing: "-0.01em" }}>{etichetta}</div>
    </div>
  );
}
